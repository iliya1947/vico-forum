import { readFile } from "node:fs/promises";

import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
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
const schemaName = "translation_task_reconciliation_test";

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schemaName} cascade; create schema ${schemaName}`);
  await client.query(`set search_path to ${schemaName}`);
  for (const migration of [
    "drizzle/0007_durable_translation_tasks.sql",
    "drizzle/0008_translation_task_claim_lease.sql",
    "drizzle/0009_translation_task_completion.sql",
    "drizzle/0010_translation_task_generation_order.sql",
    "drizzle/0012_translation_task_retry_dlq.sql",
  ]) {
    await client.query(await readFile(migration, "utf8"));
  }
});

beforeEach(async () => {
  await client.query("truncate translation_tasks, translation_task_generation_heads cascade");
});

afterAll(async () => {
  await client.query("set search_path to public");
  await client.query(`drop schema if exists ${schemaName} cascade`);
  await client.end();
});

async function job(key: string): Promise<UiTranslationJobSpecification> {
  const specification = {
    translationKind: "ui" as const,
    sourceIdentity: { namespace: "common", key },
    sourceFingerprint: "b".repeat(64),
    targetLocale: "fr",
    generationPolicyVersion: "ui-policy-v1",
  };
  return { ...specification, taskIdentity: await uiTranslationJobIdentity(specification) };
}

describe("DrizzleTranslationTaskStore reconciliation", () => {
  it("finds old pending and expired processing tasks without touching live or terminal work", async () => {
    const store = new DrizzleTranslationTaskStore(drizzle(client));
    const oldPending = await store.upsertPending(await job("old-pending"));
    const freshPending = await store.upsertPending(await job("fresh-pending"));
    const expired = await store.upsertPending(await job("expired-processing"));
    const live = await store.upsertPending(await job("live-processing"));
    const stale = await store.upsertPending(await job("stale-task"));
    const failed = await store.upsertPending(await job("failed-task"));

    await client.query(
      `update translation_tasks
          set created_at = statement_timestamp() - interval '3 seconds',
              updated_at = statement_timestamp() - interval '2 seconds'
        where id = $1`,
      [oldPending.id],
    );

    const expiredClaim = await store.claim(expired.id, 60_000);
    if (expiredClaim.outcome !== "claimed") throw new Error("expired fixture claim failed");
    await client.query(
      `update translation_tasks
          set claimed_at = statement_timestamp() - interval '2 seconds',
              lease_expires_at = statement_timestamp() - interval '1 second',
              updated_at = statement_timestamp()
        where id = $1`,
      [expired.id],
    );

    const liveClaim = await store.claim(live.id, 60_000);
    if (liveClaim.outcome !== "claimed") throw new Error("live fixture claim failed");

    const staleClaim = await store.claim(stale.id, 60_000);
    if (staleClaim.outcome !== "claimed") throw new Error("stale fixture claim failed");
    await store.markStale(stale.id, staleClaim.task.claimToken);

    const failedClaim = await store.claim(failed.id, 60_000);
    if (failedClaim.outcome !== "claimed") throw new Error("failed fixture claim failed");
    await store.recordFailure(failed.id, failedClaim.task.claimToken, {
      disposition: "terminal",
      code: "provider-output-invalid",
    });

    await expect(store.listReconciliationCandidates({
      limit: 10,
      pendingOlderThanMs: 1_000,
    })).resolves.toEqual([
      { id: oldPending.id, reason: "pending" },
      { id: expired.id, reason: "expired-processing" },
    ]);

    await expect(store.findById(freshPending.id)).resolves.toMatchObject({ status: "pending" });
    await expect(store.findById(live.id)).resolves.toMatchObject({ status: "processing" });
    await expect(store.findById(stale.id)).resolves.toMatchObject({ status: "stale" });
    await expect(store.findById(failed.id)).resolves.toMatchObject({ status: "failed" });
  });

  it("reports lifecycle counts and expired processing separately", async () => {
    const store = new DrizzleTranslationTaskStore(drizzle(client));
    await store.upsertPending(await job("pending"));

    const live = await store.upsertPending(await job("processing-live"));
    const liveClaim = await store.claim(live.id, 60_000);
    if (liveClaim.outcome !== "claimed") throw new Error("live claim failed");

    const expired = await store.upsertPending(await job("processing-expired"));
    const expiredClaim = await store.claim(expired.id, 60_000);
    if (expiredClaim.outcome !== "claimed") throw new Error("expired claim failed");
    await client.query(
      `update translation_tasks
          set claimed_at = statement_timestamp() - interval '2 seconds',
              lease_expires_at = statement_timestamp() - interval '1 second',
              updated_at = statement_timestamp()
        where id = $1`,
      [expired.id],
    );

    const stale = await store.upsertPending(await job("stale"));
    const staleClaim = await store.claim(stale.id, 60_000);
    if (staleClaim.outcome !== "claimed") throw new Error("stale claim failed");
    await store.markStale(stale.id, staleClaim.task.claimToken);

    const failed = await store.upsertPending(await job("failed"));
    const failedClaim = await store.claim(failed.id, 60_000);
    if (failedClaim.outcome !== "claimed") throw new Error("failed claim failed");
    await store.recordFailure(failed.id, failedClaim.task.claimToken, {
      disposition: "terminal",
      code: "provider-output-invalid",
    });

    const completed = await store.upsertPending(await job("completed"));
    const completedClaim = await store.claim(completed.id, 60_000);
    if (completedClaim.outcome !== "claimed") throw new Error("completed claim failed");
    await client.query(
      `update translation_tasks
          set status = 'completed',
              claim_token = null,
              lease_expires_at = null,
              stale_at = null,
              completed_at = statement_timestamp(),
              failed_at = null,
              last_failure_code = null,
              failure_disposition = null,
              updated_at = statement_timestamp()
        where id = $1`,
      [completed.id],
    );

    await expect(store.observeTranslationTasks()).resolves.toEqual({
      counts: {
        pending: 1,
        processing: 2,
        stale: 1,
        completed: 1,
        failed: 1,
      },
      expiredProcessing: 1,
    });
  });
});
