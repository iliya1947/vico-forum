import { readFile } from "node:fs/promises";

import { drizzle } from "drizzle-orm/node-postgres";
import { Client, type DatabaseError } from "pg";
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
    ["invalid status", { status: "processing" }],
  ])("rejects %s durable state at the schema boundary", async (_label, override) => {
    const fields = {
      task_identity: "d".repeat(64),
      translation_kind: "ui",
      source_namespace: "common",
      source_key: "heading",
      source_fingerprint: "e".repeat(64),
      target_locale: "fr",
      generation_policy_version: "ui-policy-v1",
      status: "pending",
      ...override,
    };

    await expectDatabaseCode(client.query(
      `insert into translation_tasks
        (task_identity, translation_kind, source_namespace, source_key, source_fingerprint,
         target_locale, generation_policy_version, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      Object.values(fields),
    ), "23514");
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
