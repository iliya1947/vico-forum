"""Real Bookmarks: Chromium -> built Worker -> Better Auth -> disposable PostgreSQL 17."""
import argparse
import json
import os
import select
import shutil
import subprocess
from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4

from playwright.sync_api import expect, sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument("--url", default="http://127.0.0.1:4242")
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
base = args.url.rstrip("/")
database = urlparse(os.environ["DATABASE_URL"])
assert os.environ.get("CI") == "true"
assert urlparse(base).hostname in ("localhost", "127.0.0.1")
assert database.hostname in ("localhost", "127.0.0.1")
assert database.path == "/vico_bookmarks_browser_test"
repo = Path(__file__).resolve().parents[3]
args.output.mkdir(parents=True, exist_ok=True)
fixture = subprocess.Popen(
    [shutil.which("node"), "--import", "tsx", str(Path(__file__).with_name("pg.mjs"))],
    cwd=repo, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1,
)
assert fixture.stdout.readline().strip() == "READY", "Bookmarks fixture unavailable"
cases, page_errors, external = [], [], []


def rpc(payload):
    fixture.stdin.write(json.dumps(payload) + "\n")
    fixture.stdin.flush()
    assert select.select([fixture.stdout], [], [], 60)[0], "Bookmarks fixture timeout"
    response = json.loads(fixture.stdout.readline())
    assert "error" not in response, response
    return response["result"]


def sql(statement, params=None):
    return rpc({"operation": "sql", "sql": statement, "params": params or []})


def record(label):
    cases.append(label)
    print("BOOKMARKS_CONNECTED " + label, flush=True)


def private(response, status=200):
    assert response.status == status, (response.status, status, response.text()[:300])
    policy = {s.strip() for s in response.headers.get("cache-control", "").split(",")}
    assert {"private", "no-store"} <= policy, (response.status, response.headers)


def bookmark(context, topic_id, actor_id, desired, status=200):
    response = context.request.post(
        base + "/en/topics/" + topic_id,
        headers={"Origin": base},
        form={"intent": "setTopicBookmark", "editorActorId": actor_id,
              "bookmarked": "true" if desired else "false"},
    )
    private(response, status)
    return response


def rows(page):
    return [link.rsplit("/", 1)[-1] for link in page.locator(".bookmarks-topic-link")
        .evaluate_all("(links) => links.map(link => link.getAttribute('href'))")]


try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            executable_path=os.environ.get("PLAYWRIGHT_EXECUTABLE") or None,
            channel=None if os.environ.get("PLAYWRIGHT_EXECUTABLE") else "chrome",
            args=["--no-sandbox"],
        )
        contexts = []

        def context():
            current = browser.new_context(
                viewport={"width": 1280, "height": 900}, service_workers="block",
                extra_http_headers={"cf-connecting-ip": "192.0.2." + str(80 + len(contexts))},
            )
            contexts.append(current)
            current.route("**/*", lambda route: route.continue_()
                if route.request.url.startswith(base + "/")
                else (external.append(route.request.url), route.abort())[-1])
            return current

        password = "Bookmarks-test-password-123456"

        def account(label):
            current = context()
            email = uuid4().hex + "@bookmarks.test.invalid"
            response = current.request.post(base + "/api/auth/sign-up/email",
                headers={"Origin": base},
                data={"name": label, "email": email, "password": password})
            assert response.status == 200, (response.status, response.text()[:300])
            return current, response.json()["user"]["id"], email

        author, author_id, _ = account("Bookmarks author")
        saver, saver_id, saver_email = account("Bookmarks saver")
        other, other_id, other_email = account("Other account")
        inactive, inactive_id, _ = account("RETAINED_PRIVATE_AUTHOR")
        guest = context()

        data = rpc({"operation": "seed", "author": author_id,
                    "inactiveAuthor": inactive_id, "prefix": "bookmarks-" + uuid4().hex})
        ordinary, help_topics, deleted = data["ordinary"], data["help"], data["deleted"]
        target = ordinary[3]
        path = "/en/topics/" + target["id"]
        saved_query = "select saved_at::text as saved_at from forum_topic_bookmarks where user_id=$1 and topic_id=$2"
        private(guest.request.get(base + "/en/bookmarks"), 401)
        private(guest.request.get(base + "/en/bookmarks.data"), 401)
        guest_page = guest.new_page()
        public_response = guest_page.goto(base + path)
        assert public_response.status == 200
        expect(guest_page.locator(".topic-bookmark-control")).to_have_count(0)
        expect(guest_page.get_by_role("link", name="Bookmarks", exact=True)).to_have_count(0)
        guest_page.close()

        page = saver.new_page()
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        private(page.goto(base + "/en/bookmarks", wait_until="networkidle"))
        expect(page.get_by_role("heading", name="Saved topics")).to_be_visible()
        expect(page.get_by_text("You have not saved any topics yet.")).to_be_visible()
        expect(page.get_by_role("link", name="Bookmarks", exact=True)).to_be_visible()
        private(saver.request.get(base + "/en/bookmarks.data"))
        record("guest 401 document/data, public topic, authenticated empty private list")

        private(page.goto(base + path, wait_until="networkidle"))
        expect(page.get_by_role("button", name="Save topic")).to_be_visible()
        expect(page.get_by_role("button", name="Watch topic")).to_be_visible()
        assert sql(saved_query, [saver_id, target["id"]]) == []
        read_before = sql("select last_read_post_id, updated_at::text as updated_at "
            "from forum_topic_read_states where user_id=$1 and topic_id=$2", [saver_id, target["id"]])
        notifications_before = sql("select count(*)::int as count from forum_reply_notifications "
            "where recipient_user_id=$1", [saver_id])
        with page.expect_response(lambda r: r.request.method == "POST" and "/topics/" in r.url) as added:
            page.get_by_role("button", name="Save topic").click()
        private(added.value)
        expect(page.get_by_role("button", name="Remove bookmark")).to_be_visible()
        initial_stamp = sql(saved_query, [saver_id, target["id"]])
        assert len(initial_stamp) == 1
        page.reload(wait_until="networkidle")
        expect(page.get_by_role("button", name="Remove bookmark")).to_be_visible()
        bookmark(saver, target["id"], saver_id, True)
        assert sql(saved_query, [saver_id, target["id"]]) == initial_stamp
        assert sql("select 1 from forum_topic_watches where user_id=$1 and topic_id=$2",
            [saver_id, target["id"]]) == []
        assert sql("select last_read_post_id, updated_at::text as updated_at "
            "from forum_topic_read_states where user_id=$1 and topic_id=$2", [saver_id, target["id"]]) == read_before
        assert sql("select count(*)::int as count from forum_reply_notifications "
            "where recipient_user_id=$1", [saver_id]) == notifications_before
        record("topic UI Add, reload persistence, idempotent Add, independent Watch/read/inbox")

        private(guest.request.post(base + path, headers={"Origin": base},
            form={"intent": "setTopicBookmark", "editorActorId": saver_id,
                  "bookmarked": "true"}), 401)
        private(other.request.post(base + path, headers={"Origin": base},
            form={"intent": "setTopicBookmark", "editorActorId": saver_id,
                  "bookmarked": "true"}), 409)
        private(saver.request.post(base + path, headers={"Origin": base},
            form={"intent": "setTopicBookmark", "editorActorId": saver_id,
                  "bookmarked": "YES"}), 400)
        private(saver.request.post(base + path, headers={"Origin": base},
            form={"intent": "reply", "editorActorId": saver_id, "bookmarked": "true"}), 400)
        private(saver.request.post(base + "/en/topics/" + str(uuid4()),
            headers={"Origin": base}, form={"intent": "setTopicBookmark",
                "editorActorId": saver_id, "bookmarked": "true"}), 404)
        rejected = saver.request.post(base + path, headers={"Origin": "https://invalid.example"},
            form={"intent": "setTopicBookmark", "editorActorId": saver_id, "bookmarked": "false"})
        assert rejected.status in (400, 403), (rejected.status, rejected.text()[:250])
        assert sql(saved_query, [saver_id, target["id"]]) == initial_stamp
        record("guest/stale actor/malformed/mixed/missing topic/origin reject without change")

        for item in [ordinary[1], ordinary[2], help_topics[0], deleted]:
            bookmark(saver, item["id"], saver_id, True)
        private(page.goto(base + "/en/bookmarks", wait_until="networkidle"))
        assert len(rows(page)) == 5
        help_row = page.locator(".bookmarks-list-row").filter(
            has=page.locator("a[href='/en/topics/" + help_topics[0]["id"] + "']"))
        expect(help_row).to_contain_text("Help & solutions")
        expect(help_row).not_to_contain_text("help-solutions-questions")
        deleted_row = page.locator(".bookmarks-list-row").filter(
            has=page.locator("a[href='/en/topics/" + deleted["id"] + "']"))
        expect(deleted_row).to_contain_text("Deleted user")
        assert "RETAINED_PRIVATE_AUTHOR" not in page.locator(".bookmarks-list").inner_text()
        assert set(rows(page)) == {target["id"], ordinary[1]["id"], ordinary[2]["id"],
            help_topics[0]["id"], deleted["id"]}
        record("closed, solved, duplicate Help and deleted-author current public projection")

        author_page = author.new_page()
        author_page.on("pageerror", lambda error: page_errors.append(str(error)))
        author_page.goto(base + path, wait_until="networkidle")
        author_page.get_by_role("button", name="Edit topic title").click()
        new_title = "Current title שלום <script>window.__bookmarkExecuted=1</script>"
        author_page.locator(".topic-title-editor input[name='title']").fill(new_title)
        with author_page.expect_response(lambda r: r.request.method == "POST" and "/topics/" in r.url) as renamed:
            author_page.locator(".topic-title-editor button[type=submit]").click()
        private(renamed.value)
        expect(author_page.locator("h1")).to_have_text(new_title)
        private(page.goto(base + "/en/bookmarks", wait_until="networkidle"))
        expect(page.locator("a[href='" + path + "'] strong")).to_have_text(new_title)
        assert page.evaluate("window.__bookmarkExecuted") is None
        assert "<script>" not in page.locator(".bookmarks-list").inner_html()
        record("current revision title after real author edit, unsafe-looking title remains text")

        private(other.request.get(base + "/en/bookmarks"))
        other_page = other.new_page()
        other_page.goto(base + "/en/bookmarks", wait_until="networkidle")
        expect(other_page.get_by_text("You have not saved any topics yet.")).to_be_visible()
        other_page.close()
        second_session = context()
        signed_in = second_session.request.post(base + "/api/auth/sign-in/email",
            headers={"Origin": base}, data={"email": saver_email, "password": password})
        assert signed_in.status == 200, (signed_in.status, signed_in.text()[:300])
        second = second_session.new_page()
        second.on("pageerror", lambda error: page_errors.append(str(error)))
        private(second.goto(base + "/en/bookmarks", wait_until="networkidle"))
        assert len(rows(second)) == 5
        record("another account isolated; same account restored in a distinct Better Auth session")

        page.goto(base + "/en/bookmarks", wait_until="networkidle")
        page.get_by_role("button", name="Sign out").click()
        expect(page.get_by_role("link", name="Sign in", exact=True)).to_be_visible()
        switched = saver.request.post(base + "/api/auth/sign-in/email",
            headers={"Origin": base}, data={"email": other_email, "password": password})
        assert switched.status == 200, (switched.status, switched.text()[:300])
        private(page.goto(base + "/en/bookmarks", wait_until="networkidle"))
        expect(page.get_by_text("You have not saved any topics yet.")).to_be_visible()
        assert rows(page) == []
        record("same-browser account switch hides prior private bookmark state")

        private(second.goto(base + path, wait_until="networkidle"))
        expect(second.get_by_role("button", name="Remove bookmark")).to_be_visible()
        with second.expect_response(lambda r: r.request.method == "POST" and "/topics/" in r.url) as watched:
            second.get_by_role("button", name="Watch topic").click()
        private(watched.value)
        expect(second.get_by_role("button", name="Stop watching")).to_be_visible()
        assert sql("select user_id from forum_topic_watches where user_id=$1 and topic_id=$2",
            [saver_id, target["id"]]) == [{"user_id": saver_id}]
        marker_before = sql("select last_read_post_id,updated_at::text as updated_at "
            "from forum_topic_read_states where user_id=$1 and topic_id=$2", [saver_id, target["id"]])
        inbox_before = sql("select count(*)::int as count from forum_reply_notifications "
            "where recipient_user_id=$1", [saver_id])
        private(second.goto(base + "/en/bookmarks", wait_until="networkidle"))
        target_row = second.locator(".bookmarks-list-row").filter(
            has=second.locator("a[href='" + path + "']"))
        with second.expect_response(lambda r: r.request.method == "POST" and "/topics/" in r.url) as removed:
            target_row.get_by_role("button", name="Remove bookmark").click()
        private(removed.value)
        expect(second.locator("a[href='" + path + "']")).to_have_count(0)
        assert sql(saved_query, [saver_id, target["id"]]) == []
        assert sql("select user_id from forum_topic_watches where user_id=$1 and topic_id=$2",
            [saver_id, target["id"]]) == [{"user_id": saver_id}]
        assert sql("select last_read_post_id,updated_at::text as updated_at "
            "from forum_topic_read_states where user_id=$1 and topic_id=$2", [saver_id, target["id"]]) == marker_before
        assert sql("select count(*)::int as count from forum_reply_notifications "
            "where recipient_user_id=$1", [saver_id]) == inbox_before
        second.reload(wait_until="networkidle")
        expect(second.locator("a[href='" + path + "']")).to_have_count(0)
        record("list Remove via canonical topic action, no Watch/inbox/read-state mutation")

        for item in ordinary + help_topics + [deleted]:
            bookmark(second_session, item["id"], saver_id, True)
        sql("update forum_topic_bookmarks set saved_at='2026-11-17 12:00:00.123+00' where user_id=$1",
            [saver_id])
        expected = [item["topic_id"] for item in sql(
            "select topic_id from forum_topic_bookmarks where user_id=$1 "
            "order by saved_at desc,topic_id desc", [saver_id])]
        assert len(expected) == 57, len(expected)
        private(second.goto(base + "/en/bookmarks", wait_until="networkidle"))
        expect(second.locator(".bookmarks-topic-link")).to_have_count(50)
        assert rows(second) == expected[:50], (rows(second), expected[:50])
        older_href = second.get_by_role("link", name="Older bookmarks").get_attribute("href")
        assert older_href and older_href.startswith("/en/bookmarks?beforeSavedAt=")
        second.get_by_role("link", name="Older bookmarks").click()
        expect(second.locator(".bookmarks-topic-link")).to_have_count(7)
        assert rows(second) == expected[50:]
        second.get_by_role("link", name="Newest bookmarks").click()
        expect(second.locator(".bookmarks-topic-link")).to_have_count(50)

        bookmark(second_session, expected[49], saver_id, False)
        private(second.goto(base + older_href, wait_until="networkidle"))
        assert rows(second) == expected[50:], "Removed cursor anchor must not invalidate the next page"
        foreign = other.request.get(base + older_href)
        private(foreign)
        other_page = other.new_page()
        other_page.goto(base + older_href, wait_until="networkidle")
        expect(other_page.get_by_text("No older saved topics on this page.")).to_be_visible()
        other_page.close()
        bookmark(second_session, expected[49], saver_id, True)
        private(second.goto(base + "/en/bookmarks", wait_until="networkidle"))
        assert rows(second)[0] == expected[49], "Remove + Add must use a new savedAt"
        empty_cursor = "?beforeSavedAt=2000-01-01T00%3A00%3A00.000Z&beforeTopicId=old"
        private(second.goto(base + "/en/bookmarks" + empty_cursor, wait_until="networkidle"))
        expect(second.get_by_text("No older saved topics on this page.")).to_be_visible()
        expect(second.get_by_role("link", name="Newest bookmarks")).to_be_visible()
        record("57 saved topics, tied-millisecond keyset, removed anchor, other-user cursor, re-add and empty older page")

        second.set_viewport_size({"width": 390, "height": 844})
        private(second.goto(base + "/he/bookmarks", wait_until="networkidle"))
        expect(second.locator("html")).to_have_attribute("dir", "rtl")
        expect(second.get_by_role("heading", name="נושאים שמורים")).to_be_visible()
        expect(second.get_by_role("button", name="הסרת סימנייה").first).to_be_visible()
        assert second.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
        second.screenshot(path=str(args.output / "bookmarks-he-narrow.png"), full_page=False)
        private(second.goto(base + "/he/topics/" + target["id"], wait_until="networkidle"))
        expect(second.locator("html")).to_have_attribute("dir", "rtl")
        expect(second.get_by_role("button", name="הסרת סימנייה")).to_be_visible()
        assert second.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
        second.screenshot(path=str(args.output / "bookmark-topic-he-narrow.png"), full_page=False)
        second.set_viewport_size({"width": 1280, "height": 900})
        private(second.goto(base + "/ru/bookmarks", wait_until="networkidle"))
        expect(second.get_by_role("heading", name="Сохранённые темы")).to_be_visible()
        expect(second.get_by_role("button", name="Удалить закладку").first).to_be_visible()
        second.screenshot(path=str(args.output / "bookmarks-ru-desktop.png"), full_page=False)
        record("localized RU and narrow Hebrew RTL topic/list, focusable controls and no horizontal overflow")

        # Real A older list -> sign out -> Better Auth credential sign-in as B
        # returns through the same cursor URL. B must see its own newest page.
        b_saved = [ordinary[0]["id"], help_topics[1]["id"]]
        for topic_id in b_saved:
            bookmark(other, topic_id, other_id, True)
        private(second.goto(base + older_href, wait_until="networkidle"))
        expect(second.get_by_role("link", name="Newest bookmarks")).to_be_visible()
        assert len(rows(second)) > 0
        second.get_by_role("button", name="Sign out").click()
        expect(second.get_by_role("link", name="Sign in", exact=True)).to_be_visible()
        second.get_by_role("link", name="Sign in", exact=True).click()
        expect(second.locator(".credential-form")).to_be_visible()
        assert "returnTo=" in second.url and "beforeSavedAt" in second.url, second.url
        second.locator('.credential-form input[name="email"]').fill(other_email)
        second.locator('.credential-form input[name="password"]').fill(password)
        second.locator(".credential-submit").click()
        expect(second).to_have_url(base + "/en/bookmarks")
        expect(second.locator(".bookmarks-topic-link")).to_have_count(2)
        assert set(rows(second)) == set(b_saved), rows(second)
        second.screenshot(path=str(args.output / "bookmarks-account-switch-first-page.png"), full_page=False)

        # The prior actor's cursor remains an ordinary, safe initial/deep link:
        # server own-row filtering still returns B's empty older page.
        private(second.goto(base + older_href, wait_until="networkidle"))
        expect(second.get_by_text("No older saved topics on this page.")).to_be_visible()
        assert "beforeSavedAt=" in second.url, second.url
        record("real credential A older -> B newest reset, B owns rows; manual foreign cursor still permitted")
        assert not page_errors, page_errors
        assert not external, external
        browser.close()
finally:
    fixture.stdin.close()
    fixture.wait(timeout=15)
    (args.output / "results.json").write_text(json.dumps(
        {"cases": cases, "pageErrors": page_errors, "external": external},
        ensure_ascii=False, indent=2,
    ))
