"""SA04-L3 actual Worker, Better Auth, PG17 and Chromium Owner authorization acceptance."""
import argparse, json, os, shutil, subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from time import monotonic, sleep
from urllib.parse import urlparse, urlencode
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from uuid import uuid4
from playwright.sync_api import sync_playwright, expect

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument("--url",default="http://127.0.0.1:4213")
parser.add_argument("--output",type=Path,required=True)
args=parser.parse_args()
base=args.url.rstrip("/")
database=os.environ.get("DATABASE_URL","")
assert urlparse(base).hostname in ("127.0.0.1","localhost")
assert urlparse(database).hostname in ("127.0.0.1","localhost")
assert urlparse(database).path.endswith("_test")
repo=Path(__file__).resolve().parents[3]
node=shutil.which("node")
assert node
args.output.mkdir(parents=True,exist_ok=True)
prefix="l3-"+uuid4().hex[:12]
owner_id="sa04-l3-synthetic-owner"
cases,errors,external=[],[],[]
target_id=None

def sql(statement,params=None):
    code="""import pg from 'pg';
const v=JSON.parse(await new Promise(r=>{let s='';process.stdin.on('data',b=>s+=b);
process.stdin.on('end',()=>r(s));}));
const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();
try{console.log(JSON.stringify((await c.query(v.sql,v.params)).rows??[]));}
finally{await c.end();}"""
    r=subprocess.run([node,"--input-type=module","-e",code],cwd=repo,text=True,
        input=json.dumps({"sql":statement,"params":params or []}),capture_output=True,
        check=True,timeout=20)
    return json.loads(r.stdout)

def record(name,**details):
    cases.append({"case":name,**details})
    print("SA04_L3_CONNECTED "+json.dumps(cases[-1],ensure_ascii=False),flush=True)

def facts():
    return sql("""select
      (select count(*)::int from admin_history where actor_id=$1) as history,
      (select count(*)::int from authz_roles where slug like $2) as roles,
      (select count(*)::int from authz_user_roles where user_id=$3) as assignments,
      (select count(*)::int from authz_user_permission_overrides where user_id=$3) as overrides""",
      [owner_id,prefix+"%",target_id])[0]

def private(status,headers,expected):
    assert status==expected,(expected,status)
    cc=next((v for k,v in headers.items() if k.lower()=="cache-control"),"")
    assert {"private","no-store"}<=set(v.strip().lower() for v in cc.split(",")),cc

def visit(page,path,status=200):
    r=page.goto(base+path,wait_until="networkidle")
    assert r and r.status==status,(path,getattr(r,"status",None))
    assert "no-store" in r.headers.get("cache-control",""),(path,r.headers)

def post(ctx,fields):
    return ctx.request.post(base+"/en/admin/authorization",headers={"Origin":base},
                            form=fields,max_redirects=0)

def raw_post(cookie,fields):
    req=Request(base+"/en/admin/authorization",urlencode(fields).encode(),method="POST",
                headers={"Origin":base,"Cookie":cookie,
                         "Content-Type":"application/x-www-form-urlencoded"})
    try:
        with urlopen(req,timeout=16) as r:
            return r.status,dict(r.headers),r.read().decode()
    except HTTPError as e:
        return e.code,dict(e.headers),e.read().decode()

def hold_authz_mutex():
    code="""import pg from 'pg';
const c=new pg.Client({connectionString:process.env.DATABASE_URL});
await c.connect();await c.query('begin');
await c.query('select id from authz_mutation_lock where id=1 for update');
console.log('LOCKED');
process.stdin.once('data',async()=>{try{await c.query('commit');}
finally{await c.end();}});
"""
    p=subprocess.Popen([node,"--input-type=module","-e",code],cwd=repo,
                       stdin=subprocess.PIPE,stdout=subprocess.PIPE,
                       stderr=subprocess.PIPE,text=True)
    line=p.stdout.readline().strip()
    assert line=="LOCKED",(line,p.stderr.read()[:500])
    return p

def await_worker_wait():
    deadline=monotonic()+5.0
    while monotonic()<deadline:
        rows=sql("""select pid from pg_stat_activity where datname=current_database()
          and state='active' and wait_event_type='Lock'
          and query like '%authz_mutation_lock%' and query not like '%pg_stat_activity%'""")
        if rows:return
        sleep(0.08)
    raise AssertionError("Actual Worker command never waited on the shared authorization mutex")

def cookies(ctx):
    return "; ".join(c["name"]+"="+c["value"] for c in ctx.cookies(base))

try:
    with sync_playwright() as p:
        browser=p.chromium.launch(channel=os.environ.get("PLAYWRIGHT_CHANNEL","chromium"),
                                  headless=True,args=["--no-sandbox"])
        def isolated():
            ctx=browser.new_context(viewport={"width":1280,"height":900})
            ctx.route("**/*",lambda r: r.continue_() if r.request.url.startswith(base+"/")
                      else (external.append(r.request.url),r.abort())[-1])
            return ctx
        owner_ctx,guest_ctx,member_ctx=isolated(),isolated(),isolated()
        signup=owner_ctx.request.post(base+"/api/auth/sign-up/email",headers={"Origin":base},
            data={"name":"L3 Owner","email":prefix+"-owner@test.invalid",
                  "password":"l3-local-only-browser-password-123456"})
        assert signup.status==200,(signup.status,signup.text()[:250])
        source_id=signup.json()["user"]["id"]
        sql('insert into "user"(id,name,email) values($1,$2,$3)',
            [owner_id,"L3 Bound Owner",prefix+"-bound@test.invalid"])
        assert sql('update "session" set user_id=$1 where user_id=$2 returning id',
                   [owner_id,source_id])
        target_id="l3-target-"+uuid4().hex
        sql('insert into "user"(id,name,email) values($1,$2,$3)',
            [target_id,"L3 Target",prefix+"-target@test.invalid"])
        other=member_ctx.request.post(base+"/api/auth/sign-up/email",headers={"Origin":base},
            data={"name":"L3 Nonowner","email":prefix+"-nonowner@test.invalid",
                  "password":"l3-local-only-browser-password-123456"})
        assert other.status==200
        nonowner_id=other.json()["user"]["id"]
        sql("insert into authz_user_roles(user_id,role_id) values($1,'builtin-admin')",
            [nonowner_id])
        owner=owner_ctx.new_page()
        profile=owner_ctx.new_page()
        owner.on("pageerror",lambda e:errors.append(str(e)))
        profile.on("pageerror",lambda e:errors.append(str(e)))
        guest=guest_ctx.new_page()
        visit(guest,"/en/settings/forum",401)
        visitor=member_ctx.new_page()
        visit(visitor,"/en/admin/authorization")
        assert visitor.locator("form.admin-create-role").count()==0
        assert post(member_ctx,{"intent":"createRole","slug":prefix+"-forged",
                                "displayName":"Forbidden"}).status==403
        record("guest-401-and-nonowner-readonly-403")

        visit(owner,"/en/settings/forum")
        create=owner.locator("form.admin-create-role")
        expect(create).to_have_count(1)
        assert create.get_attribute("action")=="/en/admin/authorization"
        create.locator('input[name="slug"]').fill(prefix+"-active")
        create.locator('input[name="displayName"]').fill("L3 active Owner")
        with owner.expect_response(lambda r:r.request.method=="POST" and
                                   "/admin/authorization" in r.url) as response:
            create.locator("button[type='submit']").click()
        assert response.value.status==200,response.value.status
        expect(owner.locator(".admin-result-success")).to_have_count(1)
        role_id=sql("select id from authz_roles where slug=$1",[prefix+"-active"])[0]["id"]
        assert facts()["history"]==1
        record("genuine-owner-settings-form-shares-canonical-writer")

        visit(profile,"/en/users/"+target_id)
        assignment=profile.locator("#authorization form.admin-role-assignment")
        expect(assignment).to_have_count(1)
        assert assignment.get_attribute("action")=="/en/admin/authorization"
        assignment.locator('select[name="roleId"]').select_option(role_id)
        with profile.expect_response(lambda r:r.request.method=="POST" and
                                     "/admin/authorization" in r.url) as response:
            assignment.locator("button[type='submit']").click()
        assert response.value.status==200
        expect(profile.locator("#authorization .admin-result-success")).to_have_count(1)
        override=profile.locator('#authorization form.admin-override-row:has(input[name="permission"][value="forum.topic.pin"])')
        expect(override).to_have_count(1)
        override.locator('select[name="effect"]').select_option("deny")
        with profile.expect_response(lambda r:r.request.method=="POST" and
                                     "/admin/authorization" in r.url) as response:
            override.locator("button[type='submit']").click()
        assert response.value.status==200
        assert facts()=={"history":3,"roles":1,"assignments":1,"overrides":1}
        record("genuine-owner-profile-assignment-override-canonical-writer")

        sql("""create function l3_role_fault() returns trigger language plpgsql as $$
          begin raise exception 'L3_PRIVATE_SQL_SECRET' using errcode='42P01'; end $$""")
        sql("create trigger l3_role_fault_trigger before insert on authz_roles "
            "for each row execute function l3_role_fault()")
        try:
            broken=post(owner_ctx,{"intent":"createRole","slug":prefix+"-unexpected",
                                    "displayName":"unexpected"})
            private(broken.status,broken.headers,500)
            assert "L3_PRIVATE_SQL_SECRET" not in broken.text()
            assert facts()=={"history":3,"roles":1,"assignments":1,"overrides":1}
            record("real-unexpected-500-private-no-store-no-durable-write")
        finally:
            sql("drop trigger if exists l3_role_fault_trigger on authz_roles")
            sql("drop function if exists l3_role_fault()")

        with ThreadPoolExecutor(max_workers=1) as executor:
            locker=hold_authz_mutex()
            try:
                # Server-side cancellation is deterministic even if a client-level
                # query deadline expires while a PostgreSQL row lock is pending.
                # Only this disposable database receives the temporary setting.
                sql("alter database vico_sa04_l3_browser_test set statement_timeout='1800ms'")
                future=executor.submit(raw_post,cookies(owner_ctx),{
                    "intent":"createRole","slug":prefix+"-unavailable","displayName":"Timeout"})
                await_worker_wait()
                status,headers,body=future.result(timeout=12)
                private(status,headers,503)
                assert "canceling statement" not in body
                record("real-server-statement-timeout-503-private-no-store-no-SQL")
            finally:
                sql("alter database vico_sa04_l3_browser_test reset statement_timeout")
                locker.communicate("release\n",timeout=15)
        assert facts()=={"history":3,"roles":1,"assignments":1,"overrides":1}

        with ThreadPoolExecutor(max_workers=1) as executor:
            locker=hold_authz_mutex()
            try:
                future=executor.submit(raw_post,cookies(owner_ctx),{
                    "intent":"createRole","slug":prefix+"-late","displayName":"Denied"})
                await_worker_wait()
                changed=sql('update "user" set deactivated_at=now(),'
                  + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years'"
                  + " where id=$1 and deactivated_at is null returning id",[owner_id])
                assert changed==[{"id":owner_id}],changed
            finally:
                locker.communicate("release\n",timeout=15)
            status,headers,body=future.result(timeout=14)
            private(status,headers,401)
        assert facts()=={"history":3,"roles":1,"assignments":1,"overrides":1}
        record("actual-late-deactivation-after-auth-and-before-lock-401")

        # Open profile predates deactivation; its pending action cannot retry successfully.
        stale=profile.locator("#authorization form.admin-role-assignment")
        if stale.count():
            with profile.expect_response(lambda r:r.request.method=="POST" and
                                         "/admin/authorization" in r.url) as response:
                stale.locator("button[type='submit']").click()
            assert response.value.status==401,response.value.status
        sleep(0.6)
        assert facts()=={"history":3,"roles":1,"assignments":1,"overrides":1}
        record("stale-profile-401-no-automatic-post-retry")
        assert not errors,errors
        assert not external,external
        owner_ctx.close();guest_ctx.close();member_ctx.close()
        browser.close()
        record("sa04-l3-connected-pass")
finally:
    (args.output/"results.json").write_text(json.dumps({
        "implementationHead":os.environ.get("IMPLEMENTATION_SHA"),
        "cases":cases,"pageErrors":errors,"externalRequests":external,
    },ensure_ascii=False,indent=2))
