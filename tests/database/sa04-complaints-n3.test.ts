import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import { DrizzleComplaintsRepository, type AppealComplaint, type ResolveComplaintAppeal } from "../../db/complaints-repository";
import { DrizzleForumRepository } from "../../db/forum-repository";
import { ComplaintConflictError } from "../../db/complaints-domain";

const url = process.env.DATABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname) ||
  !new URL(url).pathname.endsWith("_test")) throw new Error("SA04-N3 requires disposable local PostgreSQL *_test");
const schema = "sa04_n3_complaints_test";
const options = "-c search_path=" + schema + " -c lock_timeout=8s";
const fixture = new Client({ connectionString: url, options });
const pool = new Pool({ connectionString: url, options, max: 4 });
const noMeasures = async () => {};
const repo = (c: Client = fixture) => new DrizzleComplaintsRepository(drizzle(c),
  { tenMinutes: 10000, day: 10000 }, noMeasures);
const forum = new DrizzleForumRepository(drizzle(pool), { cooldownMs: 0, now: () => new Date() }, noMeasures);
const uuid = () => crypto.randomUUID();
const reviewer = "n3-reviewer";
async function person(id = "n3-" + uuid()) {
  await fixture.query('insert into "user"(id,name,email) values($1,$1,$2)', [id, id + "@test.invalid"]);
  return id;
}
async function newCase(outcome: "confirmed" | "not-confirmed" = "not-confirmed",
  actorId?: string, targetAuthor?: string) {
  const reporter = actorId ?? await person();
  const author = targetAuthor ?? await person();
  const topicId = uuid(), postId = uuid(), revisionId = uuid(), titleRevision = uuid();
  await forum.createTopicWithInitialPost({
    id: topicId, sectionId: "n3-section", authorId: author,
    titleRevision: { id: titleRevision, originalContent: "N3 title", sourceLocale: "en" },
    initialPost: { id: postId, topicId, authorId: author,
      bodyRevision: { id: revisionId, originalContent: "N3 report text", sourceLocale: "en" } },
  });
  const { caseId } = await repo().submit(reporter, {
    target: { kind: "post", topicId, postId, revisionId },
    reason: "spam", explanation: null, operationId: uuid(),
  });
  const { rows } = await fixture.query<{ version: number }>(
    "select version from forum_complaint_cases where id=$1", [caseId]);
  const decisionId = await repo().decide(reviewer, {
    caseId, operationId: uuid(), expectedVersion: rows[0]!.version, outcome, reasoning: "N3 original decision",
  });
  return { reporter, author, caseId, decisionId };
}
function appeal(record: { caseId: string; decisionId: string }, operationId = uuid()): AppealComplaint {
  return { caseId: record.caseId, decisionId: record.decisionId, operationId, argument: "Please reconsider" };
}
function resolve(record: { caseId: string }, appealId: string, operationId = uuid(),
  outcome: "overturned" | "upheld" = "overturned"): ResolveComplaintAppeal {
  return { caseId: record.caseId, appealId, operationId, outcome, reasoning: "N3 resolution" };
}
async function facts() {
  const tables = ["forum_complaint_targets", "forum_complaint_cases", "forum_complaints",
    "forum_complaint_events", "forum_complaint_evidence_attachments", "forum_complaint_activity",
    "forum_complaint_decisions", "forum_complaint_notes", "forum_complaint_appeals",
    "forum_reply_notifications", "admin_history", "forum_complaint_priority_settings"];
  const state: Record<string, unknown[]> = {};
  for (const name of tables) state[name] =
    (await fixture.query("select * from " + name + " order by 1")).rows;
  return state;
}
async function deactivate(actor: string) {
  const result = await fixture.query('update "user" set deactivated_at=clock_timestamp(),'
    + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years'"
    + " where id=$1 and deactivated_at is null returning id", [actor]);
  expect(result.rows).toEqual([{ id: actor }]);
}
async function client() {
  const result = new Client({ connectionString: url, options }); await result.connect(); return result;
}
async function waitForBlock(waitingPid: number, blockerPid: number) {
  for (let i = 0; i < 200; i++) {
    const { rows } = await fixture.query<{ pids: number[] }>(
      "select pg_blocking_pids($1) as pids", [waitingPid]);
    if (rows[0]?.pids.includes(blockerPid)) return;
    await new Promise(done => setTimeout(done, 20));
  }
  throw new Error("Expected physical PostgreSQL blocking dependency");
}
function pauseCommit(c: Client) {
  const original = c.query;
  let trigger!: () => void, resume!: () => void;
  const observed = new Promise<void>(done => { trigger = done; });
  const released = new Promise<void>(done => { resume = done; });
  let seen = false;
  c.query = ((...args: unknown[]) => {
    const sql = typeof args[0] === "string" ? args[0] :
      args[0] && typeof args[0] === "object" && "text" in args[0]
        ? String(args[0].text) : "";
    if (!seen && /^commit$/i.test(sql.trim())) {
      seen = true; trigger();
      return released.then(() => Reflect.apply(original, c, args));
    }
    return Reflect.apply(original, c, args);
  }) as typeof c.query;
  return { observed, resume, restore: () => { c.query = original; } };
}
beforeAll(async () => {
  await fixture.connect();
  await fixture.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const file of (await readdir("drizzle")).filter(n => /^\d{4}_.+\.sql$/.test(n)).sort()) {
    await fixture.query((await readFile("drizzle/" + file, "utf8")).replaceAll('"public".', '"' + schema + '".'));
  }
  await person(reviewer);
  await forum.createCategory({ id: "n3-category", name: "N3 complaints" });
  await forum.createSection({ id: "n3-section", categoryId: "n3-category", name: "N3 section" });
});
afterAll(async () => {
  await pool.end();
  await fixture.query("drop schema if exists " + schema + " cascade");
  await fixture.end();
});
describe("SA04-N3 native Complaint participant and Appeal reviewer lifecycle", () => {
  it("active three-slot Appeal policy, exact receipt replays, effective outcomes and recipient fanout remain intact", async () => {
    const c = await newCase();
    const first = appeal(c);
    const firstId = await repo().appeal(c.reporter, first);
    expect(await repo().appeal(c.reporter, first)).toBe(firstId);
    const r1 = resolve(c, firstId);
    expect(await repo().resolveAppeal(reviewer, r1)).toBe(firstId);
    expect(await repo().resolveAppeal(reviewer, r1)).toBe(firstId);
    const second = appeal(c);
    const secondId = await repo().appeal(c.author, second);
    const r2 = resolve(c, secondId, uuid(), "upheld");
    expect(await repo().resolveAppeal(reviewer, r2)).toBe(secondId);
    const third = appeal(c);
    const thirdId = await repo().appeal(c.author, third);
    expect(thirdId).not.toBe(secondId);
    await repo().resolveAppeal(reviewer, resolve(c, thirdId));
    await expect(repo().appeal(c.reporter, appeal(c))).rejects.toBeInstanceOf(ComplaintConflictError);
    const rows = await fixture.query<{ ordinal: number; status: string; outcome: string }>(
      "select ordinal,status,outcome from forum_complaint_appeals where decision_id=$1 order by ordinal", [c.decisionId]);
    expect(rows.rows).toEqual([
      { ordinal: 1, status: "resolved", outcome: "overturned" },
      { ordinal: 2, status: "resolved", outcome: "upheld" },
      { ordinal: 3, status: "resolved", outcome: "overturned" },
    ]);
    const notice = await fixture.query<{ recipient_user_id: string; count: number }>(
      "select recipient_user_id,count(*)::int as count from forum_reply_notifications"
      + " where complaint_appeal_id is not null and recipient_user_id in ($1,$2)"
      + " group by recipient_user_id order by recipient_user_id", [c.reporter, c.author]);
    expect(notice.rows).toEqual([
      { recipient_user_id: [c.author,c.reporter].sort()[0], count: 3 },
      { recipient_user_id: [c.author,c.reporter].sort()[1], count: 3 },
    ]);
  }, 35000);

  it("inactive or missing participant and resolver deny before all durable fact changes", async () => {
    const c = await newCase();
    const inactiveResolver = await person();
    await deactivate(inactiveResolver);
    const beforePending = await facts();
    await expect(repo().resolveAppeal(inactiveResolver, resolve(c, uuid()))).rejects.toBeInstanceOf(AccountInactiveError);
    await expect(repo().resolveAppeal("n3-missing-" + uuid(), resolve(c, uuid()))).rejects.toBeInstanceOf(AccountMissingError);
    expect(await facts()).toEqual(beforePending);
    await deactivate(c.reporter);
    const before = await facts();
    await expect(repo().appeal(c.reporter, appeal(c))).rejects.toBeInstanceOf(AccountInactiveError);
    await expect(repo().appeal("n3-missing-" + uuid(), appeal(c))).rejects.toBeInstanceOf(AccountMissingError);
    expect(await facts()).toEqual(before);
  }, 30000);

  it("inactive matching Appeal and resolution receipts cannot bypass actor admission", async () => {
    const c = await newCase(), resolver = await person();
    const command = appeal(c), id = await repo().appeal(c.reporter, command);
    const reviewed = resolve(c, id);
    await repo().resolveAppeal(resolver, reviewed);
    await deactivate(resolver);
    await deactivate(c.reporter);
    const before = await facts();
    await expect(repo().appeal(c.reporter, command)).rejects.toBeInstanceOf(AccountInactiveError);
    await expect(repo().resolveAppeal(resolver, reviewed)).rejects.toBeInstanceOf(AccountInactiveError);
    expect(await facts()).toEqual(before);
  }, 30000);

  it.each(["appeal", "resolve"] as const)(
    "%s state-first deactivation holds actor and denies after COMMIT with unchanged facts", async kind => {
      const c = await newCase(), actor = await person();
      const id = kind === "resolve" ? await repo().appeal(c.reporter, appeal(c)) : null;
      const command = kind === "appeal" ? appeal(c) : resolve(c, id!);
      const actualActor = kind === "appeal" ? c.reporter : actor;
      const before = await facts(), writer = await client(), state = await client();
      try {
        const writerPid = (await writer.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]!.pid;
        const statePid = (await state.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]!.pid;
        await state.query("begin");
        await state.query('update "user" set deactivated_at=clock_timestamp(),'
          + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years' where id=$1", [actualActor]);
        const pending = kind === "appeal"
          ? repo(writer).appeal(actualActor, command as AppealComplaint)
          : repo(writer).resolveAppeal(actualActor, command as ResolveComplaintAppeal);
        try { await waitForBlock(writerPid, statePid); } finally { await state.query("commit"); }
        await expect(pending).rejects.toBeInstanceOf(AccountInactiveError);
        expect(await facts()).toEqual(before);
      } finally {
        await state.query("rollback").catch(() => undefined);
        await Promise.all([writer.end(), state.end()]);
      }
    }, 35000,
  );

  it.each(["appeal", "resolve"] as const)(
    "%s writer-first actor lock survives through COMMIT, then blocks later replay", async kind => {
      const c = await newCase(), actor = kind === "appeal" ? c.reporter : await person();
      const prior = kind === "resolve" ? await repo().appeal(c.reporter, appeal(c)) : null;
      const command = kind === "appeal" ? appeal(c) : resolve(c, prior!);
      const writer = await client(), state = await client();
      const pause = pauseCommit(writer);
      let pending: Promise<string> | undefined;
      try {
        pending = kind === "appeal"
          ? repo(writer).appeal(actor, command as AppealComplaint)
          : repo(writer).resolveAppeal(actor, command as ResolveComplaintAppeal);
        await pause.observed;
        await state.query("begin");
        try {
          await state.query("set local lock_timeout='180ms'");
          await expect(state.query('update "user" set deactivated_at=now(),'
            + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years' where id=$1", [actor]))
            .rejects.toMatchObject({ code: "55P03" });
        } finally { await state.query("rollback"); }
        pause.resume();
        expect(await pending).toBeTruthy();
        await deactivate(actor);
        const after = await facts();
        if (kind === "appeal") {
          await expect(repo().appeal(actor, command as AppealComplaint)).rejects.toBeInstanceOf(AccountInactiveError);
        } else {
          await expect(repo().resolveAppeal(actor, command as ResolveComplaintAppeal)).rejects.toBeInstanceOf(AccountInactiveError);
        }
        expect(await facts()).toEqual(after);
      } finally {
        pause.resume(); pause.restore();
        if (pending) await Promise.allSettled([pending]);
        await state.query("rollback").catch(() => undefined);
        await Promise.all([writer.end(), state.end()]);
      }
    }, 35000,
  );

  it("active reviewer preserves notifications for inactive retained author without target lifecycle veto", async () => {
    const c = await newCase();
    const id = await repo().appeal(c.reporter, appeal(c));
    await deactivate(c.author);
    const reviewerActive = await person();
    await repo().resolveAppeal(reviewerActive, resolve(c, id));
    const notice = await fixture.query<{ recipient_user_id: string }>(
      "select recipient_user_id from forum_reply_notifications where complaint_appeal_id=$1", [id]);
    expect(notice.rows.map(x=>x.recipient_user_id).sort()).toEqual([c.author, c.reporter].sort());
  }, 30000);
});
