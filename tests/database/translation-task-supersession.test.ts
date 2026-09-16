import { readFile } from "node:fs/promises";

import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  uiTranslationJobIdentity,
  type UiTranslationJobSpecification,
} from "../../app/localization/ui-translation-service";
import { DrizzleTranslationTaskStore } from "../../db/translation-task-store";
import { DrizzleUiTranslationPublicationStore } from "../../db/ui-translation-publication-store";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for the disposable database integration test");

const parsedDatabaseUrl = new URL(databaseUrl);
if (!["127.0.0.1", "localhost"].includes(parsedDatabaseUrl.hostname) || !parsedDatabaseUrl.pathname.endsWith("_test")) {
  throw new Error("Database integration tests only run against a local database ending in _test");
}

const client = new Client({ connectionString: databaseUrl });
const schemaName = "translation_task_supersession_test";

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schemaName} cascade; create schema ${schemaName}`);
  await client.query(`set search_path to ${schemaName}`);
  for (const migration of [
    "drizzle/0002_ui_translation_storage.sql",
    "drizzle/0007_durable_translation_tasks.sql",
    "drizzle/0008_translation_task_claim_lease.sql",
    "drizzle/0009_translation_task_completion.sql",
  ]) {
    await client.query(await readFile(migration, "utf8"));
  }
});

afterAll(async () => {
  await client.query("set search_path to public");
  await client.query(`drop schema if exists ${schemaName} cascade`);
  await client.end();
});

async function job(
  key: string,
  generationPolicyVersion: string,
): Promise<UiTranslationJobSpecification> {
  const specification = {
    translationKind: "ui" as const,
    sourceIdentity: { namespace: "common", key },
    sourceFingerprint: "b".repeat(64),
    targetLocale: "fr",
    generationPolicyVersion,
  };
  return { ...specification, taskIdentity: await uiTranslationJobIdentity(specification) };
}

describe("translation task generation supersession", () => {
  it("removes superseded pending work before a fresh generation can execute", async () => {
    const store = new DrizzleTranslationTaskStore(drizzle(client));
    const older = await store.upsertPending(await job("supersededPending", "ui-policy-v1"));
    const fresher = await store.upsertPending(await job("supersededPending", "ui-policy-v2"));

    await expect(store.findById(older.id)).resolves.toBeUndefined();
    await expect(store.claim(older.id, 60_000)).resolves.toEqual({ outcome: "not-found" });
    expect(fresher).toMatchObject({
      status: "pending",
      generationPolicyVersion: "ui-policy-v2",
    });
  });

  it("revokes an older live claim so its provider result cannot overwrite the fresh generation", async () => {
    const database = drizzle(client);
    const tasks = new DrizzleTranslationTaskStore(database);
    const publications = new DrizzleUiTranslationPublicationStore(database);
    const older = await tasks.upsertPending(await job("supersededProcessing", "ui-policy-v1"));
    const olderClaim = await tasks.claim(older.id, 60_000);
    if (olderClaim.outcome !== "claimed") throw new Error("claim failed");

    const fresher = await tasks.upsertPending(await job("supersededProcessing", "ui-policy-v2"));

    await expect(tasks.findById(older.id)).resolves.toMatchObject({
      status: "stale",
      claimToken: null,
      leaseExpiresAt: null,
      completedAt: null,
    });
    await expect(tasks.claim(older.id, 60_000)).resolves.toEqual({ outcome: "terminal" });
    await expect(publications.publishClaimedMachineResult({
      task: olderClaim.task,
      value: "Outdated machine result",
      provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
    })).resolves.toBe(false);

    const rows = await client.query<{ count: number }>(
      `select count(*)::int as count
         from ui_translations
        where locale = 'fr'
          and namespace = 'common'
          and key = 'supersededProcessing'
          and origin = 'machine'`,
    );
    expect(rows.rows[0]?.count).toBe(0);
    expect(fresher).toMatchObject({
      status: "pending",
      generationPolicyVersion: "ui-policy-v2",
    });
  });
});
