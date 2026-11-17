"""SA08-A actual Worker/Better Auth/PG17 Overview and final History controls; no 08-B full-program activation."""
import argparse,json,os,re,select,shutil,subprocess
from pathlib import Path
from uuid import uuid4
from urllib.parse import urlparse,quote
from contextlib import contextmanager
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:4238');p.add_argument('--output',type=Path,required=True);a=p.parse_args();base=a.url.rstrip('/');repo=Path(__file__).resolve().parents[3]
assert os.environ.get('CI')=='true' and urlparse(base).hostname in ('localhost','127.0.0.1')
db=urlparse(os.environ['DATABASE_URL']);assert db.hostname in ('localhost','127.0.0.1') and db.path=='/vico_sa08_browser_test'
a.output.mkdir(parents=True,exist_ok=True);node=shutil.which('node');prefix='sa08-'+uuid4().hex[:10];owner='sa08-synthetic-owner';pg=None;records=[];errors=[];external=[]
def record(case,**fields):records.append({'case':case,**fields});print('SA08_CONNECTED '+json.dumps(records[-1]),flush=True)
def rpc(value):
 pg.stdin.write(json.dumps(value)+'\n');pg.stdin.flush();assert select.select([pg.stdout],[],[],60)[0],'fixture timeout';reply=json.loads(pg.stdout.readline());assert 'error' not in reply,reply;return reply['result']
def sql(statement,params=None):return rpc({'operation':'sql','sql':statement,'params':params or []})
def private_headers(response,status):
 assert response.status==status,(response.status,status)
 assert {'private','no-store'}<={x.strip() for x in response.headers.get('cache-control','').split(',')}
def private(response,status):
 private_headers(response,status)
 body=response.text();assert 'SA08_PRIVATE' not in body;assert 'SA07_PRIVATE' not in body;assert 'SA07_L_PRIVATE' not in body;assert 'SA07_F_PRIVATE' not in body;assert 'SA07_D_PRIVATE' not in body;assert 'SA07_I_PRIVATE' not in body;assert 'private/fenced-v1/' not in body;return response

def visit(page,path):private(page.goto(base+path,wait_until='networkidle'),200)
def refresh(page,path,monitor):
 # A React Router data response may be cancelled by Chromium after its decoded
 # state has reached the DOM. Network requestfinished is not UI completion.
 clock=page.locator('[data-monitor-key="'+monitor+'"] time').first
 previous=clock.get_attribute('datetime')
 with page.expect_response(lambda r:r.request.method=='GET' and path+'.data' in r.url,timeout=15000) as loaded:
  page.locator('[data-monitor-key="'+monitor+'"] nav a').nth(1).click()
 private_headers(loaded.value,200)
 expect(clock).not_to_have_attribute('datetime',previous,timeout=15000)
 # Independently inspect the complete real route DTO; no mocked response or
 # extra bucket call is introduced by this ordinary read.
 private(page.context.request.get(base+path+'.data'),200)
 assert 'SA07_F_PRIVATE' not in page.locator('body').inner_text()
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
 pg=subprocess.Popen([node,'--import','tsx',str(repo/'tests/browser/sa08/pg.mjs')],cwd=repo,stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,bufsize=1);assert pg.stdout.readline().strip()=='READY'
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('PLAYWRIGHT_EXECUTABLE') or None,channel=None if os.environ.get('PLAYWRIGHT_EXECUTABLE') else os.environ.get('PLAYWRIGHT_CHANNEL','chrome'),args=['--no-sandbox'])
  contexts=[]
  def context():
   ctx=browser.new_context(viewport={'width':1280,'height':900},service_workers='block',extra_http_headers={'cf-connecting-ip':'192.0.2.'+str(100+len(contexts))});contexts.append(ctx)
   ctx.route('**/*',lambda route:route.continue_() if route.request.url.startswith(base+'/') else (external.append(route.request.url),route.abort())[-1]);return ctx
  def account(label):
   ctx=context();email=prefix+'-'+label+'@test.invalid';password='SA08-fixture-password-123456'
   r=ctx.request.post(base+'/api/auth/sign-up/email',headers={'Origin':base},data={'name':label,'email':email,'password':password});assert r.status==200
   return ctx,r.json()['user']['id'],email,password
  oc,issued,email,password=account('owner');ac,admin,_,_=account('admin');mc,member,_,_=account('member');guest=context()
  sql('insert into "user"(id,name,email) values($1,$1,$2)',[owner,prefix+'-bound@test.invalid'])
  assert sql('update "session" set user_id=$1 where user_id=$2 returning id',[owner,issued])
  sql("insert into authz_user_roles(user_id,role_id) values($1,'builtin-admin')",[admin])
  fixture=rpc({'operation':'seed','prefix':prefix});page=oc.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  root='/en/super-admin';events=root+'/events';scoped=root+'/monitoring/integrations/integrations.translation/history'
  for ctx,status in [(guest,401),(ac,403),(mc,403)]:
   for path in [root,events+'?origin=invalid',scoped+'?kind=invalid']:
    for suffix in ['', '.data']:
     pathname,_,query=path.partition('?');private(ctx.request.get(base+pathname+suffix+('?' +query if query else '')),status)
  assert not sql('select id from owner_monitor_observations')
  record('Owner-admission-before-Overview-source-and-History-filter-work')
  for locale in ['en','ru','he']:
   for width in [1280,768,320]:
    page.set_viewport_size({'width':width,'height':900});visit(page,f'/{locale}/super-admin')
    expect(page.locator('[data-overview-area]')).to_have_count(13)
    expect(page.locator('[data-overview-area][data-status="measured"]')).to_have_count(12)
    infrastructure=page.locator('[data-overview-area="infrastructure"]')
    expect(infrastructure).to_have_attribute('data-status','placeholder');expect(infrastructure.locator('a[href*="history"]')).to_have_count(0)
    expect(page.locator('[data-overview-field="background.translation:pending"] dd')).to_have_text('55')
    expect(page.locator('[data-overview-field="integrations.translation:actualPending"] dd')).to_have_text('55')
    assert page.locator('html').get_attribute('dir')==('rtl' if locale=='he' else 'ltr')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    web_times=page.locator('[data-overview-source]').evaluate_all("(nodes)=>nodes.filter(n=>n.textContent.includes('web-database')).map(n=>n.querySelector('time')?.dateTime).filter(Boolean)")
    assert len(set(web_times))==1,web_times
    if width==320:
     page.locator('[data-overview-area="files"] summary').click()
     assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
     page.screenshot(path=str(a.output/(locale+'-overview-320.png')),full_page=True)
   record('all13-localized-responsive-areas-shared-source-clocks-disabled-runtime',locale=locale)
  page.set_viewport_size({'width':1280,'height':900});visit(page,root)
  before=sql("select id,monitor_key from owner_monitor_observations where resource_scope='global' and monitor_key not like 'system.%' order by id")
  clock=page.locator('[data-overview-source="system"] time').first;previous=clock.get_attribute('datetime')
  with page.expect_response(lambda r:r.request.method=='GET' and root+'.data' in r.url) as refreshed:page.locator('[data-overview-refresh]').click()
  private_headers(refreshed.value,200);expect(clock).not_to_have_attribute('datetime',previous,timeout=15000)
  assert sql("select id,monitor_key from owner_monitor_observations where resource_scope='global' and monitor_key not like 'system.%' order by id")==before
  assert not sql("select id from owner_monitor_observations where resource_scope like 'storage:%'")
  assert not sql("select id from owner_events where source='operation' and kind like 'file.%'")
  record('ordinary-global-snapshot-gates-no-new-storage-probe-or-domain-fact')
  visit(page,events)
  form=page.locator('[data-history-filters]')
  form.locator('[name="area"]').select_option('integrations');form.locator('[name="monitor"]').select_option('integrations.translation')
  form.locator('[name="origin"]').select_option('operational-event');form.locator('[name="kind"]').select_option('task.planned')
  from_time='2026-01-01T00:00:00.000001Z';until_time='2027-01-01T00:00:00.000002Z'
  form.locator('[name="from"]').fill(from_time);form.locator('[name="until"]').fill(until_time)
  form.locator('button[type=submit]').focus();page.keyboard.press('Enter');page.wait_for_url(re.compile(r'.*[?&]kind=task[.]planned.*'),timeout=15000)
  expected={'area':'integrations','monitor':'integrations.translation','origin':'operational-event','kind':'task.planned','from':from_time,'until':until_time}
  from urllib.parse import parse_qs
  assert parse_qs(urlparse(page.url).query)=={k:[v] for k,v in expected.items()}
  expect(page.locator('[data-history-kind="task.planned"]')).to_have_count(25)
  filtered_path=page.url.removeprefix(base)
  text=collect(page,filtered_path);ids=sql("select id from owner_events where source='operation' and kind='task.planned'")
  assert len(ids)==55
  for row in ids:assert text.count(row['id'])==1,(row['id'],text.count(row['id']))
  assert parse_qs(urlparse(page.url).query)['from']==[from_time]
  expect(page.locator('[name="from"]')).to_have_value(from_time);expect(page.locator('[name="kind"]')).to_have_value('task.planned')
  record('real-keyboard-six-filter-URL-and-three-pages-original-identities-without-duplicates')
  for locale in ['en','ru','he']:
   page.set_viewport_size({'width':320,'height':900});visit(page,'/'+locale+filtered_path[len('/en'):])
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
   expect(page.locator('[data-history-filters] [name="kind"]')).to_have_value('task.planned')
   page.screenshot(path=str(a.output/(locale+'-filters-320.png')),full_page=True)
   record('localized-responsive-final-filter-form-UTC-microseconds',locale=locale)
  page.set_viewport_size({'width':1280,'height':900});visit(page,scoped)
  form=page.locator('[data-history-filters]');expect(form.locator('[name="area"]')).to_have_count(0);expect(form.locator('[name="monitor"]')).to_have_count(0)
  form.locator('[name="origin"]').select_option('operational-event')
  assert 'task.reconciliationPass' in form.locator('[name="kind"] option').evaluate_all('(nodes)=>nodes.map(n=>n.value)')
  form.locator('[name="kind"]').select_option('task.planned');form.locator('button[type=submit]').click();page.wait_for_url(re.compile(r'.*[?&]kind=task[.]planned.*'),timeout=15000)
  expect(page.locator('[data-history-kind="task.planned"]')).to_have_count(25)
  oldest=page.locator('.admin-history-paging a[href*="before="]').get_attribute('href')
  assert parse_qs(urlparse(oldest).query)['kind']==['task.planned'];assert '/integrations/integrations.translation/history' in oldest
  record('scoped-History-same-filter-model-reconciliation-choice-and-paging')
  for query in ['?area=unknown','?origin=auth-event&origin=auth-event','?from=2026-02-31T00%3A00%3A00.000000Z','?area=files&kind=auth.sessionCreated','?origin=','?sql=private']:
   private(oc.request.get(base+events+'.data'+query),400);private(guest.request.get(base+events+'.data'+query),401)
  private(oc.request.get(base+root+'?probe=forbidden'),400)
  record('strict-incompatible-duplicate-empty-calendar-filters-before-query-and-private-Owner-errors')
  sql('alter table forum_attachment_sweep rename to sa08_hidden_sweep')
  try:
   visit(page,root);expect(page.locator('[data-overview-area="files"]')).to_have_attribute('data-status','unavailable')
   expect(page.locator('[data-overview-area="files"] [data-overview-field]')).to_have_count(0)
   expect(page.locator('[data-overview-area="background"]')).to_have_attribute('data-status','partial')
   expect(page.locator('[data-overview-area="accounts"]')).to_have_attribute('data-status','measured')
   expect(page.locator('[data-overview-field="background.translation:pending"] dd')).to_have_text('55')
   private(guest.request.get(base+root+'.data'),401)
  finally:sql('alter table sa08_hidden_sweep rename to forum_attachment_sweep')
  record('actual-independent-source-failure-200-partial-no-fake-zero-and-successful-adjacent-values')
  sql("delete from owner_monitor_observations where resource_scope='global' and monitor_key not like 'system.%'")
  sql("create function sa08_sample_fault() returns trigger language plpgsql as $$begin raise exception 'SA08_PRIVATE_SQL';end$$;create trigger sa08_sample_fault before insert on owner_monitor_observations for each row execute function sa08_sample_fault()")
  try:
   visit(page,root);expect(page.locator('[data-overview-area="accounts"]')).to_have_attribute('data-status','measured')
   assert 'recording is unavailable' in page.locator('[role="status"]').all_text_contents()[0]
   assert 'SA08_PRIVATE' not in page.locator('body').inner_text()
  finally:sql('drop trigger sa08_sample_fault on owner_monitor_observations;drop function sa08_sample_fault()')
  record('actual-atomic-batch-recorder-failure-does-not-erase-current-measurements')
  visit(page,root);held=[];route_state={'holding':True}
  def delayed(route):
   response=route.fetch(timeout=15000)
   if route_state['holding']:held.append((route,response))
   else:route.fulfill(response=response)
  page.route('**/super-admin.data*',delayed);page.locator('[data-overview-refresh]').click()
  for _ in range(100):
   if held:break
   page.wait_for_timeout(25)
  assert held
  with page.expect_response(lambda r:r.request.method=='POST' and '/api/auth/sign-out' in r.url) as signed:page.locator('.auth-sign-out').click()
  assert signed.value.status==200;expect(page.locator('.auth-controls[data-state=guest]')).to_have_count(1);expect(page.locator('[data-owner-overview]')).to_have_count(0)
  route_state["holding"]=False
  for route,response in held:
   try:route.fulfill(response=response)
   except Exception:pass
  page.unroute_all(behavior='wait')
  page.wait_for_timeout(250);expect(page.locator('[data-owner-overview]')).to_have_count(0)
  assert not errors,errors;assert not external,external
  record('known-signout-and-late-Overview-response-cannot-restore-private-summary')
  record('SA08-A-connected-pass');browser.close()
finally:
 if pg:
  pg.stdin.close()
  try:pg.wait(timeout=8)
  except subprocess.TimeoutExpired:pg.terminate();pg.wait(timeout=5)
 (a.output/'results.json').write_text(json.dumps({'head':os.environ.get('IMPLEMENTATION_SHA'),'scope':'SA08-A Overview and final History filters; actual Worker/BA/PG17; no08B full-program activation','cases':records,'pageErrors':errors,'external':external},ensure_ascii=False,indent=2))
