import { readFile } from "node:fs/promises";

import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  contentTranslationAllowanceOccurrenceKey,
} from "../../app/localization/content-translation-allowance";
import {
  contentTopicTitleTaskSpecification,
} from "../../app/localization/content-translation-planning";
import {
  DrizzleContentTranslationAllowanceStore,
} from "../../db/content-translation-allowance-store";
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

const client = new Client({ connectionString: databaseUrl });
const schemaName = "content_allowance_admission_test";

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
    "drizzle/0019_content_translation_allowance_admission.sql",
  ]) {
    const sql = (await readFile(migration, "utf8"))
      .replaceAll('"public".', `"${schemaName}".`);
    await client.query(sql);
  }
});

beforeEach(async () => {
  await client.query(`
    truncate
      content_translation_allowance_admissions,
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
  await seedForumGraph();
});

afterAll(async () => {
  await client.query("set search_path to public");
  await client.query(`drop schema if exists ${schemaName} cascade`);
  await client.end();
});

describe("content provider allowance PostgreSQL lifecycle", () => {
  it("serializes duplicate admission leases and reuses the same occurrence after lease expiry", async () => {
    const task = await insertTitleTask();
    const firstStore = new DrizzleContentTranslationAllowanceStore(drizzle(client));
    const second = await secondClient();
    try {
      const secondStore = new DrizzleContentTranslationAllowanceStore(drizzle(second));
      const [first, duplicate] = await Promise.all([
        firstStore.acquire(task.id, "content-topic-title", 60_000),
        secondStore.acquire(task.id, "content-topic-title", 60_000),
      ]);

      const leased = [first, duplicate].find((result) => result.outcome === "leased");
      const blocked = [first, duplicate].find((result) => result.outcome === "admission-in-progress");
      expect(leased?.outcome).toBe("leased");
      expect(blocked?.outcome).toBe("admission-in-progress");
      if (!leased || leased.outcome !== "leased") throw new Error("missing allowance lease");

      const firstKey = await contentTranslationAllowanceOccurrenceKey(leased.lease);
      await client.query(`
        update content_translation_allowance_admissions
           set lease_expires_at = statement_timestamp() - interval '1 second'
         where task_id = $1
      `, [task.id]);

      const recovered = await secondStore.acquire(task.id, "content-topic-title", 60_000);
      expect(recovered.outcome).toBe("leased");
      if (recovered.outcome !== "leased") throw new Error("allowance lease was not recovered");
      await expect(contentTranslationAllowanceOccurrenceKey(recovered.lease)).resolves.toBe(firstKey);
      expect(recovered.lease.claimToken).not.toBe(leased.lease.claimToken);

      const taskRow = await client.query<{ attempt_count: number }>(
        "select attempt_count from translation_tasks where id = $1",
        [task.id],
      );
      expect(taskRow.rows[0]?.attempt_count).toBe(0);
    } finally {
      await second.end();
    }
  });

  it("persists deferral without consuming JOB-04 attempts and becomes recoverable after reset", async () => {
    const task = await insertTitleTask();
    const store = new DrizzleContentTranslationAllowanceStore(drizzle(client));
    const acquired = await store.acquire(task.id, "content-topic-title", 60_000);
    if (acquired.outcome !== "leased") throw new Error("missing allowance lease");

    const retryNotBefore = new Date(Date.now() + 60_000);
    await expect(store.defer(
      acquired.lease,
      retryNotBefore,
      "free-allowance-reset",
    )).resolves.toEqual(retryNotBefore);

    await expect(store.acquire(task.id, "content-topic-title", 60_000)).resolves.toMatchObject({
      outcome: "deferred",
      reason: "free-allowance-reset",
    });

    const beforeReset = await client.query<{ attempt_count: number }>(
      "select attempt_count from translation_tasks where id = $1",
      [task.id],
    );
    expect(beforeReset.rows[0]?.attempt_count).toBe(0);

    await client.query(`
      update content_translation_allowance_admissions
         set retry_not_before = statement_timestamp() - interval '1 second'
       where task_id = $1
    `, [task.id]);

    await expect(store.acquire(task.id, "content-topic-title", 60_000)).resolves.toMatchObject({
      outcome: "leased",
      lease: { generation: 1, attemptNumber: 1 },
    });
  });

  it("requires durable admission before claim and consumes it exactly once", async () => {
    const task = await insertTitleTask();
    const allowance = new DrizzleContentTranslationAllowanceStore(drizzle(client));
    const tasks = new DrizzleTranslationTaskStore(drizzle(client));

    await expect(tasks.claimContentTopicTitle(task.id, 60_000)).resolves.toEqual({
      outcome: "already-claimed",
    });

    const acquired = await allowance.acquire(task.id, "content-topic-title", 60_000);
    if (acquired.outcome !== "leased") throw new Error("missing allowance lease");
    expect(await allowance.admit(acquired.lease, "fake-reservation")).toBe(true);

    const claimed = await tasks.claimContentTopicTitle(task.id, 60_000);
    expect(claimed).toMatchObject({
      outcome: "claimed",
      attemptStarted: true,
      task: { attemptCount: 1, status: "processing" },
    });

    const marker = await client.query<{ count: number }>(
      "select count(*)::int as count from content_translation_allowance_admissions where task_id = $1",
      [task.id],
    );
    expect(marker.rows[0]?.count).toBe(0);
  });

  it("invalidates an old admitted occurrence when generation advances", async () => {
    const task = await insertTitleTask();
    const allowance = new DrizzleContentTranslationAllowanceStore(drizzle(client));
    const acquired = await allowance.acquire(task.id, "content-topic-title", 60_000);
    if (acquired.outcome !== "leased") throw new Error("missing allowance lease");
    expect(await allowance.admit(acquired.lease)).toBe(true);

    await client.query(`
      update translation_task_generation_heads
         set current_generation = 2
       where translation_kind = 'content-topic-title'
         and source_namespace = 'topic-title'
         and source_key = 'topic-a'
         and target_locale = 'he'
    `);

    await expect(allowance.acquire(task.id, "content-topic-title", 60_000)).resolves.toEqual({
      outcome: "terminal",
    });
    const marker = await client.query<{ count: number }>(
      "select count(*)::int as count from content_translation_allowance_admissions where task_id = $1",
      [task.id],
    );
    expect(marker.rows[0]?.count).toBe(0);
  });
});

async function insertTitleTask() {
  const revision = {
    contentType: "topic-title" as const,
    contentId: "topic-a",
    revisionId: "title-a-r1",
    originalContent: "Исходный заголовок",
    sourceLocale: "ru",
  };
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
  const taskId = crypto.randomUUID();

  await client.query(`
    insert into translation_task_generation_heads
      (translation_kind, source_namespace, source_key, target_locale, current_generation)
    values ('content-topic-title', 'topic-title', 'topic-a', 'he', 1)
  `);
  await client.query(`
    insert into translation_tasks
      (id, task_identity, translation_kind, source_namespace, source_key,
       source_fingerprint, target_locale, generation_policy_version, generation,
       status, attempt_count, max_attempts)
    values ($1, $2, 'content-topic-title', 'topic-title', 'topic-a',
            $3, 'he', 'content-v1', 1, 'pending', 0, 3)
  `, [taskId, specification.taskIdentity, specification.sourceFingerprint]);
  await client.query(`
    insert into content_topic_title_translation_tasks
      (task_id, translation_kind, source_namespace, topic_id, revision_id,
       revision_source_locale, resolved_source_locale, source_resolution_origin)
    values ($1, 'content-topic-title', 'topic-title', 'topic-a', 'title-a-r1',
            'ru', 'ru', 'revision-metadata')
  `, [taskId]);

  return { id: taskId };
}

async function seedForumGraph(): Promise<void> {
  await client.query(`
    insert into "user" (id, name, email, email_verified, created_at, updated_at)
    values ('author-a', 'Author A', 'author-a@example.test', true, now(), now());
    insert into forum_categories (id, name) values ('category', 'Category');
    insert into forum_sections (id, category_id, name) values ('section', 'category', 'Section');
  `);
  await client.query("begin");
  try {
    await client.query(`
      insert into forum_topics (id, section_id, author_id, current_title_revision_id)
      values ('topic-a', 'section', 'author-a', 'title-a-r1')
    `);
    await client.query(`
      insert into forum_topic_title_revisions
        (id, topic_id, author_id, original_content, source_locale)
      values ('title-a-r1', 'topic-a', 'author-a', 'Исходный заголовок', 'ru')
    `);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function secondClient(): Promise<Client> {
  const second = new Client({ connectionString: databaseUrl });
  await second.connect();
  await second.query(`set search_path to ${schemaName}`);
  return second;
}
