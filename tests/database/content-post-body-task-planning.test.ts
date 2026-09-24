import { readFile } from "node:fs/promises";

import { drizzle } from "drizzle-orm/node-postgres";
import { Client, type DatabaseError } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH,
  type ContentTranslationRequestBudgetAdmission,
} from "../../app/localization/content-request-budget.server";
import {
  ContentPostBodyTranslationPlanner,
  contentPostBodyTaskSpecification,
} from "../../app/localization/content-post-body-planning";
import {
  CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
} from "../../app/localization/content-markdown-translation";
import {
  ContentSourceLocaleResolver,
  ThresholdContentSourceLocalePolicy,
  type ContentSourceLocaleDetectionAdapter,
} from "../../app/localization/content-source-locale";
import { ContentTranslationService } from "../../app/localization/content-translation";
import { localeRegistry } from "../../app/localization/registry";
import { FakeTranslationTaskEnqueuer } from "../../app/localization/translation-tasks";
import { DrizzleContentPostBodyPlanningStore } from "../../db/content-post-body-task-store";
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
      as $
      begin
        raise exception 'body metadata fixture failure' using errcode = 'P0001';
      end;
      $;
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
        ('post-a-r1', 'post-a', 'author-a', 'Исходный **текст** с fetchData().', 'ru'),
        ('post-b-r1', 'post-b', 'author-b', 'Body with unknown locale.', 'und')
    `);
    await connection.query("commit");
  } catch (error) {
    await connection.query("rollback");
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
