import { readFile, readdir } from "node:fs/promises";
import { Client, Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import { UserMeasureConflictError, PostgresUserMeasuresRepository, UserMeasuresService } from "../../db/user-measures";
import { UserMeasureForbiddenError } from "../../db/user-measure-authority";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA04-M1 needs disposable loopback PostgreSQL *_test");
}
const schema = "sa04_m1_measures_test";
const options = "-c search_path=" + schema + " -c lock_timeout=8s";
const fixture = new Client({ connectionString: url, options });
const pool = new Pool({ connectionString: url, options, max: 4 });
const uuid = () => crypto.randomUUID();
function service(owner: string | undefined, connectionPool: Pool = pool) {
  return new UserMeasuresService(new PostgresUserMeasuresRepository(connectionPool, owner));
}
function boundPool(client: Client): Pool {
  const handle = {
    query: (...args: unknown[]) => Reflect.apply(client.query, client, args),
    release: () => {},
  } as unknown as PoolClient;
  return { connect: async () => handle } as unknown as Pool;
}
async function connect(count = 1) {
  const clients = Array.from({ length: count }, () => new Client({ connectionString: url, options }));
  await Promise.all(clients.map(client => client.connect()));
  return clients;
}
async function user() {
  const id = "m1-" + uuid();
  await fixture.query('insert into "user"(id,name,email) values($1,$2,$3)',
    [id, "M1 account", id + "@test.invalid"]);
  return id;
}
async function participants() {
  return { owner: await user(), target: await user(), other: await user() };
}
async function deactivate(actor: string) {
  const result = await fixture.query(
    'update "user" set deactivated_at=clock_timestamp(),deactivated_by_user_id=$1,'
    + "retain_at_least_until=now()+interval '2 years'"
    + " where id=$1 and deactivated_at is null returning id", [actor]);
  expect(result.rows).toEqual([{ id: actor }]);
}
function create(measures: UserMeasuresService, actorId: string, targetUserId: string, id = uuid()) {
  return measures.create({ id, actorId, targetUserId, reason: "M1 initial admission",
    restrictions: ["topics.create"], expiresAt: null });
}
function change(measures: UserMeasuresService, actorId: string, measureId: string, operationId = uuid(),
  expectedVersion = 1, restrictions = ["replies.create"]) {
  return measures.change({ measureId, operationId, actorId, expectedVersion,
    reason: "M1 permitted transition", restrictions, expiresAt: null });
}
function lift(measures: UserMeasuresService, actorId: string, measureId: string, operationId = uuid(),
  expectedVersion = 1) {
  return measures.lift({ measureId, operationId, actorId, expectedVersion,
    reason: "M1 lift after review" });
}
function appeal(measures: UserMeasuresService, actorId: string, measureId: string, id = uuid()) {
  return measures.submitAppeal({ id, measureId, actorId, body: "M1 review please" });
}
function review(measures: UserMeasuresService, actorId: string, measureId: string, appealId: string,
  operationId = uuid(), expectedVersion = 1, outcome: "rejected" | "accepted" = "rejected") {
  return measures.resolveAppeal({
    actorId, measureId, appealId, operationId, expectedVersion, outcome,
    explanation: "M1 decision after examination", remedy: outcome === "accepted" ? "lift" : null,
    restrictions: null, expiresAt: null,
  });
}
async function facts() {
  const [m, r, a, h] = await Promise.all([
    fixture.query("select * from user_measures order by id"),
    fixture.query("select * from user_measure_restrictions order by measure_id,restriction_key"),
    fixture.query("select * from user_measure_appeals order by measure_id,ordinal"),
    fixture.query("select * from admin_history where target_type='user-measure' order by position"),
  ]);
  return { measures: m.rows, restrictions: r.rows, appeals: a.rows, history: h.rows };
}
function sqlText(v: unknown): string {
  return typeof v === "string" ? v
    : v && typeof v === "object" && "text" in v && typeof v.text === "string" ? v.text : "";
}
function pauseBefore(client: Client, matches: (sql: string) => boolean) {
  const original = client.query;
  let notify!: () => void, release!: () => void;
  const observed = new Promise<void>(resolve => { notify = resolve; });
  const resumed = new Promise<void>(resolve => { release = resolve; });
  let used = false;
  client.query = ((...args: unknown[]) => {
    if (!used && matches(sqlText(args[0]))) {
      used = true; notify();
      return resumed.then(() => Reflect.apply(original, client, args));
    }
    return Reflect.apply(original, client, args);
  }) as typeof client.query;
  return { observed, resume: release, restore: () => { client.query = original; } };
}
async function pid(client: Client) {
  return (await client.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]!.pid;
}
async function isBlockedBy(waiter: number, blocker: number) {
  for (let i = 0; i < 220; i++) {
    await fixture.query("select pg_stat_clear_snapshot()");
    const { rows } = await fixture.query<{ blockers: number[] }>(
      "select pg_blocking_pids($1) as blockers", [waiter]);
    if (rows[0]?.blockers.includes(blocker)) return;
    await new Promise(resolve => setTimeout(resolve, 15));
  }
  throw new Error("M1 expected an actual PostgreSQL blocking dependency");
}

beforeAll(async () => {
  await fixture.connect();
  await fixture.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const name of (await readdir("drizzle")).filter(x => /^\d{4}_.+\.sql$/u.test(x)).sort()) {
    await fixture.query((await readFile("drizzle/" + name, "utf8"))
      .replaceAll('"public".', '"' + schema + '".'));
  }
});
afterAll(async () => {
  await pool.end();
  await fixture.query("drop schema if exists " + schema + " cascade");
  await fixture.end();
});

describe("SA04-M1 native five-writer AccountState admission and replay", () => {
  it("preserves active create/change/no-op/lift/own-appeal/review and exact terminal replays", async () => {
    const { owner, target } = await participants();
    const measures = service(owner);
    const own = service(undefined);
    const id = uuid(), changeId = uuid(), liftId = uuid(), appealId = uuid(), resolveId = uuid();
    const before = await facts();
    expect(await create(measures, owner, target, id)).toEqual({ id, version: 1 });
    expect(await change(measures, owner, id, uuid(), 1, ["topics.create"]))
      .toEqual({ id, version: 1, changed: false });
    expect(await appeal(own, target, id, appealId))
      .toEqual({ id: appealId, measureId: id, ordinal: 1 });
    expect(await review(measures, owner, id, appealId, resolveId))
      .toEqual({ appealId, measureId: id, outcome: "rejected", version: 1, remedy: null });
    expect(await change(measures, owner, id, changeId)).toEqual({ id, version: 2, changed: true });
    expect(await lift(measures, owner, id, liftId, 2)).toEqual({ id, version: 3, changed: true });
    const finished = await facts();
    expect(finished.history.length - before.history.length).toBe(4);
    expect(finished.measures.length - before.measures.length).toBe(1);
    expect(finished.appeals.length - before.appeals.length).toBe(1);
    expect(await create(measures, owner, target, id)).toEqual({ id, version: 1 });
    expect(await change(measures, owner, id, changeId)).toEqual({ id, version: 2, changed: true });
    expect(await lift(measures, owner, id, liftId, 2)).toEqual({ id, version: 3, changed: true });
    expect(await appeal(own, target, id, appealId)).toEqual({ id: appealId, measureId: id, ordinal: 1 });
    expect(await review(measures, owner, id, appealId, resolveId))
      .toEqual({ appealId, measureId: id, outcome: "rejected", version: 1, remedy: null });
    expect(await facts()).toEqual(finished);
    await expect(change(measures, owner, id, uuid(), 3)).rejects.toBeInstanceOf(UserMeasureConflictError);
    expect(await facts()).toEqual(finished);
  }, 30_000);

  it("denies all five inactive/missing writers BEFORE replay/no-op, even when the measure terminated", async () => {
    const { owner, target, other } = await participants();
    const measures = service(owner), own = service(undefined);
    const id = uuid(), appealId = uuid(), operationId = uuid(), liftedId = uuid();
    await create(measures, owner, target, id);
    await appeal(own, target, id, appealId);
    await review(measures, owner, id, appealId, operationId);
    await lift(measures, owner, id, liftedId);
    const before = await facts();
    await deactivate(owner);
    const ownerAttempts = [
      () => create(measures, owner, target, id), // committed create replay
      () => change(measures, owner, id, uuid(), 2, ["topics.create"]), // terminated
      () => lift(measures, owner, id, liftedId), // committed lift replay
      () => review(measures, owner, id, appealId, operationId), // committed review replay
    ];
    for (const attempt of ownerAttempts) {
      await expect(attempt()).rejects.toBeInstanceOf(AccountInactiveError);
      expect(await facts()).toEqual(before);
    }
    await deactivate(target);
    await expect(appeal(own, target, id, appealId)).rejects.toBeInstanceOf(AccountInactiveError);
    expect(await facts()).toEqual(before);

    const missing = "m1-missing-" + uuid(), missingService = service(owner);
    const missingAttempts = [
      () => create(missingService, missing, other),
      () => change(missingService, missing, id),
      () => lift(missingService, missing, id),
      () => appeal(own, missing, id, appealId),
      () => review(missingService, missing, id, appealId),
    ];
    for (const attempt of missingAttempts) {
      await expect(attempt()).rejects.toBeInstanceOf(AccountMissingError);
      expect(await facts()).toEqual(before);
    }
  }, 30_000);

  it("active Owner can manage inactive target but never Owner/self; active subject appeal has no Owner-binding requirement", async () => {
    const { owner, target, other } = await participants();
    const measures = service(owner);
    await deactivate(target);
    const created = await create(measures, owner, target);
    expect(created.version).toBe(1);
    await expect(create(measures, owner, owner)).rejects.toBeInstanceOf(UserMeasureForbiddenError);
    const withoutOwner = service(undefined);
    await expect(create(withoutOwner, owner, other)).rejects.toMatchObject({
      name: "UserMeasureConfigurationUnavailableError",
    });
    const second = await create(measures, owner, other);
    expect(await appeal(withoutOwner, other, second.id)).toMatchObject({ ordinal: 1 });
  }, 30_000);

  it.each(["create", "subject-appeal"] as const)(
    "state-first deactivation before shared actor NKU denies delayed %s without durable side effects", async kind => {
      const { owner, target } = await participants();
      const seed = service(owner);
      const existing = kind === "subject-appeal" ? await create(seed, owner, target) : undefined;
      const actor = kind === "create" ? owner : target;
      const before = await facts();
      const [client] = await connect();
      const store = service(kind === "create" ? owner : undefined, boundPool(client!));
      const pause = pauseBefore(client!, q => /from "user"[\s\S]*for no key update/iu.test(q));
      let pending: Promise<unknown> | undefined;
      try {
        pending = kind === "create" ? create(store, owner, target)
          : appeal(store, target, existing!.id);
        void pending.catch(() => undefined);
        await pause.observed;
        await deactivate(actor);
        pause.resume();
        await expect(pending).rejects.toBeInstanceOf(AccountInactiveError);
        expect(await facts()).toEqual(before);
      } finally {
        pause.resume(); pause.restore();
        if (pending) await Promise.allSettled([pending]);
        await client!.end();
      }
    }, 30_000,
  );

  it("writer-first holds actor NKU until COMMIT, next replay is denied after deactivation", async () => {
    const { owner, target } = await participants();
    const [writeClient, stateClient] = await connect(2);
    const store = service(owner, boundPool(writeClient!));
    const createId = uuid();
    const pause = pauseBefore(writeClient!, q => /^commit$/iu.test(q.trim()));
    let pending: Promise<unknown> | undefined, transaction = false;
    try {
      const before = await facts();
      pending = create(store, owner, target, createId);
      void pending.catch(() => undefined);
      await pause.observed;
      expect(await facts()).toEqual(before);
      await stateClient!.query("begin"); transaction = true;
      await stateClient!.query("set local lock_timeout='200ms'");
      await expect(stateClient!.query('update "user" set deactivated_at=now(),'
        + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years'"
        + " where id=$1", [owner])).rejects.toMatchObject({ code: "55P03" });
      await stateClient!.query("rollback"); transaction = false;
      pause.resume();
      await expect(pending).resolves.toEqual({ id: createId, version: 1 });
      await deactivate(owner);
      const finished = await facts();
      await expect(create(store, owner, target, createId)).rejects.toBeInstanceOf(AccountInactiveError);
      expect(await facts()).toEqual(finished);
    } finally {
      pause.resume(); pause.restore();
      if (transaction) await stateClient!.query("rollback");
      if (pending) await Promise.allSettled([pending]);
      await Promise.all([writeClient!.end(), stateClient!.end()]);
    }
  }, 30_000);

  it.each(["create", "subject-appeal"] as const)(
    "waiting on real authz mutex rechecks actor state after deactivation: %s", async kind => {
      const { owner, target } = await participants();
      const prepared = kind === "subject-appeal"
        ? await create(service(owner), owner, target) : undefined;
      const actor = kind === "create" ? owner : target;
      const before = await facts();
      const [locker, waiter] = await connect(2);
      const lockerPid = await pid(locker!), waiterPid = await pid(waiter!);
      let tx = false, pending: Promise<unknown> | undefined;
      try {
        await locker!.query("begin"); tx = true;
        await locker!.query("select id from authz_mutation_lock where id=1 for update");
        const store = service(kind === "create" ? owner : undefined, boundPool(waiter!));
        pending = kind === "create" ? create(store, owner, target)
          : appeal(store, target, prepared!.id);
        void pending.catch(() => undefined);
        await isBlockedBy(waiterPid, lockerPid);
        await deactivate(actor);
        await locker!.query("commit"); tx = false;
        await expect(pending).rejects.toBeInstanceOf(AccountInactiveError);
        expect(await facts()).toEqual(before);
      } finally {
        if (tx) await locker!.query("rollback");
        if (pending) await Promise.allSettled([pending]);
        await Promise.all([locker!.end(), waiter!.end()]);
      }
    }, 30_000,
  );

  it("injected native History failure rolls back measure + restrictions and releases actor row lock", async () => {
    const { owner, target } = await participants(), id = uuid();
    const before = await facts();
    await fixture.query("create function m1_history_abort() returns trigger language plpgsql as $$"
      + " begin if new.target_type='user-measure' then raise exception 'm1 history fault';"
      + " end if; return new; end $$");
    await fixture.query("create trigger m1_history_abort before insert on admin_history"
      + " for each row execute function m1_history_abort()");
    try {
      await expect(create(service(owner), owner, target, id)).rejects.toThrow("m1 history fault");
      expect(await facts()).toEqual(before);
      await deactivate(owner);
      await expect(create(service(owner), owner, target, id)).rejects.toBeInstanceOf(AccountInactiveError);
    } finally {
      await fixture.query("drop trigger if exists m1_history_abort on admin_history");
      await fixture.query("drop function if exists m1_history_abort()");
    }
  }, 30_000);
});
