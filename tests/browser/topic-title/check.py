"""Real title editing: Chromium -> Worker -> Better Auth -> PostgreSQL -> current UI."""
import argparse, json, os, select, shutil, subprocess
from pathlib import Path
from urllib.parse import urlparse, quote
from uuid import uuid4
from playwright.sync_api import sync_playwright, expect

p = argparse.ArgumentParser()
p.add_argument('--url', default='http://127.0.0.1:4242')
p.add_argument('--output', type=Path, required=True)
a = p.parse_args()
base = a.url.rstrip('/')
assert os.environ.get('CI') == 'true' and urlparse(base).hostname in ('localhost', '127.0.0.1')
db = urlparse(os.environ['DATABASE_URL'])
assert db.hostname in ('localhost', '127.0.0.1') and db.path == '/vico_title_browser_test'
repo = Path(__file__).resolve().parents[3]
a.output.mkdir(parents=True, exist_ok=True)
fixture = subprocess.Popen([shutil.which('node'), '--import', 'tsx', str(Path(__file__).with_name('pg.mjs'))],
    cwd=repo, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1)
assert fixture.stdout.readline().strip() == 'READY'
records, errors, external = [], [], []

def rpc(value):
    fixture.stdin.write(json.dumps(value) + '\n')
    fixture.stdin.flush()
    assert select.select([fixture.stdout], [], [], 30)[0], 'Fixture timed out'
    result = json.loads(fixture.stdout.readline())
    assert 'error' not in result, result
    return result['result']

def sql(statement, params=None):
    return rpc({'operation': 'sql', 'sql': statement, 'params': params or []})

def record(case):
    records.append(case)
    print('TITLE_CONNECTED ' + case, flush=True)

def private(response, status):
    assert response.status == status, (response.status, status, response.text()[:300])
    assert {'private', 'no-store'} <= {x.strip() for x in response.headers.get('cache-control', '').split(',')}

try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True,
            executable_path=os.environ.get('PLAYWRIGHT_EXECUTABLE') or None,
            channel=None if os.environ.get('PLAYWRIGHT_EXECUTABLE') else 'chrome', args=['--no-sandbox'])
        contexts = []
        def context():
            c = browser.new_context(viewport={'width': 1280, 'height': 900}, service_workers='block',
                extra_http_headers={'cf-connecting-ip': '192.0.2.' + str(80 + len(contexts))})
            contexts.append(c)
            c.route('**/*', lambda route: route.continue_() if route.request.url.startswith(base + '/')
                else (external.append(route.request.url), route.abort())[-1])
            return c
        def account(label):
            c = context()
            r = c.request.post(base + '/api/auth/sign-up/email', headers={'Origin': base}, data={
                'name': label, 'email': uuid4().hex + '@title.test.invalid', 'password': 'Title-test-password-123456'})
            assert r.status == 200, r.text()
            return c, r.json()['user']['id']
        author, actor = account('Title author')
        other, other_id = account('Other user')
        guest = context()
        topics = rpc({'operation': 'seed', 'author': actor, 'prefix': 'title-' + uuid4().hex})
        page = author.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        for index, item in enumerate(topics):
            path = '/en/topics/' + item['topicId']
            before = sql('select current_revision_id from forum_posts where id=$1', [item['postId']])[0]
            page.goto(base + path, wait_until='networkidle')
            for c, status in [(guest, 401), (other, 403)]:
                private(c.request.post(base + path, headers={'Origin': base}, form={
                    'intent': 'editTopicTitle', 'title': 'Forbidden title',
                    'expectedRevisionId': item['revisionId'], 'editorActorId': actor if c == guest else other_id}), status)
                forbidden_page = c.new_page()
                forbidden_page.goto(base + path, wait_until='networkidle')
                expect(forbidden_page.locator('.topic-title-editor')).to_have_count(0)
                forbidden_page.close()
            record('ordinary/Help guest401 and nonauthor403 with capability defaults')
            page.get_by_role('button', name='Edit topic title', exact=True).click()
            title_input = page.locator('.topic-title-editor input[name="title"]')
            expect(title_input).to_have_value('Original ' + item['topicId'])
            replacement = 'Current title ' + str(index) + ' שלום <script>window.__titleExecuted=1</script>'
            title_input.fill(replacement)
            with page.expect_response(lambda r: r.request.method == 'POST' and '/topics/' in r.url) as saved:
                page.locator('.topic-title-editor button[type="submit"]').click()
            private(saved.value, 200)
            expect(page.locator('.topic-title-editor input[name="title"]')).to_have_count(0)
            expect(page.locator('h1')).to_have_text(replacement)
            page.reload(wait_until='networkidle')
            expect(page.locator('h1')).to_have_text(replacement)
            assert page.evaluate('window.__titleExecuted') is None
            assert sql('select current_revision_id from forum_posts where id=$1', [item['postId']])[0] == before
            rows = sql('select original_content,source_locale from forum_topic_title_revisions where id=(select current_title_revision_id from forum_topics where id=$1)', [item['topicId']])
            assert rows == [{'original_content': replacement, 'source_locale': 'und'}], rows
            record('ordinary/Help author UI save, immutable revision, und, unchanged body and reload')
            if index == 0:
                page.goto(base + '/en/sections/' + item['sectionId'], wait_until='networkidle')
                expect(page.locator('a[href$="/topics/' + item['topicId'] + '"]').filter(has_text=replacement).first).to_be_visible()
            page.goto(base + '/en/search?q=' + quote('Current title ' + str(index)), wait_until='networkidle')
            expect(page.locator('a[href$="/topics/' + item['topicId'] + '"]').filter(has_text=replacement).first).to_be_visible()
            record('current title in section/search')

        item = topics[0]
        path = '/en/topics/' + item['topicId']
        first, stale = author.new_page(), author.new_page()
        for tab in [first, stale]:
            tab.goto(base + path, wait_until='networkidle')
            tab.get_by_role('button', name='Edit topic title', exact=True).click()
        first.locator('.topic-title-editor input[name="title"]').fill('First concurrent edit')
        first.locator('.topic-title-editor button[type="submit"]').click()
        expect(first.locator('h1')).to_have_text('First concurrent edit')
        stale.locator('.topic-title-editor input[name="title"]').fill('Preserved conflicting edit')
        with stale.expect_response(lambda r: r.request.method == 'POST' and '/topics/' in r.url) as conflicted:
            stale.locator('.topic-title-editor button[type="submit"]').click()
        private(conflicted.value, 409)
        expect(stale.locator('.topic-title-editor [role="alert"]')).to_be_visible()
        expect(stale.locator('.topic-title-editor input[name="title"]')).to_have_value('Preserved conflicting edit')
        expect(stale.locator('.topic-title-editor button[type="submit"]')).to_be_disabled()
        stale.get_by_role('button', name='Use current title version').click()
        stale.locator('.topic-title-editor button[type="submit"]').click()
        expect(stale.locator('h1')).to_have_text('Preserved conflicting edit')
        record('two real tabs stale409, preserved text and explicit rebase/save')

        stale.goto(base + '/he/topics/' + item['topicId'], wait_until='networkidle')
        stale.set_viewport_size({'width': 390, 'height': 844})
        expect(stale.locator('html')).to_have_attribute('dir', 'rtl')
        stale.locator('.topic-title-editor > button').click()
        expect(stale.locator('.topic-title-editor input[name="title"]')).to_have_attribute('dir', 'auto')
        stale.locator('.topic-title-editor input[name="title"]').fill('כותרת חדשה לשמירה')
        stale.locator('.topic-title-editor button[type="submit"]').click()
        expect(stale.locator('h1')).to_have_text('כותרת חדשה לשמירה')
        assert stale.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        stale.screenshot(path=str(a.output / 'rtl-title.png'), full_page=True)
        record('narrow RTL localized editor and current original title')
        assert not errors, errors
        assert not external, external
        browser.close()
finally:
    fixture.stdin.close()
    fixture.wait(timeout=15)
    (a.output / 'results.json').write_text(json.dumps({'cases': records, 'pageErrors': errors, 'external': external}, ensure_ascii=False, indent=2))
