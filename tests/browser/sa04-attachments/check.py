"""SA04-K5: real built Worker + Better Auth + PG17 + local-only R2 + Chromium.

No production credentials, remote bucket or privileged Owner identity. Synthetic
fixture deactivation is direct SQL only; the actual HTTP traffic passes through
the ordinary Better Auth session and repository admission gates.
"""
import argparse
import base64
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


def local_r2(action, key=None, batch=None):
    """Inspect the *same* persisted local-only ATTACHMENT_R2 used by preview."""
    command = {"action": action}
    if key is not None:
        command["key"] = key
    if batch is not None:
        command["batch"] = batch
    result = subprocess.run(
        ["pnpm", "exec", "tsx", "tests/browser/sa04-attachments/r2-cleanup.ts"],
        input=json.dumps(command), cwd=repo, capture_output=True, text=True, timeout=80,
    )
    if result.returncode:
        raise AssertionError("local R2 bridge failed: " + result.stderr[-3500:] +
                             "\n" + result.stdout[-1000:])
    replies = [line.partition("SA04_K5_R2_RESULT ")[2] for line in result.stdout.splitlines()
               if line.startswith("SA04_K5_R2_RESULT ")]
    assert len(replies) == 1, (result.stdout[-2000:], result.stderr[-1000:])
    return json.loads(replies[0])


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


def local_storage_probe(ctx, operation, key=None):
    """CI-only Worker probe; uses the live Worker binding, never production R2."""
    payload = {"operation": operation}
    if key is not None:
        payload["key"] = key
    response = ctx.request.post(
        base + "/__sa04_k5_storage_probe",
        headers={"Origin": base, "X-K5-Token": "sa04-k5-only-local-probe"},
        data=payload,
    )
    assert response.status == 200, (operation, response.status, response.text()[:220])
    return response.json()


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


class PgBarrier:
    """One fixed PostgreSQL backend holding a real transaction and row/scope lock."""

    def __init__(self):
        self.process = subprocess.Popen(
            [node, str(repo / "tests/browser/sa04-attachments/pg-lock.mjs")],
            cwd=repo, env=os.environ.copy(),
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, bufsize=1,
        )
        self.backend_pid = self.send({"action": "pid"})["pid"]

    def send(self, command):
        assert self.process.stdin and self.process.stdout
        self.process.stdin.write(json.dumps(command) + "\n")
        self.process.stdin.flush()
        line = self.process.stdout.readline()
        assert line, ("barrier exited", self.process.poll(),
                      self.process.stderr.read() if self.process.stderr else "")
        result = json.loads(line)
        assert result.get("ok") is True, (command, result)
        return result

    def close(self):
        if self.process.poll() is None:
            try:
                self.send({"action": "rollback"})
            finally:
                assert self.process.stdin
                self.process.stdin.close()
                self.process.wait(timeout=10)


def wait_blocking(backend_pid, purpose):
    """Observe an actual blocked PostgreSQL request through pg_blocking_pids."""
    def blocked():
        rows = sql("""select pid, query from pg_stat_activity
          where datname=current_database() and pid!=pg_backend_pid()
            and $1=any(pg_blocking_pids(pid))""", [backend_pid])
        return rows if rows else None
    try:
        return wait_for(blocked, purpose, 15.0)
    except AssertionError:
        state = sql("""select pid,application_name,state,wait_event_type,wait_event,
          left(query,220) as query,pg_blocking_pids(pid) as blocked_by
          from pg_stat_activity where datname=current_database()
          order by application_name,pid""")
        print("K5_BLOCK_DIAGNOSTIC " + json.dumps({
            "purpose":purpose,"holder_pid":backend_pid,"activity":state,
        }, ensure_ascii=False), flush=True)
        raise


def start_browser_request(page, url, method, request_headers, body=None):
    return page.evaluate("""({url,method,headers,body}) => {
      window.__k5RequestSettled = null;
      window.__k5Request = fetch(url, {
        method, headers, credentials:"same-origin",
        ...(body === null ? {} : {body}),
      }).then(async response => ({
        status:response.status,
        cache:response.headers.get("cache-control") || "",
        contentType:response.headers.get("content-type") || "",
        body:await response.text()
      }), error => ({failed:String(error)})).then(result => {
        window.__k5RequestSettled = result;
        return result;
      });
      return "started";
    }""", {"url": url, "method": method, "headers": request_headers, "body": body})


def finish_browser_request(page):
    return page.evaluate("async () => await window.__k5Request")



class HeldHttpUpload:
    """One real HTTP/1.1 chunked client; browser-origin BA cookie is still authority."""

    def __init__(self):
        env = {**os.environ, "K5_BASE": base}
        self.process = subprocess.Popen(
            [node, str(repo / "tests/browser/sa04-attachments/stream-client.mjs")],
            cwd=repo, env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            stderr=subprocess.PIPE, text=True, bufsize=1,
        )

    def read(self):
        import select
        assert self.process.stdout
        ready, _, _ = select.select([self.process.stdout], [], [], 35)
        assert ready, ("stream-client timeout", self.process.poll())
        line = self.process.stdout.readline()
        assert line, ("stream-client stopped", self.process.poll())
        result = json.loads(line)
        assert result.get("event") not in ("error", "protocol-error"), result
        return result

    def send(self, payload):
        assert self.process.stdin
        self.process.stdin.write(json.dumps(payload) + "\n")
        self.process.stdin.flush()
        return self.read()

    def close(self):
        if self.process.poll() is None:
            try:
                if self.process.stdin:
                    self.process.stdin.write('{"action":"abort"}\n')
                    self.process.stdin.flush()
                    self.process.stdin.close()
            except OSError:
                pass
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=5)


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
        race_ctx, race_page, race_id = account(browser, "race", "203.0.113.165")
        journal_ctx, journal_page, journal_id = account(browser, "journal", "203.0.113.166")
        fault_ctx, fault_page, fault_id = account(browser, "fault", "203.0.113.167")
        ack_ctx, ack_page, ack_id = account(browser, "ack", "203.0.113.168")
        timeout_ctx, timeout_page, timeout_id = account(browser, "db-ack", "203.0.113.169")
        claim_ctx, claim_page, claim_id = account(browser, "claim", "203.0.113.170")
        detached_ctx, detached_page, detached_id = account(browser, "detached", "203.0.113.171")
        topic_id = topic(author)
        context_key = "topic:" + topic_id + ":reply"
        record("built-worker-genuine-better-auth-twelve-sessions-pg-fixture",
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
        local_object = local_r2("inspect", meta[0]["object_key"])
        assert local_object == {
            "exists": True, "size": len(payload), "kind": "vico-payload-v1",
            "base64": base64.b64encode(payload).decode(),
        }, local_object
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


        # Causal state-first: hold the authoritative draft-scope advisory
        # lock, observe the Worker blocked on that backend, then deactivate
        # before releasing. No fresh object/journal/ref may appear.
        race_page.goto(base + "/en/topics/" + topic_id, wait_until="networkidle")
        # Synchronous Playwright route interception would deadlock while Python
        # observes PostgreSQL. No external requests are generated after mount.
        race_ctx.unroute("**/*")
        race_op, race_asset = str(uuid4()), str(uuid4())
        race_before = stats(race_id)
        blocker = PgBarrier()
        try:
            blocker.send({"action": "begin-scope", "actor": race_id, "context": context_key})
            start_browser_request(race_page, "/api/attachments", "POST", {
                "Content-Type": "text/plain",
                "X-Vico-Attachment-Id": race_asset,
                "X-Vico-Attachment-Name": "k5-state-first.txt",
                "X-Vico-Attachment-Size": str(len("K5 state first upload text".encode())),
                **headers(context_key, race_op),
            }, "K5 state first upload text")
            try:
                blocked = wait_blocking(blocker.backend_pid, "state-first scope lock")
            except AssertionError:
                print("K5_BROWSER_REQUEST_DIAGNOSTIC " +
                      json.dumps(race_page.evaluate("() => window.__k5RequestSettled")),
                      flush=True)
                raise
            assert blocked
            deactivate(race_id)
            blocker.send({"action": "commit"})
            denied = finish_browser_request(race_page)
            assert denied.get("status") == 401, denied
            assert "no-store" in denied["cache"]
            assert stats(race_id) == race_before
            record("actual-worker-state-first-blocked-actor-before-r2",
                   physical_lock=True, unchanged=True)
        finally:
            blocker.close()

        # Causal post-READY HTTP/1.1 streaming gate: only the first 8 KiB
        # of a 16 KiB upload reaches the Worker. A positive journal READY proves R2
        # reservation and activation have completed; the test holds the
        # remainder until after fixture deactivation commits.
        delayed.goto(base + "/en/topics/" + topic_id, wait_until="networkidle")
        # Synchronous Playwright route interception would deadlock while Python
        # observes PostgreSQL. No external requests are generated after mount.
        delayed_ctx.unroute("**/*")
        delayed_op, delayed_asset = str(uuid4()), str(uuid4())
        delayed_before = stats(delayed_id)
        old_keys = {row["object_key"] for row in sql(
            "select object_key from forum_attachment_upload_objects")}
        cookie = "; ".join(item["name"] + "=" + item["value"]
                           for item in delayed_ctx.cookies(base))
        assert cookie, "real Better Auth session cookie required"
        chunked = HeldHttpUpload()
        try:
            started = chunked.send({
                "action": "start", "cookie": cookie,
                "attachment": delayed_asset, "operation": delayed_op,
                "context": context_key,
            })
            assert started == {"event": "first-chunk-sent", "bytes": 8192}, started
            def ready_upload():
                rows = sql("""select object_key,reservation_etag from forum_attachment_upload_objects
                  where reservation_etag is not null""")
                return next((row for row in rows
                             if row["object_key"] not in old_keys), None)
            ready = wait_for(ready_upload, "held real HTTP/1.1 body after READY", 25)
            assert ready["reservation_etag"], ready
            deactivate(delayed_id)
            released = chunked.send({"action": "release"})
            assert released["event"] == "remainder-released", released
            delayed_response = chunked.read()
            assert delayed_response.get("status") == 401, delayed_response
            assert "no-store" in (delayed_response.get("cache") or "")
        finally:
            chunked.close()
        assert sql("select id from forum_attachments where id=$1", [delayed_asset]) == []
        assert sql("select attachment_id from forum_attachment_draft_refs where attachment_id=$1",
                   [delayed_asset]) == []
        assert stats(delayed_id)["assets"] == delayed_before["assets"]
        assert stats(delayed_id)["refs"] == delayed_before["refs"]
        record("actual-local-r2-ready-held-http-stream-deactivation-before-finalize",
               ready_key=True, no_false_201=True, no_asset_ref=True)

        # Block the existing journal mutex in PREPARING and make the state
        # change win before activation can acquire the journal row. The
        # real Worker must not issue a successful payload PUT after denial.
        journal_page.goto(base + "/en/topics/" + topic_id, wait_until="networkidle")
        # Synchronous Playwright route interception would deadlock while Python
        # observes PostgreSQL. No external requests are generated after mount.
        journal_ctx.unroute("**/*")
        journal_op, journal_asset = str(uuid4()), str(uuid4())
        before_keys = {row["object_key"] for row in sql(
            "select object_key from forum_attachment_upload_objects")}
        journal_before = stats(journal_id)
        start_browser_request(journal_page, "/api/attachments", "POST", {
            "Content-Type": "text/plain",
            "X-Vico-Attachment-Id": journal_asset,
            "X-Vico-Attachment-Name": "k5-journal-wait.txt",
            "X-Vico-Attachment-Size": str(len("K5 journal waits actor update".encode())),
            **headers(context_key, journal_op),
        }, "K5 journal waits actor update")
        def preparing():
            rows = sql("""select object_key,reservation_etag from forum_attachment_upload_objects
              where reservation_etag is null""")
            return next((row["object_key"] for row in rows
                         if row["object_key"] not in before_keys), None)
        preparing_key = wait_for(preparing, "new PREPARING row before R2 reserve", 12)
        journal_lock = PgBarrier()
        try:
            journal_lock.send({"action": "begin-journal", "key": preparing_key})
            wait_blocking(journal_lock.backend_pid, "journal activation blocked")
            deactivate(journal_id)
            journal_lock.send({"action": "commit"})
            denied = finish_browser_request(journal_page)
            assert denied.get("status") == 401, denied
            assert "no-store" in denied["cache"]
            assert sql("select id from forum_attachments where id=$1", [journal_asset]) == []
            assert stats(journal_id)["assets"] == journal_before["assets"]
            assert stats(journal_id)["refs"] == journal_before["refs"]
            record("actual-worker-journal-before-actor-deactivation-wins",
                   physical_lock=True, no_asset=True)
        finally:
            journal_lock.close()



        # Commit on the actual Worker/R2/PG path, then intentionally suppress
        # the HTTP response *after* the Worker returns 201. The Chromium fetch
        # observes only a transport error and cannot infer the COMMIT outcome.
        ack_page.goto(base + "/en/topics/" + topic_id, wait_until="networkidle")
        ack_op, ack_asset = str(uuid4()), str(uuid4())
        ack_bytes = b"K5 unknown HTTP ACK after real Worker metadata commit"
        intercepted = []
        def lose_committed_ack(route):
            committed = route.fetch(timeout=30000)
            intercepted.append((committed.status, committed.json().get("outcome")))
            route.abort("failed")
        ack_page.route("**/api/attachments", lose_committed_ack)
        try:
            start_browser_request(ack_page, "/api/attachments", "POST", {
                "Content-Type": "text/plain",
                "X-Vico-Attachment-Id": ack_asset,
                "X-Vico-Attachment-Name": "k5-ack.txt",
                "X-Vico-Attachment-Size": str(len(ack_bytes)),
                **headers(context_key, ack_op),
            }, ack_bytes.decode())
            ambiguous = finish_browser_request(ack_page)
            assert "failed" in ambiguous and "status" not in ambiguous, ambiguous
            assert intercepted == [(201, "stored")], intercepted
        finally:
            ack_page.unroute("**/api/attachments", lose_committed_ack)
        committed_facts = sql("""select a.object_key,r.attachment_id
          from forum_attachments a join forum_attachment_draft_refs r
            on r.attachment_id=a.id
          where a.id=$1 and a.owner_id=$2 and r.context_key=$3 and r.draft_id=$4""",
          [ack_asset, ack_id, context_key, ack_op])
        assert len(committed_facts) == 1, committed_facts
        ack_key = committed_facts[0]["object_key"]
        assert local_r2("inspect", ack_key) == {
            "exists": True, "size": len(ack_bytes), "kind": "vico-payload-v1",
            "base64": base64.b64encode(ack_bytes).decode(),
        }
        committed_before_retry = stats(ack_id)
        restored = upload(ack_ctx, ack_id, topic_id, ack_op, ack_asset,
                          ack_bytes, name="k5-ack.txt")
        assert restored.status == 201, (restored.status, restored.text()[:250])
        assert restored.json()["attachment"]["id"] == ack_asset
        assert stats(ack_id) == committed_before_retry
        assert private_file(ack_ctx, topic_id, ack_op, ack_asset).body() == ack_bytes
        record("actual-worker-unknown-client-ack-committed-replay-one-r2-key",
               lost_response=True, committed_asset=True, no_second_journal=True)

        # A genuine settled positive R2 payload precedes the metadata finalizer.
        # Lock READY journal with a separate PG transaction so the actual Worker
        # finalizer times out. Its 503 cannot authorize blind deletion: the DB
        # commit result is untrusted at this boundary, and cleanup owns the key.
        timeout_page.goto(base + "/en/topics/" + topic_id, wait_until="networkidle")
        old_timeout_keys = {row["object_key"] for row in sql(
            "select object_key from forum_attachment_upload_objects")}
        timeout_op, timeout_asset = str(uuid4()), str(uuid4())
        timeout_cookie = "; ".join(c["name"] + "=" + c["value"]
                                   for c in timeout_ctx.cookies(base))
        timeout_before = stats(timeout_id)
        hold_body = HeldHttpUpload()
        held_ready = PgBarrier()
        try:
            assert hold_body.send({
                "action": "start", "cookie": timeout_cookie,
                "attachment": timeout_asset, "operation": timeout_op,
                "context": context_key,
            }) == {"event": "first-chunk-sent", "bytes": 8192}
            def timeout_ready():
                rows = sql("""select object_key,reservation_etag from forum_attachment_upload_objects
                  where reservation_etag is not null""")
                return next((row for row in rows
                             if row["object_key"] not in old_timeout_keys), None)
            staged = wait_for(timeout_ready, "settled PUT/metadata timeout journal", 25)
            held_ready.send({"action": "begin-ready-journal", "key": staged["object_key"]})
            assert hold_body.send({"action": "release"})["event"] == "remainder-released"
            wait_blocking(held_ready.backend_pid, "real post-PUT metadata journal wait")
            unavailable = hold_body.read()
            assert unavailable.get("status") == 503, unavailable
            assert "no-store" in (unavailable.get("cache") or "")
        finally:
            held_ready.send({"action": "commit"})
            held_ready.close()
            hold_body.close()
        assert sql("select id from forum_attachments where id=$1", [timeout_asset]) == []
        assert sql("select attachment_id from forum_attachment_draft_refs where attachment_id=$1",
                   [timeout_asset]) == []
        timeout_object = local_r2("inspect", staged["object_key"])
        assert timeout_object == {
            "exists": True, "size": 16384, "kind": "vico-payload-v1",
            "base64": base64.b64encode(b"A" * 8192 + b"B" * 8192).decode(),
        }, {k: v for k, v in timeout_object.items() if k != "base64"}
        assert stats(timeout_id)["assets"] == timeout_before["assets"]
        assert stats(timeout_id)["refs"] == timeout_before["refs"]
        sql("""update forum_attachment_upload_objects
          set created_at=now()-interval '2 hours' where object_key=$1""",
          [staged["object_key"]])
        cleaned_orphan = local_r2("cleanup")
        assert cleaned_orphan["deleted"] >= 1, cleaned_orphan
        assert local_r2("inspect", staged["object_key"]) == {"exists": False}
        assert sql("select object_key from forum_attachment_upload_objects where object_key=$1",
                   [staged["object_key"]]) == []
        record("actual-r2-post-put-db-503-retains-unknown-object-until-cleanup",
               settled_bytes_before_cleanup=True, eventual_deleted=True, no_asset_ref=True)

        # A READY reservation with a stale, formerly held cleanup lease must
        # never gain fresh write authority. The first 8 KiB have entered the
        # real Worker, but the last 8 KiB are held outside R2 by HTTP/1.1.
        claim_page.goto(base + "/en/topics/" + topic_id, wait_until="networkidle")
        old_claim_keys = {row["object_key"] for row in sql(
            "select object_key from forum_attachment_upload_objects")}
        claim_op, claim_asset = str(uuid4()), str(uuid4())
        claim_cookie = "; ".join(c["name"] + "=" + c["value"]
                                 for c in claim_ctx.cookies(base))
        claim_before = stats(claim_id)
        held_claim = HeldHttpUpload()
        try:
            assert held_claim.send({
                "action": "start", "cookie": claim_cookie,
                "attachment": claim_asset, "operation": claim_op,
                "context": context_key,
            }) == {"event": "first-chunk-sent", "bytes": 8192}
            def claim_ready():
                rows = sql("""select object_key,reservation_etag from forum_attachment_upload_objects
                  where reservation_etag is not null""")
                return next((row for row in rows
                             if row["object_key"] not in old_claim_keys), None)
            waiting = wait_for(claim_ready, "READY reserved before lease reclaim", 25)
            reservation = local_r2("inspect", waiting["object_key"])
            assert reservation["exists"] and reservation["kind"] == "vico-reservation-v1"
            claim_token = str(uuid4())
            aged = sql("""update forum_attachment_upload_objects
              set created_at=now()-interval '2 hours',
              claimed_at=now()-interval '10 minutes',claim_token=$2
              where object_key=$1 and reservation_etag is not null
              returning object_key""", [waiting["object_key"], claim_token])
            assert aged == [{"object_key": waiting["object_key"]}], aged
            claim_cleanup = local_r2("cleanup")
            assert claim_cleanup["deleted"] >= 1, claim_cleanup
            assert local_r2("inspect", waiting["object_key"]) == {"exists": False}
            assert sql("select object_key from forum_attachment_upload_objects where object_key=$1",
                       [waiting["object_key"]]) == []
            assert held_claim.send({"action": "release"})["event"] == "remainder-released"
            after_claim = held_claim.read()
            assert after_claim.get("status") == 503, after_claim
            assert "no-store" in (after_claim.get("cache") or "")
        finally:
            held_claim.close()
        assert sql("select id from forum_attachments where id=$1", [claim_asset]) == []
        assert stats(claim_id)["assets"] == claim_before["assets"]
        assert stats(claim_id)["refs"] == claim_before["refs"]
        assert local_r2("inspect", waiting["object_key"]) == {"exists": False}
        record("actual-r2-expired-cleanup-claim-fences-late-http-payload",
               expired_lease_reclaimed=True, no_201=True, no_resurrection=True)

        # Normal background cleanup must preserve committed published references
        # of a now-inactive author, but remove truly detached temporary files.
        published_key = meta[0]["object_key"]
        sql("""update forum_attachments set created_at=now()-interval '2 hours'
          where id=$1""", [attachment_id])
        sql("""update forum_attachment_upload_objects
          set created_at=now()-interval '2 hours' where object_key=$1""",
          [published_key])
        local_r2("cleanup")
        assert local_r2("inspect", published_key) == {
            "exists": True, "size": len(payload), "kind": "vico-payload-v1",
            "base64": base64.b64encode(payload).decode(),
        }
        still_public = author_ctx.request.get(public_url)
        assert still_public.status == 200 and still_public.body() == payload
        record("actual-r2-cleanup-protects-published-by-inactive-author")

        detached_op, detached_asset = str(uuid4()), str(uuid4())
        detached_bytes = b"K5 detached asset reclaimed through actual local R2"
        detached_upload = upload(detached_ctx, detached_id, topic_id,
                                 detached_op, detached_asset, detached_bytes)
        assert detached_upload.status == 201, (detached_upload.status, detached_upload.text()[:250])
        detached_row = sql("select object_key from forum_attachments where id=$1", [detached_asset])
        assert len(detached_row) == 1
        detached_key = detached_row[0]["object_key"]
        detached_cancel = cancel(detached_ctx, topic_id, detached_op)
        assert detached_cancel.status == 200 and detached_cancel.json()["outcome"] == "cancelled"
        sql("""update forum_attachments set created_at=now()-interval '2 hours'
          where id=$1""", [detached_asset])
        sql("""update forum_attachment_upload_objects
          set created_at=now()-interval '2 hours' where object_key=$1""", [detached_key])
        detached_cleanup = local_r2("cleanup")
        assert detached_cleanup["deleted"] >= 1, detached_cleanup
        assert sql("select id from forum_attachments where id=$1", [detached_asset]) == []
        assert local_r2("inspect", detached_key) == {"exists": False}
        record("actual-r2-cancelled-detached-asset-deleted-by-system-cleanup",
               no_actor_lifecycle_gate=True, physical_deleted=True)

        # Marker-only orphan without a journal or asset: test the actual local
        # bucket LIST + protective ownership check + bounded sweep cursor.
        marker = "private/fenced-v1/00000000-0000-4000-8000-" + uuid4().hex[:12]
        assert local_r2("orphan-reservation", marker)["reserved"] is True
        assert local_r2("inspect", marker)["kind"] == "vico-reservation-v1"
        for _ in range(16):
            local_r2("cleanup")
            if local_r2("inspect", marker) == {"exists": False}:
                break
        assert local_r2("inspect", marker) == {"exists": False}
        record("actual-r2-bounded-orphan-marker-sweep-without-db-ownership")

        # Three real PostgreSQL query-timeout failures. A held scope lock
        # blocks each actual repository operation until the web DB caller
        # deadline classifies the dependency as unavailable (503). A private
        # result must never become success-shaped or cacheable.
        fault_page.goto(base + "/en/topics/" + topic_id, wait_until="networkidle")
        fault_ctx.unroute("**/*")
        for method in ("POST", "GET-list", "GET-file"):
            op, asset = str(uuid4()), str(uuid4())
            if method == "POST":
                path = "/api/attachments"
                payload = "K5 timeout before R2 object"
                req_headers = {
                    "Content-Type": "text/plain",
                    "X-Vico-Attachment-Id": asset,
                    "X-Vico-Attachment-Name": "k5-timeout.txt",
                    "X-Vico-Attachment-Size": str(len(payload.encode())),
                    **headers(context_key, op),
                }
            elif method == "GET-list":
                path, payload = "/api/attachments", None
                req_headers = headers(context_key, op)
            else:
                path = ("/api/attachments/file/" + asset + "?operation=" + op +
                        "&context=" + quote(context_key, safe=""))
                payload, req_headers = None, {}
            preflight = stats(fault_id)
            gate = PgBarrier()
            try:
                gate.send({"action": "begin-scope",
                           "actor": fault_id, "context": context_key})
                start_browser_request(fault_page, path,
                    "POST" if method == "POST" else "GET",
                    req_headers, payload)
                wait_blocking(gate.backend_pid, "classified 503 " + method)
                result = finish_browser_request(fault_page)
                assert result.get("status") == 503, (method, result)
                assert "no-store" in result["cache"], (method, result)
                assert "private/fenced-v1/" not in result["body"], (method, result)
                record("actual-worker-classified-503-" + method,
                       physical_lock=True, no_store=True)
            finally:
                gate.send({"action": "commit"})
                gate.close()
            assert stats(fault_id) == preflight

        # A missing application relation is a schema/programming fault, not
        # an availability classification. This synthetic fault uses an
        # instantly restored table rename in the disposable database only.
        # The Worker must surface framework 500 and protect resource-cache
        # privacy for POST/list/private-file, not forge 401 or 503.
        rename_back = "forum_attachment_draft_refs_k5_temp"
        sql("alter table forum_attachment_draft_refs rename to " + rename_back)
        try:
            for method in ("POST", "GET-list", "GET-file"):
                op, asset = str(uuid4()), str(uuid4())
                if method == "POST":
                    body = "K5 unexpected SQL failure"
                    path = "/api/attachments"
                    req_headers = {
                        "Content-Type": "text/plain",
                        "X-Vico-Attachment-Id": asset,
                        "X-Vico-Attachment-Name": "k5-fault.txt",
                        "X-Vico-Attachment-Size": str(len(body.encode())),
                        **headers(context_key, op),
                    }
                elif method == "GET-list":
                    path, body = "/api/attachments", None
                    req_headers = headers(context_key, op)
                else:
                    body, req_headers = None, {}
                    path = ("/api/attachments/file/" + asset + "?operation=" + op +
                            "&context=" + quote(context_key, safe=""))
                start_browser_request(fault_page, path,
                    "POST" if method == "POST" else "GET", req_headers, body)
                result = finish_browser_request(fault_page)
                assert result.get("status") == 500, (method, result)
                assert "no-store" in result["cache"], (method, result)
                assert "private/fenced-v1/" not in result["body"], (method, result)
                record("actual-worker-unexpected-500-private-" + method,
                       no_store=True, not_reclassified=True)
        finally:
            sql("alter table " + rename_back +
                " rename to forum_attachment_draft_refs")

        # The real Worker commits metadata and returns 201, but the browser
        # transport deliberately loses that response. A retry with the SAME
        # logical upload ID must converge without another R2 reservation/key.
        fault_page.goto(base + "/en/topics/" + topic_id, wait_until="networkidle")
        unknown_operation, unknown_asset = str(uuid4()), str(uuid4())
        unknown_payload = b"K5 real R2 committed before lost browser HTTP ACK"
        upload_request_headers = {
            "Content-Type": "text/plain",
            "X-Vico-Attachment-Id": unknown_asset,
            "X-Vico-Attachment-Name": "lost-ack.txt",
            "X-Vico-Attachment-Size": str(len(unknown_payload)),
            **headers(context_key, unknown_operation),
        }
        server_ack = []
        def drop_committed_ack(route):
            upstream = route.fetch()
            assert upstream.status == 201, (upstream.status, upstream.text()[:220])
            server_ack.append(upstream.status)
            route.abort("failed")
        fault_page.route("**/api/attachments", drop_committed_ack)
        try:
            start_browser_request(fault_page, "/api/attachments", "POST",
                                  upload_request_headers, unknown_payload.decode())
            lost = finish_browser_request(fault_page)
            assert lost.get("failed") and not lost.get("status"), lost
            assert server_ack == [201], server_ack
        finally:
            fault_page.unroute("**/api/attachments", drop_committed_ack)
        committed = sql("""select object_key from forum_attachments
          where id=$1 and owner_id=$2""", [unknown_asset, fault_id])
        assert len(committed) == 1, committed
        committed_key = committed[0]["object_key"]
        assert local_storage_probe(fault_ctx, "head", committed_key) == {
            "exists": True, "size": len(unknown_payload)}, committed_key
        before_replay = stats(fault_id)
        recovered = upload(fault_ctx, fault_id, topic_id, unknown_operation,
                           unknown_asset, unknown_payload, "lost-ack.txt")
        assert recovered.status == 201, (recovered.status, recovered.text()[:220])
        assert recovered.json()["attachment"]["id"] == unknown_asset
        assert stats(fault_id) == before_replay
        assert sql("select object_key from forum_attachments where id=$1",
                   [unknown_asset]) == [{"object_key": committed_key}]
        restored = private_file(fault_ctx, topic_id, unknown_operation, unknown_asset, "text")
        assert restored.status == 200 and restored.body() == unknown_payload
        # Cleanup of a registered, aged object journal retires only the journal;
        # even when the initial HTTP ACK was lost it must preserve actual R2.
        sql("""update forum_attachment_upload_objects
          set created_at=now()-interval '2 hours' where object_key=$1""", [committed_key])
        local_storage_probe(fault_ctx, "cleanup")
        assert sql("select object_key from forum_attachment_upload_objects where object_key=$1",
                   [committed_key]) == []
        assert local_storage_probe(fault_ctx, "head", committed_key)["exists"] is True
        assert private_file(fault_ctx, topic_id, unknown_operation, unknown_asset,
                            "text").body() == unknown_payload
        record("lost-browser-http-ack-after-real-commit-replay-no-new-r2-and-journal-cleanup",
               actual_worker_201=True, client_transport_failed=True,
               metadata_reused=True, r2_retained=True)

        # Ordinary reference-aware cleanup of a CANCELLED temporary attachment
        # uses the same actual R2 binding, not an in-memory test bucket. Asset
        # claim precedes R2 DELETE; neither ref nor post may protect this one.
        cancelled_unknown = cancel(fault_ctx, topic_id, unknown_operation)
        assert cancelled_unknown.status == 200, cancelled_unknown.text()[:150]
        assert sql("select attachment_id from forum_attachment_draft_refs where attachment_id=$1",
                   [unknown_asset]) == []
        # Simulate a committed delete claim whose physical DELETE ACK was
        # lost. Before lease expiry the actual cleanup processor must leave
        # its R2 object alone; after expiry it resumes the same durable claim.
        lease_token = str(uuid4())
        sql("""update forum_attachments
          set created_at=now()-interval '2 hours',
            cleanup_status='deleting', cleanup_claim_token=$2,
            cleanup_claimed_at=now()
          where id=$1""", [unknown_asset, lease_token])
        early = local_storage_probe(fault_ctx, "cleanup")
        assert early["deleted"] == 0, early
        assert sql("""select cleanup_status,cleanup_claim_token
          from forum_attachments where id=$1""", [unknown_asset]) == [{
            "cleanup_status": "deleting", "cleanup_claim_token": lease_token,
        }]
        assert local_storage_probe(fault_ctx, "head", committed_key)["exists"] is True
        sql("""update forum_attachments
          set cleanup_claimed_at=now()-interval '6 minutes'
          where id=$1""", [unknown_asset])
        sweep = local_storage_probe(fault_ctx, "cleanup")
        assert sweep["deleted"] >= 1, sweep
        assert sql("select id from forum_attachments where id=$1", [unknown_asset]) == []
        assert local_storage_probe(fault_ctx, "head", committed_key)["exists"] is False
        record("actual-local-r2-cancelled-orphan-expired-claim-lease-recovery",
               not_deleted_before_lease=True, deleted_after_lease=True,
               absent_from_r2=True)

        # A real long-lived HTTP upload has PREPARING and READY committed, but
        # its payload body is still withheld. The actual cleanup processor wins
        # the aged unregistered journal claim, deletes the local R2 reservation,
        # and removes the journal BEFORE the body is released. A late conditional
        # PUT must not recreate an object, asset, ref or 201 after cleanup.
        author_page.goto(base + "/en/topics/" + topic_id, wait_until="networkidle")
        author_ctx.unroute("**/*")
        claimed_operation, claimed_asset = str(uuid4()), str(uuid4())
        existing_keys = {row["object_key"] for row in sql(
            "select object_key from forum_attachment_upload_objects")}
        cookie = "; ".join(item["name"] + "=" + item["value"]
                           for item in author_ctx.cookies(base))
        assert cookie
        held = HeldHttpUpload()
        try:
            assert held.send({
                "action": "start", "cookie": cookie, "attachment": claimed_asset,
                "operation": claimed_operation, "context": context_key,
            }) == {"event": "first-chunk-sent", "bytes": 8192}
            def ready_for_cleanup():
                rows = sql("""select object_key,reservation_etag
                  from forum_attachment_upload_objects
                  where reservation_etag is not null""")
                return next((row for row in rows
                             if row["object_key"] not in existing_keys), None)
            ready_claim = wait_for(ready_for_cleanup, "READY before actual R2 cleanup", 25)
            key = ready_claim["object_key"]
            assert local_storage_probe(author_ctx, "head", key)["exists"] is True
            sql("""update forum_attachment_upload_objects
              set created_at=now()-interval '2 hours' where object_key=$1""", [key])
            cleanup = local_storage_probe(author_ctx, "cleanup")
            assert cleanup["deleted"] >= 1, cleanup
            assert sql("select object_key from forum_attachment_upload_objects where object_key=$1",
                       [key]) == []
            assert local_storage_probe(author_ctx, "head", key)["exists"] is False
            assert held.send({"action": "release"})["event"] == "remainder-released"
            result = held.read()
            assert result.get("status") in (400, 503), result
            assert result.get("status") != 201
            assert "no-store" in (result.get("cache") or ""), result
        finally:
            held.close()
        assert sql("select id from forum_attachments where id=$1", [claimed_asset]) == []
        assert sql("select attachment_id from forum_attachment_draft_refs where attachment_id=$1",
                   [claimed_asset]) == []
        assert local_storage_probe(author_ctx, "head", key)["exists"] is False
        record("actual-cleanup-claim-deletes-r2-before-late-conditional-put",
               no_resurrection=True, actual_r2_deleted=True, no_asset_ref=True)


        # Diagnose a genuinely stuck Playwright route/PG callback rather than
        # consuming the full CI job budget without a traceback.
        import faulthandler
        faulthandler.dump_traceback_later(180, exit=True)

        # K5 mounted-editor lifecycle matrix. These are real React-rendered
        # reply forms and XHRs against the built Worker/Better Auth/local R2.
        # A lost HTTP ACK is simulated only after route.fetch sees real 201.
        retry_ctx, retry_page, retry_id = account(browser, "ui-retry", "203.0.113.172")
        remove_ctx, remove_page, remove_id = account(browser, "ui-remove", "203.0.113.173")
        cancel_ctx, cancel_page, cancel_id = account(browser, "ui-cancel", "203.0.113.174")
        denied_ctx, denied_page, denied_id = account(browser, "ui-denied", "203.0.113.175")

        def mounted_reply(page):
            response = page.goto(base + "/en/topics/" + topic_id, wait_until="networkidle")
            assert response and response.status == 200
            form = page.locator('form.topic-reply-form')
            expect(form).to_have_count(1)
            resume = page.locator("button.forum-composer-resume")
            if resume.count() and resume.is_visible():
                resume.click()
            expect(form).to_be_visible()
            if form.locator(".markdown-editor").get_attribute("data-authoring") != "advanced":
                form.get_by_role("button", name="Advanced", exact=True).click()
            return form, form.locator("textarea#reply-body")

        retry_form, retry_editor = mounted_reply(retry_page)
        retry_editor.fill("K5 mounted text survives missing upload acknowledgement")
        retry_operation = retry_form.locator('input[name="editorOperationId"]').input_value()
        retry_bytes = b"K5 genuine selected File retained through ambiguous ACK"
        routed = []
        def dropped_browser_ack(route):
            request = route.request
            routed.append({
                "operation": request.headers.get("x-vico-operation-id"),
                "asset": request.headers.get("x-vico-attachment-id"),
                "bytes": request.post_data_buffer,
            })
            upstream = route.fetch()
            assert upstream.status == 201, (upstream.status, upstream.text()[:220])
            route.abort("failed")
        retry_page.route("**/api/attachments", dropped_browser_ack)
        try:
            retry_form.locator('input[type="file"]').set_input_files({
                "name": "ui-retry.txt", "mimeType": "text/plain",
                "buffer": retry_bytes,
            })
            expect(retry_form.locator(".markdown-editor-attachment.is-error")).to_have_count(1)
        finally:
            retry_page.unroute("**/api/attachments", dropped_browser_ack)
        assert len(routed) == 1 and routed[0]["operation"] == retry_operation
        assert routed[0]["bytes"] == retry_bytes
        assert json.loads(retry_form.locator('input[name="editorAttachmentIds"]').input_value()) == []
        expect(retry_editor).to_have_value("K5 mounted text survives missing upload acknowledgement")
        committed_retry = sql("""select id,object_key from forum_attachments
          where id=$1 and owner_id=$2""", [routed[0]["asset"], retry_id])
        assert len(committed_retry) == 1 and committed_retry[0]["object_key"]
        retry_before = stats(retry_id)
        retry_responses = []
        retry_page.on("request", lambda request: retry_responses.append({
            "operation": request.headers.get("x-vico-operation-id"),
            "asset": request.headers.get("x-vico-attachment-id"),
            "bytes": request.post_data_buffer,
        }) if request.url == base + "/api/attachments"
             and request.method == "POST" else None)
        with retry_page.expect_response(
            lambda response: response.url == base + "/api/attachments"
            and response.request.method == "POST", timeout=30000
        ) as retry_ack:
            retry_form.locator(".markdown-editor-attachment.is-error").get_by_role(
                "button", name="Retry", exact=True).click()
        assert retry_ack.value.status == 201
        expect(retry_form.locator(".markdown-editor-attachment.is-stored")).to_have_count(1)
        assert len(retry_responses) == 1, retry_responses
        assert retry_responses[0] == routed[0], (retry_responses, routed)
        assert stats(retry_id) == retry_before
        assert json.loads(retry_form.locator('input[name="editorAttachmentIds"]').input_value()) == [
            routed[0]["asset"]]
        expect(retry_editor).to_have_value("K5 mounted text survives missing upload acknowledgement")
        assert private_file(retry_ctx, topic_id, retry_operation,
                            routed[0]["asset"], "text").body() == retry_bytes
        record("chromium-mounted-lost-ack-error-retry-same-id-file-text-and-r2",
               real_initial_commit=True, no_false_selection=True,
               same_file_retry=True, same_physical_asset=True)

        # Remove while POST is genuinely blocked inside the PostgreSQL draft
        # scope. The Worker may later commit 201; UI selection stays removed
        # and there is no per-file DELETE (server pool is intentionally intact).
        remove_form, remove_editor = mounted_reply(remove_page)
        remove_editor.fill("K5 Remove must not erase active Markdown source")
        remove_operation = remove_form.locator('input[name="editorOperationId"]').input_value()
        remove_uploads = []
        remove_deletes = []
        def observe_remove_request(request):
            if request.url != base + "/api/attachments":
                return
            if request.method == "POST":
                remove_uploads.append(request.headers.get("x-vico-attachment-id"))
            if request.method == "DELETE":
                remove_deletes.append(request.headers)
        remove_page.on("request", observe_remove_request)
        remove_gate = PgBarrier()
        try:
            remove_gate.send({
                "action": "begin-scope", "actor": remove_id, "context": context_key,
            })
            remove_form.locator('input[type="file"]').set_input_files({
                "name": "ui-remove-pending.txt", "mimeType": "text/plain",
                "buffer": b"K5 pending Remove after PG admission barrier",
            })
            wait_blocking(remove_gate.backend_pid, "mounted Remove pending POST")
            expect(remove_form.locator(".markdown-editor-attachment.is-uploading")).to_have_count(1)
            with remove_page.expect_response(
                lambda response: response.url == base + "/api/attachments"
                and response.request.method == "POST", timeout=30000
            ) as removed_late_ack:
                remove_form.locator(".markdown-editor-attachment.is-uploading").get_by_role(
                    "button", name="Remove", exact=True).click()
                assert remove_form.locator(".markdown-editor-attachment").count() == 0
                remove_gate.send({"action": "commit"})
            assert removed_late_ack.value.status == 201
        finally:
            remove_gate.close()
        assert len(remove_uploads) == 1 and remove_uploads[0]
        assert remove_deletes == [], remove_deletes
        assert remove_form.locator(".markdown-editor-attachment").count() == 0
        assert remove_form.locator('input[name="editorOperationId"]').input_value() == remove_operation
        assert json.loads(remove_form.locator('input[name="editorAttachmentIds"]').input_value()) == []
        expect(remove_editor).to_have_value("K5 Remove must not erase active Markdown source")
        assert sql("""select attachment_id from forum_attachment_draft_refs
          where owner_id=$1 and context_key=$2 and draft_id=$3 and attachment_id=$4""",
          [remove_id, context_key, remove_operation, remove_uploads[0]]) == [
              {"attachment_id": remove_uploads[0]}]
        record("chromium-mounted-remove-pending-real-late-201-keeps-source-and-excludes-selection",
               actual_pg_barrier=True, no_per_file_delete=True, server_pool_preserved=True)

        # Cancel on a real pending XHR aborts the browser request, rotates the
        # mounted operation and resets the editor, while a separate whole-op
        # DELETE retires the old temporary generation through the real Worker.
        cancel_form, cancel_editor = mounted_reply(cancel_page)
        cancel_editor.fill("K5 Cancel resets only this mounted editor")
        cancel_operation = cancel_form.locator('input[name="editorOperationId"]').input_value()
        cancel_uploads = []
        cancel_page.on("request", lambda request: cancel_uploads.append(
            request.headers.get("x-vico-attachment-id")
        ) if request.url == base + "/api/attachments"
             and request.method == "POST" else None)
        cancel_gate = PgBarrier()
        try:
            cancel_gate.send({
                "action": "begin-scope", "actor": cancel_id, "context": context_key,
            })
            cancel_form.locator('input[type="file"]').set_input_files({
                "name": "ui-cancel-pending.txt", "mimeType": "text/plain",
                "buffer": b"K5 Cancel pending upload never republishes",
            })
            wait_blocking(cancel_gate.backend_pid, "mounted Cancel pending POST")
            expect(cancel_form.locator(".markdown-editor-attachment.is-uploading")).to_have_count(1)
            with cancel_page.expect_response(
                lambda response: response.url == base + "/api/attachments"
                and response.request.method == "DELETE", timeout=30000
            ) as cancel_ack:
                cancel_form.locator(".markdown-editor-actions").get_by_role(
                    "button", name="Cancel", exact=True).click()
                cancel_gate.send({"action": "commit"})
            assert cancel_ack.value.status == 200
            assert cancel_ack.value.json()["outcome"] == "cancelled"
        finally:
            cancel_gate.close()
        assert len(cancel_uploads) == 1
        assert cancel_form.locator('input[name="editorOperationId"]').input_value() != cancel_operation
        assert json.loads(cancel_form.locator('input[name="editorAttachmentIds"]').input_value()) == []
        expect(cancel_editor).to_have_value("")
        assert not cancel_form.is_visible()
        cancel_page.locator("button.forum-composer-resume").click()
        expect(cancel_form).to_be_visible()
        assert cancel_form.locator(".markdown-editor-attachment").count() == 0
        assert sql("""select attachment_id from forum_attachment_draft_refs
          where owner_id=$1 and context_key=$2 and draft_id=$3""",
          [cancel_id, context_key, cancel_operation]) == []
        record("chromium-mounted-cancel-pending-aborts-xhr-retires-operation-and-resets-ui",
               actual_pg_barrier=True, canonical_delete=True, new_operation=True)

        # When an already mounted actor becomes inactive, explicit Retry and
        # server Cancel both fail with controlled 401; local editing/Cancel
        # still function and do not fabricate a successful upload or published
        # attachment. First fail only the transport, keeping the File in memory.
        denied_form, denied_editor = mounted_reply(denied_page)
        denied_editor.fill("K5 inactive Retry keeps entered text and selected File")
        denied_operation = denied_form.locator('input[name="editorOperationId"]').input_value()
        denied_bytes = b"K5 user File is retained across local error and 401"
        captured_denied = []
        def initial_network_failure(route):
            captured_denied.append({
                "operation": route.request.headers.get("x-vico-operation-id"),
                "asset": route.request.headers.get("x-vico-attachment-id"),
                "bytes": route.request.post_data_buffer,
            })
            route.abort("failed")
        denied_page.route("**/api/attachments", initial_network_failure)
        try:
            denied_form.locator('input[type="file"]').set_input_files({
                "name": "ui-inactive-retry.txt", "mimeType": "text/plain",
                "buffer": denied_bytes,
            })
            expect(denied_form.locator(".markdown-editor-attachment.is-error")).to_have_count(1)
        finally:
            denied_page.unroute("**/api/attachments", initial_network_failure)
        assert len(captured_denied) == 1
        assert captured_denied[0]["bytes"] == denied_bytes
        assert captured_denied[0]["operation"] == denied_operation
        denied_before = stats(denied_id)
        deactivate(denied_id)
        denied_retries = []
        denied_page.on("request", lambda request: denied_retries.append({
            "operation": request.headers.get("x-vico-operation-id"),
            "asset": request.headers.get("x-vico-attachment-id"),
            "bytes": request.post_data_buffer,
        }) if request.url == base + "/api/attachments"
             and request.method == "POST" else None)
        with denied_page.expect_response(
            lambda response: response.url == base + "/api/attachments"
            and response.request.method == "POST", timeout=30000
        ) as denied_retry_ack:
            denied_form.locator(".markdown-editor-attachment.is-error").get_by_role(
                "button", name="Retry", exact=True).click()
        refused(denied_retry_ack.value, 401)
        assert denied_retries == captured_denied, (denied_retries, captured_denied)
        expect(denied_form.locator(".markdown-editor-attachment.is-error")).to_have_count(1)
        expect(denied_editor).to_have_value("K5 inactive Retry keeps entered text and selected File")
        assert json.loads(denied_form.locator('input[name="editorAttachmentIds"]').input_value()) == []
        assert stats(denied_id) == denied_before
        with denied_page.expect_response(
            lambda response: response.url == base + "/api/attachments"
            and response.request.method == "DELETE", timeout=30000
        ) as denied_cancel_ack:
            denied_form.locator(".markdown-editor-actions").get_by_role(
                "button", name="Cancel", exact=True).click()
        refused(denied_cancel_ack.value, 401)
        assert denied_form.locator('input[name="editorOperationId"]').input_value() != denied_operation
        expect(denied_editor).to_have_value("")
        assert json.loads(denied_form.locator('input[name="editorAttachmentIds"]').input_value()) == []
        assert stats(denied_id) == denied_before
        record("chromium-mounted-inactive-retry-401-preserves-file-text-cancel-401-local-reset",
               same_file_retry=True, private_no_store=True, no_false_stored=True,
               local_cancel_survives_denial=True)

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
