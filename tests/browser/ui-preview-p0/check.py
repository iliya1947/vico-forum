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
    page.on("console", lambda message: print("P0_BROWSER_CONSOLE " + message.type + " " + message.text, flush=True) if message.type in {"error", "info"} else None)
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
    assert not errors, errors
    assert not external, external
    print("P0_REAL_TOPIC_SCREEN " + json.dumps({
        "status": status,
        "route_modules": ["root", "routes/locale-boundary", "routes/topic"],
        "external_requests": len(external),
        "page_errors": len(errors),
        "document": document_state,
        "url": base,
    }), flush=True)
    browser.close()
