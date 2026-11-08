import { readdir, readFile } from "node:fs/promises";
import { betterAuth } from "better-auth";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { betterAuthOptions } from "../../app/auth/auth.server";
import { createRegistrationAdmission } from "../../app/auth/registration-admission";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !["127.0.0.1", "localhost"].includes(new URL(databaseUrl).hostname)
  || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error("SET-02 auth admission integration requires a disposable loopback *_test DB");
}
const schema = "registration_auth_admission_test";
const origin = "http://localhost:3000";
const env = {
  BETTER_AUTH_SECRET: "registration-admission-local-test-secret-at-least-32-characters",
  BETTER_AUTH_URL: origin,
  GOOGLE_CLIENT_ID: "local-synthetic-google",
  GOOGLE_CLIENT_SECRET: "unused-synthetic-provider-secret",
};
const client = new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
let googleEmail = "";
const options = betterAuthOptions(drizzle(client), env);
const auth = betterAuth({
  ...options,
  // The real Better Auth handler, user/account/session adapter and identity policy
  // execute against PostgreSQL; only Google's remote identity exchange is synthetic.
  socialProviders: { google: {
    clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET,
    verifyIdToken: async () => true,
    getUserInfo: async () => ({
      user: { email: googleEmail, emailVerified: true, name: "Synthetic Google member" },
      data: { sub: `google-${googleEmail}`, email: googleEmail, email_verified: true,
        name: "Synthetic Google member", iss: "https://accounts.google.com", aud: env.GOOGLE_CLIENT_ID,
        azp: env.GOOGLE_CLIENT_ID, exp: 2000000000, iat: 1900000000,
        jti: "synthetic-jti", family_name: "Member", given_name: "Google", picture: "" },
    }),
  } },
});

let nextIp = 40;
const request = (path: string, body: object, headers: Record<string, string> = {}) =>
  auth.handler(new Request(`${origin}/api/auth/${path}`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json",
      "cf-connecting-ip": `203.0.113.${nextIp++}`, ...headers },
    body: JSON.stringify(body),
  }));
const emailSignUp = (email: string) =>
  request("sign-up/email", { email, name: "Forum member", password: "registration-secret-123" });
const emailSignIn = (email: string) =>
  request("sign-in/email", { email, password: "registration-secret-123" });
const googleSignIn = (email: string) => {
  googleEmail = email;
  return request("sign-in/social", { provider: "google", idToken: { token: "synthetic-provider-token" } });
};
const flags = (google: boolean, email: boolean) =>
  client.query("update forum_registration_settings set google_registration_enabled=$1, email_registration_enabled=$2, version=version+1 where id=1", [google, email]);
const userCount = async (email: string) =>
  Number((await client.query<{ n: number }>('select count(*)::int as n from "user" where email=$1', [email])).rows[0].n);
const errorCode = async (response: Response) => (await response.json() as { code?: string }).code;

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const file of (await readdir("drizzle")).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort()) {
    await client.query((await readFile(`drizzle/${file}`, "utf8")).replaceAll('"public".', `"${schema}".`));
  }
  const context = await auth.$context;
  const providers = context.socialProviders;
  if (!Array.isArray(providers)) throw new Error("Unexpected Better Auth provider configuration");
  const google = providers.find(provider => provider.id === "google");
  if (!google) throw new Error("Synthetic Google provider missing");
  google.validateAuthorizationCode = async () => ({ accessToken: "unused-local-token" });
});
beforeEach(async () => {
  await client.query('truncate "user", account, session, verification, rate_limit cascade');
  await flags(true, true);
});
afterAll(async () => {
  await client.query(`drop schema if exists ${schema} cascade`);
  await client.end();
});

describe("SET-02 Better Auth 1.7.7 new-account admission", () => {
  it("denies a new email user when only email registration is closed, while Google may register", async () => {
    await flags(true, false);
    const blockedEmail = "closed-email@example.test";
    const denied = await emailSignUp(blockedEmail);
    expect(denied.status).toBe(403);
    expect(await errorCode(denied)).toBe("vico_email_registration_closed");
    expect(await userCount(blockedEmail)).toBe(0);

    const googleEmail = "open-google@example.test";
    expect((await googleSignIn(googleEmail)).status).toBe(200);
    expect(await userCount(googleEmail)).toBe(1);
  });

  it("denies first-time Google creation when Google is closed, without blocking new email accounts", async () => {
    await flags(false, true);
    const blockedGoogle = "closed-google@example.test";
    const denied = await googleSignIn(blockedGoogle);
    expect(denied.status).toBe(403);
    expect(await errorCode(denied)).toBe("vico_google_registration_closed");
    expect(await userCount(blockedGoogle)).toBe(0);
    expect((await client.query("select count(*)::int as n from account where provider_id='google'")).rows[0].n).toBe(0);

    const email = "open-email@example.test";
    expect((await emailSignUp(email)).status).toBe(200);
    expect(await userCount(email)).toBe(1);
  });

  it("keeps both existing email and Google sign-in working after both methods close", async () => {
    const email = "existing-email@example.test";
    const google = "existing-google@example.test";
    expect((await emailSignUp(email)).status).toBe(200);
    const first = await googleSignIn(google);
    expect(first.status).toBe(200);
    await flags(false, false);

    expect((await emailSignIn(email)).status).toBe(200);
    expect((await googleSignIn(google)).status).toBe(200);
    expect((await emailSignUp("new-email-after-closure@example.test")).status).toBe(403);
    expect((await googleSignIn("new-google-after-closure@example.test")).status).toBe(403);
    expect((await client.query('select count(*)::int as n from "user"')).rows[0].n).toBe(2);
  });

  it("allows explicit same-account Google linking while Google registration is closed", async () => {
    const email = "existing-to-link@example.test";
    const signUp = await emailSignUp(email);
    expect(signUp.status).toBe(200);
    const current = await signUp.json() as { user: { id: string } };
    const cookie = signUp.headers.getSetCookie().find(value => value.includes("session_token="))!.split(";", 1)[0];
    await flags(false, false);
    googleEmail = email;
    const linked = await request("link-social", {
      provider: "google", idToken: { token: "synthetic-provider-token" },
    }, { Cookie: cookie, "x-vico-link-user": current.user.id });
    expect(linked.status).toBe(200);
    const accounts = (await client.query<{ user_id: string }>(
      "select user_id from account where provider_id='google'")).rows;
    expect(accounts).toEqual([{ user_id: current.user.id }]);
    expect(await userCount(email)).toBe(1);
    expect((await googleSignIn(email)).status).toBe(200);
  });

  it("rejects implicit Google same-email linking even for a verified local email; explicit link still works", async () => {
    // Unverified local emails are already guarded by Better Auth's separate default gate.
    // Verify the stricter current requirement with BOTH the local and Google emails verified.
    expect(options.account?.accountLinking?.disableImplicitLinking).toBe(true);
    const email = "verified-local-google@example.test";
    const signup = await emailSignUp(email);
    expect(signup.status).toBe(200);
    const { user: { id: userId } } = await signup.json() as { user: { id: string } };
    const cookie = signup.headers.getSetCookie().find(value => value.includes("session_token="))!.split(";", 1)[0];
    await client.query('update "user" set email_verified=true where id=$1', [userId]);
    const beforeSessions = (await client.query<{ count: number }>(
      'select count(*)::int as count from "session" where user_id=$1', [userId])).rows[0].count;

    const implicit = await googleSignIn(email);
    expect(implicit.ok).toBe(false);
    expect(implicit.headers.getSetCookie().some(value => value.includes("session_token="))).toBe(false);
    expect((await client.query<{ count: number }>(
      "select count(*)::int as count from account where provider_id='google' and user_id=$1", [userId])).rows[0].count).toBe(0);
    expect((await client.query<{ count: number }>(
      'select count(*)::int as count from "session" where user_id=$1', [userId])).rows[0].count).toBe(beforeSessions);
    expect(await userCount(email)).toBe(1);

    // A closed Google *registration* must not prevent the real authenticated linkSocial path.
    await flags(false, true);
    googleEmail = email;
    const explicit = await request("link-social", {
      provider: "google", idToken: { token: "synthetic-provider-token" },
    }, { Cookie: cookie, "x-vico-link-user": userId });
    expect(explicit.status).toBe(200);
    const linked = (await client.query<{ user_id: string }>(
      "select user_id from account where provider_id='google'")).rows;
    expect(linked).toEqual([{ user_id: userId }]);
    expect((await googleSignIn(email)).status).toBe(200);
    expect(await userCount(email)).toBe(1);
  });

  it("fails closed if the authoritative policy row is absent, but preserves returning sign-in", async () => {
    const email = "existing-with-policy-failure@example.test";
    expect((await emailSignUp(email)).status).toBe(200);
    await client.query("delete from forum_registration_settings where id=1");
    try {
      const result = await emailSignUp("missing-policy-new@example.test");
      expect(result.ok).toBe(false);
      expect(await userCount("missing-policy-new@example.test")).toBe(0);
      expect((await emailSignIn(email)).status).toBe(200);
      const hook = createRegistrationAdmission(drizzle(client));
      await expect(hook({ user: { email: "missing-policy-hook@example.test" },
        source: { action: "create-user", method: "email-password" } }, {} as never))
        .rejects.toThrow("Registration settings singleton");
      await expect(hook({ user: { email }, source: {
        action: "link-account", method: "oauth", oauth: { providerId: "google" },
      } }, {} as never)).resolves.toBeUndefined();
    } finally {
      await client.query("insert into forum_registration_settings(id) values(1)");
    }
  });
});
