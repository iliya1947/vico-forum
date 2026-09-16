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
const schemaName = "translation_task_generation_isolation_test";

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

async function job(generationPolicyVersion: string): Promise<UiTranslationJobSpecification> {
  const specification = {
    translationKind: "ui" as const,
    sourceIdentity: { namespace: "common", key: "generationIsolation" },
    sourceFingerprint: "b".repeat(64),
    targetLocale: "fr",
    generationPolicyVersion,
  };
  return { ...specification, taskIdentity: await uiTranslationJobIdentity(specification) };
}

describe("translation task generation isolation", () => {
  it("keeps a newer generation intact when an older completed identity is planned again", async () => {
    const database = drizzle(client);
    const tasks = new DrizzleTranslationTaskStore(database);
    const publications = new DrizzleUiTranslationPublicationStore(database);
    const olderSpecification = await job("ui-policy-v1");
    const newerSpecification = await job("ui-policy-v2");

    const olderPending = await tasks.upsertPending(olderSpecification);
    const olderClaim = await tasks.claim(olderPending.id, 60_000);
    if (olderClaim.outcome !== "claimed") throw new Error("older claim failed");
    await expect(publications.publishClaimedMachineResult({
      task: olderClaim.task,
      value: "Ancienne traduction",
      provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
    })).resolves.toBe(true);

    const newerPending = await tasks.upsertPending(newerSpecification);
    await expect(tasks.upsertPending(olderSpecification)).resolves.toMatchObject({
      id: olderPending.id,
      status: "completed",
    });
    await expect(tasks.findById(newerPending.id)).resolves.toMatchObject({
      status: "pending",
      generationPolicyVersion: "ui-policy-v2",
    });

    const newerClaim = await tasks.claim(newerPending.id, 60_000);
    if (newerClaim.outcome !== "claimed") throw new Error("newer claim failed");
    await expect(tasks.upsertPending(olderSpecification)).resolves.toMatchObject({
      id: olderPending.id,
      status: "completed",
    });
    await expect(tasks.findById(newerPending.id)).resolves.toMatchObject({
      status: "processing",
      claimToken: newerClaim.task.claimToken,
      generationPolicyVersion: "ui-policy-v2",
    });

    const rows = await client.query<{ status: string; generation_policy_version: string }>(
      `select status, generation_policy_version
         from translation_tasks
        where source_namespace = 'common'
          and source_key = 'generationIsolation'
          and target_locale = 'fr'
        order by generation_policy_version`,
    );
    expect(rows.rows).toEqual([
      { status: "completed", generation_policy_version: "ui-policy-v1" },
      { status: "processing", generation_policy_version: "ui-policy-v2" },
    ]);
  });
});
