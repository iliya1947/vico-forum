import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DrizzleForumEditorDrafts } from "../../db/forum-editor-drafts";
import { DrizzleForumAttachments } from "../../db/forum-attachments";
import { DrizzleForumRepository } from "../../db/forum-repository";
import { ForumAttachmentCleanup } from "../../db/forum-attachment-cleanup";
const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1"].includes(databaseUrl.hostname) || !databaseUrl.pathname.endsWith("_test")) {
  throw new Error("Disposable local test database required");
}
const schema = `draft_snapshot_${process.pid}`;
const ownerId = "snapshot-owner", otherId = "snapshot-other";
const client = new Client({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema}` });
const drafts = new DrizzleForumEditorDrafts(drizzle(client));
const assets = new DrizzleForumAttachments(drizzle(client));
const forum = new DrizzleForumRepository(drizzle(client), { cooldownMs: 0, now: () => new Date() });
const text = { title: "", body: "server text", tags: "" };
function upload(key: string, generation: string) {
  return { id: crypto.randomUUID(), ownerId, contextKey: key, draftId: generation,
    objectKey: `private/${crypto.randomUUID()}`, fileName: "file.txt", declaredMime: "text/plain",
    detectedType: "text", responseMime: "text/plain; charset=utf-8", byteSize: 12,
    verificationStatus: "type-checked" as const, expectedVersion: 0 };
}
beforeAll(async () => {
  await client.connect();
  await client.query(`create schema ${schema}`);
  const journal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8"));
  for (const {tag} of journal.entries) {
    await client.query((await readFile(`drizzle/${tag}.sql`, "utf8")).replaceAll('"public".', `"${schema}".`));
  }
  for (const id of [ownerId, otherId]) {
    await client.query('insert into "user" (id, name, email) values ($1, $2, $3)', [
      id, id, `${id}@test.invalid`,
    ]);
  }
  await client.query(
    "insert into forum_categories (id, name) values ('attachment-category', 'Attachments')",
  );
  await client.query(
    "insert into forum_sections (id, category_id, name) values ('attachment-section', 'attachment-category', 'Files')",
  );
  await client.query("begin");
  await client.query(
    "insert into forum_topics (id, section_id, author_id, current_title_revision_id) values ('attachment-topic', 'attachment-section', $1, 'attachment-title-rev')",
    [ownerId],
  );
  await client.query(
    "insert into forum_topic_title_revisions (id, topic_id, author_id, original_content, source_locale) values ('attachment-title-rev', 'attachment-topic', $1, 'Attachment topic', 'en')",
    [ownerId],
  );
  await client.query(
    "insert into forum_posts (id, topic_id, author_id, current_revision_id) values ('attachment-post', 'attachment-topic', $1, 'attachment-body-rev')",
    [ownerId],
  );
  await client.query(
    "insert into forum_post_revisions (id, post_id, author_id, original_content, source_locale) values ('attachment-body-rev', 'attachment-post', $1, 'Attachment body', 'en')",
    [ownerId],
  );
  await client.query("commit");
});
afterAll(async () => { await client.query(`drop schema if exists ${schema} cascade`); await client.end(); });

describe("authoritative snapshot and retention pool", () => {
  it("stages before text save, versions selection, retains removed assets, and publishes only the selected subset", async () => {
    const key = "topic:attachment-topic:reply", generation = crypto.randomUUID();
    const a = upload(key, generation), b = upload(key, generation);
    await assets.createDraftAttachment(a); await assets.createDraftAttachment(b);
    expect(await drafts.get(ownerId, key)).toBeNull();
    expect(await assets.listDraftAttachments(ownerId, key, generation)).toEqual([]);
    expect(await assets.readDraftAttachment(ownerId, key, generation, a.id)).toBeNull();
    const first = await drafts.save(ownerId, key, generation, { ...text, draftAttachmentIds: [a.id] }, 0, { manifestOnly: true });
    expect(first).toMatchObject({ outcome: "saved", draft: { version: 1, payload: { body: "", draftAttachmentIds: [a.id] } } });
    expect((await assets.listDraftAttachments(ownerId, key, generation)).map((file) => file.id)).toEqual([a.id]);
    expect((await drafts.save(ownerId, key, generation, { ...text, draftAttachmentIds: [a.id, b.id] }, 1, { manifestOnly: true })).outcome).toBe("saved");
    expect(await assets.removeDraftAttachment(ownerId, key, generation, a.id, 2)).toBe(true);
    expect((await drafts.get(ownerId, key))?.version).toBe(3);
    expect(await assets.readDraftAttachment(ownerId, key, generation, a.id)).toBeNull();
    expect((await client.query("select 1 from forum_attachment_draft_refs where attachment_id=$1", [a.id])).rowCount).toBe(1);
    expect((await drafts.resolve(ownerId, key, generation, { ...text, draftAttachmentIds: [a.id] }, 3)).outcome).toBe("saved");
    expect((await drafts.save(ownerId, key, generation, { ...text, body: "stale", draftAttachmentIds: [b.id] }, 3)).outcome).toBe("conflict");
    await forum.createPost({ id: "snapshot-post", topicId: "attachment-topic", authorId: ownerId,
      bodyRevision: { id: "snapshot-post-rev", originalContent: "latest unsynced form text", sourceLocale: "en" },
      publishedDraft: { contextKey: key, draftId: generation, expectedVersion: 4, attachmentIds: [a.id] },
    });
    expect((await client.query("select attachment_id from forum_post_attachments where post_id='snapshot-post'")).rows).toEqual([{ attachment_id: a.id }]);
    expect((await client.query("select original_content from forum_post_revisions where id='snapshot-post-rev'")).rows[0].original_content).toBe("latest unsynced form text");
    await client.query("update forum_attachments set created_at=now()-interval '2 hours' where id=$1", [b.id]);
    const deleted: string[] = [];
    await new ForumAttachmentCleanup(drizzle(client), { delete: async (key) => { deleted.push(key); } }).runOnce();
    expect(deleted).toContain(b.objectKey); expect(deleted).not.toContain(a.objectKey);
  });
  it("does not mistake staged edit bytes for the published source or selection acknowledgement", async () => {
    const key = "post:snapshot-post:edit", generation = crypto.randomUUID();
    const published = (await client.query("select attachment_id from forum_post_attachments where post_id='snapshot-post'")).rows[0].attachment_id as string;
    await assets.initializePostEditAttachments(ownerId, key, generation, "snapshot-post-rev");
    const staged = upload(key, generation); await assets.createDraftAttachment(staged);
    expect((await assets.listDraftAttachments(ownerId, key, generation)).map((file) => file.id)).toEqual([published]);
    expect(await assets.readDraftAttachment(ownerId, key, generation, staged.id)).toBeNull();
    expect(await drafts.get(ownerId, key)).toBeNull();
    const selected = await drafts.save(ownerId, key, generation,
      {...text, body: "dirty text must stay local", draftAttachmentIds: [published, staged.id]}, 0, {manifestOnly: true});
    expect(selected).toMatchObject({outcome: "saved", draft: {version: 1, payload: {
      body: "latest unsynced form text", publishedRevisionId: "snapshot-post-rev",
    }}});
    expect(await assets.readDraftAttachment(ownerId, key, generation, staged.id)).toMatchObject({id: staged.id});
    expect((await assets.listDraftAttachments(ownerId, key, generation)).map((file) => file.id).sort()).toEqual([published, staged.id].sort());
  });
  it("uses the hidden terminal head for the first attachment and rejects the stale zero base", async () => {
    const key = "section:attachment-section:new", old = crypto.randomUUID(), fresh = crypto.randomUUID();
    expect((await drafts.save(ownerId, key, old, text, 0)).outcome).toBe("saved");
    await drafts.finish(ownerId, key, old, "deleted");
    await client.query("update forum_editor_drafts set updated_at=now()-interval '31 days' where owner_id=$1 and context_key=$2", [ownerId, key]);
    expect((await drafts.metadata(ownerId)).find((row) => row.contextKey === key)).toBeUndefined();
    const head = (await drafts.get(ownerId, key))!;
    const a = upload(key, fresh); await assets.createDraftAttachment({ ...a, expectedVersion: head.version });
    expect((await drafts.save(ownerId, key, fresh, { ...text, draftAttachmentIds: [a.id] }, 0, {manifestOnly: true})).outcome).toBe("gone");
    expect((await drafts.save(ownerId, key, fresh, { ...text, draftAttachmentIds: [a.id] }, head.version, {manifestOnly: true}))).toMatchObject({outcome: "saved", draft: {version: head.version+1, payload: {body: ""}}});
    expect((await drafts.save(ownerId, key, old, text, head.version)).outcome).toBe("gone");
  });
  it("transfers the pool without selecting late bytes from the losing generation", async () => {
    const key = "help:new", source = crypto.randomUUID(), target = crypto.randomUUID();
    const a = upload(key, source); await assets.createDraftAttachment(a);
    expect((await drafts.save(ownerId, key, target, {...text, draftAttachmentIds: []}, 0)).outcome).toBe("saved");
    expect((await drafts.resolve(ownerId, key, target, {...text, draftAttachmentIds: [a.id]}, 1)).outcome).toBe("saved");
    await assets.rebindDraftAttachments(ownerId, key, source, target, 2);
    const late = upload(key, source); await assets.createDraftAttachment(late);
    expect((await assets.listDraftAttachments(ownerId, key, target)).map((file) => file.id)).toEqual([a.id]);
    expect((await drafts.save(ownerId, key, source, {...text, draftAttachmentIds: [late.id]}, 2)).outcome).toBe("gone");
  });
  it("converts legacy boundary retention before removing the recovery registries from the runtime", async () => {
    const key = "post:attachment-post:edit", generation = crypto.randomUUID();
    const a = upload(key, generation); await assets.createDraftAttachment(a);
    await client.query(`insert into forum_editor_drafts (owner_id,context_key,draft_id,version,status,payload,edited_at,updated_at)
      values ($1,$2,$3,1,'active',$4,now(),now())`, [ownerId,key,generation,JSON.stringify(text)]);
    await client.query("insert into forum_attachment_draft_contexts (attachment_id,owner_id,context_key) values ($1,$2,$3)", [a.id,ownerId,key]);
    await client.query("insert into forum_attachment_draft_boundaries (owner_id,context_key,draft_id,version,attachment_ids) values ($1,$2,$3,1,$4)", [ownerId,key,generation,JSON.stringify([a.id])]);
    await client.query("delete from forum_attachment_draft_refs where attachment_id=$1", [a.id]);
    await client.query(await readFile("drizzle/0045_draft_snapshot_selection.sql", "utf8"));
    expect((await drafts.get(ownerId,key))?.payload.draftAttachmentIds).toEqual([a.id]);
    expect(await assets.readDraftAttachment(ownerId,key,generation,a.id)).toMatchObject({id:a.id});
    expect((await client.query("select 1 from forum_attachment_draft_boundaries")).rowCount).toBe(0);
  });
});
