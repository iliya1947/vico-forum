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


def actual_click(page, form):
    fields = form.evaluate("f=>Object.fromEntries(new FormData(f))")
    with page.expect_response(lambda r: r.request.method == 'POST' and '/topics/' in r.url) as pending:
        form.locator('button[type="submit"]').click()
    assert pending.value.status in [200, 202, 302], pending.value.status
    page.wait_for_load_state('networkidle')
    return fields


def choose_and_confirm(page, tid):
    goto(page, tid)
    choice = page.locator('form:has(input[name="intent"][value="selectBestAnswer"]):has(input[name="postId"][value="' + tid + '-p1"])')
    assert choice.count() == 1
    disclosure = choice.locator('xpath=ancestor::details[1]')
    if disclosure.get_attribute('open') is None:
        disclosure.locator('summary').click()
    actual_click(page, choice)
    page.wait_for_url('**/*solutionPrompt=*')
    assert 'solutionPrompt=' in page.url, page.url
    opened = page.locator('.topic-admin-tools[open]')
    if opened.count():
        opened.locator('summary').click()
    prompt = page.locator('#solution-confirmation')
    assert prompt.is_visible()
    before = history(tid)
    fields = actual_click(page, prompt.locator('form'))
    state = sql('select is_solved from forum_topics where id=$1', [tid])[0]
    assert state['is_solved']
    return fields, before, history(tid)

def record_correction(name, **_data):
    record("correction-" + name)


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
        # A: the ordinary owner confirmation after actual answer-selection redirect.
        only_topic = seed_topic('solved-author-only', owner)
        topics.append(only_topic)
        fields, before, after = choose_and_confirm(ownpage, only_topic)
        assert not before and not after
        record_correction('A-author-only-owner-confirmation', fields=fields, history=after)
        dual_topic = seed_topic('solved-both', actor)
        topics.append(dual_topic)
        fields, before, after = choose_and_confirm(page, dual_topic)
        assert [e['action'] for e in before] == ['topic.bestAnswerChanged']
        assert after == before
        assert fields['operationScope'] == 'own'
        record_correction('A-manager-owner-confirmation', fields=fields, before=before, after=after)

        # Source locale: current manager-capability page exposes admin Quick action only.
        fresh = seed_topic('source-manager-fresh', actor)
        topics.append(fresh)
        details = goto(page, fresh)
        own_count = page.locator('.topic-question-tools form:has(input[name="intent"][value="correctTitleSourceLocale"])').count()
        assert own_count == 0
        assert details.locator('input[name="intent"][value="correctTitleSourceLocale"]').count() == 1
        submit(page, fresh, 'correctTitleSourceLocale', {'sourceLocale': 'he'})
        assert [e['action'] for e in history(fresh)] == ['topic.sourceLocaleCorrected']
        record_correction('source-fresh-manager-is-admin-control', ownForms=own_count, history=history(fresh))

        # Own-only source form is real and produces no administrative History.
        stable = seed_topic('source-author-only', owner)
        topics.append(stable)
        goto(ownpage, stable)
        ownpage.locator('.topic-question-tools summary').click()
        form = ownpage.locator('.topic-question-tools form:has(input[name="intent"][value="correctTitleSourceLocale"])')
        form.locator('[name="sourceLocale"]').fill('he')
        fields = actual_click(ownpage, form)
        assert not history(stable)
        record_correction('source-author-only-control', fields=fields, history=history(stable))

        # A second author form remains open while the actor gains correctAny.
        stale_form = seed_topic('source-author-grant-any', owner)
        topics.append(stale_form)
        goto(ownpage, stale_form)
        ownpage.locator('.topic-question-tools summary').click()
        form = ownpage.locator('.topic-question-tools form:has(input[name="intent"][value="correctTitleSourceLocale"])')
        form.locator('[name="sourceLocale"]').fill('ru')
        assert form.count() == 1
        sql("insert into authz_user_permission_overrides(user_id,permission_key,effect) values($1,'forum.sourceLocale.correctAny','allow')", [owner])
        fields = actual_click(ownpage, form)
        assert not history(stale_form)
        assert fields['operationScope'] == 'own'
        record_correction('source-original-author-form-after-grant-any', fields=fields, history=history(stale_form))

        # B: authoritative removal auto-accepts the actual pending appeal and retains its ID/outcome once.
        original = seed_topic('correction-original', actor)
        topics.append(original)
        duplicate = seed_topic('duplicate-pending', owner)
        topics.append(duplicate)
        submit(page, duplicate, 'confirmHelpDuplicate', {'originalTopicId': original})
        relationship = sql('select id from forum_help_duplicate_relationships where duplicate_topic_id=$1 and removed_at is null', [duplicate])[0]['id']
        post(author, duplicate, {'intent': 'appealHelpDuplicate', 'expectedRelationshipId': relationship, 'explanation': 'PRIVATE diagnostic appeal'})
        pending = sql('select id,status from forum_help_duplicate_appeals where relationship_id=$1', [relationship])[0]
        before = history(duplicate)
        post(manager, duplicate, {'intent': 'removeHelpDuplicate', 'expectedRelationshipId': 'stale'}, 409)
        assert history(duplicate) == before
        submit(page, duplicate, 'removeHelpDuplicate')
        accepted = sql('select id,status,resolved_by_user_id,resolved_at from forum_help_duplicate_appeals where id=$1', [pending['id']])[0]
        removed = sql('select id,removed_by_user_id,removed_at from forum_help_duplicate_relationships where id=$1', [relationship])[0]
        after = history(duplicate)
        assert pending['status'] == 'pending' and accepted['status'] == 'accepted'
        assert accepted['resolved_by_user_id'] == actor and removed['removed_by_user_id'] == actor
        assert accepted['resolved_at'] and removed['removed_at']
        assert len(after) == len(before) + 1 and after[-1]['action'] == 'help.duplicateRemoved'
        assert after[-1]['context'] == {'relationshipId': relationship, 'originalTopicId': original, 'resolvedAppeal': {'id': pending['id'], 'outcome': 'accepted'}}
        assert pending['id'] in json.dumps(after[-1])
        assert 'PRIVATE diagnostic appeal' not in json.dumps(after[-1])
        post(manager, duplicate, {'intent': 'removeHelpDuplicate', 'expectedRelationshipId': relationship}, 409)
        assert history(duplicate) == after
        record_correction('B-remove-retains-accepted-appeal-identity', pending=pending, accepted=accepted, removed=removed, event=after[-1], newEvents=len(after)-len(before), staleAndRetryNoEvent=True)
        nopending = seed_topic('duplicate-no-appeal', owner)
        topics.append(nopending)
        submit(page, nopending, 'confirmHelpDuplicate', {'originalTopicId': original})
        submit(page, nopending, 'removeHelpDuplicate')
        assert set(history(nopending)[-1]['context']) == {'relationshipId', 'originalTopicId'}
        record_correction('B-no-appeal-preserves-context', event=history(nopending)[-1])

        page.goto(base + '/en/admin/history', wait_until='networkidle')
        appeal_event = page.locator('.admin-history-events li').filter(has_text=pending['id'])
        assert appeal_event.count() == 1
        assert 'Duplicate dispute resolved' in appeal_event.inner_text()
        assert 'Accepted' in appeal_event.inner_text()
        record('correction-accepted-appeal-history-presentation')

        # C: independently assigned Any does not authorize explicit own semantics.
        any_context = browser.new_context(viewport={'width':1280,'height':900})
        revoke_context = browser.new_context(viewport={'width':1280,'height':900})
        for context, name in [(any_context,'AnyOnly'),(revoke_context,'OwnRevoked')]:
            context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(base + '/') else (external.append(route.request.url), route.abort())[-1])
            response = context.request.post(base+'/api/auth/sign-up/email',headers={'Origin':base},data={'name':name,'email':prefix+name+'@test.invalid','password':prefix+'-local-only'})
            assert response.status == 200
            accounts.append(response.json()['user']['id'])
        any_actor, revoke_actor = accounts[-2:]
        any_role = prefix+'-c-any'
        sql('insert into authz_roles(id,slug,display_name) values($1,$1,$1)',[any_role])
        for permission in ['forum.solution.manageAny','forum.sourceLocale.correctAny']:
            sql('insert into authz_role_permissions(role_id,permission_key) values($1,$2)',[any_role,permission])
        sql('insert into authz_user_roles(user_id,role_id) values($1,$2)',[any_actor,any_role])
        for intent in ['markSolved','selectBestAnswer','correctTitleSourceLocale','correctPostSourceLocale']:
            tid = seed_topic('c-'+intent.lower(),any_actor)
            topics.append(tid)
            fields = {'intent':intent,'operationScope':'own'}
            if intent == 'selectBestAnswer':
                fields['postId'] = tid+'-p1'
            elif intent == 'correctTitleSourceLocale':
                fields.update(expectedRevisionId=tid+'-title',sourceLocale='he')
            elif intent == 'correctPostSourceLocale':
                fields.update(postId=tid+'-p0',expectedRevisionId=tid+'-p0-body',sourceLocale='he')
            before = sql('select is_solved,best_answer_post_id,current_title_revision_id from forum_topics where id=$1',[tid])
            target = tid+'-p0' if intent == 'correctPostSourceLocale' else tid
            post(any_context,tid,fields,403)
            assert sql('select is_solved,best_answer_post_id,current_title_revision_id from forum_topics where id=$1',[tid]) == before
            if intent == 'correctPostSourceLocale':
                assert sql('select current_revision_id from forum_posts where id=$1',[target])[0]['current_revision_id'] == tid+'-p0-body'
            assert not history(target)
            fields['operationScope'] = 'any'
            post(any_context,tid,fields)
            assert len(history(target)) == 1
            record('correction-C-any-only-own-denied-admin-recorded-'+intent)
        any_page = any_context.new_page()
        any_page.on('pageerror', lambda e: errors.append(str(e)))
        any_topic = seed_topic('c-any-author-ui',any_actor)
        topics.append(any_topic)
        submit(any_page,any_topic,'selectBestAnswer',{'postId':any_topic+'-p1'})
        any_page.wait_for_url(base+'/en/topics/'+any_topic+'#post-'+any_topic+'-p1')
        assert 'solutionPrompt' not in any_page.url
        any_page.goto(base+'/en/topics/'+any_topic+'?solutionPrompt='+any_topic+'-p1',wait_until='networkidle')
        assert any_page.locator('#solution-confirmation').count() == 0
        assert any_page.locator('input[name="operationScope"][value="own"]').count() == 0
        submit(any_page,any_topic,'markSolved')
        assert [e['action'] for e in history(any_topic)] == ['topic.bestAnswerChanged','topic.solved']
        record('correction-C-any-only-author-ui-and-redirect-no-own-control')
        revoke_page = revoke_context.new_page()
        revoke_page.on('pageerror', lambda e: errors.append(str(e)))
        revoke_topic = seed_topic('c-source-revoked',revoke_actor)
        topics.append(revoke_topic)
        goto(revoke_page,revoke_topic)
        revoke_page.locator('.topic-question-tools summary').click()
        form = revoke_page.locator('.topic-question-tools form:has(input[name="intent"][value="correctTitleSourceLocale"])')
        form.locator('[name="sourceLocale"]').fill('ru')
        for permission,effect in [('forum.sourceLocale.correctAny','allow'),('forum.sourceLocale.correctOwn','deny')]:
            sql('insert into authz_user_permission_overrides(user_id,permission_key,effect) values($1,$2,$3)',[revoke_actor,permission,effect])
        with revoke_page.expect_response(lambda r:r.request.method=='POST' and '/topics/' in r.url) as response:
            form.locator('button[type="submit"]').click()
        assert response.value.status == 403
        assert sql('select current_title_revision_id from forum_topics where id=$1',[revoke_topic])[0]['current_title_revision_id'] == revoke_topic+'-title'
        assert not history(revoke_topic)
        record('correction-C-opened-own-source-revoked-denied')
        solution_topic = seed_topic('c-solution-revoked',revoke_actor)
        topics.append(solution_topic)
        goto(revoke_page,solution_topic)
        own_choice = revoke_page.locator('form:has(input[name="intent"][value="selectBestAnswer"]):has(input[name="postId"][value="'+solution_topic+'-p1"])')
        own_choice.locator('xpath=ancestor::details[1]').locator('summary').click()
        actual_click(revoke_page,own_choice)
        revoke_page.wait_for_url('**/*solutionPrompt=*')
        confirm = revoke_page.locator('#solution-confirmation form')
        assert confirm.is_visible()
        for permission,effect in [('forum.solution.manageAny','allow'),('forum.solution.manageOwn','deny')]:
            sql('insert into authz_user_permission_overrides(user_id,permission_key,effect) values($1,$2,$3)',[revoke_actor,permission,effect])
        with revoke_page.expect_response(lambda r:r.request.method=='POST' and '/topics/' in r.url) as response:
            confirm.locator('button[type="submit"]').click()
        assert response.value.status == 403
        assert not sql('select is_solved from forum_topics where id=$1',[solution_topic])[0]['is_solved']
        assert not history(solution_topic)
        submit(revoke_page,solution_topic,'markSolved')
        assert len(history(solution_topic)) == 1
        record('correction-C-opened-own-confirmation-revoked-denied-admin-still-works')
        any_context.close()
        revoke_context.close()

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
    sql('delete from authz_roles where slug like $1',[prefix+'-c-%'])
    (a.output / 'results.json').write_text(json.dumps({'cases': records, 'pageErrors': errors, 'external': external}, ensure_ascii=False, indent=2))
