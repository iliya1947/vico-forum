import { readFile } from "node:fs/promises";
import { betterAuth } from "better-auth";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { betterAuthOptions } from "../../app/auth/auth.server";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const target = new URL(databaseUrl);
if (!["127.0.0.1", "localhost"].includes(target.hostname) || !target.pathname.endsWith("_test")) {
  throw new Error("Auth integration tests require a disposable local *_test database");
}
const client = new Client({ connectionString: databaseUrl });
const schema = "auth_link_identity_test";
const origin = "http://localhost:5173";
const env = { BETTER_AUTH_URL: origin, BETTER_AUTH_SECRET: "local-link-identity-secret-more-than-32-characters",
  GOOGLE_CLIENT_ID: "synthetic-client", GOOGLE_CLIENT_SECRET: "synthetic-secret" };

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  await client.query(`set search_path to ${schema}`);
  await client.query((await readFile("drizzle/0003_gorgeous_donald_blake.sql", "utf8"))
    .replaceAll('"public".', `"${schema}".`).replaceAll("--> statement-breakpoint", ""));
});
beforeEach(async () => {
  await client.query('truncate "user", account, "session", verification, rate_limit cascade');
});
afterAll(async () => {
  await client.query("set search_path to public");
  await client.query(`drop schema if exists ${schema} cascade`);
  await client.end();
});

it.each([
  { name: "stale A/current B", current: "B", expected: "A", provider: "B", verified: true, initiation: 409, linked: false },
  { name: "normal A/A", current: "A", expected: "A", provider: "A", verified: true, initiation: 200, linked: true },
  { name: "mismatched provider email", current: "A", expected: "A", provider: "B", verified: true, initiation: 200, linked: false },
  { name: "unverified provider", current: "A", expected: "A", provider: "A", verified: false, initiation: 200, linked: false },
  { name: "guest", current: "guest", expected: "A", provider: "A", verified: true, initiation: 401, linked: false },
  { name: "missing expectation", current: "B", expected: "missing", provider: "B", verified: true, initiation: 409, linked: false },
  { name: "session changes after state is issued", current: "A", expected: "A", provider: "A", verified: true, initiation: 200, linked: true, callbackUser: "B" },
  { name: "foreign origin", current: "A", expected: "A", provider: "A", verified: true, initiation: 403, linked: false, foreignOrigin: true },
])("protects $name", async (scenario) => {
  const email = `${scenario.provider.toLowerCase()}@example.test`;
  const options = betterAuthOptions(drizzle(client), env);
  const auth = betterAuth({ ...options,
    // Better Auth defaults to skipping origin validation in test mode; exercise production gates.
    advanced: { ...options.advanced, disableOriginCheck: false, disableCSRFCheck: false },
    socialProviders: { google: {
    clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET,
    // Synthetic provider ownership/code exchange only; handlers, signed state and PG writes are real.
    getUserInfo: async () => ({ user: { email, emailVerified: scenario.verified, name: "Google owner" },
      data: { sub: `google-${scenario.provider}`, email, email_verified: scenario.verified, name: "Google owner",
        aud: env.GOOGLE_CLIENT_ID, azp: env.GOOGLE_CLIENT_ID, exp: 2000000000, iat: 1900000000,
        iss: "https://accounts.google.com", jti: "test", family_name: "Owner", given_name: "Google", picture: "" } }),
  } } });
  const context = await auth.$context;
  if (!Array.isArray(context.socialProviders)) throw new Error("Unexpected provider container");
  const google = context.socialProviders.find((provider) => provider.id === "google");
  if (!google) throw new Error("Missing Google provider");
  google.validateAuthorizationCode = async () => ({ accessToken: "synthetic-local-access-token" });
  const call = (path: string, body: object, headers: Record<string, string> = {}) => auth.handler(new Request(`${origin}/api/auth/${path}`, {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "cf-connecting-ip": "203.0.113.51", ...headers }, body: JSON.stringify(body),
  }));
  const users: Record<string, { id: string; cookie: string }> = {};
  for (const name of ["A", "B"]) {
    const signup = await call("sign-up/email", { name, email: `${name.toLowerCase()}@example.test`, password: "local-link-password-123" });
    expect(signup.status).toBe(200);
    const value = await signup.json() as { user: { id: string } };
    users[name] = { id: value.user.id, cookie: signup.headers.getSetCookie().find((cookie) => cookie.includes("session_token="))!.split(";", 1)[0] };
  }
  const callbackURL = `/en/users/${users.A.id}`;
  const headers: Record<string, string> = {};
  if (scenario.current !== "guest") headers.Cookie = users[scenario.current].cookie;
  if (scenario.expected !== "missing") headers["x-vico-link-user"] = users[scenario.expected].id;
  if ("foreignOrigin" in scenario) headers.Origin = "https://other.example.test";
  const findSession = vi.spyOn(context.internalAdapter, "findSession");
  const initiation = await call("link-social", { provider: "google", callbackURL, errorCallbackURL: `${callbackURL}?linkError=1` }, headers);
  expect(initiation.status).toBe(scenario.initiation);
  if (scenario.initiation !== 200) {
    expect((await client.query("select count(*)::int as count from verification")).rows[0].count).toBe(0);
    expect((await client.query("select count(*)::int as count from account where provider_id = 'google'")).rows[0].count).toBe(0);
    return;
  }
  // The handler must use the checked request-local session when it mints link state.
  expect(findSession).toHaveBeenCalledTimes(1);
  const result = await initiation.json() as { url: string };
  const state = new URL(result.url).searchParams.get("state");
  expect(state).toBeTruthy();
  const callbackCookie = "callbackUser" in scenario && scenario.callbackUser ? users[scenario.callbackUser].cookie : headers.Cookie;
  const cookies = [callbackCookie, ...initiation.headers.getSetCookie().map((cookie) => cookie.split(";", 1)[0])].join("; ");
  const callback = await auth.handler(new Request(`${origin}/api/auth/callback/google?code=synthetic-code&state=${encodeURIComponent(state!)}`, { headers: { Cookie: cookies } }));
  expect(callback.status).toBe(302);
  const accounts = (await client.query<{ user_id: string }>("select user_id from account where provider_id = 'google'")).rows;
  expect(accounts).toHaveLength(scenario.linked ? 1 : 0);
  if (scenario.linked) {
    expect(accounts[0].user_id).toBe(users.A.id);
    expect(callback.headers.get("Location")).toContain(callbackURL);
  } else {
    expect(callback.headers.get("Location")).toContain("error=");
  }
});
