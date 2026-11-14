import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import { HELP_SOLUTIONS_SERVICE_SECTION_ID } from "../../db/forum-identifiers";
import { DrizzleForumRepository, ForumEntityNotFoundError, ForumStateConflictError } from "../../db/forum-repository";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA04-J10 requires a disposable loopback *_test PostgreSQL database");
}
const schema = "sa04_j10_help_moderation_test";
const options = "-c search_path=" + schema;
const admin = new Client({ connectionString: url, options });
const pool = new Pool({ connectionString: url, options, max: 6 });
const policy = { cooldownMs: 0, now: () => new Date() };
const noMeasures = async () => {};
const forum = new DrizzleForumRepository(drizzle(pool), policy, noMeasures);
const isolated = (client: Client) => new DrizzleForumRepository(drizzle(client), policy, noMeasures);
const uuid = () => crypto.randomUUID();
const answerAuthor = "j10-answer-author";
type Status = "needs-review" | "outdated" | null;
type Fixture = { topicId: string; authorId: string; answerId: string; managerId: string };
async function person(): Promise<string> {
  const id = "j10-" + uuid();
  await admin.query('insert into "user"(id,name,email) values($1,$1,$2)', [id, id + "@example.test"]);
  return id;
}
async function deactivate(id: string): Promise<void> {
  await admin.query('update "user" set deactivated_at=now(),deactivated_by_user_id=$1,'
    + "retain_at_least_until=now()+interval '2 years' where id=$1", [id]);
}
async function question(solved = true): Promise<Fixture> {
  const topicId = uuid(), authorId = await person(), managerId = await person(), answerId = uuid();
  await forum.createTopicWithInitialPost({
    id: topicId, sectionId: HELP_SOLUTIONS_SERVICE_SECTION_ID, authorId,
    titleRevision: { id: uuid(), originalContent: "Help question", sourceLocale: "en" },
    initialPost: {
      id: uuid(), topicId, authorId,
      bodyRevision: { id: uuid(), originalContent: "Question", sourceLocale: "en" },
    },
  });
  await forum.createPost({
    id: answerId, topicId, authorId: answerAuthor,
    bodyRevision: { id: uuid(), originalContent: "Answer", sourceLocale: "en" },
  });
  if (solved) {
    await forum.selectBestAnswer(topicId, answerId, authorId, "own");
    await forum.markTopicSolved(topicId, authorId, "own");
  }
  return { topicId, authorId, answerId, managerId };
}
async function pending(x: Fixture, kind: "needs-review" | "solution-outdated", target = x.answerId): Promise<string> {
  const id = uuid(), submittedBy = await person();
  await admin.query("insert into forum_help_signals"
    + " (id,kind,topic_id,target_post_id,submitted_by_user_id,explanation)"
    + " values($1,$2,$3,$4,$5,$6)",
  [id, kind, x.topicId, target, submittedBy, "Review requested"]);
  return id;
}
async function facts(x: Fixture) {
  const [topic, posts, signals, history] = await Promise.all([
    admin.query("select is_solved,best_answer_post_id from forum_topics where id=$1", [x.topicId]),
    admin.query("select id,solution_moderation_status,solution_outdated_reason,solution_outdated_reason_kind"
      + " from forum_posts where topic_id=$1 order by id", [x.topicId]),
    admin.query("select id,kind,status,resolved_by_user_id from forum_help_signals where topic_id=$1 order by id", [x.topicId]),
    admin.query("select action,actor_id,reason,context from admin_history"
      + " where target_type='topic' and target_id=$1 order by position", [x.topicId]),
  ]);
  return { topic: topic.rows[0], posts: posts.rows, signals: signals.rows, history: history.rows };
}
function state(f: Awaited<ReturnType<typeof facts>>, id: string) {
  return f.signals.find(s => s.id === id);
}
function moderate(x: Fixture, status: Status, reason: string | null = null, repo = forum, actor = x.managerId) {
  return repo.setHelpSolutionModeration(x.topicId, status, reason, actor, x.answerId);
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
    [answerAuthor, "j10-answer-author@example.test"]);
});
afterAll(async () => {
  await pool.end();
  await admin.query("drop schema if exists " + schema + " cascade");
  await admin.end();
});

describe("SA04-J10 Help solution moderation authoritative AccountState", () => {
  it("preserves needs-review/outdated/clear, exact pending supersession and transition-only History", async () => {
    const x = await question();
    const review = await pending(x, "needs-review");
    const outdated = await pending(x, "solution-outdated");
    await moderate(x, "needs-review");
    let current = await facts(x);
    expect(current.posts.find(p => p.id === x.answerId)).toMatchObject({
      solution_moderation_status: "needs-review", solution_outdated_reason: null,
    });
    expect(state(current, review)).toMatchObject({ status: "superseded", resolved_by_user_id: x.managerId });
    expect(state(current, outdated)).toMatchObject({ status: "pending" });
    expect(current.history).toHaveLength(1);
    await moderate(x, "needs-review");
    expect((await facts(x)).history).toHaveLength(1);

    await moderate(x, "outdated", "Version obsolete");
    current = await facts(x);
    expect(current.posts.find(p => p.id === x.answerId)).toMatchObject({
      solution_moderation_status: "outdated", solution_outdated_reason: "Version obsolete",
      solution_outdated_reason_kind: null,
    });
    expect(state(current, outdated)).toMatchObject({ status: "superseded", resolved_by_user_id: x.managerId });
    expect(current.history).toHaveLength(2);
    expect(current.history[1]).toMatchObject({
      action: "help.solutionModerationChanged", actor_id: x.managerId, reason: "Version obsolete",
    });
    await moderate(x, "outdated", "Version obsolete");
    expect((await facts(x)).history).toHaveLength(2);
    await moderate(x, null);
    current = await facts(x);
    expect(current.posts.find(p => p.id === x.answerId)).toMatchObject({
      solution_moderation_status: null, solution_outdated_reason: null, solution_outdated_reason_kind: null,
    });
    expect(current.history).toHaveLength(3);
    await moderate(x, null);
    expect((await facts(x)).history).toHaveLength(3);
  });

  it("preserves missing, unsolved and expected-answer conflict before actor admission", async () => {
    const x = await question(), unsolved = await question(false);
    await deactivate(x.managerId);
    await expect(moderate(x, "needs-review", null, forum, x.managerId))
      .rejects.toBeInstanceOf(AccountInactiveError);
    await expect(forum.setHelpSolutionModeration(x.topicId, "outdated", "Reason",
      x.managerId, "wrong-answer")).rejects.toBeInstanceOf(ForumStateConflictError);
    await expect(forum.setHelpSolutionModeration(unsolved.topicId, "needs-review", null,
      x.managerId, unsolved.answerId)).rejects.toBeInstanceOf(ForumStateConflictError);
    await expect(forum.setHelpSolutionModeration(uuid(), "needs-review", null,
      x.managerId, x.answerId)).rejects.toBeInstanceOf(ForumEntityNotFoundError);
  });

  it.each(["needs-review", "outdated", null] as const)(
    "inactive/missing actor cannot execute %s (including clear/no-change) or mutate facts",
    async (status) => {
      const x = await question();
      await pending(x, "needs-review");
      await pending(x, "solution-outdated");
      const before = await facts(x);
      await deactivate(x.managerId);
      await expect(moderate(x, status, status === "outdated" ? "Reason" : null))
        .rejects.toBeInstanceOf(AccountInactiveError);
      await expect(moderate(x, status, status === "outdated" ? "Reason" : null, forum, uuid()))
        .rejects.toBeInstanceOf(AccountMissingError);
      expect(await facts(x)).toEqual(before);
    },
  );

  it("state-first deactivation after content dependency locks denies without effects", async () => {
    const x = await question();
    await pending(x, "needs-review");
    const before = await facts(x);
    const client = new Client({ connectionString: url, options });
    await client.connect();
    const paused = pauseQuery(client, sql => /from "user" .*for no key update/i.test(sql));
    try {
      const work = moderate(x, "needs-review", null, isolated(client));
      await paused.observed;
      await deactivate(x.managerId);
      paused.resume();
      await expect(work).rejects.toBeInstanceOf(AccountInactiveError);
      expect(await facts(x)).toEqual(before);
    } finally {
      paused.resume();
      paused.restore();
      await client.end();
    }
  }, 30_000);

  it("writer-first holds actor mutex through effects, History and COMMIT", async () => {
    const x = await question();
    await pending(x, "solution-outdated");
    const client = new Client({ connectionString: url, options });
    await client.connect();
    const paused = pauseQuery(client, sql => /^commit$/i.test(sql.trim()));
    let deactivationOpen = false;
    try {
      const work = moderate(x, "outdated", "Unsafe answer", isolated(client));
      await paused.observed;
      await admin.query("begin");
      deactivationOpen = true;
      await admin.query("set local lock_timeout='180ms'");
      await expect(admin.query('update "user" set deactivated_at=now(),'
        + " deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years' where id=$1",
      [x.managerId])).rejects.toMatchObject({ code: "55P03" });
      await admin.query("rollback");
      deactivationOpen = false;
      paused.resume();
      await work;
      const committed = await facts(x);
      expect(committed.history).toHaveLength(1);
      expect(committed.signals.every(s => s.status === "superseded")).toBe(true);
      await deactivate(x.managerId);
      await expect(moderate(x, "outdated", "Unsafe answer"))
        .rejects.toBeInstanceOf(AccountInactiveError);
      expect(await facts(x)).toEqual(committed);
    } finally {
      paused.resume();
      paused.restore();
      if (deactivationOpen) await admin.query("rollback");
      await client.end();
    }
  }, 30_000);

  it("answer-post NO KEY UPDATE contention resolves before actor admission", async () => {
    const x = await question();
    const holder = new Client({ connectionString: url, options });
    const worker = new Client({ connectionString: url, options, application_name: "j10-answer-post" });
    await Promise.all([holder.connect(), worker.connect()]);
    let open = false, work: Promise<unknown> | undefined;
    try {
      await holder.query("begin");
      open = true;
      await holder.query("select id from forum_posts where id=$1 for no key update", [x.answerId]);
      work = moderate(x, "needs-review", null, isolated(worker));
      await waitForLock("j10-answer-post");
      await holder.query("commit");
      open = false;
      await work;
      expect((await facts(x)).history).toHaveLength(1);
    } finally {
      if (open) await holder.query("rollback");
      if (work) await Promise.allSettled([work]);
      await Promise.all([holder.end(), worker.end()]);
    }
  }, 30_000);

  it("affected pending signals serialize in ID order ahead of actor admission", async () => {
    const x = await question();
    const first = await pending(x, "needs-review");
    const holder = new Client({ connectionString: url, options });
    const worker = new Client({ connectionString: url, options, application_name: "j10-pending-signal" });
    await Promise.all([holder.connect(), worker.connect()]);
    let open = false, work: Promise<unknown> | undefined;
    try {
      await holder.query("begin");
      open = true;
      await holder.query("select id from forum_help_signals where id=$1 for no key update", [first]);
      work = moderate(x, "needs-review", null, isolated(worker));
      await waitForLock("j10-pending-signal");
      await holder.query("update forum_help_signals"
        + " set status='withdrawn',resolved_by_user_id=$2,resolved_at=now() where id=$1",
      [first, x.managerId]);
      await holder.query("commit");
      open = false;
      await work;
      expect(state(await facts(x), first)).toMatchObject({ status: "withdrawn" });
    } finally {
      if (open) await holder.query("rollback");
      if (work) await Promise.allSettled([work]);
      await Promise.all([holder.end(), worker.end()]);
    }
  }, 30_000);

  it("same-actor Complaint post→actor→FK KEY SHARE completes during J10 topic→post wait", async () => {
    const x = await question();
    const complaint = new Client({ connectionString: url, options });
    const moderation = new Client({ connectionString: url, options, application_name: "j10-complaint-compat" });
    await Promise.all([complaint.connect(), moderation.connect()]);
    let open = false, work: Promise<unknown> | undefined;
    try {
      await complaint.query("begin");
      open = true;
      await complaint.query("select id from forum_posts where id=$1 for update", [x.answerId]);
      await complaint.query('select id from "user" where id=$1 for no key update', [x.managerId]);
      work = moderate(x, "needs-review", null, isolated(moderation));
      await waitForLock("j10-complaint-compat");
      await complaint.query("set local lock_timeout='450ms'");
      await complaint.query("insert into forum_complaint_targets"
        + " (id,kind,topic_id,post_id,post_revision_id,affected_author_id)"
        + " select $1,'post',p.topic_id,p.id,p.current_revision_id,p.author_id"
        + " from forum_posts p where p.id=$2", [uuid(), x.answerId]);
      await complaint.query("commit");
      open = false;
      await work;
      expect((await facts(x)).history).toHaveLength(1);
    } finally {
      if (open) await complaint.query("rollback");
      if (work) await Promise.allSettled([work]);
      await Promise.all([complaint.end(), moderation.end()]);
    }
  }, 30_000);
});
