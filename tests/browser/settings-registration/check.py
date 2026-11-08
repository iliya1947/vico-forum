"""SET-02 built Worker + Better Auth + PostgreSQL17 + real Chromium acceptance.

Only loopback URLs and a disposable *_test database; real Google credentials are not used.
"""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
from urllib.parse import urlencode, urlparse
from uuid import uuid4
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--url", default="http://127.0.0.1:4189")
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
base = args.url.rstrip("/")
database = os.environ.get("DATABASE_URL", "")
assert urlparse(base).hostname in ("127.0.0.1", "localhost")
assert urlparse(database).hostname in ("127.0.0.1", "localhost") and urlparse(database).path.endswith("_test")
repo = Path(__file__).resolve().parents[3]
node = shutil.which("node")
assert node
args.output.mkdir(parents=True, exist_ok=True)
prefix = "set02-" + uuid4().hex
cases, page_errors, external = [], [], []


def sql(statement, parameters=None):
    code = """import pg from 'pg';
const input=JSON.parse(await new Promise(r=>{let s='';
process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>r(s));}));
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
await client.connect();
try{console.log(JSON.stringify((await client.query(input.sql,input.parameters)).rows??[]));}
finally{await client.end();}"""
    result = subprocess.run([node, "--input-type=module", "-e", code], cwd=repo,
                            input=json.dumps({"sql": statement, "parameters": parameters or []}),
                            text=True, capture_output=True, check=True)
    return json.loads(result.stdout)


def record(name, **details):
    cases.append({"case": name, **details})
    print("SET02_ACCEPTANCE " + json.dumps(cases[-1], ensure_ascii=False), flush=True)


def policy():
    return sql("""select google_registration_enabled as google, email_registration_enabled as email,
        version from forum_registration_settings where id=1""")[0]


def history():
    return sql("""select id,actor_id,context from admin_history
        where action='settings.registrationChanged' and target_type='forum-settings'
        and target_id='registration' order by occurred_at,id""")


def get(page, path, status=200, private=False):
    response = page.goto(base + path, wait_until="networkidle")
    assert response is not None and response.status == status, (path, getattr(response, "status", None))
    if private:
        cache = {v.strip().lower() for v in response.headers.get("cache-control", "").split(",")}
        assert {"private", "no-store"} <= cache, (path, response.headers)
    else:
        assert "no-store" in response.headers.get("cache-control", ""), (path, response.headers)
    return response


def form_post(context, fields, origin=base):
    return context.request.post(base + "/en/settings/forum", headers={
        "Origin": origin, "Content-Type": "application/x-www-form-urlencoded",
    }, data=urlencode(fields), max_redirects=0)


def owned_page(context):
    page = context.new_page()
    page.set_default_timeout(20000)
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    return page


def no_overflow(page):
    width, scroll = page.evaluate("[innerWidth, document.documentElement.scrollWidth]")
    assert scroll <= width + 1, (page.url, width, scroll)


def availability(page, google, email):
    expect(page.locator("form.credential-form")).to_have_count(1 if email else 0)
    expect(page.get_by_role("button", name="Continue with Google")).to_have_count(1 if google else 0)
    expect(page.get_by_role("link", name="Already registered? Sign in")).to_have_count(1)


def owner_save(page, google, email, expected_version):
    form = page.locator("form.settings-registration-form")
    form.locator('input[name="googleRegistrationEnabled"]').set_checked(google)
    form.locator('input[name="emailRegistrationEnabled"]').set_checked(email)
    page.get_by_role("button", name="Save registration settings").click()
    expect(page.get_by_role("status")).to_contain_text("Registration settings updated.")
    next_version = expected_version + 1
    expect(form.locator('input[name="expectedVersion"]')).to_have_value(str(next_version))
    assert policy() == {"google": google, "email": email, "version": next_version}
    return next_version


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel=os.environ.get("PLAYWRIGHT_CHANNEL", "chromium"),
                                    headless=True, args=["--no-sandbox"])

        def isolated():
            ctx = browser.new_context(viewport={"width": 1280, "height": 900})
            ctx.route("**/*", lambda route: route.continue_() if route.request.url.startswith(base + "/")
                      else (external.append(route.request.url), route.abort())[-1])
            return ctx

        owner_ctx = isolated()
        owner_response = owner_ctx.request.post(base + "/api/auth/sign-up/email",
            headers={"Origin": base}, data={
                "name": "Synthetic Owner", "email": prefix + "-owner@test.invalid",
                "password": "synthetic-browser-password-123456",
            })
        assert owner_response.status == 200, (owner_response.status, owner_response.text()[:250])
        original_id = owner_response.json()["user"]["id"]
        owner_id = "set02-synthetic-owner"
        sql('insert into "user"(id,name,email) values($1,$2,$3)',
            [owner_id, "Bound Owner", prefix + "-bound@test.invalid"])
        assert sql('update "session" set user_id=$1 where user_id=$2 returning id',
                   [owner_id, original_id]), "real Better Auth session required"
        owner = owned_page(owner_ctx)
        member_ctx, race_ctx, guest_ctx = isolated(), isolated(), isolated()
        member, race, guest = owned_page(member_ctx), owned_page(race_ctx), owned_page(guest_ctx)

        assert policy() == {"google": True, "email": True, "version": 1}
        for locale in ("en", "ru", "he"):
            get(guest, "/" + locale + "/sign-up")
            availability(guest, True, True)
        record("migration-0060-defaults-and-public-locale-signup")

        # Full browser form + real Better Auth creates a real member and session.
        get(member, "/en/sign-up")
        member_email = prefix + "-member@test.invalid"
        member.get_by_role("textbox", name="Display name").fill("Integration member")
        member.get_by_role("textbox", name="Email").fill(member_email)
        member.get_by_label("Password").fill("synthetic-browser-password-123456")
        member.get_by_role("button", name="Create account").click()
        expect(member.locator(".auth-user")).to_have_count(1)
        member_rows = sql('select id from "user" where email=$1', [member_email])
        assert len(member_rows) == 1, "browser signup did not create a Better Auth user"
        member_id = member_rows[0]["id"]
        assert sql('select id from "session" where user_id=$1', [member_id])
        record("browser-email-signup-user-and-session-created")

        sql("insert into authz_user_roles(user_id,role_id) values($1,'builtin-admin')", [member_id])
        get(guest, "/en/settings/forum", 401, private=True)
        get(member, "/en/settings/forum", 403, private=True)
        assert form_post(member_ctx, {"expectedVersion": "1"}).status == 403
        assert form_post(guest_ctx, {"expectedVersion": "1"}).status == 401
        assert policy()["version"] == 1
        record("nonowner-manager-and-guest-denied-private-settings")

        get(owner, "/en/settings/forum", private=True)
        expect(owner.get_by_role("heading", name="Registration")).to_have_count(1)
        form = owner.locator("form.settings-registration-form")
        expect(form).to_have_count(1)
        expect(form.locator('input[name="googleRegistrationEnabled"]')).to_be_checked()
        expect(form.locator('input[name="emailRegistrationEnabled"]')).to_be_checked()
        assert form.locator('input[name="expectedVersion"]').input_value() == "1"
        expect(owner.locator('form:has(input[name="intent"])')).to_have_count(6)
        owner.get_by_role("button", name="Save registration settings").click()
        expect(owner.get_by_role("status")).to_contain_text("Registration settings updated.")
        assert policy()["version"] == 1 and not history()
        record("owner-noop-does-not-bump-version-or-history")

        # Open page remains stale while the authoritative policy later closes.
        get(race, "/en/sign-up")
        race_email = prefix + "-late@test.invalid"
        race.get_by_role("textbox", name="Display name").fill("Late registration")
        race.get_by_role("textbox", name="Email").fill(race_email)
        race.get_by_label("Password").fill("synthetic-browser-password-123456")

        version = 1
        for google, email in ((False, True), (True, False), (False, False)):
            version = owner_save(owner, google, email, version)
            get(guest, "/en/sign-up")
            availability(guest, google, email)
            record("independent-registration-flags", google=google, email=email, version=version)
        events = history()
        assert len(events) == 3 and all(event["actor_id"] == owner_id for event in events)
        assert events[-1]["context"]["after"] == {
            "googleRegistrationEnabled": False, "emailRegistrationEnabled": False, "version": version,
        }
        record("owner-mutates-policy-with-atomic-admin-history")

        before_users = sql('select count(*)::int n from "user"')[0]["n"]
        before_sessions = sql('select count(*)::int n from "session"')[0]["n"]
        race.get_by_role("button", name="Create account").click()
        expect(race.get_by_role("alert")).to_contain_text("New email registrations are currently closed.")
        assert sql('select count(*)::int n from "user"')[0]["n"] == before_users
        assert sql('select count(*)::int n from "session"')[0]["n"] == before_sessions
        assert not sql('select id from "user" where email=$1', [race_email])
        record("open-page-closed-policy-rejects-new-user-and-session")

        # Browser sign-in must continue to work after both new-registration flags close.
        member.get_by_role("button", name="Sign out").click()
        get(member, "/en/sign-in")
        expect(member.get_by_role("button", name="Sign in with email")).to_have_count(1)
        expect(member.get_by_role("button", name="Continue with Google")).to_have_count(1)
        member.get_by_role("textbox", name="Email").fill(member_email)
        member.get_by_label("Password").fill("synthetic-browser-password-123456")
        member.get_by_role("button", name="Sign in with email").click()
        expect(member.locator(".auth-user")).to_have_count(1)
        assert len(sql('select id from "user" where email=$1', [member_email])) == 1
        record("existing-email-login-while-both-registrations-closed")

        before = policy()
        count = len(history())
        invalid = form_post(owner_ctx, {"expectedVersion": str(version), "userId": owner_id})
        assert invalid.status == 400, (invalid.status, invalid.text()[:200])
        foreign = form_post(owner_ctx, {"expectedVersion": str(version)}, origin="https://untrusted.invalid")
        assert foreign.status in (400, 403), foreign.status
        assert policy() == before and len(history()) == count
        record("direct-forged-body-and-origin-fail-closed")

        # A second tab changes the version; old form gets 409 then auto-refreshes once.
        changed = form_post(owner_ctx, {"expectedVersion": str(version), "googleRegistrationEnabled": "on"})
        assert changed.status == 200, (changed.status, changed.text()[:220])
        version += 1
        assert policy() == {"google": True, "email": False, "version": version}
        before_count = len(history())
        owner.locator('form.settings-registration-form input[name="emailRegistrationEnabled"]').check()
        owner.get_by_role("button", name="Save registration settings").click()
        expect(owner.get_by_role("alert")).to_contain_text(
            "Settings changed. Review the current values and try again.")
        expect(owner.locator('form.settings-registration-form input[name="expectedVersion"]')).to_have_value(str(version))
        expect(owner.locator('form.settings-registration-form input[name="googleRegistrationEnabled"]')).to_be_checked()
        assert policy()["version"] == version and len(history()) == before_count
        record("stale-CAS-409-revalidation-without-replay")

        get(guest, "/en/sign-up?error=vico_google_registration_closed&error_description=SECRET")
        expect(guest.get_by_role("alert")).to_contain_text("New Google registrations are currently closed.")
        assert "SECRET" not in guest.locator("main").inner_text()
        get(guest, "/en/sign-in?error=internal-provider-token")
        expect(guest.get_by_role("alert")).to_contain_text("Authentication failed")
        assert "internal-provider-token" not in guest.locator("main").inner_text()
        record("safe-google-and-generic-oauth-error-return")

        for loc, direction in (("en", "ltr"), ("ru", "ltr"), ("he", "rtl")):
            for width in (320, 768, 1280):
                owner.set_viewport_size({"width": width, "height": 900})
                guest.set_viewport_size({"width": width, "height": 900})
                get(owner, "/" + loc + "/settings/forum", private=True)
                assert owner.locator("html").get_attribute("dir") == direction
                expect(owner.locator(".settings-registration-option")).to_have_count(2)
                no_overflow(owner)
                get(guest, "/" + loc + "/sign-up")
                assert guest.locator("html").get_attribute("dir") == direction
                no_overflow(guest)
                if width == 320:
                    owner.screenshot(path=str(args.output / ("owner-" + loc + "-320.png")), full_page=True)
                    guest.screenshot(path=str(args.output / ("signup-" + loc + "-320.png")), full_page=True)
            record("responsive-real-Owner-and-signup", locale=loc)
        assert not page_errors, page_errors
        assert not external, external
        record("set02-integrated-browser-acceptance-passed", finalPolicy=policy())
        owner_ctx.close()
        member_ctx.close()
        race_ctx.close()
        guest_ctx.close()
        browser.close()
finally:
    (args.output / "results.json").write_text(json.dumps({
        "implementationHead": os.environ.get("IMPLEMENTATION_SHA"),
        "cases": cases, "pageErrors": page_errors, "externalRequests": external,
    }, ensure_ascii=False, indent=2))
