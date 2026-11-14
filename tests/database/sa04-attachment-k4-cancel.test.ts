import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import {
  DrizzleForumAttachments, ForumAttachmentDraftConflictError,
  type CreateDraftAttachmentInput,
} from "../../db/forum-attachments";
import { UserMeasureRestrictedError } from "../../db/user-measure-policy";

const url = process.env.DATABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA04-K4 requires disposable loopback *_test PostgreSQL");
}
const schema = "sa04_k4_cancel_test";
const options = "-c search_path=" + schema + " -c lock_timeout=8s";
const fixture = new Client({ connectionString: url, options });
const pool = new Pool({ connectionString: url, options, max: 4 });
const noMeasures = async () => {};
const store = new DrizzleForumAttachments(drizzle(pool), noMeasures);
const uuid = () => crypto.randomUUID();
type Scope = { ownerId: string; contextKey: string; draftId: string };

async function user(): Promise<string> {
  const id = "k4-" + uuid();
  await fixture.query('insert into "user" (id,name,email) values ($1,$2,$3)',
    [id, "K4 " + id, id + "@test.invalid"]);
  return id;
}
async function deactivate(id: string): Promise<void> {
  const result = await fixture.query('update "user" set deactivated_at=now(),'
    + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years'"
    + " where id=$1 and deactivated_at is null returning id", [id]);
  expect(result.rows).toEqual([{ id }]);
}
function operation(ownerId: string): Scope {
  return { ownerId, contextKey: "topic:k4-" + uuid() + ":reply", draftId: uuid() };
}
function upload(op: Scope): CreateDraftAttachmentInput {
  return {
    ...op, id: uuid(), objectKey: "private/" + uuid(),
    fileName: "K4.txt", declaredMime: "text/plain", detectedType: "text",
    responseMime: "text/plain; charset=utf-8", byteSize: 9,
    verificationStatus: "type-checked",
  };
}
async function facts(op: Scope) {
  const { rows } = await fixture.query([
    "select",
    "(select count(*)::int from forum_attachment_draft_generations",
    " where owner_id=$1 and context_key=$2 and draft_id=$3) as completed,",
    "(select count(*)::int from forum_attachment_draft_refs",
    " where owner_id=$1 and context_key=$2 and draft_id=$3) as refs,",
    "(select count(*)::int from forum_attachments where owner_id=$1) as assets",
  ].join("\n"), [op.ownerId, op.contextKey, op.draftId]);
  return rows[0] as { completed: number; refs: number; assets: number };
}
function cancel(repository: DrizzleForumAttachments, op: Scope) {
  return repository.cancelOperation(op.ownerId, op.contextKey, op.draftId);
}
function nativeSql(value: unknown): string {
  return typeof value === "string" ? value
    : value && typeof value === "object" && "text" in value
      && typeof value.text === "string" ? value.text : "";
}
function pauseQuery(client: Client, matches: (sql: string) => boolean) {
  const original = client.query;
  let entered!: () => void, resume!: () => void;
  const observed = new Promise<void>(resolve => { entered = resolve; });
  const released = new Promise<void>(resolve => { resume = resolve; });
  let triggered = false;
  client.query = ((...args: unknown[]) => {
    if (!triggered && matches(nativeSql(args[0]))) {
      triggered = true;
      entered();
      return released.then(() => Reflect.apply(original, client, args));
    }
    return Reflect.apply(original, client, args);
  }) as typeof client.query;
  return { observed, resume, restore: () => { client.query = original; } };
}
function repository(client: Client): DrizzleForumAttachments {
  return new DrizzleForumAttachments(drizzle(client), noMeasures);
}
async function connections(count: number): Promise<Client[]> {
  const list = Array.from({ length: count }, () => new Client({ connectionString: url, options }));
  await Promise.all(list.map(client => client.connect()));
  return list;
}
async function waitForBlocker(blocked: Client, blocker: Client) {
  const blockedPid = (await blocked.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]!.pid;
  const blockerPid = (await blocker.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]!.pid;
  for (let i = 0; i < 200; i++) {
    await fixture.query("select pg_stat_clear_snapshot()");
    const { rows } = await fixture.query<{ blocking: number[] }>(
      "select pg_blocking_pids($1) as blocking", [blockedPid]);
    if (rows[0]?.blocking.includes(blockerPid)) return;
    await new Promise(resolve => setTimeout(resolve, 12));
  }
  throw new Error("K4 did not serialize on the actual draft scope");
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
  await pool.end();
  await fixture.query("drop schema if exists " + schema + " cascade");
  await fixture.end();
});

describe("SA04-K4 authoritative whole-operation Cancel", () => {
  it("allows active empty, live and terminal idempotent Cancel without an upload permission check", async () => {
    const actor = await user(), empty = operation(actor), live = operation(actor);
    const measureBlocked = new DrizzleForumAttachments(drizzle(pool), async () => {
      throw new UserMeasureRestrictedError("attachments.upload");
    });
    await cancel(measureBlocked, empty);
    await cancel(measureBlocked, empty);
    expect(await facts(empty)).toEqual({ completed: 1, refs: 0, assets: 0 });

    const created = await store.createDraftAttachment(upload(live));
    expect(await facts(live)).toEqual({ completed: 0, refs: 1, assets: 1 });
    await cancel(measureBlocked, live);
    expect(await facts(live)).toEqual({ completed: 1, refs: 0, assets: 1 });
    await cancel(measureBlocked, live);
    expect(await facts(live)).toEqual({ completed: 1, refs: 0, assets: 1 });
    await expect(store.createDraftAttachment(upload(live)))
      .rejects.toMatchObject({ reason: "gone" } satisfies Partial<ForumAttachmentDraftConflictError>);
    // Cancel does not physically remove bytes or metadata; cleanup owns that lifecycle.
    expect((await fixture.query("select object_key from forum_attachments where id=$1", [created.id]))
      .rows[0]?.object_key).toBe(created.objectKey);
  });

  it("retires only the exact owner/context/operation refs; leaves foreign and other-operation refs", async () => {
    const actor = await user(), other = await user();
    const target = operation(actor), sibling = { ...target, draftId: uuid() };
    const foreign = { ...target, ownerId: other };
    const targetAsset = await store.createDraftAttachment(upload(target));
    const siblingAsset = await store.createDraftAttachment(upload(sibling));
    const foreignAsset = await store.createDraftAttachment(upload(foreign));
    await cancel(store, target);
    expect(await facts(target)).toEqual({ completed: 1, refs: 0, assets: 2 });
    expect(await facts(sibling)).toEqual({ completed: 0, refs: 1, assets: 2 });
    expect(await facts(foreign)).toEqual({ completed: 0, refs: 1, assets: 1 });
    expect(await store.readDraftAttachment(actor, sibling.contextKey, sibling.draftId, siblingAsset.id))
      .toMatchObject({ id: siblingAsset.id });
    expect(await store.readDraftAttachment(other, foreign.contextKey, foreign.draftId, foreignAsset.id))
      .toMatchObject({ id: foreignAsset.id });
    expect((await fixture.query("select object_key from forum_attachments where id=$1", [targetAsset.id]))
      .rows[0]?.object_key).toBe(targetAsset.objectKey);
  });

  it("denies missing and inactive actors even for empty, live and already-terminal operations without changed facts", async () => {
    const actor = await user(), live = operation(actor), empty = operation(actor), terminal = operation(actor);
    const asset = await store.createDraftAttachment(upload(live));
    await cancel(store, terminal);
    const before = await Promise.all([facts(live), facts(empty), facts(terminal)]);
    await deactivate(actor);
    for (const op of [live, empty, terminal]) {
      await expect(cancel(store, op)).rejects.toBeInstanceOf(AccountInactiveError);
    }
    expect(await Promise.all([facts(live), facts(empty), facts(terminal)])).toEqual(before);
    expect((await fixture.query("select object_key from forum_attachments where id=$1", [asset.id]))
      .rows[0]?.object_key).toBe(asset.objectKey);

    const missing = operation("k4-missing-" + uuid());
    const missingBefore = await facts(missing);
    await expect(cancel(store, missing)).rejects.toBeInstanceOf(AccountMissingError);
    expect(await facts(missing)).toEqual(missingBefore);
  });

  it("state-first deactivation wins before Cancel actor admission, leaving refs and completion unchanged", async () => {
    const actor = await user(), op = operation(actor);
    await store.createDraftAttachment(upload(op));
    const before = await facts(op);
    const [contender] = await connections(1);
    const paused = pauseQuery(contender, sql => /from "user" .*for no key update/iu.test(sql));
    let pending: Promise<unknown> | undefined;
    try {
      pending = cancel(repository(contender), op);
      void pending.catch(() => undefined);
      await paused.observed;
      await deactivate(actor);
      paused.resume();
      await expect(pending).rejects.toBeInstanceOf(AccountInactiveError);
      expect(await facts(op)).toEqual(before);
    } finally {
      paused.resume(); paused.restore();
      if (pending) await Promise.allSettled([pending]);
      await contender.end();
    }
  }, 30_000);

  it("Cancel-first keeps actor row locked through COMMIT, then a later deactivation succeeds", async () => {
    const actor = await user(), op = operation(actor);
    await store.createDraftAttachment(upload(op));
    const [writer] = await connections(1);
    const paused = pauseQuery(writer, sql => /^commit$/iu.test(sql.trim()));
    let pending: Promise<unknown> | undefined, txOpen = false;
    try {
      pending = cancel(repository(writer), op);
      void pending.catch(() => undefined);
      await paused.observed;
      await fixture.query("begin"); txOpen = true;
      await fixture.query("set local lock_timeout='180ms'");
      await expect(fixture.query('update "user" set deactivated_at=now(),'
        + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years' where id=$1",
      [actor])).rejects.toMatchObject({ code: "55P03" });
      await fixture.query("rollback"); txOpen = false;
      paused.resume();
      await pending;
      expect(await facts(op)).toMatchObject({ completed: 1, refs: 0, assets: 1 });
      await deactivate(actor);
      await expect(cancel(store, op)).rejects.toBeInstanceOf(AccountInactiveError);
    } finally {
      paused.resume(); paused.restore();
      if (txOpen) await fixture.query("rollback");
      if (pending) await Promise.allSettled([pending]);
      await writer.end();
    }
  }, 30_000);

  it.each(["cancel-first", "upload-first"] as const)(
    "serializes actual Cancel and metadata finalization via the same draft scope: %s",
    async order => {
      const actor = await user(), op = operation(actor), candidate = upload(op);
      const [first, second] = await connections(2);
      const paused = pauseQuery(first, sql => /^commit$/iu.test(sql.trim()));
      let firstResult: Promise<unknown> | undefined, secondResult: Promise<unknown> | undefined;
      try {
        firstResult = order === "cancel-first"
          ? cancel(repository(first), op)
          : repository(first).createDraftAttachment(candidate);
        void firstResult.catch(() => undefined);
        await paused.observed;
        secondResult = order === "cancel-first"
          ? repository(second).createDraftAttachment(candidate)
          : cancel(repository(second), op);
        void secondResult.catch(() => undefined);
        // Queries on the second connection are queued behind the blocked scope.
        // The inspector must use a separate connection: pg_blocking_pids is physical evidence.
        const secondPid = (await fixture.query<{ pid: number }>(
          "select pid from pg_stat_activity where query ilike '%pg_advisory_xact_lock%'"
          + " and datname = current_database() and pid != pg_backend_pid()"
          + " order by query_start desc limit 1")).rows[0]?.pid;
        if (!secondPid) throw new Error("missing real scope waiter");
        const firstPid = (await first.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]!.pid;
        let blocked = false;
        for (let i = 0; i < 200; i++) {
          const { rows } = await fixture.query<{ blocking: number[] }>(
            "select pg_blocking_pids($1) as blocking", [secondPid]);
          if (rows[0]?.blocking.includes(firstPid)) { blocked = true; break; }
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        expect(blocked).toBe(true);
        paused.resume();
        if (order === "cancel-first") {
          await firstResult;
          await expect(secondResult).rejects.toMatchObject({ reason: "gone" });
        } else {
          await firstResult; await secondResult;
        }
        expect(await facts(op)).toEqual({
          completed: 1, refs: 0, assets: order === "cancel-first" ? 0 : 1,
        });
      } finally {
        paused.resume(); paused.restore();
        if (firstResult) await Promise.allSettled([firstResult]);
        if (secondResult) await Promise.allSettled([secondResult]);
        await Promise.all([first.end(), second.end()]);
      }
    }, 30_000,
  );
});
