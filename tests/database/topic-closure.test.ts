import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { DrizzleForumRepository, ForumTopicClosedError, ForumStateConflictError, ForumEntityNotFoundError } from "../../db/forum-repository";
import { ForumService, InvalidForumContentError } from "../../db/forum-service";
import { DrizzleForumAttachments } from "../../db/forum-attachments";
import { HELP_SOLUTIONS_SERVICE_SECTION_ID } from "../../db/forum-identifiers";

const url = process.env.DATABASE_URL!;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) throw new Error("Isolated loopback *_test database required");
const schema = "topic_closure_ap08_test";
const client = new Client({ connectionString: url, options: `-c search_path=${schema}` });
const pool = new Pool({ connectionString: url, options: `-c search_path=${schema}`, application_name: "vico-ap08-closure" });
let tick = Date.now();
const repository = new DrizzleForumRepository(drizzle(pool), { cooldownMs: 0, now: () => new Date(tick += 10000) });
const forum = new ForumService(repository);
const attachments = new DrizzleForumAttachments(drizzle(pool));

function reply(topicId: string, id: string, authorId = "author") {
  return { id, topicId, authorId, bodyRevision: {
    id: `${id}-revision`, originalContent: "New reply", sourceLocale: "en",
  } };
}
async function createTopic(id: string, sectionId = "closure-section") {
  await forum.createTopicWithInitialPost({
    id, sectionId, authorId: "author",
    titleRevision: { id: `${id}-title`, originalContent: `Topic ${id}`, sourceLocale: "en" },
    initialPost: { id: `${id}-first`, topicId: id, authorId: "author",
      bodyRevision: { id: `${id}-body`, originalContent: "Original question", sourceLocale: "en" } },
  });
}
async function state(id: string) {
  const r = await client.query<{ is_closed: boolean; closure_version: number }>(
    "select is_closed,closure_version from forum_topics where id=$1", [id]);
  return r.rows[0];
}
async function changes(id: string) {
  const r = await client.query<{ action: string; context: { before: boolean; after: boolean; previousVersion: number; version: number }; reason: string | null }>(
    "select action,context,reason from admin_history where target_id=$1 and action in ('topic.closed','topic.reopened') order by position", [id]);
  return r.rows;
}
async function waitForRowWait() {
  for (let attempt = 0; attempt < 300; attempt++) {
    const r = await client.query("select 1 from pg_stat_activity where application_name='vico-ap08-closure' and wait_event_type='Lock'");
    if (r.rowCount) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error("Expected a row lock wait");
}

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const file of (await readdir("drizzle")).filter(f => /^\d{4}_.+\.sql$/.test(f)).sort()) {
    await client.query((await readFile(`drizzle/${file}`, "utf8")).replaceAll('"public".', `"${schema}".`));
  }
  await client.query(`insert into "user"(id,name,email) values
    ('author','Author','ap08-author@test.invalid'),('manager','Manager','ap08-manager@test.invalid')`);
  await forum.createCategory({ id: "closure-category", name: "Closure" });
  await forum.createSection({ id: "closure-section", categoryId: "closure-category", name: "Topics" });
  await createTopic("closure-topic");
  await createTopic("help-closure", HELP_SOLUTIONS_SERVICE_SECTION_ID);
});
afterAll(async () => {
  await pool.end();
  await client.query(`drop schema ${schema} cascade`);
  await client.end();
});

describe("AP-08 authoritative topic closure", () => {
  it("seeds closed/version defaults, nonnegative version and only moderator/admin initial grants", async () => {
    expect(await state("closure-topic")).toEqual({ is_closed: false, closure_version: 0 });
    expect(await state("help-closure")).toEqual({ is_closed: false, closure_version: 0 });
    const grants = await client.query<{ slug: string }>(`select r.slug from authz_role_permissions p
      join authz_roles r on r.id=p.role_id where p.permission_key='forum.topic.close' order by r.slug`);
    expect(grants.rows.map(r => r.slug)).toEqual(["admin", "moderator"]);
    await expect(client.query("update forum_topics set closure_version=-1 where id='closure-topic'"))
      .rejects.toMatchObject({ code: "23514" });
  });

  it("closes and reopens only closure state, enforcing CAS, no-op and exact-once History on ordinary and Help topics", async () => {
    for (const id of ["closure-topic", "help-closure"]) {
      expect(await forum.setTopicClosed({ topicId: id, actorId: "manager", isClosed: true, expectedClosureVersion: 0 }))
        .toEqual({ isClosed: true, closureVersion: 1, changed: true });
      expect(await state(id)).toEqual({ is_closed: true, closure_version: 1 });
      expect(await forum.setTopicClosed({ topicId: id, actorId: "manager", isClosed: true, expectedClosureVersion: 1 }))
        .toMatchObject({ changed: false, closureVersion: 1 });
      await expect(forum.setTopicClosed({ topicId: id, actorId: "manager", isClosed: true, expectedClosureVersion: 0 }))
        .rejects.toBeInstanceOf(ForumStateConflictError);
      await expect(forum.createPost(reply(id, `${id}-blocked`, "manager")))
        .rejects.toBeInstanceOf(ForumTopicClosedError);
      await expect(forum.createPost(reply(id, `${id}-blocked-author`)))
        .rejects.toBeInstanceOf(ForumTopicClosedError);
      expect(await forum.setTopicClosed({ topicId: id, actorId: "manager", isClosed: false, expectedClosureVersion: 1 }))
        .toEqual({ isClosed: false, closureVersion: 2, changed: true });
      await expect(forum.setTopicClosed({ topicId: id, actorId: "manager", isClosed: true, expectedClosureVersion: 0 }))
        .rejects.toBeInstanceOf(ForumStateConflictError);
      expect(await changes(id)).toEqual([
        { action: "topic.closed", context: { before: false, after: true, previousVersion: 0, version: 1 }, reason: null },
        { action: "topic.reopened", context: { before: true, after: false, previousVersion: 1, version: 2 }, reason: null },
      ]);
    }
    expect(await forum.createPost(reply("closure-topic", "after-reopen"))).toMatchObject({ id: "after-reopen" });
  });

  it("fails closed on invalid version, missing topic and exhausted version", async () => {
    for (const version of [-1, 1.5, 2_147_483_648]) {
      expect(() => forum.setTopicClosed({ topicId: "closure-topic", actorId: "manager",
        isClosed: true, expectedClosureVersion: version })).toThrow(InvalidForumContentError);
    }
    await expect(forum.setTopicClosed({ topicId: "missing", actorId: "manager", isClosed: true,
      expectedClosureVersion: 0 })).rejects.toBeInstanceOf(ForumEntityNotFoundError);
    await client.query("update forum_topics set closure_version=2147483647 where id='closure-topic'");
    await expect(forum.setTopicClosed({ topicId: "closure-topic", actorId: "manager", isClosed: true,
      expectedClosureVersion: 2147483647 })).rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await state("closure-topic")).toEqual({ is_closed: false, closure_version: 2147483647 });
    await client.query("update forum_topics set closure_version=2 where id='closure-topic'");
  });

  it("rolls back closure and version if significant History append fails", async () => {
    await createTopic("closure-rollback");
    await client.query(`create function reject_ap08_closure_history() returns trigger language plpgsql as $$
      begin if new.action = 'topic.closed' and new.target_id = 'closure-rollback'
        then raise exception 'test History failure'; end if; return new; end $$`);
    await client.query("create trigger reject_ap08_closure_history before insert on admin_history for each row execute function reject_ap08_closure_history()");
    try {
      await expect(forum.setTopicClosed({ topicId: "closure-rollback", actorId: "manager",
        isClosed: true, expectedClosureVersion: 0 })).rejects.toMatchObject({
          cause: { message: "test History failure" },
        });
      expect(await state("closure-rollback")).toEqual({ is_closed: false, closure_version: 0 });
      expect(await changes("closure-rollback")).toEqual([]);
    } finally {
      await client.query("drop trigger reject_ap08_closure_history on admin_history");
      await client.query("drop function reject_ap08_closure_history()");
    }
  });

  it("blocks behind the existing topic-row transaction and sees committed state", async () => {
    await createTopic("closure-lock");
    const holder = new Client({ connectionString: url, options: `-c search_path=${schema}` });
    await holder.connect();
    try {
      await holder.query("begin");
      await holder.query("select id from forum_topics where id='closure-lock' for update");
      const pending = forum.setTopicClosed({ topicId: "closure-lock", actorId: "manager",
        isClosed: true, expectedClosureVersion: 0 });
      await waitForRowWait();
      expect(await state("closure-lock")).toEqual({ is_closed: false, closure_version: 0 });
      await holder.query("commit");
      expect(await pending).toMatchObject({ changed: true, closureVersion: 1 });
      expect(await state("closure-lock")).toEqual({ is_closed: true, closure_version: 1 });
    } finally {
      await holder.query("rollback").catch(() => {});
      await holder.end();
    }
  });

  it("keeps a rejected attachment-only reply operation and its selection usable after reopen", async () => {
    const topicId = "closure-staged-attachment";
    await createTopic(topicId);
    const draftId = crypto.randomUUID(), attachmentId = crypto.randomUUID();
    const contextKey = `topic:${topicId}:reply`;
    await attachments.createDraftAttachment({
      id: attachmentId, ownerId: "author", contextKey, draftId,
      objectKey: `private/${crypto.randomUUID()}`, fileName: "staged.txt",
      declaredMime: "text/plain", detectedType: "text", responseMime: "text/plain",
      byteSize: 12, verificationStatus: "type-checked",
    });
    const input = {
      ...reply(topicId, "attachment-after-reopen"),
      bodyRevision: {
        id: "attachment-after-reopen-revision", originalContent: "", sourceLocale: "en",
      },
      publishedDraft: { contextKey, draftId, attachmentIds: [attachmentId] },
    };
    const effects = async () => (await client.query<{
      post_count: number; revision_count: number; notification_count: number; receipt_count: number;
    }>(`select
      (select count(*)::int from forum_posts where topic_id=$1) as post_count,
      (select count(*)::int from forum_post_revisions r join forum_posts p on p.id=r.post_id where p.topic_id=$1) as revision_count,
      (select count(*)::int from forum_reply_notifications where topic_id=$1) as notification_count,
      (select count(*)::int from forum_publication_receipts where topic_id=$1) as receipt_count
    `, [topicId])).rows[0];
    const before = await effects();
    await forum.setTopicClosed({ topicId, actorId: "manager", isClosed: true, expectedClosureVersion: 0 });
    const beforeCooldown = tick;
    await expect(forum.createPost(input)).rejects.toBeInstanceOf(ForumTopicClosedError);
    expect(tick).toBe(beforeCooldown);
    expect(await effects()).toEqual(before);
    expect(await attachments.readDraftAttachment("author", contextKey, draftId, attachmentId))
      .toMatchObject({ id: attachmentId });
    expect((await client.query(
      "select 1 from forum_attachment_draft_refs where draft_id=$1 and attachment_id=$2",
      [draftId, attachmentId],
    )).rowCount).toBe(1);
    await forum.setTopicClosed({ topicId, actorId: "manager", isClosed: false, expectedClosureVersion: 1 });
    const posted = await forum.createPost(input);
    expect(posted.id).toBe(input.id);
    expect((await client.query(
      "select 1 from forum_post_attachments where post_id=$1 and attachment_id=$2",
      [posted.id, attachmentId],
    )).rowCount).toBe(1);
    expect((await effects()).post_count).toBe(before.post_count + 1);
    expect(await changes(topicId)).toHaveLength(2);
  });

  it("preserves a committed publication receipt across closure and rejects changed retries", async () => {
    await createTopic("closure-receipt");
    const topicId = "closure-receipt", draftId = crypto.randomUUID();
    const attachmentId = crypto.randomUUID(), contextKey = `topic:${topicId}:reply`;
    await attachments.createDraftAttachment({
      id: attachmentId, ownerId: "author", contextKey, draftId,
      objectKey: `private/${crypto.randomUUID()}`, fileName: "published.txt",
      declaredMime: "text/plain", detectedType: "text", responseMime: "text/plain",
      byteSize: 12, verificationStatus: "type-checked",
    });
    const request = {
      ...reply(topicId, "receipt-post"),
      publishedDraft: { contextKey, draftId, attachmentIds: [attachmentId] },
    };
    const first = await forum.createPost(request);
    const before = await client.query<{ count: string }>(
      "select count(*)::text as count from forum_posts where topic_id=$1", [topicId]);
    const beforeReceipts = await client.query<{ count: string }>(
      "select count(*)::text as count from forum_publication_receipts where topic_id=$1", [topicId]);
    await forum.setTopicClosed({ topicId, actorId: "manager", isClosed: true, expectedClosureVersion: 0 });
    expect((await forum.createPost({ ...request, id: "replayed-different-id" })).id).toBe(first.id);
    await expect(forum.createPost({ ...request, id: "changed-fingerprint",
      bodyRevision: { ...request.bodyRevision, originalContent: "changed" } }))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    await expect(forum.createPost(reply(topicId, "fresh-blocked")))
      .rejects.toBeInstanceOf(ForumTopicClosedError);
    expect(await client.query("select post_id from forum_post_attachments where attachment_id=$1", [attachmentId]))
      .toMatchObject({ rowCount: 1 });
    expect(await changes(topicId)).toHaveLength(1);
    expect((await client.query<{ count: string }>(
      "select count(*)::text as count from forum_posts where topic_id=$1", [topicId])).rows).toEqual(before.rows);
    expect((await client.query<{ count: string }>(
      "select count(*)::text as count from forum_publication_receipts where topic_id=$1", [topicId])).rows).toEqual(beforeReceipts.rows);
  });
});
