import { readFile } from "node:fs/promises";

import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool, type DatabaseError } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  FakeTranslationTaskEnqueuer,
  PersistentTranslationJobDispatcher,
} from "../../app/localization/translation-tasks";
import {
  uiTranslationJobIdentity,
  type UiTranslationJobSpecification,
} from "../../app/localization/ui-translation-service";
import { DrizzleTranslationTaskStore } from "../../db/translation-task-store";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error("DATABASE_URL is required for the disposable database integration test");

const parsedDatabaseUrl = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost"].includes(parsedDatabaseUrl.hostname) ||
  !parsedDatabaseUrl.pathname.endsWith("_test")
) {
  throw new Error("Database integration tests only run against a local database ending in _test");
}

const client = new Client({ connectionString: databaseUrl });
const schemaName = "translation_task_store_test";

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schemaName} cascade; create schema ${schemaName}`);
  await client.query(`set search_path to ${schemaName}`);
  await client.query(await readFile("drizzle/0007_durable_translation_tasks.sql", "utf8"));
  await client.query(await readFile("drizzle/0008_translation_task_claim_lease.sql", "utf8"));
  await client.query(await readFile("drizzle/0009_translation_task_completion.sql", "utf8"));
  await client.query(await readFile("drizzle/0010_translation_task_generation_order.sql", "utf8"));
});

afterAll(async () => {
  await client.query("set search_path to public");
  await client.query(`drop schema if exists ${schemaName} cascade`);
  await client.end();
});

async function job(key = "heading"): Promise<UiTranslationJobSpecification> {
  const specification = {
    translationKind: "ui" as const,
    sourceIdentity: { namespace: "common", key },
    sourceFingerprint: "b".repeat(64),
    targetLocale: "fr-CA",
    generationPolicyVersion: "ui-policy-v1",
  };
  return { ...specification, taskIdentity: await uiTranslationJobIdentity(specification) };
}

describe("DrizzleTranslationTaskStore", () => {
  it("creates one durable pending task and returns it by id and stable identity", async () => {
    const store = new DrizzleTranslationTaskStore(drizzle(client));
    const queue = new FakeTranslationTaskEnqueuer();
    const specification = await job();
    await new PersistentTranslationJobDispatcher(store, queue).dispatch([specification]);
    const created = await store.findByIdentity(specification.taskIdentity);

    expect(created).toMatchObject({
      taskIdentity: specification.taskIdentity,
      translationKind: "ui",
      sourceIdentity: { namespace: "common", key: "heading" },
      sourceFingerprint: "b".repeat(64),
      targetLocale: "fr-CA",
      generationPolicyVersion: "ui-policy-v1",
      status: "pending",
    });
    expect(created?.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(queue.messages).toEqual([{ translationTaskId: created?.id }]);
    await expect(store.findById(created!.id)).resolves.toEqual(created);
  });

  it("keeps the durable task pending and visible to a fresh DB reader when enqueue fails", async () => {
    const store = new DrizzleTranslationTaskStore(drizzle(client));
    const specification = await job("enqueue-failure");
    const queueFailure = new Error("enqueue outcome unknown");
    const queue = new FakeTranslationTaskEnqueuer(() => { throw queueFailure; });

    await expect(new PersistentTranslationJobDispatcher(store, queue).dispatch([specification]))
      .rejects.toBe(queueFailure);

    const freshClient = new Client({
      connectionString: databaseUrl,
      options: `-c search_path=${schemaName}`,
    });
    await freshClient.connect();
    try {
      const freshStore = new DrizzleTranslationTaskStore(drizzle(freshClient));
      await expect(freshStore.findByIdentity(specification.taskIdentity)).resolves.toMatchObject({
        taskIdentity: specification.taskIdentity,
        status: "pending",
        claimToken: null,
        claimedAt: null,
        leaseExpiresAt: null,
        staleAt: null,
      });
    } finally {
      await freshClient.end();
    }

    expect(queue.messages).toEqual([]);
  });

  it("upserts a duplicate logical job without creating another durable task", async () => {
    const store = new DrizzleTranslationTaskStore(drizzle(client));
    const specification = await job("stageSummary");
    const first = await store.upsertPending(specification);
    const duplicate = await store.upsertPending(specification);
    const count = await client.query<{ count: string }>(
      "select count(*)::text as count from translation_tasks where task_identity = $1",
      [specification.taskIdentity],
    );

    expect(duplicate.id).toBe(first.id);
    expect(duplicate.status).toBe("pending");
    expect(count.rows[0]?.count).toBe("1");
  });

  it.each([
    ["invalid identity", { task_identity: "not-a-digest" }],
    ["invalid kind", { translation_kind: "content" }],
    ["blank source", { source_key: " " }],
    ["invalid fingerprint", { source_fingerprint: "bad" }],
    ["English target", { target_locale: "en" }],
    ["blank policy", { generation_policy_version: " " }],
    ["invalid status", { status: "unknown" }],
    ["processing without lease metadata", { status: "processing" }],
  ])("rejects %s durable state at the schema boundary", async (_label, override) => {
    const fields = {
      task_identity: "d".repeat(64),
      translation_kind: "ui",
      source_namespace: "common",
      source_key: "heading",
      source_fingerprint: "e".repeat(64),
      target_locale: "fr",
      generation_policy_version: "ui-policy-v1",
      generation: 1,
      status: "pending",
      ...override,
    };

    await expectDatabaseCode(client.query(
      `insert into translation_tasks
        (task_identity, translation_kind, source_namespace, source_key, source_fingerprint,
         target_locale, generation_policy_version, generation, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      Object.values(fields),
    ), "23514");
  });

  it("atomically grants one execution owner and makes a live duplicate a no-op", async () => {
    const store = new DrizzleTranslationTaskStore(drizzle(client));
    const pending = await store.upsertPending(await job("forumTagline"));
    const pool = new Pool({ connectionString: databaseUrl, options: `-c search_path=${schemaName}` });
    const firstStore = new DrizzleTranslationTaskStore(drizzle(pool));
    const secondStore = new DrizzleTranslationTaskStore(drizzle(pool));
    const [first, second] = await Promise.all([
      firstStore.claim(pending.id, 60_000),
      secondStore.claim(pending.id, 60_000),
    ]).finally(() => pool.end());

    expect([first, second].filter(({ outcome }) => outcome === "claimed")).toHaveLength(1);
    expect([first, second].filter(({ outcome }) => outcome === "already-claimed")).toHaveLength(1);
    await expect(store.claim(pending.id, 60_000)).resolves.toEqual({ outcome: "already-claimed" });
  });

  it("keeps a live processing lease intact when the same logical job is dispatched again", async () => {
    const store = new DrizzleTranslationTaskStore(drizzle(client));
    const specification = await job("processing-upsert");
    const pending = await store.upsertPending(specification);
    const claim = await store.claim(pending.id, 60_000);
    if (claim.outcome !== "claimed") throw new Error("claim failed");

    const duplicate = await store.upsertPending(specification);

    expect(duplicate).toMatchObject({
      id: pending.id,
      status: "processing",
      claimToken: claim.task.claimToken,
      claimedAt: claim.task.claimedAt,
      leaseExpiresAt: claim.task.leaseExpiresAt,
      staleAt: null,
      updatedAt: claim.task.updatedAt,
    });
  });

  it("reclaims an expired database lease and never reclaims a terminal stale task", async () => {
    const store = new DrizzleTranslationTaskStore(drizzle(client));
    const pending = await store.upsertPending(await job("productName"));
    const first = await store.claim(pending.id, 60_000);
    expect(first.outcome).toBe("claimed");
    if (first.outcome !== "claimed") throw new Error("claim failed");

    await client.query(
      `update translation_tasks
          set claimed_at = statement_timestamp() - interval '2 seconds',
              lease_expires_at = statement_timestamp() - interval '1 second',
              updated_at = statement_timestamp()
        where id = $1`,
      [pending.id],
    );

    const reclaimed = await store.claim(pending.id, 60_000);
    expect(reclaimed.outcome).toBe("claimed");
    if (reclaimed.outcome !== "claimed") throw new Error("reclaim failed");
    expect(reclaimed.task.claimToken).not.toBe(first.task.claimToken);
    await expect(store.markStale(pending.id, first.task.claimToken)).resolves.toBe(false);
    await expect(store.markStale(pending.id, reclaimed.task.claimToken)).resolves.toBe(true);
    await expect(store.claim(pending.id, 60_000)).resolves.toEqual({ outcome: "terminal" });
  });

  it("reactivates the same stale logical task only when a new plan dispatches it again", async () => {
    const store = new DrizzleTranslationTaskStore(drizzle(client));
    const specification = await job("reactivated-task");
    const pending = await store.upsertPending(specification);
    const claim = await store.claim(pending.id, 60_000);
    if (claim.outcome !== "claimed") throw new Error("claim failed");
    await expect(store.markStale(pending.id, claim.task.claimToken)).resolves.toBe(true);
    await expect(store.claim(pending.id, 60_000)).resolves.toEqual({ outcome: "terminal" });

    const reactivated = await store.upsertPending(specification);

    expect(reactivated).toMatchObject({
      id: pending.id,
      taskIdentity: specification.taskIdentity,
      status: "pending",
      claimToken: null,
      claimedAt: null,
      leaseExpiresAt: null,
      staleAt: null,
    });
    expect(reactivated.createdAt).toEqual(pending.createdAt);
    await expect(store.claim(reactivated.id, 60_000)).resolves.toMatchObject({ outcome: "claimed" });
    const count = await client.query<{ count: string }>(
      "select count(*)::text as count from translation_tasks where task_identity = $1",
      [specification.taskIdentity],
    );
    expect(count.rows[0]?.count).toBe("1");
  });
});

async function expectDatabaseCode(promise: Promise<unknown>, code: string): Promise<void> {
  try {
    await promise;
    throw new Error(`Expected PostgreSQL error ${code}`);
  } catch (error) {
    expect((error as DatabaseError).code).toBe(code);
  }
}
