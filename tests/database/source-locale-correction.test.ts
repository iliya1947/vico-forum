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
import { historicalForumMeasureAdmission } from "./historical-forum-measure-admission";
import { DrizzleForumRepository } from "../../db/forum-repository";
import { ForumService } from "../../db/forum-service";
import { createHyperdriveForumWriter, ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import { runSourceLocaleCorrection } from "../../app/forum/mutations.server";

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
  value.set(forumWriterContext, createHyperdriveForumWriter(databaseUrl, scopedClient, undefined, historicalForumMeasureAdmission));
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
    "0021_forum_tags.sql",
    "0022_forum_reply_relationships.sql",
    "0024_forum_reply_notifications.sql",
    "0025_forum_topic_pins.sql",
    "0026_best_answer_independent_from_solved.sql",
    "0027_help_solutions_foundation.sql",
    "0028_help_solution_moderation.sql",
    "0029_help_question_needs_details.sql",
    "0030_help_duplicate_workflow.sql",
    "0031_help_user_moderation_signals.sql",
    "0032_forum_profiles.sql",
    "0033_forum_online_presence.sql",
    "0034_forum_editor_drafts.sql",
    "0035_forum_attachments_foundation.sql",
    "0036_forum_attachment_security_events.sql",
    "0037_forum_attachment_draft_generations.sql",
    "0038_forum_attachment_cleanup_claims.sql",
    "0040_post_edit_history_permissions.sql",
    "0041_published_mentions.sql",
  "0042_attachment_edit_snapshots.sql",
  "0049_admin_history.sql",
  "0051_forum_admin_history.sql",
    "0065_sa04_account_state_foundation.sql",
  ]) {
    const sql = (await readFile(`drizzle/${file}`, "utf8")).replaceAll('"public".', `"${schemaName}".`);
    await client.query(sql);
  }
  // Historical fixtures use current Drizzle topic writes while selecting old migration subsets.
  // Supply only AP-08 columns here without changing the historical migration sequence.
  await client.query("alter table forum_topics add column is_closed boolean not null default false, add column closure_version integer not null default 0");
});

beforeEach(async () => {
  await client.query(`
    truncate
      forum_reply_notifications,
      forum_topic_tags,
      forum_tags,
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

  const forum = new ForumService(new DrizzleForumRepository(drizzle(client), undefined, historicalForumMeasureAdmission));
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


async function correctionFacts() {
  const result = await client.query<{
    title_head: string; post_head: string;
    titles: number; posts: number; history: number;
  }>([
    "select",
    "(select current_title_revision_id from forum_topics where id='topic-1') as title_head,",
    "(select current_revision_id from forum_posts where id='post-b') as post_head,",
    "(select count(*)::int from forum_topic_title_revisions where topic_id='topic-1') as titles,",
    "(select count(*)::int from forum_post_revisions where post_id='post-b') as posts,",
    "(select count(*)::int from admin_history where target_id in ('topic-1','post-b')) as history",
  ].join("\n"));
  return result.rows[0];
}

async function currentCorrectionRevisions() {
  expect(status(await correctTitle("author-a", "title-r1", "ru"))).toBe(302);
  expect(status(await correctPost("author-b", "post-b", "post-b-r1", "he"))).toBe(302);
  const forum = new DrizzleForumRepository(drizzle(client));
  const title = (await forum.readTopicPage("topic-1"))!.title.id;
  const post = (await forum.readPost("post-b"))!.body.id;
  return { title, post };
}

async function deactivate(id: string) {
  await client.query('update "user" set deactivated_at=now(),deactivated_by_user_id=$1,'
    + "retain_at_least_until=now()+interval '2 years' where id=$1", [id]);
}

function nativeSql(value: unknown): string {
  if (typeof value === "string") return value;
  return value && typeof value === "object" && "text" in value
    && typeof value.text === "string" ? value.text : "";
}

function pauseQuery(writer: Client, matches: (sql: string) => boolean) {
  const original = writer.query;
  let entered!: () => void, release!: () => void;
  const observed = new Promise<void>(resolve => { entered = resolve; });
  const permitted = new Promise<void>(resolve => { release = resolve; });
  let triggered = false;
  writer.query = ((...args: unknown[]) => {
    if (!triggered && matches(nativeSql(args[0]))) {
      triggered = true;
      entered();
      return permitted.then(() => Reflect.apply(original, writer, args));
    }
    return Reflect.apply(original, writer, args);
  }) as typeof writer.query;
  return { observed, resume: () => release(), restore: () => { writer.query = original; } };
}

function noopCorrection(
  forum: ForumService, kind: "title" | "post", actorId: string, revisions: { title: string; post: string },
  scope: "own" | "any" = "own",
) {
  return kind === "title"
    ? forum.correctTopicTitleSourceLocale({
      topicId: "topic-1", expectedRevisionId: revisions.title,
      sourceLocale: "ru", actorId, scope,
    })
    : forum.correctPostBodySourceLocale({
      topicId: "topic-1", postId: "post-b", expectedRevisionId: revisions.post,
      sourceLocale: "he", actorId, scope,
    });
}

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

    const noOp = await correctTitle("author-a", topic!.title.id, "en-us");
    expect(status(noOp)).toBe(302);
    expect((await client.query(
      "select count(*)::int count from forum_topic_title_revisions where topic_id = 'topic-1'",
    )).rows[0]?.count).toBe(2);

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
  it("keeps active same-locale own/any corrections no-op and enforces Own/Any validation", async () => {
    const revisions = await currentCorrectionRevisions();
    const before = await correctionFacts();
    expect(status(await correctTitle("author-a", revisions.title, "RU"))).toBe(302);
    expect(status(await correctPost("author-b", "post-b", revisions.post, "HE"))).toBe(302);
    expect(status(await correctTitle("moderator", revisions.title, "ru"))).toBe(302);
    expect(status(await correctPost("moderator", "post-b", revisions.post, "he"))).toBe(302);
    expect(status(await correctPost("author-a", "post-b", revisions.post, "he"))).toBe(403);
    expect(status(await correctTitle("author-a", "title-r1", "ru"))).toBe(409);
    expect(status(await correctTitle("author-a", revisions.title, "und"))).toBe(400);
    expect(await correctionFacts()).toEqual(before);
  });

  it("denies inactive owner/moderator same-locale success for both content kinds without new facts", async () => {
    const revisions = await currentCorrectionRevisions();
    await deactivate("author-a");
    await deactivate("author-b");
    await deactivate("moderator");
    const before = await correctionFacts();
    for (const response of [
      await correctTitle("author-a", revisions.title, "ru"),
      await correctPost("author-b", "post-b", revisions.post, "he"),
      await correctTitle("moderator", revisions.title, "ru"),
      await correctPost("moderator", "post-b", revisions.post, "he"),
    ]) {
      expect(status(response)).toBe(401);
      expect(response).toMatchObject({
        data: { error: "unauthenticated", operation: "sourceLocaleCorrection" },
      });
      expect((response as { init?: { headers?: Record<string, string> } }).init?.headers?.["Cache-Control"])
        .toBe("private, no-store");
    }
    expect(await correctionFacts()).toEqual(before);
    const service = new ForumService(new DrizzleForumRepository(drizzle(client)));
    await expect(noopCorrection(service, "title", "missing-user", revisions, "any"))
      .rejects.toBeInstanceOf(AccountMissingError);
    await expect(noopCorrection(service, "post", "missing-user", revisions, "any"))
      .rejects.toBeInstanceOf(AccountMissingError);
    expect(await correctionFacts()).toEqual(before);
  });

  it("maps late lifecycle/unavailable failures canonically without swallowing unexpected faults", async () => {
    const ctx = await context("author-a");
    const req = request("/he/topics/topic-1", {
      intent: "correctTitleSourceLocale", expectedRevisionId: "title-r1", sourceLocale: "ru",
    });
    try {
      for (const error of [new AccountInactiveError(), new AccountMissingError()]) {
        const response = await runSourceLocaleCorrection(req, ctx.value, async () => { throw error; });
        expect(response).toMatchObject({
          data: { error: "unauthenticated", operation: "sourceLocaleCorrection" },
          init: { status: 401, headers: { "Cache-Control": "private, no-store" } },
        });
      }
      expect(await runSourceLocaleCorrection(req, ctx.value,
        async () => { throw new ForumStorageUnavailableError(); })).toMatchObject({
        data: { error: "unavailable", operation: "sourceLocaleCorrection" },
        init: { status: 503, headers: { "Cache-Control": "private, no-store" } },
      });
      await expect(runSourceLocaleCorrection(req, ctx.value,
        async () => { throw new TypeError("unexpected"); })).rejects.toThrow("unexpected");
    } finally {
      await ctx.close();
    }
  });

  for (const kind of ["title", "post"] as const) {
    it("denies " + kind + " same-locale no-op when deactivation commits before actor admission", async () => {
      const revisions = await currentCorrectionRevisions();
      const before = await correctionFacts();
      const actor = kind === "title" ? "author-a" : "author-b";
      const writer = scopedClient();
      await writer.connect();
      const paused = pauseQuery(writer, sql => /from "user" .*for no key update/i.test(sql));
      try {
        const forum = new ForumService(new DrizzleForumRepository(drizzle(writer)));
        const pending = noopCorrection(forum, kind, actor, revisions);
        await paused.observed;
        await deactivate(actor);
        paused.resume();
        await expect(pending).rejects.toBeInstanceOf(AccountInactiveError);
        expect(await correctionFacts()).toEqual(before);
      } finally {
        paused.resume();
        paused.restore();
        await writer.end();
      }
    }, 30_000);

    it("holds " + kind + " no-op actor admission through COMMIT against deactivation", async () => {
      const revisions = await currentCorrectionRevisions();
      const before = await correctionFacts();
      const actor = kind === "title" ? "author-a" : "author-b";
      const writer = scopedClient();
      await writer.connect();
      const paused = pauseQuery(writer, sql => /^commit$/i.test(sql.trim()));
      let deactivatorOpen = false;
      try {
        const forum = new ForumService(new DrizzleForumRepository(drizzle(writer)));
        const pending = noopCorrection(forum, kind, actor, revisions);
        await paused.observed;
        expect(await correctionFacts()).toEqual(before);
        await client.query("begin");
        deactivatorOpen = true;
        await client.query("set local lock_timeout = '180ms'");
        await expect(client.query('update "user" set deactivated_at=now(),'
          + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years' where id=$1",
        [actor])).rejects.toMatchObject({ code: "55P03" });
        await client.query("rollback");
        deactivatorOpen = false;
        paused.resume();
        await pending;
        expect(await correctionFacts()).toEqual(before);
        await deactivate(actor);
        await expect(noopCorrection(forum, kind, actor, revisions))
          .rejects.toBeInstanceOf(AccountInactiveError);
        expect(await correctionFacts()).toEqual(before);
      } finally {
        paused.resume();
        paused.restore();
        if (deactivatorOpen) await client.query("rollback");
        await writer.end();
      }
    }, 30_000);
  }

});
