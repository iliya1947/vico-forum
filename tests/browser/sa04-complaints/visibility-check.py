"""B8-C1: real Worker / Better Auth / PostgreSQL / Chromium visibility UI."""
import argparse
import json
import os
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
assert urlparse(base).hostname in ("localhost", "127.0.0.1")
assert database.hostname in ("localhost", "127.0.0.1")
assert database.path == "/vico_sa04_n_browser_test"
repo = Path(__file__).resolve().parents[3]
node = shutil.which("node")
assert node
args.output.mkdir(parents=True, exist_ok=True)
prefix = "b8-c1-" + uuid4().hex[:12]
records, page_errors, external = [], [], []
labels = {}


def sql(query, params=None):
    code = """import pg from 'pg';
const input=JSON.parse(await new Promise(resolve=>{let s='';
process.stdin.on('data',part=>s+=part);
process.stdin.on('end',()=>resolve(s));}));
const c=new pg.Client({connectionString:process.env.DATABASE_URL});
await c.connect();
try{console.log(JSON.stringify((await c.query(input.query,input.params)).rows??[]));}
finally{await c.end();}"""
    result = subprocess.run([node, "--input-type=module", "-e", code],
        cwd=repo, input=json.dumps({"query": query, "params": params or []}),
        text=True, capture_output=True, check=True, timeout=30)
    return json.loads(result.stdout)


def record(case, **details):
    records.append({"case": case, **details})
    print("B8_C1_CHROMIUM " + json.dumps(records[-1], ensure_ascii=False), flush=True)


def seed(author_id, locale, kind):
    topic_id = prefix + "-" + locale + "-" + kind
    first_id, reply_id = topic_id + "-first", topic_id + "-reply"
    title = "B8 C1 visible title " + topic_id
    first = "B8 C1 visible first body " + topic_id
    reply = "B8 C1 visible reply body " + topic_id
    sql("""with topic as (
        insert into forum_topics(id,section_id,author_id,current_title_revision_id)
        values($1,'help-solutions-questions',$2,$1||'-title') returning id)
        insert into forum_topic_title_revisions(id,topic_id,author_id,original_content,source_locale)
        select id||'-title',id,$2,$3,'en' from topic""",
        [topic_id, author_id, title])
    for post_id, body, parent in [(first_id, first, None), (reply_id, reply, first_id)]:
        sql("""with post as (
            insert into forum_posts(id,topic_id,author_id,current_revision_id,parent_post_id)
            values($1,$2,$3,$1||'-body',$4) returning id)
            insert into forum_post_revisions(id,post_id,author_id,original_content,source_locale)
            select id||'-body',id,$2,$5,'en' from post""",
            [post_id, topic_id, author_id, parent, body])
    return {"topic": topic_id, "post": reply_id, "title": title, "reply": reply}


def is_hidden(table, identifier):
    result = sql("select is_hidden,visibility_version from " + table + " where id=$1", [identifier])
    assert len(result) == 1, (table, identifier, result)
    return result[0]


def assert_locale(page, locale, narrow):
    assert page.locator("html").get_attribute("lang") == locale
    assert page.locator("html").get_attribute("dir") == ("rtl" if locale == "he" else "ltr")
    if narrow:
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), (
            "horizontal overflow", page.url)


def keyboard_submit(page, form, reason):
    field = form.locator("textarea[name='reason']")
    expect(field).to_be_visible()
    field.fill(reason)
    field.focus()
    page.keyboard.press("Tab")
    button = form.locator("button[type='submit']")
    expect(button).to_be_focused()
    with page.expect_response(lambda response: response.request.method == "POST"
            and "visibilityAction=1" in response.url, timeout=20000) as response:
        page.keyboard.press("Enter")
    assert response.value.status == 200, (
        response.value.status, response.value.text()[:300])


try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            channel=os.environ.get("PLAYWRIGHT_CHANNEL", "chrome"),
            headless=True, args=["--no-sandbox"])
        contexts = []

        def context(width):
            ctx = browser.new_context(viewport={"width": width, "height": 850},
                service_workers="block")
            contexts.append(ctx)
            ctx.route("**/*", lambda route: route.continue_()
                if route.request.url.startswith(base + "/")
                else (external.append(route.request.url), route.abort())[-1])
            return ctx

        def signup(ctx, label):
            response = ctx.request.post(base + "/api/auth/sign-up/email",
                headers={"Origin": base}, data={
                    "name": "B8 C1 " + label,
                    "email": prefix + "-" + label + "@test.invalid",
                    "password": "b8-c1-test-password-123456789"})
            assert response.status == 200, (label, response.status, response.text()[:200])
            return response.json()["user"]["id"]

        mod = context(1280)
        guest = context(1280)
        author = context(1280)
        mod_id = signup(mod, "moderator")
        author_id = signup(author, "author")
        sql("insert into authz_user_roles(user_id,role_id) values($1,'builtin-admin') "
            "on conflict do nothing", [mod_id])
        sql("insert into authz_user_roles(user_id,role_id) values($1,'builtin-user') "
            "on conflict do nothing", [author_id])
        sql("""insert into authz_user_permission_overrides(user_id,permission_key,effect)
            values($1,'forum.content.visibility.manage','allow')""", [mod_id])
        page = mod.new_page()
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        public = guest.new_page()
        public.on("pageerror", lambda error: page_errors.append(str(error)))

        for locale, kind in (("en", "topic"), ("en", "post"),
                             ("ru", "post"), ("he", "topic")):
            narrow = locale == "he"
            page.set_viewport_size({"width": 360 if narrow else 1280, "height": 850})
            item = seed(author_id, locale, kind)
            url = "/" + locale + "/topics/" + item["topic"]
            target_id = item["topic"] if kind == "topic" else item["post"]
            target_table = "forum_topics" if kind == "topic" else "forum_posts"
            source = item["title"] if kind == "topic" else item["reply"]
            response = page.goto(base + url, wait_until="networkidle")
            assert response.status == 200, (url, response.status)
            assert_locale(page, locale, narrow)
            assert source in page.locator("body").inner_text()
            assert is_hidden(target_table, target_id)["is_hidden"] is False

            if kind == "topic":
                details = page.locator(".topic-breadcrumb-actions .topic-admin-tools")
            else:
                details = page.locator("#post-" + target_id + " .message-admin-tools")
            expect(details).to_have_count(1)
            summary = details.locator("summary")
            summary.focus()
            expect(summary).to_be_focused()
            page.keyboard.press("Enter")
            expect(details).to_have_attribute("open", "")
            hide = details.locator("form.visibility-hide-form")
            expect(hide).to_have_count(1)
            label = hide.locator("button[type='submit']").inner_text().strip()
            assert label, ("untranslated Hide control", locale, kind)
            labels[(locale, kind)] = label
            reason = "B8-C1 private Hide reason " + locale + " " + kind
            keyboard_submit(page, hide, reason)
            assert is_hidden(target_table, target_id)["is_hidden"] is True

            # A new public document snapshot must not expose the hidden title or body.
            public_response = public.goto(base + url, wait_until="networkidle")
            assert public_response.status == (404 if kind == "topic" else 200)
            assert source not in public.locator("body").inner_text(), ("public source leaked", url)
            assert reason not in public.locator("body").inner_text()
            if kind == "post":
                expect(public.locator("#post-" + target_id + "[data-moderation-hidden-post]")).to_have_count(1)
                assert item["title"] in public.locator("body").inner_text()

            queue = "/" + locale + "/admin/forum/content?kind=" + kind
            queue_response = page.goto(base + queue, wait_until="networkidle")
            assert queue_response.status == 200, (queue, queue_response.status)
            assert_locale(page, locale, narrow)
            link = page.locator(".admin-forum-objects a").filter(has_text=target_id)
            expect(link).to_have_count(1)
            link.focus()
            expect(link).to_be_focused()
            page.keyboard.press("Enter")
            expect(page).to_have_url(__import__("re").compile(
                r"/" + locale + r"/admin/forum/topics/" + item["topic"] + r"/inspect"))
            assert_locale(page, locale, narrow)
            expect(page.locator("h2#admin-hidden-inspector-heading")).to_be_visible()
            assert reason in page.locator("body").inner_text()
            restore = page.locator("form.visibility-restore-form")
            expect(restore).to_have_count(1)
            restore_label = restore.locator("button[type='submit']").inner_text().strip()
            assert restore_label
            labels[(locale, kind, "restore")] = restore_label
            keyboard_submit(page, restore, "B8-C1 restore " + locale + " " + kind)
            assert is_hidden(target_table, target_id)["is_hidden"] is False

            restored = public.goto(base + url, wait_until="networkidle")
            assert restored.status == 200, (url, restored.status)
            assert source in public.locator("body").inner_text()
            assert reason not in public.locator("body").inner_text()
            if narrow:
                page.screenshot(path=str(args.output / "visibility-he-narrow.png"), full_page=True)
            record("real-ui-hide-queue-inspector-restore", locale=locale, kind=kind,
                mobile_rtl=narrow, keyboard=True, public_suppressed=True)

        # Compare same-action localized labels rather than assuming any text
        # literal or translating the original user-generated content.
        assert labels[("en", "topic")] != labels[("he", "topic")], labels
        assert labels[("en", "post")] != labels[("ru", "post")], labels
        assert labels[("en", "topic", "restore")] != labels[("he", "topic", "restore")], labels
        assert labels[("en", "post", "restore")] != labels[("ru", "post", "restore")], labels
        assert not external, external
        assert not page_errors, page_errors
        record("localized-controls-and-real-browser-no-errors")
        for ctx in contexts:
            ctx.close()
        browser.close()
finally:
    (args.output / "results-visibility.json").write_text(json.dumps({
        "cases": records, "pageErrors": page_errors, "external": external,
        "labels": {str(key): value for key, value in labels.items()},
    }, ensure_ascii=False, indent=2))
