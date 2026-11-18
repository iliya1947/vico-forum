"""Real Watch: Chromium -> built Worker -> Better Auth -> PostgreSQL 17 inbox."""
import argparse
import json
import os
import re
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
db_url = urlparse(os.environ["DATABASE_URL"])
assert os.environ.get("CI") == "true" and urlparse(base).hostname in ("localhost", "127.0.0.1")
assert db_url.hostname in ("localhost", "127.0.0.1") and db_url.path == "/vico_watch_browser_test"
repo = Path(__file__).resolve().parents[3]
args.output.mkdir(parents=True, exist_ok=True)
fixture = subprocess.Popen([shutil.which("node"), "--import", "tsx", str(Path(__file__).with_name("pg.mjs"))],
    cwd=repo, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1)
assert fixture.stdout.readline().strip() == "READY"
records, page_errors, external = [], [], []

def rpc(value):
    fixture.stdin.write(json.dumps(value) + "\n")
    fixture.stdin.flush()
    assert select.select([fixture.stdout], [], [], 30)[0], "Watch fixture timeout"
    response = json.loads(fixture.stdout.readline())
    assert "error" not in response, response
    return response["result"]

def sql(text, params=None):
    return rpc({"operation": "sql", "sql": text, "params": params or []})

def record(label):
    records.append(label)
    print("WATCH_CONNECTED " + label, flush=True)

def private(response, status=200):
    assert response.status == status, (response.status, status, response.text()[:250])
    assert {"private", "no-store"} <= {value.strip() for value in
        response.headers.get("cache-control", "").split(",")}, response.headers

def reply(context, path, content):
    response = context.request.post(base + path, headers={"Origin": base},
        form={"intent": "reply", "body": content}, max_redirects=0)
    assert response.status in (302, 303), (response.status, response.text()[:250])
    destination = response.headers.get("location", "")
    assert "#post-" in destination, destination
    return destination.rsplit("#post-", 1)[1]

try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True,
            executable_path=os.environ.get("PLAYWRIGHT_EXECUTABLE") or None,
            channel=None if os.environ.get("PLAYWRIGHT_EXECUTABLE") else "chrome",
            args=["--no-sandbox"])
        contexts = []
        def context():
            new = browser.new_context(viewport={"width": 1280, "height": 900}, service_workers="block",
                extra_http_headers={"cf-connecting-ip": "192.0.2." + str(80 + len(contexts))})
            contexts.append(new)
            new.route("**/*", lambda route: route.continue_() if route.request.url.startswith(base + "/")
                else (external.append(route.request.url), route.abort())[-1])
            return new

        def account(label):
            current = context()
            created = current.request.post(base + "/api/auth/sign-up/email", headers={"Origin": base},
                data={"name": label, "email": uuid4().hex + "@watch.test.invalid",
                    "password": "Watch-local-password-123456"})
            assert created.status == 200, created.text()
            return current, created.json()["user"]["id"]

        author, author_id = account("Watch topic author")
        watcher, watcher_id = account("Watch subscriber")
        publisher, publisher_id = account("Watch publisher")
        guest = context()
        topics = rpc({"operation": "seed", "author": author_id, "prefix": "watch-" + uuid4().hex})
        page = watcher.new_page()
        page.on("pageerror", lambda error: page_errors.append(str(error)))

        for current in topics:
            path = "/en/topics/" + current["topicId"]
            first = page.goto(base + path, wait_until="networkidle")
            private(first)
            expect(page.get_by_role("button", name="Watch topic", exact=True)).to_be_visible()
            expect(page.locator(".topic-watch-control button[type=submit]")).to_have_attribute("aria-pressed", "false")
            expect(page.locator(".topic-watch-status")).to_have_text("Not watching this topic.")
            assert sql("select user_id from forum_topic_watches where topic_id=$1", [current["topicId"]]) == []
            guest_page = guest.new_page()
            guest_response = guest_page.goto(base + path)
            assert guest_response.status == 200, guest_response.status
            guest_page.close()
            record("public guest read; authenticated own Off; no auto-watch")

            private(watcher.request.get(base + path + ".data"))
            for viewer, status in [(guest, 401), (watcher, 409)]:
                proposed_id = watcher_id if viewer == guest else publisher_id
                private(viewer.request.post(base + path, headers={"Origin": base},
                    form={"intent": "setTopicWatch", "editorActorId": proposed_id,
                          "watching": "true"}), status)
            private(watcher.request.post(base + path, headers={"Origin": "https://invalid.example"},
                form={"intent": "setTopicWatch", "editorActorId": watcher_id,
                      "watching": "true"}), 403)
            private(watcher.request.post(base + path, headers={"Origin": base},
                form={"intent": "setTopicWatch", "editorActorId": watcher_id,
                      "watching": "YES"}), 400)
            record("guest401, stale-actor409, same-origin403 and strict-boolean400")

            with page.expect_response(lambda response: response.request.method == "POST"
                and "/topics/" in response.url) as result:
                page.get_by_role("button", name="Watch topic", exact=True).click()
            private(result.value)
            expect(page.get_by_role("button", name="Stop watching", exact=True)).to_be_visible()
            assert sql("select user_id from forum_topic_watches where topic_id=$1 and user_id=$2",
                [current["topicId"], watcher_id]) == [{"user_id": watcher_id}]
            page.reload(wait_until="networkidle")
            expect(page.get_by_role("button", name="Stop watching", exact=True)).to_be_visible()
            other_page = publisher.new_page()
            other_page.goto(base + path, wait_until="networkidle")
            expect(other_page.get_by_role("button", name="Watch topic", exact=True)).to_be_visible()
            other_page.close()
            record("server-confirmed Watch, persistence across reload, isolated other account")

            post_id = reply(publisher, path, "Watch reply notice " + uuid4().hex)
            rows = sql("select recipient_user_id,kind from forum_reply_notifications where post_id=$1 order by recipient_user_id", [post_id])
            assert {row["recipient_user_id"] for row in rows} == {author_id, watcher_id}, rows
            assert all(row["kind"] == "reply" for row in rows), rows
            page.goto(base + "/en/notifications", wait_until="networkidle")
            expect(page.locator(".notification-card.is-unread").first).to_be_visible()
            assert page.get_by_text("Reply from Watch publisher").count() >= 1
            page.locator(".notification-card.is-unread").first.click()
            expect(page).to_have_url(re.compile(r"#post-" + re.escape(post_id) + r"$"))
            assert sql("select read_at is not null as read from forum_reply_notifications"
                + " where recipient_user_id=$1 and post_id=$2", [watcher_id, post_id]) == [{"read": True}]
            record("Worker reply -> watcher inbox badge -> precise post permalink -> first read")

            page.goto(base + path, wait_until="networkidle")
            with page.expect_response(lambda response: response.request.method == "POST"
                and "/topics/" in response.url) as removed:
                page.get_by_role("button", name="Stop watching", exact=True).click()
            private(removed.value)
            expect(page.get_by_role("button", name="Watch topic", exact=True)).to_be_visible()
            second = reply(publisher, path, "After Unwatch " + uuid4().hex)
            remaining = sql("select recipient_user_id from forum_reply_notifications where post_id=$1", [second])
            assert remaining == [{"recipient_user_id": author_id}], remaining
            assert sql("select id from forum_reply_notifications where recipient_user_id=$1 and post_id=$2",
                [watcher_id, post_id]), "Unwatch deleted historical notification"
            record("Unwatch suppresses only future watch-derived notice; retains old notice")

        last = topics[0]
        rtl = watcher.new_page()
        rtl.on("pageerror", lambda error: page_errors.append(str(error)))
        rtl.set_viewport_size({"width": 390, "height": 844})
        rtl.goto(base + "/he/topics/" + last["topicId"], wait_until="networkidle")
        expect(rtl.locator("html")).to_have_attribute("dir", "rtl")
        expect(rtl.get_by_role("button", name="מעקב אחרי הנושא")).to_be_visible()
        assert rtl.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
        rtl.screenshot(path=str(args.output / "watch-rtl-narrow.png"), full_page=True)
        record("localized Hebrew RTL and narrow viewport")
        assert not page_errors, page_errors
        assert not external, external
        browser.close()
finally:
    fixture.stdin.close()
    fixture.wait(timeout=15)
    (args.output / "results.json").write_text(json.dumps(
        {"cases": records, "pageErrors": page_errors, "external": external},
        ensure_ascii=False, indent=2))
