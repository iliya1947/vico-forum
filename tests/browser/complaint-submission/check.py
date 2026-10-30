"""Opt-in actual Worker/session/PostgreSQL complaint submission check. See README.md."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
from urllib.parse import urlencode, urlparse
from uuid import uuid4

from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--url', default='http://127.0.0.1:4184')
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
repo = Path(__file__).resolve().parents[3]
base = args.url.rstrip('/')
database = os.environ.get('DATABASE_URL', '')
assert urlparse(base).hostname in ['127.0.0.1', 'localhost'], 'Loopback app required'
assert urlparse(database).hostname in ['127.0.0.1', 'localhost'] and urlparse(database).path.endswith('_test'), 'Local disposable *_test database required'
args.output.mkdir(parents=True, exist_ok=True)
node = shutil.which('node')
assert node
prefix = 'complaint-browser-' + uuid4().hex
records, errors, external = [], [], []


def sql(query, params=None):
    code = """import pg from './node_modules/pg/lib/index.js';
const input=JSON.parse(await new Promise(r=>{let s='';process.stdin.on('data',b=>s+=b);process.stdin.on('end',()=>r(s));}));
const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();
try{console.log(JSON.stringify((await c.query(input.query,input.params)).rows??[]));}finally{await c.end();}"""
    result = subprocess.run([node, '--input-type=module', '-e', code], cwd=repo,
                            input=json.dumps({'query': query, 'params': params or []}), text=True,
                            capture_output=True, check=True)
    return json.loads(result.stdout)


def record(name, **data):
    records.append({'case': name, **data})
    print(json.dumps(records[-1], ensure_ascii=False), flush=True)


def submit(context, topic, fields):
    return context.request.post(base + '/en/topics/' + topic + '/complaints',
                                headers={'Origin': base, 'Content-Type': 'application/x-www-form-urlencoded'},
                                data=urlencode(fields))


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM', '/usr/bin/chromium'),
                                    headless=True, args=['--no-sandbox'])
        context = browser.new_context(viewport={'width': 1280, 'height': 900})
        context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(base + '/') else (external.append(route.request.url), route.abort())[-1])
        page = context.new_page()
        page.set_default_timeout(15000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        assert submit(context, prefix, {}).status == 401
        # Real email session; all credentials belong solely to this disposable fixture.
        signup = context.request.post(base + '/api/auth/sign-up/email', headers={'Origin': base}, data={
            'name': 'Complaint browser tester', 'email': prefix + '@test.invalid',
            'password': 'local-only-' + uuid4().hex,
        })
        assert signup.status == 200, signup.text()
        actor = signup.json()['user']['id']
        # Trusted native repository creates actual forum content, without mocking routes.
        seed = """import pg from 'pg';import {drizzle} from 'drizzle-orm/node-postgres';
import {DrizzleForumRepository} from './db/forum-repository.ts';
const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();
try{const f=new DrizzleForumRepository(drizzle(c),{cooldownMs:0,now:()=>new Date()});
const [id,actor]=process.argv.slice(1);await f.createCategory({id,name:'Complaint fixture'});
await f.createSection({id,categoryId:id,name:'Reports'});
for(let i=0;i<13;i++){const t=id+'-'+i;await f.createTopicWithInitialPost({id:t,sectionId:id,authorId:actor,
titleRevision:{id:t+'-title',originalContent:'Report title עברית',sourceLocale:'en'},
initialPost:{id:t+'-post',topicId:t,authorId:actor,bodyRevision:{id:t+'-body',originalContent:'Report body текст עברית',sourceLocale:'en'}}});}}
finally{await c.end();}"""
        subprocess.run([node, '--import', 'tsx', '--input-type=module', '-e', seed, prefix, actor], cwd=repo, check=True)
        topic = prefix + '-0'
        path = '/en/topics/' + topic
        assert page.goto(base + path, wait_until='networkidle').status == 200
        assert page.locator('.complaint-open').count() == 2
        guest = browser.new_context()
        guest_page = guest.new_page()
        assert guest_page.goto(base + path, wait_until='networkidle').status == 200
        assert guest_page.locator('.complaint-open').count() == 0
        guest.close()
        record('guest-hidden-and-post-denied-current-user-admitted')
        # Separate real reporter keeps Unicode checks independent of the quota fixture.
        unicode_context = browser.new_context()
        unicode_context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(base + '/') else (external.append(route.request.url), route.abort())[-1])
        signup = unicode_context.request.post(base + '/api/auth/sign-up/email', headers={'Origin': base}, data={
            'name': 'Unicode reporter', 'email': prefix + '-unicode@test.invalid',
            'password': 'local-only-' + uuid4().hex,
        })
        assert signup.status == 200, signup.text()
        unicode_actor = signup.json()['user']['id']
        unicode_page = unicode_context.new_page()
        unicode_page.on('pageerror', lambda error: errors.append(str(error)))
        for index, text in enumerate(['😀' * 2000, 'a' * 1000 + '😀' * 1000, '😀' * 2001]):
            t = prefix + '-' + str(10 + index)
            unicode_page.goto(base + '/en/topics/' + t, wait_until='networkidle')
            unicode_page.locator('.complaint-open').last.click()
            form = unicode_page.locator('.complaint-form')
            form.locator('select').select_option('other')
            form.locator('textarea').focus()
            # User-input path: native maxlength must not truncate astral characters.
            unicode_page.keyboard.insert_text(text)
            assert form.locator('textarea').input_value() == text
            operation = form.locator('[name=operationId]').input_value()
            with unicode_page.expect_response(lambda r: '/complaints' in r.url and r.request.method == 'POST') as pending:
                form.locator('button[type=submit]').click()
            if index == 2:
                assert pending.value.status == 400
                form.locator('[role=alert]').wait_for()
                assert form.locator('textarea').input_value() == text
                assert form.locator('[name=operationId]').input_value() == operation
                assert sql('select count(*)::int as n from forum_complaints where reporter_user_id=$1', [unicode_actor])[0]['n'] == 2
                form.locator('textarea').focus()
                unicode_page.keyboard.press('ControlOrMeta+A')
                text = '😀' * 2000
                unicode_page.keyboard.insert_text(text)
                assert form.locator('[name=operationId]').input_value() == operation
                with unicode_page.expect_response(lambda r: '/complaints' in r.url and r.request.method == 'POST') as pending:
                    form.locator('button[type=submit]').click()
            assert pending.value.status == 200, pending.value.status
            unicode_page.locator('.complaint-confirmation').wait_for()
            saved = sql('select c.explanation from forum_complaints c join forum_complaint_targets t on t.id=c.target_id where reporter_user_id=$1 and topic_id=$2', [unicode_actor, t])
            assert saved == [{'explanation': text}], saved
            record('unicode-codepoints-' + str(index), persistedCodePoints=len(text), rejected2001AndRetried=index == 2)
        unicode_context.close()
        # Layout and keyboard in every canonical language, including narrow RTL.
        for locale, direction in [('en', 'ltr'), ('ru', 'ltr'), ('he', 'rtl')]:
            for width in [320, 390, 768, 1280]:
                page.set_viewport_size({'width': width, 'height': 900})
                assert page.goto(base + '/' + locale + '/topics/' + topic, wait_until='networkidle').status == 200
                page.locator('.complaint-open').first.focus()
                page.keyboard.press('Enter')
                form = page.locator('.complaint-form')
                form.wait_for()
                form.locator('select').select_option('other')
                assert form.locator('textarea').get_attribute('required') is not None
                assert page.locator('html').get_attribute('dir') == direction
                geometry = page.evaluate('({document:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})')
                assert geometry['document'] <= geometry['client'] + 1, geometry
                form.locator('select').focus()
                page.keyboard.press('Tab')
                assert form.locator('textarea').evaluate('e=>e===document.activeElement')
                if width == 320:
                    page.screenshot(path=str(args.output / (locale + '-320.png')), full_page=True)
                record('layout-' + locale + '-' + str(width), direction=direction, **geometry)
        page.goto(base + path, wait_until='networkidle')
        page.locator('.complaint-open').first.click()
        form = page.locator('.complaint-form')
        form.locator('select').select_option('other')
        form.locator('button[type=submit]').click()
        assert sql('select count(*)::int as n from forum_complaints where reporter_user_id=$1', [actor])[0]['n'] == 0
        form.locator('textarea').fill('Explanation текст עברית')
        form.locator('button[type=submit]').click()
        page.locator('.complaint-confirmation').wait_for()
        assert page.url == base + path
        page.locator('.complaint-open').click()
        page.locator('.complaint-form button[type=submit]').click()
        page.locator('.complaint-confirmation').nth(1).wait_for()
        rows = sql('select t.kind,c.reason,c.explanation from forum_complaints c join forum_complaint_targets t on t.id=c.target_id where c.reporter_user_id=$1 order by t.kind', [actor])
        assert [r['kind'] for r in rows] == ['post', 'topic-title'], rows
        assert rows[1]['explanation'] == 'Explanation текст עברית'
        record('distinct-title-post-inline-confirmation-other-validation', rows=rows)
        fields = {'kind': 'post', 'postId': topic + '-post', 'revisionId': topic + '-body', 'reason': 'spam', 'operationId': uuid4().hex}
        replay = submit(context, topic, fields)
        assert replay.status == 200 and 'no-store' in replay.headers.get('cache-control', '')
        assert set(replay.json()) == {'ok', 'operationId'}, replay.text()
        stale = submit(context, prefix + '-1', {**fields, 'postId': prefix + '-1-post', 'operationId': uuid4().hex})
        assert stale.status == 409, stale.text()
        record('duplicate-private-response-and-stale-revision-conflict')
        # Current permission is authoritative on the next request, even for an open form.
        sql("insert into authz_user_permission_overrides(user_id,permission_key,effect) values($1,'forum.complaint.create','deny')", [actor])
        assert submit(context, topic, fields).status == 403
        page.reload(wait_until='networkidle')
        assert page.locator('.complaint-open').count() == 0
        sql("delete from authz_user_permission_overrides where user_id=$1", [actor])
        record('next-request-deny-hides-controls-and-rejects-write')
        for i in range(1, 9):
            t = prefix + '-' + str(i)
            response = submit(context, t, {**fields, 'postId': t + '-post', 'revisionId': t + '-body', 'operationId': uuid4().hex})
            assert response.status == 200, response.text()
        t = prefix + '-9'
        page.goto(base + '/en/topics/' + t, wait_until='networkidle')
        page.locator('.complaint-open').last.click()
        form = page.locator('.complaint-form')
        form.locator('textarea').fill('Keep this explanation')
        operation = form.locator('[name=operationId]').input_value()
        with page.expect_response(lambda r: '/complaints' in r.url and r.request.method == 'POST') as pending:
            form.locator('button[type=submit]').click()
        assert pending.value.status == 429
        assert int(pending.value.headers['retry-after']) > 0
        form.locator('[role=alert]').wait_for()
        assert form.locator('textarea').input_value() == 'Keep this explanation'
        assert form.locator('[name=operationId]').input_value() == operation
        assert sql('select count(*)::int as n from forum_complaints where reporter_user_id=$1', [actor])[0]['n'] == 10
        assert submit(context, topic, fields).status == 200
        record('real-budget-ten-then-429-input-retained-duplicate-free')
        context.close()
        browser.close()
    assert not errors, errors
    assert not external, external
finally:
    # Evidence is immutable by design; the entire disposable database is the cleanup unit.
    (args.output / 'results.json').write_text(json.dumps({'cases': records, 'pageErrors': errors, 'external': external}, ensure_ascii=False, indent=2))
