import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError } from "../../db/account-state";
import { PostgresAuthorizationRepository } from "../../db/authorization-repository";
import { DrizzleUserPrivacyRepository } from "../../db/user-privacy";
import { PostgresUserMeasuresRepository, UserMeasuresService } from "../../db/user-measures";

const url = process.env.DATABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA04-L2 requires disposable loopback *_test PostgreSQL");
}

const schema = "sa04_l_race_test";
const options = "-c search_path=" + schema + " -c lock_timeout=8s";
const fixture = new Client({ connectionString: url, options });
const uuid = () => crypto.randomUUID();
const noMeasures = async () => {};

function connection() {
  return new Client({ connectionString: url, options });
}
async function connections(count: number): Promise<Client[]> {
  const list = Array.from({ length: count }, connection);
  await Promise.all(list.map(c => c.connect()));
  return list;
}
function boundPool(client: Client): Pool {
  // Only transaction checkout is adapted: every SQL statement reaches the real
  // connected PostgreSQL backend and release never changes the owner of it.
  const handle = { query: (...args: unknown[]) => Reflect.apply(client.query, client, args),
    release: () => {} } as unknown as PoolClient;
  return { connect: async () => handle } as unknown as Pool;
}
function writer(client: Client, owner: string) {
  return new PostgresAuthorizationRepository(boundPool(client), owner, noMeasures);
}
function measures(client: Client, owner: string) {
  return new UserMeasuresService(new PostgresUserMeasuresRepository(boundPool(client), owner));
}
async function createUser() {
  const id = "l2-" + uuid();
  await fixture.query('insert into "user"(id,name,email) values($1,$2,$3)',
    [id, "L2 " + id, id + "@test.invalid"]);
  return id;
}
async function deactivate(actor: string) {
  const { rows } = await fixture.query('update "user" set deactivated_at=now(),'
    + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years'"
    + " where id=$1 and deactivated_at is null returning id", [actor]);
  expect(rows).toEqual([{ id: actor }]);
}
function roleInput() {
  return { id: uuid(), slug: "l2-" + uuid().slice(0, 10), displayName: "L2 role" };
}
async function facts(actor: string) {
  const result = await fixture.query(
    "select (select count(*)::int from authz_roles where not is_system) as roles,"
    + " (select count(*)::int from admin_history where actor_id=$1) as history,"
    + " (select count(*)::int from user_measures where issuer_user_id=$1) as measures",
    [actor],
  );
  return result.rows[0] as { roles: number; history: number; measures: number };
}
function nativeSql(value: unknown): string {
  return typeof value === "string" ? value
    : value && typeof value === "object" && "text" in value
      && typeof value.text === "string" ? value.text : "";
}
function pauseBefore(client: Client, matches: (sql: string) => boolean) {
  const original = client.query;
  let entered!: () => void, release!: () => void;
  const observed = new Promise<void>(resolve => { entered = resolve; });
  const resumeSignal = new Promise<void>(resolve => { release = resolve; });
  let triggered = false;
  client.query = ((...args: unknown[]) => {
    if (!triggered && matches(nativeSql(args[0]))) {
      triggered = true;
      entered();
      return resumeSignal.then(() => Reflect.apply(original, client, args));
    }
    return Reflect.apply(original, client, args);
  }) as typeof client.query;
  return { observed, resume: release, restore: () => { client.query = original; },
    get triggered() { return triggered; } };
}
async function pid(client: Client): Promise<number> {
  const { rows } = await client.query<{ pid: number }>("select pg_backend_pid() as pid");
  return rows[0]!.pid;
}
async function physicallyBlocked(waiter: number, blocker: number): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt++) {
    await fixture.query("select pg_stat_clear_snapshot()");
    const { rows } = await fixture.query<{ blockers: number[] }>(
      "select pg_blocking_pids($1) as blockers", [waiter]);
    if (rows[0]?.blockers.includes(blocker)) return;
    await new Promise(resolve => setTimeout(resolve, 15));
  }
  throw new Error("L2 expected a real pg_blocking_pids lock dependency");
}
function createMeasure(service: UserMeasuresService, actor: string, target: string) {
  return service.create({
    id: uuid(), actorId: actor, targetUserId: target,
    reason: "SA04-L2 shared mutex acceptance", restrictions: ["topics.create"], expiresAt: null,
  });
}

beforeAll(async () => {
  await fixture.connect();
  await fixture.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const file of (await readdir("drizzle")).filter(name => /^\d{4}_.+\.sql$/u.test(name)).sort()) {
    await fixture.query((await readFile("drizzle/" + file, "utf8"))
      .replaceAll('"public".', '"' + schema + '".'));
  }
});
afterAll(async () => {
  await fixture.query("drop schema if exists " + schema + " cascade");
  await fixture.end();
});

describe("SA04-L2 real PostgreSQL authorization lock and rollback matrix", () => {
  it.each(["fresh", "no-op"] as const)(
    "state-first deactivation defeats delayed %s admission after the authz mutex", async kind => {
      const actor = await createUser();
      const [client] = await connections(1);
      const store = writer(client!, actor);
      const role = roleInput();
      if (kind === "no-op") await store.createCustomRole(actor, role);
      const before = await facts(actor);
      const paused = pauseBefore(client!, sql =>
        /from "user"[\s\S]*for no key update/iu.test(sql));
      let pending: Promise<void> | undefined;
      try {
        pending = kind === "fresh"
          ? store.createCustomRole(actor, role)
          : store.renameCustomRole(actor, role.id, { displayName: role.displayName });
        void pending.catch(() => undefined);
        await paused.observed;
        await deactivate(actor);
        paused.resume();
        await expect(pending).rejects.toBeInstanceOf(AccountInactiveError);
        expect(await facts(actor)).toEqual(before);
      } finally {
        paused.resume(); paused.restore();
        if (pending) await Promise.allSettled([pending]);
        await client!.end();
      }
    }, 30_000,
  );

  it("writer-first retains actor NKU through History and COMMIT, then rejects later replay", async () => {
    const actor = await createUser(), role = roleInput();
    const [writerClient, stateClient] = await connections(2);
    const store = writer(writerClient!, actor), pause = pauseBefore(writerClient!, sql =>
      /^commit$/iu.test(sql.trim()));
    let pending: Promise<void> | undefined, tx = false;
    try {
      pending = store.createCustomRole(actor, role);
      void pending.catch(() => undefined);
      await pause.observed;
      const before = await facts(actor);
      expect(before.history).toBe(0);
      await stateClient!.query("begin"); tx = true;
      await stateClient!.query("set local lock_timeout='200ms'");
      await expect(stateClient!.query('update "user" set deactivated_at=now(),'
        + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years'"
        + " where id=$1", [actor])).rejects.toMatchObject({ code: "55P03" });
      await stateClient!.query("rollback"); tx = false;
      pause.resume();
      await pending;
      expect(await facts(actor)).toEqual({ roles: before.roles + 1, history: 1, measures: 0 });
      await deactivate(actor);
      await expect(store.renameCustomRole(actor, role.id, { displayName: role.displayName }))
        .rejects.toBeInstanceOf(AccountInactiveError);
      expect(await facts(actor)).toEqual({ roles: before.roles + 1, history: 1, measures: 0 });
    } finally {
      pause.resume(); pause.restore();
      if (tx) await stateClient!.query("rollback");
      if (pending) await Promise.allSettled([pending]);
      await Promise.all([writerClient!.end(), stateClient!.end()]);
    }
  }, 30_000);

  it("a writer waiting on the shared authz mutex sees state committed before release", async () => {
    const actor = await createUser(), role = roleInput();
    const [blocker, contender] = await connections(2);
    const blockerPid = await pid(blocker!), contenderPid = await pid(contender!);
    const before = await facts(actor);
    let tx = false, pending: Promise<void> | undefined;
    try {
      await blocker!.query("begin"); tx = true;
      await blocker!.query("select id from authz_mutation_lock where id=1 for update");
      pending = writer(contender!, actor).createCustomRole(actor, role);
      void pending.catch(() => undefined);
      await physicallyBlocked(contenderPid, blockerPid);
      await deactivate(actor);
      await blocker!.query("commit"); tx = false;
      await expect(pending).rejects.toBeInstanceOf(AccountInactiveError);
      expect(await facts(actor)).toEqual(before);
    } finally {
      if (tx) await blocker!.query("rollback");
      if (pending) await Promise.allSettled([pending]);
      await Promise.all([blocker!.end(), contender!.end()]);
    }
  }, 30_000);

  it("a real failed History INSERT rolls back the authorization write and releases actor NKU", async () => {
    const actor = await createUser(), role = roleInput();
    // Trigger remains strictly scoped to the disposable isolated schema.
    const rolePool = new Pool({ connectionString: url, options, max: 2 });
    const actual = new PostgresAuthorizationRepository(rolePool, actor, noMeasures);
    const before = await facts(actor);
    try {
      await fixture.query("create function l2_fail_history() returns trigger language plpgsql as $$"
        + " begin raise exception 'SA04-L2 rollback probe'; end $$");
      await fixture.query("create trigger l2_history_abort before insert on admin_history"
        + " for each row execute function l2_fail_history()");
      await expect(actual.createCustomRole(actor, role)).rejects.toThrow("SA04-L2 rollback probe");
      expect(await facts(actor)).toEqual(before);
      // A post-ROLLBACK lifecycle UPDATE proves the failed writer released its row lock.
      await deactivate(actor);
      await expect(actual.createCustomRole(actor, role)).rejects.toBeInstanceOf(AccountInactiveError);
    } finally {
      await fixture.query("drop trigger if exists l2_history_abort on admin_history");
      await fixture.query("drop function if exists l2_fail_history()");
      await rolePool.end();
    }
  }, 30_000);

  it.each(["M-first", "L-first"] as const)(
    "L and existing AP10 measure writer physically share the authz mutex: %s", async order => {
      const actor = await createUser(), target = await createUser(), role = roleInput();
      const [lClient, mClient] = await connections(2);
      const l = writer(lClient!, actor), m = measures(mClient!, actor);
      const firstClient = order === "L-first" ? lClient! : mClient!;
      const secondClient = order === "L-first" ? mClient! : lClient!;
      const firstPid = await pid(firstClient), secondPid = await pid(secondClient);
      const before = await facts(actor);
      const paused = pauseBefore(firstClient, sql => /^commit$/iu.test(sql.trim()));
      let first: Promise<unknown> | undefined, second: Promise<unknown> | undefined;
      try {
        first = order === "L-first" ? l.createCustomRole(actor, role) : createMeasure(m, actor, target);
        void first.catch(() => undefined);
        await paused.observed;
        second = order === "L-first" ? createMeasure(m, actor, target) : l.createCustomRole(actor, role);
        void second.catch(() => undefined);
        await physicallyBlocked(secondPid, firstPid);
        paused.resume();
        await Promise.all([first, second]);
        expect(await facts(actor)).toEqual({ roles: before.roles + 1, history: 2, measures: 1 });
      } finally {
        paused.resume(); paused.restore();
        if (first) await Promise.allSettled([first]);
        if (second) await Promise.allSettled([second]);
        await Promise.all([lClient!.end(), mClient!.end()]);
      }
    }, 30_000,
  );

  it.each(["privacy-first", "L-first"] as const)(
    "L and actual Privacy save serialize on the actor row: %s", async order => {
      const actor = await createUser(), role = roleInput();
      const [lClient, pClient] = await connections(2);
      const l = writer(lClient!, actor);
      const privacy = new DrizzleUserPrivacyRepository(drizzle(pClient!));
      const firstClient = order === "L-first" ? lClient! : pClient!;
      const secondClient = order === "L-first" ? pClient! : lClient!;
      const paused = pauseBefore(firstClient, sql => /^commit$/iu.test(sql.trim()));
      const firstPid = await pid(firstClient), secondPid = await pid(secondClient);
      const before = await facts(actor);
      let first: Promise<unknown> | undefined, second: Promise<unknown> | undefined;
      try {
        first = order === "L-first" ? l.createCustomRole(actor, role) : privacy.save(actor, false);
        void first.catch(() => undefined);
        await paused.observed;
        second = order === "L-first" ? privacy.save(actor, false) : l.createCustomRole(actor, role);
        void second.catch(() => undefined);
        await physicallyBlocked(secondPid, firstPid);
        paused.resume();
        await Promise.all([first, second]);
        expect(await privacy.read(actor)).toBe(false);
        expect(await facts(actor)).toEqual({ roles: before.roles + 1, history: 1, measures: 0 });
      } finally {
        paused.resume(); paused.restore();
        if (first) await Promise.allSettled([first]);
        if (second) await Promise.allSettled([second]);
        await Promise.all([lClient!.end(), pClient!.end()]);
      }
    }, 30_000,
  );

  it("L actor NKU blocks same-actor locale UPDATE but not FK KEY SHARE or unrelated account work", async () => {
    const actor = await createUser(), unrelated = await createUser(), role = roleInput();
    const [lClient, localeClient, reader] = await connections(3);
    const l = writer(lClient!, actor);
    const paused = pauseBefore(lClient!, sql => /^commit$/iu.test(sql.trim()));
    const lPid = await pid(lClient!), localePid = await pid(localeClient!);
    const before = await facts(actor);
    let pending: Promise<unknown> | undefined, update: Promise<unknown> | undefined;
    try {
      pending = l.createCustomRole(actor, role);
      void pending.catch(() => undefined);
      await paused.observed;
      // KEY SHARE (used by role/History FK references) must remain compatible with actor NKU.
      await reader!.query("begin");
      await reader!.query("set local lock_timeout='300ms'");
      expect((await reader!.query('select id from "user" where id=$1 for key share', [actor]))
        .rows).toEqual([{ id: actor }]);
      await reader!.query("rollback");

      // A different user's locale command is not serialized by the Owner's actor row.
      const other = await reader!.query('update "user" set locale=$2,updated_at=now() where id=$1 returning id',
        [unrelated, "ru"]);
      expect(other.rows).toEqual([{ id: unrelated }]);
      update = localeClient!.query(
        'update "user" set locale=$2,updated_at=now() where id=$1 returning id', [actor, "he"],
      );
      void update.catch(() => undefined);
      await physicallyBlocked(localePid, lPid);
      paused.resume();
      await Promise.all([pending, update]);
      const state = await fixture.query<{ locale: string }>('select locale from "user" where id=$1', [actor]);
      expect(state.rows[0]?.locale).toBe("he");
      expect(await facts(actor)).toEqual({ roles: before.roles + 1, history: 1, measures: 0 });
    } finally {
      paused.resume(); paused.restore();
      if (pending) await Promise.allSettled([pending]);
      if (update) await Promise.allSettled([update]);
      await Promise.all([lClient!.end(), localeClient!.end(), reader!.end()]);
    }
  }, 30_000);

  it("active Owner may mutate inactive target; self-target KEY SHARE remains compatible with actor NKU", async () => {
    const actor = await createUser(), target = await createUser(), role = roleInput();
    const [client] = await connections(1);
    const before = await facts(actor);
    try {
      await deactivate(target);
      const l = writer(client!, actor);
      await l.createCustomRole(actor, role);
      await l.assignUserRole(actor, target, role.id);
      await l.setUserOverride(actor, target, "forum.topic.pin", "deny");
      await l.assignUserRole(actor, actor, role.id);
      await l.setUserOverride(actor, actor, "access.authorization.manage", "deny");
      const rows = await fixture.query<{ effect: string }>(
        "select effect from authz_user_permission_overrides where user_id=$1"
        + " and permission_key='forum.topic.pin'", [target]);
      expect(rows.rows).toEqual([{ effect: "deny" }]);
      expect(await facts(actor)).toEqual({ roles: before.roles + 1, history: 5, measures: 0 });
      // The Owner's effective authority still works with a raw self-deny.
      await l.renameCustomRole(actor, role.id, { displayName: "Retained authority" });
      expect(await facts(actor)).toEqual({ roles: before.roles + 1, history: 6, measures: 0 });
    } finally {
      await client!.end();
    }
  }, 30_000);
});
