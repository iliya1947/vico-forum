import { readFile } from "node:fs/promises";

import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  MAX_TRANSLATION_TASK_RECONCILIATION_BATCH_SIZE,
} from "../../app/localization/translation-task-reconciliation";
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
    "drizzle/0013_translation_task_reconciliation.sql",
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

async function makePendingOld(id: string, seconds = 2): Promise<void> {
  await client.query(
    `update translation_tasks
        set created_at = statement_timestamp() - ($2::double precision * interval '1 second'),
            updated_at = statement_timestamp() - ($2::double precision * interval '1 second')
      where id = $1`,
    [id, seconds],
  );
}

describe("DrizzleTranslationTaskStore reconciliation", () => {
  it("reserves only recoverable work, applies the batch bound, and has query-derived indexes", async () => {
    const store = new DrizzleTranslationTaskStore(drizzle(client));
    const oldPending = await store.upsertPending(await job("old-pending"));
    const freshPending = await store.upsertPending(await job("fresh-pending"));
    const retryReleased = await store.upsertPending(await job("retry-released"));
    const expired = await store.upsertPending(await job("expired-processing"));
    const live = await store.upsertPending(await job("live-processing"));
    const stale = await store.upsertPending(await job("stale-task"));
    const failed = await store.upsertPending(await job("failed-task"));

    await makePendingOld(oldPending.id);

    const retryClaim = await store.claim(retryReleased.id, 60_000);
    if (retryClaim.outcome !== "claimed") throw new Error("retry fixture claim failed");
    await store.recordFailure(retryReleased.id, retryClaim.task.claimToken, {
      disposition: "retryable",
      code: "provider-temporary",
    });
    await makePendingOld(retryReleased.id);

    const expiredClaim = await store.claim(expired.id, 60_000);
    if (expiredClaim.outcome !== "claimed") throw new Error("expired fixture claim failed");
    await client.query(
      `update translation_tasks
          set claimed_at = statement_timestamp() - interval '2 seconds',
              lease_expires_at = statement_timestamp() - interval '1 second'
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

    await expect(store.reserveReconciliationCandidates({
      limit: MAX_TRANSLATION_TASK_RECONCILIATION_BATCH_SIZE + 1,
      pendingOlderThanMs: 1_000,
    })).rejects.toBeInstanceOf(TypeError);

    const reserved = await store.reserveReconciliationCandidates({
      limit: 10,
      pendingOlderThanMs: 1_000,
    });
    expect(reserved).toEqual(expect.arrayContaining([
      { id: oldPending.id, reason: "pending" },
      { id: retryReleased.id, reason: "pending" },
      { id: expired.id, reason: "expired-processing" },
    ]));
    expect(reserved).toHaveLength(3);

    await expect(store.reserveReconciliationCandidates({
      limit: 10,
      pendingOlderThanMs: 1_000,
    })).resolves.toEqual([]);

    await expect(store.findById(freshPending.id)).resolves.toMatchObject({ status: "pending" });
    await expect(store.findById(live.id)).resolves.toMatchObject({ status: "processing" });
    await expect(store.findById(stale.id)).resolves.toMatchObject({ status: "stale" });
    await expect(store.findById(failed.id)).resolves.toMatchObject({ status: "failed" });

    const progress = await client.query<{ id: string }>(
      "select id::text from translation_tasks where reconciliation_attempted_at is not null",
    );
    expect(new Set(progress.rows.map((row) => row.id))).toEqual(
      new Set([oldPending.id, retryReleased.id, expired.id]),
    );

    const indexes = await client.query<{ indexname: string }>(
      "select indexname from pg_indexes where schemaname = $1 and tablename = 'translation_tasks'",
      [schemaName],
    );
    expect(indexes.rows.map((row) => row.indexname)).toEqual(expect.arrayContaining([
      "translation_tasks_reconcile_pending_idx",
      "translation_tasks_reconcile_processing_idx",
    ]));
  });

  it("persists cross-run progress so a backlog larger than the batch cannot starve", async () => {
    const store = new DrizzleTranslationTaskStore(drizzle(client));
    const tasks = await Promise.all(
      Array.from({ length: 5 }, async (_, index) => store.upsertPending(await job(`backlog-${index}`))),
    );
    for (const task of tasks) await makePendingOld(task.id);

    const first = await store.reserveReconciliationCandidates({ limit: 2, pendingOlderThanMs: 0 });
    const second = await store.reserveReconciliationCandidates({ limit: 2, pendingOlderThanMs: 0 });
    const third = await store.reserveReconciliationCandidates({ limit: 2, pendingOlderThanMs: 0 });

    expect(first).toHaveLength(2);
    expect(second).toHaveLength(2);
    expect(third).toHaveLength(1);

    const allReserved = [...first, ...second, ...third].map((candidate) => candidate.id);
    expect(new Set(allReserved).size).toBe(5);
    expect(new Set(allReserved)).toEqual(new Set(tasks.map((task) => task.id)));
  });

  it("lets concurrent reconcilers reserve disjoint bounded work", async () => {
    const firstStore = new DrizzleTranslationTaskStore(drizzle(client));
    const tasks = await Promise.all(
      Array.from({ length: 4 }, async (_, index) => firstStore.upsertPending(await job(`concurrent-${index}`))),
    );
    for (const task of tasks) await makePendingOld(task.id);

    const secondClient = new Client({ connectionString: databaseUrl });
    await secondClient.connect();
    try {
      await secondClient.query(`set search_path to ${schemaName}`);
      const secondStore = new DrizzleTranslationTaskStore(drizzle(secondClient));

      const [first, second] = await Promise.all([
        firstStore.reserveReconciliationCandidates({ limit: 2, pendingOlderThanMs: 0 }),
        secondStore.reserveReconciliationCandidates({ limit: 2, pendingOlderThanMs: 0 }),
      ]);

      expect(first).toHaveLength(2);
      expect(second).toHaveLength(2);
      const ids = [...first, ...second].map((candidate) => candidate.id);
      expect(new Set(ids).size).toBe(4);
      expect(new Set(ids)).toEqual(new Set(tasks.map((task) => task.id)));
    } finally {
      await secondClient.end();
    }
  });

  it("reports bounded age, attempt, lease, and terminal failure summaries", async () => {
    const store = new DrizzleTranslationTaskStore(drizzle(client));

    const pending = await store.upsertPending(await job("observe-pending"));
    await makePendingOld(pending.id, 5);

    const retryPending = await store.upsertPending(await job("observe-retry-pending"));
    const retryClaim = await store.claim(retryPending.id, 60_000);
    if (retryClaim.outcome !== "claimed") throw new Error("retry pending claim failed");
    await store.recordFailure(retryPending.id, retryClaim.task.claimToken, {
      disposition: "retryable",
      code: "provider-temporary",
    });

    const live = await store.upsertPending(await job("observe-live"));
    const liveClaim = await store.claim(live.id, 60_000);
    if (liveClaim.outcome !== "claimed") throw new Error("live claim failed");

    const expired = await store.upsertPending(await job("observe-expired-budget"));
    const expiredClaim = await store.claim(expired.id, 60_000);
    if (expiredClaim.outcome !== "claimed") throw new Error("expired claim failed");
    await client.query(
      `update translation_tasks
          set attempt_count = max_attempts,
              claimed_at = statement_timestamp() - interval '3 seconds',
              lease_expires_at = statement_timestamp() - interval '1 second'
        where id = $1`,
      [expired.id],
    );

    const stale = await store.upsertPending(await job("observe-stale"));
    const staleClaim = await store.claim(stale.id, 60_000);
    if (staleClaim.outcome !== "claimed") throw new Error("stale claim failed");
    await store.markStale(stale.id, staleClaim.task.claimToken);

    const completed = await store.upsertPending(await job("observe-completed"));
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

    const terminal = await store.upsertPending(await job("observe-terminal"));
    const terminalClaim = await store.claim(terminal.id, 60_000);
    if (terminalClaim.outcome !== "claimed") throw new Error("terminal claim failed");
    await store.recordFailure(terminal.id, terminalClaim.task.claimToken, {
      disposition: "terminal",
      code: "provider-output-invalid",
    });

    const exhausted = await store.upsertPending(await job("observe-retry-exhausted"));
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const claim = await store.claim(exhausted.id, 60_000);
      if (claim.outcome !== "claimed") throw new Error("retry exhaustion claim failed");
      await store.recordFailure(exhausted.id, claim.task.claimToken, {
        disposition: "retryable",
        code: "provider-temporary",
      });
    }

    const snapshot = await store.observeTranslationTasks();
    expect(snapshot.counts).toEqual({
      pending: 2,
      processing: 2,
      stale: 1,
      completed: 1,
      failed: 2,
    });
    expect(snapshot.pending).toMatchObject({ unattempted: 1, retryReleased: 1 });
    expect(snapshot.pending.oldestAgeMs).toBeGreaterThanOrEqual(4_000);
    expect(snapshot.processing).toMatchObject({
      live: 1,
      expired: 1,
      withAttemptsRemaining: 1,
      atAttemptBudget: 1,
    });
    expect(snapshot.processing.oldestClaimAgeMs).toBeGreaterThanOrEqual(2_000);
    expect(snapshot.processing.oldestExpiredLeaseAgeMs).toBeGreaterThanOrEqual(500);
    expect(snapshot.failed).toMatchObject({
      terminal: 1,
      retryExhausted: 1,
      failureGroupCount: 2,
    });
    expect(snapshot.failed.groups).toEqual(expect.arrayContaining([
      { disposition: "terminal", code: "provider-output-invalid", count: 1 },
      { disposition: "retry-exhausted", code: "provider-temporary", count: 1 },
    ]));
  });
});
