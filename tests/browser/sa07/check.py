"""Genuine BA/Worker/PG17 Background, Localization, Files, Data and Integrations acceptance. Code-only fixture invocation does not enable job runtime."""
import argparse,json,os,select,shutil,subprocess
from pathlib import Path
from uuid import uuid4
from urllib.parse import urlparse,quote
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
def private_headers(response,status):
 assert response.status==status,(response.status,status)
 assert {'private','no-store'}<={x.strip() for x in response.headers.get('cache-control','').split(',')}
def private(response,status):
 private_headers(response,status)
 body=response.text();assert 'SA07_PRIVATE' not in body;assert 'SA07_L_PRIVATE' not in body;assert 'SA07_F_PRIVATE' not in body;assert 'SA07_D_PRIVATE' not in body;assert 'SA07_I_PRIVATE' not in body;assert 'private/fenced-v1/' not in body;return response

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
def local_r2(action,key=None,batch=None):
 command={'action':action}
 if key is not None:command['key']=key
 if batch is not None:command['batch']=batch
 result=subprocess.run(['pnpm','exec','tsx','tests/browser/sa07/r2-cleanup.ts'],cwd=repo,input=json.dumps(command),capture_output=True,text=True,timeout=45)
 assert result.returncode==0,result.stderr[-2000:]
 replies=[line.partition('SA07_R2_RESULT ')[2] for line in result.stdout.splitlines() if line.startswith('SA07_R2_RESULT ')]
 assert len(replies)==1,result.stdout[-1000:];return json.loads(replies[0])
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
    expect(page.locator('[data-monitor-key="background.translation"] form')).to_have_count(0);expect(page.locator('[data-monitor-key="background.translation"] nav a')).to_have_count(4)
    if width==320:page.screenshot(path=str(a.output/(locale+'-background-320.png')),full_page=True)
   record('localized-responsive-Background-readonly-current-and-disabled-unwired-runtime',locale=locale)
  page.set_viewport_size({'width':1280,'height':900});visit(page,current)
  sample=sql("select id,value from owner_monitor_observations where monitor_key='background.translation'")
  refresh(page,current,'background.translation');assert sql("select id,value from owner_monitor_observations where monitor_key='background.translation'")==sample
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
  record('SA07-B1-connected-pass')
  local_fixture=rpc({'operation':'localizationSeed','owner':owner});local_current='/en/super-admin/monitoring/localization'
  keys=['localization.registry','localization.ui','localization.content','localization.budget']
  for ctx,status in [(guest,401),(ac,403),(mc,403)]:
   for path in [local_current]+[local_current+'/'+key+'/history' for key in keys]:
    for suffix in ['', '.data']:private(ctx.request.get(base+path+suffix),status)
  assert sql("select count(*)::int n from owner_monitor_observations where monitor_key like 'localization.%'")==[{'n':0}]
  record('Localization-genuine-Owner-admission-before-private-source-reads-and-samples')
  sql("create function sa07_l_sample_fault() returns trigger language plpgsql as $$begin raise exception 'SA07_L_PRIVATE_SQL';end$$;create trigger sa07_l_sample_fault before insert on owner_monitor_observations for each row execute function sa07_l_sample_fault()")
  try:assert 'unavailable' in private(oc.request.get(base+local_current+'.data'),200).text()
  finally:sql('drop trigger sa07_l_sample_fault on owner_monitor_observations;drop function sa07_l_sample_fault()')
  for locale in ['en','ru','he']:
   for width in [1280,768,320]:
    page.set_viewport_size({'width':width,'height':900});visit(page,f'/{locale}/super-admin/monitoring/localization')
    expect(page.locator('[data-localization-current]')).to_have_count(1);assert page.locator('html').get_attribute('dir')==('rtl' if locale=='he' else 'ltr');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    for key in keys:
     article=page.locator('[data-monitor-key="'+key+'"]');expect(article).to_have_count(1);expect(article.locator('form')).to_have_count(0);expect(article.locator('nav a')).to_have_count(3)
    if width==320:page.screenshot(path=str(a.output/(locale+'-localization-320.png')),full_page=True)
   record('localized-responsive-four-Localization-monitors-actual-sources-bundles-disabled-runtime',locale=locale)
  page.set_viewport_size({'width':1280,'height':900});visit(page,local_current)
  samples=sql("select id from owner_monitor_observations where monitor_key like 'localization.%' order by id")
  refresh(page,local_current,'localization.registry');assert sql("select id from owner_monitor_observations where monitor_key like 'localization.%' order by id")==samples
  for key in keys:
   sample=sql('select id from owner_monitor_observations where monitor_key=$1',[key])[0]['id'];assert sample in collect(page,local_current+'/'+key+'/history')
  assert fixture['event'] in collect(page,local_current+'/localization.ui/history?origin=operational-event&kind=task.planned')
  assert local_fixture['title'] in collect(page,local_current+'/localization.content/history?kind=forum.titleRevisionCreated')
  visit(page,local_current);link=page.locator('[data-monitor-key="localization.budget"] nav a').first;link.focus();page.keyboard.press('Enter');expect(page).to_have_url(base+local_current+'/localization.budget/history')
  record('Localization-adjacent-working-original-source-History-and-GET-sample-gate')
  sql('alter table locales rename to sa07_l_hidden_locales')
  try:
   for path in [local_current+'.data','/en/SUPER-ADMIN/monitoring/LOCALIZATION.data','/en/%73uper-admin/monitoring/localization///']:private(oc.request.get(base+path),503)
  finally:sql('alter table sa07_l_hidden_locales rename to locales')
  with hold('lock table content_translation_request_budget_counters in access exclusive mode'):private(oc.request.get(base+local_current+'.data',timeout=15000),503)
  private(oc.request.get(base+local_current+'?sql=forbidden'),400)
  record('Localization-separate-connection-source-outage-lock-and-private-aliases')
  visit(page,local_current);held=[]
  page.route('**/super-admin/monitoring/localization.data*',delayed);page.locator('[data-monitor-key="localization.registry"] nav a').nth(1).click()
  for _ in range(100):
   if held:break
   page.wait_for_timeout(20)
  assert held
  with page.expect_response(lambda r:r.request.method=='POST' and '/api/auth/sign-out' in r.url) as signed:page.locator('.auth-sign-out').click()
  assert signed.value.status==200;expect(page.locator('.auth-controls[data-state=guest]')).to_have_count(1);expect(page.locator('[data-localization-current]')).to_have_count(0)
  for route,response in held:
   try:route.fulfill(response=response)
   except Exception:pass
  page.wait_for_timeout(250);expect(page.locator('[data-localization-current]')).to_have_count(0);page.unroute('**/super-admin/monitoring/localization.data*')
  record('Localization-known-signout-and-late-Owner-response-do-not-restore-private-DOM')
  record('SA07-B1-L-connected-pass')
  assert oc.request.post(base+'/api/auth/sign-in/email',headers={'Origin':base},data={'email':email,'password':password}).status==200
  assert sql('update "session" set user_id=$1 where user_id=$2 returning id',[owner,issued])
  file_current='/en/super-admin/monitoring/files';file_keys=['files.assets','files.operations']
  before=sql("select id from owner_monitor_observations where monitor_key like 'files.%' order by id")
  for ctx,status in [(guest,401),(ac,403),(mc,403)]:
   for path in [file_current]+[file_current+'/'+key+'/history' for key in file_keys]:
    for suffix in ['', '.data']:private(ctx.request.get(base+path+suffix),status)
  assert sql("select id from owner_monitor_observations where monitor_key like 'files.%' order by id")==before
  member_page=mc.new_page();member_page.on('pageerror',lambda e:errors.append(str(e)))
  assert member_page.goto(base+'/en/topics/'+local_fixture['topic'],wait_until='networkidle').status==200
  form=member_page.locator('form[method="post"]:has(input[name="intent"][value="reply"])');expect(form).to_have_count(1)
  resume=member_page.locator('button.forum-composer-resume')
  if resume.count() and resume.is_visible():resume.click()
  operation=form.locator('input[name="editorOperationId"]').input_value();payload=b'SA07 actual Worker local R2 evidence'
  with member_page.expect_request_finished(lambda r:r.method=='POST' and r.url==base+'/api/attachments',timeout=30000) as loaded:
   form.locator('input[type="file"]').set_input_files({'name':'sa07-evidence.txt','mimeType':'text/plain','buffer':payload})
  assert loaded.value.response().status==201
  for _ in range(100):
   selected=json.loads(form.locator('input[name="editorAttachmentIds"]').input_value())
   if selected:break
   member_page.wait_for_timeout(25)
  assert len(selected)==1;asset=selected[0]
  stored=sql('select object_key from forum_attachments where id=$1',[asset])[0]['object_key']
  assert local_r2('inspect',stored)['exists']
  publish_form={'intent':'reply','body':'A published attachment','editorActorId':member,'editorOperationId':operation,'editorAttachmentIds':json.dumps([asset])}
  published=mc.request.post(base+'/en/topics/'+local_fixture['topic'],headers={'Origin':base},form=publish_form,max_redirects=0);assert published.status in (302,303)
  assert mc.request.post(base+'/en/topics/'+local_fixture['topic'],headers={'Origin':base},form=publish_form,max_redirects=0).status in (302,303)
  post=sql('select post_id from forum_post_attachments where attachment_id=$1',[asset])[0]['post_id']
  download=guest.request.get(base+'/api/attachments/file/'+asset+'?post='+post);assert download.status==200 and download.body()==payload
  def upload_bytes(attachment,op,body,name='sa07-unused.txt'):
   return mc.request.post(base+'/api/attachments',headers={'Origin':base,'Content-Type':'text/plain','X-Vico-Attachment-Id':attachment,'X-Vico-Attachment-Name':quote(name,safe=''),'X-Vico-Attachment-Size':str(len(body)),'X-Vico-Editor-Context':quote('topic:'+local_fixture['topic']+':reply',safe=''),'X-Vico-Operation-Id':op},data=body)
  unused=str(uuid4());unused_op=str(uuid4());assert upload_bytes(unused,unused_op,b'An abandoned private upload').status==201
  unused_key=sql('select object_key from forum_attachments where id=$1',[unused])[0]['object_key']
  rejected=str(uuid4());rejected_op=str(uuid4());refused=upload_bytes(rejected,rejected_op,b'MZ'+b'0'*50,'sa07-suspicious.exe');assert refused.status==422,(refused.status,refused.text())
  assert refused.json()['suspicious'] is True
  evidence=sql('select id from forum_attachment_security_events where uploaded_by_user_id=$1 and draft_id=$2',[member,rejected_op])[0]['id']
  assert not sql('select id from forum_attachments where id=$1',[rejected])
  for _ in range(100):
   facts=sql("select kind,entity_id from owner_events where source='operation' and entity_id=$1",[asset])
   if len(facts)==2:break
   page.wait_for_timeout(25)
  assert sorted(row['kind'] for row in facts)==['file.accepted','file.published']
  command=oc.request.post(base+'/en/users/'+member+'/owner/deactivate',headers={'Origin':base},form={'intent':'deactivate','expectedActorId':owner,'targetUserId':member,'operationId':str(uuid4())});private(command,200)
  assert upload_bytes(str(uuid4()),str(uuid4()),b'Post-deactivation upload denied').status==401
  assert guest.request.get(base+'/api/attachments/file/'+asset+'?post='+post).body()==payload
  sql("update forum_attachments set created_at=now()-interval '2 hours' where id=any($1::text[])",[[asset,unused]])
  sql("update forum_attachment_draft_refs set created_at=now()-interval '25 hours' where attachment_id=$1",[unused])
  orphan='private/fenced-v1/00000000-0000-4000-8000-'+uuid4().hex[:12];assert local_r2('orphan-reservation',orphan)['reserved']
  assert local_r2('inspect',orphan)['kind']=='vico-reservation-v1'
  cleaned=local_r2('cleanup',batch=20);assert cleaned['prunedRefs']>=1 and cleaned['deleted']>=1,cleaned
  # LIST limits include payloads. A marker may require a later bounded cursor pass.
  for _ in range(16):
   if not local_r2('inspect',orphan)['exists']:break
   local_r2('cleanup',batch=20)
  assert not local_r2('inspect',unused_key)['exists'];assert not local_r2('inspect',orphan)['exists'];assert local_r2('inspect',stored)['exists']
  assert not sql('select id from forum_attachments where id=$1',[unused]);assert sql('select id from forum_attachments where id=$1',[asset])
  record('actual-Worker-upload-publication-replay-Owner-deactivation-and-real-local-R2-cleanup-no-false-acceptance')
  sql("delete from owner_monitor_observations where monitor_key like 'files.%' and resource_scope='global'")
  sql("create function sa07_f_sample_fault() returns trigger language plpgsql as $$begin raise exception 'SA07_F_PRIVATE_SQL';end$$;create trigger sa07_f_sample_fault before insert on owner_monitor_observations for each row execute function sa07_f_sample_fault()")
  try:assert 'unavailable' in private(oc.request.get(base+file_current+'.data'),200).text()
  finally:sql('drop trigger sa07_f_sample_fault on owner_monitor_observations;drop function sa07_f_sample_fault()')
  slots=sql("select id,value from owner_monitor_observations where resource_scope like 'storage:%' order by id");assert len(slots)>=3
  for locale in ['en','ru','he']:
   for width in [1280,768,320]:
    page.set_viewport_size({'width':width,'height':900});visit(page,f'/{locale}/super-admin/monitoring/files')
    expect(page.locator('[data-file-current]')).to_have_count(1);expect(page.locator('[data-storage-slot]')).to_have_count(13)
    assert page.locator('html').get_attribute('dir')==('rtl' if locale=='he' else 'ltr');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    for key in file_keys:expect(page.locator('[data-monitor-key="'+key+'"] form')).to_have_count(0)
    if width==320:
     page.locator('[data-storage-slot="storage:get:returned"] summary').click();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');page.screenshot(path=str(a.output/(locale+'-files-320.png')),full_page=True)
   record('localized-responsive-Files-original-samples-and-unmeasured-slots',locale=locale)
  page.set_viewport_size({'width':1280,'height':900});visit(page,file_current)
  refresh(page,file_current,'files.assets')
  assert sql("select id,value from owner_monitor_observations where resource_scope like 'storage:%' order by id")==slots
  assert evidence in collect(page,file_current+'/files.assets/history?origin=attachment-evidence')
  assert evidence in collect(page,'/en/super-admin/monitoring/security/security.attachments/history?origin=attachment-evidence')
  for key in file_keys:
   assert asset in collect(page,file_current+'/'+key+'/history?kind=file.accepted')
  cleanup_fact=sql("select id from owner_events where source='operation' and kind='file.cleanupPass' order by occurred_at desc limit 1")[0]['id']
  assert cleanup_fact in collect(page,file_current+'/files.operations/history?kind=file.cleanupPass')
  storage_history=collect(page,file_current+'/files.operations/history?origin=system-observation')
  for sample in slots:assert sample['id'] in storage_history
  assert 'SA07_F_PRIVATE' not in page.locator('body').inner_text()
  visit(page,'/en/super-admin/monitoring/background');expect(page.locator('[data-monitor-key="background.attachments"]')).to_have_count(1)
  private(oc.request.get(base+file_current+'?operation=delete'),400)
  sql('alter table forum_attachment_sweep rename to sa07_f_hidden_sweep')
  try:
   for path in [file_current+'.data','/en/SUPER-ADMIN/monitoring/FILES.data','/en/%73uper-admin/monitoring/files///']:private(oc.request.get(base+path),503)
   private(guest.request.get(base+file_current+'.data'),401)
  finally:sql('alter table sa07_f_hidden_sweep rename to forum_attachment_sweep')
  with hold('lock table forum_attachments in access exclusive mode'):private(oc.request.get(base+file_current+'.data',timeout=15000),503)
  record('Files-original-security-and-storage-identities-no-bucket-call-on-GET-source-faults-private-aliases')
  visit(page,file_current);held=[];page.route('**/super-admin/monitoring/files.data*',delayed);page.locator('[data-monitor-key="files.assets"] nav a').nth(1).click()
  for _ in range(100):
   if held:break
   page.wait_for_timeout(20)
  assert held
  with page.expect_response(lambda r:r.request.method=='POST' and '/api/auth/sign-out' in r.url) as signed:page.locator('.auth-sign-out').click()
  assert signed.value.status==200;expect(page.locator('.auth-controls[data-state=guest]')).to_have_count(1);expect(page.locator('[data-file-current]')).to_have_count(0)
  for route,response in held:
   try:route.fulfill(response=response)
   except Exception:pass
  page.wait_for_timeout(250);expect(page.locator('[data-file-current]')).to_have_count(0);page.unroute('**/super-admin/monitoring/files.data*')
  record('SA07-B1-L-F-connected-pass')
  assert oc.request.post(base+'/api/auth/sign-in/email',headers={'Origin':base},data={'email':email,'password':password}).status==200
  assert sql('update "session" set user_id=$1 where user_id=$2 returning id',[owner,issued])
  dc,data_member,data_email,data_password=account('data-member')
  data_current='/en/super-admin/monitoring/data';data_keys=['data.application','data.compatibility','data.retention']
  before=sql("select id from owner_monitor_observations where monitor_key like 'data.%' order by id")
  for ctx,status in [(guest,401),(ac,403),(dc,403)]:
   for path in [data_current]+[data_current+'/'+key+'/history' for key in data_keys]:
    for suffix in ['', '.data']:private(ctx.request.get(base+path+suffix),status)
  assert sql("select id from owner_monitor_observations where monitor_key like 'data.%' order by id")==before
  record('Data-genuine-Owner-admission-before-counts-compatibility-and-samples')
  user_count=sql('select count(*)::text n from "user"')[0]['n']
  storage_before=sql("select id,value from owner_monitor_observations where resource_scope like 'storage:%' order by id")
  for locale in ['en','ru','he']:
   for width in [1280,768,320]:
    page.set_viewport_size({'width':width,'height':900});visit(page,f'/{locale}/super-admin/monitoring/data')
    expect(page.locator('[data-data-current]')).to_have_count(1)
    for key in data_keys:
     article=page.locator('[data-monitor-key="'+key+'"]');expect(article).to_have_count(1);expect(article.locator('form')).to_have_count(0)
    assert page.locator('html').get_attribute('dir')==('rtl' if locale=='he' else 'ltr')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    if width==320:
     account_check=page.locator('[data-data-check="counts.accounts"]');account_check.locator('summary').click()
     assert account_check.locator('dt bdi:text-is("user")').locator('..').locator('..').locator('dd').inner_text()==user_count
     assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
     page.screenshot(path=str(a.output/(locale+'-data-320.png')),full_page=True)
   record('localized-responsive-Data-complete-counts-compatibility-unchecked-migration-retention',locale=locale)
  page.set_viewport_size({'width':1280,'height':900});visit(page,data_current)
  samples=sql("select id from owner_monitor_observations where monitor_key like 'data.%' order by id")
  refresh(page,data_current,'data.application')
  assert sql("select id from owner_monitor_observations where monitor_key like 'data.%' order by id")==samples
  assert sql("select id,value from owner_monitor_observations where resource_scope like 'storage:%' order by id")==storage_before
  for key in data_keys:
   sample=sql('select id from owner_monitor_observations where monitor_key=$1',[key])[0]['id']
   assert sample in collect(page,data_current+'/'+key+'/history')
  private(oc.request.get(base+'/en/super-admin/monitoring/system.data'),200)
  dependency=sql("select id from owner_monitor_observations where monitor_key='system.dependencies' and resource_scope='global' order by observed_at desc limit 1")[0]['id']
  assert dependency in collect(page,data_current+'/data.compatibility/history?origin=system-observation')
  expect(page.locator('[data-history-kind="system.requestFailed"]')).to_have_count(0)
  record('Data-original-System-dependency-and-own-samples-GET-gate-no-R2-call-no-generic5xx-attribution')
  sql('alter table forum_profiles rename column bio to "SA07_D_PRIVATE_BIO"')
  try:
   visit(page,data_current);expect(page.locator('[data-data-check="forum_profiles"]')).to_have_attribute('data-status','incompatible')
   for path in [data_current+'.data','/en/SUPER-ADMIN/monitoring/DATA.data','/en/%73uper-admin/monitoring/data///']:private(oc.request.get(base+path),200)
   private(guest.request.get(base+data_current+'.data'),401)
   assert 'SA07_D_PRIVATE' not in page.locator('body').inner_text()
  finally:sql('alter table forum_profiles rename column "SA07_D_PRIVATE_BIO" to bio')
  with hold('lock table forum_profiles in access exclusive mode'):
   visit(page,data_current)
   expect(page.locator('[data-data-check="forum_profiles"]')).to_have_attribute('data-status','unavailable')
   expect(page.locator('[data-data-check="counts.forum"]')).to_have_attribute('data-status','unavailable')
  private(oc.request.get(base+data_current+'?sql=forbidden'),400)
  record('Data-actual-missing-column-and-source-lock-classified-per-check-no-zero-no-private-SQL')
  visit(page,data_current);held=[];page.route('**/super-admin/monitoring/data.data*',delayed);page.locator('[data-monitor-key="data.application"] nav a').nth(1).click()
  for _ in range(100):
   if held:break
   page.wait_for_timeout(20)
  assert held
  with page.expect_response(lambda r:r.request.method=='POST' and '/api/auth/sign-out' in r.url) as signed:page.locator('.auth-sign-out').click()
  assert signed.value.status==200;expect(page.locator('.auth-controls[data-state=guest]')).to_have_count(1);expect(page.locator('[data-data-current]')).to_have_count(0)
  for route,response in held:
   try:route.fulfill(response=response)
   except Exception:pass
  page.wait_for_timeout(250);expect(page.locator('[data-data-current]')).to_have_count(0);page.unroute('**/super-admin/monitoring/data.data*')
  record('Data-known-signout-and-late-Owner-response-do-not-restore-private-counts')
  record('SA07-B1-L-F-D-connected-pass')
  assert oc.request.post(base+'/api/auth/sign-in/email',headers={'Origin':base},data={'email':email,'password':password}).status==200
  assert sql('update "session" set user_id=$1 where user_id=$2 returning id',[owner,issued])
  integration_current='/en/super-admin/monitoring/integrations'
  integration_keys=['integrations.database','integrations.authentication','integrations.storage','integrations.translation']
  before=sql("select id from owner_monitor_observations where monitor_key like 'integrations.%' and resource_scope='global' order by id")
  for ctx,status in [(guest,401),(ac,403),(dc,403)]:
   for path in [integration_current]+[integration_current+'/'+key+'/history' for key in integration_keys]:
    for suffix in ['', '.data']:private(ctx.request.get(base+path+suffix),status)
  assert sql("select id from owner_monitor_observations where monitor_key like 'integrations.%' and resource_scope='global' order by id")==before
  record('Integrations-genuine-Owner-admission-before-private-source-reads-and-samples')
  linked=rpc({'operation':'integrationSeed','member':data_member})['googleFact']
  links=sql("select id from owner_events where source='auth' and kind='auth.methodLinked' and payload->>'method'='google' order by id")
  previous_sessions=sql("select id from owner_events where source='auth' and target_id=$1 and kind='auth.sessionCreated'",[data_member])
  previous_session_ids={row['id'] for row in previous_sessions}
  assert dc.request.post(base+'/api/auth/sign-out',headers={'Origin':base},data={}).status==200
  assert dc.request.post(base+'/api/auth/sign-in/email',headers={'Origin':base},data={'email':data_email,'password':data_password}).status==200
  for _ in range(100):
   sessions=sql("select id from owner_events where source='auth' and target_id=$1 and kind='auth.sessionCreated' order by occurred_at desc,id desc limit 1",[data_member])
   if sessions and sessions[0]['id'] not in previous_session_ids:break
   page.wait_for_timeout(25)
  assert sessions and sessions[0]['id'] not in previous_session_ids
  assert sql("select id from owner_events where source='auth' and kind='auth.methodLinked' and payload->>'method'='google' order by id")==links
  native_session=sessions[0]['id']
  storage_before=sql("select id,value from owner_monitor_observations where resource_scope like 'storage:%' order by id")
  for locale in ['en','ru','he']:
   for width in [1280,768,320]:
    page.set_viewport_size({'width':width,'height':900});visit(page,f'/{locale}/super-admin/monitoring/integrations')
    expect(page.locator('[data-integration-current]')).to_have_count(1);expect(page.locator('[data-storage-slot]')).to_have_count(13)
    for key in integration_keys:
     article=page.locator('[data-monitor-key="'+key+'"]');expect(article).to_have_count(1);expect(article.locator('form')).to_have_count(0)
    assert page.locator('html').get_attribute('dir')==('rtl' if locale=='he' else 'ltr')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    expect(page.locator('[data-integration-fact="auth.methodLinked"]')).to_contain_text(linked)
    expect(page.locator('[data-integration-fact="auth.sessionCreated"]')).to_contain_text(native_session)
    if width==320:
     page.locator('[data-storage-slot="storage:get:returned"] summary').click()
     assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
     page.screenshot(path=str(a.output/(locale+'-integrations-320.png')),full_page=True)
   record('localized-responsive-Integrations-config-separate-from-native-sources-and-generic-password-session',locale=locale)
  page.set_viewport_size({'width':1280,'height':900});visit(page,integration_current)
  dto=private(oc.request.get(base+integration_current+'.data'),200).text()
  assert 'valid-registry-returned' in dto and 'existing-system-dependency-reader' in dto
  assert 'googleCallbackCoverageMeasured' in dto and 'genericSessionProviderKnown' in dto
  assert 'SA07_I_PRIVATE' not in page.locator('body').inner_text()
  samples=sql("select id from owner_monitor_observations where monitor_key like 'integrations.%' and resource_scope='global' order by id")
  assert len(samples)==4
  refresh(page,integration_current,'integrations.database')
  assert sql("select id from owner_monitor_observations where monitor_key like 'integrations.%' and resource_scope='global' order by id")==samples
  assert sql("select id,value from owner_monitor_observations where resource_scope like 'storage:%' order by id")==storage_before
  assert dependency in collect(page,integration_current+'/integrations.database/history?origin=system-observation')
  assert linked in collect(page,integration_current+'/integrations.authentication/history?origin=auth-event')
  assert native_session in collect(page,integration_current+'/integrations.authentication/history?origin=auth-event')
  assert fixture['event'] in collect(page,integration_current+'/integrations.translation/history?origin=operational-event&kind=task.planned')
  storage_history=collect(page,integration_current+'/integrations.storage/history?origin=system-observation')
  for sample in storage_before:assert sample['id'] in storage_history
  global_auth=collect(page,'/en/super-admin/events?origin=auth-event')
  assert global_auth.count(linked)==1
  record('Integrations-original-System-auth-task-and-storage-identities-no-new-probes-or-Google-login-inference')
  sql("delete from owner_monitor_observations where monitor_key like 'integrations.%' and resource_scope='global'")
  sql("create function sa07_i_sample_fault() returns trigger language plpgsql as $$begin raise exception 'SA07_I_PRIVATE_SQL';end$$;create trigger sa07_i_sample_fault before insert on owner_monitor_observations for each row execute function sa07_i_sample_fault()")
  try:
   dto=private(oc.request.get(base+integration_current+'.data'),200).text()
   assert 'unavailable' in dto and 'existing-system-dependency-reader' in dto
  finally:sql('drop trigger sa07_i_sample_fault on owner_monitor_observations;drop function sa07_i_sample_fault()')
  with hold('lock table forum_registration_settings in access exclusive mode'):
   for path in [integration_current+'.data','/en/SUPER-ADMIN/monitoring/INTEGRATIONS.data']:
    private(oc.request.get(base+path,timeout=15000),503)
   private(guest.request.get(base+integration_current+'.data'),401)
  private(oc.request.get(base+integration_current+'?probe=forbidden'),400)
  record('Integrations-recorder-failure-preserves-actual-read-source-lock-private503-no-fabricated-failure')
  visit(page,integration_current);held=[];page.route('**/super-admin/monitoring/integrations.data*',delayed);page.locator('[data-monitor-key="integrations.database"] nav a').nth(1).click()
  for _ in range(100):
   if held:break
   page.wait_for_timeout(20)
  assert held
  with page.expect_response(lambda r:r.request.method=='POST' and '/api/auth/sign-out' in r.url) as signed:page.locator('.auth-sign-out').click()
  assert signed.value.status==200;expect(page.locator('.auth-controls[data-state=guest]')).to_have_count(1);expect(page.locator('[data-integration-current]')).to_have_count(0)
  for route,response in held:
   try:route.fulfill(response=response)
   except Exception:pass
  page.wait_for_timeout(250);expect(page.locator('[data-integration-current]')).to_have_count(0);page.unroute('**/super-admin/monitoring/integrations.data*')
  record('Integrations-known-signout-and-late-response-do-not-restore-private-state')
  assert not errors,errors;assert not external,external;record('SA07-B1-L-F-D-I-connected-pass');browser.close()
finally:
 if pg:
  pg.stdin.close()
  try:pg.wait(timeout=8)
  except subprocess.TimeoutExpired:pg.terminate();pg.wait(timeout=5)
 (a.output/'results.json').write_text(json.dumps({'head':os.environ.get('IMPLEMENTATION_SHA'),'scope':'SA07-B1/L/F/D/I; actual Worker/BA/PG17/local private R2; cleanup code-only pass, no scheduler/runtime activation','cases':records,'pageErrors':errors,'external':external},ensure_ascii=False,indent=2))
