"""Opt-in actual protected complaints Queue/triage check. See README.md."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
from urllib.parse import urlencode, urlparse
from uuid import uuid4

from playwright.sync_api import sync_playwright, expect

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



def document(page, path, status=200):
    response = page.goto(base + path, wait_until='networkidle')
    assert response.status == status, (path, response.status)
    assert 'no-store' in response.headers.get('cache-control', ''), response.headers
    return response


def command(context, case, values, activity=False):
    path = '/en/attention/complaints/' + case + ('/activity' if activity else '')
    return context.request.post(base + path, headers={'Origin': base, 'Content-Type': 'application/x-www-form-urlencoded'}, data=urlencode(values))


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
        def reviewer(suffix):
            context = browser.new_context(viewport={'width': 1280, 'height': 900})
            context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(base + '/') else (external.append(route.request.url), route.abort())[-1])
            response = context.request.post(base + '/api/auth/sign-up/email', headers={'Origin': base}, data={
                'name': 'Queue reviewer ' + suffix, 'email': prefix + suffix + '@test.invalid', 'password': 'local-only-' + uuid4().hex,
            })
            assert response.status == 200, response.text()
            actor = response.json()['user']['id']
            sql("insert into authz_user_permission_overrides(user_id,permission_key,effect) values($1,'forum.complaint.review','allow')", [actor])
            page = context.new_page()
            page.set_default_timeout(15000)
            page.on('pageerror', lambda error: errors.append(str(error)))
            return context, page, actor
        a, page, actor = reviewer('-a')
        b, other, other_actor = reviewer('-b')
        # Native trusted fixtures use real default submission budgets: three reporters, ten reports each.
        seed = """import pg from 'pg';import {randomUUID} from 'node:crypto';import {drizzle} from 'drizzle-orm/node-postgres';
import {DrizzleForumRepository} from './db/forum-repository.ts';import {DrizzleComplaintsRepository} from './db/complaints-repository.ts';
import {ComplaintsService} from './db/complaints-service.ts';import {createAuthorizationCapability} from './db/authorization-service.ts';import {PostgresAuthorizationRepository} from './db/authorization-repository.ts';
const [id,author]=process.argv.slice(1);const c=new pg.Client({connectionString:process.env.DATABASE_URL});const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});await c.connect();
try{const f=new DrizzleForumRepository(drizzle(c),{cooldownMs:0,now:()=>new Date()});const s=new ComplaintsService(new DrizzleComplaintsRepository(drizzle(c)),createAuthorizationCapability(new PostgresAuthorizationRepository(pool)));
for(let n=0;n<3;n++)await c.query('insert into "user"(id,name,email) values($1,$2,$3)',[id+'-reporter-'+n,'SECRET_REPORTER_'+n,id+'-reporter-'+n+'@test.invalid']);
await f.createCategory({id,name:'Queue fixture'});await f.createSection({id,categoryId:id,name:'Triage'});const cases=[];
for(let n=0;n<28;n++){const t=id+'-'+n;await f.createTopicWithInitialPost({id:t,sectionId:id,authorId:author,titleRevision:{id:t+'-title',originalContent:'Queue topic '+n+' עברית',sourceLocale:'en'},initialPost:{id:t+'-post',topicId:t,authorId:author,bodyRevision:{id:t+'-body',originalContent:'Reported text '+n,sourceLocale:'en'}}});
const saved=await s.submit(id+'-reporter-'+n%3,{target:{kind:'post',topicId:t,postId:t+'-post',revisionId:t+'-body'},reason:n===1?'threats':n===2?'harassment':'spam',explanation:'SECRET_EXPLANATION',operationId:randomUUID()});cases.push(saved.caseId);}
const first=id+'-0';const title=await s.submit(id+'-reporter-1',{target:{kind:'topic-title',topicId:first,revisionId:first+'-title'},reason:'personal-data',explanation:null,operationId:randomUUID()});
await s.submit(id+'-reporter-2',{target:{kind:'post',topicId:first,postId:first+'-post',revisionId:first+'-body'},reason:'threats',explanation:null,operationId:randomUUID()});
await s.decide(author,{caseId:cases[27],expectedVersion:1,outcome:'not-confirmed',reasoning:'Fixture resolved Case',operationId:randomUUID()});
console.log(JSON.stringify({cases,title:title.caseId,closed:cases[27]}));}finally{await c.end();await pool.end();}"""
        result = subprocess.run([node, '--import', 'tsx', '--input-type=module', '-e', seed, prefix, actor], cwd=repo, text=True, capture_output=True, check=True)
        fixture = json.loads(result.stdout)
        case = fixture['cases'][0]
        queue_path = '/en/attention?mode=complaints&group=group1'
        guest = browser.new_context()
        guest_page = guest.new_page()
        assert guest_page.goto(base + queue_path).status == 401
        guest.close()
        document(page, '/en/attention')
        assert page.locator('.complaint-case').count() == 25
        assert page.locator('.complaint-queue-total').inner_text() == 'Open cases: 28'
        assert page.get_by_role('link', name='Complaints', exact=True).count() == 1
        assert page.get_by_role('link', name='Signals', exact=True).count() == 0
        assert page.get_by_role('link', name='Security', exact=True).count() == 0
        assert 'SECRET_REPORTER' not in page.content() and 'SECRET_EXPLANATION' not in page.content()
        assert page.locator('.complaint-case').first.get_attribute('data-case-id') == case
        assert page.locator('[data-case-id="' + case + '"] .complaint-triage-metadata dd').first.inner_text() == '2'
        assert page.locator('[data-case-id="' + fixture['closed'] + '"]').count() == 0
        page.get_by_role('link', name='Next', exact=True).click()
        page.wait_for_url('**page=1')
        expect(page.locator('.complaint-case')).to_have_count(3)
        assert page.locator('.complaint-queue-total').inner_text() == 'Open cases: 28'
        assert page.get_by_role('link', name='Next', exact=True).count() == 0
        record('protected-global-count-pagination-priority-privacy', total=28, secondPage=3)
        for mode in ['signals', 'security']:
            document(page, '/en/attention?mode=' + mode, 403)
        document(page, '/en/attention/complaints/' + fixture['closed'], 404)
        record('signals-security-closed-case-isolation')
        document(page, queue_path)
        page.locator('[data-case-id="' + case + '"] .complaint-open-case').click()
        page.wait_for_url('**/attention/complaints/' + case)
        page.locator('.complaint-priority-form').wait_for()
        document(other, '/en/attention/complaints/' + case)
        document(page, '/en/attention/complaints/' + case)
        assert page.locator('.complaint-activity').inner_text().startswith('Other reviewers')
        assert other.locator('.complaint-activity').inner_text().startswith('Other reviewers')
        assert sql('select count(*)::int n from forum_complaint_activity where case_id=$1 and expires_at>statement_timestamp()', [case])[0]['n'] == 2
        assert sql('select version from forum_complaint_cases where id=$1', [case])[0]['version'] == 2
        record('two-nonexclusive-reviewers-no-case-version-change')
        page.locator('.complaint-priority-form select').select_option('1')
        with page.expect_response(lambda r: '/attention/complaints/' in r.url and '/activity' not in r.url and r.request.method == 'POST') as pending:
            page.locator('.complaint-priority-form button').click()
        assert pending.value.status == 200 and 'no-store' in pending.value.headers.get('cache-control', '')
        page.get_by_text('Moderator override', exact=True).wait_for()
        version = sql('select version from forum_complaint_cases where id=$1', [case])[0]['version']
        response = command(b, case, {'priority': '2', 'expectedVersion': str(version), 'operationId': uuid4().hex})
        assert response.status == 200
        assert command(a, case, {'priority': '3', 'expectedVersion': str(version), 'operationId': uuid4().hex}).status == 409
        document(page, '/en/attention/complaints/' + case)
        page.locator('.complaint-priority-form select').select_option('auto')
        page.locator('.complaint-priority-form button').click()
        page.get_by_text('Priority saved.', exact=True).wait_for()
        assert sql('select priority_override from forum_complaint_cases where id=$1', [case])[0]['priority_override'] is None
        record('actual-priority-form-override-stale-conflict-clear')
        sql("update authz_user_permission_overrides set effect='deny' where user_id=$1 and permission_key='forum.complaint.review'", [other_actor])
        assert command(b, case, {'active': 'true', 'actorId': actor}, activity=True).status == 403
        document(other, queue_path, 403)
        document(other, '/en/attention/complaints/' + case, 403)
        assert command(b, case, {'priority': '3', 'expectedVersion': '4', 'operationId': uuid4().hex}).status == 403
        # Expire the abandoned lease in the disposable fixture instead of waiting 90 seconds.
        sql('update forum_complaint_activity set expires_at=statement_timestamp()-interval \'1 second\' where case_id=$1 and reviewer_user_id=$2', [case, other_actor])
        document(page, '/en/attention/complaints/' + case)
        assert page.locator('.complaint-activity').inner_text() == 'No other reviewers active'
        record('next-request-revocation-and-expired-presence')
        for locale, direction in [('en', 'ltr'), ('ru', 'ltr'), ('he', 'rtl')]:
            for width in [320, 390, 768, 1280]:
                page.set_viewport_size({'width': width, 'height': 900})
                document(page, '/' + locale + '/attention?mode=complaints')
                assert page.locator('html').get_attribute('dir') == direction
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                assert page.locator('.complaint-excerpt').first.get_attribute('dir') == 'ltr'
                page.locator('.complaint-open-case').first.focus()
                page.keyboard.press('Enter')
                page.locator('.complaint-priority-form select').wait_for()
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                page.locator('.complaint-priority-form select').focus()
                page.keyboard.press('Tab')
                assert page.locator('.complaint-priority-form button').evaluate('e=>e===document.activeElement')
                if width == 320:
                    page.screenshot(path=str(args.output / (locale + '-320.png')), full_page=True)
                record('queue-triage-layout-' + locale + '-' + str(width), direction=direction)
        # Actual protected queue read timeout, then recovery; no response mocking.
        document(page, queue_path)
        lock_code = """import pg from './node_modules/pg/lib/index.js';const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();await c.query('begin;lock table forum_complaint_cases in access exclusive mode');console.log('LOCKED');process.stdin.once('data',async()=>{await c.query('rollback');await c.end();});"""
        locker = subprocess.Popen([node, '--input-type=module', '-e', lock_code], cwd=repo, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
        try:
            assert locker.stdout.readline().strip() == 'LOCKED'
            document(page, queue_path, 503)
            record('actual-storage-timeout-fails-closed')
        finally:
            locker.communicate('release\n', timeout=15)
        document(page, queue_path)
        assert page.locator('.complaint-queue-total').inner_text() == 'Open cases: 28'
        assert sql('select count(*)::int n from admin_history')[0]['n'] == 0
        for table in ['forum_help_signals', 'forum_attachment_security_events']:
            assert sql('select count(*)::int n from ' + table)[0]['n'] == 0
        record('recovery-no-signals-security-or-admin-history-effects')
        # Separate global settings permission; reviewer alone cannot read/write mapping.
        settings_path = '/en/attention/complaints/settings'
        document(page, settings_path, 403)
        assert a.request.post(base + settings_path, headers={'Origin': base}, form={'expectedVersion': '1'}).status == 403
        sql("insert into authz_user_permission_overrides(user_id,permission_key,effect) values($1,'forum.complaint.priority.manage','allow')", [other_actor])
        document(other, '/en/attention')
        assert other.url.endswith('/attention/complaints/settings')
        assert other.locator('.complaint-priority-form select').count() == 8
        assert other.get_by_role('link', name='Queue', exact=True).count() == 0
        document(other, '/en/attention/complaints/' + case, 403)
        document(other, settings_path)
        initial = sql('select version,weights from forum_complaint_priority_settings where id=1')[0]
        assert b.request.post(base + settings_path, headers={'Origin': base}, form={'expectedVersion': '9999999999', **{k: str(v) for k, v in initial['weights'].items()}}).status == 400
        history = sql('select count(*)::int n from forum_complaint_events')[0]['n']
        command(a, case, {'priority': '2', 'expectedVersion': str(sql('select version from forum_complaint_cases where id=$1', [case])[0]['version']), 'operationId': uuid4().hex})
        history += 1
        weights = {reason: 1 for reason in initial['weights']}
        weights['spam'] = 3
        for reason, priority in weights.items():
            other.locator('select[name="' + reason + '"]').select_option(str(priority))
        with other.expect_response(lambda r: 'complaints/settings' in r.url and r.request.method == 'POST') as pending:
            other.locator('.complaint-priority-form button').click()
        assert pending.value.status == 200
        other.get_by_text('Reason priorities saved.', exact=True).wait_for()
        assert sql('select version,weights from forum_complaint_priority_settings where id=1')[0] == {'version': initial['version'] + 1, 'weights': weights}
        assert sql('select count(*)::int n from forum_complaint_events')[0]['n'] == history
        document(page, '/en/attention/complaints/' + fixture['cases'][1])
        assert page.locator('.attention-case-heading').inner_text().endswith('Low priority')
        document(page, '/en/attention/complaints/' + case)
        assert page.locator('.attention-case-heading').inner_text().endswith('Normal priority')
        page.locator('.complaint-priority-form select').select_option('auto')
        page.locator('.complaint-priority-form button').click()
        page.get_by_text('Priority saved.', exact=True).wait_for()
        expect(page.locator('.attention-case-heading')).to_contain_text('High priority')
        stale = b.request.post(base + settings_path, headers={'Origin': base}, form={'expectedVersion': str(initial['version']), **{k: str(v) for k, v in weights.items()}})
        assert stale.status == 409
        record('global-mapping-persistence-recalculation-override-stale-history-isolation')
        for locale, direction in [('en', 'ltr'), ('ru', 'ltr'), ('he', 'rtl')]:
            for width in [320, 390, 768, 1280]:
                other.set_viewport_size({'width': width, 'height': 900})
                document(other, '/' + locale + '/attention/complaints/settings')
                assert other.locator('html').get_attribute('dir') == direction
                assert other.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                assert other.locator('.complaint-priority-form select').count() == 8
                other.locator('.complaint-priority-form select').last.focus()
                other.keyboard.press('Tab')
                assert other.locator('.complaint-priority-form button').evaluate('e=>e===document.activeElement')
                if width == 320:
                    other.screenshot(path=str(args.output / ('settings-' + locale + '-320.png')), full_page=True)
                record('settings-layout-' + locale + '-' + str(width), direction=direction)
        sql("update authz_user_permission_overrides set effect='deny' where user_id=$1 and permission_key='forum.complaint.priority.manage'", [other_actor])
        document(other, settings_path, 403)
        assert b.request.post(base + settings_path, headers={'Origin': base}, form={'expectedVersion': '2', **{k: str(v) for k, v in weights.items()}}).status == 403
        assert sql('select count(*)::int n from admin_history')[0]['n'] == 0
        record('settings-next-request-revocation-and-separate-review-permission')
        a.close()
        b.close()
        browser.close()
    assert not errors, errors
    assert not external, external
finally:
    # Immutable complaint evidence: destroy the whole disposable database after the run.
    (args.output / 'results.json').write_text(json.dumps({'cases': records, 'pageErrors': errors, 'external': external}, ensure_ascii=False, indent=2))
