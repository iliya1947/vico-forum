import { readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, type DatabaseError } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DrizzleForumAttachments, ForumAttachmentDraftConflictError, InvalidForumAttachmentError, type CreateDraftAttachmentInput } from "../../db/forum-attachments";
import { lockAttachmentDraftScope } from "../../db/attachment-draft-generation";
import { DrizzleForumEditorDrafts } from "../../db/forum-editor-drafts";

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
  "0037_forum_attachment_draft_generations",
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
  first: (store: DrizzleForumAttachments) => Promise<T>,
  second: (store: DrizzleForumAttachments) => Promise<U>,
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
    firstResult = first(new DrizzleForumAttachments(drizzle(firstConnection)));
    void firstResult.catch(() => {});
    await waiting(firstPid);
    secondResult = second(new DrizzleForumAttachments(drizzle(secondConnection)));
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

  it("durably retires a losing generation and fences late uploads and rebinds", async () => {
    const context = "topic:discard-losing:reply";
    const source = crypto.randomUUID();
    const target = crypto.randomUUID();
    const input = upload(context, source);
    await store.createDraftAttachment(input);
    await setDraft(ownerId, context, target, "active", 4);

    expect(await store.discardDraftAttachments(ownerId, context, source, target, 4)).toBe("discarded");
    expect(await store.discardDraftAttachments(ownerId, context, source, target, 4)).toBe("discarded");
    await expect(store.createDraftAttachment(upload(context, source))).rejects.toMatchObject({ reason: "gone" });
    await expect(store.rebindDraftAttachments(ownerId, context, source, target, 4))
      .rejects.toMatchObject({ reason: "gone" });
    await expect(store.listDraftAttachments(ownerId, context, source)).rejects.toMatchObject({ reason: "gone" });
    expect(await store.listDraftAttachments(ownerId, context, target)).toEqual([]);
  });

  it.each(["upload-first", "discard-first"] as const)(
    "serializes a late upload against discard when %s commits first",
    async (order) => {
      const context = `topic:discard-upload-${order}:reply`;
      const source = crypto.randomUUID();
      const target = crypto.randomUUID();
      const input = upload(context, source);
      await setDraft(ownerId, context, target, "active", 4);
      const create = (repository: DrizzleForumAttachments) => repository.createDraftAttachment(input);
      const discard = (repository: DrizzleForumAttachments) =>
        repository.discardDraftAttachments(ownerId, context, source, target, 4);

      if (order === "upload-first") {
        const [created, disposition] = await queuedOperations(context, create, discard);
        expect(created.id).toBe(input.id);
        expect(disposition).toBe("discarded");
      } else {
        await expect(queuedOperations(context, discard, create)).rejects.toMatchObject({ reason: "gone" });
      }

      await expect(store.listDraftAttachments(ownerId, context, source)).rejects.toMatchObject({ reason: "gone" });
      expect(await store.listDraftAttachments(ownerId, context, target)).toEqual([]);
      await expect(store.createDraftAttachment(upload(context, source))).rejects.toMatchObject({ reason: "gone" });
    },
  );

  it.each(["rebind-first", "discard-first"] as const)(
    "serializes rebind against discard when %s commits first",
    async (order) => {
      const context = `topic:discard-rebind-${order}:reply`;
      const source = crypto.randomUUID();
      const target = crypto.randomUUID();
      const input = upload(context, source);
      await store.createDraftAttachment(input);
      await setDraft(ownerId, context, target, "active", 4);
      const rebind = (repository: DrizzleForumAttachments) =>
        repository.rebindDraftAttachments(ownerId, context, source, target, 4);
      const discard = (repository: DrizzleForumAttachments) =>
        repository.discardDraftAttachments(ownerId, context, source, target, 4);

      if (order === "rebind-first") {
        const [moved, disposition] = await queuedOperations(context, rebind, discard);
        expect(moved).toBe(1);
        expect(disposition).toBe("already-rebound");
        expect((await store.listDraftAttachments(ownerId, context, target)).map((item) => item.id))
          .toEqual([input.id]);
      } else {
        await expect(queuedOperations(context, discard, rebind)).rejects.toMatchObject({ reason: "gone" });
        expect(await store.listDraftAttachments(ownerId, context, target)).toEqual([]);
      }
    },
  );

  it("does not retire the selected generation when rebind linearizes before discard", async () => {
    const context = "topic:rebind-before-discard:reply";
    const source = crypto.randomUUID();
    const target = crypto.randomUUID();
    const input = upload(context, source);
    await store.createDraftAttachment(input);
    await setDraft(ownerId, context, target, "active", 4);

    expect(await store.rebindDraftAttachments(ownerId, context, source, target, 4)).toBe(1);
    expect(await store.discardDraftAttachments(ownerId, context, source, target, 4)).toBe("already-rebound");
    expect((await store.listDraftAttachments(ownerId, context, target)).map((item) => item.id)).toEqual([input.id]);
    expect(await store.createDraftAttachment(upload(context, target))).toMatchObject({ fileName: "concurrent.txt" });
  });

  it("rejects discard against a stale target version or an unrelated redirect", async () => {
    const context = "topic:discard-fences:reply";
    const source = crypto.randomUUID();
    const middle = crypto.randomUUID();
    const target = crypto.randomUUID();
    await setDraft(ownerId, context, middle, "active", 1);
    expect(await store.rebindDraftAttachments(ownerId, context, source, middle, 1)).toBe(0);
    await setDraft(ownerId, context, target, "active", 2);
    await expect(store.discardDraftAttachments(ownerId, context, source, target, 1))
      .rejects.toBeInstanceOf(ForumAttachmentDraftConflictError);
    await expect(store.discardDraftAttachments(ownerId, context, source, target, 2))
      .rejects.toBeInstanceOf(ForumAttachmentDraftConflictError);
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

  it("deduplicates concurrent SHA-256 Security event identities at the database boundary", async () => {
    const event = {
      uploadId: `sha256:${"a".repeat(64)}`,
      uploadedByUserId: ownerId,
      contextKey: "topic:security-digest:reply",
      draftId,
      fileName: "retry.exe",
      declaredMime: "application/octet-stream",
      detectedType: "executable",
      reason: "executable-signature",
      declaredByteSize: 4,
    };
    await Promise.all([
      store.recordSecurityEvent(event),
      store.recordSecurityEvent(event),
    ]);
    const rows = await client.query(
      "select upload_id from forum_attachment_security_events where upload_id = $1",
      [event.uploadId],
    );
    expect(rows.rows).toEqual([{ upload_id: event.uploadId }]);
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
      for (const tag of migrations.slice(0, -1)) {
        await connection.query((await readFile(`drizzle/${tag}.sql`, "utf8")).replaceAll('"public".', `"${migrationSchema}".`));
      }
      await connection.query('insert into "user" (id, name, email) values ($1, $1, $2)', [ownerId, `${ownerId}@test.invalid`]);
      const retired = crypto.randomUUID();
      const fresh = crypto.randomUUID();
      await connection.query(`insert into forum_editor_drafts (owner_id, context_key, draft_id, version, status, payload, edited_at, updated_at)
        values ($1, 'help:new', $2, 1, 'published', '{"title":"","body":"","tags":""}', now(), now())`, [ownerId, retired]);
      await connection.query((await readFile("drizzle/0037_forum_attachment_draft_generations.sql", "utf8")).replaceAll('"public".', `"${migrationSchema}".`));
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
      expect(await restricted.discardDraftAttachments(ownerId, context, source, target, 1)).toBe("already-rebound");
      expect(await restricted.createDraftAttachment({ ...input, objectKey: `private/${crypto.randomUUID()}` })).toEqual(original);
      expect(await restricted.removeDraftAttachment(ownerId, context, source, input.id)).toBe(true);
    } finally {
      await runtime.end();
      await client.query(`drop owned by ${role}`);
      await client.query(`drop role ${role}`);
    }
  });
});
