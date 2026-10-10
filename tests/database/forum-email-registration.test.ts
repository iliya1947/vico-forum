import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHyperdriveAuthRuntime } from "../../app/auth/auth.server";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
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
const runtime = createHyperdriveAuthRuntime(databaseUrl, credentials, (connectionString) =>
  new Client({ connectionString, options: `-c search_path=${schema}` }),
);

function request(endpoint: string, body: Record<string, string>) {
  return new Request(`http://localhost:3000/api/auth/${endpoint}`, {
    method: "POST",
    headers: {
      Origin: "http://localhost:3000",
      "Content-Type": "application/json",
      "cf-connecting-ip": "203.0.113.71",
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
  try { await migrator.query(sql); } finally { await migrator.end(); }
});

afterAll(async () => {
  await setup.query(`drop schema if exists ${schema} cascade`);
  await setup.end();
});

describe("Better Auth email/password registration and login on PostgreSQL 17", () => {
  it("creates a non-verified account with hashed credentials and an authenticated session", async () => {
    const signUp = await runtime.handle(request("sign-up/email", {
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

    const sessionCookie = signUp.headers.getSetCookie()
      .map((cookie) => cookie.split(";")[0]).join("; ");
    expect(sessionCookie).toContain("session_token");
    const resolved = await runtime.getSession(new Headers({ Cookie: sessionCookie }));
    expect(resolved.session?.user.email).toBe("new-forum-member@example.org");
  });

  it("rejects an incorrect password and accepts the registered email/password", async () => {
    const invalid = await runtime.handle(request("sign-in/email", {
      email: "new-forum-member@example.org", password: "incorrect password",
    }));
    expect(invalid.ok).toBe(false);
    const valid = await runtime.handle(request("sign-in/email", {
      email: "new-forum-member@example.org", password: "strong secret 123",
    }));
    expect(valid.status).toBe(200);
    expect(valid.headers.getSetCookie().join("; ")).toContain("session_token");
  });
  it.each([
    ["blank", "   "],
    ["too long", "x".repeat(101)],
  ])("rejects %s registration names at the public server endpoint", async (_kind, name) => {
    const email = `invalid-name-${_kind.replaceAll(" ", "-")}@example.org`;
    const response = await runtime.handle(request("sign-up/email", {
      name, email, password: "strong secret 123",
    }));
    expect(response.status).toBe(400);
    const result = await setup.query<{ count: string }>(
      `select count(*)::text as count from ${schema}."user" where email = $1`, [email],
    );
    expect(result.rows[0]?.count).toBe("0");
  });

  it("normalizes valid registration names before persistence", async () => {
    const email = "trimmed-registration@example.org";
    const response = await runtime.handle(request("sign-up/email", {
      name: "  Trimmed Member  ", email, password: "strong secret 123",
    }));
    expect(response.status).toBe(200);
    const result = await setup.query<{ name: string }>(
      `select name from ${schema}."user" where email = $1`, [email],
    );
    expect(result.rows[0]?.name).toBe("Trimmed Member");
  });

});
