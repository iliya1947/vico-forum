"""SET-05 real Chromium -> built Worker -> Better Auth 1.7.7 -> disposable PostgreSQL 17.

No production, external OAuth callback, live provider credentials, or non-loopback database.
"""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
from urllib.parse import urlencode, urlparse
from uuid import uuid4

from playwright.sync_api import expect, sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--url", default="http://127.0.0.1:4195")
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
base = args.url.rstrip("/")
database = os.environ.get("DATABASE_URL", "")
assert urlparse(base).hostname in ("127.0.0.1", "localhost")
assert urlparse(database).hostname in ("127.0.0.1", "localhost")
assert urlparse(database).path.endswith("_test")
repo = Path(__file__).resolve().parents[3]
node = shutil.which("node")
assert node
args.output.mkdir(parents=True, exist_ok=True)
prefix = "set05-" + uuid4().hex
old_password = "set05-synthetic-password-123"
new_password = "set05-new-synthetic-password-123"
records, page_errors, external = [], [], []


def sql(statement, parameters=None):
    code = """import pg from 'pg';
const input=JSON.parse(await new Promise(r=>{let s='';
process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>r(s));}));
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
await client.connect();
try{console.log(JSON.stringify((await client.query(input.sql,input.parameters)).rows??[]));}
finally{await client.end();}"""
    process = subprocess.run(
        [node, "--input-type=module", "-e", code],
        cwd=repo,
        input=json.dumps({"sql": statement, "parameters": parameters or []}),
        text=True,
        capture_output=True,
        check=True,
    )
    return json.loads(process.stdout)


def record(name):
    records.append({"case": name})
    print("SET05_ACCEPTANCE " + name, flush=True)


def guarded(context):
    context.route(
        "**/*",
        lambda route: route.continue_()
        if route.request.url.startswith(base + "/")
        else (external.append(route.request.url), route.abort())[-1],
    )


def document(page, path, status=200, private=True):
    response = page.goto(base + path, wait_until="networkidle")
    assert response and response.status == status, (path, getattr(response, "status", None))
    if private:
        directives = {item.strip().lower() for item in response.headers.get("cache-control", "").split(",")}
        assert {"private", "no-store"} <= directives, (path, response.headers)
    return response


def post(context, fields, origin=base):
    return context.request.post(
        base + "/en/settings/account",
        headers={"Origin": origin, "Content-Type": "application/x-www-form-urlencoded"},
        data=urlencode(fields),
        max_redirects=0,
    )


def actor(browser, name, signup=True, password=old_password):
    ctx = browser.new_context(
        viewport={"width": 1280, "height": 900},
        user_agent="Mozilla/5.0 SET05-" + name,
    )
    guarded(ctx)
    email = prefix + "-" + ("alice" if name in ("alice-2", "alice-3", "alice-4") else name) + "@test.invalid"
    fields = {"email": email, "password": password}
    if signup:
        fields["name"] = "SET05 " + name
    result = ctx.request.post(
        base + ("/api/auth/sign-up/email" if signup else "/api/auth/sign-in/email"),
        headers={"Origin": base},
        data=fields,
    )
    assert result.status == 200, (name, result.status, result.text()[:250])
    page = ctx.new_page()
    page.set_default_timeout(20000)
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    return ctx, page, result.json()["user"]["id"], email


def session_id(user_id, agent):
    rows = sql(
        'select id from "session" where user_id=$1 and user_agent like $2',
        [user_id, "%SET05-" + agent + "%"],
    )
    assert len(rows) == 1, (user_id, agent, rows)
    return rows[0]["id"]


def still_signed_in(page):
    document(page, "/en/settings/account")
    expect(page.get_by_role("heading", name="Account & security", exact=True)).to_have_count(1)


try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            channel=os.environ.get("PLAYWRIGHT_CHANNEL", "chromium"),
            headless=True, args=["--no-sandbox"],
        )
        guest_context = browser.new_context()
        guarded(guest_context)
        guest = guest_context.new_page()
        document(guest, "/en/settings/account", status=401)
        denied = post(guest_context, [("intent", "revoke-others"),
            ("expectedUserId", "forged"), ("expectedSessionId", "forged")])
        assert denied.status == 401
        record("unauthenticated-private-get-and-post")

        alice_ctx, alice, alice_id, alice_email = actor(browser, "alice")
        a2_ctx, a2, _, _ = actor(browser, "alice-2", signup=False)
        bob_ctx, bob, bob_id, _ = actor(browser, "bob")
        alice_sid = session_id(alice_id, "alice")
        a2_sid = session_id(alice_id, "alice-2")
        bob_sid = session_id(bob_id, "bob")
        still_signed_in(alice)
        expect(alice.locator(".settings-account-sessions li")).to_have_count(2)
        expect(alice.get_by_role("button", name="Connect Google")).to_have_count(1)
        expect(alice.locator('.settings-account-form input[name="newPassword"]')).to_have_count(1)
        expect(alice.locator(".settings-account-revoke-form")).to_have_count(1)
        assert alice.locator(".settings-account-revoke-form input[name=sessionId]").input_value() == a2_sid
        expect(alice.locator('.settings-account-revoke-form input[name="token"]')).to_have_count(0)
        token_rows = sql('select token from "session" where user_id=$1', [alice_id])
        html = alice.content()
        for secret in token_rows:
            assert secret["token"] not in html
        assert old_password not in html
        alice.screenshot(path=str(args.output / "account-english-desktop.png"), full_page=True)
        record("real-account-page-with-two-own-sessions-and-secret-free-html")

        document(alice, "/en/users/" + alice_id)
        expect(alice.get_by_role("link", name="Account & security")).to_have_attribute(
            "href", "/en/settings/account")
        expect(alice.get_by_role("button", name="Connect Google")).to_have_count(0)
        still_signed_in(alice)
        record("existing-explicit-google-link-control-moved-from-profile")

        required = [("intent", "revoke-others"),
                    ("expectedUserId", alice_id), ("expectedSessionId", alice_sid)]
        for fields, origin, status in (
            (required[:1] + [("expectedUserId", bob_id), required[2]], base, 409),
            (required[:2] + [("expectedSessionId", a2_sid)], base, 409),
            (required + [("targetUserId", bob_id)], base, 400),
            (required + [("expectedUserId", alice_id)], base, 400),
            (required, "https://foreign.invalid", 403),
        ):
            attempt = post(alice_ctx, fields, origin=origin)
            assert attempt.status == status, (fields, status, attempt.status)
        foreign = post(bob_ctx, [
            ("intent", "revoke-one"), ("expectedUserId", bob_id),
            ("expectedSessionId", bob_sid), ("sessionId", a2_sid),
        ])
        assert foreign.status == 409, foreign.status
        assert len(sql('select id from "session" where user_id=$1', [alice_id])) == 2
        record("origin-stale-identity-duplicate-fields-and-foreign-session-fail-closed")

        alice.locator("#settings-current-password").fill("wrong-synthetic-password")
        alice.locator("#settings-new-password").fill(new_password)
        alice.get_by_role("button", name="Change password").click()
        expect(alice.get_by_role("alert")).to_contain_text("current password is incorrect")
        assert sql('select count(*)::int as n from "session" where user_id=$1', [alice_id])[0]["n"] == 2
        alice.locator("#settings-current-password").fill(old_password)
        alice.locator("#settings-new-password").fill(new_password)
        alice.get_by_role("button", name="Change password").click()
        expect(alice.get_by_role("status")).to_contain_text("Password changed")
        bad = browser.new_context()
        bad_login = bad.request.post(base + "/api/auth/sign-in/email",
            headers={"Origin": base},
            data={"email": alice_email, "password": old_password})
        assert bad_login.status != 200
        bad.close()
        a3_ctx, a3, _, _ = actor(browser, "alice-3", signup=False, password=new_password)
        a3_sid = session_id(alice_id, "alice-3")
        still_signed_in(a2)
        record("wrong-and-correct-password-old-login-rejected-new-login-and-other-session-retained")

        # Both the single-target and all-others forms submit only own session IDs,
        # never the Better Auth session token. The other account must survive.
        still_signed_in(alice)
        revoke = alice.locator(".settings-account-revoke-form").filter(
            has=alice.locator('input[name="sessionId"][value="' + a2_sid + '"]')
        )
        expect(revoke).to_have_count(1)
        revoke.get_by_role("button", name="Sign out this other session").click()
        expect(alice.locator('input[name="sessionId"][value="' + a2_sid + '"]')).to_have_count(0)
        document(a2, "/en/settings/account", status=401)
        still_signed_in(bob)
        still_signed_in(alice)
        remaining = sql('select id from "session" where user_id=$1', [alice_id])
        assert {row["id"] for row in remaining} == {alice_sid, a3_sid}, remaining
        record("revoke-one-other-through-real-form-next-request-unauthorized-current-and-foreign-unchanged")

        alice.get_by_role("button", name="Sign out all other sessions").click()
        expect(alice.locator(".settings-account-revoke-form")).to_have_count(0)
        document(a3, "/en/settings/account", status=401)
        still_signed_in(alice)
        still_signed_in(bob)
        assert {row["id"] for row in sql('select id from "session" where user_id=$1', [alice_id])} == {alice_sid}
        record("revoke-all-others-preserves-current-and-unrelated-account")

        # Existing Better Auth freshness semantics, not an invented reauth route.
        a4_ctx, a4, _, _ = actor(browser, "alice-4", signup=False, password=new_password)
        a4_sid = session_id(alice_id, "alice-4")
        sql('update "session" set created_at=now() - interval \'2 days\' where id=$1', [alice_sid])
        document(alice, "/en/settings/account")
        expect(alice.get_by_text("sign out and sign in again", exact=False)).to_have_count(1)
        expect(alice.locator(".settings-account-revoke-form")).to_have_count(0)
        stale = post(alice_ctx, [
            ("intent", "revoke-one"), ("expectedUserId", alice_id),
            ("expectedSessionId", alice_sid), ("sessionId", a4_sid),
        ])
        assert stale.status == 403, stale.status
        still_signed_in(a4)
        record("better-auth-not-fresh-blocks-session-list-and-single-revoke")

        # Stand-in Google-linked account: only the provider-owned record is synthetic.
        # There is no live OAuth redirection, and no password is re-created.
        google_ctx, google, google_id, _ = actor(browser, "google-only")
        sql('delete from account where user_id=$1', [google_id])
        sql("""insert into account
          (id, account_id, provider_id, user_id, access_token, refresh_token, id_token, created_at, updated_at)
          values ($1, $2, 'google', $3, $4, $5, $6, now(), now())""", [
            prefix + "-google-link", "external-google-account", google_id,
            "set05-secret-access", "set05-secret-refresh", "set05-secret-id-token",
        ])
        document(google, "/en/settings/account")
        expect(google.get_by_text("Google", exact=True)).to_have_count(1)
        expect(google.locator(".settings-account-form")).to_have_count(0)
        expect(google.get_by_role("button", name="Connect Google")).to_have_count(0)
        expect(google.get_by_text("no password credential", exact=False)).to_have_count(1)
        google_html = google.content()
        for secret in ("set05-secret-access", "set05-secret-refresh", "set05-secret-id-token",
                       "external-google-account"):
            assert secret not in google_html
        forbidden_set = post(google_ctx, [
            ("intent", "change-password"), ("expectedUserId", google_id),
            ("expectedSessionId", session_id(google_id, "google-only")),
            ("currentPassword", old_password), ("newPassword", new_password),
        ])
        assert forbidden_set.status == 409, forbidden_set.status
        record("google-only-no-password-creation-and-no-provider-secret-exposure")

        # Real locale loader / localized bundle, rather than manually injected test translations.
        for locale, heading in (
            ("ru", "Аккаунт и безопасность"),
            ("he", "חשבון ואבטחה"),
        ):
            document(bob, "/" + locale + "/settings/account")
            expect(bob.get_by_role("heading", name=heading, exact=True)).to_have_count(1)
            assert bob.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
            if locale == "he":
                assert bob.evaluate("document.documentElement.dir") == "rtl"
                bob.screenshot(path=str(args.output / "account-hebrew-rtl.png"), full_page=True)
        bob.set_viewport_size({"width": 375, "height": 720})
        document(bob, "/ru/settings/account")
        assert bob.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
        bob.screenshot(path=str(args.output / "account-russian-mobile.png"), full_page=True)
        record("actual-russian-hebrew-localization-rtl-and-mobile-layout")

        # A fresh login after an aged session restores the unchanged Better Auth API.
        # Existing sign-out is authoritative and a returnTo stays under the same locale.
        alice_ctx.request.post(base + "/api/auth/sign-out", headers={"Origin": base}, data={})
        login_page = base + "/en/sign-in?returnTo=%2Fen%2Fsettings%2Faccount"
        document(alice, "/en/settings/account", status=401)
        alice.goto(login_page, wait_until="networkidle")
        alice.locator('input[name="email"]').fill(alice_email)
        alice.locator('input[name="password"]').fill(new_password)
        alice.get_by_role("button", name="Sign in", exact=False).click()
        expect(alice).to_have_url(base + "/en/settings/account")
        expect(alice.get_by_role("heading", name="Account & security", exact=True)).to_have_count(1)
        record("fresh-signout-signin-restores-sessions-and-same-locale-return-path")

        assert not page_errors, page_errors
        assert not external, external
        record("no-browser-errors-and-no-external-requests")
        for ctx in (guest_context, alice_ctx, a2_ctx, a3_ctx, a4_ctx, bob_ctx, google_ctx):
            ctx.close()
        browser.close()
finally:
    evidence = {
        "stage": "SET-05",
        "commit": os.environ.get("IMPLEMENTATION_SHA", "not-set"),
        "cases": records,
        "pageErrors": page_errors,
        "externalRequests": external,
    }
    (args.output / "results.json").write_text(json.dumps(evidence, indent=2, ensure_ascii=False))
