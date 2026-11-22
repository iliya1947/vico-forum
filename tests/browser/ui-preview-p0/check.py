"""P0 browser proof: actual Framework route modules, no real backend requests."""
import argparse
import json
from urllib.parse import urlparse, parse_qs, urlencode, urljoin
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument("--url", required=True)
args = parser.parse_args()
base = args.url.rstrip("/")
assert urlparse(base).hostname in {"127.0.0.1", "localhost"}

errors = []
external = []
logs = []
resource_network = []
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
    page.on("request", lambda req: resource_network.append(req.url)
            if urlparse(req.url).path in {"/en/presence", "/en/mentions", "/xx/presence"} else None)
    def on_console(message):
        if message.text.startswith("P0_"):
            logs.append(message.text)
        if message.type in {"error", "info"}:
            print("P0_BROWSER_CONSOLE " + message.type + " " + message.text, flush=True)
    page.on("console", on_console)
    virtual_initial = "/en/topics/p0-preview-topic?source=pages#post-p0-first-post"
    initial = base + "/?" + urlencode({
        "embed": "1", "path": virtual_initial,
        "actor": "p0-preview-user", "scenario": "default",
    })
    response = page.goto(initial, wait_until="domcontentloaded")
    assert response is not None and response.status == 200
    page.locator("#root[data-status]").wait_for(timeout=30000)
    status = page.locator("#root").get_attribute("data-status")
    content = page.locator("#root").inner_text()
    page.locator("main.topic-shell").wait_for(timeout=30000)
    content = page.locator("#root").inner_text()
    assert "P0 shared forum topic" in content and "P0 message rendered by the real forum TopicView" in content, {"status": status, "text": content, "pageerrors": errors}
    assert status == "router-mounted", {"status": status, "text": content, "pageerrors": errors}
    assert parse_qs(urlparse(page.url).query)["path"] == [virtual_initial], page.url
    # A direct Pages bootstrap with virtual search/hash must survive browser refresh.
    page.reload(wait_until="domcontentloaded")
    page.locator("main.topic-shell").wait_for(timeout=30000)
    assert parse_qs(urlparse(page.url).query)["path"] == [virtual_initial], page.url
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
    form_action = reply_form.get_attribute("action") or ""
    assert urlparse(form_action).path == "/en/topics/p0-preview-topic", form_action
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
    after_reply = parse_qs(urlparse(page.url).query)["path"][0]
    assert after_reply == "/en/topics/p0-preview-topic#post-p0-reply-1", page.url
    assert urlparse(page.url).path == urlparse(base).path + "/", page.url

    # Real production TopicView Link must expose the Pages URL while keeping
    # React Router click navigation on the original product path.
    profile_link = page.locator("a.topic-message-profile-link").first
    profile_href = profile_link.get_attribute("href")
    assert profile_href
    target = urlparse(urljoin(base + "/", profile_href))
    target_query = parse_qs(target.query)
    assert target.path == urlparse(base).path + "/", profile_href
    assert target_query == {
        "embed": ["1"], "path": ["/en/users/sample-author"],
        "actor": ["p0-preview-user"], "scenario": ["default"],
    }, profile_href
    with context.expect_page() as new_tab_event:
        profile_link.click(button="middle")
    new_tab = new_tab_event.value
    new_tab.wait_for_load_state("domcontentloaded")
    assert parse_qs(urlparse(new_tab.url).query)["path"] == ["/en/users/sample-author"], new_tab.url
    assert urlparse(new_tab.url).path == urlparse(base).path + "/", new_tab.url
    new_tab.close()

    # Browser Back/Forward follows the Pages URL while preserving virtual
    # React Router route rendering and the simulated in-memory reply.
    page.evaluate("window.history.back()")
    page.wait_for_function("(expected) => new URLSearchParams(location.search).get('path') === expected", arg=virtual_initial)
    page.locator("main.topic-shell").wait_for(timeout=30000)
    page.evaluate("window.history.forward()")
    page.wait_for_function("(expected) => new URLSearchParams(location.search).get('path') === expected", arg=after_reply)
    page.locator("li#post-p0-reply-1").wait_for(timeout=30000)
    assert any(item.startswith("P0_PAGES_POP ") for item in logs), logs
    resource_results = page.evaluate("""async () => {
      const mention = await fetch("/en/mentions?q=Preview");
      const mentionsPayload = await mention.json();
      const invisible = await fetch("/en/presence");
      const denied = await fetch("/en/presence", {
        method: "POST", headers: { Origin: "https://foreign.invalid" },
        body: new URLSearchParams({ intent: "heartbeat", expectedUserId: "p0-preview-user" }),
      });
      const wrongMethod = await fetch("/en/presence", { method: "PUT" });
      const wrongLocale = await fetch("/xx/presence", {
        method: "POST",
        body: new URLSearchParams({ intent: "heartbeat", expectedUserId: "p0-preview-user" }),
      });
      const heartbeat = await fetch("/en/presence", {
        method: "POST",
        body: new URLSearchParams({ intent: "heartbeat", expectedUserId: "p0-preview-user" }),
      });
      return {
        mentionsStatus: mention.status, mentionsPayload,
        mentionsCache: mention.headers.get("Cache-Control"),
        mentionsNosniff: mention.headers.get("X-Content-Type-Options"),
        presenceGet: invisible.status, presenceGetCache: invisible.headers.get("Cache-Control"),
        foreignOrigin: denied.status, foreignOriginCache: denied.headers.get("Cache-Control"),
        wrongMethod: wrongMethod.status, allowedMethod: wrongMethod.headers.get("Allow"),
        wrongLocale: wrongLocale.status,
        presencePost: heartbeat.status, presenceCache: heartbeat.headers.get("Cache-Control"),
        presencePostBody: await heartbeat.text(),
      };
    }""")
    assert resource_results == {
        "mentionsStatus": 200,
        "mentionsPayload": {"users": [{"id": "p0-preview-user", "name": "Preview member"}]},
        "mentionsCache": "private, no-store",
        "mentionsNosniff": "nosniff",
        "presenceGet": 404, "presenceGetCache": "no-store",
        "foreignOrigin": 403, "foreignOriginCache": "no-store",
        "wrongMethod": 405, "allowedMethod": "POST",
        "wrongLocale": 404,
        "presencePost": 204, "presenceCache": "no-store", "presencePostBody": "",
    }, resource_results
    assert any("P0_FIXTURE_PRESENCE_RECORDED" in message for message in logs), logs
    assert any("P0_RESOURCE_RESULT routes/presence POST 204" in message for message in logs), logs
    assert any("P0_RESOURCE_RESULT routes/mentions GET 200" in message for message in logs), logs
    assert not resource_network, resource_network
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
        "resource_results": resource_results,
        "resource_network": len(resource_network),
        "pages_base": urlparse(base).path + "/",
        "new_tab_target": target_query["path"][0],
        "browser_history": True,
        "url": base,
    }), flush=True)
    browser.close()
