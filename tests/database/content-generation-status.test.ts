import { readFile } from "node:fs/promises";

import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createHyperdriveContentGenerationStatusReader } from "../../db/hyperdrive-content-generation-status";

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
const setup = new Client({ connectionString: databaseUrl });

beforeAll(async () => {
  await setup.connect();
  await setup.query(`drop schema if exists ${schemaName} cascade; create schema ${schemaName}`);
  await setup.query(`set search_path to ${schemaName}`);

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
    "drizzle/0019_content_provider_allowance_admission.sql",
  ]) {
    const sql = (await readFile(migration, "utf8"))
      .replaceAll('"public".', `"${schemaName}".`);
    await setup.query(sql);
  }
});

beforeEach(async () => {
  await setup.query(`
    truncate
      content_post_body_translation_tasks,
      content_topic_title_translation_tasks,
      translation_tasks,
      translation_task_generation_heads,
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
  await setup.query("set search_path to public");
  await setup.query(`drop schema if exists ${schemaName} cascade`);
  await setup.end();
});

function reader() {
  return createHyperdriveContentGenerationStatusReader(
    databaseUrl!,
    () => new Client({
      connectionString: databaseUrl,
      options: `-c search_path=${schemaName}`,
    }),
  );
}

describe("content generation status PostgreSQL adapter", () => {
  it("reads current title and post state in one bounded batch", async () => {
    await insertTask({
      id: "11111111-1111-4111-8111-111111111111",
      kind: "content-topic-title",
      namespace: "topic-title",
      key: "topic-a",
      target: "he",
      generation: 1,
      revision: "title-a-r1",
      metadataTable: "content_topic_title_translation_tasks",
      metadataOwnerColumn: "topic_id",
      owner: "topic-a",
    });
    await insertTask({
      id: "22222222-2222-4222-8222-222222222222",
      kind: "content-post-body",
      namespace: "post-body",
      key: "post-a",
      target: "he",
      generation: 1,
      revision: "post-a-r1",
      metadataTable: "content_post_body_translation_tasks",
      metadataOwnerColumn: "post_id",
      owner: "post-a",
    });
    await setup.query(`
      update translation_tasks
         set status = 'processing',
             attempt_count = 1,
             claim_token = '33333333-3333-4333-8333-333333333333',
             claimed_at = statement_timestamp(),
             lease_expires_at = statement_timestamp() + interval '1 minute',
             updated_at = statement_timestamp()
       where id = '22222222-2222-4222-8222-222222222222'
    `);

    await expect(reader().readCurrent([
      { contentType: "topic-title", contentId: "topic-a", revisionId: "title-a-r1" },
      { contentType: "post-body", contentId: "post-a", revisionId: "post-a-r1" },
    ], "he")).resolves.toEqual([
      {
        contentType: "topic-title",
        contentId: "topic-a",
        revisionId: "title-a-r1",
        state: "pending",
      },
      {
        contentType: "post-body",
        contentId: "post-a",
        revisionId: "post-a-r1",
        state: "processing",
      },
    ]);
  });

  it("ignores superseded sibling revisions and different target locales", async () => {
    await insertTask({
      id: "44444444-4444-4444-8444-444444444444",
      kind: "content-topic-title",
      namespace: "topic-title",
      key: "topic-a",
      target: "he",
      generation: 1,
      revision: "title-a-r1",
      metadataTable: "content_topic_title_translation_tasks",
      metadataOwnerColumn: "topic_id",
      owner: "topic-a",
    });
    await setup.query(`
      insert into forum_topic_title_revisions
        (id, topic_id, author_id, original_content, source_locale)
      values ('title-a-r2', 'topic-a', 'author-a', 'Новая тема', 'ru')
    `);
    await setup.query(`
      update forum_topics set current_title_revision_id = 'title-a-r2' where id = 'topic-a'
    `);

    await expect(reader().readCurrent([
      { contentType: "topic-title", contentId: "topic-a", revisionId: "title-a-r2" },
    ], "he")).resolves.toEqual([
      {
        contentType: "topic-title",
        contentId: "topic-a",
        revisionId: "title-a-r2",
        state: "idle",
      },
    ]);

    await expect(reader().readCurrent([
      { contentType: "topic-title", contentId: "topic-a", revisionId: "title-a-r1" },
    ], "fr")).resolves.toEqual([
      {
        contentType: "topic-title",
        contentId: "topic-a",
        revisionId: "title-a-r1",
        state: "idle",
      },
    ]);
  });
});

async function insertTask(input: {
  id: string;
  kind: "content-topic-title" | "content-post-body";
  namespace: "topic-title" | "post-body";
  key: string;
  target: string;
  generation: number;
  revision: string;
  metadataTable: "content_topic_title_translation_tasks" | "content_post_body_translation_tasks";
  metadataOwnerColumn: "topic_id" | "post_id";
  owner: string;
}) {
  await setup.query("begin");
  try {
    await setup.query(`
      insert into translation_task_generation_heads
        (translation_kind, source_namespace, source_key, target_locale, current_generation)
      values ($1, $2, $3, $4, $5)
    `, [input.kind, input.namespace, input.key, input.target, input.generation]);
    await setup.query(`
      insert into translation_tasks
        (id, task_identity, translation_kind, source_namespace, source_key, source_fingerprint,
         target_locale, generation_policy_version, generation)
      values ($1, $2, $3, $4, $5, $6, $7, 'content-v1', $8)
    `, [
      input.id,
      input.id.replaceAll("-", "").padEnd(64, "a").slice(0, 64),
      input.kind,
      input.namespace,
      input.key,
      "b".repeat(64),
      input.target,
      input.generation,
    ]);

    if (input.kind === "content-topic-title") {
      await setup.query(`
        insert into content_topic_title_translation_tasks
          (task_id, translation_kind, source_namespace, topic_id, revision_id,
           revision_source_locale, resolved_source_locale, source_resolution_origin)
        values ($1, 'content-topic-title', 'topic-title', $2, $3, 'ru', 'ru', 'revision-metadata')
      `, [input.id, input.owner, input.revision]);
    } else {
      await setup.query(`
        insert into content_post_body_translation_tasks
          (task_id, translation_kind, source_namespace, post_id, revision_id,
           revision_source_locale, resolved_source_locale, source_resolution_origin,
           protected_content_policy_version)
        values ($1, 'content-post-body', 'post-body', $2, $3, 'ru', 'ru', 'revision-metadata',
                'cnt04-commonmark-v1')
      `, [input.id, input.owner, input.revision]);
    }
    await setup.query("commit");
  } catch (error) {
    await setup.query("rollback");
    throw error;
  }
}

async function seedForumGraph() {
  await setup.query(`
    insert into "user" (id, name, email, email_verified, created_at, updated_at)
    values ('author-a', 'Author', 'author@example.test', true, now(), now());
    insert into forum_categories (id, name) values ('category', 'Category');
    insert into forum_sections (id, category_id, name) values ('section', 'category', 'Section');
  `);
  await setup.query("begin");
  try {
    await setup.query(`
      insert into forum_topics (id, section_id, author_id, current_title_revision_id)
      values ('topic-a', 'section', 'author-a', 'title-a-r1')
    `);
    await setup.query(`
      insert into forum_topic_title_revisions
        (id, topic_id, author_id, original_content, source_locale)
      values ('title-a-r1', 'topic-a', 'author-a', 'Тема', 'ru')
    `);
    await setup.query(`
      insert into forum_posts (id, topic_id, author_id, current_revision_id)
      values ('post-a', 'topic-a', 'author-a', 'post-a-r1')
    `);
    await setup.query(`
      insert into forum_post_revisions
        (id, post_id, author_id, original_content, source_locale)
      values ('post-a-r1', 'post-a', 'author-a', 'Ответ', 'ru')
    `);
    await setup.query("commit");
  } catch (error) {
    await setup.query("rollback");
    throw error;
  }
}
