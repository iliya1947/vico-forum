"""Opt-in AP-05 Worker/auth/PostgreSQL Quick actions checks; see README."""
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
prefix = 'ap05-' + uuid4().hex
accounts = []


def sql(query, params=None):
    code = """import pg from './node_modules/pg/lib/index.js';const input=JSON.parse(await new Promise(r=>{let s='';process.stdin.on('data',b=>s+=b);process.stdin.on('end',()=>r(s));}));const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();try{console.log(JSON.stringify((await c.query(input.query,input.params)).rows??[]));}finally{await c.end();}"""
    result = subprocess.run([node, '--input-type=module', '-e', code], cwd=repo, input=json.dumps({'query': query, 'params': params or []}), text=True, capture_output=True, check=True)
    return json.loads(result.stdout)


def record(name):
    records.append(name)
    print(name, flush=True)


def seed_topic(key, actor):
    tid = prefix + '-' + key
    sql('''with topic as (insert into forum_topics(id,section_id,author_id,current_title_revision_id)
      values($1,'help-solutions-questions',$2,$1||'-title') returning id)
      insert into forum_topic_title_revisions(id,topic_id,author_id,original_content,source_locale)
      select id||'-title',id,$2,'Question '||id,'en' from topic''', [tid, actor])
    for n in range(3):
        sql('''with post as (insert into forum_posts(id,topic_id,author_id,current_revision_id,created_at)
          values($1,$2,$3,$1||'-body',now()+$4::int*interval '1 second') returning id)
          insert into forum_post_revisions(id,post_id,author_id,original_content,source_locale)
          select id||'-body',id,$3,'Answer '||id,'en' from post''', [tid + '-p' + str(n), tid, actor, n])
    return tid


def history(tid):
    return sql('select action,actor_id,context,reason from admin_history where target_id=$1 order by position', [tid])


def goto(page, tid, locale='en'):
    r = page.goto(base + '/' + locale + '/topics/' + tid, wait_until='networkidle')
    assert r.status == 200, r.status
    return page.locator('.topic-admin-tools')


def submit(page, tid, intent, fields=None):
    details = goto(page, tid)
    details.locator('summary').click()
    form = details.locator('form:has(input[name="intent"][value="' + intent + '"])')
    if intent == 'selectBestAnswer':
        form = form.filter(has=page.locator('input[name="postId"][value="' + fields.pop('postId') + '"]'))
    assert form.count() == 1, (intent, form.count())
    assert form.get_attribute('action') == '/en/topics/' + tid
    for key, value in (fields or {}).items():
        form.locator('[name="' + key + '"]').fill(value)
    with page.expect_response(lambda r: r.request.method == 'POST' and '/topics/' in r.url) as response:
        form.locator('button[type="submit"]').click()
    assert response.value.status in [200, 202, 302], (intent, response.value.status)
    page.wait_for_load_state('networkidle')
    record('real-quick-form-' + intent)


def post(context, tid, fields, status=200, origin=None):
    response = context.request.post(base + '/en/topics/' + tid, headers={'Origin': origin or base}, form=fields)
    assert response.status == status, (fields, response.status, response.text()[:200])


topics = []
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
        manager, author = [browser.new_context(viewport={'width': 1280, 'height': 900}) for _ in range(2)]
        for c, name in [(manager, 'Manager'), (author, 'Author')]:
            c.route('**/*', lambda route: route.continue_() if route.request.url.startswith(base + '/') else (external.append(route.request.url), route.abort())[-1])
            response = c.request.post(base + '/api/auth/sign-up/email', headers={'Origin': base}, data={'name': name, 'email': prefix + name + '@test.invalid', 'password': prefix + '-local-only'})
            assert response.status == 200, response.text()[:150]
            accounts.append(response.json()['user']['id'])
        actor, owner = accounts
        sql("insert into authz_user_roles(user_id,role_id) values($1,'builtin-admin')", [actor])
        main, duplicate, original, dispute = [seed_topic(key, owner) for key in ['main', 'duplicate', 'original', 'dispute']]
        topics = [main, duplicate, original, dispute]
        page = manager.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        ownpage = author.new_page()
        ownpage.on('pageerror', lambda e: errors.append(str(e)))
        assert goto(ownpage, main).count() == 0
        # Own topic actions remain available, but cannot use administrative pin.
        assert ownpage.locator('.topic-tools').count() or ownpage.get_by_text('Topic tools', exact=True).count()
        post(author, main, {'intent': 'pinTopic'}, 403)
        assert not history(main)
        record('own-controls-present-admin-pin-denied-no-history')
        submit(page, main, 'pinTopic')
        post(manager, main, {'intent': 'pinTopic'})
        assert len(history(main)) == 1
        submit(page, main, 'unpinTopic')
        post(manager, main, {'intent': 'unpinTopic'})
        assert len(history(main)) == 2 and history(main)[1]['actor_id'] == actor
        submit(page, main, 'selectBestAnswer', {'postId': main + '-p2'})
        post(manager, main, {'intent': 'selectBestAnswer', 'postId': main + '-p2'})
        assert len(history(main)) == 3
        # Permanent numbering survives visual promotion.
        details = goto(page, main)
        details.locator('summary').click()
        candidate = details.locator('form:has(input[name="postId"][value="' + main + '-p1"])')
        assert '#2' in candidate.inner_text(), candidate.inner_text()
        submit(page, main, 'markSolved')
        submit(page, main, 'markSolutionNeedsReview')
        submit(page, main, 'markSolutionOutdated', {'outdatedReason': 'Version no longer supported עברית'})
        assert history(main)[-1]['reason'] == 'Version no longer supported עברית'
        post(manager, main, {'intent': 'markSolutionOutdated', 'expectedBestAnswerPostId': main + '-p2', 'outdatedReason': 'Version no longer supported עברית'})
        assert len(history(main)) == 6
        post(manager, main, {'intent': 'markSolutionNeedsReview', 'expectedBestAnswerPostId': main + '-p1'}, 409)
        assert len(history(main)) == 6
        submit(page, main, 'clearSolutionModeration')
        submit(page, main, 'correctTitleSourceLocale', {'sourceLocale': 'he'})
        post(manager, main, {'intent': 'correctTitleSourceLocale', 'expectedRevisionId': main + '-title', 'sourceLocale': 'ru'}, 409)
        assert len(history(main)) == 8
        record('stable-post-number-stale-answer-and-revision-no-events')
        submit(page, duplicate, 'confirmHelpDuplicate', {'originalTopicId': original})
        relation = sql('select id from forum_help_duplicate_relationships where duplicate_topic_id=$1 and removed_at is null', [duplicate])[0]['id']
        post(manager, duplicate, {'intent': 'removeHelpDuplicate', 'expectedRelationshipId': 'stale'}, 409)
        submit(page, duplicate, 'removeHelpDuplicate')
        assert len(history(duplicate)) == 2
        submit(page, dispute, 'confirmHelpDuplicate', {'originalTopicId': original})
        relation = sql('select id from forum_help_duplicate_relationships where duplicate_topic_id=$1 and removed_at is null', [dispute])[0]['id']
        post(author, dispute, {'intent': 'appealHelpDuplicate', 'expectedRelationshipId': relation, 'explanation': 'PRIVATE appeal'})
        submit(page, dispute, 'rejectHelpDuplicateAppeal')
        # A new appeal on a new relationship exercises accepted dispute removal.
        submit(page, dispute, 'removeHelpDuplicate')
        submit(page, dispute, 'confirmHelpDuplicate', {'originalTopicId': original})
        relation = sql('select id from forum_help_duplicate_relationships where duplicate_topic_id=$1 and removed_at is null', [dispute])[0]['id']
        post(author, dispute, {'intent': 'appealHelpDuplicate', 'expectedRelationshipId': relation, 'explanation': 'PRIVATE second appeal'})
        before = len(history(dispute))
        submit(page, dispute, 'acceptHelpDuplicateAppeal')
        assert len(history(dispute)) == before + 1
        assert history(dispute)[-1]['action'] == 'help.duplicateAppealResolved'
        assert 'PRIVATE' not in json.dumps(history(dispute))
        record('exact-relationship-and-single-appeal-event-no-private-explanation')
        # Next-request permission revocation affects visibility and direct POST independently.
        sql("insert into authz_user_permission_overrides(user_id,permission_key,effect) values($1,'forum.topic.pin','deny')", [actor])
        details = goto(page, main)
        assert details.locator('input[value="pinTopic"]').count() == 0
        before = len(history(main))
        post(manager, main, {'intent': 'pinTopic', 'actorId': owner}, 403)
        assert len(history(main)) == before
        record('permission-revocation-forged-actor-denied')
        # Keyboard, EN/RU/HE and narrow/wide layout on the actual changed surface and History.
        for locale, label in [('en', 'Quick actions'), ('ru', 'Быстрые действия'), ('he', 'פעולות מהירות')]:
            for width in [320, 768, 1280]:
                page.set_viewport_size({'width': width, 'height': 900})
                details = goto(page, main, locale)
                summary = details.locator('summary')
                assert summary.inner_text() == label
                summary.focus()
                page.keyboard.press('Enter')
                assert details.get_attribute('open') is not None
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                assert page.locator('html').get_attribute('dir') == ('rtl' if locale == 'he' else 'ltr')
                page.screenshot(path=str(a.output / (locale + '-' + str(width) + '-quick.png')))
                response = page.goto(base + '/' + locale + '/admin/history', wait_until='networkidle')
                assert response.status == 200 and 'no-store' in response.headers.get('cache-control', '')
                assert page.locator('.admin-history-events li').count() > 10
                assert 'PRIVATE' not in page.locator('.admin-history-events').inner_text()
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                page.screenshot(path=str(a.output / (locale + '-' + str(width) + '-history.png')))
                page.locator('.admin-history-events li').first.screenshot(path=str(a.output / (locale + '-' + str(width) + '-event.png')))
                record(locale + '-' + str(width) + '-keyboard-quick-and-history')
        browser.close()
    assert not errors, errors
    assert not external, external
finally:
    if topics:
        sql('delete from forum_help_signals where topic_id=any($1::text[])', [topics])
        sql('delete from forum_help_duplicate_relationships where duplicate_topic_id=any($1::text[])', [topics])
        sql('delete from forum_topics where id=any($1::text[])', [topics])
    if accounts:
        sql('delete from admin_history where actor_id=any($1::text[])', [accounts])
        sql('delete from "user" where id=any($1::text[])', [accounts])
    (a.output / 'results.json').write_text(json.dumps({'cases': records, 'pageErrors': errors, 'external': external}, ensure_ascii=False, indent=2))
