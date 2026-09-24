import { readFile } from "node:fs/promises";

import { drizzle } from "drizzle-orm/node-postgres";
import { Client, type DatabaseError } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  ContentTranslationService,
  ContentTranslationOwnershipError,
  type ContentTranslationRevision,
  type ContentTranslationWriteInput,
} from "../../app/localization/content-translation";
import { DrizzleContentTranslationStore } from "../../db/content-translation-store";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for the disposable database integration test");

const parsedDatabaseUrl = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost"].includes(parsedDatabaseUrl.hostname)
  || !parsedDatabaseUrl.pathname.endsWith("_test")
) {
  throw new Error("Database integration tests only run against a local database ending in _test");
}

const schemaName = "content_translation_test";
const client = new Client({ connectionString: databaseUrl });

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schemaName} cascade; create schema ${schemaName}`);
  await client.query(`set search_path to ${schemaName}`);

  for (const migration of [
    "drizzle/0003_gorgeous_donald_blake.sql",
    "drizzle/0004_forum_domain_foundation.sql",
    "drizzle/0005_calm_proemial_gods.sql",
    "drizzle/0014_content_translation_persistence.sql",
  ]) {
    const sql = (await readFile(migration, "utf8"))
      .replaceAll('"public".', `"${schemaName}".`);
    await client.query(sql);
  }
});

beforeEach(async () => {
  await client.query(`
    truncate
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

describe("DrizzleContentTranslationStore", () => {
  it("persists and reads topic-title and post-body translations with truthful provenance", async () => {
    const service = new ContentTranslationService(new DrizzleContentTranslationStore(drizzle(client)));

    const title = await service.write(machineWrite(titleRevision(), "fr", "Titre traduit"));
    const body = await service.write({
      revision: postRevision(),
      targetLocale: "de",
      translatedContent: "Übersetzter Text",
      provenance: { origin: "persistent_manual", attribution: "reviewed by moderator" },
    });

    expect(title).toMatchObject({
      contentType: "topic-title",
      contentId: "topic-a",
      revisionId: "title-a-r1",
      sourceLocale: "en",
      targetLocale: "fr",
      translatedContent: "Titre traduit",
      provenance: {
        origin: "machine",
        provider: "cloudflare-workers-ai",
        model: "@cf/meta/m2m100-1.2b",
      },
    });
    expect(body).toMatchObject({
      contentType: "post-body",
      contentId: "post-a",
      revisionId: "body-a-r1",
      sourceLocale: "ru",
      targetLocale: "de",
      provenance: {
        origin: "persistent_manual",
        attribution: "reviewed by moderator",
      },
    });

    await expect(service.readCurrent(titleRevision(), "fr")).resolves.toMatchObject({
      selected: "translation",
      content: "Titre traduit",
      contentLocale: "fr",
    });
    await expect(service.readCurrent(postRevision(), "de")).resolves.toMatchObject({
      selected: "translation",
      content: "Übersetzter Text",
      contentLocale: "de",
    });
  });

  it("isolates translations by exact revision and never serves an old revision for a new current revision", async () => {
    const service = new ContentTranslationService(new DrizzleContentTranslationStore(drizzle(client)));
    await service.write(machineWrite(titleRevision(), "fr", "Ancien titre"));

    await client.query("begin");
    try {
      await client.query(`
        insert into forum_topic_title_revisions
          (id, topic_id, author_id, original_content, source_locale)
        values ('title-a-r2', 'topic-a', 'author-a', 'Current title', 'en')
      `);
      await client.query(`
        update forum_topics set current_title_revision_id = 'title-a-r2' where id = 'topic-a'
      `);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }

    const current = titleRevision({
      revisionId: "title-a-r2",
      originalContent: "Current title",
    });
    await expect(service.readCurrent(current, "fr")).resolves.toEqual({
      selected: "original",
      content: "Current title",
      contentLocale: "en",
      reason: "missing",
      translation: null,
    });
    await expect(service.readCurrent(titleRevision(), "fr")).resolves.toMatchObject({
      selected: "translation",
      content: "Ancien titre",
    });
  });

  it("rejects wrong-owner identities in the store and at the database foreign-key boundary", async () => {
    const store = new DrizzleContentTranslationStore(drizzle(client));

    await expect(store.write({
      contentType: "topic-title",
      contentId: "topic-b",
      revisionId: "title-a-r1",
      sourceLocale: "en",
      targetLocale: "fr",
      translatedContent: "Wrong owner",
      provenance: {
        origin: "machine",
        provider: "provider",
        model: "model",
      },
    })).rejects.toBeInstanceOf(ContentTranslationOwnershipError);

    await expectDatabaseCode(client.query(`
      insert into forum_topic_title_translations
        (topic_id, revision_id, source_locale, target_locale, translated_content, origin, provider, provider_model)
      values ('topic-b', 'title-a-r1', 'en', 'fr', 'Wrong owner', 'machine', 'provider', 'model')
    `), "23503");

    await expectDatabaseCode(client.query(`
      insert into forum_post_body_translations
        (post_id, revision_id, source_locale, target_locale, translated_content, origin, provider, provider_model)
      values ('post-b', 'body-a-r1', 'ru', 'fr', 'Wrong owner', 'machine', 'provider', 'model')
    `), "23503");
  });

  it("enforces non-und target locale and known source/target distinction in PostgreSQL", async () => {
    await expectDatabaseCode(client.query(`
      insert into forum_topic_title_translations
        (topic_id, revision_id, source_locale, target_locale, translated_content, origin, provider, provider_model)
      values ('topic-a', 'title-a-r1', 'en', 'und', 'Invalid', 'machine', 'provider', 'model')
    `), "23514");

    await expectDatabaseCode(client.query(`
      insert into forum_topic_title_translations
        (topic_id, revision_id, source_locale, target_locale, translated_content, origin, provider, provider_model)
      values ('topic-a', 'title-a-r1', 'en', 'EN', 'Invalid', 'machine', 'provider', 'model')
    `), "23514");
  });

  it("is idempotent under concurrent duplicate writes and preserves higher-trust manual content", async () => {
    const second = new Client({ connectionString: databaseUrl });
    await second.connect();
    await second.query(`set search_path to ${schemaName}`);
    try {
      const firstService = new ContentTranslationService(new DrizzleContentTranslationStore(drizzle(client)));
      const secondService = new ContentTranslationService(new DrizzleContentTranslationStore(drizzle(second)));
      const write = machineWrite(titleRevision(), "fr", "Titre stable");

      const results = await Promise.all([
        firstService.write(write),
        secondService.write(write),
      ]);
      expect(results).toEqual([expect.objectContaining({ translatedContent: "Titre stable" }),
        expect.objectContaining({ translatedContent: "Titre stable" })]);

      const count = await client.query<{ count: number }>(`
        select count(*)::int as count
          from forum_topic_title_translations
         where topic_id = 'topic-a' and revision_id = 'title-a-r1' and target_locale = 'fr'
      `);
      expect(count.rows[0]?.count).toBe(1);

      await firstService.write({
        revision: titleRevision(),
        targetLocale: "fr",
        translatedContent: "Titre manuel",
        provenance: { origin: "persistent_manual", attribution: "human review" },
      });
      const preserved = await secondService.write(machineWrite(titleRevision(), "fr", "Machine replacement"));

      expect(preserved).toMatchObject({
        translatedContent: "Titre manuel",
        provenance: { origin: "persistent_manual", attribution: "human review" },
      });
      await expect(firstService.readCurrent(titleRevision(), "fr")).resolves.toMatchObject({
        selected: "translation",
        content: "Titre manuel",
        translation: { provenance: { origin: "persistent_manual" } },
      });
    } finally {
      await second.end();
    }
  });

  it("cascades translations with historical revisions while current revision ownership remains protected", async () => {
    const service = new ContentTranslationService(new DrizzleContentTranslationStore(drizzle(client)));
    await service.write(machineWrite(titleRevision(), "fr", "Historical title"));
    await service.write(machineWrite(postRevision(), "fr", "Historical body"));

    await client.query("begin");
    try {
      await client.query(`
        insert into forum_topic_title_revisions
          (id, topic_id, author_id, original_content, source_locale)
        values ('title-a-r2', 'topic-a', 'author-a', 'Current title', 'en')
      `);
      await client.query(`
        update forum_topics set current_title_revision_id = 'title-a-r2' where id = 'topic-a'
      `);
      await client.query(`
        insert into forum_post_revisions
          (id, post_id, author_id, original_content, source_locale)
        values ('body-a-r2', 'post-a', 'author-a', 'Current body', 'ru')
      `);
      await client.query(`
        update forum_posts set current_revision_id = 'body-a-r2' where id = 'post-a'
      `);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }

    await client.query("delete from forum_topic_title_revisions where id = 'title-a-r1'");
    await client.query("delete from forum_post_revisions where id = 'body-a-r1'");

    const counts = await client.query<{ titles: number; bodies: number }>(`
      select
        (select count(*)::int from forum_topic_title_translations where topic_id = 'topic-a') as titles,
        (select count(*)::int from forum_post_body_translations where post_id = 'post-a') as bodies
    `);
    expect(counts.rows[0]).toEqual({ titles: 0, bodies: 0 });

    await expectDatabaseCode(
      client.query("delete from forum_topic_title_revisions where id = 'title-a-r2'"),
      "23503",
    );
    await expectDatabaseCode(
      client.query("delete from forum_post_revisions where id = 'body-a-r2'"),
      "23503",
    );
  });
});

function titleRevision(
  overrides: Partial<ContentTranslationRevision> = {},
): ContentTranslationRevision {
  return {
    contentType: "topic-title",
    contentId: "topic-a",
    revisionId: "title-a-r1",
    originalContent: "Original title",
    sourceLocale: "en",
    ...overrides,
  };
}

function postRevision(
  overrides: Partial<ContentTranslationRevision> = {},
): ContentTranslationRevision {
  return {
    contentType: "post-body",
    contentId: "post-a",
    revisionId: "body-a-r1",
    originalContent: "Исходный текст",
    sourceLocale: "ru",
    ...overrides,
  };
}

function machineWrite(
  revision: ContentTranslationRevision,
  targetLocale: string,
  translatedContent: string,
): ContentTranslationWriteInput {
  return {
    revision,
    targetLocale,
    translatedContent,
    provenance: {
      origin: "machine",
      provider: "cloudflare-workers-ai",
      model: "@cf/meta/m2m100-1.2b",
      attribution: "machine fixture",
    },
  };
}

async function seedForumGraph(): Promise<void> {
  await client.query(`
    insert into "user" (id, name, email, email_verified, created_at, updated_at)
    values
      ('author-a', 'Author A', 'author-a@example.test', true, now(), now()),
      ('author-b', 'Author B', 'author-b@example.test', true, now(), now())
  `);
  await client.query(`
    insert into forum_categories (id, name) values ('category', 'Category');
    insert into forum_sections (id, category_id, name) values ('section', 'category', 'Section');
  `);

  await client.query("begin");
  try {
    await client.query(`
      insert into forum_topics (id, section_id, author_id, current_title_revision_id)
      values
        ('topic-a', 'section', 'author-a', 'title-a-r1'),
        ('topic-b', 'section', 'author-b', 'title-b-r1')
    `);
    await client.query(`
      insert into forum_topic_title_revisions
        (id, topic_id, author_id, original_content, source_locale)
      values
        ('title-a-r1', 'topic-a', 'author-a', 'Original title', 'en'),
        ('title-b-r1', 'topic-b', 'author-b', 'Other title', 'en')
    `);
    await client.query(`
      insert into forum_posts (id, topic_id, author_id, current_revision_id)
      values
        ('post-a', 'topic-a', 'author-a', 'body-a-r1'),
        ('post-b', 'topic-b', 'author-b', 'body-b-r1')
    `);
    await client.query(`
      insert into forum_post_revisions
        (id, post_id, author_id, original_content, source_locale)
      values
        ('body-a-r1', 'post-a', 'author-a', 'Исходный текст', 'ru'),
        ('body-b-r1', 'post-b', 'author-b', 'Другой текст', 'ru')
    `);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
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
