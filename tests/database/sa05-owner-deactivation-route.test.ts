import { readdir, readFile } from "node:fs/promises";
import { Client, Pool } from "pg";
import { RouterContextProvider } from "react-router";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { action } from "../../app/routes/owner-deactivate";
import { authSessionContext, type AuthSession } from "../../app/auth/request-context";
import { authorizationOwnerContext } from "../../app/authorization/request-context";
import { ownerAccountLifecycleContext } from "../../app/profile/request-context";
import { forumOwnerDeactivationPath } from "../../app/forum/paths";
import { createHyperdriveOwnerAccountLifecycle } from "../../db/hyperdrive-owner-account-lifecycle";
import type { OwnerAccountDeactivationResult } from "../../db/owner-account-lifecycle";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) throw new Error("Disposable loopback *_test PostgreSQL required");
const schema = "sa05_owner_deactivation_route_test", options = "-c search_path=" + schema;
const fixture = new Client({ connectionString: url, options }), pools: Pool[] = [];
const uuid = () => crypto.randomUUID(), origin = "https://forum.test";
const ownPool = () => { const p = new Pool({ connectionString: url, options, max: 1 }); pools.push(p); return p; };
async function person() {
  const id = "route-" + uuid(); await fixture.query('insert into "user"(id,name,email) values($1,$1,$2)', [id, id + "@test.invalid"]); return id;
}
function context(owner: string, factory: () => Pool = ownPool) {
  const ctx = new RouterContextProvider(), now = new Date();
  // A trusted session-context fixture tests the real route/facade/native path;
  // genuine Better Auth session/Chromium closure is a later SA05 checkpoint.
  const session: AuthSession = { user: { id: owner, name: "Synthetic", email: "test@test.invalid", emailVerified: false, createdAt: now, updatedAt: now },
    session: { id: "synthetic-context", userId: owner, token: "PRIVATE_FIXTURE_TOKEN", expiresAt: now, createdAt: now, updatedAt: now } };
  ctx.set(authSessionContext, session); ctx.set(authorizationOwnerContext, owner);
  ctx.set(ownerAccountLifecycleContext, createHyperdriveOwnerAccountLifecycle(url!, owner, factory)); return ctx;
}
async function submit(ctx: RouterContextProvider, owner: string, target: string, operationId = uuid()) {
  return action({ request: new Request(origin + forumOwnerDeactivationPath("en", target), { method: "POST",
    headers: { Origin: origin, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ intent: "deactivate", expectedActorId: owner, targetUserId: target, operationId }) }),
    params: { userId: target }, context: ctx });
}
async function facts() {
  return { users: (await fixture.query('select * from "user" order by id')).rows,
    presence: (await fixture.query("select * from forum_online_presence order by user_id")).rows,
    events: (await fixture.query("select * from owner_events order by position")).rows };
}
async function status(response: Response, expected: number) {
  expect(response.status).toBe(expected); expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.clone().text()).not.toMatch(/PRIVATE_|insert into|select .*from|stack|password/i); return response;
}
beforeAll(async () => {
  await fixture.connect(); await fixture.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const f of (await readdir("drizzle")).filter(n => /^\d{4}_.+\.sql$/.test(n)).sort()) {
    await fixture.query((await readFile("drizzle/" + f, "utf8")).replaceAll('"public".', '"' + schema + '".'));
  }
});
afterEach(async () => { await Promise.allSettled(pools.splice(0).map(p => p.end())); });
afterAll(async () => { await fixture.query("drop schema if exists " + schema + " cascade"); await fixture.end(); });

describe("SA05-2 actual route/request-context/facade/PostgreSQL command", () => {
  it("returns the exact persisted result and stable replay without fabricating a second event", async () => {
    const owner = await person(), target = await person(), ctx = context(owner), op = uuid();
    await fixture.query("insert into forum_online_presence(user_id) values($1)", [target]);
    const first = await status(await submit(ctx, owner, target, op), 200), body = await first.json() as OwnerAccountDeactivationResult;
    const tuple = (await fixture.query('select * from "user" where id=$1', [target])).rows[0];
    const event = (await fixture.query("select * from owner_events where id=$1", [body.eventId])).rows[0];
    expect(body).toEqual({ targetUserId: target, state: "deactivated", changed: true,
      deactivatedAt: tuple.deactivated_at.toISOString(), retainAtLeastUntil: tuple.retain_at_least_until.toISOString(), eventId: event.id });
    expect(event.correlation_id).toBe(op); expect(event.occurred_at).toEqual(tuple.deactivated_at);
    const before = await facts();
    expect(await (await status(await submit(ctx, owner, target, op), 200)).json()).toEqual({ ...body, changed: false });
    expect(await (await status(await submit(ctx, owner, target), 200)).json()).toEqual({ ...body, changed: false });
    expect(await facts()).toEqual(before);
  });
  it("returns a null event only for retained fixture/import state, without backfill", async () => {
    const owner = await person(), target = await person();
    await fixture.query(`update "user" set deactivated_at='2024-02-29T12:00:00.123Z',deactivated_by_user_id=$2,
      retain_at_least_until='2030-01-01T00:00:00Z' where id=$1`, [target, owner]);
    const before = await facts(), response = await status(await submit(context(owner), owner, target), 200);
    expect(await response.json()).toMatchObject({ changed: false, eventId: null, deactivatedAt: "2024-02-29T12:00:00.123Z" }); expect(await facts()).toEqual(before);
  });
  it.each(["missing", "inactive"] as const)("authoritative %s actor maps to private401, not stale-context success", async mode => {
    const owner = mode === "missing" ? "missing-" + uuid() : await person(), target = await person();
    if (mode === "inactive") await fixture.query(`update "user" set deactivated_at=now(),deactivated_by_user_id=$1,
      retain_at_least_until=now()+interval '2 years' where id=$1`, [owner]);
    const before = await facts(); await status(await submit(context(owner), owner, target), 401); expect(await facts()).toEqual(before);
  });
  it("maps self-target403, missing-target404 and conflicting operation409 without extra effects", async () => {
    const owner = await person(), target = await person(), other = await person(), ctx = context(owner), op = uuid();
    let before = await facts(); await status(await submit(ctx, owner, owner), 403); await status(await submit(ctx, owner, "absent-" + uuid()), 404); expect(await facts()).toEqual(before);
    await status(await submit(ctx, owner, target, op), 200); before = await facts();
    await status(await submit(ctx, owner, other, op), 409); expect(await facts()).toEqual(before);
  });
  it("maps a real actor-lock timeout to private503 without writes", async () => {
    const owner = await person(), target = await person(), locker = new Client({ connectionString: url, options }); await locker.connect(); const before = await facts();
    try {
      await locker.query("begin"); await locker.query('select id from "user" where id=$1 for update', [owner]);
      await status(await submit(context(owner), owner, target), 503);
    } finally { await locker.query("rollback"); await locker.end(); }
    expect(await facts()).toEqual(before);
  });
  it("returns sanitized private500 on actual mandatory-event SQL failure and rolls back state/presence", async () => {
    const owner = await person(), target = await person(); await fixture.query("insert into forum_online_presence(user_id) values($1)", [target]);
    await fixture.query("create function route_event_fail() returns trigger language plpgsql as $$begin raise exception 'PRIVATE_ROUTE_SQL';end $$");
    await fixture.query("create trigger route_event_fail before insert on owner_events for each row execute function route_event_fail()");
    const before = await facts();
    try { await status(await submit(context(owner), owner, target), 500); }
    finally { await fixture.query("drop trigger route_event_fail on owner_events; drop function route_event_fail()"); }
    expect(await facts()).toEqual(before);
  });
  it("maps native receipt/state invariant failure to private500", async () => {
    const owner = await person(), target = await person(), op = uuid(), ctx = context(owner); await status(await submit(ctx, owner, target, op), 200);
    await fixture.query(`update "user" set deactivated_at=deactivated_at+interval '1 microsecond',
      retain_at_least_until=retain_at_least_until+interval '1 microsecond' where id=$1`, [target]);
    const before = await facts(); await status(await submit(ctx, owner, target, op), 500); expect(await facts()).toEqual(before);
  });
  it.each(["before-commit", "after-commit"] as const)("uncertain %s returns503 without automatic retry; explicit same-operation call is safe", async mode => {
    const owner = await person(), target = await person(), op = uuid(); let fault = true, commits = 0;
    const ctx = context(owner, () => {
      const source = ownPool(), connect = source.connect.bind(source);
      source.connect = (async () => {
        const c = await connect(), query = c.query;
        c.query = (async (...args: unknown[]) => {
          if (args[0] === "commit") {
            commits++;
            if (fault) { fault = false; if (mode === "after-commit") await Reflect.apply(query, c, args); throw new Error("PRIVATE_ACK_LOST"); }
          }
          return Reflect.apply(query, c, args);
        }) as typeof c.query;
        return c;
      }) as typeof source.connect;
      return source;
    });
    await status(await submit(ctx, owner, target, op), 503); expect(commits).toBe(1);
    const retried = await status(await submit(ctx, owner, target, op), 200), body = await retried.json() as OwnerAccountDeactivationResult;
    expect(body.changed).toBe(mode === "before-commit"); expect(commits).toBe(2);
    expect((await fixture.query("select id from owner_events where target_user_id=$1", [target])).rows).toEqual([{ id: body.eventId }]);
  });
});
