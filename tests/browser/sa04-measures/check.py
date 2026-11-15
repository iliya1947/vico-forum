"""SA04-M2.3 built Worker, Better Auth, PostgreSQL 17, Chromium AP-10 actor acceptance."""
import argparse
import json
import os
import shutil
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from time import monotonic, sleep
from urllib.error import HTTPError
from urllib.parse import quote, urlencode, urlparse
from urllib.request import Request, urlopen
from uuid import uuid4
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--url", default="http://127.0.0.1:4223")
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
base = args.url.rstrip("/")
database = os.environ.get("DATABASE_URL", "")
assert urlparse(base).hostname in ("127.0.0.1", "localhost")
assert urlparse(database).hostname in ("127.0.0.1", "localhost")
assert urlparse(database).path == "/vico_sa04_m2_browser_test", "Only the disposable M2 database is supported"
repo = Path(__file__).resolve().parents[3]
node = shutil.which("node")
assert node
args.output.mkdir(parents=True, exist_ok=True)
prefix = "sa04-m2-" + uuid4().hex[:12]
owner_id = "sa04-m2-synthetic-owner"
cases, page_errors, external_requests = [], [], []

def sql(query, params=None):
    program = """import pg from 'pg';
const input=JSON.parse(await new Promise(done=>{let s='';
process.stdin.on('data',part=>s+=part);process.stdin.on('end',()=>done(s));}));
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
await client.connect();
try{console.log(JSON.stringify((await client.query(input.query,input.params)).rows??[]));}
finally{await client.end();}"""
    finished = subprocess.run([node, "--input-type=module", "-e", program], cwd=repo,
                              text=True, input=json.dumps({"query": query, "params": params or []}),
                              capture_output=True, check=True, timeout=25)
    return json.loads(finished.stdout)

def record(name, **facts):
    cases.append({"case": name, **facts})
    print("SA04_M2_CONNECTED " + json.dumps(cases[-1], ensure_ascii=False), flush=True)

def private(response, status):
    assert response.status == status, (status, response.status, response.text()[:160])
    directives = {s.strip().lower() for s in response.headers.get("cache-control", "").split(",")}
    assert {"private", "no-store"} <= directives, (status, response.headers)
    return response.text()

def http(ctx, path, fields):
    return ctx.request.post(base + path, headers={
        "Origin": base, "Content-Type": "application/x-www-form-urlencoded",
    }, data=urlencode(fields), max_redirects=0, timeout=17000)

def direct(cookie, path, fields):
    req = Request(base + path, urlencode(fields).encode(), method="POST", headers={
        "Origin": base, "Cookie": cookie,
        "Content-Type": "application/x-www-form-urlencoded",
    })
    try:
        with urlopen(req, timeout=18) as res:
            return res.status, dict(res.headers), res.read().decode()
    except HTTPError as exc:
        return exc.code, dict(exc.headers), exc.read().decode()

def direct_private(result, expected):
    status, headers, body = result
    assert status == expected, (expected, status, body[:180])
    directives = {s.strip().lower() for k, v in headers.items()
                  if k.lower() == "cache-control" for s in v.split(",")}
    assert {"private", "no-store"} <= directives, (status, headers)
    assert "M2_PRIVATE_SQL_SECRET" not in body
    return body

def cookies(ctx):
    return "; ".join(item["name"] + "=" + item["value"] for item in ctx.cookies(base))

def snapshot():
    # Exact raw persisted facts, including measure versions/appeal status and History.
    return {
        "measures": sql("select * from user_measures order by id"),
        "restrictions": sql("select * from user_measure_restrictions order by measure_id,restriction_key"),
        "appeals": sql("select * from user_measure_appeals order by measure_id,ordinal"),
        "history": sql("select * from admin_history where target_type='user-measure' order by position"),
    }

def hold_mutex():
    program = """import pg from 'pg';
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
await client.connect();await client.query('begin');
await client.query('select id from authz_mutation_lock where id=1 for update');
console.log('LOCKED');
process.stdin.once('data',async()=>{try{await client.query('commit');}
finally{await client.end();}});
"""
    handle = subprocess.Popen([node, "--input-type=module", "-e", program], cwd=repo,
                              stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                              stderr=subprocess.PIPE, text=True)
    line = handle.stdout.readline().strip()
    assert line == "LOCKED", (line, handle.stderr.read()[:350])
    return handle

def worker_waits():
    deadline = monotonic() + 6.0
    while monotonic() < deadline:
        rows = sql("""select pid from pg_stat_activity
          where datname=current_database() and state='active' and wait_event_type='Lock'
          and query like '%authz_mutation_lock%' and query not like '%pg_stat_activity%'""")
        if rows:
            return
        sleep(0.07)
    raise AssertionError("Expected actual Worker PostgreSQL waiter on authz_mutation_lock")

def deactivate(user_id):
    changed = sql('update "user" set deactivated_at=clock_timestamp(),'
                  "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years'"
                  " where id=$1 and deactivated_at is null returning id", [user_id])
    assert changed == [{"id": user_id}], changed

def open_private(page, path):
    r = page.goto(base + path, wait_until="networkidle")
    assert r and r.status == 200, (path, getattr(r, "status", None))
    assert "no-store" in r.headers.get("cache-control", ""), (path, r.headers)

try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel=os.environ.get("PLAYWRIGHT_CHANNEL", "chromium"),
                                             headless=True, args=["--no-sandbox"])
        def session():
            ctx = browser.new_context(viewport={"width": 1280, "height": 850})
            ctx.route("**/*", lambda r: r.continue_() if r.request.url.startswith(base + "/")
                      else (external_requests.append(r.request.url), r.abort())[-1])
            return ctx

        owner_ctx, subject_ctx = session(), session()
        signup = owner_ctx.request.post(base + "/api/auth/sign-up/email", headers={"Origin": base},
            data={"name": "M2 Bound Owner", "email": prefix + "-owner@test.invalid",
                  "password": "m2-local-fixture-password-123456789"})
        assert signup.status == 200, (signup.status, signup.text()[:250])
        original_owner = signup.json()["user"]["id"]
        sql('insert into "user"(id,name,email) values($1,$2,$3)',
            [owner_id, "M2 synthetic bound Owner", prefix + "-bound@test.invalid"])
        assert sql('update "session" set user_id=$1 where user_id=$2 returning id',
                   [owner_id, original_owner]), "Real Better Auth session needed for bound Owner"

        signup = subject_ctx.request.post(base + "/api/auth/sign-up/email", headers={"Origin": base},
            data={"name": "M2 Participant", "email": prefix + "-subject@test.invalid",
                  "password": "m2-local-fixture-password-123456789"})
        assert signup.status == 200, (signup.status, signup.text()[:250])
        subject_id = signup.json()["user"]["id"]
        owner_page, subject_page = owner_ctx.new_page(), subject_ctx.new_page()
        for page in (owner_page, subject_page):
            page.set_default_timeout(20000)
            page.on("pageerror", lambda error: page_errors.append(str(error)))
        open_private(owner_page, "/en/admin/measures?target=" + quote(subject_id, safe=""))
        expect(owner_page.locator('form:has(input[name="intent"][value="create"])')).to_have_count(1)
        record("actual-better-auth-owner-subject-and-mounted-admin-form")

        names = ("change", "lift", "review", "subject")
        ids = {name: str(uuid4()) for name in names}
        for name in names:
            response = http(owner_ctx, "/en/admin/measures", {
                "intent": "create", "measureId": ids[name], "targetId": subject_id,
                "reason": "M2 actual " + name, "expiresAt": "", "restriction": "replies.create",
            })
            assert response.status in (302, 303), (name, response.status, response.text()[:200])
        review_appeal = str(uuid4())
        initial_appeal = http(subject_ctx, "/en/account/measures/" + ids["review"], {
            "intent": "appeal", "appealId": review_appeal, "body": "M2 initial review please",
        })
        private(initial_appeal, 200)
        assert sql("select id from user_measure_appeals where id=$1", [review_appeal])
        record("all-five-real-endpoints-prepared-through-successful-writes")

        paths = {
            "create": "/en/admin/measures",
            "change": "/en/admin/measures/" + ids["change"],
            "lift": "/en/admin/measures/" + ids["lift"],
            "review": "/en/admin/measures/" + ids["review"],
            "appeal": "/en/account/measures/" + ids["subject"],
        }
        fields = {
            "create": {"intent": "create", "measureId": str(uuid4()), "targetId": subject_id,
                       "reason": "M2 denied create", "expiresAt": "", "restriction": "replies.create"},
            "change": {"intent": "change", "operationId": str(uuid4()), "expectedVersion": "1",
                       "reason": "M2 denied change", "expiresAt": "", "restriction": "topics.create"},
            "lift": {"intent": "lift", "operationId": str(uuid4()),
                     "expectedVersion": "1", "reason": "M2 denied lift"},
            "review": {"intent": "review", "operationId": str(uuid4()), "expectedVersion": "1",
                       "appealId": review_appeal, "outcome": "rejected", "remedy": "",
                       "explanation": "M2 denied review"},
            "appeal": {"intent": "appeal", "appealId": str(uuid4()), "body": "M2 denied own appeal"},
        }
        open_private(subject_page, paths["appeal"])
        appeal_form = subject_page.locator('form:has(input[name="intent"][value="appeal"])')
        expect(appeal_form).to_have_count(1)
        appeal_form.locator('textarea[name="body"]').fill("M2 pending draft survives no automatic retry")
        create_form = owner_page.locator('form:has(input[name="intent"][value="create"])')
        create_form.locator('textarea[name="reason"]').fill("M2 retained owner draft")
        untouched = snapshot()
        assert len(untouched["measures"]) == 4 and len(untouched["appeals"]) == 1

        # A real database/schema fault, not a synthetic exception in a unit mock.
        sql("""create function m2_measure_fault() returns trigger language plpgsql as $$
             begin raise exception 'M2_PRIVATE_SQL_SECRET' using errcode='42P01'; end $$""")
        sql("create trigger m2_measure_fault_trigger before insert on user_measures "
            "for each row execute function m2_measure_fault()")
        try:
            failed = http(owner_ctx, paths["create"], {
                **fields["create"], "measureId": str(uuid4()),
            })
            body = private(failed, 500)
            assert "M2_PRIVATE_SQL_SECRET" not in body
            assert snapshot() == untouched
            record("actual-postgresql-unexpected-SQL-500-private-no-write")
        finally:
            sql("drop trigger if exists m2_measure_fault_trigger on user_measures")
            sql("drop function if exists m2_measure_fault()")

        # Genuine server statement timeout while an authenticated writer is waiting.
        with ThreadPoolExecutor(max_workers=1) as executor:
            locker = hold_mutex()
            try:
                sql("alter database vico_sa04_m2_browser_test set statement_timeout='1800ms'")
                pending = executor.submit(direct, cookies(owner_ctx), paths["create"],
                                          {**fields["create"], "measureId": str(uuid4())})
                worker_waits()
                direct_private(pending.result(timeout=13), 503)
                assert snapshot() == untouched
                record("actual-authz-lock-server-timeout-503-private-no-write")
            finally:
                sql("alter database vico_sa04_m2_browser_test reset statement_timeout")
                locker.communicate("release\n", timeout=15)

        # Session was authenticated, request reached PostgreSQL mutex, then lifecycle
        # changed BEFORE native guard could acquire the actor row.
        with ThreadPoolExecutor(max_workers=1) as executor:
            locker = hold_mutex()
            try:
                pending = executor.submit(direct, cookies(owner_ctx), paths["create"], fields["create"])
                worker_waits()
                deactivate(owner_id)
            finally:
                locker.communicate("release\n", timeout=15)
            direct_private(pending.result(timeout=15), 401)
        assert snapshot() == untouched
        record("actual-manager-late-deactivation-while-worker-waits-401")

        for name in ("create", "change", "lift", "review"):
            denied = http(owner_ctx, paths[name], fields[name])
            body = private(denied, 401)
            assert "ok" not in body.lower() and "M2_PRIVATE_SQL_SECRET" not in body
            assert snapshot() == untouched
        record("four-genuine-manager-commands-after-session-deactivation-401-no-write")

        # Own participant appeal needs no Owner binding; it uses the SAME native mutex
        # and must reject an actor who deactivates after the HTTP request started.
        with ThreadPoolExecutor(max_workers=1) as executor:
            locker = hold_mutex()
            try:
                pending = executor.submit(direct, cookies(subject_ctx), paths["appeal"], fields["appeal"])
                worker_waits()
                deactivate(subject_id)
            finally:
                locker.communicate("release\n", timeout=15)
            direct_private(pending.result(timeout=15), 401)
        private(http(subject_ctx, paths["appeal"], fields["appeal"]), 401)
        assert snapshot() == untouched
        record("actual-own-appeal-late-deactivation-and-repeat-401-no-write")

        # A previously mounted, filled Chromium Owner form emits one denied POST;
        # the client must not attempt a silent resubmission on authentication loss.
        requests = []
        owner_page.on("request", lambda req: requests.append(req.url)
                      if req.method == "POST" and "/admin/measures" in req.url else None)
        with owner_page.expect_response(lambda res: res.request.method == "POST"
                                        and "/admin/measures" in res.url) as post_result:
            create_form.locator('button[type="submit"]').click()
        assert post_result.value.status == 401, post_result.value.status
        sleep(0.7)
        assert len(requests) == 1, requests
        assert snapshot() == untouched
        record("mounted-owner-form-one-denied-post-no-automatic-retry")

        assert not external_requests, external_requests
        assert not page_errors, page_errors
        owner_ctx.close()
        subject_ctx.close()
        browser.close()
        record("sa04-m2-connected-pass")
finally:
    (args.output / "results.json").write_text(json.dumps({
        "implementationHead": os.environ.get("IMPLEMENTATION_SHA"),
        "cases": cases, "pageErrors": page_errors, "externalRequests": external_requests,
    }, ensure_ascii=False, indent=2))
