"""Actual Worker/Better Auth/PG17/Chromium with a private one-use verifier.
No external provider, debug proof endpoint or production activation.
"""
import hashlib
import hmac
import json
import os
from pathlib import Path
import subprocess
import time
from urllib.parse import parse_qs, urlparse
import uuid
from playwright.sync_api import expect, sync_playwright

base = "http://127.0.0.1:4242"
repo = Path(__file__).resolve().parents[3]
database = urlparse(os.environ.get("DATABASE_URL", ""))
assert os.environ.get("CI") == "true" and database.hostname in ("127.0.0.1", "localhost")
assert database.path == "/vico_auth02b_browser_test"
password = "AUTH05-synthetic-password-123456"
step = "initialization"
external, errors = [], []


def sql(query, params=None):
    program = """import pg from 'pg';
const input=JSON.parse(await new Promise(r=>{let s='';process.stdin.on('data',b=>s+=b);process.stdin.on('end',()=>r(s));}));
const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();
try{console.log(JSON.stringify((await c.query(input.query,input.params)).rows??[]));}finally{await c.end();}"""
    r = subprocess.run(["node", "--input-type=module", "-e", program], cwd=repo,
        input=json.dumps({"query": query, "params": params or []}), text=True, capture_output=True, check=True, timeout=30)
    return json.loads(r.stdout)


def record(name):
    global step
    step = name
    print("AUTH05_CONNECTED " + name, flush=True)


def proof(outcome="passed", expired=False):
    value = "private-synthetic-challenge-" + str(uuid.uuid4())
    sql("""insert into auth05_test_proofs(digest,purpose,method,expires_at,outcome)
      values(encode(sha256(convert_to($1,'UTF8')),'hex'),'fresh-registration','email',
        clock_timestamp()+$2::int*interval '1 minute',$3) returning digest""", [value, -1 if expired else 5, outcome])
    return value


def call(ctx, email, value=None):
    return ctx.request.post(base + "/api/auth/sign-up/email", headers={"Origin": base}, data={
        "email": email, "password": password, "name": "AUTH05 synthetic", "callbackURL": "/en",
        **({"registrationChallengeProof": value} if value is not None else {}),
    }, max_redirects=0)


def no_session(response):
    assert not any("session_token=" in item["value"] for item in response.headers_array if item["name"].lower() == "set-cookie")
    assert "no-store" in response.headers.get("cache-control", "")


def run():
    assert sql("select current_database() db,current_schema() schema") == [{"db": "vico_auth02b_browser_test", "schema": "public"}]
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome", headless=True, args=["--no-sandbox"])
        def context(ip, unknown=False):
            extra = {"cf-connecting-ip": "203.0.113." + str(ip)}
            if unknown:
                extra.update({"x-forwarded-for": "198.51.100." + str(ip), "x-real-ip": "192.0.2." + str(ip)})
            ctx = browser.new_context(service_workers="block", extra_http_headers=extra)
            def guard(route):
                if route.request.url.startswith(base + "/"):
                    route.continue_()
                else:
                    external.append(True)
                    route.abort()
            ctx.route("**/*", guard)
            return ctx

        record("required-fresh-email-proof-and-commit-before-mail")
        member = context(110)
        email = "auth05-member@auth02b.test.invalid"
        valid = proof()
        response = call(member, email, valid)
        assert response.status == 200 and response.json() == {"status": True, "token": None}
        no_session(response)
        assert not sql("select id from session")
        assert len(sql("select seq from auth02b_test_mail where recipient=$1", [email])) == 1
        assert valid not in response.text()

        record("required-without-verifier-never-substitutes-fake")
        sql("update auth05_test_policy set mode='unconfigured' where id=1 returning id")
        unconfigured = context(109)
        untouched = proof()
        assert call(unconfigured, "auth05-unconfigured@auth02b.test.invalid", untouched).status == 503
        assert sql("select consumed from auth05_test_proofs where digest=encode(sha256(convert_to($1,'UTF8')),'hex')", [untouched]) == [{"consumed": False}]
        sql("update auth05_test_policy set mode='required' where id=1 returning id")
        unconfigured.close()

        record("rejected-binding-expiry-unavailable-uncertain-timeout-no-effects")
        for i, (outcome, status, expired) in enumerate([
            ("passed", 403, True), ("wrong-binding", 403, False), ("unavailable", 503, False),
            ("uncertain", 503, False), ("timeout", 503, False), ("missing", 403, False),
        ]):
            ctx = context(111 + i)
            value = None if outcome == "missing" else proof(outcome, expired)
            target = f"auth05-denied-{i}@auth02b.test.invalid"
            start = time.monotonic()
            denied = call(ctx, target, value)
            assert denied.status == status and time.monotonic() - start < 10
            no_session(denied)
            assert target not in denied.text() and (value is None or value not in denied.text())
            assert not sql('select id from "user" where email=$1', [target])
            assert not sql("select seq from auth02b_test_mail where recipient=$1", [target])
            ctx.close()
        assert len(sql('select id from "user"')) == 1 and not sql("select id from session")

        record("replay-denial-and-existing-account-neutral-duplicate")
        retry = context(120)
        assert call(retry, "auth05-replayed@auth02b.test.invalid", valid).status == 403
        duplicate_proof = proof()
        duplicate = call(retry, email, duplicate_proof)
        assert duplicate.status == 200 and duplicate.json() == {"status": True, "token": None}
        no_session(duplicate)
        assert sql("select consumed from auth05_test_proofs where digest=encode(sha256(convert_to($1,'UTF8')),'hex')", [duplicate_proof]) == [{"consumed": True}]
        assert len(sql("select seq from auth02b_test_mail where recipient=$1", [email])) == 1
        retry.close()

        record("F01-open-email-registration-differential-challenge-denials")
        for i, (outcome, status) in enumerate([("missing", 403), ("rejected", 403), ("unavailable", 503)]):
            ctx = context(150 + i)
            existing = f"auth05-f01-existing-{i}@auth02b.test.invalid"
            fresh = f"auth05-f01-fresh-{i}@auth02b.test.invalid"
            setup = call(ctx, existing, proof())
            assert setup.status == 200 and setup.json() == {"status": True, "token": None}
            no_session(setup)
            before = sql('select (select count(*)::int from "user") users,(select count(*)::int from account) accounts,(select count(*)::int from session) sessions,(select count(*)::int from verification) verifications,(select count(*)::int from auth02b_test_mail) mails')
            # Equivalent independent one-use proofs keep the comparison from
            # accidentally measuring replay rather than account existence.
            left = call(ctx, existing, None if outcome == "missing" else proof(outcome))
            right = call(ctx, fresh, None if outcome == "missing" else proof(outcome))
            for denied in (left, right):
                assert denied.status == status
                no_session(denied)
                assert existing not in denied.text() and fresh not in denied.text()
            assert left.json() == right.json()
            assert left.json()["code"] == ("vico_registration_challenge_rejected" if status == 403 else "vico_registration_challenge_unavailable")
            assert sql('select (select count(*)::int from "user") users,(select count(*)::int from account) accounts,(select count(*)::int from session) sessions,(select count(*)::int from verification) verifications,(select count(*)::int from auth02b_test_mail) mails') == before
            ctx.close()

        record("real-browser-verification-and-existing-login-with-required-challenge")
        row = sql("select body_text from auth02b_test_mail where recipient=$1", [email])[0]
        link = row["body_text"].split("\u2066")[1].split("\u2069")[0]
        page = member.new_page()
        page.on("pageerror", lambda _: errors.append(True))
        assert page.goto(link).status == 200
        expect(page.get_by_role("button", name="Confirm email", exact=True)).to_be_visible()
        assert "token=" not in page.url
        page.get_by_role("button", name="Confirm email", exact=True).click()
        expect(page.get_by_role("status")).to_contain_text("Email confirmed")
        page.get_by_role("link", name="Continue to sign in").click()
        page.locator('input[name="email"]').fill(email)
        page.locator('input[name="password"]').fill(password)
        page.locator("form.credential-form button[type=submit]").click()
        expect(page.locator(".auth-user")).to_have_count(1)
        assert len(sql("select id from session")) == 1
        recovery = member.request.post(base + "/api/auth/request-password-reset", headers={"Origin": base}, data={"email": email})
        assert recovery.status == 200
        assert len(sql("select seq from auth02b_test_mail where recipient=$1", [email])) == 2

        record("spoofed-forwarding-shares-unknown-network-five-attempt-window")
        unknown_proofs = []
        for i in range(5):
            ctx = context(130 + i, unknown=True)
            value = proof()
            unknown_proofs.append(value)
            response = call(ctx, f"auth05-unknown-{i}@auth02b.test.invalid", value)
            assert response.status == 200
            no_session(response)
            ctx.close()
        exhausted = context(140, unknown=True)
        unspent = proof()
        denied = call(exhausted, "auth05-unknown-denied@auth02b.test.invalid", unspent)
        assert denied.status == 429
        assert denied.headers.get("retry-after", "").isdigit()
        assert denied.headers.get("retry-after") == denied.headers.get("x-retry-after")
        assert sql("select consumed from auth05_test_proofs where digest=encode(sha256(convert_to($1,'UTF8')),'hex')", [unspent]) == [{"consumed": False}]
        key = "vico-auth-budget:v1:" + hmac.new(
            b"auth02b-local-only-secret-0123456789abcdef0123456789abcdef",
            json.dumps(["vico-auth-budget", 1, "signup-network", "unknown"], separators=(",", ":")).encode(), hashlib.sha256).hexdigest()
        assert sql("select count from auth_lifecycle_budget where key=$1", [key]) == [{"count": 5}]

        record("UI-429-explicit-retry-and-private-attempt-observation")
        limited = exhausted.new_page()
        limited.on("pageerror", lambda _: errors.append(True))
        limited.goto(base + "/en/sign-up")
        limited.locator('input[name="name"]').fill("Synthetic limited")
        limited.locator('input[name="email"]').fill("auth05-ui-limited@auth02b.test.invalid")
        limited.locator('input[name="password"]').fill(password)
        sent = []
        limited.on("request", lambda request: sent.append(True) if urlparse(request.url).path == "/api/auth/sign-up/email" and request.method == "POST" else None)
        with limited.expect_response(lambda r: urlparse(r.url).path == "/api/auth/sign-up/email") as completed:
            limited.locator("form.credential-form button[type=submit]").click()
        assert completed.value.status == 429
        expect(limited.get_by_role("alert")).to_contain_text("Too many requests")
        expect(limited.locator("form.credential-form button[type=submit]")).to_be_enabled()
        limited.wait_for_timeout(250)
        assert len(sent) == 1
        for _ in range(40):
            attempts = sql("select actor_user_id,direct_code,outcome from owner_attempt_patterns where operation='registration-challenge'")
            if attempts and {r["direct_code"] for r in attempts} == {"invalid", "unavailable"}:
                break
            time.sleep(.1)
        assert attempts and all(r["actor_user_id"] is None for r in attempts)
        assert {r["outcome"] for r in attempts} == {"denied", "unavailable"}
        stored = sql("select row_to_json(p)::text value from owner_attempt_patterns p union all select row_to_json(e)::text value from owner_events e")
        assert valid not in json.dumps(stored) and all(p not in json.dumps(stored) for p in unknown_proofs)
        assert not external and not errors
        browser.close()


try:
    run()
except Exception as error:
    print("AUTH05_CONNECTED_FAIL after " + step + " (" + type(error).__name__ + ")", flush=True)
    raise SystemExit(1) from None
