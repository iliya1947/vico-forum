import { readFile } from "node:fs/promises";

import { drizzle } from "drizzle-orm/node-postgres";
import { Client, type DatabaseError } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH,
  type ContentTranslationRequestBudgetAdmission,
} from "../../app/localization/content-request-budget.server";
import {
  ContentSourceLocaleResolver,
  ThresholdContentSourceLocalePolicy,
} from "../../app/localization/content-source-locale";
import { ContentTranslationService } from "../../app/localization/content-translation";
import {
  ContentTopicTitleTranslationPlanner,
  contentTopicTitleTaskSpecification,
} from "../../app/localization/content-translation-planning";
import { localeRegistry } from "../../app/localization/registry";
import {
  FakeTranslationTaskEnqueuer,
} from "../../app/localization/translation-tasks";
import {
  uiTranslationJobIdentity,
  type UiTranslationJobSpecification,
} from "../../app/localization/ui-translation-service";
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

const schemaName = "content_topic_title_task_test";
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

describe("content topic-title durable planning", () => {
  it("commits revision-bound content work before enqueue and permits canonical English target", async () => {
    const enqueuer = new FakeTranslationTaskEnqueuer();
    const planner = createPlanner(client, enqueuer);

    const result = await planner.planAndDispatch({
      contentType: "topic-title",
      contentId: "topic-a",
      revisionId: "title-a-r1",
      originalContent: "caller value is intentionally ignored",
      sourceLocale: "und",
    }, "en", budgetAdmission());

    expect(result).toMatchObject({
      kind: "queued",
      taskCreated: true,
      task: {
        translationKind: "content-topic-title",
        sourceIdentity: { topicId: "topic-a", revisionId: "title-a-r1" },
        revisionSourceLocale: "ru",
        resolvedSourceLocale: "ru",
        targetLocale: "en",
        status: "pending",
      },
    });

    const row = await client.query<{
      id: string;
      topic_id: string;
      revision_id: string;
      revision_source_locale: string;
    }>(`
      select task.id, metadata.topic_id, metadata.revision_id, metadata.revision_source_locale
        from translation_tasks task
        join content_topic_title_translation_tasks metadata on metadata.task_id = task.id
       where task.translation_kind = 'content-topic-title'
    `);
    expect(row.rows).toHaveLength(1);
    expect(row.rows[0]).toMatchObject({
      topic_id: "topic-a",
      revision_id: "title-a-r1",
      revision_source_locale: "ru",
    });
    expect(enqueuer.messages).toEqual([{ translationTaskId: row.rows[0]!.id }]);
  });

  it("keeps an existing exact-revision translation free of budget and durable work", async () => {
    await new DrizzleContentTranslationStore(drizzle(client)).write({
      contentType: "topic-title",
      contentId: "topic-a",
      revisionId: "title-a-r1",
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
      "select count(*)::int as count from translation_tasks where translation_kind = 'content-topic-title'",
    );
    expect(counters.rows[0]?.count).toBe(0);
    expect(tasks.rows[0]?.count).toBe(0);
  });

  it("rechecks a serialized translation before admission and rolls back planning metadata", async () => {
    const store = new DrizzleContentTopicTitlePlanningStore(drizzle(client));
    const revision = await store.readCurrentRevision("topic-a");
    if (!revision) throw new Error("missing title revision fixture");
    const specification = await contentTopicTitleTaskSpecification(
      revision,
      {
        kind: "revision",
        mayProceed: true,
        sourceLocale: "ru",
        resolutionOrigin: "revision-metadata",
      },
      "ru",
      "he",
      "content-v1",
    );

    await new DrizzleContentTranslationStore(drizzle(client)).write({
      contentType: "topic-title",
      contentId: "topic-a",
      revisionId: "title-a-r1",
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
        "select count(*)::int as count from translation_task_generation_heads where translation_kind = 'content-topic-title'",
      ),
      client.query<{ count: number }>(
        "select count(*)::int as count from translation_tasks where translation_kind = 'content-topic-title'",
      ),
    ]);
    expect(counters.rows[0]?.count).toBe(0);
    expect(heads.rows[0]?.count).toBe(0);
    expect(tasks.rows[0]?.count).toBe(0);
  });

  it("serializes concurrent duplicate planning into one durable logical task", async () => {
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
      const taskIds = [
        ...firstEnqueuer.messages,
        ...secondEnqueuer.messages,
      ].map((message) => message.translationTaskId);
      expect(new Set(taskIds).size).toBe(1);

      const count = await client.query<{ count: number }>(`
        select count(*)::int as count
          from translation_tasks
         where translation_kind = 'content-topic-title'
      `);
      expect(count.rows[0]?.count).toBe(1);
      const budget = await client.query<{ used: number }>(`
        select coalesce(sum(used_units), 0)::int as used
          from content_translation_request_budget_counters
         where scope in ('title-global@test-v1', 'title-requester@test-v1')
      `);
      // Two eligible duplicate requests each consume one unit in both scopes.
      expect(budget.rows[0]?.used).toBe(4);
    } finally {
      await second.end();
    }
  });

  it("serializes concurrent title admission without overshooting a one-unit budget", async () => {
    const second = new Client({ connectionString: databaseUrl });
    await second.connect();
    await second.query(`set search_path to ${schemaName}`);
    try {
      const admission = budgetAdmission({
        global: { name: "title-global-concurrent", version: "test-v1", limit: 1 },
        requester: { name: "title-requester-concurrent", version: "test-v1", limit: 1 },
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
           'title-global-concurrent@test-v1',
           'title-requester-concurrent@test-v1'
         )
         order by scope
      `);
      expect(counters.rows).toEqual([
        { scope: "title-global-concurrent@test-v1", used_units: 1 },
        { scope: "title-requester-concurrent@test-v1", used_units: 1 },
      ]);
      const tasks = await client.query<{ count: number }>(
        "select count(*)::int as count from translation_tasks where translation_kind = 'content-topic-title'",
      );
      expect(tasks.rows[0]?.count).toBe(1);
      expect(firstEnqueuer.messages.length + secondEnqueuer.messages.length).toBe(1);
    } finally {
      await second.end();
    }
  });

  it("denies an eligible duplicate without partial global charge or task mutation", async () => {
    const constrained = budgetAdmission({
      global: { name: "title-global-deny", version: "test-v1", limit: 2 },
      requester: { name: "title-requester-deny", version: "test-v1", limit: 1 },
    });
    const first = await createPlanner(client).planAndDispatch(
      requestRevision(),
      "he",
      constrained,
    );
    if (first.kind !== "queued") throw new Error("expected first title request to queue");

    const denied = await createPlanner(client).planAndDispatch(
      requestRevision(),
      "he",
      constrained,
    );
    expect(denied).toMatchObject({
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
       where scope in ('title-global-deny@test-v1', 'title-requester-deny@test-v1')
       order by scope
    `);
    expect(rows.rows).toEqual([
      { scope: "title-global-deny@test-v1", used_units: 1 },
      { scope: "title-requester-deny@test-v1", used_units: 1 },
    ]);

    const task = await client.query<{ id: string; status: string; attempt_count: number }>(
      "select id, status, attempt_count from translation_tasks where task_identity = $1",
      [first.task.taskIdentity],
    );
    expect(task.rows).toEqual([{
      id: first.task.id,
      status: "pending",
      attempt_count: 0,
    }]);
  });

  it("charges a live title duplicate without resetting its claim or attempt state", async () => {
    const first = await createPlanner(client).planAndDispatch(
      requestRevision(),
      "he",
      budgetAdmission(),
    );
    if (first.kind !== "queued") throw new Error("expected queued title fixture");

    const claimToken = "11111111-1111-4111-8111-111111111111";
    await client.query(`
      update translation_tasks
         set status = 'processing',
             attempt_count = 1,
             claim_token = $1,
             claimed_at = statement_timestamp(),
             lease_expires_at = statement_timestamp() + interval '1 minute',
             updated_at = statement_timestamp()
       where id = $2
    `, [claimToken, first.task.id]);

    const duplicate = await createPlanner(client).planAndDispatch(
      requestRevision(),
      "he",
      budgetAdmission(),
    );
    expect(duplicate).toMatchObject({
      kind: "queued",
      taskCreated: false,
      task: {
        id: first.task.id,
        status: "processing",
        claimToken,
        attemptCount: 1,
        generation: first.task.generation,
      },
    });

    const row = await client.query<{
      status: string;
      claim_token: string | null;
      attempt_count: number;
      generation: number;
    }>(
      "select status, claim_token, attempt_count, generation from translation_tasks where id = $1",
      [first.task.id],
    );
    expect(row.rows[0]).toEqual({
      status: "processing",
      claim_token: claimToken,
      attempt_count: 1,
      generation: first.task.generation,
    });

    const budget = await client.query<{ used: number }>(`
      select coalesce(sum(used_units), 0)::int as used
        from content_translation_request_budget_counters
       where scope in ('title-global@test-v1', 'title-requester@test-v1')
    `);
    expect(budget.rows[0]?.used).toBe(4);
  });

  it("does not charge or re-enqueue an already completed title identity", async () => {
    const first = await createPlanner(client).planAndDispatch(
      requestRevision(),
      "he",
      budgetAdmission(),
    );
    if (first.kind !== "queued") throw new Error("expected queued title fixture");

    await client.query(`
      update translation_tasks
         set status = 'completed',
             attempt_count = 1,
             claim_token = null,
             claimed_at = statement_timestamp() - interval '1 second',
             lease_expires_at = null,
             completed_at = statement_timestamp(),
             updated_at = statement_timestamp()
       where id = $1
    `, [first.task.id]);

    const before = await client.query<{ used: number }>(`
      select coalesce(sum(used_units), 0)::int as used
        from content_translation_request_budget_counters
       where scope in ('title-global@test-v1', 'title-requester@test-v1')
    `);
    const enqueuer = new FakeTranslationTaskEnqueuer();
    await expect(
      createPlanner(client, enqueuer).planAndDispatch(
        requestRevision(),
        "he",
        budgetAdmission(),
      ),
    ).resolves.toMatchObject({
      kind: "original",
      reason: "task-completed",
    });
    const after = await client.query<{ used: number }>(`
      select coalesce(sum(used_units), 0)::int as used
        from content_translation_request_budget_counters
       where scope in ('title-global@test-v1', 'title-requester@test-v1')
    `);
    expect(after.rows[0]?.used).toBe(before.rows[0]?.used);
    expect(enqueuer.messages).toHaveLength(0);
  });

  it("gives a new current title revision a distinct task identity and monotonic generation", async () => {
    const first = await createPlanner(client).planAndDispatch(requestRevision(), "he", budgetAdmission());
    expect(first).toMatchObject({ kind: "queued", task: { generation: 1 } });

    await client.query("begin");
    try {
      await client.query(`
        insert into forum_topic_title_revisions
          (id, topic_id, author_id, original_content, source_locale)
        values ('title-a-r2', 'topic-a', 'author-a', 'Новый заголовок', 'ru')
      `);
      await client.query(`
        update forum_topics set current_title_revision_id = 'title-a-r2' where id = 'topic-a'
      `);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }

    const second = await createPlanner(client).planAndDispatch({
      ...requestRevision(),
      revisionId: "title-a-r2",
      originalContent: "caller value remains irrelevant",
    }, "he", budgetAdmission());

    expect(second).toMatchObject({
      kind: "queued",
      task: {
        sourceIdentity: { revisionId: "title-a-r2" },
        generation: 2,
      },
    });
    if (first.kind !== "queued" || second.kind !== "queued") {
      throw new Error("expected queued results");
    }
    expect(second.task.taskIdentity).not.toBe(first.task.taskIdentity);

    const generations = await client.query<{ revision: string; generation: number }>(`
      select metadata.revision_id as revision, task.generation
        from translation_tasks task
        join content_topic_title_translation_tasks metadata on metadata.task_id = task.id
       where task.translation_kind = 'content-topic-title'
       order by task.generation
    `);
    expect(generations.rows).toEqual([
      { revision: "title-a-r1", generation: 1 },
      { revision: "title-a-r2", generation: 2 },
    ]);
  });

  it("rechecks current revision inside the task transaction before commit", async () => {
    const store = new DrizzleContentTopicTitlePlanningStore(drizzle(client));
    const authoritative = await store.readCurrentRevision("topic-a");
    if (!authoritative) throw new Error("missing fixture revision");

    const planner = createPlanner(client);
    const planned = await planner.planAndDispatch(requestRevision(), "he", budgetAdmission());
    if (planned.kind !== "queued") throw new Error("expected queued fixture task");

    await client.query(`
      insert into forum_topic_title_revisions
        (id, topic_id, author_id, original_content, source_locale)
      values ('title-a-r2', 'topic-a', 'author-a', 'Новый заголовок', 'ru')
    `);
    await client.query(`
      update forum_topics set current_title_revision_id = 'title-a-r2' where id = 'topic-a'
    `);

    await expect(
      store.upsertPending(planned.task, authoritative, budgetAdmission()),
    ).resolves.toEqual({ outcome: "revision-changed" });

    const budget = await client.query<{ used: number }>(`
      select coalesce(sum(used_units), 0)::int as used
        from content_translation_request_budget_counters
       where scope in ('title-global@test-v1', 'title-requester@test-v1')
    `);
    // The initial planned request charged once in both scopes; the stale direct retry is free.
    expect(budget.rows[0]?.used).toBe(2);
  });

  it("leaves the committed pending task recoverable when enqueue fails", async () => {
    const failure = new Error("enqueue failed");
    const enqueuer = new FakeTranslationTaskEnqueuer(() => {
      throw failure;
    });

    await expect(
      createPlanner(client, enqueuer).planAndDispatch(requestRevision(), "he", budgetAdmission()),
    ).rejects.toBe(failure);

    const rows = await client.query<{ status: string; count: number }>(`
      select status, count(*)::int as count
        from translation_tasks
       where translation_kind = 'content-topic-title'
       group by status
    `);
    expect(rows.rows).toEqual([{ status: "pending", count: 1 }]);

    const budget = await client.query<{ used: number }>(`
      select coalesce(sum(used_units), 0)::int as used
        from content_translation_request_budget_counters
       where scope in ('title-global@test-v1', 'title-requester@test-v1')
    `);
    expect(budget.rows[0]?.used).toBe(2);
  });

  it("rolls back both budget counters when task metadata insertion fails", async () => {
    await client.query(`
      create function reject_title_task_metadata_fixture()
      returns trigger
      language plpgsql
      as $
      begin
        raise exception 'title metadata fixture failure' using errcode = 'P0001';
      end;
      $;
      create trigger reject_title_task_metadata_fixture
      before insert on content_topic_title_translation_tasks
      for each row execute function reject_title_task_metadata_fixture();
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
          "select count(*)::int as count from translation_tasks where translation_kind = 'content-topic-title'",
        ),
        client.query<{ count: number }>(
          "select count(*)::int as count from translation_task_generation_heads where translation_kind = 'content-topic-title'",
        ),
      ]);
      expect(counters.rows[0]?.count).toBe(0);
      expect(tasks.rows[0]?.count).toBe(0);
      expect(heads.rows[0]?.count).toBe(0);
    } finally {
      await client.query(
        "drop trigger if exists reject_title_task_metadata_fixture on content_topic_title_translation_tasks",
      );
      await client.query("drop function if exists reject_title_task_metadata_fixture()");
    }
  });

  it("database-enforces required revision binding and keeps UI task invariants", async () => {
    await expectDatabaseCode(client.query(`
      insert into translation_tasks (
        task_identity, translation_kind, source_namespace, source_key, source_fingerprint,
        target_locale, generation_policy_version, generation
      ) values (
        repeat('1', 64), 'content-topic-title', 'topic-title', 'topic-a', repeat('2', 64),
        'he', 'content-v1', 1
      )
    `), "23514");

    const created = await createPlanner(client).planAndDispatch(requestRevision(), "he", budgetAdmission());
    if (created.kind !== "queued") throw new Error("expected queued fixture task");

    await expectDatabaseCode(client.query(`
      update content_topic_title_translation_tasks
         set topic_id = 'topic-b'
       where task_id = '${created.task.id}'
    `), "23503");

    await client.query(`
      delete from content_topic_title_translation_tasks
       where task_id = '${created.task.id}'
    `);
    const deletedTask = await client.query<{ count: number }>(`
      select count(*)::int as count
        from translation_tasks
       where id = '${created.task.id}'
    `);
    expect(deletedTask.rows[0]?.count).toBe(0);

    await expectDatabaseCode(client.query(`
      insert into translation_tasks (
        task_identity, translation_kind, source_namespace, source_key, source_fingerprint,
        target_locale, generation_policy_version, generation
      ) values (
        repeat('5', 64), 'ui', 'common', 'example', repeat('6', 64),
        'en', 'ui-v1', 1
      )
    `), "23514");

    const uiSpecification: Omit<UiTranslationJobSpecification, "taskIdentity"> = {
      translationKind: "ui",
      sourceIdentity: { namespace: "common", key: "example" },
      sourceFingerprint: "a".repeat(64),
      targetLocale: "he",
      generationPolicyVersion: "ui-v1",
    };
    const uiTask: UiTranslationJobSpecification = {
      ...uiSpecification,
      taskIdentity: await uiTranslationJobIdentity(uiSpecification),
    };
    const stored = await new DrizzleTranslationTaskStore(drizzle(client)).upsertPending(uiTask);
    expect(stored).toMatchObject({
      translationKind: "ui",
      sourceIdentity: { namespace: "common", key: "example" },
      targetLocale: "he",
      status: "pending",
    });
  });
});

function createPlanner(
  connection: Client,
  enqueuer = new FakeTranslationTaskEnqueuer(),
): ContentTopicTitleTranslationPlanner {
  return new ContentTopicTitleTranslationPlanner({
    localeRegistry,
    sourceLocaleResolver: new ContentSourceLocaleResolver(
      {
        detect: async () => {
          throw new Error("known revision source locale must bypass detection");
        },
      },
      new ThresholdContentSourceLocalePolicy(0.8, () => true),
    ),
    contentTranslations: new ContentTranslationService(
      new DrizzleContentTranslationStore(drizzle(connection)),
    ),
    providerCapability: { supports: () => true },
    tasks: new DrizzleContentTopicTitlePlanningStore(drizzle(connection)),
    enqueuer,
    generationPolicyVersion: "content-v1",
  });
}

function budgetAdmission(
  overrides: Partial<ContentTranslationRequestBudgetAdmission> = {},
): ContentTranslationRequestBudgetAdmission {
  return {
    subjectKey: "T".repeat(CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH),
    cost: 1,
    windowSeconds: 60,
    global: { name: "title-global", version: "test-v1", limit: 100 },
    requester: { name: "title-requester", version: "test-v1", limit: 100 },
    ...overrides,
  };
}

function requestRevision() {
  return {
    contentType: "topic-title" as const,
    contentId: "topic-a",
    revisionId: "title-a-r1",
    originalContent: "caller text",
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
      values
        ('topic-a', 'section', 'author-a', 'title-a-r1'),
        ('topic-b', 'section', 'author-b', 'title-b-r1')
    `);
    await connection.query(`
      insert into forum_topic_title_revisions
        (id, topic_id, author_id, original_content, source_locale)
      values
        ('title-a-r1', 'topic-a', 'author-a', 'Исходный заголовок', 'ru'),
        ('title-b-r1', 'topic-b', 'author-b', 'Другой заголовок', 'ru')
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
