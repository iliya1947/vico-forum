"""SA08-B real Worker admission with missing/wrong synthetic Owner binding.
Run after check.py on the same disposable database, restarting the actual Worker
with the requested .dev.vars binding. No auth/store/reader doubles are used.
"""
import argparse,json,os,select,shutil,subprocess
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
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
  print('SA08_BINDING '+json.dumps(records[-1]),flush=True);browser.close()
finally:
 if pg:
  pg.stdin.close()
  try:pg.wait(timeout=8)
  except subprocess.TimeoutExpired:pg.terminate();pg.wait(timeout=5)
 (a.output/'results.json').write_text(json.dumps({'head':os.environ.get('IMPLEMENTATION_SHA'),'binding':a.mode,'cases':records},indent=2))
