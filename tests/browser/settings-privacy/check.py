"""SET-06 Privacy: real Chromium -> built Worker -> Better Auth -> disposable PostgreSQL17.

Synthetic identities and a loopback database only; no real OAuth, Owner or production.
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
prefix = "set06-" + uuid4().hex
password = "set06-synthetic-password-123456"
records, page_errors, external = [], [], []


def sql(statement, parameters=None):
    source = """import pg from 'pg';
const input=JSON.parse(await new Promise(r=>{let s='';
process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>r(s));}));
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
await client.connect();
try{console.log(JSON.stringify((await client.query(input.sql,input.parameters)).rows??[]));}
finally{await client.end();}"""
    result = subprocess.run(
        [node, "--input-type=module", "-e", source], cwd=repo,
        input=json.dumps({"sql": statement, "parameters": parameters or []}),
        text=True, capture_output=True, check=True,
    )
    return json.loads(result.stdout)


def record(name, **facts):
    item = {"case": name, **facts}
    records.append(item)
    print("SET06_ACCEPTANCE " + json.dumps(item, ensure_ascii=False), flush=True)


def headers_no_store(response, private=False):
    directives = {part.strip().lower() for part in
                  response.headers.get("cache-control", "").split(",")}
    assert "no-store" in directives and (not private or "private" in directives), (
        response.url, response.status, response.headers)


def guarded(context):
    context.route("**/*", lambda route: route.continue_()
                  if route.request.url.startswith(base + "/")
                  else (external.append(route.request.url), route.abort())[-1])


def page_load(page, path, status=200, private=True):
    response = page.goto(base + path, wait_until="networkidle")
    assert response is not None and response.status == status, (
        path, getattr(response, "status", None), page.url)
    headers_no_store(response, private)
    return response


def api_post(ctx, path, fields, origin=base):
    return ctx.request.post(base + path, headers={
        "Origin": origin, "Content-Type": "application/x-www-form-urlencoded",
    }, data=urlencode(fields), max_redirects=0)


def privacy_post(ctx, user_id, enabled, origin=base):
    return api_post(ctx, "/en/settings/privacy", [
        ("intent", "save-online-visibility"), ("expectedUserId", user_id),
        ("showOnline", "true" if enabled else "false"),
    ], origin)


def ping(ctx, user_id):
    result = api_post(ctx, "/en/presence", [
        ("intent", "heartbeat"), ("expectedUserId", user_id),
    ])
    assert result.status == 204, (result.status, result.text()[:200])
    headers_no_store(result)
    return result


def create_actor(browser, label, signup=True):
    ctx = browser.new_context(
        viewport={"width": 1280, "height": 900},
        extra_http_headers={"cf-connecting-ip": {
            "alice": "203.0.113.61", "alice-second": "203.0.113.62",
            "bob": "203.0.113.63",
        }[label]},
    )
    guarded(ctx)
    user = "alice" if label == "alice-second" else label
    fields = {"email": prefix + "-" + user + "@test.invalid", "password": password}
    if signup:
        fields["name"] = "SET06 " + user
    response = ctx.request.post(
        base + ("/api/auth/sign-up/email" if signup else "/api/auth/sign-in/email"),
        headers={"Origin": base}, data=fields,
    )
    assert response.status == 200, (label, response.status, response.text()[:220])
    page = ctx.new_page()
    page.set_default_timeout(20000)
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    return ctx, page, response.json()["user"]["id"]


def preference(user_id):
    rows = sql("select show_online from user_privacy_preferences where user_id=$1", [user_id])
    return None if not rows else rows[0]["show_online"]


def presence(user_id):
    return sql("select last_seen_at::text as seen from forum_online_presence where user_id=$1", [user_id])


def public_members(guest, expected_count=None):
    page_load(guest, "/en/")
    links = guest.locator(".home-online-members a")
    names = links.all_inner_texts()
    displayed = guest.locator(".home-online-card > p").first.inner_text()
    count = sql("""select count(*)::int as n from forum_online_presence p
      left join user_privacy_preferences pref on pref.user_id=p.user_id
      where p.last_seen_at >= now()-interval '5 minutes'
      and coalesce(pref.show_online,true)""")[0]["n"]
    if expected_count is not None:
        assert count == expected_count, (count, expected_count)
    assert len(names) == count or count > 12 and len(names) == 12, (names, count)
    assert str(count) in displayed, (displayed, count)
    return names, count


try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            channel=os.environ.get("PLAYWRIGHT_CHANNEL", "chromium"),
            headless=True, args=["--no-sandbox"],
        )
        guest_ctx = browser.new_context()
        guarded(guest_ctx)
        guest = guest_ctx.new_page()
        guest.set_default_timeout(20000)
        guest.on("pageerror", lambda error: page_errors.append(str(error)))

        # All private document, data and controlled error paths must be real no-store.
        page_load(guest, "/en/settings/privacy", status=401)
        denial = privacy_post(guest_ctx, "forged", False)
        assert denial.status == 401
        headers_no_store(denial, True)
        record("guest-private-page-and-write-denial")

        alice_ctx, alice, alice_id = create_actor(browser, "alice")
        a2_ctx, a2, second_id = create_actor(browser, "alice-second", signup=False)
        bob_ctx, bob, bob_id = create_actor(browser, "bob")
        assert second_id == alice_id and bob_id != alice_id
        assert preference(alice_id) is None
        assert preference(bob_id) is None
        page_load(alice, "/en/settings/privacy")
        expect(alice.get_by_role("checkbox", name="Show me online")).to_be_checked()
        expect(alice.locator('.settings-panel-nav a[aria-current="page"]')).to_have_attribute(
            "href", "/en/settings/privacy")
        assert alice.locator('.settings-privacy-form input[name="expectedUserId"]').input_value() == alice_id
        alice.screenshot(path=str(args.output / "privacy-en-desktop.png"), full_page=True)
        ping(alice_ctx, alice_id)
        ping(bob_ctx, bob_id)
        names, count = public_members(guest)
        assert "SET06 alice" in names and "SET06 bob" in names, (names, count)
        record("default-on-heartbeat-guest-list-and-count", count=count)

        foreign = privacy_post(alice_ctx, alice_id, False, origin="https://foreign.invalid")
        assert foreign.status in (400, 403), (foreign.status, foreign.text()[:200])
        headers_no_store(foreign, True)
        stale = privacy_post(alice_ctx, bob_id, False)
        assert stale.status == 409, (stale.status, stale.text()[:200])
        headers_no_store(stale, True)
        invalid = api_post(alice_ctx, "/en/settings/privacy", [
            ("intent", "save-online-visibility"), ("expectedUserId", alice_id),
            ("showOnline", "on"),
        ])
        assert invalid.status == 400, (invalid.status, invalid.text()[:200])
        headers_no_store(invalid, True)
        duplicate = api_post(alice_ctx, "/en/settings/privacy", [
            ("intent", "save-online-visibility"), ("expectedUserId", alice_id),
            ("showOnline", "false"), ("showOnline", "true"),
        ])
        assert duplicate.status == 400, (duplicate.status, duplicate.text()[:200])
        headers_no_store(duplicate, True)
        assert preference(alice_id) is None and preference(bob_id) is None
        record("real-http-origin-identity-strict-boolean-and-duplicate-guards")

        # Submit OFF in Chromium, not by direct SQL, and check committed server effects.
        alice.get_by_role("checkbox", name="Show me online").uncheck()
        alice.get_by_role("button", name="Save privacy setting").click()
        expect(alice.get_by_role("status", name=None)).to_contain_text("Online visibility saved.")
        assert preference(alice_id) is False
        assert not presence(alice_id), presence(alice_id)
        assert preference(bob_id) is None
        for _ in range(2):
            ping(alice_ctx, alice_id)
        assert not presence(alice_id)
        names, count_after = public_members(guest)
        assert "SET06 alice" not in names and "SET06 bob" in names
        assert count_after == count-1, (count, count_after)
        # Do not mistake DOM-only hiding for the server-side data response.
        snapshot = guest_ctx.request.get(base + "/en.data")
        assert snapshot.status == 200, (snapshot.status, snapshot.text()[:250])
        headers_no_store(snapshot, True)
        assert alice_id not in snapshot.text(), "hidden identity leaked from fresh home data"
        assert bob_id in snapshot.text(), "visible identity missing from fresh home data"
        assert alice_id not in guest.content(), "hidden identity leaked from fresh guest HTML"
        profile = guest_ctx.request.get(base + "/en/users/" + alice_id)
        assert profile.status == 200, profile.status
        record("off-atomic-cleanup-hidden-heartbeat-guest-document-and-data", count=count_after)

        page_load(a2, "/en/settings/privacy")
        expect(a2.get_by_role("checkbox", name="Show me online")).not_to_be_checked()
        page_load(alice, "/ru/settings/privacy")
        expect(alice.get_by_role("checkbox", name="Показывать меня онлайн")).not_to_be_checked()
        page_load(alice, "/he/settings/privacy")
        expect(alice.get_by_role("checkbox", name="להציג אותי כמחובר/ת")).not_to_be_checked()
        assert alice.locator("html").get_attribute("dir") == "rtl"
        assert not presence(alice_id)
        record("persisted-off-across-sessions-and-EN-RU-HE")

        for locale, direction in (("en", "ltr"), ("ru", "ltr"), ("he", "rtl")):
            for width in (320, 768, 1280):
                alice.set_viewport_size({"width": width, "height": 900})
                page_load(alice, "/" + locale + "/settings/privacy")
                assert alice.locator("html").get_attribute("dir") == direction
                control = alice.get_by_role("checkbox")
                expect(control).to_be_enabled()
                current, document_width = alice.evaluate(
                    "[innerWidth, document.documentElement.scrollWidth]")
                assert document_width <= current + 1, (locale, width, document_width)
                if width == 320:
                    alice.screenshot(path=str(args.output / (locale + "-320.png")), full_page=True)
            record("responsive-mobile-tablet-desktop-and-RTL", locale=locale)
        alice.set_viewport_size({"width": 1280, "height": 900})
        page_load(alice, "/en/settings/privacy")
        control = alice.get_by_role("checkbox", name="Show me online")
        control.focus()
        alice.keyboard.press("Space")
        expect(control).to_be_checked()
        assert preference(alice_id) is False, "keyboard draft must not save without submit"
        alice.reload(wait_until="networkidle")
        expect(alice.get_by_role("checkbox", name="Show me online")).not_to_be_checked()
        record("native-keyboard-draft-and-unsaved-reload")

        # Closing mounted tabs prevents new browser-initiated pings after ON,
        # so ON itself can be distinguished from the next explicit heartbeat.
        alice.close()
        a2.close()
        enabled = privacy_post(a2_ctx, alice_id, True)
        assert enabled.status == 200, (enabled.status, enabled.text()[:250])
        headers_no_store(enabled, True)
        assert preference(alice_id) is True
        assert not presence(alice_id), "ON must not synthesize last_seen"
        names, count_still_hidden = public_members(guest)
        assert "SET06 alice" not in names and count_still_hidden == count_after
        ping(a2_ctx, alice_id)
        names, restored_count = public_members(guest)
        assert "SET06 alice" in names and restored_count == count
        record("on-does-not-fake-activity-next-real-heartbeat-restores")

        # End the second session and verify auth denial is independent of preference.
        signout = a2_ctx.request.post(base + "/api/auth/sign-out", headers={"Origin": base},
                                      data={})
        assert signout.status == 200, (signout.status, signout.text()[:120])
        denied = privacy_post(a2_ctx, alice_id, False)
        assert denied.status == 401, (denied.status, denied.text()[:150])
        headers_no_store(denied, True)
        assert preference(alice_id) is True
        record("revoked-session-write-denied-without-altering-preference")

        assert not page_errors, page_errors
        assert not external, external
        record("no-browser-errors-no-external-requests")
        for ctx in (alice_ctx, a2_ctx, bob_ctx, guest_ctx):
            ctx.close()
        browser.close()
finally:
    evidence = {"stage": "SET-06", "implementationHead": os.environ.get("IMPLEMENTATION_SHA"),
                "cases": records, "pageErrors": page_errors, "externalRequests": external}
    (args.output / "results.json").write_text(json.dumps(evidence, indent=2, ensure_ascii=False))
