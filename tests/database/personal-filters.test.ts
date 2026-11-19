import { readdir, readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import { InvalidForumContentError, ForumService } from "../../db/forum-service";
import { DrizzleForumRepository, ForumEntityNotFoundError } from "../../db/forum-repository";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("Personal filters require a disposable loopback *_test PostgreSQL database");
}
const schema = "personal_filters_test", options = "-c search_path=" + schema;
const fixture = new Client({ connectionString: url, options });
const pool = new Pool({ connectionString: url, options, max: 4 });
const repository = new DrizzleForumRepository(drizzle(pool),
  { cooldownMs: 0, now: () => new Date() }, async () => {});
const service = new ForumService(repository);
const uuid = () => crypto.randomUUID();
async function person() {
  const id = "filter-" + uuid();
  await fixture.query('insert into "user"(id,name,email) values($1,$1,$2)', [id, id + "@example.test"]);
  return id;
}
async function topic(authorId: string) {
  const id = uuid();
  await repository.createTopicWithInitialPost({
    id, sectionId: "filter-section", authorId,
    titleRevision: { id: uuid(), originalContent: "Mute topic", sourceLocale: "en" },
    initialPost: { id: uuid(), topicId: id, authorId,
      bodyRevision: { id: uuid(), originalContent: "First post", sourceLocale: "en" } },
  });
  return id;
}
async function deactivate(actorId: string) {
  await fixture.query('update "user" set deactivated_at=now(),deactivated_by_user_id=$1,'
    + "retain_at_least_until=now()+interval '2 years' where id=$1", [actorId]);
}
beforeAll(async () => {
  await fixture.connect();
  await fixture.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const name of (await readdir("drizzle")).filter(x => /^\d{4}_.+[.]sql$/.test(x)).sort()) {
    await fixture.query((await readFile("drizzle/" + name, "utf8"))
      .replaceAll('"public".', '"' + schema + '".'));
  }
  await repository.createCategory({ id: "filter-category", name: "Filters" });
  await repository.createSection({ id: "filter-section", categoryId: "filter-category", name: "Filters" });
});
afterAll(async () => {
  await pool.end();
  await fixture.query("drop schema if exists " + schema + " cascade");
  await fixture.end();
});

describe("Personal filters: own-state PostgreSQL persistence and admission", () => {
  it("persists topic Mute only for own actor; ON is idempotent, OFF then ON refreshes date", async () => {
    const author = await person(), a = await person(), b = await person();
    const x = await topic(author);
    expect(await repository.readTopicMute(a, x)).toBe(false);
    expect(await service.setTopicMute({ actorId: a, topicId: x, muted: true })).toBe(true);
    const first = (await fixture.query<{ created_at: Date }>(
      "select created_at from forum_topic_mutes where user_id=$1 and topic_id=$2", [a, x])).rows[0]!.created_at;
    expect(await service.setTopicMute({ actorId: a, topicId: x, muted: true })).toBe(true);
    const repeat = (await fixture.query<{ created_at: Date }>(
      "select created_at from forum_topic_mutes where user_id=$1 and topic_id=$2", [a, x])).rows[0]!.created_at;
    expect(repeat).toEqual(first);
    expect(await repository.readTopicMute(b, x)).toBe(false);
    await service.setTopicMute({ actorId: b, topicId: x, muted: true });
    await service.setTopicMute({ actorId: a, topicId: x, muted: false });
    await service.setTopicMute({ actorId: a, topicId: x, muted: false });
    expect(await repository.readTopicMute(a, x)).toBe(false);
    expect(await repository.readTopicMute(b, x)).toBe(true);
    await service.setTopicMute({ actorId: a, topicId: x, muted: true });
    expect(await repository.readTopicMute(a, x)).toBe(true);
    expect((await fixture.query("select count(*)::int n from forum_topic_watches where user_id=$1", [a]))
      .rows[0].n).toBe(0);
    expect((await fixture.query("select count(*)::int n from forum_topic_bookmarks where user_id=$1", [a]))
      .rows[0].n).toBe(0);
    expect((await fixture.query("select count(*)::int n from forum_topic_read_states where user_id=$1", [a]))
      .rows[0].n).toBe(0);
  });

  it("persists directional Block, admits inactive target, rejects self and missing target", async () => {
    const a = await person(), b = await person();
    expect(await repository.readUserBlock(a, b)).toBe(false);
    await deactivate(b);
    await service.setUserBlock({ actorId: a, blockedUserId: b, blocked: true });
    const saved = (await fixture.query<{ created_at: Date }>(
      "select created_at from forum_user_blocks where user_id=$1 and blocked_user_id=$2", [a, b]))
      .rows[0]!.created_at;
    await service.setUserBlock({ actorId: a, blockedUserId: b, blocked: true });
    expect((await fixture.query<{ created_at: Date }>(
      "select created_at from forum_user_blocks where user_id=$1 and blocked_user_id=$2", [a, b]))
      .rows[0]!.created_at).toEqual(saved);
    expect(await repository.readUserBlock(a, b)).toBe(true);
    expect(await repository.readUserBlock(b, a)).toBe(false);
    await service.setUserBlock({ actorId: a, blockedUserId: b, blocked: false });
    await service.setUserBlock({ actorId: a, blockedUserId: b, blocked: false });
    expect(await repository.readUserBlock(a, b)).toBe(false);
    expect(() => service.setUserBlock({ actorId: a, blockedUserId: a, blocked: true }))
      .toThrow(InvalidForumContentError);
    await expect(service.setUserBlock({ actorId: a, blockedUserId: uuid(), blocked: true }))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    await expect(fixture.query("insert into forum_user_blocks(user_id,blocked_user_id) values($1,$1)", [a]))
      .rejects.toThrow();
  });

  it("guards every ON/OFF/no-op for inactive actor and target FK under one transaction", async () => {
    const author = await person(), a = await person(), x = await topic(author);
    await service.setTopicMute({ actorId: a, topicId: x, muted: true });
    await deactivate(a);
    await expect(service.setTopicMute({ actorId: a, topicId: x, muted: true }))
      .rejects.toBeInstanceOf(AccountInactiveError);
    await expect(service.setTopicMute({ actorId: a, topicId: x, muted: false }))
      .rejects.toBeInstanceOf(AccountInactiveError);
    await expect(service.setUserBlock({ actorId: a, blockedUserId: author, blocked: false }))
      .rejects.toBeInstanceOf(AccountInactiveError);
    await expect(service.setTopicMute({ actorId: "missing-actor", topicId: x, muted: true }))
      .rejects.toBeInstanceOf(AccountMissingError);
    await expect(service.setTopicMute({ actorId: author, topicId: uuid(), muted: true }))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect(await repository.readTopicMute(a, x)).toBe(true);
  });

  it("enforces private suppression receipt PK/FKs without adding inbox rows", async () => {
    const author = await person(), recipient = await person(), x = await topic(author);
    const post = (await fixture.query<{ id: string }>(
      "select id from forum_posts where topic_id=$1 order by created_at,id limit 1", [x])).rows[0]!.id;
    await fixture.query("insert into forum_post_notification_suppressions(recipient_user_id,post_id) values($1,$2)",
      [recipient, post]);
    await expect(fixture.query("insert into forum_post_notification_suppressions(recipient_user_id,post_id) values($1,$2)",
      [recipient, post])).rejects.toThrow();
    expect((await fixture.query("select count(*)::int n from forum_reply_notifications where recipient_user_id=$1", [recipient]))
      .rows[0].n).toBe(0);
    await fixture.query('delete from "user" where id=$1', [recipient]);
    expect((await fixture.query("select count(*)::int n from forum_post_notification_suppressions where recipient_user_id=$1",
      [recipient])).rows[0].n).toBe(0);
  });
});


describe("Personal Mute/Block: ordinary publication policy", () => {
  async function reply(topicId: string, authorId: string, body: string, parentPostId?: string) {
    const id = uuid();
    await repository.createPost({
      id, topicId, authorId, parentPostId: parentPostId ?? null,
      bodyRevision: { id: uuid(), originalContent: body, sourceLocale: "en" },
    });
    return id;
  }
  async function visible(postId: string) {
    return (await fixture.query<{ recipient_user_id: string; kind: string }>(
      "select recipient_user_id,kind from forum_reply_notifications where post_id=$1 order by recipient_user_id",
      [postId])).rows;
  }
  async function receipts(postId: string) {
    return (await fixture.query<{ recipient_user_id: string }>(
      "select recipient_user_id from forum_post_notification_suppressions where post_id=$1 order by recipient_user_id",
      [postId])).rows.map(row => row.recipient_user_id);
  }
  const mention = (id: string) => "[profile](/en/users/" + encodeURIComponent(id) + ")";

  it("Mute suppresses author, parent, Watch and mention without touching unrelated topic", async () => {
    const author = await person(), responder = await person(), watcher = await person();
    const x = await topic(author), y = await topic(author);
    const parent = await reply(x, watcher, "Parent");
    await repository.setTopicWatch({ actorId: watcher, topicId: x, watching: true });
    await repository.setTopicMute({ actorId: author, topicId: x, muted: true });
    await repository.setTopicMute({ actorId: watcher, topicId: x, muted: true });
    const muted = await reply(x, responder, mention(watcher), parent);
    expect(await visible(muted)).toEqual([]);
    expect(await receipts(muted)).toEqual([author, watcher].sort());
    const other = await reply(y, responder, mention(watcher));
    expect((await visible(other)).map(item => item.recipient_user_id)).toEqual([author, watcher].sort());
    expect(await repository.readTopicWatch(watcher, x)).toBe(true);
  });

  it("directional Block suppresses only blocked publication actor and folds matching topic authors", async () => {
    const a = await person(), b = await person(), c = await person();
    const x = await topic(a);
    await repository.setUserBlock({ actorId: a, blockedUserId: b, blocked: true });
    const fromB = await reply(x, b, mention(a));
    expect(await visible(fromB)).toEqual([]);
    expect(await receipts(fromB)).toEqual([a]);
    const fromC = await reply(x, c, mention(a));
    expect(await visible(fromC)).toEqual([{ recipient_user_id: a, kind: "reply" }]);
    expect(await repository.readTopicBlockedAuthors(a, x)).toEqual([b]);
    expect(await repository.readTopicBlockedAuthors(b, x)).toEqual([]);
    await repository.setUserBlock({ actorId: a, blockedUserId: b, blocked: false });
    expect(await repository.readTopicBlockedAuthors(a, x)).toEqual([]);
  });

  it("suppression receipt survives Unmute and prevents edited old mention backfill", async () => {
    const author = await person(), actor = await person(), target = await person();
    const x = await topic(author);
    await repository.setTopicMute({ actorId: target, topicId: x, muted: true });
    const oldPost = await reply(x, actor, mention(target));
    expect(await receipts(oldPost)).toEqual([target]);
    await repository.setTopicMute({ actorId: target, topicId: x, muted: false });
    // Editing existing post mentions must not reissue an already consumed pair.
    const revision = (await fixture.query<{ current_revision_id: string }>(
      "select current_revision_id from forum_posts where id=$1", [oldPost])).rows[0]!.current_revision_id;
    await repository.editPublishedPost({
      postId: oldPost, topicId: x, actorId: actor, expectedRevisionId: revision,
      body: "Unrelated edit " + mention(target), draftId: uuid(),
      attachmentIds: [], retainedAttachmentIds: [],
    });
    expect((await visible(oldPost)).some(row => row.recipient_user_id === target)).toBe(false);
    expect(await receipts(oldPost)).toEqual([target]);
    const next = (await fixture.query<{ current_revision_id: string }>(
      "select current_revision_id from forum_posts where id=$1", [oldPost])).rows[0]!.current_revision_id;
    await repository.editPublishedPost({
      postId: oldPost, topicId: x, actorId: actor, expectedRevisionId: next,
      body: "Re-added " + mention(target), draftId: uuid(),
      attachmentIds: [], retainedAttachmentIds: [],
    });
    expect((await visible(oldPost)).some(row => row.recipient_user_id === target)).toBe(false);
    const freshPost = await reply(x, actor, mention(target));
    expect((await visible(freshPost)).some(row => row.recipient_user_id === target)).toBe(true);
  });
});
