"""P1 browser proof: dynamically import every real Framework route module."""
import argparse
import json
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument("--url", required=True)
args = parser.parse_args()
base = args.url.rstrip("/")
assert urlparse(base).hostname in {"localhost", "127.0.0.1"}

errors = []
external = []
unexpected_network = []
logs = []
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel="chrome", headless=True, args=["--no-sandbox"])
    context = browser.new_context(service_workers="block")
    context.route("**/*", lambda route: route.continue_()
                  if route.request.url.startswith(base + "/")
                  else (external.append(route.request.url), route.abort())[-1])
    page = context.new_page()
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: logs.append(message.text))
    page.on("request", lambda request: unexpected_network.append(request.url)
            if "/api/" in urlparse(request.url).path else None)
    response = page.goto(base + "/", wait_until="domcontentloaded")
    assert response and response.status == 200
    page.wait_for_function("""() => ["complete", "failed"].includes(
      document.querySelector("#root")?.dataset.status
    )""", timeout=30000)
    status = page.locator("#root").get_attribute("data-status")
    count = int(page.locator("#root").get_attribute("data-routes") or "0")
    failure = page.locator("#root").inner_text()
    assert status == "complete", {"status": status, "failure": failure, "logs": logs[-10:]}
    assert count > 0, count
    assert any(line == "P1_ALL_MODULES_IMPORTED " + str(count) for line in logs), logs[-10:]
    assert not errors, errors
    assert not external, external
    assert not unexpected_network, unexpected_network
    print("P1_FULL_MODULE_IMPORT " + json.dumps({
        "route_modules": count,
        "page_errors": len(errors),
        "external_requests": len(external),
        "application_network_requests": len(unexpected_network),
    }), flush=True)
    browser.close()
