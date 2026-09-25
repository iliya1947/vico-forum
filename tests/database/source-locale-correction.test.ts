import { readFile } from "node:fs/promises";

import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { RouterContextProvider } from "react-router";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { authSessionContext, type AuthSession } from "../../app/auth/request-context";
import { authorizationContext } from "../../app/authorization/request-context";
import { forumWriterContext } from "../../app/forum/request-context";
import { topicAction } from "../../app/forum/actions.server";
import { ContentTranslationService } from "../../app/localization/content-translation";
import { createAuthorizationCapability } from "../../db/authorization-service";
import { PostgresAuthorizationRepository } from "../../db/authorization-repository";
import { DrizzleContentTranslationStore } from "../../db/content-translation-store";
import { DrizzleForumRepository } from "../../db/forum-repository";
import { ForumService } from "../../db/forum-service";
import { createHyperdriveForumWriter } from "../../db/hyperdrive-forum";

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

const schemaName = "source_locale_correction_test";
const client = new Client({ connectionString: databaseUrl, options: `-c search_path=${schemaName}` });

function scopedClient() {
  return new Client({ connectionString: databaseUrl, options: `-c search_path=${schemaName}` });
}
function scopedPool() {
  return new Pool({ connectionString: databaseUrl, max: 3, options: `-c search_path=${schemaName}` });
}
function session(userId: string): AuthSession {
  const now = new Date();
  return {
    user: { id: userId, name: userId, email: `${userId}@example.test`, emailVerified: true, createdAt: now, updatedAt: now },
    session: { id: `session-${userId}`, token: `token-${userId}`, userId, expiresAt: new Date(now.getTime() + 60_000), createdAt: now, updatedAt: now },
  };
}
function request(path: string, fields: Record<string, string>, origin = "https://forum.example") {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return new Request(`https://forum.example${path}`, { method: "POST", headers: { Origin: origin }, body: form });
}
async function context(userId: string | null) {
  const pool = scopedPool();
  const value = new RouterContextProvider();
  value.set(authSessionContext, userId ? session(userId) : null);
  value.set(forumWriterContext, createHyperdriveForumWriter(databaseUrl, scopedClient));
  value.set(authorizationContext, createAuthorizationCapability(new PostgresAuthorizationRepository(pool)) as never);
  return { value, close: () => pool.end() };
}
function status(response: unknown): number {
  if (response instanceof Response) return response.status;
  return (response as { init?: { status?: number } }).init?.status ?? 200;
}
async function correctTitle(userId: string, expectedRevisionId: string, sourceLocale: string) {
  const ctx = await context(userId);
  try {
    return await topicAction({
      request: request("/he/topics/topic-1", { intent: "correctTitleSourceLocale", expectedRevisionId, sourceLocale }),
      params: { locale: "he", topicId: "topic-1" },
      context: ctx.value,
    });
  } finally {
    await ctx.close();
  }
}
async function correctPost(userId: string, postId: string, expectedRevisionId: string, sourceLocale: string) {
  const ctx = await context(userId);
  try {
    return await topicAction({
      request: request("/he/topics/topic-1", { intent: "correctPostSourceLocale", postId, expectedRevisionId, sourceLocale }),
      params: { locale: "he", topicId: "topic-1" },
      context: ctx.value,
    });
  } finally {
    await ctx.close();
  }
}

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schemaName} cascade; create schema ${schemaName}`);
  await client.query(`set search_path to ${schemaName}`);
  for (const file of [
    "0003_gorgeous_donald_blake.sql",
    "0004_forum_domain_foundation.sql",
    "0005_calm_proemial_gods.sql",
    "0006_loving_sentinels.sql",
    "0014_content_translation_persistence.sql",
    "0018_source_locale_correction_permissions.sql",
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
      authz_user_permission_overrides,
      authz_user_roles,
      "user"
    cascade
  `);
  for (const id of ["author-a", "author-b", "moderator"]) {
    await client.query(
      `insert into "user" (id, name, email, email_verified, created_at, updated_at)
       values ($1, $1, $2, true, now(), now())`,
      [id, `${id}@example.test`],
    );
  }
  await client.query("insert into authz_user_roles (user_id, role_id) values ('moderator', 'builtin-moderator')");
  await client.query("insert into forum_categories (id, name) values ('category-1', 'Category')");
  await client.query("insert into forum_sections (id, category_id, name) values ('section-1', 'category-1', 'Section')");

  const forum = new ForumService(new DrizzleForumRepository(drizzle(client)));
  await forum.createTopicWithInitialPost({
    id: "topic-1",
    sectionId: "section-1",
    authorId: "author-a",
    titleRevision: { id: "title-r1", originalContent: "Original title", sourceLocale: "und" },
    initialPost: {
      id: "post-a",
      topicId: "topic-1",
      authorId: "author-a",
      bodyRevision: { id: "post-a-r1", originalContent: "Original body", sourceLocale: "und" },
    },
  });
  await forum.createPost({
    id: "post-b",
    topicId: "topic-1",
    authorId: "author-b",
    bodyRevision: { id: "post-b-r1", originalContent: "Other body", sourceLocale: "und" },
  });
});

afterAll(async () => {
  await client.query("set search_path to public");
  await client.query(`drop schema if exists ${schemaName} cascade`);
  await client.end();
});

describe("manual source-locale correction", () => {
  it("copies authoritative content into new revisions and isolates historical translations", async () => {
    await client.query(`
      insert into forum_topic_title_translations
        (topic_id, revision_id, target_locale, source_locale, translated_content, origin)
      values ('topic-1', 'title-r1', 'fr', 'und', 'Ancien titre', 'persistent_manual')
    `);

    const titleResponse = await correctTitle("author-a", "title-r1", "EN-us");
    expect(status(titleResponse)).toBe(302);
    if (!(titleResponse instanceof Response)) throw new Error("expected redirect");
    expect(titleResponse.headers.get("Location")).toBe("/he/topics/topic-1");

    const repository = new DrizzleForumRepository(drizzle(client));
    const topic = await repository.readTopicPage("topic-1");
    expect(topic?.title.originalContent).toBe("Original title");
    expect(topic?.title.sourceLocale).toBe("en-US");
    expect(topic?.title.id).not.toBe("title-r1");
    const titleRevision = await client.query<{ author_id: string; original_content: string; source_locale: string }>(
      "select author_id, original_content, source_locale from forum_topic_title_revisions where id = $1",
      [topic!.title.id],
    );
    expect(titleRevision.rows[0]).toEqual({
      author_id: "author-a",
      original_content: "Original title",
      source_locale: "en-US",
    });

    const translations = new ContentTranslationService(new DrizzleContentTranslationStore(drizzle(client)));
    await expect(translations.readCurrent({
      contentType: "topic-title",
      contentId: "topic-1",
      revisionId: topic!.title.id,
      originalContent: topic!.title.originalContent,
      sourceLocale: topic!.title.sourceLocale,
    }, "fr")).resolves.toMatchObject({
      selected: "original",
      content: "Original title",
    });
    expect((await client.query("select count(*)::int count from forum_topic_title_translations where revision_id = 'title-r1'")).rows[0]?.count).toBe(1);

    const postResponse = await correctPost("author-a", "post-a", "post-a-r1", "ka");
    expect(status(postResponse)).toBe(302);
    if (!(postResponse instanceof Response)) throw new Error("expected redirect");
    expect(postResponse.headers.get("Location")).toBe("/he/topics/topic-1#post-post-a");
    const post = await repository.readPost("post-a");
    expect(post?.body.originalContent).toBe("Original body");
    expect(post?.body.sourceLocale).toBe("ka");
    expect(post?.body.id).not.toBe("post-a-r1");
  });

  it("enforces own/any permissions from current DB state and ignores UI locale", async () => {
    expect(status(await correctPost("author-a", "post-b", "post-b-r1", "fr"))).toBe(403);
    expect(status(await correctPost("moderator", "post-b", "post-b-r1", "fr"))).toBe(302);

    await client.query(
      `insert into authz_user_permission_overrides (user_id, permission_key, effect)
       values ('author-a', 'forum.sourceLocale.correctOwn', 'deny')`,
    );
    expect(status(await correctTitle("author-a", "title-r1", "ru"))).toBe(403);

    await client.query(
      "delete from authz_user_permission_overrides where user_id = 'author-a' and permission_key = 'forum.sourceLocale.correctOwn'",
    );
    expect(status(await correctTitle("author-a", "title-r1", "fr"))).toBe(302);
  });

  it("rejects invalid/und/formatting-extension locales, missing targets, and stale revisions", async () => {
    for (const locale of ["und", "not a locale", "en-u-nu-latn"]) {
      const response = await correctTitle("author-a", "title-r1", locale);
      expect(response).toMatchObject({
        data: { error: "invalid", operation: "sourceLocaleCorrection" },
        init: { status: 400 },
      });
    }

    const missing = await correctPost("author-a", "missing", "missing-r1", "ru");
    expect(missing).toMatchObject({
      data: { error: "notFound", operation: "sourceLocaleCorrection" },
      init: { status: 404 },
    });

    const first = await correctTitle("author-a", "title-r1", "ru");
    expect(status(first)).toBe(302);
    const stale = await correctTitle("author-a", "title-r1", "de");
    expect(stale).toMatchObject({
      data: { error: "conflict", operation: "sourceLocaleCorrection" },
      init: { status: 409 },
    });
  });

  it("fences concurrent corrections so only one new current revision survives", async () => {
    const [first, second] = await Promise.all([
      correctTitle("author-a", "title-r1", "ru"),
      correctTitle("author-a", "title-r1", "de"),
    ]);
    expect([status(first), status(second)].sort()).toEqual([302, 409]);
    const revisions = await client.query<{ count: number }>(
      "select count(*)::int count from forum_topic_title_revisions where topic_id = 'topic-1'",
    );
    expect(revisions.rows[0]?.count).toBe(2);
    const current = await new DrizzleForumRepository(drizzle(client)).readTopicPage("topic-1");
    expect(["ru", "de"]).toContain(current?.title.sourceLocale);
    expect(current?.title.originalContent).toBe("Original title");
  });
});
