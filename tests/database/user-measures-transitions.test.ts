import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { UserMeasureForbiddenError, UserMeasureConfigurationUnavailableError } from "../../db/user-measure-authority";
import {
  InvalidUserMeasureInputError, PostgresUserMeasuresRepository, UserMeasuresService,
  UserMeasureConflictError, UserMeasureNotFoundError,
} from "../../db/user-measures";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !["127.0.0.1", "localhost"].includes(new URL(databaseUrl).hostname)
  || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error("Disposable loopback *_test DB required");
}
const schema = "ap10_measure_transitions_test";
const client = new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
const pool = new Pool({ connectionString: databaseUrl, options: `-c search_path=${schema}`, max: 4 });
const measures = new UserMeasuresService(new PostgresUserMeasuresRepository(pool, "owner"));
const withoutOwner = new UserMeasuresService(new PostgresUserMeasuresRepository(pool, undefined));
const manage = "admin.users.blocks.manage";
const ordinary = "target";
const reason = "Repeated harassment after warning";
const active = "2032-01-01T00:00:00Z";
const futureWithOffset = "2033-02-01T15:20:00+02:00";
const create = (input: Partial<{
  id: string; actorId: string; targetUserId: string; reason: string;
  restrictions: string[]; expiresAt: string | null;
}> = {}) => measures.create({
  id: input.id ?? randomUUID(), actorId: input.actorId ?? "manager", targetUserId: input.targetUserId ?? ordinary,
  reason: input.reason ?? reason, restrictions: input.restrictions ?? ["replies.create"],
  expiresAt: input.expiresAt === undefined ? null : input.expiresAt,
});
const change = (measureId: string, expectedVersion: number, input: Partial<{
  operationId: string; actorId: string; reason: string; restrictions: string[];
  expiresAt: string | null;
}> = {}) => measures.change({
  measureId, operationId: input.operationId ?? randomUUID(), actorId: input.actorId ?? "manager",
  expectedVersion, reason: input.reason ?? "Updated after review",
  restrictions: input.restrictions ?? ["topics.create"], expiresAt: input.expiresAt === undefined ? null : input.expiresAt,
});
const lift = (measureId: string, expectedVersion: number, input: Partial<{
  operationId: string; actorId: string; reason: string;
}> = {}) => measures.lift({
  measureId, operationId: input.operationId ?? randomUUID(), actorId: input.actorId ?? "manager",
  expectedVersion, reason: input.reason ?? "Resolved", 
});
async function state(id: string) {
  const res = await client.query<{
    target_user_id: string; issuer_user_id: string; issuer_authority_floor: number;
    initial_reason: string; latest_change_reason: string | null;
    expires_at: Date | null; lifted_at: Date | null; version: number; lift_reason: string | null;
  }>("select * from user_measures where id=$1", [id]);
  return res.rows[0];
}
async function restrictions(id: string) {
  const res = await client.query<{ restriction_key: string }>(`select restriction_key
    from user_measure_restrictions where measure_id=$1 and enabled=true order by restriction_key`, [id]);
  return res.rows.map(x => x.restriction_key);
}
async function history(id?: string) {
  const result = await client.query<{
    action: string; context: { before: unknown; after: { version: number }; operationId?: string };
    reason: string; actor_id: string;
  }>(`select action, context, reason, actor_id from admin_history
    where target_type='user-measure' and ($1::text is null or target_id=$1)
    order by position`, [id ?? null]);
  return result.rows;
}
async function stopHistoryWrites() {
  await client.query(`create function ${schema}.reject_measure_history() returns trigger language plpgsql as $$
    begin if new.target_type='user-measure' then raise exception 'injected history failure';
      end if; return new; end $$`);
  await client.query(`create trigger reject_measure_history before insert on admin_history
    for each row execute function ${schema}.reject_measure_history()`);
}
async function restoreHistoryWrites() {
  await client.query("drop trigger if exists reject_measure_history on admin_history");
  await client.query(`drop function if exists ${schema}.reject_measure_history()`);
}

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const file of (await readdir("drizzle")).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort()) {
    await client.query((await readFile(`drizzle/${file}`, "utf8")).replaceAll('"public".', `"${schema}".`));
  }
  await client.query(`insert into "user"(id,name,email) values
    ('owner','Owner','owner-transition@example.invalid'),
    ('manager','Manager','manager-transition@example.invalid'),
    ('elevated','Elevated','elevated-transition@example.invalid'),
    ('privileged','Privileged','privileged-transition@example.invalid'),
    ('target','Target','target-transition@example.invalid'),
    ('other','Other','other-transition@example.invalid')`);
  await client.query(`insert into authz_user_roles(user_id,role_id) values
    ('owner','builtin-admin'),('manager','builtin-admin'),('privileged','builtin-moderator')`);
  await client.query(`insert into authz_user_permission_overrides(user_id,permission_key,effect) values
    ('owner',$1,'allow'),('manager',$1,'allow'),('elevated',$1,'allow'),
    ('elevated','admin.users.blocks.managePrivileged','allow')`, [manage]);
});
beforeEach(async () => {
  await restoreHistoryWrites();
  await client.query("delete from user_measure_appeals");
  await client.query("delete from user_measure_restrictions");
  await client.query("delete from user_measures");
  await client.query("delete from admin_history where target_type='user-measure'");
  await client.query("delete from authz_user_permission_overrides where user_id='manager' and permission_key=$1", [manage]);
  await client.query(`insert into authz_user_permission_overrides(user_id,permission_key,effect)
    values('manager',$1,'allow')`, [manage]);
});
afterAll(async () => {
  await pool.end();
  await client.query(`drop schema if exists ${schema} cascade`);
  await client.end();
});

describe("AP-10 atomic measure lifecycle (PostgreSQL 17)", () => {
  it("creates independent overlapping measures, commits ordered History, and handles identical create retry", async () => {
    const id = randomUUID();
    const first = await create({ id, restrictions: ["replies.create", "topics.create"], expiresAt: active });
    expect(first).toEqual({ id, version: 1 });
    const before = await history();
    expect(before).toHaveLength(1);
    expect(before[0]).toMatchObject({ action: "measure.created", actor_id: "manager", reason });
    expect(before[0].context.after.version).toBe(1);
    const replay = await create({ id, restrictions: ["topics.create", "replies.create"], expiresAt: active });
    expect(replay).toEqual(first);
    expect(await history()).toHaveLength(1);
    await expect(create({ id, reason: "Different reason" })).rejects.toBeInstanceOf(UserMeasureConflictError);
    const second = await create({ restrictions: ["replies.create"] });
    expect(second.id).not.toBe(id);
    expect((await restrictions(id))).toEqual(["replies.create", "topics.create"]);
    expect((await restrictions(second.id))).toEqual(["replies.create"]);
    expect(await history()).toHaveLength(2);
    expect((await state(id)).initial_reason).toBe(reason);
  });

  it("changes restrictions/expiry in-place with immutable original reason, CAS, no-op and exact replay", async () => {
    const { id } = await create();
    const operationId = randomUUID();
    const command = { operationId, reason: "Narrow scope", restrictions: ["attachments.upload", "profile.edit"],
      expiresAt: futureWithOffset };
    const result = await change(id, 1, command);
    expect(result).toEqual({ id, version: 2, changed: true });
    expect((await restrictions(id))).toEqual(["attachments.upload", "profile.edit"]);
    expect((await state(id)).expires_at?.toISOString()).toBe("2033-02-01T13:20:00.000Z");
    expect((await state(id)).initial_reason).toBe(reason);
    expect((await state(id)).latest_change_reason).toBe("Narrow scope");
    expect((await history(id)).map(x => x.action)).toEqual(["measure.created", "measure.changed"]);
    expect((await history(id))[1].context).toMatchObject({
      operationId, before: { version: 1 }, after: { version: 2 },
    });
    expect(await change(id, 1, command)).toEqual(result);
    expect(await history(id)).toHaveLength(2);
    await expect(change(id, 1, { ...command, operationId:randomUUID() })).rejects.toBeInstanceOf(UserMeasureConflictError);
    await expect(change(id, 1, { ...command, reason: "Tampered replay" })).rejects.toBeInstanceOf(UserMeasureConflictError);
    expect(await change(id, 2, { restrictions: command.restrictions, expiresAt: futureWithOffset }))
      .toEqual({ id, version: 2, changed: false });
    expect(await history(id)).toHaveLength(2);
    await change(id, 2, { restrictions: ["topics.create"], expiresAt:null });
    expect((await state(id)).version).toBe(3);
    expect(await change(id, 1, command)).toEqual(result);
    expect((await state(id)).version).toBe(3);
  });

  it("suspends pending appeals on explicit lift, never reopens a terminal measure, and preserves retry", async () => {
    const { id } = await create({ expiresAt:active });
    await client.query(`insert into user_measure_appeals(id,measure_id,subject_user_id,ordinal,body)
      values($1,$2,'target',1,'Please review')`, [randomUUID(), id]);
    const operationId = randomUUID();
    const outcome = await lift(id, 1, { operationId });
    expect(outcome).toEqual({ id, version:2, changed:true });
    expect((await state(id)).lift_reason).toBe("Resolved");
    expect((await state(id)).lifted_at).not.toBeNull();
    expect((await client.query("select status from user_measure_appeals where measure_id=$1", [id])).rows)
      .toEqual([{ status:"moot" }]);
    expect(await lift(id, 1, { operationId })).toEqual(outcome);
    await expect(lift(id, 2)).rejects.toBeInstanceOf(UserMeasureConflictError);
    await expect(change(id, 2, { expiresAt:active })).rejects.toBeInstanceOf(UserMeasureConflictError);
    expect((await history(id)).map(x=>x.action)).toEqual(["measure.created", "measure.lifted"]);
    const newer = await create({ expiresAt:active });
    expect(newer.id).not.toBe(id);
    expect((await state(newer.id)).version).toBe(1);
  });

  it("treats natural expiration as terminal using DB time, without a synthetic write", async () => {
    const { id } = await create({ expiresAt:active });
    await client.query("update user_measures set expires_at=clock_timestamp()-interval '1 second' where id=$1", [id]);
    const before = await history(id);
    await expect(change(id, 1, { expiresAt:"2035-01-01T00:00:00Z" }))
      .rejects.toBeInstanceOf(UserMeasureConflictError);
    await expect(lift(id, 1)).rejects.toBeInstanceOf(UserMeasureConflictError);
    expect((await state(id)).version).toBe(1);
    expect((await state(id)).lifted_at).toBeNull();
    expect(await history(id)).toEqual(before);
    const another = await create({ expiresAt:active });
    expect(another.id).not.toBe(id);
    // Replaying a committed create never revives or modifies its expired original.
    expect(await create({ id, expiresAt:active })).toEqual({ id, version:1 });
    expect((await state(id)).expires_at!.getTime()).toBeLessThan(Date.now());
    expect(await history(id)).toEqual(before);
  });

  it("requires fresh manage grant, owner binding and hierarchy; issuer floor survives later grants", async () => {
    await expect(withoutOwner.create({ id:randomUUID(), actorId:"manager",targetUserId:"target",
      reason, restrictions:["replies.create"], expiresAt:null }))
      .rejects.toBeInstanceOf(UserMeasureConfigurationUnavailableError);
    const id = randomUUID();
    await client.query("delete from authz_user_permission_overrides where user_id='manager' and permission_key=$1", [manage]);
    await expect(create({id})).rejects.toBeInstanceOf(UserMeasureForbiddenError);
    await client.query(`insert into authz_user_permission_overrides(user_id,permission_key,effect)
      values('manager',$1,'allow')`, [manage]);
    await expect(create({ targetUserId:"manager" })).rejects.toBeInstanceOf(UserMeasureForbiddenError);
    await expect(create({ targetUserId:"owner" })).rejects.toBeInstanceOf(UserMeasureForbiddenError);
    await expect(create({ targetUserId:"privileged" })).rejects.toBeInstanceOf(UserMeasureForbiddenError);
    await expect(create({ targetUserId:"missing" })).rejects.toBeInstanceOf(UserMeasureNotFoundError);
    const created = await create({ actorId:"elevated" });
    expect((await state(created.id)).issuer_authority_floor).toBe(2);
    await expect(change(created.id,1)).rejects.toBeInstanceOf(UserMeasureForbiddenError);
    await change(created.id,1,{actorId:"owner"});
    expect((await state(created.id)).issuer_authority_floor).toBe(3);
    await expect(lift(created.id,2,{actorId:"elevated"})).rejects.toBeInstanceOf(UserMeasureForbiddenError);
    await lift(created.id,2,{actorId:"owner"});
  });

  it("serializes concurrent CAS changes; one wins with exactly one new History event", async () => {
    const { id } = await create();
    const settled = await Promise.allSettled([
      change(id,1,{restrictions:["topics.create"]}),
      change(id,1,{restrictions:["profile.edit"]}),
    ]);
    expect(settled.filter(x=>x.status==="fulfilled")).toHaveLength(1);
    expect(settled.filter(x=>x.status==="rejected")).toHaveLength(1);
    expect((settled.find(x=>x.status==="rejected") as PromiseRejectedResult).reason)
      .toBeInstanceOf(UserMeasureConflictError);
    expect((await state(id)).version).toBe(2);
    expect(await history(id)).toHaveLength(2);
    expect(await restrictions(id)).toHaveLength(1);
  });

  it("rolls back failed create, change and lift on History failure without partial effects", async () => {
    const { id } = await create();
    const original = await state(id);
    const beforeRestrictions = await restrictions(id);
    const beforeHistory = await history();
    await stopHistoryWrites();
    try {
      const missing = randomUUID();
      await expect(create({ id:missing })).rejects.toThrow(/injected history failure/);
      expect(await state(missing)).toBeUndefined();
      await expect(change(id,1)).rejects.toThrow(/injected history failure/);
      await expect(lift(id,1)).rejects.toThrow(/injected history failure/);
      expect(await state(id)).toEqual(original);
      expect(await restrictions(id)).toEqual(beforeRestrictions);
      expect(await history()).toEqual(beforeHistory);
    } finally {
      await restoreHistoryWrites();
    }
  });

  it("denies invalid time/restriction/reason and rejects already expired create at DB admission", async () => {
    await expect(create({expiresAt:"2020-01-01T00:00:00Z"})).rejects.toBeInstanceOf(UserMeasureConflictError);
    await expect(create({reason:"  "})).rejects.toBeInstanceOf(InvalidUserMeasureInputError);
    await expect(create({restrictions:["unknown"]})).rejects.toBeInstanceOf(InvalidUserMeasureInputError);
    const {id} = await create();
    await expect(change(id,1,{expiresAt:"2020-01-01T00:00:00Z"}))
      .rejects.toBeInstanceOf(UserMeasureConflictError);
    expect((await state(id)).version).toBe(1);
    expect(await history(id)).toHaveLength(1);
  });
});


const submit = (measureId: string, input: { id?: string; actorId?: string; body?: string } = {}) =>
  measures.submitAppeal({
    id: input.id ?? randomUUID(), measureId,
    actorId: input.actorId ?? "target", body: input.body ?? "Please review this restriction",
  });
const decide = (
  measureId: string, appealId: string, expectedVersion: number,
  input: Partial<{
    operationId: string; actorId: string; outcome: "accepted" | "rejected";
    remedy: "change" | "lift" | null; explanation: string;
    restrictions: string[] | null; expiresAt: string | null;
  }> = {},
) => {
  const outcome = input.outcome ?? "rejected";
  const remedy = input.remedy === undefined ? null : input.remedy;
  return measures.resolveAppeal({
    measureId, appealId, expectedVersion, operationId: input.operationId ?? randomUUID(),
    actorId: input.actorId ?? "manager", outcome, remedy,
    explanation: input.explanation ?? "Reviewed with rationale",
    restrictions: input.restrictions === undefined ? null : input.restrictions,
    expiresAt: input.expiresAt === undefined ? null : input.expiresAt,
  });
};
async function appeals(measureId: string) {
  const result = await client.query<{
    id: string; ordinal: number; status: string; reviewer_user_id: string | null;
    reviewer_explanation: string | null; remedy: string | null;
  }>(
    "select id,ordinal,status,reviewer_user_id,reviewer_explanation,remedy from user_measure_appeals where measure_id=$1 order by ordinal",
    [measureId],
  );
  return result.rows;
}

describe("AP-10 own appeals and authoritative review (PostgreSQL 17)", () => {
  it("preserves exact-ID retries, per-measure pending gate and three sequential submissions", async () => {
    const a = await create();
    const b = await create({ restrictions: ["topics.create"] });
    const aid = randomUUID();
    const first = await submit(a.id, { id: aid, body: "First appeal" });
    expect(first).toEqual({ id: aid, measureId: a.id, ordinal: 1 });
    expect(await submit(a.id, { id: aid, body: "First appeal" })).toEqual(first);
    await expect(submit(a.id, { id: aid, body: "Changed body" }))
      .rejects.toBeInstanceOf(UserMeasureConflictError);
    await expect(submit(a.id)).rejects.toBeInstanceOf(UserMeasureConflictError);
    expect((await submit(b.id)).ordinal).toBe(1);
    expect((await appeals(a.id)).map(row => row.ordinal)).toEqual([1]);
    const accepted = await decide(a.id, aid, 1);
    expect(accepted).toEqual({
      appealId: aid, measureId: a.id, outcome: "rejected", version: 1, remedy: null,
    });
    const second = await submit(a.id);
    expect(second.ordinal).toBe(2);
    await decide(a.id, second.id, 1);
    const third = await submit(a.id);
    expect(third.ordinal).toBe(3);
    await decide(a.id, third.id, 1);
    await expect(submit(a.id)).rejects.toBeInstanceOf(UserMeasureConflictError);
    expect((await appeals(a.id)).map(row => row.status)).toEqual(["rejected", "rejected", "rejected"]);
    expect((await appeals(b.id)).map(row => row.status)).toEqual(["pending"]);
    expect((await history(a.id)).map(event => event.action))
      .toEqual(["measure.created", "measure.appealResolved", "measure.appealResolved", "measure.appealResolved"]);
    expect((await state(a.id)).version).toBe(1);
  });

  it("accepts a real change on the same measure, retaining pending across separate edits and quotas", async () => {
    const { id } = await create();
    const { id: appealId } = await submit(id);
    await change(id, 1, { restrictions: ["topics.create"] });
    const command = {
      operationId: randomUUID(), outcome: "accepted" as const, remedy: "change" as const,
      explanation: "A narrower restriction is appropriate",
      restrictions: ["profile.edit", "attachments.upload"], expiresAt: futureWithOffset,
    };
    await expect(decide(id, appealId, 1, command)).rejects.toBeInstanceOf(UserMeasureConflictError);
    expect((await appeals(id))[0].status).toBe("pending");
    const result = await decide(id, appealId, 2, command);
    expect(result).toEqual({ appealId, measureId:id, outcome:"accepted", version:3, remedy:"change" });
    expect((await state(id)).initial_reason).toBe(reason);
    expect((await state(id)).latest_change_reason).toBe(command.explanation);
    expect((await state(id)).expires_at?.toISOString()).toBe("2033-02-01T13:20:00.000Z");
    expect(await restrictions(id)).toEqual(["attachments.upload", "profile.edit"]);
    expect((await appeals(id))[0]).toMatchObject({
      status: "accepted", remedy: "change", reviewer_user_id: "manager",
      reviewer_explanation: command.explanation,
    });
    expect((await history(id)).map(event=>event.action))
      .toEqual(["measure.created", "measure.changed", "measure.appealResolved"]);
    const resolvedHistory = (await history(id))[2].context;
    expect(resolvedHistory).toMatchObject({
      appealId, outcome:"accepted", remedy:"change", before:{version:2}, after:{version:3},
    });
    expect(await decide(id, appealId, 2, command)).toEqual(result);
    await expect(decide(id, appealId, 2, { ...command, explanation: "Rewritten rationale" }))
      .rejects.toBeInstanceOf(UserMeasureConflictError);
    expect(await history(id)).toHaveLength(3);
    expect((await submit(id)).ordinal).toBe(2);
  });

  it("commits accepted lift without converting the accepted appeal to moot", async () => {
    const { id } = await create({ expiresAt:active });
    const { id: appealId } = await submit(id);
    const command = {
      operationId:randomUUID(), outcome:"accepted" as const, remedy:"lift" as const,
      explanation:"The restriction is no longer appropriate",
    };
    const result = await decide(id, appealId, 1, command);
    expect(result).toEqual({ appealId, measureId:id, outcome:"accepted", version:2, remedy:"lift" });
    expect((await appeals(id))[0]).toMatchObject({
      status:"accepted", remedy:"lift", reviewer_user_id:"manager",
    });
    expect((await state(id)).lift_reason).toBe(command.explanation);
    expect((await state(id)).lifted_at).not.toBeNull();
    expect((await history(id)).map(event=>event.action))
      .toEqual(["measure.created", "measure.appealResolved"]);
    expect(await decide(id, appealId, 1, command)).toEqual(result);
    await expect(submit(id)).rejects.toBeInstanceOf(UserMeasureConflictError);
    await expect(change(id, 2)).rejects.toBeInstanceOf(UserMeasureConflictError);
    const newMeasure = await create({ expiresAt:active });
    expect((await submit(newMeasure.id)).ordinal).toBe(1);
  });

  it("denies cross-user and cross-measure submissions and stale review while keeping other measures intact", async () => {
    const a = await create();
    const b = await create({ restrictions:["topics.create"] });
    await expect(submit(a.id, {actorId:"other"})).rejects.toBeInstanceOf(UserMeasureForbiddenError);
    await expect(submit(randomUUID())).rejects.toBeInstanceOf(UserMeasureNotFoundError);
    const appeal = await submit(a.id);
    await expect(decide(b.id, appeal.id, 1)).rejects.toBeInstanceOf(UserMeasureNotFoundError);
    await expect(decide(a.id, appeal.id, 1, {actorId:"target"}))
      .rejects.toBeInstanceOf(UserMeasureForbiddenError);
    expect((await appeals(a.id))[0].status).toBe("pending");
    expect(await appeals(b.id)).toEqual([]);
    await lift(b.id,1);
    expect((await state(a.id)).lifted_at).toBeNull();
    expect((await appeals(a.id))[0].status).toBe("pending");
  });

  it("treats expiry, explicit lift and concurrent review versus lift as terminal", async () => {
    const a = await create({ expiresAt:active });
    const first = await submit(a.id);
    await client.query("update user_measures set expires_at=clock_timestamp()-interval '1 second' where id=$1", [a.id]);
    await expect(decide(a.id, first.id, 1)).rejects.toBeInstanceOf(UserMeasureConflictError);
    await expect(submit(a.id)).rejects.toBeInstanceOf(UserMeasureConflictError);
    expect((await appeals(a.id))[0].status).toBe("pending"); // effective moot is read-derived
    expect((await history(a.id)).map(x=>x.action)).toEqual(["measure.created"]);

    const b = await create();
    const second = await submit(b.id);
    await lift(b.id,1);
    expect((await appeals(b.id))[0].status).toBe("moot");
    await expect(decide(b.id, second.id, 2)).rejects.toBeInstanceOf(UserMeasureConflictError);
    expect((await history(b.id)).map(x=>x.action)).toEqual(["measure.created", "measure.lifted"]);

    const c = await create();
    const third = await submit(c.id);
    const candidates = await Promise.allSettled([
      decide(c.id, third.id, 1, {outcome:"accepted", remedy:"lift"}),
      lift(c.id, 1),
    ]);
    expect(candidates.filter(x=>x.status==="fulfilled")).toHaveLength(1);
    expect(candidates.filter(x=>x.status==="rejected")).toHaveLength(1);
    expect((await state(c.id)).version).toBe(2);
    expect((await history(c.id))).toHaveLength(2);
    expect(["accepted","moot"]).toContain((await appeals(c.id))[0].status);
  });

  it("serializes two concurrent submissions without spending two quota slots", async () => {
    const { id } = await create();
    const submissions = await Promise.allSettled([submit(id),submit(id)]);
    expect(submissions.filter(x=>x.status==="fulfilled")).toHaveLength(1);
    expect(submissions.filter(x=>x.status==="rejected")).toHaveLength(1);
    expect((await appeals(id)).map(x=>x.ordinal)).toEqual([1]);
    const appeal = submissions.find(x=>x.status==="fulfilled") as PromiseFulfilledResult<{id:string;ordinal:number}>;
    expect((await submit(id, {id:appeal.value.id})).ordinal).toBe(1);
  });

  it("rolls back rejected and accepted remedies on History failure without partial appeal or measure effects", async () => {
    const { id } = await create();
    const pending = await submit(id);
    const priorHistory = await history(id);
    const priorMeasure = await state(id);
    const priorRestrictions = await restrictions(id);
    await stopHistoryWrites();
    try {
      await expect(decide(id, pending.id, 1)).rejects.toThrow(/injected history failure/);
      await expect(decide(id, pending.id, 1, {
        outcome:"accepted", remedy:"change", restrictions:["topics.create"],
      })).rejects.toThrow(/injected history failure/);
      await expect(decide(id, pending.id, 1, {
        outcome:"accepted", remedy:"lift",
      })).rejects.toThrow(/injected history failure/);
      expect((await appeals(id))[0].status).toBe("pending");
      expect(await state(id)).toEqual(priorMeasure);
      expect(await restrictions(id)).toEqual(priorRestrictions);
      expect(await history(id)).toEqual(priorHistory);
    } finally {
      await restoreHistoryWrites();
    }
    await decide(id, pending.id, 1);
    expect((await appeals(id))[0].status).toBe("rejected");
  });

  it("rejects no-op accepted change and honors revoked management grants and elevated issuer floor", async () => {
    const a = await create();
    const appeal = await submit(a.id);
    await expect(decide(a.id, appeal.id, 1, {
      outcome:"accepted",remedy:"change",restrictions:["replies.create"],
    })).rejects.toBeInstanceOf(UserMeasureConflictError);
    expect((await appeals(a.id))[0].status).toBe("pending");
    await client.query("delete from authz_user_permission_overrides where user_id='manager' and permission_key=$1", [manage]);
    await expect(decide(a.id, appeal.id, 1)).rejects.toBeInstanceOf(UserMeasureForbiddenError);
    await client.query("insert into authz_user_permission_overrides(user_id,permission_key,effect) values('manager',$1,'allow')", [manage]);
    const elevated = await create({actorId:"elevated"});
    const privilegedAppeal = await submit(elevated.id);
    await expect(decide(elevated.id,privilegedAppeal.id,1))
      .rejects.toBeInstanceOf(UserMeasureForbiddenError);
    await decide(elevated.id,privilegedAppeal.id,1,{actorId:"owner"});
    expect((await appeals(elevated.id))[0].status).toBe("rejected");
  });
});
