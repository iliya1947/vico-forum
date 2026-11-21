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

  it("masks hidden post and topic in mixed/legacy readers without dropping notices or altering state", async () => {
    const before = await forum.readNotifications(recipient, 0);
    const legacyBefore = await forum.readReplyNotifications(recipient);
    const counts = [await forum.countUnreadNotifications(recipient), await forum.countUnreadReplyNotifications(recipient)];
    const suppressionBefore = (await client.query<{ n: number }>(
      "select count(*)::int n from forum_post_notification_suppressions"
    )).rows[0]!.n;
    const snapshot = (rows: typeof before.items) => rows.map(n => ({
      id: n.id, kind: n.kind, createdAt: n.createdAt, readAt: n.readAt,
    }));
    try {
      await client.query("update forum_posts set is_hidden=true where id='g-post-reply-active'");
      const partial = await forum.readNotifications(recipient, 0);
      const legacyPartial = await forum.readReplyNotifications(recipient);
      expect(partial.items.find(n => n.id === "g-n4")).toMatchObject({
        unavailable: true, actorName: null, topicId: null, topicTitle: null, postId: null,
      });
      expect(legacyPartial.find(n => n.id === "g-n4")).toMatchObject({
        unavailable: true, actorName: null, topicId: null, topicTitle: null, postId: null,
      });
      expect(partial.items.find(n => n.id === "g-n2")?.topicTitle).toBe("Retained notification topic");
      expect(JSON.stringify(partial.items.find(n => n.id === "g-n4"))).not.toContain("Active reply");

      await client.query("update forum_topics set is_hidden=true where id='g-topic'");
      const hidden = await forum.readNotifications(recipient, 0);
      const hiddenLegacy = await forum.readReplyNotifications(recipient);
      expect(hidden.total).toBe(before.total);
      expect(hidden.hasMore).toBe(before.hasMore);
      expect(snapshot(hidden.items)).toEqual(snapshot(before.items));
      expect(hiddenLegacy.map(n => n.id)).toEqual(legacyBefore.map(n => n.id));
      expect(hiddenLegacy.map(n => [n.id, n.createdAt, n.readAt]))
        .toEqual(legacyBefore.map(n => [n.id, n.createdAt, n.readAt]));
      for (const n of hidden.items.filter(n => n.kind === "reply" || n.kind === "mention")) {
        expect(n).toMatchObject({
          unavailable: true, actorName: null, topicId: null, topicTitle: null, postId: null,
        });
        expect(n).not.toHaveProperty("actorIdentityKind");
      }
      for (const n of hiddenLegacy) {
        expect(n).toMatchObject({
          unavailable: true, actorName: null, topicId: null, topicTitle: null, postId: null,
        });
        expect(n).not.toHaveProperty("actorIdentityKind");
      }
      for (const kind of ["complaint-decision", "complaint-appeal-result"]) {
        expect(hidden.items.find(n => n.kind === kind))
          .toEqual(before.items.find(n => n.kind === kind));
      }
      const serialized = JSON.stringify([...hidden.items, ...hiddenLegacy]);
      for (const secret of ["Retained notification topic", "Active reply", "Active mention",
        "g-post-reply-active", "g-post-mention-active", "SECRET_RETAINED_REPLY_NAME",
        "SECRET_RETAINED_MENTION_NAME"]) expect(serialized).not.toContain(secret);
      expect([await forum.countUnreadNotifications(recipient),
        await forum.countUnreadReplyNotifications(recipient)]).toEqual(counts);
      expect((await client.query<{ n: number }>(
        "select count(*)::int n from forum_post_notification_suppressions"
      )).rows[0]!.n).toBe(suppressionBefore);
    } finally {
      await client.query("update forum_topics set is_hidden=false where id='g-topic'");
      await client.query("update forum_posts set is_hidden=false where id='g-post-reply-active'");
    }
    const restored = await forum.readNotifications(recipient, 0);
    const legacyRestored = await forum.readReplyNotifications(recipient);
    expect(restored).toEqual(before);
    expect(legacyRestored).toEqual(legacyBefore);
    expect([await forum.countUnreadNotifications(recipient),
      await forum.countUnreadReplyNotifications(recipient)]).toEqual(counts);
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
  it("marks hidden notices read with neutral targets and retains read_at, counts and Restore access", async () => {
    const beforeTotal = (await forum.readNotifications(recipient, 0)).total;
    const beforeNotices = (await client.query<{ id: string }>(
      "select id from forum_reply_notifications where recipient_user_id=$1 order by id", [recipient],
    )).rows.map(row => row.id);
    const suppressionBefore = (await client.query<{ recipient_user_id: string; post_id: string }>(
      "select recipient_user_id,post_id from forum_post_notification_suppressions order by recipient_user_id,post_id",
    )).rows;
    const beforeUnread = await forum.countUnreadNotifications(recipient);
    const beforeLegacyUnread = await forum.countUnreadReplyNotifications(recipient);
    const readAt = async (id: string) => (await client.query<{ read_at: Date | null }>(
      "select read_at from forum_reply_notifications where id=$1", [id],
    )).rows[0]!.read_at;
    let changed = 0;
    let legacyChanged = 0;
    let caseChanged = 0;
    let hiddenReplyReadAt: Date | null = null;
    let hiddenMentionReadAt: Date | null = null;
    try {
      // Post Hide alone is sufficient to mask the legacy notification target.
      await client.query("update forum_posts set is_hidden=true where id='g-post-mention-active'");
      expect(await readAt("g-n2")).toBeNull();
      await expect(forum.markNotificationRead("g-topic-author", "g-n2")).rejects.toThrow();
      expect(await readAt("g-n2")).toBeNull();
      expect(await forum.markNotificationRead(recipient, "g-n2")).toEqual({ kind: "unavailable" });
      hiddenMentionReadAt = await readAt("g-n2");
      expect(hiddenMentionReadAt).not.toBeNull();
      changed++;
      expect(await forum.markNotificationRead(recipient, "g-n2")).toEqual({ kind: "unavailable" });
      expect(await readAt("g-n2")).toEqual(hiddenMentionReadAt);

      // Topic Hide masks every ordinary destination, but not a protected Case result.
      await client.query("update forum_topics set is_hidden=true where id='g-topic'");
      expect(await forum.markReplyNotificationRead(recipient, "g-n4"))
        .toEqual({ unavailable: true });
      hiddenReplyReadAt = await readAt("g-n4");
      expect(hiddenReplyReadAt).not.toBeNull();
      legacyChanged++;
      expect(await forum.markReplyNotificationRead(recipient, "g-n4"))
        .toEqual({ unavailable: true });
      expect(await readAt("g-n4")).toEqual(hiddenReplyReadAt);

      expect(await forum.markNotificationRead(recipient, "g-n5"))
        .toEqual({ kind: "complaint-decision", caseId: "g-case" });
      caseChanged++;
      const caseReadAt = await readAt("g-n5");
      expect(caseReadAt).not.toBeNull();
      expect(await forum.markNotificationRead(recipient, "g-n5"))
        .toEqual({ kind: "complaint-decision", caseId: "g-case" });
      expect(await readAt("g-n5")).toEqual(caseReadAt);

      expect(await forum.countUnreadNotifications(recipient))
        .toBe(beforeUnread - changed - legacyChanged - caseChanged);
      expect(await forum.countUnreadReplyNotifications(recipient))
        .toBe(beforeLegacyUnread - changed - legacyChanged);
      const currentInbox = await forum.readNotifications(recipient, 0);
      const currentLegacy = await forum.readReplyNotifications(recipient);
      expect(currentInbox.total).toBe(beforeTotal);
      expect(currentInbox.items.map(n => n.id).sort()).toEqual(beforeNotices);
      const orderedUnreadFirst = (items: { readAt: Date | null }[]) => {
        const firstRead = items.findIndex(n => n.readAt !== null);
        return firstRead < 0 || items.slice(firstRead).every(n => n.readAt !== null);
      };
      expect(orderedUnreadFirst(currentInbox.items)).toBe(true);
      expect(orderedUnreadFirst(currentLegacy)).toBe(true);
      expect(currentInbox.items.filter(n => n.kind === "reply" || n.kind === "mention")
        .every(n => n.unavailable === true)).toBe(true);
      expect((await client.query<{ id: string }>(
        "select id from forum_reply_notifications where recipient_user_id=$1 order by id", [recipient],
      )).rows.map(row => row.id)).toEqual(beforeNotices);
      expect((await client.query(
        "select recipient_user_id,post_id from forum_post_notification_suppressions order by recipient_user_id,post_id",
      )).rows).toEqual(suppressionBefore);
    } finally {
      await client.query("update forum_topics set is_hidden=false where id='g-topic'");
      await client.query("update forum_posts set is_hidden=false where id='g-post-mention-active'");
    }
    expect(await forum.markNotificationRead(recipient, "g-n2")).toEqual({
      kind: "mention", topicId: "g-topic", postId: "g-post-mention-active",
    });
    expect(await forum.markReplyNotificationRead(recipient, "g-n4")).toEqual({
      topicId: "g-topic", postId: "g-post-reply-active",
    });
    expect(await readAt("g-n2")).toEqual(hiddenMentionReadAt);
    expect(await readAt("g-n4")).toEqual(hiddenReplyReadAt);
    expect((await forum.readNotifications(recipient, 0)).total).toBe(beforeTotal);
    expect(await forum.countUnreadNotifications(recipient))
      .toBe(beforeUnread - changed - legacyChanged - caseChanged);
    expect(await forum.countUnreadReplyNotifications(recipient))
      .toBe(beforeLegacyUnread - changed - legacyChanged);
  });

});
