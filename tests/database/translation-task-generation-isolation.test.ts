import { readFile } from "node:fs/promises";

import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { compileNamespaceBundle } from "../../app/localization/bundles";
import {
  uiTranslationJobIdentity,
  type UiTranslationJobSpecification,
} from "../../app/localization/ui-translation-service";
import { DrizzleTranslationTaskStore } from "../../db/translation-task-store";
import { DrizzleUiTranslationBundleStore } from "../../db/ui-translation-bundle-store";
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
    "drizzle/0010_translation_task_generation_order.sql",
    "drizzle/0012_translation_task_retry_dlq.sql",
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
  generationPolicyVersion: string,
  key = "generationIsolation",
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

describe("translation task generation isolation", () => {
  it("serializes concurrent different identities through one durable current generation", async () => {
    const firstClient = new Client({ connectionString: databaseUrl });
    const secondClient = new Client({ connectionString: databaseUrl });
    await Promise.all([firstClient.connect(), secondClient.connect()]);
    try {
      await Promise.all([
        firstClient.query(`set search_path to ${schemaName}`),
        secondClient.query(`set search_path to ${schemaName}`),
      ]);
      const firstStore = new DrizzleTranslationTaskStore(drizzle(firstClient));
      const secondStore = new DrizzleTranslationTaskStore(drizzle(secondClient));
      const [first, second] = await Promise.all([
        firstStore.upsertPending(await job("concurrent-policy-a", "generationConcurrent")),
        secondStore.upsertPending(await job("concurrent-policy-b", "generationConcurrent")),
      ]);

      expect(new Set([first.generation, second.generation])).toEqual(new Set([1, 2]));
      const current = await client.query<{ current_count: number; current_generation: number }>(`
        select count(*) filter (where t.generation = h.current_generation)::int as current_count,
               max(h.current_generation)::int as current_generation
          from translation_tasks t
          join translation_task_generation_heads h using
            (translation_kind, source_namespace, source_key, target_locale)
         where t.source_key = 'generationConcurrent'
           and t.generation_policy_version like 'concurrent-policy-%'
      `);
      expect(current.rows).toEqual([{ current_count: 1, current_generation: 2 }]);
    } finally {
      await Promise.all([firstClient.end(), secondClient.end()]);
    }
  });

  it("does not let delayed old planning or old in-flight work regain current publication rights", async () => {
    const tasks = new DrizzleTranslationTaskStore(drizzle(client));
    const publications = new DrizzleUiTranslationPublicationStore(drizzle(client));
    const olderSpecification = await job("delayed-policy-v1", "generationDelayed");
    const newerSpecification = await job("delayed-policy-v2", "generationDelayed");
    const older = await tasks.upsertPending(olderSpecification);
    const oldClaim = await tasks.claim(older.id, 60_000);
    if (oldClaim.outcome !== "claimed") throw new Error("older claim failed");

    const newer = await tasks.upsertPending(newerSpecification);
    const bundles = new DrizzleUiTranslationBundleStore(drizzle(client));
    const existingBundle = await compileNamespaceBundle("fr", "common", { heading: "Valeur actuelle" });
    await bundles.put(existingBundle);
    await expect(tasks.upsertPending(olderSpecification)).resolves.toMatchObject({
      id: older.id,
      generation: oldClaim.task.generation,
      status: "processing",
      claimToken: oldClaim.task.claimToken,
    });
    await expect(tasks.isCurrentGeneration(oldClaim.task)).resolves.toBe(false);
    await expect(tasks.isCurrentGeneration(newer)).resolves.toBe(true);
    await expect(publications.publishClaimedMachineResult({
      task: oldClaim.task,
      value: "Résultat ancien retardé",
      provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
    })).resolves.toBe(false);
    await expect(tasks.findById(older.id)).resolves.toMatchObject({ status: "processing" });
    const published = await client.query<{ count: number }>(`
      select count(*)::int as count from ui_translations
       where locale = 'fr' and namespace = 'common' and key = 'generationDelayed' and origin = 'machine'
    `);
    expect(published.rows[0]?.count).toBe(0);
    await expect(bundles.read("fr", "common")).resolves.toEqual(existingBundle);
    await expect(tasks.markStale(older.id, oldClaim.task.claimToken)).resolves.toBe(true);
    await expect(tasks.claim(older.id, 60_000)).resolves.toEqual({ outcome: "terminal" });
  });

  it("reactivates stale A with a newer generation after A -> B -> A fresh planning", async () => {
    const tasks = new DrizzleTranslationTaskStore(drizzle(client));
    const firstSpecification = await job("aba-policy-a", "generationReactivation");
    const secondSpecification = await job("aba-policy-b", "generationReactivation");

    const firstPending = await tasks.upsertPending(firstSpecification);
    const firstClaim = await tasks.claim(firstPending.id, 60_000);
    if (firstClaim.outcome !== "claimed") throw new Error("first A claim failed");

    const secondPending = await tasks.upsertPending(secondSpecification);
    expect(secondPending.generation).toBe(firstClaim.task.generation + 1);
    await expect(tasks.isCurrentGeneration(firstClaim.task)).resolves.toBe(false);
    await expect(tasks.isCurrentGeneration(secondPending)).resolves.toBe(true);

    await expect(tasks.markStale(firstPending.id, firstClaim.task.claimToken)).resolves.toBe(true);
    await expect(tasks.claim(firstPending.id, 60_000)).resolves.toEqual({ outcome: "terminal" });

    const reactivated = await tasks.upsertPending(firstSpecification);

    expect(reactivated).toMatchObject({
      id: firstPending.id,
      taskIdentity: firstSpecification.taskIdentity,
      generation: secondPending.generation + 1,
      status: "pending",
      claimToken: null,
      claimedAt: null,
      leaseExpiresAt: null,
      staleAt: null,
      completedAt: null,
    });
    expect(reactivated.createdAt).toEqual(firstPending.createdAt);
    await expect(tasks.isCurrentGeneration(secondPending)).resolves.toBe(false);
    await expect(tasks.isCurrentGeneration(reactivated)).resolves.toBe(true);

    const reactivatedClaim = await tasks.claim(reactivated.id, 60_000);
    expect(reactivatedClaim).toMatchObject({
      outcome: "claimed",
      task: {
        id: firstPending.id,
        taskIdentity: firstSpecification.taskIdentity,
        generation: reactivated.generation,
      },
    });
  });

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
          and generation_policy_version in ('ui-policy-v1', 'ui-policy-v2')
        order by generation_policy_version`,
    );
    expect(rows.rows).toEqual([
      { status: "completed", generation_policy_version: "ui-policy-v1" },
      { status: "processing", generation_policy_version: "ui-policy-v2" },
    ]);
  });
});
