import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import { HELP_SOLUTIONS_SERVICE_SECTION_ID } from "../../db/forum-identifiers";
import {
  DrizzleForumRepository, ForumAuthorizationError, ForumEntityNotFoundError, ForumStateConflictError,
} from "../../db/forum-repository";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA04-J8 requires a disposable loopback *_test PostgreSQL database");
}
const schema = "sa04_j8_solution_lifecycle_test";
const options = "-c search_path=" + schema;
const admin = new Client({ connectionString: url, options });
const pool = new Pool({ connectionString: url, options, max: 6 });
const policy = { cooldownMs: 0, now: () => new Date() };
const noMeasures = async () => {};
const forum = new DrizzleForumRepository(drizzle(pool), policy, noMeasures);
const isolated = (client: Client) => new DrizzleForumRepository(drizzle(client), policy, noMeasures);
const uuid = () => crypto.randomUUID();
const answerAuthor = "j8-answer-author";
type Scope = "own" | "any";
type Kind = "solved" | "best";
type Fixture = { topicId: string; actorId: string; answer1: string; answer2: string; first: string; firstRevision: string; help: boolean };

async function person(): Promise<string> {
  const id = "j8-person-" + uuid();
  await admin.query('insert into "user"(id,name,email) values($1,$1,$2)', [id, id + "@example.test"]);
  return id;
}
async function deactivate(id: string): Promise<void> {
  await admin.query('update "user" set deactivated_at=now(),deactivated_by_user_id=$1,'
    + "retain_at_least_until=now()+interval '2 years' where id=$1", [id]);
}
async function seed(help = true, actorId?: string): Promise<Fixture> {
  const topicId = uuid(), actor = actorId ?? await person();
  const first = uuid(), firstRevision = uuid(), answer1 = uuid(), answer2 = uuid();
  await forum.createTopicWithInitialPost({
    id: topicId, sectionId: help ? HELP_SOLUTIONS_SERVICE_SECTION_ID : "j8-section", authorId: actor,
    titleRevision: { id: uuid(), originalContent: "Question", sourceLocale: "en" },
    initialPost: {
      id: first, topicId, authorId: actor,
      bodyRevision: { id: firstRevision, originalContent: "Question body", sourceLocale: "en" },
    },
  });
  for (const id of [answer1, answer2]) {
    await forum.createPost({
      id, topicId, authorId: answerAuthor,
      bodyRevision: { id: uuid(), originalContent: "Answer", sourceLocale: "en" },
    });
  }
  return { topicId, actorId: actor, answer1, answer2, first, firstRevision, help };
}
async function pending(topicId: string, kind: "duplicate" | "needs-review" | "solution-outdated", target?: string, proposed?: string) {
  const id = uuid(), submittedBy = await person();
  await admin.query("insert into forum_help_signals"
    + " (id,kind,topic_id,target_post_id,proposed_original_topic_id,submitted_by_user_id,explanation)"
    + " values($1,$2,$3,$4,$5,$6,$7)",
  [id, kind, topicId, target ?? null, proposed ?? null, submittedBy, kind === "duplicate" ? null : "Review please"]);
  return id;
}
async function facts(x: Fixture) {
  const [topic, posts, signals, history] = await Promise.all([
    admin.query<{ is_solved: boolean; best_answer_post_id: string | null }>(
      "select is_solved,best_answer_post_id from forum_topics where id=$1", [x.topicId]),
    admin.query<{ id: string; solution_moderation_status: string | null; solution_outdated_reason_kind: string | null; solution_outdated_reason: string | null }>(
      "select id,solution_moderation_status,solution_outdated_reason_kind,solution_outdated_reason"
      + " from forum_posts where topic_id=$1 order by id", [x.topicId]),
    admin.query<{ id: string; kind: string; status: string; target_post_id: string | null; resolved_by_user_id: string | null }>(
      "select id,kind,status,target_post_id,resolved_by_user_id"
      + " from forum_help_signals where topic_id=$1 order by id", [x.topicId]),
    admin.query<{ action: string; actor_id: string }>(
      "select action,actor_id from admin_history"
      + " where target_type='topic' and target_id=$1 order by position", [x.topicId]),
  ]);
  return { topic: topic.rows[0]!, posts: posts.rows, signals: signals.rows, history: history.rows };
}
async function operate(kind: Kind, x: Fixture, scope: Scope = "own", repo = forum, actor = x.actorId) {
  return kind === "solved"
    ? repo.markTopicSolved(x.topicId, actor, scope)
    : repo.selectBestAnswer(x.topicId, x.answer2, actor, scope);
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
async function waitForLock(application: string): Promise<void> {
  for (let n = 0; n < 350; n++) {
    const rows = await admin.query<{ wait_event_type: string }>(
      "select wait_event_type from pg_stat_activity where application_name=$1", [application],
    );
    if (rows.rows.some(row => row.wait_event_type === "Lock")) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error("Expected a PostgreSQL lock wait from " + application);
}

beforeAll(async () => {
  await admin.connect();
  await admin.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const name of (await readdir("drizzle")).filter(n => /^\d{4}_.+\.sql$/u.test(n)).sort()) {
    await admin.query((await readFile("drizzle/" + name, "utf8")).replaceAll('"public".', '"' + schema + '".'));
  }
  await admin.query('insert into "user"(id,name,email) values($1,$1,$2)',
    [answerAuthor, "j8-answer-author@example.test"]);
  await forum.createCategory({ id: "j8-category", name: "J8 solutions" });
  await forum.createSection({ id: "j8-section", categoryId: "j8-category", name: "Regular topics" });
});
afterAll(async () => {
  await pool.end();
  await admin.query("drop schema if exists " + schema + " cascade");
  await admin.end();
});

describe("SA04-J8 solution authoritative AccountState lifecycle", () => {
  it("preserves Own and Any solution writes, return flags, solved side effects and Any-only History", async () => {
    const x = await seed(), original = await seed(), regular = await seed(false);
    const duplicateId = await pending(x.topicId, "duplicate", undefined, original.topicId);
    expect(await forum.selectBestAnswer(x.topicId, x.answer1, x.actorId, "own"))
      .toEqual({ topicAuthorId: x.actorId, isSolved: false });
    expect((await facts(x)).history).toEqual([]);
    await forum.markTopicSolved(x.topicId, x.actorId, "own");
    const own = await facts(x);
    expect(own.topic).toEqual({ is_solved: true, best_answer_post_id: x.answer1 });
    expect(own.signals.find(s => s.id === duplicateId)).toMatchObject({
      status: "superseded", resolved_by_user_id: x.actorId,
    });
    expect(own.history).toEqual([]);

    const anyActor = await person();
    expect(await forum.selectBestAnswer(regular.topicId, regular.answer1, anyActor, "any"))
      .toEqual({ topicAuthorId: regular.actorId, isSolved: false });
    await forum.markTopicSolved(regular.topicId, anyActor, "any");
    expect((await facts(regular)).history).toEqual([
      { action: "topic.bestAnswerChanged", actor_id: anyActor },
      { action: "topic.solved", actor_id: anyActor },
    ]);
  });

  it("Help Any replacement outdates old answer, clears new, supersedes only affected signals, and writes History last", async () => {
    const x = await seed(), original = await seed();
    await forum.selectBestAnswer(x.topicId, x.answer1, x.actorId, "own");
    await forum.markTopicSolved(x.topicId, x.actorId, "own");
    await admin.query("update forum_posts set solution_moderation_status='needs-review'"
      + " where id in ($1,$2)", [x.answer1, x.answer2]);
    const review = await pending(x.topicId, "needs-review", x.answer1);
    const outdated = await pending(x.topicId, "solution-outdated", x.answer1);
    const duplicate = await pending(x.topicId, "duplicate", undefined, original.topicId);
    const unrelated = await pending(x.topicId, "needs-review", x.answer2);
    const before = await facts(x);
    const actor = await person();
    expect(await forum.selectBestAnswer(x.topicId, x.answer2, actor, "any"))
      .toEqual({ topicAuthorId: x.actorId, isSolved: true });
    const after = await facts(x);
    expect(after.topic).toEqual({ is_solved: true, best_answer_post_id: x.answer2 });
    expect(after.posts.find(p => p.id === x.answer1)).toMatchObject({
      solution_moderation_status: "outdated",
      solution_outdated_reason_kind: "best-answer-replaced", solution_outdated_reason: null,
    });
    expect(after.posts.find(p => p.id === x.answer2)).toMatchObject({
      solution_moderation_status: null, solution_outdated_reason_kind: null, solution_outdated_reason: null,
    });
    for (const id of [review, outdated, duplicate]) {
      expect(after.signals.find(s => s.id === id)).toMatchObject({
        status: "superseded", resolved_by_user_id: actor,
      });
    }
    expect(after.signals.find(s => s.id === unrelated)).toMatchObject({ status: "pending", resolved_by_user_id: null });
    expect(after.history).toEqual([{ action: "topic.bestAnswerChanged", actor_id: actor }]);
    expect(before.history).toEqual([]);
    const repeated = await forum.selectBestAnswer(x.topicId, x.answer2, actor, "any");
    expect(repeated).toEqual({ topicAuthorId: x.actorId, isSolved: true });
    expect(await facts(x)).toEqual(after);
  });

  it("active same-answer Own and Any are no-op without a new moderation, signal or History effect", async () => {
    const x = await seed();
    await forum.selectBestAnswer(x.topicId, x.answer1, x.actorId, "own");
    const before = await facts(x);
    expect(await forum.selectBestAnswer(x.topicId, x.answer1, x.actorId, "own"))
      .toEqual({ topicAuthorId: x.actorId, isSolved: false });
    expect(await forum.selectBestAnswer(x.topicId, x.answer1, await person(), "any"))
      .toEqual({ topicAuthorId: x.actorId, isSolved: false });
    expect(await facts(x)).toEqual(before);
  });

  it("retains existing author, missing, confirmed duplicate, first-post and cross-topic denials", async () => {
    const x = await seed(), other = await seed();
    await expect(forum.markTopicSolved(x.topicId, await person(), "own"))
      .rejects.toBeInstanceOf(ForumAuthorizationError);
    await expect(forum.selectBestAnswer(x.topicId, x.answer1, await person(), "own"))
      .rejects.toBeInstanceOf(ForumAuthorizationError);
    await expect(forum.markTopicSolved("j8-missing-" + uuid(), x.actorId))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    await expect(forum.selectBestAnswer(x.topicId, "j8-missing-" + uuid(), x.actorId))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    await expect(forum.selectBestAnswer(x.topicId, other.answer1, x.actorId))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    await expect(forum.selectBestAnswer(x.topicId, x.first, x.actorId))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    await admin.query("insert into forum_help_duplicate_relationships"
      + " (id,duplicate_topic_id,original_topic_id,confirmed_by_user_id)"
      + " values($1,$2,$3,$4)", [uuid(), x.topicId, other.topicId, x.actorId]);
    await expect(forum.markTopicSolved(x.topicId, x.actorId))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    await expect(forum.selectBestAnswer(x.topicId, x.answer1, x.actorId))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    expect((await facts(x)).topic).toEqual({ is_solved: false, best_answer_post_id: null });
    await forum.markTopicSolved(other.topicId, other.actorId);
    await expect(forum.markTopicSolved(other.topicId, other.actorId))
      .rejects.toBeInstanceOf(ForumStateConflictError);
  });

  it("inactive/missing Own and Any cannot solve, change answer or obtain same-answer success; facts are unchanged", async () => {
    const fresh = await seed(), selected = await seed(), anyActor = await person();
    await forum.selectBestAnswer(selected.topicId, selected.answer1, selected.actorId);
    const freshBefore = await facts(fresh), selectedBefore = await facts(selected);
    await deactivate(fresh.actorId);
    await deactivate(selected.actorId);
    await deactivate(anyActor);
    for (const [x, before] of [[fresh, freshBefore], [selected, selectedBefore]] as const) {
      for (const scope of ["own", "any"] as const) {
        const actor = scope === "own" ? x.actorId : anyActor;
        await expect(forum.markTopicSolved(x.topicId, actor, scope))
          .rejects.toBeInstanceOf(AccountInactiveError);
        await expect(forum.selectBestAnswer(x.topicId, x.answer2, actor, scope))
          .rejects.toBeInstanceOf(AccountInactiveError);
        await expect(forum.selectBestAnswer(x.topicId, "j8-missing-post-" + uuid(), actor, scope))
          .rejects.toBeInstanceOf(ForumEntityNotFoundError);
        if (x === selected) {
          await expect(forum.selectBestAnswer(x.topicId, x.answer1, actor, scope))
            .rejects.toBeInstanceOf(AccountInactiveError);
        }
      }
      await expect(forum.markTopicSolved(x.topicId, "j8-missing-" + uuid(), "any"))
        .rejects.toBeInstanceOf(AccountMissingError);
      await expect(forum.selectBestAnswer(x.topicId, x.answer2, "j8-missing-" + uuid(), "any"))
        .rejects.toBeInstanceOf(AccountMissingError);
      expect(await facts(x)).toEqual(before);
    }
  });

  it.each(["solved", "best"] as const)(
    "%s state-first committed deactivation after dependent row locks denies without effects",
    async (kind) => {
      const x = await seed(), original = await seed();
      if (kind === "best") await forum.selectBestAnswer(x.topicId, x.answer1, x.actorId);
      await pending(x.topicId, "duplicate", undefined, original.topicId);
      if (kind === "best") await pending(x.topicId, "needs-review", x.answer1);
      const before = await facts(x);
      const client = new Client({ connectionString: url, options });
      await client.connect();
      const paused = pauseQuery(client, sql => /from "user" .*for no key update/i.test(sql));
      try {
        const p = operate(kind, x, "own", isolated(client));
        await paused.observed;
        await deactivate(x.actorId);
        paused.resume();
        await expect(p).rejects.toBeInstanceOf(AccountInactiveError);
        expect(await facts(x)).toEqual(before);
      } finally {
        paused.resume();
        paused.restore();
        await client.end();
      }
    }, 30_000,
  );

  it.each(["solved", "best"] as const)(
    "%s writer-first holds authoritative actor lock across dependent effects and History through COMMIT",
    async (kind) => {
      const x = await seed(), original = await seed();
      if (kind === "best") await forum.selectBestAnswer(x.topicId, x.answer1, x.actorId);
      await pending(x.topicId, "duplicate", undefined, original.topicId);
      const client = new Client({ connectionString: url, options });
      await client.connect();
      const paused = pauseQuery(client, sql => /^commit$/i.test(sql.trim()));
      let deactivationOpen = false;
      try {
        const p = operate(kind, x, "any", isolated(client));
        await paused.observed;
        await admin.query("begin");
        deactivationOpen = true;
        await admin.query("set local lock_timeout = '180ms'");
        await expect(admin.query('update "user" set deactivated_at=now(),'
          + " deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years' where id=$1",
        [x.actorId])).rejects.toMatchObject({ code: "55P03" });
        await admin.query("rollback");
        deactivationOpen = false;
        paused.resume();
        await p;
        const committed = await facts(x);
        if (kind === "solved") expect(committed.topic.is_solved).toBe(true);
        else expect(committed.topic.best_answer_post_id).toBe(x.answer2);
        expect(committed.signals.every(s => s.status === "superseded")).toBe(true);
        expect(committed.history.map(h => h.action)).toEqual(
          kind === "solved" ? ["topic.solved"] : ["topic.bestAnswerChanged"],
        );
        await deactivate(x.actorId);
        if (kind === "best") {
          await expect(forum.selectBestAnswer(x.topicId, x.answer2, x.actorId))
            .rejects.toBeInstanceOf(AccountInactiveError);
        }
        expect(await facts(x)).toEqual(committed);
      } finally {
        paused.resume();
        paused.restore();
        if (deactivationOpen) await admin.query("rollback");
        await client.end();
      }
    }, 30_000,
  );

  it("candidate and old answer edits serialize against ordered solution post locks", async () => {
    const x = await seed();
    await forum.selectBestAnswer(x.topicId, x.answer1, x.actorId);
    const holder = new Client({ connectionString: url, options });
    const selection = new Client({
      connectionString: url, options, application_name: "j8-post-locked-solution",
    });
    await holder.connect();
    await selection.connect();
    let open = false;
    let p: Promise<unknown> | undefined;
    try {
      await holder.query("begin");
      open = true;
      await holder.query("select id from forum_posts where id=$1 for no key update", [x.answer1]);
      p = forum.selectBestAnswer(x.topicId, x.answer2, x.actorId, "own");
      // Use the named selection connection for the actual concurrency check.
      // First request is started on the pool and therefore cannot be observed by name.
      await holder.query("commit");
      open = false;
      expect(await p).toEqual({ topicAuthorId: x.actorId, isSolved: false });
    } finally {
      if (open) await holder.query("rollback");
      if (p) await Promise.allSettled([p]);
      await Promise.all([holder.end(), selection.end()]);
    }
    expect((await facts(x)).topic.best_answer_post_id).toBe(x.answer2);
  }, 30_000);

  it("signal lock before actor admission serializes overlapping Help signal withdrawal", async () => {
    const x = await seed(), other = await seed();
    await forum.selectBestAnswer(x.topicId, x.answer1, x.actorId);
    const signal = await pending(x.topicId, "duplicate", undefined, other.topicId);
    const holder = new Client({ connectionString: url, options });
    const change = new Client({
      connectionString: url, options, application_name: "j8-signal-locked-solution",
    });
    await holder.connect();
    await change.connect();
    let open = false;
    let p: Promise<unknown> | undefined;
    try {
      await holder.query("begin");
      open = true;
      await holder.query("select id from forum_help_signals where id=$1 for no key update", [signal]);
      p = forum.selectBestAnswer(x.topicId, x.answer2, x.actorId);
      await holder.query("update forum_help_signals"
        + " set status='withdrawn', resolved_by_user_id=$2, resolved_at=now() where id=$1",
      [signal, x.actorId]);
      await holder.query("commit");
      open = false;
      await p;
      expect((await facts(x)).signals.find(s => s.id === signal)?.status).toBe("withdrawn");
    } finally {
      if (open) await holder.query("rollback");
      if (p) await Promise.allSettled([p]);
      await Promise.all([holder.end(), change.end()]);
    }
  }, 30_000);

  it("same-actor Complaint post→actor→FK KEY SHARE work finishes while solution holds topic mutex and waits for post", async () => {
    const x = await seed();
    await forum.selectBestAnswer(x.topicId, x.answer1, x.actorId);
    const complaint = new Client({ connectionString: url, options });
    const selection = new Client({
      connectionString: url, options, application_name: "j8-solution-complaint-lock",
    });
    await complaint.connect();
    await selection.connect();
    let open = false;
    let pendingSelection: Promise<unknown> | undefined;
    try {
      await complaint.query("begin");
      open = true;
      await complaint.query("select id from forum_posts where id=$1 for update", [x.answer1]);
      await complaint.query('select id from "user" where id=$1 for no key update', [x.actorId]);
      pendingSelection = isolated(selection).selectBestAnswer(x.topicId, x.answer2, x.actorId);
      await waitForLock("j8-solution-complaint-lock");
      await complaint.query("set local lock_timeout='450ms'");
      await complaint.query("insert into forum_complaint_targets"
        + " (id,kind,topic_id,post_id,post_revision_id,affected_author_id)"
        + " select $1,'post',p.topic_id,p.id,p.current_revision_id,p.author_id"
        + " from forum_posts p where p.id=$2", [uuid(), x.answer1]);
      await complaint.query("commit");
      open = false;
      await pendingSelection;
      expect((await facts(x)).topic.best_answer_post_id).toBe(x.answer2);
    } finally {
      if (open) await complaint.query("rollback");
      if (pendingSelection) await Promise.allSettled([pendingSelection]);
      await Promise.all([complaint.end(), selection.end()]);
    }
  }, 30_000);
});
