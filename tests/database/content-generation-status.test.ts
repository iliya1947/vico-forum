import { readFile } from "node:fs/promises";

import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { DrizzleContentGenerationStatusReader } from "../../db/content-generation-status-store";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for the disposable database integration test");

const parsedDatabaseUrl = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost"].includes(parsedDatabaseUrl.hostname)
  || !parsedDatabaseUrl.pathname.endsWith("_test")
) {
  throw new Error("Database integration tests only run against a local database ending in _test");
}

const schemaName = "content_generation_status_test";
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

describe("content generation status PostgreSQL read model", () => {
  it("reads exact current-generation title and post states in one batch and ignores sibling revisions", async () => {
    await client.query(`
      insert into translation_task_generation_heads
        (translation_kind, source_namespace, source_key, target_locale, current_generation)
      values
        ('content-topic-title', 'topic-title', 'topic-a', 'he', 1),
        ('content-post-body', 'post-body', 'post-a', 'he', 2)
    `);

    const titleTask = await insertTask({
      identity: "a".repeat(64),
      kind: "content-topic-title",
      namespace: "topic-title",
      sourceKey: "topic-a",
      targetLocale: "he",
      generation: 1,
    });
    await client.query(`
      insert into content_topic_title_translation_tasks
        (task_id, translation_kind, source_namespace, topic_id, revision_id,
         revision_source_locale, resolved_source_locale, source_resolution_origin)
      values ($1, 'content-topic-title', 'topic-title', 'topic-a', 'title-a-r1',
              'ru', 'ru', 'revision-metadata')
    `, [titleTask]);

    const oldPostTask = await insertTask({
      identity: "b".repeat(64),
      kind: "content-post-body",
      namespace: "post-body",
      sourceKey: "post-a",
      targetLocale: "he",
      generation: 1,
    });
    await client.query(`
      insert into content_post_body_translation_tasks
        (task_id, translation_kind, source_namespace, post_id, revision_id,
         revision_source_locale, resolved_source_locale, source_resolution_origin,
         protected_content_policy_version)
      values ($1, 'content-post-body', 'post-body', 'post-a', 'post-a-r0',
              'ru', 'ru', 'revision-metadata', 'cnt04-commonmark-v1')
    `, [oldPostTask]);

    const currentPostTask = await insertTask({
      identity: "c".repeat(64),
      kind: "content-post-body",
      namespace: "post-body",
      sourceKey: "post-a",
      targetLocale: "he",
      generation: 2,
    });
    await client.query(`
      insert into content_post_body_translation_tasks
        (task_id, translation_kind, source_namespace, post_id, revision_id,
         revision_source_locale, resolved_source_locale, source_resolution_origin,
         protected_content_policy_version)
      values ($1, 'content-post-body', 'post-body', 'post-a', 'post-a-r1',
              'ru', 'ru', 'revision-metadata', 'cnt04-commonmark-v1')
    `, [currentPostTask]);

    const reader = new DrizzleContentGenerationStatusReader(drizzle(client));
    await expect(reader.readCurrent([
      {
        contentType: "topic-title",
        contentId: "topic-a",
        revisionId: "title-a-r1",
        originalContent: "Тема",
        sourceLocale: "ru",
      },
      {
        contentType: "post-body",
        contentId: "post-a",
        revisionId: "post-a-r1",
        originalContent: "Текущий текст",
        sourceLocale: "ru",
      },
    ], "he")).resolves.toEqual([
      {
        contentType: "topic-title",
        contentId: "topic-a",
        revisionId: "title-a-r1",
        targetLocale: "he",
        status: "pending",
      },
      {
        contentType: "post-body",
        contentId: "post-a",
        revisionId: "post-a-r1",
        targetLocale: "he",
        status: "pending",
      },
    ]);
  });

  it("returns idle when the current-generation task belongs to a sibling revision", async () => {
    await client.query(`
      insert into translation_task_generation_heads
        (translation_kind, source_namespace, source_key, target_locale, current_generation)
      values ('content-post-body', 'post-body', 'post-a', 'he', 1)
    `);
    const taskId = await insertTask({
      identity: "d".repeat(64),
      kind: "content-post-body",
      namespace: "post-body",
      sourceKey: "post-a",
      targetLocale: "he",
      generation: 1,
    });
    await client.query(`
      insert into content_post_body_translation_tasks
        (task_id, translation_kind, source_namespace, post_id, revision_id,
         revision_source_locale, resolved_source_locale, source_resolution_origin,
         protected_content_policy_version)
      values ($1, 'content-post-body', 'post-body', 'post-a', 'post-a-r0',
              'ru', 'ru', 'revision-metadata', 'cnt04-commonmark-v1')
    `, [taskId]);

    const reader = new DrizzleContentGenerationStatusReader(drizzle(client));
    await expect(reader.readCurrent([{
      contentType: "post-body",
      contentId: "post-a",
      revisionId: "post-a-r1",
      originalContent: "Текущий текст",
      sourceLocale: "ru",
    }], "he")).resolves.toEqual([{
      contentType: "post-body",
      contentId: "post-a",
      revisionId: "post-a-r1",
      targetLocale: "he",
      status: "idle",
    }]);
  });
});

async function insertTask(input: {
  identity: string;
  kind: "content-topic-title" | "content-post-body";
  namespace: "topic-title" | "post-body";
  sourceKey: string;
  targetLocale: string;
  generation: number;
}): Promise<string> {
  const rows = await client.query<{ id: string }>(`
    insert into translation_tasks
      (task_identity, translation_kind, source_namespace, source_key,
       source_fingerprint, target_locale, generation_policy_version, generation)
    values ($1, $2, $3, $4, $5, $6, 'content-v1', $7)
    returning id
  `, [
    input.identity,
    input.kind,
    input.namespace,
    input.sourceKey,
    input.identity,
    input.targetLocale,
    input.generation,
  ]);
  const id = rows.rows[0]?.id;
  if (!id) throw new Error("translation task fixture insert returned no id");
  return id;
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
      values ('topic-a', 'section', 'author-a', 'title-a-r1');

      insert into forum_topic_title_revisions
        (id, topic_id, author_id, original_content, source_locale)
      values ('title-a-r1', 'topic-a', 'author-a', 'Тема', 'ru');

      insert into forum_posts (id, topic_id, author_id, current_revision_id)
      values ('post-a', 'topic-a', 'author-a', 'post-a-r1');

      insert into forum_post_revisions
        (id, post_id, author_id, original_content, source_locale)
      values
        ('post-a-r0', 'post-a', 'author-a', 'Старый текст', 'ru'),
        ('post-a-r1', 'post-a', 'author-a', 'Текущий текст', 'ru');
    `);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}
