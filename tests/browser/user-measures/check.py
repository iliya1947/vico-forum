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
records, page_errors, external = [], [], []


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


def create_measure(page, target_id, restrictions, explanation):
    document(page, "/en/admin/measures?target=" + quote(target_id, safe=""))
    form = form_for(page, "create")
    measure_id = form.locator('input[name="measureId"]').input_value()
    form.locator('textarea[name="reason"]').fill(explanation)
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
        browser = playwright.chromium.launch(headless=True, args=["--no-sandbox"])
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
        for permission in ("admin.users.blocks.manage", "admin.users.blocks.managePrivileged"):
            sql("insert into authz_user_permission_overrides(user_id,permission_key,effect) values($1,$2,'allow')",
                [manager_id, permission])

        topic_id = topic_fixture(other_id)
        first_id = create_measure(
            manager, subject_id,
            ("replies.create", "admin.forum", "admin.complaints",
             "admin.security", "admin.usersAccess"),
            "First distinct violation",
        )
        second_id = create_measure(
            manager, subject_id, ("replies.create",), "Second distinct violation",
        )
        assert first_id != second_id
        record("manager-two-independent-measures", first=first_id, second=second_id)

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
        appeal.locator('textarea[name="body"]').fill("Please review my first measure")
        appeal.locator('button[type="submit"]').click()
        expect(subject.locator('input[name="intent"][value="appeal"]')).to_have_count(0)
        assert "Pending" in subject.locator("main").inner_text()
        record("private-status-and-independent-appeal")

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

        document(manager, "/en/admin/measures/" + first_id)
        review = form_for(manager, "review")
        review.locator('select[name="outcome"]').select_option("accepted")
        review.locator('select[name="remedy"]').select_option("lift")
        review.locator('textarea[name="explanation"]').fill("Appeal accepted, first measure lifted")
        review.locator('button[type="submit"]').click()
        expect(manager.locator('input[name="intent"][value="review"]')).to_have_count(0)
        assert "Lifted" in manager.locator("main").inner_text()
        document(subject, own_path)
        assert "Lifted" in subject.locator("main").inner_text()
        assert "Accepted" in subject.locator("main").inner_text()
        for path in forbidden:
            document(subject, path)
        response = post(subject_ctx, "/en/topics/" + topic_id, {
            "intent": "reply", "body": "Second measure still blocks",
        })
        assert response.status == 403 and replies(topic_id) == count + 1
        record("appeal-lifts-only-first-measure-and-restores-admin")

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

        # Real browser reflow, current translated strings and keyboard operability.
        for locale, direction in (("en", "ltr"), ("ru", "ltr"), ("he", "rtl")):
            for width in (320, 768, 1280):
                subject.set_viewport_size({"width": width, "height": 900})
                manager.set_viewport_size({"width": width, "height": 900})
                for page, path, name in (
                    (subject, "/" + locale + "/account/measures", "own-list"),
                    (subject, "/" + locale + "/account/measures/" + first_id, "own-detail"),
                    (manager, "/" + locale + "/admin/measures/" + first_id, "admin-detail"),
                ):
                    document(page, path)
                    assert page.locator("html").get_attribute("dir") == direction
                    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), (
                        name, locale, width, page.evaluate("document.documentElement.scrollWidth")
                    )
                    assert "measuresRefresh" not in page.locator("main").inner_text()
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
        "cases": records, "pageErrors": page_errors, "externalRequests": external,
    }, ensure_ascii=False, indent=2))
