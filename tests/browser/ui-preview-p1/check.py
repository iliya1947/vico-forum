"""P1 browser proof: dynamically import every real Framework route module."""
import argparse
import json
from pathlib import Path
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
    # Importing 78 modules alone is not a Data Router gate. Render the real
    # topic in the complete generated route tree using the original loader/UI.
    topic = page.locator("#p1-full-router-screen main.topic-shell")
    topic.wait_for(timeout=30000)
    text = topic.inner_text()
    assert "P0 shared forum topic" in text
    assert "P0 message rendered by the real forum TopicView" in text
    assert page.locator("#p1-full-router-screen form.topic-reply-form").count() == 1
    assert "P1_FULL_ROUTER_MOUNTED root,routes/locale-boundary,routes/topic" in logs, logs[-20:]
    assert page.locator("#root").get_attribute("data-status") == "complete"
    assert "P1_RESOURCE_DISPATCH_404 404" in logs, logs[-10:]
    assert any(line.startswith("P1_XHR_FILE_DISPATCH_404 404 ") for line in logs), logs[-10:]
    assert any(line.startswith("P1_ATTACHMENT_UPLOAD_201 201 ") for line in logs), logs[-10:]
    assert "P1_ATTACHMENT_DRAFT_LIST_200 200 200 404 400" in logs, logs[-10:]
    assert "P1_ATTACHMENT_PRIVATE_READ_200 200 404" in logs, logs[-10:]
    assert "P1_ATTACHMENT_PUBLISHED_READ_200 200 200 404 2 2" in logs, logs[-10:]
    assert "P1_ATTACHMENT_CANCEL_200 200 200 410 404 200" in logs, logs[-10:]
    assert "P1_RESET_RETAINED_FETCH_200 200 200" in logs, logs[-10:]
    assert "P1_ATTACHMENT_RESET_RESOURCE_LIFECYCLE 2 1" in logs, logs[-10:]
    download_link = page.locator("#p1-published-download")
    assert (download_link.get_attribute("href") or "").startswith("blob:")
    with page.expect_download() as event:
        download_link.click()
    downloaded = event.value
    assert downloaded.suggested_filename == "p0-preview-swatch.png"
    file_bytes = Path(downloaded.path()).read_bytes()
    assert len(file_bytes) == 79 and file_bytes[:8] == b"\x89PNG\r\n\x1a\n", len(file_bytes)
    # Dispose only after the download finished; both generation-scoped Blob
    # URLs and all attachment fixtures must be released on page teardown.
    page.evaluate("window.dispatchEvent(new Event('pagehide'))")
    assert page.locator("#root").get_attribute("data-cleanup") == "complete"
    assert page.locator("#root").get_attribute("data-revoked-urls") == "4"
    assert page.locator("#root").get_attribute("data-live-generations") == "0"
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
