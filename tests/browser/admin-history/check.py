"""Opt-in loopback Worker/Better Auth/PostgreSQL History verification; see README."""
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
prefix = 'ap03-' + uuid4().hex
accounts = []


def sql(query, params=None):
    code = """import pg from './node_modules/pg/lib/index.js';const input=JSON.parse(await new Promise(r=>{let s='';process.stdin.on('data',b=>s+=b);process.stdin.on('end',()=>r(s));}));const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();try{console.log(JSON.stringify((await c.query(input.query,input.params)).rows??[]));}finally{await c.end();}"""
    result = subprocess.run([node, '--input-type=module', '-e', code], cwd=repo, input=json.dumps({'query': query, 'params': params or []}), text=True, capture_output=True, check=True)
    return json.loads(result.stdout)


def record(name):
    records.append(name)
    print(name, flush=True)


def count():
    return sql('select count(*)::int n from admin_history')[0]['n']


def document(page, path, status=200):
    r = page.goto(base + path, wait_until='networkidle')
    assert r.status == status, (path, r.status)
    if '/admin/authorization' not in path:
        assert 'no-store' in r.headers.get('cache-control', ''), r.headers
    return r


def mutate(context, form, status=200):
    r = context.request.post(base + '/en/admin/authorization', headers={'Origin': base}, form=form)
    assert r.status == status, (form['intent'], r.status, r.text()[:150])


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
        manager = browser.new_context(viewport={'width': 1280, 'height': 900})
        reader = browser.new_context(viewport={'width': 1280, 'height': 900})
        for c in [manager, reader]:
            c.route('**/*', lambda route: route.continue_() if route.request.url.startswith(base + '/') else (external.append(route.request.url), route.abort())[-1])
        page = manager.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        document(page, '/en/admin/history', 401)
        for c, name in [(manager, 'Manager'), (reader, 'Reader')]:
            r = c.request.post(base + '/api/auth/sign-up/email', headers={'Origin': base}, data={'name': name + ' עברית', 'email': prefix + name + '@test.invalid', 'password': prefix + '-local-only'})
            assert r.status == 200, r.status
            accounts.append(r.json()['user']['id'])
        actor, target = accounts
        document(page, '/en/admin/history', 403)
        sql("insert into authz_user_roles(user_id,role_id) values($1,'builtin-admin')", [actor])
        sql("insert into authz_user_permission_overrides(user_id,permission_key,effect) values($1,'admin.history.read','deny')", [actor])
        document(page, '/en/admin/history', 403)
        before = count()
        mutate(manager, {'intent': 'createRole', 'slug': prefix, 'displayName': 'Before ' + prefix})
        role = sql('select id from authz_roles where slug=$1', [prefix])[0]['id']
        mutate(manager, {'intent': 'renameRole', 'roleId': role, 'displayName': 'Deleted role עברית ' + prefix})
        mutate(manager, {'intent': 'renameRole', 'roleId': role, 'displayName': 'Deleted role עברית ' + prefix})
        mutate(manager, {'intent': 'roleGrants', 'roleId': role, 'permission': 'forum.topic.pin'})
        mutate(manager, {'intent': 'roleGrants', 'roleId': role, 'permission': 'forum.topic.pin'})
        mutate(manager, {'intent': 'assignRole', 'userId': target, 'roleId': 'builtin-moderator'})
        mutate(manager, {'intent': 'assignRole', 'userId': target, 'roleId': 'builtin-moderator'})
        mutate(manager, {'intent': 'override', 'userId': target, 'permission': 'forum.reply.create', 'effect': 'deny'})
        mutate(manager, {'intent': 'override', 'userId': target, 'permission': 'forum.reply.create', 'effect': 'deny'})
        mutate(manager, {'intent': 'deleteRole', 'roleId': role})
        assert count() == before + 6
        mutate(manager, {'intent': 'override', 'userId': actor, 'permission': 'access.authorization.manage', 'effect': 'deny'}, 409)
        mutate(reader, {'intent': 'createRole', 'slug': prefix + '-denied', 'displayName': 'Denied'}, 403)
        assert count() == before + 6
        record('six-real-management-producers-noop-retry-lockout-denial')
        document(page, '/en/admin')
        assert page.locator('.admin-history-events').count() == 0
        assert 'Deleted role עברית ' + prefix not in page.content()
        record('no-private-overview-history-without-read')
        sql("update authz_user_permission_overrides set effect='allow' where user_id=$1 and permission_key='admin.history.read'", [actor])
        document(page, '/en/admin/history')
        assert page.locator('.admin-history-events li').count() == 6
        assert 'Deleted role עברית ' + prefix in page.locator('.admin-history-events').inner_text()
        document(page, '/en/admin')
        assert page.locator('.admin-history-events li').count() == 5
        record('deleted-role-context-and-five-real-overview-events')
        # Provision a history-only reader using the same existing role/override state.
        sql("update authz_user_roles set role_id='builtin-user' where user_id=$1", [target])
        sql("insert into authz_user_permission_overrides(user_id,permission_key,effect) values($1,'admin.history.read','allow')", [target])
        rp = reader.new_page()
        rp.on('pageerror', lambda e: errors.append(str(e)))
        document(rp, '/en/admin/history')
        document(rp, '/en/admin/authorization', 403)
        document(rp, '/en/admin')
        assert rp.locator('.auth-admin-link').count() == 1
        sql("update authz_user_permission_overrides set effect='deny' where user_id=$1 and permission_key='admin.history.read'", [target])
        document(rp, '/en/admin/history', 403)
        assert rp.locator('.auth-admin-link').count() == 0
        record('history-only-admission-independent-management-denial-next-request-revoke')
        for locale, heading, direction in [('en', 'History', 'ltr'), ('ru', 'История', 'ltr'), ('he', 'היסטוריה', 'rtl')]:
            for width in [320, 768, 1280]:
                page.set_viewport_size({'width': width, 'height': 900})
                document(page, '/' + locale + '/admin/history')
                assert page.locator('#admin-history-heading').inner_text() == heading
                assert page.locator('html').get_attribute('dir') == direction
                assert page.locator('.admin-panel-nav [aria-current="page"]').get_attribute('href').endswith('/admin/history')
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                page.locator('.admin-panel-nav a').first.focus()
                page.keyboard.press('Tab')
                assert page.locator('.admin-panel-nav').evaluate('e=>e.contains(document.activeElement)')
                if width == 320:
                    page.screenshot(path=str(a.output / (locale + '-320.png')), full_page=True)
                record('localized-history-' + locale + '-' + str(width))
        # Real operations generate enough history to cross the 25-item page boundary.
        mutate(manager, {'intent': 'createRole', 'slug': prefix + '-paging', 'displayName': 'Page 0'})
        paging = sql('select id from authz_roles where slug=$1', [prefix + '-paging'])[0]['id']
        for n in range(1, 28):
            mutate(manager, {'intent': 'renameRole', 'roleId': paging, 'displayName': 'Page ' + str(n)})
        document(page, '/en/admin/history')
        texts = page.locator('.admin-history-events li').all_text_contents()
        assert len(texts) == 25
        page.locator('.admin-history-paging a').last.click()
        page.wait_for_url('**/admin/history?before=*')
        page.get_by_role('link', name='Newest actions', exact=True).wait_for()
        older = page.locator('.admin-history-events li').all_text_contents()
        assert older and not set(texts).intersection(older), {'firstCount': len(texts), 'olderCount': len(older), 'overlap': list(set(texts).intersection(older)), 'url': page.url}
        page.locator('.admin-history-paging a').first.click()
        page.wait_for_url('**/en/admin/history')
        page.get_by_role('link', name='Newest actions', exact=True).wait_for(state='detached')
        record('actual-keyset-older-and-newest-navigation')
        lockcode = """import pg from './node_modules/pg/lib/index.js';const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();await c.query('begin;lock table admin_history in access exclusive mode');console.log('LOCKED');process.stdin.once('data',async()=>{await c.query('rollback');await c.end();});"""
        locker = subprocess.Popen([node, '--input-type=module', '-e', lockcode], cwd=repo, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
        try:
            assert locker.stdout.readline().strip() == 'LOCKED'
            document(page, '/en/admin/history', 503)
            document(page, '/en/admin')
            assert page.locator('#admin-recent-heading').count() == 1
            assert page.locator('.admin-history-events').count() == 0
            assert page.locator('.admin-stat-list').count() == 1
            record('real-history-outage-503-and-overview-degradation')
        finally:
            locker.communicate('release\n', timeout=15)
        document(page, '/en/admin/history')
        assert page.locator('.admin-history-events li').count() == 25
        record('history-recovery')
        browser.close()
    assert not errors, errors
    assert not external, external
finally:
    # Disposable DB only: remove this run's history before removing its fixture identities.
    if accounts:
        sql('delete from admin_history where actor_id=any($1::text[])', [accounts])
        sql('delete from authz_user_permission_overrides where user_id=any($1::text[])', [accounts])
        sql('delete from authz_user_roles where user_id=any($1::text[])', [accounts])
        sql('delete from "user" where id=any($1::text[])', [accounts])
    sql('delete from authz_roles where slug like $1', [prefix + '%'])
    (a.output / 'results.json').write_text(json.dumps({'cases': records, 'pageErrors': errors, 'external': external}, ensure_ascii=False, indent=2))
