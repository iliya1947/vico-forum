"""Opt-in actual Worker/auth/PostgreSQL/browser check. See README.md."""
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
parser.add_argument('--url', default='http://127.0.0.1:4182')
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
repo = Path(__file__).resolve().parents[3]
base = args.url.rstrip('/')
assert urlparse(base).hostname in ['127.0.0.1', 'localhost'], 'Loopback app required'
database = os.environ.get('DATABASE_URL', '')
assert urlparse(database).hostname in ['127.0.0.1', 'localhost'] and urlparse(database).path.endswith('_test'), 'Local disposable *_test database required'
args.output.mkdir(parents=True, exist_ok=True)
node = shutil.which('node')
assert node
records, errors, external = [], [], []
role = 'ap02-browser-' + uuid4().hex
actor = None


def sql(query, params=None):
    code = """import pg from './node_modules/pg/lib/index.js';
const input=JSON.parse(await new Promise(r=>{let s='';process.stdin.on('data',b=>s+=b);process.stdin.on('end',()=>r(s));}));
const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();
try{console.log(JSON.stringify((await c.query(input.query,input.params)).rows??[]));}finally{await c.end();}"""
    # Exact code goes through -e; data goes through stdin, never shell interpolation.
    result = subprocess.run([node, '--input-type=module', '-e', code], cwd=repo,
                            input=json.dumps({'query': query, 'params': params or []}), text=True,
                            capture_output=True, check=True)
    return json.loads(result.stdout)


def record(name, **data):
    records.append({'case': name, **data})
    print(json.dumps(records[-1], ensure_ascii=False), flush=True)


def document(page, path, status=200):
    response = page.goto(base + path, wait_until='networkidle')
    assert response.status == status, (path, response.status)
    if path.endswith('/admin'):
        assert 'no-store' in response.headers.get('cache-control', ''), response.headers
    return response


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM', '/usr/bin/chromium'),
                                    headless=True, args=['--no-sandbox'])
        context = browser.new_context(viewport={'width': 1280, 'height': 900})
        context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(base + '/') else (external.append(route.request.url), route.abort())[-1])
        page = context.new_page()
        page.set_default_timeout(15000)
        page.on('pageerror', lambda e: errors.append(str(e)))
        document(page, '/en/admin', 401)
        record('guest-denied', status=401)
        # Real Better Auth handler and native DB, with disposable account/password only.
        response = context.request.post(base + '/api/auth/sign-up/email', headers={'Origin': base}, data={
            'name': 'AP02 test reviewer עברית ' + 'Long name ' * 5,
            'email': role + '@test.invalid', 'password': 'AP02-local-test-only-' + uuid4().hex,
        })
        assert response.status == 200, response.status
        actor = response.json()['user']['id']
        document(page, '/en/admin', 403)
        record('authenticated-no-admin-capability', status=403)
        sql('insert into authz_roles(id,slug,display_name,is_system) values($1,$1,$2,false)', [role, 'Arbitrary custom role'])
        sql('insert into authz_role_permissions(role_id,permission_key) values($1,$2)', [role, 'forum.topic.pin'])
        sql('insert into authz_user_roles(user_id,role_id) values($1,$2)', [actor, role])
        document(page, '/en/admin')
        assert page.locator('.auth-admin-link').get_attribute('href') == '/en/admin'
        assert page.locator('.admin-destination[href$="/admin/authorization"]').count() == 0
        expected = sql("select (select count(*) from forum_categories)::int as categories,(select count(*) from forum_sections where id<>'help-solutions-questions')::int as sections,(select count(*) from forum_topics)::int as topics,(select count(*) from forum_posts)::int as posts")[0]
        actual = page.locator('.admin-stat-list dd').all_text_contents()
        assert actual == [f'{v:,}' for v in expected.values()], (actual, expected)
        record('native-counts-and-forum-only-admission', counts=expected)
        document(page, '/en/admin/authorization', 403)
        sql("insert into authz_user_permission_overrides(user_id,permission_key,effect) values($1,'access.authorization.manage','allow')", [actor])
        document(page, '/en/admin')
        page.locator('.admin-destination[href$="/admin/authorization"]').click()
        page.wait_for_url('**/en/admin/authorization')
        page.locator('input[name="slug"]').wait_for()
        assert page.locator('input[name="slug"]').count() == 1
        record('existing-authorization-route-still-usable')
        for locale, heading, direction in [('en', 'Admin panel', 'ltr'), ('ru', 'Админ-панель', 'ltr'), ('he', 'לוח ניהול', 'rtl')]:
            for width in [320, 390, 768, 1280]:
                page.set_viewport_size({'width': width, 'height': 900})
                document(page, '/' + locale + '/admin')
                assert page.locator('h1').inner_text() == heading
                assert page.locator('html').get_attribute('dir') == direction
                geometry = page.evaluate('({document:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})')
                assert geometry['document'] <= geometry['client'] + 1, geometry
                for link in page.locator('.admin-panel-nav a,.admin-destination').all():
                    link.scroll_into_view_if_needed()
                    assert link.evaluate('e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>=43&&r.left>=-1&&r.right<=innerWidth+1;}')
                page.locator('.admin-panel-nav a').first.focus()
                page.keyboard.press('Tab')
                assert page.locator('.admin-panel-nav').evaluate('e=>e.contains(document.activeElement)')
                record('layout-' + locale + '-' + str(width), direction=direction, **geometry)
                if width == 320:
                    page.screenshot(path=str(args.output / (locale + '-320.png')), full_page=True)
        document(page, '/en/admin')
        page.locator('.language-switcher select').select_option('he')
        page.wait_for_url('**/he/admin')
        assert page.locator('h1').inner_text() == 'לוח ניהול'
        page.locator('.admin-panel-nav a[href*="admin-forum"]').focus()
        page.keyboard.press('Enter')
        page.wait_for_url('**/he/under-development?feature=admin-forum')
        assert page.locator('.under-development-requested').inner_text().startswith('פורום')
        record('keyboard-placeholder-and-language-navigation')
        # A real locked forum relation makes the bounded counts query time out;
        # session and authorization remain available on their independent relations.
        lock_code = """import pg from './node_modules/pg/lib/index.js';const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();await c.query('begin;lock table forum_topics in access exclusive mode');console.log('LOCKED');process.stdin.once('data',async()=>{await c.query('rollback');await c.end();});"""
        locker = subprocess.Popen([node, '--input-type=module', '-e', lock_code], cwd=repo,
                                  stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
        try:
            assert locker.stdout.readline().strip() == 'LOCKED'
            document(page, '/en/admin')
            assert page.locator('.admin-stats-unavailable').count() == 1
            assert page.locator('.admin-stat-list dd').count() == 0
            assert page.locator('.admin-panel-nav a').count() > 1
            record('real-statistics-timeout-keeps-navigation', status=200)
        finally:
            locker.communicate('release\n', timeout=15)
        page.locator('.admin-stats-unavailable a').click()
        page.locator('.admin-stat-list dd').first.wait_for()
        record('native-counts-recover-on-retry')
        sql("insert into authz_user_permission_overrides(user_id,permission_key,effect) values($1,'forum.topic.pin','deny')", [actor])
        sql("update authz_user_permission_overrides set effect='deny' where user_id=$1 and permission_key='access.authorization.manage'", [actor])
        document(page, '/en/admin', 403)
        assert page.locator('.auth-admin-link').count() == 0
        record('next-request-deny-revokes-global-entry', status=403)
        context.close()
        browser.close()
    assert not errors, errors
    assert not external, external
finally:
    if actor:
        sql('delete from authz_user_permission_overrides where user_id=$1', [actor])
        sql('delete from authz_user_roles where user_id=$1', [actor])
        sql('delete from "user" where id=$1', [actor])
    sql('delete from authz_role_permissions where role_id=$1', [role])
    sql('delete from authz_roles where id=$1', [role])
    (args.output / 'results.json').write_text(json.dumps({'cases': records, 'pageErrors': errors, 'external': external}, ensure_ascii=False, indent=2))
