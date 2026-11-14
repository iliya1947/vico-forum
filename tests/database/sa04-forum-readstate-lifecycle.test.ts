import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import { DrizzleForumRepository, ForumEntityNotFoundError } from "../../db/forum-repository";

const url = process.env.DATABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA04-J5 requires a disposable loopback *_test PostgreSQL database");
}

const schema = "sa04_j5_readstate_lifecycle_test";
const options = "-c search_path=" + schema;
const fixture = new Client({ connectionString: url, options });
const pool = new Pool({ connectionString: url, options, max: 6 });
const noMeasures = async () => {};
const policy = { cooldownMs: 0, now: () => new Date() };
const forum = new DrizzleForumRepository(drizzle(pool), policy, noMeasures);
const uuid = () => crypto.randomUUID();
const authorId = "j5-author";
const categoryId = "j5-category";
const sectionId = "j5-section";

type Item = { actorId: string; topicId: string; posts: [string, string, string] };

async function user(): Promise<string> {
  const id = "j5-reader-" + uuid();
  await fixture.query('insert into "user"(id,name,email) values ($1,$2,$3)',
    [id, id, id + "@test.invalid"]);
  return id;
}

async function deactivate(actorId: string): Promise<void> {
  await fixture.query('update "user" set deactivated_at=now(),deactivated_by_user_id=$1,'
    + "retain_at_least_until=now()+interval '2 years' where id=$1", [actorId]);
}

async function seed(): Promise<Item> {
  const actorId = await user();
  const topicId = uuid();
  const prefix = uuid() + "-";
  const posts: [string, string, string] = [prefix + "a", prefix + "b", prefix + "c"];
  await forum.createTopicWithInitialPost({
    id: topicId, sectionId, authorId,
    titleRevision: { id: uuid(), originalContent: "Read-state lifecycle", sourceLocale: "en" },
    initialPost: {
      id: posts[0], topicId, authorId,
      bodyRevision: { id: uuid(), originalContent: "First post", sourceLocale: "en" },
    },
  });
  for (const id of posts.slice(1)) {
    await forum.createPost({
      id, topicId, authorId,
      bodyRevision: { id: uuid(), originalContent: "Later post", sourceLocale: "en" },
    });
  }
  // Exact timestamp ties exercise the existing post-ID tiebreak rule.
  await fixture.query("update forum_posts set created_at='2026-11-01T12:00:00Z' where topic_id=$1", [topicId]);
  return { actorId, topicId, posts };
}

async function marker(item: Item) {
  const rows = await fixture.query<{ last_read_post_id: string; updated_at: Date }>(
    "select last_read_post_id,updated_at from forum_topic_read_states where user_id=$1 and topic_id=$2",
    [item.actorId, item.topicId],
  );
  return rows.rows[0] ?? null;
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

beforeAll(async () => {
  await fixture.connect();
  await fixture.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const file of (await readdir("drizzle")).filter(name => /^\d{4}_.+\.sql$/u.test(name)).sort()) {
    await fixture.query((await readFile("drizzle/" + file, "utf8"))
      .replaceAll('"public".', '"' + schema + '".'));
  }
  await fixture.query('insert into "user"(id,name,email) values ($1,$2,$3)',
    [authorId, authorId, authorId + "@test.invalid"]);
  await forum.createCategory({ id: categoryId, name: "Read-state" });
  await forum.createSection({ id: sectionId, categoryId, name: "Read-state" });
});

afterAll(async () => {
  await pool.end();
  await fixture.query("drop schema if exists " + schema + " cascade");
  await fixture.end();
});

describe("SA04-J5 topic read-state authoritative actor admission", () => {
  it("preserves active new, unread, read, forward, same and backward marker semantics", async () => {
    const item = await seed();
    const [a, b, c] = item.posts;
    expect(await forum.readTopicReadState(item.actorId, item.topicId)).toMatchObject({
      state: "new", firstUnreadPostId: a, latestPostId: c, lastReadPostId: null,
    });
    expect(await forum.advanceTopicReadState(item.actorId, item.topicId, a)).toMatchObject({
      state: "unread", firstUnreadPostId: b, lastReadPostId: a, latestPostId: c,
    });
    expect(await forum.advanceTopicReadState(item.actorId, item.topicId, b)).toMatchObject({
      state: "unread", firstUnreadPostId: c, lastReadPostId: b,
    });
    expect(await forum.advanceTopicReadState(item.actorId, item.topicId, c)).toMatchObject({
      state: "read", firstUnreadPostId: null, lastReadPostId: c, latestPostId: c,
    });
    const before = await marker(item);
    expect(await forum.advanceTopicReadState(item.actorId, item.topicId, c))
      .toMatchObject({ state: "read", lastReadPostId: c });
    expect(await forum.advanceTopicReadState(item.actorId, item.topicId, a))
      .toMatchObject({ state: "read", lastReadPostId: c });
    expect(await marker(item)).toEqual(before);
    const nextId = uuid();
    await forum.createPost({
      id: nextId, topicId: item.topicId, authorId,
      bodyRevision: { id: uuid(), originalContent: "After delivery", sourceLocale: "en" },
    });
    expect(await forum.readTopicReadState(item.actorId, item.topicId)).toMatchObject({
      state: "unread", firstUnreadPostId: nextId, latestPostId: nextId, lastReadPostId: c,
    });
  });

  it("denies inactive/missing actors on first advance and same/backward no-op without changing facts", async () => {
    const first = await seed();
    const existing = await seed();
    await forum.advanceTopicReadState(existing.actorId, existing.topicId, existing.posts[2]);
    const before = await marker(existing);
    await deactivate(first.actorId);
    await deactivate(existing.actorId);
    for (const postId of [existing.posts[2], existing.posts[0]]) {
      await expect(forum.advanceTopicReadState(existing.actorId, existing.topicId, postId))
        .rejects.toBeInstanceOf(AccountInactiveError);
    }
    await expect(forum.advanceTopicReadState(first.actorId, first.topicId, first.posts[0]))
      .rejects.toBeInstanceOf(AccountInactiveError);
    await expect(forum.advanceTopicReadState("j5-absent-" + uuid(), first.topicId, first.posts[0]))
      .rejects.toBeInstanceOf(AccountMissingError);
    expect(await marker(first)).toBeNull();
    expect(await marker(existing)).toEqual(before);
  });

  it("preserves cross-topic and missing-target denials without making read-state facts", async () => {
    const item = await seed();
    const other = await seed();
    await expect(forum.advanceTopicReadState(item.actorId, item.topicId, other.posts[0]))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    await expect(forum.advanceTopicReadState(item.actorId, item.topicId, "j5-unknown-" + uuid()))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect(await marker(item)).toBeNull();
  });

  it("keeps the timestamp + ID monotonic winner under concurrent advances", async () => {
    const item = await seed();
    const outcomes = await Promise.all([
      forum.advanceTopicReadState(item.actorId, item.topicId, item.posts[1]),
      forum.advanceTopicReadState(item.actorId, item.topicId, item.posts[0]),
      forum.advanceTopicReadState(item.actorId, item.topicId, item.posts[2]),
      forum.advanceTopicReadState(item.actorId, item.topicId, item.posts[1]),
    ]);
    expect(outcomes).toHaveLength(4);
    expect(await marker(item)).toMatchObject({ last_read_post_id: item.posts[2] });
    expect(await forum.readTopicReadState(item.actorId, item.topicId)).toMatchObject({
      state: "read", latestPostId: item.posts[2], firstUnreadPostId: null,
    });
  });

  it("rejects when deactivation commits after FK locks but before actor admission", async () => {
    const item = await seed();
    await forum.advanceTopicReadState(item.actorId, item.topicId, item.posts[0]);
    const before = await marker(item);
    const writer = new Client({ connectionString: url, options });
    await writer.connect();
    const paused = pauseQuery(writer, sql => /from "user" .*for no key update/i.test(sql));
    try {
      const isolated = new DrizzleForumRepository(drizzle(writer), policy, noMeasures);
      const pending = isolated.advanceTopicReadState(item.actorId, item.topicId, item.posts[1]);
      await paused.observed;
      await deactivate(item.actorId);
      paused.resume();
      await expect(pending).rejects.toBeInstanceOf(AccountInactiveError);
      expect(await marker(item)).toEqual(before);
    } finally {
      paused.resume();
      paused.restore();
      await writer.end();
    }
  }, 30_000);

  it("holds the actor lock through no-op result readback and COMMIT", async () => {
    const item = await seed();
    await forum.advanceTopicReadState(item.actorId, item.topicId, item.posts[2]);
    const before = await marker(item);
    const writer = new Client({ connectionString: url, options });
    await writer.connect();
    const paused = pauseQuery(writer, sql => /^commit$/i.test(sql.trim()));
    let deactivatorOpen = false;
    try {
      const isolated = new DrizzleForumRepository(drizzle(writer), policy, noMeasures);
      const pending = isolated.advanceTopicReadState(item.actorId, item.topicId, item.posts[0]);
      await paused.observed;
      await fixture.query("begin");
      deactivatorOpen = true;
      await fixture.query("set local lock_timeout = '180ms'");
      await expect(fixture.query('update "user" set deactivated_at=now(),'
        + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years' where id=$1",
      [item.actorId])).rejects.toMatchObject({ code: "55P03" });
      await fixture.query("rollback");
      deactivatorOpen = false;
      paused.resume();
      expect(await pending).toMatchObject({ lastReadPostId: item.posts[2], state: "read" });
      expect(await marker(item)).toEqual(before);
      await deactivate(item.actorId);
      await expect(forum.advanceTopicReadState(item.actorId, item.topicId, item.posts[1]))
        .rejects.toBeInstanceOf(AccountInactiveError);
      expect(await marker(item)).toEqual(before);
    } finally {
      paused.resume();
      paused.restore();
      if (deactivatorOpen) await fixture.query("rollback");
      await writer.end();
    }
  }, 30_000);

  it("allows read-state FK KEY SHARE beside an existing content writer's NO KEY UPDATE lock", async () => {
    const item = await seed();
    const authorWriter = new Client({ connectionString: url, options });
    await authorWriter.connect();
    const paused = pauseQuery(authorWriter, sql => /^insert into "forum_post_revisions"/i.test(sql));
    try {
      const content = new DrizzleForumRepository(drizzle(authorWriter), policy, noMeasures);
      const edit = content.revisePostBody(item.posts[0], await currentRevision(item.posts[0]), {
        id: uuid(), originalContent: "Changed by author", sourceLocale: "en",
      }, authorId);
      await paused.observed;
      // If KEY SHARE were replaced with SHARE or FOR UPDATE, this would wait
      // for the paused content writer's non-key mutation lock.
      const read = forum.advanceTopicReadState(item.actorId, item.topicId, item.posts[0]);
      const result = await Promise.race([
        read,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("reader blocked by content mutex")), 2500)),
      ]);
      expect(result).toMatchObject({ lastReadPostId: item.posts[0], state: "unread" });
      paused.resume();
      await edit;
      expect(await marker(item)).toMatchObject({ last_read_post_id: item.posts[0] });
    } finally {
      paused.resume();
      paused.restore();
      await authorWriter.end();
    }
  }, 30_000);
});

async function currentRevision(postId: string): Promise<string> {
  const result = await fixture.query<{ current_revision_id: string }>(
    "select current_revision_id from forum_posts where id=$1", [postId],
  );
  return result.rows[0]!.current_revision_id;
}
