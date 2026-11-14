import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import { HELP_SOLUTIONS_SERVICE_SECTION_ID } from "../../db/forum-identifiers";
import { DrizzleForumRepository, ForumAuthorizationError, ForumStateConflictError } from "../../db/forum-repository";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA04-J11 requires disposable loopback *_test PostgreSQL");
}
const schema = "sa04_j11_duplicate_lifecycle_test";
const options = "-c search_path=" + schema;
const admin = new Client({ connectionString: url, options });
const pool = new Pool({ connectionString: url, options, max: 8 });
const policy = { cooldownMs: 0, now: () => new Date() };
const noMeasures = async () => {};
const forum = new DrizzleForumRepository(drizzle(pool), policy, noMeasures);
const isolated = (client: Client) => new DrizzleForumRepository(drizzle(client), policy, noMeasures);
const uuid = () => crypto.randomUUID();
type Shape = "confirm" | "remove" | "appeal" | "resolve-accepted" | "resolve-rejected";
type Fixture = {
  duplicate: string; original: string; third: string; author: string; manager: string;
  relationshipId: string | null; appealId: string | null;
};
async function person(): Promise<string> {
  const id = "j11-" + uuid();
  await admin.query('insert into "user"(id,name,email) values($1,$1,$2)', [id, id + "@example.test"]);
  return id;
}
async function deactivate(id: string): Promise<void> {
  await admin.query('update "user" set deactivated_at=now(),deactivated_by_user_id=$1,'
    + "retain_at_least_until=now()+interval '2 years' where id=$1", [id]);
}
async function topic(author: string): Promise<string> {
  const topicId = uuid();
  await forum.createTopicWithInitialPost({
    id: topicId, sectionId: HELP_SOLUTIONS_SERVICE_SECTION_ID, authorId: author,
    titleRevision: { id: uuid(), originalContent: "Help question", sourceLocale: "en" },
    initialPost: {
      id: uuid(), topicId, authorId: author,
      bodyRevision: { id: uuid(), originalContent: "Question", sourceLocale: "en" },
    },
  });
  return topicId;
}
async function fixture(kind: Shape = "confirm"): Promise<Fixture> {
  const author = await person(), manager = await person(), other = await person();
  const duplicate = await topic(author), original = await topic(other), third = await topic(other);
  const x: Fixture = { duplicate, original, third, author, manager, relationshipId: null, appealId: null };
  if (kind !== "confirm") {
    await forum.confirmHelpDuplicate(duplicate, original, manager);
    x.relationshipId = await relationshipId(x);
  }
  if (kind.startsWith("resolve")) {
    await forum.appealHelpDuplicate(duplicate, author, "Not a duplicate", x.relationshipId!);
    x.appealId = await appealId(x);
  }
  return x;
}
async function relationshipId(x: Fixture): Promise<string> {
  const r = await admin.query<{ id: string }>(
    "select id from forum_help_duplicate_relationships where duplicate_topic_id=$1 and removed_at is null", [x.duplicate]);
  return r.rows[0]!.id;
}
async function appealId(x: Fixture): Promise<string> {
  const r = await admin.query<{ id: string }>(
    "select id from forum_help_duplicate_appeals where relationship_id=$1 and status='pending'", [x.relationshipId]);
  return r.rows[0]!.id;
}
async function signal(topicId: string, proposed: string): Promise<string> {
  const id = uuid(), submitter = await person();
  await admin.query("insert into forum_help_signals"
    + " (id,kind,topic_id,proposed_original_topic_id,submitted_by_user_id)"
    + " values($1,'duplicate',$2,$3,$4)", [id, topicId, proposed, submitter]);
  return id;
}
async function facts(x: Fixture) {
  const [topics, relationships, appeals, signals, history] = await Promise.all([
    admin.query("select id,is_solved,best_answer_post_id from forum_topics"
      + " where id=any($1::text[]) order by id", [[x.duplicate, x.original, x.third]]),
    admin.query("select id,duplicate_topic_id,original_topic_id,removed_at,removed_by_user_id"
      + " from forum_help_duplicate_relationships where duplicate_topic_id=$1 or original_topic_id=$1"
      + " order by id", [x.duplicate]),
    admin.query("select id,relationship_id,appellant_user_id,status,resolved_by_user_id"
      + " from forum_help_duplicate_appeals where relationship_id in"
      + " (select id from forum_help_duplicate_relationships where duplicate_topic_id=$1)"
      + " order by id", [x.duplicate]),
    admin.query("select id,kind,topic_id,proposed_original_topic_id,status,resolved_by_user_id"
      + " from forum_help_signals where topic_id=any($1::text[])"
      + " or proposed_original_topic_id=$2 order by id", [[x.duplicate, x.original, x.third], x.duplicate]),
    admin.query("select action,actor_id,context from admin_history"
      + " where target_type='topic' and target_id=$1 order by position", [x.duplicate]),
  ]);
  return {
    topics: topics.rows, relationships: relationships.rows,
    appeals: appeals.rows, signals: signals.rows, history: history.rows,
  };
}
function signalState(f: Awaited<ReturnType<typeof facts>>, id: string) {
  return f.signals.find(row => row.id === id);
}
async function operation(kind: Shape, x: Fixture, repo = forum, actor?: string): Promise<void> {
  if (kind === "confirm") return repo.confirmHelpDuplicate(x.duplicate, x.original, actor ?? x.manager);
  if (kind === "remove") return repo.removeHelpDuplicate(x.duplicate, actor ?? x.manager, x.relationshipId!);
  if (kind === "appeal") return repo.appealHelpDuplicate(x.duplicate, actor ?? x.author, "Not the same", x.relationshipId!);
  return repo.resolveHelpDuplicateAppeal(x.duplicate, actor ?? x.manager,
    kind === "resolve-accepted" ? "accepted" : "rejected", x.appealId!);
}
function nativeSql(v: unknown): string {
  if (typeof v === "string") return v;
  return v && typeof v === "object" && "text" in v && typeof v.text === "string" ? v.text : "";
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
      "select wait_event_type from pg_stat_activity where application_name=$1", [application]);
    if (rows.rows.some(row => row.wait_event_type === "Lock")) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error("Expected PostgreSQL lock wait from " + application);
}

beforeAll(async () => {
  await admin.connect();
  await admin.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const name of (await readdir("drizzle")).filter(n => /^\d{4}_.+\.sql$/u.test(n)).sort()) {
    await admin.query((await readFile("drizzle/" + name, "utf8")).replaceAll('"public".', '"' + schema + '".'));
  }
});
afterAll(async () => {
  await pool.end();
  await admin.query("drop schema if exists " + schema + " cascade");
  await admin.end();
});

describe("SA04-J11 duplicate and appeal authoritative AccountState", () => {
  it("confirmation supersedes exactly the complete cross-topic duplicate signal set with one History", async () => {
    const x = await fixture();
    const s1 = await signal(x.duplicate, x.original);
    const s2 = await signal(x.original, x.third);
    const s3 = await signal(x.third, x.duplicate);
    const foreign = await topic(await person());
    const unaffected = await signal(foreign, x.original);
    await operation("confirm", x);
    const f = await facts(x);
    expect(f.relationships).toHaveLength(1);
    for (const id of [s1, s2, s3]) {
      expect(signalState(f, id)).toMatchObject({ status: "superseded", resolved_by_user_id: x.manager });
    }
    expect((await admin.query("select status from forum_help_signals where id=$1", [unaffected])).rows[0]?.status)
      .toBe("pending");
    expect(f.history).toHaveLength(1);
    expect(f.history[0]).toMatchObject({ action: "help.duplicateConfirmed", actor_id: x.manager });
    await expect(operation("confirm", x)).rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await facts(x)).toEqual(f);
  });

  it("removal resolves the pending appeal and records its identity in a single History event", async () => {
    const x = await fixture("remove");
    await operation("appeal", x);
    const pending = await appealId(x);
    const before = await facts(x);
    expect(before.history).toHaveLength(1);
    await operation("remove", x);
    const after = await facts(x);
    expect(after.relationships[0]).toMatchObject({ removed_by_user_id: x.manager });
    expect(after.appeals[0]).toMatchObject({ id: pending, status: "accepted", resolved_by_user_id: x.manager });
    expect(after.history).toHaveLength(2);
    expect(after.history[1]).toMatchObject({
      action: "help.duplicateRemoved", actor_id: x.manager,
      context: expect.objectContaining({ resolvedAppeal: { id: pending, outcome: "accepted" } }),
    });
    await expect(operation("remove", x)).rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await facts(x)).toEqual(after);
  });

  it("appeal has no admin measure or History while pending uniqueness and author ownership remain enforced", async () => {
    const x = await fixture("remove");
    const blockedMeasure = async () => { throw new Error("unexpected admin measure"); };
    const noAdminMeasureRepo = new DrizzleForumRepository(drizzle(pool), policy, blockedMeasure);
    const before = await facts(x);
    await operation("appeal", x, noAdminMeasureRepo);
    const after = await facts(x);
    expect(after.appeals).toHaveLength(1);
    expect(after.appeals[0]).toMatchObject({ appellant_user_id: x.author, status: "pending" });
    expect(after.history).toEqual(before.history);
    await expect(operation("appeal", x)).rejects.toBeInstanceOf(ForumStateConflictError);
    await expect(operation("appeal", x, forum, x.manager)).rejects.toBeInstanceOf(ForumAuthorizationError);
    await expect(forum.appealHelpDuplicate(x.duplicate, x.author, "Wrong identity", uuid()))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await facts(x)).toEqual(after);
  });

  it.each(["resolve-rejected", "resolve-accepted"] as const)(
    "%s preserves review outcome, expected appeal identity and History",
    async kind => {
      const x = await fixture(kind);
      const before = await facts(x);
      await expect(forum.resolveHelpDuplicateAppeal(x.duplicate, x.manager, "accepted", uuid()))
        .rejects.toBeInstanceOf(ForumStateConflictError);
      expect(await facts(x)).toEqual(before);
      await operation(kind, x);
      const after = await facts(x);
      expect(after.appeals[0]).toMatchObject({
        id: x.appealId, status: kind === "resolve-rejected" ? "rejected" : "accepted",
        resolved_by_user_id: x.manager,
      });
      expect(after.relationships[0]?.removed_at !== null).toBe(kind === "resolve-accepted");
      expect(after.history).toHaveLength(2);
      expect(after.history[1]).toMatchObject({
        action: "help.duplicateAppealResolved", actor_id: x.manager,
        context: expect.objectContaining({ appealId: x.appealId,
          resolution: kind === "resolve-rejected" ? "rejected" : "accepted" }),
      });
      await expect(operation(kind, x)).rejects.toBeInstanceOf(ForumStateConflictError);
      expect(await facts(x)).toEqual(after);
    },
  );

  it.each(["confirm", "remove", "resolve-rejected", "resolve-accepted"] as const)(
    "%s retains admin.forum measure admission and rolls back effects on rejection",
    async kind => {
      const x = await fixture(kind);
      const before = await facts(x);
      const blockedMeasure = async () => { throw new Error("admin measure denied"); };
      const blockedRepo = new DrizzleForumRepository(drizzle(pool), policy, blockedMeasure);
      await expect(operation(kind, x, blockedRepo)).rejects.toThrow("admin measure denied");
      expect(await facts(x)).toEqual(before);
    },
  );

  it.each(["confirm", "remove", "appeal", "resolve-rejected", "resolve-accepted"] as const)(
    "%s denies inactive actor and preserves all domain and History facts",
    async kind => {
      const x = await fixture(kind);
      if (kind === "confirm") await signal(x.third, x.duplicate);
      if (kind === "remove") await operation("appeal", x);
      const before = await facts(x);
      await deactivate(kind === "appeal" ? x.author : x.manager);
      await expect(operation(kind, x)).rejects.toBeInstanceOf(AccountInactiveError);
      expect(await facts(x)).toEqual(before);
    },
  );

  it.each(["confirm", "remove", "resolve-rejected", "resolve-accepted"] as const)(
    "%s denies missing actor and preserves all domain facts",
    async kind => {
      const x = await fixture(kind), before = await facts(x);
      await expect(operation(kind, x, forum, "j11-missing-" + uuid()))
        .rejects.toBeInstanceOf(AccountMissingError);
      expect(await facts(x)).toEqual(before);
    },
  );

  it("appeal absent actor is rejected by original ownership rule before AccountState admission", async () => {
    const x = await fixture("appeal"), before = await facts(x);
    await expect(operation("appeal", x, forum, uuid())).rejects.toBeInstanceOf(ForumAuthorizationError);
    expect(await facts(x)).toEqual(before);
  });

  it.each(["confirm", "remove", "appeal", "resolve-accepted", "resolve-rejected"] as const)(
    "%s state-first deactivation commits after dependencies and prevents effects",
    async kind => {
      const x = await fixture(kind);
      if (kind === "confirm") await signal(x.third, x.duplicate);
      if (kind === "remove") await operation("appeal", x);
      const before = await facts(x), actor = kind === "appeal" ? x.author : x.manager;
      const client = new Client({ connectionString: url, options });
      await client.connect();
      const pause = pauseQuery(client, sql => /from "user" .*for no key update/i.test(sql));
      try {
        const work = operation(kind, x, isolated(client));
        await pause.observed;
        await deactivate(actor);
        pause.resume();
        await expect(work).rejects.toBeInstanceOf(AccountInactiveError);
        expect(await facts(x)).toEqual(before);
      } finally {
        pause.resume(); pause.restore(); await client.end();
      }
    }, 30_000,
  );

  it.each(["confirm", "remove", "appeal", "resolve-accepted", "resolve-rejected"] as const)(
    "%s writer-first actor lock remains held across effects/History through COMMIT",
    async kind => {
      const x = await fixture(kind);
      if (kind === "confirm") await signal(x.third, x.duplicate);
      if (kind === "remove") await operation("appeal", x);
      const actor = kind === "appeal" ? x.author : x.manager;
      const client = new Client({ connectionString: url, options });
      await client.connect();
      const pause = pauseQuery(client, sql => /^commit$/i.test(sql.trim()));
      let deactivationOpen = false;
      try {
        const work = operation(kind, x, isolated(client));
        await pause.observed;
        await admin.query("begin"); deactivationOpen = true;
        await admin.query("set local lock_timeout = '180ms'");
        await expect(admin.query('update "user" set deactivated_at=now(),'
          + " deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years' where id=$1",
        [actor])).rejects.toMatchObject({ code: "55P03" });
        await admin.query("rollback"); deactivationOpen = false;
        pause.resume();
        await work;
        const committed = await facts(x);
        if (kind === "confirm") expect(committed.relationships).toHaveLength(1);
        if (kind === "appeal") expect(committed.appeals).toHaveLength(1);
        if (kind === "remove") expect(committed.relationships[0]?.removed_at).not.toBeNull();
        if (kind.startsWith("resolve")) expect(committed.appeals[0]?.status)
          .toBe(kind === "resolve-accepted" ? "accepted" : "rejected");
        await deactivate(actor);
        expect(await facts(x)).toEqual(committed);
      } finally {
        pause.resume(); pause.restore();
        if (deactivationOpen) await admin.query("rollback");
        await client.end();
      }
    }, 30_000,
  );

  it("confirmation waits on a third-topic pending signal before acquiring the actor mutex", async () => {
    const x = await fixture(), thirdSignal = await signal(x.third, x.duplicate);
    const holder = new Client({ connectionString: url, options });
    const worker = new Client({ connectionString: url, options, application_name: "j11-confirm-signal" });
    await Promise.all([holder.connect(), worker.connect()]);
    let open = false, work: Promise<unknown> | undefined;
    try {
      await holder.query("begin"); open = true;
      await holder.query("select id from forum_help_signals where id=$1 for no key update", [thirdSignal]);
      work = operation("confirm", x, isolated(worker));
      await waitForLock("j11-confirm-signal");
      await holder.query("update forum_help_signals"
        + " set status='withdrawn',resolved_by_user_id=$2,resolved_at=now() where id=$1",
      [thirdSignal, x.manager]);
      await holder.query("commit"); open = false;
      await work;
      expect(signalState(await facts(x), thirdSignal)).toMatchObject({ status: "withdrawn" });
    } finally {
      if (open) await holder.query("rollback");
      if (work) await Promise.allSettled([work]);
      await Promise.all([holder.end(), worker.end()]);
    }
  }, 30_000);

  it("removal waits for pending appeal contention before actor admission", async () => {
    const x = await fixture("remove");
    await operation("appeal", x);
    const id = await appealId(x);
    const holder = new Client({ connectionString: url, options });
    const worker = new Client({ connectionString: url, options, application_name: "j11-remove-appeal" });
    await Promise.all([holder.connect(), worker.connect()]);
    let open = false, work: Promise<unknown> | undefined;
    try {
      await holder.query("begin"); open = true;
      await holder.query("select id from forum_help_duplicate_appeals where id=$1 for no key update", [id]);
      work = operation("remove", x, isolated(worker));
      await waitForLock("j11-remove-appeal");
      await holder.query("commit"); open = false;
      await work;
      const f = await facts(x);
      expect(f.appeals[0]).toMatchObject({ status: "accepted", resolved_by_user_id: x.manager });
      expect(f.history[1]?.context).toMatchObject({ resolvedAppeal: { id, outcome: "accepted" } });
    } finally {
      if (open) await holder.query("rollback");
      if (work) await Promise.allSettled([work]);
      await Promise.all([holder.end(), worker.end()]);
    }
  }, 30_000);

  it("same-actor Complaint post→actor→FK KEY SHARE completes while confirmation holds topic mutex", async () => {
    const x = await fixture();
    const post = await admin.query<{ id: string }>("select id from forum_posts where topic_id=$1", [x.duplicate]);
    const complaint = new Client({ connectionString: url, options });
    const worker = new Client({ connectionString: url, options, application_name: "j11-complaint-compat" });
    await Promise.all([complaint.connect(), worker.connect()]);
    let open = false, work: Promise<unknown> | undefined;
    try {
      await complaint.query("begin"); open = true;
      await complaint.query("select id from forum_posts where id=$1 for update", [post.rows[0]!.id]);
      await complaint.query('select id from "user" where id=$1 for no key update', [x.manager]);
      work = operation("confirm", x, isolated(worker));
      await waitForLock("j11-complaint-compat");
      await complaint.query("set local lock_timeout = '450ms'");
      await complaint.query("insert into forum_complaint_targets"
        + " (id,kind,topic_id,post_id,post_revision_id,affected_author_id)"
        + " select $1,'post',p.topic_id,p.id,p.current_revision_id,p.author_id"
        + " from forum_posts p where p.id=$2", [uuid(), post.rows[0]!.id]);
      await complaint.query("commit"); open = false;
      await work;
      expect((await facts(x)).relationships).toHaveLength(1);
    } finally {
      if (open) await complaint.query("rollback");
      if (work) await Promise.allSettled([work]);
      await Promise.all([complaint.end(), worker.end()]);
    }
  }, 30_000);
});
