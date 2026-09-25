import { readFile } from "node:fs/promises";

import { drizzle } from "drizzle-orm/node-postgres";
import { Client, type DatabaseError } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ContentPostBodyAllowanceGate,
} from "../../app/localization/content-provider-allowance";
import {
  CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH,
  type ContentTranslationRequestBudgetAdmission,
} from "../../app/localization/content-request-budget.server";
import {
  ContentPostBodyTaskExecutor,
  type ContentPostBodyExecutionBounds,
} from "../../app/localization/content-post-body-execution";
import {
  ContentPostBodyResultPublisher,
} from "../../app/localization/content-post-body-publication";
import {
  ContentPostBodyTranslationPlanner,
  contentPostBodyTaskSpecification,
} from "../../app/localization/content-post-body-planning";
import {
  ContentPostBodyTaskConsumer,
} from "../../app/localization/content-post-body-task-consumer";
import {
  CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
  protectMarkdownForTranslation,
} from "../../app/localization/content-markdown-translation";
import {
  ContentSourceLocaleResolver,
  ThresholdContentSourceLocalePolicy,
  type ContentSourceLocaleDetectionAdapter,
} from "../../app/localization/content-source-locale";
import {
  ContentTranslationService,
} from "../../app/localization/content-translation";
import { TranslationExecutionFailure } from "../../app/localization/translation-failures";
import { ContentTopicTitleTranslationPlanner } from "../../app/localization/content-translation-planning";
import { localeRegistry } from "../../app/localization/registry";
import {
  TranslationProviderRouter,
  type MachineTranslationProviderAdapter,
  type MachineTranslationRequest,
  type MachineTranslationResult,
} from "../../app/localization/translation-provider";
import { FakeTranslationTaskEnqueuer } from "../../app/localization/translation-tasks";
import { DrizzleContentPostBodyExecutionStore } from "../../db/content-post-body-execution-store";
import { DrizzleContentPostBodyPlanningStore } from "../../db/content-post-body-task-store";
import { DrizzleContentTopicTitlePlanningStore } from "../../db/content-topic-title-task-store";
import { DrizzleContentTranslationStore } from "../../db/content-translation-store";
import { DrizzleTranslationTaskStore } from "../../db/translation-task-store";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for the disposable database integration test");

const parsedDatabaseUrl = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost"].includes(parsedDatabaseUrl.hostname)
  || !parsedDatabaseUrl.pathname.endsWith("_test")
) {
  throw new Error("Database integration tests only run against a local database ending in _test");
}

const schemaName = "content_post_body_task_test";
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
    "drizzle/0016_content_post_body_tasks.sql",
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
      content_post_body_translation_tasks,
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

describe("content post-body durable planning", () => {
  it("commits the revision-bound task before enqueue and keeps Markdown out of the message/task metadata", async () => {
    let committedTaskId: string | undefined;
    const enqueuer = new FakeTranslationTaskEnqueuer(async (message) => {
      const rows = await client.query<{
        id: string;
        translation_kind: string;
        source_namespace: string;
        post_id: string;
        revision_id: string;
        protected_content_policy_version: string;
      }>(`
        select task.id, task.translation_kind, task.source_namespace,
               metadata.post_id, metadata.revision_id, metadata.protected_content_policy_version
          from translation_tasks task
          join content_post_body_translation_tasks metadata on metadata.task_id = task.id
         where task.id = '${message.translationTaskId}'
      `);
      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0]).toMatchObject({
        translation_kind: "content-post-body",
        source_namespace: "post-body",
        post_id: "post-a",
        revision_id: "post-a-r1",
        protected_content_policy_version: CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
      });
      committedTaskId = rows.rows[0]!.id;
    });

    const result = await createPlanner(client, enqueuer).planAndDispatch(
      requestRevision(),
      "he",
      budgetAdmission(),
    );

    expect(result).toMatchObject({
      kind: "queued",
      taskCreated: true,
      task: {
        translationKind: "content-post-body",
        sourceIdentity: { postId: "post-a", revisionId: "post-a-r1" },
        revisionSourceLocale: "ru",
        resolvedSourceLocale: "ru",
        targetLocale: "he",
        protectedContentPolicyVersion: CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
        status: "pending",
      },
    });
    expect(committedTaskId).toBe(
      (result as { task: { id: string } }).task.id,
    );
    expect(enqueuer.messages).toEqual([{ translationTaskId: committedTaskId! }]);

    const metadata = await client.query<Record<string, unknown>>(`
      select * from content_post_body_translation_tasks
    `);
    expect(metadata.rows[0]).not.toHaveProperty("original_content");
    expect(metadata.rows[0]).not.toHaveProperty("protected_markdown");
    expect(metadata.rows[0]).not.toHaveProperty("segments");
  });

  it("keeps an existing exact-revision body translation free of budget and durable work", async () => {
    await new DrizzleContentTranslationStore(drizzle(client)).write({
      contentType: "post-body",
      contentId: "post-a",
      revisionId: "post-a-r1",
      targetLocale: "he",
      sourceLocale: "ru",
      translatedContent: "ידני",
      provenance: { origin: "persistent_manual" },
    });

    await expect(
      createPlanner(client).planAndDispatch(requestRevision(), "he", budgetAdmission()),
    ).resolves.toMatchObject({
      kind: "original",
      reason: "translation-current",
    });

    const counters = await client.query<{ count: number }>(
      "select count(*)::int as count from content_translation_request_budget_counters",
    );
    const tasks = await client.query<{ count: number }>(
      "select count(*)::int as count from translation_tasks where translation_kind = 'content-post-body'",
    );
    expect(counters.rows[0]?.count).toBe(0);
    expect(tasks.rows[0]?.count).toBe(0);
  });

  it("rechecks a serialized body translation before admission and rolls back planning metadata", async () => {
    const store = new DrizzleContentPostBodyPlanningStore(drizzle(client));
    const revision = await store.readCurrentRevision("post-a");
    if (!revision) throw new Error("missing post revision fixture");
    const protectedDocument = protectMarkdownForTranslation(revision.originalContent);
    const specification = await contentPostBodyTaskSpecification(
      revision,
      {
        kind: "revision",
        mayProceed: true,
        sourceLocale: "ru",
        resolutionOrigin: "revision-metadata",
      },
      "ru",
      "he",
      CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
      "content-v1",
      protectedDocument,
    );

    await new DrizzleContentTranslationStore(drizzle(client)).write({
      contentType: "post-body",
      contentId: "post-a",
      revisionId: "post-a-r1",
      targetLocale: "he",
      sourceLocale: "ru",
      translatedContent: "ידני",
      provenance: { origin: "persistent_manual" },
    });

    await expect(
      store.upsertPending(specification, revision, budgetAdmission()),
    ).resolves.toEqual({ outcome: "translation-current" });

    const [counters, heads, tasks] = await Promise.all([
      client.query<{ count: number }>(
        "select count(*)::int as count from content_translation_request_budget_counters",
      ),
      client.query<{ count: number }>(
        "select count(*)::int as count from translation_task_generation_heads where translation_kind = 'content-post-body'",
      ),
      client.query<{ count: number }>(
        "select count(*)::int as count from translation_tasks where translation_kind = 'content-post-body'",
      ),
    ]);
    expect(counters.rows[0]?.count).toBe(0);
    expect(heads.rows[0]?.count).toBe(0);
    expect(tasks.rows[0]?.count).toBe(0);
  });

  it("persists detected source semantics for an und revision without detector evidence payload", async () => {
    const planner = createPlanner(
      client,
      new FakeTranslationTaskEnqueuer(),
      async () => ({
        locale: "ru",
        confidence: 0.97,
        evidence: { origin: "detector", detector: "fake-detector", model: "fake-model" },
      }),
    );

    const result = await planner.planAndDispatch({
      contentType: "post-body",
      contentId: "post-b",
      revisionId: "post-b-r1",
      originalContent: "caller body is ignored",
      sourceLocale: "und",
    }, "he", budgetAdmission());

    expect(result).toMatchObject({
      kind: "queued",
      task: {
        revisionSourceLocale: "und",
        resolvedSourceLocale: "ru",
        sourceResolutionOrigin: "detector",
      },
    });

    const rows = await client.query<Record<string, unknown>>(`
      select * from content_post_body_translation_tasks where post_id = 'post-b'
    `);
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]).not.toHaveProperty("evidence");
    expect(rows.rows[0]).not.toHaveProperty("detector");
  });

  it("serializes concurrent duplicate planning into one stable durable identity", async () => {
    const second = new Client({ connectionString: databaseUrl });
    await second.connect();
    await second.query(`set search_path to ${schemaName}`);
    try {
      const firstEnqueuer = new FakeTranslationTaskEnqueuer();
      const secondEnqueuer = new FakeTranslationTaskEnqueuer();
      const [first, duplicate] = await Promise.all([
        createPlanner(client, firstEnqueuer).planAndDispatch(requestRevision(), "he", budgetAdmission()),
        createPlanner(second, secondEnqueuer).planAndDispatch(requestRevision(), "he", budgetAdmission()),
      ]);

      expect([first, duplicate]).toEqual(expect.arrayContaining([
        expect.objectContaining({ kind: "queued", taskCreated: true }),
        expect.objectContaining({ kind: "queued", taskCreated: false }),
      ]));
      const ids = [...firstEnqueuer.messages, ...secondEnqueuer.messages]
        .map((message) => message.translationTaskId);
      expect(new Set(ids).size).toBe(1);

      if (first.kind !== "queued" || duplicate.kind !== "queued") {
        throw new Error("expected queued duplicate results");
      }
      expect(first.task.taskIdentity).toBe(duplicate.task.taskIdentity);

      const count = await client.query<{ count: number }>(`
        select count(*)::int as count
          from translation_tasks
         where translation_kind = 'content-post-body'
      `);
      expect(count.rows[0]?.count).toBe(1);
      const budget = await client.query<{ used: number }>(`
        select coalesce(sum(used_units), 0)::int as used
          from content_translation_request_budget_counters
         where scope in ('body-global@test-v1', 'body-requester@test-v1')
      `);
      // Two eligible duplicates cost two units each in both scopes.
      expect(budget.rows[0]?.used).toBe(8);
    } finally {
      await second.end();
    }
  });

  it("serializes concurrent body admission without overshooting a one-unit budget", async () => {
    const second = new Client({ connectionString: databaseUrl });
    await second.connect();
    await second.query(`set search_path to ${schemaName}`);
    try {
      const admission = budgetAdmission({
        cost: 1,
        global: { name: "body-global-concurrent", version: "test-v1", limit: 1 },
        requester: { name: "body-requester-concurrent", version: "test-v1", limit: 1 },
      });
      const firstEnqueuer = new FakeTranslationTaskEnqueuer();
      const secondEnqueuer = new FakeTranslationTaskEnqueuer();

      const results = await Promise.all([
        createPlanner(client, firstEnqueuer).planAndDispatch(
          requestRevision(),
          "he",
          admission,
        ),
        createPlanner(second, secondEnqueuer).planAndDispatch(
          requestRevision(),
          "he",
          admission,
        ),
      ]);

      expect(results.filter((result) => result.kind === "queued")).toHaveLength(1);
      expect(results.filter((result) =>
        result.kind === "original" && result.reason === "request-budget-denied"
      )).toHaveLength(1);

      const counters = await client.query<{ scope: string; used_units: number }>(`
        select scope, used_units::int
          from content_translation_request_budget_counters
         where scope in (
           'body-global-concurrent@test-v1',
           'body-requester-concurrent@test-v1'
         )
         order by scope
      `);
      expect(counters.rows).toEqual([
        { scope: "body-global-concurrent@test-v1", used_units: 1 },
        { scope: "body-requester-concurrent@test-v1", used_units: 1 },
      ]);
      const tasks = await client.query<{ count: number }>(
        "select count(*)::int as count from translation_tasks where translation_kind = 'content-post-body'",
      );
      expect(tasks.rows[0]?.count).toBe(1);
      expect(firstEnqueuer.messages.length + secondEnqueuer.messages.length).toBe(1);
    } finally {
      await second.end();
    }
  });

  it("denies an eligible body duplicate without partial global charge or task mutation", async () => {
    const constrained = budgetAdmission({
      cost: 1,
      global: { name: "body-global-deny", version: "test-v1", limit: 2 },
      requester: { name: "body-requester-deny", version: "test-v1", limit: 1 },
    });
    const first = await createPlanner(client).planAndDispatch(
      requestRevision(),
      "he",
      constrained,
    );
    if (first.kind !== "queued") throw new Error("expected first body request to queue");

    const second = await createPlanner(client).planAndDispatch(
      requestRevision(),
      "he",
      constrained,
    );
    expect(second).toMatchObject({
      kind: "original",
      reason: "request-budget-denied",
      requestBudgetDecision: {
        allowed: false,
        limitingScope: "requester",
        remainingUnits: 0,
      },
    });

    const rows = await client.query<{ scope: string; used_units: number }>(`
      select scope, used_units::int
        from content_translation_request_budget_counters
       where scope in ('body-global-deny@test-v1', 'body-requester-deny@test-v1')
       order by scope
    `);
    expect(rows.rows).toEqual([
      { scope: "body-global-deny@test-v1", used_units: 1 },
      { scope: "body-requester-deny@test-v1", used_units: 1 },
    ]);

    const task = await client.query<{ status: string; attempt_count: number }>(
      "select status, attempt_count from translation_tasks where id = $1",
      [first.task.id],
    );
    expect(task.rows).toEqual([{ status: "pending", attempt_count: 0 }]);
  });

  it("does not reset a live processing claim during duplicate planning", async () => {
    const firstEnqueuer = new FakeTranslationTaskEnqueuer();
    const first = await createPlanner(client, firstEnqueuer).planAndDispatch(
      requestRevision(),
      "he",
      budgetAdmission(),
    );
    if (first.kind !== "queued") throw new Error("expected queued fixture task");

    const claimToken = "22222222-2222-4222-8222-222222222222";
    await client.query(`
      update translation_tasks
         set status = 'processing',
             attempt_count = 1,
             claim_token = '${claimToken}',
             claimed_at = statement_timestamp(),
             lease_expires_at = statement_timestamp() + interval '1 minute',
             updated_at = statement_timestamp()
       where id = '${first.task.id}'
    `);

    const duplicate = await createPlanner(client).planAndDispatch(requestRevision(), "he", budgetAdmission());
    expect(duplicate).toMatchObject({
      kind: "queued",
      taskCreated: false,
      task: {
        id: first.task.id,
        generation: first.task.generation,
        status: "processing",
        claimToken,
        attemptCount: 1,
      },
    });

    const rows = await client.query<{
      status: string;
      claim_token: string | null;
      attempt_count: number;
      generation: number;
    }>(`
      select status, claim_token, attempt_count, generation
        from translation_tasks
       where id = '${first.task.id}'
    `);
    expect(rows.rows[0]).toEqual({
      status: "processing",
      claim_token: claimToken,
      attempt_count: 1,
      generation: first.task.generation,
    });
    const budget = await client.query<{ used: number }>(`
      select coalesce(sum(used_units), 0)::int as used
        from content_translation_request_budget_counters
       where scope in ('body-global@test-v1', 'body-requester@test-v1')
    `);
    // Initial + duplicate: cost 2 in each of two scopes.
    expect(budget.rows[0]?.used).toBe(8);
  });

  it("does not reactivate a completed stable post-body identity", async () => {
    const first = await createPlanner(client).planAndDispatch(requestRevision(), "he", budgetAdmission());
    if (first.kind !== "queued") throw new Error("expected queued fixture task");

    await client.query(`
      update translation_tasks
         set status = 'completed',
             attempt_count = 1,
             claim_token = null,
             claimed_at = statement_timestamp() - interval '1 second',
             lease_expires_at = null,
             completed_at = statement_timestamp(),
             updated_at = statement_timestamp()
       where id = '${first.task.id}'
    `);

    const beforeBudget = await client.query<{ used: number }>(`
      select coalesce(sum(used_units), 0)::int as used
        from content_translation_request_budget_counters
       where scope in ('body-global@test-v1', 'body-requester@test-v1')
    `);

    await expect(
      createPlanner(client).planAndDispatch(requestRevision(), "he", budgetAdmission()),
    ).resolves.toMatchObject({
      kind: "original",
      reason: "task-completed",
    });

    const afterBudget = await client.query<{ used: number }>(`
      select coalesce(sum(used_units), 0)::int as used
        from content_translation_request_budget_counters
       where scope in ('body-global@test-v1', 'body-requester@test-v1')
    `);
    expect(afterBudget.rows[0]?.used).toBe(beforeBudget.rows[0]?.used);

    const rows = await client.query<{ status: string; generation: number }>(`
      select status, generation
        from translation_tasks
       where id = '${first.task.id}'
    `);
    expect(rows.rows[0]).toEqual({
      status: "completed",
      generation: first.task.generation,
    });
  });

  it("gives a new current body revision a distinct task identity and monotonic generation", async () => {
    const first = await createPlanner(client).planAndDispatch(requestRevision(), "he", budgetAdmission());
    expect(first).toMatchObject({ kind: "queued", task: { generation: 1 } });

    await client.query("begin");
    try {
      await client.query(`
        insert into forum_post_revisions
          (id, post_id, author_id, original_content, source_locale)
        values ('post-a-r2', 'post-a', 'author-a', 'Новый **текст** сообщения.', 'ru')
      `);
      await client.query(`
        update forum_posts set current_revision_id = 'post-a-r2' where id = 'post-a'
      `);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }

    const second = await createPlanner(client).planAndDispatch({
      ...requestRevision(),
      revisionId: "post-a-r2",
    }, "he", budgetAdmission());

    expect(second).toMatchObject({
      kind: "queued",
      task: {
        sourceIdentity: { revisionId: "post-a-r2" },
        generation: 2,
      },
    });
    if (first.kind !== "queued" || second.kind !== "queued") {
      throw new Error("expected queued results");
    }
    expect(second.task.taskIdentity).not.toBe(first.task.taskIdentity);
    expect(second.task.sourceFingerprint).not.toBe(first.task.sourceFingerprint);
  });

  it("rechecks the current revision under the task transaction", async () => {
    const store = new DrizzleContentPostBodyPlanningStore(drizzle(client));
    const authoritative = await store.readCurrentRevision("post-a");
    if (!authoritative) throw new Error("missing post fixture");

    const planned = await createPlanner(client).planAndDispatch(requestRevision(), "he", budgetAdmission());
    if (planned.kind !== "queued") throw new Error("expected queued fixture task");

    await client.query(`
      insert into forum_post_revisions
        (id, post_id, author_id, original_content, source_locale)
      values ('post-a-r2', 'post-a', 'author-a', 'Race revision body', 'ru')
    `);
    await client.query(`
      update forum_posts set current_revision_id = 'post-a-r2' where id = 'post-a'
    `);

    await expect(
      store.upsertPending(planned.task, authoritative, budgetAdmission()),
    ).resolves.toEqual({ outcome: "revision-changed" });

    const budget = await client.query<{ used: number }>(`
      select coalesce(sum(used_units), 0)::int as used
        from content_translation_request_budget_counters
       where scope in ('body-global@test-v1', 'body-requester@test-v1')
    `);
    expect(budget.rows[0]?.used).toBe(4);
  });

  it("leaves enqueue failure as a pending task recoverable by JOB-06", async () => {
    const failure = new Error("enqueue failed");
    const enqueuer = new FakeTranslationTaskEnqueuer(() => {
      throw failure;
    });

    await expect(
      createPlanner(client, enqueuer).planAndDispatch(requestRevision(), "he", budgetAdmission()),
    ).rejects.toBe(failure);

    const pending = await client.query<{ id: string; status: string }>(`
      select id, status
        from translation_tasks
       where translation_kind = 'content-post-body'
    `);
    expect(pending.rows).toHaveLength(1);
    expect(pending.rows[0]?.status).toBe("pending");

    const budget = await client.query<{ used: number }>(`
      select coalesce(sum(used_units), 0)::int as used
        from content_translation_request_budget_counters
       where scope in ('body-global@test-v1', 'body-requester@test-v1')
    `);
    expect(budget.rows[0]?.used).toBe(4);

    const candidates = await new DrizzleTranslationTaskStore(drizzle(client))
      .reserveReconciliationCandidates({ limit: 10, pendingOlderThanMs: 0 });
    expect(candidates).toContainEqual({
      id: pending.rows[0]!.id,
      reason: "pending",
    });
  });

  it("rolls back body budget counters when task metadata insertion fails", async () => {
    await client.query(`
      create function reject_body_task_metadata_fixture()
      returns trigger
      language plpgsql
      as $fixture$
      begin
        raise exception 'body metadata fixture failure' using errcode = 'P0001';
      end;
      $fixture$;
      create trigger reject_body_task_metadata_fixture
      before insert on content_post_body_translation_tasks
      for each row execute function reject_body_task_metadata_fixture();
    `);

    try {
      await expect(
        createPlanner(client).planAndDispatch(requestRevision(), "he", budgetAdmission()),
      ).rejects.toBeInstanceOf(Error);

      const [counters, tasks, heads] = await Promise.all([
        client.query<{ count: number }>(
          "select count(*)::int as count from content_translation_request_budget_counters",
        ),
        client.query<{ count: number }>(
          "select count(*)::int as count from translation_tasks where translation_kind = 'content-post-body'",
        ),
        client.query<{ count: number }>(
          "select count(*)::int as count from translation_task_generation_heads where translation_kind = 'content-post-body'",
        ),
      ]);
      expect(counters.rows[0]?.count).toBe(0);
      expect(tasks.rows[0]?.count).toBe(0);
      expect(heads.rows[0]?.count).toBe(0);
    } finally {
      await client.query(
        "drop trigger if exists reject_body_task_metadata_fixture on content_post_body_translation_tasks",
      );
      await client.query("drop function if exists reject_body_task_metadata_fixture()");
    }
  });

  it("keeps title and body budget policies isolated even for the same requester", async () => {
    const sharedSubject = "S".repeat(CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH);
    const titleAdmission: ContentTranslationRequestBudgetAdmission = {
      subjectKey: sharedSubject,
      cost: 1,
      windowSeconds: 60,
      global: { name: "isolation-title-global", version: "v1", limit: 10 },
      requester: { name: "isolation-title-requester", version: "v1", limit: 10 },
    };
    const bodyAdmission: ContentTranslationRequestBudgetAdmission = {
      subjectKey: sharedSubject,
      cost: 3,
      windowSeconds: 60,
      global: { name: "isolation-body-global", version: "v1", limit: 10 },
      requester: { name: "isolation-body-requester", version: "v1", limit: 10 },
    };

    const title = await createTitlePlanner(client).planAndDispatch({
      contentType: "topic-title",
      contentId: "topic-a",
      revisionId: "title-a-r1",
      originalContent: "caller title",
      sourceLocale: "und",
    }, "he", titleAdmission);
    const body = await createPlanner(client).planAndDispatch(
      requestRevision(),
      "he",
      bodyAdmission,
    );
    expect(title.kind).toBe("queued");
    expect(body.kind).toBe("queued");

    const counters = await client.query<{ scope: string; used_units: number }>(`
      select scope, used_units::int
        from content_translation_request_budget_counters
       where scope like 'isolation-%'
       order by scope
    `);
    expect(counters.rows).toEqual([
      { scope: "isolation-body-global@v1", used_units: 3 },
      { scope: "isolation-body-requester@v1", used_units: 3 },
      { scope: "isolation-title-global@v1", used_units: 1 },
      { scope: "isolation-title-requester@v1", used_units: 1 },
    ]);
  });


  it("executes protected body segments, publishes atomically, and makes duplicate delivery provider-free", async () => {
    const enqueuer = new FakeTranslationTaskEnqueuer();
    const planned = await createPlanner(client, enqueuer).planAndDispatch(
      requestRevision(),
      "he",
      budgetAdmission(),
    );
    if (planned.kind !== "queued") throw new Error("expected queued body task");

    const translate = vi.fn(async (request: MachineTranslationRequest) =>
      machineResultForRequest(request)
    );
    const executor = createBodyExecutor(client, {
      supports: () => true,
      translate,
    });

    await expect(executor.execute(enqueuer.messages[0]!)).resolves.toEqual({
      outcome: "published",
      delivery: "ack",
    });

    const authoritative = await new DrizzleContentPostBodyExecutionStore(
      drizzle(client),
    ).readCurrentRevision("post-a");
    if (!authoritative) throw new Error("missing authoritative post fixture");
    const document = protectMarkdownForTranslation(authoritative.originalContent);
    expect(translate).toHaveBeenCalledTimes(document.segments.length);

    for (const [request] of translate.mock.calls) {
      expect(request).toMatchObject({
        domain: "content",
        contentClassification: "public-forum-post-body",
        sourceLocale: "ru",
        targetLocale: "he",
        messageKind: "plain",
        operation: "plain",
      });
      expect(typeof request.source).toBe("string");
      expect(String(request.source)).not.toContain("fetchData()");
      expect(String(request.source)).not.toContain("https://example.com/docs");
    }

    const translation = await new DrizzleContentTranslationStore(drizzle(client)).read({
      contentType: "post-body",
      contentId: "post-a",
      revisionId: "post-a-r1",
      targetLocale: "he",
    });
    expect(translation).toMatchObject({
      contentType: "post-body",
      contentId: "post-a",
      revisionId: "post-a-r1",
      targetLocale: "he",
      sourceLocale: "ru",
      provenance: {
        origin: "machine",
        provider: "fake",
        model: "fake-v1",
      },
    });
    expect(translation?.translatedContent).toContain("fetchData()");
    expect(translation?.translatedContent).toContain("https://example.com/docs");

    const task = await client.query<{
      status: string;
      claim_token: string | null;
      completed_at: Date | null;
    }>(
      "select status, claim_token, completed_at from translation_tasks where id = $1",
      [planned.task.id],
    );
    expect(task.rows[0]).toMatchObject({
      status: "completed",
      claim_token: null,
    });
    expect(task.rows[0]?.completed_at).toBeInstanceOf(Date);

    await expect(executor.execute(enqueuer.messages[0]!)).resolves.toEqual({
      outcome: "terminal",
      delivery: "ack",
    });
    expect(translate).toHaveBeenCalledTimes(document.segments.length);
  });

  it("retries a partial transient segment failure without publishing partial state", async () => {
    const enqueuer = new FakeTranslationTaskEnqueuer();
    const planned = await createPlanner(client, enqueuer).planAndDispatch(
      requestRevision(),
      "he",
      budgetAdmission(),
    );
    if (planned.kind !== "queued") throw new Error("expected queued body task");

    let call = 0;
    let failedOnce = false;
    const translate = vi.fn(async (request: MachineTranslationRequest) => {
      call++;
      if (!failedOnce && call === 2) {
        failedOnce = true;
        throw new TranslationExecutionFailure(
          "retryable",
          "provider-temporary",
          "temporary provider fixture",
        );
      }
      return machineResultForRequest(request);
    });
    const executor = createBodyExecutor(client, {
      supports: () => true,
      translate,
    });

    await expect(executor.execute(enqueuer.messages[0]!)).resolves.toMatchObject({
      outcome: "execution-failed",
      delivery: "retry",
      failureCode: "provider-temporary",
      attemptCount: 1,
    });
    await expect(new DrizzleContentTranslationStore(drizzle(client)).read({
      contentType: "post-body",
      contentId: "post-a",
      revisionId: "post-a-r1",
      targetLocale: "he",
    })).resolves.toBeUndefined();

    const pending = await client.query<{ status: string; attempt_count: number }>(
      "select status, attempt_count from translation_tasks where id = $1",
      [planned.task.id],
    );
    expect(pending.rows[0]).toEqual({ status: "pending", attempt_count: 1 });

    await expect(executor.execute(enqueuer.messages[0]!)).resolves.toEqual({
      outcome: "published",
      delivery: "ack",
    });
    const authoritative = await new DrizzleContentPostBodyExecutionStore(
      drizzle(client),
    ).readCurrentRevision("post-a");
    if (!authoritative) throw new Error("missing post fixture");
    expect(translate.mock.calls.length).toBeGreaterThan(
      protectMarkdownForTranslation(authoritative.originalContent).segments.length,
    );
  });

  it("preserves a concurrent manual body translation created during provider calls", async () => {
    const second = await secondClient();
    try {
      const enqueuer = new FakeTranslationTaskEnqueuer();
      const planned = await createPlanner(client, enqueuer).planAndDispatch(
        requestRevision(),
        "he",
        budgetAdmission(),
      );
      if (planned.kind !== "queued") throw new Error("expected queued body task");

      const started = deferred();
      const release = deferred();
      let firstCall = true;
      const executor = createBodyExecutor(client, {
        supports: () => true,
        translate: async (request) => {
          if (firstCall) {
            firstCall = false;
            started.resolve();
            await release.promise;
          }
          return machineResultForRequest(request);
        },
      });

      const execution = executor.execute(enqueuer.messages[0]!);
      await started.promise;

      await new DrizzleContentTranslationStore(drizzle(second)).write({
        contentType: "post-body",
        contentId: "post-a",
        revisionId: "post-a-r1",
        targetLocale: "he",
        sourceLocale: "ru",
        translatedContent: "תרגום ידני",
        provenance: { origin: "persistent_manual" },
      });

      release.resolve();
      await expect(execution).resolves.toEqual({
        outcome: "stale",
        reason: "translation-current",
        delivery: "ack",
      });

      await expect(new DrizzleContentTranslationStore(drizzle(second)).read({
        contentType: "post-body",
        contentId: "post-a",
        revisionId: "post-a-r1",
        targetLocale: "he",
      })).resolves.toMatchObject({
        translatedContent: "תרגום ידני",
        provenance: { origin: "persistent_manual" },
      });
      const task = await second.query<{ status: string }>(
        "select status from translation_tasks where id = $1",
        [planned.task.id],
      );
      expect(task.rows[0]?.status).toBe("stale");
    } finally {
      await second.end();
    }
  });

  it("discards provider work when the post revision changes during the provider window", async () => {
    const second = await secondClient();
    try {
      const enqueuer = new FakeTranslationTaskEnqueuer();
      const planned = await createPlanner(client, enqueuer).planAndDispatch(
        requestRevision(),
        "he",
        budgetAdmission(),
      );
      if (planned.kind !== "queued") throw new Error("expected queued body task");

      const started = deferred();
      const release = deferred();
      let firstCall = true;
      const executor = createBodyExecutor(client, {
        supports: () => true,
        translate: async (request) => {
          if (firstCall) {
            firstCall = false;
            started.resolve();
            await release.promise;
          }
          return machineResultForRequest(request);
        },
      });

      const execution = executor.execute(enqueuer.messages[0]!);
      await started.promise;

      await second.query("begin");
      try {
        await second.query(
          "insert into forum_post_revisions (id, post_id, author_id, original_content, source_locale) values ($1, $2, $3, $4, $5)",
          ["post-a-r2", "post-a", "author-a", "Новая ревизия сообщения.", "ru"],
        );
        await second.query(
          "update forum_posts set current_revision_id = $1 where id = $2",
          ["post-a-r2", "post-a"],
        );
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

      const translations = await second.query<{ count: number }>(
        "select count(*)::int as count from forum_post_body_translations",
      );
      expect(translations.rows[0]?.count).toBe(0);
    } finally {
      await second.end();
    }
  });

  it("discards provider work when generation changes during the provider window", async () => {
    const second = await secondClient();
    try {
      const enqueuer = new FakeTranslationTaskEnqueuer();
      const planned = await createPlanner(client, enqueuer).planAndDispatch(
        requestRevision(),
        "he",
        budgetAdmission(),
      );
      if (planned.kind !== "queued") throw new Error("expected queued body task");

      const started = deferred();
      const release = deferred();
      let firstCall = true;
      const executor = createBodyExecutor(client, {
        supports: () => true,
        translate: async (request) => {
          if (firstCall) {
            firstCall = false;
            started.resolve();
            await release.promise;
          }
          return machineResultForRequest(request);
        },
      });

      const execution = executor.execute(enqueuer.messages[0]!);
      await started.promise;
      await second.query(
        "update translation_task_generation_heads set current_generation = current_generation + 1, updated_at = statement_timestamp() where translation_kind = 'content-post-body' and source_namespace = 'post-body' and source_key = $1 and target_locale = $2",
        ["post-a", "he"],
      );

      release.resolve();
      await expect(execution).resolves.toEqual({
        outcome: "stale",
        reason: "generation-superseded",
        delivery: "ack",
      });
      const translations = await second.query<{ count: number }>(
        "select count(*)::int as count from forum_post_body_translations",
      );
      expect(translations.rows[0]?.count).toBe(0);
    } finally {
      await second.end();
    }
  });

  it("publishes after a slow provider window when an expired claim was not reclaimed", async () => {
    const second = await secondClient();
    try {
      const enqueuer = new FakeTranslationTaskEnqueuer();
      const planned = await createPlanner(client, enqueuer).planAndDispatch(
        requestRevision(),
        "he",
        budgetAdmission(),
      );
      if (planned.kind !== "queued") throw new Error("expected queued body task");

      const started = deferred();
      const release = deferred();
      let firstCall = true;
      const executor = createBodyExecutor(client, {
        supports: () => true,
        translate: async (request) => {
          if (firstCall) {
            firstCall = false;
            started.resolve();
            await release.promise;
          }
          return machineResultForRequest(request);
        },
      });

      const execution = executor.execute(enqueuer.messages[0]!);
      await started.promise;
      await second.query(
        "update translation_tasks set claimed_at = statement_timestamp() - interval '2 seconds', lease_expires_at = statement_timestamp() - interval '1 second' where id = $1 and status = 'processing'",
        [planned.task.id],
      );

      release.resolve();
      await expect(execution).resolves.toEqual({
        outcome: "published",
        delivery: "ack",
      });

      const translation = await second.query<{ count: number }>(
        "select count(*)::int as count from forum_post_body_translations",
      );
      expect(translation.rows[0]?.count).toBe(1);
      const task = await second.query<{ status: string; claim_token: string | null }>(
        "select status, claim_token from translation_tasks where id = $1",
        [planned.task.id],
      );
      expect(task.rows[0]).toEqual({ status: "completed", claim_token: null });
    } finally {
      await second.end();
    }
  });

  it("does not publish after another worker actually reclaims the expired claim", async () => {
    const second = await secondClient();
    try {
      const enqueuer = new FakeTranslationTaskEnqueuer();
      const planned = await createPlanner(client, enqueuer).planAndDispatch(
        requestRevision(),
        "he",
        budgetAdmission(),
      );
      if (planned.kind !== "queued") throw new Error("expected queued body task");

      const started = deferred();
      const release = deferred();
      let firstCall = true;
      const executor = createBodyExecutor(client, {
        supports: () => true,
        translate: async (request) => {
          if (firstCall) {
            firstCall = false;
            started.resolve();
            await release.promise;
          }
          return machineResultForRequest(request);
        },
      });

      const execution = executor.execute(enqueuer.messages[0]!);
      await started.promise;
      await second.query(
        "update translation_tasks set claimed_at = statement_timestamp() - interval '2 seconds', lease_expires_at = statement_timestamp() - interval '1 second' where id = $1 and status = 'processing'",
        [planned.task.id],
      );
      const secondStore = new DrizzleTranslationTaskStore(drizzle(second));
      const allowance = await secondStore.acquireContentProviderAllowance(
        planned.task.id,
        60_000,
      );
      if (allowance.outcome !== "acquired") {
        throw new Error("expected body reclaim allowance");
      }
      await expect(secondStore.persistContentProviderAllowanceAdmission(
        planned.task.id,
        allowance.admissionToken,
        allowance.occurrence,
        "body-reclaim-reservation",
      )).resolves.toBe(true);
      const reclaimed = await secondStore.claimContentPostBody(planned.task.id, 60_000);
      expect(reclaimed).toMatchObject({
        outcome: "claimed",
        attemptStarted: true,
        task: {
          id: planned.task.id,
          status: "processing",
          attemptCount: 2,
        },
      });
      if (reclaimed.outcome !== "claimed") {
        throw new Error("expected body task reclaim");
      }

      release.resolve();
      await expect(execution).resolves.toEqual({
        outcome: "claim-lost",
        delivery: "ack",
      });

      const translations = await second.query<{ count: number }>(
        "select count(*)::int as count from forum_post_body_translations",
      );
      expect(translations.rows[0]?.count).toBe(0);
    } finally {
      await second.end();
    }
  });

  it("rolls back the body translation when task completion fails", async () => {
    const enqueuer = new FakeTranslationTaskEnqueuer();
    const planned = await createPlanner(client, enqueuer).planAndDispatch(
      requestRevision(),
      "he",
      budgetAdmission(),
    );
    if (planned.kind !== "queued") throw new Error("expected queued body task");

    await client.query(`
      create function reject_body_completion_fixture()
      returns trigger
      language plpgsql
      as $fixture$
      begin
        if new.status = 'completed' then
          raise exception 'body completion fixture failure' using errcode = 'P0001';
        end if;
        return new;
      end;
      $fixture$;
      create trigger reject_body_completion_fixture
      before update on translation_tasks
      for each row execute function reject_body_completion_fixture();
    `);

    try {
      const executor = createBodyExecutor(client, {
        supports: () => true,
        translate: async (request) => machineResultForRequest(request),
      });
      await expectWrappedDatabaseCode(
        executor.execute(enqueuer.messages[0]!),
        "P0001",
      );

      const translation = await client.query<{ count: number }>(
        "select count(*)::int as count from forum_post_body_translations",
      );
      expect(translation.rows[0]?.count).toBe(0);
      const task = await client.query<{ status: string; claim_token: string | null }>(
        "select status, claim_token from translation_tasks where id = $1",
        [planned.task.id],
      );
      expect(task.rows[0]?.status).toBe("processing");
      expect(task.rows[0]?.claim_token).not.toBeNull();
    } finally {
      await client.query(
        "drop trigger if exists reject_body_completion_fixture on translation_tasks",
      );
      await client.query("drop function if exists reject_body_completion_fixture()",
      );
    }
  });

  it("terminal invalid restoration leaves ContentTranslationService on the exact original fallback", async () => {
    const enqueuer = new FakeTranslationTaskEnqueuer();
    const planned = await createPlanner(client, enqueuer).planAndDispatch(
      requestRevision(),
      "he",
      budgetAdmission(),
    );
    if (planned.kind !== "queued") throw new Error("expected queued body task");

    const executor = createBodyExecutor(client, {
      supports: () => true,
      translate: async () => ({
        value: "   ",
        provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
      }),
    });

    await expect(executor.execute(enqueuer.messages[0]!)).resolves.toMatchObject({
      outcome: "execution-failed",
      delivery: "terminal",
      failureCode: "provider-output-invalid",
    });

    const executionStore = new DrizzleContentPostBodyExecutionStore(drizzle(client));
    const authoritative = await executionStore.readCurrentRevision("post-a");
    if (!authoritative) throw new Error("missing authoritative post fixture");
    await expect(
      new ContentTranslationService(
        new DrizzleContentTranslationStore(drizzle(client)),
      ).readCurrent(authoritative, "he"),
    ).resolves.toEqual({
      selected: "original",
      content: authoritative.originalContent,
      contentLocale: "ru",
      reason: "missing",
      translation: null,
    });

    const failed = await client.query<{
      status: string;
      last_failure_code: string | null;
      failure_disposition: string | null;
    }>(
      "select status, last_failure_code, failure_disposition from translation_tasks where id = $1",
      [planned.task.id],
    );
    expect(failed.rows[0]).toEqual({
      status: "failed",
      last_failure_code: "provider-output-invalid",
      failure_disposition: "terminal",
    });
  });

  it("database-enforces post revision ownership and title/body namespace isolation", async () => {
    await expectDatabaseCode(client.query(`
      insert into translation_tasks (
        task_identity, translation_kind, source_namespace, source_key, source_fingerprint,
        target_locale, generation_policy_version, generation
      ) values (
        repeat('1', 64), 'content-post-body', 'post-body', 'post-a', repeat('2', 64),
        'he', 'content-v1', 1
      )
    `), "23514");

    await expectDatabaseCode(client.query(`
      insert into translation_task_generation_heads (
        translation_kind, source_namespace, source_key, target_locale, current_generation
      ) values ('content-post-body', 'topic-title', 'post-a', 'he', 1)
    `), "23514");

    const created = await createPlanner(client).planAndDispatch(requestRevision(), "he", budgetAdmission());
    if (created.kind !== "queued") throw new Error("expected queued fixture task");

    await expectDatabaseCode(client.query(`
      update content_post_body_translation_tasks
         set post_id = 'post-b'
       where task_id = '${created.task.id}'
    `), "23503");

    const titleRows = await client.query<{ count: number }>(`
      select count(*)::int as count
        from content_topic_title_translation_tasks
       where task_id = '${created.task.id}'
    `);
    expect(titleRows.rows[0]?.count).toBe(0);

    await client.query(`
      delete from content_post_body_translation_tasks
       where task_id = '${created.task.id}'
    `);
    const deleted = await client.query<{ count: number }>(`
      select count(*)::int as count from translation_tasks where id = '${created.task.id}'
    `);
    expect(deleted.rows[0]?.count).toBe(0);
  });
});

function createPlanner(
  connection: Client,
  enqueuer = new FakeTranslationTaskEnqueuer(),
  detect: ContentSourceLocaleDetectionAdapter["detect"] = async () => {
    throw new Error("known revision source locale must bypass detection");
  },
): ContentPostBodyTranslationPlanner {
  return new ContentPostBodyTranslationPlanner({
    localeRegistry,
    sourceLocaleResolver: new ContentSourceLocaleResolver(
      { detect },
      new ThresholdContentSourceLocalePolicy(0.8, () => true),
    ),
    contentTranslations: new ContentTranslationService(
      new DrizzleContentTranslationStore(drizzle(connection)),
    ),
    providerCapability: { supports: () => true },
    tasks: new DrizzleContentPostBodyPlanningStore(drizzle(connection)),
    enqueuer,
    generationPolicyVersion: "content-v1",
  });
}

function createTitlePlanner(
  connection: Client,
): ContentTopicTitleTranslationPlanner {
  return new ContentTopicTitleTranslationPlanner({
    localeRegistry,
    sourceLocaleResolver: new ContentSourceLocaleResolver(
      {
        detect: async () => {
          throw new Error("known title source locale must bypass detection");
        },
      },
      new ThresholdContentSourceLocalePolicy(0.8, () => true),
    ),
    contentTranslations: new ContentTranslationService(
      new DrizzleContentTranslationStore(drizzle(connection)),
    ),
    providerCapability: { supports: () => true },
    tasks: new DrizzleContentTopicTitlePlanningStore(drizzle(connection)),
    enqueuer: new FakeTranslationTaskEnqueuer(),
    generationPolicyVersion: "content-v1",
  });
}

function createBodyExecutor(
  connection: Client,
  adapter: MachineTranslationProviderAdapter,
  executionBounds: ContentPostBodyExecutionBounds = {
    maxSegments: 32,
    maxTotalSegmentCharacters: 100_000,
  },
): ContentPostBodyTaskExecutor {
  const database = drizzle(connection);
  const tasks = new DrizzleTranslationTaskStore(database);
  const executionStore = new DrizzleContentPostBodyExecutionStore(database);
  const translations = new DrizzleContentTranslationStore(database);
  const consumer = new ContentPostBodyTaskConsumer({
    tasks,
    revisions: executionStore,
    translations,
    localeRegistry,
    generationPolicyVersion: "content-v1",
    protectedContentPolicyVersion: CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
    leaseDurationMs: 60_000,
  });
  const publisher = new ContentPostBodyResultPublisher({
    tasks,
    revisions: executionStore,
    translations,
    localeRegistry,
    generationPolicyVersion: "content-v1",
    protectedContentPolicyVersion: CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
    publications: executionStore,
  });
  const allowance = new ContentPostBodyAllowanceGate({
    store: tasks,
    tasks,
    adapter: { admit: async () => ({ outcome: "admitted" as const, reservationReference: "fake-body" }) },
    provider: "fake-provider",
    admissionLeaseDurationMs: 60_000,
    revisions: executionStore,
    translations,
    localeRegistry,
    generationPolicyVersion: "content-v1",
    protectedContentPolicyVersion: CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
    executionBounds,
  });
  return new ContentPostBodyTaskExecutor({
    allowance,
    consumer,
    providerRouter: new TranslationProviderRouter([adapter]),
    publisher,
    failures: tasks,
    executionBounds,
  });
}

function machineResultForRequest(
  request: MachineTranslationRequest,
): MachineTranslationResult {
  if (typeof request.source !== "string") {
    throw new Error("post-body execution fixture requires plain source");
  }
  const tokens = request.source.match(/⟦VICOPROTECTED\d+X\d+X\d+⟧/gu) ?? [];
  return {
    value: ["תרגום", ...tokens].join(" "),
    provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
  };
}

function budgetAdmission(
  overrides: Partial<ContentTranslationRequestBudgetAdmission> = {},
): ContentTranslationRequestBudgetAdmission {
  return {
    subjectKey: "P".repeat(CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH),
    cost: 2,
    windowSeconds: 60,
    global: { name: "body-global", version: "test-v1", limit: 100 },
    requester: { name: "body-requester", version: "test-v1", limit: 100 },
    ...overrides,
  };
}

function requestRevision() {
  return {
    contentType: "post-body" as const,
    contentId: "post-a",
    revisionId: "post-a-r1",
    originalContent: "caller body",
    sourceLocale: "und",
  };
}

async function secondClient(): Promise<Client> {
  const second = new Client({ connectionString: databaseUrl });
  await second.connect();
  await second.query(`set search_path to ${schemaName}`);
  return second;
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function seedForumGraph(connection: Client): Promise<void> {
  await connection.query(`
    insert into "user" (id, name, email, email_verified, created_at, updated_at)
    values
      ('author-a', 'Author A', 'author-a@example.test', true, now(), now()),
      ('author-b', 'Author B', 'author-b@example.test', true, now(), now())
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
      values ('title-a-r1', 'topic-a', 'author-a', 'Тема', 'ru')
    `);
    await connection.query(`
      insert into forum_posts (id, topic_id, author_id, current_revision_id)
      values
        ('post-a', 'topic-a', 'author-a', 'post-a-r1'),
        ('post-b', 'topic-a', 'author-b', 'post-b-r1')
    `);
    await connection.query(`
      insert into forum_post_revisions
        (id, post_id, author_id, original_content, source_locale)
      values
        ('post-a-r1', 'post-a', 'author-a', 'Исходный **текст** с fetchData() и [документацией](https://example.com/docs).', 'ru'),
        ('post-b-r1', 'post-b', 'author-b', 'Body with unknown locale.', 'und')
    `);
    await connection.query("commit");
  } catch (error) {
    await connection.query("rollback");
    throw error;
  }
}

async function expectWrappedDatabaseCode(
  operation: Promise<unknown>,
  code: string,
): Promise<void> {
  try {
    await operation;
    throw new Error(`Expected wrapped PostgreSQL error ${code}`);
  } catch (error) {
    const seen = new Set<unknown>();
    let current: unknown = error;
    while (
      current
      && (typeof current === "object" || typeof current === "function")
      && !seen.has(current)
    ) {
      seen.add(current);
      if ((current as DatabaseError).code === code) return;
      current = (current as { cause?: unknown }).cause;
    }
    throw error;
  }
}

async function expectDatabaseCode(operation: Promise<unknown>, code: string): Promise<void> {
  try {
    await operation;
    throw new Error(`Expected PostgreSQL error ${code}`);
  } catch (error) {
    expect((error as DatabaseError).code).toBe(code);
  }
}
