import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { DrizzleForumRepository } from "../../db/forum-repository";
import { historicalForumMeasureAdmission } from "./historical-forum-measure-admission";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL required");
const url = new URL(databaseUrl);
if (!["localhost", "127.0.0.1"].includes(url.hostname) || !url.pathname.endsWith("_test")) {
  throw new Error("Disposable local *_test database required");
}

const schema = "forum_notification_actor_lifecycle_test";
const client = new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
const forum = new DrizzleForumRepository(
  drizzle(client), { cooldownMs: 0, now: () => new Date() }, historicalForumMeasureAdmission,
);
const recipient = "g-recipient";
const deletedActors = ["g-reply-deleted", "g-mention-deleted"] as const;

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const file of (await readdir("drizzle")).filter(f => /^\d{4}_.+\.sql$/.test(f)).sort()) {
    await client.query((await readFile(`drizzle/${file}`, "utf8")).replaceAll('"public".', `"${schema}".`));
  }
  for (const [id, name] of [
    [recipient, "Recipient"],
    ["g-topic-author", "Topic author"],
    ["g-reply-active", "Active reply"],
    ["g-mention-active", "Active mention"],
    ["g-reply-deleted", "SECRET_RETAINED_REPLY_NAME"],
    ["g-mention-deleted", "SECRET_RETAINED_MENTION_NAME"],
    ["g-reviewer", "Reviewer"],
  ]) {
    await client.query('insert into "user"(id,name,email,image) values ($1,$2,$3,$4)',
      [id, name, `${id}@example.test`, `SECRET_IMAGE_${id}`]);
  }
  await forum.createCategory({ id: "g-category", name: "Notification lifecycle" });
  await forum.createSection({ id: "g-section", categoryId: "g-category", name: "Actors" });
  await forum.createTopicWithInitialPost({
    id: "g-topic", sectionId: "g-section", authorId: "g-topic-author",
    titleRevision: { id: "g-title", originalContent: "Retained notification topic", sourceLocale: "en" },
    initialPost: { id: "g-source-post", topicId: "g-topic", authorId: "g-topic-author",
      bodyRevision: { id: "g-source-revision", originalContent: "Initial post", sourceLocale: "en" } },
  });
  for (const [actorId, postId] of [
    ["g-reply-deleted", "g-post-reply-deleted"],
    ["g-mention-deleted", "g-post-mention-deleted"],
    ["g-reply-active", "g-post-reply-active"],
    ["g-mention-active", "g-post-mention-active"],
  ]) {
    await forum.createPost({
      id: postId, topicId: "g-topic", authorId: actorId, parentPostId: "g-source-post",
      bodyRevision: { id: `${postId}-revision`, originalContent: "Reply body", sourceLocale: "en" },
    });
  }
  // System notification targets are valid complaint-domain rows, with no actor identity.
  await client.query(`insert into forum_complaint_targets
    (id,kind,topic_id,post_id,post_revision_id,affected_author_id)
    values ('g-target','post','g-topic','g-source-post','g-source-revision','g-topic-author')`);
  await client.query("insert into forum_complaint_cases(id,target_id) values('g-case','g-target')");
  await client.query(`insert into forum_complaint_decisions(id,case_id,outcome,reviewer_user_id,reasoning)
    values('g-decision','g-case','confirmed','g-reviewer','System decision')`);
  await client.query(`insert into forum_complaint_appeals
    (id,case_id,decision_id,appellant_user_id,side,argument,ordinal,status,
      outcome,reasoning,reviewer_user_id,created_at,resolved_at)
    values('g-appeal','g-case','g-decision','g-topic-author','author','Appeal',1,'resolved',
      'upheld','Appeal result','g-reviewer','2026-10-01','2026-10-02')`);

  await client.query(`insert into forum_reply_notifications
    (id,recipient_user_id,actor_user_id,topic_id,post_id,kind,created_at,read_at)
    values
    ('g-n1',$1,'g-reply-deleted','g-topic','g-post-reply-deleted','reply','2026-10-01 10:00+00',null),
    ('g-n2',$1,'g-mention-active','g-topic','g-post-mention-active','mention','2026-10-01 11:00+00',null),
    ('g-n3',$1,'g-mention-deleted','g-topic','g-post-mention-deleted','mention','2026-10-01 12:00+00','2026-10-02 00:00+00'),
    ('g-n4',$1,'g-reply-active','g-topic','g-post-reply-active','reply','2026-10-01 13:00+00',null)`, [recipient]);
  await client.query(`insert into forum_reply_notifications
    (id,recipient_user_id,complaint_decision_id,complaint_appeal_id,kind,created_at,read_at)
    values
    ('g-n5',$1,'g-decision',null,'complaint-decision','2026-10-01 14:00+00',null),
    ('g-n6',$1,null,'g-appeal','complaint-appeal-result','2026-10-01 15:00+00','2026-10-03 00:00+00')`, [recipient]);
});

afterAll(async () => {
  try { await client.query(`drop schema if exists ${schema} cascade`); } finally { await client.end(); }
});

describe("SA04-G notification actor identity in native PostgreSQL", () => {
  it("keeps both readers' recipient membership, unread-first order, targets, timestamps and counts", async () => {
    const initial = await forum.readNotifications(recipient, 0);
    const legacy = await forum.readReplyNotifications(recipient);
    const counts = [await forum.countUnreadNotifications(recipient), await forum.countUnreadReplyNotifications(recipient)];
    expect(initial).toMatchObject({ page: 0, total: 6, hasMore: false });
    expect(initial.items.map(item => item.id)).toEqual(["g-n5", "g-n4", "g-n2", "g-n1", "g-n6", "g-n3"]);
    expect(legacy.map(item => item.id)).toEqual(["g-n4", "g-n2", "g-n1", "g-n3"]);
    expect(counts).toEqual([4, 3]);
    expect(initial.items.filter(x => x.kind.startsWith("complaint")).map(x => ({
      kind: x.kind, actorName: x.actorName, caseId: x.caseId, appealId: x.appealId,
    }))).toEqual([
      { kind: "complaint-decision", actorName: null, caseId: "g-case", appealId: null },
      { kind: "complaint-appeal-result", actorName: null, caseId: "g-case", appealId: "g-appeal" },
    ]);
    expect((await forum.readNotifications(recipient, 1))).toMatchObject({ page: 1, total: 6, hasMore: false, items: [] });
    for (const actor of deletedActors) {
      await client.query(`update "user" set deactivated_at='2026-10-01',
        deactivated_by_user_id='g-reviewer', retain_at_least_until='2027-10-02'
        where id=$1`, [actor]);
    }
    const after = await forum.readNotifications(recipient, 0);
    const afterLegacy = await forum.readReplyNotifications(recipient);
    const withoutIdentity = <T extends { actorName: string | null; actorIdentityKind?: "deleted" }>(rows: T[]) =>
      rows.map(item => Object.fromEntries(Object.entries(item)
        .filter(([key]) => key !== "actorName" && key !== "actorIdentityKind")));
    expect(withoutIdentity(after.items)).toEqual(withoutIdentity(initial.items));
    expect(withoutIdentity(afterLegacy)).toEqual(withoutIdentity(legacy));
    expect(await forum.countUnreadNotifications(recipient)).toBe(counts[0]);
    expect(await forum.countUnreadReplyNotifications(recipient)).toBe(counts[1]);
    for (const id of ["g-n1", "g-n3"]) {
      expect(after.items.find(x => x.id === id)).toMatchObject({
        actorName: "Deleted user", actorIdentityKind: "deleted",
      });
      expect(afterLegacy.find(x => x.id === id)).toMatchObject({
        actorName: "Deleted user", actorIdentityKind: "deleted",
      });
    }
    for (const id of ["g-n2", "g-n4"]) {
      const active = after.items.find(x => x.id === id)!;
      expect(active.actorName).toBe(initial.items.find(x => x.id === id)?.actorName);
      expect(active).not.toHaveProperty("actorIdentityKind");
    }
    expect(after.items.filter(x => x.kind.startsWith("complaint"))).toEqual(
      initial.items.filter(x => x.kind.startsWith("complaint")));
    for (const rows of [after.items, afterLegacy]) {
      const serialized = JSON.stringify(rows);
      for (const privatePart of ["SECRET_RETAINED_REPLY_NAME", "SECRET_RETAINED_MENTION_NAME",
        "SECRET_IMAGE_", '"deactivatedAt":', '"deactivatedByUserId":', '"retainAtLeastUntil":',
        '"actorId":', '"actorDeactivatedAt":']) {
        expect(serialized).not.toContain(privatePart);
      }
    }
  });

  it("preserves recipient-owned mark-read behavior for an inactive reply actor", async () => {
    await expect(forum.markNotificationRead("g-topic-author", "g-n1")).rejects.toThrow();
    expect(await forum.markNotificationRead(recipient, "g-n1")).toEqual({
      kind: "reply", topicId: "g-topic", postId: "g-post-reply-deleted",
    });
    const first = (await forum.readNotifications(recipient, 0)).items.find(x => x.id === "g-n1")!;
    expect(first.readAt).not.toBeNull();
    expect(first.actorName).toBe("Deleted user");
    expect(await forum.markNotificationRead(recipient, "g-n1")).toEqual({
      kind: "reply", topicId: "g-topic", postId: "g-post-reply-deleted",
    });
    expect((await forum.readNotifications(recipient, 0)).items.find(x => x.id === "g-n1")!.readAt)
      .toEqual(first.readAt);
    expect(await forum.countUnreadNotifications(recipient)).toBe(3);
    expect(await forum.countUnreadReplyNotifications(recipient)).toBe(2);
  });
});
