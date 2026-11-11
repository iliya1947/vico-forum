"""SA03: real Chromium -> built Worker -> Better Auth -> disposable PostgreSQL 17.

Synthetic account/History/session fixtures are explicitly test data, not provider activity.
No production, external OAuth, deployed Owner binding or real user data is touched.
"""
import argparse
import base64
import json
import os
from contextlib import contextmanager
from pathlib import Path
import shutil
import subprocess
import time
from urllib.parse import quote, urlparse
from uuid import uuid4

from playwright.sync_api import expect, sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--url", default="http://127.0.0.1:4197")
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
base = args.url.rstrip("/")
database = os.environ.get("DATABASE_URL", "")
assert urlparse(base).hostname in ("localhost", "127.0.0.1")
assert urlparse(database).hostname in ("localhost", "127.0.0.1")
assert urlparse(database).path.endswith("_test")
repo = Path(__file__).resolve().parents[3]
node = shutil.which("node")
assert node
args.output.mkdir(parents=True, exist_ok=True)
owner_id = "sa03-synthetic-owner"
prefix = "sa03-" + uuid4().hex
records, page_errors, external = [], [], []


def sql(statement, params=None):
    js = """import pg from 'pg';
const input=JSON.parse(await new Promise(resolve=>{let s='';
process.stdin.on('data',b=>s+=b);process.stdin.on('end',()=>resolve(s));}));
const c=new pg.Client({connectionString:process.env.DATABASE_URL});
await c.connect();
try{console.log(JSON.stringify((await c.query(input.statement,input.params)).rows));}
finally{await c.end();}"""
    done = subprocess.run(
        [node, "--input-type=module", "-e", js], cwd=repo, text=True,
        input=json.dumps({"statement": statement, "params": params or []}),
        capture_output=True, check=True,
    )
    return json.loads(done.stdout)


def until(statement, params=None, predicate=bool, seconds=14):
    rows = []
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        rows = sql(statement, params)
        if predicate(rows):
            return rows
        time.sleep(0.25)
    raise AssertionError(("expected durable synthetic test evidence", statement, rows))


@contextmanager
def locked(table):
    """Exclusively lock one source, so a real bounded PostgreSQL query times out."""
    assert table in ("account", "owner_events")
    js = """import pg from 'pg';
const c=new pg.Client({connectionString:process.env.DATABASE_URL});
await c.connect();await c.query('begin');
await c.query('lock table "'+process.argv[1]+'" in access exclusive mode');
console.log('LOCKED');
process.stdin.once('data',async()=>{await c.query('rollback');await c.end();});"""
    child = subprocess.Popen(
        [node, "--input-type=module", "-e", js, table], cwd=repo,
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, bufsize=1,
    )
    try:
        assert child.stdout.readline().strip() == "LOCKED", table
        yield
    finally:
        if child.poll() is None:
            child.stdin.write("release\n")
            child.stdin.flush()
        child.stdin.close()
        child.wait(timeout=20)
        assert child.returncode == 0, (table, child.returncode, child.stderr.read())
        child.stdout.close()
        child.stderr.close()


def record(name, **facts):
    row = {"case": name, **facts}
    records.append(row)
    print("SA03_ACCEPTANCE " + json.dumps(row, ensure_ascii=False), flush=True)


def guarded(ctx):
    ctx.route("**/*", lambda route: route.continue_()
              if route.request.url.startswith(base + "/")
              else (external.append(route.request.url), route.abort())[-1])


def no_store(response):
    parts = {x.strip().lower() for x in response.headers.get("cache-control", "").split(",")}
    assert {"private", "no-store"} <= parts, (response.url, response.status, response.headers)


def req(ctx, path, status=200, follow=True):
    response = ctx.request.get(base + path, timeout=30000, max_redirects=20 if follow else 0)
    assert response.status == status, (path, response.status, response.text()[:230])
    no_store(response)
    return response


def data_path(path):
    return path.replace("?", ".data?", 1) if "?" in path else path + ".data"


def document(page, path, status=200):
    response = page.goto(base + path, wait_until="networkidle")
    assert response is not None and response.status == status, (
        path, getattr(response, "status", None), page.url,
    )
    no_store(response)
    return response


def account(browser, name, ip):
    ctx = browser.new_context(
        viewport={"width": 1280, "height": 900}, service_workers="block",
        extra_http_headers={"cf-connecting-ip": ip},
    )
    guarded(ctx)
    email = prefix + "-" + name + "@test.invalid"
    password = "sa03-local-pass-" + name + "-0123456789"
    created = ctx.request.post(base + "/api/auth/sign-up/email",
        headers={"Origin": base}, data={"name": "SA03 " + name, "email": email, "password": password})
    assert created.status == 200, (name, created.status, created.text()[:200])
    page = ctx.new_page()
    page.set_default_timeout(30000)
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    return ctx, page, created.json()["user"]["id"], email, password


def post_form(ctx, path, values, status=200, redirect=False):
    response = ctx.request.post(base + path, headers={"Origin": base},
                                form=values, max_redirects=0 if redirect else 20)
    assert response.status == status, (path, response.status, response.text()[:230])
    no_store(response)
    return response


def history_ids(page):
    return [item.locator("dl dd").first.inner_text().rsplit("/", 1)[-1].strip()
            for item in page.locator("#owner-history li[data-history-origin]").all()]


def session_ids(page):
    return [item.locator("p bdi").first.inner_text()
            for item in page.locator("#owner-sessions li").all()]


def bad_cursor(resource, target, origin=None):
    value = {"v": 1, "resource": resource, "targetId": target,
             "at": "2026-02-31T00:00:00.000000Z", "id": "fixture"}
    if origin:
        value["origin"] = origin
    encoded = base64.urlsafe_b64encode(json.dumps(value, separators=(",", ":")).encode()).rstrip(b"=").decode()
    return "v1." + encoded


try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            channel=os.environ.get("PLAYWRIGHT_CHANNEL", "chromium"),
            headless=True, args=["--no-sandbox"],
        )
        guest_ctx = browser.new_context(service_workers="block")
        guarded(guest_ctx)
        guest = guest_ctx.new_page()
        guest.on("pageerror", lambda error: page_errors.append(str(error)))

        owner_ctx, owner, owner_original, owner_email, owner_password = account(
            browser, "owner", "203.0.113.111")
        target_ctx, target, target_id, target_email, target_password = account(
            browser, "target", "203.0.113.112")
        unrelated_ctx, unrelated, unrelated_id, unrelated_email, unrelated_password = account(
            browser, "unrelated", "203.0.113.113")
        manager_ctx, manager, manager_id, manager_email, manager_password = account(
            browser, "manager", "203.0.113.114")
        sql('insert into "user"(id,name,email) values($1,$2,$3)',
            [owner_id, "SA03 Bound Owner", prefix + "-bound@test.invalid"])
        moved = sql('update "session" set user_id=$1 where user_id=$2 returning id',
                    [owner_id, owner_original])
        assert len(moved) == 1
        owner_session = moved[0]["id"]
        target_path = "/en/users/" + quote(target_id, safe="")
        other_path = "/en/users/" + quote(unrelated_id, safe="")
        owner_path = "/en/users/" + quote(owner_id, safe="")
        legacy_path = "/en/admin/users/" + quote(target_id, safe="")
        target_name = "SA03 target"

        def viewer(what, ctx, page):
            document(page, target_path)
            for sensitive in ("#owner-account", "#owner-history"):
                expect(page.locator(sensitive)).to_have_count(0)
            for suffix in (target_path, data_path(target_path)):
                body = req(ctx, suffix).text()
                assert target_email not in body, (what, "target private email", suffix)
                assert "owner-sessions" not in body, (what, "private marker", suffix)

        # Actual Better Auth account and session cookies, not mock framework contexts.
        for actor, ctx, page in (
            ("guest", guest_ctx, guest),
            ("target-self", target_ctx, target),
            ("other-member", unrelated_ctx, unrelated),
            ("ordinary-manager", manager_ctx, manager),
        ):
            viewer(actor, ctx, page)
            expect(page.locator("#authorization")).to_have_count(0)
            expect(page.locator("#measures")).to_have_count(0)
        document(target, target_path + "?edit=1")
        expect(target.locator('form:has(input[name="intent"][value="save-profile"])')).to_have_count(1)
        document(unrelated, target_path + "?edit=1")
        expect(unrelated.locator('form:has(input[name="intent"][value="save-profile"])')).to_have_count(0)
        for ctx in (guest_ctx, target_ctx, unrelated_ctx, manager_ctx):
            req(ctx, target_path + "?historyBefore=bad&sessionsBefore=bad")
            req(ctx, data_path(target_path + "?historyBefore=bad&sessionsBefore=bad"))
        for ctx, status in ((guest_ctx, 401), (target_ctx, 403), (manager_ctx, 403)):
            req(ctx, legacy_path, status, follow=False)
        for suffix in (target_path, data_path(target_path)):
            req(guest_ctx, suffix)
        record("real-better-auth-public-self-and-guest-private-admission")

        # Original profile POST stays same-subject only, even for bound Owner.
        forbidden = post_form(owner_ctx, target_path, {
            "intent": "save-profile", "bio": "Forged Owner mutation",
            "githubUrl": "", "websiteUrl": "",
        }, status=403)
        assert "Forged Owner mutation" not in forbidden.text()
        saved = post_form(target_ctx, target_path, {
            "intent": "save-profile", "bio": "SA03 subject-edited public bio",
            "githubUrl": "", "websiteUrl": "",
        }, status=302, redirect=True)
        assert saved.headers.get("location") == target_path + "?saved=1"
        assert sql("select bio from forum_profiles where user_id=$1", [target_id]) == [
            {"bio": "SA03 subject-edited public bio"}]
        assert "Forged Owner mutation" not in req(guest_ctx, target_path).text()
        record("real-self-edit-no-foreign-write-and-private-redirect")

        # Exact target-scoped current measure, with canonical existing AP10 writer.
        measure_id = str(uuid4())
        created = post_form(owner_ctx, "/en/admin/measures", {
            "intent": "create", "measureId": measure_id, "targetId": target_id,
            "reason": "SA03 actual target measure", "expiresAt": "",
            "restriction": "replies.create",
        }, status=302, redirect=True)
        assert created.headers.get("location", "").endswith("/admin/measures/" + measure_id)
        measure_history = sql("select id from admin_history where target_type='user-measure' and target_id=$1",
                              [measure_id])
        assert len(measure_history) == 1
        record("real-ap10-source-action-and-native-user-measure-history")

        # SA03-MIRA-01: exact Owner self is read through ownList, so both empty-list
        # and populated measure destinations must use the canonical own routes.
        document(owner, owner_path)
        expect(owner.locator("#measures")).to_have_count(1)
        expect(owner.locator("#measures .admin-forum-objects li")).to_have_count(0)
        expect(owner.locator('#measures a[href="/en/account/measures"]')).to_have_count(1)
        expect(owner.locator('#measures a[href^="/en/admin/measures"]')).to_have_count(0)
        req(owner_ctx, "/en/account/measures")
        record("mira01-owner-self-zero-measure-route-not-forbidden-admin")

        # Historical measure fixture deliberately injected into disposable DB:
        # the current AP10 writer correctly forbids targeting exact Owner.
        # Such a retained row can exist if its target later becomes bound Owner.
        owner_measure_id = str(uuid4())
        sql("""insert into user_measures
          (id,target_user_id,issuer_user_id,issuer_authority_floor,
           create_fingerprint,initial_reason)
          values($1,$2,$3,1,$4,$5)""",
          [owner_measure_id, owner_id, manager_id,
           "d"*64, "SA03 synthetic retained Owner-self measure"])
        sql("""insert into user_measure_restrictions
          (measure_id,restriction_key,enabled) values($1,'replies.create',true)""",
          [owner_measure_id])
        document(owner, owner_path)
        expect(owner.locator("#measures .admin-forum-objects > li")).to_have_count(1)
        expect(owner.locator(
            '#measures a[href="/en/account/measures/' + owner_measure_id + '"]'
        )).to_have_count(1)
        expect(owner.locator('#measures a[href="/en/account/measures"]')).to_have_count(1)
        expect(owner.locator('#measures a[href^="/en/admin/measures"]')).to_have_count(0)
        req(owner_ctx, "/en/account/measures/" + owner_measure_id)
        req(owner_ctx, "/en/admin/measures/" + owner_measure_id, 403)
        req(owner_ctx, "/en/admin/measures?target=" + owner_id, 403)
        record("mira01-owner-self-measure-detail-and-index-live-own-authority")

        # One canonical authorization writer; grant/revoke live permissions between reads.
        grants = set()
        known = ("admin.users.read", "access.authorization.manage", "admin.users.blocks.manage")

        def permissions(*enabled):
            desired = set(enabled)
            for key in known:
                if (key in grants) == (key in desired):
                    continue
                response = post_form(owner_ctx, "/en/admin/authorization", {
                    "intent": "override", "userId": manager_id, "permission": key,
                    "effect": "allow" if key in desired else "inherit",
                })
                assert response.status == 200, key
                if key in desired:
                    grants.add(key)
                else:
                    grants.discard(key)

        permissions("admin.users.read")
        document(manager, target_path)
        expect(manager.locator("#measures,#authorization,#owner-account")).to_have_count(0)
        direct = req(manager_ctx, legacy_path, 302, follow=False)
        assert direct.headers.get("location") == target_path
        document(manager, legacy_path)
        assert manager.url == base + target_path
        assert target_email not in manager.content()
        record("directory-only-legacy-redirect-and-no-privileged-data")

        permissions("access.authorization.manage")
        document(manager, target_path)
        expect(manager.locator("#authorization")).to_have_count(1)
        expect(manager.locator("#authorization form")).to_have_count(0)
        expect(manager.locator("#measures,#owner-account")).to_have_count(0)
        req(manager_ctx, legacy_path, 403, follow=False)
        record("authorization-only-no-directory-readonly-targeted-state")

        permissions("admin.users.blocks.manage")
        document(manager, target_path)
        expect(manager.locator("#authorization,#owner-account")).to_have_count(0)
        expect(manager.locator("#measures")).to_have_count(1)
        expect(manager.locator("#measures")).to_contain_text("SA03 actual target measure")
        expect(manager.locator('#measures a[href="/en/admin/measures/' + measure_id + '"]')).to_have_count(1)
        expect(manager.locator('#measures a[href="/en/admin/measures?target=' + target_id + '"]')).to_have_count(1)
        document(manager, owner_path)
        expect(manager.locator("#measures")).to_have_count(0)
        record("measures-only-actual-ap10-authority-and-prohibited-owner-target")

        permissions("access.authorization.manage", "admin.users.blocks.manage")
        document(manager, target_path)
        expect(manager.locator("#authorization")).to_have_count(1)
        expect(manager.locator("#authorization form")).to_have_count(0)
        expect(manager.locator("#measures")).to_have_count(1)
        expect(manager.locator("#owner-account,#owner-history")).to_have_count(0)
        for suffix in (target_path, data_path(target_path)):
            body = req(manager_ctx, suffix).text()
            assert target_email not in body and measure_id in body
        permissions("access.authorization.manage")
        document(manager, target_path)
        expect(manager.locator("#measures")).to_have_count(0)
        expect(manager.locator("#authorization")).to_have_count(1)
        permissions("access.authorization.manage", "admin.users.blocks.manage")
        document(manager, target_path)
        expect(manager.locator("#measures")).to_have_count(1)
        record("combined-independent-sections-live-revoke-restore-no-owner")

        # Source evidence: Better Auth facts and an authorized AP10 native target join.
        b_facts = until(
            "select id,kind from owner_events where source='auth' and target_user_id=$1",
            [target_id],
            lambda rows: {"account.created", "auth.methodLinked", "auth.sessionCreated"}
            <= {row["kind"] for row in rows})
        c_facts = until(
            "select id from owner_events where source='auth' and target_user_id=$1",
            [unrelated_id])
        assert b_facts and c_facts
        evidence_id = "sa03-evidence-" + uuid4().hex
        filename_secret = "private-attachment-name-" + uuid4().hex
        sql("""insert into forum_attachment_security_events
          (id,upload_id,uploaded_by_user_id,context_key,draft_id,file_name,
           declared_mime,detected_type,reason,declared_byte_size)
          values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)""",
            [evidence_id, "sa03-upload-" + uuid4().hex, target_id,
             "private-case-marker", "private-draft-marker", filename_secret,
             "application/octet-stream", "binary", "mismatch", 13])
        request_denied = req(target_ctx, "/en/super-admin", 403)
        patterns = until(
            "select id from owner_attempt_patterns where actor_user_id=$1 and operation='owner-guard'",
            [target_id])
        assert patterns

        # Extra fixture facts stress SQL target filtering before LIMIT, actor==subject
        # dedup, equal-timestamp keysets and 25+1 pagination; they are NOT auth transitions.
        b_samples = sql("""insert into owner_events
          (id,occurred_at,source,occurrence_key,kind,monitor_key,entity_type,entity_id,
           actor_user_id,target_user_id,payload)
          select gen_random_uuid(),now()-interval '1 day','auth',
           $2||'-target-'||g,'account.created','accounts.users','user',$1,$1,$1,'{}'::jsonb
          from generate_series(1,29) g returning id""", [target_id, prefix])
        c_noise = sql("""insert into owner_events
          (id,occurred_at,source,occurrence_key,kind,monitor_key,entity_type,entity_id,
           actor_user_id,target_user_id,payload)
          select gen_random_uuid(),now()+interval '1 day','auth',
           $2||'-other-'||g,'account.created','accounts.users','user',$1,$1,$1,'{}'::jsonb
          from generate_series(1,60) g returning id""", [unrelated_id, prefix])
        assert len(b_samples) == 29 and len(c_noise) == 60
        record("real-attributed-source-and-disposable-noise-fixtures")

        # A real Owner read exposes only safe target DTO, source identities, no tokens.
        document(owner, target_path)
        expect(owner.locator("#owner-account")).to_have_count(1)
        expect(owner.locator("#owner-history")).to_have_count(1)
        expect(owner.locator("#authorization")).to_have_count(1)
        expect(owner.locator("#authorization form")).not_to_have_count(0)
        expect(owner.locator("#measures")).to_contain_text("SA03 actual target measure")
        expect(owner.locator("#owner-account")).to_contain_text(target_email)
        assert unrelated_email not in owner.content()
        assert "Current session" not in owner.locator("#owner-sessions").inner_text()
        assert filename_secret not in owner.content()
        assert "private-case-marker" not in owner.content()
        assert "private-draft-marker" not in owner.content()

        # All source references must keep their native IDs, not synthetic copies.
        own_history = req(owner_ctx, data_path(target_path)).text()
        for fact in b_facts:
            assert fact["id"] in own_history, fact["id"]
        assert measure_history[0]["id"] in own_history
        assert evidence_id in own_history
        assert patterns[0]["id"] in own_history
        for fact in c_facts:
            assert fact["id"] not in own_history, ("foreign user fact", fact["id"])
        for fact in c_noise:
            assert fact["id"] not in own_history
        assert filename_secret not in own_history
        assert "private-case-marker" not in own_history
        assert "private-draft-marker" not in own_history
        record("exact-owner-authoritative-four-sources-private-target-only")

        # More than 25 sessions, same created timestamp, active and expired, invalid UA/IP.
        session_samples = sql("""insert into "session"
          (id,token,user_id,created_at,updated_at,expires_at,user_agent,ip_address)
          select 'sa03-fixture-'||g,$2||'-token-'||g,$1,
            timestamp '2026-10-01 12:00:00',now(),now()+interval '10 day',
            'Synthetic UA '||g,'192.0.2.10'
          from generate_series(1,29) g returning id""", [target_id, prefix])
        assert len(session_samples) == 29
        sql("""update "session" set expires_at=now()-interval '1 day',
          user_agent=chr(1)||'unsafe-device-label',ip_address='not-a-real-address'
          where id='sa03-fixture-1'""")
        document(owner, target_path)
        expect(owner.locator("#owner-sessions li")).to_have_count(25)
        assert "unsafe-device-label" not in owner.content()
        assert "not-a-real-address" not in owner.content()
        session_href = owner.locator("#owner-sessions a").get_attribute("href")
        assert session_href and "sessionsBefore=" in session_href
        first_session_ids = set(session_ids(owner))
        document(owner, session_href)
        later_session_ids = set(session_ids(owner))
        assert first_session_ids.isdisjoint(later_session_ids)
        assert set(row["id"] for row in session_samples) <= first_session_ids | later_session_ids
        req(owner_ctx, other_path + "?sessionsBefore=" + quote(
            session_href.split("sessionsBefore=",1)[1].split("#",1)[0],safe=""), 400)
        record("safe-25-plus-session-pagination-with-exact-target-cursor")

        # History: page 1 and page 2 do not duplicate native source IDs.
        document(owner, target_path)
        expect(owner.locator("#owner-history li[data-history-origin]")).to_have_count(25)
        first_history_ids = set(history_ids(owner))
        history_href = owner.locator("#owner-history a").get_attribute("href")
        assert history_href and "historyBefore=" in history_href
        document(owner, history_href)
        second_history_ids = set(history_ids(owner))
        assert first_history_ids.isdisjoint(second_history_ids)
        assert len(first_history_ids) == 25 and len(second_history_ids) > 0
        for fact in c_noise:
            assert fact["id"] not in first_history_ids | second_history_ids
        history_cursor = history_href.split("historyBefore=", 1)[1].split("#", 1)[0]
        req(owner_ctx, other_path + "?historyBefore=" + history_cursor, 400)
        record("history-sql-person-filter-dedup-exact-origin-id-and-keyset")

        # Different cursor resources/targets, invalid calendar and multiple values.
        for path in (
            target_path + "?sessionsBefore=bad",
            target_path + "?historyBefore=bad",
            target_path + "?sessionsBefore=a&sessionsBefore=b",
            target_path + "?historyBefore=a&historyBefore=b",
            target_path + "?historyBefore=" + quote(bad_cursor(
                "profile-history", target_id, "auth-event"), safe=""),
            target_path + "?sessionsBefore=" + quote(bad_cursor(
                "profile-sessions", target_id), safe=""),
        ):
            req(owner_ctx, path, 400)
            req(owner_ctx, data_path(path), 400)
            req(manager_ctx, path)
        record("owner-cursor-400-post-admission-and-nonowner-no-private-parse")

        # Legitimate foreign-owner-view C has independent identity and method-state.
        document(owner, other_path)
        expect(owner.locator("#owner-account")).to_contain_text(unrelated_email)
        assert target_email not in owner.locator("#owner-account").inner_text()
        assert target_id not in req(owner_ctx, data_path(other_path)).text()
        token_secret = "sa03-google-access-token-" + uuid4().hex
        refresh_secret = "sa03-google-refresh-token-" + uuid4().hex
        id_secret = "sa03-google-id-token-" + uuid4().hex
        google_account_id = "sa03-google-" + uuid4().hex
        sql("""insert into account
          (id,account_id,provider_id,user_id,access_token,refresh_token,id_token,
           created_at,updated_at) values($1,$2,'google',$3,$4,$5,$6,now(),now())""",
            [google_account_id, "external-google-fixture", unrelated_id,
             token_secret, refresh_secret, id_secret])
        document(owner, other_path)
        expect(owner.locator("#owner-account")).to_contain_text("Password")
        expect(owner.locator("#owner-account")).to_contain_text("Google")
        sql("delete from account where user_id=$1 and provider_id='credential'", [unrelated_id])
        document(owner, other_path)
        expect(owner.locator("#owner-account")).not_to_contain_text("Password")
        expect(owner.locator("#owner-account")).to_contain_text("Google")
        sql("delete from account where id=$1", [google_account_id])
        document(owner, other_path)
        expect(owner.locator("#owner-account")).not_to_contain_text("Google")
        expect(owner.locator("#owner-account")).to_contain_text("None recorded")
        record("source-aware-password-google-both-google-only-none-methods")

        # Sensitive credential/provider/session contents never cross document OR .data.
        secrets = [target_password, owner_password, manager_password, unrelated_password,
                   token_secret, refresh_secret, id_secret, filename_secret]
        secrets += [r["token"] for r in sql('select token from "session" where user_id=$1', [target_id])]
        secrets += [r["password"] for r in sql(
            "select password from account where user_id=$1 and provider_id='credential'",
            [target_id])]
        for ctx, path in ((owner_ctx, target_path), (owner_ctx, other_path),
                          (manager_ctx, target_path), (target_ctx, target_path),
                          (guest_ctx, target_path)):
            for suffix in (path, data_path(path)):
                body = req(ctx, suffix).text()
                for secret in secrets:
                    assert secret and secret not in body, ("secret serialization", suffix)
                if ctx != owner_ctx:
                    assert target_email not in body
        record("secret-free-real-html-data-password-hash-tokens-and-provider-payloads")

        # Scoped dependency timeouts: exact Owner profile stays public while a
        # classified private account or History source is unavailable.
        with locked("account"):
            document(owner, target_path)
            expect(owner.locator("#owner-account")).to_contain_text(
                "This section is temporarily unavailable.")
            expect(owner.locator("#owner-history li[data-history-origin]")).not_to_have_count(0)
            assert "unavailable" in req(owner_ctx, data_path(target_path)).text()
        with locked("owner_events"):
            document(owner, target_path)
            expect(owner.locator("#owner-history")).to_contain_text(
                "This section is temporarily unavailable.")
            expect(owner.locator("#owner-account")).to_contain_text(target_email)
        document(owner, target_path)
        expect(owner.locator("#owner-account")).to_contain_text(target_email)
        expect(owner.locator("#owner-history li[data-history-origin]")).not_to_have_count(0)
        record("partial-postgresql-source-unavailable-then-independent-recovery")

        # Real re-read of the exact bound Owner identity after session reassignment.
        try:
            sql('update "session" set user_id=$1 where id=$2', [manager_id, owner_session])
            document(owner, target_path)
            expect(owner.locator("#owner-account,#owner-history")).to_have_count(0)
            assert target_email not in req(owner_ctx, data_path(target_path)).text()
        finally:
            sql('update "session" set user_id=$1 where id=$2', [owner_id, owner_session])
        document(owner, target_path)
        expect(owner.locator("#owner-account")).to_contain_text(target_email)
        document(owner, owner_path)
        expect(owner.locator("#owner-sessions")).to_contain_text("Current session")
        record("no-stale-owner-permission-after-session-identity-change-and-restore")

        # Original links, locale/RTL/responsive and keyboard without browser overflow.
        for locale, direction in (("en", "ltr"), ("ru", "ltr"), ("he", "rtl")):
            path = "/" + locale + "/users/" + quote(target_id, safe="")
            for width in (320, 768, 1280):
                owner.set_viewport_size({"width": width, "height": 900})
                document(owner, path)
                expect(owner.locator("#profile-name")).to_have_count(1)
                expect(owner.locator("#owner-account")).to_have_count(1)
                expect(owner.locator("#owner-history")).to_have_count(1)
                assert owner.locator("html").get_attribute("dir") == direction
                assert owner.locator("html").get_attribute("lang") == locale
                current, scroll = owner.evaluate("[innerWidth,document.documentElement.scrollWidth]")
                if scroll > current + 1:
                    offenders = owner.evaluate("""() => [...document.querySelectorAll("*")].map(el => {
                      const rect=el.getBoundingClientRect();
                      return {tag:el.tagName.toLowerCase(), id:el.id,
                        className:typeof el.className==="string"?el.className.slice(0,90):"",
                        text:(el.textContent||"").slice(0,90),
                        left:Math.round(rect.left),right:Math.round(rect.right),
                        width:Math.round(rect.width),scrollWidth:el.scrollWidth};
                    }).filter(x=>x.right>innerWidth+1 && x.width>0)
                      .sort((a,b)=>b.right-a.right).slice(0,25)""")
                    print("SA03_LAYOUT_OFFENDERS "+json.dumps({
                        "locale":locale,"width":width,"scroll":scroll,
                        "elements":offenders},ensure_ascii=False),flush=True)
                    owner.screenshot(path=str(args.output / (
                        "overflow-" + locale + "-" + str(width) + ".png")),full_page=True)
                assert scroll <= current + 1, ("profile overflow", locale, width, scroll)
                if width in (320, 1280):
                    owner.screenshot(path=str(args.output / (
                        "owner-" + locale + "-" + str(width) + ".png")), full_page=True)
            record("real-betterauth-owner-en-ru-he-responsive", locale=locale)
        owner.set_viewport_size({"width": 1280, "height": 900})
        document(owner, target_path)
        link = owner.locator("#owner-history a")
        expect(link).to_have_count(1)
        link.focus()
        owner.keyboard.press("Enter")
        owner.wait_for_url("**historyBefore=**")
        record("keyboard-history-native-paging")

        # The UI sign-out updates HeaderAuth before profile .data revalidation.
        # Holding only that request proves old privileged DOM disappears immediately.
        document(owner, target_path)
        expect(owner.locator("#owner-account")).to_contain_text(target_email)
        expect(owner.locator("#authorization form")).not_to_have_count(0)
        held_profile_reads = []
        def hold_profile_read(route):
            held_profile_reads.append(route)
        owner.route("**/users/*.data*", hold_profile_read)
        with owner.expect_response(lambda response:
                "/api/auth/sign-out" in response.url and response.request.method == "POST") as sign_out:
            owner.locator(".auth-sign-out").click()
        assert sign_out.value.status == 200
        expect(owner.locator('.auth-controls[data-state="guest"]')).to_have_count(1)
        for _ in range(40):
            if held_profile_reads:
                break
            owner.wait_for_timeout(100)
        assert held_profile_reads, "profile .data revalidation was not intercepted"
        expect(owner.locator("#measures,#authorization,#owner-account,#owner-history")).to_have_count(0)
        expect(owner.locator("#profile-name")).to_have_count(1)
        # Initial SSR hydration data was legitimately sent before sign-out; test visible DOM.
        assert target_email not in owner.locator("body").inner_text()
        assert target_email not in req(owner_ctx, data_path(target_path)).text()
        record("real-ui-signout-drops-private-before-held-profile-get")
        for held in held_profile_reads:
            held.continue_()
        owner.unroute("**/users/*.data*")
        expect(owner.locator("#owner-account,#owner-history,#authorization")).to_have_count(0)

        # Only a fresh authenticated Owner response can restore private sections.
        relogin = owner_ctx.request.post(base + "/api/auth/sign-in/email",
            headers={"Origin": base}, data={"email": owner_email, "password": owner_password})
        assert relogin.status == 200, (relogin.status, relogin.text()[:200])
        rebound = sql('update "session" set user_id=$1 where user_id=$2 returning id',
                      [owner_id, owner_original])
        assert len(rebound) == 1
        document(owner, target_path)
        expect(owner.locator("#owner-account")).to_contain_text(target_email)
        expect(owner.locator("#authorization form")).not_to_have_count(0)
        record("fresh-authorized-loader-restores-owner-profile")

        # LEV-02: the same mounted ProfileView must recover fresh Owner data during
        # SPA account switch, even though HeaderAuth synchronizes one effect later.
        # This uses real Better Auth session rows, the built Worker and page links.
        rebound_session = rebound[0]["id"]
        document_requests = []
        def track_document(request):
            if request.resource_type == "document" and request.url.startswith(base + "/"):
                document_requests.append(request.url)
        owner.on("request", track_document)
        try:
            # Owner -> member: no previous Owner sections may survive the fresh read.
            sql('update "session" set user_id=$1 where id=$2',
                [unrelated_id, rebound_session])
            with owner.expect_response(lambda response: ".data" in response.url
                    and response.url.startswith(base + "/en/users/")) as member_read:
                owner.locator(".auth-user").click()
            assert member_read.value.status == 200
            owner.wait_for_url(base + owner_path)
            expect(owner.locator(".auth-user")).to_contain_text("SA03 unrelated")
            expect(owner.locator("#owner-account,#owner-history,#authorization,#measures")).to_have_count(0)
            assert unrelated_email not in owner.locator("body").inner_text()

            # Member -> Owner: the first fresh authorized .data must restore all
            # sections after HeaderAuth catches up, without a second GET or reload.
            sql('update "session" set user_id=$1 where id=$2',
                [owner_id, rebound_session])
            with owner.expect_response(lambda response: ".data" in response.url
                    and response.url.startswith(base + "/en/users/")) as owner_read:
                owner.locator(".auth-user").click()
            assert owner_read.value.status == 200
            owner.wait_for_url(base + other_path)
            expect(owner.locator(".auth-user")).to_contain_text("SA03 Bound Owner")
            expect(owner.locator("#owner-account")).to_contain_text(unrelated_email)
            expect(owner.locator("#owner-history")).to_have_count(1)
            expect(owner.locator("#authorization form")).not_to_have_count(0)
            expect(owner.locator("#measures")).to_have_count(1)
            expect(owner.locator(".admin-result-success")).to_have_count(0)
            assert not document_requests, ("unexpected document reload", document_requests)
            record("real-spa-actor-switch-recovers-first-fresh-owner-dto")
        finally:
            owner.remove_listener("request", track_document)
            sql('update "session" set user_id=$1 where id=$2',
                [owner_id, rebound_session])
        assert not page_errors, page_errors
        assert not external, external
        record("no-browser-page-errors-or-external-requests")

        for ctx in (owner_ctx, target_ctx, unrelated_ctx, manager_ctx, guest_ctx):
            ctx.close()
        browser.close()
finally:
    (args.output / "results.json").write_text(json.dumps({
        "stage": "SA03-D4", "implementationHead": os.environ.get("IMPLEMENTATION_SHA"),
        "cases": records, "pageErrors": page_errors, "externalRequests": external,
    }, indent=2, ensure_ascii=False))
