"""SA08-B real Worker admission with missing/wrong synthetic Owner binding.
Run after check.py on the same disposable database, restarting the actual Worker
with the requested .dev.vars binding. No auth/store/reader doubles are used.
"""
import argparse,json,os,select,shutil,subprocess
from uuid import uuid4
from pathlib import Path
from urllib.parse import urlparse,quote,urlencode
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:4238');p.add_argument('--mode',choices=['missing','wrong'],required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();base=a.url.rstrip('/');repo=Path(__file__).resolve().parents[3]
assert os.environ.get('CI')=='true' and urlparse(base).hostname in ('localhost','127.0.0.1')
db=urlparse(os.environ['DATABASE_URL']);assert db.hostname in ('localhost','127.0.0.1') and db.path=='/vico_sa08_browser_test'
a.output.mkdir(parents=True,exist_ok=True);records=[];pg=None
try:
 pg=subprocess.Popen([shutil.which('node'),'--import','tsx',str(repo/'tests/browser/sa08/pg.mjs')],cwd=repo,stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,bufsize=1);assert pg.stdout.readline().strip()=='READY'
 def rpc(value):
  pg.stdin.write(json.dumps(value)+'\n');pg.stdin.flush();assert select.select([pg.stdout],[],[],60)[0];r=json.loads(pg.stdout.readline());assert 'error' not in r,r;return r['result']
 def sql(statement,params=None):return rpc({'operation':'sql','sql':statement,'params':params or []})
 def private(response,status):
  assert response.status==status,(response.url,response.status,status)
  assert {'private','no-store'}<={x.strip() for x in response.headers.get('cache-control','').split(',')}
  body=response.text();assert 'SA08_PRIVATE' not in body and 'SA07_PRIVATE' not in body and 'readStatements' not in body and 'retainedOwnerEvents' not in body
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('PLAYWRIGHT_EXECUTABLE') or None,channel=None if os.environ.get('PLAYWRIGHT_EXECUTABLE') else os.environ.get('PLAYWRIGHT_CHANNEL','chrome'),args=['--no-sandbox'])
  ctx=browser.new_context(extra_http_headers={'cf-connecting-ip':'192.0.2.228'})
  account=sql('select id,email from "user" where name=$1 order by created_at desc limit 1',['owner'])[0]
  signed=ctx.request.post(base+'/api/auth/sign-in/email',headers={'Origin':base},data={'email':account['email'],'password':'SA08-fixture-password-123456'});assert signed.status==200
  sql('update "session" set user_id=$1 where user_id=$2',['sa08-synthetic-owner',account['id']])
  # Genuine BA session remains active: a missing/wrong binding alone denies.
  session=ctx.request.get(base+'/api/auth/get-session');assert session.status==200 and session.json()['user']['id']=='sa08-synthetic-owner'
  before=sql('select id from owner_monitor_observations order by id')
  catalog=rpc({'operation':'catalog'});root='/en/super-admin'
  surfaces=[root,root+'/monitoring',root+'/events',root+'/infrastructure']+[root+'/monitoring/'+area for area in catalog]+[root+'/monitoring/'+area+'/'+key+'/history' for area,keys in catalog.items() for key in keys]
  for path in surfaces:
   private(ctx.request.get(base+path),403)
   private(ctx.request.get(base+path+'.data',headers={'Purpose':'prefetch','Sec-Purpose':'prefetch'}),403)
   private(ctx.request.post(base+path,headers={'Origin':base},data={}),405)
  assert sql('select id from owner_monitor_observations order by id')==before
  # Guard takes precedence over malformed private filter parsing as well.
  private(ctx.request.get(base+root+'/events.data?kind=PRIVATE_SQL'),403)
  records.append({'case':'genuine-active-Owner-denied-all-surfaces-with-'+a.mode+'-binding','surfaces':len(surfaces),'noPrivateSamples':True})
  print('SA08_BINDING '+json.dumps(records[-1]),flush=True)

  # M1: canonical profile is public + independently authorized Admin sections;
  # missing/wrong Owner binding must omit private Owner sections, not the page.
  owner='sa08-synthetic-owner';target_ctx=browser.new_context();target_email='SA08_PRIVATE_PROFILE_'+uuid4().hex+'@test.invalid'
  created=target_ctx.request.post(base+'/api/auth/sign-up/email',headers={'Origin':base},data={'name':'SA08 binding target','email':target_email,'password':'SA08-fixture-password-123456'});assert created.status==200
  target=created.json()['user']['id'];profile='/en/users/'+quote(target,safe='');action=profile+'/owner/deactivate'
  viewers=[(ctx,403,True)]
  for label,admin in [('admin',True),('member',False)]:
   person=sql('select id,email from "user" where name=$1 order by created_at desc limit 1',[label])[0]
   context=browser.new_context();login=context.request.post(base+'/api/auth/sign-in/email',headers={'Origin':base},data={'email':person['email'],'password':'SA08-fixture-password-123456'});assert login.status==200
   viewers.append((context,403,admin))
  viewers.append((browser.new_context(),401,False))
  previous=sql("select effect from authz_user_permission_overrides where user_id=$1 and permission_key='access.authorization.manage'",[owner])
  # Preserve genuine ordinary Admin visibility when Owner authority is absent.
  sql("insert into authz_user_permission_overrides(user_id,permission_key,effect) values($1,'access.authorization.manage','allow') on conflict(user_id,permission_key) do update set effect='allow'",[owner])
  poisoned='SA08_PRIVATE_SESSION_'+uuid4().hex
  sql("insert into session(id,user_id,token,created_at,expires_at,updated_at) values($1,$2,$3,'infinity',now()-interval '1 day',now())",[poisoned,target,'SA08_PRIVATE_TOKEN_'+uuid4().hex])
  try:
   assert rpc({'operation':'privateProfileInvariantProbe','query':{'targetId':target,'viewerUserId':owner,'currentSessionId':session.json()['session']['id']}})=={'rejected':True}
   tables=['admin_history','forum_profiles','forum_topics','forum_posts','forum_topic_title_revisions','forum_post_revisions','forum_publication_receipts','forum_reply_notifications','forum_topic_read_states','forum_attachments','forum_attachment_draft_refs','forum_attachment_upload_objects','user_measures','user_measure_restrictions','user_measure_appeals','forum_complaint_targets','forum_complaint_cases','forum_complaints','forum_complaint_events','forum_complaint_notes','forum_complaint_decisions','forum_complaint_appeals','forum_complaint_activity','authz_roles','authz_user_roles','authz_user_permission_overrides','translation_tasks','translation_task_generation_heads','content_topic_title_translation_tasks','content_post_body_translation_tasks','content_translation_request_budget_counters']
   sources={t:t for t in tables}
   sources.update({'target':'"user" where id=$1','targetMethods':'account where user_id=$1','targetSessions':'"session" where user_id=$1','targetPresence':'forum_online_presence where user_id=$1','lifecycleHistory':"owner_events where source='account'"})
   snapshot_sql='select jsonb_build_object('+','.join("'"+name+"',coalesce((select jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text) from (select * from "+source+") t),'[]'::jsonb)" for name,source in sources.items())+') value'
   unchanged=sql(snapshot_sql,[target])
   assert sql('select deactivated_at from "user" where id=$1',[target])==[{'deactivated_at':None}]
   for context,status,admin in viewers:
    page=context.new_page()
    for query in ['', '?sessionsBefore=invalid&sessionsBefore=duplicate&historyBefore=invalid']:
     response=page.goto(base+profile+query,wait_until='networkidle');private(response,200)
     expect(page.locator('#profile-name')).to_have_text('SA08 binding target')
     expect(page.locator('#owner-account,#owner-history,.owner-lifecycle-control')).to_have_count(0)
     expect(page.locator('#authorization')).to_have_count(1 if admin else 0)
     for headers in [{},{'Purpose':'prefetch','Sec-Purpose':'prefetch'}]:
      response=context.request.get(base+profile+'.data'+query,headers=headers);private(response,200)
      assert target_email not in response.text() and poisoned not in response.text() and 'retainAtLeastUntil' not in response.text() and 'nextSessionsCursor' not in response.text()
     assert target_email not in page.content() and poisoned not in page.content()
    page.close()
   assert sql(snapshot_sql,[target])==unchanged,'Profile entered Owner-private reader or changed domain state'
   records.append({'case':'canonical-profile-public-Admin-composition-without-Owner-private-read-'+a.mode,'viewers':4,'privateReaderFaultProven':True,'invalidPrivateCursorsIgnored':True})
   print('SA08_BINDING '+json.dumps(records[-1]),flush=True)
   for context,status,_ in viewers:
    for suffix,headers in [('',{}),('.data',{}),('.data',{'Purpose':'prefetch','Sec-Purpose':'prefetch'})]:
     private(context.request.get(base+action+suffix,headers=headers),status)
    fields={'intent':'deactivate','expectedActorId':owner,'targetUserId':target,'operationId':str(uuid4())}
    for suffix in ['', '.data']:
     private(context.request.post(base+action+suffix,headers={'Origin':base,'Content-Type':'application/x-www-form-urlencoded'},data=urlencode(fields),max_redirects=0),status)
   private(ctx.request.post(base+action,headers={'Origin':base,'Content-Type':'text/plain'},data='SA08_PRIVATE_INVALID_FORM',max_redirects=0),403)
   assert sql(snapshot_sql,[target])==unchanged,'Denied canonical deactivation changed target/history/domain state'
   assert sql('select deactivated_at from "user" where id=$1',[target])==[{'deactivated_at':None}]
   records.append({'case':'real-canonical-Owner-deactivation-denied-before-effects-'+a.mode,'viewers':4,'documentDataPrefetchAction':True,'targetLifecycleHistoryDomainUnchanged':True})
   print('SA08_BINDING '+json.dumps(records[-1]),flush=True)
  finally:
   sql('delete from "session" where id=$1',[poisoned])
   if previous:sql("update authz_user_permission_overrides set effect=$2 where user_id=$1 and permission_key='access.authorization.manage'",[owner,previous[0]['effect']])
   else:sql("delete from authz_user_permission_overrides where user_id=$1 and permission_key='access.authorization.manage'",[owner])
  browser.close()
finally:
 if pg:
  pg.stdin.close()
  try:pg.wait(timeout=8)
  except subprocess.TimeoutExpired:pg.terminate();pg.wait(timeout=5)
 (a.output/'results.json').write_text(json.dumps({'head':os.environ.get('IMPLEMENTATION_SHA'),'binding':a.mode,'cases':records},indent=2))
