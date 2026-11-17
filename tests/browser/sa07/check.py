"""Genuine BA/Worker/PG17 Background acceptance. Code-only fixture invocation does not enable job runtime."""
import argparse,json,os,select,shutil,subprocess
from pathlib import Path
from uuid import uuid4
from urllib.parse import urlparse
from contextlib import contextmanager
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:4237');p.add_argument('--output',type=Path,required=True);a=p.parse_args();base=a.url.rstrip('/');repo=Path(__file__).resolve().parents[3]
assert os.environ.get('CI')=='true' and urlparse(base).hostname in ('localhost','127.0.0.1')
db=urlparse(os.environ['DATABASE_URL']);assert db.hostname in ('localhost','127.0.0.1') and db.path=='/vico_sa07_browser_test'
a.output.mkdir(parents=True,exist_ok=True);node=shutil.which('node');prefix='sa07-'+uuid4().hex[:10];owner='sa07-synthetic-owner';pg=None;records=[];errors=[];external=[]
def record(case,**fields):records.append({'case':case,**fields});print('SA07_CONNECTED '+json.dumps(records[-1]),flush=True)
def rpc(value):
 pg.stdin.write(json.dumps(value)+'\n');pg.stdin.flush();assert select.select([pg.stdout],[],[],60)[0],'fixture timeout';reply=json.loads(pg.stdout.readline());assert 'error' not in reply,reply;return reply['result']
def sql(statement,params=None):return rpc({'operation':'sql','sql':statement,'params':params or []})
def private(response,status):
 assert response.status==status,(response.status,status,response.text()[:160]);assert {'private','no-store'}<={x.strip() for x in response.headers.get('cache-control','').split(',')};assert 'SA07_PRIVATE' not in response.text();return response
def visit(page,path):private(page.goto(base+path,wait_until='networkidle'),200)
@contextmanager
def hold(statement):
 code="import pg from 'pg';const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();await c.query('begin');await c.query(process.argv[1]);console.log('HELD');process.stdin.once('data',async()=>{await c.query('rollback');await c.end();});"
 child=subprocess.Popen([node,'--input-type=module','-e',code,statement],cwd=repo,stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True);assert child.stdout.readline().strip()=='HELD'
 try:yield
 finally:child.communicate('release\n',timeout=10)
def collect(page,path):
 chunks=[];visit(page,path)
 for _ in range(12):
  chunks.append(page.locator('.super-admin-timeline').inner_text());link=page.locator('.admin-history-paging a[href*="before="]')
  if not link.count():break
  visit(page,link.first.get_attribute('href'))
 else:raise AssertionError('History exceeded fixture bounds')
 return '\n'.join(chunks)
try:
 pg=subprocess.Popen([node,'--import','tsx',str(repo/'tests/browser/sa07/pg.mjs')],cwd=repo,stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,bufsize=1);assert pg.stdout.readline().strip()=='READY'
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('PLAYWRIGHT_EXECUTABLE') or None,channel=None if os.environ.get('PLAYWRIGHT_EXECUTABLE') else os.environ.get('PLAYWRIGHT_CHANNEL','chrome'),args=['--no-sandbox'])
  contexts=[]
  def context():
   ctx=browser.new_context(viewport={'width':1280,'height':900},service_workers='block',extra_http_headers={'cf-connecting-ip':'192.0.2.'+str(100+len(contexts))});contexts.append(ctx)
   ctx.route('**/*',lambda route:route.continue_() if route.request.url.startswith(base+'/') else (external.append(route.request.url),route.abort())[-1]);return ctx
  def account(label):
   ctx=context();email=prefix+'-'+label+'@test.invalid';password='SA07-fixture-password-123456';r=ctx.request.post(base+'/api/auth/sign-up/email',headers={'Origin':base},data={'name':label,'email':email,'password':password});assert r.status==200,(r.status,r.text()[:160]);return ctx,r.json()['user']['id'],email,password
  oc,issued,email,password=account('owner');ac,admin,_,_=account('admin');mc,member,_,_=account('member');guest=context()
  sql('insert into "user"(id,name,email) values($1,$1,$2) on conflict(id) do nothing',[owner,prefix+'-bound@test.invalid']);assert sql('update "session" set user_id=$1 where user_id=$2 returning id',[owner,issued]);sql("insert into authz_user_roles(user_id,role_id) values($1,'builtin-admin')",[admin])
  fixture=rpc({'operation':'seed','prefix':prefix});page=oc.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  current='/en/super-admin/monitoring/background';history=current+'/background.translation/history'
  for ctx,status in [(guest,401),(ac,403),(mc,403)]:
   for path in [current,history]:
    for suffix in ['', '.data']:private(ctx.request.get(base+path+suffix),status)
  assert sql("select count(*)::int n from owner_monitor_observations where monitor_key='background.translation'")==[{'n':0}]
  record('genuine-BA-Owner-and-nonOwner-denials-before-task-samples-code-only-real-store-fixtures')
  sql("create function sa07_sample_fault() returns trigger language plpgsql as $$begin raise exception 'SA07_PRIVATE_SQL';end$$;create trigger sa07_sample_fault before insert on owner_monitor_observations for each row execute function sa07_sample_fault()")
  try:assert 'unavailable' in private(oc.request.get(base+current+'.data'),200).text()
  finally:sql('drop trigger sa07_sample_fault on owner_monitor_observations;drop function sa07_sample_fault()')
  record('fresh-measured-task-state-survives-actual-sample-recording-failure')
  for locale in ['en','ru','he']:
   for width in [1280,768,320]:
    page.set_viewport_size({'width':width,'height':900});visit(page,f'/{locale}/super-admin/monitoring/background')
    expect(page.locator('[data-task-current]')).to_have_count(1);assert page.locator('html').get_attribute('dir')==('rtl' if locale=='he' else 'ltr');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    expect(page.locator('[data-monitor-key="background.translation"] form')).to_have_count(0);expect(page.locator('[data-monitor-key="background.translation"] nav a')).to_have_count(3)
    if width==320:page.screenshot(path=str(a.output/(locale+'-background-320.png')),full_page=True)
   record('localized-responsive-Background-readonly-current-and-disabled-unwired-runtime',locale=locale)
  page.set_viewport_size({'width':1280,'height':900});visit(page,current)
  sample=sql("select id,value from owner_monitor_observations where monitor_key='background.translation'")
  with page.expect_response(lambda r:r.request.method=='GET' and '/monitoring/background.data' in r.url) as response:page.locator('[data-monitor-key="background.translation"] nav a').nth(1).click()
  private(response.value,200);assert sql("select id,value from owner_monitor_observations where monitor_key='background.translation'")==sample
  record('real-GET-refresh-keeps-fifteen-minute-sample-gate')
  for path in [history,'/en/super-admin/events?origin=operational-event&kind=task.planned']:
   assert fixture['event'] in collect(page,path)
  visit(page,current);link=page.locator('[data-monitor-key="background.translation"] nav a').first;link.focus();page.keyboard.press('Enter');expect(page).to_have_url(base+history)
  record('original-task-facts-global-scoped-filtered-multiple-pages-and-keyboard-History')
  private(oc.request.get(base+current+'?debug=1'),400);private(oc.request.get(base+history+'?origin=auth-event'),400)
  sql('alter table translation_tasks rename to sa07_hidden_tasks')
  try:
   for path in [current+'.data','/en/SUPER-ADMIN/monitoring/BACKGROUND.data','/en/%73uper-admin/monitoring/background///']:private(oc.request.get(base+path),500)
  finally:sql('alter table sa07_hidden_tasks rename to translation_tasks')
  with hold('lock table translation_tasks in access exclusive mode'):private(oc.request.get(base+current+'.data',timeout=15000),503)
  record('actual-task-source-failure500-lock503-and-private-aliases')
  visit(page,current);held=[]
  def delayed(route):
   if not held:
    r=route.fetch();private(r,200);held.append((route,r))
   else:route.continue_()
  page.route('**/super-admin/monitoring/background.data*',delayed);page.locator('[data-monitor-key="background.translation"] nav a').nth(1).click()
  for _ in range(100):
   if held:break
   page.wait_for_timeout(20)
  assert held
  with page.expect_response(lambda r:r.request.method=='POST' and '/api/auth/sign-out' in r.url) as signed:page.locator('.auth-sign-out').click()
  assert signed.value.status==200;expect(page.locator('.auth-controls[data-state=guest]')).to_have_count(1);expect(page.locator('[data-task-current]')).to_have_count(0)
  for route,response in held:
   try:route.fulfill(response=response)
   except Exception:pass
  page.wait_for_timeout(250);expect(page.locator('[data-task-current]')).to_have_count(0);page.unroute('**/super-admin/monitoring/background.data*')
  assert oc.request.post(base+'/api/auth/sign-in/email',headers={'Origin':base},data={'email':email,'password':password}).status==200;assert sql('update "session" set user_id=$1 where user_id=$2 returning id',[owner,issued]);visit(page,current);expect(page.locator('[data-task-current]')).to_have_count(1)
  record('known-signout-and-held-old-Owner-response-do-not-restore-private-task-DOM')
  assert not errors,errors;assert not external,external;record('SA07-B1-connected-pass');browser.close()
finally:
 if pg:
  pg.stdin.close()
  try:pg.wait(timeout=8)
  except subprocess.TimeoutExpired:pg.terminate();pg.wait(timeout=5)
 (a.output/'results.json').write_text(json.dumps({'head':os.environ.get('IMPLEMENTATION_SHA'),'scope':'SA07-B1 only; code-only real task-store fixtures; runtime stays disabled/unwired','cases':records,'pageErrors':errors,'external':external},ensure_ascii=False,indent=2))
