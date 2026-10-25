import { readFile } from "node:fs/promises";
import { betterAuth } from "better-auth";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { betterAuthOptions } from "../../app/auth/auth.server";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const url = new URL(databaseUrl);
if (!["localhost", "127.0.0.1"].includes(url.hostname) || !url.pathname.endsWith("_test")) {
  throw new Error("Disposable local test database required");
}

const schema = "auth_rate_limit_concurrency_test";
const applicationName = "vico-auth-rate-limit-regression";
const setup = new Client({ connectionString: databaseUrl });
const blocker = new Client({ connectionString: databaseUrl });
const pool = new Pool({
  connectionString: databaseUrl,
  options: `-c search_path=${schema}`,
  application_name: applicationName,
  max: 4,
});
const baseOptions = betterAuthOptions(drizzle(pool), {
  BETTER_AUTH_SECRET: "local-rate-limit-regression-secret-at-least-32-characters",
  BETTER_AUTH_URL: "http://localhost:3000",
  GOOGLE_CLIENT_ID: "unused-google-client",
  GOOGLE_CLIENT_SECRET: "unused-google-secret",
});
// Small test-only limits exercise the same database-backed admission path as production.
const auth = betterAuth({
  ...baseOptions,
  rateLimit: {
    ...baseOptions.rateLimit,
    customRules: { "/get-session": { window: 60, max: 2 } },
  },
});

function request(ip: string) {
  return new Request("http://localhost:3000/api/auth/get-session", {
    headers: { "cf-connecting-ip": ip },
  });
}

beforeAll(async () => {
  await setup.connect();
  await blocker.connect();
  await setup.query(`create schema ${schema}`);
  const migration = (await readFile("drizzle/0003_gorgeous_donald_blake.sql", "utf8"))
    .replaceAll('"public".', `"${schema}".`);
  await setup.query(`set search_path to ${schema}`);
  await setup.query(migration);
});

afterAll(async () => {
  await blocker.end();
  await pool.end();
  await setup.query(`drop schema if exists ${schema} cascade`);
  await setup.end();
});

describe("Better Auth PostgreSQL rate-limit admission under row contention", () => {
  it.each([false, true])("enforces the limit with an expired window: %s", async (expired) => {
    await setup.query(`truncate ${schema}.rate_limit`);
    const ip = expired ? "203.0.113.92" : "203.0.113.91";
    expect((await auth.handler(request(ip))).status).toBe(200);
    const seed = await setup.query<{ id: string; count: number }>(
      `select id, count from ${schema}.rate_limit`,
    );
    expect(seed.rows).toHaveLength(1);
    expect(seed.rows[0]?.count).toBe(1);
    const id = seed.rows[0]!.id;
    if (expired) {
      await setup.query(
        `update ${schema}.rate_limit set count = 2, last_request = $1 where id = $2`,
        [Date.now() - 61_000, id],
      );
    }

    await blocker.query("begin");
    await blocker.query(`select id from ${schema}.rate_limit where id = $1 for update`, [id]);
    const burst = Promise.all(Array.from({ length: 3 }, () => auth.handler(request(ip))));
    let responses: Response[];
    try {
      // All three real SQL updates must be waiting on the same authoritative row before
      // releasing it. This exposes stale-subquery admission without timing-dependent sleeps.
      await vi.waitFor(async () => {
        const waiting = await setup.query<{ count: number }>(
          "select count(*)::int as count from pg_stat_activity where application_name = $1 and wait_event_type = 'Lock'",
          [applicationName],
        );
        expect(waiting.rows[0]?.count).toBe(3);
      }, { timeout: 5_000, interval: 20 });
    } finally {
      await blocker.query("rollback");
      responses = await burst;
    }

    expect(responses.filter((response) => response.status === 200)).toHaveLength(expired ? 2 : 1);
    const denied = responses.filter((response) => response.status === 429);
    expect(denied).toHaveLength(expired ? 1 : 2);
    for (const response of denied) {
      expect(Number(response.headers.get("X-Retry-After"))).toBeGreaterThan(0);
      expect(response.headers.get("Content-Type")).toContain("application/json");
    }
    const stored = await setup.query<{ count: number }>(
      `select count from ${schema}.rate_limit where id = $1`, [id],
    );
    expect(stored.rows[0]?.count).toBe(2);
    expect((await auth.handler(request(ip))).status).toBe(429);
    // Admission remains independent for another trusted client-IP bucket.
    expect((await auth.handler(request("203.0.113.93"))).status).toBe(200);
  });
});
