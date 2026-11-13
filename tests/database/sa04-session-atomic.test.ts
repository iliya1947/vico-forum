import { readFile } from "node:fs/promises";
import { betterAuth } from "better-auth";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { betterAuthOptions, createHyperdriveAuthRuntime, type BetterAuthEnvironment } from "../../app/auth/auth.server";
import { AccountStateUnexpectedError } from "../../db/account-state";
import { installRegistrationPolicyFixture } from "./registration-policy-fixture";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname) ||
  !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA04-I4a requires a disposable loopback *_test PostgreSQL database");
}
const schema = "sa04_session_atomic_test";
const origin = "http://localhost:5173";
const env: BetterAuthEnvironment = {
  BETTER_AUTH_SECRET: "sa04-session-atomic-integration-secret-32-plus",
  BETTER_AUTH_URL: origin,
  GOOGLE_CLIENT_ID: "local-test-google",
  GOOGLE_CLIENT_SECRET: "local-test-secret",
};
const writer = new Client({ connectionString: url, options: `-c search_path=${schema}` });
const deactivator = new Client({ connectionString: url, options: `-c search_path=${schema}` });
const auth = betterAuth(betterAuthOptions(drizzle(writer), env));
const password = "atomic-session-password-123";
let ip = 140;
const deactivateSql = `update "user" set deactivated_at='2026-11-12T00:00:00Z',
  deactivated_by_user_id=$1, retain_at_least_until='2027-11-13T00:00:00Z'
  where id=$1`;

function nativeSql(statement: unknown): string {
  if (typeof statement === "string") return statement;
  return statement && typeof statement === "object" && "text" in statement &&
    typeof statement.text === "string" ? statement.text : "";
}

/** Hold the native PostgreSQL call at a known seam, without faking SQL results. */
function pauseNativeQuery(client: Client, matches: (text: string) => boolean) {
  const original = client.query;
  let reached!: () => void;
  let release!: () => void;
  const entered = new Promise<void>(resolve => { reached = resolve; });
  const permitted = new Promise<void>(resolve => { release = resolve; });
  let triggered = false;
  client.query = ((...args: unknown[]) => {
    if (!triggered && matches(nativeSql(args[0]))) {
      triggered = true;
      reached();
      return permitted.then(() => Reflect.apply(original, client, args));
    }
    return Reflect.apply(original, client, args);
  }) as typeof client.query;
  return { entered, resume: () => release(), restore: () => { client.query = original; } };
}

async function signUp(suffix: string) {
  const response = await auth.handler(new Request(`${origin}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { Origin: origin, "content-type": "application/json",
      "cf-connecting-ip": `203.0.113.${ip++}` },
    body: JSON.stringify({ email: `i4a-${suffix}@example.test`,
      name: "I4a active member", password }),
  }));
  expect(response.status).toBe(200);
  const { user: { id } } = await response.json() as { user: { id: string } };
  const cookie = response.headers.getSetCookie()
    .find(value => value.includes("session_token="))?.split(";", 1)[0];
  expect(cookie).toBeTruthy();
  const rows = (await writer.query<{ id: string; token: string; expires_at: Date; updated_at: Date }>(
    'select id,token,expires_at,updated_at from "session" where user_id=$1', [id],
  )).rows;
  expect(rows).toHaveLength(1);
  return { userId: id, cookie: cookie!, session: rows[0] };
}

beforeAll(async () => {
  await writer.connect();
  await deactivator.connect();
  await writer.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  await writer.query((await readFile("drizzle/0003_gorgeous_donald_blake.sql", "utf8"))
    .replaceAll('"public".', `"${schema}".`).replaceAll("--> statement-breakpoint", ""));
  await writer.query((await readFile("drizzle/0065_sa04_account_state_foundation.sql", "utf8"))
    .replaceAll("--> statement-breakpoint", ""));
  await installRegistrationPolicyFixture(writer);
});
beforeEach(async () => {
  await writer.query('truncate "user", account, session, verification, rate_limit cascade');
});
afterAll(async () => {
  await deactivator.query("ROLLBACK").catch(() => undefined);
  await writer.query(`drop schema if exists ${schema} cascade`);
  await deactivator.end();
  await writer.end();
});

describe("SA04-I4a Better Auth 1.7.7 native session write atomicity", () => {
  it("locks real signup transaction-context session INSERT before concurrent deactivation", async () => {
    const email = "i4a-transaction-signup@example.test";
    const paused = pauseNativeQuery(writer, sql => /^insert into "session"\\s/i.test(sql));
    try {
      const signing = auth.handler(new Request(`${origin}/api/auth/sign-up/email`, {
        method: "POST",
        headers: { Origin: origin, "content-type": "application/json",
          "cf-connecting-ip": `203.0.113.${ip++}` },
        body: JSON.stringify({ name: "I4a transaction", email, password }),
      }));
      await paused.entered; // BA runWithTransaction supplied a guarded callback adapter.
      const found = (await deactivator.query<{ id: string }>(
        'select id from "user" where email=$1', [email],
      )).rows[0];
      expect(found?.id).toBeTruthy();
      await deactivator.query("set lock_timeout='120ms'");
      await expect(deactivator.query(deactivateSql, [found.id]))
        .rejects.toMatchObject({ code: "55P03" });
      paused.resume();
      const created = await signing;
      expect(created.status).toBe(200);
      expect(created.headers.getSetCookie().some(x => x.includes("session_token="))).toBe(true);
      expect((await deactivator.query<{ n: number }>(
        'select count(*)::int n from "session" where user_id=$1', [found.id],
      )).rows[0]?.n).toBe(1);
    } finally {
      paused.resume();
      paused.restore();
      await deactivator.query("set lock_timeout='0'");
    }
  }, 30_000);

  it("denies signup session after a deactivation wins before the fallback transaction write", async () => {
    const email = "i4a-transaction-loser@example.test";
    const paused = pauseNativeQuery(writer, sql => sql === "BEGIN");
    try {
      const signing = auth.handler(new Request(`${origin}/api/auth/sign-up/email`, {
        method: "POST",
        headers: { Origin: origin, "content-type": "application/json",
          "cf-connecting-ip": `203.0.113.${ip++}` },
        body: JSON.stringify({ name: "I4a transaction loser", email, password }),
      }));
      await paused.entered; // I3 create.before passed; I4a final admission has not started.
      const found = (await deactivator.query<{ id: string }>(
        'select id from "user" where email=$1', [email],
      )).rows[0];
      expect(found?.id).toBeTruthy();
      await deactivator.query(deactivateSql, [found.id]);
      paused.resume();
      const denied = await signing;
      expect(denied.status).toBe(401);
      expect(denied.headers.getSetCookie().some(x => x.includes("session_token="))).toBe(false);
      expect((await deactivator.query<{ n: number }>(
        'select count(*)::int n from "session" where user_id=$1', [found.id],
      )).rows[0]?.n).toBe(0);
    } finally {
      paused.resume();
      paused.restore();
    }
  }, 30_000);

  it("holds the active user-row lock through actual session INSERT and commits before deactivation", async () => {
    const { userId } = await signUp("create-first");
    const direct = (await auth.$context).internalAdapter;
    const paused = pauseNativeQuery(writer, sql => /^insert into "session"\s/i.test(sql));
    let creating: Promise<Awaited<ReturnType<typeof direct.createSession>>> | undefined;
    try {
      creating = direct.createSession(userId);
      await paused.entered; // The adapter guard locked the user before INSERT.
      await deactivator.query("set lock_timeout='120ms'");
      await expect(deactivator.query(deactivateSql, [userId]))
        .rejects.toMatchObject({ code: "55P03" });
      paused.resume();
      const created = await creating;
      expect(created?.userId).toBe(userId);
    } finally {
      paused.resume();
      paused.restore();
      await deactivator.query("set lock_timeout='0'");
    }
    expect((await writer.query<{ n: number }>(
      'select count(*)::int n from "session" where user_id=$1', [userId],
    )).rows[0]?.n).toBe(2);
    await deactivator.query(deactivateSql, [userId]);
    await expect(direct.createSession(userId)).rejects.toMatchObject({ status: "UNAUTHORIZED" });
    expect((await writer.query<{ n: number }>(
      'select count(*)::int n from "session" where user_id=$1', [userId],
    )).rows[0]?.n).toBe(2);
  }, 30_000);

  it("refuses a creation whose preflight saw active but whose locked write follows deactivation", async () => {
    const { userId } = await signUp("deactivate-first");
    const direct = (await auth.$context).internalAdapter;
    await deactivator.query("BEGIN");
    await deactivator.query(deactivateSql, [userId]);
    const paused = pauseNativeQuery(writer, sql => /for no key update/i.test(sql));
    try {
      const creating = direct.createSession(userId);
      await paused.entered; // The initial unlocked I3 read has already passed.
      await deactivator.query("COMMIT");
      paused.resume();
      await expect(creating).rejects.toMatchObject({ status: "UNAUTHORIZED" });
    } finally {
      paused.resume();
      paused.restore();
      await deactivator.query("ROLLBACK").catch(() => undefined);
    }
    expect((await writer.query<{ n: number }>(
      'select count(*)::int n from "session" where user_id=$1', [userId],
    )).rows[0]?.n).toBe(1);
  }, 30_000);

  it("locks the token-resolved session owner through the actual UPDATE and prevents later inactive refresh", async () => {
    const { userId, session } = await signUp("update-first");
    const direct = (await auth.$context).internalAdapter;
    const later = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    const paused = pauseNativeQuery(writer, sql => /^update "session" set /i.test(sql));
    try {
      const updating = direct.updateSession(session.token, { expiresAt: later, updatedAt: new Date() });
      await paused.entered; // Existing session token resolved; user lock held.
      await deactivator.query("set lock_timeout='120ms'");
      await expect(deactivator.query(deactivateSql, [userId]))
        .rejects.toMatchObject({ code: "55P03" });
      paused.resume();
      const updated = await updating;
      expect(updated?.token).toBe(session.token);
    } finally {
      paused.resume();
      paused.restore();
      await deactivator.query("set lock_timeout='0'");
    }
    const persisted = (await writer.query<{ expires_at: Date; updated_at: Date }>(
      'select expires_at,updated_at from "session" where token=$1', [session.token],
    )).rows[0];
    expect(persisted?.expires_at.getTime()).toBe(later.getTime());
    await deactivator.query(deactivateSql, [userId]);
    await expect(direct.updateSession(session.token, { updatedAt: new Date() }))
      .rejects.toMatchObject({ status: "UNAUTHORIZED" });
    expect((await writer.query<{ expires_at: Date; updated_at: Date }>(
      'select expires_at,updated_at from "session" where token=$1', [session.token],
    )).rows[0]).toEqual(persisted);
  }, 30_000);

  it("classifies a locked session-write state outage after preflight without issuing a session", async () => {
    const { userId } = await signUp("write-outage");
    const before = (await writer.query<{ id: string; token: string }>(
      'select id,token from "session" where user_id=$1 order by id', [userId],
    )).rows;
    const failedRuntime = (failure: Error) => createHyperdriveAuthRuntime(url, env, () => {
      const connection = new Client({ connectionString: url, options: `-c search_path=${schema}` });
      const original = connection.query;
      connection.query = ((...args: unknown[]) => {
        if (/for no key update/i.test(nativeSql(args[0]))) return Promise.reject(failure);
        return Reflect.apply(original, connection, args);
      }) as typeof connection.query;
      return connection;
    });
    const request = () => new Request(`${origin}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { Origin: origin, "content-type": "application/json",
        "cf-connecting-ip": `203.0.113.${ip++}` },
      body: JSON.stringify({ email: "i4a-write-outage@example.test", password }),
    });
    const down = Object.assign(new Error("SECRET_I4A_NATIVE_CONNECTION_LOST"), { code: "ECONNRESET" });
    const unavailable = await failedRuntime(down).handle(request());
    expect(unavailable.status).toBe(503);
    expect(unavailable.headers.get("Cache-Control")).toBe("no-store");
    expect(unavailable.headers.getSetCookie().some(v => v.includes("session_token="))).toBe(false);
    expect(await unavailable.text()).not.toContain("SECRET_I4A_NATIVE_CONNECTION_LOST");
    await expect(failedRuntime(new TypeError("I4a bad state reader")).handle(request()))
      .rejects.toBeInstanceOf(AccountStateUnexpectedError);
    expect((await writer.query<{ id: string; token: string }>(
      'select id,token from "session" where user_id=$1 order by id', [userId],
    )).rows).toEqual(before);
  });

  it("resolves a losing pre-routing due refresh to guest without a new cookie or session mutation", async () => {
    const { userId, cookie, session } = await signUp("preroute-refresh-race");
    await writer.query(`update "session" set expires_at=now()+interval '5 days',
      updated_at=now()-interval '2 days' where token=$1`, [session.token]);
    const snapshot = (await writer.query<{
      id: string; token: string; expires_at: Date; updated_at: Date;
    }>('select id,token,expires_at,updated_at from "session" where token=$1', [session.token])).rows[0];
    const client = new Client({ connectionString: url, options: `-c search_path=${schema}` });
    const paused = pauseNativeQuery(client, sql => /for no key update/i.test(sql));
    const runtime = createHyperdriveAuthRuntime(url, env, () => client);
    try {
      const resolving = runtime.getSession(new Headers({ Cookie: cookie }));
      await paused.entered;
      await deactivator.query(deactivateSql, [userId]);
      paused.resume();
      const result = await resolving;
      expect(result.session).toBeNull();
      expect(result.headers.getSetCookie().some(x => x.includes("session_token="))).toBe(false);
    } finally {
      paused.resume();
      paused.restore();
    }
    expect((await writer.query<{
      id: string; token: string; expires_at: Date; updated_at: Date;
    }>('select id,token,expires_at,updated_at from "session" where token=$1', [session.token])).rows[0])
      .toEqual(snapshot);
  }, 30_000);

  it("classifies BEGIN, token lookup and COMMIT failures owned by the session guard", async () => {
    const { userId, cookie, session } = await signUp("wrapper-sql-failure");
    await writer.query(`update "session" set expires_at=now()+interval '5 days',
      updated_at=now()-interval '2 days' where token=$1`, [session.token]);
    const snapshot = (await writer.query<{ id: string; token: string; expires_at: Date }>(
      'select id,token,expires_at from "session" where user_id=$1 order by id', [userId],
    )).rows;

    const withFailure = (sqlIsTarget: (sql: string) => boolean, fault: Error) =>
      createHyperdriveAuthRuntime(url, env, () => {
        const client = new Client({ connectionString: url, options: `-c search_path=${schema}` });
        const original = client.query;
        let injected = false;
        client.query = ((...args: unknown[]) => {
          if (!injected && sqlIsTarget(nativeSql(args[0]))) {
            injected = true;
            return Promise.reject(fault);
          }
          return Reflect.apply(original, client, args);
        }) as typeof client.query;
        return client;
      });

    const signIn = () => new Request(`${origin}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { Origin: origin, "content-type": "application/json",
        "cf-connecting-ip": `203.0.113.${ip++}` },
      body: JSON.stringify({ email: "i4a-wrapper-sql-failure@example.test", password }),
    });
    const refresh = () => new Request(`${origin}/api/auth/get-session`, {
      headers: { Cookie: cookie },
    });
    for (const [name, match, request] of [
      ["BEGIN", (sql: string) => sql === "BEGIN", signIn],
      ["token SELECT", (sql: string) => sql.startsWith('select user_id from "session" where token'), refresh],
      ["COMMIT", (sql: string) => sql === "COMMIT", signIn],
    ] as const) {
      const unavailable = Object.assign(new Error(`SECRET_${name}_DB_LOST`), { code: "ECONNRESET" });
      const result = await withFailure(match, unavailable).handle(request());
      expect(result.status, name).toBe(503);
      expect(result.headers.get("Cache-Control"), name).toBe("no-store");
      expect(result.headers.getSetCookie().some(value => value.includes("session_token=")), name)
        .toBe(false);
      expect(await result.text()).not.toContain(`SECRET_${name}_DB_LOST`);
      await expect(withFailure(match, new TypeError(`Unexpected I4a ${name} failure`))
        .handle(request())).rejects.toBeInstanceOf(AccountStateUnexpectedError);
      expect((await writer.query<{ id: string; token: string; expires_at: Date }>(
        'select id,token,expires_at from "session" where user_id=$1 order by id', [userId],
      )).rows).toEqual(snapshot);
    }
  });

  it("denies canonical due-session HTTP refresh if deactivation commits between preflight and locked UPDATE", async () => {
    const { userId, cookie, session } = await signUp("refresh-race");
    await writer.query(`update "session" set expires_at=now()+interval '5 days',
      updated_at=now()-interval '2 days' where token=$1`, [session.token]);
    const before = (await writer.query<{ id: string; token: string; expires_at: Date; updated_at: Date }>(
      'select id,token,expires_at,updated_at from "session" where token=$1', [session.token],
    )).rows[0];
    const paused = pauseNativeQuery(writer, sql => /for no key update/i.test(sql));
    try {
      const refreshing = auth.handler(new Request(`${origin}/api/auth/get-session`, {
        headers: { Cookie: cookie },
      }));
      await paused.entered;
      await deactivator.query(deactivateSql, [userId]);
      paused.resume();
      const denied = await refreshing;
      expect(denied.status).toBe(401);
      expect(denied.headers.getSetCookie().some(value => value.includes("session_token="))).toBe(false);
    } finally {
      paused.resume();
      paused.restore();
    }
    expect((await writer.query<{ id: string; token: string; expires_at: Date; updated_at: Date }>(
      'select id,token,expires_at,updated_at from "session" where token=$1', [session.token],
    )).rows[0]).toEqual(before);
  }, 30_000);
});
