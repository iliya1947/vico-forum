import { readFile } from "node:fs/promises";

import { Client, Pool, type PoolClient } from "pg";
import { describe, expect, it } from "vitest";
import { PostgresAuthorizationRepository } from "../../db/authorization-repository";

const permission = "forum.reply.create" as const;
const migrationFiles = [
  "0000_tan_johnny_storm.sql",
  "0001_seed-locales.sql",
  "0002_ui_translation_storage.sql",
  "0003_gorgeous_donald_blake.sql",
  "0004_forum_domain_foundation.sql",
  "0005_calm_proemial_gods.sql",
  "0006_loving_sentinels.sql",
] as const;

function requiredDatabaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required for the disposable database integration test");
  return value;
}

const databaseUrl = requiredDatabaseUrl();
const parsedDatabaseUrl = new URL(databaseUrl);
if (!["127.0.0.1", "localhost"].includes(parsedDatabaseUrl.hostname) || !parsedDatabaseUrl.pathname.endsWith("_test")) {
  throw new Error("Database integration tests only run against a local database ending in _test");
}

interface Deferred {
  promise: Promise<void>;
  resolve(): void;
}

function deferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function withWatchdog<T>(promise: Promise<T>, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const watchdog = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} did not complete within 5 seconds`)), 5_000);
  });
  try {
    return await Promise.race([promise, watchdog]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

type QueryPhase = "before" | "after";
type QueryObserver = (phase: QueryPhase, sql: string) => void | Promise<void>;

interface SimpleQueryTarget {
  query(sql: string, values?: unknown[]): Promise<unknown>;
}

async function observedQuery(
  target: SimpleQueryTarget,
  observe: QueryObserver,
  sql: string,
  values?: unknown[],
): Promise<unknown> {
  await observe("before", sql);
  const result = await target.query(sql, values);
  await observe("after", sql);
  return result;
}

function observedPool(pool: Pool, observe: QueryObserver): Pool {
  return {
    query: (sql: string, values?: unknown[]) =>
      observedQuery(pool as unknown as SimpleQueryTarget, observe, sql, values),
    connect: async () => {
      const client = await pool.connect();
      return {
        query: (sql: string, values?: unknown[]) =>
          observedQuery(client as unknown as SimpleQueryTarget, observe, sql, values),
        release: () => client.release(),
      } as unknown as PoolClient;
    },
  } as unknown as Pool;
}

async function createSchema(schemaName: string, seed: (client: Client) => Promise<void>): Promise<void> {
  const setup = new Client({ connectionString: databaseUrl });
  await setup.connect();
  try {
    await setup.query(`drop schema if exists ${schemaName} cascade; create schema ${schemaName}`);
    await setup.query(`set search_path to ${schemaName}`);
    for (const file of migrationFiles) {
      const sql = (await readFile(`drizzle/${file}`, "utf8")).replaceAll('"public".', `"${schemaName}".`);
      await setup.query(sql);
    }
    await seed(setup);
  } finally {
    await setup.end();
  }
}

async function dropSchema(schemaName: string): Promise<void> {
  const cleanup = new Client({ connectionString: databaseUrl });
  await cleanup.connect();
  try {
    await cleanup.query(`drop schema if exists ${schemaName} cascade`);
  } finally {
    await cleanup.end();
  }
}

async function insertSnapshotUser(client: Client): Promise<void> {
  await client.query(
    `insert into "user" (id, name, email, email_verified, created_at, updated_at, locale)
     values ('snapshot-user', 'Snapshot User', 'snapshot@example.test', true, now(), now(), null)`,
  );
  await client.query(`insert into authz_roles (id, slug, display_name, is_system) values
    ('snapshot-role-a', 'snapshot-role-a', 'Snapshot Role A', false),
    ('snapshot-role-b', 'snapshot-role-b', 'Snapshot Role B', false)`);
  await client.query(
    "insert into authz_user_roles (user_id, role_id) values ('snapshot-user', 'snapshot-role-a')",
  );
}

async function commitSteps(
  writer: Client,
  steps: ReadonlyArray<{ sql: string; values?: unknown[] }>,
): Promise<void> {
  await writer.query("BEGIN");
  try {
    for (const step of steps) await writer.query(step.sql, step.values);
    await writer.query("COMMIT");
  } catch (error) {
    await writer.query("ROLLBACK").catch(() => undefined);
    throw error;
  }
}

function scopedPool(schemaName: string): Pool {
  return new Pool({
    connectionString: databaseUrl,
    max: 1,
    options: `-c search_path=${schemaName}`,
  });
}

function scopedWriter(schemaName: string): Client {
  return new Client({
    connectionString: databaseUrl,
    options: `-c search_path=${schemaName}`,
  });
}

describe("authorization composite snapshot consistency", () => {
  it("REM-10 keeps resolveUser wholly-before while grants and overrides change between component reads", async () => {
    const schemaName = "authorization_snapshot_user_test";
    await createSchema(schemaName, async (setup) => {
      await insertSnapshotUser(setup);
      await setup.query(
        "insert into authz_role_permissions (role_id, permission_key) values ('snapshot-role-a', $1)",
        [permission],
      );
      await setup.query(
        "insert into authz_user_permission_overrides (user_id, permission_key, effect) values ('snapshot-user', $1, 'deny')",
        [permission],
      );
    });

    const readerPool = scopedPool(schemaName);
    const writer = scopedWriter(schemaName);
    const grantsRead = deferred();
    const overrideHeld = deferred();
    const releaseOverride = deferred();
    let blockOverride = true;
    let readerPromise: Promise<Awaited<ReturnType<PostgresAuthorizationRepository["resolveUser"]>>> | undefined;

    const pool = observedPool(readerPool, async (phase, sql) => {
      if (phase === "after" && sql.startsWith("select permission_key from authz_role_permissions")) {
        grantsRead.resolve();
      }
      if (
        phase === "before" &&
        blockOverride &&
        sql.startsWith("select permission_key, effect from authz_user_permission_overrides")
      ) {
        blockOverride = false;
        await grantsRead.promise;
        overrideHeld.resolve();
        await releaseOverride.promise;
      }
    });

    await writer.connect();
    try {
      const repository = new PostgresAuthorizationRepository(pool);
      readerPromise = repository.resolveUser("snapshot-user");
      await withWatchdog(overrideHeld.promise, "REM-10 override barrier");

      await commitSteps(writer, [{
        sql: "delete from authz_role_permissions where role_id = 'snapshot-role-a' and permission_key = $1",
        values: [permission],
      }]);
      await commitSteps(writer, [{
        sql: "delete from authz_user_permission_overrides where user_id = 'snapshot-user' and permission_key = $1",
        values: [permission],
      }]);

      releaseOverride.resolve();
      const first = await withWatchdog(readerPromise, "REM-10 snapshot resolution");
      expect(first).toMatchObject({
        role: { id: "snapshot-role-a", slug: "snapshot-role-a" },
        grants: [permission],
        overrides: { [permission]: "deny" },
      });
      expect(first.effectivePermissions).not.toContain(permission);

      const after = await new PostgresAuthorizationRepository(readerPool).resolveUser("snapshot-user");
      expect(after).toMatchObject({
        role: { id: "snapshot-role-a", slug: "snapshot-role-a" },
        grants: [],
        overrides: {},
      });
      expect(after.effectivePermissions).not.toContain(permission);
    } finally {
      releaseOverride.resolve();
      if (readerPromise) await withWatchdog(readerPromise.catch(() => undefined), "REM-10 cleanup").catch(() => undefined);
      await writer.query("ROLLBACK").catch(() => undefined);
      await writer.end();
      await readerPool.end();
      await dropSchema(schemaName);
    }
  });

  it("REM-11 keeps management state wholly-before while assignment and grants move between component reads", async () => {
    const schemaName = "authorization_snapshot_management_test";
    await createSchema(schemaName, async (setup) => {
      await insertSnapshotUser(setup);
      await setup.query(
        "insert into authz_role_permissions (role_id, permission_key) values ('snapshot-role-a', $1)",
        [permission],
      );
    });

    const readerPool = scopedPool(schemaName);
    const writer = scopedWriter(schemaName);
    const usersRead = deferred();
    const grantsHeld = deferred();
    const releaseGrants = deferred();
    let blockGrants = true;
    let readerPromise: Promise<Awaited<ReturnType<PostgresAuthorizationRepository["readManagementState"]>>> | undefined;

    const pool = observedPool(readerPool, async (phase, sql) => {
      if (phase === "after" && sql.includes('from "user" u left join authz_user_roles')) {
        usersRead.resolve();
      }
      if (
        phase === "before" &&
        blockGrants &&
        sql.startsWith("select role_id, permission_key from authz_role_permissions")
      ) {
        blockGrants = false;
        await usersRead.promise;
        grantsHeld.resolve();
        await releaseGrants.promise;
      }
    });

    await writer.connect();
    try {
      const repository = new PostgresAuthorizationRepository(pool);
      readerPromise = repository.readManagementState();
      await withWatchdog(grantsHeld.promise, "REM-11 grants barrier");

      await commitSteps(writer, [{
        sql: "update authz_user_roles set role_id = 'snapshot-role-b', assigned_at = now() where user_id = 'snapshot-user'",
      }]);
      await commitSteps(writer, [
        {
          sql: "delete from authz_role_permissions where role_id = 'snapshot-role-a' and permission_key = $1",
          values: [permission],
        },
        {
          sql: "insert into authz_role_permissions (role_id, permission_key) values ('snapshot-role-b', $1)",
          values: [permission],
        },
      ]);

      releaseGrants.resolve();
      const first = await withWatchdog(readerPromise, "REM-11 snapshot read");
      const firstUser = first.users.find((user) => user.id === "snapshot-user");
      expect(firstUser?.authorization).toMatchObject({
        role: { id: "snapshot-role-a", slug: "snapshot-role-a" },
        grants: [permission],
      });
      expect(firstUser?.authorization.effectivePermissions).toContain(permission);
      expect(first.roles.find((role) => role.id === "snapshot-role-a")?.grants).toContain(permission);
      expect(first.roles.find((role) => role.id === "snapshot-role-b")?.grants).not.toContain(permission);

      const after = await new PostgresAuthorizationRepository(readerPool).readManagementState();
      const afterUser = after.users.find((user) => user.id === "snapshot-user");
      expect(afterUser?.authorization).toMatchObject({
        role: { id: "snapshot-role-b", slug: "snapshot-role-b" },
        grants: [permission],
      });
      expect(afterUser?.authorization.effectivePermissions).toContain(permission);
      expect(after.roles.find((role) => role.id === "snapshot-role-a")?.grants).not.toContain(permission);
      expect(after.roles.find((role) => role.id === "snapshot-role-b")?.grants).toContain(permission);
    } finally {
      releaseGrants.resolve();
      if (readerPromise) await withWatchdog(readerPromise.catch(() => undefined), "REM-11 cleanup").catch(() => undefined);
      await writer.query("ROLLBACK").catch(() => undefined);
      await writer.end();
      await readerPool.end();
      await dropSchema(schemaName);
    }
  });
});
