import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import { DrizzleForumAttachments } from "../../db/forum-attachments";
import { DrizzleForumRepository } from "../../db/forum-repository";

const url = process.env.DATABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname) ||
  !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA04-J2 requires a disposable local *_test PostgreSQL database");
}
const schema = "sa04_j2_publication_lifecycle_test";
const options = `-c search_path=${schema}`;
const fixture = new Client({ connectionString: url, options });
const pool = new Pool({ connectionString: url, options, max: 4 });
const policy = { cooldownMs: 0, now: () => new Date() };
const noMeasures = async () => {}; // Lifecycle admission must not depend on injected measure policy.
const forum = new DrizzleForumRepository(drizzle(pool), policy, noMeasures);
const attachments = new DrizzleForumAttachments(drizzle(pool));
const sectionId = "j2-publication-section";
const baseline = "j2-baseline-topic";
const active = "j2-active";
const uuid = () => crypto.randomUUID();

async function user(id: string) {
  await fixture.query('insert into "user"(id,name,email) values ($1,$2,$3)',
    [id, "J2 " + id, id + "@test.invalid"]);
  return id;
}
async function deactivate(id: string) {
  await fixture.query(`update "user" set deactivated_at=now(),
    deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years' where id=$1`, [id]);
}
function newTopic(authorId: string, id: string = uuid(), draft?: { contextKey: string; draftId: string; attachmentIds: string[] }) {
  return {
    id, sectionId, authorId, titleRevision: {
      id: uuid(), originalContent: "J2 topic title", sourceLocale: "en",
    },
    initialPost: {
      id: uuid(), topicId: id, authorId,
      bodyRevision: { id: uuid(), originalContent: "J2 initial answer", sourceLocale: "en" },
    },
    ...(draft ? { publishedDraft: draft } : {}),
  };
}
function newReply(authorId: string, topicId = baseline, draft?: { contextKey: string; draftId: string; attachmentIds: string[] },
  parentPostId?: string) {
  return {
    id: uuid(), topicId, authorId, ...(parentPostId ? { parentPostId } : {}),
    bodyRevision: { id: uuid(), originalContent: "J2 reply", sourceLocale: "en" },
    ...(draft ? { publishedDraft: draft } : {}),
  };
}
function lowTopic(authorId: string) {
  return { id: uuid(), sectionId, authorId,
    titleRevision: { id: uuid(), originalContent: "J2 low-level", sourceLocale: "en" } };
}
async function facts() {
  const r = await fixture.query<Record<string, number>>(`select
    (select count(*)::int from forum_topics) topics,
    (select count(*)::int from forum_posts) posts,
    (select count(*)::int from forum_topic_title_revisions) titles,
    (select count(*)::int from forum_post_revisions) revisions,
    (select count(*)::int from forum_topic_tags) tags,
    (select count(*)::int from forum_reply_notifications) notifications,
    (select count(*)::int from forum_post_attachments) published_files,
    (select count(*)::int from forum_publication_receipts) receipts,
    (select count(*)::int from forum_attachment_draft_refs) draft_refs`);
  return r.rows[0];
}
async function stagedFile(ownerId: string, contextKey: string) {
  const draftId = uuid(), attachmentId = uuid();
  await attachments.createDraftAttachment({
    id: attachmentId, ownerId, contextKey, draftId,
    objectKey: "private/" + uuid(), fileName: "retained.txt",
    declaredMime: "text/plain", detectedType: "text",
    responseMime: "text/plain; charset=utf-8",
    byteSize: 10, verificationStatus: "type-checked",
  });
  return { contextKey, draftId, attachmentIds: [attachmentId] };
}
async function draftState(ownerId: string, draftId: string) {
  return (await fixture.query(`select status from forum_attachment_draft_generations
    where owner_id=$1 and draft_id=$2`, [ownerId, draftId])).rows;
}

function nativeSql(value: unknown): string {
  if (typeof value === "string") return value;
  return value && typeof value === "object" && "text" in value
    && typeof value.text === "string" ? value.text : "";
}
/** Pause the real node-postgres call before one precise persistence seam. */
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
  return { observed, resume: () => release(), restore: () => { client.query = original; },
    get triggered() { return triggered; } };
}
function isolatedWriter(client: Client) {
  return new DrizzleForumRepository(drizzle(client), policy, noMeasures);
}

beforeAll(async () => {
  await fixture.connect();
  await fixture.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const file of (await readdir("drizzle")).filter(name => /^\d{4}_.+\.sql$/u.test(name)).sort()) {
    await fixture.query((await readFile("drizzle/" + file, "utf8"))
      .replaceAll('"public".', `"${schema}".`));
  }
  await user(active);
  await forum.createCategory({ id: "j2-publication-category", name: "J2" });
  await forum.createSection({ id: sectionId, categoryId: "j2-publication-category", name: "J2" });
  await forum.createTopicWithInitialPost(newTopic(active, baseline));
});
afterAll(async () => {
  await pool.end();
  await fixture.query(`drop schema if exists ${schema} cascade`);
  await fixture.end();
});

describe("SA04-J2 authoritative Forum publication lifecycle", () => {
  it("guards low-level createTopic even with noop measure admission; preserves active and rejects inactive/missing", async () => {
    const actor = await user("j2-low-" + uuid());
    const created = await forum.createTopic(lowTopic(actor));
    expect(created.authorId).toBe(actor);
    await deactivate(actor);
    const before = await facts();
    await expect(forum.createTopic(lowTopic(actor))).rejects.toBeInstanceOf(AccountInactiveError);
    await expect(forum.createTopic(lowTopic("j2-absent-" + uuid())))
      .rejects.toBeInstanceOf(AccountMissingError);
    expect(await facts()).toEqual(before);
    expect((await fixture.query("select id from forum_topics where id=$1", [created.id])).rows)
      .toEqual([{ id: created.id }]);
  });

  it("guards topic plus initial post and reply, including parent dependency, with zero denied facts", async () => {
    const inactive = await user("j2-inactive-" + uuid());
    const missing = "j2-missing-" + uuid();
    const parent = (await forum.createPost(newReply(active))).id;
    const normal = await forum.createTopicWithInitialPost(newTopic(active));
    expect(normal.topic.authorId).toBe(active);
    const normalReply = await forum.createPost(newReply(active, baseline, undefined, parent));
    expect(normalReply.parentPostId).toBe(parent);
    await deactivate(inactive);
    const before = await facts();
    await expect(forum.createTopicWithInitialPost(newTopic(inactive)))
      .rejects.toBeInstanceOf(AccountInactiveError);
    await expect(forum.createTopicWithInitialPost(newTopic(missing)))
      .rejects.toBeInstanceOf(AccountMissingError);
    await expect(forum.createPost(newReply(inactive, baseline, undefined, parent)))
      .rejects.toBeInstanceOf(AccountInactiveError);
    await expect(forum.createPost(newReply(missing, baseline, undefined, parent)))
      .rejects.toBeInstanceOf(AccountMissingError);
    expect(await facts()).toEqual(before);
  });

  it("preserves active topic receipt replay after closure, but rejects retained inactive replay without mutation", async () => {
    const actor = await user("j2-topic-replay-" + uuid());
    const draft = await stagedFile(actor, `section:${sectionId}:topic`);
    const request = newTopic(actor, uuid(), draft);
    const result = await forum.createTopicWithInitialPost(request);
    const firstReceipt = (await fixture.query("select topic_id,post_id from forum_publication_receipts where owner_id=$1", [actor])).rows;
    expect(firstReceipt).toEqual([{ topic_id: result.topic.id, post_id: result.post.id }]);
    expect(await draftState(actor, draft.draftId)).toHaveLength(1);
    await fixture.query("update forum_topics set is_closed=true,closure_version=1 where id=$1", [result.topic.id]);
    const before = await facts();
    const replay = await forum.createTopicWithInitialPost({
      ...request, id: uuid(), titleRevision: { ...request.titleRevision, id: uuid() },
      initialPost: {
        ...request.initialPost, id: uuid(), topicId: uuid(),
        bodyRevision: { ...request.initialPost.bodyRevision, id: uuid() },
      },
    });
    expect(replay.topic).toMatchObject({ id: result.topic.id, isClosed: true, closureVersion: 1 });
    expect(replay.post.id).toBe(result.post.id);
    expect(await facts()).toEqual(before);
    const savedDraft = await draftState(actor, draft.draftId);
    await deactivate(actor);
    await expect(forum.createTopicWithInitialPost(request)).rejects.toBeInstanceOf(AccountInactiveError);
    expect(await facts()).toEqual(before);
    expect(await draftState(actor, draft.draftId)).toEqual(savedDraft);
  });

  it("preserves active reply receipt replay after closure; retained inactive receipt gives no success", async () => {
    const actor = await user("j2-reply-replay-" + uuid());
    const topicId = (await forum.createTopicWithInitialPost(newTopic(active))).topic.id;
    const draft = await stagedFile(actor, `topic:${topicId}:reply`);
    const request = newReply(actor, topicId, draft);
    const first = await forum.createPost(request);
    const receipt = (await fixture.query("select post_id from forum_publication_receipts where owner_id=$1", [actor])).rows;
    expect(receipt).toEqual([{ post_id: first.id }]);
    await fixture.query("update forum_topics set is_closed=true,closure_version=1 where id=$1", [topicId]);
    const before = await facts();
    expect((await forum.createPost({ ...request, id: uuid(), bodyRevision: {
      ...request.bodyRevision, id: uuid(),
    } })).id).toBe(first.id);
    expect(await facts()).toEqual(before);
    const savedDraft = await draftState(actor, draft.draftId);
    await deactivate(actor);
    await expect(forum.createPost(request)).rejects.toBeInstanceOf(AccountInactiveError);
    expect(await facts()).toEqual(before);
    expect(await draftState(actor, draft.draftId)).toEqual(savedDraft);
  });

  it("deactivation-first at final actor admission denies staged reply and keeps draft/receipt unchanged", async () => {
    const actor = await user("j2-race-loser-" + uuid());
    const draft = await stagedFile(actor, `topic:${baseline}:reply`);
    const request = newReply(actor, baseline, draft);
    const writer = new Client({ connectionString: url, options });
    await writer.connect();
    const paused = pauseQuery(writer, text => /from "user" .*for no key update/i.test(text));
    const before = await facts();
    const storedDraft = await draftState(actor, draft.draftId);
    try {
      const publishing = isolatedWriter(writer).createPost(request);
      await paused.observed; // Real SQL reached the final J1 actor gate after draft/topic.
      await deactivate(actor);
      paused.resume();
      await expect(publishing).rejects.toBeInstanceOf(AccountInactiveError);
      expect(paused.triggered).toBe(true);
      expect(await facts()).toEqual(before);
      expect(await draftState(actor, draft.draftId)).toEqual(storedDraft);
      expect((await fixture.query("select id from forum_posts where id=$1", [request.id])).rowCount).toBe(0);
    } finally {
      paused.resume();
      paused.restore();
      await writer.end();
    }
  }, 30_000);

  it("writer-first actor lock covers publication's final attachment bind and receipt through COMMIT", async () => {
    const actor = await user("j2-race-winner-" + uuid());
    const topicId = (await forum.createTopicWithInitialPost(newTopic(active))).topic.id;
    const draft = await stagedFile(actor, `topic:${topicId}:reply`);
    const request = newReply(actor, topicId, draft);
    const writer = new Client({ connectionString: url, options });
    await writer.connect();
    const paused = pauseQuery(writer, text => /^insert into "forum_post_attachments"\s/i.test(text));
    let deactivatorOpen = false;
    try {
      const publishing = isolatedWriter(writer).createPost(request);
      await paused.observed; // After actor lock + new post/revision, before the final attachment binding.
      await fixture.query("begin");
      deactivatorOpen = true;
      await fixture.query("set local lock_timeout = '180ms'");
      await expect(fixture.query(`update "user" set deactivated_at=now(),
        deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years' where id=$1`, [actor]))
        .rejects.toMatchObject({ code: "55P03" });
      await fixture.query("rollback");
      deactivatorOpen = false;
      paused.resume();
      const first = await publishing;
      expect(first.id).toBe(request.id);
      expect((await fixture.query("select post_id from forum_post_attachments where attachment_id=$1",
        [draft.attachmentIds[0]])).rows).toEqual([{ post_id: first.id }]);
      expect((await fixture.query("select post_id from forum_publication_receipts where owner_id=$1",
        [actor])).rows).toEqual([{ post_id: first.id }]);
      expect((await fixture.query("select count(*)::int n from forum_attachment_draft_refs where owner_id=$1",
        [actor])).rows[0]?.n).toBe(0);
      await deactivate(actor);
      const before = await facts();
      await expect(forum.createPost(newReply(actor, topicId))).rejects.toBeInstanceOf(AccountInactiveError);
      expect(await facts()).toEqual(before);
    } finally {
      paused.resume();
      paused.restore();
      if (deactivatorOpen) await fixture.query("rollback");
      await writer.end();
    }
  }, 30_000);
});
