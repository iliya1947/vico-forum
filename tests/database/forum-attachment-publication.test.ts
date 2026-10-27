import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DrizzleForumAttachments } from "../../db/forum-attachments";
import { ForumAttachmentCleanup as Cleanup } from "../../db/forum-attachment-cleanup";
import { DrizzleForumRepository, ForumAuthorizationError, ForumStateConflictError } from "../../db/forum-repository";

class ForumAttachmentCleanup extends Cleanup {
  constructor(db: ConstructorParameters<typeof Cleanup>[0], storage: {delete(key: string): Promise<void>}, clock?: () => Date) {
    super(db, {listReservations: async () => ({keys: []}), ...storage}, clock);
  }
}
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const url = new URL(databaseUrl);
if (!["localhost", "127.0.0.1"].includes(url.hostname) || !url.pathname.endsWith("_test")) {
  throw new Error("Disposable local test database required");
}

const schema = "forum_attachment_publication_test";
const connection = () => new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
const client = connection();
const attachments = new DrizzleForumAttachments(drizzle(client));
const ownerId = "publication-owner";
const sectionId = "publication-section";
const topicId = "publication-topic";
const contextKey = `topic:${topicId}:reply`;
let clock = Date.parse("2030-01-01T00:00:00Z");
const policy = { cooldownMs: 0, now: () => new Date(clock += 1) };
const forum = new DrizzleForumRepository(drizzle(client), policy);

function attachment(draftId: string, key = contextKey) {
  return {
    id: crypto.randomUUID(), ownerId, contextKey: key, draftId,
    objectKey: `private/${crypto.randomUUID()}`,
    fileName: "retained.txt", declaredMime: "text/plain", detectedType: "text",
    responseMime: "text/plain; charset=utf-8", byteSize: 12,
    verificationStatus: "type-checked" as const,
  };
}

function reply(id: string, draftId?: string, expectedVersion?: number) {
  return {
    id, topicId, authorId: ownerId,
    publishedDraft: { contextKey, ...(draftId ? { draftId, expectedVersion } : {}) },
    bodyRevision: { id: `${id}-revision`, originalContent: "Reply text", sourceLocale: "en" },
  };
}

function operation(draftId: string, contextKey = "topic:publication-topic:reply") { return {draftId, contextKey, version: 0}; }

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  const files = (await readdir("drizzle")).filter((file) => /^\d{4}_.+\.sql$/u.test(file)).sort();
  for (const file of files) {
    await client.query((await readFile(`drizzle/${file}`, "utf8")).replaceAll('"public".', `"${schema}".`));
  }
  for (const id of [ownerId, "publication-topic-author", "publication-other"]) {
    await client.query('insert into "user" (id, name, email) values ($1, $1, $2)', [id, `${id}@test.invalid`]);
  }
  await forum.createCategory({ id: "publication-category", name: "Attachments" });
  await forum.createSection({ id: sectionId, categoryId: "publication-category", name: "Files" });
  await forum.createTopicWithInitialPost({
    id: topicId, sectionId, authorId: "publication-topic-author",
    titleRevision: { id: "publication-title", originalContent: "Topic", sourceLocale: "en" },
    initialPost: {
      id: "publication-initial", topicId, authorId: "publication-topic-author",
      bodyRevision: { id: "publication-initial-body", originalContent: "Question", sourceLocale: "en" },
    },
  });
});

afterAll(async () => {
  await client.query(`drop schema if exists ${schema} cascade`);
  await client.end();
});

describe("published post editing and revision history", () => {

  it("removes only deselected published refs atomically with Save and includes the selection in retry identity", async () => {
    const localTopicId = crypto.randomUUID();
    const contextKey = `topic:${localTopicId}:reply`;
    await forum.createTopicWithInitialPost({
      id: localTopicId, sectionId, authorId: "publication-topic-author",
      titleRevision: { id: crypto.randomUUID(), originalContent: "Attachment removal", sourceLocale: "en" },
      initialPost: { id: crypto.randomUUID(), topicId: localTopicId, authorId: "publication-topic-author",
        bodyRevision: { id: crypto.randomUUID(), originalContent: "Question", sourceLocale: "en" } },
    });
    const postId = crypto.randomUUID(), revisionId = crypto.randomUUID(), generation = crypto.randomUUID();
    const original = operation(generation, contextKey);
    const removed = attachment(generation, contextKey), kept = attachment(generation, contextKey);
    await attachments.createDraftAttachment(removed);
    await attachments.createDraftAttachment(kept);
    await forum.createPost({ ...reply(postId, generation, original.version),
      topicId: localTopicId,
      publishedDraft: { contextKey, draftId: generation,  attachmentIds: [removed.id, kept.id] },
      bodyRevision: { id: revisionId, originalContent: "Before", sourceLocale: "en" },
    });
    const sharedPostId = crypto.randomUUID();
    await forum.createPost({ id: sharedPostId, topicId: localTopicId, authorId: ownerId,
      bodyRevision: { id: crypto.randomUUID(), originalContent: "Shared reference", sourceLocale: "en" } });
    await client.query("insert into forum_post_attachments (post_id, attachment_id, created_at) values ($1, $2, now())", [sharedPostId, removed.id]);
    const editGeneration = crypto.randomUUID(), editContext = `post:${postId}:edit`;
    const added = attachment(editGeneration, editContext);
    await attachments.createDraftAttachment(added);
    const edit = { postId, topicId: localTopicId, actorId: ownerId, expectedRevisionId: revisionId,
      body: "After", draftId: editGeneration, 
      attachmentIds: [added.id], retainedAttachmentIds: [kept.id] };
    await expect(forum.editPublishedPost({ ...edit, retainedAttachmentIds: [crypto.randomUUID()] }))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await attachments.readPublishedAttachment(postId, removed.id)).toMatchObject({ id: removed.id });
    expect((await forum.readPost(postId))?.body.id).toBe(revisionId);
    await forum.editPublishedPost(edit);
    expect(await attachments.readPublishedAttachment(postId, removed.id)).toBeNull();
    expect(await attachments.readPublishedAttachment(sharedPostId, removed.id)).toMatchObject({ id: removed.id });
    expect(await attachments.readPublishedAttachment(postId, kept.id)).toMatchObject({ id: kept.id });
    expect(await attachments.readPublishedAttachment(postId, added.id)).toMatchObject({ id: added.id });
    await forum.editPublishedPost(edit);
    await expect(forum.editPublishedPost({ ...edit, retainedAttachmentIds: [] }))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await forum.readPostHistory(postId, localTopicId)).toHaveLength(2);
  });

  it("rejects another user's edit, stale revision and blank body without a file", async () => {
    const postId = crypto.randomUUID(), revisionId = crypto.randomUUID();
    await forum.createPost({
      id: postId, topicId, authorId: ownerId,
      bodyRevision: { id: revisionId, originalContent: "Keep original", sourceLocale: "en" },
    });
    const generation = crypto.randomUUID();
    const edit = {
      postId, topicId, actorId: ownerId, expectedRevisionId: revisionId,
      body: "Changed", draftId: generation,  attachmentIds: [] as string[],
    };
    await expect(forum.editPublishedPost({ ...edit, actorId: "publication-other" }))
      .rejects.toBeInstanceOf(ForumAuthorizationError);
    await expect(forum.editPublishedPost({ ...edit, body: "  " }))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    expect((await forum.readPost(postId))?.body.id).toBe(revisionId);
    await expect(forum.editPublishedPost({ ...edit, expectedRevisionId: crypto.randomUUID(),  }))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    expect((await forum.readPost(postId))?.body.id).toBe(revisionId);
  });

  it("allows an attachment-only published message after removing its body text", async () => {
    const localTopicId = crypto.randomUUID();
    const localContext = `topic:${localTopicId}:reply`;
    await forum.createTopicWithInitialPost({
      id: localTopicId, sectionId, authorId: "publication-topic-author",
      titleRevision: { id: crypto.randomUUID(), originalContent: "Topic with attachment-only edit", sourceLocale: "en" },
      initialPost: {
        id: crypto.randomUUID(), topicId: localTopicId, authorId: "publication-topic-author",
        bodyRevision: { id: crypto.randomUUID(), originalContent: "Question", sourceLocale: "en" },
      },
    });
    const postId = crypto.randomUUID(), revisionId = crypto.randomUUID();
    const publicationGeneration = crypto.randomUUID();
    const file = attachment(publicationGeneration, localContext);
    await attachments.createDraftAttachment(file);
    await forum.createPost({
      id: postId, topicId: localTopicId, authorId: ownerId,
      publishedDraft: {
        contextKey: localContext, draftId: publicationGeneration, 
        attachmentIds: [file.id],
      },
      bodyRevision: { id: revisionId, originalContent: "Caption to remove", sourceLocale: "en" },
    });
    const editGeneration = crypto.randomUUID();
    await forum.editPublishedPost({
      postId, topicId: localTopicId, actorId: ownerId, expectedRevisionId: revisionId,
      body: "", draftId: editGeneration,  attachmentIds: [],
    });
    expect((await forum.readPost(postId))?.body.originalContent).toBe("");
    expect(await attachments.readPublishedAttachment(postId, file.id)).toMatchObject({ id: file.id });
    expect(await forum.readPostHistory(postId, localTopicId)).toHaveLength(2);
  });

  it("atomically publishes new edit attachments while retaining already published ones", async () => {
    const postId = crypto.randomUUID(), revisionId = crypto.randomUUID();
    await forum.createPost({
      id: postId, topicId, authorId: ownerId,
      bodyRevision: { id: revisionId, originalContent: "Original", sourceLocale: "en" },
    });
    const editContext = `post:${postId}:edit`;
    const generation = crypto.randomUUID();
    const file = attachment(generation, editContext);
    await attachments.createDraftAttachment(file);
    await forum.editPublishedPost({
      postId, topicId, actorId: ownerId, expectedRevisionId: revisionId,
      body: "", draftId: generation,  attachmentIds: [file.id],
    });
    expect(await attachments.readPublishedAttachment(postId, file.id)).toMatchObject({ id: file.id });
    expect((await forum.readPost(postId))?.body.originalContent).toBe("");
    expect(await forum.readPostHistory(postId, topicId)).toHaveLength(2);
  });
});


describe("durable mention notifications", () => {
  async function notifications(postId: string) {
    const result = await client.query<{ recipient_user_id: string; kind: string }>(
      "select recipient_user_id, kind from forum_reply_notifications where post_id = $1 order by recipient_user_id",
      [postId],
    );
    return result.rows.map((row) => [row.recipient_user_id, row.kind]);
  }

  it("notifies only published profile recipients and deduplicates against topic replies", async () => {
    const postId = crypto.randomUUID();
    await forum.createPost({
      id: postId, topicId, authorId: ownerId,
      bodyRevision: {
        id: crypto.randomUUID(), sourceLocale: "en",
        originalContent: [
          "[Topic author](/en/users/publication-topic-author)",
          "[Other user](/en/users/publication-other) [Again](/ru/users/publication-other)",
          "> [Quoted](/en/users/publication-other)",
          "`[Inline](/en/users/publication-other)`",
          "[Self](/en/users/publication-owner) [Missing](/en/users/does-not-exist)",
        ].join("\n"),
      },
    });
    expect(await notifications(postId)).toEqual([
      ["publication-other", "mention"],
      ["publication-topic-author", "reply"],
    ]);
    const inbox = await forum.readReplyNotifications("publication-other");
    expect(inbox.find((item) => item.postId === postId)?.kind).toBe("mention");
  });

  it("persists the per-post notified set across deletion and re-addition of an edited mention", async () => {
    const postId = crypto.randomUUID();
    const initialRevision = crypto.randomUUID();
    await forum.createPost({
      id: postId, topicId, authorId: ownerId,
      bodyRevision: { id: initialRevision, originalContent: "No mentions", sourceLocale: "en" },
    });
    const context = `post:${postId}:edit`;
    const firstDraft = operation(crypto.randomUUID(), context);
    await forum.editPublishedPost({
      postId, topicId, actorId: ownerId, expectedRevisionId: initialRevision,
      body: "[Other](/en/users/publication-other)", draftId: firstDraft.draftId,
       attachmentIds: [],
    });
    expect(await notifications(postId)).toEqual([
      ["publication-topic-author", "reply"], ["publication-other", "mention"],
    ].sort((a, b) => a[0]!.localeCompare(b[0]!)));
    const secondDraft = operation(crypto.randomUUID(), context);
    const revision2 = (await forum.readPost(postId))!.body.id;
    await forum.editPublishedPost({
      postId, topicId, actorId: ownerId, expectedRevisionId: revision2,
      body: "No mention now", draftId: secondDraft.draftId,
       attachmentIds: [],
    });
    const thirdDraft = operation(crypto.randomUUID(), context);
    const revision3 = (await forum.readPost(postId))!.body.id;
    await forum.editPublishedPost({
      postId, topicId, actorId: ownerId, expectedRevisionId: revision3,
      body: "[Other again](/he/users/publication-other)", draftId: thirdDraft.draftId,
       attachmentIds: [],
    });
    const rows = await notifications(postId);
    expect(rows.filter(([id]) => id === "publication-other")).toEqual([["publication-other", "mention"]]);
  });

  it("never creates mention notifications when an edit revision check fails", async () => {
    const postId = crypto.randomUUID(), revisionId = crypto.randomUUID();
    await forum.createPost({
      id: postId, topicId, authorId: ownerId,
      bodyRevision: { id: revisionId, sourceLocale: "en", originalContent: "Original" },
    });
    await expect(forum.editPublishedPost({
      postId, topicId, actorId: ownerId, expectedRevisionId: "obsolete-revision",
      body: "[Other](/en/users/publication-other)", draftId: crypto.randomUUID(),
       attachmentIds: [],
    })).rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await notifications(postId)).toEqual([["publication-topic-author", "reply"]]);
  });
});

// Operation contracts replacing persistent text-draft CAS/recovery scenarios.
describe("publication operations without text drafts", () => {
  it("publishes only the submitted subset, closes the operation and replays one result after a lost response", async () => {
    const operationId=crypto.randomUUID();
    const a=attachment(operationId),b=attachment(operationId);
    await attachments.createDraftAttachment(a);await attachments.createDraftAttachment(b);
    const before=await client.query("select count(*) from forum_editor_drafts");
    const request={...reply(crypto.randomUUID(),operationId),publishedDraft:{contextKey,draftId:operationId,attachmentIds:[a.id]}};
    const first=await forum.createPost(request);
    const replay=await forum.createPost({...request,id:crypto.randomUUID()});
    expect(replay.id).toBe(first.id);
    expect(await attachments.readPublishedAttachment(first.id,a.id)).toMatchObject({id:a.id});
    expect(await attachments.readPublishedAttachment(first.id,b.id)).toBeNull();
    await expect(attachments.createDraftAttachment(attachment(operationId))).rejects.toMatchObject({reason:"gone"});
    expect((await client.query("select 1 from forum_attachment_draft_refs where draft_id=$1",[operationId])).rowCount).toBe(0);
    expect((await client.query("select count(*) from forum_editor_drafts")).rows).toEqual(before.rows);
    await expect(forum.createPost({...request,bodyRevision:{...request.bodyRevision,originalContent:"Different retry"}})).rejects.toBeInstanceOf(ForumStateConflictError);
  });
  it("terminally cancels an operation even before its first upload",async()=>{
    const operationId=crypto.randomUUID();await attachments.cancelOperation(ownerId,contextKey,operationId);
    await expect(attachments.createDraftAttachment(attachment(operationId))).rejects.toMatchObject({reason:"gone"});
    await attachments.cancelOperation(ownerId,contextKey,operationId);
  });
  it("accepts parallel uploads on independent connections without any text save",async()=>{
    const operationId=crypto.randomUUID();const a=attachment(operationId),b=attachment(operationId);
    const connections=[connection(),connection()];await Promise.all(connections.map(c=>c.connect()));
    try {await Promise.all(connections.map((c,i)=>new DrizzleForumAttachments(drizzle(c)).createDraftAttachment(i?a:b)));}
    finally {await Promise.all(connections.map(c=>c.end()));}
    const posted=await forum.createPost({...reply(crypto.randomUUID(),operationId),publishedDraft:{contextKey,draftId:operationId,attachmentIds:[a.id,b.id]}});
    expect((await client.query("select attachment_id from forum_post_attachments where post_id=$1",[posted.id])).rowCount).toBe(2);
  });
  it("rejects IDs from another operation without consuming the valid selected file",async()=>{
    const operationId=crypto.randomUUID(),other=crypto.randomUUID();const file=attachment(operationId);
    await attachments.createDraftAttachment(file);
    const request={...reply(crypto.randomUUID(),other),publishedDraft:{contextKey,draftId:other,attachmentIds:[file.id]}};
    await expect(forum.createPost(request)).rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await attachments.readDraftAttachment(ownerId,contextKey,operationId,file.id)).toMatchObject({id:file.id});
    expect((await client.query("select id from forum_posts where id=$1",[request.id])).rowCount).toBe(0);
  });
  it("cleans up abandoned operation refs after 24 hours and fences subsequent uploads",async()=>{
    const operationId=crypto.randomUUID(),file=attachment(operationId);await attachments.createDraftAttachment(file);
    await client.query("update forum_attachment_draft_refs set created_at=now()-interval '25 hours' where draft_id=$1",[operationId]);
    await client.query("update forum_attachments set created_at=now()-interval '25 hours' where id=$1",[file.id]);
    const deleted:string[]=[];await new ForumAttachmentCleanup(drizzle(client),{delete:async key=>{deleted.push(key);}}).runOnce();
    expect(deleted).toContain(file.objectKey);
    await expect(attachments.createDraftAttachment(attachment(operationId))).rejects.toMatchObject({reason:"gone"});
  });
});


describe("temporary pool and explicit mounted selection",()=>{
  it("retains latest successful upload activity after deselection, then expires after 24h; reads/retry do not renew it",async()=>{
    const op=crypto.randomUUID(),a=attachment(op),b=attachment(op);
    await attachments.createDraftAttachment(a);await attachments.createDraftAttachment(b);
    const now=Date.now(),t0=now-24*3600000-1000,tB=t0+23*3600000;
    await client.query('update forum_attachment_draft_refs set created_at=$1 where attachment_id=$2',[new Date(t0),a.id]);
    await client.query('update forum_attachment_draft_refs set created_at=$1 where attachment_id=$2',[new Date(tB),b.id]);
    // Remove deselects B in the mounted form, including when all files are deselected.
    // It makes no server mutation, so B still carries the operation activity time.
    const deleted:string[]=[];const bucket={delete:async(key:string)=>{deleted.push(key);}};
    expect((await new ForumAttachmentCleanup(drizzle(client),bucket,()=>new Date(now)).runOnce()).prunedRefs).toBe(0);
    expect(await attachments.readDraftAttachment(ownerId,contextKey,op,a.id)).not.toBeNull();
    await attachments.createDraftAttachment(b); // A lost ACK retry does not refresh successful-new-upload time.
    await attachments.listDraftAttachments(ownerId,contextKey,op);
    expect((await client.query('select created_at from forum_attachment_draft_refs where attachment_id=$1',[b.id])).rows[0].created_at.getTime()).toBe(tB);
    const result=await new ForumAttachmentCleanup(drizzle(client),bucket,()=>new Date(tB+24*3600000+1)).runOnce();
    expect(result.prunedRefs).toBe(2);
    expect(deleted).toContain(a.objectKey);expect(deleted).toContain(b.objectKey);
    await expect(attachments.createDraftAttachment(attachment(op))).rejects.toMatchObject({reason:"gone"});
  });
  it.each(["upload-first","publish-first"] as const)("excludes a removed ambiguous upload across %s ordering",async(order)=>{
    const op=crypto.randomUUID(),a=attachment(op),removed=attachment(op);
    await attachments.createDraftAttachment(a);
    const publish=()=>forum.createPost({...reply(crypto.randomUUID(),op),publishedDraft:{contextKey,draftId:op,attachmentIds:[a.id]}});
    if(order==="upload-first")await attachments.createDraftAttachment(removed);
    const post=await publish();
    if(order==="publish-first")await expect(attachments.createDraftAttachment(removed)).rejects.toMatchObject({reason:"gone"});
    expect(await attachments.readPublishedAttachment(post.id,a.id)).not.toBeNull();
    expect(await attachments.readPublishedAttachment(post.id,removed.id)).toBeNull();
    expect((await client.query('select 1 from forum_attachment_draft_refs where draft_id=$1',[op])).rowCount).toBe(0);
  });
  it.each([[false,false],[true,false],[false,true],[true,true]])("saves rebased published selection: Remove A=%s, new C=%s",async(removeA,addC)=>{
    const op=crypto.randomUUID(),a=attachment(op),postId=crypto.randomUUID(),r1=crypto.randomUUID();
    await attachments.createDraftAttachment(a);
    await forum.createPost({...reply(postId,op),publishedDraft:{contextKey,draftId:op,attachmentIds:[a.id]},bodyRevision:{id:r1,originalContent:"Original",sourceLocale:"en"}});
    const editContext=`post:${postId}:edit`,otherOp=crypto.randomUUID(),b=attachment(otherOp,editContext);
    await attachments.createDraftAttachment(b);
    await forum.editPublishedPost({postId,topicId,actorId:ownerId,expectedRevisionId:r1,body:"Other tab added B",draftId:otherOp,attachmentIds:[b.id],retainedAttachmentIds:[a.id]});
    const r2=(await forum.readPost(postId))!.body.id;
    const localOp=crypto.randomUUID(),c=attachment(localOp,editContext);
    if(addC)await attachments.createDraftAttachment(c);
    const edit={postId,topicId,actorId:ownerId,body:"My edit",draftId:localOp,attachmentIds:addC?[c.id]:[],retainedAttachmentIds:removeA?[b.id]:[a.id,b.id]};
    await expect(forum.editPublishedPost({...edit,expectedRevisionId:r1})).rejects.toBeInstanceOf(ForumStateConflictError);
    await forum.editPublishedPost({...edit,expectedRevisionId:r2});
    expect(!!await attachments.readPublishedAttachment(postId,a.id)).toBe(!removeA);
    expect(await attachments.readPublishedAttachment(postId,b.id)).not.toBeNull();
    expect(!!await attachments.readPublishedAttachment(postId,c.id)).toBe(addC);
    await forum.editPublishedPost({...edit,expectedRevisionId:r2}); // lost Save ACK remains idempotent
    expect(await forum.readPostHistory(postId,topicId)).toHaveLength(3);
  });
});
