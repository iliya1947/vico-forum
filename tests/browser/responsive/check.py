"""Real Chromium layout regressions. See README.md for prerequisites and scope."""
import argparse
import functools
import json
import os
from pathlib import Path
import subprocess
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[3]
FIXTURE = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--smoke', action='store_true', help='One 320px EN case per causal group')
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
results, errors, blocked = [], [], []


def geometry(page):
    return page.evaluate('''() => ({viewport:innerWidth, document:document.documentElement.scrollWidth,
      client:document.documentElement.clientWidth, dir:document.documentElement.dir})''')


def contained(page):
    value = geometry(page)
    assert value['document'] <= value['client'] + 1, value
    return value


def hit(locator):
    locator.scroll_into_view_if_needed()
    assert locator.evaluate('''e => {const r=e.getBoundingClientRect();
      const p=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      return r.width>0 && r.height>0 && (e===p || e.contains(p));}'''), locator.get_attribute('class')


def check(name, page, callback):
    row = {'case': name}
    try:
        row.update(callback())
        row['status'] = 'PASS'
    except Exception as error:
        row.update(status='FAIL', error=str(error), geometry=geometry(page))
        page.screenshot(path=str(args.output / (name + '.png')))
    results.append(row)
    print(json.dumps(row, ensure_ascii=False), flush=True)


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *unused):
        pass


with tempfile.TemporaryDirectory(prefix='vico-responsive-') as temporary:
    build = Path(temporary) / 'build'
    with (args.output / 'build.log').open('w') as log:
        subprocess.run(['node', str(ROOT / 'node_modules/vite/bin/vite.js'), 'build',
                        '--config', str(FIXTURE / 'vite.config.mjs'), '--outDir', str(build)],
                       cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, check=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(build)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = 'http://127.0.0.1:' + str(server.server_port)
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path=os.environ.get('CHROMIUM', '/usr/bin/chromium'),
                                                  headless=True, args=['--no-sandbox'])
            try:
                widths = [320] if args.smoke else [320, 360, 390, 479, 480, 703, 704, 767, 768, 1280]
                locales = ['en'] if args.smoke else ['en', 'ru', 'he']
                for locale in locales:
                    for width in widths:
                        context = browser.new_context(viewport={'width': width, 'height': 900})

                        def guard(route):
                            if route.request.url.startswith(origin + '/') and route.request.method == 'GET':
                                route.continue_()
                            else:
                                blocked.append({'url': route.request.url, 'method': route.request.method})
                                route.abort()

                        context.route('**/*', guard)
                        page = context.new_page()
                        page.set_default_timeout(6000)
                        page.on('pageerror', lambda error: errors.append(str(error)))

                        def preview(scenario, identity):
                            page.goto(origin + '/?scenario=' + scenario + '&identity=' + identity,
                                      wait_until='domcontentloaded')
                            page.locator('.site-header select').select_option(locale)
                            page.wait_for_function('(l)=>document.documentElement.lang===l', arg=locale)

                        try:
                            for identity in (['manager'] if args.smoke else ['guest', 'user', 'manager']):
                                def header():
                                    preview('home-guest', identity)
                                    before = contained(page)
                                    controls = page.locator('.site-account-actions a,.site-account-actions button')
                                    for control in controls.all():
                                        hit(control)
                                    if width < 480:
                                        assert page.locator('.site-account-actions').evaluate(
                                            "e=>getComputedStyle(e).flexWrap==='nowrap'")
                                    if identity != 'guest':
                                        profile = page.locator('.auth-user')
                                        # Pressure from a long public name must not clip the avatar/actions.
                                        profile.locator('span').last.evaluate("e=>e.textContent='Long public identity '.repeat(12)")
                                        assert page.locator('.auth-avatar').evaluate('''e=>{
                                          const a=e.getBoundingClientRect(),b=e.closest('.auth-user').getBoundingClientRect();
                                          return a.left>=b.left && a.right<=b.right;}''')
                                    boxes = controls.evaluate_all('es=>es.map(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom}})')
                                    if width < 480:
                                        assert max(b['top'] for b in boxes) < min(b['bottom'] for b in boxes), boxes
                                    return {'before': before, 'longName': contained(page), 'controls': len(boxes)}
                                check(f'header-{locale}-{width}-{identity}', page, header)

                            modes = ['simple'] if args.smoke else ['simple', 'advanced']
                            for mode in modes:
                                for fullscreen in ([False] if args.smoke else [False, True]):
                                    def menu():
                                        preview('editor-create-topic', 'user')
                                        editor = page.locator('.markdown-editor')
                                        editor.wait_for()
                                        if editor.get_attribute('data-authoring') != mode:
                                            editor.locator('.markdown-editor-controls > button').first.click()
                                        assert editor.get_attribute('data-authoring') == mode
                                        if fullscreen:
                                            editor.locator('.markdown-editor-controls > button').last.click()
                                            assert editor.get_attribute('aria-modal') == 'true'
                                        before = contained(page)
                                        details = editor.locator('.markdown-editor-formatting > .markdown-editor-extra-menu')
                                        summary = details.locator(':scope > summary')
                                        summary.focus()
                                        page.keyboard.press('Enter')
                                        assert details.get_attribute('open') is not None
                                        opened = contained(page)
                                        popup = details.locator(':scope > .markdown-editor-extra-options')
                                        r = popup.bounding_box()
                                        assert r and r['x'] >= -1 and r['x'] + r['width'] <= width + 1, r
                                        page.keyboard.press('Tab')
                                        assert details.evaluate('e=>e.contains(document.activeElement)')
                                        # Reach every enabled action, including ones below popup scroll fold.
                                        for control in popup.locator('button,input,summary').all():
                                            if control.is_visible() and control.is_enabled():
                                                hit(control)
                                        toolbar = editor.locator('.markdown-editor-toolbar')
                                        assert toolbar.evaluate("e=>getComputedStyle(e).position==='sticky'")
                                        # Use native keyboard toggle to close again; no source-changing command.
                                        summary.focus()
                                        page.keyboard.press('Space')
                                        assert details.get_attribute('open') is None
                                        after = contained(page)
                                        if width == 320 and locale == 'en':
                                            page.screenshot(path=str(args.output / f'menu-{mode}-{fullscreen}.png'))
                                        return {'before': before, 'opened': opened, 'closed': after}
                                    check(f'menu-{locale}-{width}-{mode}-{fullscreen}', page, menu)

                            def history():
                                page.goto(origin + '/?history=1&locale=' + locale, wait_until='domcontentloaded')
                                page.locator('#post-p1').wait_for()
                                before = contained(page)

                                def toggle():
                                    if width <= 704:
                                        mobile = page.locator('.topic-message-mobile-actions-toggle')
                                        if mobile.is_visible() and mobile.get_attribute('aria-expanded') != 'true':
                                            mobile.click()
                                    page.get_by_role('button', name='Edit history', exact=True).filter(visible=True).click()

                                toggle()
                                page.locator('.topic-post-history pre').first.wait_for()
                                opened = contained(page)
                                regions = page.locator('.topic-post-history pre')
                                assert regions.count() == 2
                                expected = "export const identifier = '" + 'long_identifier_' * 30 + "';\nשלום mixed RTL/LTR\n  exact spacing\n"
                                for region in regions.all():
                                    assert region.text_content() == expected
                                    assert region.evaluate("e=>getComputedStyle(e).whiteSpace==='pre'")
                                    region.evaluate('e=>e.scrollLeft=150')
                                    assert region.evaluate('e=>Math.abs(e.scrollLeft)>0')
                                toggle()
                                page.locator('.topic-post-history').wait_for(state='detached')
                                return {'before': before, 'opened': opened, 'closed': contained(page)}
                            check(f'history-{locale}-{width}', page, history)
                        finally:
                            context.close()
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
report = {'scope': 'Current shared components/styles; fixed history action. No real auth/DB/services or owner visual acceptance.',
          'results': results, 'pageErrors': errors, 'blockedRequests': blocked, 'cleanup': 'browser/HTTP/temp build closed'}
(args.output / 'results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
failed = sum(row['status'] == 'FAIL' for row in results)
print(json.dumps({'total': len(results), 'failed': failed, 'pageErrors': errors, 'blockedRequests': blocked}))
raise SystemExit(1 if failed or errors or blocked else 0)
