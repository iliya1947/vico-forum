import { readFile } from "node:fs/promises";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { PgDialect } from "drizzle-orm/pg-core";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  AccountInactiveError,
  AccountMissingError,
  AccountStateUnavailableError,
  AccountStateUnexpectedError,
  activeAccountPredicate,
  assertActiveAccount,
  assertActiveAccountForMutation,
  readAccountState,
} from "../../db/account-state";
import { user } from "../../db/schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const target = new URL(databaseUrl);
if (!["127.0.0.1", "localhost"].includes(target.hostname) || !target.pathname.endsWith("_test")) {
  throw new Error("SA04-A2 tests require a disposable local *_test database");
}
const schema = "sa04_account_state_read_test";
const client = new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });

async function addUser(id: string) {
  await client.query('insert into "user" (id,name,email) values ($1,$2,$3)',
    [id, "Public " + id, id + "@example.test"]);
}
async function markDeactivated(id: string) {
  await client.query(`update "user"
    set deactivated_at='2024-02-29T12:34:56Z',
        deactivated_by_user_id='bound-owner',
        retain_at_least_until='2025-02-28T12:34:56Z'
    where id=$1`, [id]);
}

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const path of ["drizzle/0003_gorgeous_donald_blake.sql", "drizzle/0065_sa04_account_state_foundation.sql"]) {
    const migration = (await readFile(path, "utf8"))
      .replaceAll('"public".', `"${schema}".`)
      .replaceAll("--> statement-breakpoint", "");
    await client.query(migration);
  }
});
beforeEach(async () => {
  await client.query('truncate "user" cascade');
});
afterAll(async () => {
  await client.query(`drop schema if exists ${schema} cascade`);
  await client.end();
});

describe("SA04-A2 server-only account-state read foundation", () => {
  it("distinguishes default active, deactivated and missing without leaking unrelated account fields", async () => {
    await addUser("00001");
    await addUser("другой");
    expect(await readAccountState(client, "00001")).toEqual({ status: "active", userId: "00001" });
    expect(await readAccountState(client, "not-found")).toEqual({ status: "missing", userId: "not-found" });
    await markDeactivated("00001");
    const state = await readAccountState(client, "00001");
    expect(state).toEqual({
      status: "deactivated", userId: "00001",
      deactivatedAt: new Date("2024-02-29T12:34:56.000Z"),
      deactivatedByUserId: "bound-owner",
      retainAtLeastUntil: new Date("2025-02-28T12:34:56.000Z"),
    });
    expect(JSON.stringify(state)).not.toContain("example.test");
    expect(await readAccountState(client, "другой")).toEqual({ status: "active", userId: "другой" });
    // The actor ID is a bound parameter, not interpolated SQL.
    expect(await readAccountState(client, "' OR true --")).toEqual({
      status: "missing", userId: "' OR true --",
    });
  });

  it("uses the same active predicate in real Drizzle and compiled native PostgreSQL SQL", async () => {
    await addUser("active");
    await addUser("inactive");
    await markDeactivated("inactive");
    const database = drizzle(client);
    const rows = await database.select({ id: user.id }).from(user)
      .where(and(eq(user.id, "active"), activeAccountPredicate()));
    expect(rows).toEqual([{ id: "active" }]);
    const excluded = await database.select({ id: user.id }).from(user)
      .where(and(eq(user.id, "inactive"), activeAccountPredicate()));
    expect(excluded).toEqual([]);
    const statement = new PgDialect().sqlToQuery(sql`
      select ${user.id} as id from ${user} where ${activeAccountPredicate()} order by ${user.id}
    `);
    expect((await client.query<{ id: string }>(statement.sql, statement.params)).rows)
      .toEqual([{ id: "active" }]);
  });

  it("read-only assert distinguishes missing and deactivated, including caller-managed transactions", async () => {
    await addUser("actor");
    await client.query("begin");
    try {
      await client.query("set local time zone 'America/New_York'");
      await expect(assertActiveAccount(client, "actor")).resolves.toBeUndefined();
      await markDeactivated("actor");
      await expect(assertActiveAccount(client, "actor")).rejects.toBeInstanceOf(AccountInactiveError);
      await expect(assertActiveAccount(client, "absent")).rejects.toBeInstanceOf(AccountMissingError);
      const state = await readAccountState(client, "actor");
      expect(state.status).toBe("deactivated");
      if (state.status === "deactivated") {
        expect(state.retainAtLeastUntil.toISOString()).toBe("2025-02-28T12:34:56.000Z");
      }
    } finally {
      await client.query("rollback");
    }
    expect(await readAccountState(client, "actor")).toEqual({ status: "active", userId: "actor" });
  });

  it("does not acquire mutation locks or modify the user row during a read", async () => {
    await addUser("actor");
    const another = new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
    await another.connect();
    try {
      await client.query("begin");
      try {
        expect((await readAccountState(client, "actor")).status).toBe("active");
        await another.query("set lock_timeout = '250ms'");
        await another.query('update "user" set deactivated_at=$2, deactivated_by_user_id=$3, retain_at_least_until=$4 where id=$1',
          ["actor", new Date("2024-02-29T12:34:56Z"), "bound-owner", new Date("2025-02-28T12:34:56Z")]);
      } finally {
        await client.query("rollback");
      }
      expect((await readAccountState(client, "actor")).status).toBe("deactivated");
    } finally {
      await another.end();
    }
  });

  it("classifies connection, query-timeout and wrapped availability separately from unexpected failures", async () => {
    const fake = (error: Error) => ({
      query: async () => { throw error; },
    }) as unknown as Pick<Client, "query">;
    const connection = Object.assign(new Error("connection down"), { code: "08006" });
    await expect(readAccountState(fake(connection), "actor"))
      .rejects.toMatchObject({ name: "AccountStateUnavailableError", cause: connection });
    const timeout = Object.assign(new Error("canceling statement due to statement timeout"), { code: "57014" });
    const wrapped = new Error("wrapped query failure", { cause: timeout });
    await expect(readAccountState(fake(wrapped), "actor"))
      .rejects.toMatchObject({ name: "AccountStateUnavailableError", cause: wrapped });
    const schemaMismatch = Object.assign(new Error("undefined column"), { code: "42703" });
    await expect(readAccountState(fake(schemaMismatch), "actor"))
      .rejects.toMatchObject({ name: "AccountStateUnexpectedError", cause: schemaMismatch });
    await expect(readAccountState(fake(new Error("programming error")), "actor"))
      .rejects.toBeInstanceOf(AccountStateUnexpectedError);
    await expect(readAccountState(client, "")).rejects.toBeInstanceOf(AccountStateUnexpectedError);
    expect(AccountStateUnavailableError).not.toBe(AccountStateUnexpectedError);
  });

  it("rejects inconsistent row data rather than silently declaring a partial account active", async () => {
    const fake = {
      query: async () => ({ rows: [{
        deactivated_at: null, deactivated_by_user_id: "actor", retain_at_least_until: null,
      }] }),
    } as unknown as Pick<Client, "query">;
    await expect(readAccountState(fake, "actor")).rejects.toBeInstanceOf(AccountStateUnexpectedError);
  });
}
  it("holds the same user row through caller COMMIT, without mutating account state", async () => {
    await addUser("guarded-actor");
    const competing = new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
    await competing.connect();
    let transactionOpen = false;
    try {
      await client.query("begin");
      transactionOpen = true;
      await assertActiveAccountForMutation(client, "guarded-actor");
      expect(await readAccountState(client, "guarded-actor"))
        .toEqual({ status: "active", userId: "guarded-actor" });
      await competing.query("begin");
      await competing.query("set local lock_timeout = '180ms'");
      await expect(competing.query(`update "user"
        set deactivated_at='2024-02-29T12:34:56Z',
            deactivated_by_user_id='bound-owner',
            retain_at_least_until='2025-02-28T12:34:56Z'
        where id=$1`, ["guarded-actor"])).rejects.toMatchObject({ code: "55P03" });
      await competing.query("rollback");
      expect(await readAccountState(client, "guarded-actor"))
        .toEqual({ status: "active", userId: "guarded-actor" });
      await client.query("commit");
      transactionOpen = false;
      await competing.query(`update "user"
        set deactivated_at='2024-02-29T12:34:56Z',
            deactivated_by_user_id='bound-owner',
            retain_at_least_until='2025-02-28T12:34:56Z'
        where id=$1`, ["guarded-actor"]);
      expect((await readAccountState(client, "guarded-actor")).status).toBe("deactivated");
    } finally {
      if (transactionOpen) await client.query("rollback");
      await competing.end();
    }
  });

  it("does not admit a stale active account when competing deactivation obtained the row first", async () => {
    await addUser("guarded-actor");
    const writer = new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
    await writer.connect();
    let writerOpen = false;
    let guardOpen = false;
    try {
      await writer.query("begin");
      writerOpen = true;
      await writer.query(`update "user"
        set deactivated_at='2024-02-29T12:34:56Z',
            deactivated_by_user_id='bound-owner',
            retain_at_least_until='2025-02-28T12:34:56Z'
        where id=$1`, ["guarded-actor"]);
      await client.query("begin");
      guardOpen = true;
      await client.query("set local lock_timeout = '180ms'");
      await expect(assertActiveAccountForMutation(client, "guarded-actor"))
        .rejects.toBeInstanceOf(AccountStateUnavailableError);
      await client.query("rollback");
      guardOpen = false;
      await writer.query("commit");
      writerOpen = false;
      await client.query("begin");
      guardOpen = true;
      await expect(assertActiveAccountForMutation(client, "guarded-actor"))
        .rejects.toBeInstanceOf(AccountInactiveError);
      await client.query("rollback");
      guardOpen = false;
    } finally {
      if (guardOpen) await client.query("rollback");
      if (writerOpen) await writer.query("rollback");
      await writer.end();
    }
  });

  it("reuses existing caller-owned user locks and distinguishes missing/inactive state", async () => {
    await addUser("guarded-actor");
    await addUser("other-actor");
    await client.query("begin");
    try {
      await client.query('select id from "user" where id=$1 for update', ["guarded-actor"]);
      await expect(assertActiveAccountForMutation(client, "guarded-actor")).resolves.toBeUndefined();
      await expect(assertActiveAccountForMutation(client, "guarded-actor")).resolves.toBeUndefined();
      await expect(assertActiveAccountForMutation(client, "other-actor")).resolves.toBeUndefined();
      await expect(assertActiveAccountForMutation(client, "absent")).rejects.toBeInstanceOf(AccountMissingError);
    } finally {
      await client.query("rollback");
    }
    await markDeactivated("guarded-actor");
    await client.query("begin");
    try {
      await expect(assertActiveAccountForMutation(client, "guarded-actor"))
        .rejects.toBeInstanceOf(AccountInactiveError);
    } finally {
      await client.query("rollback");
    }
  });

  it("allows a concurrent foreign-key KEY SHARE while guarding the actor", async () => {
    await addUser("guarded-actor");
    const dependent = new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
    await dependent.connect();
    let transactionOpen = false;
    try {
      await client.query("begin");
      transactionOpen = true;
      await assertActiveAccountForMutation(client, "guarded-actor");
      await dependent.query("begin");
      try {
        await dependent.query("set local lock_timeout = '180ms'");
        await dependent.query(
          "insert into account (id,account_id,provider_id,user_id,updated_at)" +
          " values ('fk-check','fk-check','credential',$1,now())",
          ["guarded-actor"],
        );
        await dependent.query("commit");
      } catch (error) {
        await dependent.query("rollback");
        throw error;
      }
      expect((await client.query('select count(*)::int as count from account where user_id=$1',
        ["guarded-actor"])).rows[0].count).toBe(1);
      expect(await readAccountState(client, "guarded-actor"))
        .toEqual({ status: "active", userId: "guarded-actor" });
    } finally {
      if (transactionOpen) await client.query("rollback");
      await dependent.end();
    }
  });
});
