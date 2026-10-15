import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { lockAttachmentDraftScope } from "../../db/attachment-draft-generation";
import { DrizzleForumAttachments, ForumAttachmentDraftConflictError } from "../../db/forum-attachments";
import { DrizzleForumEditorDrafts } from "../../db/forum-editor-drafts";
import { ForumAttachmentCleanup } from "../../db/forum-attachment-cleanup";
import { DrizzleForumRepository, ForumAuthorizationError, ForumStateConflictError } from "../../db/forum-repository";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const url = new URL(databaseUrl);
if (!["localhost", "127.0.0.1"].includes(url.hostname) || !url.pathname.endsWith("_test")) {
  throw new Error("Disposable local test database required");
}

const schema = "forum_attachment_publication_test";
const connection = () => new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
const client = connection();
const draftStore = new DrizzleForumEditorDrafts(drizzle(client));
const attachments = new DrizzleForumAttachments(drizzle(client));
const ownerId = "publication-owner";
const sectionId = "publication-section";
const topicId = "publication-topic";
const contextKey = `topic:${topicId}:reply`;
let clock = Date.parse("2030-01-01T00:00:00Z");
const policy = { cooldownMs: 0, now: () => new Date(clock += 1) };
const forum = new DrizzleForumRepository(drizzle(client), policy);

function attachment(draftId: string, key = contextKey) {
  return {
    id: crypto.randomUUID(), ownerId, contextKey: key, draftId,
    objectKey: `private/${crypto.randomUUID()}`,
    fileName: "retained.txt", declaredMime: "text/plain", detectedType: "text",
    responseMime: "text/plain; charset=utf-8", byteSize: 12,
    verificationStatus: "type-checked" as const,
  };
}

function reply(id: string, draftId?: string, expectedVersion?: number) {
  return {
    id, topicId, authorId: ownerId,
    publishedDraft: { contextKey, ...(draftId ? { draftId, expectedVersion } : {}) },
    bodyRevision: { id: `${id}-revision`, originalContent: "Reply text", sourceLocale: "en" },
  };
}

async function savedDraft(draftId: string, key = contextKey) {
  const previous = await draftStore.get(ownerId, key);
  const saved = await draftStore.save(ownerId, key, draftId,
    { body: "Reply text", title: "", tags: "" }, previous?.version ?? 0);
  if (saved.outcome !== "saved") throw new Error("test draft creation failed");
  return saved.draft;
}

async function backendId(connection: Client): Promise<number> {
  const state = await connection.query<{ pid: number }>("select pg_backend_pid() as pid");
  return state.rows[0]!.pid;
}

async function waitForScopeLock(blockedPid: number) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    await client.query("select pg_stat_clear_snapshot()");
    const state = await client.query<{ waiting: boolean }>(
      "select wait_event = 'advisory' as waiting from pg_stat_activity where pid = $1",
      [blockedPid],
    );
    if (state.rows[0]?.waiting) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("operation did not contend on the shared attachment scope lock");
}

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  const files = (await readdir("drizzle")).filter((file) => /^\d{4}_.+\.sql$/u.test(file)).sort();
  for (const file of files) {
    await client.query((await readFile(`drizzle/${file}`, "utf8")).replaceAll('"public".', `"${schema}".`));
  }
  for (const id of [ownerId, "publication-topic-author", "publication-other"]) {
    await client.query('insert into "user" (id, name, email) values ($1, $1, $2)', [id, `${id}@test.invalid`]);
  }
  await forum.createCategory({ id: "publication-category", name: "Attachments" });
  await forum.createSection({ id: sectionId, categoryId: "publication-category", name: "Files" });
  await forum.createTopicWithInitialPost({
    id: topicId, sectionId, authorId: "publication-topic-author",
    titleRevision: { id: "publication-title", originalContent: "Topic", sourceLocale: "en" },
    initialPost: {
      id: "publication-initial", topicId, authorId: "publication-topic-author",
      bodyRevision: { id: "publication-initial-body", originalContent: "Question", sourceLocale: "en" },
    },
  });
});

afterAll(async () => {
  await client.query(`drop schema if exists ${schema} cascade`);
  await client.end();
});

describe("text-only publication attachment fence", () => {
  it("rolls back a reply and notifications when another device has attached a file", async () => {
    const draftId = crypto.randomUUID();
    const draft = await savedDraft(draftId);
    const file = attachment(draftId);
    await attachments.createDraftAttachment(file);

    await expect(forum.createPost(reply("blocked-attachment-reply", draftId, draft.version)))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    const rows = await client.query<{ posts: string; revisions: string; notifications: string }>(`
      select
        (select count(*) from forum_posts where id = 'blocked-attachment-reply')::text as posts,
        (select count(*) from forum_post_revisions where id = 'blocked-attachment-reply-revision')::text as revisions,
        (select count(*) from forum_reply_notifications where post_id = 'blocked-attachment-reply')::text as notifications
    `);
    expect(rows.rows[0]).toEqual({ posts: "0", revisions: "0", notifications: "0" });
    expect(await draftStore.get(ownerId, contextKey)).toMatchObject({
      draftId, version: draft.version, status: "active", payload: { body: "Reply text" },
    });
    expect(await attachments.listDraftAttachments(ownerId, contextKey, draftId)).toHaveLength(1);

    await attachments.removeDraftAttachment(ownerId, contextKey, draftId, file.id);
    await forum.createPost(reply("allowed-text-reply", draftId, draft.version));
    expect(await draftStore.get(ownerId, contextKey)).toMatchObject({ status: "published" });
  });

  it("blocks a new topic without leaving its title, post, tags, or terminal marker", async () => {
    const key = `section:${sectionId}:new`;
    const draftId = crypto.randomUUID();
    const file = attachment(draftId, key);
    await attachments.createDraftAttachment(file);
    await expect(forum.createTopicWithInitialPost({
      id: "blocked-file-topic", sectionId, authorId: ownerId,
      publishedDraft: { contextKey: key, draftId, expectedVersion: 0 },
      titleRevision: { id: "blocked-file-title", originalContent: "Topic", sourceLocale: "en" },
      tags: [{ key: "blocked-file-tag", name: "Blocked file tag" }],
      initialPost: {
        id: "blocked-file-post", topicId: "blocked-file-topic", authorId: ownerId,
        bodyRevision: { id: "blocked-file-body", originalContent: "Text", sourceLocale: "en" },
      },
    })).rejects.toBeInstanceOf(ForumStateConflictError);
    const rows = await client.query<{ topics: string; posts: string; titles: string; tags: string }>(`
      select
        (select count(*) from forum_topics where id = 'blocked-file-topic')::text as topics,
        (select count(*) from forum_posts where id = 'blocked-file-post')::text as posts,
        (select count(*) from forum_topic_title_revisions where id = 'blocked-file-title')::text as titles,
        (select count(*) from forum_tags where key = 'blocked-file-tag')::text as tags
    `);
    expect(rows.rows[0]).toEqual({ topics: "0", posts: "0", titles: "0", tags: "0" });
    expect(await draftStore.get(ownerId, key)).toBeNull();
    await attachments.removeDraftAttachment(ownerId, key, draftId, file.id);
  });

  it("guards canonical refs after a generation move and preserves the original CAS fence", async () => {
    const sourceId = crypto.randomUUID();
    const draftId = crypto.randomUUID();
    const draft = await savedDraft(draftId);
    const file = attachment(sourceId);
    await attachments.createDraftAttachment(file);
    await attachments.rebindDraftAttachments(ownerId, contextKey, sourceId, draftId, draft.version);
    await expect(forum.createPost(reply("blocked-rebound-reply", draftId, draft.version)))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    await expect(forum.createPost(reply("blocked-source-reply", sourceId, draft.version)))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await attachments.listDraftAttachments(ownerId, contextKey, draftId)).toHaveLength(1);
    await attachments.removeDraftAttachment(ownerId, contextKey, draftId, file.id);
    await expect(forum.createPost(reply("blocked-stale-source-reply", sourceId, draft.version)))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    await draftStore.delete(ownerId, contextKey, draftId, draft.version);
  });

  it("rejects a legacy unfenced publication when an unsynced generation has files", async () => {
    const key = `section:${sectionId}:new`;
    const draftId = crypto.randomUUID();
    const file = attachment(draftId, key);
    await attachments.createDraftAttachment(file);
    await expect(forum.createTopicWithInitialPost({
      id: "blocked-unfenced-topic", sectionId, authorId: ownerId,
      publishedDraft: { contextKey: key },
      titleRevision: { id: "blocked-unfenced-title", originalContent: "Topic", sourceLocale: "en" },
      initialPost: {
        id: "blocked-unfenced-post", topicId: "blocked-unfenced-topic", authorId: ownerId,
        bodyRevision: { id: "blocked-unfenced-body", originalContent: "Text", sourceLocale: "en" },
      },
    })).rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await draftStore.get(ownerId, key)).toBeNull();
    await attachments.removeDraftAttachment(ownerId, key, draftId, file.id);
  });

  it("serializes upload-before-publication so the publication rolls back", async () => {
    const draftId = crypto.randomUUID();
    const draft = await savedDraft(draftId);
    const uploadClient = connection();
    const publicationClient = connection();
    await Promise.all([uploadClient.connect(), publicationClient.connect()]);
    const [uploadPid, publicationPid] = await Promise.all([backendId(uploadClient), backendId(publicationClient)]);
    const uploadStore = new DrizzleForumAttachments(drizzle(uploadClient));
    const writer = new DrizzleForumRepository(drizzle(publicationClient), policy);
    const file = attachment(draftId);
    try {
      await client.query("begin");
      await lockAttachmentDraftScope(drizzle(client), ownerId, contextKey);
      const uploading = uploadStore.createDraftAttachment(file);
      await waitForScopeLock(uploadPid);
      const publishing = writer.createPost(reply("concurrent-file-reply", draftId, draft.version))
        .then(() => null, (error: unknown) => error);
      await waitForScopeLock(publicationPid);
      await client.query("commit");
      await uploading;
      expect(await publishing).toBeInstanceOf(ForumStateConflictError);
      expect((await client.query("select id from forum_posts where id = 'concurrent-file-reply'")).rows).toEqual([]);
      expect(await draftStore.get(ownerId, contextKey)).toMatchObject({ status: "active", version: draft.version });
      expect(await uploadStore.listDraftAttachments(ownerId, contextKey, draftId)).toHaveLength(1);
      await attachments.removeDraftAttachment(ownerId, contextKey, draftId, file.id);
      await draftStore.delete(ownerId, contextKey, draftId, draft.version);
    } finally {
      await client.query("rollback");
      await Promise.all([uploadClient.end(), publicationClient.end()]);
    }
  });

  it("serializes publication-before-upload so a terminal generation cannot gain a late ref", async () => {
    const draftId = crypto.randomUUID();
    const draft = await savedDraft(draftId);
    const publicationClient = connection();
    const uploadClient = connection();
    await Promise.all([publicationClient.connect(), uploadClient.connect()]);
    const [publicationPid, uploadPid] = await Promise.all([backendId(publicationClient), backendId(uploadClient)]);
    const writer = new DrizzleForumRepository(drizzle(publicationClient), policy);
    const uploadStore = new DrizzleForumAttachments(drizzle(uploadClient));
    const file = attachment(draftId);
    try {
      await client.query("begin");
      await lockAttachmentDraftScope(drizzle(client), ownerId, contextKey);
      const publishing = writer.createPost(reply("publication-before-file-reply", draftId, draft.version));
      await waitForScopeLock(publicationPid);
      const uploading = uploadStore.createDraftAttachment(file).then(() => null, (error: unknown) => error);
      await waitForScopeLock(uploadPid);
      await client.query("commit");
      await publishing;
      expect(await uploading).toBeInstanceOf(ForumAttachmentDraftConflictError);
      expect(await draftStore.get(ownerId, contextKey)).toMatchObject({ status: "published" });
      expect((await client.query("select id from forum_attachments where id = $1", [file.id])).rows).toEqual([]);
      await expect(attachments.listDraftAttachments(ownerId, contextKey, draftId))
        .rejects.toBeInstanceOf(ForumAttachmentDraftConflictError);
    } finally {
      await client.query("rollback");
      await Promise.all([uploadClient.end(), publicationClient.end()]);
    }
  });

  it("does not let retired draft refs block a fresh legacy text publication", async () => {
    const draftId = crypto.randomUUID();
    const draft = await savedDraft(draftId);
    const file = attachment(draftId);
    await attachments.createDraftAttachment(file);
    expect(await draftStore.delete(ownerId, contextKey, draftId, draft.version)).toBe(true);
    await expect(forum.createPost(reply("legacy-after-deleted-file"))).resolves.toMatchObject({
      id: "legacy-after-deleted-file",
    });
    expect(await draftStore.get(ownerId, contextKey)).toMatchObject({ status: "published" });
    const retained = await client.query("select attachment_id from forum_attachment_draft_refs where attachment_id = $1", [file.id]);
    expect(retained.rows).toHaveLength(1);
    // A later legacy publication must still ignore this retired root's refs.
    await expect(forum.createPost(reply("legacy-after-retired-head-advanced"))).resolves.toMatchObject({
      id: "legacy-after-retired-head-advanced",
    });
  });

  it("keeps completed roots and their aliases closed after a fresh text generation starts", async () => {
    const sourceId = crypto.randomUUID();
    const publishedId = crypto.randomUUID();
    const published = await savedDraft(publishedId);
    await attachments.rebindDraftAttachments(ownerId, contextKey, sourceId, publishedId, published.version);
    await forum.createPost(reply("retired-alias-reply", publishedId, published.version));

    const nextId = crypto.randomUUID();
    const next = await savedDraft(nextId);
    for (const retiredId of [publishedId, sourceId]) {
      const late = attachment(retiredId);
      await expect(attachments.createDraftAttachment(late)).rejects.toBeInstanceOf(ForumAttachmentDraftConflictError);
      expect((await client.query("select id from forum_attachments where id = $1", [late.id])).rows).toEqual([]);
      await expect(forum.createPost(reply(`stale-retired-${retiredId}`, retiredId, next.version)))
        .rejects.toBeInstanceOf(ForumStateConflictError);
    }
    expect(await draftStore.get(ownerId, contextKey)).toMatchObject({
      draftId: nextId, version: next.version, status: "active", payload: { body: "Reply text" },
    });
  });

  it("serializes the first draft INSERT before publication without inverting the owner FK lock", async () => {
    const newSection = "publication-first-save-section";
    await forum.createSection({ id: newSection, categoryId: "publication-category", name: "First save" });
    const key = `section:${newSection}:new`;
    const draftId = crypto.randomUUID();
    const saveClient = connection();
    const publicationClient = connection();
    await Promise.all([saveClient.connect(), publicationClient.connect()]);
    const [savePid, publicationPid] = await Promise.all([backendId(saveClient), backendId(publicationClient)]);
    const savingStore = new DrizzleForumEditorDrafts(drizzle(saveClient));
    const writer = new DrizzleForumRepository(drizzle(publicationClient), policy);
    try {
      await client.query("begin");
      await lockAttachmentDraftScope(drizzle(client), ownerId, key);
      const saving = savingStore.save(ownerId, key, draftId,
        { title: "First save", body: "Locally retained body", tags: "" }, 0);
      await waitForScopeLock(savePid);
      const publishing = writer.createTopicWithInitialPost({
        id: "first-save-competing-topic", sectionId: newSection, authorId: ownerId,
        publishedDraft: { contextKey: key, draftId, expectedVersion: 0 },
        titleRevision: { id: "first-save-competing-title", originalContent: "First save", sourceLocale: "en" },
        initialPost: {
          id: "first-save-competing-post", topicId: "first-save-competing-topic", authorId: ownerId,
          bodyRevision: { id: "first-save-competing-body", originalContent: "Text", sourceLocale: "en" },
        },
      }).then(() => null, (error: unknown) => error);
      await waitForScopeLock(publicationPid);
      await client.query("commit");
      expect(await saving).toMatchObject({ outcome: "saved", draft: { version: 1 } });
      expect(await publishing).toBeInstanceOf(ForumStateConflictError);
      expect((await client.query("select id from forum_topics where id = 'first-save-competing-topic'")).rows).toEqual([]);
      expect(await draftStore.get(ownerId, key)).toMatchObject({
        draftId, version: 1, status: "active", payload: { body: "Locally retained body" },
      });
    } finally {
      await client.query("rollback");
      await Promise.all([saveClient.end(), publicationClient.end()]);
    }
  });
});

describe("published post editing and revision history", () => {
  async function publishedFilePost() {
    const localTopicId = crypto.randomUUID(), localContext = `topic:${localTopicId}:reply`;
    await forum.createTopicWithInitialPost({ id: localTopicId, sectionId, authorId: ownerId,
      titleRevision: { id: crypto.randomUUID(), originalContent: "Snapshot topic", sourceLocale: "en" },
      initialPost: { id: crypto.randomUUID(), topicId: localTopicId, authorId: ownerId,
        bodyRevision: { id: crypto.randomUUID(), originalContent: "Initial", sourceLocale: "en" } } });
    const postId = crypto.randomUUID(), revisionId = crypto.randomUUID(), generation = crypto.randomUUID();
    const draft = await savedDraft(generation, localContext);
    const file = attachment(generation, localContext);
    await attachments.createDraftAttachment(file);
    await forum.createPost({ ...reply(postId, generation, draft.version), topicId: localTopicId,
      publishedDraft: { contextKey: localContext, draftId: generation, expectedVersion: draft.version, attachmentIds: [file.id] },
      bodyRevision: { id: revisionId, originalContent: "Original", sourceLocale: "en" },
    });
    return { postId, revisionId, file, topicId: localTopicId, key: `post:${postId}:edit` };
  }

  it("preserves an unsynced device's files through another publication, local conflict choice, rebase and cleanup", async () => {
    const { postId, revisionId, file, topicId: localTopicId, key } = await publishedFilePost();
    const a = crypto.randomUUID(), b = crypto.randomUUID(), c = crypto.randomUUID();
    await attachments.initializePostEditAttachments(ownerId, key, a, revisionId);
    // Opening the attachment snapshot does not accelerate the 60-second text save.
    expect(await draftStore.get(ownerId, key)).toBeNull();
    await attachments.initializePostEditAttachments(ownerId, key, b, revisionId);
    await attachments.removeDraftAttachment(ownerId, key, b, file.id);
    const added = attachment(b, key);
    await attachments.createDraftAttachment(added);
    await forum.editPublishedPost({ postId, topicId: localTopicId, actorId: ownerId, expectedRevisionId: revisionId,
      body: "Device B", draftId: b, expectedVersion: 0, attachmentIds: [added.id], retainedAttachmentIds: [] });
    expect(await attachments.readPublishedAttachment(postId, file.id)).toBeNull();
    const removedObjects: string[] = [];
    const cleanup = new ForumAttachmentCleanup(drizzle(client), {
      delete: async (key) => { removedObjects.push(key); },
    }, () => new Date(Date.now() + 2 * 60 * 60_000));
    await cleanup.runOnce();
    expect(removedObjects).not.toContain(file.objectKey);
    expect(await attachments.readDraftAttachment(ownerId, key, a, file.id)).toMatchObject({ id: file.id });
    // Explicitly choosing local against B's terminal marker starts C. Its text
    // reaches the regular CAS before the existing A→C attachment rebind.
    const terminal = await draftStore.get(ownerId, key);
    const saved = await draftStore.save(ownerId, key, c,
      { title: "", tags: "", body: "Device A", publishedRevisionId: revisionId }, terminal!.version);
    if (saved.outcome !== "saved") throw new Error("local choice must save");
    await attachments.rebindDraftAttachments(ownerId, key, a, c, saved.draft.version);
    const currentRevision = (await forum.readPost(postId))!.body.id;
    await attachments.initializePostEditAttachments(ownerId, key, c, currentRevision);
    expect((await attachments.listDraftAttachments(ownerId, key, c)).map((file) => file.id)).toEqual([file.id]);
    await forum.editPublishedPost({ postId, topicId: localTopicId, actorId: ownerId, expectedRevisionId: currentRevision,
      body: "Device A", draftId: c, expectedVersion: saved.draft.version,
      attachmentIds: [file.id], retainedAttachmentIds: [] });
    expect(await attachments.readPublishedAttachment(postId, file.id)).toMatchObject({ id: file.id });
    expect(await attachments.readPublishedAttachment(postId, added.id)).toBeNull();
    await expect(attachments.initializePostEditAttachments(ownerId, key, a, revisionId))
      .rejects.toBeInstanceOf(ForumAttachmentDraftConflictError);
  });

  it("does not re-adopt the last removed file on retry, reopen or a generation move", async () => {
    const { postId, revisionId, file, key } = await publishedFilePost();
    const a = crypto.randomUUID(), b = crypto.randomUUID();
    await attachments.initializePostEditAttachments(ownerId, key, a, revisionId);
    await attachments.removeDraftAttachment(ownerId, key, a, file.id);
    await attachments.initializePostEditAttachments(ownerId, key, a, revisionId);
    expect(await attachments.listDraftAttachments(ownerId, key, a)).toEqual([]);
    expect(await attachments.readPublishedAttachment(postId, file.id)).not.toBeNull();
    const saved = await savedDraft(b, key);
    await attachments.rebindDraftAttachments(ownerId, key, a, b, saved.version);
    await attachments.initializePostEditAttachments(ownerId, key, b, revisionId);
    expect(await attachments.listDraftAttachments(ownerId, key, b)).toEqual([]);
  });

  it("rejects snapshot acquisition for another owner, a stale revision, and retired generations without references", async () => {
    const { revisionId, file, key } = await publishedFilePost();
    const generation = crypto.randomUUID();
    await expect(attachments.initializePostEditAttachments("publication-other", key, generation, revisionId)).rejects.toThrow();
    await expect(attachments.initializePostEditAttachments(ownerId, key, generation, "stale")).rejects.toBeInstanceOf(ForumAttachmentDraftConflictError);
    expect(await attachments.listDraftAttachments(ownerId, key, generation)).toEqual([]);
    expect((await client.query("select 1 from forum_attachment_edit_snapshots where draft_id=$1", [generation])).rows).toEqual([]);
    const saved = await savedDraft(generation, key);
    await draftStore.delete(ownerId, key, generation, saved.version);
    await expect(attachments.initializePostEditAttachments(ownerId, key, generation, revisionId)).rejects.toBeInstanceOf(ForumAttachmentDraftConflictError);
    expect(await attachments.readPublishedAttachment(key.slice(5, -5), file.id)).not.toBeNull();
  });

  it.each([true, false])("serializes snapshot acquisition and publication in both lock orders (snapshot first: %s)", async (snapshotFirst) => {
    const { postId, revisionId, file, topicId: localTopicId, key } = await publishedFilePost();
    const a = crypto.randomUUID(), b = crypto.randomUUID();
    const blocker = connection(), first = connection(), second = connection();
    await Promise.all([blocker.connect(), first.connect(), second.connect()]);
    let initializing: Promise<void> | undefined, publishing: Promise<void> | undefined;
    try {
      const firstPid = await backendId(first), secondPid = await backendId(second);
      await blocker.query("begin");
      await lockAttachmentDraftScope(drizzle(blocker), ownerId, key);
      const startSnapshot = (conn: Client) => new DrizzleForumAttachments(drizzle(conn))
        .initializePostEditAttachments(ownerId, key, a, revisionId);
      const startSave = (conn: Client) => new DrizzleForumRepository(drizzle(conn), policy)
        .editPublishedPost({ postId, topicId: localTopicId, actorId: ownerId, expectedRevisionId: revisionId,
          body: "Device B", draftId: b, expectedVersion: 0, attachmentIds: [], retainedAttachmentIds: [] });
      if (snapshotFirst) initializing = startSnapshot(first);
      else publishing = startSave(first);
      void (initializing ?? publishing)!.catch(() => {});
      await waitForScopeLock(firstPid);
      if (snapshotFirst) publishing = startSave(second);
      else initializing = startSnapshot(second);
      void (snapshotFirst ? publishing : initializing)!.catch(() => {});
      await waitForScopeLock(secondPid);
      await blocker.query("commit");
      await publishing;
      if (snapshotFirst) {
        await initializing;
        expect(await attachments.readDraftAttachment(ownerId, key, a, file.id)).not.toBeNull();
      } else {
        await expect(initializing).rejects.toBeInstanceOf(ForumAttachmentDraftConflictError);
        expect(await attachments.listDraftAttachments(ownerId, key, a)).toEqual([]);
      }
      expect(await attachments.readPublishedAttachment(postId, file.id)).toBeNull();
    } finally {
      await blocker.query("rollback");
      await Promise.allSettled([initializing, publishing]);
      await Promise.all([blocker.end(), first.end(), second.end()]);
    }
  });

  it("removes only deselected published refs atomically with Save and includes the selection in retry identity", async () => {
    const localTopicId = crypto.randomUUID();
    const contextKey = `topic:${localTopicId}:reply`;
    await forum.createTopicWithInitialPost({
      id: localTopicId, sectionId, authorId: "publication-topic-author",
      titleRevision: { id: crypto.randomUUID(), originalContent: "Attachment removal", sourceLocale: "en" },
      initialPost: { id: crypto.randomUUID(), topicId: localTopicId, authorId: "publication-topic-author",
        bodyRevision: { id: crypto.randomUUID(), originalContent: "Question", sourceLocale: "en" } },
    });
    const postId = crypto.randomUUID(), revisionId = crypto.randomUUID(), generation = crypto.randomUUID();
    const original = await savedDraft(generation, contextKey);
    const removed = attachment(generation, contextKey), kept = attachment(generation, contextKey);
    await attachments.createDraftAttachment(removed);
    await attachments.createDraftAttachment(kept);
    await forum.createPost({ ...reply(postId, generation, original.version),
      topicId: localTopicId,
      publishedDraft: { contextKey, draftId: generation, expectedVersion: original.version, attachmentIds: [removed.id, kept.id] },
      bodyRevision: { id: revisionId, originalContent: "Before", sourceLocale: "en" },
    });
    const sharedPostId = crypto.randomUUID();
    await forum.createPost({ id: sharedPostId, topicId: localTopicId, authorId: ownerId,
      bodyRevision: { id: crypto.randomUUID(), originalContent: "Shared reference", sourceLocale: "en" } });
    await client.query("insert into forum_post_attachments (post_id, attachment_id, created_at) values ($1, $2, now())", [sharedPostId, removed.id]);
    const editGeneration = crypto.randomUUID(), editContext = `post:${postId}:edit`;
    const saved = await savedDraft(editGeneration, editContext);
    const added = attachment(editGeneration, editContext);
    await attachments.createDraftAttachment(added);
    const edit = { postId, topicId: localTopicId, actorId: ownerId, expectedRevisionId: revisionId,
      body: "After", draftId: editGeneration, expectedVersion: saved.version,
      attachmentIds: [added.id], retainedAttachmentIds: [kept.id] };
    await expect(forum.editPublishedPost({ ...edit, retainedAttachmentIds: [crypto.randomUUID()] }))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    await expect(forum.editPublishedPost({ ...edit, expectedVersion: saved.version + 1 }))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await attachments.readPublishedAttachment(postId, removed.id)).toMatchObject({ id: removed.id });
    expect((await forum.readPost(postId))?.body.id).toBe(revisionId);
    await forum.editPublishedPost(edit);
    expect(await attachments.readPublishedAttachment(postId, removed.id)).toBeNull();
    expect(await attachments.readPublishedAttachment(sharedPostId, removed.id)).toMatchObject({ id: removed.id });
    expect(await attachments.readPublishedAttachment(postId, kept.id)).toMatchObject({ id: kept.id });
    expect(await attachments.readPublishedAttachment(postId, added.id)).toMatchObject({ id: added.id });
    await forum.editPublishedPost(edit);
    await expect(forum.editPublishedPost({ ...edit, retainedAttachmentIds: [] }))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await forum.readPostHistory(postId, localTopicId)).toHaveLength(2);
  });

  it("keeps edits as separate drafts until Save, then preserves history and replays lost ACK once", async () => {
    const postId = crypto.randomUUID();
    const originalRevisionId = crypto.randomUUID();
    await forum.createPost({
      id: postId, topicId, authorId: ownerId,
      bodyRevision: { id: originalRevisionId, originalContent: "Published before edit", sourceLocale: "en" },
    });
    const editContext = `post:${postId}:edit`;
    const generation = crypto.randomUUID();
    const saved = await savedDraft(generation, editContext);
    expect((await forum.readPost(postId))?.body.originalContent).toBe("Published before edit");
    const request = {
      postId, topicId, actorId: ownerId, expectedRevisionId: originalRevisionId,
      body: "Updated **Markdown**", draftId: generation,
      expectedVersion: saved.version, attachmentIds: [] as string[],
    };
    await forum.editPublishedPost(request);
    const updated = await forum.readPost(postId);
    expect(updated?.body.originalContent).toBe("Updated **Markdown**");
    expect(updated?.body.id).not.toBe(originalRevisionId);
    const page = await forum.readTopicPage(topicId);
    expect(page?.posts.find((post) => post.id === postId)?.editedAt).toBeInstanceOf(Date);
    const history = await forum.readPostHistory(postId, topicId);
    expect(history).toHaveLength(2);
    expect(history.map((item) => item.originalContent)).toContain("Published before edit");
    expect(history.map((item) => item.originalContent)).toContain("Updated **Markdown**");
    expect(history.find((item) => item.originalContent === "Updated **Markdown**")?.authorId).toBe(ownerId);
    expect(await draftStore.get(ownerId, editContext)).toMatchObject({ status: "published" });
    await forum.editPublishedPost(request);
    expect(await forum.readPostHistory(postId, topicId)).toHaveLength(2);
    await expect(forum.editPublishedPost({ ...request, body: "Changed replay" }))
      .rejects.toBeInstanceOf(ForumStateConflictError);
  });

  it("rejects another user's edit, stale revision and blank body without a file", async () => {
    const postId = crypto.randomUUID(), revisionId = crypto.randomUUID();
    await forum.createPost({
      id: postId, topicId, authorId: ownerId,
      bodyRevision: { id: revisionId, originalContent: "Keep original", sourceLocale: "en" },
    });
    const generation = crypto.randomUUID();
    const edit = {
      postId, topicId, actorId: ownerId, expectedRevisionId: revisionId,
      body: "Changed", draftId: generation, expectedVersion: 0, attachmentIds: [] as string[],
    };
    await expect(forum.editPublishedPost({ ...edit, actorId: "publication-other" }))
      .rejects.toBeInstanceOf(ForumAuthorizationError);
    await expect(forum.editPublishedPost({ ...edit, body: "  " }))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    expect((await forum.readPost(postId))?.body.id).toBe(revisionId);
    const saved = await savedDraft(generation, `post:${postId}:edit`);
    await expect(forum.editPublishedPost({ ...edit, expectedRevisionId: crypto.randomUUID(), expectedVersion: saved.version }))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    expect((await forum.readPost(postId))?.body.id).toBe(revisionId);
  });

  it("allows an attachment-only published message after removing its body text", async () => {
    const localTopicId = crypto.randomUUID();
    const localContext = `topic:${localTopicId}:reply`;
    await forum.createTopicWithInitialPost({
      id: localTopicId, sectionId, authorId: "publication-topic-author",
      titleRevision: { id: crypto.randomUUID(), originalContent: "Topic with attachment-only edit", sourceLocale: "en" },
      initialPost: {
        id: crypto.randomUUID(), topicId: localTopicId, authorId: "publication-topic-author",
        bodyRevision: { id: crypto.randomUUID(), originalContent: "Question", sourceLocale: "en" },
      },
    });
    const postId = crypto.randomUUID(), revisionId = crypto.randomUUID();
    const publicationGeneration = crypto.randomUUID();
    const initialDraft = await savedDraft(publicationGeneration, localContext);
    const file = attachment(publicationGeneration, localContext);
    await attachments.createDraftAttachment(file);
    await forum.createPost({
      id: postId, topicId: localTopicId, authorId: ownerId,
      publishedDraft: {
        contextKey: localContext, draftId: publicationGeneration, expectedVersion: initialDraft.version,
        attachmentIds: [file.id],
      },
      bodyRevision: { id: revisionId, originalContent: "Caption to remove", sourceLocale: "en" },
    });
    const editGeneration = crypto.randomUUID();
    const editDraft = await savedDraft(editGeneration, `post:${postId}:edit`);
    await forum.editPublishedPost({
      postId, topicId: localTopicId, actorId: ownerId, expectedRevisionId: revisionId,
      body: "", draftId: editGeneration, expectedVersion: editDraft.version, attachmentIds: [],
    });
    expect((await forum.readPost(postId))?.body.originalContent).toBe("");
    expect(await attachments.readPublishedAttachment(postId, file.id)).toMatchObject({ id: file.id });
    expect(await forum.readPostHistory(postId, localTopicId)).toHaveLength(2);
  });

  it("atomically publishes new edit attachments while retaining already published ones", async () => {
    const postId = crypto.randomUUID(), revisionId = crypto.randomUUID();
    await forum.createPost({
      id: postId, topicId, authorId: ownerId,
      bodyRevision: { id: revisionId, originalContent: "Original", sourceLocale: "en" },
    });
    const editContext = `post:${postId}:edit`;
    const generation = crypto.randomUUID();
    const draft = await savedDraft(generation, editContext);
    const file = attachment(generation, editContext);
    await attachments.createDraftAttachment(file);
    await forum.editPublishedPost({
      postId, topicId, actorId: ownerId, expectedRevisionId: revisionId,
      body: "", draftId: generation, expectedVersion: draft.version, attachmentIds: [file.id],
    });
    expect(await attachments.readPublishedAttachment(postId, file.id)).toMatchObject({ id: file.id });
    expect((await forum.readPost(postId))?.body.originalContent).toBe("");
    expect(await forum.readPostHistory(postId, topicId)).toHaveLength(2);
  });
});


describe("durable mention notifications", () => {
  async function notifications(postId: string) {
    const result = await client.query<{ recipient_user_id: string; kind: string }>(
      "select recipient_user_id, kind from forum_reply_notifications where post_id = $1 order by recipient_user_id",
      [postId],
    );
    return result.rows.map((row) => [row.recipient_user_id, row.kind]);
  }

  it("notifies only published profile recipients and deduplicates against topic replies", async () => {
    const postId = crypto.randomUUID();
    await forum.createPost({
      id: postId, topicId, authorId: ownerId,
      bodyRevision: {
        id: crypto.randomUUID(), sourceLocale: "en",
        originalContent: [
          "[Topic author](/en/users/publication-topic-author)",
          "[Other user](/en/users/publication-other) [Again](/ru/users/publication-other)",
          "> [Quoted](/en/users/publication-other)",
          "`[Inline](/en/users/publication-other)`",
          "[Self](/en/users/publication-owner) [Missing](/en/users/does-not-exist)",
        ].join("\n"),
      },
    });
    expect(await notifications(postId)).toEqual([
      ["publication-other", "mention"],
      ["publication-topic-author", "reply"],
    ]);
    const inbox = await forum.readReplyNotifications("publication-other");
    expect(inbox.find((item) => item.postId === postId)?.kind).toBe("mention");
  });

  it("persists the per-post notified set across deletion and re-addition of an edited mention", async () => {
    const postId = crypto.randomUUID();
    const initialRevision = crypto.randomUUID();
    await forum.createPost({
      id: postId, topicId, authorId: ownerId,
      bodyRevision: { id: initialRevision, originalContent: "No mentions", sourceLocale: "en" },
    });
    const context = `post:${postId}:edit`;
    const firstDraft = await savedDraft(crypto.randomUUID(), context);
    await forum.editPublishedPost({
      postId, topicId, actorId: ownerId, expectedRevisionId: initialRevision,
      body: "[Other](/en/users/publication-other)", draftId: firstDraft.draftId,
      expectedVersion: firstDraft.version, attachmentIds: [],
    });
    expect(await notifications(postId)).toEqual([
      ["publication-topic-author", "reply"], ["publication-other", "mention"],
    ].sort((a, b) => a[0]!.localeCompare(b[0]!)));
    const secondDraft = await savedDraft(crypto.randomUUID(), context);
    const revision2 = (await forum.readPost(postId))!.body.id;
    await forum.editPublishedPost({
      postId, topicId, actorId: ownerId, expectedRevisionId: revision2,
      body: "No mention now", draftId: secondDraft.draftId,
      expectedVersion: secondDraft.version, attachmentIds: [],
    });
    const thirdDraft = await savedDraft(crypto.randomUUID(), context);
    const revision3 = (await forum.readPost(postId))!.body.id;
    await forum.editPublishedPost({
      postId, topicId, actorId: ownerId, expectedRevisionId: revision3,
      body: "[Other again](/he/users/publication-other)", draftId: thirdDraft.draftId,
      expectedVersion: thirdDraft.version, attachmentIds: [],
    });
    const rows = await notifications(postId);
    expect(rows.filter(([id]) => id === "publication-other")).toEqual([["publication-other", "mention"]]);
  });

  it("never creates mention notifications when an edit revision check fails", async () => {
    const postId = crypto.randomUUID(), revisionId = crypto.randomUUID();
    await forum.createPost({
      id: postId, topicId, authorId: ownerId,
      bodyRevision: { id: revisionId, sourceLocale: "en", originalContent: "Original" },
    });
    const draft = await savedDraft(crypto.randomUUID(), `post:${postId}:edit`);
    await expect(forum.editPublishedPost({
      postId, topicId, actorId: ownerId, expectedRevisionId: "obsolete-revision",
      body: "[Other](/en/users/publication-other)", draftId: draft.draftId,
      expectedVersion: draft.version, attachmentIds: [],
    })).rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await notifications(postId)).toEqual([["publication-topic-author", "reply"]]);
  });
});
