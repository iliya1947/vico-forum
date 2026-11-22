"""B8-C2 actual Chromium visibility lifecycle, Better Auth and PostgreSQL."""
import argparse
import json
import os
import re
import shutil
import subprocess
from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4

from playwright.sync_api import expect, sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument("--url", default="http://127.0.0.1:4224")
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
base = args.url.rstrip("/")
database = urlparse(os.environ.get("DATABASE_URL", ""))
assert os.environ.get("CI") == "true"
assert urlparse(base).hostname in ("127.0.0.1", "localhost")
assert database.hostname in ("127.0.0.1", "localhost")
assert database.path == "/vico_sa04_n_browser_test"
repo = Path(__file__).resolve().parents[3]
node = shutil.which("node")
assert node
args.output.mkdir(parents=True, exist_ok=True)
prefix = "b8-c2-" + uuid4().hex[:12]
password = "b8-c2-local-test-password-12345"
records, page_errors, external = [], [], []


def sql(statement, params=None):
    code = """import pg from 'pg';
const input=JSON.parse(await new Promise(resolve=>{let s='';
process.stdin.on('data',part=>s+=part);
process.stdin.on('end',()=>resolve(s));}));
const c=new pg.Client({connectionString:process.env.DATABASE_URL});
await c.connect();
try{console.log(JSON.stringify((await c.query(input.query,input.params)).rows??[]));}
finally{await c.end();}"""
    result = subprocess.run([node, "--input-type=module", "-e", code],
        cwd=repo, input=json.dumps({"query": statement, "params": params or []}),
        text=True, capture_output=True, check=True, timeout=30)
    return json.loads(result.stdout)


def lock_topic(topic_id):
    code = """import pg from 'pg';
const c=new pg.Client({connectionString:process.env.DATABASE_URL});
await c.connect();await c.query('begin');
try {
 await c.query('select id from forum_topics where id=$1 for no key update',[process.argv[1]]);
 console.log('LOCKED');
 process.stdin.once('data',async()=>{try{await c.query('commit');}finally{await c.end();}});
} catch(error){console.error(error);await c.end();process.exitCode=1;}"""
    child = subprocess.Popen([node, "--input-type=module", "-e", code, topic_id],
        cwd=repo, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, bufsize=1)
    assert child.stdout.readline().strip() == "LOCKED", "Cannot obtain PostgreSQL topic lock"
    return child


def unlock(child):
    if child.poll() is None:
        child.stdin.write("\n")
        child.stdin.flush()
    _, stderr = child.communicate(timeout=20)
    assert child.returncode == 0, stderr


def record(case, **details):
    entry = {"case": case, **details}
    records.append(entry)
    print("B8_C2_CHROMIUM " + json.dumps(entry, ensure_ascii=False), flush=True)


def seed(author_id, key):
    topic = prefix + "-" + key
    post = topic + "-reply"
    title = "B8 C2 public title " + topic
    body = "B8 C2 public body " + topic
    sql("""with topic as (
      insert into forum_topics(id,section_id,author_id,current_title_revision_id)
      values($1,'help-solutions-questions',$2,$1||'-title') returning id)
      insert into forum_topic_title_revisions(id,topic_id,author_id,original_content,source_locale)
      select id||'-title',id,$2,$3,'en' from topic""", [topic, author_id, title])
    sql("""with post as (
      insert into forum_posts(id,topic_id,author_id,current_revision_id)
      values($1,$2,$3,$1||'-body') returning id)
      insert into forum_post_revisions(id,post_id,author_id,original_content,source_locale)
      select id||'-body',id,$3,$4,'en' from post""",
        [post, topic, author_id, body])
    return {"topic": topic, "post": post, "title": title, "body": body}


def state(table, identifier):
    rows = sql("select is_hidden,visibility_version from " + table + " where id=$1", [identifier])
    assert len(rows) == 1, rows
    return rows[0]


def events(identifier, action):
    return sql("select count(*)::int as count from admin_history where target_id=$1 and action=$2",
        [identifier, action])[0]["count"]


def visible_page(page, topic):
    response = page.goto(base + "/en/topics/" + topic, wait_until="networkidle")
    assert response.status == 200, (response.status, topic)
    return page


def hide_form(page, item, kind):
    details = page.locator(".topic-breadcrumb-actions .topic-admin-tools") if kind == "topic" \
        else page.locator("#post-" + item["post"] + " .message-admin-tools")
    expect(details).to_have_count(1)
    details.locator("summary").click()
    expect(details).to_have_attribute("open", "")
    form = details.locator("form.visibility-hide-form")
    expect(form).to_have_count(1)
    return form


def submit(page, form, reason, expected=200):
    form.locator("textarea[name='reason']").fill(reason)
    with page.expect_response(lambda response: response.request.method == "POST"
        and "visibilityAction=1" in response.url, timeout=25000) as outcome:
        form.locator("button[type='submit']").click()
    assert outcome.value.status == expected, (
        expected, outcome.value.status, outcome.value.text()[:300])


def inspector(page, item, kind):
    url = "/en/admin/forum/topics/" + item["topic"] + "/inspect"
    if kind == "post":
        url += "?postId=" + item["post"]
    response = page.goto(base + url, wait_until="networkidle")
    assert response.status == 200, (url, response.status)
    form = page.locator("form.visibility-restore-form")
    expect(form).to_have_count(1)
    return form


def request_is_visibility(request):
    return request.method == "POST" and "visibilityAction=1" in request.url


try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            channel=os.environ.get("PLAYWRIGHT_CHANNEL", "chrome"),
            headless=True, args=["--no-sandbox"])
        contexts = []

        def context():
            ctx = browser.new_context(viewport={"width": 1280, "height": 850},
                service_workers="block")
            contexts.append(ctx)
            ctx.route("**/*", lambda route: route.continue_()
                if route.request.url.startswith(base + "/")
                else (external.append(route.request.url), route.abort())[-1])
            return ctx

        def signup(ctx, role):
            email = prefix + "-" + role + "@test.invalid"
            response = ctx.request.post(base + "/api/auth/sign-up/email",
                headers={"Origin": base},
                data={"name": "B8 C2 " + role, "email": email, "password": password})
            assert response.status == 200, (role, response.status, response.text()[:180])
            return response.json()["user"]["id"], email

        manager, author = context(), context()
        manager_id, _ = signup(manager, "manager")
        author_id, author_email = signup(author, "author")
        sql("insert into authz_user_roles(user_id,role_id) values($1,'builtin-admin') "
            "on conflict do nothing", [manager_id])
        sql("insert into authz_user_roles(user_id,role_id) values($1,'builtin-user') "
            "on conflict do nothing", [author_id])
        for permission in ("forum.content.visibility.manage", "forum.reply.create"):
            sql("""insert into authz_user_permission_overrides(user_id,permission_key,effect)
              values($1,$2,'allow')""", [manager_id, permission])

        def new_page(ctx=manager):
            page = ctx.new_page()
            page.on("pageerror", lambda error: page_errors.append(str(error)))
            return page

        # 1. One real in-flight post Hide is blocked by PostgreSQL, not by a
        # mocked callback. Same-form retries and unrelated editor data stay inert.
        pending = seed(author_id, "pending")
        pending_page = new_page()
        visible_page(pending_page, pending["topic"])
        draft_text = "B8 C2 unsent reply buffer"
        draft = pending_page.locator("form.topic-reply-form textarea#reply-body")
        expect(draft).to_be_visible()
        draft.fill(draft_text)
        form = hide_form(pending_page, pending, "post")
        submitted = []
        pending_page.on("request", lambda req: submitted.append(req.post_data or "")
            if request_is_visibility(req) else None)
        lock = lock_topic(pending["topic"])
        try:
            form.locator("textarea[name='reason']").fill("Pending hide")
            form.locator("button[type='submit']").click()
            expect(form).to_have_attribute("aria-busy", "true")
            expect(form.locator("button[type='submit']")).to_be_disabled()
            expect(pending_page.locator(".visibility-pending")).to_be_visible()
            assert draft.input_value() == draft_text
            pending_page.locator("form.visibility-hide-form").evaluate("(form)=>form.requestSubmit()")
            assert len(submitted) == 1, submitted
            assert events(pending["post"], "post.hidden") == 0
        finally:
            unlock(lock)
        expect(pending_page.locator("#post-" + pending["post"] +
            "[data-moderation-hidden-post]")).to_have_count(1, timeout=20000)
        assert draft.input_value() == draft_text
        assert state("forum_posts", pending["post"])["is_hidden"] is True
        assert events(pending["post"], "post.hidden") == 1
        assert len(submitted) == 1
        assert sql("select count(*)::int as n from forum_posts where topic_id=$1",
            [pending["topic"]])[0]["n"] == 1
        record("pending-post-hide-one-command-retained-reply-buffer")

        # 2. Real second Chromium tab wins the CAS. The old Hide form gets 409,
        # waits for an explicit reload and never resubmits its original intent.
        stale = seed(author_id, "stale")
        old_page, winning_page = new_page(), new_page()
        visible_page(old_page, stale["topic"])
        old_form = hide_form(old_page, stale, "post")
        visible_page(winning_page, stale["topic"])
        submit(winning_page, hide_form(winning_page, stale, "post"), "Winning Hide")
        assert state("forum_posts", stale["post"])["is_hidden"] is True
        old_requests = []
        old_page.on("request", lambda req: old_requests.append(req.post_data or "")
            if request_is_visibility(req) else None)
        submit(old_page, old_form, "Stale Hide must fail", expected=409)
        expect(old_page.locator(".visibility-conflict")).to_be_visible()
        expect(old_form.locator("button[type='submit']")).to_be_disabled()
        assert old_form.locator("textarea[name='reason']").input_value() == "Stale Hide must fail"
        old_form.evaluate("(form)=>form.requestSubmit()")
        assert len(old_requests) == 1
        old_page.locator(".visibility-conflict button").click()
        expect(old_page.locator("#post-" + stale["post"] +
            "[data-moderation-hidden-post]")).to_have_count(1)
        assert len(old_requests) == 1
        assert events(stale["post"], "post.hidden") == 1
        record("stale-post-hide-409-explicit-refresh")

        # The same stale-version rule also applies on the protected Restore UI.
        restore_stale, restore_winner = new_page(), new_page()
        old_restore = inspector(restore_stale, stale, "post")
        winning_restore = inspector(restore_winner, stale, "post")
        submit(restore_winner, winning_restore, "Winning Restore")
        assert state("forum_posts", stale["post"])["is_hidden"] is False
        submit(restore_stale, old_restore, "Stale Restore", expected=409)
        expect(restore_stale.locator(".visibility-conflict")).to_be_visible()
        expect(old_restore.locator("button[type='submit']")).to_be_disabled()
        restore_stale.locator(".visibility-conflict button").click()
        expect(restore_stale.locator("form.visibility-restore-form")).to_have_count(0)
        assert events(stale["post"], "post.restored") == 1
        record("stale-protected-restore-409-explicit-refresh")

        # 3. The Worker commits a real Hide but its response is lost in Chromium.
        # No success is fabricated and only explicit user verification follows.
        unknown = seed(author_id, "unknown")
        unknown_page = new_page()
        visible_page(unknown_page, unknown["topic"])
        unknown_form = hide_form(unknown_page, unknown, "post")
        upstream = []
        actions = []
        unknown_page.on("request", lambda req: actions.append(req.post_data or "")
            if request_is_visibility(req) else None)

        def lose_after_commit(route):
            if request_is_visibility(route.request):
                response = route.fetch(timeout=25000)
                upstream.append(response.status)
                route.abort("failed")
            else:
                route.continue_()

        unknown_page.route("**/*", lose_after_commit)
        unknown_form.locator("textarea[name='reason']").fill("Commit may be hidden")
        unknown_form.locator("button[type='submit']").click()
        expect(unknown_page.locator(".visibility-unconfirmed")).to_be_visible(timeout=20000)
        expect(unknown_form.locator("button[type='submit']")).to_be_disabled()
        assert upstream == [200], upstream
        assert state("forum_posts", unknown["post"])["is_hidden"] is True
        unknown_form.evaluate("(form)=>form.requestSubmit()")
        assert len(actions) == 1
        unknown_page.locator(".visibility-unconfirmed button").click()
        expect(unknown_page.locator("#post-" + unknown["post"] +
            "[data-moderation-hidden-post]")).to_have_count(1)
        assert len(actions) == 1
        assert events(unknown["post"], "post.hidden") == 1
        unknown_page.unroute("**/*", lose_after_commit)
        record("unknown-after-committed-post-hide-no-replay")

        # 4. Revoke the already-loaded private Restore capability. Real Worker
        # 403 and automatic guarded re-read must discard the old private reason.
        revoked = seed(author_id, "revoked")
        rev_page = new_page()
        visible_page(rev_page, revoked["topic"])
        submit(rev_page, hide_form(rev_page, revoked, "post"), "Private reason must vanish")
        restore = inspector(rev_page, revoked, "post")
        assert "Private reason must vanish" in rev_page.locator("body").inner_text()
        sql("""update authz_user_permission_overrides set effect='deny'
            where user_id=$1 and permission_key='forum.content.visibility.manage'""",
            [manager_id])
        revoke_posts = []
        rev_page.on("request", lambda req: revoke_posts.append(req.post_data or "")
            if request_is_visibility(req) else None)
        submit(rev_page, restore, "Revoked Restore rejected", expected=403)
        expect(rev_page.locator("form.visibility-restore-form")).to_have_count(0)
        assert "Private reason must vanish" not in rev_page.locator("body").inner_text()
        assert state("forum_posts", revoked["post"])["is_hidden"] is True
        assert events(revoked["post"], "post.restored") == 0
        assert len(revoke_posts) == 1
        sql("""update authz_user_permission_overrides set effect='allow'
            where user_id=$1 and permission_key='forum.content.visibility.manage'""",
            [manager_id])
        record("revoked-private-restore-403-no-replay-or-source")

        # 5. In-flight Hide may finish after a real Better Auth sign-out.
        # The old moderator's form must not be trusted by the signed-out view.
        late = seed(author_id, "late-account")
        late_page = new_page()
        visible_page(late_page, late["topic"])
        late_form = hide_form(late_page, late, "post")
        late_requests = []
        late_page.on("request", lambda req: late_requests.append(req.post_data or "")
            if request_is_visibility(req) else None)
        hold = lock_topic(late["topic"])
        try:
            late_form.locator("textarea[name='reason']").fill("Old actor late Hide")
            late_form.locator("button[type='submit']").click()
            expect(late_page.locator(".visibility-pending")).to_be_visible()
            late_page.locator(".auth-sign-out").click()
            expect(late_page.locator(".auth-controls[data-state='guest']")).to_be_visible()
            expect(late_page.locator("form.visibility-hide-form")).to_have_count(0)
        finally:
            unlock(hold)
        assert len(late_requests) == 1, late_requests
        late_page.goto(base + "/en/sign-in", wait_until="networkidle")
        credentials = late_page.locator("form.credential-form")
        expect(credentials).to_be_visible()
        credentials.locator("input[name='email']").fill(author_email)
        credentials.locator("input[name='password']").fill(password)
        credentials.locator("button[type='submit']").click()
        expect(late_page.locator(".auth-user")).to_contain_text("B8 C2 author", timeout=20000)
        late_page.goto(base + "/en/topics/" + late["topic"], wait_until="networkidle")
        expect(late_page.locator("form.visibility-hide-form")).to_have_count(0)
        assert "Old actor late Hide" not in late_page.locator("body").inner_text()
        if state("forum_posts", late["post"])["is_hidden"]:
            assert late["body"] not in late_page.locator("body").inner_text()
        assert events(late["post"], "post.hidden") <= 1
        assert len(late_requests) == 1
        record("late-action-sign-out-new-better-auth-actor-no-private-reuse")

        assert not external, external
        assert not page_errors, page_errors
        record("connected-lifecycle-complete")
        for ctx in contexts:
            ctx.close()
        browser.close()
finally:
    (args.output / "results-visibility-lifecycle.json").write_text(json.dumps({
        "cases": records, "pageErrors": page_errors, "external": external,
    }, ensure_ascii=False, indent=2))
