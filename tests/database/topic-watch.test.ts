import { readdir, readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import { DrizzleForumRepository, ForumEntityNotFoundError } from "../../db/forum-repository";
import { DrizzleForumAttachments } from "../../db/forum-attachments";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !["127.0.0.1", "localhost"].includes(new URL(databaseUrl).hostname)
  || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error("Watch requires a disposable loopback *_test PostgreSQL database");
}
const schema = "topic_watch_test", options = "-c search_path=" + schema;
const fixture = new Client({ connectionString: databaseUrl, options });
const pool = new Pool({ connectionString: databaseUrl, options, max: 5 });
const policy = { cooldownMs: 0, now: () => new Date() };
const noMeasures = async () => {};
const forum = new DrizzleForumRepository(drizzle(pool), policy, noMeasures);
const repository = (client: Client) => new DrizzleForumRepository(drizzle(client), policy, noMeasures);
const uuid = () => crypto.randomUUID();

async function person() {
  const id = "watch-" + uuid();
  await fixture.query('insert into "user"(id,name,email) values($1,$1,$2)', [id, id + "@example.test"]);
  return id;
}
async function topic(authorId: string) {
  const topicId = uuid(), initialPostId = uuid();
  await forum.createTopicWithInitialPost({
    id: topicId, sectionId: "watch-section", authorId,
    titleRevision: { id: uuid(), originalContent: "Watch acceptance", sourceLocale: "en" },
    initialPost: { id: initialPostId, topicId, authorId,
      bodyRevision: { id: uuid(), originalContent: "Original", sourceLocale: "en" } },
  });
  return { topicId, initialPostId };
}
async function reply(topicId: string, authorId: string, body = "New reply",
  parentPostId: string | null = null, writer = forum) {
  const id = uuid();
  await writer.createPost({ id, topicId, authorId, parentPostId,
    bodyRevision: { id: uuid(), originalContent: body, sourceLocale: "en" } });
  return id;
}
async function notices(postId: string) {
  const result = await fixture.query<{ recipient_user_id: string; kind: string; read_at: Date | null }>(
    "select recipient_user_id,kind,read_at from forum_reply_notifications where post_id=$1 order by recipient_user_id", [postId]);
  return result.rows;
}
async function deactivate(id: string) {
  await fixture.query('update "user" set deactivated_at=now(), deactivated_by_user_id=$1,'
    + " retain_at_least_until=now()+interval '2 years' where id=$1", [id]);
}

/** Suspend a real PG write after its requested row mutex has been acquired. */
function pauseAfterRowLock(client: Client, relation: "forum_topics" | '"user"') {
  const original = client.query.bind(client);
  let seen = false, reached!: () => void, release!: () => void;
  const locked = new Promise<void>(resolve => { reached = resolve; });
  const unblocked = new Promise<void>(resolve => { release = resolve; });
  client.query = ((...args: unknown[]) => {
    const command = args[0];
    const query = typeof command === "string" ? command
      : command && typeof command === "object" && "text" in command && typeof command.text === "string"
        ? command.text : "";
    const result = Reflect.apply(original, client, args) as Promise<unknown>;
    if (!seen && query.toLowerCase().includes("for no key update") && query.includes(relation)) {
      seen = true;
      return result.then(async value => { reached(); await unblocked; return value; });
    }
    return result;
  }) as typeof client.query;
  return { locked, release, restore: () => { client.query = original; } };
}

beforeAll(async () => {
  await fixture.connect();
  await fixture.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const file of (await readdir("drizzle")).filter(name => /^[0-9]{4}_.+[.]sql$/.test(name)).sort()) {
    await fixture.query((await readFile("drizzle/" + file, "utf8"))
      .replaceAll('"public".', '"' + schema + '".'));
  }
  await forum.createCategory({ id: "watch-category", name: "Watch" });
  await forum.createSection({ id: "watch-section", categoryId: "watch-category", name: "Watch topics" });
});
afterAll(async () => {
  await pool.end();
  await fixture.query("drop schema if exists " + schema + " cascade");
  await fixture.end();
});

describe("Watch real PostgreSQL persistence, fanout and ordering", () => {
  it("persists only own pairs, idempotent ON/OFF and no notification backfill/read-state mutation", async () => {
    const author = await person(), watcher = await person(), other = await person();
    const first = await topic(author), second = await topic(author);
    expect(await forum.readTopicWatch(watcher, first.topicId)).toBe(false);
    for (let i = 0; i < 2; i++)
      expect(await forum.setTopicWatch({ topicId: first.topicId, actorId: watcher, watching: true })).toBe(true);
    await forum.setTopicWatch({ topicId: first.topicId, actorId: other, watching: true });
    await forum.setTopicWatch({ topicId: second.topicId, actorId: watcher, watching: true });
    expect((await fixture.query("select user_id from forum_topic_watches where topic_id=$1 and user_id=$2",
      [first.topicId, watcher])).rowCount).toBe(1);
    for (let i = 0; i < 2; i++)
      expect(await forum.setTopicWatch({ topicId: first.topicId, actorId: watcher, watching: false })).toBe(false);
    expect(await forum.readTopicWatch(watcher, first.topicId)).toBe(false);
    expect(await forum.readTopicWatch(watcher, second.topicId)).toBe(true);
    expect(await forum.readTopicWatch(other, first.topicId)).toBe(true);
    expect(await notices(first.initialPostId)).toEqual([]);
    expect((await fixture.query("select count(*)::int n from forum_topic_read_states where topic_id=$1",
      [first.topicId])).rows[0]?.n).toBe(0);
  });

  it("notifies unrelated watchers; Unwatch preserves previous notices and independent mention", async () => {
    const author = await person(), replyer = await person(), watcher = await person();
    const x = await topic(author);
    await forum.setTopicWatch({ topicId: x.topicId, actorId: watcher, watching: true });
    const first = await reply(x.topicId, replyer);
    expect((await notices(first)).map(row => row.recipient_user_id)).toEqual([author, watcher].sort());
    expect((await notices(first)).every(row => row.kind === "reply")).toBe(true);
    await forum.setTopicWatch({ topicId: x.topicId, actorId: watcher, watching: false });
    const second = await reply(x.topicId, replyer);
    expect((await notices(second)).map(row => row.recipient_user_id)).toEqual([author]);
    expect((await notices(first)).find(row => row.recipient_user_id === watcher)?.read_at).toBeNull();
    const mentioned = await reply(x.topicId, replyer, "[Mention](/en/users/" + encodeURIComponent(watcher) + ")");
    expect((await notices(mentioned)).find(row => row.recipient_user_id === watcher)?.kind).toBe("mention");
  });

  it("deduplicates watcher + author/parent/mention and excludes self", async () => {
    const author = await person(), watcher = await person(), replyer = await person();
    const x = await topic(author);
    for (const actorId of [author, watcher, replyer])
      await forum.setTopicWatch({ topicId: x.topicId, actorId, watching: true });
    const parent = await reply(x.topicId, watcher, "Parent");
    const post = await reply(x.topicId, replyer,
      "[Mention](/en/users/" + encodeURIComponent(watcher) + ")", parent);
    const rows = await notices(post);
    expect(rows.map(row => row.recipient_user_id)).toEqual([author, watcher].sort());
    expect(rows.every(row => row.kind === "reply")).toBe(true);
    expect(rows.some(row => row.recipient_user_id === replyer)).toBe(false);
    expect((await forum.readReplyNotifications(watcher)).some(row => row.postId === post)).toBe(true);
  });

  it("admits Watch on a closed topic with inactive author but rejects inactive/missing actors including OFF", async () => {
    const author = await person(), watcher = await person(), x = await topic(author);
    await fixture.query("update forum_topics set is_closed=true where id=$1", [x.topicId]);
    await deactivate(author);
    await forum.setTopicWatch({ topicId: x.topicId, actorId: watcher, watching: true });
    await deactivate(watcher);
    await expect(forum.setTopicWatch({ topicId: x.topicId, actorId: watcher, watching: false }))
      .rejects.toBeInstanceOf(AccountInactiveError);
    await expect(forum.setTopicWatch({ topicId: x.topicId, actorId: watcher, watching: true }))
      .rejects.toBeInstanceOf(AccountInactiveError);
    await expect(forum.setTopicWatch({ topicId: x.topicId, actorId: "missing-actor", watching: true }))
      .rejects.toBeInstanceOf(AccountMissingError);
    await expect(forum.setTopicWatch({ topicId: uuid(), actorId: watcher, watching: true }))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect(await forum.readTopicWatch(watcher, x.topicId)).toBe(true);
  });

  it("denies Watch for hidden topics but keeps own Unwatch safe for hidden and absent targets", async () => {
    const author = await person(), watcher = await person(), other = await person(), inactive = await person();
    const x = await topic(author), missing = uuid();
    await forum.setTopicWatch({ topicId: x.topicId, actorId: watcher, watching: true });
    await forum.setTopicWatch({ topicId: x.topicId, actorId: other, watching: true });
    await fixture.query("update forum_topics set is_hidden=true,visibility_version=visibility_version+1,visibility_changed_at=clock_timestamp() where id=$1", [x.topicId]);

    await expect(forum.setTopicWatch({ topicId: x.topicId, actorId: watcher, watching: true }))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect(await forum.readTopicWatch(watcher, x.topicId)).toBe(true);
    expect(await forum.setTopicWatch({ topicId: x.topicId, actorId: watcher, watching: false })).toBe(false);
    expect(await forum.setTopicWatch({ topicId: x.topicId, actorId: watcher, watching: false })).toBe(false);
    expect(await forum.readTopicWatch(watcher, x.topicId)).toBe(false);
    expect(await forum.readTopicWatch(other, x.topicId)).toBe(true);

    expect(await forum.setTopicWatch({ topicId: missing, actorId: watcher, watching: false })).toBe(false);
    await expect(forum.setTopicWatch({ topicId: missing, actorId: watcher, watching: true }))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    await deactivate(inactive);
    await expect(forum.setTopicWatch({ topicId: missing, actorId: inactive, watching: false }))
      .rejects.toBeInstanceOf(AccountInactiveError);

    await fixture.query("update forum_topics set is_hidden=false,visibility_version=visibility_version+1,visibility_changed_at=clock_timestamp() where id=$1", [x.topicId]);
    expect(await forum.setTopicWatch({ topicId: x.topicId, actorId: watcher, watching: true })).toBe(true);
    expect(await forum.readTopicWatch(watcher, x.topicId)).toBe(true);
  });

  it("fanout includes a verified attachment-only reply exactly once; receipt replay after Unwatch is inert", async () => {
    const author = await person(), replyer = await person(), watcher = await person();
    const x = await topic(author);
    await forum.setTopicWatch({ topicId: x.topicId, actorId: watcher, watching: true });
    const attachments = new DrizzleForumAttachments(drizzle(pool));
    const draftId = uuid(), attachmentId = uuid(), contextKey = "topic:" + x.topicId + ":reply";
    await attachments.createDraftAttachment({
      id: attachmentId, ownerId: replyer, contextKey, draftId,
      objectKey: "private/" + uuid(), fileName: "watch-file.txt",
      declaredMime: "text/plain", detectedType: "text",
      responseMime: "text/plain; charset=utf-8", byteSize: 10, verificationStatus: "type-checked",
    });
    const request = { id: uuid(), topicId: x.topicId, authorId: replyer,
      bodyRevision: { id: uuid(), originalContent: "", sourceLocale: "und" },
      publishedDraft: { contextKey, draftId, attachmentIds: [attachmentId] },
    };
    const first = await forum.createPost(request);
    expect((await notices(first.id)).map(row => row.recipient_user_id)).toEqual([author, watcher].sort());
    await forum.setTopicWatch({ topicId: x.topicId, actorId: watcher, watching: false });
    const replay = await forum.createPost({ ...request, id: uuid(),
      bodyRevision: { ...request.bodyRevision, id: uuid() } });
    expect(replay.id).toBe(first.id);
    expect((await notices(first.id)).map(row => row.recipient_user_id)).toEqual([author, watcher].sort());
    expect((await fixture.query("select count(*)::int n from forum_reply_notifications where post_id=$1",
      [first.id])).rows[0]?.n).toBe(2);
    expect((await fixture.query("select count(*)::int n from forum_post_attachments where post_id=$1",
      [first.id])).rows[0]?.n).toBe(1);
    expect((await fixture.query("select count(*)::int n from forum_publication_receipts where post_id=$1",
      [first.id])).rows[0]?.n).toBe(1);
  });
  it("rolls back reply post/revision/notifications when the fanout insert fails", async () => {
    const author = await person(), replyer = await person(), watcher = await person(), x = await topic(author);
    await forum.setTopicWatch({ topicId: x.topicId, actorId: watcher, watching: true });
    const failedPost = uuid(), bodyId = uuid();
    await fixture.query("create function watch_fail_notice() returns trigger language plpgsql as $$"
      + " begin raise exception 'watch notice failure'; end; $$");
    await fixture.query("create trigger watch_fail_notice before insert on forum_reply_notifications"
      + " for each row execute function watch_fail_notice()");
    try {
      await expect(forum.createPost({ id: failedPost, topicId: x.topicId, authorId: replyer,
        bodyRevision: { id: bodyId, originalContent: "Rollback", sourceLocale: "en" } })).rejects.toThrow();
      expect((await fixture.query("select id from forum_posts where id=$1", [failedPost])).rows).toEqual([]);
      expect((await fixture.query("select id from forum_post_revisions where id=$1", [bodyId])).rows).toEqual([]);
      expect(await notices(failedPost)).toEqual([]);
    } finally {
      await fixture.query("drop trigger watch_fail_notice on forum_reply_notifications");
      await fixture.query("drop function watch_fail_notice()");
    }
  });

  it.each([
    ["watch", "reply", false, true],
    ["reply", "watch", false, false],
    ["unwatch", "reply", true, false],
    ["reply", "unwatch", true, true],
  ] as const)("serializes topic locks across real connections: %s before %s", async (first, second, initiallyOn, notify) => {
    const author = await person(), replyer = await person(), watcher = await person(), x = await topic(author);
    if (initiallyOn) await forum.setTopicWatch({ topicId: x.topicId, actorId: watcher, watching: true });
    const left = new Client({ connectionString: databaseUrl, options });
    const right = new Client({ connectionString: databaseUrl, options });
    await Promise.all([left.connect(), right.connect()]);
    const gate = pauseAfterRowLock(left, "forum_topics");
    let posted: string | null = null;
    const launch = (operation: "watch" | "unwatch" | "reply", writer: DrizzleForumRepository) => {
      if (operation !== "reply")
        return writer.setTopicWatch({ topicId: x.topicId, actorId: watcher, watching: operation === "watch" });
      const id = uuid();
      posted = id;
      return writer.createPost({ id, topicId: x.topicId, authorId: replyer,
        bodyRevision: { id: uuid(), originalContent: "Locked reply", sourceLocale: "en" } });
    };
    try {
      const initial = launch(first, repository(left));
      await Promise.race([gate.locked,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Topic lock not observed")), 5000))]);
      let laterFinished = false;
      const later = launch(second, repository(right));
      void later.then(() => { laterFinished = true; }, () => { laterFinished = true; });
      await new Promise(resolve => setTimeout(resolve, 40));
      expect(laterFinished).toBe(false);
      gate.release();
      await Promise.all([initial, later]);
      expect(posted).not.toBeNull();
      const rows = await notices(posted!);
      expect(rows.some(row => row.recipient_user_id === watcher)).toBe(notify);
      expect(rows.some(row => row.recipient_user_id === author)).toBe(true);
    } finally {
      gate.release(); gate.restore();
      await Promise.all([left.end(), right.end()]);
    }
  }, 15_000);

  it.each([true, false] as const)("serializes conflicting ON/OFF: first ON=%s", async firstOn => {
    const author = await person(), watcher = await person(), x = await topic(author);
    if (!firstOn) await forum.setTopicWatch({ topicId: x.topicId, actorId: watcher, watching: true });
    const left = new Client({ connectionString: databaseUrl, options });
    const right = new Client({ connectionString: databaseUrl, options });
    await Promise.all([left.connect(), right.connect()]);
    const gate = pauseAfterRowLock(left, "forum_topics");
    try {
      const first = repository(left).setTopicWatch({ topicId: x.topicId, actorId: watcher, watching: firstOn });
      await Promise.race([gate.locked,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Topic lock not observed")), 5000))]);
      const second = repository(right).setTopicWatch({ topicId: x.topicId, actorId: watcher, watching: !firstOn });
      gate.release();
      await Promise.all([first, second]);
      expect(await forum.readTopicWatch(watcher, x.topicId)).toBe(!firstOn);
    } finally {
      gate.release(); gate.restore();
      await Promise.all([left.end(), right.end()]);
    }
  }, 15_000);

  it("lets Watch commit before concurrent deactivation when its actor mutex was acquired first", async () => {
    const author = await person(), watcher = await person(), x = await topic(author);
    const writerClient = new Client({ connectionString: databaseUrl, options });
    const lifecycleClient = new Client({ connectionString: databaseUrl, options });
    await Promise.all([writerClient.connect(), lifecycleClient.connect()]);
    const gate = pauseAfterRowLock(writerClient, '"user"');
    try {
      const writing = repository(writerClient).setTopicWatch({
        topicId: x.topicId, actorId: watcher, watching: true,
      });
      await Promise.race([gate.locked,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Actor lock not observed")), 5000))]);
      let lifecycleFinished = false;
      const deactivating = lifecycleClient.query(
        'update "user" set deactivated_at=now(),deactivated_by_user_id=$1,'
          + "retain_at_least_until=now()+interval '2 years' where id=$1", [watcher],
      );
      void deactivating.then(() => { lifecycleFinished = true; }, () => { lifecycleFinished = true; });
      await new Promise(resolve => setTimeout(resolve, 40));
      expect(lifecycleFinished).toBe(false);
      gate.release();
      expect(await writing).toBe(true);
      await deactivating;
      expect(await forum.readTopicWatch(watcher, x.topicId)).toBe(true);
      await expect(forum.setTopicWatch({ topicId: x.topicId, actorId: watcher, watching: false }))
        .rejects.toBeInstanceOf(AccountInactiveError);
    } finally {
      gate.release(); gate.restore();
      await Promise.all([writerClient.end(), lifecycleClient.end()]);
    }
  }, 15_000);

  it("retains a deactivated watcher's subscription and passive future reply notices", async () => {
    const author = await person(), replyer = await person(), watcher = await person();
    const x = await topic(author);
    await forum.setTopicWatch({ topicId: x.topicId, actorId: watcher, watching: true });
    await deactivate(watcher);
    expect(await forum.readTopicWatch(watcher, x.topicId)).toBe(true);
    const published = await reply(x.topicId, replyer);
    expect((await notices(published)).map(row => row.recipient_user_id))
      .toEqual([author, watcher].sort());
    expect((await notices(published)).every(row => row.kind === "reply" && row.read_at === null))
      .toBe(true);
    expect((await fixture.query("select count(*)::int n from forum_topic_read_states where topic_id=$1",
      [x.topicId])).rows[0]?.n).toBe(0);
  });

  it("rejects Watch when account deactivation commits ahead of persisted admission", async () => {
    const author = await person(), watcher = await person(), x = await topic(author);
    const blocker = new Client({ connectionString: databaseUrl, options });
    await blocker.connect();
    try {
      await blocker.query("begin");
      await blocker.query('update "user" set deactivated_at=now(),deactivated_by_user_id=$1,'
        + "retain_at_least_until=now()+interval '2 years' where id=$1", [watcher]);
      const pending = forum.setTopicWatch({ topicId: x.topicId, actorId: watcher, watching: true });
      // Attach the rejection assertion before COMMIT; under load the rejected
      // actor-admission promise can settle before a post-COMMIT await attaches.
      const rejected = expect(pending).rejects.toBeInstanceOf(AccountInactiveError);
      await new Promise(resolve => setTimeout(resolve, 30));
      await blocker.query("commit");
      await rejected;
      expect(await forum.readTopicWatch(watcher, x.topicId)).toBe(false);
    } finally {
      await blocker.query("rollback").catch(() => {});
      await blocker.end();
    }
  }, 15_000);
});
