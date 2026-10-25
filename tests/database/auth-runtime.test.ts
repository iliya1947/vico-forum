import { readFile } from "node:fs/promises";

import { betterAuth } from "better-auth";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { RouterContextProvider } from "react-router";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  betterAuthOptions,
  createHyperdriveAuthRuntime,
  type BetterAuthEnvironment,
} from "../../app/auth/auth.server";
import { AuthSessionUnavailableError, authSessionForRequest } from "../../app/auth/request-context";
import { initializeAuthContext, withAuthSessionCookies } from "../../app/auth/session-context";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for the disposable database integration test");
}

const parsedDatabaseUrl = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost"].includes(parsedDatabaseUrl.hostname) ||
  !parsedDatabaseUrl.pathname.endsWith("_test")
) {
  throw new Error("Database integration tests only run against a local database ending in _test");
}

const schemaName = "auth_runtime_test";
const client = new Client({ connectionString: databaseUrl });
const env: BetterAuthEnvironment = {
  BETTER_AUTH_SECRET: "vico-forum-auth-integration-secret-32-plus",
  BETTER_AUTH_URL: "http://localhost:5173",
  GOOGLE_CLIENT_ID: "test-google-client",
  GOOGLE_CLIENT_SECRET: "test-google-secret",
};

function authClient() {
  return new Client({
    connectionString: databaseUrl,
    options: `-c search_path=${schemaName}`,
  });
}

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schemaName} cascade; create schema ${schemaName}`);
  await client.query(`set search_path to ${schemaName}`);

  const authMigration = (await readFile("drizzle/0003_gorgeous_donald_blake.sql", "utf8"))
    .replaceAll('"public".', `"${schemaName}".`)
    .replaceAll("--> statement-breakpoint", "");
  await client.query(authMigration);
});

afterAll(async () => {
  await client.query("set search_path to public");
  await client.query(`drop schema if exists ${schemaName} cascade`);
  await client.end();
});

describe("Better Auth PostgreSQL runtime", () => {
  it("keeps a new login after pre-routing cleanup of an expired session cookie", async () => {
    const runtime = createHyperdriveAuthRuntime(databaseUrl, env, () => authClient());
    const headers = { "content-type": "application/json", Origin: env.BETTER_AUTH_URL, "cf-connecting-ip": "203.0.113.40" };
    const body = { name: "Cookie ordering", email: "cookie-order@example.test", password: "integration-password-123" };
    const signup = await runtime.handle(new Request(`${env.BETTER_AUTH_URL}/api/auth/sign-up/email`, {
      method: "POST", headers, body: JSON.stringify(body),
    }));
    expect(signup.status).toBe(200);
    const oldCookie = signup.headers.getSetCookie().find((cookie) => cookie.includes("session_token="))!.split(";", 1)[0];
    await client.query(`update "session" set expires_at = now() - interval '1 minute'
      where user_id = (select id from "user" where email = $1)`, [body.email]);
    const request = new Request(`${env.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
      method: "POST", headers: { ...headers, Cookie: oldCookie }, body: JSON.stringify(body),
    });
    const preliminary = await initializeAuthContext(new RouterContextProvider(), request, runtime);
    expect(preliminary.getSetCookie().some((cookie) => cookie.includes("Max-Age=0"))).toBe(true);
    const response = withAuthSessionCookies(await runtime.handle(request), preliminary);
    expect(response.status).toBe(200);
    const finalCookie = response.headers.getSetCookie().filter((cookie) => cookie.includes("session_token=")).at(-1)!.split(";", 1)[0];
    expect(finalCookie).not.toBe(oldCookie);
    expect((await runtime.getSession(new Headers({ Cookie: finalCookie }))).session?.user.email).toBe(body.email);

    // Actual get-session query failure inside Better Auth, whose API layer hides its cause.
    const outage = Object.assign(new Error("synthetic connection reset"), { code: "ECONNRESET" });
    const failing = createHyperdriveAuthRuntime(databaseUrl, env, () => {
      const connection = authClient();
      vi.spyOn(connection, "query").mockImplementation((() => Promise.reject(outage)) as never);
      return connection;
    });
    await expect(failing.getSession(new Headers({ Cookie: finalCookie })))
      .rejects.toBeInstanceOf(AuthSessionUnavailableError);
    const schemaFailure = createHyperdriveAuthRuntime(databaseUrl, env, () => new Client({
      connectionString: databaseUrl, options: "-c search_path=missing_auth_schema",
    }));
    await expect(schemaFailure.getSession(new Headers({ Cookie: finalCookie })))
      .rejects.not.toBeInstanceOf(AuthSessionUnavailableError);
  });

  it("requires local authentication before linking a same-email Google identity", async () => {
    const email = "local-google@example.test";
    let providerVerified = true;
    const auth = betterAuth({
      ...betterAuthOptions(drizzle(client), env),
      socialProviders: { google: {
        clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET,
        // Only the provider boundary is synthetic; no Google network calls or credentials.
        verifyIdToken: async () => true,
        getUserInfo: async () => ({ user: { email, emailVerified: providerVerified, name: "Google owner" },
          data: { sub: "google-owner", email, email_verified: providerVerified, name: "Google owner",
            aud: env.GOOGLE_CLIENT_ID, azp: env.GOOGLE_CLIENT_ID, exp: 2000000000, iat: 1900000000,
            iss: "https://accounts.google.com", jti: "test", family_name: "Owner", given_name: "Google", picture: "" } }),
      } },
    });
    const call = (path: string, body: object, cookie?: string, expectedUserId?: string) => auth.handler(new Request(`${env.BETTER_AUTH_URL}/api/auth/${path}`, {
      method: "POST", headers: { "content-type": "application/json", Origin: env.BETTER_AUTH_URL,
        "cf-connecting-ip": "203.0.113.41", ...(cookie ? { Cookie: cookie } : {}),
        ...(expectedUserId ? { "x-vico-link-user": expectedUserId } : {}) }, body: JSON.stringify(body),
    }));
    const signup = await call("sign-up/email", { name: "Local owner", email, password: "integration-password-123" });
    expect(signup.status).toBe(200);
    const local = await signup.json() as { user: { id: string; emailVerified: boolean } };
    expect(local.user.emailVerified).toBe(false);
    const cookie = signup.headers.getSetCookie().find((entry) => entry.includes("session_token="))!.split(";", 1)[0];
    const social = { provider: "google", idToken: { token: "synthetic-provider-token" } };
    const implicit = await call("sign-in/social", social);
    expect(implicit.ok).toBe(false);
    expect(implicit.headers.getSetCookie().some((entry) => entry.includes("session_token="))).toBe(false);
    expect((await client.query(`select count(*)::int as count from account where user_id = $1 and provider_id = 'google'`, [local.user.id])).rows[0].count).toBe(0);
    expect((await call("link-social", social)).status).toBe(401);
    // A different authenticated account cannot link this Google email either.
    const other = await call("sign-up/email", { name: "Other", email: "other-google@example.test", password: "integration-password-123" });
    const otherUser = await other.json() as { user: { id: string } };
    const otherCookie = other.headers.getSetCookie().find((entry) => entry.includes("session_token="))!.split(";", 1)[0];
    const mismatchedEmail = await call("link-social", social, otherCookie, otherUser.user.id);
    expect(mismatchedEmail.status).toBe(401);
    expect((await mismatchedEmail.json() as { code: string }).code).toBe("LINKING_DIFFERENT_EMAILS_NOT_ALLOWED");
    providerVerified = false;
    const unverifiedProvider = await call("link-social", social, cookie, local.user.id);
    expect(unverifiedProvider.status).toBe(401);
    expect((await unverifiedProvider.json() as { code: string }).code).toBe("LINKING_NOT_ALLOWED");
    providerVerified = true;
    expect((await call("link-social", social, cookie, local.user.id)).status).toBe(200);
    const signedIn = await call("sign-in/social", social);
    expect(signedIn.status).toBe(200);
    expect((await signedIn.json() as { user: { id: string } }).user.id).toBe(local.user.id);
  });

  it("preserves sliding-session Set-Cookie through the application request boundary", async () => {
    const auth = betterAuth({
      ...betterAuthOptions(drizzle(client), env),
      emailAndPassword: { enabled: true },
    });

    const signUp = await auth.handler(new Request(`${env.BETTER_AUTH_URL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": "203.0.113.10",
        Origin: env.BETTER_AUTH_URL,
      },
      body: JSON.stringify({
        name: "Auth Integration",
        email: "auth-integration@example.test",
        password: "integration-password-123",
      }),
    }));

    expect(signUp.status).toBe(200);
    const issuedSessionCookie = signUp.headers.getSetCookie()
      .find((cookie) => cookie.includes("session_token="));
    expect(issuedSessionCookie).toBeDefined();
    const cookieHeader = issuedSessionCookie?.split(";", 1)[0];
    if (!cookieHeader) throw new Error("Better Auth did not issue a session cookie");

    const sessionBefore = await client.query<{ expires_at: Date; id: string }>(
      `select s.id, s.expires_at
         from "session" s
         join "user" u on u.id = s.user_id
        where u.email = $1`,
      ["auth-integration@example.test"],
    );
    const sessionRow = sessionBefore.rows[0];
    if (!sessionRow) throw new Error("Better Auth did not persist the session");

    await client.query(
      `update "session"
          set expires_at = now() + interval '5 days',
              updated_at = now() - interval '2 days'
        where id = $1`,
      [sessionRow.id],
    );
    const stagedExpiry = (await client.query<{ expires_at: Date }>(
      `select expires_at from "session" where id = $1`,
      [sessionRow.id],
    )).rows[0]?.expires_at;
    if (!stagedExpiry) throw new Error("Failed to stage the session refresh threshold");

    const runtime = createHyperdriveAuthRuntime(databaseUrl, env, () => authClient());
    const request = new Request(`${env.BETTER_AUTH_URL}/en`, {
      headers: {
        Cookie: cookieHeader,
        "cf-connecting-ip": "203.0.113.10",
      },
    });
    const context = new RouterContextProvider();
    const authHeaders = await initializeAuthContext(context, request, runtime);
    const finalResponse = withAuthSessionCookies(new Response("ok"), authHeaders);

    expect(authSessionForRequest(context)?.user.email).toBe("auth-integration@example.test");
    expect(finalResponse.headers.getSetCookie().some((cookie) => cookie.includes("session_token="))).toBe(true);

    const refreshedExpiry = (await client.query<{ expires_at: Date }>(
      `select expires_at from "session" where id = $1`,
      [sessionRow.id],
    )).rows[0]?.expires_at;
    expect(refreshedExpiry?.getTime()).toBeGreaterThan(stagedExpiry.getTime());

    const getSessionResponse = await runtime.handle(new Request(
      `${env.BETTER_AUTH_URL}/api/auth/get-session`,
      {
        headers: {
          Cookie: cookieHeader,
          "cf-connecting-ip": "203.0.113.10",
        },
      },
    ));
    expect(getSessionResponse.status).toBe(200);
    await expect(getSessionResponse.json()).resolves.toMatchObject({
      user: { email: "auth-integration@example.test" },
      session: { id: sessionRow.id },
    });

    const guest = await runtime.getSession(new Headers({
      "cf-connecting-ip": "203.0.113.11",
    }));
    expect(guest.session).toBeNull();

    await client.query(
      `update "session" set expires_at = now() - interval '1 minute' where id = $1`,
      [sessionRow.id],
    );
    const expired = await runtime.getSession(new Headers({
      Cookie: cookieHeader,
      "cf-connecting-ip": "203.0.113.10",
    }));
    expect(expired.session).toBeNull();
    expect(expired.headers.getSetCookie().some((cookie) => cookie.includes("session_token="))).toBe(true);
    expect((await client.query<{ count: string }>(
      `select count(*)::text as count from "session" where id = $1`,
      [sessionRow.id],
    )).rows[0]?.count).toBe("0");
  });
});
