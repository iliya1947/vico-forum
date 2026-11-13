import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError } from "../../db/account-state";
import { DrizzleForumAttachments } from "../../db/forum-attachments";
import {
  DrizzleForumRepository, ForumAuthorizationError, ForumStateConflictError,
} from "../../db/forum-repository";

const url = process.env.DATABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA04-J3b requires a disposable loopback *_test PostgreSQL database");
}

const schema = "sa04_j3b_edit_lifecycle_test";
const options = "-c search_path=" + schema;
const fixture = new Client({ connectionString: url, options });
const pool = new Pool({ connectionString: url, options, max: 5 });
const noMeasures = async () => {};
const policy = { cooldownMs: 0, now: () => new Date() };
const forum = new DrizzleForumRepository(drizzle(pool), policy, noMeasures);
const attachments = new DrizzleForumAttachments(drizzle(pool));
const uuid = () => crypto.randomUUID();
const sectionId = "j3b-section";
const recipient = "j3b-mention-recipient";

type Item = {
  ownerId: string;
  topicId: string;
  postId: string;
  revisionId: string;
  retainedIds: [string, string];
};

async function user(id: string): Promise<string> {
  await fixture.query('insert into "user"(id,name,email) values ($1,$2,$3)',
    [id, id, id + "@test.invalid"]);
  return id;
}

async function deactivate(id: string): Promise<void> {
  await fixture.query('update "user" set deactivated_at=now(),deactivated_by_user_id=$1,'
    + "retain_at_least_until=now()+interval '2 years' where id=$1", [id]);
}

function file(ownerId: string, contextKey: string, draftId: string) {
  return {
    id: uuid(), ownerId, contextKey, draftId,
    objectKey: "private/" + uuid(), fileName: "j3b.txt",
    declaredMime: "text/plain", detectedType: "text",
    responseMime: "text/plain; charset=utf-8", byteSize: 12,
    verificationStatus: "type-checked" as const,
  };
}

async function seed(ownerId: string): Promise<Item> {
  const topicId = uuid(), postId = uuid(), revisionId = uuid();
  await forum.createTopicWithInitialPost({
    id: topicId, sectionId, authorId: ownerId,
    titleRevision: { id: uuid(), originalContent: "J3b lifecycle", sourceLocale: "en" },
    initialPost: {
      id: uuid(), topicId, authorId: ownerId,
      bodyRevision: { id: uuid(), originalContent: "Initial", sourceLocale: "en" },
    },
  });
  const contextKey = "topic:" + topicId + ":reply", draftId = uuid();
  const retained = [file(ownerId, contextKey, draftId), file(ownerId, contextKey, draftId)] as const;
  for (const item of retained) await attachments.createDraftAttachment(item);
  await forum.createPost({
    id: postId, topicId, authorId: ownerId,
    bodyRevision: { id: revisionId, originalContent: "Before", sourceLocale: "en" },
    publishedDraft: { contextKey, draftId, attachmentIds: retained.map(item => item.id) },
  });
  return { ownerId, topicId, postId, revisionId, retainedIds: [retained[0].id, retained[1].id] };
}

async function prepare(item: Item) {
  const draftId = uuid(), contextKey = "post:" + item.postId + ":edit";
  const added = file(item.ownerId, contextKey, draftId);
  await attachments.createDraftAttachment(added);
  return {
    draftId, addedId: added.id,
    request: {
      postId: item.postId, topicId: item.topicId, actorId: item.ownerId,
      expectedRevisionId: item.revisionId,
      body: "Updated [Recipient](/en/users/" + recipient + ")",
      draftId, attachmentIds: [added.id],
      retainedAttachmentIds: [item.retainedIds[0]],
    },
  };
}

async function facts(item: Item, draftId: string) {
  const result = await fixture.query<{
    head: string; edited_at: Date | null; revisions: number;
    bindings: string[]; mentions: number; refs: string[];
    receipts: number; completed: number;
  }>([
    "select",
    "(select current_revision_id from forum_posts where id=$1) as head,",
    "(select edited_at from forum_posts where id=$1) as edited_at,",
    "(select count(*)::int from forum_post_revisions where post_id=$1) as revisions,",
    "(select coalesce(array_agg(attachment_id order by attachment_id), '{}'::text[])",
    " from forum_post_attachments where post_id=$1) as bindings,",
    "(select count(*)::int from forum_reply_notifications where post_id=$1 and kind='mention') as mentions,",
    "(select coalesce(array_agg(attachment_id order by attachment_id), '{}'::text[])",
    " from forum_attachment_draft_refs where owner_id=$3 and context_key=$4 and draft_id=$2) as refs,",
    "(select count(*)::int from forum_publication_receipts",
    " where owner_id=$3 and context_key=$4 and draft_id=$2) as receipts,",
    "(select count(*)::int from forum_attachment_draft_generations",
    " where owner_id=$3 and context_key=$4 and draft_id=$2) as completed",
  ].join("\n"), [item.postId, draftId, item.ownerId, "post:" + item.postId + ":edit"]);
  return result.rows[0];
}

function nativeSql(value: unknown): string {
  if (typeof value === "string") return value;
  return value && typeof value === "object" && "text" in value
    && typeof value.text === "string" ? value.text : "";
}

function pauseQuery(client: Client, matches: (sql: string) => boolean) {
  const original = client.query;
  let entered!: () => void, release!: () => void;
  const observed = new Promise<void>(resolve => { entered = resolve; });
  const permitted = new Promise<void>(resolve => { release = resolve; });
  let triggered = false;
  client.query = ((...args: unknown[]) => {
    if (!triggered && matches(nativeSql(args[0]))) {
      triggered = true;
      entered();
      return permitted.then(() => Reflect.apply(original, client, args));
    }
    return Reflect.apply(original, client, args);
  }) as typeof client.query;
  return {
    observed, resume: () => release(), restore: () => { client.query = original; },
    get triggered() { return triggered; },
  };
}

function isolatedWriter(client: Client) {
  return new DrizzleForumRepository(drizzle(client), policy, noMeasures);
}

beforeAll(async () => {
  await fixture.connect();
  await fixture.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const name of (await readdir("drizzle")).filter(name => /^\d{4}_.+\.sql$/u.test(name)).sort()) {
    await fixture.query((await readFile("drizzle/" + name, "utf8"))
      .replaceAll('"public".', '"' + schema + '".'));
  }
  await user(recipient);
  await forum.createCategory({ id: "j3b-category", name: "J3b" });
  await forum.createSection({ id: sectionId, categoryId: "j3b-category", name: "J3b" });
});

afterAll(async () => {
  await pool.end();
  await fixture.query("drop schema if exists " + schema + " cascade");
  await fixture.end();
});

describe("SA04-J3b authoritative account admission for published edit", () => {
  it("keeps active fresh edit, retained/new selection, mention and identical lost-response replay atomic", async () => {
    const actor = await user("j3b-active-" + uuid());
    const item = await seed(actor);
    const { draftId, addedId, request } = await prepare(item);
    const before = await facts(item, draftId);
    expect(before.bindings).toHaveLength(2);
    expect(before.refs).toEqual([addedId]);
    await forum.editPublishedPost(request);
    const saved = await facts(item, draftId);
    expect(saved.revisions).toBe(before.revisions + 1);
    expect(saved.head).not.toBe(before.head);
    expect(saved.bindings).toEqual([item.retainedIds[0], addedId].sort());
    expect(saved.mentions).toBe(before.mentions + 1);
    expect(saved.refs).toEqual([]);
    expect(saved.completed).toBe(1);
    expect(saved.receipts).toBe(1);
    await forum.editPublishedPost(request);
    expect(await facts(item, draftId)).toEqual(saved);
  });

  it("denies inactive fresh edit without revision, binding, mention, draft or receipt changes", async () => {
    const actor = await user("j3b-inactive-" + uuid());
    const item = await seed(actor);
    const { draftId, request } = await prepare(item);
    await deactivate(actor);
    const before = await facts(item, draftId);
    await expect(forum.editPublishedPost(request)).rejects.toBeInstanceOf(AccountInactiveError);
    expect(await facts(item, draftId)).toEqual(before);
  });

  it("denies missing/non-owner actor without changing any persisted edit facts", async () => {
    const actor = await user("j3b-other-owner-" + uuid());
    const item = await seed(actor);
    const { draftId, request } = await prepare(item);
    const before = await facts(item, draftId);
    await expect(forum.editPublishedPost({ ...request, actorId: "j3b-missing-" + uuid() }))
      .rejects.toBeInstanceOf(ForumAuthorizationError);
    expect(await facts(item, draftId)).toEqual(before);
  });

  it("denies previously committed matching edit receipt replay to inactive actor", async () => {
    const actor = await user("j3b-replay-" + uuid());
    const item = await seed(actor);
    const { draftId, request } = await prepare(item);
    await forum.editPublishedPost(request);
    const committed = await facts(item, draftId);
    await deactivate(actor);
    await expect(forum.editPublishedPost(request)).rejects.toBeInstanceOf(AccountInactiveError);
    expect(await facts(item, draftId)).toEqual(committed);
  });

  it("preserves stale-revision and post-commit failure atomicity for the active owner", async () => {
    const actor = await user("j3b-rollback-" + uuid());
    const item = await seed(actor);
    const { draftId, request } = await prepare(item);
    const before = await facts(item, draftId);
    await expect(forum.editPublishedPost({ ...request, expectedRevisionId: uuid() }))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await facts(item, draftId)).toEqual(before);
    // The unknown attachment is rejected after revision/CAS, mentions and retained-ref deletion.
    await expect(forum.editPublishedPost({ ...request, attachmentIds: [uuid()] }))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await facts(item, draftId)).toEqual(before);
  });

  it("sees committed deactivation before fresh edit admission after the content lock", async () => {
    const actor = await user("j3b-state-first-" + uuid());
    const item = await seed(actor);
    const { draftId, request } = await prepare(item);
    const before = await facts(item, draftId);
    const writer = new Client({ connectionString: url, options });
    await writer.connect();
    const paused = pauseQuery(writer, sql => /from "user" .*for no key update/i.test(sql));
    try {
      const pending = isolatedWriter(writer).editPublishedPost(request);
      await paused.observed; // Draft advisory and post FOR UPDATE are already acquired.
      await deactivate(actor);
      paused.resume();
      await expect(pending).rejects.toBeInstanceOf(AccountInactiveError);
      expect(paused.triggered).toBe(true);
      expect(await facts(item, draftId)).toEqual(before);
    } finally {
      paused.resume();
      paused.restore();
      await writer.end();
    }
  }, 30_000);

  it("holds the actor lock through mention, attachment finalization, receipt and COMMIT", async () => {
    const actor = await user("j3b-writer-first-" + uuid());
    const item = await seed(actor);
    const { draftId, request } = await prepare(item);
    const before = await facts(item, draftId);
    const writer = new Client({ connectionString: url, options });
    await writer.connect();
    const paused = pauseQuery(writer, sql => /^commit$/i.test(sql.trim()));
    let deactivatorOpen = false;
    try {
      const pending = isolatedWriter(writer).editPublishedPost(request);
      await paused.observed; // All protected writes executed; only COMMIT is withheld.
      expect(await facts(item, draftId)).toEqual(before);
      await fixture.query("begin");
      deactivatorOpen = true;
      await fixture.query("set local lock_timeout = '180ms'");
      await expect(fixture.query('update "user" set deactivated_at=now(),'
        + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years' where id=$1",
      [actor])).rejects.toMatchObject({ code: "55P03" });
      await fixture.query("rollback");
      deactivatorOpen = false;
      paused.resume();
      await pending;
      const saved = await facts(item, draftId);
      expect(saved.revisions).toBe(before.revisions + 1);
      expect(saved.bindings).toEqual([item.retainedIds[0], request.attachmentIds[0]].sort());
      expect(saved.mentions).toBe(before.mentions + 1);
      expect(saved.refs).toEqual([]);
      expect(saved.completed).toBe(1);
      expect(saved.receipts).toBe(1);
      await deactivate(actor);
      await expect(forum.editPublishedPost(request)).rejects.toBeInstanceOf(AccountInactiveError);
      expect(await facts(item, draftId)).toEqual(saved);
    } finally {
      paused.resume();
      paused.restore();
      if (deactivatorOpen) await fixture.query("rollback");
      await writer.end();
    }
  }, 30_000);
});
