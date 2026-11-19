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


def reply(ctx, path, body, parent=None):
    fields = {"intent": "reply", "body": body}
    if parent:
        fields["parentPostId"] = parent
    response = ctx.request.post(base + path, headers={"Origin": base},
                                form=fields, max_redirects=0)
    assert response.status in (302, 303), (response.status, response.text()[:300])
    target = response.headers.get("location", "")
    assert "#post-" in target, target
    return target.rsplit("#post-", 1)[1]


def watch(ctx, actor_id, path):
    response = ctx.request.post(base + path, headers={"Origin": base},
                                form={"intent": "setTopicWatch", "editorActorId": actor_id,
                                      "watching": "true"})
    private(response)


def mute(ctx, actor_id, path, desired):
    response = ctx.request.post(base + path, headers={"Origin": base},
                                form={"intent": "setTopicMute", "editorActorId": actor_id,
                                      "muted": str(desired).lower()})
    private(response)


def notices(post_id):
    return {row["recipient_user_id"]: row["kind"] for row in sql(
        "select recipient_user_id,kind from forum_reply_notifications where post_id=$1",
        [post_id],
    )}


def suppression(post_id):
    return {row["recipient_user_id"] for row in sql(
        "select recipient_user_id from forum_post_notification_suppressions where post_id=$1",
        [post_id],
    )}


def attach_metadata(post_id, owner_id, file_name):
    """Metadata-only disposable PG attachment fixture; no R2 object/download claim."""
    attachment_id = str(uuid4())
    sql(
        "insert into forum_attachments "
        "(id,owner_id,object_key,file_name,declared_mime,detected_type,response_mime,"
        "byte_size,verification_status,created_at) "
        "values ($1,$2,$3,$4,'text/plain','text','text/plain; charset=utf-8',"
        "12,'type-checked',now())",
        [attachment_id, owner_id, "private/filters-" + uuid4().hex, file_name],
    )
    sql(
        "insert into forum_post_attachments (post_id,attachment_id,created_at) "
        "values ($1,$2,now())",
        [post_id, attachment_id],
    )
    return attachment_id


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

        # 4b.2: exercise each ordinary recipient source through actual Worker writes.
        parent, parent_id = account("Filters parent author")
        mentioned, mentioned_id = account("Filters mention recipient")
        before_sender, _ = account("Filters before-Mute sender")
        while_sender, _ = account("Filters muted sender")
        other_sender, _ = account("Filters other-topic sender")
        after_sender, _ = account("Filters after-Unmute sender")
        other_topic_path = "/en/topics/" + seeded["otherTopicId"]
        parent_post = reply(parent, topic_path, "Parent reply " + uuid4().hex)
        watch(actor, actor_id, topic_path)
        watch(actor, actor_id, other_topic_path)
        assert {row["topic_id"] for row in sql(
            "select topic_id from forum_topic_watches where user_id=$1", [actor_id],
        )} == {seeded["topicId"], seeded["otherTopicId"]}
        recipients = {author_id: "reply", parent_id: "reply", actor_id: "reply",
                      mentioned_id: "mention"}
        mention = "[mentioned person](/en/users/" + mentioned_id + ")"
        before_post = reply(before_sender, topic_path, "Baseline " + mention, parent_post)
        assert notices(before_post) == recipients, (notices(before_post), recipients)
        assert suppression(before_post) == set()
        record("pre-Mute real topic-author, parent-author, Watch and explicit-mention delivery")

        # Viewer toggles Mute using the actual Chromium fetcher control.
        private(page.goto(base + topic_path, wait_until="networkidle"))
        expect(page.get_by_role("button", name="Mute topic", exact=True)).to_be_visible()
        with page.expect_response(lambda r: r.request.method == "POST"
                                  and "/topics/" in r.url) as muted:
            page.get_by_role("button", name="Mute topic", exact=True).click()
        private(muted.value)
        expect(page.get_by_role("button", name="Unmute topic", exact=True)).to_be_visible()
        for ctx, uid in [(author, author_id), (parent, parent_id),
                         (mentioned, mentioned_id)]:
            mute(ctx, uid, topic_path, True)
        actual_mutes = {row["user_id"] for row in sql(
            "select user_id from forum_topic_mutes where topic_id=$1", [seeded["topicId"]],
        )}
        assert actual_mutes == set(recipients), (actual_mutes, recipients)
        assert {row["topic_id"] for row in sql(
            "select topic_id from forum_topic_watches where user_id=$1", [actor_id],
        )} == {seeded["topicId"], seeded["otherTopicId"]}
        record("Chromium-confirmed Mute ON for Watch viewer; four own SQL pairs, Watch retained")

        during_post = reply(while_sender, topic_path, "Muted " + mention, parent_post)
        assert notices(during_post) == {}, notices(during_post)
        assert suppression(during_post) == set(recipients), suppression(during_post)
        other_post = reply(other_sender, other_topic_path,
                           "Unmuted other topic " + mention)
        other_expected = {author_id: "reply", actor_id: "reply", mentioned_id: "mention"}
        assert notices(other_post) == other_expected, (notices(other_post), other_expected)
        assert suppression(other_post) == set()
        record("Mute suppresses all four ordinary sources, but another watched topic still notifies")

        with page.expect_response(lambda r: r.request.method == "POST"
                                  and "/topics/" in r.url) as unmuted:
            page.get_by_role("button", name="Unmute topic", exact=True).click()
        private(unmuted.value)
        expect(page.get_by_role("button", name="Mute topic", exact=True)).to_be_visible()
        for ctx, uid in [(author, author_id), (parent, parent_id),
                         (mentioned, mentioned_id)]:
            mute(ctx, uid, topic_path, False)
        assert sql("select user_id from forum_topic_mutes where topic_id=$1",
                   [seeded["topicId"]]) == []
        after_post = reply(after_sender, topic_path, "After Unmute " + mention, parent_post)
        assert notices(after_post) == recipients, (notices(after_post), recipients)
        assert suppression(after_post) == set()
        assert notices(before_post) == recipients
        assert notices(during_post) == {}
        assert suppression(during_post) == set(recipients)
        assert {row["topic_id"] for row in sql(
            "select topic_id from forum_topic_watches where user_id=$1", [actor_id],
        )} == {seeded["topicId"], seeded["otherTopicId"]}
        page.reload(wait_until="networkidle")
        expect(page.get_by_role("button", name="Mute topic", exact=True)).to_be_visible()
        record("Unmute restores only new ordinary fanout, no backfill, prior notices and Watch intact")
        # 4b.3: Block is directional and keyed to the actual publication actor.
        # A is the Watch subscriber, B owns the topic; both Mute states are OFF.
        private(page.goto(base + profile_path, wait_until="networkidle"))
        expect(page.get_by_role("button", name="Block user", exact=True)).to_be_visible()
        with page.expect_response(lambda r: r.request.method == "POST"
                                  and "/users/" + author_id in r.url) as blocked:
            page.get_by_role("button", name="Block user", exact=True).click()
        private(blocked.value)
        expect(page.get_by_role("button", name="Unblock user", exact=True)).to_be_visible()
        assert sql("select blocked_user_id from forum_user_blocks where user_id=$1",
                   [actor_id]) == [{"blocked_user_id": author_id}]
        assert sql("select blocked_user_id from forum_user_blocks where user_id=$1",
                   [author_id]) == []
        record("A blocks B through Chromium; the reverse B-to-A pair remains OFF")

        # A's publication is still delivered to B, who has not blocked A.
        a_post = reply(actor, topic_path, "A to B while A blocks B " + uuid4().hex)
        assert notices(a_post) == {author_id: "reply"}, notices(a_post)
        assert suppression(a_post) == set()
        record("A-to-B Block does not suppress ordinary notifications delivered from A to B")

        # B can publish and explicitly mention A; A's parent/Watch/mention
        # sources all collapse to one suppressed pair, not a visible notice.
        b_mentions_a = "[watching A](/en/users/" + actor_id + ")"
        b_post = reply(author, topic_path, "Blocked B to A " + b_mentions_a, a_post)
        assert notices(b_post) == {}, notices(b_post)
        assert suppression(b_post) == {actor_id}, suppression(b_post)
        assert sql("select blocked_user_id from forum_user_blocks where user_id=$1",
                   [author_id]) == []
        record("B's actual reply and mention to A are suppressed, with one PG receipt")

        # Another publication actor C in B's own topic is still eligible for
        # A via Watch/mention and for B via ordinary topic/parent authorship.
        third_party, _ = account("Filters independent C publisher")
        c_post = reply(third_party, topic_path, "C reply in B topic " + b_mentions_a, b_post)
        expected_c = {actor_id: "reply", author_id: "reply"}
        assert notices(c_post) == expected_c, (notices(c_post), expected_c)
        assert suppression(c_post) == set()
        assert sql("select blocked_user_id from forum_user_blocks where user_id=$1",
                   [actor_id]) == [{"blocked_user_id": author_id}]
        assert {row["topic_id"] for row in sql(
            "select topic_id from forum_topic_watches where user_id=$1", [actor_id],
        )} == {seeded["topicId"], seeded["otherTopicId"]}
        record("C's ordinary reply still notifies A and B in B's topic, Watch unchanged")
        # 4b.4: public root and a best answer authored by blocked B stay
        # navigable, while A sees no B-authored body or attachment presentation.
        root_post = sql(
            "select id from forum_posts where topic_id=$1 "
            "order by created_at,id limit 1", [seeded["topicId"]],
        )[0]["id"]
        root_file = "blocked-root-" + uuid4().hex + ".txt"
        best_file = "blocked-best-" + uuid4().hex + ".txt"
        attach_metadata(root_post, author_id, root_file)
        attach_metadata(b_post, author_id, best_file)
        answer = author.request.post(
            base + topic_path, headers={"Origin": base},
            form={"intent": "selectBestAnswer", "operationScope": "own", "postId": b_post},
            max_redirects=0,
        )
        assert answer.status in (302, 303), (answer.status, answer.text()[:300])
        assert sql("select best_answer_post_id from forum_topics where id=$1",
                   [seeded["topicId"]]) == [{"best_answer_post_id": b_post}]
        record("B selects own reply as best answer; two real PG attachment references exist")

        private(page.goto(base + topic_path, wait_until="networkidle"))
        root_node = page.locator("#post-" + root_post)
        best_node = page.locator("#post-" + b_post)
        child_node = page.locator("#post-" + c_post)
        expect(root_node).to_have_class(__import__("re").compile(r".*original-question.*"))
        expect(best_node).to_have_class(__import__("re").compile(r".*best-answer.*"))
        for node in (root_node, best_node):
            expect(node.locator("[data-filtered-post]")).to_have_count(1)
            expect(node.locator("[data-message-body]")).to_have_count(0)
            expect(node.locator(".topic-message-attachments")).to_have_count(0)
            expect(node.get_by_role("button", name="Show message")).to_be_visible()
        assert root_file not in root_node.inner_text()
        assert best_file not in best_node.inner_text()
        expect(page.locator("#post-" + a_post + " [data-message-body]")).to_have_count(1)
        expect(child_node.locator("[data-message-body]")).to_have_count(1)
        record("A sees blocked B root and best answer collapsed; visible A/C remain intact")

        # Post anchors, the solution jump, and reply graph must survive collapse.
        expect(root_node.locator('a.topic-message-anchor[href="#post-' + root_post + '"]')).to_have_count(1)
        expect(best_node.locator('a.topic-message-anchor[href="#post-' + b_post + '"]')).to_have_count(1)
        expect(root_node.locator('a.topic-solution-link[href="#post-' + b_post + '"]')).to_have_count(1)
        expect(best_node.locator('a.topic-message-parent-link[href="#post-' + a_post + '"]')).to_have_count(1)
        expect(child_node.locator('a.topic-message-parent-link[href="#post-' + b_post + '"]')).to_have_count(1)
        expect(best_node.locator('nav.topic-message-direct-replies a[href="#post-' + c_post + '"]')).to_have_count(1)
        child_node.locator('a.topic-message-parent-link[href="#post-' + b_post + '"]').click()
        assert page.url.endswith("#post-" + b_post), page.url
        expect(best_node.locator("[data-filtered-post]")).to_have_count(1)
        record("collapsed root/best/parent/child preserve stable post anchors and relationships")

        # Guest remains public and sees both exact bodies and attachment links.
        assert guest_page.goto(base + topic_path, wait_until="networkidle").status == 200
        guest_root = guest_page.locator("#post-" + root_post)
        guest_best = guest_page.locator("#post-" + b_post)
        expect(guest_root.locator("[data-message-body]")).to_contain_text("Public original post")
        expect(guest_best.locator("[data-message-body]")).to_contain_text("Blocked B to A")
        expect(guest_root.locator(".topic-message-attachments")).to_contain_text(root_file)
        expect(guest_best.locator(".topic-message-attachments")).to_contain_text(best_file)
        expect(guest_page.locator("[data-filtered-post]")).to_have_count(0)
        record("guest still reads B's public root, answer, and attachment links")

        # Revealing is post-local and presentation-only, never an implicit Unblock.
        root_node.get_by_role("button", name="Show message").click()
        expect(root_node.locator("[data-message-body]")).to_contain_text("Public original post")
        expect(root_node.locator(".topic-message-attachments")).to_contain_text(root_file)
        expect(best_node.locator("[data-filtered-post]")).to_have_count(1)
        best_node.get_by_role("button", name="Show message").click()
        expect(best_node.locator("[data-message-body]")).to_contain_text("Blocked B to A")
        expect(best_node.locator(".topic-message-attachments")).to_contain_text(best_file)
        assert sql("select blocked_user_id from forum_user_blocks where user_id=$1",
                   [actor_id]) == [{"blocked_user_id": author_id}]
        page.reload(wait_until="networkidle")
        expect(page.locator("#post-" + root_post + " [data-filtered-post]")).to_have_count(1)
        expect(page.locator("#post-" + b_post + " [data-filtered-post]")).to_have_count(1)
        assert sql("select blocked_user_id from forum_user_blocks where user_id=$1",
                   [actor_id]) == [{"blocked_user_id": author_id}]
        record("independent per-post Reveal shows body/attachment metadata; reload collapses and Block persists")
        # 4b.5: real initial-topic mention is suppressed for a blocking viewer.
        # Publication receipt replay is checked before and after Unblock.
        new_author, new_author_id = account("Filters initial-topic sender")
        new_profile_path = "/en/users/" + new_author_id
        block_form = {"intent": "setUserBlock", "editorActorId": actor_id, "blocked": "true"}
        block_result = actor.request.post(base + new_profile_path, headers={"Origin": base},
                                          form=block_form)
        private(block_result)
        assert sql("select blocked_user_id from forum_user_blocks "
                   "where user_id=$1 and blocked_user_id=$2",
                   [actor_id, new_author_id]) == [{"blocked_user_id": new_author_id}]
        section_id = sql("select section_id from forum_topics where id=$1",
                         [seeded["topicId"]])[0]["section_id"]
        create_form = {
            "title": "Blocked initial mention " + uuid4().hex,
            "body": "Initial mention " + b_mentions_a,
            "editorOperationId": str(uuid4()), "editorAttachmentIds": "[]",
        }
        create_path = "/en/sections/" + section_id
        first_create = new_author.request.post(base + create_path, headers={"Origin": base},
                                               form=create_form, max_redirects=0)
        assert first_create.status in (302, 303), (first_create.status, first_create.text()[:250])
        created_location = first_create.headers["location"]
        created_topic_id = urlparse(created_location).path.rstrip("/").rsplit("/", 1)[-1]
        created_topic_path = "/en/topics/" + created_topic_id
        initial_post = sql("select id from forum_posts where topic_id=$1",
                           [created_topic_id])[0]["id"]
        created_at = __import__("time").monotonic()
        assert notices(initial_post) == {}, notices(initial_post)
        assert suppression(initial_post) == {actor_id}, suppression(initial_post)
        assert sql("select count(*)::int as n from forum_posts where topic_id=$1",
                   [created_topic_id]) == [{"n": 1}]
        record("Block suppresses initial-topic mention through real HTTP and persists one receipt")

        repeat_create = new_author.request.post(base + create_path, headers={"Origin": base},
                                                form=create_form, max_redirects=0)
        assert repeat_create.status in (302, 303)
        assert repeat_create.headers["location"] == created_location
        assert sql("select count(*)::int as n from forum_posts where topic_id=$1",
                   [created_topic_id]) == [{"n": 1}]
        assert suppression(initial_post) == {actor_id}
        record("identical initial-topic publication replay creates no extra post or notice")

        unblock_form = {**block_form, "blocked": "false"}
        unblock_result = actor.request.post(base + new_profile_path,
                                            headers={"Origin": base}, form=unblock_form)
        private(unblock_result)
        # The canonical document action may return HTML; the persisted own pair is authoritative.
        assert sql("select blocked_user_id from forum_user_blocks "
                   "where user_id=$1 and blocked_user_id=$2",
                   [actor_id, new_author_id]) == []
        again_create = new_author.request.post(base + create_path, headers={"Origin": base},
                                               form=create_form, max_redirects=0)
        assert again_create.status in (302, 303)
        assert again_create.headers["location"] == created_location
        assert notices(initial_post) == {}
        assert suppression(initial_post) == {actor_id}

        def revision(post_id):
            return sql("select current_revision_id from forum_posts where id=$1",
                       [post_id])[0]["current_revision_id"]

        def edit(ctx, path, post_id, body, form=None):
            fields = form if form is not None else {
                "intent": "editPost", "postId": post_id,
                "expectedRevisionId": revision(post_id), "body": body,
                "editorOperationId": str(uuid4()),
                "editorAttachmentIds": "[]", "editorRetainedAttachmentIds": "[]",
            }
            result = ctx.request.post(base + path, headers={"Origin": base},
                                      form=fields, max_redirects=0)
            assert result.status in (302, 303), (result.status, result.text()[:300])
            return fields

        edit(new_author, created_topic_path, initial_post,
             "Edited original, same recipient " + b_mentions_a)
        edit(new_author, created_topic_path, initial_post, "Removed original mention")
        edit(new_author, created_topic_path, initial_post,
             "Reintroduced original mention " + b_mentions_a)
        assert notices(initial_post) == {}
        assert suppression(initial_post) == {actor_id}
        record("Unblock and edit/remove/re-add initial mention cannot backfill consumed pair")

        # Mute receipts from 4b.2 survive Unmute and published-post edits, while
        # a new mention on that same post can notify a never-selected recipient.
        assert sql("select user_id from forum_topic_mutes where topic_id=$1",
                   [seeded["topicId"]]) == []
        unseen, unseen_id = account("Filters newly mentioned on edited post")
        edit(while_sender, topic_path, during_post, "Unrelated edit keeps " + mention)
        assert notices(during_post) == {}, notices(during_post)
        assert suppression(during_post) == set(recipients)
        record("Unmute plus unrelated published edit does not revive old suppressed mentions")

        edit(while_sender, topic_path, during_post, "Temporarily without mention")
        unseen_link = "[first-time recipient](/en/users/" + unseen_id + ")"
        final_edit = edit(while_sender, topic_path, during_post,
                          "Re-added consumed mention " + mention + " " + unseen_link)
        assert notices(during_post) == {unseen_id: "mention"}, notices(during_post)
        assert suppression(during_post) == set(recipients)
        assert notices(before_post) == recipients
        record("remove/re-add leaves receipts; first-time mention after Unmute notifies only new recipient")

        after_revision = revision(during_post)
        before_revision_count = sql(
            "select count(*)::int as n from forum_post_revisions where post_id=$1",
            [during_post],
        )
        edit(while_sender, topic_path, during_post, final_edit["body"], final_edit)
        assert revision(during_post) == after_revision
        assert sql("select count(*)::int as n from forum_post_revisions where post_id=$1",
                   [during_post]) == before_revision_count
        assert notices(during_post) == {unseen_id: "mention"}
        assert suppression(during_post) == set(recipients)
        record("matching published-edit replay writes no revision, notice or new receipt")

        later_sender, _ = account("Filters prospective unmuted reply")
        after_filter_post = reply(later_sender, topic_path,
                                  "Fresh post after Unmute " + mention, parent_post)
        assert notices(after_filter_post) == recipients, notices(after_filter_post)
        assert suppression(after_filter_post) == set()
        assert notices(after_post) == recipients
        assert notices(before_post) == recipients
        record("fresh ordinary publication after Unmute notifies all four, prior inbox intact")

        # Respect the real Worker write cooldown, not the PG fixture's zero
        # cooldown: the same previously blocked topic author now publishes again.
        elapsed = __import__("time").monotonic() - created_at
        if elapsed < 5.2:
            __import__("time").sleep(5.2 - elapsed)
        next_block_post = reply(new_author, created_topic_path,
                                "Fresh post from formerly blocked author " + b_mentions_a)
        assert notices(next_block_post) == {actor_id: "mention"}, notices(next_block_post)
        assert suppression(next_block_post) == set()
        assert notices(initial_post) == {}
        assert suppression(initial_post) == {actor_id}
        record("new post after Unblock delivers to A; old Block suppression stays consumed")
        assert not errors, errors
        assert not external, external
        browser.close()
finally:
    fixture.stdin.close()
    fixture.wait(timeout=15)
    (args.output / "results.json").write_text(
        json.dumps({"cases": cases, "pageErrors": errors, "external": external}, indent=2),
    )
