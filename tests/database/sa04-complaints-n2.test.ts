import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import { DrizzleComplaintsRepository } from "../../db/complaints-repository";
import { DrizzleForumRepository } from "../../db/forum-repository";
import { DEFAULT_COMPLAINT_REASON_PRIORITY } from "../../app/complaints/queue-contract";

const url = process.env.DATABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname) ||
  !new URL(url).pathname.endsWith("_test")) throw new Error("SA04-N2 requires disposable local PostgreSQL *_test");
const schema = "sa04_n2_complaints_test";
const options = "-c search_path=" + schema + " -c lock_timeout=8s";
const fixture = new Client({ connectionString: url, options });
const noMeasures = async () => {};
const repo = (c: Client = fixture) => new DrizzleComplaintsRepository(drizzle(c),
  { tenMinutes: 10000, day: 10000 }, noMeasures);
const uuid = () => crypto.randomUUID();
const reporter = "n2-reporter";
const author = "n2-author";
const reviewer = "n2-reviewer";
const forum = new DrizzleForumRepository(drizzle(fixture), { cooldownMs: 0, now: () => new Date() }, noMeasures);
async function person(id: string) {
  await fixture.query('insert into "user"(id,name,email) values($1,$1,$2)', [id, id + "@test.invalid"]);
}
async function caseFixture() {
  const topicId = uuid(), postId = uuid(), revisionId = uuid(), titleRevision = uuid();
  await forum.createTopicWithInitialPost({
    id: topicId, sectionId: "n2-section", authorId: author,
    titleRevision: { id: titleRevision, originalContent: "N2 title", sourceLocale: "en" },
    initialPost: { id: postId, topicId, authorId: author,
      bodyRevision: { id: revisionId, originalContent: "N2 body", sourceLocale: "en" } },
  });
  const result = await repo().submit(reporter, {
    target: { kind: "post", topicId, postId, revisionId },
    reason: "spam", explanation: null, operationId: uuid(),
  });
  return result.caseId;
}
async function version(caseId: string) {
  const r = await fixture.query<{ version: number }>(
    "select version from forum_complaint_cases where id=$1", [caseId]);
  return r.rows[0]!.version;
}
async function retained() {
  const tables = ["forum_complaint_cases", "forum_complaint_events", "forum_complaint_notes",
    "forum_complaint_decisions", "forum_complaint_activity", "forum_complaint_priority_settings",
    "forum_complaint_appeals", "forum_complaints", "forum_complaint_targets",
    "forum_complaint_evidence_attachments", "forum_reply_notifications"];
  const state: Record<string, unknown[]> = {};
  for (const name of tables) state[name] =
    (await fixture.query("select * from " + name + " order by 1")).rows;
  return state;
}
async function deactivate(id: string) {
  await fixture.query('update "user" set deactivated_at=clock_timestamp(),'
    + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years'"
    + " where id=$1", [id]);
}
async function newClient() {
  const c = new Client({ connectionString: url, options }); await c.connect(); return c;
}
type N2Writer = "priority" | "activity-start" | "activity-end" | "note" | "decision";
function executeN2(kind: N2Writer, actor: string, caseId: string, expectedVersion: number,
  operationId: string, client: Client) {
  const db = repo(client);
  switch (kind) {
    case "priority": return db.changePriority(actor, {
      caseId, expectedVersion, operationId, priority: 3,
    });
    case "activity-start": return db.activity(actor, caseId, true);
    case "activity-end": return db.activity(actor, caseId, false);
    case "note": return db.addNote(actor, { caseId, operationId, body: "N4.2 concurrent note" });
    case "decision": return db.decide(actor, {
      caseId, operationId, expectedVersion, outcome: "not-confirmed", reasoning: "N4.2 concurrent decision",
    });
  }
}
async function observeBlock(waiter: number, blocker: number) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const r = await fixture.query<{ blocked: boolean }>(
      "select $2::int=any(pg_blocking_pids($1::int)) as blocked", [waiter, blocker]);
    if (r.rows[0]?.blocked) return;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error("N4.2: expected real PG17 actor-row lock wait");
}
function pauseBeforeCommit(writer: Client) {
  const original = writer.query;
  let entered!: () => void, release!: () => void;
  const paused = new Promise<void>(resolve => { entered = resolve; });
  const resumeCommit = new Promise<void>(resolve => { release = resolve; });
  let stopped = false;
  writer.query = ((...args: unknown[]) => {
    const statement = typeof args[0] === "string" ? args[0] :
      args[0] && typeof args[0] === "object" && "text" in args[0] ? String(args[0].text) : "";
    if (!stopped && /^commit$/i.test(statement.trim())) {
      stopped = true; entered();
      return resumeCommit.then(() => Reflect.apply(original, writer, args));
    }
    return Reflect.apply(original, writer, args);
  }) as typeof writer.query;
  return { paused, resume: release, restore: () => { writer.query = original; } };
}

beforeAll(async () => {
  await fixture.connect();
  await fixture.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const file of (await readdir("drizzle")).filter(n => /^\d{4}_.+\.sql$/.test(n)).sort()) {
    await fixture.query((await readFile("drizzle/" + file, "utf8")).replaceAll('"public".', '"' + schema + '".'));
  }
  for (const id of [reporter, author, reviewer]) await person(id);
  await forum.createCategory({ id: "n2-category", name: "N2 complaints" });
  await forum.createSection({ id: "n2-section", categoryId: "n2-category", name: "N2 section" });
});
afterAll(async () => {
  await fixture.query("drop schema if exists " + schema + " cascade"); await fixture.end();
});

describe("SA04-N2 native Complaint manager actor admission", () => {
  it("active priority/settings/activity/note/decision remain operational, including replay and lease end", async () => {
    const caseId = await caseFixture();
    const before = await repo().readPrioritySettings();
    await repo().savePrioritySettings(reviewer, { expectedVersion: before.version,
      weights: { ...DEFAULT_COMPLAINT_REASON_PRIORITY } });
    expect((await repo().readPrioritySettings()).version).toBe(before.version + 1);
    const priority = { caseId, expectedVersion: await version(caseId), priority: 2, operationId: uuid() };
    await repo().changePriority(reviewer, priority);
    const afterPriority = await retained();
    await repo().changePriority(reviewer, priority);
    expect(await retained()).toEqual(afterPriority);
    await repo().activity(reviewer, caseId, true);
    await repo().activity(reviewer, caseId, true);
    await repo().activity(reviewer, caseId, false);
    const note = { caseId, operationId: uuid(), body: "N2 retained note" };
    const noteId = await repo().addNote(reviewer, note);
    expect(await repo().addNote(reviewer, note)).toBe(noteId);
    const decision = { caseId, operationId: uuid(), expectedVersion: await version(caseId),
      outcome: "not-confirmed" as const, reasoning: "N2 decision" };
    const decisionId = await repo().decide(reviewer, decision);
    expect(await repo().decide(reviewer, decision)).toBe(decisionId);
    // Existing contract permits post-resolution notes.
    expect(await repo().addNote(reviewer, { caseId, operationId: uuid(), body: "After resolve" })).toBeTruthy();
  }, 30000);

  it("inactive and missing manager reject all five N2 paths without changing retained facts", async () => {
    const caseId = await caseFixture(), inactive = "n2-inactive-" + uuid();
    await person(inactive);
    const settings = await repo().readPrioritySettings();
    const note = { caseId, operationId: uuid(), body: "Denied note" };
    const decision = { caseId, operationId: uuid(), expectedVersion: await version(caseId),
      outcome: "not-confirmed" as const, reasoning: "Denied decision" };
    const priority = { caseId, operationId: uuid(), expectedVersion: await version(caseId), priority: 3 };
    await deactivate(inactive);
    const before = await retained();
    for (const actor of [inactive, "n2-missing-" + uuid()]) {
      const error = actor === inactive ? AccountInactiveError : AccountMissingError;
      await expect(repo().savePrioritySettings(actor, { expectedVersion: settings.version,
        weights: { ...DEFAULT_COMPLAINT_REASON_PRIORITY } })).rejects.toBeInstanceOf(error);
      await expect(repo().changePriority(actor, priority)).rejects.toBeInstanceOf(error);
      await expect(repo().activity(actor, caseId, true)).rejects.toBeInstanceOf(error);
      await expect(repo().activity(actor, caseId, false)).rejects.toBeInstanceOf(error);
      await expect(repo().addNote(actor, note)).rejects.toBeInstanceOf(error);
      await expect(repo().decide(actor, decision)).rejects.toBeInstanceOf(error);
      expect(await retained()).toEqual(before);
    }
  }, 35000);

  it("inactive replay of previously committed priority/note/decision cannot return success", async () => {
    const caseId = await caseFixture(), actor = "n2-replay-" + uuid();
    await person(actor);
    const priority = { caseId, operationId: uuid(), priority: 3, expectedVersion: await version(caseId) };
    await repo().changePriority(actor, priority);
    const note = { caseId, operationId: uuid(), body: "Replay before deactivation" };
    await repo().addNote(actor, note);
    const decision = { caseId, operationId: uuid(), expectedVersion: await version(caseId),
      outcome: "not-confirmed" as const, reasoning: "Replay decision" };
    await repo().decide(actor, decision);
    await deactivate(actor);
    const before = await retained();
    await expect(repo().changePriority(actor, priority)).rejects.toBeInstanceOf(AccountInactiveError);
    await expect(repo().addNote(actor, note)).rejects.toBeInstanceOf(AccountInactiveError);
    await expect(repo().decide(actor, decision)).rejects.toBeInstanceOf(AccountInactiveError);
    expect(await retained()).toEqual(before);
  }, 30000);

  it("writer-first priority settings holds actor lock through COMMIT; deactivation then rejects repeat", async () => {
    const actor = "n2-writer-first-" + uuid(); await person(actor);
    const before = await repo().readPrioritySettings();
    const writer = await newClient(), state = await newClient();
    const original = writer.query;
    let resume!: () => void, observed!: () => void;
    const paused = new Promise<void>(resolve => { observed = resolve; });
    const released = new Promise<void>(resolve => { resume = resolve; });
    let intercepted = false;
    writer.query = ((...args: unknown[]) => {
      const stmt = typeof args[0] === "string" ? args[0] :
        args[0] && typeof args[0] === "object" && "text" in args[0]
          ? String(args[0].text) : "";
      if (!intercepted && /^commit$/i.test(stmt.trim())) {
        intercepted = true; observed();
        return released.then(() => Reflect.apply(original, writer, args));
      }
      return Reflect.apply(original, writer, args);
    }) as typeof writer.query;
    let pending: ReturnType<DrizzleComplaintsRepository["savePrioritySettings"]> | undefined;
    try {
      pending = repo(writer).savePrioritySettings(actor, {
        expectedVersion: before.version, weights: { ...DEFAULT_COMPLAINT_REASON_PRIORITY },
      });
      await paused;
      await state.query("begin");
      try {
        await state.query("set local lock_timeout='180ms'");
        await expect(state.query('update "user" set deactivated_at=now(),deactivated_by_user_id=$1,'
          + "retain_at_least_until=now()+interval '2 years' where id=$1", [actor]))
          .rejects.toMatchObject({ code: "55P03" });
      } finally { await state.query("rollback"); }
      resume();
      await pending;
      const committed = await repo().readPrioritySettings();
      expect(committed.version).toBe(before.version + 1);
      await deactivate(actor);
      await expect(repo().savePrioritySettings(actor, {
        expectedVersion: committed.version, weights: { ...DEFAULT_COMPLAINT_REASON_PRIORITY },
      })).rejects.toBeInstanceOf(AccountInactiveError);
      expect(await repo().readPrioritySettings()).toEqual(committed);
    } finally {
      resume();
      writer.query = original;
      if (pending) await Promise.allSettled([pending]);
      await state.query("rollback").catch(() => undefined);
      await Promise.all([writer.end(), state.end()]);
    }
  }, 35000);

  it("state-first priority-settings transaction blocks at actor and denies after state COMMIT", async () => {
    const actor = "n2-state-first-" + uuid(); await person(actor);
    const settings = await repo().readPrioritySettings();
    const writer = await newClient(), state = await newClient();
    try {
      const pid = (await writer.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]!.pid;
      const blocker = (await state.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]!.pid;
      await state.query("begin");
      await state.query('update "user" set deactivated_at=now(),deactivated_by_user_id=$1,'
        + "retain_at_least_until=now()+interval '2 years' where id=$1", [actor]);
      const pending = repo(writer).savePrioritySettings(actor, { expectedVersion: settings.version,
        weights: { ...DEFAULT_COMPLAINT_REASON_PRIORITY } });
      // The writer may reject before the COMMIT client's acknowledgement arrives.
      // Attach a handler now; the exact rejection assertion below remains required.
      void pending.catch(() => undefined);
      try {
        let blocked = false;
        for (let i = 0; i < 200; i++) {
          const result = await fixture.query<{ pids: number[] }>("select pg_blocking_pids($1) as pids", [pid]);
          if (result.rows[0]?.pids.includes(blocker)) { blocked = true; break; }
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        expect(blocked).toBe(true);
      } finally { await state.query("commit"); }
      await expect(pending).rejects.toBeInstanceOf(AccountInactiveError);
      expect(await repo().readPrioritySettings()).toEqual(settings);
    } finally {
      await state.query("rollback").catch(() => undefined);
      await Promise.all([writer.end(), state.end()]);
    }
  }, 35000);

  it.each(["priority", "activity-start", "activity-end", "note", "decision"] as const)(
    "N4.2 state-first %s: waits on real actor lock and denies with zero Complaint effects",
    async kind => {
      const actor = "n2-n42-state-" + uuid();
      await person(actor);
      const caseId = await caseFixture(), expected = await version(caseId), operationId = uuid();
      if (kind === "activity-end") await repo().activity(actor, caseId, true);
      const before = await retained(), writer = await newClient(), state = await newClient();
      const writerPid = (await writer.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]!.pid;
      const statePid = (await state.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]!.pid;
      let pending: ReturnType<typeof executeN2> | undefined;
      try {
        await state.query("begin");
        await state.query('update "user" set deactivated_at=now(),deactivated_by_user_id=$1,'
          + "retain_at_least_until=now()+interval '2 years' where id=$1", [actor]);
        pending = executeN2(kind, actor, caseId, expected, operationId, writer);
        // Match the other state-first tests: expected denial may precede COMMIT ACK.
        // Keep the original exact rejection and physical-state checks below.
        void pending.catch(() => undefined);
        try { await observeBlock(writerPid, statePid); }
        finally { await state.query("commit"); }
        await expect(pending).rejects.toBeInstanceOf(AccountInactiveError);
        expect(await retained()).toEqual(before);
      } finally {
        await state.query("rollback").catch(() => undefined);
        if (pending) await Promise.allSettled([pending]);
        await Promise.all([writer.end(), state.end()]);
      }
    }, 35_000,
  );

  it.each(["priority", "activity-start", "activity-end", "note", "decision"] as const)(
    "N4.2 writer-first %s: actor guard survives all durable writes through COMMIT",
    async kind => {
      const actor = "n2-n42-writer-" + uuid();
      await person(actor);
      const caseId = await caseFixture(), expected = await version(caseId), operationId = uuid();
      if (kind === "activity-end") await repo().activity(actor, caseId, true);
      const writer = await newClient(), state = await newClient();
      const barrier = pauseBeforeCommit(writer);
      let pending: ReturnType<typeof executeN2> | undefined;
      try {
        pending = executeN2(kind, actor, caseId, expected, operationId, writer);
        await barrier.paused;
        await state.query("begin");
        try {
          await state.query("set local lock_timeout='180ms'");
          await expect(state.query('update "user" set deactivated_at=now(),'
            + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years'"
            + " where id=$1", [actor])).rejects.toMatchObject({ code: "55P03" });
        } finally { await state.query("rollback"); }
        barrier.resume();
        await pending;
        const committed = await retained();
        await deactivate(actor);
        await expect(executeN2(kind, actor, caseId, expected, operationId, fixture))
          .rejects.toBeInstanceOf(AccountInactiveError);
        expect(await retained()).toEqual(committed);
      } finally {
        barrier.resume(); barrier.restore();
        if (pending) await Promise.allSettled([pending]);
        await state.query("rollback").catch(() => undefined);
        await Promise.all([writer.end(), state.end()]);
      }
    }, 35_000,
  );
});
