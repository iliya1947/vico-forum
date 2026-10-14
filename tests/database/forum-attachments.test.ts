import { readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool, type DatabaseError } from "pg";
import { RouterContextProvider } from "react-router";
import { authSessionContext, type AuthSession } from "../../app/auth/request-context";
import { sectionAction, helpSolutionsCategoryAction, topicAction } from "../../app/forum/actions.server";
import { forumWriterContext } from "../../app/forum/request-context";
import { createHyperdriveForumWriter } from "../../db/hyperdrive-forum";
import { authorizationContext } from "../../app/authorization/request-context";
import { forumAttachmentStoreContext, privateAttachmentBucketContext } from "../../app/forum/attachment-request-context";
import { forumDraftStoreContext } from "../../app/forum/draft-request-context";
import { action as uploadAction } from "../../app/routes/attachment-upload";
import { ForumAttachmentStorageUnavailableError } from "../../db/hyperdrive-forum-attachments";
import type { RecordAttachmentSecurityEventInput } from "../../db/forum-attachments";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { DrizzleForumAttachments, ForumAttachmentDraftConflictError, InvalidForumAttachmentError, type CreateDraftAttachmentInput } from "../../db/forum-attachments";
import { DrizzleForumRepository, ForumStateConflictError } from "../../db/forum-repository";
import { HELP_SOLUTIONS_CATEGORY_ID, HELP_SOLUTIONS_SERVICE_SECTION_ID } from "../../db/forum-identifiers";
import { lockAttachmentDraftScope } from "../../db/attachment-draft-generation";
import { DrizzleForumEditorDrafts } from "../../db/forum-editor-drafts";
import { ForumAttachmentCleanup, ATTACHMENT_CLEANUP_CLAIM_LEASE_MS } from "../../db/forum-attachment-cleanup";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const url = new URL(databaseUrl);
if (!["localhost", "127.0.0.1"].includes(url.hostname) || !url.pathname.endsWith("_test")) {
  throw new Error("Disposable local test database required");
}

const schema = "forum_attachments_test";
const client = new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
const store = new DrizzleForumAttachments(drizzle(client));
const migrations = [
  "0000_tan_johnny_storm", "0001_seed-locales", "0002_ui_translation_storage",
  "0003_gorgeous_donald_blake", "0004_forum_domain_foundation",
  "0005_calm_proemial_gods", "0006_loving_sentinels",
  "0021_forum_tags", "0022_forum_reply_relationships", "0024_forum_reply_notifications",
  "0025_forum_topic_pins", "0026_best_answer_independent_from_solved",
  "0027_help_solutions_foundation", "0028_help_solution_moderation",
  "0029_help_question_needs_details", "0030_help_duplicate_workflow",
  "0031_help_user_moderation_signals", "0032_forum_profiles", "0033_forum_online_presence",
  "0034_forum_editor_drafts", "0035_forum_attachments_foundation",
  "0036_forum_attachment_security_events",
  "0037_forum_attachment_draft_generations", "0038_forum_attachment_cleanup_claims",
];

const ownerId = "attachment-owner";
const otherId = "attachment-other";
const attachmentId = "23b93562-0550-4eef-88af-f951d6ea6138";
const draftId = "76568e3b-7cf0-4f32-9847-051d5a9b8071";
const contextKey = "topic:attachment-topic:reply";

async function setDraft(owner: string, context: string, generation: string, status = "active", version = 1) {
  await client.query(
    `insert into forum_editor_drafts (owner_id, context_key, draft_id, version, status, payload, edited_at, updated_at)
     values ($1, $2, $3, $4, $5, '{"title":"","body":"kept text","tags":""}', now(), now())
     on conflict (owner_id, context_key) do update set draft_id = excluded.draft_id,
       version = excluded.version, status = excluded.status`,
    [owner, context, generation, version, status],
  );
}

function upload(context: string, generation: string, id = crypto.randomUUID()): CreateDraftAttachmentInput {
  return {
    id, ownerId, contextKey: context, draftId: generation,
    objectKey: `private/${crypto.randomUUID()}`, fileName: "concurrent.txt",
    declaredMime: "text/plain", detectedType: "text", responseMime: "text/plain; charset=utf-8",
    byteSize: 12, verificationStatus: "type-checked",
  };
}

async function queuedOperations<T, U>(
  context: string,
  first: (store: DrizzleForumAttachments, repository: DrizzleForumRepository) => Promise<T>,
  second: (store: DrizzleForumAttachments, repository: DrizzleForumRepository) => Promise<U>,
): Promise<[T, U]> {
  const connections = Array.from({ length: 3 }, () => new Client({
    connectionString: databaseUrl, options: `-c search_path=${schema}`,
  }));
  await Promise.all(connections.map((connection) => connection.connect()));
  const [blocker, firstConnection, secondConnection] = connections;
  async function waitForLock(connection: Client) {
    const { rows: [{ pid }] } = await connection.query<{ pid: number }>("select pg_backend_pid() as pid");
    return pid;
  }
  const firstPid = await waitForLock(firstConnection);
  const secondPid = await waitForLock(secondConnection);
  async function waiting(pid: number) {
    for (let attempt = 0; attempt < 250; attempt++) {
      await blocker.query("select pg_stat_clear_snapshot()");
      const result = await blocker.query<{ waiting: boolean }>(
        "select wait_event = 'advisory' as waiting from pg_stat_activity where pid = $1", [pid],
      );
      if (result.rows[0]?.waiting) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("attachment operation did not wait for its scope lock");
  }
  let firstResult: Promise<T> | undefined;
  let secondResult: Promise<U> | undefined;
  try {
    await blocker.query("begin");
    await lockAttachmentDraftScope(drizzle(blocker), ownerId, context);
    firstResult = first(new DrizzleForumAttachments(drizzle(firstConnection)),
      new DrizzleForumRepository(drizzle(firstConnection), { cooldownMs: 0, now: () => new Date() }));
    void firstResult.catch(() => {});
    await waiting(firstPid);
    secondResult = second(new DrizzleForumAttachments(drizzle(secondConnection)),
      new DrizzleForumRepository(drizzle(secondConnection), { cooldownMs: 0, now: () => new Date() }));
    void secondResult.catch(() => {});
    await waiting(secondPid);
    await blocker.query("commit");
    return await Promise.all([firstResult, secondResult]);
  } finally {
    await blocker.query("rollback");
    await Promise.allSettled([firstResult, secondResult]);
    await Promise.all(connections.map((connection) => connection.end()));
  }
}

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const tag of migrations) {
    await client.query((await readFile(`drizzle/${tag}.sql`, "utf8")).replaceAll('"public".', `"${schema}".`));
  }

  for (const id of [ownerId, otherId]) {
    await client.query('insert into "user" (id, name, email) values ($1, $2, $3)', [
      id, id, `${id}@test.invalid`,
    ]);
  }
  await client.query(
    "insert into forum_categories (id, name) values ('attachment-category', 'Attachments')",
  );
  await client.query(
    "insert into forum_sections (id, category_id, name) values ('attachment-section', 'attachment-category', 'Files')",
  );
  await client.query("begin");
  await client.query(
    "insert into forum_topics (id, section_id, author_id, current_title_revision_id) values ('attachment-topic', 'attachment-section', $1, 'attachment-title-rev')",
    [ownerId],
  );
  await client.query(
    "insert into forum_topic_title_revisions (id, topic_id, author_id, original_content, source_locale) values ('attachment-title-rev', 'attachment-topic', $1, 'Attachment topic', 'en')",
    [ownerId],
  );
  await client.query(
    "insert into forum_posts (id, topic_id, author_id, current_revision_id) values ('attachment-post', 'attachment-topic', $1, 'attachment-body-rev')",
    [ownerId],
  );
  await client.query(
    "insert into forum_post_revisions (id, post_id, author_id, original_content, source_locale) values ('attachment-body-rev', 'attachment-post', $1, 'Attachment body', 'en')",
    [ownerId],
  );
  await client.query("commit");
});

afterAll(async () => {
  await client.query(`drop schema if exists ${schema} cascade`);
  await client.end();
});

describe("forum attachment lifecycle foundation", () => {
  it("creates an owner-private draft reference without forcing a server draft save", async () => {
    const created = await store.createDraftAttachment({
      id: attachmentId,
      ownerId,
      contextKey,
      draftId,
      objectKey: "private/8cd55954-9cb6-48fd-a42f-e4a5e85ae90c",
      fileName: "example.txt",
      declaredMime: "text/plain",
      detectedType: "text",
      responseMime: "text/plain; charset=utf-8",
      byteSize: 12,
      verificationStatus: "type-checked",
    });
    expect(created).toMatchObject({
      id: attachmentId,
      fileName: "example.txt",
      verificationStatus: "type-checked",
    });

    const draftRows = await client.query<{ count: string }>(
      "select count(*)::text as count from forum_editor_drafts",
    );
    expect(draftRows.rows[0]?.count).toBe("0");
    expect(await store.listDraftAttachments(ownerId, contextKey, draftId)).toHaveLength(1);
    expect(await store.listDraftAttachments(otherId, contextKey, draftId)).toEqual([]);

    const retried = await store.createDraftAttachment({
      id: attachmentId,
      ownerId,
      contextKey,
      draftId,
      objectKey: "private/11f6fb5c-8ca9-4b47-a456-0cbdb8a92dd0",
      fileName: "changed-name.txt",
      declaredMime: "text/plain",
      detectedType: "text",
      responseMime: "text/plain; charset=utf-8",
      byteSize: 99,
      verificationStatus: "type-checked",
    });
    expect(retried.objectKey).toBe("private/8cd55954-9cb6-48fd-a42f-e4a5e85ae90c");
    expect(retried.fileName).toBe("example.txt");
    expect(await store.listDraftAttachments(ownerId, contextKey, draftId)).toHaveLength(1);
  });

  it("rolls back asset creation when the uploader identity does not exist", async () => {
    const id = "9ca389ff-e74a-4f61-89b2-67072d02686c";
    await expect(store.createDraftAttachment({
      id,
      ownerId: "missing-owner",
      contextKey,
      draftId,
      objectKey: "private/e8aff4de-a525-448a-a030-24034e67bdfa",
      fileName: "missing.txt",
      declaredMime: "text/plain",
      detectedType: "text",
      responseMime: "text/plain; charset=utf-8",
      byteSize: 1,
      verificationStatus: "type-checked",
    })).rejects.toMatchObject({ cause: { code: "23503" } });
    const rows = await client.query("select id from forum_attachments where id = $1", [id]);
    expect(rows.rowCount).toBe(0);
  });

  it("database-enforces draft-reference ownership", async () => {
    await expect(client.query(
      "insert into forum_attachment_draft_refs (attachment_id, owner_id, context_key, draft_id, created_at) values ($1, $2, $3, $4, now())",
      [attachmentId, otherId, contextKey, "c526541e-a1ff-4b80-bcbf-6b20ec30ce74"],
    )).rejects.toMatchObject({ code: "23503" } satisfies Partial<DatabaseError>);
  });

  it("atomically rebinds only owned references between draft generations and remains idempotent", async () => {
    const nextDraftId = "c526541e-a1ff-4b80-bcbf-6b20ec30ce74";
    await setDraft(ownerId, contextKey, nextDraftId);
    await setDraft(otherId, contextKey, nextDraftId);
    expect(await store.rebindDraftAttachments(otherId, contextKey, draftId, nextDraftId, 1)).toBe(0);
    expect(await store.rebindDraftAttachments(ownerId, contextKey, draftId, nextDraftId, 1)).toBe(1);
    expect(await store.listDraftAttachments(ownerId, contextKey, draftId)).toHaveLength(1);
    expect(await store.listDraftAttachments(ownerId, contextKey, nextDraftId)).toHaveLength(1);
    expect(await store.rebindDraftAttachments(ownerId, contextKey, draftId, nextDraftId, 1)).toBe(0);
    await expect(store.rebindDraftAttachments(ownerId, contextKey, nextDraftId, draftId, 1))
      .rejects.toBeInstanceOf(ForumAttachmentDraftConflictError);
    expect(await store.listDraftAttachments(ownerId, contextKey, draftId)).toHaveLength(1);
    const rows = await client.query<{ draft_id: string }>(
      "select draft_id from forum_attachment_draft_refs where attachment_id = $1", [attachmentId],
    );
    expect(rows.rows).toEqual([{ draft_id: nextDraftId }]);
  });

  it("enforces one derived security event across concurrent database writers", async () => {
    const uploadId = `attachment-v1:${"a".repeat(64)}`;
    const event = {
      uploadId, uploadedByUserId: ownerId, contextKey, draftId,
      fileName: "retry.txt", declaredMime: "text/plain", detectedType: "executable",
      reason: "executable-signature", declaredByteSize: 4,
    };
    const connections = Array.from({ length: 2 }, () => new Client({
      connectionString: databaseUrl, options: `-c search_path=${schema}`,
    }));
    await Promise.all(connections.map((connection) => connection.connect()));
    try {
      await Promise.all(connections.map((connection) =>
        new DrizzleForumAttachments(drizzle(connection)).recordSecurityEvent(event)));
    } finally {
      await Promise.all(connections.map((connection) => connection.end()));
    }
    const rows = await client.query("select id, upload_id from forum_attachment_security_events where upload_id = $1", [uploadId]);
    expect(rows.rowCount).toBe(1);
    expect(rows.rows[0]?.id).toMatch(/^[0-9a-f-]{36}$/u);
    await expect(store.recordSecurityEvent({ ...event, uploadId: "attachment-v1:invalid" }))
      .rejects.toBeInstanceOf(InvalidForumAttachmentError);
    // Other tests assert a fresh, single-event queue; do not leak this fixture.
    await client.query("delete from forum_attachment_security_events where upload_id = $1", [uploadId]);
  });

  it("durably records one security event per upload even without an attachment row", async () => {
    const uploadId = "137b6246-8d59-4f20-a8dc-6fd3d54f0e86";
    const event = {
      uploadId,
      uploadedByUserId: ownerId,
      contextKey,
      draftId,
      fileName: "masked\\u202Etxt.exe",
      declaredMime: "text/plain",
      detectedType: "executable",
      reason: "executable-signature",
      declaredByteSize: 4,
    };
    await store.recordSecurityEvent(event);
    await store.recordSecurityEvent(event);

    const events = await store.readSecurityAttachmentEvents(0);
    expect(events.events).toHaveLength(1);
    expect(events.hasMore).toBe(false);
    expect(events.events[0]).toMatchObject(event);
    expect(events.events[0]?.id).toMatch(/^[0-9a-f-]{36}$/u);

    const attachment = await client.query(
      "select id from forum_attachments where id = $1",
      [uploadId],
    );
    expect(attachment.rowCount).toBe(0);
  });

  it("allows draft and published references to coexist and protects shared assets from deletion", async () => {
    await client.query(
      "insert into forum_post_attachments (post_id, attachment_id, created_at) values ('attachment-post', $1, now())",
      [attachmentId],
    );

    await expect(client.query(
      "delete from forum_attachments where id = $1",
      [attachmentId],
    )).rejects.toMatchObject({ code: "23503" } satisfies Partial<DatabaseError>);

    await client.query("delete from forum_posts where id = 'attachment-post'");
    const postRefs = await client.query(
      "select 1 from forum_post_attachments where attachment_id = $1",
      [attachmentId],
    );
    expect(postRefs.rowCount).toBe(0);
    expect(await store.listDraftAttachments(ownerId, contextKey, draftId)).toHaveLength(1);

    expect(await store.removeDraftAttachment(ownerId, contextKey, draftId, attachmentId)).toBe(true);
    expect(await store.removeDraftAttachment(ownerId, contextKey, draftId, attachmentId)).toBe(false);
    const deleted = await client.query(
      "delete from forum_attachments where id = $1 returning id",
      [attachmentId],
    );
    expect(deleted.rows).toEqual([{ id: attachmentId }]);
  });

  it.each(["upload-first", "rebind-first"] as const)(
    "retains late uploads when concurrent operations commit %s, including an empty source",
    async (order) => {
      const context = `topic:${order}:reply`;
      const source = crypto.randomUUID();
      const target = crypto.randomUUID();
      const input = upload(context, source);
      await setDraft(ownerId, context, target, "active", 4);
      const before = await client.query("select * from forum_editor_drafts where owner_id = $1 and context_key = $2", [ownerId, context]);
      const create = (repository: DrizzleForumAttachments) => repository.createDraftAttachment(input);
      const rebind = (repository: DrizzleForumAttachments) => repository.rebindDraftAttachments(ownerId, context, source, target, 4);
      if (order === "upload-first") {
        const [created, moved] = await queuedOperations(context, create, rebind);
        expect(created.id).toBe(input.id);
        expect(moved).toBe(1);
      } else {
        const [moved, created] = await queuedOperations(context, rebind, create);
        expect(moved).toBe(0);
        expect(created.id).toBe(input.id);
      }
      expect((await store.listDraftAttachments(ownerId, context, target)).map((item) => item.id)).toEqual([input.id]);
      expect((await store.listDraftAttachments(ownerId, context, source)).map((item) => item.id)).toEqual([input.id]);
      const refs = await client.query("select draft_id from forum_attachment_draft_refs where attachment_id = $1", [input.id]);
      expect(refs.rows).toEqual([{ draft_id: target }]);
      const after = await client.query("select * from forum_editor_drafts where owner_id = $1 and context_key = $2", [ownerId, context]);
      expect(after.rows).toEqual(before.rows);
    },
  );

  it("converges concurrent retries on one asset and never resurrects an explicitly removed ref", async () => {
    const context = "topic:concurrent-retry:reply";
    const source = crypto.randomUUID();
    const target = crypto.randomUUID();
    const first = upload(context, source);
    const retry = { ...first, objectKey: `private/${crypto.randomUUID()}` };
    const [original, duplicate] = await queuedOperations(context,
      (repository) => repository.createDraftAttachment(first),
      (repository) => repository.createDraftAttachment(retry));
    expect(duplicate).toEqual(original);
    expect(await store.listDraftAttachments(ownerId, context, source)).toHaveLength(1);
    await setDraft(ownerId, context, target);
    expect(await store.rebindDraftAttachments(ownerId, context, source, target, 1)).toBe(1);
    expect(await store.createDraftAttachment(retry)).toEqual(original);
    expect(await store.removeDraftAttachment(ownerId, context, source, first.id)).toBe(true);
    expect(await store.removeDraftAttachment(ownerId, context, target, first.id)).toBe(false);
    await expect(store.createDraftAttachment(retry)).rejects.toBeInstanceOf(InvalidForumAttachmentError);
    expect(await store.listDraftAttachments(ownerId, context, target)).toEqual([]);
  });

  it.each(["remove-first", "rebind-first"] as const)(
    "preserves removal intent across a concurrent generation move committing %s",
    async (order) => {
      const context = `topic:${order}:reply`;
      const source = crypto.randomUUID();
      const target = crypto.randomUUID();
      const input = upload(context, source);
      await store.createDraftAttachment(input);
      await setDraft(ownerId, context, target);
      const remove = (repository: DrizzleForumAttachments) => repository.removeDraftAttachment(ownerId, context, source, input.id);
      const rebind = (repository: DrizzleForumAttachments) => repository.rebindDraftAttachments(ownerId, context, source, target, 1);
      if (order === "remove-first") {
        const [removed, moved] = await queuedOperations(context, remove, rebind);
        expect(removed).toBe(true);
        expect(moved).toBe(0);
      } else {
        const [moved, removed] = await queuedOperations(context, rebind, remove);
        expect(moved).toBe(1);
        expect(removed).toBe(true);
      }
      expect(await store.listDraftAttachments(ownerId, context, target)).toEqual([]);
    },
  );

  it("fences stale, reverse and terminal moves while following chained generation aliases", async () => {
    const context = "topic:chained-generation:reply";
    const source = crypto.randomUUID();
    const middle = crypto.randomUUID();
    const target = crypto.randomUUID();
    const input = upload(context, source);
    await store.createDraftAttachment(input);
    await setDraft(ownerId, context, middle);
    await expect(store.rebindDraftAttachments(ownerId, context, source, middle, 2))
      .rejects.toBeInstanceOf(ForumAttachmentDraftConflictError);
    expect(await store.rebindDraftAttachments(ownerId, context, source, middle, 1)).toBe(1);
    await setDraft(ownerId, context, target, "active", 2);
    expect(await store.rebindDraftAttachments(ownerId, context, source, target, 2)).toBe(1);
    for (const generation of [source, middle, target]) {
      expect((await store.listDraftAttachments(ownerId, context, generation)).map((item) => item.id)).toEqual([input.id]);
    }
    await expect(store.rebindDraftAttachments(ownerId, context, source, middle, 1))
      .rejects.toBeInstanceOf(ForumAttachmentDraftConflictError);
    // Even a fabricated active row cannot turn an already redirected generation into a root.
    await setDraft(ownerId, context, middle, "active", 3);
    await expect(store.rebindDraftAttachments(ownerId, context, target, middle, 3))
      .rejects.toBeInstanceOf(ForumAttachmentDraftConflictError);
    await setDraft(ownerId, context, target, "deleted", 4);
    await expect(store.rebindDraftAttachments(ownerId, context, source, target, 4))
      .rejects.toBeInstanceOf(ForumAttachmentDraftConflictError);
    await expect(store.createDraftAttachment(upload(context, source)))
      .rejects.toBeInstanceOf(ForumAttachmentDraftConflictError);
    await expect(store.createDraftAttachment({ ...input, objectKey: `private/${crypto.randomUUID()}` }))
      .rejects.toBeInstanceOf(ForumAttachmentDraftConflictError);
    expect(await store.listDraftAttachments(otherId, context, source)).toEqual([]);
    expect(await store.listDraftAttachments(ownerId, "topic:unrelated-context:reply", source)).toEqual([]);
  });

  it("rejects a terminal same-generation upload without creating its asset", async () => {
    const context = "topic:terminal-upload:reply";
    const generation = crypto.randomUUID();
    const input = upload(context, generation);
    await setDraft(ownerId, context, generation, "published", 7);
    await expect(store.createDraftAttachment(input)).rejects.toMatchObject({ reason: "gone" });
    const assets = await client.query("select id from forum_attachments where id = $1", [input.id]);
    expect(assets.rows).toEqual([]);
  });

  it.each(["published", "deleted", "expired"] as const)("keeps a %s generation closed after the text draft advances", async (terminal) => {
    const context = "section:attachment-section:new";
    const completed = crypto.randomUUID();
    const fresh = crypto.randomUUID();
    const drafts = new DrizzleForumEditorDrafts(drizzle(client));
    await setDraft(ownerId, context, completed);
    if (terminal === "published") {
      expect(await drafts.finish(ownerId, context, completed, "published")).toBe(true);
    } else if (terminal === "deleted") {
      expect(await drafts.delete(ownerId, context, completed, 1)).toBe(true);
    } else {
      await client.query("update forum_editor_drafts set edited_at = now() - interval '31 days' where owner_id = $1 and context_key = $2", [ownerId, context]);
      await drafts.purgeExpired(ownerId);
    }
    expect((await drafts.save(ownerId, context, fresh, { title: "Fresh", body: "new text", tags: "" }, 2)).outcome).toBe("saved");
    await expect(store.createDraftAttachment(upload(context, completed)))
      .rejects.toMatchObject({ reason: "gone" });
    await expect(store.rebindDraftAttachments(ownerId, context, completed, fresh, 3))
      .rejects.toMatchObject({ reason: "gone" });
    expect(await store.createDraftAttachment(upload(context, fresh))).toMatchObject({ fileName: "concurrent.txt" });
  });

  it("migrates existing terminal drafts into durable attachment retirement", async () => {
    const migrationSchema = `attachment_backfill_${crypto.randomUUID().replaceAll("-", "")}`;
    const connection = new Client({ connectionString: databaseUrl, options: `-c search_path=${migrationSchema}` });
    await client.query(`create schema ${migrationSchema}`);
    await connection.connect();
    try {
      for (const tag of migrations.slice(0, -2)) {
        await connection.query((await readFile(`drizzle/${tag}.sql`, "utf8")).replaceAll('"public".', `"${migrationSchema}".`));
      }
      await connection.query('insert into "user" (id, name, email) values ($1, $1, $2)', [ownerId, `${ownerId}@test.invalid`]);
      const retired = crypto.randomUUID();
      const fresh = crypto.randomUUID();
      await connection.query(`insert into forum_editor_drafts (owner_id, context_key, draft_id, version, status, payload, edited_at, updated_at)
        values ($1, 'help:new', $2, 1, 'published', '{"title":"","body":"","tags":""}', now(), now())`, [ownerId, retired]);
      await connection.query((await readFile("drizzle/0037_forum_attachment_draft_generations.sql", "utf8")).replaceAll('"public".', `"${migrationSchema}".`));
      await connection.query((await readFile("drizzle/0038_forum_attachment_cleanup_claims.sql", "utf8")).replaceAll('"public".', `"${migrationSchema}".`));
      const drafts = new DrizzleForumEditorDrafts(drizzle(connection));
      expect((await drafts.save(ownerId, "help:new", fresh, { title: "Fresh", body: "new", tags: "" }, 1)).outcome).toBe("saved");
      const attachments = new DrizzleForumAttachments(drizzle(connection));
      await expect(attachments.createDraftAttachment(upload("help:new", retired)))
        .rejects.toMatchObject({ reason: "gone" });
      expect(await attachments.createDraftAttachment(upload("help:new", fresh))).toMatchObject({ fileName: "concurrent.txt" });
    } finally {
      await connection.end();
      await client.query(`drop schema ${migrationSchema} cascade`);
    }
  });

  it("runs upload retry and generation moves with the actual attachment runtime grants", async () => {
    const role = `vico_attachment_${crypto.randomUUID().replaceAll("-", "")}`;
    const context = "topic:runtime-attachment:reply";
    const source = crypto.randomUUID();
    const target = crypto.randomUUID();
    const input = upload(context, source);
    await setDraft(ownerId, context, target);
    await client.query(`create role ${role}`);
    const runtime = new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
    try {
      await client.query(`grant usage on schema ${schema} to ${role}`);
      await client.query(`grant select, insert on forum_attachments, forum_attachment_draft_generations to ${role}`);
      await client.query(`grant select, insert, delete on forum_attachment_draft_refs to ${role}`);
      await client.query(`grant select, update on forum_editor_drafts to ${role}`);
      await runtime.connect();
      await runtime.query(`set role ${role}`);
      const restricted = new DrizzleForumAttachments(drizzle(runtime));
      const original = await restricted.createDraftAttachment(input);
      expect(await restricted.createDraftAttachment({ ...input, objectKey: `private/${crypto.randomUUID()}` })).toEqual(original);
      expect(await restricted.rebindDraftAttachments(ownerId, context, source, target, 1)).toBe(1);
      expect(await restricted.createDraftAttachment({ ...input, objectKey: `private/${crypto.randomUUID()}` })).toEqual(original);
      expect(await restricted.removeDraftAttachment(ownerId, context, source, input.id)).toBe(true);
    } finally {
      await runtime.end();
      await client.query(`drop owned by ${role}`);
      await client.query(`drop role ${role}`);
    }
  });
});


async function withSecurityUploadRoute(run: (fixture: {
  post(options?: { owner?: string; context?: string; generation?: string; fileName?: string; clientId?: string }): Promise<Response>;
  rows(): Promise<{ id: string; upload_id: string }[]>;
  loseNextAcknowledgement(): void;
}) => Promise<void>): Promise<void> {
  // A pool lets the actual route/repository execute simultaneous INSERTs on
  // independent PostgreSQL connections, rather than a single client's queue.
  const pool = new Pool({ connectionString: databaseUrl, options: `-c search_path=${schema}`, max: 4 });
  const repository = new DrizzleForumAttachments(drizzle(pool));
  const events: RecordAttachmentSecurityEventInput[] = [];
  const clientId = crypto.randomUUID();
  let loseAck = false;
  const bucket = {
    async put(): Promise<never> { throw new Error("Suspicious bytes must not reach private storage"); },
    async get() { return null; },
    async delete() {},
  };
  try {
    await run({
      async post(options = {}) {
        const context = new RouterContextProvider();
        context.set(authSessionContext, { user: { id: options.owner ?? ownerId } } as AuthSession);
        context.set(authorizationContext, { forUser: () => ({ has: async () => true }) } as never);
        context.set(forumDraftStoreContext, { assertContextExists: async () => {} } as never);
        context.set(privateAttachmentBucketContext, bucket);
        context.set(forumAttachmentStoreContext, {
          async recordSecurityEvent(event: RecordAttachmentSecurityEventInput) {
            events.push(event);
            await repository.recordSecurityEvent(event);
            if (loseAck) {
              loseAck = false;
              throw new ForumAttachmentStorageUnavailableError();
            }
          },
        } as never);
        return uploadAction({
          context,
          request: new Request("https://forum.test/api/attachments", {
            method: "POST",
            headers: {
              Origin: "https://forum.test", "Content-Type": "text/plain",
              "X-Vico-Attachment-Id": options.clientId ?? clientId,
              "X-Vico-Attachment-Name": encodeURIComponent(options.fileName ?? "masked.txt"),
              "X-Vico-Attachment-Size": "4",
              "X-Vico-Draft-Context": encodeURIComponent(options.context ?? contextKey),
              "X-Vico-Draft-Id": options.generation ?? draftId,
            },
            body: new Uint8Array([0x4d, 0x5a, 0x90, 0x00]).buffer,
          }),
        });
      },
      async rows() {
        const result = await client.query<{ id: string; upload_id: string }>(
          "select id, upload_id from forum_attachment_security_events where upload_id = ANY($1::text[])",
          [events.map((event) => event.uploadId)],
        );
        return result.rows;
      },
      loseNextAcknowledgement() { loseAck = true; },
    });
    const attachments = await client.query("select id from forum_attachments where id = $1", [clientId]);
    expect(attachments.rowCount).toBe(0);
  } finally {
    await client.query("delete from forum_attachment_security_events where upload_id = ANY($1::text[])",
      [events.map((event) => event.uploadId)]);
    await pool.end();
  }
}

describe("suspicious upload route and PostgreSQL integration", () => {
  it("deduplicates concurrent suspicious requests with independent database connections", async () => {
    await withSecurityUploadRoute(async ({ post, rows }) => {
      const results = await Promise.all([post(), post()]);
      expect(results.map((result) => result.status)).toEqual([422, 422]);
      const recorded = await rows();
      expect(recorded).toHaveLength(1);
      expect(recorded[0]!.id).toMatch(/^[0-9a-f-]{36}$/u);
      expect(recorded[0]!.upload_id).toMatch(/^attachment-v1:[0-9a-f]{64}$/u);
    });
  });

  it("converges after the real event commit is acknowledged as unavailable", async () => {
    await withSecurityUploadRoute(async ({ post, rows, loseNextAcknowledgement }) => {
      loseNextAcknowledgement();
      expect((await post()).status).toBe(503);
      expect((await rows())).toHaveLength(1);
      expect((await post()).status).toBe(422);
      expect((await rows())).toHaveLength(1);
    });
  });

  it("preserves distinct owners, contexts, draft IDs and changed rejection evidence", async () => {
    await withSecurityUploadRoute(async ({ post, rows }) => {
      const requests = [
        {}, { owner: otherId }, { context: "topic:other-context:reply" },
        { generation: crypto.randomUUID() }, { fileName: "different.txt" },
      ];
      for (const options of requests) expect((await post(options)).status).toBe(422);
      const recorded = await rows();
      expect(recorded).toHaveLength(5);
      expect(new Set(recorded.map((event) => event.id)).size).toBe(5);
    });
  });
});


describe("atomic publication of selected draft refs", () => {
  it.each(["create-topic", "help-question"] as const)(
    "atomically publishes initial post attachments for %s",
    async (kind) => {
      const isHelp = kind === "help-question";
      const sectionId = isHelp ? HELP_SOLUTIONS_SERVICE_SECTION_ID : `attachment-section-${crypto.randomUUID()}`;
      if (!isHelp) await repository.createSection({
        id: sectionId, categoryId: "attachment-category", name: "Publication section",
      });
      const context = isHelp ? "help:new" : `section:${sectionId}:new`;
      const draft = crypto.randomUUID();
      const asset = await store.createDraftAttachment(upload(context, draft));
      const topicId = crypto.randomUUID();
      const postId = crypto.randomUUID();
      const created = await repository.createTopicWithInitialPost({
        id: topicId, sectionId, authorId: ownerId,
        titleRevision: { id: crypto.randomUUID(), originalContent: "With file", sourceLocale: "en" },
        initialPost: {
          id: postId, topicId, authorId: ownerId,
          bodyRevision: { id: crypto.randomUUID(), originalContent: "File in question", sourceLocale: "en" },
        },
        publishedDraft: { contextKey: context, draftId: draft, expectedVersion: 0, attachmentIds: [asset.id] },
      });
      expect(created.post.id).toBe(postId);
      expect(await store.readPublishedAttachment(postId, asset.id)).toMatchObject({ id: asset.id });
      const loaded = await repository.readTopicPage(topicId);
      expect(loaded?.posts[0]?.attachments).toEqual([{
        id: asset.id, fileName: asset.fileName, byteSize: asset.byteSize,
        detectedType: asset.detectedType,
      }]);
    },
  );

  it.each(["delete-before-publish", "publish-before-delete"] as const)(
    "serializes concurrent DELETE/publication without losing the selected set: %s",
    async (order) => {
      const { topicId, context, draft } = await topicFixture();
      const file = await store.createDraftAttachment(upload(context, draft));
      const makePost = (forum: DrizzleForumRepository) => forum.createPost(reply(topicId, context, draft, [file.id]));
      const remove = (attachments: DrizzleForumAttachments) =>
        attachments.removeDraftAttachment(ownerId, context, draft, file.id);
      if (order === "delete-before-publish") {
        const [removed, published] = await queuedOperations(context,
          (attachments) => remove(attachments),
          (_, forum) => makePost(forum).then(() => "unexpected", (error: unknown) =>
            error instanceof ForumStateConflictError ? "conflict" : Promise.reject(error)),
        );
        expect(removed).toBe(true);
        expect(published).toBe("conflict");
      } else {
        const [published, removed] = await queuedOperations(context,
          (_, forum) => makePost(forum),
          (attachments) => remove(attachments).then(() => "unexpected", (error: unknown) =>
            error instanceof ForumAttachmentDraftConflictError ? "gone" : Promise.reject(error)),
        );
        expect(published.id).toBeDefined();
        expect(removed).toBe("gone");
        expect(await store.readPublishedAttachment(published.id, file.id)).toMatchObject({ id: file.id });
      }
    },
  );

  it.each(["upload-before-publish", "publish-before-upload"] as const)(
    "serializes concurrent POST final persistence/publication: %s",
    async (order) => {
      const { topicId, context, draft } = await topicFixture();
      const file = upload(context, draft);
      const makePost = (forum: DrizzleForumRepository) => forum.createPost(reply(topicId, context, draft, []));
      if (order === "upload-before-publish") {
        const [stored, published] = await queuedOperations(context,
          (attachments) => attachments.createDraftAttachment(file),
          (_, forum) => makePost(forum).then(() => "unexpected", (error: unknown) =>
            error instanceof ForumStateConflictError ? "conflict" : Promise.reject(error)),
        );
        expect(stored.id).toBe(file.id);
        expect(published).toBe("conflict");
        expect(await store.readDraftAttachment(ownerId, context, draft, file.id)).not.toBeNull();
      } else {
        const [published, uploaded] = await queuedOperations(context,
          (_, forum) => makePost(forum),
          (attachments) => attachments.createDraftAttachment(file).then(() => "unexpected", (error: unknown) =>
            error instanceof ForumAttachmentDraftConflictError ? "gone" : Promise.reject(error)),
        );
        expect(published.id).toBeDefined();
        expect(uploaded).toBe("gone");
        expect(await store.readPublishedAttachment(published.id, file.id)).toBeNull();
      }
    },
  );

  it.each(["rebind-before-publication", "publication-before-rebind"] as const)(
    "serializes actual rebind/publication against the selected generation: %s",
    async (order) => {
      const { topicId, context, draft: source } = await topicFixture();
      const target = crypto.randomUUID();
      const file = await store.createDraftAttachment(upload(context, source));
      // A retained source generation is not yet authoritative for B.
      await setDraft(ownerId, context, target, "active", 1);
      const promote = (forum: DrizzleForumRepository) =>
        forum.createPost(reply(topicId, context, target, [file.id], 1));
      const rebind = (attachments: DrizzleForumAttachments) =>
        attachments.rebindDraftAttachments(ownerId, context, source, target, 1);

      if (order === "rebind-before-publication") {
        const [moved, published] = await queuedOperations(context,
          (attachments) => rebind(attachments),
          (_, forum) => promote(forum),
        );
        expect(moved).toBe(1);
        expect(await store.readPublishedAttachment(published.id, file.id)).toMatchObject({ id: file.id });
        const rows = await client.query(
          "select attachment_id from forum_post_attachments where post_id = $1", [published.id],
        );
        expect(rows.rows).toEqual([{ attachment_id: file.id }]);
        await expect(store.listDraftAttachments(ownerId, context, source))
          .rejects.toBeInstanceOf(ForumAttachmentDraftConflictError);
      } else {
        const [result, moved] = await queuedOperations(context,
          (_, forum) => promote(forum).then(
            () => "unexpected",
            (error: unknown) => error instanceof ForumStateConflictError
              ? "conflict" : Promise.reject(error),
          ),
          (attachments) => rebind(attachments),
        );
        expect(result).toBe("conflict");
        expect(moved).toBe(1);
        expect(await store.listDraftAttachments(ownerId, context, target)).toMatchObject([
          { id: file.id },
        ]);
        const later = await repository.createPost(reply(topicId, context, target, [file.id], 1));
        expect(await store.readPublishedAttachment(later.id, file.id)).toMatchObject({ id: file.id });
      }
    },
  );

  const repository = new DrizzleForumRepository(drizzle(client), { cooldownMs: 0, now: () => new Date() });

  async function topicFixture() {
    const topicId = crypto.randomUUID();
    await repository.createTopicWithInitialPost({
      id: topicId, sectionId: "attachment-section", authorId: ownerId,
      titleRevision: { id: crypto.randomUUID(), originalContent: "Publication fixture", sourceLocale: "en" },
      initialPost: {
        id: crypto.randomUUID(), topicId, authorId: ownerId,
        bodyRevision: { id: crypto.randomUUID(), originalContent: "First post", sourceLocale: "en" },
      },
    });
    return { topicId, context: `topic:${topicId}:reply`, draft: crypto.randomUUID() };
  }
  function reply(topicId: string, context: string, draft: string, ids: string[], version = 0) {
    return {
      id: crypto.randomUUID(), topicId, authorId: ownerId,
      bodyRevision: { id: crypto.randomUUID(), originalContent: "Reply with file", sourceLocale: "en" },
      publishedDraft: { contextKey: context, draftId: draft, expectedVersion: version, attachmentIds: ids },
    };
  }

  it("promotes only exact selected refs with a first-save CAS, then revokes draft access", async () => {
    const { topicId, context, draft } = await topicFixture();
    const file = await store.createDraftAttachment(upload(context, draft));
    expect(await store.readDraftAttachment(ownerId, context, draft, file.id)).not.toBeNull();
    expect(await store.readDraftAttachment(otherId, context, draft, file.id)).toBeNull();
    const created = await repository.createPost(reply(topicId, context, draft, [file.id]));
    expect(await store.readPublishedAttachment(created.id, file.id)).toMatchObject({ id: file.id });
    expect(await store.readPublishedAttachment(crypto.randomUUID(), file.id)).toBeNull();
    await expect(store.readDraftAttachment(ownerId, context, draft, file.id))
      .rejects.toBeInstanceOf(ForumAttachmentDraftConflictError);
    const moved = await client.query("select attachment_id from forum_post_attachments where post_id = $1", [created.id]);
    expect(moved.rows).toEqual([{ attachment_id: file.id }]);
    const shared = await repository.createPost({
      id: crypto.randomUUID(), topicId, authorId: ownerId,
      bodyRevision: { id: crypto.randomUUID(), originalContent: "Shared file", sourceLocale: "en" },
    });
    await client.query(
      "insert into forum_post_attachments (post_id, attachment_id, created_at) values ($1, $2, now())",
      [shared.id, file.id],
    );
    await client.query("delete from forum_posts where id = $1", [created.id]);
    expect(await store.readPublishedAttachment(created.id, file.id)).toBeNull();
    expect(await store.readPublishedAttachment(shared.id, file.id)).toMatchObject({ id: file.id });
    await client.query(
      "delete from forum_post_attachments where post_id = $1 and attachment_id = $2",
      [shared.id, file.id],
    );
    expect(await store.readPublishedAttachment(shared.id, file.id)).toBeNull();
  });

  it("rolls back post, draft completion and refs on selected-set mismatch or stale CAS", async () => {
    const { topicId, context, draft } = await topicFixture();
    const file = await store.createDraftAttachment(upload(context, draft));
    const wrong = reply(topicId, context, draft, []);
    await expect(repository.createPost(wrong)).rejects.toBeInstanceOf(ForumStateConflictError);
    expect((await client.query("select id from forum_posts where id = $1", [wrong.id])).rowCount).toBe(0);
    expect(await store.readDraftAttachment(ownerId, context, draft, file.id)).not.toBeNull();
    await setDraft(ownerId, context, draft);
    const stale = reply(topicId, context, draft, [file.id], 0);
    await expect(repository.createPost(stale)).rejects.toBeInstanceOf(ForumStateConflictError);
    expect((await client.query("select id from forum_posts where id = $1", [stale.id])).rowCount).toBe(0);
    const accepted = await repository.createPost(reply(topicId, context, draft, [file.id], 1));
    expect(await store.readPublishedAttachment(accepted.id, file.id)).not.toBeNull();
    await expect(store.createDraftAttachment(upload(context, draft)))
      .rejects.toBeInstanceOf(ForumAttachmentDraftConflictError);
  });

  it("does not publish an unrelated ID or attach the selected file to another post", async () => {
    const { topicId, context, draft } = await topicFixture();
    const file = await store.createDraftAttachment(upload(context, draft));
    const invalid = reply(topicId, context, draft, [crypto.randomUUID()]);
    await expect(repository.createPost(invalid)).rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await store.readPublishedAttachment(invalid.id, file.id)).toBeNull();
    expect(await store.readDraftAttachment(ownerId, context, draft, file.id)).not.toBeNull();
  });
});


describe("live action → writer/service → PostgreSQL attachment publication", () => {
  const realWriter = createHyperdriveForumWriter(
    databaseUrl,
    () => new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` }),
    { cooldownMs: 0, now: () => new Date() },
  );

  function realContext() {
    const ctx = new RouterContextProvider();
    ctx.set(authSessionContext, { user: { id: ownerId } } as AuthSession);
    // Route permission decision is isolated; real writer/service/repository/PG are not mocked.
    ctx.set(authorizationContext, { forUser: () => ({ has: async () => true }) } as never);
    ctx.set(forumWriterContext, realWriter);
    return ctx;
  }

  function publishRequest(path: string, intent: string, generation: string, version: number, ids: string[]) {
    const body = new FormData();
    body.set("intent", intent);
    body.set("title", "Live route attachment");
    body.set("body", "Attached body");
    body.set("editorDraftId", generation);
    body.set("editorDraftVersion", String(version));
    body.set("editorAttachmentIds", JSON.stringify(ids));
    return new Request(`https://forum.test${path}`, {
      method: "POST", headers: { Origin: "https://forum.test" }, body,
    });
  }

  function responseStatus(value: unknown) {
    return value instanceof Response ? value.status : (value as { init?: { status?: number } }).init?.status;
  }

  it.each(["section-topic", "help-question", "reply"] as const)(
    "publishes one stored attachment through live %s action and writer",
    async (kind) => {
      const generation = crypto.randomUUID();
      let context: string;
      let topicId: string | undefined;
      let sectionId: string | undefined;
      if (kind === "section-topic") {
        sectionId = `attachment-live-section-${crypto.randomUUID()}`;
        await client.query(
          "insert into forum_sections (id, category_id, name) values ($1, 'attachment-category', 'Live')",
          [sectionId],
        );
        context = `section:${sectionId}:new`;
      } else if (kind === "help-question") {
        context = "help:new";
      } else {
        topicId = crypto.randomUUID();
        await new DrizzleForumRepository(drizzle(client), { cooldownMs: 0, now: () => new Date() })
          .createTopicWithInitialPost({
            id: topicId, sectionId: "attachment-section", authorId: ownerId,
            titleRevision: { id: crypto.randomUUID(), originalContent: "Live parent", sourceLocale: "en" },
            initialPost: {
              id: crypto.randomUUID(), topicId, authorId: ownerId,
              bodyRevision: { id: crypto.randomUUID(), originalContent: "Parent", sourceLocale: "en" },
            },
          });
        context = `topic:${topicId}:reply`;
      }
      await setDraft(ownerId, context, generation, "active", 1);
      const file = await store.createDraftAttachment(upload(context, generation));
      const input = kind === "section-topic"
        ? { request: publishRequest(`/en/sections/${sectionId}`, "createTopic", generation, 1, [file.id]),
            params: { locale: "en", sectionId }, context: realContext() }
        : kind === "help-question"
          ? { request: publishRequest(`/en/categories/${HELP_SOLUTIONS_CATEGORY_ID}`, "createHelpQuestion", generation, 1, [file.id]),
              params: { locale: "en", categoryId: HELP_SOLUTIONS_CATEGORY_ID }, context: realContext() }
          : { request: publishRequest(`/en/topics/${topicId}`, "reply", generation, 1, [file.id]),
              params: { locale: "en", topicId }, context: realContext() };

      const response = kind === "section-topic"
        ? await sectionAction(input)
        : kind === "help-question"
          ? await helpSolutionsCategoryAction(input)
          : await topicAction(input);
      expect(responseStatus(response)).toBe(302);
      if (!(response instanceof Response)) throw new Error("Expected redirect response");
      const destination = new URL(response.headers.get("Location") ?? "", "https://forum.test");
      const resolvedTopic = kind === "reply" ? topicId! : destination.pathname.split("/").filter(Boolean).at(-1)!;
      const page = await new DrizzleForumRepository(drizzle(client)).readTopicPage(resolvedTopic);
      expect(page).toBeDefined();
      const published = page!.posts.find((post) => post.attachments?.some((entry) => entry.id === file.id));
      expect(published?.attachments).toEqual([{
        id: file.id, fileName: file.fileName, byteSize: file.byteSize,
        detectedType: file.detectedType,
      }]);
      expect(await store.readPublishedAttachment(published!.id, file.id)).not.toBeNull();
      await expect(store.readDraftAttachment(ownerId, context, generation, file.id))
        .rejects.toBeInstanceOf(ForumAttachmentDraftConflictError);
    },
  );

  it("returns an HTTP conflict and preserves post/ref/draft on a stale selected manifest", async () => {
    const repository = new DrizzleForumRepository(drizzle(client), { cooldownMs: 0, now: () => new Date() });
    const topicId = crypto.randomUUID();
    await repository.createTopicWithInitialPost({
      id: topicId, sectionId: "attachment-section", authorId: ownerId,
      titleRevision: { id: crypto.randomUUID(), originalContent: "Conflict parent", sourceLocale: "en" },
      initialPost: { id: crypto.randomUUID(), topicId, authorId: ownerId,
        bodyRevision: { id: crypto.randomUUID(), originalContent: "Parent", sourceLocale: "en" } },
    });
    const context = `topic:${topicId}:reply`;
    const draft = crypto.randomUUID();
    await setDraft(ownerId, context, draft, "active", 1);
    const file = await store.createDraftAttachment(upload(context, draft));
    const before = await client.query<{ count: string }>(
      "select count(*)::text as count from forum_posts where topic_id = $1", [topicId],
    );
    const response = await topicAction({
      request: publishRequest(`/en/topics/${topicId}`, "reply", draft, 1, []),
      params: { locale: "en", topicId }, context: realContext(),
    });
    expect(responseStatus(response)).toBe(409);
    const after = await client.query<{ count: string }>(
      "select count(*)::text as count from forum_posts where topic_id = $1", [topicId],
    );
    expect(after.rows).toEqual(before.rows);
    expect(await store.readDraftAttachment(ownerId, context, draft, file.id)).toMatchObject({ id: file.id });
    const row = await client.query<{ status: string; version: number }>(
      "select status, version from forum_editor_drafts where owner_id=$1 and context_key=$2",
      [ownerId, context],
    );
    expect(row.rows).toMatchObject([{ status: "active", version: 1 }]);
  });
});


describe("durable orphan cleanup behind the existing private storage boundary", () => {
  const repository = new DrizzleForumRepository(drizzle(client), { cooldownMs: 0, now: () => new Date() });

  async function contextFixture() {
    const section = `attachment-cleanup-${crypto.randomUUID()}`;
    await repository.createSection({ id: section, categoryId: "attachment-category", name: "Cleanup" });
    return `section:${section}:new`;
  }
  async function makeOrphan() {
    const context = await contextFixture();
    const generation = crypto.randomUUID();
    const asset = await store.createDraftAttachment(upload(context, generation));
    await client.query("update forum_attachments set created_at = now() - interval '2 hours' where id = $1", [asset.id]);
    return { asset, context, generation };
  }
  const row = async (id: string) => (await client.query<{
    cleanup_status: string; cleanup_claim_token: string | null;
  }>("select cleanup_status, cleanup_claim_token from forum_attachments where id=$1", [id])).rows[0];

  it("preserves valid immediate uploads before the first text save and deletes only detached old assets", async () => {
    const { asset, context, generation } = await makeOrphan();
    const bucket = { delete: vi.fn(async () => {}) };
    const cleanup = new ForumAttachmentCleanup(drizzle(client), bucket);
    expect((await cleanup.runOnce()).deleted).toBe(0);
    expect(bucket.delete).not.toHaveBeenCalled();
    expect(await store.listDraftAttachments(ownerId, context, generation)).toHaveLength(1);
    await store.removeDraftAttachment(ownerId, context, generation, asset.id);
    expect((await cleanup.runOnce()).deleted).toBe(1);
    expect(bucket.delete).toHaveBeenCalledWith(asset.objectKey);
    expect(await row(asset.id)).toBeUndefined();
  });

  it("releases stale refs of deleted drafts and deletes their objects without per-user intervention", async () => {
    const { asset, context, generation } = await makeOrphan();
    await setDraft(ownerId, context, generation, "deleted", 2);
    const bucket = { delete: vi.fn(async () => {}) };
    const outcome = await new ForumAttachmentCleanup(drizzle(client), bucket).runOnce();
    expect(outcome.prunedRefs).toBeGreaterThan(0);
    expect(outcome.deleted).toBeGreaterThan(0);
    expect(await row(asset.id)).toBeUndefined();
    expect(await client.query(
      "select attachment_id from forum_attachment_draft_refs where attachment_id=$1", [asset.id],
    )).toMatchObject({ rowCount: 0 });
  });

  it("retires an expired attachment-only generation so a late POST cannot resurrect it", async () => {
    const { asset, context, generation } = await makeOrphan();
    await client.query(
      "update forum_attachment_draft_refs set created_at = now() - interval '31 days' where attachment_id = $1",
      [asset.id],
    );
    await client.query(
      "update forum_attachments set created_at = now() - interval '31 days' where id = $1",
      [asset.id],
    );
    const result = await new ForumAttachmentCleanup(
      drizzle(client), { delete: vi.fn(async () => {}) },
    ).runOnce();
    expect(result.prunedRefs).toBe(1);
    expect(result.deleted).toBe(1);
    const markers = await client.query(
      "select target_draft_id from forum_attachment_draft_generations where owner_id=$1 and context_key=$2 and draft_id=$3",
      [ownerId, context, generation],
    );
    expect(markers.rows).toEqual([{ target_draft_id: null }]);
    await expect(store.createDraftAttachment(upload(context, generation))).rejects
      .toMatchObject({ reason: "gone" });
    await expect(store.listDraftAttachments(ownerId, context, generation)).rejects
      .toMatchObject({ reason: "gone" });
  });

  it("keeps an unsaved generation active when one of its refs is still fresh", async () => {
    const { asset, context, generation } = await makeOrphan();
    await store.createDraftAttachment(upload(context, generation));
    await client.query(
      "update forum_attachment_draft_refs set created_at = now() - interval '31 days' where attachment_id = $1",
      [asset.id],
    );
    const result = await new ForumAttachmentCleanup(
      drizzle(client), { delete: vi.fn(async () => {}) },
    ).runOnce();
    expect(result.prunedRefs).toBe(1);
    const current = await store.listDraftAttachments(ownerId, context, generation);
    expect(current).toHaveLength(1);
    expect(await store.createDraftAttachment(upload(context, generation))).toMatchObject({
      detectedType: "text",
    });
  });

  it("denies direct draft-file reads after saved draft TTL without touching storage or renewal", async () => {
    const { asset, context, generation } = await makeOrphan();
    await setDraft(ownerId, context, generation, "active", 1);
    await client.query(
      "update forum_editor_drafts set edited_at = now() - interval '31 days' where owner_id=$1 and context_key=$2",
      [ownerId, context],
    );
    expect(await store.readDraftAttachment(ownerId, context, generation, asset.id)).toBeNull();
    const status = await client.query<{ status: string }>(
      "select status from forum_editor_drafts where owner_id=$1 and context_key=$2",
      [ownerId, context],
    );
    expect(status.rows).toEqual([{ status: "active" }]);
    // The explicit metadata endpoint can independently purge this stale draft.
    await new DrizzleForumEditorDrafts(drizzle(client)).get(ownerId, context);
    await expect(store.readDraftAttachment(ownerId, context, generation, asset.id)).rejects
      .toMatchObject({ reason: "gone" });
    // This suite shares a disposable schema; do not leave an expired ref/object
    // for the following exact-claim-count lease test.
    const cleanup = new ForumAttachmentCleanup(drizzle(client), { delete: vi.fn(async () => {}) });
    expect((await cleanup.runOnce()).deleted).toBeGreaterThan(0);
  });

  it("prunes an already-terminal old generation without trying to retire it twice", async () => {
    const { asset, context, generation } = await makeOrphan();
    await client.query(
      "insert into forum_attachment_draft_generations (owner_id, context_key, draft_id, target_draft_id) values ($1,$2,$3,null)",
      [ownerId, context, generation],
    );
    await client.query(
      "update forum_attachment_draft_refs set created_at = now() - interval '31 days' where attachment_id=$1",
      [asset.id],
    );
    await client.query(
      "update forum_attachments set created_at = now() - interval '31 days' where id=$1",
      [asset.id],
    );
    const result = await new ForumAttachmentCleanup(
      drizzle(client), { delete: vi.fn(async () => {}) },
    ).runOnce();
    expect(result.prunedRefs).toBeGreaterThan(0);
    expect(await row(asset.id)).toBeUndefined();
  });

  it("retains a durable claim on lost delete ACK and retries idempotently after the lease", async () => {
    const { asset, context, generation } = await makeOrphan();
    await store.removeDraftAttachment(ownerId, context, generation, asset.id);
    let time = new Date();
    const bucket = { delete: vi.fn()
      .mockRejectedValueOnce(new Error("lost object delete ACK"))
      .mockResolvedValueOnce(undefined),
    };
    const processor = new ForumAttachmentCleanup(drizzle(client), bucket, () => time);
    expect(await processor.runOnce()).toMatchObject({ claimed: 1, deleted: 0, failed: 1 });
    expect(await row(asset.id)).toMatchObject({ cleanup_status: "deleting" });
    expect((await processor.runOnce()).claimed).toBe(0);
    time = new Date(time.getTime() + ATTACHMENT_CLEANUP_CLAIM_LEASE_MS + 1);
    expect(await processor.runOnce()).toMatchObject({ claimed: 1, deleted: 1, failed: 0 });
    expect(bucket.delete).toHaveBeenCalledTimes(2);
    expect(await row(asset.id)).toBeUndefined();
  });

  it("preserves a shared published object until its last live post ref is removed", async () => {
    const { asset, context, generation } = await makeOrphan();
    await store.removeDraftAttachment(ownerId, context, generation, asset.id);
    const topicId = crypto.randomUUID();
    const first = crypto.randomUUID(), second = crypto.randomUUID();
    await repository.createTopicWithInitialPost({
      id: topicId, sectionId: "attachment-section", authorId: ownerId,
      titleRevision: { id: crypto.randomUUID(), originalContent: "Shared cleanup", sourceLocale: "en" },
      initialPost: { id: first, topicId, authorId: ownerId,
        bodyRevision: { id: crypto.randomUUID(), originalContent: "One", sourceLocale: "en" } },
    });
    await repository.createPost({ id: second, topicId, authorId: ownerId,
      bodyRevision: { id: crypto.randomUUID(), originalContent: "Two", sourceLocale: "en" } });
    await client.query("insert into forum_post_attachments (post_id, attachment_id, created_at) values ($1,$3,now()),($2,$3,now())",
      [first, second, asset.id]);
    const bucket = { delete: vi.fn(async () => {}) };
    const worker = new ForumAttachmentCleanup(drizzle(client), bucket);
    expect((await worker.runOnce()).deleted).toBe(0);
    await client.query("delete from forum_posts where id=$1", [first]);
    expect((await worker.runOnce()).deleted).toBe(0);
    expect(await store.readPublishedAttachment(second, asset.id)).not.toBeNull();
    await client.query("delete from forum_posts where id=$1", [second]);
    expect((await worker.runOnce()).deleted).toBe(1);
    expect(await row(asset.id)).toBeUndefined();
  });

  it("a claimed object refuses a concurrent new draft ref at the database boundary", async () => {
    const { asset, context, generation } = await makeOrphan();
    await store.removeDraftAttachment(ownerId, context, generation, asset.id);
    const blocker = new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
    const writer = new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
    await Promise.all([blocker.connect(), writer.connect()]);
    try {
      await blocker.query("begin");
      await blocker.query("select id from forum_attachments where id=$1 for update", [asset.id]);
      const pending = writer.query(
        "insert into forum_attachment_draft_refs (attachment_id, owner_id, context_key, draft_id, created_at) values ($1,$2,$3,$4,now())",
        [asset.id, ownerId, context, generation],
      );
      void pending.catch(() => {});
      await blocker.query(
        "update forum_attachments set cleanup_status='deleting', cleanup_claim_token=$2, cleanup_claimed_at=now() where id=$1",
        [asset.id, crypto.randomUUID()],
      );
      await blocker.query("commit");
      await expect(pending).rejects.toMatchObject({ code: "23514" });
      expect(await client.query(
        "select 1 from forum_attachment_draft_refs where attachment_id=$1", [asset.id],
      )).toMatchObject({ rowCount: 0 });
    } finally {
      await blocker.query("rollback");
      await Promise.all([blocker.end(), writer.end()]);
    }
  });

  it("does not double-claim an in-flight deletion across overlapping processor runs", async () => {
    const { asset, context, generation } = await makeOrphan();
    await store.removeDraftAttachment(ownerId, context, generation, asset.id);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const storage = { delete: vi.fn(async () => { await gate; }) };
    const first = new ForumAttachmentCleanup(drizzle(client), storage);
    const second = new ForumAttachmentCleanup(drizzle(client), storage);
    const running = first.runOnce();
    await vi.waitFor(() => expect(storage.delete).toHaveBeenCalledTimes(1));
    const other = await second.runOnce();
    expect(other.claimed).toBe(0);
    release();
    expect((await running).deleted).toBe(1);
    expect(storage.delete).toHaveBeenCalledTimes(1);
  });
});
