"""AP-10 isolated Chromium -> built Worker -> Better Auth -> PostgreSQL acceptance."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
from urllib.parse import quote, urlencode, urlparse
from uuid import uuid4
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--url", default="http://127.0.0.1:4188")
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
base = args.url.rstrip("/")
database = os.environ.get("DATABASE_URL", "")
assert urlparse(base).hostname in ("127.0.0.1", "localhost")
assert urlparse(database).hostname in ("127.0.0.1", "localhost")
assert urlparse(database).path.endswith("_test"), "Disposable test DB required"
repo = Path(__file__).resolve().parents[3]
node = shutil.which("node")
assert node
args.output.mkdir(parents=True, exist_ok=True)
prefix = "ap10-browser-" + uuid4().hex
records, page_errors, external, layout_failures = [], [], [], []


def sql(query, params=None):
    code = """import pg from 'pg';
const payload=JSON.parse(await new Promise(resolve=>{let s='';
process.stdin.on('data',b=>s+=b);process.stdin.on('end',()=>resolve(s));}));
const c=new pg.Client({connectionString:process.env.DATABASE_URL});
await c.connect();
try{console.log(JSON.stringify((await c.query(payload.query,payload.params)).rows??[]));}
finally{await c.end();}"""
    result = subprocess.run(
        [node, "--input-type=module", "-e", code], cwd=repo, text=True,
        input=json.dumps({"query": query, "params": params or []}),
        capture_output=True, check=True,
    )
    return json.loads(result.stdout)


def record(case, **details):
    item = {"case": case, **details}
    records.append(item)
    print(json.dumps(item, ensure_ascii=False), flush=True)


def document(page, path, status=200):
    response = page.goto(base + path, wait_until="networkidle")
    assert response is not None and response.status == status, (path, getattr(response, "status", None))
    assert "no-store" in response.headers.get("cache-control", ""), (path, response.headers)
    return response


def post(context, path, fields):
    return context.request.post(
        base + path, headers={
            "Origin": base,
            "Content-Type": "application/x-www-form-urlencoded",
        }, data=urlencode(fields), max_redirects=0,
    )


def new_actor(browser, suffix):
    context = browser.new_context(viewport={"width": 1280, "height": 900})
    context.route("**/*", lambda route: route.continue_()
                  if route.request.url.startswith(base + "/")
                  else (external.append(route.request.url), route.abort())[-1])
    response = context.request.post(
        base + "/api/auth/sign-up/email", headers={"Origin": base},
        data={"name": "AP10 " + suffix + " עברית " + "A" * 55,
              "email": prefix + "-" + suffix + "@test.invalid",
              "password": "local-only-" + uuid4().hex},
    )
    assert response.status == 200, ("sign-up", suffix, response.status, response.text()[:240])
    actor_id = response.json()["user"]["id"]
    page = context.new_page()
    page.set_default_timeout(20000)
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    return context, page, actor_id


def form_for(page, intent):
    form = page.locator('form[method="post"]:has(input[name="intent"][value="' + intent + '"])')
    expect(form).to_have_count(1)
    return form


def create_measure(page, target_id, restrictions, explanation, expiry_mode="permanent"):
    document(page, "/en/admin/measures?target=" + quote(target_id, safe=""))
    form = form_for(page, "create")
    measure_id = form.locator('input[name="measureId"]').input_value()
    form.locator('textarea[name="reason"]').fill(explanation)
    form.locator("[data-measure-expiry-mode]").select_option(expiry_mode)
    for key in restrictions:
        form.locator('input[name="restriction"][value="' + key + '"]').check()
    with page.expect_response(lambda r: r.request.method == "POST" and
                              "/admin/measures" in r.url):
        form.locator('button[type="submit"]').click()
    page.wait_for_url("**/admin/measures/" + measure_id)
    expect(page.locator('input[name="expectedVersion"]').first).to_have_value("1")
    return measure_id


def topic_fixture(author_id):
    topic_id = prefix + "-topic"
    title_id = prefix + "-title"
    post_id = prefix + "-post"
    revision_id = prefix + "-body"
    sql("""with topic as (
      insert into forum_topics(id,section_id,author_id,current_title_revision_id)
      values($1,'help-solutions-questions',$2,$3) returning id)
      insert into forum_topic_title_revisions(id,topic_id,author_id,original_content,source_locale)
      select $3,id,$2,'AP10 acceptance topic','en' from topic""",
        [topic_id, author_id, title_id])
    sql("""with post as (
      insert into forum_posts(id,topic_id,author_id,current_revision_id)
      values($1,$2,$3,$4) returning id)
      insert into forum_post_revisions(id,post_id,author_id,original_content,source_locale)
      select $4,id,$3,'Original acceptance content','en' from post""",
        [post_id, topic_id, author_id, revision_id])
    return topic_id


def replies(topic_id):
    return sql("select count(*)::int as total from forum_posts where topic_id=$1", [topic_id])[0]["total"]


try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel=os.environ.get("PLAYWRIGHT_CHANNEL", "chromium"),
                                             headless=True, args=["--no-sandbox"])
        guest = browser.new_page(viewport={"width": 1280, "height": 900})
        guest.on("pageerror", lambda error: page_errors.append(str(error)))
        document(guest, "/en/account/measures", 401)
        document(guest, "/en/admin/measures", 401)
        record("guest-denied-private-reads")

        manager_ctx, manager, manager_id = new_actor(browser, "manager")
        subject_ctx, subject, subject_id = new_actor(browser, "subject")
        other_ctx, other, other_id = new_actor(browser, "other")

        # Actual Better Auth identities, fixture-only explicit grants and raw role hierarchy.
        sql("insert into authz_user_roles(user_id,role_id) values($1,'builtin-admin'),($2,'builtin-admin')",
            [manager_id, subject_id])
        sql("insert into authz_user_permission_overrides(user_id,permission_key,effect) values($1,$2,'allow')",
            [manager_id, "admin.users.blocks.manage"])
        document(manager, "/en/admin/measures?target=" + quote(other_id, safe=""))
        expect(form_for(manager, "create").locator(
            'input[name="restriction"][value="admin.forum"]')).to_have_count(0)
        sql("insert into authz_user_permission_overrides(user_id,permission_key,effect) values($1,$2,'allow')",
            [manager_id, "admin.users.blocks.managePrivileged"])
        document(manager, "/en/admin/measures?target=" + quote(other_id, safe=""))
        expect(form_for(manager, "create").locator(
            'input[name="restriction"][value="admin.forum"]')).to_have_count(1)
        record("restriction-selector-follows-current-elevated-grant")

        # AP-11 connected Users detail -> canonical inline authz -> History ->
        # same-session read-only recovery after fresh permission revocation.
        user_path = "/en/admin/users/" + quote(other_id, safe="")
        document(other, user_path, 403)
        sql("""insert into authz_user_permission_overrides(user_id,permission_key,effect)
          values($1,'access.authorization.manage','deny')
          on conflict(user_id,permission_key) do update set effect='deny'""", [manager_id])
        document(manager, user_path)
        expect(manager.locator("#authorization")).to_have_count(0)
        expect(manager.locator("#admin-user-detail-heading")).to_have_count(1)
        assert other_id in manager.locator("main").inner_text()
        document(manager, "/en/admin/authorization", 403)
        record("ap11-users-readonly-independent-of-authz-management")

        # Fixture grant only; all tested assignment/override writes use the real UI.
        sql("""update authz_user_permission_overrides set effect='allow'
          where user_id=$1 and permission_key='access.authorization.manage'""", [manager_id])
        document(manager, user_path)
        expect(manager.locator("#authorization")).to_have_count(1)
        history_before = sql("""select count(*)::int as total from admin_history
          where target_type='user' and target_id=$1""", [other_id])[0]["total"]

        assignment = manager.locator("#authorization form.admin-role-assignment")
        expect(assignment).to_have_count(1)
        assignment.locator('select[name="roleId"]').select_option("builtin-moderator")
        with manager.expect_response(lambda r: r.request.method == "POST" and
                                     "/admin/authorization" in r.url) as assigned:
            assignment.locator('button[type="submit"]').click()
        assert assigned.value.status == 200, ("inline assignment", assigned.value.status)
        expect(manager.locator("#authorization form.admin-role-assignment select[name='roleId']")).to_have_value("builtin-moderator")
        assert sql("select role_id from authz_user_roles where user_id=$1", [other_id]) == [
            {"role_id": "builtin-moderator"}
        ]

        override_path = '#authorization form.admin-override-row:has(input[name="permission"][value="forum.reply.create"])'
        override = manager.locator(override_path)
        expect(override).to_have_count(1)
        override.locator('select[name="effect"]').select_option("deny")
        with manager.expect_response(lambda r: r.request.method == "POST" and
                                     "/admin/authorization" in r.url) as overridden:
            override.locator('button[type="submit"]').click()
        assert overridden.value.status == 200, ("inline override", overridden.value.status)
        expect(manager.locator(override_path + ' select[name="effect"]')).to_have_value("deny")
        assert sql("""select effect from authz_user_permission_overrides
          where user_id=$1 and permission_key='forum.reply.create'""", [other_id]) == [{"effect": "deny"}]
        history = sql("""select action from admin_history
          where target_type='user' and target_id=$1 order by position""", [other_id])
        assert [item["action"] for item in history][history_before:] == [
            "user.roleAssigned", "user.overrideChanged"
        ], history
        document(manager, "/en/admin/history")
        role_event = manager.locator(".admin-history-events > li").filter(
            has=manager.get_by_role("heading", name="User role assigned")).filter(has_text=other_id)
        override_event = manager.locator(".admin-history-events > li").filter(
            has=manager.get_by_role("heading", name="User permission override changed")).filter(has_text=other_id)
        expect(role_event).to_have_count(1)
        expect(override_event).to_have_count(1)
        expect(override_event).to_contain_text("forum.reply.create")
        record("ap11-users-inline-role-override-history")

        # Revoke while the actual inline form remains mounted, then submit its stale intent.
        document(manager, user_path)
        override = manager.locator(override_path)
        expect(override).to_have_count(1)
        sql("""update authz_user_permission_overrides set effect='deny'
          where user_id=$1 and permission_key='access.authorization.manage'""", [manager_id])
        override.locator('select[name="effect"]').select_option("inherit")
        with manager.expect_response(lambda r: r.request.method == "POST" and
                                     "/admin/authorization" in r.url) as denied:
            override.locator('button[type="submit"]').click()
        assert denied.value.status == 403, ("revoked inline POST", denied.value.status)
        expect(manager.locator("#authorization")).to_have_count(0)
        expect(manager.locator("#admin-user-detail-heading")).to_have_count(1)
        assert other_id in manager.locator("main").inner_text()
        assert sql("""select effect from authz_user_permission_overrides
          where user_id=$1 and permission_key='forum.reply.create'""", [other_id]) == [{"effect": "deny"}]
        assert sql("""select count(*)::int as total from admin_history
          where target_type='user' and target_id=$1""", [other_id])[0]["total"] == len(history)

        sql("""update authz_user_permission_overrides set effect='allow'
          where user_id=$1 and permission_key='access.authorization.manage'""", [manager_id])
        document(manager, user_path)
        expect(manager.locator("#authorization")).to_have_count(1)
        expect(manager.locator(override_path + ' select[name="effect"]')).to_have_value("deny")
        record("ap11-users-same-session-revoke-readonly-no-replay")

        # Restore the existing participant through canonical UI before the AP-10 cases.
        restored_override = manager.locator(override_path)
        restored_override.locator('select[name="effect"]').select_option("inherit")
        with manager.expect_response(lambda r: r.request.method == "POST" and
                                     "/admin/authorization" in r.url) as reset_effect:
            restored_override.locator('button[type="submit"]').click()
        assert reset_effect.value.status == 200
        expect(manager.locator(override_path + ' select[name="effect"]')).to_have_value("inherit")
        assert sql("""select effect from authz_user_permission_overrides
          where user_id=$1 and permission_key='forum.reply.create'""", [other_id]) == []
        restored_role = manager.locator("#authorization form.admin-role-assignment")
        restored_role.locator('select[name="roleId"]').select_option("builtin-user")
        with manager.expect_response(lambda r: r.request.method == "POST" and
                                     "/admin/authorization" in r.url) as reset_role:
            restored_role.locator('button[type="submit"]').click()
        assert reset_role.value.status == 200
        expect(manager.locator("#authorization form.admin-role-assignment select[name='roleId']")).to_have_value("builtin-user")
        assert sql("select role_id from authz_user_roles where user_id=$1", [other_id]) == [
            {"role_id": "builtin-user"}
        ]
        record("ap11-users-fixture-restored-via-canonical-ui")



        # An authenticated malformed create must fail before a PG text bind or any write.
        before_measures = sql("select count(*)::int as total from user_measures")[0]["total"]
        before_history = sql("select count(*)::int as total from admin_history")[0]["total"]
        for invalid_target in ("invalid\x00target", "x" * 2049):
            response = post(manager_ctx, "/en/admin/measures", {
                "intent": "create", "measureId": str(uuid4()), "targetId": invalid_target,
                "reason": "Invalid target rejection", "expiresAt": "",
                "restriction": "replies.create",
            })
            assert response.status == 400, ("invalid target create", response.status, response.text()[:180])
            assert "no-store" in response.headers.get("cache-control", ""), response.headers
        response = post(manager_ctx, "/en/admin/measures", {
            "intent": "create", "measureId": str(uuid4()),
            "targetId": "missing-" + uuid4().hex,
            "reason": "Nonexistent target", "expiresAt": "", "restriction": "replies.create",
        })
        assert response.status == 404, ("missing target create", response.status, response.text()[:180])
        assert "no-store" in response.headers.get("cache-control", ""), response.headers
        assert sql("select count(*)::int as total from user_measures")[0]["total"] == before_measures
        assert sql("select count(*)::int as total from admin_history")[0]["total"] == before_history
        record("malformed-target-400-missing-target-404-no-database-write")

        topic_id = topic_fixture(other_id)

        # AP-11: browser navigation across admin hierarchy, then the canonical
        # closure action while an unrelated participant has a mounted reply editor.
        topic_path = "/en/topics/" + quote(topic_id, safe="")
        admin_topic_path = "/en/admin/forum/topics/" + quote(topic_id, safe="")
        public_response = subject.goto(base + topic_path, wait_until="networkidle")
        assert public_response and public_response.status == 200, (
            topic_path, getattr(public_response, "status", None)
        )
        editor = form_for(subject, "reply")
        if editor.locator(".markdown-editor").get_attribute("data-authoring") != "advanced":
            editor.get_by_role("button", name="Advanced", exact=True).click()
        reply_text = "AP11 retained editor: close while composing"
        editor.locator("textarea#reply-body").fill(reply_text)
        expect(editor.locator('button[type="submit"]')).to_be_enabled()
        operation_id = editor.locator('input[name="editorOperationId"]').input_value()
        initial_post_count = replies(topic_id)
        initial_closure_history = sql("""select action from admin_history
          where target_type='topic' and target_id=$1
          and action in ('topic.closed','topic.reopened') order by position""", [topic_id])
        assert initial_closure_history == []

        document(manager, "/en/admin/forum")
        manager.locator('a[href="/en/admin/forum/categories/help-solutions"]').click()
        manager.wait_for_url("**/en/admin/forum/categories/help-solutions")
        manager.locator('a[href="/en/admin/forum/sections/help-solutions-questions"]').click()
        manager.wait_for_url("**/en/admin/forum/sections/help-solutions-questions")
        manager.locator('a[href="' + admin_topic_path + '"]').click()
        manager.wait_for_url("**" + admin_topic_path)
        expect(manager.locator(".admin-topic")).to_have_count(1)
        manager.locator("details.topic-admin-tools > summary").click()
        close = form_for(manager, "closeTopic")
        expect(close.locator('input[name="expectedClosureVersion"]')).to_have_value("0")
        expect(close.locator('input[name="editorActorId"]')).to_have_value(manager_id)
        with manager.expect_response(lambda r: r.request.method == "POST"
                                     and "/en/topics/" in r.url) as closed:
            close.locator('button[type="submit"]').click()
        assert closed.value.status == 200, ("close topic", closed.value.status)
        expect(form_for(manager, "reopenTopic")).to_be_visible()
        assert sql("select is_closed,closure_version from forum_topics where id=$1",
                   [topic_id]) == [{"is_closed": True, "closure_version": 1}]
        assert replies(topic_id) == initial_post_count
        assert sql("""select action from admin_history where target_type='topic'
          and target_id=$1 and action in ('topic.closed','topic.reopened')
          order by position""", [topic_id]) == [{"action": "topic.closed"}]
        record("ap11-admin-forum-hierarchy-canonical-topic-close-history")

        # Stale submit must be rejected as topicClosed, revalidate exactly once
        # without replay, and retain the same in-memory editor and operation.
        with subject.expect_response(lambda r: r.request.method == "POST"
                                     and "/en/topics/" in r.url) as closed_reply:
            editor.locator('button[type="submit"]').click()
        assert closed_reply.value.status == 409, ("closed reply", closed_reply.value.status)
        expect(subject.locator(".topic-closed-notice")).to_have_count(1)
        expect(editor).to_be_visible()
        expect(editor.locator("textarea#reply-body")).to_have_value(reply_text)
        expect(editor.locator('input[name="editorOperationId"]')).to_have_value(operation_id)
        expect(editor.locator('button[type="submit"]')).to_be_disabled()
        expect(editor.locator(".topic-reply-paused")).to_be_visible()
        expect(editor.get_by_role("button", name="Cancel")).to_be_enabled()
        assert replies(topic_id) == initial_post_count
        assert sql("""select action from admin_history where target_type='topic'
          and target_id=$1 and action in ('topic.closed','topic.reopened')
          order by position""", [topic_id]) == [{"action": "topic.closed"}]
        record("ap11-closed-topic-reply-409-editor-retained-no-write")

        reopen = form_for(manager, "reopenTopic")
        expect(reopen.locator('input[name="expectedClosureVersion"]')).to_have_value("1")
        with manager.expect_response(lambda r: r.request.method == "POST"
                                     and "/en/topics/" in r.url) as reopened:
            reopen.locator('button[type="submit"]').click()
        assert reopened.value.status == 200, ("reopen topic", reopened.value.status)
        expect(form_for(manager, "closeTopic")).to_be_visible()
        assert sql("select is_closed,closure_version from forum_topics where id=$1",
                   [topic_id]) == [{"is_closed": False, "closure_version": 2}]
        assert sql("""select action from admin_history where target_type='topic'
          and target_id=$1 and action in ('topic.closed','topic.reopened')
          order by position""", [topic_id]) == [
            {"action": "topic.closed"}, {"action": "topic.reopened"}
        ]
        document(manager, "/en/admin/history")
        expect(manager.locator(".admin-history-events > li").filter(
            has=manager.get_by_role("heading", name="Topic closed")).filter(has_text=topic_id)).to_have_count(1)
        expect(manager.locator(".admin-history-events > li").filter(
            has=manager.get_by_role("heading", name="Topic reopened")).filter(has_text=topic_id)).to_have_count(1)
        record("ap11-topic-reopen-independent-history-and-version")

        # Newly reopened topic permits a fresh editor, which must remain mounted
        # when the existing AP-10 restriction is subsequently imposed.
        public_response = subject.goto(base + topic_path, wait_until="networkidle")
        assert public_response and public_response.status == 200, (
            topic_path, getattr(public_response, "status", None)
        )
        restricted_editor = form_for(subject, "reply")
        if restricted_editor.locator(".markdown-editor").get_attribute("data-authoring") != "advanced":
            restricted_editor.get_by_role("button", name="Advanced", exact=True).click()
        restricted_text = "AP11 retained editor: revoked reply permission"
        restricted_editor.locator("textarea#reply-body").fill(restricted_text)
        restricted_operation = restricted_editor.locator('input[name="editorOperationId"]').input_value()

        first_id = create_measure(
            manager, subject_id,
            ("replies.create", "topics.create", "attachments.upload", "profile.edit",
             "posts.edit", "complaints.submit", "admin.forum", "admin.complaints",
             "admin.security", "admin.usersAccess"),
            "First distinct violation",
        )
        second_id = create_measure(
            manager, subject_id, ("replies.create",), "Second distinct violation",
            expiry_mode="hour",
        )
        duration = sql("select extract(epoch from (expires_at - created_at))::int as seconds from user_measures where id=$1",
                       [second_id])[0]["seconds"]
        assert 3500 <= duration <= 3600, ("one-hour preset", duration)
        assert first_id != second_id
        record("manager-two-independent-measures", first=first_id, second=second_id)


        # Closure was lifted, but two independent AP-10 reply restrictions are
        # now active. A stale mounted editor cannot commit or disappear.
        blocked_before = replies(topic_id)
        blocked_history = sql("select count(*)::int as total from admin_history")[0]["total"]
        with subject.expect_response(lambda r: r.request.method == "POST"
                                     and "/en/topics/" in r.url) as denied_reply:
            restricted_editor.locator('button[type="submit"]').click()
        assert denied_reply.value.status == 403, ("restricted reply", denied_reply.value.status)
        expect(restricted_editor).to_be_visible()
        expect(restricted_editor.locator("textarea#reply-body")).to_have_value(restricted_text)
        expect(restricted_editor.locator('input[name="editorOperationId"]')).to_have_value(restricted_operation)
        expect(restricted_editor.locator('button[type="submit"]')).to_be_disabled()
        expect(restricted_editor.locator(".topic-reply-paused")).to_be_visible()
        expect(restricted_editor.get_by_role("button", name="Cancel")).to_be_enabled()
        assert replies(topic_id) == blocked_before
        assert sql("select count(*)::int as total from admin_history")[0]["total"] == blocked_history
        assert sql("select is_closed,closure_version from forum_topics where id=$1",
                   [topic_id]) == [{"is_closed": False, "closure_version": 2}]
        record("ap11-reopened-topic-ap10-reply-sanction-retains-editor-no-write")


        document(subject, "/en/account/measures")
        expect(subject.locator('section[aria-label^="Active"] > ol.admin-forum-objects > li')).to_have_count(2)
        assert "First distinct violation" in subject.locator("main").inner_text()
        assert "Second distinct violation" in subject.locator("main").inner_text()
        own_path = "/en/account/measures/" + first_id
        document(subject, own_path)
        assert "First distinct violation" in subject.locator("main").inner_text()
        assert manager_id not in subject.locator("main").inner_text()
        assert "reviewer_user_id" not in subject.content()
        appeal = form_for(subject, "appeal")
        exact_appeal_id = appeal.locator('input[name="appealId"]').input_value()
        appeal.locator('textarea[name="body"]').fill("Please review my first measure")
        appeal.locator('button[type="submit"]').click()
        expect(subject.locator('input[name="intent"][value="appeal"]')).to_have_count(0)
        assert "Pending" in subject.locator("main").inner_text()
        record("private-status-and-independent-appeal")

        document(manager, "/en/admin/measures")
        destination = "/en/admin/measures/" + first_id + "#measure-review-" + exact_appeal_id
        link = manager.locator('a[href="' + destination + '"]')
        expect(link).to_have_count(1)
        link.click()
        manager.wait_for_url("**" + destination)
        expect(form_for(manager, "review")).to_have_count(1)
        record("pending-measure-appeal-review-discovery")

        forbidden = (
            "/en/admin/forum", "/en/admin/history", "/en/admin/users",
            "/en/admin/authorization", "/en/attention?mode=security",
            "/en/attention?mode=complaints",
        )
        for path in forbidden:
            document(subject, path, 403)
        count = replies(topic_id)
        response = post(subject_ctx, "/en/topics/" + topic_id, {
            "intent": "reply", "body": "Blocked response",
        })
        assert response.status == 403, ("blocked reply", response.status)
        assert replies(topic_id) == count
        other_reply = post(other_ctx, "/en/topics/" + topic_id, {
            "intent": "reply", "body": "Unaffected participant",
        })
        assert other_reply.status in (302, 303), ("other reply", other_reply.status, other_reply.text()[:200])
        assert replies(topic_id) == count + 1
        record("current-session-domain-and-admin-family-denials")

        topic_response = subject.goto(base + "/en/topics/" + quote(topic_id, safe=""), wait_until="networkidle")
        assert topic_response and topic_response.status == 200
        expect(subject.locator('form.topic-reply-form')).to_have_count(0)
        expect(subject.locator('form:has(input[name="intent"][value="submitComplaint"])')).to_have_count(0)
        profile_response = subject.goto(base + "/en/users/" + quote(subject_id, safe=""), wait_until="networkidle")
        assert profile_response and profile_response.status == 200
        expect(subject.locator('a[href*="?edit=1"]')).to_have_count(0)
        expect(subject.locator('a[href="/en/account/measures"]')).to_have_count(1)
        record("sanctioned-first-party-actions-hidden-own-measures-preserved")

        document(manager, "/en/admin/measures/" + first_id)
        review = form_for(manager, "review")
        review.locator('select[name="outcome"]').select_option("accepted")
        review.locator('select[name="remedy"]').select_option("lift")
        review.locator('textarea[name="explanation"]').fill("Appeal accepted, first measure lifted")
        review.locator('button[type="submit"]').click()
        expect(manager.locator('input[name="intent"][value="review"]')).to_have_count(0)
        assert "Lifted" in manager.locator("main").inner_text()
        document(manager, "/en/admin/measures")
        expect(manager.locator('a[href^="/en/admin/measures/' + first_id + '#measure-review-"]')).to_have_count(0)
        document(subject, own_path)
        assert "Lifted" in subject.locator("main").inner_text()
        assert "Accepted" in subject.locator("main").inner_text()
        profile_response = subject.goto(base + "/en/users/" + quote(subject_id, safe=""), wait_until="networkidle")
        assert profile_response and profile_response.status == 200
        expect(subject.locator('a[href*="?edit=1"]')).to_have_count(1)
        for path in forbidden:
            document(subject, path)
        response = post(subject_ctx, "/en/topics/" + topic_id, {
            "intent": "reply", "body": "Second measure still blocks",
        })
        assert response.status == 403 and replies(topic_id) == count + 1
        document(manager, "/en/admin/history")
        reviewed = manager.locator(".admin-history-events > li").filter(
            has=manager.get_by_role("heading", name="User measure appeal resolved")
        ).first
        expect(reviewed).to_contain_text(first_id)
        expect(reviewed).to_contain_text("Accepted")
        expect(reviewed).to_contain_text("Decision remedy")
        expect(reviewed).to_contain_text("Lift measure")
        expect(reviewed).to_contain_text("Version")
        expect(reviewed).to_contain_text("Active")
        expect(reviewed).to_contain_text("Lifted")
        record("authorized-admin-history-shows-appeal-outcome-remedy-and-delta")

        # An already-open stale form must never be replayed after the other tab lifts B.
        stale = manager_ctx.new_page()
        stale.set_default_timeout(20000)
        stale.on("pageerror", lambda error: page_errors.append(str(error)))
        document(stale, "/en/admin/measures/" + second_id)
        assert form_for(stale, "change").locator('input[name="expectedVersion"]').input_value() == "1"
        document(manager, "/en/admin/measures/" + second_id)
        lift = form_for(manager, "lift")
        lift.locator('textarea[name="reason"]').fill("Second violation resolved")
        lift.locator('button[type="submit"]').click()
        expect(manager.locator('input[name="intent"][value="lift"]')).to_have_count(0)
        history_before = sql(
            "select count(*)::int as total from admin_history where target_type='user-measure' and target_id=$1",
            [second_id],
        )[0]["total"]
        change = form_for(stale, "change")
        change.locator('textarea[name="reason"]').fill("Stale edit must be denied")
        with stale.expect_response(lambda r: r.request.method == "POST" and
                                   second_id in r.url) as stale_response:
            change.locator('button[type="submit"]').click()
        assert stale_response.value.status == 409, stale_response.value.status
        expect(stale.locator('input[name="intent"][value="change"]')).to_have_count(0)
        assert sql(
            "select count(*)::int as total from admin_history where target_type='user-measure' and target_id=$1",
            [second_id],
        )[0]["total"] == history_before
        assert replies(topic_id) == count + 1
        allowed = post(subject_ctx, "/en/topics/" + topic_id, {
            "intent": "reply", "body": "Restored after both measures",
        })
        assert allowed.status in (302, 303), ("restored reply", allowed.status, allowed.text()[:200])
        assert replies(topic_id) == count + 2
        record("stale-admin-409-revalidates-with-no-replay-and-replies-restore")
        public_response = subject.goto(base + topic_path, wait_until="networkidle")
        assert public_response and public_response.status == 200, (
            topic_path, getattr(public_response, "status", None)
        )
        expect(form_for(subject, "reply")).to_be_visible()
        assert sql("select is_closed,closure_version from forum_topics where id=$1",
                   [topic_id]) == [{"is_closed": False, "closure_version": 2}]
        record("ap11-reopened-and-all-reply-measures-lifted-composer-restored")


        # AP-11: direct private admin surfaces admit only authorized sessions.
        for private_path in (
            "/en/admin/users/" + quote(other_id, safe=""),
            "/en/admin/forum/topics/" + quote(topic_id, safe=""),
        ):
            denied_guest = document(guest, private_path, 401)
            denied_member = document(other, private_path, 403)
            assert "no-store" in denied_guest.headers.get("cache-control", "")
            assert "no-store" in denied_member.headers.get("cache-control", "")
            assert "AP10 acceptance topic" not in denied_member.text(), private_path
            assert "AP10 acceptance topic" not in denied_guest.text(), private_path
        record("ap11-users-topic-guest-and-member-private-denials")

        # Real browser reflow, current translated strings and keyboard operability.
        for locale, direction in (("en", "ltr"), ("ru", "ltr"), ("he", "rtl")):
            for width in (320, 768, 1280):
                subject.set_viewport_size({"width": width, "height": 900})
                manager.set_viewport_size({"width": width, "height": 900})
                for page, path, name in (
                    (subject, "/" + locale + "/account/measures", "own-list"),
                    (subject, "/" + locale + "/account/measures/" + first_id, "own-detail"),
                    (manager, "/" + locale + "/admin/measures/" + first_id, "admin-detail"),
                    (manager, "/" + locale + "/admin/users/" + quote(other_id, safe=""), "users-detail"),
                    (manager, "/" + locale + "/admin/forum/topics/" + quote(topic_id, safe=""), "admin-topic"),
                ):
                    document(page, path)
                    assert page.locator("html").get_attribute("dir") == direction
                    assert page.locator("html").get_attribute("lang") == locale
                    if name == "users-detail":
                        heading = {
                            "en": "User details",
                            "ru": "Информация о пользователе",
                            "he": "פרטי משתמש",
                        }[locale]
                        expect(page.locator("#admin-user-detail-heading")).to_have_text(heading)
                        expect(page.locator("#authorization")).to_have_count(1)
                        expect(page.locator("#authorization form.admin-role-assignment")).to_have_count(1)
                        expect(page.locator('.admin-forum-trail a[href="/' +
                            locale + '/admin/users"]')).to_have_count(1)
                        assert other_id in page.locator(".profile-identity").inner_text()
                        # Public identity is permitted, email and global authz directory are not.
                        assert prefix + "-other@test.invalid" not in page.content()
                    if name == "admin-topic":
                        expect(page.locator("#admin-topic-heading h2")).to_have_text("AP10 acceptance topic")
                        expect(page.locator(".admin-forum-trail")).to_have_count(1)
                        expect(page.locator(".admin-topic-status")).to_have_count(1)
                        expect(page.locator('a[href="/' + locale + '/topics/' +
                            quote(topic_id, safe="") + '"]')).to_have_count(1)
                        tools = page.locator("details.topic-admin-tools")
                        expect(tools).to_have_count(1)
                        tools.locator("summary").focus()
                        assert tools.locator("summary").evaluate(
                            "node => node === document.activeElement")
                        tools.locator("summary").click()
                        close_form = form_for(page, "closeTopic")
                        expect(close_form.locator('button[type="submit"]')).to_have_text({
                            "en": "Close topic",
                            "ru": "Закрыть тему",
                            "he": "סגירת נושא",
                        }[locale])
                        expect(close_form.locator('button[type="submit"]')).to_be_enabled()
                    if name in ("own-list", "own-detail"):
                        titles = {
                            "en": ("My measures", "Measure details"),
                            "ru": ("Мои ограничения", "Сведения о мере"),
                            "he": ("ההגבלות שלי", "פרטי ההגבלה"),
                        }
                        expected_title = titles[locale][0 if name == "own-list" else 1] + " · Vico Forum"
                        assert page.title() == expected_title, (name, locale, page.title())

                    layout = page.evaluate("""() => {
                        const width = innerWidth;
                        return {
                          width, scrollWidth: document.documentElement.scrollWidth,
                          overflow: Array.from(document.querySelectorAll("body *"))
                            .map(el => {
                              const box = el.getBoundingClientRect();
                              return {
                                tag: el.tagName.toLowerCase(), className: typeof el.className === "string"
                                  ? el.className.slice(0, 120) : "",
                                right: +box.right.toFixed(1), left: +box.left.toFixed(1),
                                width: +box.width.toFixed(1), scroll: el.scrollWidth,
                                text: (el.textContent || "").trim().slice(0, 80),
                              };
                            })
                            .filter(el => el.right > width + 0.5 || el.left < -0.5)
                            .slice(0, 30),
                        };
                    }""")
                    if layout["scrollWidth"] > width + 1:
                        print("BROWSER_LAYOUT_OVERFLOW " + json.dumps({
                            "surface": name, "locale": locale, **layout,
                        }, ensure_ascii=False), flush=True)
                        page.screenshot(path=str(args.output / (
                            "overflow-" + name + "-" + locale + "-" + str(width) + ".png"
                        )), full_page=True)
                        layout_failures.append({
                            "surface": name, "locale": locale, **layout,
                        })
                    assert "measuresRefresh" not in page.locator("main").inner_text()
                    if name in ("users-detail", "admin-topic"):
                        # No measure-refresh UI is required on the newly checked admin pages.
                        if width in (320, 1280):
                            page.screenshot(path=str(args.output / (
                                name + "-" + locale + "-" + str(width) + ".png"
                            )), full_page=True)
                        continue
                    refresh = page.get_by_role("button", name={
                        "en": "Refresh current status",
                        "ru": "Обновить состояние",
                        "he": "רענון מצב נוכחי",
                    }[locale])
                    expect(refresh).to_be_enabled()
                    refresh.focus()
                    assert refresh.evaluate("element => element === document.activeElement")
                    if width in (320, 1280):
                        page.screenshot(
                            path=str(args.output / (name + "-" + locale + "-" + str(width) + ".png")),
                            full_page=True,
                        )
                record("localized-reflow-" + locale + "-" + str(width))
        record("ap11-users-topic-en-ru-he-320-768-1280-layout-and-privacy")
        assert not layout_failures, layout_failures
        assert not page_errors, page_errors
        assert not external, external
        stale.close()
        manager_ctx.close()
        subject_ctx.close()
        other_ctx.close()
        guest.close()
        browser.close()
finally:
    (args.output / "results.json").write_text(json.dumps({
        "implementationHead": os.environ.get("IMPLEMENTATION_SHA"),
        "cases": records, "layoutFailures": layout_failures,
        "pageErrors": page_errors, "externalRequests": external,
    }, ensure_ascii=False, indent=2))
