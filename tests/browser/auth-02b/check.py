"""Real connected AUTH-02b acceptance. No direct verification mutation.

The CI-only entrypoint captures rendered mail in the disposable PostgreSQL DB.
No external provider, forged proof, copied auth implementation or fixture login.
"""
import json
import os
import subprocess
import time
from html import escape
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse

from playwright.sync_api import expect, sync_playwright

base = "http://127.0.0.1:4242"
repo = Path(__file__).resolve().parents[3]
db = urlparse(os.environ.get("DATABASE_URL", ""))
assert os.environ.get("CI") == "true" and db.hostname in ("127.0.0.1", "localhost")
assert db.path == "/vico_auth02b_browser_test"
password = "AUTH02b-synthetic-password-123456"
step = "initialization"
external = []
errors = []


def sql(query, params=None):
    program = """import pg from 'pg';
const input=JSON.parse(await new Promise(r=>{let s='';process.stdin.on('data',b=>s+=b);process.stdin.on('end',()=>r(s));}));
const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();
try{console.log(JSON.stringify((await c.query(input.query,input.params)).rows??[]));}finally{await c.end();}"""
    result = subprocess.run(["node", "--input-type=module", "-e", program], cwd=repo,
        input=json.dumps({"query": query, "params": params or []}),
        text=True, capture_output=True, check=True, timeout=30)
    return json.loads(result.stdout)


def record(name):
    global step
    step = name
    print("AUTH02B_CONNECTED " + name, flush=True)


def private(response):
    assert {"private", "no-store"} <= {v.strip().lower() for v in response.headers.get("cache-control", "").split(",")}
    assert response.headers.get("referrer-policy") == "no-referrer"
    return response


def no_cookie(response):
    assert not any(v["name"].lower() == "set-cookie" for v in response.headers_array)


def call(ctx, endpoint, body=None, query=None):
    url = base + "/api/auth/" + endpoint + ("?" + urlencode(query) if query else "")
    if body is None:
        return ctx.request.get(url, headers={"Origin": base}, max_redirects=0)
    return ctx.request.post(url, headers={"Origin": base}, data=body, max_redirects=0)


def user(email):
    rows = sql('select id,email_verified from "user" where email=$1', [email])
    assert len(rows) == 1
    return rows[0]


def sessions(user_id):
    return sql('select id,user_id from session where user_id=$1 order by id', [user_id])


def proof(user_id):
    return sql("""select value::jsonb->>'generation' as generation from verification
      where id='vico-auth-lifecycle:v1:email-verification:' || encode(sha256(convert_to($1,'UTF8')),'hex')""", [user_id])


def mail(email):
    rows = sql("select operation_id,subject,html,body_text from auth02b_test_mail where recipient=$1 order by seq", [email])
    assert rows
    result = []
    for row in rows:
        link = row["body_text"].split("\u2066")[1].split("\u2069")[0]
        url = urlparse(link)
        assert url.scheme == "http" and url.netloc == "127.0.0.1:4242"
        assert escape(link, quote=True) in row["html"]
        query = parse_qs(url.query)
        assert set(query) == {"token", "returnTo"} and len(query["token"]) == 1
        result.append((link, query["token"][0], row["operation_id"], row["subject"], row["html"]))
    return result


def credentials(page, email, signup=False):
    if signup:
        page.locator('input[name="name"]').fill("Connected synthetic account")
    page.locator('input[name="email"]').fill(email)
    page.locator('input[name="password"]').fill(password)
    page.locator("form.credential-form button[type=submit]").click()


def session_cookie(ctx):
    return [(c["name"], c["value"]) for c in ctx.cookies() if "session_token" in c["name"]]


def run():
    assert sql("select current_database() db,current_schema() schema") == [
        {"db": "vico_auth02b_browser_test", "schema": "public"}
    ]
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome", headless=True, args=["--no-sandbox"])

        def context():
            ctx = browser.new_context(service_workers="block")
            def guard(route):
                if route.request.url.startswith(base + "/"):
                    route.continue_()
                else:
                    external.append(True)
                    route.abort()
            ctx.route("**/*", guard)
            return ctx

        def new_page(ctx):
            page = ctx.new_page()
            page.on("pageerror", lambda _: errors.append(True))
            return page

        record("credential-forms-use-native-POST-without-JavaScript")
        unhydrated = browser.new_context(java_script_enabled=False, service_workers="block")
        try:
            page = unhydrated.new_page()
            for mode in ("sign-in", "sign-up"):
                url = f"{base}/en/{mode}"
                page.goto(url)
                submissions = []

                def intercept_native_submission(route):
                    submissions.append((route.request.method, route.request.url))
                    route.fulfill(status=200, content_type="text/html", body="<p>Form submitted</p>")

                # Include query-string navigations so a default GET fails the assertion
                # without sending synthetic credentials to the Worker.
                page.route(f"{url}*", intercept_native_submission)
                try:
                    with page.expect_navigation():
                        credentials(page, "native-form@auth02b.test.invalid", signup=mode == "sign-up")
                    assert submissions == [("POST", url)]
                finally:
                    page.unroute(f"{url}*", intercept_native_submission)
        finally:
            unhydrated.close()

        en, ru, he = (f"{locale}@auth02b.test.invalid" for locale in ("en", "ru", "he"))
        guest, second, third = context(), context(), context()
        p = new_page(guest)
        record("start-browser-signup")
        p.goto(base + "/en/sign-up?returnTo=" + "%2Fen%3Fdiscard%3D1%23fragment")
        credentials(p, en, signup=True)
        expect(p.get_by_role("heading", name="Check your email")).to_be_visible()
        assert not session_cookie(guest)
        en_id = user(en)["id"]
        assert user(en)["email_verified"] is False and not sessions(en_id)
        first = mail(en)[0]
        assert urlparse(first[0]).path == "/en/verify-email"
        assert parse_qs(urlparse(first[0]).query)["returnTo"] == ["/en"]
        assert proof(en_id) == [{"generation": first[2]}]
        denied = call(guest, "sign-in/email", {"email": en, "password": password})
        assert denied.status == 403 and not session_cookie(guest) and not sessions(en_id)
        record("pending-signup-no-session-and-preverification-login-denied")

        for ctx, email, locale, subject in [(second, ru, "ru", "Подтвердите email"), (third, he, "he", "אימות כתובת הדוא״ל")]:
            response = call(ctx, "sign-up/email", {"name": locale, "email": email, "password": password, "callbackURL": "/" + locale})
            assert private(response).status == 200 and response.json() == {"status": True, "token": None}
            no_cookie(response)
            item = mail(email)[0]
            assert urlparse(item[0]).path == "/" + locale + "/verify-email"
            assert item[3] == subject and not sessions(user(email)["id"])
            assert ('dir="rtl"' if locale == "he" else 'dir="ltr"') in item[4]
        record("rendered-EN-RU-HE-mail-from-committed-identities")
        # The pinned native signup limiter allows three calls per 10 seconds.
        # Let its real window expire; never mutate either limiter in this flow.
        time.sleep(10.2)

        # Registration closure is fixture setup only. All subsequent auth
        # actions are actual HTTP/browser requests; never reset lifecycle budgets.
        sql("update forum_registration_settings set email_registration_enabled=false where id=1 returning id")
        fresh = call(guest, "sign-up/email", {"name": "closed", "email": "closed@auth02b.test.invalid", "password": password})
        assert fresh.status == 403 and fresh.json().get("code") == "vico_email_registration_closed"
        assert not sql('select id from "user" where email=$1', ["closed@auth02b.test.invalid"])
        before = sql("select password from account where user_id=$1 and provider_id='credential'", [en_id])
        duplicate = call(guest, "sign-up/email", {"name": "duplicate", "email": en, "password": "Different-synthetic-password-123"})
        assert private(duplicate).status == 200 and duplicate.json() == {"status": True, "token": None}
        no_cookie(duplicate)
        assert len(mail(en)) == 1 and proof(en_id) == [{"generation": first[2]}]
        assert sql("select password from account where user_id=$1 and provider_id='credential'", [en_id]) == before
        record("closure-fresh-denial-and-neutral-duplicate-no-mutation")

        # The original GET is read-only, even when loaded by Chromium.
        legacy = call(guest, "verify-email", query={"token": first[1]})
        assert not legacy.ok
        for _ in range(2):
            inspected = call(guest, "inspect-email-verification", query={"token": first[1]})
            assert private(inspected).status == 200 and inspected.json() == {"status": True}
            no_cookie(inspected)
        landing = p.goto(first[0])
        assert private(landing).status == 200
        expect(p.get_by_role("button", name="Confirm email", exact=True)).to_be_visible()
        assert "token=" not in p.url and first[1] not in p.content()
        assert user(en)["email_verified"] is False and proof(en_id) == [{"generation": first[2]}] and not sessions(en_id)
        record("read-only-GET-and-token-scrub")

        p.get_by_role("link", name="Request another confirmation link").click()
        p.wait_for_load_state("networkidle")
        p.locator('input[name="email"]').fill(en)
        p.locator("form.credential-form button[type=submit]").click()
        expect(p.get_by_role("heading", name="Check your email")).to_be_visible()
        issued = mail(en)
        assert len(issued) == 2 and issued[-1][1] != first[1] and proof(en_id) == [{"generation": issued[-1][2]}]
        current = issued[-1]
        stale = call(guest, "verify-email", {"token": first[1]})
        assert private(stale).status == 400 and user(en)["email_verified"] is False
        missing = call(guest, "send-verification-email", {"email": "missing@auth02b.test.invalid", "callbackURL": "/en"})
        assert private(missing).status == 200 and missing.json() == {"status": True}
        assert not sql("select seq from auth02b_test_mail where recipient=$1", ["missing@auth02b.test.invalid"])
        record("resend-while-closed-latest-generation-and-neutral-missing")

        def verify_page(ctx, page, item, locale, button, message):
            response = page.goto(item[0])
            assert private(response).status == 200
            expect(page.locator("html")).to_have_attribute("dir", "rtl" if locale == "he" else "ltr")
            expect(page.get_by_role("button", name=button, exact=True)).to_be_visible()
            assert item[1] not in page.content() and "token=" not in page.url
            with page.expect_response(lambda r: urlparse(r.url).path == "/api/auth/verify-email" and r.request.method == "POST") as completed:
                page.get_by_role("button", name=button, exact=True).click()
            assert private(completed.value).status == 200 and completed.value.json() == {"status": True}
            expect(page.get_by_role("status")).to_contain_text(message)
            # Browser response header access includes Set-Cookie via all_headers.
            assert "set-cookie" not in completed.value.all_headers()

        verify_page(guest, p, current, "en", "Confirm email", "Email confirmed. Sign in to continue.")
        assert user(en)["email_verified"] is True and not proof(en_id) and not sessions(en_id) and not session_cookie(guest)
        replay = call(guest, "verify-email", {"token": current[1]})
        assert private(replay).status == 400 and not sessions(en_id)
        p.get_by_role("link", name="Continue to sign in").click()
        credentials(p, en)
        expect(p.locator(".auth-user")).to_have_count(1)
        assert urlparse(p.url).path.rstrip("/") == "/en" and sessions(en_id) and session_cookie(guest)
        record("explicit-POST-confirmation-replay-denial-separate-sign-in")

        # Preserve a different existing session when opening the Hebrew link.
        old_cookie = session_cookie(guest)
        old_sessions = sessions(en_id)
        he_id = user(he)["id"]
        hp = new_page(guest)
        verify_page(guest, hp, mail(he)[0], "he", "אימות הדוא״ל", "כתובת הדוא״ל אומתה. היכנסו כדי להמשיך.")
        assert user(he)["email_verified"] is True and not sessions(he_id)
        assert session_cookie(guest) == old_cookie and sessions(en_id) == old_sessions
        current_session = call(guest, "get-session")
        assert current_session.status == 200 and current_session.json()["user"]["id"] == en_id
        record("RTL-confirmation-does-not-switch-ambient-account")

        rp = new_page(second)
        ru_id = user(ru)["id"]
        verify_page(second, rp, mail(ru)[0], "ru", "Подтвердить email", "Email подтверждён. Войдите, чтобы продолжить.")
        assert user(ru)["email_verified"] is True and not sessions(ru_id) and not session_cookie(second)
        neutral = call(second, "send-verification-email", {"email": ru, "callbackURL": "/ru"})
        assert private(neutral).status == 200 and neutral.json() == {"status": True} and len(mail(ru)) == 1
        record("RU-confirmation-and-neutral-already-verified-resend")

        # Wait only for best-effort asynchronous collector flush, never reissue
        # the domain operation. Exact committed fact and accepted mail counts.
        for _ in range(40):
            facts = sql("select target_user_id,actor_user_id,correlation_id from owner_events where kind='auth.emailVerified' order by target_user_id")
            outcomes = sql("select entity_id,payload->>'mailTransport' transport,payload->>'mailOutcome' outcome from owner_events where kind='integration.authMailOutcome' order by entity_id")
            if len(facts) == 3 and len(outcomes) == 4:
                break
            time.sleep(.25)
        expected = {en_id: current[2], he_id: mail(he)[0][2], ru_id: mail(ru)[0][2]}
        assert len(facts) == 3 and {f["target_user_id"]:f["correlation_id"] for f in facts} == expected
        assert all(f["actor_user_id"] is None for f in facts)
        assert len(outcomes) == 4 and {o["entity_id"] for o in outcomes} == set(expected.values()) | {first[2]}
        assert all(o["transport"] == "fake" and o["outcome"] == "accepted" for o in outcomes)
        assert not external and not errors
        record("committed-verification-and-mail-facts-no-egress-or-page-errors")
        record("recovery-request-and-browser-reset")
        recovery_page = new_page(second)
        recovery_page.goto(base + "/en/forgot-password")
        recovery_page.locator('input[name="email"]').fill(en)
        with recovery_page.expect_response(lambda response: response.url == base + "/api/auth/request-password-reset") as requested:
            recovery_page.locator("form.credential-form button[type=submit]").click()
        assert private(requested.value).status == 200
        expect(recovery_page.get_by_role("status")).to_contain_text("check your email")
        latest = sql("select body_text from auth02b_test_mail where recipient=$1 order by seq desc limit 1", [en])[0]
        reset_link = latest["body_text"].split("\u2066")[1].split("\u2069")[0]
        assert urlparse(reset_link).path == "/en/reset-password" and "token=" in urlparse(reset_link).fragment
        landing = recovery_page.goto(reset_link)
        assert private(landing).status == 200
        expect(recovery_page.locator('input[name="newPassword"]')).to_be_visible()
        assert "token=" not in recovery_page.url and sessions(en_id) == old_sessions
        new_password = "browser-test-only-replaced-credential"
        recovery_page.locator('input[name="newPassword"]').fill(new_password)
        recovery_page.get_by_role("button", name="Reset password", exact=True).click()
        expect(recovery_page.get_by_role("status")).to_contain_text("Password changed.")
        assert not sessions(en_id) and not session_cookie(second)
        assert call(second, "sign-in/email", {"email": en, "password": password}).status == 401
        assert call(second, "sign-in/email", {"email": en, "password": new_password}).status == 200
        record("reset-revokes-sessions-and-requires-separate-sign-in")
        # Keep the native limiter active. This separate fixture signs in after
        # the guest reset's two sign-in assertions have left the shared bucket.
        time.sleep(10.1)
        record("google-only-browser-password-create")
        assert call(third, "sign-in/email", {"email": ru, "password": password}).status == 200
        current_ru = call(third, "get-session").json()
        ru_session_id = current_ru["session"]["id"]
        # Provision the method fixture without reaching a real Google resource.
        sql("update account set provider_id='google',account_id='google-fixture-'||user_id,password=null where user_id=$1 and provider_id='credential'", [ru_id])
        create_page = new_page(third)
        create_page.goto(base + "/en/settings/account")
        with create_page.expect_response(lambda response: response.url == base + "/api/auth/request-password-create") as requested:
            create_page.get_by_role("button", name="Send a recovery link").click()
        assert private(requested.value).status == 200
        expect(create_page.get_by_role("status")).to_contain_text("Open the link in this browser")
        latest = sql("select body_text from auth02b_test_mail where recipient=$1 order by seq desc limit 1", [ru])[0]
        create_link = latest["body_text"].split("\u2066")[1].split("\u2069")[0]
        assert urlparse(create_link).path == "/en/settings/account"
        assert "token=" in urlparse(create_link).fragment
        assert create_page.goto(create_link).status == 200
        expect(create_page.locator('input[name="newPassword"]')).to_be_visible()
        assert "token=" not in create_page.url
        create_page.locator('input[name="newPassword"]').fill("browser-test-only-new-own-password")
        create_page.get_by_role("button", name="Add a password", exact=True).click()
        expect(create_page.get_by_role("status")).to_contain_text("Password changed.")
        assert call(third, "get-session").json()["session"]["id"] == ru_session_id
        assert sql("select provider_id from account where user_id=$1 order by provider_id", [ru_id]) == [
            {"provider_id": "credential"}, {"provider_id": "google"}]
        record("google-method-and-initial-session-preserved")
        browser.close()


try:
    run()
except Exception as error:
    # Never print bearer URLs, mailbox contents, passwords, or Playwright traces.
    print("AUTH02B_CONNECTED_FAIL after " + step + " (" + type(error).__name__ + ")", flush=True)
    raise SystemExit(1) from None
