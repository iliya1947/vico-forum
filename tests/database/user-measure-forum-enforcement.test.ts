import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  DrizzleForumRepository, ForumPublicationReplayConflictError,
} from "../../db/forum-repository";
import { UserMeasureRestrictedError } from "../../db/user-measure-policy";
import type { UserMeasureRestrictionId } from "../../app/admin/user-measure-restrictions";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !["127.0.0.1", "localhost"].includes(new URL(databaseUrl).hostname)
  || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error("Disposable loopback *_test PostgreSQL is required");
}
const schema = "ap10_forum_restriction_test";
const client = new Client({ connectionString: databaseUrl, options: "-c search_path=" + schema });
const forum = new DrizzleForumRepository(drizzle(client), {
  cooldownMs: 0, now: () => new Date(),
});
const sectionId = "ap10-section";
const topicId = "ap10-fixture";

function newTopic(id: string = randomUUID(), authorId = "target") {
  return {
    id, authorId, sectionId,
    titleRevision: { id: randomUUID(), originalContent: "Subject", sourceLocale: "en" },
    initialPost: {
      id: randomUUID(), topicId: id, authorId,
      bodyRevision: { id: randomUUID(), originalContent: "Initial text", sourceLocale: "en" },
    },
  };
}
function newReply(id = randomUUID(), draftId?: string, body = "Existing reply") {
  return {
    id, topicId, authorId: "target",
    ...(draftId ? { publishedDraft: { contextKey: "topic:ap10-fixture:reply", draftId, attachmentIds: [] } } : {}),
    bodyRevision: { id: randomUUID(), originalContent: body, sourceLocale: "en" },
  };
}
async function createMeasure(
  restriction: UserMeasureRestrictionId,
  target = "target",
  expiresAt: string | null = null,
) {
  const id = randomUUID();
  await client.query(`insert into user_measures
    (id, target_user_id, issuer_user_id, issuer_authority_floor, create_fingerprint, initial_reason, expires_at)
    values ($1, $2, 'issuer', 1, $3, 'Test violation', $4)`,
    [id, target, "e".repeat(64), expiresAt]);
  await client.query(
    "insert into user_measure_restrictions(measure_id, restriction_key) values ($1, $2)",
    [id, restriction],
  );
  return id;
}
async function lift(id: string) {
  await client.query(`update user_measures
    set lifted_at=clock_timestamp(), lifted_by_user_id='issuer', lift_reason='Test completed'
    where id=$1`, [id]);
}
async function postCount() {
  return Number((await client.query<{ total: string }>(
    "select count(*)::text as total from forum_posts",
  )).rows[0]?.total);
}

beforeAll(async () => {
  await client.connect();
  await client.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const file of (await readdir("drizzle")).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort()) {
    await client.query((await readFile("drizzle/" + file, "utf8")).replaceAll('"public".', '"' + schema + '".'));
  }
  await client.query(`insert into "user"(id, name, email) values
    ('target', 'Target', 'ap10-forum-target@test.invalid'),
    ('issuer', 'Issuer', 'ap10-forum-issuer@test.invalid'),
    ('other', 'Other', 'ap10-forum-other@test.invalid')`);
  await forum.createCategory({ id: "ap10-category", name: "Category" });
  await forum.createSection({ id: sectionId, categoryId: "ap10-category", name: "Section" });
  await forum.createTopicWithInitialPost(newTopic(topicId, "issuer"));
});
afterEach(async () => {
  await client.query(`update user_measures
    set lifted_at=clock_timestamp(), lifted_by_user_id='issuer', lift_reason='Test cleanup'
    where lifted_at is null`);
});
afterAll(async () => {
  await client.query("drop schema if exists " + schema + " cascade");
  await client.end();
});

describe("AP-10 forum publication admission under active measures", () => {
  it("denies new own-body and attachment-removal edits atomically until lifted", async () => {
    const postId = randomUUID(), originalRevisionId = randomUUID(), attachmentId = randomUUID();
    await forum.createPost({
      ...newReply(postId),
      bodyRevision: { id: originalRevisionId, originalContent: "Original body", sourceLocale: "en" },
    });
    await client.query(`insert into forum_attachments
      (id, owner_id, object_key, file_name, declared_mime, detected_type,
       response_mime, byte_size, verification_status, created_at)
      values ($1, 'target', $2, 'published.txt', 'text/plain', 'text',
        'text/plain', 12, 'type-checked', clock_timestamp())`,
    [attachmentId, "private/" + attachmentId]);
    await client.query(
      "insert into forum_post_attachments (post_id, attachment_id, created_at) values ($1,$2,clock_timestamp())",
      [postId, attachmentId],
    );

    const edit = {
      topicId, postId, actorId: "target", expectedRevisionId: originalRevisionId,
      body: "Updated body", draftId: randomUUID(), attachmentIds: [] as string[],
      retainedAttachmentIds: [] as string[],
    };
    const restrictionId = await createMeasure("posts.edit");
    const revisionCount = async () => Number((await client.query<{ total: string }>(
      "select count(*)::text as total from forum_post_revisions where post_id=$1", [postId],
    )).rows[0]?.total);
    const before = await revisionCount();
    await expect(forum.editPublishedPost(edit)).rejects.toMatchObject({
      restriction: "posts.edit",
    });
    expect((await forum.readPost(postId))?.body).toMatchObject({
      id: originalRevisionId, originalContent: "Original body",
    });
    expect(await revisionCount()).toBe(before);
    expect((await client.query(
      "select attachment_id from forum_post_attachments where post_id=$1", [postId],
    )).rows).toEqual([{ attachment_id: attachmentId }]);
    expect((await client.query(
      "select draft_id from forum_publication_receipts where owner_id='target' and context_key=$1",
      [`post:${postId}:edit`],
    )).rowCount).toBe(0);
    await forum.createPost(newReply());
    await lift(restrictionId);

    await forum.editPublishedPost(edit);
    expect((await forum.readPost(postId))?.body.originalContent).toBe("Updated body");
    expect(await revisionCount()).toBe(before + 1);
    expect((await client.query(
      "select attachment_id from forum_post_attachments where post_id=$1", [postId],
    )).rows).toEqual([]);
  });

  it("replays exactly one previously committed edit under an active restriction", async () => {
    const postId = randomUUID(), originalRevisionId = randomUUID();
    await forum.createPost({
      ...newReply(postId),
      bodyRevision: { id: originalRevisionId, originalContent: "Before", sourceLocale: "en" },
    });
    const edit = {
      topicId, postId, actorId: "target", expectedRevisionId: originalRevisionId,
      body: "First revision", draftId: randomUUID(), attachmentIds: [] as string[],
      retainedAttachmentIds: [] as string[],
    };
    await forum.editPublishedPost(edit);
    const published = await forum.readPost(postId);
    const before = (await client.query(
      "select id from forum_post_revisions where post_id=$1", [postId],
    )).rowCount;
    await createMeasure("posts.edit");
    await expect(forum.editPublishedPost(edit)).resolves.toBeUndefined();
    expect((await forum.readPost(postId))?.body.id).toBe(published?.body.id);
    await expect(forum.editPublishedPost({ ...edit, body: "Changed retry" }))
      .rejects.toBeInstanceOf(ForumPublicationReplayConflictError);
    await expect(forum.editPublishedPost({
      ...edit, expectedRevisionId: published!.body.id, draftId: randomUUID(),
    })).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect((await client.query(
      "select id from forum_post_revisions where post_id=$1", [postId],
    )).rowCount).toBe(before);
    expect((await client.query(
      "select draft_id from forum_publication_receipts where owner_id='target' and context_key=$1",
      [`post:${postId}:edit`],
    )).rowCount).toBe(1);
  });

  it("treats overlapping, inactive and other-user edit restrictions independently", async () => {
    const postId = randomUUID(), originalRevisionId = randomUUID();
    await forum.createPost({
      ...newReply(postId),
      bodyRevision: { id: originalRevisionId, originalContent: "Before", sourceLocale: "en" },
    });
    await createMeasure("posts.edit", "other");
    await createMeasure("posts.edit", "target", "2000-01-01T00:00:00Z");
    const first = await createMeasure("posts.edit");
    const second = await createMeasure("posts.edit");
    const edit = {
      topicId, postId, actorId: "target", expectedRevisionId: originalRevisionId,
      body: "After", draftId: randomUUID(), attachmentIds: [] as string[],
    };
    await lift(first);
    await expect(forum.editPublishedPost(edit)).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    await client.query("update user_measure_restrictions set enabled=false where measure_id=$1", [second]);
    await expect(forum.editPublishedPost(edit)).resolves.toBeUndefined();
    expect((await forum.readPost(postId))?.body.originalContent).toBe("After");
  });

  it("denies both direct topic and topic-with-post writes, but preserves unrelated replies", async () => {
    const id = await createMeasure("topics.create");
    const before = await postCount();
    await expect(forum.createTopic(newTopic())).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    await expect(forum.createTopicWithInitialPost(newTopic())).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect(await postCount()).toBe(before);
    await forum.createPost(newReply());
    await lift(id);
    await expect(forum.createTopicWithInitialPost(newTopic())).resolves.toMatchObject({
      topic: { authorId: "target" },
    });
  });

  it("keeps overlapping reply restrictions until the last active measure ends", async () => {
    const first = await createMeasure("replies.create");
    const second = await createMeasure("replies.create");
    const before = await postCount();
    await expect(forum.createPost(newReply())).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    await client.query(
      "update user_measure_restrictions set enabled=false where measure_id=$1", [first],
    );
    await expect(forum.createPost(newReply())).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect(await postCount()).toBe(before);
    await lift(second);
    await expect(forum.createPost(newReply())).resolves.toMatchObject({ topicId });
  });

  it("returns a committed publication receipt after restriction without new side effects", async () => {
    const draftId = randomUUID();
    const initial = newReply(randomUUID(), draftId);
    const committed = await forum.createPost(initial);
    const before = await postCount();
    await createMeasure("replies.create");
    const retry = await forum.createPost({
      ...initial, id: randomUUID(),
      bodyRevision: { ...initial.bodyRevision, id: randomUUID() },
    });
    expect(retry.id).toBe(committed.id);
    await expect(forum.createPost({
      ...initial, id: randomUUID(),
      bodyRevision: { id: randomUUID(), originalContent: "Different payload", sourceLocale: "en" },
    })).rejects.toBeInstanceOf(ForumPublicationReplayConflictError);
    await expect(forum.createPost(newReply())).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect(await postCount()).toBe(before);
  });

  it("uses DB expiry, enabled membership and exact target instead of stale session state", async () => {
    await createMeasure("topics.create", "target", "2000-01-01T00:00:00Z");
    await createMeasure("topics.create", "other");
    const disabled = await createMeasure("topics.create");
    await client.query("update user_measure_restrictions set enabled=false where measure_id=$1", [disabled]);
    await expect(forum.createTopicWithInitialPost(newTopic())).resolves.toMatchObject({
      topic: { authorId: "target" },
    });
    const active = await createMeasure("topics.create");
    await expect(forum.createTopicWithInitialPost(newTopic())).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    await lift(active);
    await expect(forum.createTopicWithInitialPost(newTopic())).resolves.toBeDefined();
  });
});
