import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createHyperdriveAuthRuntime, type BetterAuthEnvironment } from "../../app/auth/auth.server";
import { AccountSecurityError, type AccountSecurityIdentity } from "../../app/auth/request-context";
import { installRegistrationPolicyFixture } from "./registration-policy-fixture";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required for account security integration tests");
const target = new URL(url);
if (!["127.0.0.1", "localhost"].includes(target.hostname) || !target.pathname.endsWith("_test")) {
  throw new Error("Account security integration tests require a disposable local *_test database");
}
const schema = "auth_security_test";
const client = new Client({ connectionString: url });
const env: BetterAuthEnvironment = {
  BETTER_AUTH_URL: "http://localhost:5173",
  BETTER_AUTH_SECRET: "vico-set05-disposable-test-secret-32-plus",
  GOOGLE_CLIENT_ID: "test-google-client",
  GOOGLE_CLIENT_SECRET: "test-google-secret",
};
function authClient() {
  return new Client({ connectionString: url, options: `-c search_path=${schema}` });
}
const runtime = createHyperdriveAuthRuntime(url, env, () => authClient());
const security = runtime.security!;
type SessionActor = { id: string; cookie: string; identity: AccountSecurityIdentity };
const password = "account-security-password-123";

async function authRequest(path: string, body: object, cookie?: string): Promise<Response> {
  return runtime.handle(new Request(`${env.BETTER_AUTH_URL}/api/auth/${path}`, {
    method: "POST",
    headers: {
      Origin: env.BETTER_AUTH_URL,
      "Content-Type": "application/json",
      "cf-connecting-ip": "203.0.113.75",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  }));
}

async function resolvedActor(response: Response): Promise<SessionActor> {
  expect(response.status).toBe(200);
  const issued = response.headers.getSetCookie().find(item => item.includes("session_token="));
  expect(issued).toBeDefined();
  const cookie = issued!.split(";", 1)[0];
  const current = (await runtime.getSession(new Headers({ Cookie: cookie }))).session;
  expect(current).not.toBeNull();
  return { id: current!.user.id, cookie, identity: {
    userId: current!.user.id, sessionId: current!.session.id,
  } };
}

async function signUp(email: string): Promise<SessionActor> {
  return resolvedActor(await authRequest("sign-up/email", {
    name: email.split("@")[0], email, password,
  }));
}
async function signIn(email: string, secret = password): Promise<Response> {
  return authRequest("sign-in/email", { email, password: secret });
}
async function errorCode(action: Promise<unknown>, code: AccountSecurityError["code"]) {
  await expect(action).rejects.toMatchObject({ name: "AccountSecurityError", code });
}
function headers(actor: SessionActor): Headers { return new Headers({ Cookie: actor.cookie }); }

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  await client.query(`set search_path to ${schema}`);
  const migration = (await readFile("drizzle/0003_gorgeous_donald_blake.sql", "utf8"))
    .replaceAll('"public".', `"${schema}".`)
    .replaceAll("--> statement-breakpoint", "");
  await client.query(migration);
  const stateMigration = (await readFile("drizzle/0065_sa04_account_state_foundation.sql", "utf8"))
    .replaceAll("--> statement-breakpoint", "");
  await client.query(stateMigration);
  await installRegistrationPolicyFixture(client);
});
beforeEach(async () => {
  await client.query('truncate "user", account, "session", verification, rate_limit cascade');
});
afterAll(async () => {
  await client.query("set search_path to public");
  await client.query(`drop schema if exists ${schema} cascade`);
  await client.end();
});

describe("SET-05 request-local Better Auth security capability", () => {
  it("returns only allowlisted methods/session metadata, marks current, and isolates other accounts", async () => {
    const a1 = await signUp("account-a@example.test");
    const a2 = await resolvedActor(await signIn("account-a@example.test"));
    const b = await signUp("account-b@example.test");
    const snapshot = await security.read(headers(a1), a1.identity);
    expect(snapshot.linkedMethods).toEqual(["password"]);
    expect(snapshot.hasPassword).toBe(true);
    expect(snapshot.sessionAccess).toBe("ready");
    expect(snapshot.sessions).toHaveLength(2);
    expect(snapshot.sessions.filter(session => session.current).map(session => session.id))
      .toEqual([a1.identity.sessionId]);
    expect(snapshot.sessions.some(session => session.id === a2.identity.sessionId)).toBe(true);
    expect(snapshot.sessions.some(session => session.id === b.identity.sessionId)).toBe(false);
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain(a1.cookie.split("=", 2)[1]);
    expect(serialized).not.toContain(a2.cookie.split("=", 2)[1]);
    for (const session of snapshot.sessions) {
      expect(Object.keys(session).sort()).toEqual(["createdAt", "current", "deviceLabel", "expiresAt", "id"]);
    }
    await errorCode(security.read(headers(a1), b.identity), "account-changed");
    await errorCode(security.read(new Headers(), a1.identity), "unauthenticated");
  });

  it("refuses current/foreign IDs and revokes only a selected other session", async () => {
    const a1 = await signUp("revoke-one@example.test");
    const a2 = await resolvedActor(await signIn("revoke-one@example.test"));
    const foreign = await signUp("foreign@example.test");
    await errorCode(security.revokeOneOther(headers(a1), a1.identity, a1.identity.sessionId),
      "current-session");
    await errorCode(security.revokeOneOther(headers(a1), a1.identity, foreign.identity.sessionId),
      "session-not-found");
    await errorCode(security.revokeOneOther(headers(a1), foreign.identity, a2.identity.sessionId),
      "account-changed");
    await security.revokeOneOther(headers(a1), a1.identity, a2.identity.sessionId);
    expect((await runtime.getSession(headers(a2))).session).toBeNull();
    expect((await runtime.getSession(headers(a1))).session?.user.id).toBe(a1.id);
    expect((await runtime.getSession(headers(foreign))).session?.user.id).toBe(foreign.id);
    await errorCode(security.revokeOneOther(headers(a1), a1.identity, a2.identity.sessionId),
      "session-not-found");
  });

  it("revoke others preserves the current session and never revokes another account", async () => {
    const a1 = await signUp("revoke-others@example.test");
    const a2 = await resolvedActor(await signIn("revoke-others@example.test"));
    const foreign = await signUp("revoke-others-foreign@example.test");
    await security.revokeAllOthers(headers(a1), a1.identity);
    expect((await runtime.getSession(headers(a2))).session).toBeNull();
    expect((await runtime.getSession(headers(a1))).session?.user.id).toBe(a1.id);
    expect((await runtime.getSession(headers(foreign))).session?.user.id).toBe(foreign.id);
  });

  it("changes only an existing password, denies wrong password, and preserves separate sessions", async () => {
    const a1 = await signUp("password@example.test");
    const a2 = await resolvedActor(await signIn("password@example.test"));
    await errorCode(security.changePassword(headers(a1), a1.identity, "wrong-password",
      "different-password-123"), "invalid-password");
    await security.changePassword(headers(a1), a1.identity, password, "different-password-123");
    expect((await signIn("password@example.test")).status).not.toBe(200);
    expect((await signIn("password@example.test", "different-password-123")).status).toBe(200);
    expect((await runtime.getSession(headers(a1))).session?.user.id).toBe(a1.id);
    expect((await runtime.getSession(headers(a2))).session?.user.id).toBe(a1.id);
  });

  it("shares Better Auth's canonical password-change 3/10s database bucket in both directions", async () => {
    const a1 = await signUp("throttle@example.test");
    const invalidPassword = "incorrect-current-password";
    const newPassword = "throttle-new-password-123";
    const ipA = "203.0.113.91";
    const ipB = "203.0.113.92";
    const ipC = "203.0.113.93";
    function clientHeaders(ip: string): Headers {
      const result = headers(a1);
      result.set("cf-connecting-ip", ip);
      result.set("Origin", env.BETTER_AUTH_URL);
      return result;
    }
    async function canonical(ip: string, currentPassword = invalidPassword): Promise<Response> {
      return runtime.handle(new Request(`${env.BETTER_AUTH_URL}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: env.BETTER_AUTH_URL,
          Cookie: a1.cookie, "cf-connecting-ip": ip },
        body: JSON.stringify({ currentPassword, newPassword, revokeOtherSessions: false }),
      }));
    }

    // The canonical route's first attempt must consume the same slot as Settings.
    expect((await canonical(ipA)).status).toBe(400);
    await errorCode(security.changePassword(clientHeaders(ipA), a1.identity,
      invalidPassword, newPassword), "invalid-password");
    await errorCode(security.changePassword(clientHeaders(ipA), a1.identity,
      invalidPassword, newPassword), "invalid-password");
    const fourth = await security.changePassword(clientHeaders(ipA), a1.identity,
      invalidPassword, newPassword).catch((error: unknown) => error);
    expect(fourth).toMatchObject({ name: "AccountSecurityError", code: "rate-limited",
      retryAfterSeconds: expect.any(Number) });
    expect((fourth as AccountSecurityError).retryAfterSeconds).toBeGreaterThan(0);
    const countRowsA = await client.query(
      "select count from rate_limit where key like $1", ["%/change-password%"],
    );
    expect(countRowsA.rows.map(row => Number(row.count))).toEqual([3]);

    // Reverse ordering: Settings consumes three attempts, canonical must be rejected.
    for (let i = 0; i < 3; i++) {
      await errorCode(security.changePassword(clientHeaders(ipB), a1.identity,
        invalidPassword, newPassword), "invalid-password");
    }
    const canonicalLimited = await canonical(ipB);
    expect(canonicalLimited.status).toBe(429);
    expect(Number(canonicalLimited.headers.get("X-Retry-After"))).toBeGreaterThan(0);

    // Another trusted IP is not locked out, and denied attempts never changed the secret.
    await security.changePassword(clientHeaders(ipC), a1.identity, password, newPassword);
    expect((await signIn("throttle@example.test")).status).not.toBe(200);
    expect((await signIn("throttle@example.test", newPassword)).status).toBe(200);
  });

  it("does not expose OAuth tokens or permit set-password on a Google-only account", async () => {
    const actor = await signUp("oauth-only@example.test");
    await client.query('delete from account where user_id = $1', [actor.id]);
    await client.query(`insert into account
      (id, account_id, provider_id, user_id, access_token, refresh_token, id_token, created_at, updated_at)
      values ($1, $2, 'google', $3, $4, $5, $6, now(), now())`,
      ["synthetic-google-link", "google-account-42", actor.id, "secret-access", "secret-refresh", "secret-id"]);
    const snapshot = await security.read(headers(actor), actor.identity);
    expect(snapshot.linkedMethods).toEqual(["google"]);
    expect(snapshot.hasPassword).toBe(false);
    expect(JSON.stringify(snapshot)).not.toMatch(/secret-access|secret-refresh|secret-id|google-account-42/);
    await errorCode(security.changePassword(headers(actor), actor.identity, password,
      "new-secret-password"), "no-password");
  });

  it("respects library list-sessions freshness and refuses a stale session for one-session revoke", async () => {
    const a1 = await signUp("stale@example.test");
    const a2 = await resolvedActor(await signIn("stale@example.test"));
    await client.query(`update "session" set created_at = now() - interval '2 days'
      where id = $1`, [a1.identity.sessionId]);
    const snapshot = await security.read(headers(a1), a1.identity);
    expect(snapshot.linkedMethods).toEqual(["password"]);
    expect(snapshot.sessionAccess).toBe("not-fresh");
    expect(snapshot.sessions).toEqual([]);
    await errorCode(security.revokeOneOther(headers(a1), a1.identity, a2.identity.sessionId),
      "not-fresh");
    await errorCode(security.revokeAllOthers(headers(a1), a1.identity), "not-fresh");
    expect((await runtime.getSession(headers(a2))).session?.user.id).toBe(a2.id);
  });

  it("rejects a revoked or expired caller session before any self-service write", async () => {
    const a1 = await signUp("expired@example.test");
    const a2 = await resolvedActor(await signIn("expired@example.test"));
    await client.query(`update "session" set expires_at = now() - interval '1 minute'
      where id = $1`, [a1.identity.sessionId]);
    await errorCode(security.revokeAllOthers(headers(a1), a1.identity), "unauthenticated");
    await errorCode(security.changePassword(headers(a1), a1.identity, password,
      "replacement-password-123"), "unauthenticated");
    expect((await runtime.getSession(headers(a2))).session?.user.id).toBe(a2.id);
    expect((await signIn("expired@example.test")).status).toBe(200);
  });
});
