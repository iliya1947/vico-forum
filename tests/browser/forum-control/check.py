"""Local built Worker + real Better Auth + PG17 + Chromium.
No token-bearing traces, screenshot uploads, production or external Site."""
import base64
import hashlib
import hmac
import json
import threading
import uuid
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
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


# Disposable private GitHub API/webhook fixture. No network destination
# other than the two loopback ports is permitted here.
repo_path = "/repos/local-owner/private-inbox"
issue_path = repo_path + "/issues/7"
repository = {"id": 123, "private": True, "owner": {"id": 456}}
issue = {"id": 345, "number": 7, "state": "open"}
bot = {"id": 567, "type": "Bot"}
comments = []
deliveries = []
fixture_errors = []
fixture_lock = threading.Lock()


def deliver(comment):
    raw = json.dumps({"action": "created", "repository": repository, "issue": issue,
        "sender": bot, "installation": {"id": 234}, "comment": comment}).encode()
    signature = "sha256=" + hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
    webhook = Request(origin + "/api/forum-control/webhook", data=raw, headers={
        "Content-Type": "application/json", "X-GitHub-Event": "issue_comment",
        "X-GitHub-Delivery": str(uuid.uuid4()), "X-Hub-Signature-256": signature}, method="POST")
    with urlopen(webhook, timeout=4) as response:
        assert response.status == 202


class GitHubFixture(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass  # Never print request bodies or authorization headers.

    def reply(self, code, data):
        raw = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        try:
            assert self.headers.get("Authorization") == "Bearer local-installation-token"
            path = urlparse(self.path).path
            if path == repo_path:
                return self.reply(200, repository)
            if path == issue_path:
                return self.reply(200, issue)
            with fixture_lock:
                saved = list(comments)
            if path == issue_path + "/comments":
                return self.reply(200, saved)
            for comment in saved:
                if path == repo_path + "/issues/comments/" + str(comment["id"]):
                    return self.reply(200, comment)
            raise AssertionError("Unknown local GitHub endpoint")
        except Exception:
            fixture_errors.append(True)
            self.reply(500, {})

    def do_POST(self):
        try:
            size = int(self.headers["Content-Length"])
            assert 0 < size < 4096
            data = json.loads(self.rfile.read(size))
            if self.path == "/app/installations/234/access_tokens":
                assert self.headers.get("Authorization", "").startswith("Bearer ey")
                assert data == {"repository_ids": [123], "permissions": {"issues": "write"}}
                return self.reply(201, {"token": "local-installation-token",
                    "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
                    "permissions": {"issues": "write", "metadata": "read"}, "repositories": [{"id": 123}]})
            assert self.path == issue_path + "/comments"
            assert self.headers.get("Authorization") == "Bearer local-installation-token"
            assert set(data) == {"body"}
            envelope = json.loads(data["body"])
            assert set(envelope) == {"version", "kind", "ref", "requestId"}
            assert envelope["version"] == 1 and envelope["kind"] in ("request", "receipt")
            assert all(str(uuid.UUID(envelope[key])) == envelope[key] for key in ("ref", "requestId"))
            assert "stage-b-private-marker" not in data["body"]
            with fixture_lock:
                comment = {"id": 1000 + len(comments), "body": data["body"], "user": bot,
                    "performed_via_github_app": {"id": 789}, "issue_url": "https://api.github.com" + issue_path}
                comments.append(comment)
                first_request = envelope["kind"] == "request" and not deliveries
                if envelope["kind"] == "request":
                    deliveries.append(comment)
            if envelope["kind"] == "request":
                deliver(comment)
                # The first request reached GitHub and its webhook, but its
                # POST acknowledgement is deliberately lost.
                if first_request:
                    return self.reply(502, {})
            return self.reply(201, comment)
        except Exception:
            fixture_errors.append(True)
            self.reply(500, {})


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
        assert [x["name"] for x in listed] == ["read_admin_overview", "read_request_status"]
        args = {"taskId": "e8a018dd-8428-45d0-8a39-95a2f9bbab01", "targetIndex": 0, "stepIndex": 0}
        assert mcp(read_token, "tools/call", {"name": "pin_topic", "arguments": args}).json()["result"]["isError"]
        both = mint(page, [read, write, "offline_access"])
        overview = mcp(both["access_token"], "tools/call", {"name": "read_admin_overview"}).json()["result"]["structuredContent"]
        request_id = overview["requestId"]
        for _ in range(10):
            if overview["status"] != "pending":
                break
            state = mcp(both["access_token"], "tools/call", {"name": "read_request_status",
                "arguments": {"requestId": request_id}}).json()["result"]["structuredContent"]
            overview = state.get("receipt", state)
        assert overview["status"] == "read-ok", "Canonical overview receipt missing"
        projection = overview["result"]["projection"]
        assert overview["result"]["source"] == "web" and overview["result"]["coverage"] == "complete"
        assert projection["counts"]["categories"] >= 1 and projection["counts"]["sections"] >= 1
        assert any(event["targetLabel"] == "stage-b-private-marker" and event["action"] == "category.created"
            for event in projection["recent"])
        state = mcp(both["access_token"], "tools/call", {"name": "read_request_status",
            "arguments": {"requestId": request_id}}).json()["result"]["structuredContent"]
        assert state["transport"] == "published" and state["receipt"] == overview
        # Same Owner, different admitted grant: no previous projection.
        foreign_status = mcp(read_token, "tools/call", {"name": "read_request_status",
            "arguments": {"requestId": request_id}})
        assert foreign_status.status == 401 or foreign_status.json()["result"]["isError"]
        with fixture_lock:
            matching = [json.loads(c["body"]) for c in comments if json.loads(c["body"])["requestId"] == request_id]
        assert {e["kind"] for e in matching} == {"request", "receipt"}
        assert len({e["ref"] for e in matching if e["kind"] == "request"}) == 1
        assert len({e["ref"] for e in matching if e["kind"] == "receipt"}) == 1
        with fixture_lock:
            original = next(c for c in deliveries if json.loads(c["body"])["requestId"] == request_id)
        # Redelivery after completion must not execute another read or change
        # the saved result. DB scenarios separately exercise concurrent claims.
        deliver(original)
        state = mcp(both["access_token"], "tools/call", {"name": "read_request_status",
            "arguments": {"requestId": request_id}}).json()["result"]["structuredContent"]
        assert state["transport"] == "published" and state["receipt"] == overview
        assert not fixture_errors
        print("FORUM_CONTROL_BROWSER canonical-overview-through-github-receipt", flush=True)
        assert mcp(both["access_token"], "tools/call", {"name": "pin_topic", "arguments": args}).json()["result"]["structuredContent"]["status"] == "unavailable"
        rotated = form("token", grant_type="refresh_token", refresh_token=both["refresh_token"], resource=resource)
        assert rotated.status == 200, "Native refresh failed"
        next_token = rotated.json()
        assert next_token["refresh_token"] != both["refresh_token"]
        assert form("revoke", token=next_token["refresh_token"], token_type_hint="refresh_token").ok
        assert mcp(next_token["access_token"], "tools/list", {}).status == 401
        assert mcp(next_token["access_token"], "tools/call", {"name": "read_request_status",
            "arguments": {"requestId": request_id}}).status == 401
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
    server = ThreadingHTTPServer(("127.0.0.1", 4243), GitHubFixture)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        run()
    except Exception:
        # Avoid Playwright assertion details containing callback code or cookies.
        raise SystemExit("Local OAuth/GitHub Chromium acceptance failed") from None
    finally:
        server.shutdown()
        server.server_close()
