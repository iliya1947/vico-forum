"""SA04-N: actual Worker + Better Auth + PG17 + Chromium lifecycle checks."""
import argparse
import json
import os
import shutil
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from time import monotonic, sleep
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import Request, urlopen
from uuid import uuid4
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument("--url", default="http://127.0.0.1:4224")
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
base = args.url.rstrip("/")
db = os.environ.get("DATABASE_URL", "")
assert urlparse(base).hostname in ("127.0.0.1", "localhost")
assert urlparse(db).hostname in ("127.0.0.1", "localhost")
assert urlparse(db).path == "/vico_sa04_n_browser_test"
repo = Path(__file__).resolve().parents[3]
node = shutil.which("node")
assert node
args.output.mkdir(parents=True, exist_ok=True)
prefix = "sa04-n-" + uuid4().hex[:10]
records, errors, external = [], [], []

def sql(query, params=None):
    code = """import pg from 'pg';
const input=JSON.parse(await new Promise(done=>{let s='';
process.stdin.on('data',p=>s+=p);process.stdin.on('end',()=>done(s));}));
const c=new pg.Client({connectionString:process.env.DATABASE_URL});
await c.connect();
try{console.log(JSON.stringify((await c.query(input.query,input.params)).rows??[]));}
finally{await c.end();}"""
    result=subprocess.run([node,"--input-type=module","-e",code],cwd=repo,
        input=json.dumps({"query":query,"params":params or []}),text=True,
        capture_output=True,check=True,timeout=25)
    return json.loads(result.stdout)

def record(name, **facts):
    records.append({"case":name, **facts})
    print("SA04_N_CONNECTED " + json.dumps(records[-1],ensure_ascii=False),flush=True)

def snapshot():
    names=["forum_complaint_cases","forum_complaint_targets","forum_complaints",
        "forum_complaint_events","forum_complaint_evidence_attachments",
        "forum_complaint_activity","forum_complaint_decisions","forum_complaint_notes",
        "forum_complaint_appeals","forum_reply_notifications",
        "forum_complaint_priority_settings","admin_history"]
    return {name:sql("select * from "+name+" order by 1") for name in names}

def private(r,status):
    assert r.status == status,(r.status,status,r.text()[:180])
    assert {"private","no-store"} <= {x.strip().lower() for x in r.headers.get("cache-control","").split(",")}
    assert "N3_PRIVATE_SQL_SECRET" not in r.text()
    return r

def post(ctx,path,fields):
    return ctx.request.post(base+path,headers={"Origin":base,"Content-Type":"application/x-www-form-urlencoded"},
        data=urlencode(fields),max_redirects=0,timeout=17000)

def direct(cookie,path,fields):
    req=Request(base+path,urlencode(fields).encode(),method="POST",headers={
        "Origin":base,"Cookie":cookie,"Content-Type":"application/x-www-form-urlencoded"})
    try:
        with urlopen(req,timeout=17) as response:
            return response.status,dict(response.headers),response.read().decode()
    except HTTPError as e:
        return e.code,dict(e.headers),e.read().decode()

def direct_private(outcome,status):
    code,headers,body=outcome
    assert code == status,(code,status,body[:180])
    assert {"private","no-store"} <= {x.strip().lower() for k,v in headers.items()
        if k.lower()=="cache-control" for x in v.split(",")}
    assert "N3_PRIVATE_SQL_SECRET" not in body
    return body

def cookie(ctx):
    return "; ".join(x["name"]+"="+x["value"] for x in ctx.cookies(base))

def hold(actor, deactivate=False):
    code = """import pg from 'pg';
const [actor,deactivate]=process.argv.slice(1);
const c=new pg.Client({connectionString:process.env.DATABASE_URL});
await c.connect();await c.query('begin');
if(deactivate==='true')
 await c.query("update \\"user\\" set deactivated_at=clock_timestamp(),deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years' where id=$1",[actor]);
else await c.query('select id from "user" where id=$1 for update',[actor]);
console.log('LOCKED');
process.stdin.once('data',async()=>{try{await c.query('commit');}finally{await c.end();}});
"""
    child=subprocess.Popen([node,"--input-type=module","-e",code,actor,str(deactivate).lower()],
        cwd=repo,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    observed=child.stdout.readline().strip()
    assert observed=="LOCKED",(observed,child.stderr.read()[:250])
    return child

def release(child):
    if child.poll() is None:
        child.communicate("go\n",timeout=15)

def worker_waits():
    until=monotonic()+6
    while monotonic()<until:
        rows=sql("""select pid from pg_stat_activity
            where datname=current_database() and state='active' and wait_event_type='Lock'
            and query ilike '%from "user"%' and query ilike '%no key update%'
            and query not ilike '%pg_stat_activity%'""")
        if rows:return
        sleep(0.07)
    raise AssertionError("No actual Worker AccountState row-lock wait")

def seed(author_id,topics):
    code = """import pg from 'pg';import {drizzle} from 'drizzle-orm/node-postgres';
import {DrizzleForumRepository} from './db/forum-repository.ts';
const c=new pg.Client({connectionString:process.env.DATABASE_URL});
await c.connect();
try{
 const [section,author,...topics]=process.argv.slice(1);
 const f=new DrizzleForumRepository(drizzle(c),{cooldownMs:0,now:()=>new Date()});
 await f.createCategory({id:section,name:'SA04 N connected'});
 await f.createSection({id:section,categoryId:section,name:'SA04 N connected'});
 for(const topic of topics)await f.createTopicWithInitialPost({
   id:topic,sectionId:section,authorId:author,
   titleRevision:{id:topic+'-title',originalContent:'N connected title',sourceLocale:'en'},
   initialPost:{id:topic+'-post',topicId:topic,authorId:author,bodyRevision:{
     id:topic+'-body',originalContent:'N connected report text',sourceLocale:'en'}}});
}finally{await c.end();}"""
    subprocess.run([node,"--import","tsx","--input-type=module","-e",code,
        prefix+"-section",author_id,*topics],cwd=repo,check=True,timeout=40)

def case(topic):
    rows=sql("""select c.id,c.version from forum_complaint_cases c
        join forum_complaint_targets t on t.id=c.target_id
        where t.post_id=$1 and t.post_revision_id=$2""",[topic+"-post",topic+"-body"])
    assert len(rows)==1,rows
    return rows[0]

def submit(ctx,topic):
    return post(ctx,"/en/topics/"+topic+"/complaints",{
        "kind":"post","postId":topic+"-post","revisionId":topic+"-body",
        "operationId":str(uuid4()),"reason":"spam"})

def decision(ctx,c):
    r=post(ctx,"/en/attention/complaints/"+c["id"]+"/review",{
        "intent":"decision","operationId":str(uuid4()),
        "expectedVersion":str(c["version"]),"outcome":"not-confirmed","reasoning":"N3 actual decision"})
    private(r,200)
    rows=sql("select id from forum_complaint_decisions where case_id=$1",[c["id"]])
    assert len(rows)==1,rows
    return rows[0]["id"]

def appeal_fields(decision_id):
    return {"intent":"appeal","decisionId":decision_id,"operationId":str(uuid4()),
        "argument":"N3 actual participant appeal"}

def resolve_fields():
    return {"intent":"resolve","operationId":str(uuid4()),
        "outcome":"overturned","reasoning":"N3 actual reviewer outcome"}

try:
    with sync_playwright() as p:
        browser=p.chromium.launch(channel=os.environ.get("PLAYWRIGHT_CHANNEL","chrome"),
            headless=True,args=["--no-sandbox"])
        def session():
            ctx=browser.new_context(viewport={"width":1280,"height":850})
            ctx.route("**/*",lambda r:r.continue_() if r.request.url.startswith(base+"/")
                else (external.append(r.request.url),r.abort())[-1])
            return ctx
        def signup(ctx,label):
            response=ctx.request.post(base+"/api/auth/sign-up/email",headers={"Origin":base},data={
                "name":"SA04 N "+label,"email":prefix+"-"+label+"@test.invalid",
                "password":"n3-local-test-password-123456789"})
            assert response.status==200,(label,response.status,response.text()[:200])
            return response.json()["user"]["id"]
        reporter_ctx,reviewer_ctx,other_ctx=session(),session(),session()
        author_id=prefix+"-author"
        sql('insert into "user"(id,name,email) values($1,$2,$3)',
            [author_id,"SA04 N synthetic content author",prefix+"-author@test.invalid"])
        reporter_id=signup(reporter_ctx,"reporter")
        reviewer_id=signup(reviewer_ctx,"reviewer")
        other_id=signup(other_ctx,"other")
        for actor in (author_id,reporter_id,reviewer_id,other_id):
            sql("insert into authz_user_roles(user_id,role_id) values($1,'builtin-user') on conflict do nothing",[actor])
        for key in ("forum.complaint.review","forum.complaint.appeal.review","forum.complaint.priority.manage"):
            sql("insert into authz_user_permission_overrides(user_id,permission_key,effect)"
                +" values($1,$2,'allow')",[reviewer_id,key])
        topics=[prefix+"-"+str(i) for i in range(5)]
        seed(author_id,topics)
        page=reporter_ctx.new_page()
        reviewer_page=reviewer_ctx.new_page()
        for obj in (page,reviewer_page):
            obj.set_default_timeout(18000)
            obj.on("pageerror",lambda err:errors.append(str(err)))
        record("actual-Better-Auth-and-Forum-fixtures")

        private(submit(reporter_ctx,topics[0]),200)
        c0=case(topics[0]);d0=decision(reviewer_ctx,c0)
        p0="/en/complaints/"+c0["id"]+"/result"
        private(post(reporter_ctx,p0,appeal_fields(d0)),200)
        a0=sql("select id from forum_complaint_appeals where case_id=$1",[c0["id"]])[0]["id"]
        r0="/en/attention/complaints/"+c0["id"]+"/appeals/"+a0
        private(post(reviewer_ctx,r0,resolve_fields()),200)
        assert sql("select status,outcome from forum_complaint_appeals where id=$1",[a0])==[
            {"status":"resolved","outcome":"overturned"}]
        assert len(sql("select id from forum_reply_notifications where complaint_appeal_id=$1",[a0]))==2
        record("real-submit-decision-appeal-resolve-and-notifications")

        private(submit(reporter_ctx,topics[1]),200)
        c1=case(topics[1]);d1=decision(reviewer_ctx,c1)
        p1="/en/complaints/"+c1["id"]+"/result"
        private(page.goto(base+p1,wait_until="networkidle"),200)
        form=page.locator('form:has(input[name="intent"][value="appeal"])')
        assert form.count()==1
        form.locator("textarea").fill("KEEP_N3_PARTICIPANT_DRAFT")
        before=snapshot()
        holder=hold(reporter_id,True)
        with ThreadPoolExecutor(max_workers=1) as executor:
            pending=executor.submit(direct,cookie(reporter_ctx),p1,appeal_fields(d1))
            try:worker_waits()
            finally:release(holder)
            direct_private(pending.result(timeout=15),401)
        assert snapshot()==before
        direct_private(direct(cookie(reporter_ctx),p1,appeal_fields(d1)),401)
        private(submit(reporter_ctx,topics[2]),401)
        assert snapshot()==before
        record("actual-participant-state-first-late-401-and-no-durable-effects")

        participant_posts=[]
        page.on("request",lambda req:participant_posts.append(req.post_data or "")
            if req.method=="POST" and p1 in req.url else None)
        with page.expect_response(lambda res:res.request.method=="POST" and p1 in res.url) as denied:
            form.locator('button[type="submit"]').click()
        assert denied.value.status==401
        sleep(.5)
        assert len(participant_posts)==1,participant_posts
        assert form.count()==1, "Late 401 must not unmount the participant draft"
        assert form.locator("textarea").input_value()=="KEEP_N3_PARTICIPANT_DRAFT"
        first_nonce=parse_qs(participant_posts[0]).get("operationId",[])
        assert len(first_nonce)==1 and first_nonce[0], "Missing participant command nonce"
        with page.expect_response(lambda res:res.request.method=="POST" and p1 in res.url) as denied_retry:
            form.locator('button[type="submit"]').click()
        assert denied_retry.value.status==401
        sleep(.5)
        assert len(participant_posts)==2, "Extra automatic participant retry"
        assert parse_qs(participant_posts[1]).get("operationId")==first_nonce, "Participant retry changed nonce"
        assert form.locator("textarea").input_value()=="KEEP_N3_PARTICIPANT_DRAFT"
        assert snapshot()==before
        record("mounted-participant-form-retains-draft-and-reuses-nonce-on-explicit-retry")

        private(submit(other_ctx,topics[2]),200)
        c2=case(topics[2]);d2=decision(reviewer_ctx,c2)
        p2="/en/complaints/"+c2["id"]+"/result"
        private(post(other_ctx,p2,appeal_fields(d2)),200)
        a2=sql("select id from forum_complaint_appeals where case_id=$1",[c2["id"]])[0]["id"]
        r2="/en/attention/complaints/"+c2["id"]+"/appeals/"+a2
        private(reviewer_page.goto(base+r2,wait_until="networkidle"),200)
        review_form=reviewer_page.locator('form:has(input[name="intent"][value="resolve"])')
        assert review_form.count()==1
        review_form.locator("textarea").fill("KEEP_N3_REVIEWER_DRAFT")
        before=snapshot()
        holder=hold(reviewer_id,True)
        with ThreadPoolExecutor(max_workers=1) as executor:
            pending=executor.submit(direct,cookie(reviewer_ctx),r2,resolve_fields())
            try:worker_waits()
            finally:release(holder)
            direct_private(pending.result(timeout=15),401)
        assert snapshot()==before
        direct_private(direct(cookie(reviewer_ctx),r2,resolve_fields()),401)
        record("actual-reviewer-state-first-late-401-and-no-fanout")

        private(submit(other_ctx,topics[3]),200)
        c3=case(topics[3]);before=snapshot()
        settings=sql("select version,weights from forum_complaint_priority_settings where id=1")[0]
        weights={key:str(value) for key,value in settings["weights"].items()}
        private(post(reviewer_ctx,"/en/attention/complaints/settings",
            {"expectedVersion":str(settings["version"]),**weights}),401)
        triage="/en/attention/complaints/"+c3["id"]
        private(post(reviewer_ctx,triage,{"priority":"3","operationId":str(uuid4()),
            "expectedVersion":str(c3["version"])}),401)
        for active in ("true","false"):
            private(post(reviewer_ctx,triage+"/activity",{"active":active}),401)
        review="/en/attention/complaints/"+c3["id"]+"/review"
        private(post(reviewer_ctx,review,{"intent":"note","operationId":str(uuid4()),"body":"denied"}),401)
        private(post(reviewer_ctx,review,{"intent":"decision","operationId":str(uuid4()),
            "expectedVersion":str(c3["version"]),"outcome":"not-confirmed","reasoning":"denied"}),401)
        assert snapshot()==before
        record("all-eight-Complaint-HTTP-writers-deny-after-deactivation")

        reviewer_posts=[]
        reviewer_page.on("request",lambda req:reviewer_posts.append(req.post_data or "")
            if req.method=="POST" and "/appeals/"+a2 in req.url else None)
        with reviewer_page.expect_response(lambda res:res.request.method=="POST" and "/appeals/"+a2 in res.url) as denied:
            review_form.locator('button[type="submit"]').click()
        assert denied.value.status==401
        sleep(.5)
        assert len(reviewer_posts)==1,reviewer_posts
        assert review_form.count()==1, "Late 401 must not unmount the reviewer draft"
        assert review_form.locator("textarea").input_value()=="KEEP_N3_REVIEWER_DRAFT"
        first_nonce=parse_qs(reviewer_posts[0]).get("operationId",[])
        assert len(first_nonce)==1 and first_nonce[0], "Missing reviewer command nonce"
        with reviewer_page.expect_response(lambda res:res.request.method=="POST" and "/appeals/"+a2 in res.url) as denied_retry:
            review_form.locator('button[type="submit"]').click()
        assert denied_retry.value.status==401
        sleep(.5)
        assert len(reviewer_posts)==2, "Extra automatic reviewer retry"
        assert parse_qs(reviewer_posts[1]).get("operationId")==first_nonce, "Reviewer retry changed nonce"
        assert review_form.locator("textarea").input_value()=="KEEP_N3_REVIEWER_DRAFT"
        assert snapshot()==before
        record("mounted-reviewer-form-retains-draft-and-reuses-nonce-on-explicit-retry")

        sql("ALTER ROLE postgres IN DATABASE vico_sa04_n_browser_test SET statement_timeout='650ms'")
        try:
            before=snapshot()
            holder=hold(other_id)
            try:
                outcome=direct(cookie(other_ctx),"/en/topics/"+topics[4]+"/complaints",{
                    "kind":"post","postId":topics[4]+"-post","revisionId":topics[4]+"-body",
                    "operationId":str(uuid4()),"reason":"spam"})
                direct_private(outcome,503)
            finally:release(holder)
            assert snapshot()==before
        finally:
            sql("ALTER ROLE postgres IN DATABASE vico_sa04_n_browser_test RESET statement_timeout")
        record("actual-worker-statement-timeout-private-503")

        sql("CREATE FUNCTION sa04_n3_throw_event() RETURNS trigger LANGUAGE plpgsql AS $$"
            " BEGIN RAISE EXCEPTION 'N3_PRIVATE_SQL_SECRET'; END $$")
        sql("CREATE TRIGGER sa04_n3_fail_event BEFORE INSERT ON forum_complaint_events"
            " FOR EACH ROW EXECUTE FUNCTION sa04_n3_throw_event()")
        try:
            before=snapshot()
            direct_private(direct(cookie(other_ctx),"/en/topics/"+topics[4]+"/complaints",{
                "kind":"post","postId":topics[4]+"-post","revisionId":topics[4]+"-body",
                "operationId":str(uuid4()),"reason":"spam"}),500)
            assert snapshot()==before
        finally:
            sql("DROP TRIGGER IF EXISTS sa04_n3_fail_event ON forum_complaint_events")
            sql("DROP FUNCTION IF EXISTS sa04_n3_throw_event()")
        record("actual-worker-unexpected-error-private-500")

        assert not external,external
        assert not errors,errors
        for ctx in (reporter_ctx,reviewer_ctx,other_ctx):ctx.close()
        browser.close()
        record("whole-N-connected-pass")
finally:
    (args.output/"results.json").write_text(json.dumps({
        "implementationHead":os.environ.get("IMPLEMENTATION_SHA"),
        "cases":records,"pageErrors":errors,"externalRequests":external,
    },ensure_ascii=False,indent=2))
