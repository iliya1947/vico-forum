import { readFile } from "node:fs/promises";

import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ContentTopicTitleAllowanceGate,
  contentProviderAllowanceOccurrenceKey,
} from "../../app/localization/content-provider-allowance";
import {
  CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH,
  type ContentTranslationRequestBudgetAdmission,
} from "../../app/localization/content-request-budget.server";
import {
  CLOUDFLARE_M2M100_MODEL,
  CLOUDFLARE_WORKERS_AI_PROVIDER,
  CloudflareM2m100TranslationProvider,
} from "../../app/localization/cloudflare-m2m100-provider";
import {
  ContentSourceLocaleResolver,
  ThresholdContentSourceLocalePolicy,
} from "../../app/localization/content-source-locale";
import { ContentTranslationService } from "../../app/localization/content-translation";
import { ContentTopicTitleTranslationPlanner } from "../../app/localization/content-translation-planning";
import {
  RoutedContentTopicTitleProviderCapability,
  type ContentTopicTitleProviderCapability,
} from "../../app/localization/content-translation-provider";
import { ContentTopicTitleTaskConsumer } from "../../app/localization/content-translation-task-consumer";
import { ContentTopicTitleTaskExecutor } from "../../app/localization/content-translation-execution";
import { ContentTopicTitleResultPublisher } from "../../app/localization/content-translation-publication";
import { TranslationExecutionFailure } from "../../app/localization/translation-failures";
import type { TranslationProviderDataPolicy } from "../../app/localization/translation-provider-data-policy";
import { localeRegistry } from "../../app/localization/registry";
import {
  TranslationTaskExecutorDispatcher,
} from "../../app/localization/translation-task-dispatch";
import { TranslationTaskReconciler } from "../../app/localization/translation-task-reconciliation";
import {
  FakeTranslationTaskEnqueuer,
} from "../../app/localization/translation-tasks";
import {
  type MachineTranslationProviderAdapter,
  type MachineTranslationResult,
  TranslationProviderRouter,
} from "../../app/localization/translation-provider";
import { DrizzleContentTopicTitleExecutionStore } from "../../db/content-topic-title-execution-store";
import { DrizzleContentTopicTitlePlanningStore } from "../../db/content-topic-title-task-store";
import { DrizzleContentTranslationStore } from "../../db/content-translation-store";
import {
  DrizzleTranslationTaskStore,
  TranslationTaskKindMismatchError,
} from "../../db/translation-task-store";

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

const schemaName = "content_topic_title_execution_test";
const client = new Client({ connectionString: databaseUrl });

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schemaName} cascade; create schema ${schemaName}`);
  await client.query(`set search_path to ${schemaName}`);

  for (const migration of [
    "drizzle/0003_gorgeous_donald_blake.sql",
    "drizzle/0004_forum_domain_foundation.sql",
    "drizzle/0005_calm_proemial_gods.sql",
    "drizzle/0007_durable_translation_tasks.sql",
    "drizzle/0008_translation_task_claim_lease.sql",
    "drizzle/0009_translation_task_completion.sql",
    "drizzle/0010_translation_task_generation_order.sql",
    "drizzle/0012_translation_task_retry_dlq.sql",
    "drizzle/0013_translation_task_reconciliation.sql",
    "drizzle/0014_content_translation_persistence.sql",
    "drizzle/0015_content_topic_title_tasks.sql",
    "drizzle/0017_content_translation_request_budget.sql",

    "drizzle/0019_content_provider_allowance_admission.sql",
  ]) {
    const sql = (await readFile(migration, "utf8"))
      .replaceAll('"public".', `"${schemaName}".`);
    await client.query(sql);
  }
});

beforeEach(async () => {
  await client.query(`
    truncate
      content_translation_request_budget_counters,
      content_topic_title_translation_tasks,
      translation_tasks,
      translation_task_generation_heads,
      forum_topic_title_translations,
      forum_post_body_translations,
      forum_post_revisions,
      forum_posts,
      forum_topic_title_revisions,
      forum_topics,
      forum_sections,
      forum_categories,
      "user"
    cascade
  `);
  await seedForumGraph(client);
});

afterAll(async () => {
  await client.query("set search_path to public");
  await client.query(`drop schema if exists ${schemaName} cascade`);
  await client.end();
});

describe("content topic-title execution and publication", () => {
  it("dispatches by persisted kind, publishes atomically, and makes duplicate delivery provider-free", async () => {
    const enqueuer = new FakeTranslationTaskEnqueuer();
    const planned = await createPlanner(client, enqueuer).planAndDispatch(requestRevision(), "he", budgetAdmission());
    if (planned.kind !== "queued") throw new Error("expected queued content task");

    const translate = vi.fn(async (): Promise<MachineTranslationResult> => ({
      value: "כותרת מתורגמת",
      provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
    }));
    const uiExecute = vi.fn(async () => ({
      outcome: "already-claimed" as const,
      delivery: "ack" as const,
    }));
    const dispatcher = createDispatcher(client, { supports: () => true, translate }, uiExecute);

    await expect(dispatcher.execute(enqueuer.messages[0]!)).resolves.toEqual({
      outcome: "published",
      delivery: "ack",
    });
    expect(uiExecute).not.toHaveBeenCalled();
    expect(translate).toHaveBeenCalledTimes(1);
    expect(translate).toHaveBeenCalledWith({
      domain: "content",
      contentClassification: "public-forum-topic-title",
      sourceLocale: "ru",
      targetLocale: "he",
      messageKind: "plain",
      operation: "plain",
      source: "Исходный заголовок",
    });

    const taskRow = await client.query<{
      status: string;
      claim_token: string | null;
      completed_at: Date | null;
    }>(`
      select status, claim_token, completed_at
        from translation_tasks
       where id = '${planned.task.id}'
    `);
    expect(taskRow.rows[0]).toMatchObject({
      status: "completed",
      claim_token: null,
    });
    expect(taskRow.rows[0]?.completed_at).toBeInstanceOf(Date);

    const translation = await new DrizzleContentTranslationStore(drizzle(client)).read({
      contentType: "topic-title",
      contentId: "topic-a",
      revisionId: "title-a-r1",
      targetLocale: "he",
    });
    expect(translation).toEqual({
      contentType: "topic-title",
      contentId: "topic-a",
      revisionId: "title-a-r1",
      targetLocale: "he",
      sourceLocale: "ru",
      translatedContent: "כותרת מתורגמת",
      provenance: {
        origin: "machine",
        provider: "fake",
        model: "fake-v1",
      },
    });

    await expect(dispatcher.execute(enqueuer.messages[0]!)).resolves.toEqual({
      outcome: "terminal",
      delivery: "ack",
    });
    expect(translate).toHaveBeenCalledTimes(1);
  });

  it("re-evaluates revoked content data policy before the external runner call", async () => {
    let allowed = true;
    const dataPolicy: TranslationProviderDataPolicy = {
      allows: vi.fn(() => allowed),
    };
    const run = vi.fn(async () => ({ translated_text: "כותרת מתורגמת" }));
    const adapter = new CloudflareM2m100TranslationProvider({ run }, dataPolicy);
    const providerRouter = new TranslationProviderRouter([adapter]);
    const providerCapability = new RoutedContentTopicTitleProviderCapability(providerRouter);
    const enqueuer = new FakeTranslationTaskEnqueuer();

    const planned = await createPlanner(client, enqueuer, providerCapability)
      .planAndDispatch(requestRevision(), "he", budgetAdmission());
    expect(planned.kind).toBe("queued");
    expect(dataPolicy.allows).toHaveBeenCalledWith({
      provider: CLOUDFLARE_WORKERS_AI_PROVIDER,
      model: CLOUDFLARE_M2M100_MODEL,
      contentClassification: "public-forum-topic-title",
      sourceLocale: "ru",
      targetLocale: "he",
      operation: "plain",
    });

    allowed = false;
    const dispatcher = createDispatcherWithRouter(client, providerRouter);

    await expect(dispatcher.execute(enqueuer.messages[0]!)).resolves.toEqual({
      outcome: "execution-failed",
      delivery: "terminal",
      failureCode: "provider-unsupported",
      terminalReason: "terminal",
      attemptCount: 1,
      maxAttempts: 3,
    });
    expect(run).not.toHaveBeenCalled();
    expect(dataPolicy.allows).toHaveBeenCalledTimes(2);
  });

  it("reactivates a stale stable identity when the same content work becomes eligible again", async () => {
    const firstEnqueuer = new FakeTranslationTaskEnqueuer();
    const first = await createPlanner(client, firstEnqueuer).planAndDispatch(requestRevision(), "he", budgetAdmission());
    if (first.kind !== "queued") throw new Error("expected queued content task");

    const tasks = new DrizzleTranslationTaskStore(drizzle(client));
    const allowance = await tasks.acquireContentProviderAllowance(first.task.id, 60_000);
    if (allowance.outcome !== "acquired") throw new Error("expected allowance admission lease");
    await expect(tasks.persistContentProviderAllowanceAdmission(
      first.task.id,
      allowance.admissionToken,
      allowance.occurrence,
      "fake-provider",
      "fixture-reservation",
    )).resolves.toBe(true);
    const claim = await tasks.claimContentTopicTitle(first.task.id, 60_000);
    if (claim.outcome !== "claimed") throw new Error("expected content task claim");
    await expect(tasks.markStale(first.task.id, claim.task.claimToken)).resolves.toBe(true);

    const secondEnqueuer = new FakeTranslationTaskEnqueuer();
    const second = await createPlanner(client, secondEnqueuer).planAndDispatch(requestRevision(), "he", budgetAdmission());
    expect(second).toMatchObject({
      kind: "queued",
      taskCreated: false,
      task: {
        id: first.task.id,
        status: "pending",
        attemptCount: 0,
      },
    });
    expect(secondEnqueuer.messages).toEqual([{ translationTaskId: first.task.id }]);
  });

  it("cannot claim a content task through the UI claim path", async () => {
    const planned = await createPlanner(client).planAndDispatch(requestRevision(), "he", budgetAdmission());
    if (planned.kind !== "queued") throw new Error("expected queued content task");

    const tasks = new DrizzleTranslationTaskStore(drizzle(client));
    await expect(tasks.claim(planned.task.id, 60_000)).rejects.toBeInstanceOf(
      TranslationTaskKindMismatchError,
    );

    const row = await client.query<{ status: string; attempt_count: number }>(`
      select status, attempt_count
        from translation_tasks
       where id = '${planned.task.id}'
    `);
    expect(row.rows[0]).toEqual({ status: "pending", attempt_count: 0 });
  });

  it("releases retryable provider failure through the shared attempt budget and later completes", async () => {
    const enqueuer = new FakeTranslationTaskEnqueuer();
    const planned = await createPlanner(client, enqueuer).planAndDispatch(requestRevision(), "he", budgetAdmission());
    if (planned.kind !== "queued") throw new Error("expected queued content task");

    let calls = 0;
    const adapter: MachineTranslationProviderAdapter = {
      supports: () => true,
      translate: async () => {
        calls++;
        if (calls === 1) {
          throw new TranslationExecutionFailure(
            "retryable",
            "provider-temporary",
            "temporary provider fixture",
          );
        }
        return {
          value: "כותרת מתורגמת",
          provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
        };
      },
    };
    const dispatcher = createDispatcher(client, adapter);

    await expect(dispatcher.execute(enqueuer.messages[0]!)).resolves.toEqual({
      outcome: "execution-failed",
      delivery: "retry",
      failureCode: "provider-temporary",
      attemptCount: 1,
      maxAttempts: 3,
    });
    await expect(dispatcher.execute(enqueuer.messages[0]!)).resolves.toEqual({
      outcome: "published",
      delivery: "ack",
    });

    const row = await client.query<{
      status: string;
      attempt_count: number;
      last_failure_code: string | null;
    }>(`
      select status, attempt_count, last_failure_code
        from translation_tasks
       where id = '${planned.task.id}'
    `);
    expect(row.rows[0]).toEqual({
      status: "completed",
      attempt_count: 2,
      last_failure_code: null,
    });
    expect(calls).toBe(2);
  });

  it("terminalizes retry exhaustion without an extra provider call", async () => {
    const enqueuer = new FakeTranslationTaskEnqueuer();
    const planned = await createPlanner(client, enqueuer).planAndDispatch(requestRevision(), "he", budgetAdmission());
    if (planned.kind !== "queued") throw new Error("expected queued content task");
    await client.query(
      "update translation_tasks set max_attempts = 1 where id = $1",
      [planned.task.id],
    );

    const translate = vi.fn(async () => {
      throw new TranslationExecutionFailure(
        "retryable",
        "provider-temporary",
        "temporary provider fixture",
      );
    });
    const dispatcher = createDispatcher(client, { supports: () => true, translate });

    await expect(dispatcher.execute(enqueuer.messages[0]!)).resolves.toEqual({
      outcome: "execution-failed",
      delivery: "terminal",
      failureCode: "provider-temporary",
      terminalReason: "retry-exhausted",
      attemptCount: 1,
      maxAttempts: 1,
    });
    await expect(dispatcher.execute(enqueuer.messages[0]!)).resolves.toEqual({
      outcome: "terminal",
      delivery: "ack",
    });
    expect(translate).toHaveBeenCalledTimes(1);
  });

  it("does not publish a provider result after the title revision changes during the provider window", async () => {
    const second = await secondClient();
    try {
      const enqueuer = new FakeTranslationTaskEnqueuer();
      const planned = await createPlanner(client, enqueuer).planAndDispatch(requestRevision(), "he", budgetAdmission());
      if (planned.kind !== "queued") throw new Error("expected queued content task");

      const started = deferred();
      const release = deferred();
      const dispatcher = createDispatcher(client, {
        supports: () => true,
        translate: async () => {
          started.resolve();
          await release.promise;
          return {
            value: "תוצאה ישנה",
            provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
          };
        },
      });

      const execution = dispatcher.execute(enqueuer.messages[0]!);
      await started.promise;

      await second.query("begin");
      try {
        await second.query(`
          insert into forum_topic_title_revisions
            (id, topic_id, author_id, original_content, source_locale)
          values ('title-a-r2', 'topic-a', 'author-a', 'Новый заголовок', 'ru')
        `);
        await second.query(`
          update forum_topics set current_title_revision_id = 'title-a-r2'
           where id = 'topic-a'
        `);
        await second.query("commit");
      } catch (error) {
        await second.query("rollback");
        throw error;
      }

      release.resolve();
      await expect(execution).resolves.toEqual({
        outcome: "stale",
        reason: "revision-not-current",
        delivery: "ack",
      });

      const translations = await second.query<{ count: number }>(`
        select count(*)::int as count from forum_topic_title_translations
      `);
      expect(translations.rows[0]?.count).toBe(0);
      const task = await second.query<{ status: string }>(
        "select status from translation_tasks where id = $1",
        [planned.task.id],
      );
      expect(task.rows[0]?.status).toBe("stale");
    } finally {
      await second.end();
    }
  });

  it("preserves a manual translation created during the provider window", async () => {
    const second = await secondClient();
    try {
      const enqueuer = new FakeTranslationTaskEnqueuer();
      const planned = await createPlanner(client, enqueuer).planAndDispatch(requestRevision(), "he", budgetAdmission());
      if (planned.kind !== "queued") throw new Error("expected queued content task");

      const started = deferred();
      const release = deferred();
      const dispatcher = createDispatcher(client, {
        supports: () => true,
        translate: async () => {
          started.resolve();
          await release.promise;
          return {
            value: "מכונה",
            provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
          };
        },
      });
      const execution = dispatcher.execute(enqueuer.messages[0]!);
      await started.promise;

      await new DrizzleContentTranslationStore(drizzle(second)).write({
        contentType: "topic-title",
        contentId: "topic-a",
        revisionId: "title-a-r1",
        targetLocale: "he",
        sourceLocale: "ru",
        translatedContent: "ידני",
        provenance: { origin: "persistent_manual" },
      });

      release.resolve();
      await expect(execution).resolves.toEqual({
        outcome: "stale",
        reason: "translation-current",
        delivery: "ack",
      });

      await expect(new DrizzleContentTranslationStore(drizzle(second)).read({
        contentType: "topic-title",
        contentId: "topic-a",
        revisionId: "title-a-r1",
        targetLocale: "he",
      })).resolves.toMatchObject({
        translatedContent: "ידני",
        provenance: { origin: "persistent_manual" },
      });
    } finally {
      await second.end();
    }
  });

  it("keeps reconciliation and observability kind-neutral before dispatching content", async () => {
    const plannedEnqueuer = new FakeTranslationTaskEnqueuer();
    const planned = await createPlanner(client, plannedEnqueuer)
      .planAndDispatch(requestRevision(), "he", budgetAdmission());
    if (planned.kind !== "queued") throw new Error("expected queued content task");

    const tasks = new DrizzleTranslationTaskStore(drizzle(client));
    await expect(tasks.observeTranslationTasks()).resolves.toMatchObject({
      counts: { pending: 1, processing: 0, stale: 0, completed: 0, failed: 0 },
      pending: { unattempted: 1, retryReleased: 0 },
    });

    const reconciled = new FakeTranslationTaskEnqueuer();
    await expect(new TranslationTaskReconciler(tasks, reconciled).reconcile({
      limit: 10,
      pendingOlderThanMs: 0,
    })).resolves.toMatchObject({
      outcome: "complete",
      selected: 1,
      enqueued: 1,
      pending: 1,
      expiredProcessing: 0,
    });
    expect(reconciled.messages).toEqual([{ translationTaskId: planned.task.id }]);

    const uiExecute = vi.fn(async () => ({
      outcome: "already-claimed" as const,
      delivery: "ack" as const,
    }));
    const dispatcher = createDispatcher(client, {
      supports: () => true,
      translate: async () => ({
        value: "כותרת מתורגמת",
        provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
      }),
    }, uiExecute);

    await expect(dispatcher.execute(reconciled.messages[0]!)).resolves.toEqual({
      outcome: "published",
      delivery: "ack",
    });
    expect(uiExecute).not.toHaveBeenCalled();
    await expect(tasks.observeTranslationTasks()).resolves.toMatchObject({
      counts: { pending: 0, processing: 0, stale: 0, completed: 1, failed: 0 },
    });
  });

  it("does not publish after claim ownership changes during the provider window", async () => {
    const second = await secondClient();
    try {
      const enqueuer = new FakeTranslationTaskEnqueuer();
      const planned = await createPlanner(client, enqueuer).planAndDispatch(requestRevision(), "he", budgetAdmission());
      if (planned.kind !== "queued") throw new Error("expected queued content task");

      const started = deferred();
      const release = deferred();
      const dispatcher = createDispatcher(client, {
        supports: () => true,
        translate: async () => {
          started.resolve();
          await release.promise;
          return {
            value: "מכונה",
            provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
          };
        },
      });
      const execution = dispatcher.execute(enqueuer.messages[0]!);
      await started.promise;

      await second.query(`
        update translation_tasks
           set claim_token = '30000000-0000-4000-8000-000000000003'
         where id = $1 and status = 'processing'
      `, [planned.task.id]);

      release.resolve();
      await expect(execution).resolves.toEqual({
        outcome: "claim-lost",
        delivery: "ack",
      });

      const translations = await second.query<{ count: number }>(`
        select count(*)::int as count from forum_topic_title_translations
      `);
      expect(translations.rows[0]?.count).toBe(0);
    } finally {
      await second.end();
    }
  });

  it("defers provider allowance before claim without consuming the execution attempt", async () => {
    const planned = await createPlanner(client).planAndDispatch(
      requestRevision(),
      "he",
      budgetAdmission(),
    );
    if (planned.kind !== "queued") throw new Error("expected queued content task");

    const tasks = new DrizzleTranslationTaskStore(drizzle(client));
    const acquired = await tasks.acquireContentProviderAllowance(planned.task.id, 60_000);
    expect(acquired.outcome).toBe("acquired");
    if (acquired.outcome !== "acquired") throw new Error("expected allowance lease");

    const retryNotBefore = new Date(Date.now() + 60_000);
    const persisted = await tasks.persistContentProviderAllowanceDeferral(
      planned.task.id,
      acquired.admissionToken,
      acquired.occurrence,
      retryNotBefore,
      "allowance-exhausted",
    );
    expect(persisted).toBeInstanceOf(Date);

    await expect(tasks.claimContentTopicTitle(planned.task.id, 60_000)).resolves.toEqual({
      outcome: "already-claimed",
    });
    await expect(tasks.acquireContentProviderAllowance(planned.task.id, 60_000)).resolves.toMatchObject({
      outcome: "deferred",
      reason: "allowance-exhausted",
    });

    const row = await client.query<{
      attempt_count: number;
      status: string;
      allowance_state: string | null;
    }>(
      "select attempt_count, status, allowance_state from translation_tasks where id = $1",
      [planned.task.id],
    );
    expect(row.rows[0]).toEqual({
      attempt_count: 0,
      status: "pending",
      allowance_state: "deferred",
    });

    await expect(tasks.reserveReconciliationCandidates({
      limit: 20,
      pendingOlderThanMs: 0,
    })).resolves.not.toContainEqual(expect.objectContaining({ id: planned.task.id }));

    await client.query(
      `update translation_tasks
          set allowance_retry_not_before = statement_timestamp() - interval '1 second',
              allowance_updated_at = statement_timestamp() - interval '2 seconds'
        where id = $1`,
      [planned.task.id],
    );
    await expect(tasks.reserveReconciliationCandidates({
      limit: 20,
      pendingOlderThanMs: 0,
    })).resolves.toContainEqual({
      id: planned.task.id,
      reason: "pending",
    });
  });

  it("recovers an expired admission lease with the same occurrence key", async () => {
    const planned = await createPlanner(client).planAndDispatch(
      requestRevision(),
      "he",
      budgetAdmission(),
    );
    if (planned.kind !== "queued") throw new Error("expected queued content task");

    const tasks = new DrizzleTranslationTaskStore(drizzle(client));
    const first = await tasks.acquireContentProviderAllowance(planned.task.id, 60_000);
    if (first.outcome !== "acquired") throw new Error("expected first allowance lease");
    const firstKey = await contentProviderAllowanceOccurrenceKey(planned.task.id, first.occurrence);

    await client.query(
      `update translation_tasks
          set allowance_updated_at = statement_timestamp() - interval '2 seconds',
              allowance_lease_expires_at = statement_timestamp() - interval '1 second'
        where id = $1`,
      [planned.task.id],
    );

    const recovered = await tasks.acquireContentProviderAllowance(planned.task.id, 60_000);
    if (recovered.outcome !== "acquired") throw new Error("expected recovered allowance lease");
    const recoveredKey = await contentProviderAllowanceOccurrenceKey(
      planned.task.id,
      recovered.occurrence,
    );

    expect(recovered.admissionToken).not.toBe(first.admissionToken);
    expect(recovered.occurrence).toEqual(first.occurrence);
    expect(recoveredKey).toBe(firstKey);
  });

  it("does not persist allowance after the generation head is superseded", async () => {
    const planned = await createPlanner(client).planAndDispatch(
      requestRevision(),
      "he",
      budgetAdmission(),
    );
    if (planned.kind !== "queued") throw new Error("expected queued content task");

    const tasks = new DrizzleTranslationTaskStore(drizzle(client));
    const acquired = await tasks.acquireContentProviderAllowance(planned.task.id, 60_000);
    if (acquired.outcome !== "acquired") throw new Error("expected allowance lease");

    await client.query(
      `update translation_task_generation_heads
          set current_generation = current_generation + 1
        where translation_kind = 'content-topic-title'
          and source_namespace = 'topic-title'
          and source_key = 'topic-a'
          and target_locale = 'he'`,
    );

    await expect(tasks.persistContentProviderAllowanceAdmission(
      planned.task.id,
      acquired.admissionToken,
      acquired.occurrence,
      "fake-provider",
      "superseded-reservation",
    )).resolves.toBe(false);

    const row = await client.query<{
      allowance_state: string | null;
      attempt_count: number;
    }>(
      "select allowance_state, attempt_count from translation_tasks where id = $1",
      [planned.task.id],
    );
    expect(row.rows[0]).toEqual({
      allowance_state: "leasing",
      attempt_count: 0,
    });
  });

  it("serializes concurrent admission, consumes it on claim, and advances retry occurrence", async () => {
    const planned = await createPlanner(client).planAndDispatch(
      requestRevision(),
      "he",
      budgetAdmission(),
    );
    if (planned.kind !== "queued") throw new Error("expected queued content task");

    const second = await secondClient();
    try {
      const firstStore = new DrizzleTranslationTaskStore(drizzle(client));
      const secondStore = new DrizzleTranslationTaskStore(drizzle(second));
      const [left, right] = await Promise.all([
        firstStore.acquireContentProviderAllowance(planned.task.id, 60_000),
        secondStore.acquireContentProviderAllowance(planned.task.id, 60_000),
      ]);
      const acquired = [left, right].find((result) => result.outcome === "acquired");
      expect(acquired).toBeDefined();
      expect([left, right].filter((result) => result.outcome === "acquired")).toHaveLength(1);
      expect([left, right].filter((result) => result.outcome === "admission-in-progress")).toHaveLength(1);
      if (!acquired || acquired.outcome !== "acquired") throw new Error("expected acquired allowance");

      const firstKey = await contentProviderAllowanceOccurrenceKey(
        planned.task.id,
        acquired.occurrence,
      );
      await expect(firstStore.persistContentProviderAllowanceAdmission(
        planned.task.id,
        acquired.admissionToken,
        acquired.occurrence,
        "fake-provider",
        "provider-reservation-1",
      )).resolves.toBe(true);

      const claims = await Promise.all([
        firstStore.claimContentTopicTitle(planned.task.id, 60_000),
        secondStore.claimContentTopicTitle(planned.task.id, 60_000),
      ]);
      const claimed = claims.find((result) => result.outcome === "claimed");
      expect(claimed).toBeDefined();
      expect(claims.filter((result) => result.outcome === "claimed")).toHaveLength(1);
      if (!claimed || claimed.outcome !== "claimed") throw new Error("expected claimed task");
      expect(claimed.task.attemptCount).toBe(1);

      const afterClaim = await client.query<{
        allowance_state: string | null;
        allowance_attempt: number | null;
      }>(
        "select allowance_state, allowance_attempt from translation_tasks where id = $1",
        [planned.task.id],
      );
      expect(afterClaim.rows[0]).toEqual({
        allowance_state: null,
        allowance_attempt: null,
      });

      await expect(firstStore.recordFailure(
        planned.task.id,
        claimed.task.claimToken,
        { disposition: "retryable", code: "provider-temporary" },
      )).resolves.toMatchObject({ outcome: "retry", attemptCount: 1 });

      const next = await firstStore.acquireContentProviderAllowance(planned.task.id, 60_000);
      if (next.outcome !== "acquired") throw new Error("expected next allowance occurrence");
      expect(next.occurrence).toEqual({
        generation: acquired.occurrence.generation,
        attempt: 2,
      });
      await expect(contentProviderAllowanceOccurrenceKey(
        planned.task.id,
        next.occurrence,
      )).resolves.not.toBe(firstKey);
    } finally {
      await second.end();
    }
  });

});

function createPlanner(
  connection: Client,
  enqueuer = new FakeTranslationTaskEnqueuer(),
  providerCapability: ContentTopicTitleProviderCapability = { supports: () => true },
): ContentTopicTitleTranslationPlanner {
  return new ContentTopicTitleTranslationPlanner({
    localeRegistry,
    sourceLocaleResolver: new ContentSourceLocaleResolver(
      {
        detect: async () => {
          throw new Error("known source locale must bypass detection");
        },
      },
      new ThresholdContentSourceLocalePolicy(0.8, () => true),
    ),
    contentTranslations: new ContentTranslationService(
      new DrizzleContentTranslationStore(drizzle(connection)),
    ),
    providerCapability,
    tasks: new DrizzleContentTopicTitlePlanningStore(drizzle(connection)),
    enqueuer,
    generationPolicyVersion: "content-v1",
  });
}

function createDispatcher(
  connection: Client,
  adapter: MachineTranslationProviderAdapter,
  uiExecute = vi.fn(async () => ({
    outcome: "already-claimed" as const,
    delivery: "ack" as const,
  })),
): TranslationTaskExecutorDispatcher {
  return createDispatcherWithRouter(
    connection,
    new TranslationProviderRouter([adapter]),
    uiExecute,
  );
}

function createDispatcherWithRouter(
  connection: Client,
  providerRouter: TranslationProviderRouter,
  uiExecute = vi.fn(async () => ({
    outcome: "already-claimed" as const,
    delivery: "ack" as const,
  })),
): TranslationTaskExecutorDispatcher {
  const database = drizzle(connection);
  const tasks = new DrizzleTranslationTaskStore(database);
  const executionStore = new DrizzleContentTopicTitleExecutionStore(database);
  const translations = new DrizzleContentTranslationStore(database);
  const consumer = new ContentTopicTitleTaskConsumer({
    tasks,
    revisions: executionStore,
    translations,
    localeRegistry,
    generationPolicyVersion: "content-v1",
    leaseDurationMs: 60_000,
  });
  const publisher = new ContentTopicTitleResultPublisher({
    tasks,
    revisions: executionStore,
    translations,
    localeRegistry,
    generationPolicyVersion: "content-v1",
    publications: executionStore,
  });
  const allowance = new ContentTopicTitleAllowanceGate({
    store: tasks,
    tasks,
    adapter: {
      admit: async () => ({
        outcome: "admitted" as const,
        reservationReference: "fake-reservation",
      }),
    },
    provider: "fake-provider",
    admissionLeaseDurationMs: 60_000,
    revisions: executionStore,
    translations,
    localeRegistry,
    generationPolicyVersion: "content-v1",
  });
  const contentExecutor = new ContentTopicTitleTaskExecutor({
    allowance,
    consumer,
    providerRouter,
    publisher,
    failures: tasks,
  });

  return new TranslationTaskExecutorDispatcher({
    kinds: tasks,
    ui: { execute: uiExecute },
    contentTopicTitle: contentExecutor,
    contentPostBody: {
      execute: vi.fn(async () => ({
        outcome: "already-claimed" as const,
        delivery: "ack" as const,
      })),
    },
  });
}

function budgetAdmission(
  overrides: Partial<ContentTranslationRequestBudgetAdmission> = {},
): ContentTranslationRequestBudgetAdmission {
  return {
    subjectKey: "E".repeat(CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH),
    cost: 1,
    windowSeconds: 60,
    global: { name: "execution-title-global", version: "test-v1", limit: 1_000 },
    requester: { name: "execution-title-requester", version: "test-v1", limit: 1_000 },
    ...overrides,
  };
}

function requestRevision() {
  return {
    contentType: "topic-title" as const,
    contentId: "topic-a",
    revisionId: "title-a-r1",
    originalContent: "caller text is not authoritative",
    sourceLocale: "und",
  };
}

async function secondClient(): Promise<Client> {
  const second = new Client({ connectionString: databaseUrl });
  await second.connect();
  await second.query(`set search_path to ${schemaName}`);
  return second;
}

async function seedForumGraph(connection: Client): Promise<void> {
  await connection.query(`
    insert into "user" (id, name, email, email_verified, created_at, updated_at)
    values ('author-a', 'Author A', 'author-a@example.test', true, now(), now())
  `);
  await connection.query(`
    insert into forum_categories (id, name) values ('category', 'Category');
    insert into forum_sections (id, category_id, name) values ('section', 'category', 'Section');
  `);
  await connection.query("begin");
  try {
    await connection.query(`
      insert into forum_topics (id, section_id, author_id, current_title_revision_id)
      values ('topic-a', 'section', 'author-a', 'title-a-r1')
    `);
    await connection.query(`
      insert into forum_topic_title_revisions
        (id, topic_id, author_id, original_content, source_locale)
      values ('title-a-r1', 'topic-a', 'author-a', 'Исходный заголовок', 'ru')
    `);
    await connection.query("commit");
  } catch (error) {
    await connection.query("rollback");
    throw error;
  }
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
