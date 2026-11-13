import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import { HELP_SOLUTIONS_SERVICE_SECTION_ID } from "../../db/forum-identifiers";
import { DrizzleForumRepository, ForumAuthorizationError, ForumEntityNotFoundError, ForumStateConflictError } from "../../db/forum-repository";
import { ForumWriteRateLimitError } from "../../db/forum-write-policy";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA04-J9 requires a disposable loopback *_test PostgreSQL database");
}
const schema = "sa04_j9_help_signals_test";
const options = "-c search_path=" + schema;
const admin = new Client({ connectionString: url, options });
const pool = new Pool({ connectionString: url, options, max: 8 });
const policy = { cooldownMs: 0, now: () => new Date() };
const noMeasures = async () => {};
const forum = new DrizzleForumRepository(drizzle(pool), policy, noMeasures);
const isolated = (client: Client) => new DrizzleForumRepository(drizzle(client), policy, noMeasures);
const uuid = () => crypto.randomUUID();
const answerAuthor = "j9-answer-author";
type Kind = "needs-details" | "needs-review" | "solution-outdated" | "duplicate";
type Shape = "submit" | "withdraw" | "rejected" | "accepted";
type Fixture = { topicId: string; authorId: string; answerId: string; otherAnswerId: string };
async function person() {
  const id = "j9-" + uuid();
  await admin.query('insert into "user"(id,name,email) values($1,$1,$2)', [id, id + "@example.test"]);
  return id;
}
async function deactivate(actorId: string) {
  await admin.query('update "user" set deactivated_at=now(),deactivated_by_user_id=$1,'
    + "retain_at_least_until=now()+interval '2 years' where id=$1", [actorId]);
}
async function question(solved = false): Promise<Fixture> {
  const topicId = uuid(), authorId = await person(), answerId = uuid(), otherAnswerId = uuid();
  await forum.createTopicWithInitialPost({
    id: topicId, sectionId: HELP_SOLUTIONS_SERVICE_SECTION_ID, authorId,
    titleRevision: { id: uuid(), originalContent: "Help question", sourceLocale: "en" },
    initialPost: {
      id: uuid(), topicId, authorId,
      bodyRevision: { id: uuid(), originalContent: "Help body", sourceLocale: "en" },
    },
  });
  for (const id of [answerId, otherAnswerId]) {
    await forum.createPost({
      id, topicId, authorId: answerAuthor,
      bodyRevision: { id: uuid(), originalContent: "Answer", sourceLocale: "en" },
    });
  }
  if (solved) {
    await forum.selectBestAnswer(topicId, answerId, authorId, "own");
    await forum.markTopicSolved(topicId, authorId, "own");
  }
  return { topicId, authorId, answerId, otherAnswerId };
}
async function pending(x: Fixture, kind: Kind, target: string | null = null, proposed: string | null = null, actor?: string) {
  const id = uuid(), submittedBy = actor ?? await person();
  await admin.query("insert into forum_help_signals"
    + " (id,kind,topic_id,target_post_id,proposed_original_topic_id,submitted_by_user_id,explanation)"
    + " values($1,$2,$3,$4,$5,$6,$7)",
  [id, kind, x.topicId, target, proposed, submittedBy, kind === "duplicate" ? null : "Needs review"]);
  return { id, submittedBy };
}
async function facts(x: Fixture) {
  const [topic, posts, signals, relations, history] = await Promise.all([
    admin.query("select is_solved,needs_details,best_answer_post_id from forum_topics where id=$1", [x.topicId]),
    admin.query("select id,solution_moderation_status,solution_outdated_reason,solution_outdated_reason_kind"
      + " from forum_posts where topic_id=$1 order by id", [x.topicId]),
    admin.query("select id,kind,topic_id,target_post_id,proposed_original_topic_id,"
      + "status,resolved_by_user_id from forum_help_signals"
      + " where topic_id=$1 or proposed_original_topic_id=$1 order by id", [x.topicId]),
    admin.query("select id,duplicate_topic_id,original_topic_id,removed_at"
      + " from forum_help_duplicate_relationships where duplicate_topic_id=$1 or original_topic_id=$1 order by id", [x.topicId]),
    admin.query("select action,actor_id,context from admin_history"
      + " where target_type='topic' and target_id=$1 order by position", [x.topicId]),
  ]);
  return { topic: topic.rows[0], posts: posts.rows, signals: signals.rows, relations: relations.rows, history: history.rows };
}
function signalState(f: Awaited<ReturnType<typeof facts>>, id: string) {
  return f.signals.find(s => s.id === id);
}
function nativeSql(v: unknown): string {
  if (typeof v === "string") return v;
  return v && typeof v === "object" && "text" in v && typeof v.text === "string" ? v.text : "";
}
function pauseQuery(client: Client, match: (sql: string) => boolean) {
  const original = client.query;
  let entered!: () => void, release!: () => void;
  const observed = new Promise<void>(resolve => { entered = resolve; });
  const permitted = new Promise<void>(resolve => { release = resolve; });
  let triggered = false;
  client.query = ((...args: unknown[]) => {
    if (!triggered && match(nativeSql(args[0]))) {
      triggered = true;
      entered();
      return permitted.then(() => Reflect.apply(original, client, args));
    }
    return Reflect.apply(original, client, args);
  }) as typeof client.query;
  return { observed, resume: () => release(), restore: () => { client.query = original; } };
}
async function waitForLock(application: string) {
  for (let n = 0; n < 400; n++) {
    const result = await admin.query<{ wait_event_type: string }>(
      "select wait_event_type from pg_stat_activity where application_name=$1", [application],
    );
    if (result.rows.some(r => r.wait_event_type === "Lock")) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error("Missing expected native PostgreSQL lock wait: " + application);
}
async function operation(shape: Shape, x: Fixture, actorId: string, signalId: string, repo = forum) {
  if (shape === "submit") return repo.createHelpSignal({
    kind: "needs-review", topicId: x.topicId, actorId,
    explanation: "Verify this answer", proposedOriginalTopicId: null,
  });
  if (shape === "withdraw") return repo.withdrawHelpSignal(signalId, x.topicId, actorId);
  return repo.resolveHelpSignal(signalId, actorId, shape);
}

beforeAll(async () => {
  await admin.connect();
  await admin.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const name of (await readdir("drizzle")).filter(n => /^\d{4}_.+\.sql$/u.test(n)).sort()) {
    await admin.query((await readFile("drizzle/" + name, "utf8")).replaceAll('"public".', '"' + schema + '".'));
  }
  await admin.query('insert into "user"(id,name,email) values($1,$1,$2)',
    [answerAuthor, answerAuthor + "@example.test"]);
});
afterAll(async () => {
  await pool.end();
  await admin.query("drop schema if exists " + schema + " cascade");
  await admin.end();
});

describe("SA04-J9 Help Signals AccountState lifecycle", () => {
  it.each(["needs-details", "needs-review", "solution-outdated", "duplicate"] as const)(
    "active %s submission preserves kind, target, explanation and pending status without History",
    async (kind) => {
      const x = await question(kind === "needs-review" || kind === "solution-outdated");
      const original = kind === "duplicate" ? await question() : null;
      const actorId = await person();
      const created = await forum.createHelpSignal({
        kind, topicId: x.topicId, actorId,
        explanation: kind === "duplicate" ? null : "Useful context",
        proposedOriginalTopicId: original?.topicId ?? null,
      });
      expect(created).toMatchObject({
        kind, topicId: x.topicId, submittedByUserId: actorId, status: "pending",
        targetPostId: kind === "needs-review" || kind === "solution-outdated" ? x.answerId : null,
        proposedOriginalTopicId: original?.topicId ?? null,
      });
      const after = await facts(x);
      expect(signalState(after, created.id)).toMatchObject({
        status: "pending", resolved_by_user_id: null,
      });
      expect(after.history).toEqual([]);
    },
  );

  it("active withdrawal preserves all state except signal and works under submit restriction", async () => {
    const x = await question(), actorId = await person();
    const signal = await pending(x, "needs-details", null, null, actorId);
    const before = await facts(x);
    const restricted = new DrizzleForumRepository(drizzle(pool), policy, async (_tx, _actor, restriction) => {
      if (restriction === "helpSignals.submit") throw new Error("submission-restricted");
      if (restriction === "admin.forum") throw new Error("review-restricted");
    });
    await expect(restricted.createHelpSignal({
      kind: "needs-details", topicId: x.topicId, actorId,
      explanation: "Need more details", proposedOriginalTopicId: null,
    })).rejects.toThrow("submission-restricted");
    await restricted.withdrawHelpSignal(signal.id, x.topicId, actorId);
    const after = await facts(x);
    expect(signalState(after, signal.id)).toMatchObject({ status: "withdrawn", resolved_by_user_id: actorId });
    expect(after.topic).toEqual(before.topic);
    expect(after.posts).toEqual(before.posts);
    expect(after.relations).toEqual(before.relations);
    expect(after.history).toEqual([]);
    await expect(forum.withdrawHelpSignal(signal.id, x.topicId, actorId))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    await expect(forum.withdrawHelpSignal(signal.id, "missing-topic", actorId))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
  });

  it("active rejected review uses admin.forum and emits only its single review History event", async () => {
    const x = await question(), actorId = await person();
    const signal = await pending(x, "needs-details");
    const before = await facts(x);
    expect(await forum.resolveHelpSignal(signal.id, actorId, "rejected")).toBe("rejected");
    const after = await facts(x);
    expect(signalState(after, signal.id)).toMatchObject({ status: "rejected", resolved_by_user_id: actorId });
    expect(after.topic).toEqual(before.topic);
    expect(after.posts).toEqual(before.posts);
    expect(after.history).toEqual([{
      action: "help.signalReviewed", actor_id: actorId,
      context: { signalId: signal.id, kind: "needs-details", resolution: "rejected" },
    }]);
  });

  it.each(["needs-details", "needs-review", "solution-outdated"] as const)(
    "active %s accepted review applies exactly its effect and supersedes applicable siblings",
    async (kind) => {
      const x = await question(kind !== "needs-details"), actorId = await person();
      const target = kind === "needs-details" ? null : x.answerId;
      const main = await pending(x, kind, target);
      const sibling = await pending(x, kind, target);
      const other = kind === "needs-review"
        ? await pending(x, "solution-outdated", x.answerId) : null;
      expect(await forum.resolveHelpSignal(main.id, actorId, "accepted")).toBe("accepted");
      const after = await facts(x);
      expect(signalState(after, main.id)).toMatchObject({ status: "accepted", resolved_by_user_id: actorId });
      expect(signalState(after, sibling.id)).toMatchObject({ status: "superseded", resolved_by_user_id: actorId });
      if (other) expect(signalState(after, other.id)?.status).toBe("pending");
      if (kind === "needs-details") expect(after.topic.needs_details).toBe(true);
      else expect(after.posts.find(p => p.id === x.answerId)?.solution_moderation_status)
        .toBe(kind === "needs-review" ? "needs-review" : "outdated");
      if (kind === "solution-outdated") {
        expect(after.posts.find(p => p.id === x.answerId)?.solution_outdated_reason).toBe("Needs review");
      }
      expect(after.history).toHaveLength(1);
      expect(after.history[0]).toMatchObject({
        action: "help.signalReviewed", actor_id: actorId,
        context: { signalId: main.id, kind, resolution: "accepted" },
      });
      expect(after.history[0].context.effect.action).toBe(
        kind === "needs-details" ? "help.needsDetailsChanged" : "help.solutionModerationChanged",
      );
    },
  );

  it("accepted outdated review supersedes both review and outdated pending kinds", async () => {
    const x = await question(true), moderator = await person();
    const main = await pending(x, "solution-outdated", x.answerId);
    const review = await pending(x, "needs-review", x.answerId);
    const other = await pending(x, "solution-outdated", x.answerId);
    expect(await forum.resolveHelpSignal(main.id, moderator, "accepted")).toBe("accepted");
    const f = await facts(x);
    for (const id of [review.id, other.id]) {
      expect(signalState(f, id)).toMatchObject({ status: "superseded", resolved_by_user_id: moderator });
    }
    expect(f.history).toHaveLength(1);
  });

  it.each(["needs-details", "needs-review", "solution-outdated"] as const)(
    "%s accepted-to-superseded path requires actor and never invents a domain effect",
    async (kind) => {
      const x = await question(kind !== "needs-details"), moderator = await person();
      if (kind === "needs-details") {
        await admin.query("update forum_topics set needs_details=true where id=$1", [x.topicId]);
      } else {
        await admin.query("update forum_posts set solution_moderation_status=$1,"
          + " solution_outdated_reason=$2 where id=$3",
        [kind === "needs-review" ? "needs-review" : "outdated",
          kind === "needs-review" ? null : "Already outdated", x.answerId]);
      }
      const signal = await pending(x, kind, kind === "needs-details" ? null : x.answerId);
      const before = await facts(x);
      expect(await forum.resolveHelpSignal(signal.id, moderator, "accepted")).toBe("superseded");
      const after = await facts(x);
      expect(signalState(after, signal.id)).toMatchObject({ status: "superseded", resolved_by_user_id: moderator });
      expect(after.topic).toEqual(before.topic);
      expect(after.posts).toEqual(before.posts);
      expect(after.history).toHaveLength(1);
      expect(after.history[0].context).toMatchObject({ resolution: "superseded" });
      expect(after.history[0].context).not.toHaveProperty("effect");
    },
  );

  it("stale solution target supersedes the entire old-target pending set, not new best answer signals", async () => {
    const x = await question(true), moderator = await person();
    const stale = await pending(x, "needs-review", x.answerId);
    const oldOther = await pending(x, "solution-outdated", x.answerId);
    const newTarget = await pending(x, "needs-review", x.otherAnswerId);
    await forum.selectBestAnswer(x.topicId, x.otherAnswerId, x.authorId);
    const before = await facts(x);
    expect(await forum.resolveHelpSignal(stale.id, moderator, "accepted")).toBe("superseded");
    const after = await facts(x);
    for (const id of [stale.id, oldOther.id]) {
      expect(signalState(after, id)).toMatchObject({ status: "superseded" });
    }
    expect(signalState(after, newTarget.id)?.status).toBe("pending");
    expect(after.posts).toEqual(before.posts);
    expect(after.history[0].context.resolution).toBe("superseded");
  });

  it("accepted duplicate review keeps the broad third-topic proposed-original supersession and History effect", async () => {
    const x = await question(), original = await question(), third = await question();
    const moderator = await person();
    const target = await pending(x, "duplicate", null, original.topicId);
    const onCandidate = await pending(x, "duplicate", null, third.topicId);
    const onOriginal = await pending(original, "duplicate", null, third.topicId);
    const thirdToCandidate = await pending(third, "duplicate", null, x.topicId);
    const unaffected = await pending(third, "duplicate", null, original.topicId);
    expect(await forum.resolveHelpSignal(target.id, moderator, "accepted")).toBe("accepted");
    const f = await facts(x);
    expect(f.relations).toHaveLength(1);
    expect(f.relations[0]).toMatchObject({
      duplicate_topic_id: x.topicId, original_topic_id: original.topicId, removed_at: null,
    });
    expect(signalState(f, target.id)?.status).toBe("accepted");
    for (const id of [onCandidate.id, thirdToCandidate.id]) {
      expect(signalState(f, id)).toMatchObject({ status: "superseded", resolved_by_user_id: moderator });
    }
    expect((await facts(original)).signals.find(s => s.id === onOriginal.id)?.status).toBe("superseded");
    expect((await facts(third)).signals.find(s => s.id === unaffected.id)?.status).toBe("pending");
    expect(f.history).toHaveLength(1);
    expect(f.history[0]).toMatchObject({
      action: "help.signalReviewed", actor_id: moderator,
      context: { resolution: "accepted", effect: {
        action: "help.duplicateConfirmed", context: { originalTopicId: original.topicId },
      } },
    });
  });

  it("duplicate accepted-to-superseded conflict keeps relationship unchanged and only one review History", async () => {
    const x = await question(), original = await question(), other = await question();
    const moderator = await person();
    const target = await pending(x, "duplicate", null, original.topicId);
    await admin.query("insert into forum_help_duplicate_relationships"
      + " (id,duplicate_topic_id,original_topic_id,confirmed_by_user_id)"
      + " values($1,$2,$3,$4)", [uuid(), original.topicId, other.topicId, moderator]);
    const before = await facts(x);
    expect(await forum.resolveHelpSignal(target.id, moderator, "accepted")).toBe("superseded");
    const after = await facts(x);
    expect(after.topic).toEqual(before.topic);
    expect(after.relations).toEqual(before.relations);
    expect(signalState(after, target.id)?.status).toBe("superseded");
    expect(after.history).toHaveLength(1);
    expect(after.history[0].context).toMatchObject({ resolution: "superseded" });
  });

  it("submission-only cooldown is serialized by one actor NO KEY UPDATE mutex, without lock upgrade", async () => {
    const x = await question(), y = await question(), actorId = await person();
    const client = new Client({ connectionString: url, options });
    await client.connect();
    const original = client.query;
    const statements: string[] = [];
    client.query = ((...args: unknown[]) => {
      statements.push(nativeSql(args[0]));
      return Reflect.apply(original, client, args);
    }) as typeof client.query;
    try {
      const limited = new DrizzleForumRepository(drizzle(client), { cooldownMs: 60_000, now: () => new Date() }, noMeasures);
      const created = await limited.createHelpSignal({
        kind: "needs-details", topicId: x.topicId, actorId,
        explanation: "Missing reproducible steps", proposedOriginalTopicId: null,
      });
      expect(created.status).toBe("pending");
      await expect(limited.createHelpSignal({
        kind: "needs-details", topicId: y.topicId, actorId,
        explanation: "Missing reproducible steps", proposedOriginalTopicId: null,
      })).rejects.toBeInstanceOf(ForumWriteRateLimitError);
      const actorLocks = statements.filter(s => /from "user"/i.test(s) && /for no key update/i.test(s));
      expect(actorLocks).toHaveLength(2);
      expect(statements.some(s => /from "user"/i.test(s) && /for update/i.test(s))).toBe(false);
      expect((await facts(y)).signals).toEqual([]);
    } finally {
      client.query = original;
      await client.end();
    }
  });

  it("create-only measure and review-only admin measure remain separate; withdrawal has neither", async () => {
    const x = await question(), actor = await person(), moderator = await person();
    const signal = await pending(x, "needs-details", null, null, actor);
    const restrictions: string[] = [];
    const restricted = new DrizzleForumRepository(drizzle(pool), policy, async (_tx, _id, scope) => {
      restrictions.push(scope);
      throw new Error("blocked-" + scope);
    });
    await expect(restricted.createHelpSignal({
      kind: "needs-details", topicId: x.topicId, actorId: actor,
      explanation: "More details", proposedOriginalTopicId: null,
    })).rejects.toThrow("blocked-helpSignals.submit");
    await expect(restricted.resolveHelpSignal(signal.id, moderator, "rejected"))
      .rejects.toThrow("blocked-admin.forum");
    await expect(restricted.resolveHelpSignal(signal.id, moderator, "accepted"))
      .rejects.toThrow("blocked-admin.forum");
    expect(restrictions).toEqual(["helpSignals.submit", "admin.forum", "admin.forum"]);
    await restricted.withdrawHelpSignal(signal.id, x.topicId, actor);
    expect((await facts(x)).history).toEqual([]);
  });

  it("inactive and missing actor never create, withdraw, reject, accept or supersede; facts remain unchanged", async () => {
    const x = await question(true), original = await question();
    const reporter = await person(), moderator = await person();
    const submit = await pending(x, "needs-review", x.answerId, null, reporter);
    const accepted = await pending(x, "needs-review", x.answerId);
    const stale = await pending(x, "duplicate", null, original.topicId);
    await admin.query("update forum_posts set solution_moderation_status='needs-review' where id=$1", [x.answerId]);
    const before = await facts(x);
    await deactivate(reporter);
    await deactivate(moderator);
    await expect(forum.createHelpSignal({
      kind: "solution-outdated", topicId: x.topicId, actorId: reporter,
      explanation: "Outdated", proposedOriginalTopicId: null,
    })).rejects.toBeInstanceOf(AccountInactiveError);
    await expect(forum.withdrawHelpSignal(submit.id, x.topicId, reporter))
      .rejects.toBeInstanceOf(AccountInactiveError);
    await expect(forum.resolveHelpSignal(accepted.id, moderator, "rejected"))
      .rejects.toBeInstanceOf(AccountInactiveError);
    await expect(forum.resolveHelpSignal(accepted.id, moderator, "accepted"))
      .rejects.toBeInstanceOf(AccountInactiveError);
    await expect(forum.resolveHelpSignal(stale.id, moderator, "accepted"))
      .rejects.toBeInstanceOf(AccountInactiveError);
    const missing = "j9-missing-" + uuid();
    await expect(forum.createHelpSignal({
      kind: "solution-outdated", topicId: x.topicId, actorId: missing,
      explanation: "Outdated", proposedOriginalTopicId: null,
    })).rejects.toBeInstanceOf(AccountMissingError);
    await expect(forum.resolveHelpSignal(stale.id, missing, "accepted"))
      .rejects.toBeInstanceOf(AccountMissingError);
    await expect(forum.resolveHelpSignal(accepted.id, missing, "rejected"))
      .rejects.toBeInstanceOf(AccountMissingError);
    expect(await facts(x)).toEqual(before);
  });

  it("preserves not-found, wrong-author and already-resolved failures before lifecycle success", async () => {
    const x = await question(), actor = await person(), other = await person();
    const signal = await pending(x, "needs-details", null, null, actor);
    await expect(forum.withdrawHelpSignal(signal.id, x.topicId, other))
      .rejects.toBeInstanceOf(ForumAuthorizationError);
    await expect(forum.withdrawHelpSignal("missing-" + uuid(), x.topicId, actor))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    await expect(forum.resolveHelpSignal("missing-" + uuid(), other, "rejected"))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    await forum.withdrawHelpSignal(signal.id, x.topicId, actor);
    await expect(forum.resolveHelpSignal(signal.id, other, "accepted"))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    await expect(forum.resolveHelpSignal(signal.id, other, "rejected"))
      .rejects.toBeInstanceOf(ForumStateConflictError);
  });

  it.each(["submit", "withdraw", "rejected", "accepted"] as const)(
    "%s state-first after dependencies observes committed deactivation and leaves facts unchanged",
    async (shape) => {
      const x = await question(shape === "submit"), actorId = await person();
      const signal = await pending(x, "needs-details", null, null, shape === "withdraw" ? actorId : undefined);
      const target = shape === "accepted" ? await pending(x, "needs-details") : signal;
      const before = await facts(x);
      const client = new Client({ connectionString: url, options });
      await client.connect();
      const paused = pauseQuery(client, sql => /from "user"/i.test(sql) && /for no key update/i.test(sql));
      try {
        const job = operation(shape, x, actorId, target.id, isolated(client));
        await paused.observed;
        await deactivate(actorId);
        paused.resume();
        await expect(job).rejects.toBeInstanceOf(AccountInactiveError);
        expect(await facts(x)).toEqual(before);
      } finally {
        paused.resume(); paused.restore(); await client.end();
      }
    }, 30_000,
  );

  it.each(["submit", "withdraw", "rejected", "accepted"] as const)(
    "%s writer-first actor mutex remains held through COMMIT and prevents deactivation",
    async (shape) => {
      const x = await question(shape === "submit"), actorId = await person();
      const signal = await pending(x, "needs-details", null, null, shape === "withdraw" ? actorId : undefined);
      const client = new Client({ connectionString: url, options });
      await client.connect();
      const paused = pauseQuery(client, sql => /^commit$/i.test(sql.trim()));
      let open = false;
      try {
        const job = operation(shape, x, actorId, signal.id, isolated(client));
        await paused.observed;
        await admin.query("begin");
        open = true;
        await admin.query("set local lock_timeout='180ms'");
        await expect(admin.query('update "user" set deactivated_at=now(),'
          + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years' where id=$1",
        [actorId])).rejects.toMatchObject({ code: "55P03" });
        await admin.query("rollback");
        open = false;
        paused.resume();
        const result = await job;
        if (shape === "submit") expect(result).toMatchObject({ status: "pending" });
        else if (shape === "rejected" || shape === "accepted") expect(result).toBe(shape);
        const committed = await facts(x);
        if (shape === "submit") expect(committed.signals.some(s => s.status === "pending")).toBe(true);
        if (shape === "withdraw") expect(signalState(committed, signal.id)?.status).toBe("withdrawn");
        if (shape === "rejected") expect(signalState(committed, signal.id)?.status).toBe("rejected");
        if (shape === "accepted") expect(committed.topic.needs_details).toBe(true);
        await deactivate(actorId);
        expect(await facts(x)).toEqual(committed);
      } finally {
        paused.resume(); paused.restore();
        if (open) await admin.query("rollback");
        await client.end();
      }
    }, 30_000,
  );

  it("concurrent withdrawal of target preempts accepted review under ordered signal locks", async () => {
    const x = await question(), signal = await pending(x, "needs-details");
    const holder = new Client({ connectionString: url, options });
    const reviewer = new Client({
      connectionString: url, options, application_name: "j9-review-withdraw-contention",
    });
    await holder.connect(); await reviewer.connect();
    let open = false;
    let job: Promise<unknown> | undefined;
    try {
      await holder.query("begin");
      open = true;
      await holder.query("select id from forum_help_signals where id=$1 for update", [signal.id]);
      job = isolated(reviewer).resolveHelpSignal(signal.id, await person(), "accepted");
      await waitForLock("j9-review-withdraw-contention");
      await holder.query("update forum_help_signals"
        + " set status='withdrawn',resolved_by_user_id=$2,resolved_at=now() where id=$1",
      [signal.id, signal.submittedBy]);
      await holder.query("commit");
      open = false;
      await expect(job).rejects.toBeInstanceOf(ForumStateConflictError);
      const state = await facts(x);
      expect(signalState(state, signal.id)?.status).toBe("withdrawn");
      expect(state.topic.needs_details).toBe(false);
      expect(state.history).toEqual([]);
    } finally {
      if (open) await holder.query("rollback");
      if (job) await Promise.allSettled([job]);
      await Promise.all([holder.end(), reviewer.end()]);
    }
  }, 30_000);

  it("bulk duplicate review locks third-topic proposed-original signals before actor admission", async () => {
    const x = await question(), original = await question(), third = await question();
    const target = await pending(x, "duplicate", null, original.topicId);
    const thirdSignal = await pending(third, "duplicate", null, x.topicId);
    const blocker = new Client({ connectionString: url, options });
    const reviewer = new Client({
      connectionString: url, options, application_name: "j9-third-topic-signal-lock",
    });
    await blocker.connect(); await reviewer.connect();
    let open = false;
    let job: Promise<unknown> | undefined;
    try {
      await blocker.query("begin"); open = true;
      await blocker.query("select id from forum_help_signals where id=$1 for no key update", [thirdSignal.id]);
      job = isolated(reviewer).resolveHelpSignal(target.id, await person(), "accepted");
      await waitForLock("j9-third-topic-signal-lock");
      await blocker.query("commit"); open = false;
      expect(await job).toBe("accepted");
      expect(signalState(await facts(x), thirdSignal.id)?.status).toBe("superseded");
    } finally {
      if (open) await blocker.query("rollback");
      if (job) await Promise.allSettled([job]);
      await Promise.all([blocker.end(), reviewer.end()]);
    }
  }, 30_000);

  it("accepted solution review waits on J8 post mutex before actor and updates moderation after release", async () => {
    const x = await question(true);
    const signal = await pending(x, "solution-outdated", x.answerId);
    const blocker = new Client({ connectionString: url, options });
    const reviewer = new Client({
      connectionString: url, options, application_name: "j9-solution-post-lock",
    });
    await blocker.connect(); await reviewer.connect();
    let open = false;
    let job: Promise<unknown> | undefined;
    try {
      await blocker.query("begin"); open = true;
      await blocker.query("select id from forum_posts where id=$1 for no key update", [x.answerId]);
      job = isolated(reviewer).resolveHelpSignal(signal.id, await person(), "accepted");
      await waitForLock("j9-solution-post-lock");
      await blocker.query("commit"); open = false;
      expect(await job).toBe("accepted");
      expect((await facts(x)).posts.find(p => p.id === x.answerId)?.solution_moderation_status).toBe("outdated");
    } finally {
      if (open) await blocker.query("rollback");
      if (job) await Promise.allSettled([job]);
      await Promise.all([blocker.end(), reviewer.end()]);
    }
  }, 30_000);

  it("same-actor Complaint post→actor→FK KEY SHARE completes while signal submission holds topic and waits for post", async () => {
    const x = await question(true), actorId = await person();
    const complaint = new Client({ connectionString: url, options });
    const writer = new Client({
      connectionString: url, options, application_name: "j9-submit-complaint-fk",
    });
    await complaint.connect(); await writer.connect();
    let open = false;
    let job: Promise<unknown> | undefined;
    try {
      await complaint.query("begin"); open = true;
      await complaint.query("select id from forum_posts where id=$1 for update", [x.answerId]);
      await complaint.query('select id from "user" where id=$1 for no key update', [actorId]);
      job = isolated(writer).createHelpSignal({
        kind: "needs-review", topicId: x.topicId, actorId,
        explanation: "Verify the selected answer", proposedOriginalTopicId: null,
      });
      await waitForLock("j9-submit-complaint-fk");
      await complaint.query("set local lock_timeout='500ms'");
      await complaint.query("insert into forum_complaint_targets"
        + " (id,kind,topic_id,post_id,post_revision_id,affected_author_id)"
        + " select $1,'post',p.topic_id,p.id,p.current_revision_id,p.author_id"
        + " from forum_posts p where p.id=$2", [uuid(), x.answerId]);
      await complaint.query("commit"); open = false;
      expect(await job).toMatchObject({ kind: "needs-review", status: "pending" });
    } finally {
      if (open) await complaint.query("rollback");
      if (job) await Promise.allSettled([job]);
      await Promise.all([complaint.end(), writer.end()]);
    }
  }, 30_000);
});
