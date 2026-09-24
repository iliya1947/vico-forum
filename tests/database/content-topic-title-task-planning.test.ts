import { readFile } from "node:fs/promises";

import { drizzle } from "drizzle-orm/node-postgres";
import { Client, type DatabaseError } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  ContentSourceLocaleResolver,
  ThresholdContentSourceLocalePolicy,
} from "../../app/localization/content-source-locale";
import { ContentTranslationService } from "../../app/localization/content-translation";
import { ContentTopicTitleTranslationPlanner } from "../../app/localization/content-translation-planning";
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
  ]) {
    const sql = (await readFile(migration, "utf8"))
      .replaceAll('"public".', `"${schemaName}".`);
    await client.query(sql);
  }
});

beforeEach(async () => {
  await client.query(`
    truncate
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
    }, "en");

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

  it("serializes concurrent duplicate planning into one durable logical task", async () => {
    const second = new Client({ connectionString: databaseUrl });
    await second.connect();
    await second.query(`set search_path to ${schemaName}`);
    try {
      const firstEnqueuer = new FakeTranslationTaskEnqueuer();
      const secondEnqueuer = new FakeTranslationTaskEnqueuer();
      const [first, duplicate] = await Promise.all([
        createPlanner(client, firstEnqueuer).planAndDispatch(requestRevision(), "he"),
        createPlanner(second, secondEnqueuer).planAndDispatch(requestRevision(), "he"),
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
    } finally {
      await second.end();
    }
  });

  it("gives a new current title revision a distinct task identity and monotonic generation", async () => {
    const first = await createPlanner(client).planAndDispatch(requestRevision(), "he");
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
    }, "he");

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
    const planned = await planner.planAndDispatch(requestRevision(), "he");
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
      store.upsertPending(planned.task, authoritative),
    ).resolves.toEqual({ outcome: "revision-changed" });
  });

  it("leaves the committed pending task recoverable when enqueue fails", async () => {
    const failure = new Error("enqueue failed");
    const enqueuer = new FakeTranslationTaskEnqueuer(() => {
      throw failure;
    });

    await expect(
      createPlanner(client, enqueuer).planAndDispatch(requestRevision(), "he"),
    ).rejects.toBe(failure);

    const rows = await client.query<{ status: string; count: number }>(`
      select status, count(*)::int as count
        from translation_tasks
       where translation_kind = 'content-topic-title'
       group by status
    `);
    expect(rows.rows).toEqual([{ status: "pending", count: 1 }]);
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

    const created = await createPlanner(client).planAndDispatch(requestRevision(), "he");
    if (created.kind !== "queued") throw new Error("expected queued fixture task");

    await expectDatabaseCode(client.query(`
      update content_topic_title_translation_tasks
         set topic_id = 'topic-b'
       where task_id = '${created.task.id}'
    `), "23503");

    await expectDatabaseCode(client.query(`
      delete from content_topic_title_translation_tasks
       where task_id = '${created.task.id}'
    `), "23514");

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
    targetPolicy: { supports: () => true },
    requestBudgetPolicy: { allows: () => true },
    tasks: new DrizzleContentTopicTitlePlanningStore(drizzle(connection)),
    enqueuer,
    generationPolicyVersion: "content-v1",
  });
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
