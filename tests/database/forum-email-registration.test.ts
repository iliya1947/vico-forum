import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAuth, createHyperdriveAuthRuntime } from "../../app/auth/auth.server";
import { drizzle } from "drizzle-orm/node-postgres";
import type { AuthMailRuntime } from "../../app/auth/auth-mail.server";
import { buildAuthMailActionURL } from "../../app/auth/auth-mail-urls.server";
import { localeRegistry } from "../../app/localization/registry";
import { syntheticAttemptIngressSource } from "../../app/observability/attempt-source";
import { installRegistrationPolicyFixture } from "./registration-policy-fixture";

const configuredDatabaseUrl = process.env.DATABASE_URL;
if (!configuredDatabaseUrl) throw new Error("DATABASE_URL is required");
const databaseUrl: string = configuredDatabaseUrl;
const url = new URL(databaseUrl);
if (!["localhost", "127.0.0.1"].includes(url.hostname) || !url.pathname.endsWith("_test")) {
  throw new Error("Disposable local test database required");
}

const schema = "forum_email_registration_test";
const setup = new Client({ connectionString: databaseUrl });
const credentials = {
  BETTER_AUTH_SECRET: "local-email-registration-test-secret-at-least-32-chars",
  BETTER_AUTH_URL: "http://localhost:3000",
  GOOGLE_CLIENT_ID: "unused-google-client",
  GOOGLE_CLIENT_SECRET: "unused-google-secret",
};
const connection = (connectionString = databaseUrl) =>
  new Client({ connectionString, options: `-c search_path=${schema}` });
const sent: { recipient: string; token: string; url: string }[] = [];
const mail: AuthMailRuntime = {
  async buildActionURL(action) {
    return buildAuthMailActionURL(credentials.BETTER_AUTH_URL, localeRegistry, action);
  },
  async sendAuthMail(input) {
    const committed = await setup.query(`
      select u.id from ${schema}."user" u join ${schema}.account a on a.user_id=u.id
      join ${schema}.verification v on v.value::jsonb->>'userId'=u.id
      where u.email=$1 and not u.email_verified and a.provider_id='credential'
        and v.value::jsonb->>'generation'=$2
    `, [input.recipient, input.operationId]);
    if (committed.rowCount !== 1) throw new Error("Verification delivery before commit");
    const token = new URL(input.actionURL).searchParams.get("token");
    if (!token) throw new Error("Missing verification proof");
    sent.push({ recipient: input.recipient, token, url: input.actionURL });
    return { status: "accepted" };
  },
};
function runtime(ip: string) {
  return createHyperdriveAuthRuntime(databaseUrl, credentials, connection, undefined, undefined,
    { ingress: syntheticAttemptIngressSource(ip), mail });
}
const call = (req: Request) => runtime(req.headers.get("cf-connecting-ip") ?? "203.0.113.99").handle(req);
function issued(email: string) {
  const proof = sent.filter(item => item.recipient === email).at(-1);
  if (!proof) throw new Error("No test verification mail");
  return proof;
}
async function verified(email: string) {
  const result = await setup.query<{ email_verified: boolean }>(
    `select email_verified from ${schema}."user" where email=$1`, [email]);
  return result.rows[0]?.email_verified;
}
const sessionRows = async () => (await setup.query(
  `select id,user_id,token,expires_at,updated_at from ${schema}.session order by id`)).rows;
function getProof(endpoint: string, token: string, ip: string) {
  return new Request(credentials.BETTER_AUTH_URL + "/api/auth/" + endpoint + "?token=" + encodeURIComponent(token),
    { headers: { "cf-connecting-ip": ip } });
}

function request(endpoint: string, body: Record<string, string>, ip = "203.0.113.71") {
  return new Request(`http://localhost:3000/api/auth/${endpoint}`, {
    method: "POST",
    headers: {
      Origin: "http://localhost:3000",
      "Content-Type": "application/json",
      "cf-connecting-ip": ip,
    },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  await setup.connect();
  await setup.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  const sql = (await readFile("drizzle/0003_gorgeous_donald_blake.sql", "utf8"))
    .replaceAll('"public".', `"${schema}".`);
  const migrator = new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
  await migrator.connect();
  try {
    await migrator.query(sql);
    const stateMigration = (await readFile("drizzle/0065_sa04_account_state_foundation.sql", "utf8"))
      .replaceAll("--> statement-breakpoint", "");
    await migrator.query(stateMigration);
    await installRegistrationPolicyFixture(migrator);
    await migrator.query(await readFile("drizzle/0073_auth_account_uniqueness.sql", "utf8"));
    await migrator.query(await readFile("drizzle/0074_auth_lifecycle_budget.sql", "utf8"));
  } finally { await migrator.end(); }
});

afterAll(async () => {
  await setup.query(`drop schema if exists ${schema} cascade`);
  await setup.end();
});

describe("Better Auth email/password registration and login on PostgreSQL 17", () => {
  it("creates a pending credential account without a session and verifies only through POST", async () => {
    const signUp = await call(request("sign-up/email", {
      name: "New Forum Member",
      email: "new-forum-member@example.org",
      password: "strong secret 123",
    }));
    expect(signUp.status).toBe(200);

    const record = await setup.query<{
      name: string; email_verified: boolean; password: string; provider_id: string;
    }>(`select u.name, u.email_verified, a.password, a.provider_id
      from ${schema}."user" u join ${schema}.account a on a.user_id = u.id
      where u.email = $1`, ["new-forum-member@example.org"]);
    expect(record.rows).toHaveLength(1);
    expect(record.rows[0]?.name).toBe("New Forum Member");
    expect(record.rows[0]?.email_verified).toBe(false);
    expect(record.rows[0]?.provider_id).toBe("credential");
    expect(record.rows[0]?.password).toBeTruthy();
    expect(record.rows[0]?.password).not.toBe("strong secret 123");

    expect(await signUp.json()).toEqual({ status: true, token: null });
    expect(signUp.headers.getSetCookie()).toEqual([]);
    expect(await sessionRows()).toEqual([]);
    const email = "new-forum-member@example.org", password = "strong secret 123";
    const { token, url } = issued(email);
    expect(new URL(url).pathname).toBe("/en/verify-email");
    const denied = await call(request("sign-in/email", { email, password }, "203.0.113.81"));
    expect(denied.ok).toBe(false);
    expect(denied.headers.getSetCookie()).toEqual([]);
    const legacyGet = await call(getProof("verify-email", token, "203.0.113.82"));
    expect(legacyGet.ok).toBe(false);
    for (const ip of ["203.0.113.83", "203.0.113.84"]) {
      const inspect = await call(getProof("inspect-email-verification", token, ip));
      expect(inspect.status).toBe(200);
      expect(inspect.headers.get("Referrer-Policy")).toBe("no-referrer");
      expect(inspect.headers.getSetCookie()).toEqual([]);
      expect(await inspect.json()).toEqual({ status: true });
      expect(await verified(email)).toBe(false);
    }
    const confirmed = await call(request("verify-email", { token }, "203.0.113.85"));
    expect(confirmed.status).toBe(200);
    expect(confirmed.headers.getSetCookie()).toEqual([]);
    expect(await confirmed.json()).toEqual({ status: true });
    expect(await verified(email)).toBe(true);
    expect(await sessionRows()).toEqual([]);
    const replay = await call(request("verify-email", { token }, "203.0.113.86"));
    expect(replay.status).toBe(400);
    const signedIn = await call(request("sign-in/email", { email, password }, "203.0.113.87"));
    expect(signedIn.status).toBe(200);
    const cookie = signedIn.headers.getSetCookie().map(item => item.split(";")[0]).join("; ");
    expect(cookie).toContain("session_token");
    expect((await runtime("203.0.113.87").getSession(new Headers({ Cookie: cookie }))).session?.user.email).toBe(email);
  });

  it("rejects an incorrect password and accepts its own registered email/password fixture", async () => {
    const email = "email-login-fixture@example.org";
    const password = "independent secret 456";

    const signUp = await call(request("sign-up/email", {
      name: "Email Login Fixture",
      email,
      password,
    }, "203.0.113.75"));
    expect(signUp.status).toBe(200);
    expect((await call(request("verify-email", { token: issued(email).token }, "203.0.113.88"))).status).toBe(200);

    const invalid = await call(request("sign-in/email", {
      email, password: "incorrect password",
    }, "203.0.113.76"));
    expect(invalid.ok).toBe(false);

    const valid = await call(request("sign-in/email", {
      email, password,
    }, "203.0.113.77"));
    expect(valid.status).toBe(200);
    expect(valid.headers.getSetCookie().join("; ")).toContain("session_token");
  });
  it.each([
    ["blank", "   "],
    ["too long", "x".repeat(101)],
  ])("rejects %s registration names at the public server endpoint", async (_kind, name) => {
    const email = `invalid-name-${_kind.replaceAll(" ", "-")}@example.org`;
    const response = await call(request("sign-up/email", {
      name, email, password: "strong secret 123",
    }, _kind === "blank" ? "203.0.113.72" : "203.0.113.73"));
    expect(response.status).toBe(400);
    const result = await setup.query<{ count: string }>(
      `select count(*)::text as count from ${schema}."user" where email = $1`, [email],
    );
    expect(result.rows[0]?.count).toBe("0");
  });

  it("normalizes valid registration names before persistence", async () => {
    const email = "trimmed-registration@example.org";
    const response = await call(request("sign-up/email", {
      name: "  Trimmed Member  ", email, password: "strong secret 123",
    }, "203.0.113.74"));
    expect(response.status).toBe(200);
    const result = await setup.query<{ name: string }>(
      `select name from ${schema}."user" where email = $1`, [email],
    );
    expect(result.rows[0]?.name).toBe("Trimmed Member");
  });

  it("keeps duplicate signup neutral and preserves closure for fresh registration only", async () => {
    const email = "pending-closure@example.org";
    const password = "pending fixture password 123";
    const body = { name: "Pending member", email, password, callbackURL: "/ru/topics/fixture" };
    const first = await call(request("sign-up/email", body, "203.0.113.90"));
    expect(first.status).toBe(200);
    const acknowledgement = await first.json();
    const firstProof = issued(email);
    expect(new URL(firstProof.url).pathname).toBe("/ru/verify-email");
    expect(new URL(firstProof.url).searchParams.get("returnTo")).toBe("/ru/topics/fixture");
    const oldHash = (await setup.query<{ password: string }>(
      `select a.password from ${schema}.account a join ${schema}."user" u on u.id=a.user_id where u.email=$1`, [email])).rows[0].password;
    await setup.query(`update ${schema}.forum_registration_settings set email_registration_enabled=false where id=1`);
    try {
      const duplicate = await call(request("sign-up/email",
        { ...body, password: "unrelated replacement password" }, "203.0.113.91"));
      expect(duplicate.status).toBe(200);
      expect(await duplicate.json()).toEqual(acknowledgement);
      expect(duplicate.headers.getSetCookie()).toEqual([]);
      expect(sent.filter(item => item.recipient === email)).toHaveLength(1);
      expect((await setup.query<{ password: string }>(
        `select a.password from ${schema}.account a join ${schema}."user" u on u.id=a.user_id where u.email=$1`, [email])).rows[0].password).toBe(oldHash);
      const closed = await call(request("sign-up/email",
        { ...body, email: "new-closed@example.org" }, "203.0.113.92"));
      expect(closed.status).toBe(403);
      expect(await closed.json()).toMatchObject({ code: "vico_email_registration_closed" });
      expect(await verified("new-closed@example.org")).toBeUndefined();
      const resend = await call(request("send-verification-email", { email, callbackURL: "/ru/topics/fixture" }, "203.0.113.93"));
      const absent = await call(request("send-verification-email", { email: "absent@example.org" }, "203.0.113.94"));
      expect(resend.status).toBe(200);
      expect(absent.status).toBe(200);
      expect(await resend.json()).toEqual(await absent.json());
      const current = issued(email);
      expect(current.token).not.toBe(firstProof.token);
      expect((await call(request("verify-email", { token: firstProof.token }, "203.0.113.95"))).status).toBe(400);
      expect((await call(request("verify-email", { token: current.token }, "203.0.113.96"))).status).toBe(200);
      expect(await verified(email)).toBe(true);
      const valid = await call(request("sign-in/email", { email, password }, "203.0.113.97"));
      expect(valid.status).toBe(200);
    } finally {
      await setup.query(`update ${schema}.forum_registration_settings set email_registration_enabled=true where id=1`);
    }
  });

  it("uses the same native endpoint keys and durable admission in direct calls", async () => {
    const email = "direct-verification@example.org";
    const client = connection();
    await client.connect();
    try {
      const auth = createAuth(drizzle(client), credentials, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, false, undefined,
        { ingress: syntheticAttemptIngressSource("203.0.113.110"), mail });
      const before = await sessionRows();
      const result = await auth.api.signUpEmail({ body: { name: "Direct fixture", email, password: "direct fixture secret 123" } });
      expect(result).toEqual({ status: true, token: null });
      const token = issued(email).token;
      expect(await auth.api.inspectEmailVerification({ query: { token } })).toEqual({ status: true });
      expect(await verified(email)).toBe(false);
      expect(await auth.api.verifyEmail({ body: { token } })).toEqual({ status: true });
      expect(await verified(email)).toBe(true);
      expect(await sessionRows()).toEqual(before);
      await expect(auth.api.verifyEmail({ body: { token } })).rejects.toMatchObject({ status: "BAD_REQUEST" });
    } finally { await client.end(); }
  });
});
