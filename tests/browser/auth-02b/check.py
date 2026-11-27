"""Real connected AUTH-02b acceptance. No direct verification mutation.

The CI-only entrypoint captures rendered mail in the disposable PostgreSQL DB.
No external provider, forged proof, copied auth implementation or fixture login.
"""
import json
import os
import re
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
    page.wait_for_load_state("networkidle")
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
        recovery_destination = "/en/settings/account"
        reset_requests = []
        recovery_page.on("request", lambda req: reset_requests.append(True)
            if urlparse(req.url).path == "/api/auth/reset-password" and req.method == "POST" else None)

        def issue_reset_link(page, destination):
            page.locator('input[name="email"]').fill(en)
            with page.expect_response(lambda response: response.url == base + "/api/auth/request-password-reset") as requested:
                page.locator("form.credential-form button[type=submit]").click()
            assert private(requested.value).status == 200
            expect(page.get_by_role("status")).to_contain_text("check your email")
            latest = sql("select body_text from auth02b_test_mail where recipient=$1 order by seq desc limit 1", [en])[0]
            link = latest["body_text"].split("\u2066")[1].split("\u2069")[0]
            url = urlparse(link)
            assert url.path == "/en/reset-password" and parse_qs(url.query)["returnTo"] == [destination]
            assert "token=" in url.fragment
            return link

        recovery_page.goto(base + "/en/forgot-password?" + urlencode({"returnTo": recovery_destination}))
        expired_reset_link = issue_reset_link(recovery_page, recovery_destination)
        landing = recovery_page.goto(expired_reset_link)
        assert private(landing).status == 200
        expect(recovery_page.locator('input[name="newPassword"]')).to_be_visible()
        assert "token=" not in recovery_page.url and sessions(en_id) == old_sessions and not reset_requests
        recovery_page.evaluate("window.auth07ResetDocument = true")
        before_reset = sql("select password from account where user_id=$1 and provider_id='credential'", [en_id])
        # Expire the issued state, without changing the password, sessions or admission budgets.
        assert len(sql("""update verification set expires_at=clock_timestamp()-interval '1 minute'
            where id='vico-auth-lifecycle:v1:password-reset:' || encode(sha256(convert_to($1,'UTF8')),'hex')
            returning id""", [en_id])) == 1
        recovery_page.locator('input[name="newPassword"]').fill("browser-test-only-expired-reset")
        with recovery_page.expect_response(lambda response: response.url == base + "/api/auth/reset-password") as denied:
            recovery_page.get_by_role("button", name="Reset password", exact=True).click()
        assert private(denied.value).status == 400
        expect(recovery_page.get_by_role("alert")).to_be_visible()
        assert len(reset_requests) == 1 and sessions(en_id) == old_sessions
        assert sql("select password from account where user_id=$1 and provider_id='credential'", [en_id]) == before_reset

        # Follow the real retry link in a separate page so the failed reset
        # document stays mounted and can receive the newly issued fragment.
        retry_link = recovery_page.locator('a[href*="/forgot-password"]').get_attribute("href")
        assert urlparse(retry_link).path == "/en/forgot-password"
        assert parse_qs(urlparse(retry_link).query) == {"returnTo": [recovery_destination]}
        # Separate local ingress fixture, like the later account-security
        # cases: the original network also spends eight mail admissions
        # before reset and needs one for the existing password-create case.
        # Do not reset counters, increase limits or bypass admission.
        retry_context = context()
        retry_context.set_extra_http_headers({"cf-connecting-ip": "203.0.113.97"})
        retry_page = new_page(retry_context)
        assert private(retry_page.goto(base + retry_link)).status == 200
        reset_link = issue_reset_link(retry_page, recovery_destination)
        retry_context.close()
        assert urlparse(reset_link).fragment != urlparse(expired_reset_link).fragment
        assert recovery_page.url == reset_link.split("#", 1)[0]
        recovery_page.evaluate("(link) => { window.location.href = link; }", reset_link)
        expect(recovery_page.locator('input[name="newPassword"]')).to_be_visible()
        expect(recovery_page).not_to_have_url(re.compile("token="))
        expect(recovery_page.get_by_role("alert")).to_have_count(0)
        assert recovery_page.evaluate("window.auth07ResetDocument === true")
        assert len(reset_requests) == 1 and sessions(en_id) == old_sessions
        token = parse_qs(urlparse(reset_link).fragment)["token"][0]
        assert token not in recovery_page.content()
        record("AUTH07-reset-retry-preserves-return-and-same-document-replacement")

        # Refresh removes the in-memory proof. Reopening the still-current
        # mail link in the very same document must capture it again.
        assert private(recovery_page.reload()).status == 200
        expect(recovery_page.get_by_role("alert")).to_be_visible()
        recovery_page.evaluate("window.auth07ResetReopenedDocument = true")
        recovery_page.evaluate("(link) => { window.location.href = link; }", reset_link)
        expect(recovery_page.locator('input[name="newPassword"]')).to_be_visible()
        expect(recovery_page).not_to_have_url(re.compile("token="))
        expect(recovery_page.get_by_role("alert")).to_have_count(0)
        assert recovery_page.evaluate("window.auth07ResetReopenedDocument === true")
        assert len(reset_requests) == 1 and sessions(en_id) == old_sessions
        assert token not in recovery_page.content()
        record("AUTH07-reset-reopened-proof-after-refresh-without-auto-POST")

        # The invalid-page retry uses the loader's safe path, never the raw
        # query. Exercise foreign and cross-locale input through both loaders.
        fallback_page = new_page(second)
        for unsafe in ("https://example.invalid/en/settings/account", "/ru/settings/account"):
            assert private(fallback_page.goto(base + "/en/reset-password?" + urlencode({"returnTo": unsafe}))).status == 200
            expect(fallback_page.get_by_role("alert")).to_be_visible()
            retry = fallback_page.locator('a[href*="/forgot-password"]')
            assert parse_qs(urlparse(retry.get_attribute("href")).query) == {"returnTo": ["/en"]}
            retry.click()
            sign_in = fallback_page.locator('.credential-page a[href*="/sign-in?returnTo="]')
            expect(sign_in).to_have_attribute("href", "/en/sign-in?returnTo=%2Fen")
        fallback_page.close()
        record("AUTH07-reset-unsafe-return-falls-back-through-forgot")

        new_password = "browser-test-only-replaced-credential"
        recovery_page.locator('input[name="newPassword"]').fill(new_password)
        with recovery_page.expect_response(lambda response: response.url == base + "/api/auth/reset-password") as completed:
            recovery_page.get_by_role("button", name="Reset password", exact=True).click()
        assert private(completed.value).status == 200
        expect(recovery_page.get_by_role("status")).to_contain_text("Password changed.")
        assert len(reset_requests) == 2 and recovery_page.evaluate("window.auth07ResetReopenedDocument === true")
        assert parse_qs(urlparse(recovery_page.locator('a[href*="/sign-in?returnTo="]').get_attribute("href")).query) == {"returnTo": [recovery_destination]}
        assert not sessions(en_id) and not session_cookie(second)
        replay = call(second, "reset-password", {"token": token, "newPassword": "browser-test-only-replay-denied"})
        assert private(replay).status == 400 and not sessions(en_id) and not session_cookie(second)
        assert call(second, "sign-in/email", {"email": en, "password": password}).status == 401
        assert call(second, "sign-in/email", {"email": en, "password": new_password}).status == 200
        record("reset-revokes-sessions-and-requires-separate-sign-in")
        # Keep the native limiter active. This separate fixture signs in after
        # the guest reset's two sign-in assertions have left the shared bucket.
        time.sleep(10.1)
        record("google-only-browser-password-create")
        # Stage the existing account preference independently of the EN route.
        sql('update "user" set locale=$1 where id=$2 returning id', ["ru", ru_id])
        assert call(third, "sign-in/email", {"email": ru, "password": password}).status == 200
        current_ru = call(third, "get-session").json()
        ru_session_id = current_ru["session"]["id"]
        other_create_session = context()
        assert call(other_create_session, "sign-in/email", {"email": ru, "password": password}).status == 200
        other_create_id = call(other_create_session, "get-session").json()["session"]["id"]
        assert other_create_id != ru_session_id
        assert len(sessions(ru_id)) == 2
        # Provision the method fixture without reaching a real Google resource.
        sql("update account set provider_id='google',account_id='google-fixture-'||user_id,password=null where user_id=$1 and provider_id='credential'", [ru_id])
        create_page = new_page(third)
        create_page.goto(base + "/en/settings/account")
        expect(create_page.locator(".settings-account-sessions li")).to_have_count(2)
        with create_page.expect_response(lambda response: response.url == base + "/api/auth/request-password-create") as requested:
            create_page.get_by_role("button", name="Send a recovery link").click()
        assert private(requested.value).status == 200
        expect(create_page.get_by_role("status")).to_contain_text("Open the link in this browser")
        latest = sql("select body_text,html from auth02b_test_mail where recipient=$1 order by seq desc limit 1", [ru])[0]
        create_link = latest["body_text"].split("\u2066")[1].split("\u2069")[0]
        assert 'lang="ru" dir="ltr"' in latest["html"]
        assert urlparse(create_link).path == "/en/settings/account"
        assert parse_qs(urlparse(create_link).query)["returnTo"] == ["/en"]
        assert "token=" in urlparse(create_link).fragment
        assert create_page.goto(create_link).status == 200
        expect(create_page.locator('input[name="newPassword"]')).to_be_visible()
        assert "token=" not in create_page.url
        expect(create_page.locator(".settings-account-sessions li")).to_have_count(2)
        create_page.evaluate("window.auth07MountedDocument = true")
        create_page.locator('input[name="newPassword"]').fill("browser-test-only-new-own-password")
        create_page.get_by_role("button", name="Add a password", exact=True).click()
        expect(create_page.get_by_role("status")).to_contain_text("Password changed.")
        assert call(third, "get-session").json()["session"]["id"] == ru_session_id
        assert sql("select provider_id from account where user_id=$1 order by provider_id", [ru_id]) == [
            {"provider_id": "credential"}, {"provider_id": "google"}]
        expect(create_page.get_by_text("Email and password", exact=True)).to_be_visible()
        expect(create_page.get_by_text("Google", exact=True)).to_be_visible()
        expect(create_page.locator("#settings-current-password")).to_be_visible()
        expect(create_page.locator(".settings-account-sessions li")).to_have_count(1)
        expect(create_page.locator(".settings-account-revoke-form")).to_have_count(0)
        assert create_page.evaluate("window.auth07MountedDocument === true")
        assert sessions(ru_id) == [{"id": ru_session_id, "user_id": ru_id}]
        assert call(other_create_session, "get-session").json() is None
        other_create_session.close()
        record("google-method-and-initial-session-preserved")
        record("AUTH07-password-create-revalidates-mounted-methods-and-sessions")
        credential_mail = sql("""select payload->>'mailPurpose' purpose, payload->>'mailTransport' transport,
          payload->>'mailOutcome' outcome from owner_events where kind='integration.authMailOutcome'
          and payload->>'mailPurpose' in ('password-reset','password-create') order by purpose""")
        assert credential_mail == [
            {"purpose": "password-create", "transport": "fake", "outcome": "accepted"},
            {"purpose": "password-reset", "transport": "fake", "outcome": "accepted"},
            {"purpose": "password-reset", "transport": "fake", "outcome": "accepted"},
        ]
        record("credential-mail-outcomes-retain-purpose-and-observed-transport")
        third.set_extra_http_headers({"cf-connecting-ip": "203.0.113.94"})
        record("two-phase-own-email-change")
        changed_email = "changed@auth02b.test.invalid"
        create_page.goto(base + "/en/settings/account")
        create_page.locator('input[name="newEmail"]').fill(changed_email)
        with create_page.expect_response(lambda response: response.url == base + "/api/auth/change-email") as email_requested:
            create_page.get_by_role("button", name="Request email change").click()
        assert private(email_requested.value).status == 200
        old_mail = sql("select body_text,html from auth02b_test_mail where recipient=$1 order by seq desc limit 1", [ru])[0]
        old_link = old_mail["body_text"].split("\u2066")[1].split("\u2069")[0]
        assert 'lang="ru" dir="ltr"' in old_mail["html"]
        assert urlparse(old_link).path == "/en/settings/account"
        record("email-proof-guest-expired-and-other-session-privacy")
        email_token = parse_qs(urlparse(old_link).fragment)["token"][0]
        pending_before = sql("select id,value from verification where value::jsonb->>'purpose'='email-change' order by id")
        for mode in ("guest", "expired"):
            landing_context = context()
            landing_context.set_extra_http_headers({"cf-connecting-ip": "203.0.113.95"})
            if mode == "expired":
                assert call(landing_context, "sign-in/email", {"email": ru, "password": "browser-test-only-new-own-password"}).status == 200
                expired_id = call(landing_context, "get-session").json()["session"]["id"]
                sql("update session set expires_at=now()-interval '1 minute' where id=$1 returning id", [expired_id])
            landing_page = new_page(landing_context)
            requests = []
            landing_page.on("request", lambda request: requests.append((request.url, request.post_data or "")))
            assert landing_page.goto(old_link).status == 401
            expect(landing_page).not_to_have_url(re.compile("token="))
            for kind in (".auth-sign-in", ".auth-sign-up"):
                href = landing_page.locator(kind).get_attribute("href")
                assert parse_qs(urlparse(href).query)["returnTo"] == ["/en/settings/account"]
                assert email_token not in href
            assert email_token not in landing_page.content()
            landing_page.locator(".auth-sign-in").click()
            landing_page.wait_for_load_state("networkidle")
            assert email_token not in landing_page.url and email_token not in landing_page.content()
            callbacks = []
            def capture_google(route):
                callbacks.append(json.loads(route.request.post_data))
                route.fulfill(status=400, content_type="application/json", body='{"message":"Synthetic denial"}')
            landing_page.route("**/api/auth/sign-in/social", capture_google)
            landing_page.get_by_role("button", name="Continue with Google").click()
            expect(landing_page.get_by_role("alert")).to_be_visible()
            assert len(callbacks) == 1 and callbacks[0]["callbackURL"] == "/en/settings/account"
            assert email_token not in json.dumps(callbacks) and all(email_token not in url + body for url, body in requests)
            assert not session_cookie(landing_context)
            landing_context.close()
        foreign_page = new_page(second)
        foreign_cookie = session_cookie(second)
        assert foreign_page.goto(old_link).status == 200
        expect(foreign_page).not_to_have_url(re.compile("token="))
        with foreign_page.expect_response(lambda response: response.url == base + "/api/auth/confirm-email-change") as denied:
            foreign_page.get_by_role("button", name="Confirm email change").click()
        assert private(denied.value).status == 400
        assert session_cookie(second) == foreign_cookie
        assert user(ru)["id"] == ru_id
        assert sql("select id,value from verification where value::jsonb->>'purpose'='email-change' order by id") == pending_before
        for _ in range(40):
            attributed = sql("select actor_user_id from owner_attempt_patterns where operation='email-change' and http_status=400 and actor_user_id=$1", [en_id])
            if attributed:
                break
            time.sleep(.1)
        assert attributed and all(row["actor_user_id"] == en_id for row in attributed)
        record("two-phase-own-email-change-initiating-session-only")
        assert create_page.goto(old_link).status == 200
        expect(create_page.get_by_role("button", name="Confirm email change")).to_be_visible()
        assert user(ru)["id"] == ru_id and "token=" not in create_page.url
        record("AUTH06-email-proof-refresh-back-no-implicit-consume")
        before_navigation = sql("select id,value from verification where value::jsonb->>'purpose'='email-change' order by id")
        create_page.reload()
        create_page.goto(base + "/en/")
        create_page.go_back()
        expect(create_page).not_to_have_url(re.compile("token="))
        assert email_token not in create_page.content()
        assert sql("select id,value from verification where value::jsonb->>'purpose'='email-change' order by id") == before_navigation
        create_page.goto(old_link)
        sql('update "user" set locale=$1 where id=$2 returning id', ["he", ru_id])
        with create_page.expect_response(lambda response: response.url == base + "/api/auth/confirm-email-change") as old_confirmed:
            confirm_button = create_page.get_by_role("button", name="Confirm email change")
            confirm_button.focus()
            confirm_button.press("Enter")
        assert private(old_confirmed.value).status == 200
        new_mail = sql("select body_text,html from auth02b_test_mail where recipient=$1 order by seq desc limit 1", [changed_email])[0]
        new_link = new_mail["body_text"].split("\u2066")[1].split("\u2069")[0]
        assert 'lang="he" dir="rtl"' in new_mail["html"]
        assert urlparse(new_link).path == "/en/settings/account"
        assert parse_qs(urlparse(new_link).query)["returnTo"] == ["/en"]
        record("AUTH07-own-mail-saved-locale-independent-of-action")
        assert user(ru)["id"] == ru_id
        create_page.goto(new_link)
        expect(create_page.get_by_role("button", name="Confirm email change")).to_be_visible()
        with create_page.expect_response(lambda response: response.url == base + "/api/auth/confirm-email-change") as final_confirmed:
            create_page.get_by_role("button", name="Confirm email change").click()
        assert private(final_confirmed.value).status == 200
        assert user(changed_email)["id"] == ru_id
        assert call(third, "get-session").json()["session"]["id"] == ru_session_id
        expect(create_page.get_by_text(changed_email, exact=True)).to_be_visible()
        record("own-google-unlink-preserves-usable-password-and-session")
        with create_page.expect_response(lambda response: response.url == base + "/api/auth/unlink-account") as unlinked:
            create_page.get_by_role("button", name="Disconnect Google").click()
        if unlinked.value.status == 429:
            record("own-rate-limit-expiry-and-explicit-UI-retry")
            # Request/create + the three email phases exhaust the common own
            # window. Honor its real expiry and perform one explicit UI retry.
            assert private(unlinked.value).headers.get("retry-after", "").isdigit()
            delay = int(unlinked.value.headers["retry-after"])
            assert 1 <= delay <= 60
            expect(create_page.get_by_role("alert")).to_contain_text("Too many requests")
            for _ in range(delay):
                time.sleep(1)
            time.sleep(.2)
            with create_page.expect_response(lambda response: response.url == base + "/api/auth/unlink-account") as unlinked:
                create_page.get_by_role("button", name="Disconnect Google").click()
        assert private(unlinked.value).status == 200
        expect(create_page.get_by_role("button", name="Disconnect Google")).to_have_count(0)
        assert sql("select provider_id from account where user_id=$1", [ru_id]) == [{"provider_id": "credential"}]
        assert call(third, "get-session").json()["session"]["id"] == ru_session_id
        record("AUTH06-SET05-password-change-keyboard-retains-existing-sessions")
        time.sleep(10.1)  # The native sign-in window expires without counter mutation.
        other_contexts = [context(), context()]
        for other in other_contexts:
            assert call(other, "sign-in/email", {"email": changed_email, "password": "browser-test-only-new-own-password"}).status == 200
        before_change = sessions(ru_id)
        assert len(before_change) == 3
        create_page.goto(base + "/en/settings/account")
        current_input = create_page.locator("#settings-current-password")
        next_input = create_page.locator("#settings-new-password")
        current_input.fill("browser-test-only-new-own-password")
        changed_password = "browser-AUTH06-keyboard-changed-password"
        next_input.fill(changed_password)
        current_input.focus()
        current_input.press("Tab")
        expect(next_input).to_be_focused()
        next_input.press("Tab")
        change_button = create_page.get_by_role("button", name="Change password", exact=True)
        expect(change_button).to_be_focused()
        change_button.press("Enter")
        expect(create_page.get_by_role("status")).to_contain_text("Password changed.")
        assert sessions(ru_id) == before_change
        assert call(third, "get-session").json()["session"]["id"] == ru_session_id

        record("AUTH06-SET05-revoke-one-and-all-others-through-current-UI")
        first_other = create_page.locator("form.settings-account-revoke-form").first
        removed_id = first_other.locator('input[name="sessionId"]').input_value()
        first_other.get_by_role("button").click()
        expect(create_page.get_by_role("status")).to_contain_text("Other sessions signed out.")
        assert sessions(ru_id) == [s for s in before_change if s["id"] != removed_id]
        create_page.locator("form.settings-account-revoke-all button").click()
        expect(create_page.locator("form.settings-account-revoke-form")).to_have_count(0)
        assert sessions(ru_id) == [{"id": ru_session_id, "user_id": ru_id}]
        assert all(call(other, "get-session").json() is None for other in other_contexts)
        for other in other_contexts:
            other.close()

        record("AUTH06-Settings-EN-RU-HE-responsive-LTR-RTL")
        for locale, width in (("en", 1440), ("ru", 390), ("he", 390)):
            create_page.set_viewport_size({"width": width, "height": 900})
            create_page.goto(base + "/" + locale + "/settings/account")
            expect(create_page.locator("html")).to_have_attribute("dir", "rtl" if locale == "he" else "ltr")
            expect(create_page.locator("#settings-current-password")).to_be_visible()
            assert create_page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        create_page.set_viewport_size({"width": 1280, "height": 900})
        create_page.goto(base + "/en/settings/account")
        create_page.reload()
        assert sessions(ru_id) == [{"id": ru_session_id, "user_id": ru_id}]
        assert call(third, "sign-out", {}).status == 200 and not sessions(ru_id)
        time.sleep(10.1)
        assert call(third, "sign-in/email", {"email": changed_email, "password": "browser-test-only-new-own-password"}).status == 401
        assert call(third, "sign-in/email", {"email": changed_email, "password": changed_password}).status == 200
        assert user(changed_email)["id"] == ru_id and len(sessions(ru_id)) == 1
        record("AUTH06-explicit-relogin-after-email-password-change-and-unlink")

        # A separate verified fixture keeps the previous own-rate-limit and
        # email-change acceptance intact. Only the provider method is staged;
        # both new mail proofs and terminal attempts use the actual Worker.
        replacement_context = context()
        sql('update "user" set locale=$1 where id=$2 returning id', ["ka", he_id])
        replacement_context.set_extra_http_headers({"cf-connecting-ip": "203.0.113.96"})
        assert call(replacement_context, "sign-in/email", {"email": he, "password": password}).status == 200
        replacement_session = call(replacement_context, "get-session").json()["session"]["id"]
        sql("update account set provider_id='google',account_id='google-fixture-'||user_id,password=null where user_id=$1 and provider_id='credential'", [he_id])
        replacement_page = new_page(replacement_context)
        replacement_page.goto(base + "/en/settings/account")
        terminal_requests = []
        replacement_page.on("request", lambda req: terminal_requests.append(True)
            if urlparse(req.url).path == "/api/auth/create-password" and req.method == "POST" else None)
        def issue_creation_link():
            with replacement_page.expect_response(lambda response: response.url == base + "/api/auth/request-password-create") as issued:
                replacement_page.get_by_role("button", name="Send a recovery link").click()
            assert private(issued.value).status == 200
            expect(replacement_page.get_by_role("status")).to_contain_text("Open the link in this browser")
            row = sql("select body_text,html from auth02b_test_mail where recipient=$1 order by seq desc limit 1", [he])[0]
            assert 'lang="en" dir="ltr"' in row["html"]
            return row["body_text"].split("\u2066")[1].split("\u2069")[0]

        expired_link = issue_creation_link()
        assert replacement_page.goto(expired_link).status == 200
        expect(replacement_page.locator('input[name="newPassword"]')).to_be_visible()
        assert "token=" not in replacement_page.url and not terminal_requests
        replacement_page.evaluate("window.auth07ReplacementDocument = true")
        # Expire only the real issued proof, not the active session or budgets.
        assert len(sql("""update verification set expires_at=clock_timestamp()-interval '1 minute'
            where id='vico-auth-lifecycle:v1:password-create:' || encode(sha256(convert_to($1,'UTF8')),'hex')
            returning id""", [he_id])) == 1
        replacement_page.locator('input[name="newPassword"]').fill("browser-test-only-expired-attempt")
        with replacement_page.expect_response(lambda response: response.url == base + "/api/auth/create-password") as denied:
            replacement_page.get_by_role("button", name="Add a password", exact=True).click()
        assert private(denied.value).status == 400
        expect(replacement_page.get_by_role("alert")).to_contain_text("Request a new link")
        assert len(terminal_requests) == 1
        assert sql("select provider_id from account where user_id=$1", [he_id]) == [{"provider_id": "google"}]
        new_link = issue_creation_link()
        old_url, new_url = urlparse(expired_link), urlparse(new_link)
        assert (old_url.path, old_url.query) == (new_url.path, new_url.query)
        assert old_url.fragment != new_url.fragment
        assert replacement_page.url == new_link.split("#", 1)[0]
        replacement_page.evaluate("(link) => { window.location.href = link; }", new_link)
        expect(replacement_page.locator('input[name="newPassword"]')).to_be_visible()
        expect(replacement_page).not_to_have_url(re.compile("token="))
        assert replacement_page.evaluate("window.auth07ReplacementDocument === true")
        assert len(terminal_requests) == 1
        assert sessions(he_id) == [{"id": replacement_session, "user_id": he_id}]
        replacement_page.locator('input[name="newPassword"]').fill("browser-test-only-replacement-password")
        with replacement_page.expect_response(lambda response: response.url == base + "/api/auth/create-password") as confirmed:
            replacement_page.get_by_role("button", name="Add a password", exact=True).click()
        assert private(confirmed.value).status == 200
        expect(replacement_page.get_by_text("Email and password", exact=True)).to_be_visible()
        assert len(terminal_requests) == 2
        assert replacement_page.evaluate("window.auth07ReplacementDocument === true")
        assert call(replacement_context, "get-session").json()["session"]["id"] == replacement_session
        assert sessions(he_id) == [{"id": replacement_session, "user_id": he_id}]
        assert sql("select provider_id from account where user_id=$1 order by provider_id", [he_id]) == [
            {"provider_id": "credential"}, {"provider_id": "google"}]
        replacement_context.close()
        record("AUTH07-password-create-same-document-replacement-after-expiry")
        assert not external and not errors
        browser.close()


try:
    run()
except Exception as error:
    # Never print bearer URLs, mailbox contents, passwords, or Playwright traces.
    print("AUTH02B_CONNECTED_FAIL after " + step + " (" + type(error).__name__ + ")", flush=True)
    raise SystemExit(1) from None
