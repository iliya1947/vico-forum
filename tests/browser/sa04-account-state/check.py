"""SA04-J12 real Chromium lifecycle matrix: built Worker + Better Auth + PostgreSQL 17.

All accounts, permissions, topic fixtures and deactivation are synthetic disposable
test data. The tested requests use real browser session cookies and canonical routes.
"""
import argparse
import json
import os
import shutil
import subprocess
from pathlib import Path
from urllib.parse import urlencode, urlparse
from uuid import uuid4

from playwright.sync_api import expect, sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--url", default="http://127.0.0.1:4198")
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
base = args.url.rstrip("/")
database = os.environ["DATABASE_URL"]
assert urlparse(base).hostname in ("127.0.0.1", "localhost")
assert urlparse(database).hostname in ("127.0.0.1", "localhost")
assert urlparse(database).path.endswith("_test"), "Only disposable PostgreSQL permitted"
repo = Path(__file__).resolve().parents[3]
node = shutil.which("node")
assert node
args.output.mkdir(parents=True, exist_ok=True)
prefix = "j12-chromium-" + uuid4().hex
records = []
page_errors = []
external = []


def sql(query, params=None):
    js = """import pg from 'pg';
const data=JSON.parse(await new Promise(resolve=>{let s='';
process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>resolve(s));}));
const c=new pg.Client({connectionString:process.env.DATABASE_URL});
await c.connect();
try { console.log(JSON.stringify((await c.query(data.query,data.params)).rows)); }
finally { await c.end(); }"""
    result = subprocess.run(
        [node, "--input-type=module", "-e", js],
        input=json.dumps({"query": query, "params": params or []}),
        cwd=repo, capture_output=True, text=True, check=True, timeout=25,
    )
    return json.loads(result.stdout)


def count(query, params=None):
    rows = sql(query, params)
    assert len(rows) == 1 and len(rows[0]) == 1, (query, rows)
    return next(iter(rows[0].values()))


def record(name, **details):
    row = {"case": name, **details}
    records.append(row)
    print("SA04_J12_CHROMIUM " + json.dumps(row, ensure_ascii=False), flush=True)


def external_guard(ctx):
    ctx.route("**/*", lambda route: route.continue_()
              if route.request.url.startswith(base + "/")
              else (external.append(route.request.url), route.abort())[-1])


def account(browser, label, ip, role="builtin-user"):
    ctx = browser.new_context(
        viewport={"width": 1280, "height": 900},
        service_workers="block",
        extra_http_headers={"cf-connecting-ip": ip},
    )
    external_guard(ctx)
    response = ctx.request.post(
        base + "/api/auth/sign-up/email",
        headers={"Origin": base},
        data={
            "name": "J12 browser " + label,
            "email": prefix + "-" + label + "@test.invalid",
            "password": "J12-local-only-" + uuid4().hex,
        },
    )
    assert response.status == 200, (label, response.status, response.text()[:200])
    user_id = response.json()["user"]["id"]
    sql("""insert into authz_user_roles(user_id,role_id) values($1,$2)
      on conflict (user_id) do update set role_id=excluded.role_id""", [user_id, role])
    session = ctx.request.get(base + "/api/auth/get-session")
    assert session.status == 200 and session.json()["user"]["id"] == user_id
    page = ctx.new_page()
    page.set_default_timeout(20000)
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    return ctx, page, user_id


def document(page, path):
    response = page.goto(base + path, wait_until="networkidle")
    assert response and response.status == 200, (path, getattr(response, "status", None))
    return response


def deactivate(user_id):
    changed = sql("""update "user" set deactivated_at=now(),
      deactivated_by_user_id=$1,
      retain_at_least_until=now()+interval '2 years'
      where id=$1 and deactivated_at is null returning id""", [user_id])
    assert changed == [{"id": user_id}], (user_id, changed)


def topic(author, section, label, extra_answer=None):
    topic_id, title_id, post_id, rev_id = [str(uuid4()) for _ in range(4)]
    sql("""with topic as (
      insert into forum_topics(id,section_id,author_id,current_title_revision_id)
      values($1,$2,$3,$4) returning id)
      insert into forum_topic_title_revisions
      (id,topic_id,author_id,original_content,source_locale)
      select $4,id,$3,$5,'en' from topic""",
        [topic_id, section, author, title_id, "J12 " + label])
    sql("""with post as (
      insert into forum_posts(id,topic_id,author_id,current_revision_id)
      values($1,$2,$3,$4) returning id)
      insert into forum_post_revisions
      (id,post_id,author_id,original_content,source_locale)
      select $4,id,$3,$5,'en' from post""",
        [post_id, topic_id, author, rev_id, "J12 fixture " + label])
    answer_id = None
    if extra_answer:
        answer_id, answer_revision = str(uuid4()), str(uuid4())
        sql("""with post as (
          insert into forum_posts(id,topic_id,author_id,current_revision_id)
          values($1,$2,$3,$4) returning id)
          insert into forum_post_revisions
          (id,post_id,author_id,original_content,source_locale)
          select $4,id,$3,'J12 candidate solution','en' from post""",
            [answer_id, topic_id, extra_answer, answer_revision])
        sql("update forum_topics set is_solved=true,best_answer_post_id=$2 where id=$1",
            [topic_id, answer_id])
    return {"id": topic_id, "post": post_id, "revision": rev_id,
            "title": title_id, "answer": answer_id}


def snapshot():
    return sql("""select
      (select count(*)::int from forum_topics) topics,
      (select count(*)::int from forum_posts) posts,
      (select count(*)::int from forum_post_revisions) revisions,
      (select count(*)::int from forum_topic_title_revisions) titles,
      (select count(*)::int from forum_profiles) profiles,
      (select count(*)::int from forum_help_signals) signals,
      (select count(*)::int from forum_topic_pins) pins,
      (select count(*)::int from forum_help_duplicate_relationships) duplicates,
      (select count(*)::int from forum_help_duplicate_appeals) appeals,
      (select count(*)::int from admin_history) history""")[0]


def no_store(value):
    directives = {part.strip().lower() for part in
                  value.split(",") if part.strip()}
    assert {"private", "no-store"} <= directives, directives


def assert_denied(result, name, before=None):
    assert result["status"] == 401, (name, result["status"], result.get("body", "")[:220])
    no_store(result["cache"])
    assert not result["location"], (name, result["location"])
    if result.get("contentType", "").startswith("application/json"):
        data = json.loads(result["body"])
        assert data.get("error") == "unauthenticated", (name, data)
        assert data.get("ok") is not True, (name, data)
    if before is not None:
        after = snapshot()
        assert after == before, (name, before, after)
    record(name, status=401, private=True, no_redirect=True, unchanged=True)


def browser_post(page, path, fields, name):
    before = snapshot()
    result = page.evaluate("""async ({path,fields}) => {
      const response = await fetch(path, {
        method: "POST",
        credentials: "same-origin",
        headers: {"Content-Type": "application/x-www-form-urlencoded"},
        body: new URLSearchParams(fields).toString(),
        redirect: "manual"
      });
      return {
        status: response.status, cache: response.headers.get("cache-control") || "",
        location: response.headers.get("location"), contentType:
          response.headers.get("content-type") || "", body: await response.text()
      };
    }""", {"path": path, "fields": fields})
    assert_denied(result, name, before)
    return result


def ui_denial(page, form, path, name, expected_fact=None):
    before = snapshot()
    with page.expect_response(lambda r: r.request.method == "POST" and
                              path in r.url) as pending:
        form.locator('button[type="submit"]').click()
    response = pending.value
    result = {
        "status": response.status,
        "cache": response.headers.get("cache-control", ""),
        "location": response.headers.get("location"),
        "contentType": response.headers.get("content-type", ""),
        "body": response.text(),
    }
    assert_denied(result, name, before)
    if expected_fact is not None:
        assert expected_fact(), name


def form_for(page, intent):
    selector = 'form[method="post"]:has(input[name="intent"][value="' + intent + '"])'
    result = page.locator(selector)
    expect(result).to_have_count(1)
    return result


try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            channel=os.environ.get("PLAYWRIGHT_CHANNEL", "chromium"),
            headless=True, args=["--no-sandbox"],
        )
        active_ctx, active, active_id = account(browser, "active", "203.0.113.201")
        member_ctx, member, member_id = account(browser, "member", "203.0.113.202")
        manager_ctx, manager, manager_id = account(
            browser, "moderator", "203.0.113.203", "builtin-moderator")
        profile_ctx, profile, profile_id = account(browser, "profile", "203.0.113.204")
        inbox_ctx, inbox, inbox_id = account(browser, "inbox", "203.0.113.205")
        read_ctx, read, read_id = account(browser, "readstate", "203.0.113.206")

        category_id, section_id = prefix + "-cat", prefix + "-section"
        sql("insert into forum_categories(id,name) values($1,'J12 Browser category')",
            [category_id])
        sql("insert into forum_sections(id,category_id,name) values($1,$2,'J12 Browser section')",
            [section_id, category_id])
        ordinary = topic(member_id, section_id, "ordinary")
        help_topic = topic(member_id, "help-solutions-questions", "Help needs details")
        solved = topic(active_id, "help-solutions-questions", "solved", extra_answer=member_id)
        duplicate = topic(member_id, "help-solutions-questions", "duplicate candidate")
        original = topic(active_id, "help-solutions-questions", "canonical original")
        read_topic = topic(active_id, section_id, "read-state")
        signal_id = str(uuid4())
        sql("""insert into forum_help_signals
          (id,kind,topic_id,submitted_by_user_id,explanation)
          values($1,'needs-details',$2,$3,'J12 review fixture')""",
            [signal_id, help_topic["id"], active_id])
        relationship_id = str(uuid4())
        sql("""insert into forum_help_duplicate_relationships
          (id,duplicate_topic_id,original_topic_id,confirmed_by_user_id)
          values($1,$2,$3,$4)""",
            [relationship_id, duplicate["id"], original["id"], active_id])
        notification_id = str(uuid4())
        sql("""insert into forum_reply_notifications
          (id,kind,recipient_user_id,actor_user_id,topic_id,post_id)
          values($1,'reply',$2,$3,$4,$5)""",
            [notification_id, inbox_id, active_id, ordinary["id"], ordinary["post"]])
        record("real-better-auth-six-browser-sessions-and-postgresql-fixtures")

        # Actual active browser session, permission and persistence controls.
        positive_reply = active_ctx.request.post(
            base + "/en/topics/" + ordinary["id"],
            headers={"Origin": base},
            form={"intent": "reply", "body": "J12 active browser control"},
            max_redirects=0,
        )
        assert positive_reply.status in (302, 303), (
            "active reply", positive_reply.status, positive_reply.text()[:180])
        assert count("select count(*)::int n from forum_posts where topic_id=$1",
                     [ordinary["id"]]) == 2
        positive_profile = active_ctx.request.post(
            base + "/en/users/" + active_id,
            headers={"Origin": base},
            form={"intent": "save-profile", "bio": "J12 active profile",
                  "githubUrl": "", "websiteUrl": ""},
            max_redirects=0,
        )
        assert positive_profile.status in (302, 303), (
            "active profile", positive_profile.status, positive_profile.text()[:180])
        assert sql("select bio from forum_profiles where user_id=$1", [active_id]) == [
            {"bio": "J12 active profile"}]
        record("actual-session-active-publication-and-profile-controls")

        # Mount real UI before DB deactivation; sessions and browser cookies stay intact.
        document(member, "/en/topics/" + ordinary["id"])
        reply_form = form_for(member, "reply")
        resume = member.locator("button.forum-composer-resume")
        if resume.count() and resume.is_visible():
            resume.click()
        if reply_form.locator(".markdown-editor").get_attribute("data-authoring") != "advanced":
            reply_form.get_by_role("button", name="Advanced", exact=True).click()
        reply_form.locator("textarea#reply-body").fill("J12 DENIED UI REPLY")
        expect(reply_form.locator('button[type="submit"]')).to_be_enabled()
        document(manager, "/en/topics/" + solved["id"])
        document(profile, "/en/users/" + profile_id + "?edit=1")
        profile_form = form_for(profile, "save-profile")
        profile_form.locator('textarea[name="bio"]').fill("J12 DENIED PROFILE")
        document(inbox, "/en/notifications")
        notification_form = form_for(inbox, "open")
        assert notification_form.locator('input[name="notificationId"]').input_value() == notification_id
        document(read, "/en/topics/" + read_topic["id"])

        # React's legitimate mounted read-state effect, if delivered, precedes denial.
        before_read = sql("""select last_read_post_id,updated_at
          from forum_topic_read_states where user_id=$1 and topic_id=$2""",
          [read_id, read_topic["id"]])
        assert before_read and before_read[0]["last_read_post_id"] == read_topic["post"], (
            "readstate active browser effect", before_read)
        record("real-chromium-mounted-forms-and-active-read-state")

        for actor in (member_id, manager_id, profile_id, inbox_id, read_id):
            deactivate(actor)
        assert sql("""select count(*)::int n from "session"
          where user_id=any($1::text[])""",
          [[member_id, manager_id, profile_id, inbox_id, read_id]])[0]["n"] >= 5
        record("committed-deactivation-with-retained-real-session-cookies")

        # Publication and replay/edit/source-locale admission.
        browser_post(member, "/en/sections/" + section_id, {
            "intent": "createTopic", "title": "J12 denied new topic",
            "body": "J12 body", "tags": "",
        }, "publication-create-topic-inactive")
        browser_post(member, "/en/categories/help-solutions", {
            "intent": "createHelpQuestion", "title": "J12 denied Help question",
            "body": "J12 Help body", "tags": "",
        }, "publication-create-help-question-inactive")
        ui_denial(
            member, reply_form, "/en/topics/" + ordinary["id"],
            "mounted-chromium-reply-inactive",
            lambda: count("select count(*)::int n from forum_post_revisions"
                          " where original_content='J12 DENIED UI REPLY'") == 0,
        )
        assert "#post-" not in member.url, "Denied reply falsely navigated to new post"
        browser_post(member, "/en/topics/" + ordinary["id"], {
            "intent": "editPost", "postId": ordinary["post"],
            "expectedRevisionId": ordinary["revision"],
            "editorOperationId": str(uuid4()), "editorAttachmentIds": "[]",
            "body": "J12 DENIED EDIT",
        }, "published-post-edit-inactive")
        browser_post(member, "/en/topics/" + ordinary["id"], {
            "intent": "correctTitleSourceLocale", "operationScope": "own",
            "expectedRevisionId": ordinary["title"], "sourceLocale": "en",
        }, "same-source-title-noop-inactive")
        browser_post(member, "/en/topics/" + ordinary["id"], {
            "intent": "correctPostSourceLocale", "operationScope": "own",
            "postId": ordinary["post"], "expectedRevisionId": ordinary["revision"],
            "sourceLocale": "en",
        }, "same-source-post-noop-inactive")

        # Account-bound profile save through a real mounted Chromium form.
        ui_denial(
            profile, profile_form, "/en/users/" + profile_id,
            "mounted-chromium-profile-save-inactive",
            lambda: sql("select bio from forum_profiles where user_id=$1",
                        [profile_id]) == [],
        )
        assert "?saved=1" not in profile.url, "Denied profile displayed false save"

        # Help submission, signal review, moderation, topic state and duplicate graph.
        browser_post(member, "/en/topics/" + help_topic["id"], {
            "intent": "submitHelpSignal", "kind": "needs-details",
            "explanation": "J12 denied Help signal",
        }, "help-signal-submit-inactive")
        browser_post(member, "/en/topics/" + duplicate["id"], {
            "intent": "appealHelpDuplicate", "expectedRelationshipId": relationship_id,
            "explanation": "J12 denied duplicate appeal",
        }, "help-duplicate-appeal-submit-inactive")
        browser_post(manager, "/en/topics/" + ordinary["id"], {
            "intent": "pinTopic", "inlineQuickAction": "1",
        }, "admin-topic-pin-inactive")
        browser_post(manager, "/en/topics/" + ordinary["id"], {
            "intent": "closeTopic", "inlineQuickAction": "1",
            "editorActorId": manager_id, "expectedClosureVersion": "0",
        }, "admin-topic-closure-inactive")
        browser_post(manager, "/en/topics/" + solved["id"], {
            "intent": "markSolutionNeedsReview", "inlineQuickAction": "1",
            "expectedBestAnswerPostId": solved["answer"],
        }, "help-solution-moderation-inactive")
        browser_post(manager, "/en/topics/" + help_topic["id"], {
            "intent": "rejectHelpSignal", "inlineQuickAction": "1",
            "signalId": signal_id,
        }, "help-signal-review-inactive")
        browser_post(manager, "/en/topics/" + help_topic["id"], {
            "intent": "confirmHelpDuplicate", "inlineQuickAction": "1",
            "originalTopicId": original["id"],
        }, "help-duplicate-confirmation-inactive")

        # Unified inbox form is clicked after deactivation with the real mounted UI.
        ui_denial(inbox, notification_form, "/en/notifications",
                  "mounted-chromium-notification-open-inactive")
        assert sql("select read_at from forum_reply_notifications where id=$1",
                   [notification_id]) == [{"read_at": None}]

        # Browser-initiated canonical read-state POST cannot advance an inactive actor.
        browser_post(read, "/en/topics/" + read_topic["id"], {
            "intent": "markTopicRead", "postId": read_topic["post"],
        }, "browser-topic-read-state-noop-inactive")
        assert sql("""select last_read_post_id,updated_at
          from forum_topic_read_states where user_id=$1 and topic_id=$2""",
          [read_id, read_topic["id"]]) == before_read
        assert sql("select status from forum_help_signals where id=$1",
                   [signal_id]) == [{"status": "pending"}]
        assert sql("select is_closed,closure_version from forum_topics where id=$1",
                   [ordinary["id"]]) == [{"is_closed": False, "closure_version": 0}]
        assert sql("""select solution_moderation_status from forum_posts
          where id=$1""", [solved["answer"]]) == [{"solution_moderation_status": None}]
        assert sql("""select count(*)::int n from admin_history
          where actor_id=$1""", [manager_id]) == [{"n": 0}]
        record("final-no-forum-mutations-history-or-false-success-after-deactivation")

        member.screenshot(path=str(args.output / "inactive-reply.png"), full_page=True)
        profile.screenshot(path=str(args.output / "inactive-profile.png"), full_page=True)
        inbox.screenshot(path=str(args.output / "inactive-notifications.png"), full_page=True)
        assert not external, ("external network from disposable browser", external[:10])
        # A handled 401 may cause normal revalidation but not a forced application crash.
        assert not page_errors, ("browser page errors", page_errors[:8])
        (args.output / "acceptance.json").write_text(
            json.dumps({"implementation": os.environ.get("IMPLEMENTATION_SHA", ""),
                        "cases": records}, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        browser.close()
        print("SA04-J12 real Chromium/Worker/BetterAuth/PostgreSQL matrix: PASS",
              len(records), "cases", flush=True)
except Exception as error:
    print("SA04-J12 Chromium acceptance FAILED", type(error).__name__, str(error),
          flush=True)
    (args.output / "failure.json").write_text(json.dumps({
        "error": str(error), "cases": records, "pageErrors": page_errors,
        "external": external,
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    raise
