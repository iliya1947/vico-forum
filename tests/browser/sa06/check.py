"""SA06 actual Worker / Better Auth / PG17 / Chromium; synthetic local fixtures only."""
import argparse,json,os,select,shutil,subprocess,time,re
from pathlib import Path
from contextlib import contextmanager
from urllib.parse import urlparse,quote,urlencode
from uuid import uuid4
from playwright.sync_api import expect,sync_playwright
import sys
from pathlib import Path as FixturePath
sys.path.insert(0, str(FixturePath(__file__).resolve().parents[1]))
from verified_fixture import signup_verified_session
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:4236');p.add_argument('--output',type=Path,required=True);a=p.parse_args();base=a.url.rstrip('/');db=os.environ.get('DATABASE_URL','')
assert os.environ.get('CI')=='true' and urlparse(base).hostname in ('localhost','127.0.0.1')
assert urlparse(db).hostname in ('localhost','127.0.0.1') and urlparse(db).path=='/vico_sa06_browser_test'
repo=Path(__file__).resolve().parents[3];node=shutil.which('node');assert node;a.output.mkdir(parents=True,exist_ok=True)
prefix='sa06-'+uuid4().hex[:10];owner='sa06-synthetic-owner';records=[];errors=[];external=[];contexts=[];pg=None
areas={'forum':['forum.structure','forum.state','forum.content','forum.presence'],'administration':['administration.authorization','administration.measures','administration.registration'],'moderation':['moderation.help','moderation.complaints'],'notifications':['notifications.inbox']}
def record(case,**fields):records.append({'case':case,**fields});print('SA06_CONNECTED '+json.dumps(records[-1]),flush=True)
def rpc(value):
 pg.stdin.write(json.dumps(value)+'\n');pg.stdin.flush();assert select.select([pg.stdout],[],[],40)[0],'Fixture timeout';result=json.loads(pg.stdout.readline());assert 'error' not in result,result;return result['result']
def sql(query,params=None):return rpc({'operation':'sql','sql':query,'params':params or []})
def private(r,status):
 assert r.status==status,(r.status,status,r.text()[:180]);assert {'private','no-store'}<={s.strip() for s in r.headers.get('cache-control','').split(',')},r.headers;assert 'SA06_PRIVATE_SQL' not in r.text();return r
def visit(page,path):private(page.goto(base+path,wait_until='networkidle'),200)
def new_page(ctx):
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));return page
@contextmanager
def hold(statement):
 code="import pg from 'pg';const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();await c.query('begin');await c.query(process.argv[1]);console.log('HELD');process.stdin.once('data',async()=>{await c.query('commit');await c.end();});"
 child=subprocess.Popen([node,'--input-type=module','-e',code,statement],cwd=repo,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
 assert child.stdout.readline().strip()=='HELD'
 try:yield
 finally:
  if child.poll() is None:child.communicate('release\n',timeout=10)
def collect(page,path,selector='.super-admin-timeline',older='.admin-history-paging a[href*="before="]'):
 text=[];visit(page,path)
 for _ in range(32):
  text.append(page.locator(selector).inner_text() if page.locator(selector).count() else '')
  link=page.locator(older)
  if not link.count():break
  visit(page,link.first.get_attribute('href'))
 else:raise AssertionError('History did not finish within expected fixture bounds')
 return '\n'.join(text)
try:
 pg=subprocess.Popen([node,'--import','tsx',str(repo/'tests/browser/sa06/pg.mjs')],cwd=repo,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1);assert pg.stdout.readline().strip()=='READY'
 sql('drop trigger if exists sa06_browser_sample_fault on owner_monitor_observations;drop function if exists sa06_browser_sample_fault()')
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('PLAYWRIGHT_EXECUTABLE') or None,channel=None if os.environ.get('PLAYWRIGHT_EXECUTABLE') else os.environ.get('PLAYWRIGHT_CHANNEL','chrome'),args=['--no-sandbox'])
  def context():
   ctx=browser.new_context(viewport={'width':1280,'height':900},service_workers='block',extra_http_headers={'cf-connecting-ip':'192.0.2.'+str(100+len(contexts))});contexts.append(ctx)
   ctx.route('**/*',lambda route:route.continue_() if route.request.url.startswith(base+'/') else (external.append(route.request.url),route.abort())[-1]);return ctx
  def account(label):
   ctx=context();email=prefix+'-'+label+'@test.invalid';password='SA06-fixture-password-123456';r=signup_verified_session(sql, ctx.request, base,headers={'Origin':base},data={'name':prefix+'-'+label,'email':email,'password':password});assert r.status==200,(r.status,r.text()[:180]);return ctx,r.json()['user']['id'],email,password
  oc,issued,owner_email,password=account('owner');mc,member,_,_=account('member');ac,admin,_,_=account('admin');guest=context()
  sql('insert into "user"(id,name,email) values($1,$1,$2) on conflict(id) do nothing',[owner,prefix+'-bound@test.invalid']);assert sql('update "session" set user_id=$1 where user_id=$2 returning id',[owner,issued]);sql("insert into authz_user_roles(user_id,role_id) values($1,'builtin-admin')",[admin])
  fixture=rpc({'operation':'seed','prefix':prefix,'owner':owner,'member':member,'admin':admin});page=new_page(oc)
  record('genuine-BA-Owner-Admin-member-native-Forum-AP10-Complaint-notification-fixtures')
  paths=[f'/en/super-admin/monitoring/{area}' for area in areas]+[f'/en/super-admin/monitoring/{area}/{key}/history' for area,keys in areas.items() for key in keys]
  before=sql('select count(*)::int n from owner_monitor_observations')[0]['n']
  for ctx,status in [(guest,401),(ac,403),(mc,403)]:
   for path in paths:
    for suffix in ['', '.data']:private(ctx.request.get(base+path+suffix),status)
  assert sql('select count(*)::int n from owner_monitor_observations')[0]['n']==before
  record('four-areas-ten-histories-document-data-deny-before-private-reads')

  # First native current read has a real observation failure; native facts remain.
  sql("create function sa06_browser_sample_fault() returns trigger language plpgsql as $$begin raise exception 'SA06_PRIVATE_SQL';end $$;create trigger sa06_browser_sample_fault before insert on owner_monitor_observations for each row execute function sa06_browser_sample_fault()")
  try:
   r=private(oc.request.get(base+'/en/super-admin/monitoring/moderation.data'),200);assert 'unavailable' in r.text() and 'SA06_PRIVATE_SQL' not in r.text()
  finally:sql('drop trigger sa06_browser_sample_fault on owner_monitor_observations;drop function sa06_browser_sample_fault()')
  record('real-observation-failure-preserves-fresh-native-current-and-reports-unavailable-recording')

  for locale in ['en','ru','he']:
   for width in [1280,768,320]:
    page.set_viewport_size({'width':width,'height':900})
    for area,keys in areas.items():
     visit(page,f'/{locale}/super-admin/monitoring/{area}');expect(page.locator('[data-native-area]')).to_have_attribute('data-native-area',area);expect(page.locator('.super-admin-monitor')).to_have_count(len(keys))
     assert page.locator('html').get_attribute('dir')==('rtl' if locale=='he' else 'ltr')
     assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Horizontal overflow'
     for key in keys:
      card=page.locator('[data-monitor-key="'+key+'"]');expect(card.locator('nav a')).to_have_count(2 if key=='forum.presence' else 3);expect(card).not_to_contain_text('SA06_PRIVATE')
     if width==320:page.screenshot(path=str(a.output/(locale+'-'+area+'-320.png')),full_page=True)
   record('localized-four-native-areas-keyboard-responsive',locale=locale)
  page.set_viewport_size({'width':1280,'height':900})
  for area,keys in areas.items():
   visit(page,f'/en/super-admin/monitoring/{area}')
   for key in keys:
    href=page.locator('[data-monitor-key="'+key+'"] nav a').first.get_attribute('href');assert href==f'/en/super-admin/monitoring/{area}/{key}/history'
    private(oc.request.get(base+href+'.data'),200)
  record('all-ten-adjacent-native-histories-resolve')
  for area,keys in areas.items():
   visit(page,f'/en/super-admin/monitoring/{area}');link=page.locator('[data-monitor-key=\"'+keys[0]+'\"] nav a').first;href=link.get_attribute('href');link.focus();page.keyboard.press('Enter');expect(page).to_have_url(base+href);page.wait_for_load_state('networkidle')
  record('actual-keyboard-Enter-enters-native-adjacent-History')

  # Fresh reads change current counts; the durable sample gate remains15minutes.
  visit(page,'/en/super-admin/monitoring/forum');samples=sql("select id,fingerprint,value from owner_monitor_observations where monitor_key like 'forum.%' order by id")
  with page.expect_response(lambda r:r.request.method=='GET' and '/monitoring/forum.data' in r.url) as refreshed:page.locator('[data-monitor-key="forum.structure"] nav a').nth(1).click()
  private(refreshed.value,200);assert sql("select id,fingerprint,value from owner_monitor_observations where monitor_key like 'forum.%' order by id")==samples
  record('actual-current-Refresh-preserves-one-sample-per-key-window')

  global_text=collect(page,'/en/super-admin/events');forum_text=collect(page,'/en/super-admin/monitoring/forum/forum.content/history')
  profile_text=collect(page,'/en/users/'+owner,selector='#owner-history',older='#owner-history a[href*="historyBefore="]')
  for text in [global_text,forum_text,profile_text]:assert fixture['title'] in text and 'SA06_PRIVATE' not in text
  assert fixture['appeal'] in global_text and fixture['caseId'] in global_text and fixture['signal'] in global_text
  record('original-revision-identity-global-scoped-person-multiple-pages-and-native-terminal-sources')

  # Monitor navigation reuses the canonical authoritative form and creates one native fact.
  visit(page,'/en/super-admin/monitoring/administration');link=page.locator('[data-monitor-key="administration.authorization"] nav a').nth(2);link.click();page.wait_for_load_state('networkidle')
  role=page.locator('form').filter(has=page.locator('input[name=intent][value=createRole]'));expect(role).to_have_count(1)
  role.locator('[name=slug]').fill(prefix+'-role');role.locator('[name=displayName]').fill('SA06 canonical role');
  with page.expect_response(lambda r:r.request.method=='POST' and '/api/auth/' not in r.url) as created:role.locator('button[type=submit]').click()
  assert created.value.status in (200,302,303);page.wait_for_load_state('networkidle')
  facts=sql("select id from admin_history where actor_id=$1 and action='role.created' and target_id in(select id from authz_roles where slug=$2)",[owner,prefix+'-role']);assert len(facts)==1
  for path in ['/en/super-admin/events','/en/super-admin/monitoring/administration/administration.authorization/history','/en/users/'+owner]:assert facts[0]['id'] in private(oc.request.get(base+path+'.data'),200).text()
  record('canonical-authorization-destination-real-form-one-original-native-command')

  visit(page,'/en/super-admin/monitoring/notifications');page.locator('[data-monitor-key="notifications.inbox"] nav a').nth(2).click();expect(page).to_have_url(base+'/en/notifications');page.wait_for_load_state('networkidle')
  form=page.locator('form').filter(has=page.locator('input[name=intent][value=open]')).first
  expect(form).to_be_visible();notification=form.locator('input[name=notificationId]').input_value()
  with page.expect_response(lambda r:r.request.method=='POST' and '/notifications' in r.url) as opened:form.locator('button[type=submit]').click()
  assert opened.value.status in (200,202,302,303),(opened.value.status,opened.value.headers.get('content-type'));page.wait_for_load_state('networkidle')
  assert sql('select read_at is not null seen from forum_reply_notifications where id=$1 and recipient_user_id=$2',[notification,owner])==[{'seen':True}]
  assert notification in private(oc.request.get(base+'/en/super-admin/monitoring/notifications/notifications.inbox/history.data'),200).text()
  record('own-inbox-only-canonical-first-read-with-original-notification-source',httpStatus=opened.value.status)

  for path in ['/en/super-admin/monitoring/forum?debug=1','/en/super-admin/monitoring/forum/forum.content/history?before=bad','/en/super-admin/monitoring/forum/forum.content/history?before=a&before=b']:
   private(oc.request.get(base+path),400)
  private(oc.request.get(base+'/en/super-admin/monitoring/forum/notifications.inbox/history'),404)
  sql('alter table forum_topic_title_revisions rename to sa06_hidden_title_revisions')
  try:
   for path in ['/en/super-admin/monitoring/forum.data','/en/SUPER-ADMIN/monitoring/FORUM.data','/en/%73uper-admin/monitoring/forum.data','/en/super-admin/monitoring/forum///']:
    private(oc.request.get(base+path),500)
  finally:sql('alter table sa06_hidden_title_revisions rename to forum_topic_title_revisions')
  with hold('lock table forum_complaint_activity in access exclusive mode'):private(oc.request.get(base+'/en/super-admin/monitoring/moderation.data',timeout=15000),503)
  record('actual-native-source-unexpected500-timeout503-and-private-static-data-aliases')

  # Hold an actual Owner response, then known Header signout invalidates its DOM.
  visit(page,'/en/super-admin/monitoring/forum');held=[]
  def delayed(route):
   if not held:
    response=route.fetch();private(response,200);held.append((route,response))
   else:route.continue_()
  page.route('**/super-admin/monitoring/forum.data*',delayed)
  page.locator('[data-monitor-key="forum.structure"] nav a').nth(1).click()
  for _ in range(100):
   if held:break
   page.wait_for_timeout(20)
  assert held
  with page.expect_response(lambda r:r.request.method=='POST' and '/api/auth/sign-out' in r.url) as signed:page.locator('.auth-sign-out').click()
  assert signed.value.status==200;expect(page.locator('.auth-controls[data-state=guest]')).to_have_count(1);expect(page.locator('[data-native-area]')).to_have_count(0)
  for route,response in held:
   try:route.fulfill(response=response)
   except Exception:pass
  page.wait_for_timeout(300);expect(page.locator('[data-native-area]')).to_have_count(0);page.unroute('**/super-admin/monitoring/forum.data*')
  assert oc.request.post(base+'/api/auth/sign-in/email',headers={'Origin':base},data={'email':owner_email,'password':password}).status==200
  assert sql('update "session" set user_id=$1 where user_id=$2 returning id',[owner,issued]);visit(page,'/en/super-admin/monitoring/forum');expect(page.locator('[data-native-area]')).to_have_count(1)
  record('known-auth-signout-purges-native-DOM-and-late-Owner-response-cannot-resurrect-it')
  assert not errors,errors;assert not external,external;record('whole-SA06-connected-pass');browser.close()
finally:
 if pg:
  pg.stdin.close()
  try:pg.wait(timeout=8)
  except subprocess.TimeoutExpired:pg.terminate();pg.wait(timeout=5)
 (a.output/'results.json').write_text(json.dumps({'head':os.environ.get('IMPLEMENTATION_SHA'),'runtime':'actual production Worker/BetterAuth/PG17/Chromium; synthetic fixtures','cases':records,'pageErrors':errors,'external':external},ensure_ascii=False,indent=2))
