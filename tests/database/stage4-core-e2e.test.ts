import { readFile } from "node:fs/promises";

import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { RouterContextProvider } from "react-router";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authSessionContext, type AuthSession } from "../../app/auth/request-context";
import { authorizationContext } from "../../app/authorization/request-context";
import { forumWriterContext } from "../../app/forum/request-context";
import { sectionAction, topicAction } from "../../app/forum/actions.server";
import { INITIAL_ROLE_GRANTS } from "../../app/authorization/catalog";
import { createAuthorizationCapability, AuthorizationService } from "../../db/authorization-service";
import { PostgresAuthorizationRepository } from "../../db/authorization-repository";
import { DrizzleForumRepository } from "../../db/forum-repository";
import { createHyperdriveForumWriter } from "../../db/hyperdrive-forum";
import { FORUM_WRITE_COOLDOWN_MS } from "../../db/forum-write-policy";

function requiredDatabaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required for the disposable database integration test");
  return value;
}

const databaseUrl = requiredDatabaseUrl();
const parsedDatabaseUrl = new URL(databaseUrl);
if (!["127.0.0.1", "localhost"].includes(parsedDatabaseUrl.hostname) || !parsedDatabaseUrl.pathname.endsWith("_test")) {
  throw new Error("Database integration tests only run against a local database ending in _test");
}

const schemaName = "stage4_core_e2e_test";
const migrationFiles = [
  "0000_tan_johnny_storm.sql",
  "0001_seed-locales.sql",
  "0002_ui_translation_storage.sql",
  "0003_gorgeous_donald_blake.sql",
  "0004_forum_domain_foundation.sql",
  "0005_calm_proemial_gods.sql",
  "0006_loving_sentinels.sql",
  "0018_source_locale_correction_permissions.sql",
  "0020_translation_generation_permission.sql",
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
] as const;

const client = new Client({ connectionString: databaseUrl, options: `-c search_path=${schemaName}` });
let clock = Date.parse("2026-09-15T00:00:00.000Z");
const writePolicy = {
  cooldownMs: FORUM_WRITE_COOLDOWN_MS,
  now: () => new Date(clock += FORUM_WRITE_COOLDOWN_MS + 1),
};

function scopedClient() {
  return new Client({ connectionString: databaseUrl, options: `-c search_path=${schemaName}` });
}

function scopedPool() {
  return new Pool({ connectionString: databaseUrl, max: 2, options: `-c search_path=${schemaName}` });
}

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schemaName} cascade; create schema ${schemaName}`);
  await client.query(`set search_path to ${schemaName}`);
  for (const file of migrationFiles) {
    const sql = (await readFile(`drizzle/${file}`, "utf8")).replaceAll('"public".', `"${schemaName}".`);
    await client.query(sql);
  }
});

afterAll(async () => {
  await client.query("set search_path to public");
  await client.query(`drop schema if exists ${schemaName} cascade`);
  await client.end();
});

function session(userId: string, name: string): AuthSession {
  const now = new Date();
  return {
    user: { id: userId, name, email: `${userId}@example.test`, emailVerified: true, createdAt: now, updatedAt: now },
    session: { id: `session-${userId}`, token: `token-${userId}`, userId, expiresAt: new Date(now.getTime() + 60_000), createdAt: now, updatedAt: now },
  };
}

async function insertUser(id: string, name: string) {
  await client.query(
    `insert into "user" (id, name, email, email_verified, created_at, updated_at, locale)
     values ($1, $2, $3, true, now(), now(), null)`,
    [id, name, `${id}@example.test`],
  );
}

function formRequest(path: string, fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return new Request(`https://forum.example${path}`, {
    method: "POST",
    headers: { Origin: "https://forum.example" },
    body: form,
  });
}

function responseStatus(value: unknown): number {
  if (value instanceof Response) return value.status;
  if (typeof value === "object" && value !== null && "init" in value) {
    return (value as { init?: { status?: number } }).init?.status ?? 200;
  }
  return 200;
}

async function userContext(userId: string, name: string) {
  const pool = scopedPool();
  const context = new RouterContextProvider();
  context.set(authSessionContext, session(userId, name));
  context.set(forumWriterContext, createHyperdriveForumWriter(databaseUrl, scopedClient, writePolicy));
  context.set(authorizationContext, createAuthorizationCapability(new PostgresAuthorizationRepository(pool)) as never);
  return { context, close: () => pool.end() };
}

async function createTopic(userId: string, name: string, title: string, tags = "") {
  const state = await userContext(userId, name);
  try {
    const response = await sectionAction({
      request: formRequest("/en/sections/e2e-section", { title, body: `${title} initial post`, tags }),
      params: { locale: "en", sectionId: "e2e-section" },
      context: state.context,
    });
    if (!(response instanceof Response) || response.status !== 302) {
      throw new Error(`topic creation failed with status ${responseStatus(response)}`);
    }
    const location = response.headers.get("Location");
    if (!location) throw new Error("topic creation did not return a redirect location");
    const segment = location.split("/").at(-1);
    if (!segment) throw new Error("topic creation returned an invalid redirect location");
    return decodeURIComponent(segment);
  } finally {
    await state.close();
  }
}

async function markSolved(userId: string, name: string, topicId: string, extra: Record<string, string> = {}) {
  const state = await userContext(userId, name);
  try {
    return await topicAction({
      request: formRequest(`/en/topics/${topicId}`, { intent: "markSolved", ...extra }),
      params: { locale: "en", topicId },
      context: state.context,
    });
  } finally {
    await state.close();
  }
}

describe("Stage 4 connected forum authorization flow", () => {
  it("runs the forum MVP end-to-end and applies authorization changes on the next request", async () => {
    await insertUser("e2e-manager", "Manager");
    await insertUser("e2e-author", "Author");
    await insertUser("e2e-replier", "Replier");
    await client.query("insert into authz_user_roles (user_id, role_id) values ('e2e-manager', 'builtin-admin')");

    const forum = new DrizzleForumRepository(drizzle(client));
    await forum.createCategory({ id: "e2e-category", name: "E2E Category" });
    await forum.createSection({ id: "e2e-section", categoryId: "e2e-category", name: "E2E Section" });

    await expect(forum.readSection("e2e-section")).resolves.toMatchObject({ id: "e2e-section", topics: [] });

    const topicId = await createTopic("e2e-author", "Author", "Core E2E topic", " TypeScript, Cloudflare, typescript ");

    const tagIndex = await forum.readTags();
    expect(tagIndex).toEqual([
      { key: "cloudflare", name: "Cloudflare", topicCount: 1 },
      { key: "typescript", name: "TypeScript", topicCount: 1 },
    ]);
    const typeScriptTag = await forum.readTag("typescript");
    expect(typeScriptTag).toMatchObject({
      tag: { key: "typescript", name: "TypeScript" },
      topics: [{ id: topicId, tags: [{ key: "cloudflare", name: "Cloudflare" }, { key: "typescript", name: "TypeScript" }] }],
    });
    expect((await forum.readTopicPage(topicId))?.tags).toEqual([
      { key: "cloudflare", name: "Cloudflare" },
      { key: "typescript", name: "TypeScript" },
    ]);

    const initialPostId = (await forum.readTopicPage(topicId))?.posts[0]?.id;
    if (!initialPostId) throw new Error("initial post was not persisted");

    const replyState = await userContext("e2e-replier", "Replier");
    try {
      const replyResponse = await topicAction({
        request: formRequest(`/en/topics/${topicId}`, { body: "Connected reply", parentPostId: initialPostId }),
        params: { locale: "en", topicId },
        context: replyState.context,
      });
      expect(responseStatus(replyResponse)).toBe(302);
    } finally {
      await replyState.close();
    }

    const withReply = await forum.readTopicPage(topicId);
    const reply = withReply?.posts.find((post) => post.authorId === "e2e-replier");
    if (!reply) throw new Error("reply was not persisted");
    expect(reply.parentPostId).toBe(initialPostId);

    const bestState = await userContext("e2e-author", "Author");
    try {
      const bestResponse = await topicAction({
        request: formRequest(`/en/topics/${topicId}`, { intent: "selectBestAnswer", postId: reply.id }),
        params: { locale: "en", topicId },
        context: bestState.context,
      });
      expect(responseStatus(bestResponse)).toBe(302);
    } finally {
      await bestState.close();
    }

    const selectedButUnsolved = await forum.readTopicPage(topicId);
    expect(selectedButUnsolved).toMatchObject({ isSolved: false, bestAnswerPostId: reply.id });

    expect(responseStatus(await markSolved("e2e-author", "Author", topicId))).toBe(302);
    const publicTopic = await forum.readTopicPage(topicId);
    expect(publicTopic).toMatchObject({ isSolved: true, bestAnswerPostId: reply.id });
    expect(publicTopic?.posts.find((post) => post.id === reply.id)?.body.originalContent).toBe("Connected reply");

    const newerTopicId = await createTopic("e2e-author", "Author", "Newer but inactive topic");
    await client.query(
      `update forum_topics
       set created_at = case id
         when $1 then timestamptz '2026-09-01T00:00:00Z'
         when $2 then timestamptz '2026-09-05T00:00:00Z'
         else created_at
       end
       where id in ($1, $2)`,
      [topicId, newerTopicId],
    );
    await client.query(
      `update forum_posts
       set created_at = case
         when id = $3 then timestamptz '2026-09-10T00:00:00Z'
         when topic_id = $1 then timestamptz '2026-09-01T00:00:00Z'
         when topic_id = $2 then timestamptz '2026-09-05T00:00:00Z'
         else created_at
       end
       where topic_id in ($1, $2)`,
      [topicId, newerTopicId, reply.id],
    );

    const homepage = await forum.readHomepage();
    const homepageCategory = homepage.find((entry) => entry.id === "e2e-category");
    expect(homepageCategory).toMatchObject({
      sectionCount: 1,
      topicCount: 2,
      messageCount: 3,
      sections: [{
        id: "e2e-section",
        name: "E2E Section",
        topicCount: 2,
        messageCount: 3,
      }],
    });

    const popular = await forum.readPopular(new Date("2026-09-11T00:00:00.000Z"), 10);
    expect(popular["24h"]).toMatchObject([{
      id: topicId,
      activityCount: 1,
      latestActivityAt: new Date("2026-09-10T00:00:00.000Z"),
    }]);
    expect(popular["7d"].map((entry) => ({ id: entry.id, activityCount: entry.activityCount }))).toEqual([
      { id: topicId, activityCount: 1 },
      { id: newerTopicId, activityCount: 1 },
    ]);
    expect(popular["30d"].map((entry) => ({ id: entry.id, activityCount: entry.activityCount }))).toEqual([
      { id: topicId, activityCount: 2 },
      { id: newerTopicId, activityCount: 1 },
    ]);

    const unanswered = await forum.readUnanswered();
    expect(unanswered).toMatchObject([{
      id: newerTopicId,
      title: "Newer but inactive topic",
      authorName: "Author",
      section: { id: "e2e-section", name: "E2E Section" },
      category: { id: "e2e-category", name: "E2E Category" },
    }]);

    const searchByTitle = await forum.search("core");
    expect(searchByTitle).toMatchObject([{
      id: topicId,
      title: "Core E2E topic",
      authorName: "Author",
      postCount: 2,
      section: { id: "e2e-section", name: "E2E Section" },
      category: { id: "e2e-category", name: "E2E Category" },
    }]);

    const searchByTag = await forum.search("cloudflare");
    expect(searchByTag).toHaveLength(1);
    expect(searchByTag[0]).toMatchObject({
      id: topicId,
      tags: [{ key: "cloudflare", name: "Cloudflare" }, { key: "typescript", name: "TypeScript" }],
    });

    const searchByMessage = await forum.search("connected reply");
    expect(searchByMessage.map((entry) => entry.id)).toEqual([topicId]);
    await expect(forum.search("%")).resolves.toEqual([]);
    await expect(forum.search("_")).resolves.toEqual([]);

    const managementPool = scopedPool();
    const authorization = new AuthorizationService(new PostgresAuthorizationRepository(managementPool));
    try {
      await authorization.assignUserRole("e2e-manager", "e2e-replier", "builtin-moderator");
      const moderatorTopic = await createTopic("e2e-author", "Author", "Moderator access");
      expect(responseStatus(await markSolved("e2e-replier", "Replier", moderatorTopic))).toBe(302);

      await authorization.replaceRoleGrants(
        "e2e-manager",
        "builtin-moderator",
        INITIAL_ROLE_GRANTS.moderator.filter((permission) => permission !== "forum.solution.manageAny"),
      );
      const removedGrantTopic = await createTopic("e2e-author", "Author", "Grant removed");
      expect(responseStatus(await markSolved("e2e-replier", "Replier", removedGrantTopic))).toBe(403);
      expect((await forum.readTopicPage(removedGrantTopic))?.isSolved).toBe(false);

      await authorization.replaceRoleGrants("e2e-manager", "builtin-moderator", [...INITIAL_ROLE_GRANTS.moderator]);
      expect(responseStatus(await markSolved("e2e-replier", "Replier", removedGrantTopic))).toBe(302);

      const deniedTopic = await createTopic("e2e-author", "Author", "Override denied");
      await authorization.setUserOverride("e2e-manager", "e2e-replier", "forum.solution.manageAny", "deny");
      expect(responseStatus(await markSolved("e2e-replier", "Replier", deniedTopic))).toBe(403);
      expect((await forum.readTopicPage(deniedTopic))?.isSolved).toBe(false);

      await authorization.setUserOverride("e2e-manager", "e2e-replier", "forum.solution.manageAny", null);
      expect(responseStatus(await markSolved("e2e-replier", "Replier", deniedTopic))).toBe(302);

      await authorization.assignUserRole("e2e-manager", "e2e-replier", "builtin-user");
      const allowedTopic = await createTopic("e2e-author", "Author", "Override allowed");
      expect(responseStatus(await markSolved("e2e-replier", "Replier", allowedTopic))).toBe(403);
      await authorization.setUserOverride("e2e-manager", "e2e-replier", "forum.solution.manageAny", "allow");
      expect(responseStatus(await markSolved("e2e-replier", "Replier", allowedTopic))).toBe(302);

      await authorization.setUserOverride("e2e-manager", "e2e-replier", "forum.solution.manageAny", null);
      const forgedTopic = await createTopic("e2e-author", "Author", "Forged authorization");
      const forgedResponse = await markSolved("e2e-replier", "Replier", forgedTopic, {
        actorId: "e2e-author",
        authorId: "e2e-author",
        role: "admin",
        permission: "forum.solution.manageAny",
        scope: "any",
      });
      expect(responseStatus(forgedResponse)).toBe(403);
      expect((await forum.readTopicPage(forgedTopic))?.isSolved).toBe(false);
    } finally {
      await managementPool.end();
    }
  });
});
