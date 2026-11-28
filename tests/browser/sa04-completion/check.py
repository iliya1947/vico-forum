"""SA04-S: actual Worker/BA/PG17/Chromium plus isolated real-generation composition."""
import argparse,json,os,shutil,subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from time import monotonic,sleep
from urllib.parse import urlencode,urlparse
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from uuid import uuid4
from playwright.sync_api import sync_playwright
import sys
from pathlib import Path as FixturePath
sys.path.insert(0, str(FixturePath(__file__).resolve().parents[1]))
from verified_fixture import signup_verified_session

parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://127.0.0.1:4225')
parser.add_argument('--generation-url',default='http://127.0.0.1:4226')
parser.add_argument('--output',type=Path,required=True)
a=parser.parse_args();base=a.url.rstrip('/');generation=a.generation_url.rstrip('/')
db=os.environ.get('DATABASE_URL','')
assert all(urlparse(x).hostname in ('127.0.0.1','localhost') for x in [base,generation,db])
assert urlparse(db).path=='/vico_sa04_s_browser_test'
repo=Path(__file__).resolve().parents[3];node=shutil.which('node');assert node
a.output.mkdir(parents=True,exist_ok=True)
prefix='sa04-s-'+uuid4().hex[:10];owner='sa04-s-synthetic-owner';records=[];errors=[];external=[]
phase='setup'
def page_errors(page):
 def observed(error):
  item={'message':str(error),'stack':error.stack,'url':page.url,'phase':phase}
  errors.append(item);print('SA04_S_PAGE_ERROR '+json.dumps(item),flush=True)
 page.on('pageerror',observed)
def sql(query,params=None):
 code="""import pg from 'pg';const d=JSON.parse(await new Promise(r=>{let s='';process.stdin.on('data',p=>s+=p);process.stdin.on('end',()=>r(s));}));
const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();try{console.log(JSON.stringify((await c.query(d.query,d.params)).rows));}finally{await c.end();}"""
 r=subprocess.run([node,'--input-type=module','-e',code],cwd=repo,input=json.dumps({'query':query,'params':params or []}),text=True,capture_output=True,check=True,timeout=25)
 return json.loads(r.stdout)
def record(case,**facts):
 records.append({'case':case,**facts});print('SA04_S_CONNECTED '+json.dumps(records[-1]),flush=True)
def private_headers(r,status):
 assert r.status==status,(r.status,status)
 assert {'private','no-store'} <= {x.strip() for x in r.headers.get('cache-control','').split(',')},r.headers
 return r
def private(r,status):
 private_headers(r,status)
 assert 'S_PRIVATE_SQL_SECRET' not in r.text()
 return r
def post(ctx,path,fields,host=base):
 return ctx.request.post(host+path,headers={'Origin':host,'Content-Type':'application/x-www-form-urlencoded'},data=urlencode(fields),max_redirects=0,timeout=20000)
def cookies(ctx):return '; '.join(c['name']+'='+c['value'] for c in ctx.cookies(base))
def direct(cookie,path,fields,host=base):
 class Reply:
  def __init__(self,status,headers,body):self.status=status;self.headers={k.lower():v for k,v in headers.items()};self.body=body
  def text(self):return self.body
  def json(self):return json.loads(self.body)
 request=Request(host+path,urlencode(fields).encode(),method='POST',headers={'Origin':host,'Cookie':cookie,'Content-Type':'application/x-www-form-urlencoded'})
 try:
  with urlopen(request,timeout=20) as r:return Reply(r.status,dict(r.headers),r.read().decode())
 except HTTPError as r:return Reply(r.code,dict(r.headers),r.read().decode())
def facts():
 return {'accounts':sql('select id,locale,updated_at from "user" order by id'),
  **{t:sql('select * from '+t+' order by 1') for t in ['user_privacy_preferences','forum_online_presence','forum_registration_settings','admin_history','translation_tasks','translation_task_generation_heads','content_translation_request_budget_counters']}}
def hold(query,params):
 code="""import pg from 'pg';const d=JSON.parse(process.argv[1]);const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();await c.query('begin');
await c.query(d.query,d.params);console.log('LOCKED');process.stdin.once('data',async()=>{await c.query('commit');await c.end();});"""
 p=subprocess.Popen([node,'--input-type=module','-e',code,json.dumps({'query':query,'params':params})],cwd=repo,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
 assert p.stdout.readline().strip()=='LOCKED';return p
def release(p):
 if p.poll() is None:p.communicate('go\n',timeout=15)
def actor_hold(actor,deactivate=False):
 q='select id from "user" where id=$1 for update'
 if deactivate:q="update \"user\" set deactivated_at=clock_timestamp(),deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years' where id=$1"
 return hold(q,[actor])
def waits(pattern):
 until=monotonic()+7
 while monotonic()<until:
  rows=sql("select pid from pg_stat_activity where datname=current_database() and state='active' and wait_event_type='Lock' and query not ilike '%pg_stat_activity%' and query ilike $1",['%'+pattern+'%'])
  if rows:return
  sleep(.06)
 raise AssertionError('No actual PostgreSQL writer wait: '+pattern)
def seed(author):
 code="""import pg from 'pg';import {drizzle} from 'drizzle-orm/node-postgres';import {DrizzleForumRepository} from './db/forum-repository.ts';
const [prefix,author]=process.argv.slice(1),c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();
try{const f=new DrizzleForumRepository(drizzle(c),{cooldownMs:0,now:()=>new Date()});await f.createCategory({id:prefix,name:'S'});await f.createSection({id:prefix,categoryId:prefix,name:'S'});
for(let i=0;i<5;i++){const id=prefix+'-topic-'+i;await f.createTopicWithInitialPost({id,sectionId:prefix,authorId:author,titleRevision:{id:id+'-title',originalContent:'Исходный заголовок '+i,sourceLocale:'ru'},initialPost:{id:id+'-post',topicId:id,authorId:author,bodyRevision:{id:id+'-body',originalContent:i===2?'а'.repeat(3001):'Сохранённый **публичный** текст '+i,sourceLocale:'ru'}}});}}
finally{await c.end();}"""
 subprocess.run([node,'--import','tsx','--input-type=module','-e',code,prefix,author],cwd=repo,check=True,timeout=35)
def settings(kind,actor):
 if kind=='locale':return '/en/settings/user',{'intent':'save-locale','expectedUserId':actor,'locale':'he'}
 if kind=='privacy':return '/en/settings/privacy',{'intent':'save-online-visibility','expectedUserId':actor,'showOnline':'false'}
 v=sql('select version from forum_registration_settings where id=1')[0]['version']
 return '/en/settings/forum',{'expectedVersion':str(v),'googleRegistrationEnabled':'on'}
def mounted_denial(page,form,path):
 sent=[]
 def match(req):return req.method=='POST' and urlparse(req.url).path in (path,path+'.data')
 page.on('request',lambda req:sent.append(req.post_data) if match(req) else None)
 with page.expect_response(lambda r:match(r.request)) as response:form.locator('button[type="submit"]').click()
 assert response.value.status==401,response.value.status
 assert 'no-store' in response.value.headers.get('cache-control','')
 page.wait_for_timeout(700);assert len(sent)==1,'Automatic POST retry'
 assert not page.locator('form.settings-locale-form, form.settings-privacy-form, form.settings-registration-form').count(),'Rejected private form remained mounted'

try:
 with sync_playwright() as p:
  launch={'headless':True,'args':['--no-sandbox']}
  if os.environ.get('PLAYWRIGHT_EXECUTABLE'):launch['executable_path']=os.environ['PLAYWRIGHT_EXECUTABLE']
  else:launch['channel']=os.environ.get('PLAYWRIGHT_CHANNEL','chrome')
  browser=p.chromium.launch(**launch)
  def account(label):
   # Synthetic distinct trusted-client fixtures retain Better Auth's real limits.
   ip={'owner':'192.0.2.101','locale':'192.0.2.102','privacy':'192.0.2.103','generation':'192.0.2.104'}[label]
   ctx=browser.new_context(viewport={'width':1280,'height':900},extra_http_headers={'cf-connecting-ip':ip})
   ctx.route('**/*',lambda r:r.continue_() if any(r.request.url.startswith(h+'/') for h in [base,generation]) else (external.append(r.request.url),r.abort())[-1])
   password='sa04-s-fixture-password-123456'
   response=signup_verified_session(sql, ctx.request, base,headers={'Origin':base},data={'name':prefix+'-'+label,'email':prefix+'-'+label+'@test.invalid','password':password})
   assert response.status==200,(response.status,response.text())
   return ctx,response.json()['user']['id']
  owner_ctx,issued_owner=account('owner');member_ctx,member=account('locale');privacy_ctx,subject=account('privacy');r_ctx,r_actor=account('generation')
  sql('insert into "user"(id,name,email) values($1,$2,$3)',[owner,'S synthetic bound Owner',prefix+'-bound@test.invalid'])
  assert sql('update "session" set user_id=$1 where user_id=$2 returning id',[owner,issued_owner])
  sql("insert into authz_user_permission_overrides(user_id,permission_key,effect) values($1,'forum.translation.generate','allow')",[r_actor])
  seed(member);record('genuine-BA-sessions-bound-Owner-and-real-Forum-fixtures')

  for locale in ['en','ru','he']:
   phase='responsive-'+locale;page=privacy_ctx.new_page();page_errors(page)
   for width in [1280,320]:
    page.set_viewport_size({'width':width,'height':900});private(page.goto(base+'/'+locale+'/settings/privacy',wait_until='networkidle'),200)
    assert page.locator('html').get_attribute('dir')==('rtl' if locale=='he' else 'ltr')
    assert page.locator('form.settings-privacy-form').count()==1
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
    page.screenshot(path=str(a.output/(locale+'-'+str(width)+'.png')),full_page=True)
   page.close()
  record('actual-Settings-EN-RU-HE-RTL-responsive-connected-sweep')

  # Healthy account-only Settings writes, no-op registration and runtime policy.
  path,fields=settings('locale',member);saved=private(post(member_ctx,path,{**fields,'locale':'ru'}),303)
  assert '/ru/settings/user' in saved.headers.get('location','')
  negotiated=member_ctx.request.get(base+'/',max_redirects=0);assert '/ru' in negotiated.headers.get('location','')
  sql('insert into forum_online_presence(user_id) values($1) on conflict do nothing',[subject])
  path,fields=settings('privacy',subject);private(post(privacy_ctx,path,fields),200)
  assert not sql('select user_id from forum_online_presence where user_id=$1',[subject])
  private(post(privacy_ctx,path,{**fields,'showOnline':'true'}),200)
  assert not sql('select user_id from forum_online_presence where user_id=$1',[subject])
  path,fields=settings('registration',owner);private(post(owner_ctx,path,fields),200)
  closed=owner_ctx.request.post(base+'/api/auth/sign-up/email',headers={'Origin':base},data={'name':'closed','email':prefix+'-closed@test.invalid','password':'sa04-s-fixture-password-123456'})
  assert closed.status>=400 and not sql('select id from "user" where email=$1',[prefix+'-closed@test.invalid'])
  v=sql('select version from forum_registration_settings where id=1')[0]['version']
  private(post(owner_ctx,path,{'expectedVersion':str(v),'googleRegistrationEnabled':'on','emailRegistrationEnabled':'on'}),200)
  v=sql('select version from forum_registration_settings where id=1')[0]['version'];before=facts()
  private(post(owner_ctx,path,{'expectedVersion':str(v),'googleRegistrationEnabled':'on','emailRegistrationEnabled':'on'}),200);assert facts()==before
  record('O-P-Q-healthy-save-no-op-presence-policy-and-locale-negotiation')

  # The actual registration form keeps its URL, refreshes CAS after success or
  # conflict, and requires an explicit second submit after a rejected version.
  phase='registration-save-conflict';page=owner_ctx.new_page();page_errors(page)
  private(page.goto(base+'/en/settings/forum',wait_until='networkidle'),200)
  form=page.locator('form.settings-registration-form');version=form.locator('input[name="expectedVersion"]')
  sent=[]
  def registration_post(req):return req.method=='POST' and urlparse(req.url).path in ('/en/settings/forum','/en/settings/forum.data')
  page.on('request',lambda req:sent.append(req.post_data) if registration_post(req) else None)
  form.locator('input[name="googleRegistrationEnabled"]').uncheck();old=int(version.input_value())
  with page.expect_response(lambda r:registration_post(r.request)) as response:form.locator('button[type="submit"]').click()
  private_headers(response.value,200);page.wait_for_function('(v)=>document.querySelector(".settings-registration-form input[name=expectedVersion]")?.value===String(v)',arg=old+1)
  assert page.url==base+'/en/settings/forum' and len(sent)==1
  private(post(owner_ctx,'/en/settings/forum',{'expectedVersion':str(old+1),'googleRegistrationEnabled':'on','emailRegistrationEnabled':'on'}),200)
  before=facts()
  with page.expect_response(lambda r:registration_post(r.request)) as response:form.locator('button[type="submit"]').click()
  private_headers(response.value,409);page.wait_for_function('(v)=>document.querySelector(".settings-registration-form input[name=expectedVersion]")?.value===String(v)',arg=old+2)
  page.wait_for_timeout(700);assert len(sent)==2 and facts()==before
  assert form.locator('input[name="googleRegistrationEnabled"]').is_checked()
  with page.expect_response(lambda r:registration_post(r.request)) as response:form.locator('button[type="submit"]').click()
  private_headers(response.value,200);page.wait_for_timeout(700);assert len(sent)==3 and facts()==before
  page.close();record('Q-mounted-save-CAS-conflict-refresh-explicit-no-op-retry')

  # Production stays disabled; test composition uses exactly the canonical action.
  t=lambda i:'/he/topics/'+prefix+'-topic-'+str(i)
  private(post(r_ctx,t(0),{'intent':'generateTopicTitleTranslation'}),503)
  for i,intent in [(0,'generateTopicTitleTranslation'),(1,'generatePostBodyTranslation'),(2,'generateExplicitPostBodyTranslation')]:
   fields={'intent':intent}
   if i:fields['postId']=prefix+'-topic-'+str(i)+'-post'
   if i==2:
    threshold=private(post(r_ctx,t(i),{**fields,'intent':'generatePostBodyTranslation'},generation),200)
    assert threshold.json()['outcome']=='explicit-required'
   queued=private(post(r_ctx,t(i),fields,generation),202);assert queued.json()['outcome']=='queued'
  assert len(sql('select id from translation_tasks'))==3
  assert r_actor not in json.dumps(sql('select * from translation_tasks'))
  record('R-three-real-action-planner-store-paths-and-automatic-threshold-production-disabled')

  # Real SQL failures propagate as private generic500, never denial or success.
  faults=[('locale',member_ctx,member,'"user"',"if new.locale is distinct from old.locale then raise exception 'S_PRIVATE_SQL_SECRET';end if;return new;"),
   ('privacy',privacy_ctx,subject,'user_privacy_preferences',"raise exception 'S_PRIVATE_SQL_SECRET';"),
   ('registration',owner_ctx,owner,'admin_history',"if new.action='settings.registrationChanged' then raise exception 'S_PRIVATE_SQL_SECRET';end if;return new;")]
  for kind,ctx,actor,table,body in faults:
   sql('create function s_fault() returns trigger language plpgsql as $$begin '+body+'end $$')
   sql('create trigger s_fault before '+('update' if kind=='locale' else 'insert')+' on '+table+' for each row execute function s_fault()')
   try:
    before=facts();path,fields=settings(kind,actor);private(post(ctx,path,fields),500);assert facts()==before
   finally:sql('drop trigger s_fault on '+table);sql('drop function s_fault()')
  sql("create function s_r_fault() returns trigger language plpgsql as $$begin raise exception 'S_PRIVATE_SQL_SECRET';end $$")
  sql('create trigger s_r_fault before insert on translation_tasks for each row execute function s_r_fault()')
  try:
   before=facts();private(post(r_ctx,t(3),{'intent':'generateTopicTitleTranslation'},generation),500);assert facts()==before
  finally:sql('drop trigger s_r_fault on translation_tasks');sql('drop function s_r_fault()')
  record('O-P-Q-R-actual-SQL-500-private-and-whole-domain-rollback')

  # Genuine statement timeout on actor lock for each canonical domain.
  sql("ALTER ROLE postgres IN DATABASE vico_sa04_s_browser_test SET statement_timeout='650ms'")
  try:
   for kind,ctx,actor in [('locale',member_ctx,member),('privacy',privacy_ctx,subject),('registration',owner_ctx,owner),('generation',r_ctx,r_actor)]:
    before=facts();holder=actor_hold(actor)
    try:
     if kind=='generation':private(post(ctx,t(3),{'intent':'generateTopicTitleTranslation'},generation),503)
     else:
      path,fields=settings(kind,actor);private(post(ctx,path,fields),503)
    finally:release(holder)
    assert facts()==before
  finally:sql('ALTER ROLE postgres IN DATABASE vico_sa04_s_browser_test RESET statement_timeout')
  record('O-P-Q-R-actual-actor-wait-statement-timeout-private-503-no-write')

  # An active session and both preflights pass; the persistent writer then waits
  # on real content. A later lifecycle commit must still stop R before effects.
  holder=hold('select id from forum_topics where id=$1 for update',[prefix+'-topic-4']);before=facts()
  with ThreadPoolExecutor(max_workers=1) as executor:
   pending=executor.submit(direct,cookies(r_ctx),t(4),{'intent':'generateTopicTitleTranslation'},generation)
   try:
    waits('forum_topics');sql("update \"user\" set deactivated_at=clock_timestamp(),deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years' where id=$1",[r_actor])
   finally:release(holder)
   private(pending.result(timeout=20),401)
  assert facts()==before
  record('R-real-HTTP-preflight-content-wait-state-wins-and-provisional-head-rollback')

  mounted=[]
  for kind,ctx,actor,selector in [('locale',member_ctx,member,'form.settings-locale-form'),('privacy',privacy_ctx,subject,'form.settings-privacy-form'),('registration',owner_ctx,owner,'form.settings-registration-form')]:
   phase='mounted-'+kind;page=ctx.new_page();page_errors(page);path,fields=settings(kind,actor)
   private(page.goto(base+path,wait_until='networkidle'),200);form=page.locator(selector);assert form.count()==1
   if kind=='locale':form.locator('select[name="locale"]').select_option('he')
   before=facts();holder=actor_hold(actor,True)
   with ThreadPoolExecutor(max_workers=1) as executor:
    pending=executor.submit(direct,cookies(ctx),path,fields)
    try:waits('"user"')
    finally:release(holder)
    private(pending.result(timeout=20),401)
   assert facts()==before
   mounted_denial(page,form,path);assert facts()==before
   page.screenshot(path=str(a.output/(kind+'-late401.png')),full_page=True)
   mounted.append(page)
  record('O-P-Q-preflight-admitted-late-native-401-and-mounted-forms-no-auto-POST')

  # Neutral public projections retain source content, never old structured identity.
  marker=prefix+'-PRIVATE-IDENTITY'
  sql('update "user" set name=$2,image=$3 where id=$1',[member,marker+'-NAME',base+'/'+marker+'-AVATAR'])
  sql('insert into forum_profiles(user_id,bio,website_url) values($1,$2,$3)',[member,marker+'-BIO','https://example.test/'+marker+'-LINK'])
  guest=browser.new_context()
  for path in ['/en/users/'+member,'/en/users/'+member+'.data','/en/topics/'+prefix+'-topic-0','/en/topics/'+prefix+'-topic-0.data','/en/','/en/.data']:
   response=guest.request.get(base+path);assert response.status==200,(path,response.status,response.text()[:100])
   assert marker not in response.text(),path
  source=guest.request.get(base+'/ru/topics/'+prefix+'-topic-0')
  assert 'Исходный заголовок' in source.text()
  assert sql('select id from forum_posts where author_id=$1',[member])
  assert sql('select bio from forum_profiles where user_id=$1',[member])[0]['bio']==marker+'-BIO'
  for ctx in [member_ctx,privacy_ctx,owner_ctx,r_ctx]:
   # Canonical protected auth API denies401; internal pre-routing lookup instead returns no session.
   private(ctx.request.get(base+'/api/auth/get-session'),401)
  signed_out=member_ctx.request.post(base+'/api/auth/sign-out',headers={'Origin':base},data={});assert signed_out.status==200
  record('A-H-retained-content-neutral-HTML-data-and-I-session-signout-composition')
  assert not errors,errors
  assert not external,external
  browser.close();record('whole-S-connected-pass')
finally:
 (a.output/'results.json').write_text(json.dumps({'implementationHead':os.environ.get('IMPLEMENTATION_SHA'),'cases':records,'pageErrors':errors,'externalRequests':external},indent=2))
