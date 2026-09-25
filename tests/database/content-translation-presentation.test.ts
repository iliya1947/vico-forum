import { readFile } from "node:fs/promises";

import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ContentTranslationPresentationService } from "../../app/localization/content-translation-presentation";
import { DrizzleContentTranslationBatchReader } from "../../db/content-translation-presentation-store";
import { DrizzleForumRepository } from "../../db/forum-repository";
import { ForumService } from "../../db/forum-service";

function requiredDatabaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required for the disposable database integration test");
  return value;
}

const databaseUrl = requiredDatabaseUrl();
const parsed = new URL(databaseUrl);
if (!["127.0.0.1", "localhost"].includes(parsed.hostname) || !parsed.pathname.endsWith("_test")) {
  throw new Error("Database integration tests only run against a local database ending in _test");
}

const schemaName = "content_translation_presentation_test";
const client = new Client({ connectionString: databaseUrl, options: `-c search_path=${schemaName}` });

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schemaName} cascade; create schema ${schemaName}`);
  await client.query(`set search_path to ${schemaName}`);
  for (const file of [
    "0003_gorgeous_donald_blake.sql",
    "0004_forum_domain_foundation.sql",
    "0005_calm_proemial_gods.sql",
    "0014_content_translation_persistence.sql",
  ]) {
    const sql = (await readFile(`drizzle/${file}`, "utf8")).replaceAll('"public".', `"${schemaName}".`);
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

  for (const id of ["author-a", "author-b"]) {
    await client.query(
      `insert into "user" (id, name, email, email_verified, created_at, updated_at)
       values ($1, $1, $2, true, now(), now())`,
      [id, `${id}@example.test`],
    );
  }
  await client.query("insert into forum_categories (id, name) values ('category-1', 'Category')");
  await client.query("insert into forum_sections (id, category_id, name) values ('section-1', 'category-1', 'Section')");

  const forum = new ForumService(new DrizzleForumRepository(drizzle(client)));
  await forum.createTopicWithInitialPost({
    id: "topic-1",
    sectionId: "section-1",
    authorId: "author-a",
    titleRevision: { id: "title-r1", originalContent: "Original title", sourceLocale: "en" },
    initialPost: {
      id: "post-1",
      topicId: "topic-1",
      authorId: "author-a",
      bodyRevision: { id: "post-1-r1", originalContent: "First body", sourceLocale: "en" },
    },
  });
  await forum.createPost({
    id: "post-2",
    topicId: "topic-1",
    authorId: "author-b",
    bodyRevision: { id: "post-2-r1", originalContent: "Second body", sourceLocale: "en" },
  });
  await forum.reviseTopicTitle(
    "topic-1",
    "title-r1",
    { id: "title-r2", originalContent: "Current title", sourceLocale: "en" },
    "author-a",
  );
  await forum.revisePostBody(
    "post-1",
    "post-1-r1",
    { id: "post-1-r2", originalContent: "Current first body", sourceLocale: "en" },
    "author-a",
  );

  await client.query(`
    insert into forum_topic_title_translations
      (topic_id, revision_id, target_locale, source_locale, translated_content, origin, provider, provider_model, attribution)
    values
      ('topic-1', 'title-r1', 'he', 'en', 'Old title', 'persistent_manual', null, null, null),
      ('topic-1', 'title-r2', 'he', 'en', 'כותרת נוכחית', 'machine', 'provider-a', 'model-a', 'Attribution'),
      ('topic-1', 'title-r2', 'fr', 'en', 'Titre courant', 'persistent_manual', null, null, null)
  `);
  await client.query(`
    insert into forum_post_body_translations
      (post_id, revision_id, target_locale, source_locale, translated_content, origin, provider, provider_model, attribution)
    values
      ('post-1', 'post-1-r1', 'he', 'en', 'Old first body', 'persistent_manual', null, null, null),
      ('post-1', 'post-1-r2', 'fr', 'en', 'Corps courant', 'persistent_manual', null, null, null),
      ('post-2', 'post-2-r1', 'he', 'en', 'גוף שני', 'persistent_manual', null, null, null)
  `);
});

afterAll(async () => {
  await client.query("set search_path to public");
  await client.query(`drop schema if exists ${schemaName} cascade`);
  await client.end();
});

describe("content translation topic presentation", () => {
  it("selects only exact current revision/target rows while preserving independent misses", async () => {
    const topic = await new DrizzleForumRepository(drizzle(client)).readTopicPage("topic-1");
    if (!topic) throw new Error("topic fixture missing");

    const presentation = await new ContentTranslationPresentationService(
      new DrizzleContentTranslationBatchReader(drizzle(client)),
    ).presentTopic({
      title: {
        contentType: "topic-title",
        contentId: topic.id,
        revisionId: topic.title.id,
        originalContent: topic.title.originalContent,
        sourceLocale: topic.title.sourceLocale,
      },
      posts: topic.posts.map((post) => ({
        contentType: "post-body" as const,
        contentId: post.id,
        revisionId: post.body.id,
        originalContent: post.body.originalContent,
        sourceLocale: post.body.sourceLocale,
      })),
      targetLocale: "he",
      targetDirection: "rtl",
      sourceDirection: (locale) => locale === "en" ? "ltr" : "auto",
    });

    expect(presentation.title).toMatchObject({
      selected: "translation",
      displayed: { content: "כותרת נוכחית", locale: "he", direction: "rtl" },
      translation: {
        provenance: {
          origin: "machine",
          provider: "provider-a",
          model: "model-a",
          attribution: "Attribution",
        },
      },
    });
    expect(presentation.posts[0]).toMatchObject({
      selected: "original",
      displayed: { content: "Current first body", locale: "en", direction: "ltr" },
      fallbackReason: "missing",
    });
    expect(presentation.posts[1]).toMatchObject({
      selected: "translation",
      displayed: { content: "גוף שני", locale: "he", direction: "rtl" },
      translation: { provenance: { origin: "persistent_manual" } },
    });
  });
});
