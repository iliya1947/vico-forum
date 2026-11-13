import { readFile } from "node:fs/promises";
import { betterAuth } from "better-auth";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { RouterContextProvider } from "react-router";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { betterAuthOptions, createHyperdriveAuthRuntime, type BetterAuthEnvironment } from "../../app/auth/auth.server";
import { AccountStateUnexpectedError } from "../../db/account-state";
import { authSessionForRequest } from "../../app/auth/request-context";
import { initializeAuthContext, withAuthSessionCookies } from "../../app/auth/session-context";
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
    const paused = pauseNativeQuery(writer, sql => /^insert into "session"\s/i.test(sql));
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

describe("SA04-I4b Better Auth 1.7.7 existing-user write atomicity", () => {
  it("holds target-id user lock across native updateUser and blocks competing deactivation", async () => {
    const { userId } = await signUp("user-id-writer-first");
    const direct = (await auth.$context).internalAdapter;
    const paused = pauseNativeQuery(writer, sql => /^update "user" set /i.test(sql));
    try {
      const writing = direct.updateUser(userId, { name: "Updated active member" });
      await paused.entered;
      await deactivator.query("set lock_timeout='120ms'");
      await expect(deactivator.query(deactivateSql, [userId]))
        .rejects.toMatchObject({ code: "55P03" });
      paused.resume();
      const updated = await writing;
      expect(updated?.id).toBe(userId);
      expect(updated?.name).toBe("Updated active member");
    } finally {
      paused.resume();
      paused.restore();
      await deactivator.query("set lock_timeout='0'");
    }
    await deactivator.query(deactivateSql, [userId]);
    await expect(direct.updateUser(userId, { name: "ILLEGAL_AFTER_DEACTIVATION" }))
      .rejects.toMatchObject({ status: "UNAUTHORIZED" });
    expect((await writer.query<{ name: string }>(
      'select name from "user" where id=$1', [userId],
    )).rows[0]?.name).toBe("Updated active member");
  }, 30_000);

  it("uses the persisted email-selected user row, rejecting a deactivation before its lock", async () => {
    const { userId } = await signUp("user-email-deactivation-first");
    const direct = (await auth.$context).internalAdapter;
    const email = "i4a-user-email-deactivation-first@example.test";
    const updated = await direct.updateUserByEmail(email.toUpperCase(), { name: "Email target active" });
    expect(updated?.id).toBe(userId);
    const paused = pauseNativeQuery(writer, sql =>
      sql.startsWith('select id from "user" where email = $1 for no key update'));
    try {
      const writing = direct.updateUserByEmail(email, { name: "ILLEGAL_LATE_EMAIL" });
      await paused.entered;
      await deactivator.query(deactivateSql, [userId]);
      paused.resume();
      await expect(writing).rejects.toMatchObject({ status: "UNAUTHORIZED" });
    } finally {
      paused.resume();
      paused.restore();
    }
    expect((await writer.query<{ name: string }>(
      'select name from "user" where id=$1', [userId],
    )).rows[0]?.name).toBe("Email target active");
    await expect(direct.updateUserByEmail(email, { name: "ILLEGAL_INACTIVE_EMAIL" }))
      .rejects.toMatchObject({ status: "UNAUTHORIZED" });
  }, 30_000);

  it("keeps canonical HTTP /update-user success, but refuses deactivation after actor preflight", async () => {
    const { userId, cookie } = await signUp("user-http-actor");
    const send = (name: string) => auth.handler(new Request(`${origin}/api/auth/update-user`, {
      method: "POST",
      headers: { Origin: origin, Cookie: cookie, "content-type": "application/json" },
      body: JSON.stringify({ name }),
    }));
    const active = await send("Successful HTTP user update");
    expect(active.status).toBe(200);
    const paused = pauseNativeQuery(writer, sql =>
      sql.startsWith('select id from "user" where id = $1 for no key update'));
    try {
      const writing = send("ILLEGAL_HTTP_AFTER_STATE_RACE");
      await paused.entered;
      await deactivator.query(deactivateSql, [userId]);
      paused.resume();
      const denied = await writing;
      expect(denied.status).toBe(401);
      expect(denied.headers.getSetCookie().some(x => x.includes("session_token="))).toBe(false);
    } finally {
      paused.resume();
      paused.restore();
    }
    expect((await writer.query<{ name: string }>(
      'select name from "user" where id=$1', [userId],
    )).rows[0]?.name).toBe("Successful HTTP user update");
  }, 30_000);

  it("guards user updateMany unique target; preserves no-match semantics and new-user creation", async () => {
    const { userId } = await signUp("user-many");
    const adapter = (await auth.$context).adapter;
    const hit = await adapter.updateMany({
      model: "user", where: [{ field: "id", value: userId }],
      update: { name: "Selected active user many" },
    });
    expect(hit).toBe(1);
    const missingId = await adapter.update({
      model: "user", where: [{ field: "id", value: "absent-user-id" }],
      update: { name: "Unchanged" },
    });
    expect(missingId).toBeNull();
    const missingEmail = await adapter.updateMany({
      model: "user", where: [{ field: "email", value: "unknown@example.test" }],
      update: { name: "Unchanged" },
    });
    expect(missingEmail).toBe(0);
    await expect(adapter.updateMany({
      model: "user", where: [{ field: "createdAt", value: new Date() }],
      update: { name: "UNSUPPORTED_WIDE_UPDATE" },
    })).rejects.toBeInstanceOf(AccountStateUnexpectedError);
    await deactivator.query(deactivateSql, [userId]);
    await expect(adapter.updateMany({
      model: "user", where: [{ field: "id", value: userId }],
      update: { name: "ILLEGAL_INACTIVE_MANY" },
    })).rejects.toMatchObject({ status: "UNAUTHORIZED" });
    expect((await writer.query<{ name: string }>(
      'select name from "user" where id=$1', [userId],
    )).rows[0]?.name).toBe("Selected active user many");
    const fresh = await signUp("new-user-still-works");
    expect(fresh.userId).not.toBe(userId);
  });

  it("classifies native user-selector storage unavailability separately from unexpected failure", async () => {
    const { userId, cookie } = await signUp("user-state-read-failure");
    const failedRuntime = (failure: Error) => createHyperdriveAuthRuntime(url, env, () => {
      const connection = new Client({ connectionString: url, options: `-c search_path=${schema}` });
      const original = connection.query;
      connection.query = ((...args: unknown[]) => {
        if (nativeSql(args[0]).startsWith('select id from "user" where id = $1 for no key update')) {
          return Promise.reject(failure);
        }
        return Reflect.apply(original, connection, args);
      }) as typeof connection.query;
      return connection;
    });
    const request = () => new Request(`${origin}/api/auth/update-user`, {
      method: "POST",
      headers: { Cookie: cookie, Origin: origin, "content-type": "application/json" },
      body: JSON.stringify({ name: "ILLEGAL_ON_STATE_FAILURE" }),
    });
    const unavailable = Object.assign(new Error("PRIVATE_I4B_DB_DISCONNECT"), { code: "ECONNRESET" });
    const response = await failedRuntime(unavailable).handle(request());
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.text()).not.toContain("PRIVATE_I4B_DB_DISCONNECT");
    expect(response.headers.getSetCookie().some(x => x.includes("session_token="))).toBe(false);
    await expect(failedRuntime(new TypeError("unexpected I4b user target SQL")).handle(request()))
      .rejects.toBeInstanceOf(AccountStateUnexpectedError);
    expect((await writer.query<{ name: string }>(
      'select name from "user" where id=$1', [userId],
    )).rows[0]?.name).toBe("I4a active member");
  });
});

describe("SA04-I4c Better Auth 1.7.7 existing-account write atomicity", () => {
  async function accounts(userId: string) {
    return (await writer.query<{
      id: string; account_id: string; provider_id: string; password: string | null;
    }>('select id,account_id,provider_id,password from account where user_id=$1 order by id', [userId])).rows;
  }

  it("holds active owner lock through linkAccount INSERT and denies later inactive create", async () => {
    const { userId } = await signUp("i4c-link-first");
    const direct = (await auth.$context).internalAdapter;
    const paused = pauseNativeQuery(writer, sql => /^insert into "account"\s/i.test(sql));
    try {
      const linking = direct.linkAccount({ userId, providerId: "google", accountId: "new-link" });
      await paused.entered;
      await deactivator.query("set lock_timeout='120ms'");
      await expect(deactivator.query(deactivateSql, [userId]))
        .rejects.toMatchObject({ code: "55P03" });
      paused.resume();
      expect((await linking)?.accountId).toBe("new-link");
    } finally {
      paused.resume();
      paused.restore();
      await deactivator.query("set lock_timeout='0'");
    }
    expect((await accounts(userId)).map(x => x.provider_id).sort()).toEqual(["credential", "google"]);
    await deactivator.query(deactivateSql, [userId]);
    await expect(direct.createAccount({
      userId, providerId: "google", accountId: "ILLEGAL_LATE_CREATE",
    })).rejects.toMatchObject({ status: "UNAUTHORIZED" });
    expect(await accounts(userId)).toHaveLength(2);
  }, 30_000);

  it("denies existing-user account create if deactivation commits before final lock", async () => {
    const { userId } = await signUp("i4c-create-loser");
    const direct = (await auth.$context).internalAdapter;
    const paused = pauseNativeQuery(writer, sql => /for no key update/i.test(sql));
    try {
      const creating = direct.createAccount({
        userId, providerId: "google", accountId: "ILLEGAL_NEW_GOOGLE",
      });
      await paused.entered;
      await deactivator.query(deactivateSql, [userId]);
      paused.resume();
      await expect(creating).rejects.toMatchObject({ status: "UNAUTHORIZED" });
    } finally {
      paused.resume();
      paused.restore();
    }
    expect((await accounts(userId)).map(x => x.provider_id)).toEqual(["credential"]);
  }, 30_000);

  it("resolves account UPDATE by persisted primary key and guards password and OAuth tokens", async () => {
    const { userId } = await signUp("i4c-account-update");
    const direct = (await auth.$context).internalAdapter;
    const credential = (await accounts(userId))[0];
    const linked = await direct.createAccount({
      userId, providerId: "google", accountId: "oauth-token-subject",
    });
    expect((await direct.updateAccount(linked.id, { accessToken: "NEW_GOOGLE_TOKEN" }))?.accessToken)
      .toBe("NEW_GOOGLE_TOKEN");
    const paused = pauseNativeQuery(writer, sql => /^update "account" set /i.test(sql));
    try {
      const changing = direct.updateAccount(credential.id, { password: "ACTIVE_NEW_PASSWORD_HASH" });
      await paused.entered;
      await deactivator.query("set lock_timeout='120ms'");
      await expect(deactivator.query(deactivateSql, [userId]))
        .rejects.toMatchObject({ code: "55P03" });
      paused.resume();
      expect((await changing)?.password).toBe("ACTIVE_NEW_PASSWORD_HASH");
    } finally {
      paused.resume();
      paused.restore();
      await deactivator.query("set lock_timeout='0'");
    }
    await deactivator.query(deactivateSql, [userId]);
    await expect(direct.updateAccount(linked.id, { accessToken: "ILLEGAL_LATE_TOKEN" }))
      .rejects.toMatchObject({ status: "UNAUTHORIZED" });
    expect((await accounts(userId)).find(x => x.id === credential.id)?.password)
      .toBe("ACTIVE_NEW_PASSWORD_HASH");
    expect((await writer.query<{ access_token: string }>(
      'select access_token from account where id=$1', [linked.id],
    )).rows[0]?.access_token).toBe("NEW_GOOGLE_TOKEN");
  }, 30_000);

  it("guards updatePassword credential multi-selector, including deactivation-first", async () => {
    const { userId } = await signUp("i4c-password-many");
    const direct = (await auth.$context).internalAdapter;
    const credentialId = (await accounts(userId))[0].id;
    await direct.updatePassword(userId, "PERSISTED_ACTIVE_PASSWORD");
    const paused = pauseNativeQuery(writer, sql =>
      sql.startsWith('select user_id from "account" where user_id = $1 and provider_id = $2 and account_id = $3'));
    try {
      const reset = direct.updatePassword(userId, "ILLEGAL_AFTER_DEACTIVATION");
      await paused.entered;
      await deactivator.query(deactivateSql, [userId]);
      paused.resume();
      await expect(reset).rejects.toMatchObject({ status: "UNAUTHORIZED" });
    } finally {
      paused.resume();
      paused.restore();
    }
    expect((await writer.query<{ password: string }>(
      'select password from account where id=$1', [credentialId],
    )).rows[0]?.password).toBe("PERSISTED_ACTIVE_PASSWORD");
    await expect((await auth.$context).adapter.updateMany({
      model: "account", where: [
        { field: "userId", value: userId }, { field: "providerId", value: "credential" },
        { field: "accountId", value: userId },
      ],
      update: { password: "ILLEGAL_DIRECT_MANY" },
    })).rejects.toMatchObject({ status: "UNAUTHORIZED" });
  }, 30_000);

  it("preserves HTTP unlink and blocks deactivation-first account deletion by id and userId", async () => {
    const { userId, cookie } = await signUp("i4c-unlink");
    const direct = (await auth.$context).internalAdapter;
    const initial = await direct.createAccount({
      userId, providerId: "google", accountId: "unlink-active-account",
    });
    const response = await auth.handler(new Request(origin + "/api/auth/unlink-account", {
      method: "POST",
      headers: { Origin: origin, Cookie: cookie, "content-type": "application/json" },
      body: JSON.stringify({ accountId: initial.id }),
    }));
    expect(response.status).toBe(200);
    expect(await accounts(userId)).toHaveLength(1);
    const retained = await direct.createAccount({
      userId, providerId: "google", accountId: "do-not-delete",
    });
    const paused = pauseNativeQuery(writer, sql =>
      sql.startsWith('select user_id from "account" where id = $1'));
    try {
      const removing = direct.deleteAccount(retained.id);
      await paused.entered;
      await deactivator.query(deactivateSql, [userId]);
      paused.resume();
      await expect(removing).rejects.toMatchObject({ status: "UNAUTHORIZED" });
    } finally {
      paused.resume();
      paused.restore();
    }
    expect((await accounts(userId)).map(x => x.account_id)).toContain("do-not-delete");
    await expect(direct.deleteAccounts(userId)).rejects.toMatchObject({ status: "UNAUTHORIZED" });
    expect((await writer.query<{ id: string }>(
      'select id from "user" where id=$1', [userId],
    )).rows).toHaveLength(1);
  }, 30_000);

  it("holds account DELETE through commit and supports active account deleteMany", async () => {
    const { userId } = await signUp("i4c-delete-first");
    const direct = (await auth.$context).internalAdapter;
    const linked = await direct.createAccount({
      userId, providerId: "google", accountId: "delete-first-account",
    });
    const paused = pauseNativeQuery(writer, sql => /^delete from "account" /i.test(sql));
    try {
      const removing = direct.deleteAccount(linked.id);
      await paused.entered;
      await deactivator.query("set lock_timeout='120ms'");
      await expect(deactivator.query(deactivateSql, [userId]))
        .rejects.toMatchObject({ code: "55P03" });
      paused.resume();
      await removing;
    } finally {
      paused.resume();
      paused.restore();
      await deactivator.query("set lock_timeout='0'");
    }
    expect((await accounts(userId)).map(x => x.provider_id)).toEqual(["credential"]);
    await direct.deleteAccounts(userId);
    expect(await accounts(userId)).toHaveLength(0);
    expect((await writer.query<{ id: string }>(
      'select id from "user" where id=$1', [userId],
    )).rows).toHaveLength(1);
    expect(await direct.createAccount({
      userId, providerId: "google", accountId: "relink-after-delete-many",
    })).toMatchObject({ userId, accountId: "relink-after-delete-many" });
  }, 30_000);

  it("classifies account selector SQL outage and preserves real HTTP change-password", async () => {
    const { userId, cookie } = await signUp("i4c-password-http");
    const original = (await accounts(userId))[0];
    const request = () => new Request(origin + "/api/auth/change-password", {
      method: "POST",
      headers: { Origin: origin, Cookie: cookie, "content-type": "application/json" },
      body: JSON.stringify({
        currentPassword: password, newPassword: "new-i4c-password-123", revokeOtherSessions: false,
      }),
    });
    const failingRuntime = (fault: Error) => createHyperdriveAuthRuntime(url, env, () => {
      const client = new Client({ connectionString: url, options: "-c search_path=" + schema });
      const originalQuery = client.query;
      client.query = ((...args: unknown[]) => {
        if (nativeSql(args[0]).startsWith('select user_id from "account" where id = $1')) {
          return Promise.reject(fault);
        }
        return Reflect.apply(originalQuery, client, args);
      }) as typeof client.query;
      return client;
    });
    const fault = Object.assign(new Error("PRIVATE_I4C_DB_DISCONNECT"), { code: "ECONNRESET" });
    const unavailable = await failingRuntime(fault).handle(request());
    expect(unavailable.status).toBe(503);
    expect(unavailable.headers.get("Cache-Control")).toBe("no-store");
    expect(unavailable.headers.getSetCookie().some(x => x.includes("session_token="))).toBe(false);
    expect(await unavailable.text()).not.toContain("PRIVATE_I4C_DB_DISCONNECT");
    await expect(failingRuntime(new TypeError("I4c unexpected account target")).handle(request()))
      .rejects.toBeInstanceOf(AccountStateUnexpectedError);
    expect((await accounts(userId))[0]).toEqual(original);
    const success = await auth.handler(request());
    expect(success.status).toBe(200);
    expect((await accounts(userId))[0].password).not.toBe(original.password);
  }, 30_000);
});


describe("SA04-I4d Better Auth 1.7.7 destructive session write atomicity", () => {
  async function sessions(userId: string) {
    return (await writer.query<{ id: string; token: string }>(
      'select id,token from "session" where user_id=$1 order by id', [userId],
    )).rows;
  }

  it("holds the active owner lock through the original token-selected DELETE", async () => {
    const { userId, session } = await signUp("i4d-single-first");
    const direct = (await auth.$context).internalAdapter;
    const paused = pauseNativeQuery(writer, sql => /^delete from "session" /i.test(sql));
    try {
      const deleting = direct.deleteSession(session.token);
      await paused.entered;
      await deactivator.query("set lock_timeout='120ms'");
      await expect(deactivator.query(deactivateSql, [userId]))
        .rejects.toMatchObject({ code: "55P03" });
      paused.resume();
      await deleting;
    } finally {
      paused.resume();
      paused.restore();
      await deactivator.query("set lock_timeout='0'");
    }
    expect(await sessions(userId)).toEqual([]);
  }, 30_000);

  it("refuses deactivation-first token and bulk deletions without a state change", async () => {
    const { userId, session } = await signUp("i4d-single-loser");
    const direct = (await auth.$context).internalAdapter;
    const snapshot = await sessions(userId);
    const paused = pauseNativeQuery(writer, sql =>
      sql.startsWith('select distinct user_id from "session" where token = $1'));
    try {
      const deleting = direct.deleteSession(session.token);
      await paused.entered;
      await deactivator.query(deactivateSql, [userId]);
      paused.resume();
      await expect(deleting).rejects.toMatchObject({ status: "UNAUTHORIZED" });
    } finally {
      paused.resume();
      paused.restore();
    }
    await expect(direct.deleteUserSessions(userId))
      .rejects.toMatchObject({ status: "UNAUTHORIZED" });
    await expect(direct.deleteSessions([session.token]))
      .rejects.toMatchObject({ status: "UNAUTHORIZED" });
    expect(await sessions(userId)).toEqual(snapshot);
  }, 30_000);

  it("protects same-user deleteMany and rejects multi-owner token batches", async () => {
    const mine = await signUp("i4d-many-first");
    const foreign = await signUp("i4d-many-other");
    const direct = (await auth.$context).internalAdapter;
    const extra = await direct.createSession(mine.userId);
    await expect(direct.deleteSessions([mine.session.token, foreign.session.token]))
      .rejects.toBeInstanceOf(AccountStateUnexpectedError);
    expect(await sessions(mine.userId)).toHaveLength(2);
    expect(await sessions(foreign.userId)).toHaveLength(1);

    await direct.deleteSessions([extra.token]);
    expect((await sessions(mine.userId)).map(x => x.token)).toEqual([mine.session.token]);
    const paused = pauseNativeQuery(writer, sql => /^delete from "session" /i.test(sql));
    try {
      const deleting = direct.deleteUserSessions(mine.userId);
      await paused.entered;
      await deactivator.query("set lock_timeout='120ms'");
      await expect(deactivator.query(deactivateSql, [mine.userId]))
        .rejects.toMatchObject({ code: "55P03" });
      paused.resume();
      await deleting;
    } finally {
      paused.resume();
      paused.restore();
      await deactivator.query("set lock_timeout='0'");
    }
    expect(await sessions(mine.userId)).toEqual([]);
    expect(await sessions(foreign.userId)).toHaveLength(1);
  }, 30_000);

  it("preserves actual active HTTP revoke-one, other and all session endpoints", async () => {
    const { userId, cookie, session } = await signUp("i4d-revocations");
    const direct = (await auth.$context).internalAdapter;
    const call = (endpoint: string, body: object = {}) => auth.handler(new Request(
      origin + "/api/auth/" + endpoint, {
        method: "POST",
        headers: { Cookie: cookie, Origin: origin, "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    ));
    const first = await direct.createSession(userId);
    expect((await call("revoke-session", { token: first.token })).status).toBe(200);
    expect((await sessions(userId)).map(x => x.token)).toEqual([session.token]);
    const second = await direct.createSession(userId);
    const concurrentOther = await direct.createSession(userId);
    const thirdOther = await direct.createSession(userId);
    const originalQuery = writer.query;
    let beginCount = 0;
    writer.query = ((...args: unknown[]) => {
      if (nativeSql(args[0]) === "BEGIN") beginCount++;
      return Reflect.apply(originalQuery, writer, args);
    }) as typeof writer.query;
    const paused = pauseNativeQuery(writer, sql => /^delete from "session" /i.test(sql));
    try {
      const revoking = call("revoke-other-sessions");
      await paused.entered;
      // BA's Promise.all tries to delete every other session concurrently;
      // all adapter transactions must serialize on this single PG Client.
      expect(beginCount).toBe(1);
      paused.resume();
      expect((await revoking).status).toBe(200);
    } finally {
      paused.resume();
      paused.restore();
      writer.query = originalQuery;
    }
    expect((await sessions(userId)).map(x => x.token)).toEqual([session.token]);
    expect(concurrentOther.token).not.toBe(thirdOther.token);
    const third = await direct.createSession(userId);
    expect(third.token).not.toBe(second.token);
    expect((await call("revoke-sessions")).status).toBe(200);
    expect(await sessions(userId)).toEqual([]);
  });

  it("allows only signed own inactive sign-out, deleting exactly the current session", async () => {
    const inactive = await signUp("i4d-inactive-signout");
    const foreign = await signUp("i4d-foreign-signout");
    const direct = (await auth.$context).internalAdapter;
    const retainedOther = await direct.createSession(inactive.userId);
    await deactivator.query(deactivateSql, [inactive.userId]);
    await expect(direct.deleteSession(retainedOther.token))
      .rejects.toMatchObject({ status: "UNAUTHORIZED" });

    const signedOut = await auth.handler(new Request(origin + "/api/auth/sign-out", {
      method: "POST",
      headers: { Cookie: inactive.cookie, Origin: origin, "content-type": "application/json" },
      body: JSON.stringify({}),
    }));
    expect(signedOut.status).toBe(200);
    expect(signedOut.headers.getSetCookie().some(value =>
      value.includes("session_token") && value.includes("Max-Age=0"))).toBe(true);
    expect((await sessions(inactive.userId)).map(x => x.token)).toEqual([retainedOther.token]);
    await expect(direct.deleteSession(retainedOther.token))
      .rejects.toMatchObject({ status: "UNAUTHORIZED" });
    expect(await sessions(foreign.userId)).toHaveLength(1);
    const foreignActive = await auth.handler(new Request(origin + "/api/auth/get-session", {
      headers: { Cookie: foreign.cookie },
    }));
    expect(foreignActive.status).toBe(200);
  });

  it("keeps pre-routing expired inactive session resolution guest-only", async () => {
    const { userId, cookie } = await signUp("i4d-expired-inactive");
    await writer.query('update "session" set expires_at=now()-interval \'1 day\' where user_id=$1',
      [userId]);
    await deactivator.query(deactivateSql, [userId]);
    const runtime = createHyperdriveAuthRuntime(url, env, () =>
      new Client({ connectionString: url, options: "-c search_path=" + schema }));
    const resolved = await runtime.getSession(new Headers({ Cookie: cookie }));
    expect(resolved.session).toBeNull();
    expect(resolved.headers.getSetCookie().some(value =>
      value.includes("session_token=") && !value.includes("Max-Age=0"))).toBe(false);
    expect((await writer.query<{ name: string }>(
      'select name from "user" where id=$1', [userId],
    )).rows[0]?.name).toBe("I4a active member");
  });

  it("classifies destructive target SQL outages and does not claim a session deletion", async () => {
    const { userId, cookie, session } = await signUp("i4d-failed-revoke");
    const request = () => new Request(origin + "/api/auth/revoke-session", {
      method: "POST",
      headers: { Cookie: cookie, Origin: origin, "content-type": "application/json" },
      body: JSON.stringify({ token: session.token }),
    });
    const withFailure = (fault: Error) => createHyperdriveAuthRuntime(url, env, () => {
      const client = new Client({ connectionString: url, options: "-c search_path=" + schema });
      const original = client.query;
      client.query = ((...args: unknown[]) => {
        if (nativeSql(args[0]).startsWith('select distinct user_id from "session" where token = $1')) {
          return Promise.reject(fault);
        }
        return Reflect.apply(original, client, args);
      }) as typeof client.query;
      return client;
    });
    const unavailable = Object.assign(new Error("PRIVATE_I4D_REVOKE_DISCONNECT"), { code: "ECONNRESET" });
    const denied = await withFailure(unavailable).handle(request());
    expect(denied.status).toBe(503);
    expect(denied.headers.get("Cache-Control")).toBe("no-store");
    expect(denied.headers.getSetCookie().some(x => x.includes("session_token="))).toBe(false);
    expect(await denied.text()).not.toContain("PRIVATE_I4D_REVOKE_DISCONNECT");
    await expect(withFailure(new TypeError("I4d unexpected session owner SQL"))
      .handle(request())).rejects.toBeInstanceOf(AccountStateUnexpectedError);
    expect((await sessions(userId)).map(x => x.token)).toEqual([session.token]);
  });
});

describe("SA04-I5a connected native account lifecycle across retained cookies", () => {
  it("composes pre-routing, HTTP/direct denial, final write guards and isolated inactive own sign-out", async () => {
    // One real Better Auth/PG17 chain, rather than independent mocked boundary results.
    const runtime = createHyperdriveAuthRuntime(url, env, () =>
      new Client({ connectionString: url, options: "-c search_path=" + schema }));
    const owner = await signUp("i5a-retained-owner");
    const unrelated = await signUp("i5a-unrelated-active");
    const email = "i4a-i5a-retained-owner@example.test";
    const activeEmail = "i4a-i5a-unrelated-active@example.test";
    const call = (endpoint: string, cookie: string, body?: object) => runtime.handle(new Request(
      origin + "/api/auth/" + endpoint, {
        method: body ? "POST" : "GET",
        headers: { Cookie: cookie, Origin: origin,
          "cf-connecting-ip": `203.0.113.${ip++}`,
          ...(body ? { "content-type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }));
    const secondLogin = await runtime.handle(new Request(origin + "/api/auth/sign-in/email", {
      method: "POST",
      headers: { Origin: origin, "content-type": "application/json",
        "cf-connecting-ip": `203.0.113.${ip++}` },
      body: JSON.stringify({ email, password }),
    }));
    expect(secondLogin.status).toBe(200);
    const secondCookie = secondLogin.headers.getSetCookie()
      .find(value => value.includes("session_token="))?.split(";", 1)[0];
    expect(secondCookie).toBeTruthy();
    expect(secondCookie).not.toBe(owner.cookie);
    const cookies = [owner.cookie, secondCookie!];

    const sessions = async (userId: string) => (await writer.query<{
      id: string; token: string; expires_at: Date; updated_at: Date;
    }>('select id,token,expires_at,updated_at from "session" where user_id=$1 order by id',
      [userId])).rows;
    expect(await sessions(owner.userId)).toHaveLength(2);
    const unrelatedBefore = await sessions(unrelated.userId);
    expect(unrelatedBefore).toHaveLength(1);
    for (const cookie of cookies) {
      const context = new RouterContextProvider();
      await initializeAuthContext(context,
        new Request(origin + "/en", { headers: { Cookie: cookie } }), runtime);
      expect(authSessionForRequest(context)?.user.id).toBe(owner.userId);
    }

    // Both old signed cookies become guest after the persisted lifecycle change;
    // even a due session must not slide or mutate as part of denial.
    await writer.query(`update "session" set expires_at=now()+interval '5 days',
      updated_at=now()-interval '2 days' where user_id=$1`, [owner.userId]);
    const retained = await sessions(owner.userId);
    await deactivator.query(deactivateSql, [owner.userId]);
    for (const cookie of cookies) {
      const context = new RouterContextProvider();
      const lookup = await initializeAuthContext(context,
        new Request(origin + "/en", { headers: { Cookie: cookie } }), runtime);
      expect(authSessionForRequest(context)).toBeNull();
      expect(withAuthSessionCookies(new Response("public"), lookup).status).toBe(200);
      expect(lookup.getSetCookie().some(value =>
        value.includes("session_token=") && !value.includes("Max-Age=0"))).toBe(false);
      for (const endpoint of ["get-session", "list-sessions"]) {
        const denied = await call(endpoint, cookie);
        expect(denied.status, endpoint).toBe(401);
        expect(denied.headers.getSetCookie().some(value =>
          value.includes("session_token=") && !value.includes("Max-Age=0"))).toBe(false);
        expect(await denied.text()).not.toContain(email);
      }
      const update = await call("update-user", cookie, { name: "I5A_FORBIDDEN_RENAME" });
      expect(update.status).toBe(401);
    }

    const direct = (await auth.$context).internalAdapter;
    const headers = new Headers({ Cookie: secondCookie });
    await expect(auth.api.getSession({ headers })).rejects.toMatchObject({ status: "UNAUTHORIZED" });
    await expect(auth.api.updateUser({
      headers, body: { name: "I5A_DIRECT_FORBIDDEN_RENAME" },
    })).rejects.toMatchObject({ status: "UNAUTHORIZED" });
    await expect(direct.createSession(owner.userId))
      .rejects.toMatchObject({ status: "UNAUTHORIZED" });
    await expect(direct.updateSession(owner.session.token, {
      expiresAt: new Date(Date.now() + 8 * 86400_000), updatedAt: new Date(),
    })).rejects.toMatchObject({ status: "UNAUTHORIZED" });
    await expect(direct.deleteUserSessions(owner.userId))
      .rejects.toMatchObject({ status: "UNAUTHORIZED" });

    const inactiveLogin = await runtime.handle(new Request(origin + "/api/auth/sign-in/email", {
      method: "POST",
      headers: { Origin: origin, "content-type": "application/json",
        "cf-connecting-ip": `203.0.113.${ip++}` },
      body: JSON.stringify({ email, password }),
    }));
    expect(inactiveLogin.status).toBe(401);
    expect(inactiveLogin.headers.getSetCookie().some(value =>
      value.includes("session_token=") && !value.includes("Max-Age=0"))).toBe(false);
    expect(await sessions(owner.userId)).toEqual(retained);

    // Signed current-cookie cleanup is the only allowed destructive inactive write.
    const signedOut = await call("sign-out", owner.cookie, {});
    expect(signedOut.status).toBe(200);
    expect(signedOut.headers.getSetCookie().some(value =>
      value.includes("session_token") && value.includes("Max-Age=0"))).toBe(true);
    const remaining = await sessions(owner.userId);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].token).not.toBe(owner.session.token);
    expect(remaining[0]).toEqual(retained.find(value => value.token !== owner.session.token));
    expect((await runtime.getSession(new Headers({ Cookie: secondCookie })).session).toBeNull();
    expect((await call("list-sessions", secondCookie!)).status).toBe(401);
    expect((await writer.query<{ name: string; deactivated_at: Date | null }>(
      'select name,deactivated_at from "user" where id=$1', [owner.userId],
    )).rows[0]).toMatchObject({ name: "I4a active member",
      deactivated_at: expect.any(Date) });

    // Expiration remains guest-only; endpoint-last login cookies must win
    // over preliminary old-cookie cleanup for an unrelated still-active user.
    await writer.query("update \"session\" set expires_at=now()-interval '1 minute' where token=$1",
      [remaining[0].token]);
    expect((await runtime.getSession(new Headers({ Cookie: secondCookie })).session).toBeNull();
    const loginRequest = new Request(origin + "/api/auth/sign-in/email", {
      method: "POST",
      headers: { Cookie: secondCookie!, Origin: origin, "content-type": "application/json",
        "cf-connecting-ip": `203.0.113.${ip++}` },
      body: JSON.stringify({ email: activeEmail, password }),
    });
    const pre = await initializeAuthContext(new RouterContextProvider(), loginRequest, runtime);
    const final = withAuthSessionCookies(await runtime.handle(loginRequest), pre);
    expect(final.status).toBe(200);
    const newCookie = final.headers.getSetCookie()
      .filter(value => value.includes("session_token=")).at(-1)?.split(";", 1)[0];
    expect(newCookie).toBeTruthy();
    expect(newCookie).not.toBe(secondCookie);
    expect((await runtime.getSession(new Headers({ Cookie: newCookie! })).session?.user.id)
      .toBe(unrelated.userId);
    expect((await call("list-sessions", unrelated.cookie)).status).toBe(200);
    expect((await sessions(unrelated.userId)).map(value => value.token))
      .toContain(unrelatedBefore[0].token);
    expect((await writer.query<{ deactivated_at: Date | null }>(
      'select deactivated_at from "user" where id=$1', [unrelated.userId],
    )).rows[0]?.deactivated_at).toBeNull();
  }, 45_000);
});
