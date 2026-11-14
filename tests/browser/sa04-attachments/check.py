"""SA04-K5: real built Worker + Better Auth + PG17 + local-only R2 + Chromium.

No production credentials, remote bucket or privileged Owner identity. Synthetic
fixture deactivation is direct SQL only; the actual HTTP traffic passes through
the ordinary Better Auth session and repository admission gates.
"""
import argparse
import json
import os
import shutil
import subprocess
import time
from pathlib import Path
from urllib.parse import quote, urlparse
from uuid import uuid4

from playwright.sync_api import expect, sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument("--url", default="http://127.0.0.1:4205")
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
base = args.url.rstrip("/")
database = os.environ["DATABASE_URL"]
assert urlparse(base).hostname in ("localhost", "127.0.0.1")
assert urlparse(database).hostname in ("localhost", "127.0.0.1")
assert urlparse(database).path.endswith("_test")
repo = Path(__file__).resolve().parents[3]
node = shutil.which("node")
assert node
args.output.mkdir(parents=True, exist_ok=True)
prefix = "k5-r2-" + uuid4().hex
records = []
page_errors = []
external = []


def sql(query, params=None):
    statement = """import pg from "pg";
const d=JSON.parse(await new Promise(resolve=>{let v="";
 process.stdin.on("data",chunk=>v+=chunk);
 process.stdin.on("end",()=>resolve(v));}));
const c=new pg.Client({connectionString:process.env.DATABASE_URL});
await c.connect();
try { console.log(JSON.stringify((await c.query(d.query,d.params)).rows)); }
finally { await c.end(); }"""
    result = subprocess.run([node, "--input-type=module", "-e", statement],
                            input=json.dumps({"query": query, "params": params or []}),
                            cwd=repo, capture_output=True, text=True, check=True, timeout=30)
    return json.loads(result.stdout)


def count(query, params=None):
    rows = sql(query, params)
    assert len(rows) == 1 and len(rows[0]) == 1, (query, rows)
    return next(iter(rows[0].values()))


def record(name, **details):
    row = {"case": name, **details}
    records.append(row)
    print("SA04_K5_CONNECTED " + json.dumps(row, ensure_ascii=False), flush=True)


def external_guard(ctx):
    def route_guard(route):
        if route.request.url.startswith(base + "/"):
            route.continue_()
        else:
            external.append(route.request.url)
            route.abort()
    ctx.route("**/*", route_guard)


def account(browser, label, ip):
    ctx = browser.new_context(
        viewport={"width": 1280, "height": 850}, service_workers="block",
        extra_http_headers={"cf-connecting-ip": ip},
    )
    external_guard(ctx)
    result = ctx.request.post(
        base + "/api/auth/sign-up/email",
        headers={"Origin": base},
        data={
            "name": "K5 synthetic " + label,
            "email": prefix + "-" + label + "@test.invalid",
            "password": "K5-only-" + uuid4().hex,
        },
    )
    assert result.status == 200, (label, result.status, result.text()[:220])
    identity = result.json()["user"]["id"]
    session = ctx.request.get(base + "/api/auth/get-session")
    assert session.status == 200 and session.json()["user"]["id"] == identity
    page = ctx.new_page()
    page.set_default_timeout(25000)
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    return ctx, page, identity


def topic(author_id):
    category_id, section_id = prefix + "-category", prefix + "-section"
    sql("insert into forum_categories(id,name) values($1,'K5 R2 category')", [category_id])
    sql("insert into forum_sections(id,category_id,name) values($1,$2,'K5 R2 section')",
        [section_id, category_id])
    topic_id, title_id, post_id, body_id = [str(uuid4()) for _ in range(4)]
    sql("""with topic as (
      insert into forum_topics(id,section_id,author_id,current_title_revision_id)
      values($1,$2,$3,$4) returning id)
      insert into forum_topic_title_revisions
        (id,topic_id,author_id,original_content,source_locale)
      select $4,id,$3,'K5 R2 authored topic','en' from topic""",
        [topic_id, section_id, author_id, title_id])
    sql("""with post as (
      insert into forum_posts(id,topic_id,author_id,current_revision_id)
      values($1,$2,$3,$4) returning id)
      insert into forum_post_revisions
        (id,post_id,author_id,original_content,source_locale)
      select $4,id,$3,'K5 topic body','en' from post""",
        [post_id, topic_id, author_id, body_id])
    return topic_id


def deactivate(user_id):
    changed = sql("""update "user" set deactivated_at=now(),
      deactivated_by_user_id=$1,
      retain_at_least_until=now()+interval '2 years'
      where id=$1 and deactivated_at is null returning id""", [user_id])
    assert changed == [{"id": user_id}], changed


def stats(user_id):
    return sql("""select
      (select count(*)::int from forum_attachments where owner_id=$1) as assets,
      (select count(*)::int from forum_attachment_draft_refs where owner_id=$1) as refs,
      (select count(*)::int from forum_attachment_draft_generations where owner_id=$1) as terminal,
      (select count(*)::int from forum_attachment_upload_objects) as journal""", [user_id])[0]


def headers(context, operation, **additional):
    return {
        "X-Vico-Editor-Context": quote(context, safe=""),
        "X-Vico-Operation-Id": operation,
        **additional,
    }


def upload(ctx, user_id, topic_id, operation, attachment_id, body, name="k5-notes.txt"):
    assert isinstance(body, bytes)
    return ctx.request.post(
        base + "/api/attachments",
        headers={
            "Origin": base,
            "Content-Type": "text/plain",
            "X-Vico-Attachment-Id": attachment_id,
            "X-Vico-Attachment-Name": quote(name, safe=""),
            "X-Vico-Attachment-Size": str(len(body)),
            **headers("topic:" + topic_id + ":reply", operation),
        },
        data=body,
    )


def listed(ctx, topic_id, operation):
    return ctx.request.get(base + "/api/attachments",
                           headers=headers("topic:" + topic_id + ":reply", operation))


def private_file(ctx, topic_id, operation, attachment_id, view=None):
    path = "/api/attachments/file/" + attachment_id
    path += "?operation=" + operation + "&context=" + quote("topic:" + topic_id + ":reply", safe="")
    if view:
        path += "&view=" + view
    return ctx.request.get(base + path)


def cancel(ctx, topic_id, operation):
    return ctx.request.delete(base + "/api/attachments",
        headers={"Origin": base, **headers("topic:" + topic_id + ":reply", operation)})


def no_store(response):
    assert "no-store" in response.headers.get("cache-control", "").lower(), (
        response.status, dict(response.headers))


def refused(response, status=401):
    assert response.status == status, (response.status, response.text()[:250])
    no_store(response)
    if response.headers.get("content-type", "").startswith("application/json"):
        result = response.json()
        assert result.get("outcome") != "stored" and result.get("outcome") != "cancelled", result


def wait_for(predicate, name, budget=18.0):
    deadline = time.monotonic() + budget
    while time.monotonic() < deadline:
        result = predicate()
        if result:
            return result
        time.sleep(0.12)
    raise AssertionError("K5 causal checkpoint not reached: " + name)


try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            channel=os.environ.get("PLAYWRIGHT_CHANNEL", "chromium"),
            headless=True, args=["--no-sandbox"],
        )
        author_ctx, author_page, author = account(browser, "author", "203.0.113.160")
        active_ctx, active, active_id = account(browser, "active", "203.0.113.161")
        restricted_ctx, restricted_page, restricted_id = account(browser, "restricted", "203.0.113.162")
        inactive_ctx, inactive, inactive_id = account(browser, "inactive", "203.0.113.163")
        delayed_ctx, delayed, delayed_id = account(browser, "delayed", "203.0.113.164")
        topic_id = topic(author)
        context_key = "topic:" + topic_id + ":reply"
        record("built-worker-genuine-better-auth-five-sessions-pg-fixture",
               local_r2_binding="ATTACHMENT_R2")

        # UI is real Chromium, not a mounted component mock. File input upload
        # must cross Better Auth, journal PREPARING/READY and local Worker R2.
        page_result = active.goto(base + "/en/topics/" + topic_id, wait_until="networkidle")
        assert page_result and page_result.status == 200
        form = active.locator('form[method="post"]:has(input[name="intent"][value="reply"])')
        expect(form).to_have_count(1)
        resume = active.locator("button.forum-composer-resume")
        if resume.count() and resume.is_visible():
            resume.click()
        operation = form.locator('input[name="editorOperationId"]').input_value()
        assert len(operation) == 36
        payload = b"K5 built Worker Better Auth local R2 browser attachment"
        uploader = form.locator('input[type="file"]')
        expect(uploader).to_have_count(1)
        with active.expect_response(
            lambda response: response.url == base + "/api/attachments"
            and response.request.method == "POST", timeout=30000
        ) as pending:
            uploader.set_input_files({
                "name": "k5-notes.txt", "mimeType": "text/plain", "buffer": payload,
            })
        ack = pending.value
        assert ack.status == 201, (ack.status, ack.text()[:250])
        reply_ids = json.loads(form.locator('input[name="editorAttachmentIds"]').input_value())
        assert len(reply_ids) == 1
        attachment_id = reply_ids[0]
        meta = sql("""select a.id,a.object_key,o.reservation_etag
          from forum_attachments a
          join forum_attachment_upload_objects o on o.object_key=a.object_key
          where a.id=$1 and a.owner_id=$2""", [attachment_id, active_id])
        assert len(meta) == 1 and meta[0]["reservation_etag"]
        assert meta[0]["object_key"].startswith("private/fenced-v1/")
        record("chromium-mounted-file-upload-real-r2-verified-ready-journal",
               verified_bytes=len(payload))

        listing = listed(active_ctx, topic_id, operation)
        assert listing.status == 200 and listing.json()["attachments"][0]["id"] == attachment_id
        private_bytes = private_file(active_ctx, topic_id, operation, attachment_id, "text")
        assert private_bytes.status == 200 and private_bytes.body() == payload
        no_store(private_bytes)
        assert private_file(author_ctx, topic_id, operation, attachment_id).status == 404
        record("actual-r2-stored-bytes-private-membership-and-owner-boundary")

        # A current authenticated browser performs the canonical publication
        # bind. It is not a synthetic database insert of the attached asset.
        published = active_ctx.request.post(
            base + "/en/topics/" + topic_id,
            headers={"Origin": base},
            form={
                "intent": "reply",
                "body": "K5 real published attachment",
                "editorActorId": active_id,
                "editorOperationId": operation,
                "editorAttachmentIds": json.dumps([attachment_id]),
            },
            max_redirects=0,
        )
        assert published.status in (302, 303), (published.status, published.text()[:250])
        matches = sql("""select p.post_id from forum_post_attachments p
          where p.attachment_id=$1""", [attachment_id])
        assert len(matches) == 1
        post_id = matches[0]["post_id"]
        public_url = base + "/api/attachments/file/" + attachment_id + "?post=" + post_id
        public_file = author_ctx.request.get(public_url)
        assert public_file.status == 200 and public_file.body() == payload
        record("canonical-reply-publishes-exact-selected-r2-file")

        # Keep this published file after deactivation; do not gate public
        # membership on the author's lifecycle or delete shared/public bytes.
        deactivate(active_id)
        still_public = author_ctx.request.get(public_url)
        assert still_public.status == 200 and still_public.body() == payload
        refused(listed(active_ctx, topic_id, operation))
        refused(private_file(active_ctx, topic_id, operation, attachment_id))
        refused(cancel(active_ctx, topic_id, operation))
        refused(upload(active_ctx, active_id, topic_id, str(uuid4()), str(uuid4()), payload))
        record("inactive-published-author-public-read-retained-private-operations-401")

        # A stored AP-10 upload restriction does not block committed ID replay,
        # private reads or Cancel, but still rejects a genuinely new file.
        restricted_op = str(uuid4())
        restricted_asset = str(uuid4())
        good = upload(restricted_ctx, restricted_id, topic_id,
                      restricted_op, restricted_asset, b"K5-measure-initial-file")
        assert good.status == 201, (good.status, good.text()[:200])
        before_measure = stats(restricted_id)
        measure_id = str(uuid4())
        sql("""insert into user_measures
          (id,target_user_id,issuer_user_id,issuer_authority_floor,
           create_fingerprint,initial_reason,expires_at)
          values($1,$2,$3,1,$4,'K5 local restriction',null)""",
          [measure_id, restricted_id, author, "e" * 64])
        sql("""insert into user_measure_restrictions(measure_id,restriction_key)
          values($1,'attachments.upload')""", [measure_id])
        retry = upload(restricted_ctx, restricted_id, topic_id,
                       restricted_op, restricted_asset, b"K5-measure-initial-file")
        assert retry.status == 201, (retry.status, retry.text()[:250])
        assert retry.json()["attachment"]["id"] == restricted_asset
        assert stats(restricted_id) == before_measure
        fresh = upload(restricted_ctx, restricted_id, topic_id,
                       restricted_op, str(uuid4()), b"K5-measure-new-file")
        refused(fresh, 403)
        assert listed(restricted_ctx, topic_id, restricted_op).status == 200
        cancelled = cancel(restricted_ctx, topic_id, restricted_op)
        assert cancelled.status == 200 and cancelled.json()["outcome"] == "cancelled"
        assert stats(restricted_id)["refs"] == 0
        record("ap10-committed-replay-fresh-upload-denial-private-read-and-cancel")

        # An already mounted editor retains its content after account state
        # changes. Its attempted XHR may not claim false upload success.
        inactive_response = inactive.goto(base + "/en/topics/" + topic_id, wait_until="networkidle")
        assert inactive_response and inactive_response.status == 200
        inactive_form = inactive.locator('form[method="post"]:has(input[name="intent"][value="reply"])')
        expect(inactive_form).to_have_count(1)
        resume = inactive.locator("button.forum-composer-resume")
        if resume.count() and resume.is_visible():
            resume.click()
        if inactive_form.locator(".markdown-editor").get_attribute("data-authoring") != "advanced":
            inactive_form.get_by_role("button", name="Advanced", exact=True).click()
        editor = inactive_form.locator("textarea#reply-body")
        editor.fill("K5 kept text after account deactivation")
        inactive_operation = inactive_form.locator('input[name="editorOperationId"]').input_value()
        deactivate(inactive_id)
        before_inactive = stats(inactive_id)
        with inactive.expect_response(
            lambda response: response.url == base + "/api/attachments"
            and response.request.method == "POST", timeout=30000
        ) as denied_upload:
            inactive_form.locator('input[type="file"]').set_input_files({
                "name": "denied.txt", "mimeType": "text/plain",
                "buffer": b"K5 inactive upload denied",
            })
        denied_response = denied_upload.value
        assert denied_response.status == 401, (denied_response.status, denied_response.text()[:200])
        assert "no-store" in denied_response.headers.get("cache-control", "")
        expect(editor).to_have_value("K5 kept text after account deactivation")
        assert stats(inactive_id) == before_inactive
        refused(listed(inactive_ctx, topic_id, inactive_operation))
        refused(cancel(inactive_ctx, topic_id, inactive_operation))
        record("mounted-chromium-inactive-upload-denied-keeps-editor-text-and-state")

        assert not external, external[:10]
        assert not page_errors, page_errors[:10]
        browser.close()

    (args.output / "results.json").write_text(json.dumps({
        "sha": os.getenv("IMPLEMENTATION_SHA"), "cases": records,
        "external": external, "page_errors": page_errors,
        "binding": "local-only Miniflare R2 ATTACHMENT_R2",
    }, indent=2), encoding="utf8")
    print("SA04_K5_CONNECTED_PASS " + str(len(records)), flush=True)
except Exception as error:
    (args.output / "failure.json").write_text(json.dumps({
        "sha": os.getenv("IMPLEMENTATION_SHA"), "cases": records,
        "error": repr(error), "external": external, "page_errors": page_errors,
    }, indent=2), encoding="utf8")
    raise
