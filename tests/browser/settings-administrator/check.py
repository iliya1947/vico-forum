"""SET-04 isolated real Chromium / built Worker / Better Auth / PostgreSQL 17 acceptance."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
from urllib.parse import urlparse
from uuid import uuid4
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--url", default="http://127.0.0.1:4194")
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
base = args.url.rstrip("/")
db = os.environ.get("DATABASE_URL", "")
assert urlparse(base).hostname in ("127.0.0.1", "localhost")
assert urlparse(db).hostname in ("127.0.0.1", "localhost") and urlparse(db).path.endswith("_test")
repo = Path(__file__).resolve().parents[3]
node = shutil.which("node")
assert node
args.output.mkdir(parents=True, exist_ok=True)
prefix = "set04-" + uuid4().hex
owner_id = "set04-synthetic-owner"
records, errors, external = [], [], []

def sql(statement, parameters=None):
    script = """import pg from 'pg';
const input=JSON.parse(await new Promise(r=>{let s='';
process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>r(s));}));
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
await client.connect();
try{console.log(JSON.stringify((await client.query(input.sql,input.parameters)).rows??[]));}
finally{await client.end();}"""
    result = subprocess.run([node, "--input-type=module", "-e", script], cwd=repo,
        input=json.dumps({"sql": statement, "parameters": parameters or []}),
        text=True, capture_output=True, check=True)
    return json.loads(result.stdout)

def record(name):
    records.append({"case": name})
    print("SET04_ACCEPTANCE " + name, flush=True)

def document(page, path, status=200):
    response = page.goto(base + path, wait_until="networkidle")
    assert response and response.status == status, (path, getattr(response, "status", None))
    if "/settings/administrator" in path:
        cache = {part.strip().lower() for part in response.headers.get("cache-control", "").split(",")}
        assert {"private", "no-store"} <= cache, (path, response.headers)
    return response

def new_context(browser, name):
    ctx = browser.new_context(viewport={"width": 1280, "height": 900})
    ctx.route("**/*", lambda route: route.continue_() if route.request.url.startswith(base + "/")
              else (external.append(route.request.url), route.abort())[-1])
    created = ctx.request.post(base + "/api/auth/sign-up/email", headers={"Origin": base},
        data={"name": "SET04 " + name, "email": prefix + "-" + name + "@test.invalid",
              "password": "synthetic-browser-password-123456"})
    assert created.status == 200, (name, created.status, created.text()[:250])
    user_id = created.json()["user"]["id"]
    page = ctx.new_page()
    page.set_default_timeout(20000)
    page.on("pageerror", lambda error: errors.append(str(error)))
    return ctx, page, user_id

def no_overflow(page):
    width, measured = page.evaluate("[innerWidth, document.documentElement.scrollWidth]")
    assert measured <= width + 1, (page.url, width, measured)

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel=os.environ.get("PLAYWRIGHT_CHANNEL", "chromium"),
                                    headless=True, args=["--no-sandbox"])
        guest = browser.new_context()
        guest_page = guest.new_page()
        document(guest_page, "/en/settings/administrator", 401)
        record("guest-private-route")

        owner_ctx, owner, signup_id = new_context(browser, "owner")
        attention_ctx, attention, attention_id = new_context(browser, "attention")
        admin_ctx, admin, admin_id = new_context(browser, "admin")
        # Test-only bound Owner uses an actual Better Auth session and a disposable identity.
        sql('insert into "user"(id,name,email) values($1,$2,$3)',
            [owner_id, "SET04 Bound Owner", prefix + "-bound@test.invalid"])
        assert sql('update "session" set user_id=$1 where user_id=$2 returning id',
                   [owner_id, signup_id])
        sql("insert into authz_user_permission_overrides(user_id,permission_key,effect) "
            "values($1,'forum.complaint.appeal.review','allow')", [attention_id])
        sql("insert into authz_user_permission_overrides(user_id,permission_key,effect) "
            "values($1,'access.authorization.manage','allow')", [admin_id])

        document(owner, "/en/settings/administrator")
        expect(owner.get_by_role("heading", name="Administrator preferences")).to_have_count(1)
        document(admin, "/en/settings/administrator")
        expect(admin.locator("#settings-admin-default option")).to_have_count(2)  # Overview, Roles
        expect(admin.locator("#settings-attention-mode")).to_have_count(0)
        document(attention, "/en/settings/administrator")
        expect(attention.locator("#settings-admin-entry")).to_have_count(0)
        expect(attention.locator("#settings-attention-mode")).to_have_value("complaints")
        expect(attention.locator("#settings-attention-group")).to_have_value("group2")
        document(attention, "/en/admin", 403)
        record("real-owner-admin-only-attention-only-access")

        document(owner, "/en/settings/administrator")
        owner.locator("#settings-admin-default").select_option("roles")
        expect(owner.locator(".auth-admin-link")).to_have_attribute("href", "/en/admin/authorization")
        owner.locator("#settings-admin-density").select_option("compact")
        owner.locator(".settings-workspace-checkbox input").check()
        local_key = "vico:administrator-workspace:v1:" + owner_id
        saved = owner.evaluate("(key) => JSON.parse(localStorage.getItem(key))", local_key)
        assert saved["density"] == "compact" and saved["technicalDetailsExpanded"] is True
        assert "url" not in saved and "search" not in saved
        document(owner, "/en/admin")  # A direct URL stays on Overview, even when default=Roles.
        expect(owner.locator(".admin-panel[data-density='compact']")).to_have_count(1)
        expect(owner.get_by_role("heading", name="Overview", exact=True)).to_have_count(1)
        document(owner, "/en/admin/authorization")
        expect(owner.locator(".admin-panel[data-density='compact']")).to_have_count(1)
        technical = owner.locator(".admin-role-card .admin-technical-details").first
        expect(technical.locator(".admin-technical-content")).to_be_visible()
        technical.get_by_role("button", name="Hide technical details").click()
        expect(technical.locator(".admin-technical-content")).to_be_hidden()
        document(owner, "/en/admin/authorization")
        expect(owner.locator(".admin-role-card .admin-technical-content").first).to_be_visible()
        record("real-density-disclosure-manual-override-and-explicit-URL")

        document(owner, "/en/settings/administrator")
        owner.locator("#settings-admin-entry").select_option("last")
        document(owner, "/en/admin/forum")
        expect(owner.locator(".auth-admin-link")).to_have_attribute("href", "/en/admin/forum")
        document(owner, "/en/settings/administrator")
        expect(owner.get_by_role("link", name="Open Admin workspace")).to_have_attribute("href", "/en/admin/forum")
        owner.locator("#settings-attention-mode").select_option("security")
        owner.locator("#settings-attention-entry").select_option("default")
        expect(owner.locator(".header-attention-link")).to_have_attribute(
            "href", "/en/attention?mode=security&group=attachments")
        document(owner, "/en/attention?mode=signals&group=needs-review")
        expect(owner.locator(".attention-center-page[data-density='compact']")).to_have_count(1)
        record("default-last-entry-and-explicit-attention-deep-link-precedence")

        for locale, direction in (("en", "ltr"), ("ru", "ltr"), ("he", "rtl")):
            for width in (320, 768, 1280):
                owner.set_viewport_size({"width": width, "height": 900})
                document(owner, "/" + locale + "/settings/administrator")
                assert owner.locator("html").get_attribute("dir") == direction
                no_overflow(owner)
                for select in owner.locator(".settings-workspace-fieldset select").all():
                    assert select.bounding_box()["height"] >= 44, (locale, width)
                if width == 320:
                    owner.screenshot(path=str(args.output / (locale + "-320.png")), full_page=True)
            record("responsive-keyboard-tap-targets-" + locale)
        owner.locator("#settings-admin-density").focus()
        owner.keyboard.press("ArrowUp")
        expect(owner.locator("#settings-admin-density")).to_be_focused()

        # Same browser/localStorage, real Better Auth sign-out/sign-in: no owner preferences
        # appear for a different account and no automatic account or domain mutation occurs.
        result = owner_ctx.request.post(base + "/api/auth/sign-out",
            headers={"Origin": base, "Content-Type": "application/json"}, data="{}")
        assert result.status == 200
        result = owner_ctx.request.post(base + "/api/auth/sign-in/email", headers={"Origin": base},
            data={"email": prefix + "-attention@test.invalid",
                  "password": "synthetic-browser-password-123456"})
        assert result.status == 200
        document(owner, "/en/settings/administrator")
        expect(owner.locator("#settings-admin-entry")).to_have_count(0)
        expect(owner.locator("#settings-admin-density")).to_have_value("comfortable")
        assert owner.evaluate("(key) => JSON.parse(localStorage.getItem(key)).density", local_key) == "compact"
        assert owner.evaluate("(key) => localStorage.getItem(key)",
                              "vico:administrator-workspace:v1:" + attention_id) is None
        record("same-cookie-jar-account-isolation")

        # A storage preference is never a substitute for the next-request effective grant.
        sql("delete from authz_user_permission_overrides where user_id=$1 "
            "and permission_key='forum.complaint.appeal.review'", [attention_id])
        document(attention, "/en/settings/administrator", 403)
        document(owner, "/en/settings/administrator", 403)
        record("permission-revoke-fails-closed")

        assert not errors, errors
        assert not external, external
        record("set04-real-browser-acceptance-passed")
        browser.close()
finally:
    (args.output / "results.json").write_text(json.dumps({
        "implementationHead": os.environ.get("IMPLEMENTATION_SHA"),
        "cases": records, "pageErrors": errors, "externalRequests": external,
    }, indent=2))
