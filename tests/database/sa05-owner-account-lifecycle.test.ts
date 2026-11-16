import { readdir, readFile } from "node:fs/promises";
import { Client, Pool, type PoolClient, type QueryResult } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { DrizzleForumRepository } from "../../db/forum-repository";
import { DrizzleUserPrivacyRepository } from "../../db/user-privacy";
import { createHyperdriveUserLocale } from "../../db/hyperdrive-user-locale";
import { AccountInactiveError, AccountMissingError, assertActiveAccountForMutation } from "../../db/account-state";
import { createHyperdriveOwnerAccountLifecycle, OwnerAccountLifecycleUnavailableError } from "../../db/hyperdrive-owner-account-lifecycle";
import { PostgresOwnerAccountLifecycleCommand, OwnerAccountLifecycleCommitUncertainError,
  OwnerAccountLifecycleConflictError, OwnerAccountLifecycleForbiddenError, OwnerAccountLifecycleInvariantError,
  OwnerAccountLifecycleTargetMissingError, OwnerAccountLifecycleValidationError } from "../../db/owner-account-lifecycle";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) throw new Error("Disposable loopback *_test PostgreSQL required");
const schema = "sa05_owner_account_lifecycle_test", options = "-c search_path=" + schema;
const fixture = new Client({ connectionString: url, options });
const pool = new Pool({ connectionString: url, options, max: 12 });
const ownedPools: Pool[] = [];
const uuid = () => crypto.randomUUID();
const runtimeRole = "sa05_command_test_" + uuid().slice(0, 8);
type Hook = (sql: string, run: (replacement?: string) => Promise<QueryResult>, client: PoolClient) => Promise<QueryResult>;
function ownPool(hook?: Hook): Pool {
  const created = new Pool({ connectionString: url, options, max: 4 }); ownedPools.push(created);
  if (hook) {
    const connect = created.connect.bind(created);
    created.connect = (async () => {
      const client = await connect(), query = client.query, release = client.release.bind(client);
      client.query = ((...args: unknown[]) => {
        const text = typeof args[0] === "string" ? args[0] : String((args[0] as { text: string }).text);
        return hook(text, replacement => Reflect.apply(query, client,
          replacement === undefined ? args : [replacement, ...args.slice(1)]) as Promise<QueryResult>, client);
      }) as typeof client.query;
      client.release = destroy => { client.query = query; release(destroy); };
      return client;
    }) as typeof created.connect;
  }
  return created;
}
const command = (owner: unknown, source: Pool = pool) => new PostgresOwnerAccountLifecycleCommand(source, owner);
const input = (owner: string, target: string, operationId = uuid()) => ({ actorId: owner, targetId: target, operationId });
async function person(id = "sa05-" + uuid()): Promise<string> {
  await fixture.query('insert into "user"(id,name,email) values($1,$2,$3)', [id, "Retained " + id, uuid() + "@test.invalid"]);
  return id;
}
async function deactivateFixture(id: string, actor = id): Promise<void> {
  await fixture.query(`update "user" set deactivated_at='2024-02-29T12:34:56.123Z',
    deactivated_by_user_id=$2,retain_at_least_until='2030-01-01T00:00:00Z' where id=$1`, [id, actor]);
}
async function facts() {
  const result: Record<string, unknown> = {};
  for (const name of ["user", "forum_online_presence", "owner_events"]) {
    result[name] = (await fixture.query('select * from "' + name + '" order by ' + (name === "forum_online_presence" ? "user_id" : "id"))).rows;
  }
  return result;
}
async function retained() {
  const tables = (await fixture.query<{ tablename: string }>("select tablename from pg_tables where schemaname=$1 order by tablename", [schema])).rows;
  const result: Record<string, unknown> = {};
  for (const { tablename } of tables) {
    if (["owner_events", "forum_online_presence"].includes(tablename)) continue;
    const projection = tablename === "user" ? "to_jsonb(t)-'deactivated_at'-'deactivated_by_user_id'-'retain_at_least_until'" : "to_jsonb(t)";
    result[tablename] = (await fixture.query(`select coalesce(jsonb_agg(${projection} order by (${projection})::text),'[]'::jsonb) as rows from "${tablename}" t`)).rows[0].rows;
  }
  return result;
}
async function events(target: string) { return (await fixture.query("select * from owner_events where source='account' and target_user_id=$1 order by position", [target])).rows; }
async function availableLocks(owner: string, target: string) {
  const c = await pool.connect();
  try { await c.query("begin"); await c.query('select id from "user" where id=any($1) for no key update nowait', [[owner, target]]); }
  finally { await c.query("rollback"); c.release(); }
}
async function blocked(waiter: number, blocker: number) {
  for (let i = 0; i < 80; i++) {
    if ((await fixture.query<{ pids: number[] }>("select pg_blocking_pids($1) as pids", [waiter])).rows[0]?.pids.includes(blocker)) return;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw new Error("Actual PostgreSQL blocker not observed");
}
function barrier() {
  let observed!: () => void, release!: () => void;
  const entered = new Promise<void>(resolve => { observed = resolve; });
  const resumed = new Promise<void>(resolve => { release = resolve; });
  return { entered, release, pause: async () => { observed(); await resumed; } };
}
async function fullTarget() {
  const target = await person();
  await fixture.query(`insert into account(id,account_id,provider_id,user_id,password,access_token,refresh_token,id_token,updated_at)
    values($1,$1,'credential',$3,'PRIVATE_PASSWORD',null,null,null,now()),
      ($2,$2,'google',$3,null,'PRIVATE_ACCESS','PRIVATE_REFRESH','PRIVATE_ID',now())`, [uuid(), uuid(), target]);
  for (let i = 0; i < 2; i++) await fixture.query(`insert into "session"(id,token,user_id,expires_at,updated_at)
    values($1,$2,$3,now()+interval '1 day',now())`, [uuid(), uuid(), target]);
  await fixture.query("insert into forum_profiles(user_id,bio,website_url) values($1,'Retained bio','https://example.test/retained')", [target]);
  await fixture.query("insert into user_privacy_preferences(user_id,show_online) values($1,true)", [target]);
  await fixture.query("insert into forum_online_presence(user_id) values($1)", [target]);
  await fixture.query("insert into authz_user_roles(user_id,role_id) select $1,id from authz_roles where slug='admin'", [target]);
  await fixture.query("insert into authz_user_permission_overrides(user_id,permission_key,effect) values($1,'access.authorization.manage','allow')", [target]);
  const topic = uuid();
  await new DrizzleForumRepository(drizzle(fixture)).createTopicWithInitialPost({ id: topic, sectionId: "sa05-section", authorId: target,
    titleRevision: { id: uuid(), originalContent: "Retained title", sourceLocale: "en" },
    initialPost: { id: uuid(), topicId: topic, authorId: target, bodyRevision: { id: uuid(), originalContent: "Retained **body**", sourceLocale: "en" } } });
  return target;
}
beforeAll(async () => {
  await fixture.connect(); await fixture.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const file of (await readdir("drizzle")).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort()) {
    await fixture.query((await readFile("drizzle/" + file, "utf8")).replaceAll('"public".', '"' + schema + '".'));
  }
  const forum = new DrizzleForumRepository(drizzle(fixture));
  await forum.createCategory({ id: "sa05-category", name: "SA05" });
  await forum.createSection({ id: "sa05-section", categoryId: "sa05-category", name: "SA05" });
  await fixture.query("create role " + runtimeRole + " nologin");
  await fixture.query("grant usage on schema " + schema + " to " + runtimeRole);
  await fixture.query('grant select,update(deactivated_at,deactivated_by_user_id,retain_at_least_until) on "user" to ' + runtimeRole);
  await fixture.query("grant select,delete on forum_online_presence to " + runtimeRole);
  await fixture.query("grant select,insert on owner_events to " + runtimeRole);
});
afterEach(async () => { await Promise.all(ownedPools.splice(0).map(p => p.end().catch(() => undefined))); });
afterAll(async () => {
  await pool.end(); await fixture.query("drop schema if exists " + schema + " cascade");
  await fixture.query("drop role if exists " + runtimeRole); await fixture.end();
});

describe("SA05-1 actual atomic Owner command and facade", () => {
  it("changes only the lifecycle tuple/presence and one mandatory event for a privileged target", async () => {
    const owner = await person(), target = await fullTarget(), operation = input(owner, target), before = await retained();
    await fixture.query("insert into authz_user_permission_overrides(user_id,permission_key,effect) values($1,'access.authorization.manage','deny')", [owner]);
    const retainedBefore = await retained(); expect(retainedBefore).not.toEqual(before);
    const calls: string[] = [], source = ownPool(async (sql, run) => { calls.push(sql); return run(); });
    const saved = await command(owner, source).deactivate(operation);
    expect(saved).toMatchObject({ targetUserId: target, state: "deactivated", changed: true, eventId: expect.any(String) });
    expect(await retained()).toEqual(retainedBefore);
    expect((await fixture.query("select user_id from forum_online_presence where user_id=$1", [target])).rowCount).toBe(0);
    const [event] = await events(target); expect((await events(target)).length).toBe(1);
    expect(event).toMatchObject({ id: saved.eventId, kind: "account.deactivated", source: "account", monitor_key: "accounts.users",
      entity_type: "user", entity_id: target, actor_user_id: owner, target_user_id: target, correlation_id: operation.operationId,
      payload: { state: "deactivated", retainAtLeastUntil: saved.retainAtLeastUntil } });
    const expected = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(["account.deactivated", owner, operation.operationId])));
    expect(event.occurrence_key).toBe("sa05:" + Buffer.from(expected).toString("hex"));
    const tuple = (await fixture.query('select * from "user" where id=$1', [target])).rows[0];
    expect(tuple.deactivated_by_user_id).toBe(owner); expect(tuple.deactivated_at.toISOString()).toBe(saved.deactivatedAt);
    expect(event.occurred_at).toEqual(tuple.deactivated_at);
    const append = calls.findIndex(sql => sql.includes("pg_advisory_xact_lock"));
    expect(calls.slice(append + 1)).toHaveLength(2); expect(calls[append + 1]).toMatch(/insert into owner_events/); expect(calls.at(-1)).toBe("commit");
    expect(calls.some(sql => /authz_mutation_lock|delete from (account|session)|for update/i.test(sql))).toBe(false);
    await availableLocks(owner, target);
  });
  it("runs with bounded non-owner DB privileges and append-only event access without a sequence grant", async () => {
    const owner = await person(), target = await person();
    const source = ownPool(async (sql, run) => {
      if (sql === "begin") { await run("set role " + runtimeRole); }
      return run();
    });
    expect(await command(owner, source).deactivate(input(owner, target))).toMatchObject({ changed: true });
    const c = await source.connect();
    try {
      await expect(c.query("delete from owner_events")).rejects.toMatchObject({ code: "42501" });
      await expect(c.query('update "user" set name=\'forbidden\' where id=$1', [target])).rejects.toMatchObject({ code: "42501" });
    } finally { c.release(); }
    expect(await events(target)).toHaveLength(1);
  });

  it.each([undefined, "", " owner ", "different", 7])("invalid/mismatched trusted binding %s denies before any database connect", async binding => {
    const owner = await person(), target = await person(), before = await facts(); let connected = false;
    const denied = new PostgresOwnerAccountLifecycleCommand({ connect: async () => { connected = true; throw new Error("must not connect"); } } as unknown as Pool, binding);
    await expect(denied.deactivate(input(owner, target))).rejects.toBeInstanceOf(OwnerAccountLifecycleForbiddenError);
    expect(connected).toBe(false); expect(await facts()).toEqual(before);
  });
  it.each(["missing", "inactive"] as const)("authoritative %s Owner denies before target lookup and replay", async mode => {
    const owner = mode === "missing" ? "missing-" + uuid() : await person(), target = await person();
    if (mode === "inactive") await deactivateFixture(owner);
    const before = await facts(), calls: string[] = [];
    await expect(command(owner, ownPool(async (sql, run) => { calls.push(sql); return run(); })).deactivate(input(owner, target)))
      .rejects.toBeInstanceOf(mode === "missing" ? AccountMissingError : AccountInactiveError);
    expect(calls.some(sql => /owner_events|select id from "user"/.test(sql))).toBe(false); expect(await facts()).toEqual(before);
  });
  it.each(["", "x".repeat(201), "bad\nidentity"])("rejects malformed target identity before effects: %s", async target => {
    const owner = await person(), before = await facts();
    await expect(command(owner).deactivate(input(owner, target))).rejects.toBeInstanceOf(OwnerAccountLifecycleValidationError);
    expect(await facts()).toEqual(before);
  });
  it.each(["missing", "inactive"] as const)("%s Owner cannot bypass admission through an existing occurrence or a new no-op", async mode => {
    const owner = await person(), target = await person(), request = input(owner, target);
    await command(owner).deactivate(request);
    if (mode === "missing") await fixture.query('delete from "user" where id=$1', [owner]);
    else await deactivateFixture(owner);
    const before = await facts();
    for (const retry of [request, input(owner, target)]) {
      await expect(command(owner).deactivate(retry)).rejects.toBeInstanceOf(mode === "missing" ? AccountMissingError : AccountInactiveError);
    }
    expect(await facts()).toEqual(before);
  });
  it("uses canonical opaque account identities literally without a System-event key regex", async () => {
    const owner = await person("Owner 内部: " + uuid()), target = await person("target / é ? # ' " + uuid());
    const saved = await command(owner).deactivate(input(owner, target)); expect(saved.targetUserId).toBe(target);
    expect((await events(target))[0]).toMatchObject({ actor_user_id: owner, target_user_id: target, entity_id: target });
  });
  it("rejects malformed operations/extra command fields and the exact Owner target even on replay", async () => {
    const owner = await person(), target = await person(), request = input(owner, target);
    await command(owner).deactivate(request); const before = await facts();
    for (const bad of [{ ...request, operationId: "bad" }, { ...request, operationId: request.operationId + "\n" },
      { ...request, targetId: target, reason: "unexpected" }]) {
      await expect(command(owner).deactivate(bad)).rejects.toBeInstanceOf(OwnerAccountLifecycleValidationError);
    }
    await expect(command(owner).deactivate({ ...request, targetId: owner })).rejects.toBeInstanceOf(OwnerAccountLifecycleForbiddenError);
    expect(await facts()).toEqual(before);
  });
  it("returns target-not-found independently of a valid active Owner", async () => {
    const owner = await person(), before = await facts();
    await expect(command(owner).deactivate(input(owner, "absent-" + uuid()))).rejects.toBeInstanceOf(OwnerAccountLifecycleTargetMissingError);
    expect(await facts()).toEqual(before);
  });
  it("same occurrence and new-operation no-op preserve timestamps, retention and original UUID without reserving a no-op operation", async () => {
    const owner = await person(), target = await person(), request = input(owner, target);
    const saved = await command(owner).deactivate(request), before = await facts();
    expect(await command(owner).deactivate({ ...request, operationId: request.operationId.toUpperCase() })).toEqual({ ...saved, changed: false });
    const fresh = input(owner, target); expect(await command(owner).deactivate(fresh)).toEqual({ ...saved, changed: false });
    expect(await facts()).toEqual(before);
    const other = await person(); expect(await command(owner).deactivate({ ...fresh, targetId: other })).toMatchObject({ changed: true });
    const after = await facts();
    await expect(command(owner).deactivate({ ...request, targetId: other })).rejects.toBeInstanceOf(OwnerAccountLifecycleConflictError);
    expect(await facts()).toEqual(after);
  });
  it("import/fixture inactive state without a production occurrence returns null without backfill or cleanup", async () => {
    const owner = await person(), target = await person(); await deactivateFixture(target, owner);
    await fixture.query("insert into forum_online_presence(user_id) values($1)", [target]); const before = await facts();
    expect(await command(owner).deactivate(input(owner, target))).toEqual({ targetUserId: target, state: "deactivated", changed: false,
      deactivatedAt: "2024-02-29T12:34:56.123Z", retainAtLeastUntil: "2030-01-01T00:00:00.000Z", eventId: null });
    expect(await facts()).toEqual(before);
  });
  it.each(["same-operation", "different-operations", "different-targets", "conflicting-targets"] as const)("real concurrent %s serialize once at the active Owner tuple", async mode => {
    const owner = await person(), target = await person(), other = await person(), request = input(owner, target);
    const requests = mode === "same-operation" ? Array.from({ length: 12 }, () => request)
      : [request, { ...request, targetId: mode.includes("targets") ? other : target,
        operationId: mode === "conflicting-targets" ? request.operationId : uuid() }];
    const outcomes = await Promise.allSettled(requests.map(r => command(owner).deactivate(r)));
    expect(outcomes.filter(r => r.status === "rejected")).toHaveLength(mode === "conflicting-targets" ? 1 : 0);
    if (mode === "conflicting-targets") expect(outcomes.find(r => r.status === "rejected")).toMatchObject({ reason: expect.any(OwnerAccountLifecycleConflictError) });
    const accepted = outcomes.flatMap(r => r.status === "fulfilled" ? [r.value] : []);
    expect(accepted.filter(r => r.changed)).toHaveLength(mode === "different-targets" ? 2 : 1);
    const persisted = [...await events(target), ...await events(other)]; expect(persisted).toHaveLength(mode === "different-targets" ? 2 : 1);
  });
  it("holds the Owner tuple through COMMIT even for different targets while an unrelated account still writes", async () => {
    const owner = await person(), target = await person(), other = await person(), unrelated = await person(), gate = barrier();
    let firstPid = 0, secondPid = 0;
    const firstPool = ownPool(async (sql, run, c) => {
      if (sql === "begin") firstPid = (await c.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0].pid;
      if (sql === "commit") await gate.pause(); return run();
    });
    const secondPool = ownPool(async (sql, run, c) => {
      if (sql === "begin") secondPid = (await c.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0].pid;
      return run();
    });
    const first = command(owner, firstPool).deactivate(input(owner, target)); void first.catch(() => undefined);
    let second: ReturnType<PostgresOwnerAccountLifecycleCommand["deactivate"]> | undefined;
    try {
      await gate.entered; second = command(owner, secondPool).deactivate(input(owner, other)); void second.catch(() => undefined);
      while (!secondPid) await new Promise(resolve => setTimeout(resolve, 2));
      await blocked(secondPid, firstPid);
      await new DrizzleUserPrivacyRepository(drizzle(pool)).save(unrelated, false);
      gate.release(); const [a, b] = await Promise.all([first, second]); expect(a.changed && b.changed).toBe(true);
      expect(BigInt((await events(target))[0].position) < BigInt((await events(other))[0].position)).toBe(true);
    } finally { gate.release(); await Promise.allSettled([first, ...(second ? [second] : [])]); }
  });

  for (const zone of ["UTC", "America/New_York", "Asia/Jerusalem"]) {
    it.each([
      ["2024-02-29T23:59:59.999987Z", "2025-02-28T23:59:59.999Z"],
      ["2023-03-10T07:30:00.123987Z", "2024-03-10T07:30:00.123Z"],
      ["2023-11-03T05:30:00.654987Z", "2024-11-03T05:30:00.654Z"],
      ["2023-12-31T23:59:59.999987Z", "2024-12-31T23:59:59.999Z"],
    ])("native UTC calendar retention in " + zone + ": %s → %s", async (instant, expected) => {
      const owner = await person(), target = await person();
      // Only the DB clock expression is replaced; the actual command's SQL/transaction
      // performs all date truncation, timezone/calendar arithmetic and persisted effects.
      const source = ownPool(async (sql, run) => {
        if (sql === "begin") { const begun = await run(); await run("set local time zone '" + zone + "'"); return begun; }
        return run(sql.includes("with instant as materialized") ? sql.replace("clock_timestamp()", "'" + instant + "'::timestamptz") : undefined);
      });
      const saved = await command(owner, source).deactivate(input(owner, target));
      expect(saved.retainAtLeastUntil).toBe(expected); expect(saved.deactivatedAt).toBe(instant.slice(0, 23) + "Z");
      const equality = (await fixture.query(`select e.occurred_at=u.deactivated_at and u.deactivated_at=date_trunc('milliseconds',u.deactivated_at)
        and ((e.payload->>'retainAtLeastUntil')::timestamptz=u.retain_at_least_until) as exact
        from owner_events e join "user" u on e.target_user_id=u.id where e.id=$1`, [saved.eventId])).rows[0];
      expect(equality.exact).toBe(true);
    });
  }
  it.each(["presence-error", "presence-suppressed", "event-error", "event-suppressed"] as const)("mandatory %s rolls back lifecycle, presence and event together", async mode => {
    const owner = await person(), target = await fullTarget(), table = mode.startsWith("presence") ? "forum_online_presence" : "owner_events";
    const body = mode.endsWith("suppressed") ? "return null;" : "raise exception 'SA05_SYNTHETIC_FAILURE';";
    await fixture.query("create function sa05_fail() returns trigger language plpgsql as $$begin " + body + "end $$");
    await fixture.query("create trigger sa05_fail before " + (table === "owner_events" ? "insert" : "delete") + " on " + table + " for each row execute function sa05_fail()");
    const before = await facts(), privateBefore = await retained();
    try { await expect(command(owner).deactivate(input(owner, target))).rejects.toThrow(); }
    finally { await fixture.query("drop trigger sa05_fail on " + table); await fixture.query("drop function sa05_fail()"); }
    expect(await facts()).toEqual(before); expect(await retained()).toEqual(privateBefore); await availableLocks(owner, target);
  });
  it.each(["occurrence-state", "original-event-state"] as const)("inconsistent retained %s fails closed without a new transition", async mode => {
    const owner = await person(), target = await person(), request = input(owner, target); await command(owner).deactivate(request);
    await fixture.query('update "user" set deactivated_at=deactivated_at+interval \'1 microsecond\',retain_at_least_until=retain_at_least_until+interval \'1 microsecond\' where id=$1', [target]);
    const before = await facts();
    await expect(command(owner).deactivate(mode === "occurrence-state" ? request : input(owner, target))).rejects.toBeInstanceOf(OwnerAccountLifecycleInvariantError);
    expect(await facts()).toEqual(before);
  });
  it.each(["before-server-commit", "after-server-commit"] as const)("facade preserves uncertain %s and an explicit retry executes/observes exactly once", async mode => {
    const owner = await person(), target = await fullTarget(), request = input(owner, target); let inject = true, commits = 0;
    const facade = createHyperdriveOwnerAccountLifecycle(url!, owner, () => ownPool(async (sql, run) => {
      if (sql === "commit") {
        commits++;
        if (inject) { inject = false; if (mode === "after-server-commit") await run(); throw Object.assign(new Error("synthetic ACK lost"), { code: "ECONNRESET" }); }
      }
      return run();
    }));
    await expect(facade.deactivate(request)).rejects.toBeInstanceOf(OwnerAccountLifecycleCommitUncertainError); expect(commits).toBe(1);
    const retried = await facade.deactivate(request); expect(retried.changed).toBe(mode === "before-server-commit");
    expect(await events(target)).toHaveLength(1); expect(retried.eventId).toBe((await events(target))[0].id); expect(commits).toBe(2);
    await availableLocks(owner, target);
  });
  it("classifies actual actor lock timeout as unavailable without changing any facts", async () => {
    const owner = await person(), target = await person(), locker = await pool.connect(), before = await facts();
    try {
      await locker.query("begin"); await locker.query('select id from "user" where id=$1 for update', [owner]);
      await expect(createHyperdriveOwnerAccountLifecycle(url!, owner, () => ownPool()).deactivate(input(owner, target))).rejects.toBeInstanceOf(OwnerAccountLifecycleUnavailableError);
    } finally { await locker.query("rollback"); locker.release(); }
    expect(await facts()).toEqual(before);
  });
  it.each(["begin-ack-lost", "rollback-fails"] as const)("%s discards the connection without replacing the primary failure or retrying", async mode => {
    const owner = await person(), target = await person(), failure = new TypeError("synthetic primary failure"); let commits = 0;
    const source = ownPool(async (sql, run) => {
      if (sql === "commit") commits++;
      if (sql === "begin" && mode === "begin-ack-lost") { await run(); throw failure; }
      if (sql.includes("with instant as materialized")) throw failure;
      if (sql === "rollback" && mode === "rollback-fails") throw new Error("synthetic cleanup failure");
      return run();
    });
    const before = await facts(); await expect(command(owner, source).deactivate(input(owner, target))).rejects.toBe(failure);
    expect(commits).toBe(0); await availableLocks(owner, target); expect(await facts()).toEqual(before);
  });
  it.each(["state-first", "writer-first"] as const)("real shared admission %s holds through COMMIT with no reversed domain locks", async order => {
    const owner = await person(), target = await person(), writer = await pool.connect();
    let commandPid = 0; const gate = barrier(), source = ownPool(async (sql, run, c) => {
      if (sql === "begin") commandPid = (await c.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0].pid;
      if (sql === "commit" && order === "state-first") await gate.pause(); return run();
    });
    let pending: Promise<unknown> | undefined, state: Promise<unknown> | undefined;
    try {
      const writerPid = (await writer.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0].pid;
      await writer.query("begin");
      if (order === "writer-first") await assertActiveAccountForMutation(writer, target);
      state = command(owner, source).deactivate(input(owner, target)); void state.catch(() => undefined);
      if (order === "state-first") {
        await gate.entered; pending = assertActiveAccountForMutation(writer, target); void pending.catch(() => undefined);
        await blocked(writerPid, commandPid); gate.release(); await state; await expect(pending).rejects.toBeInstanceOf(AccountInactiveError);
      } else {
        while (!commandPid) await new Promise(resolve => setTimeout(resolve, 2));
        await blocked(commandPid, writerPid); await writer.query("commit"); await state;
      }
      expect(await events(target)).toHaveLength(1);
    } finally { gate.release(); await writer.query("rollback").catch(() => undefined); await Promise.allSettled([...(state ? [state] : []), ...(pending ? [pending] : [])]); writer.release(); }
  });
  it.each(["privacy", "heartbeat", "locale"] as const)("actual %s writer after real deactivation cannot create a new effect", async family => {
    const owner = await person(), target = await person(); await command(owner).deactivate(input(owner, target)); const before = await facts();
    const forum = new DrizzleForumRepository(drizzle(pool));
    const action = family === "privacy" ? new DrizzleUserPrivacyRepository(drizzle(pool)).save(target, false)
      : family === "heartbeat" ? forum.recordOnlinePresence(target)
      : createHyperdriveUserLocale(url!, () => new Client({ connectionString: url, options })).save(target, "he");
    await expect(action).rejects.toBeInstanceOf(AccountInactiveError);
    expect(await facts()).toEqual(before);
  });
  for (const family of ["privacy", "heartbeat"] as const) {
    it.each(["state-first", "writer-first"] as const)("actual stronger " + family + " lock vs command %s preserves the admitted commit order", async order => {
      const owner = await person(), target = await person(), gate = barrier(); let commandPid = 0, writerPid = 0;
      const source = ownPool(async (sql, run, c) => {
        if (sql === "begin") commandPid = (await c.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0].pid;
        if (sql === "commit" && order === "state-first") await gate.pause(); return run();
      });
      const writerPool = ownPool(async (sql, run, c) => {
        if (sql.startsWith("begin")) writerPid = (await c.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0].pid;
        if (sql === "commit" && order === "writer-first") await gate.pause(); return run();
      });
      const write = () => family === "privacy" ? new DrizzleUserPrivacyRepository(drizzle(writerPool)).save(target, false)
        : new DrizzleForumRepository(drizzle(writerPool)).recordOnlinePresence(target);
      let pending: Promise<void> | undefined, state: ReturnType<PostgresOwnerAccountLifecycleCommand["deactivate"]> | undefined;
      try {
        if (order === "state-first") {
          state = command(owner, source).deactivate(input(owner, target)); void state.catch(() => undefined); await gate.entered;
          pending = write(); void pending.catch(() => undefined); while (!writerPid) await new Promise(resolve => setTimeout(resolve, 2));
          await blocked(writerPid, commandPid); gate.release(); await state; await expect(pending).rejects.toBeInstanceOf(AccountInactiveError);
          expect((await fixture.query("select * from user_privacy_preferences where user_id=$1", [target])).rowCount).toBe(0);
        } else {
          pending = write(); void pending.catch(() => undefined); await gate.entered;
          state = command(owner, source).deactivate(input(owner, target)); void state.catch(() => undefined);
          while (!commandPid) await new Promise(resolve => setTimeout(resolve, 2));
          await blocked(commandPid, writerPid); gate.release(); await pending; await state;
          if (family === "privacy") expect((await fixture.query("select show_online from user_privacy_preferences where user_id=$1", [target])).rows[0].show_online).toBe(false);
        }
        expect((await fixture.query("select * from forum_online_presence where user_id=$1", [target])).rowCount).toBe(0);
        expect(await events(target)).toHaveLength(1);
      } finally { gate.release(); await Promise.allSettled([...(pending ? [pending] : []), ...(state ? [state] : [])]); }
    });
  }
});
