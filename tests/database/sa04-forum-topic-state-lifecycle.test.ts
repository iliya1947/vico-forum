import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import {
  DrizzleForumRepository, ForumEntityNotFoundError, ForumStateConflictError, ForumTopicClosedError,
} from "../../db/forum-repository";

const url = process.env.DATABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA04-J7 requires a disposable loopback *_test PostgreSQL database");
}
const schema = "sa04_j7_topic_state_lifecycle_test";
const options = "-c search_path=" + schema;
const admin = new Client({ connectionString: url, options });
const pool = new Pool({ connectionString: url, options, max: 5 });
const policy = { cooldownMs: 0, now: () => new Date() };
const noMeasures = async () => {};
const forum = new DrizzleForumRepository(drizzle(pool), policy, noMeasures);
const isolated = (connection: Client) => new DrizzleForumRepository(drizzle(connection), policy, noMeasures);
const uuid = () => crypto.randomUUID();
const topicAuthor = "j7-topic-author";
const replyAuthor = "j7-reply-author";
type Operation = "close" | "pin" | "unpin";
type Topic = { id: string; actor: string; firstPost: string; firstRevision: string };

async function person(): Promise<string> {
  const id = "j7-actor-" + uuid();
  await admin.query('insert into "user"(id,name,email) values($1,$1,$2)', [id, id + "@test.invalid"]);
  return id;
}
async function deactivate(id: string): Promise<void> {
  await admin.query('update "user" set deactivated_at=now(), deactivated_by_user_id=$1,'
    + " retain_at_least_until=now()+interval '2 years' where id=$1", [id]);
}
async function topic(): Promise<Topic> {
  const id = uuid(), actor = await person(), firstPost = uuid(), firstRevision = uuid();
  await forum.createTopicWithInitialPost({
    id, sectionId: "j7-section", authorId: topicAuthor,
    titleRevision: { id: uuid(), originalContent: "Lifecycle state topic", sourceLocale: "en" },
    initialPost: {
      id: firstPost, topicId: id, authorId: topicAuthor,
      bodyRevision: { id: firstRevision, originalContent: "Initial message", sourceLocale: "en" },
    },
  });
  return { id, actor, firstPost, firstRevision };
}
async function state(id: string) {
  const r = await admin.query<{ is_closed: boolean; closure_version: number }>(
    "select is_closed,closure_version from forum_topics where id=$1", [id],
  );
  return r.rows[0]!;
}
async function history(id: string) {
  const r = await admin.query<{ action: string; actor_id: string }>(
    "select action,actor_id from admin_history where target_type='topic' and target_id=$1 order by position", [id],
  );
  return r.rows;
}
async function snapshot(id: string) {
  return { closure: await state(id), pinned: await forum.readTopicPinState(id), history: await history(id) };
}
async function perform(op: Operation, value: Topic, repo = forum) {
  if (op === "close") return repo.setTopicClosed({
    topicId: value.id, actorId: value.actor, isClosed: true, expectedClosureVersion: 0,
  });
  if (op === "pin") return repo.pinTopic(value.id, value.actor);
  return repo.unpinTopic(value.id, value.actor);
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
  return { observed, resume: () => release(), restore: () => { client.query = original; } };
}

beforeAll(async () => {
  await admin.connect();
  await admin.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const file of (await readdir("drizzle")).filter(name => /^\d{4}_.+\.sql$/u.test(name)).sort()) {
    await admin.query((await readFile("drizzle/" + file, "utf8")).replaceAll('"public".', '"' + schema + '".'));
  }
  for (const id of [topicAuthor, replyAuthor]) {
    await admin.query('insert into "user"(id,name,email) values($1,$1,$2)', [id, id + "@test.invalid"]);
  }
  await forum.createCategory({ id: "j7-category", name: "Lifecycle topic state" });
  await forum.createSection({ id: "j7-section", categoryId: "j7-category", name: "Topic state" });
});
afterAll(async () => {
  await pool.end();
  await admin.query("drop schema if exists " + schema + " cascade");
  await admin.end();
});

describe("SA04-J7 authoritative topic closure/pin admission", () => {
  it("preserves active CAS, ABA, closure no-op, pin/unpin idempotency and transition-only History", async () => {
    const x = await topic();
    expect(await snapshot(x.id)).toEqual({
      closure: { is_closed: false, closure_version: 0 }, pinned: false, history: [],
    });
    await forum.pinTopic(x.id, x.actor);
    await forum.pinTopic(x.id, x.actor);
    expect(await forum.readTopicPinState(x.id)).toBe(true);
    expect(await perform("close", x)).toEqual({ isClosed: true, closureVersion: 1, changed: true });
    expect(await forum.setTopicClosed({
      topicId: x.id, actorId: x.actor, isClosed: true, expectedClosureVersion: 1,
    })).toEqual({ isClosed: true, closureVersion: 1, changed: false });
    await expect(perform("close", x)).rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await forum.setTopicClosed({
      topicId: x.id, actorId: x.actor, isClosed: false, expectedClosureVersion: 1,
    })).toEqual({ isClosed: false, closureVersion: 2, changed: true });
    await expect(perform("close", x)).rejects.toBeInstanceOf(ForumStateConflictError);
    await forum.unpinTopic(x.id, x.actor);
    await forum.unpinTopic(x.id, x.actor);
    expect(await snapshot(x.id)).toEqual({
      closure: { is_closed: false, closure_version: 2 }, pinned: false,
      history: [
        { action: "topic.pinned", actor_id: x.actor },
        { action: "topic.closed", actor_id: x.actor },
        { action: "topic.reopened", actor_id: x.actor },
        { action: "topic.unpinned", actor_id: x.actor },
      ],
    });
  });

  it("preserves missing-topic, exhausted-version, and History-rollback semantics", async () => {
    const x = await topic();
    await expect(forum.pinTopic("j7-missing-" + uuid(), x.actor))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    await expect(forum.unpinTopic("j7-missing-" + uuid(), x.actor))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    await expect(forum.setTopicClosed({
      topicId: "j7-missing-" + uuid(), actorId: x.actor, isClosed: true, expectedClosureVersion: 0,
    })).rejects.toBeInstanceOf(ForumEntityNotFoundError);
    await admin.query("update forum_topics set closure_version=2147483647 where id=$1", [x.id]);
    await expect(forum.setTopicClosed({
      topicId: x.id, actorId: x.actor, isClosed: true, expectedClosureVersion: 2147483647,
    })).rejects.toBeInstanceOf(ForumStateConflictError);
    await admin.query("update forum_topics set closure_version=0 where id=$1", [x.id]);

    await admin.query("create function reject_j7_history() returns trigger language plpgsql as $$"
      + " begin if new.target_id='" + x.id + "' and new.action='topic.closed'"
      + " then raise exception 'forced J7 History rollback'; end if; return new; end $$");
    await admin.query("create trigger reject_j7_history before insert on admin_history"
      + " for each row execute function reject_j7_history()");
    try {
      await expect(perform("close", x)).rejects.toThrow();
      expect(await snapshot(x.id)).toEqual({
        closure: { is_closed: false, closure_version: 0 }, pinned: false, history: [],
      });
    } finally {
      await admin.query("drop trigger reject_j7_history on admin_history");
      await admin.query("drop function reject_j7_history()");
    }
  });

  it("denies inactive/missing actor on every actual and no-op path with unchanged domain/History facts", async () => {
    const open = await topic(), pinned = await topic();
    await forum.pinTopic(pinned.id, pinned.actor);
    const beforeOpen = await snapshot(open.id), beforePinned = await snapshot(pinned.id);
    await deactivate(open.actor);
    await deactivate(pinned.actor);
    // Existing closure CAS and missing-topic rejection retain precedence over actor admission.
    await expect(forum.setTopicClosed({
      topicId: open.id, actorId: open.actor, isClosed: true, expectedClosureVersion: 1,
    })).rejects.toBeInstanceOf(ForumStateConflictError);
    for (const op of ["close", "pin", "unpin"] as const) {
      await expect(perform(op, open)).rejects.toBeInstanceOf(AccountInactiveError);
      await expect(perform(op, { ...open, actor: "j7-missing-" + uuid() }))
        .rejects.toBeInstanceOf(AccountMissingError);
    }
    await expect(forum.setTopicClosed({
      topicId: open.id, actorId: open.actor, isClosed: false, expectedClosureVersion: 0,
    })).rejects.toBeInstanceOf(AccountInactiveError);
    await expect(forum.pinTopic(pinned.id, pinned.actor)).rejects.toBeInstanceOf(AccountInactiveError);
    await expect(forum.unpinTopic(pinned.id, pinned.actor)).rejects.toBeInstanceOf(AccountInactiveError);
    expect(await snapshot(open.id)).toEqual(beforeOpen);
    expect(await snapshot(pinned.id)).toEqual(beforePinned);
  });

  it.each(["close", "pin", "unpin"] as const)(
    "%s observes a committed deactivation after topic mutex and before actor admission",
    async (op) => {
      const x = await topic(), before = await snapshot(x.id);
      const connection = new Client({ connectionString: url, options });
      await connection.connect();
      const paused = pauseQuery(connection, query => /from "user" .*for no key update/i.test(query));
      try {
        const pending = perform(op, x, isolated(connection));
        await paused.observed;
        await deactivate(x.actor);
        paused.resume();
        await expect(pending).rejects.toBeInstanceOf(AccountInactiveError);
        expect(await snapshot(x.id)).toEqual(before);
      } finally {
        paused.resume();
        paused.restore();
        await connection.end();
      }
    }, 30_000,
  );

  it.each(["close", "pin", "unpin"] as const)(
    "%s writer-first holds the actor lock through COMMIT and preserves the committed mutation",
    async (op) => {
      const x = await topic();
      const connection = new Client({ connectionString: url, options });
      await connection.connect();
      const paused = pauseQuery(connection, query => /^commit$/i.test(query.trim()));
      let deactivatorOpen = false;
      try {
        const pending = perform(op, x, isolated(connection));
        await paused.observed;
        await admin.query("begin");
        deactivatorOpen = true;
        await admin.query("set local lock_timeout = '180ms'");
        await expect(admin.query('update "user" set deactivated_at=now(),'
          + " deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years' where id=$1",
        [x.actor])).rejects.toMatchObject({ code: "55P03" });
        await admin.query("rollback");
        deactivatorOpen = false;
        paused.resume();
        await pending;
        const committed = await snapshot(x.id);
        if (op === "close") expect(committed.closure).toEqual({ is_closed: true, closure_version: 1 });
        else expect(committed.pinned).toBe(op === "pin");
        expect(committed.history.map(h => h.action)).toEqual(
          op === "close" ? ["topic.closed"] : op === "pin" ? ["topic.pinned"] : [],
        );
        await deactivate(x.actor);
        await expect(perform(op, x)).rejects.toBeInstanceOf(AccountInactiveError);
        expect(await snapshot(x.id)).toEqual(committed);
      } finally {
        paused.resume();
        paused.restore();
        if (deactivatorOpen) await admin.query("rollback");
        await connection.end();
      }
    }, 30_000,
  );

  it("the close topic mutex serializes a concurrent fresh reply through COMMIT", async () => {
    const x = await topic();
    const connection = new Client({ connectionString: url, options });
    await connection.connect();
    const paused = pauseQuery(connection, query => /^commit$/i.test(query.trim()));
    try {
      const closing = perform("close", x, isolated(connection));
      await paused.observed;
      const attempted = await admin.query("begin").then(async () => {
        try {
          await admin.query("set local lock_timeout = '180ms'");
          return await admin.query("select id from forum_topics where id=$1 for no key update", [x.id]);
        } catch (error) {
          return error;
        } finally { await admin.query("rollback"); }
      });
      expect(attempted).toMatchObject({ code: "55P03" });
      paused.resume();
      await closing;
      await expect(forum.createPost({
        id: uuid(), topicId: x.id, authorId: replyAuthor,
        bodyRevision: { id: uuid(), originalContent: "Blocked fresh reply", sourceLocale: "en" },
      })).rejects.toBeInstanceOf(ForumTopicClosedError);
      expect(await history(x.id)).toMatchObject([{ action: "topic.closed" }]);
    } finally {
      paused.resume();
      paused.restore();
      await connection.end();
    }
  }, 30_000);

  it("topic NO KEY UPDATE mutex is compatible with Complaint content→actor→FK KEY SHARE", async () => {
    const x = await topic();
    const complaint = new Client({ connectionString: url, options });
    const closing = new Client({
      connectionString: url, options, application_name: "j7-closing-after-complaint-actor",
    });
    await complaint.connect();
    await closing.connect();
    let complaintOpen = false;
    let pending: Promise<unknown> | undefined;
    try {
      await complaint.query("begin");
      complaintOpen = true;
      await complaint.query("select id from forum_posts where id=$1 for update", [x.firstPost]);
      await complaint.query('select id from "user" where id=$1 for no key update', [x.actor]);
      pending = perform("close", x, isolated(closing));
      let observed = false;
      for (let i = 0; i < 350; i++) {
        const result = await admin.query<{ wait_event_type: string }>(
          "select wait_event_type from pg_stat_activity"
          + " where application_name='j7-closing-after-complaint-actor'",
        );
        if (result.rows.some(row => row.wait_event_type === "Lock")) {
          observed = true; break;
        }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(observed).toBe(true);
      await complaint.query("set local lock_timeout = '450ms'");
      // This insert obtains topic and post FK KEY SHARE while closure already owns
      // the topic NO KEY UPDATE mutex and is waiting on this actor.
      await complaint.query("insert into forum_complaint_targets"
        + " (id,kind,topic_id,post_id,post_revision_id,affected_author_id)"
        + " values($1,'post',$2,$3,$4,$5)",
      [uuid(), x.id, x.firstPost, x.firstRevision, topicAuthor]);
      await complaint.query("commit");
      complaintOpen = false;
      expect(await pending).toEqual({ isClosed: true, closureVersion: 1, changed: true });
      expect((await snapshot(x.id)).closure).toEqual({ is_closed: true, closure_version: 1 });
    } finally {
      if (complaintOpen) await complaint.query("rollback");
      if (pending) await Promise.allSettled([pending]);
      await Promise.all([complaint.end(), closing.end()]);
    }
  }, 30_000);
});
