"""4b.1: real Chromium -> built Worker -> Better Auth -> disposable PG17 smoke only."""
import argparse
import json
import os
import select
import shutil
import subprocess
from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4

from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument("--url", default="http://127.0.0.1:4242")
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
base = args.url.rstrip("/")
database = urlparse(os.environ["DATABASE_URL"])
assert os.environ.get("CI") == "true"
assert urlparse(base).hostname in ("localhost", "127.0.0.1")
assert database.hostname in ("localhost", "127.0.0.1")
assert database.path == "/vico_filters_browser_test"
repo = Path(__file__).resolve().parents[3]
args.output.mkdir(parents=True, exist_ok=True)
fixture = subprocess.Popen(
    [shutil.which("node"), "--import", "tsx", str(Path(__file__).with_name("pg.mjs"))],
    cwd=repo, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1,
)
assert fixture.stdout.readline().strip() == "READY"
cases, errors, external = [], [], []


def rpc(value):
    fixture.stdin.write(json.dumps(value) + "\n")
    fixture.stdin.flush()
    assert select.select([fixture.stdout], [], [], 30)[0], "Mute/Block fixture timeout"
    answer = json.loads(fixture.stdout.readline())
    assert "error" not in answer, answer
    return answer["result"]


def sql(statement, params=None):
    return rpc({"operation": "sql", "sql": statement, "params": params or []})


def private(response, status=200):
    assert response.status == status, (response.status, status, response.text()[:200])
    cache = {part.strip() for part in response.headers.get("cache-control", "").split(",")}
    assert {"private", "no-store"} <= cache, response.headers


def record(case):
    cases.append(case)
    print("FILTERS_CONNECTED " + case, flush=True)


try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True, executable_path=os.environ.get("PLAYWRIGHT_EXECUTABLE") or None,
            channel=None if os.environ.get("PLAYWRIGHT_EXECUTABLE") else "chrome",
            args=["--no-sandbox"],
        )
        contexts = []

        def context():
            ctx = browser.new_context(
                viewport={"width": 1280, "height": 900}, service_workers="block",
                extra_http_headers={"cf-connecting-ip": "192.0.2." + str(120 + len(contexts))},
            )
            contexts.append(ctx)
            ctx.route("**/*", lambda route: route.continue_()
                      if route.request.url.startswith(base + "/")
                      else (external.append(route.request.url), route.abort())[-1])
            return ctx

        def account(label):
            ctx = context()
            response = ctx.request.post(
                base + "/api/auth/sign-up/email", headers={"Origin": base},
                data={"name": label, "email": uuid4().hex + "@filters.test.invalid",
                      "password": "Filters-local-password-123456"},
            )
            assert response.status == 200, (response.status, response.text()[:300])
            return ctx, response.json()["user"]["id"]

        author, author_id = account("Filters author")
        actor, actor_id = account("Filters viewer")
        guest = context()
        seeded = rpc({"operation": "seed", "author": author_id, "prefix": "filters-" + uuid4().hex})
        topic_path = "/en/topics/" + seeded["topicId"]
        profile_path = "/en/users/" + author_id

        private(guest.request.get(base + "/en/filters.data"), 401)
        private(actor.request.get(base + "/en/filters.data"))
        assert sql("select user_id from forum_topic_mutes where user_id=$1", [actor_id]) == []
        assert sql("select user_id from forum_user_blocks where user_id=$1", [actor_id]) == []
        record("real Better Auth sign-up, isolated PG17 and private filters loader")

        page = actor.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        private(page.goto(base + "/en/filters", wait_until="networkidle"))
        expect(page.get_by_role("heading", name="Personal filters")).to_be_visible()
        expect(page.get_by_role("link", name="Muted topics")).to_be_visible()
        expect(page.get_by_role("link", name="Blocked users")).to_be_visible()
        record("private filters document renders for own actor")

        private(page.goto(base + topic_path, wait_until="networkidle"))
        expect(page.get_by_role("button", name="Mute topic", exact=True)).to_be_visible()
        expect(page.locator(".personal-filter-control button[aria-pressed=false]")).to_have_count(1)
        private(page.goto(base + profile_path, wait_until="networkidle"))
        expect(page.get_by_role("button", name="Block user", exact=True)).to_be_visible()
        expect(page.locator(".personal-filter-control button[aria-pressed=false]")).to_have_count(1)
        record("public topic and other-user profile expose independent Off controls")

        guest_page = guest.new_page()
        assert guest_page.goto(base + topic_path).status == 200
        expect(guest_page.locator(".personal-filter-control")).to_have_count(0)
        assert sql("select user_id from forum_topic_mutes where user_id=$1", [actor_id]) == []
        assert sql("select user_id from forum_user_blocks where user_id=$1", [actor_id]) == []
        record("guest public read and zero implicit personal writes")
        assert not errors, errors
        assert not external, external
        browser.close()
finally:
    fixture.stdin.close()
    fixture.wait(timeout=15)
    (args.output / "results.json").write_text(
        json.dumps({"cases": cases, "pageErrors": errors, "external": external}, indent=2),
    )
