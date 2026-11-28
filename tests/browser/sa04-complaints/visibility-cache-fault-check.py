"""B8-C3: cache/fault/completeness in actual Chromium and disposable Worker/PG17."""
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
import sys
from pathlib import Path as FixturePath
sys.path.insert(0, str(FixturePath(__file__).resolve().parents[1]))
from verified_fixture import signup_verified_session

parser = argparse.ArgumentParser()
parser.add_argument("--url", default="http://127.0.0.1:4224")
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
base = args.url.rstrip("/")
db = urlparse(os.environ.get("DATABASE_URL", ""))
assert os.environ.get("CI") == "true"
assert urlparse(base).hostname in ("localhost", "127.0.0.1")
assert db.hostname in ("localhost", "127.0.0.1")
assert db.path == "/vico_sa04_n_browser_test"
repo = Path(__file__).resolve().parents[3]
node = shutil.which("node")
assert node
args.output.mkdir(parents=True, exist_ok=True)
prefix = "b8-c3-" + uuid4().hex[:12]
records, errors, external = [], [], []


def sql(query, params=None):
    code = """import pg from 'pg';
const input=JSON.parse(await new Promise(resolve=>{let s='';
process.stdin.on('data',part=>s+=part);
process.stdin.on('end',()=>resolve(s));}));
const c=new pg.Client({connectionString:process.env.DATABASE_URL});
await c.connect();
try { console.log(JSON.stringify((await c.query(input.query,input.params)).rows??[])); }
finally { await c.end(); }"""
    process = subprocess.run([node, "--input-type=module", "-e", code],
        cwd=repo, input=json.dumps({"query": query, "params": params or []}),
        text=True, capture_output=True, check=True, timeout=30)
    return json.loads(process.stdout)


def hold_topics():
    code = """import pg from 'pg';
const c=new pg.Client({connectionString:process.env.DATABASE_URL});
await c.connect();await c.query('begin');
try {
 await c.query('lock table forum_topics in access exclusive mode');
 console.log('LOCKED');
 process.stdin.once('data',async()=>{try{await c.query('rollback');}finally{await c.end();}});
} catch(error) { console.error(error);await c.end();process.exitCode=1; }"""
    child = subprocess.Popen([node, "--input-type=module", "-e", code],
        cwd=repo, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, bufsize=1)
    assert child.stdout.readline().strip() == "LOCKED", "Cannot obtain PostgreSQL read barrier"
    return child


def unlock(child):
    if child.poll() is None:
        child.stdin.write("\n")
        child.stdin.flush()
    _, error = child.communicate(timeout=20)
    assert child.returncode == 0, error


def record(name, **details):
    entry = {"case": name, **details}
    records.append(entry)
    print("B8_C3_CHROMIUM " + json.dumps(entry, ensure_ascii=False), flush=True)


def seed(author_id, key):
    topic = prefix + "-" + key
    post = topic + "-post"
    title = "B8 C3 source title " + topic
    body = "B8 C3 source body " + topic
    sql("""with topic as (
      insert into forum_topics(id,section_id,author_id,current_title_revision_id)
      values($1,'help-solutions-questions',$2,$1||'-title') returning id)
      insert into forum_topic_title_revisions(id,topic_id,author_id,original_content,source_locale)
      select id||'-title',id,$2,$3,'en' from topic""",
      [topic, author_id, title])
    sql("""with post as (
      insert into forum_posts(id,topic_id,author_id,current_revision_id)
      values($1,$2,$3,$1||'-body') returning id)
      insert into forum_post_revisions(id,post_id,author_id,original_content,source_locale)
      select id||'-body',id,$3,$4,'en' from post""",
      [post, topic, author_id, body])
    return {"topic": topic, "post": post, "title": title, "body": body}


def visibility_state(table, item_id):
    rows = sql("select is_hidden,visibility_version from " + table + " where id=$1", [item_id])
    assert len(rows) == 1
    return rows[0]


def history_count(item_id, action):
    return sql("select count(*)::int as n from admin_history where target_id=$1 and action=$2",
        [item_id, action])[0]["n"]


def cache(response, status, private=False, forbidden=()):
    assert response.status == status, (response.url, response.status, status)
    directives = {part.strip().lower() for part in
        response.headers.get("cache-control", "").split(",")}
    assert "no-store" in directives, (response.url, directives)
    if private:
        assert "private" in directives, (response.url, directives)
    body = response.text()
    for secret in forbidden:
        assert secret not in body, (response.url, "private data exposed", secret)
    return body


def browser_document(page, path, status, private=False, forbidden=()):
    response = page.goto(base + path, wait_until="networkidle", timeout=25000)
    body = cache(response, status, private, forbidden)
    text = page.locator("body").inner_text()
    for secret in forbidden:
        assert secret not in text, (page.url, "DOM leaked private content", secret)
    return body


def hide_form(page, item, kind):
    details = page.locator(".topic-breadcrumb-actions .topic-admin-tools") if kind == "topic" \
        else page.locator("#post-" + item["post"] + " .message-admin-tools")
    details.locator("summary").click()
    expect(details).to_have_attribute("open", "")
    form = details.locator("form.visibility-hide-form")
    expect(form).to_have_count(1)
    return form


def send(page, form, reason, status=200):
    form.locator("textarea[name='reason']").fill(reason)
    with page.expect_response(lambda response: response.request.method == "POST"
            and "visibilityAction=1" in response.url, timeout=25000) as result:
        form.locator("button[type='submit']").click()
    cache(result.value, status, True)
    return result.value


def inspection(item, kind):
    path = "/en/admin/forum/topics/" + item["topic"] + "/inspect"
    return path + ("?postId=" + item["post"] if kind == "post" else "")


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

        def signup(ctx, name):
            response = signup_verified_session(sql, ctx.request, base,
                headers={"Origin": base}, data={"name": "B8 C3 " + name,
                    "email": prefix + "-" + name + "@test.invalid",
                    "password": "b8-c3-password-12345678"})
            assert response.status == 200, (name, response.status)
            return response.json()["user"]["id"]

        manager, ordinary, author, guest = context(), context(), context(), context()
        manager_id = signup(manager, "manager")
        ordinary_id = signup(ordinary, "ordinary")
        author_id = signup(author, "author")
        sql("insert into authz_user_roles(user_id,role_id) values ($1,'builtin-admin') "
            "on conflict do nothing", [manager_id])
        for user_id in (ordinary_id, author_id):
            sql("insert into authz_user_roles(user_id,role_id) values ($1,'builtin-user') "
                "on conflict do nothing", [user_id])
        sql("""insert into authz_user_permission_overrides(user_id,permission_key,effect)
             values($1,'forum.content.visibility.manage','allow')""", [manager_id])

        def page(ctx):
            current = ctx.new_page()
            current.on("pageerror", lambda error: errors.append(str(error)))
            return current

        mod_page = page(manager)
        public_page = page(guest)
        ordinary_page = page(ordinary)

        item = seed(author_id, "cache")
        topic = "/en/topics/" + item["topic"]
        topic_data = "/en/topics/" + item["topic"] + ".data"
        queue = "/en/admin/forum/content?kind=topic"
        queue_data = "/en/admin/forum/content.data?kind=topic"
        inspect = inspection(item, "topic")
        inspect_data = "/en/admin/forum/topics/" + item["topic"] + "/inspect.data"
        reason = "B8 C3 private topic reason " + prefix
        secret = [item["title"], item["body"], reason]

        # A. Browser document and same-cookie .data responses remain uncached
        # and switch from visible to neutral hidden to visible on fresh requests.
        assert item["title"] in browser_document(public_page, topic, 200)
        assert item["title"] in cache(public_page.request.get(base + topic_data), 200)
        assert item["body"] in browser_document(mod_page, topic, 200)
        send(mod_page, hide_form(mod_page, item, "topic"), reason)
        expect(mod_page).to_have_url(re.compile(r"/en/admin/forum/topics/" + item["topic"] + r"/inspect"))
        assert visibility_state("forum_topics", item["topic"])["is_hidden"] is True
        for path in (topic, topic_data, topic + "?view=original",
                topic + "?_routes=routes%2Ftopic",
                topic_data + "?_routes=routes%2Ftopic&view=original",
                "/he/topics/" + item["topic"],
                "/he/topics/" + item["topic"] + ".data"):
            if ".data" in path:
                cache(public_page.request.get(base + path), 404, forbidden=secret)
            else:
                browser_document(public_page, path, 404, forbidden=secret)
        browser_document(public_page, topic, 404, forbidden=secret)
        refreshed = public_page.reload(wait_until="networkidle")
        cache(refreshed, 404, forbidden=secret)
        assert all(s not in public_page.locator("body").inner_text() for s in secret)
        alias = public_page.request.get(base + "/iw/topics/" + item["topic"], max_redirects=0)
        assert alias.status == 308
        assert "/he/topics/" + item["topic"] in (alias.headers.get("location") or "")
        assert all(s not in alias.text() for s in secret)
        record("browser-document-data-alias-no-store-neutral404")

        # B. Protected browser document/.data; denial and revocation do not
        # serve even a previously opened privileged source.
        cache(manager.request.get(base + queue), 200, True)
        assert reason in cache(manager.request.get(base + inspect_data), 200, True)
        assert reason in browser_document(mod_page, inspect, 200, True)
        for path in (queue, queue_data, inspect, inspect_data):
            cache(guest.request.get(base + path), 401, True, secret)
            cache(ordinary.request.get(base + path), 403, True, secret)
        sql("""update authz_user_permission_overrides set effect='deny'
               where user_id=$1 and permission_key='forum.content.visibility.manage'""",
            [manager_id])
        for path in (queue, queue_data, inspect, inspect_data):
            cache(manager.request.get(base + path), 403, True, secret)
        browser_document(mod_page, inspect, 403, True, secret)
        assert mod_page.locator("form.visibility-restore-form").count() == 0
        sql("""update authz_user_permission_overrides set effect='allow'
               where user_id=$1 and permission_key='forum.content.visibility.manage'""",
            [manager_id])
        restored = browser_document(mod_page, inspect, 200, True)
        assert reason in restored
        form = mod_page.locator("form.visibility-restore-form")
        send(mod_page, form, "B8 C3 topic restore")
        assert visibility_state("forum_topics", item["topic"])["is_hidden"] is False
        assert item["title"] in browser_document(public_page, topic, 200)
        assert item["title"] in cache(public_page.request.get(base + topic_data), 200)
        assert history_count(item["topic"], "topic.hidden") == 1
        assert history_count(item["topic"], "topic.restored") == 1
        record("private-document-data-revoke-and-browser-restored-no-stale-cache")

        # C. Real database read outage: unavailable rather than private source
        # fallback, and a recovered reader returns the current guarded state.
        outage = seed(author_id, "outage")
        outage_topic = "/en/topics/" + outage["topic"]
        browser_document(mod_page, outage_topic, 200)
        send(mod_page, hide_form(mod_page, outage, "post"), "B8 C3 outage reason")
        inspect_post = inspection(outage, "post")
        assert "B8 C3 outage reason" in browser_document(mod_page, inspect_post, 200, True)
        hold = hold_topics()
        try:
            browser_document(mod_page, inspect_post, 503, True,
                ["B8 C3 outage reason", outage["body"], "forum_topics", "connectionString"])
            cache(manager.request.get(base + inspect_post.replace("/inspect", "/inspect.data")),
                503, True, ["B8 C3 outage reason", outage["body"], "forum_topics"])
            browser_document(public_page, outage_topic, 503, False,
                [outage["title"], outage["body"], "forum_topics", "connectionString"])
        finally:
            unlock(hold)
        assert "B8 C3 outage reason" in browser_document(mod_page, inspect_post, 200, True)
        browser_document(public_page, outage_topic, 200, forbidden=[outage["body"]])
        assert history_count(outage["post"], "post.hidden") == 1
        record("real-PG-outage-private503-public503-recovery")

        # D. Test-scoped unexpected PostgreSQL History failure: the canonical
        # browser Hide must not commit a partially hidden post or reveal SQL.
        broken = seed(author_id, "unexpected")
        broken_topic = "/en/topics/" + broken["topic"]
        fault = "b8_c3_history_" + uuid4().hex[:12]
        diagnostic = "B8_C3_PRIVATE_HISTORY_EXCEPTION"
        sql("create function " + fault + "() returns trigger language plpgsql as $$ "
            "begin raise exception '" + diagnostic + "'; end; $$")
        sql("create trigger " + fault + " before insert on admin_history for each row "
            "when (new.target_id = '" + broken["post"] +
            "' and new.action = 'post.hidden') execute function " + fault + "()")
        unexpected_page = page(manager)
        try:
            browser_document(unexpected_page, broken_topic, 200)
            bad_form = hide_form(unexpected_page, broken, "post")
            response = send(unexpected_page, bad_form, "B8 C3 failed mutation", status=500)
            assert diagnostic not in response.text()
            expect(unexpected_page.locator(".visibility-unconfirmed")).to_be_visible()
            assert bad_form.locator("button[type='submit']").is_disabled()
            assert visibility_state("forum_posts", broken["post"]) == {
                "is_hidden": False, "visibility_version": 0}
            assert history_count(broken["post"], "post.hidden") == 0
            assert diagnostic not in unexpected_page.locator("body").inner_text()
            record("unexpected-History-failure-500-rollback-no-source")
        finally:
            sql("drop trigger if exists " + fault + " on admin_history")
            sql("drop function if exists " + fault + "()")
        unexpected_page.locator(".visibility-unconfirmed button").click()
        expect(unexpected_page.locator("form.visibility-hide-form").last).to_be_visible()
        assert visibility_state("forum_posts", broken["post"])["is_hidden"] is False
        # Deliberate post-failure action, never an automatic replay.
        active_form = unexpected_page.locator("#post-" + broken["post"] +
            " form.visibility-hide-form")
        send(unexpected_page, active_form, "B8 C3 deliberate retry")
        assert visibility_state("forum_posts", broken["post"])["is_hidden"] is True
        assert history_count(broken["post"], "post.hidden") == 1
        browser_document(public_page, broken_topic, 200, forbidden=[broken["body"]])
        record("explicit-retry-after-unexpected-is-only-new-commit")

        assert not external, external
        assert not errors, errors
        record("B8-C3-browser-cache-fault-completeness-pass")
        for ctx in contexts:
            ctx.close()
        browser.close()
finally:
    (args.output / "results-visibility-cache-fault.json").write_text(json.dumps({
        "cases": records, "pageErrors": errors, "external": external,
    }, ensure_ascii=False, indent=2))
