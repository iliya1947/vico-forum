import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import { DrizzleForumAttachments, type CreateDraftAttachmentInput } from "../../db/forum-attachments";
import { UserMeasureRestrictedError } from "../../db/user-measure-policy";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA04-K1 requires a disposable loopback *_test PostgreSQL database");
}

const schema = "sa04_k1_attachment_admission_test";
const options = "-c search_path=" + schema + " -c lock_timeout=8s";
const fixture = new Client({ connectionString: url, options });
const pool = new Pool({ connectionString: url, options, max: 4 });
const noMeasures = async () => {};
const store = new DrizzleForumAttachments(drizzle(pool), noMeasures);
const uuid = () => crypto.randomUUID();

async function user(id = "k1-" + uuid()): Promise<string> {
  await fixture.query('insert into "user" (id,name,email) values ($1,$2,$3)',
    [id, "K1 " + id, id + "@test.invalid"]);
  return id;
}
async function deactivate(id: string): Promise<void> {
  const result = await fixture.query('update "user" set deactivated_at=now(),'
    + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years'"
    + " where id=$1 and deactivated_at is null returning id", [id]);
  expect(result.rows).toEqual([{ id }]);
}
function operation(ownerId: string, id = uuid()) {
  return { ownerId, contextKey: "topic:k1-" + uuid() + ":reply", draftId: id };
}
function upload(op: ReturnType<typeof operation>, id = uuid(), fenced = false): CreateDraftAttachmentInput {
  return {
    ...op, id,
    objectKey: (fenced ? "private/fenced-v1/" : "private/") + uuid(),
    fileName: "K1.txt", declaredMime: "text/plain", detectedType: "text",
    responseMime: "text/plain; charset=utf-8", byteSize: 8,
    verificationStatus: "type-checked",
    ...(fenced ? {requireUploadRecord: true} : {}),
  };
}
function writer(client: Client) {
  return new DrizzleForumAttachments(drizzle(client), noMeasures);
}
function nativeSql(value: unknown): string {
  return typeof value === "string" ? value
    : value && typeof value === "object" && "text" in value
      && typeof value.text === "string" ? value.text : "";
}
function pauseQuery(client: Client, matches: (text: string) => boolean) {
  const original = client.query;
  let observed!: () => void, release!: () => void;
  const entered = new Promise<void>(resolve => { observed = resolve; });
  const resumeSignal = new Promise<void>(resolve => { release = resolve; });
  let triggered = false;
  client.query = ((...args: unknown[]) => {
    if (!triggered && matches(nativeSql(args[0]))) {
      triggered = true;
      observed();
      return resumeSignal.then(() => Reflect.apply(original, client, args));
    }
    return Reflect.apply(original, client, args);
  }) as typeof client.query;
  return { entered, resume: release, restore: () => { client.query = original; },
    get triggered() { return triggered; } };
}
async function facts(op: ReturnType<typeof operation>, id: string) {
  const rows = await fixture.query([
    "select",
    "(select count(*)::int from forum_attachments where owner_id=$1) as assets,",
    "(select count(*)::int from forum_attachment_draft_refs where owner_id=$1 and context_key=$2 and draft_id=$3) as refs,",
    "(select count(*)::int from forum_attachment_draft_generations where owner_id=$1 and context_key=$2 and draft_id=$3) as generations,",
    "(select count(*)::int from forum_attachments where id=$4) as matching_asset,",
    "(select count(*)::int from forum_attachment_draft_refs where attachment_id=$4) as matching_ref,",
    "(select count(*)::int from forum_publication_receipts where owner_id=$1 and context_key=$2 and draft_id=$3) as receipts",
  ].join("\n"), [op.ownerId, op.contextKey, op.draftId, id]);
  return rows.rows[0];
}
async function blocked(waiting: number, blocking: number) {
  for (let i = 0; i < 120; i++) {
    const result = await fixture.query<{yes: boolean}>(
      "select $2::int = any(pg_blocking_pids($1::int)) as yes", [waiting, blocking]);
    if (result.rows[0]?.yes) return;
    await new Promise(r => setTimeout(r, 25));
  }
  throw new Error("Expected native PostgreSQL row-lock wait on fenced upload journal");
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

describe("SA04-K1 authoritative upload admission and metadata finalization", () => {
  it("keeps active fresh admission, exact stable-ID replay and AP10 restricted replay", async () => {
    const actor = await user();
    const op = operation(actor);
    const asset = upload(op);
    expect(await store.admitUpload(actor, op.contextKey, op.draftId, asset.id)).toBeNull();
    const created = await store.createDraftAttachment(asset);
    expect(created).toMatchObject({ id: asset.id, objectKey: asset.objectKey });
    const before = await facts(op, asset.id);
    const restricted = new DrizzleForumAttachments(drizzle(pool), async () => {
      throw new UserMeasureRestrictedError("attachments.upload");
    });
    // Existing AP10 behavior: active committed stable upload replay is not a new upload.
    expect(await restricted.admitUpload(actor, op.contextKey, op.draftId, asset.id))
      .toMatchObject({ id: asset.id });
    expect(await restricted.createDraftAttachment({ ...asset, objectKey: "private/" + uuid() }))
      .toMatchObject({ id: asset.id, objectKey: asset.objectKey });
    await expect(restricted.admitUpload(actor, op.contextKey, op.draftId, uuid()))
      .rejects.toBeInstanceOf(UserMeasureRestrictedError);
    await expect(restricted.createDraftAttachment(upload(op)))
      .rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect(await facts(op, asset.id)).toEqual(before);
  });

  it("rejects inactive and missing owner even on committed metadata/replay with unchanged facts", async () => {
    const actor = await user();
    const op = operation(actor);
    const asset = upload(op);
    await store.createDraftAttachment(asset);
    const before = await facts(op, asset.id);
    await deactivate(actor);
    await expect(store.admitUpload(actor, op.contextKey, op.draftId, asset.id))
      .rejects.toBeInstanceOf(AccountInactiveError);
    await expect(store.createDraftAttachment(asset))
      .rejects.toBeInstanceOf(AccountInactiveError);
    await expect(store.admitUpload(actor, op.contextKey, op.draftId, uuid()))
      .rejects.toBeInstanceOf(AccountInactiveError);
    await expect(store.createDraftAttachment(upload(op)))
      .rejects.toBeInstanceOf(AccountInactiveError);
    expect(await facts(op, asset.id)).toEqual(before);

    const missing = operation("k1-missing-" + uuid());
    const absent = upload(missing);
    const missingBefore = await facts(missing, absent.id);
    await expect(store.admitUpload(missing.ownerId, missing.contextKey, missing.draftId, absent.id))
      .rejects.toBeInstanceOf(AccountMissingError);
    await expect(store.createDraftAttachment(absent)).rejects.toBeInstanceOf(AccountMissingError);
    expect(await facts(missing, absent.id)).toEqual(missingBefore);
  });

  it.each(["admit", "metadata"] as const)(
    "state-first deactivation denies an already-started %s on its real actor gate",
    async kind => {
      const actor = await user();
      const op = operation(actor), asset = upload(op);
      const connection = new Client({ connectionString: url, options });
      await connection.connect();
      const paused = pauseQuery(connection, text => /from "user" .*for no key update/i.test(text));
      const before = await facts(op, asset.id);
      let pending: Promise<unknown> | undefined;
      try {
        pending = kind === "admit"
          ? writer(connection).admitUpload(actor, op.contextKey, op.draftId, asset.id)
          : writer(connection).createDraftAttachment(asset);
        await paused.entered;
        await deactivate(actor);
        paused.resume();
        await expect(pending).rejects.toBeInstanceOf(AccountInactiveError);
        expect(paused.triggered).toBe(true);
        expect(await facts(op, asset.id)).toEqual(before);
      } finally {
        paused.resume();
        paused.restore();
        if (pending) await Promise.allSettled([pending]);
        await connection.end();
      }
    }, 30_000,
  );

  it.each(["admit", "metadata"] as const)(
    "writer-first %s keeps actor mutex until COMMIT before deactivation",
    async kind => {
      const actor = await user();
      const op = operation(actor), asset = upload(op);
      const connection = new Client({ connectionString: url, options });
      await connection.connect();
      const paused = pauseQuery(connection, text => /^commit$/i.test(text.trim()));
      let pending: Promise<unknown> | undefined, deactivatorOpen = false;
      try {
        pending = kind === "admit"
          ? writer(connection).admitUpload(actor, op.contextKey, op.draftId, asset.id)
          : writer(connection).createDraftAttachment(asset);
        await paused.entered;
        await fixture.query("begin");
        deactivatorOpen = true;
        await fixture.query("set local lock_timeout='180ms'");
        await expect(fixture.query('update "user" set deactivated_at=now(),'
          + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years' where id=$1",
        [actor])).rejects.toMatchObject({ code: "55P03" });
        await fixture.query("rollback");
        deactivatorOpen = false;
        paused.resume();
        await pending;
        if (kind === "metadata") {
          expect(await facts(op, asset.id)).toMatchObject({ matching_asset: 1, matching_ref: 1 });
        } else {
          expect(await facts(op, asset.id)).toMatchObject({ matching_asset: 0, matching_ref: 0 });
        }
        await deactivate(actor);
        await expect(store.admitUpload(actor, op.contextKey, op.draftId, asset.id))
          .rejects.toBeInstanceOf(AccountInactiveError);
      } finally {
        paused.resume();
        paused.restore();
        if (deactivatorOpen) await fixture.query("rollback");
        if (pending) await Promise.allSettled([pending]);
        await connection.end();
      }
    }, 30_000,
  );

  it("locks an existing fenced journal before actor admission; state-first cannot create a ref", async () => {
    const actor = await user();
    const op = operation(actor), asset = upload(op, uuid(), true);
    await store.recordUploadObject(actor, asset.objectKey);
    await store.activateUploadObject(actor, asset.objectKey, "positive-reservation-etag");
    const blocker = new Client({ connectionString: url, options });
    const contender = new Client({ connectionString: url, options });
    await Promise.all([blocker.connect(), contender.connect()]);
    const blockerPid = (await blocker.query<{pid: number}>("select pg_backend_pid() as pid")).rows[0]!.pid;
    const contenderPid = (await contender.query<{pid: number}>("select pg_backend_pid() as pid")).rows[0]!.pid;
    const before = await facts(op, asset.id);
    let transaction = false;
    let pending: Promise<unknown> | undefined;
    try {
      await blocker.query("begin"); transaction = true;
      await blocker.query(
        "select object_key from forum_attachment_upload_objects where object_key=$1 for update",
        [asset.objectKey]);
      pending = writer(contender).createDraftAttachment(asset);
      await blocked(contenderPid, blockerPid);
      // Existing journal→actor order: deactivation is free while finalization waits on journal.
      await deactivate(actor);
      await blocker.query("commit"); transaction = false;
      await expect(pending).rejects.toBeInstanceOf(AccountInactiveError);
      expect(await facts(op, asset.id)).toEqual(before);
    } finally {
      if (transaction) await blocker.query("rollback");
      if (pending) await Promise.allSettled([pending]);
      await Promise.all([blocker.end(), contender.end()]);
    }
  }, 30_000);
});
