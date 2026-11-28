import { readFile } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { symmetricEncrypt, hashPassword } from "better-auth/crypto";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHyperdriveAuthRuntime } from "../../app/auth/auth.server";
import type { ForumControlOAuthConfig } from "../../app/forum-control/oauth-provider.server";
import { forumControlScopes } from "../../app/forum-control/write-tool-contract";
import { createOAuthForumControlMcpFixture } from "../fixtures/forum-control-oauth";
import { installRegistrationPolicyFixture } from "./registration-policy-fixture";
import { installAuthLifecycleFixture } from "./verified-credential-fixture";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname) ||
  !new URL(url).pathname.endsWith("_test")) throw new Error("Disposable loopback *_test DB required");
const schema = "forum_control_oauth_test";
const db = new Client({ connectionString: url });
const connection = () => new Client({ connectionString: url, options: "-c search_path=" + schema });
const origin = "http://localhost:5173";
const secret = randomBytes(32).toString("hex");
const clientSecret = randomBytes(32).toString("hex");
const password = "fixture-only-credential-password";
const config: ForumControlOAuthConfig = {
  ownerUserId: "fixture-owner", issuer: origin + "/api/auth",
  clientId: "fixture-site", resource: "http://localhost:8765/mcp",
  redirectUri: "http://localhost:8765/callback", repositoryId: "123",
  loginPage: origin + "/login", consentPage: origin + "/consent",
};
const runtime = createHyperdriveAuthRuntime(url, {
  BETTER_AUTH_SECRET: secret, BETTER_AUTH_URL: origin,
  GOOGLE_CLIENT_ID: "fixture-google", GOOGLE_CLIENT_SECRET: "fixture-google-secret",
}, connection, undefined, undefined, undefined, config);
const mcp = createOAuthForumControlMcpFixture(config, runtime, clientSecret);
const scopes = [forumControlScopes.read, forumControlScopes.write, "offline_access"];

beforeAll(async () => {
  await db.connect();
  await db.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  await db.query("set search_path to " + schema);
  for (const path of ["0003_gorgeous_donald_blake", "0065_sa04_account_state_foundation"]) {
    await db.query((await readFile("drizzle/" + path + ".sql", "utf8")).replaceAll('"public".', '"' + schema + '".'));
  }
  await installRegistrationPolicyFixture(db);
  await installAuthLifecycleFixture(db);
  await db.query((await readFile("drizzle/0079_forum_control_oauth.sql", "utf8")).replaceAll('"public".', '"' + schema + '".'));
  const passwordHash = await hashPassword(password);
  for (const userId of [config.ownerUserId, "fixture-nonowner"]) {
    await db.query('insert into "user"(id,name,email,email_verified,created_at,updated_at) values($1,$1,$2,true,now(),now())',
      [userId, userId + "@example.test"]);
    await db.query("insert into account(id,account_id,provider_id,user_id,password,created_at,updated_at) values($1,$2,'credential',$2,$3,now(),now())",
      [crypto.randomUUID(), userId, passwordHash]);
  }
  // Ephemeral trusted client registration in the disposable schema only.
  // Pinned provider's disableJwtPlugin path uses symmetricEncrypt at rest.
  const storedSecret = await symmetricEncrypt({ key: secret, data: clientSecret });
  await db.query("insert into oauth_client(id,client_id,client_secret,disabled,skip_consent,subject_type,scopes,redirect_uris,token_endpoint_auth_method,application_type,grant_types,response_types,require_pkce) values($1,$2,$3,false,false,'public',$4,$5,'client_secret_post','web',$6,$7,true)",
    [crypto.randomUUID(), config.clientId, storedSecret, scopes, [config.redirectUri], ["authorization_code", "refresh_token"], ["code"]]);
  await db.query("insert into oauth_resource(id,identifier,name,access_token_ttl,allowed_scopes,disabled) values($1,$2,'Local fixture',300,$3,false)",
    [crypto.randomUUID(), config.resource, scopes]);
  await db.query("insert into oauth_client_resource(id,client_id,resource_id) values($1,$2,$3)",
    [crypto.randomUUID(), config.clientId, config.resource]);
});

afterAll(async () => {
  await db.query("set search_path to public");
  await db.query("drop schema if exists " + schema + " cascade");
  await db.end();
});

async function login(userId = config.ownerUserId): Promise<string> {
  const response = await runtime.handle(new Request(config.issuer + "/sign-in/email", {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ email: userId + "@example.test", password }),
  }));
  expect(response.status).toBe(200);
  const cookie = response.headers.getSetCookie().find(value => value.includes("session_token="))?.split(";", 1)[0];
  if (!cookie) throw new Error("Fixture sign-in did not issue a genuine session cookie");
  return cookie;
}

function form(endpoint: string, params: Record<string, string>) {
  return runtime.handle(new Request(config.issuer + "/oauth2/" + endpoint, {
    method: "POST", body: new URLSearchParams({ client_id: config.clientId, client_secret: clientSecret, ...params }),
  }));
}

async function authorize(cookie: string, allowedScopes: string[], overrides: Record<string, string> = {}) {
  const verifier = randomBytes(32).toString("base64url");
  const state = randomBytes(16).toString("hex");
  const query = new URLSearchParams({
    client_id: config.clientId, redirect_uri: config.redirectUri, response_type: "code",
    resource: config.resource, scope: allowedScopes.join(" "), state, prompt: "consent",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256",
    ...overrides,
  });
  const response = await runtime.handle(new Request(config.issuer + "/oauth2/authorize?" + query, {
    headers: { Cookie: cookie, Accept: "text/html" },
  }));
  return { verifier, state, response };
}

async function consent(cookie: string, response: Response, accept = true): Promise<Response> {
  const location = response.headers.get("Location");
  if (!location) throw new Error("Expected native authorization redirect");
  const page = new URL(location, origin);
  expect(page.origin + page.pathname).toBe(config.consentPage);
  return runtime.handle(new Request(config.issuer + "/oauth2/consent", {
    method: "POST", headers: { Cookie: cookie, Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ accept, oauth_query: page.search.slice(1) }),
  }));
}

async function issueCode(cookie: string, allowedScopes: string[]) {
  const auth = await authorize(cookie, allowedScopes);
  const accepted = await consent(cookie, auth.response);
  const data = await accepted.json() as { url?: string };
  if (!data.url) throw new Error("Expected native consent callback");
  const callback = new URL(data.url);
  expect(callback.origin + callback.pathname).toBe(config.redirectUri);
  expect(callback.searchParams.get("state")).toBe(auth.state);
  const code = callback.searchParams.get("code");
  if (!code) throw new Error("Expected actual native authorization code");
  return { code, verifier: auth.verifier };
}

type Tokens = { access_token: string; refresh_token: string; token_type: string };
async function exchange(cookie: string, allowedScopes: string[]): Promise<Tokens> {
  const { code, verifier } = await issueCode(cookie, allowedScopes);
  const response = await form("token", {
    grant_type: "authorization_code", code, code_verifier: verifier,
    redirect_uri: config.redirectUri, resource: config.resource,
  });
  expect(response.status).toBe(200);
  const tokens = await response.json() as Tokens;
  expect(tokens.token_type).toBe("Bearer");
  expect(typeof tokens.access_token).toBe("string");
  return tokens;
}
const introspect = (token: string) => form("introspect", { token, token_type_hint: "access_token" });
const refresh = (token: string) => form("token", { grant_type: "refresh_token", refresh_token: token, resource: config.resource });
const call = (token: string, name: string, args: object = {}) => mcp(new Request(config.resource, {
  method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json",
    Accept: "application/json, text/event-stream" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
}));
const step = { taskId: "e8a018dd-8428-45d0-8a39-95a2f9bbab01", targetIndex: 0, stepIndex: 0 };

describe("real local Vico OAuth and MCP lifecycle", () => {
  it("requires PKCE, live exact Owner, the registered resource and explicit consent", async () => {
    const owner = await login();
    const foreign = await login("fixture-nonowner");
    const rejected = await authorize(foreign, scopes);
    if (rejected.response.headers.get("Location")?.includes("/consent?")) {
      const refused = await consent(foreign, rejected.response);
      expect(refused.status).toBeGreaterThanOrEqual(400);
    }
    const invalidResource = await authorize(owner, scopes, { resource: "https://wrong.example/mcp" });
    expect(invalidResource.response.headers.get("Location") ?? "").not.toContain("code=");
    const invalidPkce = await authorize(owner, scopes, { code_challenge_method: "plain" });
    expect(invalidPkce.response.headers.get("Location") ?? "").not.toContain("code=");
    const declined = await authorize(owner, scopes);
    const refusal = await consent(owner, declined.response, false);
    expect(JSON.stringify(await refusal.json())).not.toContain("code=");
    const { code, verifier } = await issueCode(owner, scopes);
    expect((await form("token", { grant_type: "authorization_code", code, code_verifier: verifier + "wrong",
      redirect_uri: config.redirectUri, resource: config.resource })).status).toBeGreaterThanOrEqual(400);
    expect((await db.query("select count(*)::int as n from forum_control_grant")).rows[0].n).toBe(0);
  });

  it("uses native-issued scopes and original session; refresh rotates and native revoke blocks both tools and refresh", async () => {
    const cookie = await login();
    const read = await exchange(cookie, [forumControlScopes.read]);
    const readResult = await (await call(read.access_token, "read_admin_overview")).json();
    expect(readResult.result.structuredContent.status).toBe("read-ok");
    expect((await (await call(read.access_token, "pin_topic", step)).json()).result.isError).toBe(true);
    const both = await exchange(cookie, scopes);
    expect(typeof both.refresh_token).toBe("string");
    const first = await (await introspect(both.access_token)).json();
    expect(first).toMatchObject({ active: true, sub: config.ownerUserId, client_id: config.clientId });
    const writeResult = await (await call(both.access_token, "pin_topic", step)).json();
    expect(writeResult.result.structuredContent.status).toBe("unavailable");
    const renewed = await refresh(both.refresh_token);
    expect(renewed.status).toBe(200);
    const next = await renewed.json() as Tokens;
    expect(next.refresh_token).not.toBe(both.refresh_token);
    expect((await (await introspect(next.access_token)).json()).sid).toBe(first.sid);
    const revoked = await form("revoke", { token: next.refresh_token, token_type_hint: "refresh_token" });
    expect(revoked.ok).toBe(true);
    expect(await (await introspect(next.access_token)).json()).toEqual({ active: false });
    expect((await call(next.access_token, "read_admin_overview")).status).toBe(401);
    expect((await refresh(next.refresh_token)).status).toBeGreaterThanOrEqual(400);
  });

  it("never switches to a replacement Owner session after the original is deleted", async () => {
    const original = await login();
    const tokens = await exchange(original, scopes);
    const claims = await (await introspect(tokens.access_token)).json();
    const replacement = await login();
    expect(replacement).not.toBe(original);
    await db.query("delete from session where id=$1", [claims.sid]);
    expect(await (await introspect(tokens.access_token)).json()).toEqual({ active: false });
    expect((await call(tokens.access_token, "read_admin_overview")).status).toBe(401);
    expect((await refresh(tokens.refresh_token)).status).toBeGreaterThanOrEqual(400);
  });
});
