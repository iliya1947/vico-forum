import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import {
  DrizzleForumRepository, ForumStateConflictError, ForumTopicClosedError,
} from "../../db/forum-repository";
import { ForumService } from "../../db/forum-service";

const url = process.env.DATABASE_URL!;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) throw new Error("Disposable loopback *_test database required");

const schema = "topic_closure_races_test";
const admin = new Client({ connectionString: url, options: "-c search_path=" + schema });
const closePool = new Pool({
  connectionString: url, options: "-c search_path=" + schema,
  application_name: "vico-ap08-close",
});
const replyPool = new Pool({
  connectionString: url, options: "-c search_path=" + schema,
  application_name: "vico-ap08-reply",
});
const secondPool = new Pool({
  connectionString: url, options: "-c search_path=" + schema,
  application_name: "vico-ap08-second",
});
const closeForum = new ForumService(new DrizzleForumRepository(drizzle(closePool), {
  cooldownMs: 0, now: () => new Date(),
}));
const replyForum = new ForumService(new DrizzleForumRepository(drizzle(replyPool), {
  cooldownMs: 0, now: () => new Date(),
}));
const secondForum = new ForumService(new DrizzleForumRepository(drizzle(secondPool), {
  cooldownMs: 0, now: () => new Date(),
}));

function reply(topicId: string, suffix: string) {
  return {
    id: topicId + "-" + suffix,
    topicId, authorId: "reply-author",
    bodyRevision: {
      id: topicId + "-" + suffix + "-revision",
      originalContent: "Reply submitted before or after closure", sourceLocale: "en",
    },
  };
}
async function fixture(topicId: string) {
  await closeForum.createTopicWithInitialPost({
    id: topicId, authorId: "topic-author", sectionId: "race-section",
    titleRevision: { id: topicId + "-title", originalContent: "Race topic", sourceLocale: "en" },
    initialPost: {
      id: topicId + "-first", topicId, authorId: "topic-author",
      bodyRevision: {
        id: topicId + "-body", originalContent: "Initial question", sourceLocale: "en",
      },
    },
  });
}
async function state(topicId: string) {
  return (await admin.query<{ is_closed: boolean; closure_version: number }>(
    "select is_closed,closure_version from forum_topics where id=$1", [topicId],
  )).rows[0];
}
async function historyCount(topicId: string) {
  return Number((await admin.query<{ count: string }>(
    "select count(*)::text as count from admin_history where target_id=$1 and action in ('topic.closed','topic.reopened')",
    [topicId],
  )).rows[0]?.count ?? "0");
}
/** Verify that a named connection has actually reached a PostgreSQL lock, not merely started work. */
async function waitOnLock(application: string, event?: string) {
  for (let i = 0; i < 400; i++) {
    const blocked = await admin.query<{ wait_event: string }>(
      "select wait_event from pg_stat_activity where application_name=$1 and wait_event_type='Lock'",
      [application],
    );
    if (blocked.rows.some(row => !event || row.wait_event === event)) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error("Expected blocked PostgreSQL transaction: " + application + "/" + (event ?? "any"));
}
async function setClose(topicId: string, forum = closeForum) {
  return forum.setTopicClosed({
    topicId, actorId: "manager", isClosed: true, expectedClosureVersion: 0,
  });
}
async function enterGate(key: number) {
  const gate = new Client({ connectionString: url, options: "-c search_path=" + schema });
  await gate.connect();
  await gate.query("select pg_advisory_lock($1::bigint)", [key]);
  return gate;
}
async function releaseGate(gate: Client, key: number) {
  await gate.query("select pg_advisory_unlock($1::bigint)", [key]);
}
async function addHistoryGate(topicId: string, key: number, rollback = false) {
  await admin.query(
    "create function ap08_history_gate() returns trigger language plpgsql as $$ begin " +
    "if new.target_id = '" + topicId + "' and new.action = 'topic.closed' then " +
    "perform pg_advisory_xact_lock(" + key + "::bigint); " +
    (rollback ? "raise exception 'forced history rollback'; " : "") +
    "end if; return new; end $$",
  );
  await admin.query(
    "create trigger ap08_history_gate before insert on admin_history for each row execute function ap08_history_gate()",
  );
}
async function dropHistoryGate() {
  await admin.query("drop trigger if exists ap08_history_gate on admin_history");
  await admin.query("drop function if exists ap08_history_gate()");
}
type Result<T> = { ok: true; value: T } | { ok: false; error: unknown };
function settled<T>(promise: Promise<T>): Promise<Result<T>> {
  return promise.then(value => ({ ok: true as const, value }), error => ({ ok: false as const, error }));
}

beforeAll(async () => {
  await admin.connect();
  await admin.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const name of (await readdir("drizzle")).filter(x => /^\d{4}_.+\.sql$/.test(x)).sort()) {
    await admin.query((await readFile("drizzle/" + name, "utf8")).replaceAll('"public".', '"' + schema + '".'));
  }
  await admin.query("insert into \"user\" (id,name,email) values " +
    "('topic-author','Topic author','race-topic@test.invalid')," +
    "('reply-author','Reply author','race-reply@test.invalid')," +
    "('manager','Manager','race-manager@test.invalid')");
  await closeForum.createCategory({ id: "race-category", name: "Race" });
  await closeForum.createSection({ id: "race-section", categoryId: "race-category", name: "Races" });
});
afterAll(async () => {
  await Promise.all([closePool.end(), replyPool.end(), secondPool.end()]);
  await admin.query("drop schema if exists " + schema + " cascade");
  await admin.end();
});

describe("AP-08 transaction serialization of replies and topic closure", () => {
  it("reply acquires locked topic first, commits, then waiting close commits", async () => {
    const id = "reply-before-close", key = 72190001;
    await fixture(id);
    const gate = await enterGate(key);
    await admin.query(
      "create function ap08_reply_gate() returns trigger language plpgsql as $$ " +
      "begin if new.topic_id = '" + id + "' then perform pg_advisory_xact_lock(" + key +
      "::bigint); end if; return new; end $$",
    );
    await admin.query(
      "create trigger ap08_reply_gate before insert on forum_posts for each row execute function ap08_reply_gate()",
    );
    const posting = settled(replyForum.createPost(reply(id, "committed")));
    let closing: Promise<Result<Awaited<ReturnType<typeof setClose>>>> | undefined;
    try {
      await waitOnLock("vico-ap08-reply", "advisory");
      closing = settled(setClose(id));
      await waitOnLock("vico-ap08-close");
      expect(await state(id)).toEqual({ is_closed: false, closure_version: 0 });
      await releaseGate(gate, key);
      const first = await posting;
      const second = await closing;
      expect(first.ok).toBe(true);
      expect(second).toEqual({ ok: true, value: { isClosed: true, closureVersion: 1, changed: true } });
      expect(await state(id)).toEqual({ is_closed: true, closure_version: 1 });
      expect(await historyCount(id)).toBe(1);
    } finally {
      await releaseGate(gate, key).catch(() => {});
      await Promise.allSettled([posting, ...(closing ? [closing] : [])]);
      await admin.query("drop trigger ap08_reply_gate on forum_posts");
      await admin.query("drop function ap08_reply_gate()");
      await gate.end();
    }
  });

  it("close acquires topic first and a queued fresh reply observes closed after commit", async () => {
    const id = "close-before-reply", key = 72190002;
    await fixture(id);
    const gate = await enterGate(key);
    await addHistoryGate(id, key);
    const closing = settled(setClose(id));
    let posting: Promise<Result<Awaited<ReturnType<typeof replyForum.createPost>>>> | undefined;
    try {
      await waitOnLock("vico-ap08-close", "advisory");
      posting = settled(replyForum.createPost(reply(id, "blocked")));
      await waitOnLock("vico-ap08-reply");
      expect(await state(id)).toEqual({ is_closed: false, closure_version: 0 });
      await releaseGate(gate, key);
      expect(await closing).toEqual({ ok: true, value: { isClosed: true, closureVersion: 1, changed: true } });
      const result = await posting;
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBeInstanceOf(ForumTopicClosedError);
      expect(await state(id)).toEqual({ is_closed: true, closure_version: 1 });
      expect(await historyCount(id)).toBe(1);
      expect((await admin.query("select id from forum_posts where id=$1", [id + "-blocked"])).rowCount).toBe(0);
    } finally {
      await releaseGate(gate, key).catch(() => {});
      await Promise.allSettled([closing, ...(posting ? [posting] : [])]);
      await dropHistoryGate();
      await gate.end();
    }
  });

  it("failed closure History append rolls back row state and queued reply succeeds", async () => {
    const id = "close-rollback-reply", key = 72190003;
    await fixture(id);
    const gate = await enterGate(key);
    await addHistoryGate(id, key, true);
    const closing = settled(setClose(id));
    let posting: Promise<Result<Awaited<ReturnType<typeof replyForum.createPost>>>> | undefined;
    try {
      await waitOnLock("vico-ap08-close", "advisory");
      posting = settled(replyForum.createPost(reply(id, "allowed")));
      await waitOnLock("vico-ap08-reply");
      await releaseGate(gate, key);
      const closed = await closing;
      expect(closed.ok).toBe(false);
      if (!closed.ok) expect(closed.error).toMatchObject({ cause: { message: "forced history rollback" } });
      const posted = await posting;
      expect(posted.ok).toBe(true);
      expect(await state(id)).toEqual({ is_closed: false, closure_version: 0 });
      expect(await historyCount(id)).toBe(0);
      expect((await admin.query("select id from forum_posts where id=$1", [id + "-allowed"])).rowCount).toBe(1);
    } finally {
      await releaseGate(gate, key).catch(() => {});
      await Promise.allSettled([closing, ...(posting ? [posting] : [])]);
      await dropHistoryGate();
      await gate.end();
    }
  });

  it("concurrent closes with the same expected version commit exactly one transition", async () => {
    const id = "closure-cas-race";
    await fixture(id);
    const holder = new Client({ connectionString: url, options: "-c search_path=" + schema });
    await holder.connect();
    let first: Promise<Result<Awaited<ReturnType<typeof setClose>>>> | undefined;
    let second: Promise<Result<Awaited<ReturnType<typeof setClose>>>> | undefined;
    try {
      await holder.query("begin");
      await holder.query("select id from forum_topics where id=$1 for update", [id]);
      first = settled(setClose(id));
      await waitOnLock("vico-ap08-close");
      second = settled(setClose(id, secondForum));
      await waitOnLock("vico-ap08-second");
      await holder.query("commit");
      expect(await first).toEqual({ ok: true, value: { isClosed: true, closureVersion: 1, changed: true } });
      const stale = await second;
      expect(stale.ok).toBe(false);
      if (!stale.ok) expect(stale.error).toBeInstanceOf(ForumStateConflictError);
      expect(await state(id)).toEqual({ is_closed: true, closure_version: 1 });
      expect(await historyCount(id)).toBe(1);
    } finally {
      await holder.query("rollback").catch(() => {});
      await Promise.allSettled([...(first ? [first] : []), ...(second ? [second] : [])]);
      await holder.end();
    }
  });
});
