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
    assert status == "modules-imported", {"status": status, "text": content, "pageerrors": errors}
    assert not errors, errors
    assert not external, external
    print("P0_REAL_BROWSER_IMPORT " + json.dumps({
        "status": status,
        "route_modules": ["root", "routes/locale-boundary", "routes/topic"],
        "external_requests": len(external),
        "page_errors": len(errors),
        "url": base,
    }), flush=True)
    browser.close()
