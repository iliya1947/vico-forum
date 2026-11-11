"""SA-01 connected Chromium/Worker/Better Auth/PostgreSQL17 acceptance.

Only disposable local *_test storage and synthetic Owner binding; not deployed acceptance.
"""
import argparse
import json
import os
from contextlib import contextmanager
from pathlib import Path
import shutil
import subprocess
from urllib.parse import quote, urlparse
from uuid import uuid4

from playwright.sync_api import expect, sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--url", default="http://127.0.0.1:4195")
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
base = args.url.rstrip("/")
db = os.environ.get("DATABASE_URL", "")
assert urlparse(base).hostname in ("localhost", "127.0.0.1")
assert urlparse(db).hostname in ("localhost", "127.0.0.1")
assert urlparse(db).path.endswith("_test")
repo = Path(__file__).resolve().parents[3]
node = shutil.which("node")
assert node
args.output.mkdir(parents=True, exist_ok=True)
owner_id = "sa01-synthetic-owner"
prefix = "sa01-" + uuid4().hex
records, page_errors, external = [], [], []


def sql(statement, params=None):
    js = """import pg from 'pg';
const input=JSON.parse(await new Promise(resolve=>{let text='';
process.stdin.on('data',chunk=>text+=chunk);
process.stdin.on('end',()=>resolve(text));}));
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
await client.connect();
try{console.log(JSON.stringify((await client.query(input.statement,input.params)).rows));}
finally{await client.end();}"""
    result = subprocess.run(
        [node, "--input-type=module", "-e", js], cwd=repo,
        input=json.dumps({"statement": statement, "params": params or []}),
        text=True, capture_output=True, check=True,
    )
    return json.loads(result.stdout)


@contextmanager
def exclusive_lock(table):
    assert table in ("admin_history", "owner_events")
    js = """import pg from 'pg';
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
await client.connect();await client.query('begin');
await client.query('lock table "'+process.argv[1]+'" in access exclusive mode');
console.log('LOCKED');
process.stdin.once('data',async()=>{await client.query('rollback');await client.end();});"""
    child = subprocess.Popen(
        [node, "--input-type=module", "-e", js, table], cwd=repo,
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, bufsize=1,
    )
    try:
        line = child.stdout.readline().strip()
        assert line == "LOCKED", (table, line, child.stderr.read())
        yield
    finally:
        if child.poll() is None:
            child.stdin.write("release\n")
            child.stdin.flush()
            child.stdin.close()
            child.wait(timeout=15)
        assert child.returncode == 0, (table, child.returncode, child.stderr.read())
        child.stdout.close()
        child.stderr.close()


def record(name, **facts):
    item = {"case": name, **facts}
    records.append(item)
    print("SA01_ACCEPTANCE " + json.dumps(item, ensure_ascii=False), flush=True)


def no_store(response):
    cache = {value.strip().lower() for value in response.headers.get("cache-control", "").split(",")}
    assert {"private", "no-store"} <= cache, (response.url, response.status, response.headers)


def guarded(ctx):
    ctx.route("**/*", lambda route: route.continue_()
              if route.request.url.startswith(base + "/")
              else (external.append(route.request.url), route.abort())[-1])


def get(page, path, status=200, private=True):
    response = page.goto(base + path, wait_until="domcontentloaded")
    assert response and response.status == status, (path, getattr(response, "status", None), page.url)
    if private:
        no_store(response)
    return response


def request(ctx, path, status=200):
    response = ctx.request.get(base + path, timeout=30000)
    assert response.status == status, (path, response.status, response.text()[:300])
    no_store(response)
    return response


def account(browser, name, ip):
    ctx = browser.new_context(
        viewport={"width": 1280, "height": 900},
        extra_http_headers={"cf-connecting-ip": ip},
        service_workers="block",
    )
    guarded(ctx)
    response = ctx.request.post(base + "/api/auth/sign-up/email",
        headers={"Origin": base}, data={
            "name": "SA01 " + name, "email": prefix + "-" + name + "@test.invalid",
            "password": "synthetic-browser-password-123456",
        })
    assert response.status == 200, (name, response.status, response.text()[:300])
    page = ctx.new_page()
    page.set_default_timeout(30000)
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    return ctx, page, response.json()["user"]["id"]


try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            channel=os.environ.get("PLAYWRIGHT_CHANNEL", "chromium"),
            headless=True, args=["--no-sandbox"],
        )
        guest_ctx = browser.new_context(service_workers="block")
        guarded(guest_ctx)
        guest = guest_ctx.new_page()
        guest.on("pageerror", lambda error: page_errors.append(str(error)))
        endpoints = (
            "/en/super-admin", "/en/super-admin/monitoring",
            "/en/super-admin/monitoring/system",
            "/en/super-admin/monitoring/system/system.runtime/history",
            "/en/super-admin/events", "/en/super-admin/infrastructure",
        )
        for path in endpoints:
            request(guest_ctx, path, 401)
        request(guest_ctx, "/en/super-admin/events?before=invalid", 401)
        record("guest-denied-on-all-six-routes-before-cursor-parsing")

        owner_ctx, owner, original_id = account(browser, "owner", "203.0.113.71")
        admin_ctx, admin, admin_id = account(browser, "admin", "203.0.113.72")
        sql('insert into "user"(id,name,email) values($1,$2,$3)',
            [owner_id, "SA01 Bound Owner", prefix + "-bound@test.invalid"])
        assert sql('update "session" set user_id=$1 where user_id=$2 returning id',
                   [owner_id, original_id])
        sql("insert into authz_user_permission_overrides(user_id,permission_key,effect) "
            "values($1,'access.authorization.manage','allow')", [admin_id])
        for path in endpoints:
            request(admin_ctx, path, 403)
        request(admin_ctx, "/en/super-admin/events?before=invalid", 403)
        get(admin, "/en/admin")
        expect(admin.locator('a[href="/en/super-admin"]')).to_have_count(0)
        get(admin, "/en/users/" + admin_id, private=False)
        expect(admin.locator('a[href="/en/super-admin"]')).to_have_count(0)
        record("admin-with-authorization-access-still-denied-owner-surface")

        get(owner, "/en/admin")
        expect(owner.locator('.admin-panel-nav a[href="/en/super-admin"]')).to_have_count(1)
        get(owner, "/en/users/" + owner_id, private=False)
        expect(owner.locator('a[href="/en/super-admin"]')).to_have_count(1)
        record("both-owner-entry-links-same-canonical-route")

        get(owner, "/en/super-admin")
        expect(owner.locator(".super-admin-monitor")).to_have_count(3)
        assert owner.locator(".super-admin-monitors").get_attribute("data-monitor-count") == "3"
        assert "PostgreSQL" in owner.content() or "postgresql" in owner.content()
        expected_version = sql("select current_setting('server_version') as version")[0]["version"]
        assert expected_version in owner.content(), "System monitor must display real PG17 version"
        observed = sql("select id,monitor_key,source,quality from owner_monitor_observations order by position")
        assert {x["monitor_key"] for x in observed} == {
            "system.runtime", "system.dependencies", "system.requests"}, observed
        assert len(observed) == 3, observed
        get(owner, "/en/super-admin/monitoring/system")
        assert len(sql("select id from owner_monitor_observations")) == 3, "refresh must deduplicate same state"
        assert owner.locator(".super-admin-monitor nav a").count() == 6
        record("real-system-read-and-three-deduplicated-history-samples",
               postgresVersion=expected_version)

        get(owner, "/en/super-admin/monitoring")
        expect(owner.locator('a[href="/en/super-admin/monitoring/system"]')).to_have_count(1)
        expect(owner.locator('a[href="/en/super-admin/monitoring/accounts"]')).to_have_count(1)
        expect(owner.locator('a[href="/en/super-admin/monitoring/security"]')).to_have_count(1)
        assert owner.locator(".super-admin-pending-areas li").count() == 10
        for key in ("system.runtime", "system.dependencies", "system.requests"):
            path = "/en/super-admin/monitoring/system/" + key + "/history"
            get(owner, path)
            expect(owner.locator(".super-admin-timeline li")).to_have_count(1)
            assert "application" in owner.content() or "database" in owner.content()
            data_response = request(owner_ctx, path + ".data")
            sample_id = next(row["id"] for row in observed if row["monitor_key"] == key)
            assert sample_id in data_response.text(), ("observation source identity missing", key)
        for path, status in (
            ("/en/super-admin/events?before=invalid", 400),
            ("/en/super-admin/events?raw=1", 400),
            ("/en/super-admin/monitoring/system/system.runtime/history?before=bad", 400),
            ("/en/super-admin/monitoring/system/untrusted/history", 404),
        ):
            request(owner_ctx, path, status)
        record("adjacent-real-history-source-identity-and-strict-cursor-scope")

        # Only calendar-valid canonical cursors may reach the real PostgreSQL reader.
        suffix = "~system-event~123e4567-e89b-42d3-a456-426614174000"
        routes = (
            "/en/super-admin/events",
            "/en/super-admin/monitoring/system/system.runtime/history",
        )
        valid_query = "?before=" + quote("2026-02-28T00:00:00.000Z" + suffix, safe="")
        for path in routes:
            request(owner_ctx, path + valid_query, 200)
            request(owner_ctx, path + ".data" + valid_query, 200)
        for stamp in (
            "2026-02-31T00:00:00.000Z", "2025-02-29T00:00:00.000Z",
            "2026-12-31T24:00:00.000Z", "0000-01-01T00:00:00.000Z",
        ):
            query = "?before=" + quote(stamp + suffix, safe="")
            for path in routes:
                request(owner_ctx, path + query, 400)
                request(owner_ctx, path + ".data" + query, 400)
        record("invalid-calendar-cursors-private-400-on-global-scoped-document-and-data")

        response = owner_ctx.request.post(base + "/en/admin/authorization",
            headers={"Origin": base},
            form={"intent": "createRole", "slug": prefix, "displayName": "SA01 history producer"})
        assert response.status == 200, (response.status, response.text()[:300])
        history = sql("select id,action from admin_history where actor_id=$1 order by occurred_at desc", [owner_id])
        assert history, "canonical Admin mutation must emit authoritative domain History"
        get(owner, "/en/super-admin/events")
        event_data = request(owner_ctx, "/en/super-admin/events.data").text()
        assert history[0]["id"] in event_data, "global Event log must project native Admin History identity"
        for row in observed:
            assert row["id"] in event_data, "global Event log must share observation identity"
        record("real-admin-authoritative-event-and-one-shared-global-timeline")

        get(owner, "/en/super-admin/infrastructure")
        assert "Stage 6" in owner.content()
        assert "Under development" in owner.content()
        assert "Cloudflare, Neon, providers and secrets are not connected" in owner.content()
        record("infrastructure-stage6-placeholder-without-live-probes")

        for locale, direction in (("en", "ltr"), ("ru", "ltr"), ("he", "rtl")):
            for width in (320, 768, 1280):
                owner.set_viewport_size({"width": width, "height": 900})
                get(owner, "/" + locale + "/super-admin")
                assert owner.locator("html").get_attribute("dir") == direction
                assert owner.locator("html").get_attribute("lang") == locale
                current, total = owner.evaluate("[innerWidth, document.documentElement.scrollWidth]")
                assert total <= current + 1, (locale, width, total)
                if width in (320, 1280):
                    owner.screenshot(path=str(args.output / (locale + "-" + str(width) + ".png")),
                                     full_page=True)
            record("localized-responsive-overview", locale=locale, direction=direction)
        owner.set_viewport_size({"width": 1280, "height": 900})
        get(owner, "/en/super-admin")
        nav = owner.locator('.admin-panel-nav a[href="/en/super-admin/monitoring"]')
        nav.focus()
        owner.keyboard.press("Enter")
        expect(owner).to_have_url(base + "/en/super-admin/monitoring")
        record("native-keyboard-super-admin-navigation")

        # Real PostgreSQL query timeout in the shared native History reader.
        # The separately recorded 5xx system event must contain no request metadata.
        with exclusive_lock("admin_history"):
            unavailable = request(owner_ctx, "/en/super-admin/events", 503)
            assert "no-store" in unavailable.headers.get("cache-control", "")
        failure_events = sql(
            "select id,monitor_key,payload from owner_events where kind='system.requestFailed'")
        assert failure_events, "built Worker must record an actual 5xx result"
        assert all(event["monitor_key"] == "system.requests" for event in failure_events)
        assert all(set(event["payload"]) <= {"component", "code", "latencyMs"}
                   for event in failure_events)
        assert any(event["payload"]["code"] == "503" for event in failure_events)
        request(owner_ctx, "/en/super-admin/events.data")
        owner_event_data = request(owner_ctx, "/en/super-admin/events.data").text()
        assert failure_events[-1]["id"] in owner_event_data
        record("real-query-timeout-503-and-redacted-owner-5xx-event")

        # Current system-read outage is distinct from a fabricated healthy state.
        with exclusive_lock("owner_events"):
            request(owner_ctx, "/en/super-admin/monitoring/system", 503)
        record("postgres-unavailable-returns-private-503-not-false-health")

        sign_out = owner_ctx.request.post(base + "/api/auth/sign-out",
                                         headers={"Origin": base}, data={})
        assert sign_out.status == 200, sign_out.status
        request(owner_ctx, "/en/super-admin/events", 401)
        record("revoked-better-auth-session-no-longer-reads-owner-events")

        assert not page_errors, page_errors
        assert not external, external
        record("no-browser-exceptions-or-external-network")
        for ctx in (owner_ctx, admin_ctx, guest_ctx):
            ctx.close()
        browser.close()
finally:
    (args.output / "results.json").write_text(
        json.dumps({"stage": "SA-01", "implementationHead": os.environ.get("IMPLEMENTATION_SHA"),
                    "cases": records, "pageErrors": page_errors,
                    "externalRequests": external}, indent=2, ensure_ascii=False))
