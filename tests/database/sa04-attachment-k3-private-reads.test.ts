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
  throw new Error("SA04-K3 requires a disposable loopback *_test PostgreSQL database");
}
const schema = "sa04_k3_attachment_reads_test";
const options = "-c search_path=" + schema + " -c lock_timeout=8s";
const fixture = new Client({ connectionString: url, options });
const pool = new Pool({ connectionString: url, options, max: 4 });
const noMeasures = async () => {};
const store = new DrizzleForumAttachments(drizzle(pool), noMeasures);
const uuid = () => crypto.randomUUID();

async function user(): Promise<string> {
  const id = "k3-" + uuid();
  await fixture.query('insert into "user" (id,name,email) values ($1,$2,$3)',
    [id, "K3 " + id, id + "@test.invalid"]);
  return id;
}
async function deactivate(id: string): Promise<void> {
  const result = await fixture.query('update "user" set deactivated_at=now(),'
    + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years'"
    + " where id=$1 and deactivated_at is null returning id", [id]);
  expect(result.rows).toEqual([{ id }]);
}
function operation(ownerId: string) {
  return { ownerId, contextKey: "topic:k3-" + uuid() + ":reply", draftId: uuid() };
}
function upload(op: ReturnType<typeof operation>): CreateDraftAttachmentInput {
  return {
    ...op, id: uuid(), objectKey: "private/" + uuid(),
    fileName: "K3.txt", declaredMime: "text/plain", detectedType: "text",
    responseMime: "text/plain; charset=utf-8", byteSize: 8,
    verificationStatus: "type-checked",
  };
}
type Operation = ReturnType<typeof operation>;
type Kind = "list" | "file";
function reader(client: Client) {
  return new DrizzleForumAttachments(drizzle(client), noMeasures);
}
function read(
  repository: DrizzleForumAttachments, kind: Kind, op: Operation, id: string,
) {
  return kind === "list"
    ? repository.listDraftAttachments(op.ownerId, op.contextKey, op.draftId)
    : repository.readDraftAttachment(op.ownerId, op.contextKey, op.draftId, id);
}
async function facts(op: Operation, id: string) {
  const { rows } = await fixture.query([
    "select",
    "(select count(*)::int from forum_attachments where owner_id=$1) as assets,",
    "(select count(*)::int from forum_attachment_draft_refs where owner_id=$1 and context_key=$2 and draft_id=$3) as refs,",
    "(select count(*)::int from forum_attachment_draft_generations where owner_id=$1 and context_key=$2 and draft_id=$3) as completions,",
    "(select count(*)::int from forum_post_attachments where attachment_id=$4) as public_refs",
  ].join("\n"), [op.ownerId, op.contextKey, op.draftId, id]);
  return rows[0];
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
  return { observed, resume, restore: () => { client.query = original; },
    get triggered() { return triggered; } };
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

describe("SA04-K3 private attachment selection and download admission", () => {
  it("reads an active owner's selected asset and allows private reads under AP10 upload restriction", async () => {
    const actor = await user(), op = operation(actor), asset = upload(op);
    expect(await store.listDraftAttachments(actor, op.contextKey, op.draftId)).toEqual([]);
    expect(await store.readDraftAttachment(actor, op.contextKey, op.draftId, asset.id)).toBeNull();
    const created = await store.createDraftAttachment(asset);
    expect(await store.listDraftAttachments(actor, op.contextKey, op.draftId)).toEqual([created]);
    expect(await store.readDraftAttachment(actor, op.contextKey, op.draftId, asset.id)).toEqual(created);
    const before = await facts(op, asset.id);
    const restricted = new DrizzleForumAttachments(drizzle(pool), async () => {
      throw new UserMeasureRestrictedError("attachments.upload");
    });
    expect(await restricted.listDraftAttachments(actor, op.contextKey, op.draftId)).toEqual([created]);
    expect(await restricted.readDraftAttachment(actor, op.contextKey, op.draftId, asset.id)).toEqual(created);
    const other = await user();
    expect(await store.listDraftAttachments(other, op.contextKey, op.draftId)).toEqual([]);
    expect(await store.readDraftAttachment(other, op.contextKey, op.draftId, asset.id)).toBeNull();
    expect(await facts(op, asset.id)).toEqual(before);
  });

  it("denies inactive and missing owner, including empty list and existing selected file, without changing refs", async () => {
    const actor = await user(), op = operation(actor), asset = upload(op);
    await store.createDraftAttachment(asset);
    const before = await facts(op, asset.id);
    await deactivate(actor);
    await expect(store.listDraftAttachments(actor, op.contextKey, op.draftId))
      .rejects.toBeInstanceOf(AccountInactiveError);
    await expect(store.readDraftAttachment(actor, op.contextKey, op.draftId, asset.id))
      .rejects.toBeInstanceOf(AccountInactiveError);
    const empty = operation(actor);
    await expect(store.listDraftAttachments(actor, empty.contextKey, empty.draftId))
      .rejects.toBeInstanceOf(AccountInactiveError);
    expect(await facts(op, asset.id)).toEqual(before);

    const absent = operation("k3-missing-" + uuid());
    await expect(store.listDraftAttachments(absent.ownerId, absent.contextKey, absent.draftId))
      .rejects.toBeInstanceOf(AccountMissingError);
    await expect(store.readDraftAttachment(absent.ownerId, absent.contextKey, absent.draftId, asset.id))
      .rejects.toBeInstanceOf(AccountMissingError);
    expect(await facts(op, asset.id)).toEqual(before);
  });

  it.each(["list", "file"] as const)(
    "state-first deactivation denies a waiting private %s before returning metadata",
    async kind => {
      const actor = await user(), op = operation(actor), asset = upload(op);
      await store.createDraftAttachment(asset);
      const before = await facts(op, asset.id);
      const connection = new Client({ connectionString: url, options });
      await connection.connect();
      const paused = pauseQuery(connection, sql => /from "user" .*for no key update/iu.test(sql));
      let pending: Promise<unknown> | undefined;
      try {
        pending = read(reader(connection), kind, op, asset.id);
        void pending.catch(() => undefined);
        await paused.observed;
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

  it.each(["list", "file"] as const)(
    "writer-first private %s holds AccountState row through transaction COMMIT",
    async kind => {
      const actor = await user(), op = operation(actor), asset = upload(op);
      await store.createDraftAttachment(asset);
      const before = await facts(op, asset.id);
      const connection = new Client({ connectionString: url, options });
      await connection.connect();
      const paused = pauseQuery(connection, sql => /^commit$/iu.test(sql.trim()));
      let pending: Promise<unknown> | undefined, txOpen = false;
      try {
        pending = read(reader(connection), kind, op, asset.id);
        void pending.catch(() => undefined);
        await paused.observed;
        await fixture.query("begin"); txOpen = true;
        await fixture.query("set local lock_timeout='180ms'");
        await expect(fixture.query('update "user" set deactivated_at=now(),'
          + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years' where id=$1",
        [actor])).rejects.toMatchObject({ code: "55P03" });
        await fixture.query("rollback"); txOpen = false;
        paused.resume();
        const result = await pending;
        if (kind === "list") expect(result).toEqual([expect.objectContaining({ id: asset.id })]);
        else expect(result).toMatchObject({ id: asset.id });
        expect(await facts(op, asset.id)).toEqual(before);
        await deactivate(actor);
        await expect(read(store, kind, op, asset.id)).rejects.toBeInstanceOf(AccountInactiveError);
      } finally {
        paused.resume();
        paused.restore();
        if (txOpen) await fixture.query("rollback");
        if (pending) await Promise.allSettled([pending]);
        await connection.end();
      }
    }, 30_000,
  );

  it("keeps an inactive author's published asset readable through public post membership", async () => {
    const actor = await user(), op = operation(actor), asset = upload(op);
    await store.createDraftAttachment(asset);
    const topicId = "k3-topic-" + uuid(), postId = "k3-post-" + uuid();
    const titleRevision = "k3-title-" + uuid(), bodyRevision = "k3-body-" + uuid();
    const categoryId = "k3-category-" + uuid(), sectionId = "k3-section-" + uuid();
    await fixture.query("insert into forum_categories(id,name) values($1,'Category')", [categoryId]);
    await fixture.query("insert into forum_sections(id,category_id,name) values($1,$2,'Section')", [sectionId,categoryId]);
    await fixture.query("begin");
    try {
      await fixture.query("insert into forum_topics(id,section_id,author_id,current_title_revision_id) values($1,$2,$3,$4)",
        [topicId,sectionId,actor,titleRevision]);
      await fixture.query("insert into forum_topic_title_revisions(id,topic_id,author_id,original_content,source_locale) values($1,$2,$3,'Topic','en')",
        [titleRevision,topicId,actor]);
      await fixture.query("insert into forum_posts(id,topic_id,author_id,current_revision_id) values($1,$2,$3,$4)",
        [postId,topicId,actor,bodyRevision]);
      await fixture.query("insert into forum_post_revisions(id,post_id,author_id,original_content,source_locale) values($1,$2,$3,'Body','en')",
        [bodyRevision,postId,actor]);
      await fixture.query("insert into forum_post_attachments(post_id,attachment_id,created_at) values($1,$2,now())", [postId,asset.id]);
      await fixture.query("commit");
    } catch (error) {
      await fixture.query("rollback");
      throw error;
    }
    const before = await facts(op, asset.id);
    await deactivate(actor);
    await expect(store.readDraftAttachment(actor, op.contextKey, op.draftId, asset.id))
      .rejects.toBeInstanceOf(AccountInactiveError);
    expect(await store.readPublishedAttachment(postId, asset.id)).toMatchObject({
      id: asset.id, objectKey: asset.objectKey,
    });
    expect(await store.readPublishedAttachment("k3-unrelated", asset.id)).toBeNull();
    expect(await facts(op, asset.id)).toEqual(before);
  });
});
