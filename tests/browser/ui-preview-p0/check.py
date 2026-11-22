"""P0 browser proof: actual Framework route modules, no real backend requests."""
import argparse
import json
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument("--url", required=True)
args = parser.parse_args()
base = args.url.rstrip("/")
assert urlparse(base).hostname in {"127.0.0.1", "localhost"}

errors = []
external = []
logs = []
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel="chrome", headless=True, args=["--no-sandbox"])
    context = browser.new_context(service_workers="block")
    # Bootstrap must use the exact persisted production theme before Vite routes render.
    context.add_init_script("window.localStorage.setItem('vico-theme', 'dark')")
    context.route("**/*", lambda route: route.continue_()
                  if route.request.url.startswith(base + "/")
                  else (external.append(route.request.url), route.abort())[-1])
    page = context.new_page()
    page.on("pageerror", lambda error: errors.append(str(error)))
    def on_console(message):
        if message.text.startswith("P0_"):
            logs.append(message.text)
        if message.type in {"error", "info"}:
            print("P0_BROWSER_CONSOLE " + message.type + " " + message.text, flush=True)
    page.on("console", on_console)
    response = page.goto(base + "/", wait_until="domcontentloaded")
    assert response is not None and response.status == 200
    page.locator("#root[data-status]").wait_for(timeout=30000)
    status = page.locator("#root").get_attribute("data-status")
    content = page.locator("#root").inner_text()
    page.locator("main.topic-shell").wait_for(timeout=30000)
    content = page.locator("#root").inner_text()
    assert "P0 shared forum topic" in content and "P0 message rendered by the real forum TopicView" in content, {"status": status, "text": content, "pageerrors": errors}
    assert status == "router-mounted", {"status": status, "text": content, "pageerrors": errors}
    document_state = page.evaluate("""() => ({
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      theme: document.documentElement.dataset.theme,
      themeBootstraps: document.querySelectorAll('script[data-vico-preview-theme-bootstrap]').length,
      moduleScripts: document.querySelectorAll('script[type="module"]').length,
      stylesheets: [...document.styleSheets].length,
    })""")
    assert document_state["lang"] == "en" and document_state["dir"] == "ltr", document_state
    assert document_state["theme"] == "dark", document_state
    assert document_state["themeBootstraps"] == 1, document_state
    assert document_state["moduleScripts"] == 1, document_state
    assert document_state["stylesheets"] > 0, document_state
    # The real MarkdownEditor prepares and replays a native Form submission.
    reply_form = page.locator("form.topic-reply-form")
    reply_form.get_by_role("button", name="Advanced", exact=True).click()
    reply_form.locator("textarea#reply-body").fill("P0 reply submitted through the real editor and action")
    reply_form.get_by_role("button", name="Post reply", exact=True).click()
    page.locator("li#post-p0-reply-1").wait_for(timeout=30000)
    assert "P0 reply submitted through the real editor and action" in page.locator("li#post-p0-reply-1").inner_text()
    page.wait_for_function("() => document.querySelector('#root')?.dataset.status === 'router-mounted'")
    assert any("P0_ACTION_CHAIN_CLIENT routes/topic" in item for item in logs), logs
    assert any("P0_ACTION_CHAIN_SERVER routes/topic" in item for item in logs), logs
    assert any("P0_FIXTURE_REPLY_COMMITTED p0-reply-1" in item for item in logs), logs
    assert any("P0_FIXTURE_READ_STATE" in item for item in logs), logs
    assert any("P0_ROUTER_REDIRECTED #post-p0-reply-1" in item for item in logs), logs
    assert not errors, errors
    assert not external, external
    print("P0_REAL_TOPIC_SCREEN " + json.dumps({
        "status": status,
        "route_modules": ["root", "routes/locale-boundary", "routes/topic"],
        "external_requests": len(external),
        "page_errors": len(errors),
        "document": document_state,
        "editor_reply": "p0-reply-1",
        "client_action": True,
        "server_action": True,
        "fetcher_read_state": True,
        "url": base,
    }), flush=True)
    browser.close()
