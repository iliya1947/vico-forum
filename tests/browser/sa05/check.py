"""Whole SA05: real Chromium -> actual Worker/Better Auth -> disposable PG17/local R2.
Only synthetic identities/bindings/secrets; lifecycle changes use the real Owner action.
"""
import argparse,json,os,select,shutil,subprocess,time
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote,urlencode,urlparse
from urllib.request import Request,urlopen
from uuid import uuid4
from playwright.sync_api import expect,sync_playwright

parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4235');parser.add_argument('--output',type=Path,required=True)
a=parser.parse_args();base=a.url.rstrip('/');db=os.environ.get('DATABASE_URL','')
assert os.environ.get('CI')=='true' and urlparse(base).hostname in ('127.0.0.1','localhost')
assert urlparse(db).hostname in ('127.0.0.1','localhost') and urlparse(db).path=='/vico_sa05_browser_test'
repo=Path(__file__).resolve().parents[3];node=shutil.which('node');assert node
a.output.mkdir(parents=True,exist_ok=True);prefix='sa05-'+uuid4().hex[:10];owner='sa05-synthetic-owner'
records=[];page_errors=[];external=[];contexts=[];pg=None;browser=None

def rpc(payload):
 pg.stdin.write(json.dumps(payload)+'\n');pg.stdin.flush()
 assert select.select([pg.stdout],[],[],30)[0],'Fixture process timed out'
 result=json.loads(pg.stdout.readline());assert 'error' not in result,result
 return result['result']
def sql(query,params=None):return rpc({'operation':'sql','sql':query,'params':params or []})
def record(case,**details):
 records.append({'case':case,**details});print('SA05_CONNECTED '+json.dumps(records[-1]),flush=True)
def private_headers(response,status):
 assert response.status==status,(response.status,status,response.text()[:180])
 assert {'private','no-store'}<={v.strip() for v in response.headers.get('cache-control','').split(',')},response.headers
 return response
def private(response,status):
 private_headers(response,status);assert 'SA05_PRIVATE_SQL_SECRET' not in response.text();return response
def cookie(ctx):return '; '.join(c['name']+'='+c['value'] for c in ctx.cookies(base))
def direct(path,fields,raw_cookie):
 class Reply:
  def __init__(self,r):self.status=r.code;self.headers={k.lower():v for k,v in r.headers.items()};self.body=r.read().decode()
  def text(self):return self.body
 request=Request(base+path,urlencode(fields).encode(),headers={'Origin':base,'Cookie':raw_cookie,'Content-Type':'application/x-www-form-urlencoded'},method='POST')
 try:
  with urlopen(request,timeout=20) as r:return Reply(r)
 except HTTPError as r:return Reply(r)
def post(ctx,path,fields):return ctx.request.post(base+path,headers={'Origin':base,'Content-Type':'application/x-www-form-urlencoded'},data=urlencode(fields),max_redirects=0,timeout=20000)
def visit(page,path):
 response=page.goto(base+path,wait_until='networkidle');assert response.status==200,(path,response.status)
 if '/users/' in path or '/settings/' in path or '/super-admin/' in path:private(response,200)
 return response
def page(ctx):
 p=ctx.new_page();p.set_default_timeout(20000);p.on('pageerror',lambda error:page_errors.append(str(error)));return p
def identity(user):return '/en/users/'+quote(user,safe='')
def command(ctx,user,operation=None):
 return post(ctx,identity(user)+'/owner/deactivate',{'intent':'deactivate','expectedActorId':owner,'targetUserId':user,'operationId':operation or str(uuid4())})
def state(user):return sql('select deactivated_at,deactivated_by_user_id,retain_at_least_until from "user" where id=$1',[user])[0]
def account_events(user):return sql("select id,source,kind,actor_user_id,target_user_id,correlation_id,occurred_at,payload from owner_events where source='account' and target_user_id=$1",[user])
def domain():
 tables=['forum_posts','forum_post_revisions','forum_publication_receipts','forum_reply_notifications','forum_profiles','forum_topic_read_states','forum_attachments','forum_attachment_draft_refs','user_privacy_preferences']
 return {t:sql('select * from '+t+' order by 1') for t in tables}
def wait_for(fn,label,seconds=12):
 deadline=time.monotonic()+seconds
 while time.monotonic()<deadline:
  result=fn()
  if result:return result
  time.sleep(.025)
 raise AssertionError('No durable barrier: '+label)
@contextmanager
def hold(statement,params):
 code="""import pg from 'pg';const x=JSON.parse(process.argv[1]);const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();await c.query('begin');await c.query(x.sql,x.params);console.log('LOCKED');process.stdin.once('data',async()=>{await c.query('commit');await c.end();});"""
 child=subprocess.Popen([node,'--input-type=module','-e',code,json.dumps({'sql':statement,'params':params})],cwd=repo,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
 assert child.stdout.readline().strip()=='LOCKED'
 try:yield child
 finally:
  if child.poll() is None:child.communicate('release\n',timeout=10)
def pending_query(pattern):return sql("select pid,pg_blocking_pids(pid) blockers from pg_stat_activity where datname=current_database() and wait_event_type='Lock' and query not ilike '%pg_stat_activity%' and query ilike $1",['%'+pattern+'%'])
def open_confirmation(p,user,locale='en'):
 visit(p,'/'+locale+'/users/'+quote(user,safe=''));button=p.locator('.owner-lifecycle-control > button');expect(button).to_have_count(1);button.click()
 dialog=p.locator('dialog.owner-deactivation-dialog');expect(dialog).to_be_visible();return dialog
def submit(p,status):
 match=lambda r:r.request.method=='POST' and '/owner/deactivate' in r.url
 with p.expect_response(match) as r:p.locator('dialog button[type=submit]').click()
 private_headers(r.value,status);return r.value

try:
 pg=subprocess.Popen([node,'--import','tsx',str(repo/'tests/browser/sa05/pg.mjs')],cwd=repo,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
 assert pg.stdout.readline().strip()=='READY'
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('PLAYWRIGHT_EXECUTABLE') or None,channel=None if os.environ.get('PLAYWRIGHT_EXECUTABLE') else os.environ.get('PLAYWRIGHT_CHANNEL','chrome'),args=['--no-sandbox'])
  def account(label):
   ctx=browser.new_context(viewport={'width':1280,'height':900},service_workers='block',extra_http_headers={'cf-connecting-ip':'192.0.2.'+str(100+len(contexts))});contexts.append(ctx)
   ctx.route('**/*',lambda r:r.continue_() if r.request.url.startswith(base+'/') else (external.append(r.request.url),r.abort())[-1])
   email=prefix+'-'+label+'@test.invalid';password='SA05-local-fixture-password-123456'
   response=ctx.request.post(base+'/api/auth/sign-up/email',headers={'Origin':base},data={'name':prefix+'-PRIVATE-'+label,'email':email,'password':password});assert response.status==200,(label,response.status,response.text()[:180])
   return ctx,response.json()['user']['id'],email,password
  oc,issued,owner_email,owner_password=account('owner');tc,target,target_email,target_password=account('target')
  other_ctx,other,other_email,other_password=account('other');admin_ctx,admin,_,_=account('admin');fc,fault,_,_=account('fault');dc,delayed,_,_=account('delayed');switch_ctx,switch_user,_,_=account('switch')
  sql('insert into "user"(id,name,email) values($1,$2,$3) on conflict(id) do nothing',[owner,'SA05 bound Owner',prefix+'-bound@test.invalid'])
  assert sql('select name,deactivated_at from "user" where id=$1',[owner])==[{'name':'SA05 bound Owner','deactivated_at':None}]
  assert sql('update "session" set user_id=$1 where user_id=$2 returning id',[owner,issued])
  sql("insert into authz_user_roles(user_id,role_id) values($1,'builtin-admin')",[admin])
  second=browser.new_context(extra_http_headers={'cf-connecting-ip':'192.0.2.119'},service_workers='block');contexts.append(second)
  login=second.request.post(base+'/api/auth/sign-in/email',headers={'Origin':base},data={'email':target_email,'password':target_password});assert login.status==200
  assert sql('select count(*)::int n from "session" where user_id=$1',[target])[0]['n']==2
  fixture=rpc({'operation':'seed','prefix':prefix,'author':target,'other':other,'marker':prefix+'-PRIVATE-BIO'})
  topic='/en/topics/'+fixture['topic'];context='topic:'+fixture['topic']+':reply';draft=str(uuid4());asset=str(uuid4());payload=b'SA05 retained file bytes'
  upload=tc.request.post(base+'/api/attachments',headers={'Origin':base,'Content-Type':'text/plain','X-Vico-Attachment-Id':asset,'X-Vico-Attachment-Name':'retained.txt','X-Vico-Attachment-Size':str(len(payload)),'X-Vico-Editor-Context':quote(context,safe=''),'X-Vico-Operation-Id':draft},data=payload)
  assert upload.status==201,(upload.status,upload.text()[:200]);published=rpc({'operation':'publish-file','topic':fixture['topic'],'author':target,'attachment':asset,'context':context,'draft':draft})
  published_before=domain();raw_sessions=sql('select * from "session" where user_id=$1 order by id',[target])
  opage=page(oc);sent=[];opage.on('request',lambda r:sent.append(r.post_data) if r.method=='POST' and '/owner/deactivate' in r.url else None)
  record('genuine-Owner-two-target-sessions-real-published-content-and-local-R2')

  for locale in ['en','ru','he']:
   for width in [1280,768,320]:
    opage.set_viewport_size({'width':width,'height':900});dialog=open_confirmation(opage,target,locale)
    assert opage.locator('html').get_attribute('dir')==('rtl' if locale=='he' else 'ltr')
    expect(dialog).to_contain_text(target_email);expect(dialog).to_contain_text(target)
    assert dialog.locator('input[type=hidden]').count()==4;operation=dialog.locator('input[name=operationId]').input_value();assert len(operation)==36
    assert dialog.locator('button').first.evaluate('(e)=>e===document.activeElement'),'Cancel must receive initial modal focus'
    assert opage.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    if width==320:opage.screenshot(path=str(a.output/(locale+'-confirmation-320.png')),full_page=True)
    opage.keyboard.press('Escape');expect(dialog).to_have_count(0);expect(opage.locator('.owner-lifecycle-control > button')).to_be_focused()
   record('native-modal-localized-keyboard-cancel-responsive',locale=locale)
  assert sent==[] and state(target)['deactivated_at'] is None
  opage.emulate_media(color_scheme='dark');opage.set_viewport_size({'width':320,'height':900})
  open_confirmation(opage,target,'he');assert opage.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  opage.screenshot(path=str(a.output/'he-confirmation-320-dark.png'),full_page=True);opage.keyboard.press('Escape');opage.emulate_media(color_scheme='light')
  visit(opage,identity(owner));expect(opage.locator('.owner-lifecycle-control')).to_have_count(0)
  for ctx in [tc,admin_ctx]:
   response=ctx.request.get(base+identity(target)+'.data');assert response.status==200 and target_email not in response.text() and 'retainAtLeastUntil' not in response.text()
  record('Owner-self-control-absent-and-ordinary-Admin-private-data-denied')

  sql('insert into forum_online_presence(user_id) values($1) on conflict do nothing',[fault])
  open_confirmation(opage,fault);before=domain();prior=len(sent)
  sql("create function sa05_event_fail() returns trigger language plpgsql as $$begin if NEW.source='account' then raise exception 'SA05_PRIVATE_SQL_SECRET';end if;return NEW;end $$")
  sql('create trigger sa05_event_fail before insert on owner_events for each row execute function sa05_event_fail()')
  try:
   submit(opage,500);expect(opage.locator('dialog [role=alert]')).to_be_visible();opage.wait_for_timeout(500)
   assert 'SA05_PRIVATE_SQL_SECRET' not in opage.locator('dialog').inner_text()
   private(command(oc,fault),500) # Separate explicit HTTP body/privacy probe.
   assert len(sent)==prior+1 and state(fault)['deactivated_at'] is None and not account_events(fault) and domain()==before
   assert sql('select user_id from forum_online_presence where user_id=$1',[fault])
   opage.locator('dialog [role=alert] button').click();expect(opage.locator('dialog button[type=submit]')).to_be_disabled();assert len(sent)==prior+1
  finally:sql('drop trigger sa05_event_fail on owner_events');sql('drop function sa05_event_fail()')
  opage.locator('dialog button[type=button]').last.click();record('actual-action-mandatory-event500-rolls-back-state-presence-and-UI-never-replays')
  open_confirmation(opage,fault);prior=len(sent)
  with hold('select id from "user" where id=$1 for update',[fault]):submit(opage,503)
  expect(opage.locator('dialog [role=alert]')).to_be_visible();opage.wait_for_timeout(500)
  assert len(sent)==prior+1 and state(fault)['deactivated_at'] is None and not account_events(fault)
  opage.locator('dialog button[type=button]').last.click();record('actual-action-lock-timeout503-no-false-success-or-retry')

  old_reply=page(tc);visit(old_reply,topic);reply=old_reply.locator('form').filter(has=old_reply.locator('input[name=intent][value=reply]'))
  resume=old_reply.locator('button.forum-composer-resume')
  if resume.count() and resume.is_visible():resume.click()
  if reply.locator('.markdown-editor').get_attribute('data-authoring')!='advanced':reply.get_by_role('button',name='Advanced',exact=True).click()
  reply.locator('textarea#reply-body').fill('SA05_DENIED_OLD_REPLY')
  old_profile=page(second);visit(old_profile,identity(target)+'?edit=1');old_profile.locator('textarea[name=bio]').fill('SA05_DENIED_OLD_PROFILE')
  old_sends=[]
  for p in [old_reply,old_profile]:p.on('request',lambda r:old_sends.append(r.url) if r.method=='POST' and ('/topics/' in r.url or '/users/' in r.url) else None)
  saved_cookie=cookie(tc);sql('insert into forum_online_presence(user_id) values($1) on conflict do nothing',[target])
  before=domain();open_confirmation(opage,target);operation=opage.locator('dialog input[name=operationId]').input_value();prior=len(sent)
  with ThreadPoolExecutor(max_workers=1) as executor:
   with hold('select id from forum_topics where id=$1 for update',[fixture['topic']]):
    pending=executor.submit(direct,topic,{'intent':'reply','body':'SA05_DENIED_PENDING_REPLY','editorOperationId':str(uuid4()),'editorAttachmentIds':'[]'},saved_cookie)
    wait_for(lambda:pending_query('forum_topics'),'real preflight-admitted Forum writer')
    response=submit(opage,200);result=response.json()
   private(pending.result(timeout=20),401)
  expect(opage.locator('#owner-lifecycle')).to_contain_text('Deactivated');expect(opage.locator('#owner-account')).to_contain_text(target_email)
  expect(opage.locator('#profile-name')).to_have_text('Deleted user');expect(opage.locator('.owner-lifecycle-control')).to_have_count(0)
  assert len(sent)==prior+1 and result['state']=='deactivated' and result['changed'] is True
  persisted=account_events(target);assert len(persisted)==1 and persisted[0]['id']==result['eventId'] and persisted[0]['correlation_id']==operation
  assert state(target)['deactivated_at']==persisted[0]['occurred_at']==result['deactivatedAt']
  assert sql('select * from "session" where user_id=$1 order by id',[target])==raw_sessions
  assert not sql('select user_id from forum_online_presence where user_id=$1',[target]) and domain()==before
  retained=state(target)['retain_at_least_until'];assert retained==result['retainAtLeastUntil'];expect(opage.locator('#owner-account')).to_contain_text(retained)
  for path in ['/en/super-admin/events','/en/super-admin/monitoring/accounts/accounts.users/history',identity(target),identity(owner)]:
   response=oc.request.get(base+path+'.data');private(response,200);assert result['eventId'] in response.text(),path
  record('actual-UI-command200-pending-real-Forum-writer-denied-and-original-event-in-four-views',event=result['eventId'])

  with old_reply.expect_response(lambda r:r.request.method=='POST' and '/topics/' in r.url) as denial:reply.locator('button[type=submit]').click()
  private_headers(denial.value,401);old_reply.wait_for_timeout(500)
  save=old_profile.locator('form.profile-form')
  with old_profile.expect_response(lambda r:r.request.method=='POST' and '/users/' in r.url) as denial:save.locator('button[type=submit]').click()
  private_headers(denial.value,401);old_profile.wait_for_timeout(500)
  assert len(old_sends)==2,'Mounted old forms automatically replayed POST'
  assert domain()==before and not sql("select id from forum_post_revisions where original_content in ('SA05_DENIED_OLD_REPLY','SA05_DENIED_PENDING_REPLY')")
  for ctx in [tc,second]:
   private(ctx.request.get(base+'/api/auth/get-session'),401)
   private(ctx.request.post(base+'/api/auth/sign-in/email',headers={'Origin':base},data={'email':target_email,'password':target_password}),401)
  assert sql('select count(*)::int n from "session" where user_id=$1',[target])[0]['n']==2
  guest=browser.new_context();contexts.append(guest)
  for path in [identity(target),identity(target)+'.data',topic,topic+'.data','/en/admin/users']:
   ctx=admin_ctx if path.startswith('/en/admin/') else guest
   response=ctx.request.get(base+path);assert response.status==200,(path,response.status)
   assert prefix+'-PRIVATE-target' not in response.text() and prefix+'-PRIVATE-BIO' not in response.text() and target_email not in response.text(),path
  content=guest.request.get(base+'/api/attachments/file/'+asset+'?post='+published['post']);assert content.status==200,(content.status,'Published attachment download');assert content.body()==payload
  assert sql('select id from forum_posts where author_id=$1',[target]) and domain()==before
  record('two-old-real-sessions-mounted-forms-new-auth-denied-public-neutral-and-content-R2-retained')

  # An actual200 ACK is received before the test transport drops it. This is
  # an uncertain client outcome, not a fake command or simulated DB commit.
  open_confirmation(opage,fault);prior=len(sent);observed=[]
  def lose_ack(route):
   r=route.fetch();assert r.status==200;observed.append(r.json());route.abort('failed')
  opage.route('**/owner/deactivate',lose_ack)
  opage.locator('dialog button[type=submit]').click();expect(opage.locator('dialog [role=alert]')).to_be_visible()
  assert observed and state(fault)['deactivated_at'] is not None
  opage.wait_for_timeout(500);assert len(sent)==prior+1
  opage.unroute('**/owner/deactivate',lose_ack);opage.locator('dialog [role=alert] button').click()
  expect(opage.locator('#owner-lifecycle')).to_contain_text('Deactivated');assert len(sent)==prior+1 and len(account_events(fault))==1
  record('actual-command-committed-lost-HTTP-ACK-explicit-Refresh-observes-state-without-replay')

  # Real R2 PUT has READY reservation and a held HTTP/1 body. The genuine
  # Owner action commits before the upload's mandatory late state check.
  dc.unroute('**/*');child=subprocess.Popen([node,str(repo/'tests/browser/sa04-attachments/stream-client.mjs')],cwd=repo,env={**os.environ,'K5_BASE':base},stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
  def stream_send(payload):child.stdin.write(json.dumps(payload)+'\n');child.stdin.flush();return stream_read()
  def stream_read():
   assert select.select([child.stdout],[],[],30)[0],'Held upload timed out';return json.loads(child.stdout.readline())
  delayed_asset=str(uuid4());old_keys={r['object_key'] for r in sql('select object_key from forum_attachment_upload_objects')}
  try:
   assert stream_send({'action':'start','cookie':cookie(dc),'attachment':delayed_asset,'operation':str(uuid4()),'context':context})['event']=='first-chunk-sent'
   wait_for(lambda:any(r['object_key'] not in old_keys for r in sql('select object_key from forum_attachment_upload_objects where reservation_etag is not null')),'actual local R2 READY')
   private(command(oc,delayed),200);assert stream_send({'action':'release'})['event']=='remainder-released'
   response=stream_read();assert response['status']==401 and 'no-store' in response['cache'],response
  finally:
   child.stdin.close()
   try:child.wait(timeout=8)
   except subprocess.TimeoutExpired:child.terminate();child.wait(timeout=5)
  assert not sql('select id from forum_attachments where id=$1',[delayed_asset]) and not sql('select attachment_id from forum_attachment_draft_refs where attachment_id=$1',[delayed_asset])
  assert not sql("select id from owner_events where source='operation' and kind='file.accepted' and entity_id=$1",[delayed_asset])
  record('actual-command-after-real-local-R2-READY-rejects-late-upload-without-metadata-ref-or-accepted-fact')

  # Hold the genuine successful action response after its database commit.
  # Browser Back changes the displayed target before that late response arrives;
  # the old operation must never revive a dialog or issue another POST.
  late_ctx,late_user,late_email,_=account('late-response');late_page=page(oc);late_sent=[];late_routes=[]
  late_page.on('request',lambda r:late_sent.append(r.post_data) if r.method=='POST' and '/owner/deactivate' in r.url else None)
  visit(late_page,'/en/users/'+quote(switch_user,safe=''));open_confirmation(late_page,late_user)
  def hold_committed(route):
   response=route.fetch();private_headers(response,200);late_routes.append((route,response))
  late_page.route('**/owner/deactivate',hold_committed)
  late_page.locator('dialog button[type=submit]').click()
  for _ in range(100):
   if late_routes:break
   late_page.wait_for_timeout(25)
  assert late_routes and state(late_user)['deactivated_at'] is not None
  assert len(late_sent)==1;expect(late_page.locator('dialog button[type=submit]')).to_be_disabled()
  late_page.go_back(wait_until='networkidle');expect(late_page.locator('#owner-account')).to_be_visible()
  assert quote(switch_user,safe='') in late_page.url
  for route,response in late_routes:
   try:route.fulfill(response=response)
   except Exception as error:
    assert 'closed' in str(error).lower() or 'interception' in str(error).lower() or 'invalid' in str(error).lower(),str(error)
  late_page.wait_for_timeout(300);expect(late_page.locator('dialog')).to_have_count(0)
  expect(late_page.locator('#owner-account')).not_to_contain_text(late_email);assert len(late_sent)==1
  late_page.unroute('**/owner/deactivate');late_page.close()
  record('actual-committed-late-ACK-after-browser-target-change-cannot-revive-dialog-or-replay')

  # Browser confirmation survives an externally changed cookie only until the
  # next request: authoritative403 then safe canonical GET removes old Owner UI.
  open_confirmation(opage,switch_user);before=domain();assert oc.request.post(base+'/api/auth/sign-out',headers={'Origin':base},data={}).status==200
  assert oc.request.post(base+'/api/auth/sign-in/email',headers={'Origin':base},data={'email':other_email,'password':other_password}).status==200
  prior=len(sent);submit(opage,403);expect(opage.locator('#owner-account,#owner-history,dialog.owner-deactivation-dialog')).to_have_count(0)
  opage.wait_for_timeout(500);assert len(sent)==prior+1 and state(switch_user)['deactivated_at'] is None and domain()==before
  assert oc.request.post(base+'/api/auth/sign-out',headers={'Origin':base},data={}).status==200
  assert oc.request.post(base+'/api/auth/sign-in/email',headers={'Origin':base},data={'email':owner_email,'password':owner_password}).status==200
  assert sql('update "session" set user_id=$1 where user_id=$2 returning id',[owner,issued])
  open_confirmation(opage,switch_user);opage.keyboard.press('Escape');expect(opage.locator('dialog')).to_have_count(0)
  record('genuine-account-switch-denies-stale-confirmation-and-fresh-Owner-read-never-restores-old-operation')

  # Known UI sign-out must clear private DOM even while its fresh GET is held.
  open_confirmation(opage,switch_user);opage.keyboard.press('Escape');held=[]
  opage.route('**/users/*.data*',lambda route:held.append(route))
  with opage.expect_response(lambda r:r.request.method=='POST' and '/api/auth/sign-out' in r.url) as signed:opage.locator('.auth-sign-out').click()
  assert signed.value.status==200;expect(opage.locator('.auth-controls[data-state=guest]')).to_have_count(1)
  expect(opage.locator('#owner-account,#owner-history,dialog.owner-deactivation-dialog')).to_have_count(0)
  for _ in range(30):
   if held:break
   opage.wait_for_timeout(50)
  assert held,'Expected held canonical revalidation'
  for route in held:route.continue_()
  opage.unroute('**/users/*.data*');record('known-UI-signout-clears-confirmation-private-DOM-before-fresh-GET')

  # The command retained both target sessions; own signed sign-out is still the
  # narrow legitimate cleanup, never a foreign forced-session operation.
  request=Request(base+'/api/auth/sign-out',b'{}',method='POST',headers={'Origin':base,'Cookie':saved_cookie,'Content-Type':'application/json'})
  with urlopen(request,timeout=15) as r:assert r.status==200
  assert sql('select count(*)::int n from "session" where user_id=$1',[target])[0]['n']==1
  assert not page_errors,page_errors;assert not external,external
  record('inactive-own-signed-signout-only-and-no-browser-errors-external-network')
  record('whole-SA05-connected-pass')
finally:
 if browser:
  for ctx in contexts:
   try:ctx.close()
   except Exception:pass
  try:browser.close()
  except Exception:pass
 if pg:
  pg.stdin.close()
  try:pg.wait(timeout=8)
  except subprocess.TimeoutExpired:pg.terminate();pg.wait(timeout=5)
 (a.output/'results.json').write_text(json.dumps({'head':os.environ.get('IMPLEMENTATION_SHA'),'runtime':'actual Worker/BA/PG17/local R2/Chromium; synthetic fixtures','cases':records,'pageErrors':page_errors,'external':external},ensure_ascii=False,indent=2))
