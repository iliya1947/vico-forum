import { readFile } from "node:fs/promises";

import { betterAuth } from "better-auth";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { RouterContextProvider } from "react-router";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  betterAuthOptions,
  createHyperdriveAuthRuntime,
  type BetterAuthEnvironment,
} from "../../app/auth/auth.server";
import { authSessionForRequest } from "../../app/auth/request-context";
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
