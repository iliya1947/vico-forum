import { readFile } from "node:fs/promises";

import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, type DatabaseError } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH,
  ContentTranslationRequestBudgetStorageUnavailableError,
  type ContentTranslationRequestBudgetAdmission,
} from "../../app/localization/content-request-budget.server";
import { DrizzleContentTranslationRequestBudgetStore } from "../../db/content-request-budget-store";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for the disposable database integration test");
}

const parsedDatabaseUrl = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost"].includes(parsedDatabaseUrl.hostname)
  || !parsedDatabaseUrl.pathname.endsWith("_test")
) {
  throw new Error("Database integration tests only run against a local database ending in _test");
}

const schemaName = "content_request_budget_test";
const client = new Client({ connectionString: databaseUrl });

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schemaName} cascade; create schema ${schemaName}`);
  await client.query(`set search_path to ${schemaName}`);
  await client.query(
    await readFile("drizzle/0017_content_translation_request_budget.sql", "utf8"),
  );
});

beforeEach(async () => {
  await client.query("truncate content_translation_request_budget_counters");
});

afterAll(async () => {
  await client.query("set search_path to public");
  await client.query(`drop schema if exists ${schemaName} cascade`);
  await client.end();
});

const SUBJECT_A = "A".repeat(CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH);
const SUBJECT_B = "B".repeat(CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH);

function admission(
  subjectKey = SUBJECT_A,
  overrides: Partial<ContentTranslationRequestBudgetAdmission> = {},
): ContentTranslationRequestBudgetAdmission {
  return {
    subjectKey,
    cost: 1,
    windowSeconds: 600,
    global: {
      name: "content-translation-global",
      version: "test-v1",
      limit: 10,
    },
    requester: {
      name: "content-translation-requester",
      version: "test-v1",
      limit: 5,
    },
    ...overrides,
  };
}

async function counterRows() {
  return (await client.query<{
    scope: string;
    subject_key: string;
    used_units: string;
  }>(
    `select scope, subject_key, used_units::text
       from content_translation_request_budget_counters
      order by scope, subject_key`,
  )).rows;
}

async function scopedStore(): Promise<{
  client: Client;
  store: DrizzleContentTranslationRequestBudgetStore;
}> {
  const connection = new Client({ connectionString: databaseUrl });
  await connection.connect();
  await connection.query(`set search_path to ${schemaName}`);
  return {
    client: connection,
    store: new DrizzleContentTranslationRequestBudgetStore(drizzle(connection)),
  };
}

describe("DrizzleContentTranslationRequestBudgetStore", () => {
  it("inserts counters, allows the exact limit, and rolls back a requester denial without a partial global charge", async () => {
    const store = new DrizzleContentTranslationRequestBudgetStore(drizzle(client));
    const policy = admission(SUBJECT_A, {
      cost: 2,
      global: {
        name: "content-translation-global",
        version: "exact-v1",
        limit: 10,
      },
      requester: {
        name: "content-translation-requester",
        version: "exact-v1",
        limit: 4,
      },
    });

    await expect(store.consume(policy)).resolves.toMatchObject({
      allowed: true,
      remainingUnits: { global: 8, requester: 2 },
      retryAfterSeconds: 0,
    });
    await expect(store.consume(policy)).resolves.toMatchObject({
      allowed: true,
      remainingUnits: { global: 6, requester: 0 },
    });

    const denied = await store.consume({ ...policy, cost: 1 });
    expect(denied).toMatchObject({
      allowed: false,
      reason: "limit-exceeded",
      limitingScope: "requester",
      remainingUnits: 0,
    });
    expect(denied.retryAfterSeconds).toBeGreaterThanOrEqual(0);
    expect(denied.resetAt).toBeInstanceOf(Date);

    expect(await counterRows()).toEqual([
      {
        scope: "content-translation-global@exact-v1",
        subject_key: "_global",
        used_units: "4",
      },
      {
        scope: "content-translation-requester@exact-v1",
        subject_key: SUBJECT_A,
        used_units: "4",
      },
    ]);
  });

  it("denies at the global limit before creating or charging a requester counter", async () => {
    const store = new DrizzleContentTranslationRequestBudgetStore(drizzle(client));
    const first = admission(SUBJECT_A, {
      cost: 2,
      global: {
        name: "content-translation-global",
        version: "global-v1",
        limit: 2,
      },
      requester: {
        name: "content-translation-requester",
        version: "global-v1",
        limit: 10,
      },
    });
    expect((await store.consume(first)).allowed).toBe(true);

    const denied = await store.consume({ ...first, subjectKey: SUBJECT_B, cost: 1 });
    expect(denied).toMatchObject({
      allowed: false,
      reason: "limit-exceeded",
      limitingScope: "global",
      remainingUnits: 0,
    });

    expect(await counterRows()).toEqual([
      {
        scope: "content-translation-global@global-v1",
        subject_key: "_global",
        used_units: "2",
      },
      {
        scope: "content-translation-requester@global-v1",
        subject_key: SUBJECT_A,
        used_units: "2",
      },
    ]);
  });

  it("serializes concurrent admissions without overshooting either configured limit", async () => {
    const connections = await Promise.all(
      Array.from({ length: 10 }, () => scopedStore()),
    );
    try {
      const request = admission(SUBJECT_A, {
        global: {
          name: "content-translation-global",
          version: "concurrent-v1",
          limit: 5,
        },
        requester: {
          name: "content-translation-requester",
          version: "concurrent-v1",
          limit: 5,
        },
      });
      const decisions = await Promise.all(
        connections.map(({ store }) => store.consume(request)),
      );

      expect(decisions.filter(({ allowed }) => allowed)).toHaveLength(5);
      expect(decisions.filter(({ allowed }) => !allowed)).toHaveLength(5);
      expect(await counterRows()).toEqual([
        {
          scope: "content-translation-global@concurrent-v1",
          subject_key: "_global",
          used_units: "5",
        },
        {
          scope: "content-translation-requester@concurrent-v1",
          subject_key: SUBJECT_A,
          used_units: "5",
        },
      ]);
    } finally {
      await Promise.all(connections.map(({ client: connection }) => connection.end()));
    }
  });

  it("uses deterministic global-before-requester locking across different subjects", async () => {
    const connections = await Promise.all(
      Array.from({ length: 10 }, () => scopedStore()),
    );
    try {
      const decisions = await Promise.all(connections.map(({ store }, index) =>
        store.consume(admission(index % 2 === 0 ? SUBJECT_A : SUBJECT_B, {
          global: {
            name: "content-translation-global",
            version: "order-v1",
            limit: 7,
          },
          requester: {
            name: "content-translation-requester",
            version: "order-v1",
            limit: 10,
          },
        }))
      ));

      expect(decisions.filter(({ allowed }) => allowed)).toHaveLength(7);
      const rows = await counterRows();
      expect(rows.find(({ subject_key }) => subject_key === "_global")?.used_units)
        .toBe("7");
      const requesterTotal = rows
        .filter(({ subject_key }) => subject_key !== "_global")
        .reduce((sum, row) => sum + Number(row.used_units), 0);
      expect(requesterTotal).toBe(7);
    } finally {
      await Promise.all(connections.map(({ client: connection }) => connection.end()));
    }
  });

  it("isolates pseudonymous subjects and versioned policy scopes", async () => {
    const store = new DrizzleContentTranslationRequestBudgetStore(drizzle(client));

    expect((await store.consume(admission(SUBJECT_A, {
      global: {
        name: "content-translation-global",
        version: "isolation-v1",
        limit: 10,
      },
      requester: {
        name: "content-translation-requester",
        version: "isolation-v1",
        limit: 10,
      },
    }))).allowed).toBe(true);

    expect((await store.consume(admission(SUBJECT_B, {
      global: {
        name: "content-translation-global",
        version: "isolation-v1",
        limit: 10,
      },
      requester: {
        name: "content-translation-requester",
        version: "isolation-v1",
        limit: 10,
      },
    }))).allowed).toBe(true);

    expect((await store.consume(admission(SUBJECT_A, {
      global: {
        name: "content-translation-global",
        version: "isolation-v2",
        limit: 10,
      },
      requester: {
        name: "content-translation-requester",
        version: "isolation-v2",
        limit: 10,
      },
    }))).allowed).toBe(true);

    const rows = await counterRows();
    expect(rows.filter(({ scope }) => scope.endsWith("@isolation-v1"))).toHaveLength(3);
    expect(rows.filter(({ scope }) => scope.endsWith("@isolation-v2"))).toHaveLength(2);
  });

  it("derives reset and retry metadata from the database-owned aligned window", async () => {
    const store = new DrizzleContentTranslationRequestBudgetStore(drizzle(client));
    const request = admission(SUBJECT_A, {
      windowSeconds: 60,
      global: {
        name: "content-translation-global",
        version: "clock-v1",
        limit: 1,
      },
      requester: {
        name: "content-translation-requester",
        version: "clock-v1",
        limit: 1,
      },
    });
    expect((await store.consume(request)).allowed).toBe(true);
    const denied = await store.consume(request);
    if (denied.allowed) throw new Error("clock fixture unexpectedly allowed");

    const stored = await client.query<{
      expires_at: Date;
      window_start: Date;
    }>(
      `select window_start, expires_at
         from content_translation_request_budget_counters
        where scope = 'content-translation-global@clock-v1'
          and subject_key = '_global'`,
    );
    const row = stored.rows[0];
    if (!row) throw new Error("clock fixture row missing");

    expect(row.expires_at.getTime()).toBe(denied.resetAt.getTime());
    expect(row.window_start.getTime() % 60_000).toBe(0);
    expect(row.expires_at.getTime() - row.window_start.getTime()).toBe(60_000);
    expect(denied.retryAfterSeconds).toBeGreaterThanOrEqual(0);
    expect(denied.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("rolls back a successful global charge when an unexpected requester write fails", async () => {
    const store = new DrizzleContentTranslationRequestBudgetStore(drizzle(client));
    await client.query(`
      create function reject_requester_budget_fixture()
      returns trigger
      language plpgsql
      as $$
      begin
        if new.subject_key <> '_global' then
          raise exception 'requester fixture failure' using errcode = 'P0001';
        end if;
        return new;
      end;
      $$;
      create trigger reject_requester_budget_fixture
      before insert or update on content_translation_request_budget_counters
      for each row execute function reject_requester_budget_fixture();
    `);

    try {
      let thrown: unknown;
      try {
        await store.consume(admission(SUBJECT_A, {
          global: {
            name: "content-translation-global",
            version: "rollback-v1",
            limit: 10,
          },
          requester: {
            name: "content-translation-requester",
            version: "rollback-v1",
            limit: 10,
          },
        }));
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(Error);
      expect(thrown).not.toBeInstanceOf(
        ContentTranslationRequestBudgetStorageUnavailableError,
      );
      expect((thrown as Error & { cause?: DatabaseError }).cause?.code).toBe("P0001");
      expect(await counterRows()).toEqual([]);
    } finally {
      await client.query(
        "drop trigger if exists reject_requester_budget_fixture on content_translation_request_budget_counters",
      );
      await client.query("drop function if exists reject_requester_budget_fixture()");
    }
  });

  it("classifies only known storage availability failures", async () => {
    const unavailable = Object.assign(new Error("connection unavailable"), {
      code: "08006",
    });
    const unavailableDatabase = {
      async transaction() {
        throw new Error("drizzle wrapper", { cause: unavailable });
      },
    } as unknown as NodePgDatabase;
    const unavailableStore = new DrizzleContentTranslationRequestBudgetStore(
      unavailableDatabase,
    );
    await expect(unavailableStore.consume(admission())).rejects.toBeInstanceOf(
      ContentTranslationRequestBudgetStorageUnavailableError,
    );

    const programmingFailure = new Error("programming failure");
    const programmingDatabase = {
      async transaction() {
        throw programmingFailure;
      },
    } as unknown as NodePgDatabase;
    const programmingStore = new DrizzleContentTranslationRequestBudgetStore(
      programmingDatabase,
    );
    await expect(programmingStore.consume(admission())).rejects.toBe(
      programmingFailure,
    );
  });

  it("cleans expired rows in a bounded deterministic indexed batch", async () => {
    const store = new DrizzleContentTranslationRequestBudgetStore(drizzle(client));
    const subjects = [
      "C".repeat(CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH),
      "D".repeat(CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH),
      "E".repeat(CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH),
    ];
    await client.query(
      `insert into content_translation_request_budget_counters
        (scope, subject_key, window_start, used_units, expires_at, created_at, updated_at)
       values
        ('cleanup@v1', $1, transaction_timestamp() - interval '10 minutes', 1,
          transaction_timestamp() - interval '3 minutes',
          transaction_timestamp() - interval '10 minutes',
          transaction_timestamp() - interval '10 minutes'),
        ('cleanup@v1', $2, transaction_timestamp() - interval '9 minutes', 1,
          transaction_timestamp() - interval '2 minutes',
          transaction_timestamp() - interval '9 minutes',
          transaction_timestamp() - interval '9 minutes'),
        ('cleanup@v1', $3, transaction_timestamp() - interval '8 minutes', 1,
          transaction_timestamp() - interval '1 minute',
          transaction_timestamp() - interval '8 minutes',
          transaction_timestamp() - interval '8 minutes')`,
      subjects,
    );

    await expect(store.cleanupExpired(2)).resolves.toBe(2);
    expect((await client.query<{ subject_key: string }>(
      "select subject_key from content_translation_request_budget_counters",
    )).rows).toEqual([{ subject_key: subjects[2] }]);

    const indexes = await client.query<{ indexname: string }>(
      `select indexname
         from pg_indexes
        where schemaname = $1
          and tablename = 'content_translation_request_budget_counters'
        order by indexname`,
      [schemaName],
    );
    expect(indexes.rows.map(({ indexname }) => indexname)).toContain(
      "content_translation_request_budget_counters_cleanup_idx",
    );
  });
});
