import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import { DrizzleComplaintsRepository } from "../../db/complaints-repository";
import { DrizzleForumRepository } from "../../db/forum-repository";

const url = process.env.DATABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname) ||
  !new URL(url).pathname.endsWith("_test")) throw new Error("SA04-N1 requires disposable local PostgreSQL *_test");
const schema = "sa04_n1_complaints_test";
const options = "-c search_path=" + schema + " -c lock_timeout=8s";
const fixture = new Client({ connectionString: url, options });
const pool = new Pool({ connectionString: url, options, max: 4 });
const noMeasures = async () => {};
const forum = new DrizzleForumRepository(drizzle(pool), { cooldownMs: 0, now: () => new Date() }, noMeasures);
const uuid = () => crypto.randomUUID();
const reporter = "n1-reporter";
const author = "n1-author";
type Target =
  | { kind: "topic-title"; topicId: string; revisionId: string }
  | { kind: "post"; topicId: string; postId: string; revisionId: string };

function repo(client: Client = fixture) {
  return new DrizzleComplaintsRepository(drizzle(client),
    { tenMinutes: 10000, day: 10000 }, noMeasures);
}
function report(target: Target, operationId = uuid()) {
  return { target, operationId, reason: "spam" as const, explanation: "N1 exact complaint" };
}
async function content() {
  const topicId = uuid(), postId = uuid(), revisionId = uuid(), titleRevisionId = uuid();
  await forum.createTopicWithInitialPost({
    id: topicId, sectionId: "n1-section", authorId: author,
    titleRevision: { id: titleRevisionId, originalContent: "N1 title", sourceLocale: "en" },
    initialPost: { id: postId, topicId, authorId: author,
      bodyRevision: { id: revisionId, originalContent: "N1 body", sourceLocale: "en" } },
  });
  return {
    post: { kind: "post" as const, topicId, postId, revisionId },
    title: { kind: "topic-title" as const, topicId, revisionId: titleRevisionId },
  };
}
async function facts() {
  const tables = ["forum_complaint_targets", "forum_complaint_cases", "forum_complaint_evidence_attachments",
    "forum_complaints", "forum_complaint_events", "forum_complaint_activity"];
  const state: Record<string, unknown[]> = {};
  for (const name of tables) {
    state[name] = (await fixture.query("select * from " + name + " order by 1")).rows;
  }
  return state;
}
async function deactivate(id: string) {
  const result = await fixture.query('update "user" set deactivated_at=clock_timestamp(),'
    + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years'"
    + " where id=$1 and deactivated_at is null returning id", [id]);
  expect(result.rows).toEqual([{ id }]);
}
function statement(value: unknown): string {
  if (typeof value === "string") return value;
  return value && typeof value === "object" && "text" in value &&
    typeof value.text === "string" ? value.text : "";
}
function pauseQuery(client: Client, matches: (query: string) => boolean) {
  const original = client.query;
  let notify!: () => void, release!: () => void;
  const observed = new Promise<void>(resolve => { notify = resolve; });
  const unblocked = new Promise<void>(resolve => { release = resolve; });
  let used = false;
  client.query = ((...args: unknown[]) => {
    if (!used && matches(statement(args[0]))) {
      used = true; notify();
      return unblocked.then(() => Reflect.apply(original, client, args));
    }
    return Reflect.apply(original, client, args);
  }) as typeof client.query;
  return { observed, resume: release, restore: () => { client.query = original; } };
}
async function waitForBlock(waiter: Client, blocker: Client) {
  const w = (await waiter.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]!.pid;
  const b = (await blocker.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]!.pid;
  for (let attempt = 0; attempt < 200; attempt++) {
    const rows = await fixture.query<{ pids: number[] }>("select pg_blocking_pids($1) as pids", [w]);
    if (rows.rows[0]?.pids.includes(b)) return;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error("No actual PostgreSQL blocking dependency");
}
async function client() {
  const c = new Client({ connectionString: url, options });
  await c.connect();
  return c;
}

beforeAll(async () => {
  await fixture.connect();
  await fixture.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const file of (await readdir("drizzle")).filter(n => /^\d{4}_.+\.sql$/.test(n)).sort()) {
    await fixture.query((await readFile("drizzle/" + file, "utf8")).replaceAll('"public".', '"' + schema + '".'));
  }
  for (const id of [reporter, author]) {
    await fixture.query('insert into "user"(id,name,email) values ($1,$1,$2)', [id, id + "@test.invalid"]);
  }
  await forum.createCategory({ id: "n1-category", name: "N1 complaints" });
  await forum.createSection({ id: "n1-section", categoryId: "n1-category", name: "N1 section" });
});
afterAll(async () => {
  await pool.end();
  await fixture.query("drop schema if exists " + schema + " cascade");
  await fixture.end();
});

describe("SA04-N1 native Complaint submit actor admission and content dependencies", () => {
  it("active post and title submit, exact replay and lifetime duplicate still work; inactive/missing deny before receipts", async () => {
    const target = await content();
    const actor = "n1-actor-" + uuid();
    await fixture.query('insert into "user"(id,name,email) values($1,$1,$2)', [actor, actor + "@test.invalid"]);
    const post = report(target.post), title = report(target.title);
    const originalPost = await repo().submit(actor, post);
    const originalTitle = await repo().submit(actor, title);
    expect(originalPost.caseId).not.toBe(originalTitle.caseId);
    expect(await repo().submit(actor, post)).toEqual(originalPost);
    expect(await repo().submit(actor, title)).toEqual(originalTitle);
    expect(await repo().submit(actor, report(target.post))).toEqual(originalPost);
    expect(await repo().submit(actor, report(target.title))).toEqual(originalTitle);
    const retained = await facts();
    await deactivate(actor);
    for (const input of [post, title, report(target.post), report(target.title)]) {
      await expect(repo().submit(actor, input)).rejects.toBeInstanceOf(AccountInactiveError);
      expect(await facts()).toEqual(retained);
    }
    const missing = "n1-missing-" + uuid();
    for (const input of [post, title]) {
      await expect(repo().submit(missing, input)).rejects.toBeInstanceOf(AccountMissingError);
      expect(await facts()).toEqual(retained);
    }
  }, 35000);

  it("state-first lifecycle COMMIT blocks an in-flight post writer, then denies without durable effects", async () => {
    const target = await content(), actor = "n1-state-first-" + uuid();
    await fixture.query('insert into "user"(id,name,email) values($1,$1,$2)', [actor, actor + "@test.invalid"]);
    const before = await facts(), writer = await client(), state = await client();
    const writerPid = (await writer.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]!.pid;
    const statePid = (await state.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]!.pid;
    try {
      await state.query("begin");
      await state.query('update "user" set deactivated_at=now(),deactivated_by_user_id=$1,'
        + "retain_at_least_until=now()+interval '2 years' where id=$1", [actor]);
      const writing = repo(writer).submit(actor, report(target.post));
      try {
        let confirmed = false;
        for (let i = 0; i < 200; i++) {
          const rows = await fixture.query<{ pids: number[] }>("select pg_blocking_pids($1) as pids", [writerPid]);
          if (rows.rows[0]?.pids.includes(statePid)) { confirmed = true; break; }
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        expect(confirmed).toBe(true);
      } finally {
        await state.query("commit");
      }
      await expect(writing).rejects.toBeInstanceOf(AccountInactiveError);
      expect(await facts()).toEqual(before);
    } finally {
      await state.query("rollback").catch(() => undefined);
      await Promise.all([writer.end(), state.end()]);
    }
  }, 35000);

  it.each(["post-first", "title-first"] as const)(
    "N-DEP-01: same-actor real post/title submissions both commit without a topic-FK deadlock (%s)",
    async order => {
      const target = await content(), actor = "n1-dep-" + uuid();
      await fixture.query('insert into "user"(id,name,email) values($1,$1,$2)', [actor, actor + "@test.invalid"]);
      const postClient = await client(), titleClient = await client();
      const first = order === "post-first" ? postClient : titleClient;
      const second = order === "post-first" ? titleClient : postClient;
      const pause = pauseQuery(first, query => /from "user"/i.test(query) && /for no key update/i.test(query));
      let firstOp: ReturnType<DrizzleComplaintsRepository["submit"]> | undefined;
      let secondOp: ReturnType<DrizzleComplaintsRepository["submit"]> | undefined;
      try {
        firstOp = repo(first).submit(actor, report(order === "post-first" ? target.post : target.title));
        await pause.observed;
        secondOp = repo(second).submit(actor, report(order === "post-first" ? target.title : target.post));
        await waitForBlock(second, first);
        pause.resume();
        const [a, b] = await Promise.all([firstOp, secondOp]);
        expect(a.complaintId).not.toBe(b.complaintId);
        const rows = await fixture.query<{ kind: string }>(
          "select kind from forum_complaint_targets where topic_id=$1 order by kind", [target.post.topicId]);
        expect(rows.rows.map(row => row.kind)).toEqual(["post", "topic-title"]);
        const submitted = await fixture.query<{ count: number }>(
          "select count(*)::int as count from forum_complaints where reporter_user_id=$1", [actor]);
        expect(submitted.rows[0]?.count).toBe(2);
      } finally {
        pause.resume();
        pause.restore();
        await Promise.allSettled([...(firstOp ? [firstOp] : []), ...(secondOp ? [secondOp] : [])]);
        await Promise.all([postClient.end(), titleClient.end()]);
      }
    }, 40000
  );
});
