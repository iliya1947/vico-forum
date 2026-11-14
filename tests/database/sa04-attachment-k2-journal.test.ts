import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import { DrizzleForumAttachments, InvalidForumAttachmentError } from "../../db/forum-attachments";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA04-K2 requires a disposable loopback *_test PostgreSQL database");
}
const schema = "sa04_k2_attachment_journal_test";
const options = "-c search_path=" + schema + " -c lock_timeout=8s";
const fixture = new Client({ connectionString: url, options });
const pool = new Pool({ connectionString: url, options, max: 4 });
const store = new DrizzleForumAttachments(drizzle(pool), async () => {});
const uuid = () => crypto.randomUUID();
const key = () => "private/fenced-v1/" + uuid();

async function user(): Promise<string> {
  const id = "k2-" + uuid();
  await fixture.query('insert into "user" (id,name,email) values ($1,$2,$3)',
    [id, "K2 " + id, id + "@test.invalid"]);
  return id;
}
async function deactivate(id: string): Promise<void> {
  const result = await fixture.query('update "user" set deactivated_at=now(),'
    + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years'"
    + " where id=$1 and deactivated_at is null returning id", [id]);
  expect(result.rows).toEqual([{ id }]);
}
async function journal(objectKey: string) {
  const { rows } = await fixture.query<{ reservation_etag: string | null; claim_token: string | null }>(
    "select reservation_etag,claim_token from forum_attachment_upload_objects where object_key=$1", [objectKey]);
  return rows[0] ?? null;
}
function writer(client: Client) {
  return new DrizzleForumAttachments(drizzle(client), async () => {});
}
function nativeSql(value: unknown): string {
  return typeof value === "string" ? value
    : value && typeof value === "object" && "text" in value
      && typeof value.text === "string" ? value.text : "";
}
function pauseQuery(client: Client, matches: (text: string) => boolean) {
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
  return { observed, resume, restore: () => { client.query = original; },
    get triggered() { return triggered; } };
}
async function blocked(waiting: number, blocking: number) {
  for (let i = 0; i < 120; i++) {
    const { rows } = await fixture.query<{ yes: boolean }>(
      "select $2::int = any(pg_blocking_pids($1::int)) as yes", [waiting, blocking]);
    if (rows[0]?.yes) return;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error("Expected an actual PostgreSQL journal row lock wait");
}
beforeAll(async () => {
  await fixture.connect();
  await fixture.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const file of (await readdir("drizzle")).filter(name => /^\\d{4}_.+\\.sql$/u.test(name)).sort()) {
    await fixture.query((await readFile("drizzle/" + file, "utf8"))
      .replaceAll('"public".', '"' + schema + '".'));
  }
});
afterAll(async () => {
  await pool.end();
  await fixture.query("drop schema if exists " + schema + " cascade");
  await fixture.end();
});

describe("SA04-K2 authoritative PREPARING/READY journal admission", () => {
  it("commits the fresh journal and activation, never reactivating missing, claimed or READY keys", async () => {
    const actor = await user(), objectKey = key();
    expect(await journal(objectKey)).toBeNull();
    await store.recordUploadObject(actor, objectKey);
    expect(await journal(objectKey)).toEqual({ reservation_etag: null, claim_token: null });
    await store.activateUploadObject(actor, objectKey, "etag-1");
    expect(await journal(objectKey)).toEqual({ reservation_etag: "etag-1", claim_token: null });
    await expect(store.activateUploadObject(actor, objectKey, "etag-2"))
      .rejects.toBeInstanceOf(InvalidForumAttachmentError);
    await expect(store.activateUploadObject(actor, key(), "etag"))
      .rejects.toBeInstanceOf(InvalidForumAttachmentError);
    expect(await journal(objectKey)).toEqual({ reservation_etag: "etag-1", claim_token: null });

    const claimed = key();
    await store.recordUploadObject(actor, claimed);
    await fixture.query("update forum_attachment_upload_objects set claim_token=$2,"
      + "claimed_at=now()-interval '1 hour' where object_key=$1", [claimed, uuid()]);
    const before = await journal(claimed);
    await expect(store.activateUploadObject(actor, claimed, "etag"))
      .rejects.toBeInstanceOf(InvalidForumAttachmentError);
    expect(await journal(claimed)).toEqual(before);
  });

  it("inactive/missing actor cannot insert PREPARING or activate an existing PREPARING row", async () => {
    const actor = await user(), preparing = key();
    await store.recordUploadObject(actor, preparing);
    const before = await journal(preparing);
    await deactivate(actor);
    const denied = key();
    await expect(store.recordUploadObject(actor, denied)).rejects.toBeInstanceOf(AccountInactiveError);
    await expect(store.activateUploadObject(actor, preparing, "etag"))
      .rejects.toBeInstanceOf(AccountInactiveError);
    expect(await journal(denied)).toBeNull();
    expect(await journal(preparing)).toEqual(before);

    const missing = "k2-missing-" + uuid(), absent = key();
    await expect(store.recordUploadObject(missing, absent)).rejects.toBeInstanceOf(AccountMissingError);
    await expect(store.activateUploadObject(missing, preparing, "etag"))
      .rejects.toBeInstanceOf(AccountMissingError);
    expect(await journal(absent)).toBeNull();
    expect(await journal(preparing)).toEqual(before);
  });

  it.each(["record", "activate"] as const)(
    "state-first deactivation denies %s after the command starts, preserving journal facts",
    async kind => {
      const actor = await user(), objectKey = key();
      if (kind === "activate") await store.recordUploadObject(actor, objectKey);
      const before = await journal(objectKey);
      const client = new Client({ connectionString: url, options });
      await client.connect();
      const paused = pauseQuery(client, sql => /from "user" .*for no key update/iu.test(sql));
      let pending: Promise<unknown> | undefined;
      try {
        pending = kind === "record"
          ? writer(client).recordUploadObject(actor, objectKey)
          : writer(client).activateUploadObject(actor, objectKey, "etag");
        await paused.observed;
        await deactivate(actor);
        paused.resume();
        await expect(pending).rejects.toBeInstanceOf(AccountInactiveError);
        expect(paused.triggered).toBe(true);
        expect(await journal(objectKey)).toEqual(before);
      } finally {
        paused.resume();
        paused.restore();
        if (pending) await Promise.allSettled([pending]);
        await client.end();
      }
    }, 30_000,
  );

  it.each(["record", "activate"] as const)(
    "writer-first %s holds the actor mutex until journal COMMIT",
    async kind => {
      const actor = await user(), objectKey = key();
      if (kind === "activate") await store.recordUploadObject(actor, objectKey);
      const client = new Client({ connectionString: url, options });
      await client.connect();
      const paused = pauseQuery(client, sql => /^commit$/iu.test(sql.trim()));
      let pending: Promise<unknown> | undefined, txOpen = false;
      try {
        pending = kind === "record"
          ? writer(client).recordUploadObject(actor, objectKey)
          : writer(client).activateUploadObject(actor, objectKey, "etag");
        await paused.observed;
        await fixture.query("begin"); txOpen = true;
        await fixture.query("set local lock_timeout='180ms'");
        await expect(fixture.query('update "user" set deactivated_at=now(),'
          + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years' where id=$1",
        [actor])).rejects.toMatchObject({ code: "55P03" });
        await fixture.query("rollback"); txOpen = false;
        paused.resume();
        await pending;
        expect(await journal(objectKey)).toEqual({
          reservation_etag: kind === "activate" ? "etag" : null, claim_token: null,
        });
        await deactivate(actor);
        await expect(store.activateUploadObject(actor, objectKey, "later"))
          .rejects.toBeInstanceOf(kind === "record" ? AccountInactiveError : InvalidForumAttachmentError);
      } finally {
        paused.resume();
        paused.restore();
        if (txOpen) await fixture.query("rollback");
        if (pending) await Promise.allSettled([pending]);
        await client.end();
      }
    }, 30_000,
  );

  it("activation locks the journal before actor, so a state-first update does not deadlock finalization", async () => {
    const actor = await user(), objectKey = key();
    await store.recordUploadObject(actor, objectKey);
    const before = await journal(objectKey);
    const blocker = new Client({ connectionString: url, options });
    const contender = new Client({ connectionString: url, options });
    await Promise.all([blocker.connect(), contender.connect()]);
    const blockerPid = (await blocker.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]!.pid;
    const contenderPid = (await contender.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]!.pid;
    let txOpen = false, pending: Promise<unknown> | undefined;
    try {
      await blocker.query("begin"); txOpen = true;
      await blocker.query("select object_key from forum_attachment_upload_objects where object_key=$1 for update", [objectKey]);
      pending = writer(contender).activateUploadObject(actor, objectKey, "etag");
      await blocked(contenderPid, blockerPid);
      await deactivate(actor); // Would deadlock if activation held actor before existing journal.
      await blocker.query("commit"); txOpen = false;
      await expect(pending).rejects.toBeInstanceOf(AccountInactiveError);
      expect(await journal(objectKey)).toEqual(before);
    } finally {
      if (txOpen) await blocker.query("rollback");
      if (pending) await Promise.allSettled([pending]);
      await Promise.all([blocker.end(), contender.end()]);
    }
  }, 30_000);
});
