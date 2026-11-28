"""Local built Worker + real Better Auth + PG17 + Chromium.
No token-bearing traces, screenshot uploads, production or external Site."""
import base64
import hashlib
import os
import secrets
from urllib.parse import parse_qs, urlencode, urlparse
from playwright.sync_api import sync_playwright, expect

origin = "http://127.0.0.1:4242"
issuer = origin + "/api/auth"
resource = origin + "/mcp"
callback = origin + "/callback"
read, write = "forum.control.read", "forum.control.write"
db = urlparse(os.environ["DATABASE_URL"])
assert db.hostname in ("127.0.0.1", "localhost") and db.path == "/vico_forum_control_browser_test"
secret = os.environ["FORUM_CONTROL_FIXTURE_CLIENT_SECRET"]
password = os.environ["FORUM_CONTROL_FIXTURE_PASSWORD"]


def run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome", headless=True, args=["--no-sandbox"])
        external = []
        # Independent confidential client: never share the Owner browser cookie jar.
        client = pw.request.new_context()
        def context():
            ctx = browser.new_context(service_workers="block")
            def guard(route):
                if route.request.url.startswith(origin + "/"):
                    route.continue_()
                else:
                    external.append(True)
                    route.abort()
            ctx.route("**/*", guard)
            return ctx

        def submit_login(page, user):
            page.get_by_label("Email").fill(user + "@example.test")
            page.get_by_label("Password").fill(password)
            page.get_by_role("button", name="Sign in").click()

        def login(ctx, user):
            page = ctx.new_page()
            page.goto(origin + "/login")
            submit_login(page, user)
            expect(page.get_by_role("status")).to_have_text("Signed in")
            assert any("session_token" in c["name"] for c in ctx.cookies())
            return page

        def authorize(page, scopes, approve=True, guest_user=None):
            verifier = secrets.token_urlsafe(32)
            state = secrets.token_hex(16)
            challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
            page.goto(issuer + "/oauth2/authorize?" + urlencode({
                "client_id": "fixture-site", "redirect_uri": callback, "response_type": "code",
                "scope": " ".join(scopes), "resource": resource, "state": state,
                "code_challenge": challenge, "code_challenge_method": "S256", "prompt": "consent",
            }))
            if guest_user:
                expect(page.get_by_role("heading", name="Local Owner login")).to_be_visible()
                assert "sig" in parse_qs(urlparse(page.url).query)
                submit_login(page, guest_user)
            expect(page.get_by_role("heading", name="Local forum control consent")).to_be_visible()
            page.get_by_role("button", name="Approve" if approve else "Deny").click()
            return verifier, state

        def form(endpoint, **fields):
            return client.post(issuer + "/oauth2/" + endpoint,
                form={"client_id": "fixture-site", "client_secret": secret, **fields}, max_redirects=0)

        def mint(page, scopes, guest_user=None):
            verifier, state = authorize(page, scopes, guest_user=guest_user)
            page.wait_for_url(callback + "?*")
            query = parse_qs(urlparse(page.url).query)
            assert query.get("state") == [state] and query.get("iss") == [issuer]
            reply = form("token", grant_type="authorization_code", code=query["code"][0],
                code_verifier=verifier, redirect_uri=callback, resource=resource)
            assert reply.status == 200, "Native code exchange failed"
            data = reply.json()
            assert data["token_type"] == "Bearer"
            return data

        def mcp(token, method, params):
            return client.post(resource, headers={"Authorization": "Bearer " + token,
                "Accept": "application/json, text/event-stream", "MCP-Protocol-Version": "2025-11-25"},
                data={"jsonrpc": "2.0", "id": 1, "method": method, "params": params}, max_redirects=0)

        owner = context()
        page = owner.new_page()
        # Start from a guest authorize navigation and continue the signed
        # native OAuth query across the actual credential login.
        read_token = mint(page, [read], guest_user="fixture-owner")["access_token"]
        assert any("session_token" in c["name"] for c in owner.cookies())
        other = context()
        foreign = login(other, "fixture-nonowner")
        authorize(foreign, [read])
        expect(foreign.get_by_role("status")).to_have_text("Consent denied")
        authorize(page, [read], False)
        page.wait_for_url(callback + "?*")
        assert "code" not in parse_qs(urlparse(page.url).query)
        print("FORUM_CONTROL_BROWSER exact-owner-and-consent", flush=True)

        listed = mcp(read_token, "tools/list", {}).json()["result"]["tools"]
        assert [x["name"] for x in listed] == ["read_admin_overview"]
        args = {"taskId": "e8a018dd-8428-45d0-8a39-95a2f9bbab01", "targetIndex": 0, "stepIndex": 0}
        assert mcp(read_token, "tools/call", {"name": "pin_topic", "arguments": args}).json()["result"]["isError"]
        both = mint(page, [read, write, "offline_access"])
        assert mcp(both["access_token"], "tools/call", {"name": "read_admin_overview"}).json()["result"]["structuredContent"]["fixture"]
        assert mcp(both["access_token"], "tools/call", {"name": "pin_topic", "arguments": args}).json()["result"]["structuredContent"]["status"] == "unavailable"
        rotated = form("token", grant_type="refresh_token", refresh_token=both["refresh_token"], resource=resource)
        assert rotated.status == 200, "Native refresh failed"
        next_token = rotated.json()
        assert next_token["refresh_token"] != both["refresh_token"]
        assert form("revoke", token=next_token["refresh_token"], token_type_hint="refresh_token").ok
        assert mcp(next_token["access_token"], "tools/list", {}).status == 401
        assert form("token", grant_type="refresh_token", refresh_token=next_token["refresh_token"], resource=resource).status >= 400
        print("FORUM_CONTROL_BROWSER scoped-tools-refresh-revoke", flush=True)

        live = mint(page, [read, write, "offline_access"])
        assert owner.request.post(issuer + "/sign-out", headers={"Origin": origin}, data={}).ok
        assert mcp(live["access_token"], "tools/list", {}).status == 401
        login(owner, "fixture-owner")
        assert mcp(live["access_token"], "tools/list", {}).status == 401
        assert form("token", grant_type="refresh_token", refresh_token=live["refresh_token"], resource=resource).status >= 400
        assert not external
        print("FORUM_CONTROL_BROWSER original-session-termination", flush=True)
        client.dispose()
        browser.close()


if __name__ == "__main__":
    try:
        run()
    except Exception:
        # Avoid Playwright assertion details containing callback code or cookies.
        raise SystemExit("Local OAuth Chromium acceptance failed") from None
