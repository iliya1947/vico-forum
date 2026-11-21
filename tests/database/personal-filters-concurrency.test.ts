import { readdir, readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError } from "../../db/account-state";
import { DrizzleForumAttachments } from "../../db/forum-attachments";
import { DrizzleForumRepository, ForumEntityNotFoundError } from "../../db/forum-repository";

const url = process.env.DATABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("Personal policy races require a disposable loopback *_test PostgreSQL database");
}

const schema = "personal_filters_races_test", options = "-c search_path=" + schema;
const fixture = new Client({ connectionString: url, options });
const pool = new Pool({ connectionString: url, options, max: 4 });
const policy = { cooldownMs: 0, now: () => new Date() };
const noMeasures = async () => {};
const forum = new DrizzleForumRepository(drizzle(pool), policy, noMeasures);
const attachments = new DrizzleForumAttachments(drizzle(pool));
const writer = (client: Client) => new DrizzleForumRepository(drizzle(client), policy, noMeasures);
const uuid = () => crypto.randomUUID();
const mention = (id: string) => "[recipient](/en/users/" + encodeURIComponent(id) + ")";

async function person() {
  const id = "filter-race-" + uuid();
  await fixture.query('insert into "user"(id,name,email) values($1,$2,$3)', [id, id, id + "@example.test"]);
  return id;
}
async function topic(authorId: string) {
  const id = uuid();
  await forum.createTopicWithInitialPost({
    id, sectionId: "filter-race-section", authorId,
    titleRevision: { id: uuid(), originalContent: "Policy snapshot", sourceLocale: "en" },
    initialPost: { id: uuid(), topicId: id, authorId,
      bodyRevision: { id: uuid(), originalContent: "Original", sourceLocale: "en" } },
  });
  return id;
}
function replyInput(topicId: string, authorId: string, body: string) {
  return { id: uuid(), topicId, authorId,
    bodyRevision: { id: uuid(), originalContent: body, sourceLocale: "en" } };
}
async function notifications(postId: string) {
  return (await fixture.query<{ recipient_user_id: string; kind: string; read_at: Date | null }>(
    "select recipient_user_id,kind,read_at from forum_reply_notifications where post_id=$1 order by recipient_user_id",
    [postId])).rows;
}
async function receipts(postId: string) {
  return (await fixture.query<{ recipient_user_id: string }>(
    "select recipient_user_id from forum_post_notification_suppressions where post_id=$1 order by recipient_user_id",
    [postId])).rows.map(row => row.recipient_user_id);
}
async function count(sql: string, values: unknown[]) {
  return (await fixture.query<{ n: number }>(sql, values)).rows[0]!.n;
}
async function deactivate(id: string) {
  await fixture.query('update "user" set deactivated_at=now(),deactivated_by_user_id=$1,'
    + "retain_at_least_until=now()+interval '2 years' where id=$1", [id]);
}
function sqlText(query: unknown) {
  if (typeof query === "string") return query;
  return query && typeof query === "object" && "text" in query && typeof query.text === "string"
    ? query.text : "";
}
/** Intercept an actual node-postgres statement: "before" is pre-snapshot;
 * "after" has already executed in PostgreSQL but remains uncommitted. */
function pauseSql(client: Client, matches: (text: string) => boolean, phase: "before" | "after") {
  const original = client.query;
  let seen = false, entered!: () => void, release!: () => void;
  const observed = new Promise<void>(resolve => { entered = resolve; });
  const permitted = new Promise<void>(resolve => { release = resolve; });
  client.query = ((...args: unknown[]) => {
    if (seen || !matches(sqlText(args[0]))) return Reflect.apply(original, client, args);
    seen = true;
    if (phase === "before") {
      entered();
      return permitted.then(() => Reflect.apply(original, client, args));
    }
    return (Reflect.apply(original, client, args) as Promise<unknown>)
      .then(async result => { entered(); await permitted; return result; });
  }) as typeof client.query;
  return { observed, resume: () => release(), restore: () => { client.query = original; },
    get triggered() { return seen; } };
}
async function reached(promise: Promise<void>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([promise, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Native PostgreSQL barrier not reached")), 8_000);
    })]);
  } finally { if (timer) clearTimeout(timer); }
}
async function blocked(waiterPid: number, blockerPid: number) {
  for (let i = 0; i < 120; i++) {
    if ((await fixture.query<{ blocked: boolean }>(
      "select $2::int = any(pg_blocking_pids($1::int)) blocked", [waiterPid, blockerPid])).rows[0]?.blocked) return;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error("Expected a real PostgreSQL actor lock wait");
}
async function twoClients() {
  const left = new Client({ connectionString: url, options: options + " -c lock_timeout=7s" });
  const right = new Client({ connectionString: url, options: options + " -c lock_timeout=7s" });
  await Promise.all([left.connect(), right.connect()]);
  return [left, right] as const;
}
/** DrizzleQueryError wraps the original PG trigger error: assert the native cause. */
async function expectDatabaseFailure(operation: Promise<unknown>, expectedCause: string) {
  let thrown: unknown;
  try { await operation; } catch (error) { thrown = error; }
  expect(thrown).toBeInstanceOf(Error);
  let current = thrown;
  for (let i = 0; i < 5; i++) {
    if (current instanceof Error && current.message.includes(expectedCause)) return;
    current = current && typeof current === "object" && "cause" in current
      ? current.cause : undefined;
  }
  throw new Error("Expected PostgreSQL cause was not present in the thrown error chain: " + expectedCause);
}

async function failingReceipt<T>(work: () => Promise<T>) {
  await fixture.query("create function filter_race_receipt_fault() returns trigger language plpgsql as $$"
    + " begin raise exception 'forced personal receipt failure'; end; $$");
  await fixture.query("create trigger filter_race_receipt_fault before insert"
    + " on forum_post_notification_suppressions for each row execute function filter_race_receipt_fault()");
  try { return await work(); }
  finally {
    await fixture.query("drop trigger filter_race_receipt_fault on forum_post_notification_suppressions");
    await fixture.query("drop function filter_race_receipt_fault()");
  }
}

beforeAll(async () => {
  await fixture.connect();
  await fixture.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const name of (await readdir("drizzle")).filter(x => /^\d{4}_.+[.]sql$/u.test(x)).sort()) {
    await fixture.query((await readFile("drizzle/" + name, "utf8"))
      .replaceAll('"public".', '"' + schema + '".'));
  }
  await forum.createCategory({ id: "filter-race-category", name: "Policy" });
  await forum.createSection({ id: "filter-race-section", categoryId: "filter-race-category", name: "Policy" });
});
afterAll(async () => {
  await pool.end();
  await fixture.query("drop schema if exists " + schema + " cascade");
  await fixture.end();
});

describe("Mute/Block M3: real READ COMMITTED candidate decision snapshots", () => {
  it.each([
    ["reply", "mute", "before"], ["reply", "mute", "after"],
    ["reply", "block", "before"], ["reply", "block", "after"],
    ["edit", "mute", "before"], ["edit", "mute", "after"],
    ["edit", "block", "before"], ["edit", "block", "after"],
    ["initial", "block", "before"], ["initial", "block", "after"],
  ] as const)("%s %s committed %s decision snapshot", async (path, kind, phase) => {
    const recipient = await person(), actor = await person();
    const topicAuthor = path === "reply" ? recipient : actor;
    const topicId = path === "initial" ? uuid() : await topic(topicAuthor);
    const postId = uuid();
    let expectedRevisionId: string | undefined;
    if (path === "edit") {
      await forum.createPost({ ...replyInput(topicId, actor, "Before mention"), id: postId });
      expectedRevisionId = (await fixture.query<{ current_revision_id: string }>(
        "select current_revision_id from forum_posts where id=$1", [postId])).rows[0]!.current_revision_id;
    }
    const client = new Client({ connectionString: url, options: options + " -c lock_timeout=7s" });
    await client.connect();
    const gate = pauseSql(client, query => /with candidate_users as materialized/iu.test(query), phase);
    let pending: Promise<unknown> | undefined;
    try {
      const isolated = writer(client);
      if (path === "initial") {
        pending = isolated.createTopicWithInitialPost({
          id: topicId, sectionId: "filter-race-section", authorId: actor,
          titleRevision: { id: uuid(), originalContent: "New topic", sourceLocale: "en" },
          initialPost: { id: postId, topicId, authorId: actor,
            bodyRevision: { id: uuid(), originalContent: mention(recipient), sourceLocale: "en" } },
        });
      } else if (path === "reply") {
        pending = isolated.createPost({ ...replyInput(topicId, actor, "Reply"), id: postId });
      } else {
        pending = isolated.editPublishedPost({
          postId, topicId, actorId: actor, expectedRevisionId: expectedRevisionId!,
          body: mention(recipient), draftId: uuid(), attachmentIds: [], retainedAttachmentIds: [],
        });
      }
      await reached(gate.observed);
      if (kind === "mute") {
        await forum.setTopicMute({ actorId: recipient, topicId, muted: true });
      } else {
        await forum.setUserBlock({ actorId: recipient, blockedUserId: actor, blocked: true });
      }
      gate.resume();
      await pending;
      expect(gate.triggered).toBe(true);
      const relevant = (await notifications(postId)).filter(row => row.recipient_user_id === recipient);
      expect(relevant).toHaveLength(phase === "before" ? 0 : 1);
      expect((await receipts(postId)).includes(recipient)).toBe(phase === "before");
      if (phase === "after") {
        expect(relevant[0]!.read_at).toBeNull();
        if (path === "edit" || path === "initial") expect(relevant[0]!.kind).toBe("mention");
      }
    } finally {
      gate.resume();
      gate.restore();
      await Promise.allSettled(pending ? [pending] : []);
      await client.end();
    }
  }, 25_000);


  it("a reply suppressed before Unmute cannot escape through the later mention statement", async () => {
    const recipient = await person(), actor = await person(), x = await topic(recipient);
    await forum.setTopicMute({ actorId: recipient, topicId: x, muted: true });
    const input = replyInput(x, actor, mention(recipient));
    const client = new Client({ connectionString: url, options: options + " -c lock_timeout=7s" });
    await client.connect();
    const gate = pauseSql(client, query => /as mentions\(user_id\)/iu.test(query), "before");
    let pending: Promise<unknown> | undefined;
    try {
      pending = writer(client).createPost(input);
      await reached(gate.observed);
      // Reply candidate SQL has already inserted an own-transaction suppression receipt.
      await forum.setTopicMute({ actorId: recipient, topicId: x, muted: false });
      gate.resume();
      await pending;
      expect(await notifications(input.id)).toEqual([]);
      expect(await receipts(input.id)).toEqual([recipient]);
      const fresh = await forum.createPost(replyInput(x, actor, mention(recipient)));
      expect((await notifications(fresh.id)).map(row => row.recipient_user_id)).toContain(recipient);
    } finally {
      gate.resume(); gate.restore();
      await Promise.allSettled(pending ? [pending] : []);
      await client.end();
    }
  }, 20_000);

  it("an unconsumed mention added to an old post after Unmute can notify normally", async () => {
    const recipient = await person(), actor = await person(), author = await person();
    const x = await topic(author);
    await forum.setTopicMute({ actorId: recipient, topicId: x, muted: true });
    const old = await forum.createPost(replyInput(x, actor, "No previous mention"));
    expect(await receipts(old.id)).toEqual([]);
    await forum.setTopicMute({ actorId: recipient, topicId: x, muted: false });
    await forum.editPublishedPost({
      postId: old.id, topicId: x, actorId: actor, expectedRevisionId: old.body.id,
      body: "New mention " + mention(recipient), draftId: uuid(),
      attachmentIds: [], retainedAttachmentIds: [],
    });
    expect((await notifications(old.id)).filter(row => row.recipient_user_id === recipient))
      .toEqual([expect.objectContaining({ kind: "mention" })]);
    expect(await receipts(old.id)).toEqual([]);
  });

  it("initial-topic Block consumption stays consumed after Unblock and old mention edit", async () => {
    const author = await person(), recipient = await person();
    await forum.setUserBlock({ actorId: recipient, blockedUserId: author, blocked: true });
    const topicId = uuid(), postId = uuid(), revisionId = uuid();
    await forum.createTopicWithInitialPost({
      id: topicId, sectionId: "filter-race-section", authorId: author,
      titleRevision: { id: uuid(), originalContent: "Initial mentioned", sourceLocale: "en" },
      initialPost: { id: postId, topicId, authorId: author,
        bodyRevision: { id: revisionId, originalContent: mention(recipient), sourceLocale: "en" } },
    });
    expect(await receipts(postId)).toEqual([recipient]);
    expect(await notifications(postId)).toEqual([]);
    await forum.setUserBlock({ actorId: recipient, blockedUserId: author, blocked: false });
    const request = { postId, topicId, actorId: author, expectedRevisionId: revisionId,
      body: "Still mentioned " + mention(recipient), draftId: uuid(),
      attachmentIds: [], retainedAttachmentIds: [] };
    await forum.editPublishedPost(request);
    const committed = (await fixture.query<{ current_revision_id: string }>(
      "select current_revision_id from forum_posts where id=$1", [postId])).rows[0]!.current_revision_id;
    await forum.editPublishedPost(request); // matching committed receipt replay is inert
    expect((await fixture.query<{ current_revision_id: string }>(
      "select current_revision_id from forum_posts where id=$1", [postId])).rows[0]!.current_revision_id)
      .toBe(committed);
    expect(await receipts(postId)).toEqual([recipient]);
    expect(await notifications(postId)).toEqual([]);
    const fresh = await forum.createPost(replyInput(topicId, author, mention(recipient)));
    expect((await notifications(fresh.id)).map(row => row.recipient_user_id)).toEqual([recipient]);
  });
});

describe("Mute/Block M4: real actor mutex, reciprocal Block and AccountState races", () => {
  it("serializes committed Mute ON and Hide in both PostgreSQL lock orders", async () => {
    const author = await person(), viewer = await person();
    for (const muteFirst of [true, false]) {
      const x = await topic(author);
      const [muteClient, hideClient] = await twoClients();
      const gate = muteFirst
        ? pauseSql(muteClient, text => /from "forum_topics"/iu.test(text) && /for share\b/iu.test(text), "after")
        : null;
      const mutePid = (await muteClient.query<{ pid: number }>("select pg_backend_pid() pid")).rows[0]!.pid;
      const hidePid = (await hideClient.query<{ pid: number }>("select pg_backend_pid() pid")).rows[0]!.pid;
      let writing: Promise<boolean> | undefined;
      let hiding: Promise<unknown> | undefined;
      let hideOpen = false;
      try {
        if (muteFirst) {
          writing = writer(muteClient).setTopicMute({ actorId: viewer, topicId: x, muted: true });
          await reached(gate!.observed);
          hiding = hideClient.query("update forum_topics set is_hidden=true,visibility_version=visibility_version+1,visibility_changed_at=clock_timestamp() where id=$1", [x]);
          await blocked(hidePid, mutePid);
          gate!.resume();
          expect(await writing).toBe(true);
          await hiding;
          expect((await forum.readMutedTopics(viewer)).items.find(item => item.id === x))
            .toMatchObject({ id: x, unavailable: true });
        } else {
          await hideClient.query("begin");
          hideOpen = true;
          await hideClient.query("update forum_topics set is_hidden=true,visibility_version=visibility_version+1,visibility_changed_at=clock_timestamp() where id=$1", [x]);
          writing = writer(muteClient).setTopicMute({ actorId: viewer, topicId: x, muted: true });
          await blocked(mutePid, hidePid);
          await hideClient.query("commit");
          hideOpen = false;
          await expect(writing).rejects.toBeInstanceOf(ForumEntityNotFoundError);
          expect(await forum.readTopicMute(viewer, x)).toBe(false);
        }
      } finally {
        gate?.resume();
        gate?.restore();
        if (hideOpen) await hideClient.query("rollback");
        await Promise.allSettled([writing, hiding].filter((p): p is Promise<unknown> => !!p));
        await Promise.all([muteClient.end(), hideClient.end()]);
      }
    }
  }, 45_000);

  it("reciprocal A->B and B->A do not create a new cross-user lock cycle", async () => {
    const a = await person(), b = await person();
    const [left, right] = await twoClients();
    const gate = pauseSql(left, text => /from "user"/iu.test(text) && /for no key update/iu.test(text), "after");
    let first: Promise<boolean> | undefined;
    try {
      first = writer(left).setUserBlock({ actorId: a, blockedUserId: b, blocked: true });
      await reached(gate.observed);
      await writer(right).setUserBlock({ actorId: b, blockedUserId: a, blocked: true });
      expect(await forum.readUserBlock(b, a)).toBe(true);
      expect(await forum.readUserBlock(a, b)).toBe(false);
      gate.resume();
      expect(await first).toBe(true);
      expect(await forum.readUserBlock(a, b)).toBe(true);
    } finally {
      gate.resume(); gate.restore();
      await Promise.allSettled(first ? [first] : []);
      await Promise.all([left.end(), right.end()]);
    }
  }, 20_000);

  it.each([
    ["mute", true], ["mute", false], ["block", true], ["block", false],
  ] as const)("same actor serializes %s first desired=%s then opposite", async (kind, firstOn) => {
    const actor = await person(), target = await person(), x = await topic(target);
    if (!firstOn) {
      if (kind === "mute") await forum.setTopicMute({ actorId: actor, topicId: x, muted: true });
      else await forum.setUserBlock({ actorId: actor, blockedUserId: target, blocked: true });
    }
    const mutate = (db: DrizzleForumRepository, on: boolean) =>
      kind === "mute" ? db.setTopicMute({ actorId: actor, topicId: x, muted: on })
        : db.setUserBlock({ actorId: actor, blockedUserId: target, blocked: on });
    const [left, right] = await twoClients();
    const gate = pauseSql(left, text => /from "user"/iu.test(text) && /for no key update/iu.test(text), "after");
    const leftPid = (await left.query<{ pid: number }>("select pg_backend_pid() pid")).rows[0]!.pid;
    const rightPid = (await right.query<{ pid: number }>("select pg_backend_pid() pid")).rows[0]!.pid;
    let first: Promise<boolean> | undefined, second: Promise<boolean> | undefined;
    try {
      first = mutate(writer(left), firstOn);
      await reached(gate.observed);
      second = mutate(writer(right), !firstOn);
      await blocked(rightPid, leftPid);
      gate.resume();
      await Promise.all([first, second]);
      const actual = kind === "mute" ? await forum.readTopicMute(actor, x) : await forum.readUserBlock(actor, target);
      expect(actual).toBe(!firstOn);
    } finally {
      gate.resume(); gate.restore();
      await Promise.allSettled([first, second].filter((p): p is Promise<boolean> => !!p));
      await Promise.all([left.end(), right.end()]);
    }
  }, 20_000);

  it.each(["mute", "block"] as const)("deactivation committed before %s actor admission rejects ON", async kind => {
    const actor = await person(), target = await person(), x = await topic(target);
    const [left, right] = await twoClients();
    const gate = pauseSql(left, text => /from "user"/iu.test(text) && /for no key update/iu.test(text), "before");
    let operation: Promise<boolean> | undefined;
    try {
      operation = kind === "mute"
        ? writer(left).setTopicMute({ actorId: actor, topicId: x, muted: true })
        : writer(left).setUserBlock({ actorId: actor, blockedUserId: target, blocked: true });
      await reached(gate.observed);
      await right.query('update "user" set deactivated_at=now(),deactivated_by_user_id=$1,'
        + "retain_at_least_until=now()+interval '2 years' where id=$1", [actor]);
      gate.resume();
      await expect(operation).rejects.toBeInstanceOf(AccountInactiveError);
      expect(kind === "mute" ? await forum.readTopicMute(actor, x) : await forum.readUserBlock(actor, target))
        .toBe(false);
    } finally {
      gate.resume(); gate.restore();
      await Promise.allSettled(operation ? [operation] : []);
      await Promise.all([left.end(), right.end()]);
    }
  }, 20_000);

  it.each(["mute", "block"] as const)("committed %s writer wins mutex before deactivation", async kind => {
    const actor = await person(), target = await person(), x = await topic(target);
    const [left, right] = await twoClients();
    const gate = pauseSql(left, text => /from "user"/iu.test(text) && /for no key update/iu.test(text), "after");
    const write = (on: boolean) => kind === "mute"
      ? forum.setTopicMute({ actorId: actor, topicId: x, muted: on })
      : forum.setUserBlock({ actorId: actor, blockedUserId: target, blocked: on });
    let operation: Promise<boolean> | undefined;
    try {
      operation = kind === "mute"
        ? writer(left).setTopicMute({ actorId: actor, topicId: x, muted: true })
        : writer(left).setUserBlock({ actorId: actor, blockedUserId: target, blocked: true });
      await reached(gate.observed);
      await right.query("begin");
      await right.query("set local lock_timeout = '180ms'");
      await expect(right.query('update "user" set deactivated_at=now(),deactivated_by_user_id=$1,'
        + "retain_at_least_until=now()+interval '2 years' where id=$1", [actor]))
        .rejects.toMatchObject({ code: "55P03" });
      await right.query("rollback");
      gate.resume();
      expect(await operation).toBe(true);
      await deactivate(actor);
      expect(kind === "mute" ? await forum.readTopicMute(actor, x) : await forum.readUserBlock(actor, target))
        .toBe(true);
      await expect(write(false)).rejects.toBeInstanceOf(AccountInactiveError);
    } finally {
      gate.resume(); gate.restore();
      await Promise.allSettled(operation ? [operation] : []);
      await right.query("rollback").catch(() => {});
      await Promise.all([left.end(), right.end()]);
    }
  }, 20_000);
});

describe("Mute/Block M5: receipt/notice publication atomicity", () => {
  it("rolls back initial topic and post/revisions on suppressed mention receipt failure", async () => {
    const recipient = await person(), actor = await person();
    await forum.setUserBlock({ actorId: recipient, blockedUserId: actor, blocked: true });
    const topicId = uuid(), postId = uuid(), titleRevisionId = uuid(), bodyRevisionId = uuid();
    const request = {
      id: topicId, sectionId: "filter-race-section", authorId: actor,
      titleRevision: { id: titleRevisionId, originalContent: "Rollback topic", sourceLocale: "en" },
      initialPost: { id: postId, topicId, authorId: actor,
        bodyRevision: { id: bodyRevisionId, originalContent: mention(recipient), sourceLocale: "en" } },
    };
    await failingReceipt(async () => {
      await expectDatabaseFailure(forum.createTopicWithInitialPost(request), "forced personal receipt failure");
    });
    for (const [table, id] of [
      ["forum_topics", topicId], ["forum_topic_title_revisions", titleRevisionId],
      ["forum_posts", postId], ["forum_post_revisions", bodyRevisionId],
    ]) expect(await count("select count(*)::int n from " + table + " where id=$1", [id])).toBe(0);
    expect(await receipts(postId)).toEqual([]);
    expect(await notifications(postId)).toEqual([]);
    await forum.createTopicWithInitialPost(request);
    expect(await receipts(postId)).toEqual([recipient]);
  });

  it("receipt failure rolls back a reply, body revision and draft publication receipt", async () => {
    const recipient = await person(), actor = await person(), x = await topic(recipient);
    await forum.setTopicMute({ actorId: recipient, topicId: x, muted: true });
    const contextKey = "topic:" + x + ":reply", draftId = uuid();
    const request = { ...replyInput(x, actor, "Rollback reply"), publishedDraft: {
      contextKey, draftId, attachmentIds: [],
    } };
    await failingReceipt(async () => {
      await expectDatabaseFailure(forum.createPost(request), "forced personal receipt failure");
    });
    expect(await count("select count(*)::int n from forum_posts where id=$1", [request.id])).toBe(0);
    expect(await count("select count(*)::int n from forum_post_revisions where id=$1", [request.bodyRevision.id])).toBe(0);
    expect(await count("select count(*)::int n from forum_publication_receipts where owner_id=$1"
      + " and context_key=$2 and draft_id=$3", [actor, contextKey, draftId])).toBe(0);
    expect(await receipts(request.id)).toEqual([]);
    expect(await notifications(request.id)).toEqual([]);
    await forum.createPost(request);
    expect(await receipts(request.id)).toEqual([recipient]);
    expect(await count("select count(*)::int n from forum_publication_receipts where owner_id=$1"
      + " and context_key=$2 and draft_id=$3", [actor, contextKey, draftId])).toBe(1);
  });

  it("receipt failure rolls back edit CAS/revision/receipt; replay does not backfill", async () => {
    const recipient = await person(), actor = await person(), author = await person(), x = await topic(author);
    const first = replyInput(x, actor, "Original before mention");
    await forum.createPost(first);
    await forum.setUserBlock({ actorId: recipient, blockedUserId: actor, blocked: true });
    const before = (await fixture.query<{ current_revision_id: string; edited_at: Date | null }>(
      "select current_revision_id,edited_at from forum_posts where id=$1", [first.id])).rows[0]!;
    const request = { postId: first.id, topicId: x, actorId: actor, expectedRevisionId: before.current_revision_id,
      body: "Edited " + mention(recipient), draftId: uuid(),
      attachmentIds: [], retainedAttachmentIds: [] };
    const originalCount = await count("select count(*)::int n from forum_post_revisions where post_id=$1", [first.id]);
    await failingReceipt(async () => {
      await expectDatabaseFailure(forum.editPublishedPost(request), "forced personal receipt failure");
    });
    expect((await fixture.query("select current_revision_id,edited_at from forum_posts where id=$1", [first.id])).rows[0])
      .toEqual(before);
    expect(await count("select count(*)::int n from forum_post_revisions where post_id=$1", [first.id]))
      .toBe(originalCount);
    expect(await count("select count(*)::int n from forum_publication_receipts"
      + " where owner_id=$1 and draft_id=$2", [actor, request.draftId])).toBe(0);
    expect(await receipts(first.id)).toEqual([]);
    await forum.editPublishedPost(request);
    expect(await receipts(first.id)).toEqual([recipient]);
    await forum.setUserBlock({ actorId: recipient, blockedUserId: actor, blocked: false });
    const after = (await fixture.query<{ current_revision_id: string }>(
      "select current_revision_id from forum_posts where id=$1", [first.id])).rows[0]!.current_revision_id;
    await forum.editPublishedPost(request); // matching receipt replay
    expect((await fixture.query<{ current_revision_id: string }>(
      "select current_revision_id from forum_posts where id=$1", [first.id])).rows[0]!.current_revision_id)
      .toBe(after);
    expect(await notifications(first.id)).not.toContainEqual(expect.objectContaining({ recipient_user_id: recipient }));
    expect(await receipts(first.id)).toEqual([recipient]);
  });


  it("late publication receipt failure rolls back suppression, attached file binding and draft completion", async () => {
    const recipient = await person(), actor = await person(), x = await topic(recipient);
    await forum.setTopicMute({ actorId: recipient, topicId: x, muted: true });
    const contextKey = "topic:" + x + ":reply", draftId = uuid(), attachmentId = uuid();
    await attachments.createDraftAttachment({
      id: attachmentId, ownerId: actor, contextKey, draftId, objectKey: "private/" + uuid(),
      fileName: "transactional.txt", declaredMime: "text/plain",
      detectedType: "text", responseMime: "text/plain; charset=utf-8",
      byteSize: 9, verificationStatus: "type-checked",
    });
    const request = { ...replyInput(x, actor, "Attached reply"), publishedDraft: {
      contextKey, draftId, attachmentIds: [attachmentId],
    } };
    const draftRefs = () => count(
      "select count(*)::int n from forum_attachment_draft_refs"
      + " where owner_id=$1 and context_key=$2 and draft_id=$3",
      [actor, contextKey, draftId],
    );
    const completed = () => count(
      "select count(*)::int n from forum_attachment_draft_generations"
      + " where owner_id=$1 and context_key=$2 and draft_id=$3",
      [actor, contextKey, draftId],
    );
    await fixture.query("create function filter_race_publication_fault() returns trigger language plpgsql as $$"
      + " begin raise exception 'forced publication receipt failure'; end; $$");
    await fixture.query("create trigger filter_race_publication_fault before insert"
      + " on forum_publication_receipts for each row execute function filter_race_publication_fault()");
    try {
      await expectDatabaseFailure(forum.createPost(request), "forced publication receipt failure");
    } finally {
      await fixture.query("drop trigger filter_race_publication_fault on forum_publication_receipts");
      await fixture.query("drop function filter_race_publication_fault()");
    }
    expect(await count("select count(*)::int n from forum_posts where id=$1", [request.id])).toBe(0);
    expect(await count("select count(*)::int n from forum_post_revisions where id=$1", [request.bodyRevision.id])).toBe(0);
    expect(await count("select count(*)::int n from forum_post_attachments where post_id=$1", [request.id])).toBe(0);
    expect(await count("select count(*)::int n from forum_publication_receipts"
      + " where owner_id=$1 and context_key=$2 and draft_id=$3", [actor, contextKey, draftId])).toBe(0);
    expect(await receipts(request.id)).toEqual([]);
    expect(await notifications(request.id)).toEqual([]);
    expect(await draftRefs()).toBe(1);
    expect(await completed()).toBe(0);

    await forum.createPost(request);
    expect(await receipts(request.id)).toEqual([recipient]);
    expect(await count("select count(*)::int n from forum_post_attachments where post_id=$1", [request.id])).toBe(1);
    expect(await count("select count(*)::int n from forum_publication_receipts"
      + " where owner_id=$1 and context_key=$2 and draft_id=$3", [actor, contextKey, draftId])).toBe(1);
    expect(await draftRefs()).toBe(0);
    expect(await completed()).toBe(1);
  });

  it("existing delivered read_at remains unchanged; failed Mute write cannot silently filter replies", async () => {
    const recipient = await person(), actor = await person(), x = await topic(recipient);
    const delivered = await forum.createPost(replyInput(x, actor, "First delivered"));
    const readAt = new Date("2026-11-01T12:00:00.000Z");
    await fixture.query("update forum_reply_notifications set read_at=$1 where recipient_user_id=$2 and post_id=$3",
      [readAt, recipient, delivered.id]);
    await fixture.query("create function filter_race_mute_fault() returns trigger language plpgsql as $$"
      + " begin raise exception 'forced personal preference failure'; end; $$");
    await fixture.query("create trigger filter_race_mute_fault before insert"
      + " on forum_topic_mutes for each row execute function filter_race_mute_fault()");
    try {
      await expectDatabaseFailure(
        forum.setTopicMute({ actorId: recipient, topicId: x, muted: true }),
        "forced personal preference failure",
      );
    } finally {
      await fixture.query("drop trigger filter_race_mute_fault on forum_topic_mutes");
      await fixture.query("drop function filter_race_mute_fault()");
    }
    expect(await forum.readTopicMute(recipient, x)).toBe(false);
    const fresh = await forum.createPost(replyInput(x, actor, "Still delivered"));
    expect((await notifications(fresh.id)).map(row => row.recipient_user_id)).toContain(recipient);
    await forum.setTopicMute({ actorId: recipient, topicId: x, muted: true });
    const old = (await notifications(delivered.id)).filter(row => row.recipient_user_id === recipient);
    expect(old).toHaveLength(1);
    expect(old[0]!.read_at).toEqual(readAt);
    expect((await receipts(delivered.id)).includes(recipient)).toBe(false);
    const suppressed = await forum.createPost(replyInput(x, actor, "Suppressed after Mute"));
    expect(await receipts(suppressed.id)).toEqual([recipient]);
    await forum.setTopicMute({ actorId: recipient, topicId: x, muted: false });
    expect((await notifications(suppressed.id)).some(row => row.recipient_user_id === recipient)).toBe(false);
  });
});
