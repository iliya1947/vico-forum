import { readFile } from "node:fs/promises";

import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createHyperdriveContentGenerationStatusReader,
} from "../../db/hyperdrive-content-generation-status";

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
      content_topic_title_translation_tasks,
      content_post_body_translation_tasks,
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
  await seedForum();
});

afterAll(async () => {
  await setup.query("set search_path to public");
  await setup.query(`drop schema if exists ${schemaName} cascade`);
  await setup.end();
});

describe("content generation status PostgreSQL adapter", () => {
  it("reads exact current title/post state in one page batch", async () => {
    await insertTask({
      id: "11111111-1111-4111-8111-111111111111",
      kind: "content-topic-title",
      namespace: "topic-title",
      key: "topic-a",
      revisionId: "title-a-r1",
      generation: 1,
      status: "pending",
    });
    await insertTask({
      id: "22222222-2222-4222-8222-222222222222",
      kind: "content-post-body",
      namespace: "post-body",
      key: "post-a",
      revisionId: "post-a-r1",
      generation: 1,
      status: "failed",
    });

    const result = await reader().readCurrent([
      {
        contentType: "topic-title",
        contentId: "topic-a",
        revisionId: "title-a-r1",
        targetLocale: "he",
      },
      {
        contentType: "post-body",
        contentId: "post-a",
        revisionId: "post-a-r1",
        targetLocale: "he",
      },
    ]);

    expect(result).toEqual([
      expect.objectContaining({ contentId: "topic-a", state: "pending" }),
      expect.objectContaining({ contentId: "post-a", state: "failed" }),
    ]);
  });

  it("ignores sibling revision and superseded generation tasks", async () => {
    await setup.query(`
      insert into forum_topic_title_revisions
        (id, topic_id, author_id, original_content, source_locale)
      values ('title-a-r2', 'topic-a', 'author-a', 'Новая тема', 'ru')
    `);

    await insertTask({
      id: "33333333-3333-4333-8333-333333333333",
      kind: "content-topic-title",
      namespace: "topic-title",
      key: "topic-a",
      revisionId: "title-a-r1",
      generation: 1,
      status: "failed",
      currentGeneration: false,
    });
    await insertTask({
      id: "44444444-4444-4444-8444-444444444444",
      kind: "content-topic-title",
      namespace: "topic-title",
      key: "topic-a",
      revisionId: "title-a-r2",
      generation: 2,
      status: "pending",
      createHead: false,
    });
    await setup.query(`
      update translation_task_generation_heads
         set current_generation = 2
       where translation_kind = 'content-topic-title'
         and source_namespace = 'topic-title'
         and source_key = 'topic-a'
         and target_locale = 'he'
    `);

    await expect(reader().readCurrent([{
      contentType: "topic-title",
      contentId: "topic-a",
      revisionId: "title-a-r1",
      targetLocale: "he",
    }])).resolves.toEqual([
      expect.objectContaining({ state: "idle", revisionId: "title-a-r1" }),
    ]);
  });

  it("collapses durable allowance deferral to bounded retry metadata", async () => {
    await insertTask({
      id: "55555555-5555-4555-8555-555555555555",
      kind: "content-post-body",
      namespace: "post-body",
      key: "post-a",
      revisionId: "post-a-r1",
      generation: 1,
      status: "pending",
      deferred: true,
    });

    const [result] = await reader().readCurrent([{
      contentType: "post-body",
      contentId: "post-a",
      revisionId: "post-a-r1",
      targetLocale: "he",
    }]);

    expect(result).toMatchObject({ state: "deferred" });
    expect(result?.retryAfterSeconds).toBeGreaterThan(0);
    expect(result?.retryAfterSeconds).toBeLessThanOrEqual(86_400);
    expect(JSON.stringify(result)).not.toContain("allowance");
    expect(JSON.stringify(result)).not.toContain("55555555");
  });
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

async function insertTask(input: {
  id: string;
  kind: "content-topic-title" | "content-post-body";
  namespace: "topic-title" | "post-body";
  key: string;
  revisionId: string;
  generation: number;
  status: "pending" | "failed";
  currentGeneration?: boolean;
  createHead?: boolean;
  deferred?: boolean;
}) {
  const createHead = input.createHead ?? true;
  if (createHead) {
    await setup.query(`
      insert into translation_task_generation_heads (
        translation_kind, source_namespace, source_key, target_locale, current_generation
      ) values ($1, $2, $3, 'he', $4)
    `, [input.kind, input.namespace, input.key, input.generation]);
  }

  await setup.query(`
    insert into translation_tasks (
      id,
      task_identity,
      translation_kind,
      source_namespace,
      source_key,
      source_fingerprint,
      target_locale,
      generation_policy_version,
      generation,
      status,
      attempt_count,
      max_attempts,
      last_failure_code,
      failure_disposition,
      claimed_at,
      failed_at,
      allowance_state,
      allowance_generation,
      allowance_attempt,
      allowance_retry_not_before,
      allowance_reason,
      allowance_updated_at
    ) values (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      'he',
      'content-v1',
      $7,
      $8,
      $9,
      3,
      $10,
      $11,
      $12,
      $13,
      $14,
      $15,
      $16,
      $17,
      $18,
      $19
    )
  `, [
    input.id,
    input.id.replaceAll("-", "").padEnd(64, "a").slice(0, 64),
    input.kind,
    input.namespace,
    input.key,
    input.id.replaceAll("-", "").padEnd(64, "b").slice(0, 64),
    input.generation,
    input.status,
    input.status === "failed" ? 1 : 0,
    input.status === "failed" ? "provider-output-invalid" : null,
    input.status === "failed" ? "terminal" : null,
    input.status === "failed" ? new Date(Date.now() - 2_000) : null,
    input.status === "failed" ? new Date(Date.now() - 1_000) : null,
    input.deferred ? "deferred" : null,
    input.deferred ? input.generation : null,
    input.deferred ? 1 : null,
    input.deferred ? new Date(Date.now() + 60_000) : null,
    input.deferred ? "provider-busy" : null,
    input.deferred ? new Date() : null,
  ]);

  if (input.kind === "content-topic-title") {
    await setup.query(`
      insert into content_topic_title_translation_tasks (
        task_id, translation_kind, source_namespace, topic_id, revision_id,
        revision_source_locale, resolved_source_locale, source_resolution_origin
      ) values ($1, 'content-topic-title', 'topic-title', $2, $3, 'ru', 'ru', 'revision-metadata')
    `, [input.id, input.key, input.revisionId]);
  } else {
    await setup.query(`
      insert into content_post_body_translation_tasks (
        task_id, translation_kind, source_namespace, post_id, revision_id,
        revision_source_locale, resolved_source_locale, source_resolution_origin,
        protected_content_policy_version
      ) values ($1, 'content-post-body', 'post-body', $2, $3, 'ru', 'ru', 'revision-metadata', 'cnt04-commonmark-v1')
    `, [input.id, input.key, input.revisionId]);
  }
}

async function seedForum() {
  await setup.query(`
    insert into "user" (id, name, email, email_verified, created_at, updated_at)
    values ('author-a', 'Author A', 'author-a@example.test', true, now(), now());
    insert into forum_categories (id, name) values ('category', 'Category');
    insert into forum_sections (id, category_id, name) values ('section', 'category', 'Section');
  `);

  await setup.query("begin");
  try {
    await setup.query(`
      insert into forum_topics (id, section_id, author_id, current_title_revision_id)
      values ('topic-a', 'section', 'author-a', 'title-a-r1');
      insert into forum_topic_title_revisions
        (id, topic_id, author_id, original_content, source_locale)
      values ('title-a-r1', 'topic-a', 'author-a', 'Тема', 'ru');
      insert into forum_posts (id, topic_id, author_id, current_revision_id)
      values ('post-a', 'topic-a', 'author-a', 'post-a-r1');
      insert into forum_post_revisions
        (id, post_id, author_id, original_content, source_locale)
      values ('post-a-r1', 'post-a', 'author-a', 'Сообщение', 'ru');
    `);
    await setup.query("commit");
  } catch (error) {
    await setup.query("rollback");
    throw error;
  }
}
