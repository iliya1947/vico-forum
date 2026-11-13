import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import { DrizzleForumRepository, ForumEntityNotFoundError } from "../../db/forum-repository";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !["127.0.0.1", "localhost"].includes(new URL(databaseUrl).hostname)
  || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error("SA04-J6 requires a disposable loopback *_test PostgreSQL database");
}
const schema = "sa04_j6_notification_lifecycle_test";
const options = "-c search_path=" + schema;
const fixture = new Client({ connectionString: databaseUrl, options });
const pool = new Pool({ connectionString: databaseUrl, options, max: 5 });
const forum = new DrizzleForumRepository(drizzle(pool));
const standalone = (client: Client) => new DrizzleForumRepository(drizzle(client));
const uuid = () => crypto.randomUUID();
const authorId = "j6-author", reviewerId = "j6-reviewer";
type Kind = "reply" | "mention" | "complaint-decision" | "complaint-appeal-result";
type Fixture = {
  actorId: string; topicId: string; postId: string; caseId: string; appealId: string;
  notices: Record<Kind, string>;
};
type Writer = "unified" | "legacy";

async function newUser(): Promise<string> {
  const id = "j6-user-" + uuid();
  await fixture.query('insert into "user" (id,name,email) values ($1,$1,$3)', [id, id, id + "@example.test"]);
  return id;
}

async function deactivate(userId: string): Promise<void> {
  await fixture.query('update "user" set deactivated_at=now(),deactivated_by_user_id=$1,'
    + "retain_at_least_until=now()+interval '2 years' where id=$1", [userId]);
}

async function readAt(notificationId: string): Promise<Date | null> {
  const result = await fixture.query<{ read_at: Date | null }>(
    "select read_at from forum_reply_notifications where id=$1", [notificationId],
  );
  return result.rows[0]?.read_at ?? null;
}

async function seed(): Promise<Fixture> {
  const actorId = await newUser(), topicId = uuid(), postId = uuid(), revisionId = uuid();
  const caseId = uuid(), targetId = uuid(), decisionId = uuid(), appealId = uuid();
  await forum.createTopicWithInitialPost({
    id: topicId, sectionId: "j6-section", authorId,
    titleRevision: { id: uuid(), originalContent: "Notification topic", sourceLocale: "en" },
    initialPost: {
      id: postId, topicId, authorId,
      bodyRevision: { id: revisionId, originalContent: "Original message", sourceLocale: "en" },
    },
  });
  await fixture.query("insert into forum_complaint_targets"
    + " (id,kind,topic_id,post_id,post_revision_id,affected_author_id)"
    + " values ($1,'post',$2,$3,$4,$5)",
  [targetId, topicId, postId, revisionId, authorId]);
  await fixture.query("insert into forum_complaint_cases(id,target_id) values($1,$2)", [caseId, targetId]);
  await fixture.query("insert into forum_complaints"
    + " (id,case_id,target_id,reporter_user_id,reason)"
    + " values ($1,$2,$3,$4,'spam')", [uuid(), caseId, targetId, actorId]);
  await fixture.query("insert into forum_complaint_decisions"
    + " (id,case_id,outcome,reviewer_user_id,reasoning)"
    + " values ($1,$2,'confirmed',$3,'Decision')", [decisionId, caseId, reviewerId]);
  await fixture.query("insert into forum_complaint_appeals"
    + " (id,case_id,decision_id,appellant_user_id,side,argument,ordinal,status,"
    + " outcome,reasoning,reviewer_user_id,created_at,resolved_at)"
    + " values ($1,$2,$3,$4,'reporter','Appeal',1,'resolved',"
    + " 'upheld','Resolution',$5,'2026-10-01','2026-10-02')",
  [appealId, caseId, decisionId, actorId, reviewerId]);

  const notices = {
    reply: uuid(), mention: uuid(), "complaint-decision": uuid(), "complaint-appeal-result": uuid(),
  };
  for (const kind of ["reply", "mention"] as const) {
    await fixture.query("insert into forum_reply_notifications"
      + " (id,recipient_user_id,actor_user_id,topic_id,post_id,kind)"
      + " values($1,$2,$3,$4,$5,$6)",
    [notices[kind], actorId, authorId, topicId, postId, kind]);
  }
  await fixture.query("insert into forum_reply_notifications"
    + " (id,recipient_user_id,complaint_decision_id,kind)"
    + " values ($1,$2,$3,'complaint-decision')",
  [notices["complaint-decision"], actorId, decisionId]);
  await fixture.query("insert into forum_reply_notifications"
    + " (id,recipient_user_id,complaint_appeal_id,kind)"
    + " values ($1,$2,$3,'complaint-appeal-result')",
  [notices["complaint-appeal-result"], actorId, appealId]);
  return { actorId, topicId, postId, caseId, appealId, notices };
}

async function mark(writer: Writer, actorId: string, id: string, repo = forum) {
  return writer === "unified"
    ? repo.markNotificationRead(actorId, id)
    : repo.markReplyNotificationRead(actorId, id);
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
  return {
    observed, resume: () => release(), restore: () => { client.query = original; },
  };
}

beforeAll(async () => {
  await fixture.connect();
  await fixture.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const file of (await readdir("drizzle")).filter(name => /^\d{4}_.+\.sql$/u.test(name)).sort()) {
    await fixture.query((await readFile("drizzle/" + file, "utf8"))
      .replaceAll('"public".', '"' + schema + '".'));
  }
  for (const id of [authorId, reviewerId]) {
    await fixture.query('insert into "user" (id,name,email) values ($1,$2,$3)',
    [id, id, id + "@example.test"]);
  }
  await forum.createCategory({ id: "j6-category", name: "Notification lifecycle" });
  await forum.createSection({ id: "j6-section", categoryId: "j6-category", name: "Notifications" });
});

afterAll(async () => {
  await pool.end();
  await fixture.query("drop schema if exists " + schema + " cascade");
  await fixture.end();
});

describe("SA04-J6 authoritative notification acknowledgement", () => {
  it("preserves all unified kinds, target/membership and active already-read idempotency", async () => {
    const x = await seed();
    for (const kind of ["reply", "mention", "complaint-decision", "complaint-appeal-result"] as const) {
      const id = x.notices[kind];
      expect(await readAt(id)).toBeNull();
      const expected = kind === "complaint-decision"
        ? { kind, caseId: x.caseId }
        : kind === "complaint-appeal-result"
          ? { kind, caseId: x.caseId, appealId: x.appealId }
          : { kind, topicId: x.topicId, postId: x.postId };
      expect(await forum.markNotificationRead(x.actorId, id)).toEqual(expected);
      const original = await readAt(id);
      expect(original).toBeInstanceOf(Date);
      expect(await forum.markNotificationRead(x.actorId, id)).toEqual(expected);
      expect(await readAt(id)).toEqual(original);
    }
  });

  it("keeps legacy reply/mention-only writes and active already-read timestamp", async () => {
    const x = await seed();
    for (const kind of ["reply", "mention"] as const) {
      const id = x.notices[kind];
      expect(await forum.markReplyNotificationRead(x.actorId, id))
        .toEqual({ topicId: x.topicId, postId: x.postId });
      const original = await readAt(id);
      expect(original).toBeInstanceOf(Date);
      expect(await forum.markReplyNotificationRead(x.actorId, id))
        .toEqual({ topicId: x.topicId, postId: x.postId });
      expect(await readAt(id)).toEqual(original);
    }
    await expect(forum.markReplyNotificationRead(x.actorId, x.notices["complaint-decision"]))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    await expect(forum.markReplyNotificationRead(x.actorId, x.notices["complaint-appeal-result"]))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect(await readAt(x.notices["complaint-decision"])).toBeNull();
  });

  it("retains wrong-recipient, missing-notification and complaint nonmember fail-closed behavior", async () => {
    const x = await seed(), outsider = await newUser();
    for (const kind of Object.keys(x.notices) as Kind[]) {
      await expect(forum.markNotificationRead(outsider, x.notices[kind]))
        .rejects.toBeInstanceOf(ForumEntityNotFoundError);
      expect(await readAt(x.notices[kind])).toBeNull();
    }
    await expect(forum.markReplyNotificationRead(outsider, x.notices.reply))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    for (const writer of ["unified", "legacy"] as const) {
      await expect(mark(writer, x.actorId, "missing-" + uuid()))
        .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    }
    const unentitledId = uuid();
    await fixture.query("insert into forum_reply_notifications"
      + " (id,recipient_user_id,complaint_decision_id,kind)"
      + " values($1,$2,$3,'complaint-decision')",
    [unentitledId, outsider, (await fixture.query<{ complaint_decision_id: string }>(
      "select complaint_decision_id from forum_reply_notifications where id=$1",
      [x.notices["complaint-decision"]],
    )).rows[0]!.complaint_decision_id]);
    await expect(forum.markNotificationRead(outsider, unentitledId))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect(await readAt(unentitledId)).toBeNull();
    // The actual affected author also remains a valid complaint participant.
    const authorNotice = uuid();
    await fixture.query("insert into forum_reply_notifications"
      + " (id,recipient_user_id,complaint_decision_id,kind)"
      + " values($1,$2,$3,'complaint-decision')",
    [authorNotice, authorId, (await fixture.query<{ complaint_decision_id: string }>(
      "select complaint_decision_id from forum_reply_notifications where id=$1",
      [x.notices["complaint-decision"]],
    )).rows[0]!.complaint_decision_id]);
    expect(await forum.markNotificationRead(authorId, authorNotice))
      .toEqual({ kind: "complaint-decision", caseId: x.caseId });
  });

  it.each(["unified", "legacy"] as const)(
    "%s rejects inactive/missing first and already-read acknowledgement without changing read_at",
    async (writer) => {
      const first = await seed(), already = await seed();
      const kind = writer === "unified" ? "complaint-appeal-result" : "mention";
      const firstId = first.notices[kind], alreadyId = already.notices[kind];
      await mark(writer, already.actorId, alreadyId);
      const before = await readAt(alreadyId);
      await deactivate(first.actorId);
      await deactivate(already.actorId);
      await expect(mark(writer, first.actorId, firstId)).rejects.toBeInstanceOf(AccountInactiveError);
      await expect(mark(writer, already.actorId, alreadyId)).rejects.toBeInstanceOf(AccountInactiveError);
      await expect(mark(writer, "missing-" + uuid(), firstId))
        .rejects.toBeInstanceOf(AccountMissingError);
      expect(await readAt(firstId)).toBeNull();
      expect(await readAt(alreadyId)).toEqual(before);
    },
  );

  it.each(["unified", "legacy"] as const)(
    "%s state-first deactivation is observed before notification lock/update",
    async (writer) => {
      const x = await seed(), id = x.notices.reply;
      const connection = new Client({ connectionString: databaseUrl, options });
      await connection.connect();
      const paused = pauseQuery(connection, sql => /from "user" .*for no key update/i.test(sql));
      try {
        const pending = mark(writer, x.actorId, id, standalone(connection));
        await paused.observed;
        await deactivate(x.actorId);
        paused.resume();
        await expect(pending).rejects.toBeInstanceOf(AccountInactiveError);
        expect(await readAt(id)).toBeNull();
      } finally {
        paused.resume();
        paused.restore();
        await connection.end();
      }
    }, 30_000,
  );

  it.each(["unified", "legacy"] as const)(
    "%s writer-first already-read admission holds actor lock through COMMIT",
    async (writer) => {
      const x = await seed(), id = x.notices.reply;
      await mark(writer, x.actorId, id);
      const original = await readAt(id);
      const connection = new Client({ connectionString: databaseUrl, options });
      await connection.connect();
      const paused = pauseQuery(connection, sql => /^commit$/i.test(sql.trim()));
      let deactivationStarted = false;
      try {
        const pending = mark(writer, x.actorId, id, standalone(connection));
        await paused.observed;
        await fixture.query("begin");
        deactivationStarted = true;
        await fixture.query("set local lock_timeout = '180ms'");
        await expect(fixture.query('update "user" set deactivated_at=now(),'
          + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years' where id=$1",
        [x.actorId])).rejects.toMatchObject({ code: "55P03" });
        await fixture.query("rollback");
        deactivationStarted = false;
        paused.resume();
        await pending;
        expect(await readAt(id)).toEqual(original);
        await deactivate(x.actorId);
        await expect(mark(writer, x.actorId, id)).rejects.toBeInstanceOf(AccountInactiveError);
        expect(await readAt(id)).toEqual(original);
      } finally {
        paused.resume();
        paused.restore();
        if (deactivationStarted) await fixture.query("rollback");
        await connection.end();
      }
    }, 30_000,
  );
});
