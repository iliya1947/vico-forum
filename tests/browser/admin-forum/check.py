"""Opt-in AP-06 Worker/auth/PostgreSQL category/section checks; see README."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
from urllib.parse import urlparse
from uuid import uuid4
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--url', default='http://127.0.0.1:4187')
parser.add_argument('--output', type=Path, required=True)
a = parser.parse_args()
base = a.url.rstrip('/')
database = os.environ.get('DATABASE_URL', '')
assert urlparse(base).hostname in ['127.0.0.1', 'localhost']
assert urlparse(database).hostname in ['127.0.0.1', 'localhost'] and urlparse(database).path.endswith('_test')
repo = Path(__file__).resolve().parents[3]
a.output.mkdir(parents=True, exist_ok=True)
node = shutil.which('node')
records, errors, external = [], [], []
prefix = 'ap06-' + uuid4().hex
accounts = []


def sql(query, params=None):
    code = """import pg from './node_modules/pg/lib/index.js';const input=JSON.parse(await new Promise(r=>{let s='';process.stdin.on('data',b=>s+=b);process.stdin.on('end',()=>r(s));}));const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();try{console.log(JSON.stringify((await c.query(input.query,input.params)).rows??[]));}finally{await c.end();}"""
    result = subprocess.run([node, '--input-type=module', '-e', code], cwd=repo, input=json.dumps({'query': query, 'params': params or []}), text=True, capture_output=True, check=True)
    return json.loads(result.stdout)


def record(name):
    records.append(name)
    print(name, flush=True)

def document(page, path, status=200):
    r = page.goto(base + path, wait_until='networkidle')
    assert r.status == status, (path, r.status)
    assert 'private' in r.headers.get('cache-control', '') and 'no-store' in r.headers.get('cache-control', ''), r.headers
    return r

paths = ['/en/admin/forum', '/en/admin/forum/categories/help-solutions', '/en/admin/forum/sections/help-solutions-questions']
permissions = ['forum.topic.pin', 'forum.solution.manageAny', 'forum.helpDuplicate.manage', 'forum.sourceLocale.correctAny', 'forum.post.history.read']
category = prefix + '/category עברית'
section = prefix + '/section עברית'
from urllib.parse import quote
category_path = '/admin/forum/categories/' + quote(category, safe='')
section_path = '/admin/forum/sections/' + quote(section, safe='')
role = prefix + '-role'
try:
    sql('insert into forum_categories(id,name) values($1,$2)', [category, 'Long category עברית ' + 'א' * 150])
    sql('insert into forum_sections(id,category_id,name) values($1,$2,$3)', [section, category, 'Long section עברית ' + 'א' * 150])
    for n in range(60):
        sql('insert into forum_categories(id,name) values($1,$2)', [prefix + '-c-' + str(n).zfill(3), 'Literal %_\\ 😀' if n == 59 else 'Fixture ' + str(n)])
        sql('insert into forum_sections(id,category_id,name) values($1,$2,$3)', [prefix + '-s-' + str(n).zfill(3), category, 'Literal %_\\ 😀' if n == 59 else 'Fixture ' + str(n)])
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
        context = browser.new_context(viewport={'width':1280,'height':900})
        context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(base + '/') else (external.append(route.request.url),route.abort())[-1])
        page = context.new_page();page.set_default_timeout(15000)
        page.on('pageerror', lambda e: errors.append(str(e)))
        for path in paths:
            document(page,path,401)
        response = context.request.post(base + '/api/auth/sign-up/email', headers={'Origin':base}, data={'name':'AP06 Synthetic Reviewer','email':prefix+'@test.invalid','password':'AP06-local-only-'+uuid4().hex})
        assert response.status == 200, response.text()
        actor = response.json()['user']['id'];accounts.append(actor)
        sql('insert into authz_roles(id,slug,display_name,is_system) values($1,$1,$2,false)',[role,'Ordinary custom label'])
        sql('insert into authz_user_roles(user_id,role_id) values($1,$2)',[actor,role])
        for permission in [None,'forum.solution.manageOwn','forum.helpNeedsDetails.manage','forum.attachmentSecurity.read','admin.history.read','access.authorization.manage']:
            sql('delete from authz_role_permissions where role_id=$1',[role])
            if permission:sql('insert into authz_role_permissions(role_id,permission_key) values($1,$2)',[role,permission])
            for path in paths:document(page,path,403)
            record('independent-denial-'+str(permission))
        for permission in permissions:
            sql('delete from authz_role_permissions where role_id=$1',[role])
            sql('insert into authz_role_permissions(role_id,permission_key) values($1,$2)',[role,permission])
            for path in paths:document(page,path)
            record('independent-admission-'+permission)
        sql("insert into authz_user_permission_overrides(user_id,permission_key,effect) values($1,'forum.post.history.read','deny')",[actor])
        for path in paths:document(page,path,403)
        sql('delete from authz_user_permission_overrides where user_id=$1',[actor])
        record('next-request-revocation-and-inherit')
        for path in ['/en/admin/forum?q=a&q=b','/en/admin/forum?after=','/en/admin/forum/categories/absent','/en/admin/forum/sections/absent']:
            document(page,path,404 if 'absent' in path else 400)
        for path in paths:
            r=context.request.post(base+path,headers={'Origin':base},data={'intent':'pinTopic'})
            assert r.status == 405, (path,r.status)
            assert 'no-store' in r.headers.get('cache-control',''), r.headers
        record('validation-not-found-and-no-mutations')
        for root, expected in [('/en/admin/forum',62),('/en'+category_path,61)]:
            document(page,root);seen=[]
            while True:
                seen.extend(page.locator('.admin-forum-objects h4 a').evaluate_all('(xs)=>xs.map(x=>x.getAttribute("href"))'))
                assert page.locator('.admin-forum-objects > li').count()<=25
                next=page.locator('.admin-forum-paging a').filter(has_text='Next page')
                if not next.count():break
                document(page,next.get_attribute('href'))
            assert len(seen)==expected and len(set(seen))==expected,(len(seen),expected)
            document(page,root)
            page.locator('input[name="q"]').fill('%_\\')
            page.locator('input[name="q"]').press('Enter');page.wait_for_url('**/*?q=*');page.locator('.admin-forum-objects > li').first.wait_for()
            assert page.locator('.admin-forum-objects > li').count()==1
            assert page.locator('.admin-forum-objects').inner_text().startswith('Literal %_\\')
            assert 'after=' not in page.url
        record('bounded-stable-paging-and-literal-search-before-limit')
        document(page,'/en/admin/forum?q=does-not-exist')
        assert page.locator('.admin-forum-objects').count()==0 and 'No matching objects.' in page.inner_text('main')
        document(page,paths[2]);assert page.locator('.admin-forum-reserved').inner_text()=='Internal Help service section'
        assert page.locator('.admin-forum > a').get_attribute('href')=='/en/categories/help-solutions'
        r=page.goto(base+'/en/sections/help-solutions-questions',wait_until='networkidle');assert r.status==404
        document(page,'/en/under-development?feature=admin-forum');assert page.url==base+'/en/admin/forum'
        record('truthful-empty-help-projection-and-old-link')
        for locale,direction in [('en','ltr'),('ru','ltr'),('he','rtl')]:
            for width in [320,768,1280]:
                page.set_viewport_size({'width':width,'height':900})
                for suffix in ['/admin/forum',category_path,section_path]:
                    document(page,'/'+locale+suffix)
                    assert page.locator('html').get_attribute('dir')==direction
                    assert page.locator('h1').count()==1 and page.locator('main').count()==1
                    assert page.locator('.admin-panel-nav [aria-current="page"]').get_attribute('href')=='/'+locale+'/admin/forum'
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
                    assert 'adminForumSearch' not in page.inner_text('main')
                    if suffix==section_path:
                        page.locator('.admin-forum-trail a').last.focus();page.keyboard.press('Enter');page.wait_for_url('**/'+locale+category_path)
                if width==320:page.screenshot(path=str(a.output/(locale+'-320.png')),full_page=True)
                record('layout-keyboard-'+locale+'-'+str(width))
        lock_code="""import pg from './node_modules/pg/lib/index.js';const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();await c.query('begin;lock table forum_categories in access exclusive mode');console.log('LOCKED');process.stdin.once('data',async()=>{await c.query('rollback');await c.end();});"""
        locker=subprocess.Popen([node,'--input-type=module','-e',lock_code],cwd=repo,stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
        try:
            assert locker.stdout.readline().strip()=='LOCKED'
            for path in paths:document(page,path,503)
            record('real-postgres-timeout-protected-503')
        finally:locker.communicate('release\n',timeout=15)
        for path in paths:document(page,path)
        record('database-recovery')
        context.close();browser.close()
    assert not errors,errors
    assert not external,external
finally:
    for actor in accounts:
        sql('delete from authz_user_permission_overrides where user_id=$1',[actor]);sql('delete from authz_user_roles where user_id=$1',[actor]);sql('delete from "user" where id=$1',[actor])
    sql('delete from authz_role_permissions where role_id=$1',[role]);sql('delete from authz_roles where id=$1',[role])
    sql('delete from forum_sections where category_id=$1',[category]);sql('delete from forum_categories where id like $1',[prefix+'%'])
    (a.output/'results.json').write_text(json.dumps({'cases':records,'pageErrors':errors,'external':external},ensure_ascii=False,indent=2))
