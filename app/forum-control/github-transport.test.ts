import { describe, it } from "vitest";
import { strict as assert } from "node:assert";
import {
  InvalidTransportInput, parseUniqueJson, parseOverviewRequest, overviewRequestDigest,
  serializeInboxEnvelope, parseInboxEnvelope, type InboxEnvelope,
} from "./transport-wire.server";
import {
  createGitHubInboxClient, verifyRequestWebhook, GitHubTransportUnavailable, type GitHubInboxBinding,
} from "./github-transport.server";

const binding: GitHubInboxBinding = {
  repositoryId: "123", repositoryOwnerId: "456", appId: "789", installationId: "234", botUserId: "567",
  inboxIssueId: "345", inboxNumber: 7, owner: "local-owner", repository: "private-inbox",
};
const requestId = "10000000-0000-4000-8000-000000000001";
const ref = "10000000-0000-4000-8000-000000000002";
const deliveryId = "10000000-0000-4000-8000-000000000003";
const envelope: InboxEnvelope = { version: 1, kind: "request", ref, requestId };
const secret = "local-only-webhook-secret";
const repoPath = "/repos/local-owner/private-inbox";
const issuePath = repoPath + "/issues/7";
const repository = { id: 123, private: true, owner: { id: 456 } };
const issue = { id: 345, number: 7, state: "open" };
const bot = { id: 567, type: "Bot" };
const comment = (body = serializeInboxEnvelope(envelope)) => ({
  id: 444, body, user: bot, performed_via_github_app: { id: 789 }, issue_url: "https://api.github.com" + issuePath,
});
const event = () => ({ action: "created", repository, issue, sender: bot, installation: { id: 234 }, comment: comment() });

async function webhook(raw: string, signedRaw = raw): Promise<Request> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedRaw));
  const signature = Array.from(new Uint8Array(mac), byte => byte.toString(16).padStart(2, "0")).join("");
  return new Request("https://vico.example.test/control/webhook", { method: "POST", body: raw,
    headers: { "Content-Type": "application/json", "X-GitHub-Event": "issue_comment", "X-GitHub-Delivery": deliveryId,
      "X-Hub-Signature-256": "sha256=" + signature } });
}

function toolRequest(body: string): Request {
  return new Request("https://vico.example.test/control/read", { method: "POST", body,
    headers: { "Content-Type": "application/json" } });
}

function decodeBase64url(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), char => char.charCodeAt(0));
}

async function keyPair() {
  return crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", hash: "SHA-256", modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]) }, false, ["sign", "verify"]);
}

function tokenResponse(permissions: object = { issues: "write", metadata: "read" }) {
  return Response.json({ token: "local-installation-token", expires_at: new Date(Date.now() + 3600000).toISOString(),
    permissions, repositories: [{ id: 123 }] }, { status: 201 });
}

describe("Stage B closed wire and signed GitHub delivery", () => {
  it("accepts only the implemented reader and rejects ambiguous or authority-bearing JSON", async () => {
    const value = { version: 1, tool: "read_admin_overview", requestId, arguments: {} };
    const first = await parseOverviewRequest(toolRequest(JSON.stringify(value)));
    const reordered = await parseOverviewRequest(toolRequest(JSON.stringify({ arguments: {}, requestId, tool: value.tool, version: 1 })));
    assert.deepEqual(first, value);
    assert.equal(await overviewRequestDigest(first), await overviewRequestDigest(reordered));
    assert.notEqual(await overviewRequestDigest(first), await overviewRequestDigest({ ...first, requestId: ref }));
    for (const invalid of [
      { ...value, actor: "owner" }, { ...value, confirmed: true }, { ...value, version: 2 },
      { ...value, tool: "pin_topic" }, { ...value, arguments: { query: "SELECT 1" } },
      { ...value, requestId: requestId + "\n" }, { ...value, arguments: [] },
    ]) await assert.rejects(parseOverviewRequest(toolRequest(JSON.stringify(invalid))), InvalidTransportInput);
    for (const raw of ['{"x":1,"x":2}', '{"outer":[{"id":1,"\\u0069d":2}]}', '{"x":1,}', '['.repeat(33) + '0' + ']'.repeat(33)]) {
      assert.throws(() => parseUniqueJson(raw), InvalidTransportInput);
    }
    assert.deepEqual(parseUniqueJson('{"a":{"id":1},"b":{"id":2},"text":"{\\"id\\":3}"}'),
      { a: { id: 1 }, b: { id: 2 }, text: '{"id":3}' });
    await assert.rejects(parseOverviewRequest(toolRequest(JSON.stringify(value) + " ".repeat(4096))), InvalidTransportInput);
  });

  it("admits only the registered-reference-shaped request from the configured App and private inbox", async () => {
    const body = JSON.stringify(event());
    assert.deepEqual(await verifyRequestWebhook(await webhook(body), binding, secret),
      { deliveryId, commentId: "444", envelope });
    const invalid = [
      { ...event(), action: "edited" }, { ...event(), repository: { ...repository, id: 999 } },
      { ...event(), repository: { ...repository, private: false } },
      { ...event(), repository: { ...repository, owner: { id: 999 } } },
      { ...event(), issue: { ...issue, id: 999 } }, { ...event(), issue: { ...issue, number: 8 } },
      { ...event(), issue: { ...issue, pull_request: {} } }, { ...event(), issue: { ...issue, state: "closed" } },
      { ...event(), sender: { ...bot, id: 999 } }, { ...event(), installation: { id: 999 } },
      { ...event(), comment: { ...comment(), user: { ...bot, id: 999 } } },
      { ...event(), comment: { ...comment(), performed_via_github_app: { id: 999 } } },
      { ...event(), comment: { ...comment(), performed_via_github_app: null } },
      { ...event(), comment: { ...comment(), issue_url: "https://wrong.example.test/7" } },
      { ...event(), comment: comment(serializeInboxEnvelope({ ...envelope, kind: "receipt" })) },
      { ...event(), comment: comment(JSON.stringify({ ...envelope, op: "pin_topic", actor: "owner" })) },
    ];
    for (const value of invalid) assert.equal(await verifyRequestWebhook(await webhook(JSON.stringify(value)), binding, secret), null);
    assert.equal(await verifyRequestWebhook(await webhook(body + " ", body), binding, secret), null);
    const duplicate = body.replace('"installation":{"id":234}', '"installation":{"id":999,"id":234}');
    assert.notEqual(duplicate, body);
    assert.equal(await verifyRequestWebhook(await webhook(duplicate), binding, secret), null);
    assert.equal(await verifyRequestWebhook(await webhook(body + " ".repeat(262144)), binding, secret), null);
    assert.equal(parseInboxEnvelope(JSON.stringify({ ...envelope, ref: ref + "\n" })), null);
    // The adapter projects exactly four fields even if a runtime caller has extra data.
    assert.deepEqual(JSON.parse(serializeInboxEnvelope({ ...envelope, privatePayload: "must-not-leak" } as InboxEnvelope)), envelope);
  });

  it("signs a scoped App JWT, publishes only opaque refs, and recovers/verifies a matching receipt", async () => {
    const pair = await keyPair();
    const receipt: InboxEnvelope = { ...envelope, kind: "receipt" };
    const body = serializeInboxEnvelope(receipt);
    const calls: string[] = [];
    const fake: typeof fetch = async (input, init) => {
      const req = new Request(input, init), url = new URL(req.url);
      assert.equal(url.origin, "https://api.github.com");
      assert.equal(req.redirect, "error");
      calls.push(req.method + " " + url.pathname);
      const authorization = req.headers.get("Authorization");
      if (url.pathname === "/app/installations/234/access_tokens") {
        assert.equal(req.method, "POST");
        assert.deepEqual(await req.json(), { repository_ids: [123], permissions: { issues: "write" } });
        if (!authorization || !authorization.startsWith("Bearer ")) throw Error("Expected App JWT");
        const [header, payload, signature] = authorization.slice(7).split(".");
        assert.deepEqual(JSON.parse(new TextDecoder().decode(decodeBase64url(header))), { alg: "RS256", typ: "JWT" });
        const claims = JSON.parse(new TextDecoder().decode(decodeBase64url(payload))) as { iss: string; iat: number; exp: number };
        assert.equal(claims.iss, binding.appId);
        assert.ok(claims.iat <= Math.floor(Date.now() / 1000) && claims.exp > Math.floor(Date.now() / 1000) && claims.exp - claims.iat <= 600);
        assert.equal(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", pair.publicKey, decodeBase64url(signature), new TextEncoder().encode(header + "." + payload)), true);
        return tokenResponse();
      }
      assert.equal(authorization, "Bearer local-installation-token");
      if (url.pathname === repoPath) return Response.json(repository);
      if (url.pathname === issuePath) return Response.json(issue);
      if (url.pathname === issuePath + "/comments" && req.method === "POST") {
        assert.deepEqual(await req.json(), { body });
        return Response.json(comment(body), { status: 201 });
      }
      if (url.pathname === issuePath + "/comments") {
        assert.equal(url.searchParams.get("since"), "2026-11-28T11:59:59.000Z");
        assert.equal(url.searchParams.get("page"), "1");
        return Response.json([{ ...comment(body), id: 555, performed_via_github_app: { id: 999 } }, comment(body)]);
      }
      if (url.pathname === repoPath + "/issues/comments/444") return Response.json(comment(body));
      throw Error("Unexpected fixture HTTP call");
    };
    const client = createGitHubInboxClient(binding, pair.privateKey, fake);
    assert.equal(await client.publish(receipt), "444");
    assert.equal(await client.find(receipt, new Date("2026-11-28T12:00:00.987Z")), "444");
    assert.equal(await client.verify("444", receipt), true);
    assert.equal(await client.verify("444", envelope), false);
    assert.equal(await client.verify("444/../../other", receipt), false);
    assert.equal(calls.filter(call => call.includes("access_tokens")).length, 1);
    assert.equal(calls.filter(call => call === "POST " + issuePath + "/comments").length, 1);
  });

  it("fails closed on excessive token authority, repository drift and untrusted publish acknowledgement", async () => {
    const pair = await keyPair();
    for (const fault of ["permissions", "repository", "author"] as const) {
      let posts = 0;
      const fake: typeof fetch = async (input, init) => {
        const req = new Request(input, init), path = new URL(req.url).pathname;
        if (path === "/app/installations/234/access_tokens") return tokenResponse(fault === "permissions" ? { issues: "write", actions: "write" } : undefined);
        if (path === repoPath) return Response.json(fault === "repository" ? { ...repository, id: 999 } : repository);
        if (path === issuePath) return Response.json(issue);
        if (path === issuePath + "/comments" && req.method === "POST") {
          posts++;
          return Response.json({ ...comment(), user: { id: 999, type: "Bot" } }, { status: 201 });
        }
        throw Error("Unexpected fixture HTTP call");
      };
      const client = createGitHubInboxClient(binding, pair.privateKey, fake);
      await assert.rejects(client.publish(envelope), GitHubTransportUnavailable);
      assert.equal(posts, fault === "author" ? 1 : 0);
    }
  });
});
