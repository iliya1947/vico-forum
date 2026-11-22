import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { Client, Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { beforeAll, afterAll, afterEach, describe, it, expect } from "vitest";
import {
  DrizzleForumRepository, ForumAuthorizationError, ForumEntityNotFoundError,
  ForumStateConflictError, ForumVisibilityReasonError,
} from "../../db/forum-repository";
import { ForumService, InvalidForumContentError } from "../../db/forum-service";
import { HELP_SOLUTIONS_SERVICE_SECTION_ID } from "../../db/forum-identifiers";
import { DrizzleContentTopicTitlePlanningStore } from "../../db/content-topic-title-task-store";
import { DrizzleContentPostBodyPlanningStore } from "../../db/content-post-body-task-store";
import { contentPostBodyTaskSpecification } from "../../app/localization/content-post-body-planning";
import { CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION, protectMarkdownForTranslation } from "../../app/localization/content-markdown-translation";
import { DrizzleComplaintsRepository } from "../../db/complaints-repository";
import { contentTopicTitleTaskSpecification } from "../../app/localization/content-translation-planning";
import { CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH } from "../../app/localization/content-request-budget.server";
import { withOwnerUserMeasureAdmission, UserMeasureRestrictedError } from "../../db/user-measure-policy";

const url = process.env.DATABASE_URL!;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) throw new Error("Disposable loopback *_test DB required");
const schema = "visibility_commands_test";
const client = new Client({ connectionString: url, options: "-c search_path=" + schema });
const pool = new Pool({ connectionString: url, options: "-c search_path=" + schema, max: 8 });
const repository = new DrizzleForumRepository(
  drizzle(pool), { cooldownMs: 0, now: () => new Date() }, withOwnerUserMeasureAdmission("owner"), undefined, "owner",
);
const service = new ForumService(repository);
async function fixture(bodyContent = "PRIVATE POST", titleContent = "PRIVATE TOPIC", sectionId = "visibility-section") {
  const topicId = randomUUID(), postId = randomUUID(), titleRevisionId = randomUUID(), bodyRevisionId = randomUUID();
  await repository.createTopicWithInitialPost({
    id: topicId, sectionId, authorId: "author",
    titleRevision: { id: titleRevisionId, originalContent: titleContent, sourceLocale: "en" },
    initialPost: {
      id: postId, topicId, authorId: "author",
      bodyRevision: { id: bodyRevisionId, originalContent: bodyContent, sourceLocale: "en" },
    },
  });
  return { topicId, postId, titleRevisionId, bodyRevisionId };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
const topicCommand = (f: Fixture, actorId = "moderator1", hidden = true, expectedVisibilityVersion = 0, reason = "Hidden for review") =>
  ({ topicId: f.topicId, actorId, hidden, expectedVisibilityVersion, expectedRevisionId: f.titleRevisionId, reason });
const postCommand = (f: Fixture, actorId = "moderator1", hidden = true, expectedVisibilityVersion = 0, reason = "Hidden post") =>
  ({ topicId: f.topicId, postId: f.postId, actorId, hidden, expectedVisibilityVersion, expectedRevisionId: f.bodyRevisionId, reason });
async function events(targetId: string) {
  const result = await client.query("select action,target_type,target_label,context,reason from admin_history where target_id=$1 order by position", [targetId]);
  return result.rows;
}
beforeAll(async () => {
  await client.connect();
  await client.query("drop schema if exists " + schema + " cascade;create schema " + schema);
  for (const file of (await readdir("drizzle")).filter(x => /^\d{4}_.+\.sql$/.test(x)).sort()) {
    await client.query((await readFile("drizzle/" + file, "utf8")).replaceAll('"public".', '"' + schema + '".'));
  }
  await client.query("insert into \"user\"(id,name,email) values " +
    "('author','Author','author@visibility.test')," +
    "('moderator1','Moderator 1','mod1@visibility.test')," +
    "('moderator2','Moderator 2','mod2@visibility.test')," +
    "('ordinary','Ordinary','ordinary@visibility.test')," +
    "('owner','Owner','owner@visibility.test');" +
    "insert into authz_user_roles(user_id,role_id) values " +
    "('moderator1','builtin-moderator'),('moderator2','builtin-moderator')");
  await repository.createCategory({ id: "visibility-category", name: "Category" });
  await repository.createSection({ id: "visibility-section", categoryId: "visibility-category", name: "Section" });
});
afterEach(async () => {
  await client.query("update user_measures set lifted_at=clock_timestamp(),lifted_by_user_id='owner',lift_reason='Test cleanup' where lifted_at is null");
});
afterAll(async () => {
  await pool.end();
  await client.query("drop schema " + schema + " cascade");
  await client.end();
});

describe("V4 topic/post authoritative visibility commands", () => {
  it("B7-B1a returns observed versions only for visible public topic/post and excludes hidden tombstones", async () => {
    const f = await fixture("PRIVATE_B7_POST", "PRIVATE_B7_TOPIC");
    const initial = await repository.readTopicPage(f.topicId);
    expect(initial).toMatchObject({
      id: f.topicId, visibilityVersion: 0,
      title: { id: f.titleRevisionId },
      posts: [{ id: f.postId, visibilityVersion: 0, body: { id: f.bodyRevisionId } }],
    });
    await service.setPostVisibility(postCommand(f));
    const hiddenPost = await repository.readTopicPage(f.topicId);
    expect(hiddenPost?.visibilityVersion).toBe(0);
    expect(hiddenPost?.posts[0]).toEqual({
      kind: "hidden", id: f.postId, topicId: f.topicId,
      parentPostId: null, createdAt: expect.any(Date),
    });
    expect(JSON.stringify(hiddenPost)).not.toContain("PRIVATE_B7_POST");
    expect(JSON.stringify(hiddenPost?.posts[0])).not.toContain("visibilityVersion");
    await service.setPostVisibility(postCommand(f, "moderator1", false, 1, "Reviewed"));
    expect((await repository.readTopicPage(f.topicId))?.posts[0])
      .toMatchObject({ id: f.postId, visibilityVersion: 2, body: { id: f.bodyRevisionId } });
    await service.setTopicVisibility(topicCommand(f));
    expect(await repository.readTopicPage(f.topicId)).toBeUndefined();
    await service.setTopicVisibility(topicCommand(f, "moderator1", false, 1, "Reviewed topic"));
    expect(await repository.readTopicPage(f.topicId)).toMatchObject({
      id: f.topicId, visibilityVersion: 2,
      posts: [{ id: f.postId, visibilityVersion: 2 }],
    });
  });

  it("topic Hide/Restore has exact CAS, neutral History and admitted no-op", async () => {
    const f = await fixture();
    expect(await service.setTopicVisibility(topicCommand(f, "moderator1", false, 0, "")))
      .toEqual({ hidden: false, visibilityVersion: 0, changed: false });
    expect(await events(f.topicId)).toHaveLength(0);
    expect(await service.setTopicVisibility(topicCommand(f))).toEqual({ hidden: true, visibilityVersion: 1, changed: true });
    expect(await service.setTopicVisibility(topicCommand(f, "moderator1", true, 1, "")))
      .toEqual({ hidden: true, visibilityVersion: 1, changed: false });
    await expect(service.setTopicVisibility(topicCommand(f))).rejects.toBeInstanceOf(ForumStateConflictError);
    await expect(service.setTopicVisibility({ ...topicCommand(f, "moderator1", false, 1), expectedRevisionId: "stale" }))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await service.setTopicVisibility(topicCommand(f, "moderator1", false, 1, "Reviewed")))
      .toEqual({ hidden: false, visibilityVersion: 2, changed: true });
    const history = await events(f.topicId);
    expect(history.map(e => e.action)).toEqual(["topic.hidden", "topic.restored"]);
    expect(history[0]).toMatchObject({
      target_type: "topic", target_label: "topic:" + f.topicId, reason: "Hidden for review",
      context: { before: false, after: true, previousVersion: 0, version: 1, observedRevisionId: f.titleRevisionId },
    });
    expect(JSON.stringify(history)).not.toContain("PRIVATE TOPIC");
    const state = await client.query("select current_title_revision_id,is_hidden,visibility_version,visibility_changed_at from forum_topics where id=$1", [f.topicId]);
    expect(state.rows[0]).toMatchObject({ current_title_revision_id: f.titleRevisionId, is_hidden: false, visibility_version: 2 });
    expect(state.rows[0].visibility_changed_at).toBeInstanceOf(Date);
  });

  it("post Hide/Restore checks exact membership and post revision/version, preserving topic", async () => {
    const f = await fixture(), other = await fixture();
    await expect(service.setPostVisibility({ ...postCommand(f), topicId: other.topicId }))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect(await service.setPostVisibility(postCommand(f))).toEqual({ hidden: true, visibilityVersion: 1, changed: true });
    await expect(service.setPostVisibility(postCommand(f))).rejects.toBeInstanceOf(ForumStateConflictError);
    await expect(service.setPostVisibility({ ...postCommand(f, "moderator1", false, 1), expectedRevisionId: "stale" }))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await service.setPostVisibility(postCommand(f, "moderator1", false, 1, "Restored")))
      .toEqual({ hidden: false, visibilityVersion: 2, changed: true });
    const history = await events(f.postId);
    expect(history.map(e => e.action)).toEqual(["post.hidden", "post.restored"]);
    expect(history[0]).toMatchObject({ target_type: "post", target_label: "post:" + f.postId,
      context: { postId: f.postId, topicId: f.topicId, observedRevisionId: f.bodyRevisionId } });
    expect(JSON.stringify(history)).not.toContain("PRIVATE POST");
    expect((await client.query("select is_hidden,visibility_version from forum_topics where id=$1", [f.topicId])).rows[0])
      .toEqual({ is_hidden: false, visibility_version: 0 });
  });

  it("validates reasons/versions and requires nonblank reason for actual transitions", async () => {
    const f = await fixture();
    for (const reason of ["\0", "x".repeat(2001)]) {
      expect(() => service.setTopicVisibility(topicCommand(f, "moderator1", true, 0, reason)))
        .toThrow(InvalidForumContentError);
    }
    for (const version of [-1, 1.1, 2_147_483_648]) {
      expect(() => service.setTopicVisibility(topicCommand(f, "moderator1", true, version)))
        .toThrow(InvalidForumContentError);
    }
    await expect(service.setTopicVisibility(topicCommand(f, "moderator1", true, 0, "  ")))
      .rejects.toBeInstanceOf(ForumVisibilityReasonError);
    expect(await service.setTopicVisibility(topicCommand(f, "moderator1", false, 0, "  ")))
      .toEqual({ hidden: false, visibilityVersion: 0, changed: false });
    expect(await events(f.topicId)).toHaveLength(0);
  });

  it("fresh per-user allow/deny applies to no-op; bound Owner has effective authority", async () => {
    const f = await fixture();
    const input = topicCommand(f, "ordinary", false, 0, "");
    await expect(service.setTopicVisibility(input)).rejects.toBeInstanceOf(ForumAuthorizationError);
    await client.query("insert into authz_user_permission_overrides(user_id,permission_key,effect) values ('ordinary','forum.content.visibility.manage','allow')");
    expect(await service.setTopicVisibility(input)).toMatchObject({ changed: false });
    await client.query("update authz_user_permission_overrides set effect='deny' where user_id='ordinary' and permission_key='forum.content.visibility.manage'");
    await expect(service.setTopicVisibility(input)).rejects.toBeInstanceOf(ForumAuthorizationError);
    expect(await service.setTopicVisibility(topicCommand(f, "owner"))).toMatchObject({ changed: true });
  });

  it("AP-10 admin.forum measure rejects no-op, but bound Owner is immune", async () => {
    const f = await fixture(), id = randomUUID();
    await client.query("insert into user_measures(id,target_user_id,issuer_user_id,issuer_authority_floor,create_fingerprint,initial_reason) values ($1,'moderator1','owner',3,$2,'Test violation')", [id, "e".repeat(64)]);
    await client.query("insert into user_measure_restrictions(measure_id,restriction_key) values ($1,'admin.forum')", [id]);
    await expect(service.setTopicVisibility(topicCommand(f, "moderator1", false, 0, "")))
      .rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect(await service.setTopicVisibility(topicCommand(f, "owner", false, 0, "")))
      .toMatchObject({ changed: false });
  });

  it("inactive actor, version exhaustion, and History failure all fail without side effects", async () => {
    const f = await fixture();
    await client.query("update \"user\" set deactivated_at=clock_timestamp(),deactivated_by_user_id='owner',retain_at_least_until=clock_timestamp()+interval '1 year' where id='moderator2'");
    try {
      await expect(service.setTopicVisibility(topicCommand(f, "moderator2", false, 0, "")))
        .rejects.toMatchObject({ name: "AccountInactiveError" });
    } finally {
      await client.query("update \"user\" set deactivated_at=null,deactivated_by_user_id=null,retain_at_least_until=null where id='moderator2'");
    }
    await client.query("update forum_topics set visibility_version=2147483647,visibility_changed_at=clock_timestamp() where id=$1", [f.topicId]);
    await expect(service.setTopicVisibility(topicCommand(f, "moderator1", true, 2_147_483_647)))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    const g = await fixture();
    await client.query("create function fail_visibility_history() returns trigger language plpgsql as $$ begin raise exception 'visibility history rejected'; end; $$");
    await client.query("create trigger fail_visibility_history before insert on admin_history for each row when (new.action='topic.hidden') execute function fail_visibility_history()");
    try {
      await expect(service.setTopicVisibility(topicCommand(g))).rejects.toMatchObject({
        cause: expect.objectContaining({ message: "visibility history rejected" }),
      });
      expect((await client.query("select is_hidden,visibility_version from forum_topics where id=$1", [g.topicId])).rows[0])
        .toEqual({ is_hidden: false, visibility_version: 0 });
      expect(await events(g.topicId)).toHaveLength(0);
    } finally {
      await client.query("drop trigger fail_visibility_history on admin_history");
      await client.query("drop function fail_visibility_history()");
    }
  });

  it("two moderators: topic CAS yields exactly one committed transition", async () => {
    const f = await fixture();
    const results = await Promise.allSettled([
      service.setTopicVisibility(topicCommand(f, "moderator1")),
      service.setTopicVisibility(topicCommand(f, "moderator2")),
    ]);
    expect(results.filter(x => x.status === "fulfilled")).toHaveLength(1);
    const failed = results.find(x => x.status === "rejected");
    if (failed?.status === "rejected") expect(failed.reason).toBeInstanceOf(ForumStateConflictError);
    else throw new Error("expected stale contender");
    expect(await events(f.topicId)).toHaveLength(1);
  });
});

describe("V4 reply admission: hidden topic and direct parent", () => {
  function reply(f: Fixture, parentPostId?: string) {
    const id = randomUUID();
    return {
      id, topicId: f.topicId, authorId: "author",
      ...(parentPostId === undefined ? {} : { parentPostId }),
      bodyRevision: { id: randomUUID(), originalContent: "Visibility reply", sourceLocale: "en" },
    };
  }

  it("allows generic reply with hidden root but denies direct reply to hidden parent", async () => {
    const f = await fixture();
    await service.setPostVisibility(postCommand(f));
    const generic = await repository.createPost(reply(f));
    expect(generic.parentPostId).toBeNull();

    const direct = reply(f, f.postId);
    await expect(repository.createPost(direct)).rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect((await client.query("select id from forum_posts where id=$1", [direct.id])).rows).toHaveLength(0);
    expect((await client.query("select id from forum_post_revisions where id=$1", [direct.bodyRevision.id])).rows).toHaveLength(0);
    expect((await client.query("select id from forum_reply_notifications where post_id=$1", [direct.id])).rows).toHaveLength(0);

    await service.setPostVisibility(postCommand(f, "moderator1", false, 1, "Restored parent"));
    const visibleDirect = await repository.createPost(reply(f, f.postId));
    expect(visibleDirect.parentPostId).toBe(f.postId);
  });

  it("rejects new replies to hidden topics without publication side effects and admits after Restore", async () => {
    const f = await fixture();
    await service.setTopicVisibility(topicCommand(f));
    const denied = reply(f);
    await expect(repository.createPost(denied)).rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect((await client.query("select id from forum_posts where id=$1", [denied.id])).rows).toHaveLength(0);
    expect((await client.query("select id from forum_post_revisions where id=$1", [denied.bodyRevision.id])).rows).toHaveLength(0);
    expect((await client.query("select id from forum_reply_notifications where post_id=$1", [denied.id])).rows).toHaveLength(0);

    await service.setTopicVisibility(topicCommand(f, "moderator1", false, 1, "Restored topic"));
    expect((await repository.createPost(reply(f))).topicId).toBe(f.topicId);
  });

  it("retains inert receipt acknowledgement for already committed replies after Hide", async () => {
    const f = await fixture(), publishedDraft = {
      contextKey: "topic:" + f.topicId + ":reply", draftId: randomUUID(), attachmentIds: [],
    };
    const first = reply(f);
    const original = await repository.createPost({ ...first, publishedDraft });
    const before = (await client.query("select count(*)::int as total from forum_posts where topic_id=$1", [f.topicId])).rows[0]?.total;
    await service.setTopicVisibility(topicCommand(f));
    const replay = await repository.createPost({ ...first, id: randomUUID(), publishedDraft });
    expect(replay.id).toBe(original.id);
    expect((await client.query("select count(*)::int as total from forum_posts where topic_id=$1", [f.topicId])).rows[0]?.total)
      .toBe(before);
    const denied = reply(f);
    await expect(repository.createPost({ ...denied, publishedDraft: {
      contextKey: publishedDraft.contextKey, draftId: randomUUID(), attachmentIds: [],
    } })).rejects.toBeInstanceOf(ForumEntityNotFoundError);
  });
});

describe("V4 content writer admission: published edit, title and source locale", () => {
  function edit(f: Fixture, draftId = randomUUID()) {
    return {
      topicId: f.topicId, postId: f.postId, actorId: "author",
      expectedRevisionId: f.bodyRevisionId, body: "Edited content",
      draftId, attachmentIds: [] as string[],
    };
  }
  async function revisionState(f: Fixture) {
    const [post] = (await client.query(
      "select current_revision_id,edited_at from forum_posts where id=$1", [f.postId],
    )).rows;
    const count = await client.query(
      "select count(*)::int as n from forum_post_revisions where post_id=$1", [f.postId],
    );
    const receipts = await client.query(
      "select count(*)::int as n from forum_publication_receipts where post_id=$1", [f.postId],
    );
    const mentions = await client.query(
      "select count(*)::int as n from forum_reply_notifications where post_id=$1 and kind='mention'", [f.postId],
    );
    return { post, revisions: count.rows[0].n, receipts: receipts.rows[0].n, mentions: mentions.rows[0].n };
  }
  const titleSource = (f: Fixture, sourceLocale = "en", scope: "own" | "any" = "own") => ({
    topicId: f.topicId, expectedRevisionId: f.titleRevisionId,
    sourceLocale, scope, actorId: scope === "own" ? "author" : "moderator1",
  });
  const postSource = (f: Fixture, sourceLocale = "en", scope: "own" | "any" = "own") => ({
    topicId: f.topicId, postId: f.postId, expectedRevisionId: f.bodyRevisionId,
    sourceLocale, scope, actorId: scope === "own" ? "author" : "moderator1",
  });

  it("rejects new published edits under hidden topic/post without mutating revision or receipt", async () => {
    const f = await fixture(), input = edit(f), before = await revisionState(f);
    await service.setTopicVisibility(topicCommand(f));
    await expect(service.editPublishedPost(input)).rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect(await revisionState(f)).toEqual(before);
    await service.setTopicVisibility(topicCommand(f, "moderator1", false, 1, "Restore topic"));

    await service.setPostVisibility(postCommand(f));
    await expect(service.editPublishedPost(input)).rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect(await revisionState(f)).toEqual(before);
    await service.setPostVisibility(postCommand(f, "moderator1", false, 1, "Restore post"));

    await service.editPublishedPost(input);
    const after = await revisionState(f);
    expect(after.revisions).toBe(before.revisions + 1);
    expect(after.receipts).toBe(before.receipts + 1);
    expect(after.post.current_revision_id).not.toBe(f.bodyRevisionId);
  });

  it("keeps exact published edit receipt replay inert after Hide", async () => {
    const f = await fixture(), input = edit(f);
    await service.editPublishedPost(input);
    const before = await revisionState(f);
    await service.setTopicVisibility(topicCommand(f));
    await service.editPublishedPost(input);
    expect(await revisionState(f)).toEqual(before);
    await expect(service.editPublishedPost({ ...input, draftId: randomUUID() }))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect(await revisionState(f)).toEqual(before);
  });

  it("denies changed and unchanged own title edits for hidden topic, restores admissibility", async () => {
    const f = await fixture();
    await service.setTopicVisibility(topicCommand(f));
    for (const title of ["PRIVATE TOPIC", "Changed title"]) {
      await expect(service.editOwnTopicTitle({
        topicId: f.topicId, actorId: "author", expectedRevisionId: f.titleRevisionId, title,
      })).rejects.toBeInstanceOf(ForumEntityNotFoundError);
    }
    expect((await client.query(
      "select current_title_revision_id from forum_topics where id=$1", [f.topicId],
    )).rows[0].current_title_revision_id).toBe(f.titleRevisionId);
    await service.setTopicVisibility(topicCommand(f, "moderator1", false, 1, "Restore topic"));
    const updated = await service.editOwnTopicTitle({
      topicId: f.topicId, actorId: "author", expectedRevisionId: f.titleRevisionId, title: "Changed title",
    });
    expect(updated.originalContent).toBe("Changed title");
    expect(updated.id).not.toBe(f.titleRevisionId);
  });

  it("gates own/any title locale change and same-locale no-op on hidden topic", async () => {
    const f = await fixture();
    await service.setTopicVisibility(topicCommand(f));
    for (const scope of ["own", "any"] as const) {
      for (const locale of ["en", "he"]) {
        await expect(service.correctTopicTitleSourceLocale(titleSource(f, locale, scope)))
          .rejects.toBeInstanceOf(ForumEntityNotFoundError);
      }
    }
    await expect(repository.reviseTopicTitle(f.topicId, f.titleRevisionId, {
      id: randomUUID(), originalContent: "PRIVATE TOPIC", sourceLocale: "he",
    }, "moderator1", "any")).rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect((await client.query(
      "select count(*)::int as n from forum_topic_title_revisions where topic_id=$1", [f.topicId],
    )).rows[0].n).toBe(1);

    await service.setTopicVisibility(topicCommand(f, "moderator1", false, 1, "Restore topic"));
    const noOp = await service.correctTopicTitleSourceLocale(titleSource(f));
    expect(noOp).toBeUndefined();
    const updated = await service.correctTopicTitleSourceLocale(titleSource(f, "he", "own"));
    expect(updated?.sourceLocale).toBe("he");
  });

  it("gates own/any post locale change/no-op behind topic and post visibility", async () => {
    const f = await fixture();
    await service.setPostVisibility(postCommand(f));
    const assertDenied = async () => {
      for (const scope of ["own", "any"] as const) {
        for (const locale of ["en", "he"]) {
          await expect(service.correctPostBodySourceLocale(postSource(f, locale, scope)))
            .rejects.toBeInstanceOf(ForumEntityNotFoundError);
        }
      }
      await expect(repository.revisePostBody(f.postId, f.bodyRevisionId, {
        id: randomUUID(), originalContent: "PRIVATE POST", sourceLocale: "he",
      }, "moderator1", "any")).rejects.toBeInstanceOf(ForumEntityNotFoundError);
      expect((await client.query(
        "select count(*)::int as n from forum_post_revisions where post_id=$1", [f.postId],
      )).rows[0].n).toBe(1);
    };
    await assertDenied();
    await service.setPostVisibility(postCommand(f, "moderator1", false, 1, "Restore post"));
    await service.setTopicVisibility(topicCommand(f));
    await assertDenied();
    await service.setTopicVisibility(topicCommand(f, "moderator1", false, 1, "Restore topic"));
    expect(await service.correctPostBodySourceLocale(postSource(f))).toBeUndefined();
    const changed = await service.correctPostBodySourceLocale(postSource(f, "he", "own"));
    expect(changed?.sourceLocale).toBe("he");
  });

  it("enforces AP-10 admin.forum for same-locale any correction before no-op", async () => {
    const f = await fixture(), measureId = randomUUID();
    await client.query("insert into user_measures(id,target_user_id,issuer_user_id,issuer_authority_floor,create_fingerprint,initial_reason) values ($1,'moderator1','owner',3,$2,'Test violation')", [measureId, "f".repeat(64)]);
    await client.query("insert into user_measure_restrictions(measure_id,restriction_key) values ($1,'admin.forum')", [measureId]);
    await expect(service.correctTopicTitleSourceLocale(titleSource(f, "en", "any")))
      .rejects.toBeInstanceOf(UserMeasureRestrictedError);
    await expect(service.correctPostBodySourceLocale(postSource(f, "en", "any")))
      .rejects.toBeInstanceOf(UserMeasureRestrictedError);
  });
});

describe("V4 topic closure and pin admission under visibility", () => {
  const close = (f: Fixture, actorId: string, isClosed: boolean, expectedClosureVersion: number) =>
    repository.setTopicClosed({ topicId: f.topicId, actorId, isClosed, expectedClosureVersion });

  async function state(f: Fixture) {
    const [closure] = (await client.query(
      "select is_closed, closure_version from forum_topics where id=$1", [f.topicId],
    )).rows;
    return {
      closure,
      pinned: await repository.readTopicPinState(f.topicId),
      actions: (await events(f.topicId)).map(event => event.action),
    };
  }

  it("rejects closure, reopening/no-op and pin/unpin on hidden open topics without mutations", async () => {
    const f = await fixture();
    await service.setTopicVisibility(topicCommand(f));
    const before = await state(f);
    for (const actorId of ["owner", "moderator1"]) {
      await expect(close(f, actorId, true, 0)).rejects.toBeInstanceOf(ForumEntityNotFoundError);
      await expect(close(f, actorId, false, 0)).rejects.toBeInstanceOf(ForumEntityNotFoundError);
      await expect(repository.pinTopic(f.topicId, actorId)).rejects.toBeInstanceOf(ForumEntityNotFoundError);
      await expect(repository.unpinTopic(f.topicId, actorId)).rejects.toBeInstanceOf(ForumEntityNotFoundError);
    }
    expect(await state(f)).toEqual(before);

    await service.setTopicVisibility(topicCommand(f, "moderator1", false, 1, "Restore for author"));
    expect(await close(f, "owner", true, 0)).toEqual({
      isClosed: true, closureVersion: 1, changed: true,
    });
    await repository.pinTopic(f.topicId, "owner");
    expect(await repository.readTopicPinState(f.topicId)).toBe(true);
  });

  it("retains existing closed and pinned state while hidden, including refused no-ops", async () => {
    const f = await fixture();
    expect(await close(f, "owner", true, 0)).toMatchObject({ closureVersion: 1, changed: true });
    await repository.pinTopic(f.topicId, "owner");
    await service.setTopicVisibility(topicCommand(f));
    const before = await state(f);
    expect(before).toEqual({
      closure: { is_closed: true, closure_version: 1 },
      pinned: true,
      actions: ["topic.closed", "topic.pinned", "topic.hidden"],
    });
    for (const actorId of ["owner", "moderator1"]) {
      await expect(close(f, actorId, true, 1)).rejects.toBeInstanceOf(ForumEntityNotFoundError);
      await expect(close(f, actorId, false, 1)).rejects.toBeInstanceOf(ForumEntityNotFoundError);
      await expect(repository.pinTopic(f.topicId, actorId)).rejects.toBeInstanceOf(ForumEntityNotFoundError);
      await expect(repository.unpinTopic(f.topicId, actorId)).rejects.toBeInstanceOf(ForumEntityNotFoundError);
    }
    expect(await state(f)).toEqual(before);
    await service.setTopicVisibility(topicCommand(f, "moderator1", false, 1, "Reviewed"));
    expect(await close(f, "owner", true, 1)).toEqual({
      isClosed: true, closureVersion: 1, changed: false,
    });
    await repository.pinTopic(f.topicId, "owner");
    await repository.unpinTopic(f.topicId, "owner");
    expect(await close(f, "owner", false, 1)).toEqual({
      isClosed: false, closureVersion: 2, changed: true,
    });
    expect(await state(f)).toEqual({
      closure: { is_closed: false, closure_version: 2 },
      pinned: false,
      actions: [
        "topic.closed", "topic.pinned", "topic.hidden", "topic.restored",
        "topic.unpinned", "topic.reopened",
      ],
    });
  });
});

describe("V4 Help signal admission under hidden topics and answer", () => {
  async function helpFixture(): Promise<Fixture> {
    const topicId = randomUUID(), postId = randomUUID();
    const titleRevisionId = randomUUID(), bodyRevisionId = randomUUID();
    await repository.createTopicWithInitialPost({
      id: topicId, sectionId: HELP_SOLUTIONS_SERVICE_SECTION_ID, authorId: "author",
      titleRevision: { id: titleRevisionId, originalContent: "Help question", sourceLocale: "en" },
      initialPost: {
        id: postId, topicId, authorId: "author",
        bodyRevision: { id: bodyRevisionId, originalContent: "Question details", sourceLocale: "en" },
      },
    });
    return { topicId, postId, titleRevisionId, bodyRevisionId };
  }
  const details = (f: Fixture) => ({
    kind: "needs-details" as const, topicId: f.topicId, actorId: "ordinary",
    explanation: "Question needs details", proposedOriginalTopicId: null,
  });
  const duplicate = (f: Fixture, original: Fixture) => ({
    kind: "duplicate" as const, topicId: f.topicId, actorId: "ordinary",
    explanation: null, proposedOriginalTopicId: original.topicId,
  });
  async function facts(f: Fixture) {
    const [topic, signals, relationships, history] = await Promise.all([
      client.query("select needs_details from forum_topics where id=$1", [f.topicId]),
      client.query("select id,kind,status,resolved_by_user_id from forum_help_signals where topic_id=$1 order by id", [f.topicId]),
      client.query("select id,duplicate_topic_id,original_topic_id from forum_help_duplicate_relationships where duplicate_topic_id=$1 order by id", [f.topicId]),
      client.query("select action,reason from admin_history where target_id=$1 order by position", [f.topicId]),
    ]);
    return { needsDetails: topic.rows[0]?.needs_details, signals: signals.rows,
      relationships: relationships.rows, history: history.rows };
  }

  it("denies new Help signal under hidden topic and restores submission", async () => {
    const f = await helpFixture();
    await service.setTopicVisibility(topicCommand(f));
    const before = await facts(f);
    await expect(service.createHelpSignal(details(f))).rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect(await facts(f)).toEqual(before);
    await service.setTopicVisibility(topicCommand(f, "moderator1", false, 1, "Reviewed question"));
    const signal = await service.createHelpSignal(details(f));
    expect(signal.status).toBe("pending");
  });

  it("blocks signal withdrawal and both review outcomes on hidden topic; pending remains intact", async () => {
    const f = await helpFixture();
    const signal = await service.createHelpSignal(details(f));
    await service.setTopicVisibility(topicCommand(f));
    const before = await facts(f);
    await expect(service.withdrawHelpSignal(signal.id, f.topicId, "ordinary"))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    await expect(service.resolveHelpSignal(signal.id, "moderator1", "rejected"))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    await expect(service.resolveHelpSignal(signal.id, "moderator1", "accepted"))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect(await facts(f)).toEqual(before);
    await service.setTopicVisibility(topicCommand(f, "moderator1", false, 1, "Reviewed question"));
    expect(await service.resolveHelpSignal(signal.id, "moderator1", "accepted")).toBe("accepted");
    expect((await facts(f)).needsDetails).toBe(true);
  });

  it("permits withdrawal after Restore with no ordinary History changes", async () => {
    const f = await helpFixture();
    const signal = await service.createHelpSignal(details(f));
    await service.setTopicVisibility(topicCommand(f));
    await expect(service.withdrawHelpSignal(signal.id, f.topicId, "ordinary"))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    await service.setTopicVisibility(topicCommand(f, "moderator1", false, 1, "Reviewed question"));
    const beforeHistory = (await facts(f)).history;
    await service.withdrawHelpSignal(signal.id, f.topicId, "ordinary");
    const after = await facts(f);
    expect(after.signals[0]).toMatchObject({ id: signal.id, status: "withdrawn" });
    expect(after.history).toEqual(beforeHistory);
  });

  it("denies duplicate submission and accepted review if either locked topic is hidden", async () => {
    const f = await helpFixture(), original = await helpFixture();
    await service.setTopicVisibility(topicCommand(original));
    const before = await facts(f);
    await expect(service.createHelpSignal(duplicate(f, original)))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect(await facts(f)).toEqual(before);
    await service.setTopicVisibility(topicCommand(original, "moderator1", false, 1, "Reviewed original"));
    const signal = await service.createHelpSignal(duplicate(f, original));
    await service.setTopicVisibility(topicCommand(f));
    const hiddenCandidate = await facts(f);
    await expect(service.resolveHelpSignal(signal.id, "moderator1", "accepted"))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect(await facts(f)).toEqual(hiddenCandidate);
    await service.setTopicVisibility(topicCommand(f, "moderator1", false, 1, "Reviewed question"));
    await service.setTopicVisibility(topicCommand(original, "moderator1", true, 2));
    const hiddenOriginal = await facts(f);
    await expect(service.resolveHelpSignal(signal.id, "moderator1", "accepted"))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect(await facts(f)).toEqual(hiddenOriginal);
    await service.setTopicVisibility(topicCommand(original, "moderator1", false, 3, "Reviewed original"));
    expect(await service.resolveHelpSignal(signal.id, "moderator1", "accepted")).toBe("accepted");
    expect((await facts(f)).relationships).toHaveLength(1);
  });

  it("denies solution signal submission and accepted review while the selected answer is hidden", async () => {
    const f = await helpFixture(), answerId = randomUUID(), answerRevisionId = randomUUID();
    await repository.createPost({
      id: answerId, topicId: f.topicId, authorId: "ordinary",
      bodyRevision: { id: answerRevisionId, originalContent: "Helpful answer", sourceLocale: "en" },
    });
    await repository.selectBestAnswer(f.topicId, answerId, "author", "own");
    await repository.markTopicSolved(f.topicId, "author", "own");
    const answerCommand = (hidden: boolean, version: number, reason: string) => ({
      topicId: f.topicId, postId: answerId, actorId: "moderator1",
      hidden, expectedVisibilityVersion: version, expectedRevisionId: answerRevisionId, reason,
    });
    const submission = {
      kind: "needs-review" as const, topicId: f.topicId, actorId: "ordinary",
      explanation: "Review the answer", proposedOriginalTopicId: null,
    };
    await service.setPostVisibility(answerCommand(true, 0, "Review answer visibility"));
    const before = await facts(f);
    await expect(service.createHelpSignal(submission)).rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect(await facts(f)).toEqual(before);
    await service.setPostVisibility(answerCommand(false, 1, "Restore answer visibility"));
    const signal = await service.createHelpSignal(submission);
    await service.setPostVisibility(answerCommand(true, 2, "Review answer visibility"));
    const pending = await facts(f);
    await expect(service.resolveHelpSignal(signal.id, "moderator1", "accepted"))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect(await facts(f)).toEqual(pending);
    await service.setPostVisibility(answerCommand(false, 3, "Restore answer visibility"));
    expect(await service.resolveHelpSignal(signal.id, "moderator1", "accepted")).toBe("accepted");
    expect((await facts(f)).signals[0]?.status).toBe("accepted");
  });

  it("denies withdrawal and rejected review of a duplicate while its proposed original is hidden", async () => {
    const f = await helpFixture(), original = await helpFixture();
    const signal = await service.createHelpSignal(duplicate(f, original));
    await service.setTopicVisibility(topicCommand(original));
    const before = await facts(f);
    await expect(service.withdrawHelpSignal(signal.id, f.topicId, "ordinary"))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    await expect(service.resolveHelpSignal(signal.id, "moderator1", "rejected"))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect(await facts(f)).toEqual(before);
    await service.setTopicVisibility(topicCommand(original, "moderator1", false, 1, "Reviewed original"));
    expect(await service.resolveHelpSignal(signal.id, "moderator1", "rejected")).toBe("rejected");
    expect((await facts(f)).signals[0]?.status).toBe("rejected");
  });

  it("denies withdrawal/rejection of a selected-answer signal while its post is hidden", async () => {
    const f = await helpFixture(), answerId = randomUUID(), answerRevisionId = randomUUID();
    await repository.createPost({
      id: answerId, topicId: f.topicId, authorId: "ordinary",
      bodyRevision: { id: answerRevisionId, originalContent: "Selected answer", sourceLocale: "en" },
    });
    await repository.selectBestAnswer(f.topicId, answerId, "author", "own");
    await repository.markTopicSolved(f.topicId, "author", "own");
    const signal = await service.createHelpSignal({
      kind: "needs-review", topicId: f.topicId, actorId: "ordinary",
      explanation: "Please check this solution", proposedOriginalTopicId: null,
    });
    await service.setPostVisibility({
      topicId: f.topicId, postId: answerId, actorId: "moderator1", hidden: true,
      expectedVisibilityVersion: 0, expectedRevisionId: answerRevisionId, reason: "Hide answer",
    });
    const before = await facts(f);
    await expect(service.withdrawHelpSignal(signal.id, f.topicId, "ordinary"))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    await expect(service.resolveHelpSignal(signal.id, "moderator1", "rejected"))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect(await facts(f)).toEqual(before);
    await service.setPostVisibility({
      topicId: f.topicId, postId: answerId, actorId: "moderator1", hidden: false,
      expectedVisibilityVersion: 1, expectedRevisionId: answerRevisionId, reason: "Restore answer",
    });
    await service.withdrawHelpSignal(signal.id, f.topicId, "ordinary");
    expect((await facts(f)).signals[0]?.status).toBe("withdrawn");
  });
});

describe("V4 solution moderation admission under topic and answer visibility", () => {
  async function solvedQuestion() {
    const topicId = randomUUID(), postId = randomUUID();
    const titleRevisionId = randomUUID(), bodyRevisionId = randomUUID();
    const answerId = randomUUID(), answerRevisionId = randomUUID();
    await repository.createTopicWithInitialPost({
      id: topicId, sectionId: HELP_SOLUTIONS_SERVICE_SECTION_ID, authorId: "author",
      titleRevision: { id: titleRevisionId, originalContent: "Help question", sourceLocale: "en" },
      initialPost: {
        id: postId, topicId, authorId: "author",
        bodyRevision: { id: bodyRevisionId, originalContent: "Help body", sourceLocale: "en" },
      },
    });
    await repository.createPost({
      id: answerId, topicId, authorId: "ordinary",
      bodyRevision: { id: answerRevisionId, originalContent: "Selected answer", sourceLocale: "en" },
    });
    await repository.selectBestAnswer(topicId, answerId, "author", "own");
    await repository.markTopicSolved(topicId, "author", "own");
    return { topicId, postId, titleRevisionId, bodyRevisionId, answerId, answerRevisionId };
  }
  async function state(f: Awaited<ReturnType<typeof solvedQuestion>>) {
    const [post, signals, history] = await Promise.all([
      client.query(
        "select solution_moderation_status,solution_outdated_reason,solution_outdated_reason_kind from forum_posts where id=$1",
        [f.answerId],
      ),
      client.query(
        "select id,kind,status,resolved_by_user_id from forum_help_signals where topic_id=$1 order by id",
        [f.topicId],
      ),
      client.query("select action,reason,context from admin_history where target_id=$1 order by position", [f.topicId]),
    ]);
    return { post: post.rows[0], signals: signals.rows, history: history.rows };
  }
  const moderate = (f: Awaited<ReturnType<typeof solvedQuestion>>,
    status: "needs-review" | "outdated" | null, actorId = "moderator1") =>
    service.setHelpSolutionModeration(
      f.topicId, status, status === "outdated" ? "Answer is stale" : null, actorId, f.answerId,
    );
  const hideTopic = (f: Awaited<ReturnType<typeof solvedQuestion>>, hidden: boolean, version: number) =>
    service.setTopicVisibility({
      topicId: f.topicId, actorId: "moderator1", hidden,
      expectedVisibilityVersion: version, expectedRevisionId: f.titleRevisionId, reason: "Visibility review",
    });
  const hideAnswer = (f: Awaited<ReturnType<typeof solvedQuestion>>, hidden: boolean, version: number) =>
    service.setPostVisibility({
      topicId: f.topicId, postId: f.answerId, actorId: "moderator1", hidden,
      expectedVisibilityVersion: version, expectedRevisionId: f.answerRevisionId, reason: "Answer review",
    });

  it("rejects all moderation states, including unchanged clear, while topic hidden", async () => {
    const f = await solvedQuestion();
    const signal = await service.createHelpSignal({
      kind: "needs-review", topicId: f.topicId, actorId: "ordinary",
      explanation: "Please check", proposedOriginalTopicId: null,
    });
    await hideTopic(f, true, 0);
    const before = await state(f);
    for (const actor of ["moderator1", "owner"]) {
      for (const status of ["needs-review", "outdated", null] as const) {
        await expect(moderate(f, status, actor)).rejects.toBeInstanceOf(ForumEntityNotFoundError);
        expect(await state(f)).toEqual(before);
      }
    }
    await hideTopic(f, false, 1);
    await moderate(f, "needs-review");
    const after = await state(f);
    expect(after.post.solution_moderation_status).toBe("needs-review");
    expect(after.signals.find(s => s.id === signal.id)?.status).toBe("superseded");
    expect(after.history.filter(e => e.action === "help.solutionModerationChanged")).toHaveLength(1);
  });

  it("rejects hidden selected answer on changed/no-op moderation without touching signals or History", async () => {
    const f = await solvedQuestion();
    await moderate(f, "needs-review");
    await hideAnswer(f, true, 0);
    const before = await state(f);
    for (const actor of ["moderator1", "owner"]) {
      for (const status of ["needs-review", "outdated", null] as const) {
        await expect(moderate(f, status, actor)).rejects.toBeInstanceOf(ForumEntityNotFoundError);
        expect(await state(f)).toEqual(before);
      }
    }
    await hideAnswer(f, false, 1);
    await moderate(f, "outdated");
    expect((await state(f)).post).toMatchObject({
      solution_moderation_status: "outdated", solution_outdated_reason: "Answer is stale",
    });
    await moderate(f, null);
    const restored = await state(f);
    expect(restored.post.solution_moderation_status).toBeNull();
    expect(restored.history.filter(e => e.action === "help.solutionModerationChanged")).toHaveLength(3);
  });

  it.each([
    { transition: "Hide", moderationFirst: true, initiallyHidden: false },
    { transition: "Hide", moderationFirst: false, initiallyHidden: false },
    { transition: "Restore", moderationFirst: true, initiallyHidden: true },
    { transition: "Restore", moderationFirst: false, initiallyHidden: true },
  ] as const)(
    "B8-A solution moderation × $transition, moderationFirst=$moderationFirst: real PG order",
    async ({ transition, moderationFirst, initiallyHidden }) => {
      const f = await solvedQuestion();
      const signal = await service.createHelpSignal({
        kind: "needs-review", topicId: f.topicId, actorId: "ordinary",
        explanation: "Review the selected answer", proposedOriginalTopicId: null,
      });
      if (initiallyHidden) await hideTopic(f, true, 0);

      async function connected() {
        const connection = new Client({ connectionString: url, options: "-c search_path=" + schema });
        await connection.connect();
        await connection.query("set statement_timeout='25000ms'");
        const pid = (await connection.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]!.pid;
        return { connection, pid };
      }
      async function waitBlocked(waiter: number, expected: number[]) {
        const deadline = Date.now() + 8_000;
        let last: unknown;
        while (Date.now() < deadline) {
          const observation = await client.query<{
            wait_event_type: string | null; blockers: number[];
          }>(
            "select wait_event_type,pg_blocking_pids(pid) as blockers from pg_stat_activity where pid=$1",
            [waiter],
          );
          last = observation.rows[0];
          if (observation.rows[0]?.wait_event_type === "Lock"
            && observation.rows[0].blockers.some(pid => expected.includes(pid))) return;
          await new Promise(resolve => setTimeout(resolve, 25));
        }
        throw new Error("Expected solution/visibility PG lock wait: " +
          JSON.stringify({ waiter, expected, last }));
      }

      const [holder, writer, manager] = await Promise.all([
        connected(), connected(), connected(),
      ]);
      const forum = (connection: Client) => new ForumService(new DrizzleForumRepository(
        drizzle(connection), { cooldownMs: 0, now: () => new Date() },
        withOwnerUserMeasureAdmission("owner"), undefined, "owner",
      ));
      const endingHidden = transition === "Hide";
      let held = false;
      let moderation: ReturnType<ForumService["setHelpSolutionModeration"]> | undefined;
      let change: ReturnType<ForumService["setTopicVisibility"]> | undefined;
      try {
        await holder.connection.query("begin");
        held = true;
        await holder.connection.query(
          "select id from forum_topics where id=$1 for update", [f.topicId],
        );
        const startModeration = async () => {
          moderation = forum(writer.connection).setHelpSolutionModeration(
            f.topicId, "needs-review", null, "moderator1", f.answerId,
          );
          void moderation.catch(() => undefined);
          await waitBlocked(writer.pid, [holder.pid, manager.pid]);
        };
        const startVisibility = async () => {
          change = forum(manager.connection).setTopicVisibility({
            topicId: f.topicId, actorId: "moderator1", hidden: endingHidden,
            expectedVisibilityVersion: initiallyHidden ? 1 : 0,
            expectedRevisionId: f.titleRevisionId,
            reason: "Solution race visibility review",
          });
          void change.catch(() => undefined);
          await waitBlocked(manager.pid, [holder.pid, writer.pid]);
        };
        if (moderationFirst) {
          await startModeration();
          await startVisibility();
        } else {
          await startVisibility();
          await startModeration();
        }
        await holder.connection.query("commit");
        held = false;
        const [moderationResult, changeResult] = await Promise.allSettled([moderation!, change!]);
        expect(changeResult).toMatchObject({
          status: "fulfilled",
          value: { hidden: endingHidden, changed: true, visibilityVersion: initiallyHidden ? 2 : 1 },
        });
        const admitted = transition === "Hide" ? moderationFirst : !moderationFirst;
        if (admitted) {
          expect(moderationResult).toEqual({ status: "fulfilled", value: undefined });
        } else {
          expect(moderationResult.status).toBe("rejected");
          if (moderationResult.status === "rejected") {
            expect(moderationResult.reason).toBeInstanceOf(ForumEntityNotFoundError);
          }
        }
        const actual = await state(f);
        expect(actual.post).toMatchObject({
          solution_moderation_status: admitted ? "needs-review" : null,
          solution_outdated_reason: null, solution_outdated_reason_kind: null,
        });
        expect(actual.signals.find(s => s.id === signal.id)?.status)
          .toBe(admitted ? "superseded" : "pending");
        const actions = actual.history.map(event => event.action);
        const visibilityActions = initiallyHidden ? ["topic.hidden", "topic.restored"] : ["topic.hidden"];
        expect(actions).toEqual(
          transition === "Hide" && admitted
            ? ["help.solutionModerationChanged", ...visibilityActions]
            : admitted
              ? [...visibilityActions, "help.solutionModerationChanged"]
              : visibilityActions,
        );
        if (endingHidden) {
          await hideTopic(f, false, 1);
        }
        if (!admitted) {
          await moderate(f, "needs-review");
          const afterRestore = await state(f);
          expect(afterRestore.post.solution_moderation_status).toBe("needs-review");
          expect(afterRestore.signals.find(s => s.id === signal.id)?.status).toBe("superseded");
          expect(afterRestore.history.filter(e => e.action === "help.solutionModerationChanged"))
            .toHaveLength(1);
        }
        expect((await client.query(
          "select is_solved,best_answer_post_id from forum_topics where id=$1",
          [f.topicId],
        )).rows[0]).toEqual({ is_solved: true, best_answer_post_id: f.answerId });
      } finally {
        if (held) await holder.connection.query("rollback");
        await Promise.allSettled([moderation, change]);
        await Promise.all([
          holder.connection.end(), writer.connection.end(), manager.connection.end(),
        ]);
      }
    },
    30_000,
  );

});

describe("V4 best-answer selection under hidden topic and answer", () => {
  async function helpQuestion() {
    const topicId = randomUUID(), postId = randomUUID(), titleRevisionId = randomUUID();
    const bodyRevisionId = randomUUID();
    await repository.createTopicWithInitialPost({
      id: topicId, sectionId: HELP_SOLUTIONS_SERVICE_SECTION_ID, authorId: "author",
      titleRevision: { id: titleRevisionId, originalContent: "Help question", sourceLocale: "en" },
      initialPost: {
        id: postId, topicId, authorId: "author",
        bodyRevision: { id: bodyRevisionId, originalContent: "Question details", sourceLocale: "en" },
      },
    });
    const answers = [0, 1].map(() => ({ id: randomUUID(), revisionId: randomUUID() }));
    for (const answer of answers) {
      await repository.createPost({
        id: answer.id, topicId, authorId: "ordinary",
        bodyRevision: { id: answer.revisionId, originalContent: "Helpful answer", sourceLocale: "en" },
      });
    }
    return { topicId, postId, titleRevisionId, bodyRevisionId, answers };
  }
  type Question = Awaited<ReturnType<typeof helpQuestion>>;
  const selection = (f: Question, index: number, scope: "own" | "any" = "own") =>
    service.selectBestAnswer(f.topicId, f.answers[index]!.id,
      scope === "own" ? "author" : "owner", scope);
  const topicVisibility = (f: Question, hidden: boolean, version: number) =>
    service.setTopicVisibility({
      topicId: f.topicId, actorId: "moderator1", hidden,
      expectedVisibilityVersion: version, expectedRevisionId: f.titleRevisionId,
      reason: "Review question visibility",
    });
  const answerVisibility = (f: Question, index: number, hidden: boolean, version: number) =>
    service.setPostVisibility({
      topicId: f.topicId, postId: f.answers[index]!.id, actorId: "moderator1", hidden,
      expectedVisibilityVersion: version, expectedRevisionId: f.answers[index]!.revisionId,
      reason: "Review answer visibility",
    });
  async function state(f: Question) {
    const [topic, posts, signals, history] = await Promise.all([
      client.query("select best_answer_post_id,is_solved from forum_topics where id=$1", [f.topicId]),
      client.query(
        "select id,solution_moderation_status,solution_outdated_reason_kind from forum_posts where topic_id=$1 order by id",
        [f.topicId],
      ),
      client.query(
        "select id,status,resolved_by_user_id from forum_help_signals where topic_id=$1 order by id",
        [f.topicId],
      ),
      client.query(
        "select action,context from admin_history where target_id=$1 order by position",
        [f.topicId],
      ),
    ]);
    return { topic: topic.rows[0], posts: posts.rows, signals: signals.rows, history: history.rows };
  }

  it("rejects initial and same-answer selection under hidden topic for own and any, restores no-op", async () => {
    const f = await helpQuestion();
    await topicVisibility(f, true, 0);
    const initial = await state(f);
    for (const scope of ["own", "any"] as const) {
      await expect(selection(f, 0, scope)).rejects.toBeInstanceOf(ForumEntityNotFoundError);
      expect(await state(f)).toEqual(initial);
    }
    await topicVisibility(f, false, 1);
    await selection(f, 0, "any");
    await topicVisibility(f, true, 2);
    const alreadySelected = await state(f);
    for (const scope of ["own", "any"] as const) {
      await expect(selection(f, 0, scope)).rejects.toBeInstanceOf(ForumEntityNotFoundError);
      expect(await state(f)).toEqual(alreadySelected);
    }
    await topicVisibility(f, false, 3);
    const beforeNoop = await state(f);
    await selection(f, 0, "own");
    expect(await state(f)).toEqual(beforeNoop);
  });

  it("rejects hidden new candidate including no-op, leaves prior choice and History unchanged", async () => {
    const f = await helpQuestion();
    await selection(f, 0);
    await answerVisibility(f, 1, true, 0);
    const before = await state(f);
    for (const scope of ["own", "any"] as const) {
      await expect(selection(f, 1, scope)).rejects.toBeInstanceOf(ForumEntityNotFoundError);
      expect(await state(f)).toEqual(before);
    }
    await answerVisibility(f, 1, false, 1);
    await selection(f, 1);
    await answerVisibility(f, 1, true, 2);
    const hiddenSelected = await state(f);
    for (const scope of ["own", "any"] as const) {
      await expect(selection(f, 1, scope)).rejects.toBeInstanceOf(ForumEntityNotFoundError);
      expect(await state(f)).toEqual(hiddenSelected);
    }
    await answerVisibility(f, 1, false, 3);
    const noOpBefore = await state(f);
    await selection(f, 1);
    expect(await state(f)).toEqual(noOpBefore);
  });

  it("rejects replacement when former selected answer is hidden, preserving pending signals", async () => {
    const f = await helpQuestion();
    await selection(f, 0);
    await repository.markTopicSolved(f.topicId, "author", "own");
    const signal = await service.createHelpSignal({
      kind: "needs-review", topicId: f.topicId, actorId: "ordinary",
      explanation: "Please review this answer", proposedOriginalTopicId: null,
    });
    await answerVisibility(f, 0, true, 0);
    const before = await state(f);
    for (const scope of ["own", "any"] as const) {
      await expect(selection(f, 1, scope)).rejects.toBeInstanceOf(ForumEntityNotFoundError);
      expect(await state(f)).toEqual(before);
    }
    await answerVisibility(f, 0, false, 1);
    await selection(f, 1, "any");
    const after = await state(f);
    expect(after.topic.best_answer_post_id).toBe(f.answers[1]!.id);
    expect(after.signals.find(s => s.id === signal.id)?.status).toBe("superseded");
    expect(after.posts.find(p => p.id === f.answers[0]!.id)?.solution_outdated_reason_kind)
      .toBe("best-answer-replaced");
    expect(after.history.filter(e => e.action === "topic.bestAnswerChanged")).toHaveLength(1);
  });
});

describe("V4 solved-state writer admission under hidden topic", () => {
  async function helpQuestion() {
    const topicId = randomUUID(), postId = randomUUID(), titleRevisionId = randomUUID();
    const bodyRevisionId = randomUUID();
    await repository.createTopicWithInitialPost({
      id: topicId, sectionId: HELP_SOLUTIONS_SERVICE_SECTION_ID, authorId: "author",
      titleRevision: { id: titleRevisionId, originalContent: "Help question", sourceLocale: "en" },
      initialPost: {
        id: postId, topicId, authorId: "author",
        bodyRevision: { id: bodyRevisionId, originalContent: "Help body", sourceLocale: "en" },
      },
    });
    return { topicId, postId, titleRevisionId, bodyRevisionId };
  }
  type HelpQuestion = Awaited<ReturnType<typeof helpQuestion>>;
  const solve = (f: HelpQuestion, scope: "own" | "any") =>
    service.markTopicSolved(f.topicId, scope === "own" ? "author" : "owner", scope);
  const visibility = (f: HelpQuestion, hidden: boolean, expectedVisibilityVersion: number) =>
    service.setTopicVisibility(topicCommand(f, "moderator1", hidden, expectedVisibilityVersion, "Visibility review"));
  async function state(f: HelpQuestion) {
    const [topic, signals, history] = await Promise.all([
      client.query("select is_solved,best_answer_post_id from forum_topics where id=$1", [f.topicId]),
      client.query(
        "select id,kind,status,resolved_by_user_id from forum_help_signals where topic_id=$1 order by id",
        [f.topicId],
      ),
      client.query(
        "select action,actor_id,context from admin_history where target_id=$1 order by position",
        [f.topicId],
      ),
    ]);
    return { topic: topic.rows[0], signals: signals.rows, history: history.rows };
  }

  it("denies own/any solving of hidden Help question without superseding pending duplicate or History", async () => {
    const question = await helpQuestion(), original = await helpQuestion();
    const pending = await service.createHelpSignal({
      kind: "duplicate", topicId: question.topicId, actorId: "ordinary",
      explanation: null, proposedOriginalTopicId: original.topicId,
    });
    await visibility(question, true, 0);
    const before = await state(question);
    for (const scope of ["own", "any"] as const) {
      await expect(solve(question, scope)).rejects.toBeInstanceOf(ForumEntityNotFoundError);
      expect(await state(question)).toEqual(before);
    }

    await visibility(question, false, 1);
    await solve(question, "any");
    const after = await state(question);
    expect(after.topic.is_solved).toBe(true);
    expect(after.signals.find(s => s.id === pending.id)).toMatchObject({
      status: "superseded", resolved_by_user_id: "owner",
    });
    expect(after.history.filter(e => e.action === "topic.solved")).toHaveLength(1);
  });

  it("returns generic not-found for already solved hidden topic, preserving conflict after Restore", async () => {
    const question = await helpQuestion();
    await solve(question, "own");
    await visibility(question, true, 0);
    const before = await state(question);
    for (const scope of ["own", "any"] as const) {
      await expect(solve(question, scope)).rejects.toBeInstanceOf(ForumEntityNotFoundError);
      expect(await state(question)).toEqual(before);
    }

    await visibility(question, false, 1);
    for (const scope of ["own", "any"] as const) {
      await expect(solve(question, scope)).rejects.toBeInstanceOf(ForumStateConflictError);
    }
    const restored = await state(question);
    expect(restored.topic.is_solved).toBe(true);
    expect(restored.history.filter(e => e.action === "topic.solved")).toHaveLength(0);
  });
});

describe("V4 duplicate confirmation under hidden topic or canonical original", () => {
  async function question() {
    const topicId = randomUUID(), postId = randomUUID();
    const titleRevisionId = randomUUID(), bodyRevisionId = randomUUID();
    await repository.createTopicWithInitialPost({
      id: topicId, sectionId: HELP_SOLUTIONS_SERVICE_SECTION_ID, authorId: "author",
      titleRevision: { id: titleRevisionId, originalContent: "Help question", sourceLocale: "en" },
      initialPost: {
        id: postId, topicId, authorId: "author",
        bodyRevision: { id: bodyRevisionId, originalContent: "Question body", sourceLocale: "en" },
      },
    });
    return { topicId, postId, titleRevisionId, bodyRevisionId };
  }
  type Question = Awaited<ReturnType<typeof question>>;
  const duplicateSignal = (f: Question, original: Question) => ({
    kind: "duplicate" as const, topicId: f.topicId, actorId: "ordinary",
    explanation: null, proposedOriginalTopicId: original.topicId,
  });
  const visibility = (f: Question, hidden: boolean, version: number) =>
    service.setTopicVisibility(topicCommand(f, "moderator1", hidden, version, "Visibility review"));
  async function facts(f: Question, original: Question) {
    const ids = [f.topicId, original.topicId];
    const [topics, relationships, signals, history] = await Promise.all([
      client.query(
        "select id,is_solved,best_answer_post_id from forum_topics where id in ($1,$2) order by id", ids,
      ),
      client.query(
        "select id,duplicate_topic_id,original_topic_id,removed_at from forum_help_duplicate_relationships " +
          "where duplicate_topic_id=$1 or original_topic_id=$2 order by id", ids,
      ),
      client.query(
        "select id,topic_id,kind,status,resolved_by_user_id from forum_help_signals " +
          "where topic_id in ($1,$2) order by id", ids,
      ),
      client.query(
        "select action,target_id,actor_id,context from admin_history " +
          "where target_id in ($1,$2) order by position", ids,
      ),
    ]);
    return {
      topics: topics.rows, relationships: relationships.rows,
      signals: signals.rows, history: history.rows,
    };
  }

  it("denies confirming a hidden duplicate before signal supersession, then admits after Restore", async () => {
    const f = await question(), original = await question(), other = await question();
    const pendingCandidate = await service.createHelpSignal(duplicateSignal(f, original));
    const pendingOriginal = await service.createHelpSignal(duplicateSignal(original, other));
    await visibility(f, true, 0);
    const before = await facts(f, original);
    for (const actorId of ["moderator1", "owner"]) {
      await expect(service.confirmHelpDuplicate(f.topicId, original.topicId, actorId))
        .rejects.toBeInstanceOf(ForumEntityNotFoundError);
      expect(await facts(f, original)).toEqual(before);
    }

    await visibility(f, false, 1);
    await service.confirmHelpDuplicate(f.topicId, original.topicId, "moderator1");
    const after = await facts(f, original);
    expect(after.relationships).toHaveLength(1);
    expect(after.relationships[0]).toMatchObject({
      duplicate_topic_id: f.topicId, original_topic_id: original.topicId, removed_at: null,
    });
    expect(after.signals.filter((s) => [pendingCandidate.id, pendingOriginal.id].includes(s.id)))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ id: pendingCandidate.id, status: "superseded", resolved_by_user_id: "moderator1" }),
        expect.objectContaining({ id: pendingOriginal.id, status: "superseded", resolved_by_user_id: "moderator1" }),
      ]));
    expect(after.history.filter((h) => h.action === "help.duplicateConfirmed")).toHaveLength(1);
    expect(after.topics.every((topic) => !topic.is_solved && topic.best_answer_post_id === null)).toBe(true);
  });

  it("protects hidden canonical original and already-confirmed hidden duplicate, retaining existing links", async () => {
    const original = await question(), existing = await question(), candidate = await question();
    await service.confirmHelpDuplicate(existing.topicId, original.topicId, "owner");
    const pending = await service.createHelpSignal(duplicateSignal(candidate, original));
    await visibility(original, true, 0);
    const originalHidden = await facts(candidate, original);
    for (const actorId of ["moderator1", "owner"]) {
      await expect(service.confirmHelpDuplicate(candidate.topicId, original.topicId, actorId))
        .rejects.toBeInstanceOf(ForumEntityNotFoundError);
      expect(await facts(candidate, original)).toEqual(originalHidden);
    }
    await visibility(original, false, 1);
    await service.confirmHelpDuplicate(candidate.topicId, original.topicId, "owner");
    const confirmed = await facts(candidate, original);
    expect(confirmed.relationships).toHaveLength(2);
    expect(confirmed.relationships.map((r) => r.duplicate_topic_id)).toContain(existing.topicId);
    expect(confirmed.relationships.map((r) => r.duplicate_topic_id)).toContain(candidate.topicId);
    expect(confirmed.signals.find((s) => s.id === pending.id)).toMatchObject({
      status: "superseded", resolved_by_user_id: "owner",
    });
    expect(confirmed.history.filter((h) => h.action === "help.duplicateConfirmed")).toHaveLength(1);

    await visibility(candidate, true, 0);
    const candidateHidden = await facts(candidate, original);
    await expect(service.confirmHelpDuplicate(candidate.topicId, original.topicId, "owner"))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect(await facts(candidate, original)).toEqual(candidateHidden);
    await visibility(candidate, false, 1);
    await expect(service.confirmHelpDuplicate(candidate.topicId, original.topicId, "owner"))
      .rejects.toBeInstanceOf(ForumStateConflictError);
  });
  it.each([
    ...(["duplicate", "original"] as const).flatMap(target =>
      ([
        { target, transition: "Hide", confirmationFirst: true, initiallyHidden: false },
        { target, transition: "Hide", confirmationFirst: false, initiallyHidden: false },
        { target, transition: "Restore", confirmationFirst: true, initiallyHidden: true },
        { target, transition: "Restore", confirmationFirst: false, initiallyHidden: true },
      ] as const)),
  ])(
    "B8-A sorted-two-topic Duplicate ($target) × $transition, confirmationFirst=$confirmationFirst: PG row order",
    async ({ target, transition, confirmationFirst, initiallyHidden }) => {
      const [first, later] = [await question(), await question()]
        .sort((a, b) => a.topicId.localeCompare(b.topicId)) as [Question, Question];
      // The target is always the SECOND sorted topic: confirmation holds the
      // first topic mutex while waiting for the same later row as visibility.
      const duplicate = target === "duplicate" ? later : first;
      const original = target === "original" ? later : first;
      const pending = await service.createHelpSignal(duplicateSignal(duplicate, original));
      if (initiallyHidden) await visibility(later, true, 0);

      async function connected() {
        const connection = new Client({ connectionString: url, options: "-c search_path=" + schema });
        await connection.connect();
        await connection.query("set statement_timeout='25000ms'");
        const pid = (await connection.query<{ pid: number }>(
          "select pg_backend_pid() as pid",
        )).rows[0]!.pid;
        return { connection, pid };
      }
      async function waitBlocked(waiter: number, possible: number[]) {
        const deadline = Date.now() + 8_000;
        let last: unknown;
        while (Date.now() < deadline) {
          const result = await client.query<{
            wait_event_type: string | null; blockers: number[];
          }>(
            "select wait_event_type,pg_blocking_pids(pid) as blockers from pg_stat_activity where pid=$1",
            [waiter],
          );
          last = result.rows[0];
          if (result.rows[0]?.wait_event_type === "Lock"
            && result.rows[0].blockers.some(pid => possible.includes(pid))) return;
          await new Promise(resolve => setTimeout(resolve, 25));
        }
        throw new Error("Duplicate/visibility second-topic PG lock not observed: " +
          JSON.stringify({ waiter, possible, last }));
      }

      const [holder, confirmer, manager] = await Promise.all([
        connected(), connected(), connected(),
      ]);
      const scoped = (connection: Client) => new ForumService(new DrizzleForumRepository(
        drizzle(connection), { cooldownMs: 0, now: () => new Date() },
        withOwnerUserMeasureAdmission("owner"), undefined, "owner",
      ));
      const endingHidden = transition === "Hide";
      let held = false;
      let confirmation: ReturnType<ForumService["confirmHelpDuplicate"]> | undefined;
      let change: ReturnType<ForumService["setTopicVisibility"]> | undefined;
      try {
        await holder.connection.query("begin");
        held = true;
        await holder.connection.query(
          "select id from forum_topics where id=$1 for update", [later.topicId],
        );
        const startConfirmation = async () => {
          confirmation = scoped(confirmer.connection).confirmHelpDuplicate(
            duplicate.topicId, original.topicId, "moderator1",
          );
          void confirmation.catch(() => undefined);
          await waitBlocked(confirmer.pid, [holder.pid, manager.pid]);
        };
        const startVisibility = async () => {
          change = scoped(manager.connection).setTopicVisibility(
            topicCommand(later, "moderator1", endingHidden, initiallyHidden ? 1 : 0,
              "Second-topic visibility race"),
          );
          void change.catch(() => undefined);
          await waitBlocked(manager.pid, [holder.pid, confirmer.pid]);
        };
        if (confirmationFirst) {
          await startConfirmation();
          await startVisibility();
        } else {
          await startVisibility();
          await startConfirmation();
        }
        await holder.connection.query("commit");
        held = false;

        const [result, changed] = await Promise.allSettled([confirmation!, change!]);
        expect(changed).toMatchObject({
          status: "fulfilled",
          value: { hidden: endingHidden, changed: true, visibilityVersion: initiallyHidden ? 2 : 1 },
        });
        const admitted = transition === "Hide" ? confirmationFirst : !confirmationFirst;
        if (admitted) {
          expect(result).toEqual({ status: "fulfilled", value: undefined });
        } else {
          expect(result.status).toBe("rejected");
          if (result.status === "rejected") {
            expect(result.reason).toBeInstanceOf(ForumEntityNotFoundError);
          }
        }
        const current = await facts(duplicate, original);
        expect(current.relationships).toHaveLength(admitted ? 1 : 0);
        if (admitted) {
          expect(current.relationships[0]).toMatchObject({
            duplicate_topic_id: duplicate.topicId, original_topic_id: original.topicId,
            removed_at: null,
          });
        }
        expect(current.signals.find(s => s.id === pending.id)?.status)
          .toBe(admitted ? "superseded" : "pending");
        expect(current.topics).toHaveLength(2);
        expect(current.topics.every(t => t.is_solved === false && t.best_answer_post_id === null))
          .toBe(true);
        const flags = (await client.query<{
          id: string; is_hidden: boolean; visibility_version: number;
        }>(
          "select id,is_hidden,visibility_version from forum_topics where id in ($1,$2) order by id",
          [first.topicId, later.topicId],
        )).rows;
        expect(flags).toEqual([
          { id: first.topicId, is_hidden: false, visibility_version: 0 },
          { id: later.topicId, is_hidden: endingHidden, visibility_version: initiallyHidden ? 2 : 1 },
        ]);
        const history = current.history.map(e => e.action);
        const visibilityEvents = initiallyHidden ? ["topic.hidden", "topic.restored"] : ["topic.hidden"];
        expect(history).toEqual(admitted
          ? (transition === "Hide"
            ? ["help.duplicateConfirmed", ...visibilityEvents]
            : [...visibilityEvents, "help.duplicateConfirmed"])
          : visibilityEvents);

        if (endingHidden) await visibility(later, false, 1);
        if (!admitted) {
          await scoped(confirmer.connection).confirmHelpDuplicate(
            duplicate.topicId, original.topicId, "moderator1",
          );
          const recovered = await facts(duplicate, original);
          expect(recovered.relationships).toHaveLength(1);
          expect(recovered.signals.find(s => s.id === pending.id)?.status).toBe("superseded");
          expect(recovered.history.filter(e => e.action === "help.duplicateConfirmed"))
            .toHaveLength(1);
        }
      } finally {
        if (held) await holder.connection.query("rollback");
        await Promise.allSettled([confirmation, change]);
        await Promise.all([
          holder.connection.end(), confirmer.connection.end(), manager.connection.end(),
        ]);
      }
    },
    30_000,
  );

});

describe("V4 duplicate removal under hidden topic or canonical original", () => {
  async function question() {
    const topicId = randomUUID(), postId = randomUUID();
    const titleRevisionId = randomUUID(), bodyRevisionId = randomUUID();
    await repository.createTopicWithInitialPost({
      id: topicId, sectionId: HELP_SOLUTIONS_SERVICE_SECTION_ID, authorId: "author",
      titleRevision: { id: titleRevisionId, originalContent: "Help question", sourceLocale: "en" },
      initialPost: {
        id: postId, topicId, authorId: "author",
        bodyRevision: { id: bodyRevisionId, originalContent: "Question body", sourceLocale: "en" },
      },
    });
    return { topicId, postId, titleRevisionId, bodyRevisionId };
  }
  type Question = Awaited<ReturnType<typeof question>>;
  const visibility = (f: Question, hidden: boolean, version: number) =>
    service.setTopicVisibility(topicCommand(f, "moderator1", hidden, version, "Visibility review"));
  async function relationshipId(duplicate: Question) {
    const result = await client.query(
      "select id from forum_help_duplicate_relationships where duplicate_topic_id=$1 and removed_at is null",
      [duplicate.topicId],
    );
    const id = result.rows[0]?.id as string | undefined;
    if (!id) throw new Error("missing confirmed duplicate relationship");
    return id;
  }
  async function facts(duplicate: Question, original: Question) {
    const ids = [duplicate.topicId, original.topicId];
    const [relationships, appeals, signals, history] = await Promise.all([
      client.query(
        "select id,duplicate_topic_id,original_topic_id,removed_by_user_id,removed_at " +
          "from forum_help_duplicate_relationships where duplicate_topic_id=$1 order by id",
        [duplicate.topicId],
      ),
      client.query(
        "select id,relationship_id,status,resolved_by_user_id,resolved_at " +
          "from forum_help_duplicate_appeals where relationship_id in " +
          "(select id from forum_help_duplicate_relationships where duplicate_topic_id=$1) order by id",
        [duplicate.topicId],
      ),
      client.query(
        "select id,topic_id,kind,status,resolved_by_user_id from forum_help_signals " +
          "where topic_id in ($1,$2) order by id", ids,
      ),
      client.query(
        "select action,target_id,actor_id,context from admin_history " +
          "where target_id in ($1,$2) order by position", ids,
      ),
    ]);
    return {
      relationships: relationships.rows, appeals: appeals.rows,
      signals: signals.rows, history: history.rows,
    };
  }

  it("denies removal with hidden duplicate and pending appeal; Restore admits and resolves appeal", async () => {
    const pair = [await question(), await question()].sort((a, b) => a.topicId.localeCompare(b.topicId));
    const [duplicate, original] = pair as [Question, Question];
    await service.confirmHelpDuplicate(duplicate.topicId, original.topicId, "owner");
    const expectedRelationshipId = await relationshipId(duplicate);
    await service.appealHelpDuplicate(duplicate.topicId, "author", "Incorrect duplicate", expectedRelationshipId);
    await visibility(duplicate, true, 0);
    const before = await facts(duplicate, original);
    expect(before.appeals).toHaveLength(1);
    expect(before.appeals[0]?.status).toBe("pending");

    for (const actorId of ["moderator1", "owner"]) {
      await expect(service.removeHelpDuplicate(duplicate.topicId, actorId, expectedRelationshipId))
        .rejects.toBeInstanceOf(ForumEntityNotFoundError);
      expect(await facts(duplicate, original)).toEqual(before);
    }
    await visibility(duplicate, false, 1);
    await service.removeHelpDuplicate(duplicate.topicId, "moderator1", expectedRelationshipId);
    const after = await facts(duplicate, original);
    expect(after.relationships[0]).toMatchObject({
      id: expectedRelationshipId, removed_by_user_id: "moderator1",
    });
    expect(after.relationships[0].removed_at).toBeInstanceOf(Date);
    expect(after.appeals[0]).toMatchObject({ status: "accepted", resolved_by_user_id: "moderator1" });
    expect(after.history.filter((event) => event.action === "help.duplicateRemoved")).toHaveLength(1);
    expect(after.signals).toEqual(before.signals);
  });

  it("denies removal while canonical original hidden, preserving relationship and History until Restore", async () => {
    const pair = [await question(), await question()].sort((a, b) => a.topicId.localeCompare(b.topicId));
    const [original, duplicate] = pair as [Question, Question];
    await service.confirmHelpDuplicate(duplicate.topicId, original.topicId, "owner");
    const expectedRelationshipId = await relationshipId(duplicate);
    await visibility(original, true, 0);
    const before = await facts(duplicate, original);
    for (const actorId of ["moderator1", "owner"]) {
      await expect(service.removeHelpDuplicate(duplicate.topicId, actorId, expectedRelationshipId))
        .rejects.toBeInstanceOf(ForumEntityNotFoundError);
      expect(await facts(duplicate, original)).toEqual(before);
    }
    await visibility(original, false, 1);
    await service.removeHelpDuplicate(duplicate.topicId, "owner", expectedRelationshipId);
    const after = await facts(duplicate, original);
    expect(after.relationships[0]).toMatchObject({
      id: expectedRelationshipId, removed_by_user_id: "owner",
    });
    expect(after.history.filter((event) => event.action === "help.duplicateRemoved")).toHaveLength(1);
    await expect(service.removeHelpDuplicate(duplicate.topicId, "owner", expectedRelationshipId))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await facts(duplicate, original)).toEqual(after);
  });
});

describe("V4 protected own duplicate appeal across Hide and Restore", () => {
  async function question() {
    const topicId = randomUUID(), postId = randomUUID();
    const titleRevisionId = randomUUID(), bodyRevisionId = randomUUID();
    await repository.createTopicWithInitialPost({
      id: topicId, sectionId: HELP_SOLUTIONS_SERVICE_SECTION_ID, authorId: "author",
      titleRevision: { id: titleRevisionId, originalContent: "Help question", sourceLocale: "en" },
      initialPost: {
        id: postId, topicId, authorId: "author",
        bodyRevision: { id: bodyRevisionId, originalContent: "Question body", sourceLocale: "en" },
      },
    });
    return { topicId, postId, titleRevisionId, bodyRevisionId };
  }
  type Question = Awaited<ReturnType<typeof question>>;
  const visibility = (f: Question, hidden: boolean, version: number) =>
    service.setTopicVisibility(topicCommand(f, "moderator1", hidden, version, "Visibility review"));
  async function relationship(duplicate: Question) {
    const r = await client.query(
      "select id,original_topic_id,removed_at from forum_help_duplicate_relationships " +
        "where duplicate_topic_id=$1 and removed_at is null", [duplicate.topicId],
    );
    if (r.rows.length !== 1) throw new Error("expected active duplicate relationship");
    return r.rows[0] as { id: string; original_topic_id: string; removed_at: Date | null };
  }
  async function state(duplicate: Question, original: Question) {
    const [relations, appeals, history] = await Promise.all([
      client.query(
        "select id,duplicate_topic_id,original_topic_id,removed_at from forum_help_duplicate_relationships " +
          "where duplicate_topic_id=$1 order by id", [duplicate.topicId],
      ),
      client.query(
        "select id,relationship_id,status,appellant_user_id,explanation,resolved_at " +
          "from forum_help_duplicate_appeals where relationship_id in " +
          "(select id from forum_help_duplicate_relationships where duplicate_topic_id=$1) order by id",
        [duplicate.topicId],
      ),
      client.query(
        "select action,target_id,actor_id,context from admin_history " +
          "where target_id in ($1,$2) order by position", [duplicate.topicId, original.topicId],
      ),
    ]);
    return { relations: relations.rows, appeals: appeals.rows, history: history.rows };
  }

  it("keeps author-only exact-relationship appeal available under hidden duplicate", async () => {
    const duplicate = await question(), original = await question();
    await service.confirmHelpDuplicate(duplicate.topicId, original.topicId, "owner");
    const link = await relationship(duplicate);
    await visibility(duplicate, true, 0);
    const before = await state(duplicate, original);

    await expect(service.appealHelpDuplicate(duplicate.topicId, "ordinary", "Not a duplicate", link.id))
      .rejects.toBeInstanceOf(ForumAuthorizationError);
    await expect(service.appealHelpDuplicate(duplicate.topicId, "author", "Not a duplicate", randomUUID()))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await state(duplicate, original)).toEqual(before);

    await service.appealHelpDuplicate(duplicate.topicId, "author", "Not a duplicate", link.id);
    const pending = await state(duplicate, original);
    expect(pending.relations).toEqual(before.relations);
    expect(pending.history).toEqual(before.history);
    expect(pending.appeals).toHaveLength(1);
    expect(pending.appeals[0]).toMatchObject({
      relationship_id: link.id, appellant_user_id: "author",
      status: "pending", explanation: "Not a duplicate", resolved_at: null,
    });
    await expect(service.appealHelpDuplicate(duplicate.topicId, "author", "Repeated", link.id))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await state(duplicate, original)).toEqual(pending);

    await visibility(duplicate, false, 1);
    const restored = await state(duplicate, original);
    expect(restored.appeals).toEqual(pending.appeals);
    expect(restored.relations).toEqual(pending.relations);
  });

  it("accepts previously prepared own appeal while canonical original is hidden, without mutation of the link or History", async () => {
    const duplicate = await question(), original = await question();
    await service.confirmHelpDuplicate(duplicate.topicId, original.topicId, "owner");
    const link = await relationship(duplicate);
    await visibility(original, true, 0);
    const before = await state(duplicate, original);
    await service.appealHelpDuplicate(duplicate.topicId, "author", "Wrong original", link.id);
    const whileHidden = await state(duplicate, original);
    expect(whileHidden.relations).toEqual(before.relations);
    expect(whileHidden.history).toEqual(before.history);
    expect(whileHidden.appeals).toHaveLength(1);
    expect(whileHidden.appeals[0]).toMatchObject({
      relationship_id: link.id, appellant_user_id: "author",
      status: "pending", explanation: "Wrong original",
    });

    await visibility(duplicate, true, 0);
    const bothHidden = await state(duplicate, original);
    await expect(service.appealHelpDuplicate(duplicate.topicId, "author", "Repeated", link.id))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await state(duplicate, original)).toEqual(bothHidden);
    await visibility(original, false, 1);
    await visibility(duplicate, false, 1);
    expect((await state(duplicate, original)).appeals).toEqual(whileHidden.appeals);
    expect((await relationship(duplicate)).id).toBe(link.id);
  });
});

describe("V4 protected duplicate appeal decisions across Hide and Restore", () => {
  async function question() {
    const topicId = randomUUID(), postId = randomUUID();
    const titleRevisionId = randomUUID(), bodyRevisionId = randomUUID();
    await repository.createTopicWithInitialPost({
      id: topicId, sectionId: HELP_SOLUTIONS_SERVICE_SECTION_ID, authorId: "author",
      titleRevision: { id: titleRevisionId, originalContent: "Help question", sourceLocale: "en" },
      initialPost: {
        id: postId, topicId, authorId: "author",
        bodyRevision: { id: bodyRevisionId, originalContent: "Question body", sourceLocale: "en" },
      },
    });
    return { topicId, titleRevisionId };
  }
  type Question = Awaited<ReturnType<typeof question>>;
  const visibility = (f: Question, hidden: boolean, version: number) =>
    service.setTopicVisibility({
      topicId: f.topicId, actorId: "moderator1", hidden,
      expectedVisibilityVersion: version, expectedRevisionId: f.titleRevisionId,
      reason: "Visibility review",
    });
  async function state(duplicate: Question, original: Question) {
    const [relationships, appeals, history, topics] = await Promise.all([
      client.query(
        "select id,duplicate_topic_id,original_topic_id,removed_at,removed_by_user_id " +
          "from forum_help_duplicate_relationships where duplicate_topic_id=$1 order by id",
        [duplicate.topicId],
      ),
      client.query(
        "select id,relationship_id,status,resolved_by_user_id,resolved_at " +
          "from forum_help_duplicate_appeals where relationship_id in " +
          "(select id from forum_help_duplicate_relationships where duplicate_topic_id=$1) order by id",
        [duplicate.topicId],
      ),
      client.query(
        "select action,target_id,actor_id,context from admin_history " +
          "where target_id in ($1,$2) order by position",
        [duplicate.topicId, original.topicId],
      ),
      client.query(
        "select id,is_hidden,visibility_version from forum_topics where id in ($1,$2) order by id",
        [duplicate.topicId, original.topicId],
      ),
    ]);
    return {
      relationships: relationships.rows, appeals: appeals.rows,
      history: history.rows, topics: topics.rows,
    };
  }
  async function pendingPair() {
    const duplicate = await question(), original = await question();
    await service.confirmHelpDuplicate(duplicate.topicId, original.topicId, "owner");
    const links = await state(duplicate, original);
    const relationshipId = links.relationships[0]?.id as string | undefined;
    if (!relationshipId) throw new Error("confirmed relationship expected");
    await service.appealHelpDuplicate(duplicate.topicId, "author", "Incorrect duplicate", relationshipId);
    const pending = await state(duplicate, original);
    const appealId = pending.appeals[0]?.id as string | undefined;
    if (!appealId) throw new Error("pending appeal expected");
    return { duplicate, original, relationshipId, appealId };
  }

  it("accepts existing appeal while both duplicate and canonical original are hidden, without rewriting visibility", async () => {
    const { duplicate, original, relationshipId, appealId } = await pendingPair();
    await visibility(duplicate, true, 0);
    await visibility(original, true, 0);
    const before = await state(duplicate, original);
    await expect(service.resolveHelpDuplicateAppeal(duplicate.topicId, "owner", "accepted", randomUUID()))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await state(duplicate, original)).toEqual(before);

    await service.resolveHelpDuplicateAppeal(duplicate.topicId, "owner", "accepted", appealId);
    const after = await state(duplicate, original);
    expect(after.topics).toEqual(before.topics);
    expect(after.relationships).toHaveLength(1);
    expect(after.relationships[0]).toMatchObject({
      id: relationshipId, removed_by_user_id: "owner",
    });
    expect(after.relationships[0].removed_at).toBeInstanceOf(Date);
    expect(after.appeals).toHaveLength(1);
    expect(after.appeals[0]).toMatchObject({
      id: appealId, relationship_id: relationshipId,
      status: "accepted", resolved_by_user_id: "owner",
    });
    expect(after.appeals[0].resolved_at).toBeInstanceOf(Date);
    const decisions = after.history.filter((h) => h.action === "help.duplicateAppealResolved");
    expect(decisions).toHaveLength(1);
    expect(decisions[0].context).toMatchObject({
      relationshipId, originalTopicId: original.topicId, appealId, resolution: "accepted",
    });
    await expect(service.resolveHelpDuplicateAppeal(duplicate.topicId, "owner", "accepted", appealId))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await state(duplicate, original)).toEqual(after);

    await visibility(original, false, 1);
    await visibility(duplicate, false, 1);
    const restored = await state(duplicate, original);
    expect(restored.relationships).toEqual(after.relationships);
    expect(restored.appeals).toEqual(after.appeals);
  });

  it("rejects existing appeal when canonical original is hidden, retaining active duplicate and one decision History", async () => {
    const { duplicate, original, relationshipId, appealId } = await pendingPair();
    await visibility(original, true, 0);
    const before = await state(duplicate, original);
    await service.resolveHelpDuplicateAppeal(duplicate.topicId, "moderator1", "rejected", appealId);
    const after = await state(duplicate, original);
    expect(after.topics).toEqual(before.topics);
    expect(after.relationships).toEqual(before.relationships);
    expect(after.relationships[0]).toMatchObject({
      id: relationshipId, original_topic_id: original.topicId, removed_at: null,
    });
    expect(after.appeals).toHaveLength(1);
    expect(after.appeals[0]).toMatchObject({
      id: appealId, relationship_id: relationshipId,
      status: "rejected", resolved_by_user_id: "moderator1",
    });
    expect(after.appeals[0].resolved_at).toBeInstanceOf(Date);
    const decisions = after.history.filter((h) => h.action === "help.duplicateAppealResolved");
    expect(decisions).toHaveLength(1);
    expect(decisions[0].context).toMatchObject({
      relationshipId, originalTopicId: original.topicId, appealId, resolution: "rejected",
    });
    await expect(service.resolveHelpDuplicateAppeal(duplicate.topicId, "moderator1", "rejected", appealId))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await state(duplicate, original)).toEqual(after);

    await visibility(original, false, 1);
    const restored = await state(duplicate, original);
    expect(restored.relationships).toEqual(after.relationships);
    expect(restored.appeals).toEqual(after.appeals);
  });
});

describe("V4 published edit recovery admission after Hide", () => {
  const edit = (f: Fixture, expectedRevisionId = f.bodyRevisionId, draftId = randomUUID(), body = "Recovered edit") => ({
    topicId: f.topicId, postId: f.postId, actorId: "author",
    expectedRevisionId, draftId, body, attachmentIds: [] as string[],
  });
  async function facts(f: Fixture) {
    const [post, revisions, receipts, notifications] = await Promise.all([
      client.query(
        "select current_revision_id,is_hidden from forum_posts where id=$1", [f.postId],
      ),
      client.query(
        "select id,original_content from forum_post_revisions where post_id=$1 order by created_at,id",
        [f.postId],
      ),
      client.query(
        "select owner_id,context_key,draft_id,fingerprint,post_id " +
          "from forum_publication_receipts where post_id=$1 order by draft_id", [f.postId],
      ),
      client.query(
        "select id,kind from forum_reply_notifications where post_id=$1 order by id", [f.postId],
      ),
    ]);
    return {
      post: post.rows[0], revisions: revisions.rows,
      receipts: receipts.rows, notifications: notifications.rows,
    };
  }

  it("retains committed edit replay on hidden post, but refuses changed replay and new save until Restore", async () => {
    const f = await fixture(), committed = edit(f, f.bodyRevisionId, randomUUID(), "Already saved");
    await service.editPublishedPost(committed);
    const currentRevisionId = (await facts(f)).post.current_revision_id;
    await service.setPostVisibility({ ...postCommand(f), expectedRevisionId: currentRevisionId });
    const hidden = await facts(f);

    await service.editPublishedPost(committed);
    expect(await facts(f)).toEqual(hidden);
    await expect(service.editPublishedPost({ ...committed, body: "Changed after commit" }))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await facts(f)).toEqual(hidden);
    const newSave = edit(f, hidden.post.current_revision_id, randomUUID(), "Fresh save");
    await expect(service.editPublishedPost(newSave))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect(await facts(f)).toEqual(hidden);

    await service.setPostVisibility({
      ...postCommand(f, "moderator1", false, 1, "Restore post"), expectedRevisionId: currentRevisionId,
    });
    await service.editPublishedPost(newSave);
    const restored = await facts(f);
    expect(restored.revisions).toHaveLength(hidden.revisions.length + 1);
    expect(restored.receipts).toHaveLength(hidden.receipts.length + 1);
    expect(restored.post.current_revision_id).not.toBe(hidden.post.current_revision_id);
    expect(restored.notifications).toEqual(hidden.notifications);
  });

  it("never rebases a stale published edit while topic hidden; Restore keeps normal CAS", async () => {
    const f = await fixture();
    const concurrent = edit(f, f.bodyRevisionId, randomUUID(), "Someone saved first");
    await service.editPublishedPost(concurrent);
    const committed = await facts(f);
    const stale = edit(f, f.bodyRevisionId, randomUUID(), "Conflicted user buffer");
    await expect(service.editPublishedPost(stale))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await facts(f)).toEqual(committed);

    await service.setTopicVisibility(topicCommand(f));
    const hidden = await facts(f);
    await expect(service.editPublishedPost(stale))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    const rebased = edit(f, committed.post.current_revision_id, randomUUID(), "Rebased user buffer");
    await expect(service.editPublishedPost(rebased))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect(await facts(f)).toEqual(hidden);

    await service.setTopicVisibility(topicCommand(f, "moderator1", false, 1, "Restore topic"));
    await expect(service.editPublishedPost(stale))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    await service.editPublishedPost(rebased);
    const recovered = await facts(f);
    expect(recovered.revisions).toHaveLength(hidden.revisions.length + 1);
    expect(recovered.receipts).toHaveLength(hidden.receipts.length + 1);
    expect(recovered.post.current_revision_id).not.toBe(committed.post.current_revision_id);
  });
});

describe("V4 real PostgreSQL title planning versus topic Hide/Restore", () => {
  async function connected() {
    const connection = new Client({ connectionString: url, options: "-c search_path=" + schema });
    await connection.connect();
    await connection.query("set statement_timeout='25000ms'");
    const pid = (await connection.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]!.pid;
    return { connection, pid };
  }

  /** Synchronize against actual PostgreSQL row-lock waits, not JS invocation ordering. */
  async function waitForPgLock(waiter: number, possibleBlockers: number[]) {
    const deadline = Date.now() + 8_000;
    let last: unknown;
    while (Date.now() < deadline) {
      const observed = await client.query<{
        wait_event_type: string | null; blockers: number[];
      }>(
        "select wait_event_type,pg_blocking_pids(pid) as blockers " +
          "from pg_stat_activity where pid=$1",
        [waiter],
      );
      last = observed.rows[0];
      if (observed.rows[0]?.wait_event_type === "Lock"
        && observed.rows[0].blockers.some(pid => possibleBlockers.includes(pid))) return;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error("Expected real PostgreSQL row-lock wait: " +
      JSON.stringify({ waiter, possibleBlockers, last }));
  }

  it.each([
    { transition: "Hide", writerFirst: true, initialHidden: false, admitted: false },
    { transition: "Hide", writerFirst: false, initialHidden: false, admitted: true },
    { transition: "Restore", writerFirst: true, initialHidden: true, admitted: true },
    { transition: "Restore", writerFirst: false, initialHidden: true, admitted: false },
  ] as const)(
    "$transition × title planning, writerFirst=$writerFirst: real lock order",
    async ({ transition, writerFirst, initialHidden, admitted }) => {
      const f = await fixture();
      if (initialHidden) {
        await service.setTopicVisibility(topicCommand(f));
      }
      const revision = {
        contentType: "topic-title" as const,
        contentId: f.topicId, revisionId: f.titleRevisionId,
        originalContent: "PRIVATE TOPIC", sourceLocale: "en",
      };
      const specification = await contentTopicTitleTaskSpecification(
        revision,
        { kind: "revision", mayProceed: true, sourceLocale: "en",
          resolutionOrigin: "revision-metadata" },
        "en", "he", "visibility-race-v1",
      );
      const scopePrefix = "title-race-" + f.topicId.slice(0, 12);
      const admission = {
        subjectKey: "T".repeat(CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH),
        cost: 1, windowSeconds: 60,
        global: { name: scopePrefix + "-global", version: "race-v1", limit: 100 },
        requester: { name: scopePrefix + "-requester", version: "race-v1", limit: 100 },
      };
      const [holder, planner, writer] = await Promise.all([
        connected(), connected(), connected(),
      ]);
      const planning = new DrizzleContentTopicTitlePlanningStore(drizzle(planner.connection));
      const moderation = new ForumService(new DrizzleForumRepository(
        drizzle(writer.connection),
        { cooldownMs: 0, now: () => new Date() },
        withOwnerUserMeasureAdmission("owner"), undefined, "owner",
      ));
      const changingToHidden = transition === "Hide";
      const command = topicCommand(f, "moderator1", changingToHidden,
        initialHidden ? 1 : 0, transition + " under lock");
      let held = false;
      let planned: ReturnType<typeof planning.upsertPending> | undefined;
      let changed: ReturnType<typeof moderation.setTopicVisibility> | undefined;
      try {
        await holder.connection.query("begin");
        held = true;
        await holder.connection.query(
          "select id from forum_topics where id=$1 for no key update", [f.topicId],
        );
        // Both contenders must be blocked at the same real topic row before
        // releasing the holder. Starting the first waiter decides lock order.
        const startPlan = async () => {
          planned = planning.upsertPending(specification, revision, admission, "author");
          void planned.catch(() => {});
          await waitForPgLock(planner.pid, [holder.pid, writer.pid]);
        };
        const startWriter = async () => {
          changed = moderation.setTopicVisibility(command);
          void changed.catch(() => {});
          await waitForPgLock(writer.pid, [holder.pid, planner.pid]);
        };
        if (writerFirst) {
          await startWriter();
          await startPlan();
        } else {
          await startPlan();
          await startWriter();
        }
        await holder.connection.query("commit");
        held = false;
        const [visibility, result] = await Promise.all([changed!, planned!]);
        expect(visibility).toMatchObject({ hidden: changingToHidden, changed: true });
        expect(result).toMatchObject(admitted
          ? { outcome: "task", created: true }
          : { outcome: "revision-changed" });
        const rows = await client.query<{
          hidden: boolean; version: number; heads: number; tasks: number; budget: number;
        }>(
          `select
            (select is_hidden from forum_topics where id=$1) as hidden,
            (select visibility_version from forum_topics where id=$1) as version,
            (select count(*)::int from translation_task_generation_heads
              where source_namespace='topic-title' and source_key=$1) as heads,
            (select count(*)::int from translation_tasks
              where source_namespace='topic-title' and source_key=$1) as tasks,
            (select coalesce(sum(used_units),0)::int from content_translation_request_budget_counters
              where scope in ($2,$3)) as budget`,
          [f.topicId, admission.global.name + "@race-v1",
            admission.requester.name + "@race-v1"],
        );
        expect(rows.rows[0]).toEqual({
          hidden: changingToHidden, version: initialHidden ? 2 : 1,
          heads: admitted ? 1 : 0, tasks: admitted ? 1 : 0,
          budget: admitted ? 2 : 0,
        });
        const atRace = await events(f.topicId);
        expect(atRace.map(event => event.action)).toEqual(
          initialHidden ? ["topic.hidden", "topic.restored"] : ["topic.hidden"],
        );

        if (changingToHidden) {
          await moderation.setTopicVisibility(
            topicCommand(f, "moderator1", false, 1, "Restore after title race"),
          );
        }
        const afterRestore = await planning.upsertPending(
          specification, revision, admission, "author",
        );
        expect(afterRestore).toMatchObject({ outcome: "task", created: !admitted });
        const tasks = await client.query<{ id: string; status: string }>(
          "select id,status from translation_tasks " +
            "where source_namespace='topic-title' and source_key=$1", [f.topicId],
        );
        expect(tasks.rows).toHaveLength(1);
        expect(tasks.rows[0]).toMatchObject({ status: "pending" });
        if (result.outcome === "task") expect(tasks.rows[0].id).toBe(result.task.id);
      } finally {
        if (held) await holder.connection.query("rollback");
        await Promise.allSettled([planned, changed]);
        await Promise.all([
          holder.connection.end(), planner.connection.end(), writer.connection.end(),
        ]);
      }
    },
    30_000,
  );

  it.each([
    { transition: "Hide", correctionFirst: true, initiallyHidden: false },
    { transition: "Hide", correctionFirst: false, initiallyHidden: false },
    { transition: "Restore", correctionFirst: true, initiallyHidden: true },
    { transition: "Restore", correctionFirst: false, initiallyHidden: true },
  ] as const)(
    "B8-A source-locale same-value admission × $transition, correctionFirst=$correctionFirst: real PG order",
    async ({ transition, correctionFirst, initiallyHidden }) => {
      const f = await fixture();
      if (initiallyHidden) await service.setTopicVisibility(topicCommand(f));
      const [holder, corrector, manager] = await Promise.all([
        connected(), connected(), connected(),
      ]);
      const makeForum = (connection: Client) => new ForumService(new DrizzleForumRepository(
        drizzle(connection), { cooldownMs: 0, now: () => new Date() },
        withOwnerUserMeasureAdmission("owner"), undefined, "owner",
      ));
      const correctionService = makeForum(corrector.connection);
      const managerService = makeForum(manager.connection);
      const endingHidden = transition === "Hide";
      const command = topicCommand(
        f, "moderator1", endingHidden, initiallyHidden ? 1 : 0, transition + " during source admission",
      );
      const correctionInput = {
        topicId: f.topicId, expectedRevisionId: f.titleRevisionId,
        sourceLocale: "en", actorId: "author", scope: "own" as const,
      };
      let held = false;
      let correction: ReturnType<ForumService["correctTopicTitleSourceLocale"]> | undefined;
      let visibility: ReturnType<ForumService["setTopicVisibility"]> | undefined;
      try {
        await holder.connection.query("begin");
        held = true;
        await holder.connection.query(
          "select id from forum_topics where id=$1 for update", [f.topicId],
        );
        const beginCorrection = async () => {
          correction = correctionService.correctTopicTitleSourceLocale(correctionInput);
          void correction.catch(() => undefined);
          await waitForPgLock(corrector.pid, [holder.pid, manager.pid]);
        };
        const beginVisibility = async () => {
          visibility = managerService.setTopicVisibility(command);
          void visibility.catch(() => undefined);
          await waitForPgLock(manager.pid, [holder.pid, corrector.pid]);
        };
        if (correctionFirst) {
          await beginCorrection();
          await beginVisibility();
        } else {
          await beginVisibility();
          await beginCorrection();
        }
        await holder.connection.query("commit");
        held = false;

        const [correctionResult, visibilityResult] =
          await Promise.allSettled([correction!, visibility!]);
        expect(visibilityResult).toMatchObject({
          status: "fulfilled",
          value: { hidden: endingHidden, changed: true, visibilityVersion: initiallyHidden ? 2 : 1 },
        });
        const admitted = transition === "Hide" ? correctionFirst : !correctionFirst;
        if (admitted) {
          expect(correctionResult).toEqual({ status: "fulfilled", value: undefined });
        } else {
          expect(correctionResult.status).toBe("rejected");
          if (correctionResult.status === "rejected") {
            expect(correctionResult.reason).toBeInstanceOf(ForumEntityNotFoundError);
          }
        }
        const state = (await client.query<{
          is_hidden: boolean; visibility_version: number;
          current_title_revision_id: string; revisions: number;
        }>(
          "select t.is_hidden,t.visibility_version,t.current_title_revision_id," +
            "(select count(*)::int from forum_topic_title_revisions r where r.topic_id=t.id) as revisions " +
            "from forum_topics t where t.id=$1",
          [f.topicId],
        )).rows[0];
        expect(state).toEqual({
          is_hidden: endingHidden,
          visibility_version: initiallyHidden ? 2 : 1,
          current_title_revision_id: f.titleRevisionId, revisions: 1,
        });
        expect((await events(f.topicId)).map(e => e.action)).toEqual(
          initiallyHidden ? ["topic.hidden", "topic.restored"] : ["topic.hidden"],
        );
        if (endingHidden) {
          await managerService.setTopicVisibility(
            topicCommand(f, "moderator1", false, 1, "Restore after source race"),
          );
        }
        await expect(correctionService.correctTopicTitleSourceLocale(correctionInput))
          .resolves.toBeUndefined();
        expect((await client.query(
          "select count(*)::int as n from forum_topic_title_revisions where topic_id=$1",
          [f.topicId],
        )).rows[0]?.n).toBe(1);
      } finally {
        if (held) await holder.connection.query("rollback");
        await Promise.allSettled([correction, visibility]);
        await Promise.all([
          holder.connection.end(), corrector.connection.end(), manager.connection.end(),
        ]);
      }
    },
    30_000,
  );
});

describe("V4 real PostgreSQL topic Hide/Restore versus body planning, reply, edit and protected Complaint", () => {
  async function connection() {
    const c = new Client({ connectionString: url, options: "-c search_path=" + schema });
    await c.connect();
    await c.query("set statement_timeout='25000ms'");
    const pid = (await c.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]!.pid;
    return { c, pid };
  }
  async function blocked(waiter: number, possibleBlockers: number[]) {
    const end = Date.now() + 8_000;
    let last: unknown;
    while (Date.now() < end) {
      const a = await client.query<{ blockers: number[]; wait_event_type: string | null }>(
        "select pg_blocking_pids(pid) as blockers, wait_event_type from pg_stat_activity where pid=$1",
        [waiter],
      );
      last = a.rows[0];
      // PostgreSQL reports the first queued waiter as a soft blocker of the
      // second, rather than always reporting the original row-lock holder.
      if (a.rows[0]?.wait_event_type === "Lock"
        && a.rows[0].blockers.some(pid => possibleBlockers.includes(pid))) return;
      await new Promise(done => setTimeout(done, 25));
    }
    throw new Error("PG race lock wait not observed: " +
      JSON.stringify({ waiter, possibleBlockers, last }));
  }
  function forum(c: Client) {
    return new DrizzleForumRepository(drizzle(c),
      { cooldownMs: 0, now: () => new Date() },
      withOwnerUserMeasureAdmission("owner"), undefined, "owner");
  }
  const cases = [
    { transition: "Hide", writerFirst: true, initialHidden: false },
    { transition: "Hide", writerFirst: false, initialHidden: false },
    { transition: "Restore", writerFirst: true, initialHidden: true },
    { transition: "Restore", writerFirst: false, initialHidden: true },
  ] as const;

  for (const kind of ["body-plan", "reply", "edit", "complaint-post", "complaint-title"] as const) {
    it.each(cases)(
      kind + " $transition writerFirst=$writerFirst: committed order and state",
      async ({ transition, writerFirst, initialHidden }) => {
        const bodyContent = kind === "body-plan"
          ? "A regular question body with several readable words." : "PRIVATE POST";
        const f = await fixture(bodyContent);
        if (initialHidden) await service.setTopicVisibility(topicCommand(f));
        const revision = {
          contentType: "post-body" as const, contentId: f.postId,
          revisionId: f.bodyRevisionId, originalContent: bodyContent, sourceLocale: "en",
        };
        const scope = "visibility-" + f.postId.slice(0, 12);
        const admission = {
          subjectKey: "P".repeat(CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH),
          cost: 1, windowSeconds: 60,
          global: { name: scope + "-global", version: "race-v1", limit: 100 },
          requester: { name: scope + "-requester", version: "race-v1", limit: 100 },
        };
        const specification = kind === "body-plan"
          ? await contentPostBodyTaskSpecification(
            revision,
            { kind: "revision", mayProceed: true, sourceLocale: "en",
              resolutionOrigin: "revision-metadata" },
            "en", "he", CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
            "visibility-race-v1", protectMarkdownForTranslation(revision.originalContent),
          )
          : undefined;
        const replyId = randomUUID(), replyRevisionId = randomUUID();
        const changedDraft = randomUUID();
        const complaintOperationId = randomUUID();
        const [holder, writer, manager] = await Promise.all([
          connection(), connection(), connection(),
        ]);
        let held = false;
        let write: Promise<unknown> | undefined;
        let change: ReturnType<ForumService["setTopicVisibility"]> | undefined;
        const moderation = new ForumService(forum(manager.c));
        const endingHidden = transition === "Hide";
        const command = topicCommand(
          f, "moderator1", endingHidden, initialHidden ? 1 : 0,
          transition + " PostgreSQL race",
        );
        try {
          await holder.c.query("begin");
          held = true;
          // FOR UPDATE blocks even complaint's compatible FK KEY SHARE,
          // allowing both real contenders to queue against the same topic.
          await holder.c.query(
            "select id from forum_topics where id=$1 for update", [f.topicId],
          );
          const startWriter = async () => {
            switch (kind) {
              case "body-plan":
                write = new DrizzleContentPostBodyPlanningStore(drizzle(writer.c))
                  .upsertPending(specification!, revision, admission, "author");
                break;
              case "reply":
                write = forum(writer.c).createPost({
                  id: replyId, topicId: f.topicId, authorId: "author",
                  bodyRevision: { id: replyRevisionId, originalContent: "Raced reply", sourceLocale: "en" },
                });
                break;
              case "edit":
                write = new ForumService(forum(writer.c)).editPublishedPost({
                  topicId: f.topicId, postId: f.postId, actorId: "author",
                  expectedRevisionId: f.bodyRevisionId, body: "Raced edit",
                  draftId: changedDraft, attachmentIds: [],
                });
                break;
              case "complaint-post":
              case "complaint-title":
                write = new DrizzleComplaintsRepository(
                  drizzle(writer.c), { tenMinutes: 10_000, day: 10_000 },
                  async () => {},
                ).submit("ordinary", {
                  target: kind === "complaint-title"
                    ? { kind: "topic-title", topicId: f.topicId, revisionId: f.titleRevisionId }
                    : { kind: "post", topicId: f.topicId, postId: f.postId, revisionId: f.bodyRevisionId },
                  operationId: complaintOperationId,
                  reason: "spam", explanation: "Submitted against observed revision",
                });
                break;
            }
            void write.catch(() => undefined);
            await blocked(writer.pid, [holder.pid, manager.pid]);
          };
          const startVisibility = async () => {
            change = moderation.setTopicVisibility(command);
            void change.catch(() => undefined);
            await blocked(manager.pid, [holder.pid, writer.pid]);
          };
          if (writerFirst) {
            await startWriter();
            await startVisibility();
          } else {
            await startVisibility();
            await startWriter();
          }
          await holder.c.query("commit");
          held = false;
          const [writeResult, visibilityResult] = await Promise.allSettled([write!, change!]);
          expect(visibilityResult.status).toBe("fulfilled");
          if (visibilityResult.status === "fulfilled") {
            expect(visibilityResult.value).toMatchObject({ hidden: endingHidden, changed: true });
          }

          const alwaysAllowed = kind.startsWith("complaint-");
          const allowed = alwaysAllowed || (transition === "Hide" ? writerFirst : !writerFirst);
          if (allowed) {
            expect(writeResult.status).toBe("fulfilled");
            if (writeResult.status === "fulfilled" && kind === "body-plan") {
              expect(writeResult.value).toMatchObject({ outcome: "task", created: true });
            }
          } else if (kind === "body-plan") {
            expect(writeResult).toMatchObject({
              status: "fulfilled", value: { outcome: "revision-changed" },
            });
          } else {
            expect(writeResult.status).toBe("rejected");
            if (writeResult.status === "rejected") {
              expect(writeResult.reason).toBeInstanceOf(ForumEntityNotFoundError);
            }
          }

          const observed = (await client.query<{
            hidden: boolean; version: number; posts: number; postRevisions: number;
            heads: number; tasks: number; budget: number; complaints: number;
          }>(`
            select
              (select is_hidden from forum_topics where id=$1) as hidden,
              (select visibility_version from forum_topics where id=$1) as version,
              (select count(*)::int from forum_posts where topic_id=$1) as posts,
              (select count(*)::int from forum_post_revisions where post_id=$2) as "postRevisions",
              (select count(*)::int from translation_task_generation_heads
                 where source_namespace='post-body' and source_key=$2) as heads,
              (select count(*)::int from translation_tasks
                 where source_namespace='post-body' and source_key=$2) as tasks,
              (select coalesce(sum(used_units),0)::int from content_translation_request_budget_counters
                 where scope in ($3,$4)) as budget,
              (select count(*)::int from forum_complaints c
                 join forum_complaint_targets t on t.id=c.target_id
                 where t.topic_id=$1) as complaints
          `, [f.topicId, f.postId,
            admission.global.name + "@race-v1", admission.requester.name + "@race-v1"])).rows[0]!;
          expect(observed).toEqual({
            hidden: endingHidden, version: initialHidden ? 2 : 1,
            posts: 1 + (kind === "reply" && allowed ? 1 : 0),
            postRevisions: 1 + (kind === "edit" && allowed ? 1 : 0),
            heads: kind === "body-plan" && allowed ? 1 : 0,
            tasks: kind === "body-plan" && allowed ? 1 : 0,
            budget: kind === "body-plan" && allowed ? 2 : 0,
            complaints: alwaysAllowed ? 1 : 0,
          });
          expect((await events(f.topicId)).map(e => e.action)).toEqual(
            initialHidden ? ["topic.hidden", "topic.restored"] : ["topic.hidden"],
          );
          if (endingHidden) {
            await moderation.setTopicVisibility(
              topicCommand(f, "moderator1", false, 1, "Restore after race"),
            );
          }
          expect((await client.query(
            "select is_hidden from forum_topics where id=$1", [f.topicId],
          )).rows[0]?.is_hidden).toBe(false);
          if (kind === "body-plan" && allowed) {
            expect((await client.query(
              "select status from translation_tasks where source_namespace='post-body' and source_key=$1",
              [f.postId],
            )).rows).toEqual([{ status: "pending" }]);
          }
        } finally {
          if (held) await holder.c.query("rollback");
          await Promise.allSettled([write, change]);
          await Promise.all([holder.c.end(), writer.c.end(), manager.c.end()]);
        }
      },
      30_000,
    );
  }
});

describe("V4 real PostgreSQL visibility actor admission and KEY SHARE compatibility", () => {
  async function connection() {
    const c = new Client({ connectionString: url, options: "-c search_path=" + schema });
    await c.connect();
    await c.query("set statement_timeout='25000ms'");
    const pid = (await c.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]!.pid;
    return { c, pid };
  }
  async function waitBlocked(waiter: number, owner: number) {
    const end = Date.now() + 8_000;
    let last: unknown;
    while (Date.now() < end) {
      const r = await client.query<{ blockers: number[]; wait_event_type: string | null }>(
        "select pg_blocking_pids(pid) as blockers,wait_event_type from pg_stat_activity where pid=$1",
        [waiter],
      );
      last = r.rows[0];
      if (r.rows[0]?.wait_event_type === "Lock" && r.rows[0].blockers.includes(owner)) return;
      await new Promise(done => setTimeout(done, 25));
    }
    throw new Error("Expected actor lock wait: " + JSON.stringify({ waiter, owner, last }));
  }
  function moderation(c: Client) {
    return new ForumService(new DrizzleForumRepository(drizzle(c),
      { cooldownMs: 0, now: () => new Date() },
      withOwnerUserMeasureAdmission("owner"), undefined, "owner"));
  }
  function pauseCommit(c: Client) {
    const original = c.query;
    let observe!: () => void, release!: () => void;
    const observed = new Promise<void>(resolve => { observe = resolve; });
    const allowed = new Promise<void>(resolve => { release = resolve; });
    let used = false;
    c.query = ((...args: unknown[]) => {
      const arg = args[0];
      const sql = typeof arg === "string" ? arg
        : arg && typeof arg === "object" && "text" in arg && typeof arg.text === "string"
          ? arg.text : "";
      if (!used && /^commit$/iu.test(sql.trim())) {
        used = true;
        observe();
        return allowed.then(() => Reflect.apply(original, c, args));
      }
      return Reflect.apply(original, c, args);
    }) as typeof c.query;
    return { observed, resume: release, restore: () => { c.query = original; } };
  }
  async function resetModerator() {
    await client.query(
      'update "user" set deactivated_at=null,deactivated_by_user_id=null,' +
        "retain_at_least_until=null where id='moderator2'",
    );
  }

  it("actor deactivation before visibility admission denies Hide without History or state writes", async () => {
    const f = await fixture(), deactivator = await connection(), writer = await connection();
    let held = false;
    let pending: ReturnType<ForumService["setTopicVisibility"]> | undefined;
    try {
      await deactivator.c.query("begin");
      held = true;
      await deactivator.c.query(
        'update "user" set deactivated_at=clock_timestamp(),deactivated_by_user_id=\'owner\',' +
          "retain_at_least_until=clock_timestamp()+interval '1 year' where id='moderator2'",
      );
      pending = moderation(writer.c).setTopicVisibility(topicCommand(f, "moderator2"));
      void pending.catch(() => undefined);
      await waitBlocked(writer.pid, deactivator.pid);
      await deactivator.c.query("commit");
      held = false;
      await expect(pending).rejects.toMatchObject({ name: "AccountInactiveError" });
      expect((await client.query(
        "select is_hidden,visibility_version from forum_topics where id=$1", [f.topicId],
      )).rows[0]).toEqual({ is_hidden: false, visibility_version: 0 });
      expect(await events(f.topicId)).toHaveLength(0);
    } finally {
      if (held) await deactivator.c.query("rollback");
      await Promise.allSettled([pending]);
      await resetModerator();
      await Promise.all([deactivator.c.end(), writer.c.end()]);
    }
  }, 30_000);

  it("visibility admission wins before actor deactivation; actor lock lasts through COMMIT", async () => {
    const f = await fixture(), writer = await connection(), deactivator = await connection();
    const gate = pauseCommit(writer.c);
    let held = false;
    let pending: ReturnType<ForumService["setTopicVisibility"]> | undefined;
    let deactivation: Promise<unknown> | undefined;
    try {
      pending = moderation(writer.c).setTopicVisibility(topicCommand(f, "moderator2"));
      void pending.catch(() => undefined);
      await gate.observed;
      await deactivator.c.query("begin");
      held = true;
      deactivation = deactivator.c.query(
        'update "user" set deactivated_at=clock_timestamp(),deactivated_by_user_id=\'owner\',' +
          "retain_at_least_until=clock_timestamp()+interval '1 year' where id='moderator2'",
      );
      void deactivation.catch(() => undefined);
      await waitBlocked(deactivator.pid, writer.pid);
      gate.resume();
      await expect(pending).resolves.toMatchObject({ hidden: true, changed: true });
      await deactivation;
      await deactivator.c.query("commit");
      held = false;
      expect((await events(f.topicId)).map(x => x.action)).toEqual(["topic.hidden"]);
      expect((await client.query(
        "select is_hidden,visibility_version from forum_topics where id=$1", [f.topicId],
      )).rows[0]).toEqual({ is_hidden: true, visibility_version: 1 });
    } finally {
      gate.resume();
      gate.restore();
      if (held) await deactivator.c.query("rollback").catch(() => undefined);
      await Promise.allSettled([pending, deactivation]);
      await resetModerator();
      await Promise.all([writer.c.end(), deactivator.c.end()]);
    }
  }, 30_000);

  it.each(["topic", "post"] as const)(
    "%s visibility NO KEY UPDATE remains compatible with FK KEY SHARE while uncommitted",
    async kind => {
      const f = await fixture(), writer = await connection(), reader = await connection();
      const gate = pauseCommit(writer.c);
      let pending: Promise<unknown> | undefined;
      try {
        pending = kind === "topic"
          ? moderation(writer.c).setTopicVisibility(topicCommand(f))
          : moderation(writer.c).setPostVisibility(postCommand(f));
        void pending.catch(() => undefined);
        await gate.observed;
        await reader.c.query("begin");
        try {
          await reader.c.query("set local lock_timeout='500ms'");
          const [topic, post, actor] = await Promise.all([
            reader.c.query("select id from forum_topics where id=$1 for key share", [f.topicId]),
            reader.c.query("select id from forum_posts where id=$1 for key share", [f.postId]),
            reader.c.query('select id from "user" where id=$1 for key share', ["moderator1"]),
          ]);
          expect(topic.rows).toHaveLength(1);
          expect(post.rows).toHaveLength(1);
          expect(actor.rows).toHaveLength(1);
        } finally {
          await reader.c.query("rollback");
        }
        gate.resume();
        await expect(pending).resolves.toMatchObject({ hidden: true, changed: true });
        expect((await events(kind === "topic" ? f.topicId : f.postId))).toHaveLength(1);
      } finally {
        gate.resume();
        gate.restore();
        await Promise.allSettled([pending]);
        await Promise.all([writer.c.end(), reader.c.end()]);
      }
    },
    30_000,
  );

  it("inactive content author does not prevent moderator Hide and Restore", async () => {
    const f = await fixture();
    await client.query(
      'update "user" set deactivated_at=clock_timestamp(),deactivated_by_user_id=\'owner\',' +
        "retain_at_least_until=clock_timestamp()+interval '1 year' where id='author'",
    );
    try {
      await expect(service.setTopicVisibility(topicCommand(f))).resolves.toMatchObject({
        hidden: true, visibilityVersion: 1, changed: true,
      });
      await expect(service.setTopicVisibility(
        topicCommand(f, "moderator1", false, 1, "Restore author topic"),
      )).resolves.toMatchObject({
        hidden: false, visibilityVersion: 2, changed: true,
      });
      expect((await events(f.topicId)).map(e => e.action))
        .toEqual(["topic.hidden", "topic.restored"]);
    } finally {
      await client.query(
        'update "user" set deactivated_at=null,deactivated_by_user_id=null,' +
          "retain_at_least_until=null where id='author'",
      );
    }
  });
});

describe("V4 real PostgreSQL post Hide/Restore versus body planning, direct reply, edit and Complaint", () => {
  async function connected() {
    const c = new Client({ connectionString: url, options: "-c search_path=" + schema });
    await c.connect();
    await c.query("set statement_timeout='25000ms'");
    const pid = (await c.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]!.pid;
    return { c, pid };
  }
  async function waitBlocked(waiter: number, possible: number[]) {
    const end = Date.now() + 8_000;
    let last: unknown;
    while (Date.now() < end) {
      const r = await client.query<{ blockers: number[]; wait_event_type: string | null }>(
        "select pg_blocking_pids(pid) as blockers,wait_event_type from pg_stat_activity where pid=$1", [waiter],
      );
      last = r.rows[0];
      if (r.rows[0]?.wait_event_type === "Lock"
        && r.rows[0].blockers.some(pid => possible.includes(pid))) return;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error("Post lock barrier was not observed: " + JSON.stringify({waiter,possible,last}));
  }
  function forum(c: Client) {
    return new DrizzleForumRepository(drizzle(c), {cooldownMs: 0, now: () => new Date()},
      withOwnerUserMeasureAdmission("owner"), undefined, "owner");
  }
  const cases = [
    { transition: "Hide", writerFirst: true, initiallyHidden: false },
    { transition: "Hide", writerFirst: false, initiallyHidden: false },
    { transition: "Restore", writerFirst: true, initiallyHidden: true },
    { transition: "Restore", writerFirst: false, initiallyHidden: true },
  ] as const;
  for (const kind of ["body-plan", "direct-reply", "edit", "complaint-post"] as const) {
    it.each(cases)(
      kind + " $transition writerFirst=$writerFirst: locked post and real CAS",
      async ({transition,writerFirst,initiallyHidden}) => {
        const bodyContent = kind === "body-plan"
          ? "A regular question body with several readable words." : "PRIVATE POST";
        const f = await fixture(bodyContent);
        if (initiallyHidden) await service.setPostVisibility(postCommand(f));
        const revision = {
          contentType: "post-body" as const, contentId: f.postId,
          revisionId: f.bodyRevisionId, originalContent: bodyContent, sourceLocale: "en",
        };
        const prefix = "post-race-" + f.postId.slice(0, 12);
        const admission = {
          subjectKey: "P".repeat(CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH),
          cost: 1, windowSeconds: 60,
          global: { name: prefix + "-global", version: "race-v1", limit: 100 },
          requester: { name: prefix + "-requester", version: "race-v1", limit: 100 },
        };
        const specification = kind === "body-plan"
          ? await contentPostBodyTaskSpecification(revision,
            {kind:"revision",mayProceed:true,sourceLocale:"en",resolutionOrigin:"revision-metadata"},
            "en","he",CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
            "post-visibility-race-v1",protectMarkdownForTranslation(revision.originalContent),
          )
          : undefined;
        const replyId = randomUUID(), replyRevisionId = randomUUID();
        const receipt = randomUUID(), complaintId = randomUUID();
        const [holder,writer,manager] = await Promise.all([connected(),connected(),connected()]);
        const moderation = new ForumService(forum(manager.c));
        const finalTargetHidden = transition === "Hide";
        const command = postCommand(f,"moderator1",finalTargetHidden,
          initiallyHidden ? 1 : 0, transition + " post row lock");
        let held = false;
        let write: Promise<unknown> | undefined;
        let visibility: ReturnType<ForumService["setPostVisibility"]> | undefined;
        try {
          await holder.c.query("begin");
          held = true;
          await holder.c.query("select id from forum_posts where id=$1 for update", [f.postId]);
          const beginWriter = async () => {
            switch(kind) {
              case "body-plan":
                write = new DrizzleContentPostBodyPlanningStore(drizzle(writer.c))
                  .upsertPending(specification!,revision,admission,"author");
                break;
              case "direct-reply":
                write = forum(writer.c).createPost({
                  id:replyId,topicId:f.topicId,authorId:"author",parentPostId:f.postId,
                  bodyRevision:{id:replyRevisionId,originalContent:"Raced direct reply",sourceLocale:"en"},
                });
                break;
              case "edit":
                write = new ForumService(forum(writer.c)).editPublishedPost({
                  topicId:f.topicId,postId:f.postId,actorId:"author",
                  expectedRevisionId:f.bodyRevisionId,body:"New body revision",
                  draftId:receipt,attachmentIds:[],
                });
                break;
              case "complaint-post":
                write = new DrizzleComplaintsRepository(drizzle(writer.c),
                  {tenMinutes:10_000,day:10_000},async()=>{}).submit("ordinary",{
                    target:{kind:"post",topicId:f.topicId,postId:f.postId,revisionId:f.bodyRevisionId},
                    operationId:complaintId,reason:"spam",explanation:"Protected preexisting report form",
                  });
                break;
            }
            void write.catch(()=>undefined);
            await waitBlocked(writer.pid,[holder.pid,manager.pid]);
          };
          const beginVisibility = async () => {
            visibility = moderation.setPostVisibility(command);
            void visibility.catch(()=>undefined);
            await waitBlocked(manager.pid,[holder.pid,writer.pid]);
          };
          if(writerFirst){await beginWriter();await beginVisibility();}
          else{await beginVisibility();await beginWriter();}
          await holder.c.query("commit");
          held = false;
          const [written,changed] = await Promise.allSettled([write!,visibility!]);
          const protectedSubmission = kind==="complaint-post";
          const writerAdmitted = protectedSubmission ||
            (transition==="Hide" ? writerFirst : !writerFirst);
          if (writerAdmitted) {
            expect(written.status).toBe("fulfilled");
            if(kind==="body-plan"&&written.status==="fulfilled") {
              expect(written.value).toMatchObject({outcome:"task",created:true});
            }
          } else if(kind==="body-plan") {
            expect(written).toMatchObject({status:"fulfilled",value:{outcome:"revision-changed"}});
          } else {
            expect(written.status).toBe("rejected");
            if(written.status==="rejected")expect(written.reason).toBeInstanceOf(ForumEntityNotFoundError);
          }
          const expectedConflict=kind==="edit"&&transition==="Hide"&&writerFirst;
          if(expectedConflict){
            expect(changed.status).toBe("rejected");
            if(changed.status==="rejected")expect(changed.reason).toBeInstanceOf(ForumStateConflictError);
          }else{
            expect(changed.status).toBe("fulfilled");
            if(changed.status==="fulfilled")expect(changed.value).toMatchObject({
              hidden:finalTargetHidden,changed:true,
            });
          }
          const state=(await client.query<{
            hidden:boolean;version:number;revisionId:string;replies:number;
            postRevisions:number;receipts:number;heads:number;tasks:number;budget:number;complaints:number;
          }>(`select
            (select is_hidden from forum_posts where id=$1) as hidden,
            (select visibility_version from forum_posts where id=$1) as version,
            (select current_revision_id from forum_posts where id=$1) as "revisionId",
            (select count(*)::int from forum_posts where id=$2 and parent_post_id=$1) as replies,
            (select count(*)::int from forum_post_revisions where post_id=$1) as "postRevisions",
            (select count(*)::int from forum_publication_receipts where post_id=$1) as receipts,
            (select count(*)::int from translation_task_generation_heads
              where source_namespace='post-body' and source_key=$1) as heads,
            (select count(*)::int from translation_tasks
              where source_namespace='post-body' and source_key=$1) as tasks,
            (select coalesce(sum(used_units),0)::int from content_translation_request_budget_counters
              where scope in ($3,$4)) as budget,
            (select count(*)::int from forum_complaints c join forum_complaint_targets t
              on t.id=c.target_id where t.post_id=$1) as complaints`,
            [f.postId,replyId,
              admission.global.name+"@race-v1",admission.requester.name+"@race-v1"]
          )).rows[0]!;
          expect(state.hidden).toBe(expectedConflict?false:finalTargetHidden);
          expect(state.version).toBe(expectedConflict?0:initiallyHidden?2:1);
          expect(state.replies).toBe(kind==="direct-reply"&&writerAdmitted?1:0);
          expect(state.postRevisions).toBe(kind==="edit"&&writerAdmitted?2:1);
          expect(state.receipts).toBe(kind==="edit"&&writerAdmitted?1:0);
          expect(state.heads).toBe(kind==="body-plan"&&writerAdmitted?1:0);
          expect(state.tasks).toBe(kind==="body-plan"&&writerAdmitted?1:0);
          expect(state.budget).toBe(kind==="body-plan"&&writerAdmitted?2:0);
          expect(state.complaints).toBe(protectedSubmission?1:0);
          expect((await events(f.postId)).map(x=>x.action)).toEqual(
            expectedConflict?[]:initiallyHidden?["post.hidden","post.restored"]:["post.hidden"],
          );
          if(expectedConflict) {
            // Edit wins: Hide correctly refuses the obsolete revision CAS,
            // then succeeds only with a fresh observed revision.
            await moderation.setPostVisibility({
              ...postCommand(f), expectedRevisionId:state.revisionId,
            });
            await moderation.setPostVisibility({
              ...postCommand(f,"moderator1",false,1,"Restore current revision"),
              expectedRevisionId:state.revisionId,
            });
          } else if(finalTargetHidden) {
            await moderation.setPostVisibility(
              postCommand(f,"moderator1",false,1,"Restore after post lock race"),
            );
          }
          const final=(await client.query(
            "select is_hidden from forum_posts where id=$1",[f.postId],
          )).rows[0];
          expect(final.is_hidden).toBe(false);
          if(kind==="body-plan"&&writerAdmitted) {
            expect((await client.query(
              "select status from translation_tasks where source_namespace='post-body' and source_key=$1",
              [f.postId],
            )).rows).toEqual([{status:"pending"}]);
          }
        }finally{
          if(held)await holder.c.query("rollback");
          await Promise.allSettled([write,visibility]);
          await Promise.all([holder.c.end(),writer.c.end(),manager.c.end()]);
        }
      },
      30_000,
    );
  }
});

describe("B3 Help attention public-safe projection", () => {
  it("excludes hidden signal topics from queues/counts and masks hidden proposed originals", async () => {
    const question=await fixture(
      "B3_ATTENTION_VISIBLE_QUESTION_6071", "B3_ATTENTION_VISIBLE_TITLE_6071",
      HELP_SOLUTIONS_SERVICE_SECTION_ID,
    );
    const original=await fixture(
      "B3_ATTENTION_HIDDEN_ORIGINAL_6071", "B3_ATTENTION_SECRET_ORIGINAL_TITLE_6071",
      HELP_SOLUTIONS_SERVICE_SECTION_ID,
    );
    const details=await service.createHelpSignal({
      kind:"needs-details",topicId:question.topicId,actorId:"ordinary",
      explanation:"Question requires clarification",proposedOriginalTopicId:null,
    });
    const duplicate=await service.createHelpSignal({
      kind:"duplicate",topicId:question.topicId,actorId:"author",
      explanation:"Potential duplicate",proposedOriginalTopicId:original.topicId,
    });
    const visibility={signalKinds:["needs-details","duplicate"] as const,appeals:false};
    const counts=()=>repository.readHelpAttentionCounts(visibility);
    const cases=async(group:"needs-details"|"duplicate"|"mixed")=>
      (await repository.readHelpAttentionCases(group,visibility)).cases;
    const current=await counts();
    expect((await cases("needs-details")).some(x=>x.id===details.id)).toBe(true);
    expect((await cases("mixed")).filter(x=>x.topicId===question.topicId).map(x=>x.id).sort())
      .toEqual([details.id,duplicate.id].sort());
    expect((await cases("duplicate")).find(x=>x.id===duplicate.id)?.original)
      .toEqual({id:original.topicId,title:"B3_ATTENTION_SECRET_ORIGINAL_TITLE_6071"});

    await service.setTopicVisibility(topicCommand(original));
    const masked=(await cases("duplicate")).find(x=>x.id===duplicate.id);
    expect(masked?.original).toBeNull();
    expect(JSON.stringify(masked)).not.toContain(original.topicId);
    expect(JSON.stringify(masked)).not.toContain("B3_ATTENTION_SECRET_ORIGINAL_TITLE_6071");
    expect(await counts()).toEqual(current);
    await service.setTopicVisibility(topicCommand(original,"moderator1",false,1,"Restore original"));
    expect((await cases("duplicate")).find(x=>x.id===duplicate.id)?.original?.id).toBe(original.topicId);

    await service.setTopicVisibility(topicCommand(question));
    expect((await cases("needs-details")).map(x=>x.id)).not.toContain(details.id);
    expect((await cases("duplicate")).map(x=>x.id)).not.toContain(duplicate.id);
    expect((await cases("mixed")).map(x=>x.topicId)).not.toContain(question.topicId);
    const hidden=await counts();
    expect(hidden["needs-details"]).toBe(current["needs-details"]-1);
    expect(hidden.duplicate).toBe(current.duplicate-1);
    expect(hidden.mixed).toBe(current.mixed-1);
    await service.setTopicVisibility(topicCommand(question,"moderator1",false,1,"Restore question"));
    expect(await counts()).toEqual(current);
    expect((await cases("mixed")).filter(x=>x.topicId===question.topicId)).toHaveLength(2);
  });

  it("filters hidden answer-target signals before Help Needs Attention LIMIT and badge counts", async () => {
    const f=await fixture(
      "B3_HELP_HIDDEN_SIGNAL_ROOT_6174", "B3_HELP_SIGNAL_VISIBLE_TITLE_6174",
      HELP_SOLUTIONS_SERVICE_SECTION_ID,
    );
    const answerId=randomUUID(),revisionId=randomUUID();
    await repository.createPost({
      id:answerId,topicId:f.topicId,authorId:"ordinary",parentPostId:f.postId,
      bodyRevision:{
        id:revisionId,originalContent:"B3_HELP_HIDDEN_SIGNAL_ANSWER_6174",sourceLocale:"en",
      },
    });
    await repository.selectBestAnswer(f.topicId,answerId,"author");
    await repository.markTopicSolved(f.topicId,"author");
    const answerSignal=await service.createHelpSignal({
      kind:"needs-review",topicId:f.topicId,actorId:"ordinary",
      explanation:"Answer needs review",proposedOriginalTopicId:null,
    });
    const detailsSignal=await service.createHelpSignal({
      kind:"needs-details",topicId:f.topicId,actorId:"author",
      explanation:"Question needs detail",proposedOriginalTopicId:null,
    });
    expect(answerSignal.status).toBe("pending");
    expect(detailsSignal.status).toBe("pending");

    const reviewOnly={signalKinds:["needs-review"] as const,appeals:false};
    const both={signalKinds:["needs-review","needs-details"] as const,appeals:false};
    const read=async(visibility:typeof reviewOnly|typeof both)=>
      (await repository.readHelpSolutionsNeedsAttention({},visibility))?.questions
        .find(q=>q.id===f.topicId);
    expect(await read(reviewOnly)).toMatchObject({
      attention:{signals:{"needs-review":1},totalSignals:1},
    });
    expect(await read(both)).toMatchObject({
      attention:{signals:{"needs-review":1,"needs-details":1},totalSignals:2},
    });

    await service.setPostVisibility({
      topicId:f.topicId,postId:answerId,actorId:"moderator1",hidden:true,
      expectedVisibilityVersion:0,expectedRevisionId:revisionId,reason:"Hide signaled answer",
    });
    expect(await read(reviewOnly)).toBeUndefined();
    const retained=await read(both);
    expect(retained?.attention).toMatchObject({
      signals:{"needs-details":1},totalSignals:1,
    });
    expect(retained?.attention?.signals).not.toHaveProperty("needs-review");
    expect(JSON.stringify(retained)).not.toContain("B3_HELP_HIDDEN_SIGNAL_ANSWER_6174");

    await service.setPostVisibility({
      topicId:f.topicId,postId:answerId,actorId:"moderator1",hidden:false,
      expectedVisibilityVersion:1,expectedRevisionId:revisionId,reason:"Restore signaled answer",
    });
    expect(await read(both)).toMatchObject({
      attention:{signals:{"needs-review":1,"needs-details":1},totalSignals:2},
    });
    await service.setTopicVisibility(topicCommand(f));
    expect(await read(both)).toBeUndefined();
    await service.setTopicVisibility(topicCommand(f,"moderator1",false,1,"Restore signaled question"));
    expect(await read(reviewOnly)).toMatchObject({
      attention:{signals:{"needs-review":1},totalSignals:1},
    });
  });

  it("excludes hidden selected-answer Needs review from the status queue and count", async () => {
    const f=await fixture(
      "B3_ATTENTION_SOLVED_ROOT_6072", "B3_ATTENTION_SOLVED_TITLE_6072",
      HELP_SOLUTIONS_SERVICE_SECTION_ID,
    );
    const answerId=randomUUID(),revisionId=randomUUID();
    await repository.createPost({
      id:answerId,topicId:f.topicId,authorId:"ordinary",parentPostId:f.postId,
      bodyRevision:{id:revisionId,originalContent:"B3_ATTENTION_SELECTED_ANSWER_6072",sourceLocale:"en"},
    });
    await repository.selectBestAnswer(f.topicId,answerId,"author");
    await repository.markTopicSolved(f.topicId,"author");
    await service.setHelpSolutionModeration(f.topicId,"needs-review",null,"moderator1",answerId);
    const visibility={signalKinds:["needs-review"] as const,appeals:false};
    const count=async()=>(await repository.readHelpAttentionCounts(visibility))["needs-review"];
    const cases=async()=>(await repository.readHelpAttentionCases("needs-review",visibility)).cases;
    const visibleCount=await count();
    expect((await cases()).find(x=>x.type==="review-status"&&x.id===answerId))
      .toMatchObject({topicId:f.topicId,topicTitle:"B3_ATTENTION_SOLVED_TITLE_6072"});

    await service.setPostVisibility({
      topicId:f.topicId,postId:answerId,actorId:"moderator1",hidden:true,
      expectedVisibilityVersion:0,expectedRevisionId:revisionId,reason:"Hide reviewed answer",
    });
    expect((await cases()).map(x=>x.id)).not.toContain(answerId);
    expect(await count()).toBe(visibleCount-1);
    await service.setPostVisibility({
      topicId:f.topicId,postId:answerId,actorId:"moderator1",hidden:false,
      expectedVisibilityVersion:1,expectedRevisionId:revisionId,reason:"Restore reviewed answer",
    });
    expect(await count()).toBe(visibleCount);
    await service.setTopicVisibility(topicCommand(f));
    expect((await cases()).map(x=>x.id)).not.toContain(answerId);
    expect(await count()).toBe(visibleCount-1);
    await service.setTopicVisibility(topicCommand(f,"moderator1",false,1,"Restore reviewed question"));
    expect(await count()).toBe(visibleCount);
  });
});

describe("B3 retained Help duplicate appeal visibility projection", () => {
  it("retains a protected pending appeal with hidden current titles redacted and resolves it", async () => {
    const duplicate=await fixture(
      "B3_APPEAL_DUPLICATE_BODY_6132", "B3_APPEAL_SECRET_DUPLICATE_TITLE_6132",
      HELP_SOLUTIONS_SERVICE_SECTION_ID,
    );
    const original=await fixture(
      "B3_APPEAL_ORIGINAL_BODY_6132", "B3_APPEAL_SECRET_ORIGINAL_TITLE_6132",
      HELP_SOLUTIONS_SERVICE_SECTION_ID,
    );
    await service.confirmHelpDuplicate(duplicate.topicId,original.topicId,"owner");
    const relation=await client.query<{id:string}>(
      "select id from forum_help_duplicate_relationships where duplicate_topic_id=$1 and removed_at is null",
      [duplicate.topicId],
    );
    const relationshipId=relation.rows[0]?.id;
    if (!relationshipId) throw new Error("missing confirmed duplicate relationship");
    await service.appealHelpDuplicate(duplicate.topicId,"author","Retained appeal explanation",relationshipId);
    const appeal=await client.query<{id:string}>(
      "select id from forum_help_duplicate_appeals where relationship_id=$1 and status='pending'",
      [relationshipId],
    );
    const appealId=appeal.rows[0]?.id;
    if (!appealId) throw new Error("missing pending appeal");

    const visibility={signalKinds:[] as const,appeals:true};
    const count=async()=>(await repository.readHelpAttentionCounts(visibility)).appeals;
    const findCase=async()=>{
      for(let page=0;page<100;page++){
        const result=await repository.readHelpAttentionCases("appeals",visibility,page);
        const item=result.cases.find(item=>item.id===appealId);
        if(item)return item;
        if(!result.hasMore)break;
      }
      throw new Error("pending appeal missing from retained Attention queue");
    };
    const initialCount=await count();
    expect(await findCase()).toMatchObject({
      id:appealId,topicId:duplicate.topicId,
      topicTitle:"B3_APPEAL_SECRET_DUPLICATE_TITLE_6132",
      original:{id:original.topicId,title:"B3_APPEAL_SECRET_ORIGINAL_TITLE_6132"},
    });

    await service.setTopicVisibility(topicCommand(original));
    const hiddenOriginal=await findCase();
    expect(hiddenOriginal.original).toBeNull();
    expect(hiddenOriginal.topicTitle).toBe("B3_APPEAL_SECRET_DUPLICATE_TITLE_6132");
    expect(JSON.stringify(hiddenOriginal)).not.toContain("B3_APPEAL_SECRET_ORIGINAL_TITLE_6132");
    expect(JSON.stringify(hiddenOriginal)).not.toContain(original.topicId);
    expect(await count()).toBe(initialCount);

    await service.setTopicVisibility(topicCommand(duplicate));
    const bothHidden=await findCase();
    expect(bothHidden).toMatchObject({
      id:appealId,topicId:duplicate.topicId,
      topicTitle:"",topicUnavailable:true,original:null,
    });
    expect(JSON.stringify(bothHidden)).not.toContain("B3_APPEAL_SECRET_DUPLICATE_TITLE_6132");
    expect(JSON.stringify(bothHidden)).not.toContain("B3_APPEAL_SECRET_ORIGINAL_TITLE_6132");
    expect(JSON.stringify(bothHidden)).not.toContain(original.topicId);
    expect(await count()).toBe(initialCount);

    await service.setTopicVisibility(topicCommand(original,"moderator1",false,1,"Restore original"));
    const restoredOriginal=await findCase();
    expect(restoredOriginal.original?.title).toBe("B3_APPEAL_SECRET_ORIGINAL_TITLE_6132");
    expect(restoredOriginal.topicUnavailable).toBe(true);
    expect(restoredOriginal.topicTitle).toBe("");
    await service.setTopicVisibility(topicCommand(duplicate,"moderator1",false,1,"Restore duplicate"));
    expect(await findCase()).toMatchObject({
      topicTitle:"B3_APPEAL_SECRET_DUPLICATE_TITLE_6132",
      original:{id:original.topicId,title:"B3_APPEAL_SECRET_ORIGINAL_TITLE_6132"},
    });
    expect(await count()).toBe(initialCount);

    await service.setTopicVisibility(topicCommand(duplicate,"moderator1",true,2,"Hide duplicate for resolution"));
    await service.resolveHelpDuplicateAppeal(duplicate.topicId,"moderator1","rejected",appealId);
    expect(await count()).toBe(initialCount-1);
    const resolved=await client.query<{status:string}>(
      "select status from forum_help_duplicate_appeals where id=$1",[appealId],
    );
    expect(resolved.rows[0]?.status).toBe("rejected");
  });
});

describe("B3 Help similar-question visible-only ranking", () => {
  const similar = (term: string, limit = 5) =>
    repository.searchHelpSolutionsSimilar({title:term,body:"",tags:[]},limit);

  it("does not match hidden answer source and restores body matches without new activity", async () => {
    const f=await fixture(
      "B3_SIMILAR_VISIBLE_ROOT_6197", "B3_SIMILAR_UNRELATED_TOPIC_6197",
      HELP_SOLUTIONS_SERVICE_SECTION_ID,
    );
    const answerId=randomUUID(),revisionId=randomUUID();
    const token="camelliaquartz";
    await repository.createPost({
      id:answerId,topicId:f.topicId,authorId:"ordinary",parentPostId:f.postId,
      bodyRevision:{id:revisionId,originalContent:`B3_SECRET_SIMILAR_ANSWER_6197 ${token}`,sourceLocale:"en"},
    });
    expect((await similar(token)).find(row=>row.id===f.topicId))
      .toMatchObject({matchSource:"body",replyCount:1});
    await service.setPostVisibility({
      topicId:f.topicId,postId:answerId,actorId:"moderator1",hidden:true,
      expectedVisibilityVersion:0,expectedRevisionId:revisionId,reason:"Hide matching answer",
    });
    expect((await similar(token)).map(row=>row.id)).not.toContain(f.topicId);
    await service.setPostVisibility({
      topicId:f.topicId,postId:answerId,actorId:"moderator1",hidden:false,
      expectedVisibilityVersion:1,expectedRevisionId:revisionId,reason:"Restore matching answer",
    });
    expect((await similar(token)).find(row=>row.id===f.topicId))
      .toMatchObject({matchSource:"body",replyCount:1});
  });

  it("filters a hidden exact-title hit before LIMIT so a visible body hit ranks", async () => {
    const token="orionflintmatrix";
    const visible=await fixture(
      "B3_SIMILAR_VISIBLE_ROOT_6198","B3_SIMILAR_UNRELATED_TITLE_6198",
      HELP_SOLUTIONS_SERVICE_SECTION_ID,
    );
    const matchId=randomUUID(),matchRevisionId=randomUUID();
    await repository.createPost({
      id:matchId,topicId:visible.topicId,authorId:"ordinary",parentPostId:visible.postId,
      bodyRevision:{id:matchRevisionId,originalContent:`Visible body match ${token}`,sourceLocale:"en"},
    });
    const hidden=await fixture(
      "B3_SIMILAR_OTHER_ROOT_6198",token,
      HELP_SOLUTIONS_SERVICE_SECTION_ID,
    );
    expect((await similar(token,1))[0]).toMatchObject({
      id:hidden.topicId,matchSource:"title",
    });
    await service.setTopicVisibility(topicCommand(hidden));
    expect(await repository.readTopicPage(hidden.topicId)).toBeUndefined();
    expect((await similar(token,1))[0]).toMatchObject({
      id:visible.topicId,matchSource:"body",
    });
    await service.setTopicVisibility(topicCommand(hidden,"moderator1",false,1,"Restore ranked topic"));
    expect((await similar(token,1))[0]).toMatchObject({
      id:hidden.topicId,matchSource:"title",
    });
  });
});

describe("B3 public tag names require visible topic membership", () => {
  it("removes hidden-only user tags from index and direct Tag while keeping shared tags", async () => {
    const suffix=randomUUID().slice(0,8);
    const shared={key:`b3-shared-${suffix}`,name:`B3 Shared ${suffix}`};
    const secret={key:`b3-secret-${suffix}`,name:`B3_HIDDEN_TAG_NAME_${suffix}`};
    async function taggedTopic(title: string, tags: {key:string;name:string}[]) {
      const topicId=randomUUID(),postId=randomUUID();
      const titleRevisionId=randomUUID(),bodyRevisionId=randomUUID();
      await repository.createTopicWithInitialPost({
        id:topicId,sectionId:"visibility-section",authorId:"author",
        titleRevision:{id:titleRevisionId,originalContent:title,sourceLocale:"en"},
        initialPost:{
          id:postId,topicId,authorId:"author",
          bodyRevision:{id:bodyRevisionId,originalContent:"Visible initial post",sourceLocale:"en"},
        },
        tags,
      });
      return {topicId,postId,titleRevisionId,bodyRevisionId};
    }
    const visible=await taggedTopic("B3_TAG_VISIBLE_TOPIC", [shared]);
    const hidden=await taggedTopic("B3_TAG_HIDDEN_TOPIC", [shared,secret]);
    const index=async()=>await repository.readTags();
    const row=async(key:string)=>(await index()).find(item=>item.key===key);
    expect(await row(shared.key)).toMatchObject({name:shared.name,topicCount:2});
    expect(await row(secret.key)).toMatchObject({name:secret.name,topicCount:1});
    expect((await repository.readTag(secret.key))?.topics.map(t=>t.id)).toEqual([hidden.topicId]);

    await service.setTopicVisibility(topicCommand(hidden));
    expect(await row(shared.key)).toMatchObject({name:shared.name,topicCount:1});
    expect(await row(secret.key)).toBeUndefined();
    expect(JSON.stringify(await index())).not.toContain(secret.name);
    expect(await repository.readTag(secret.key)).toBeUndefined();
    expect(await repository.readTag(`b3-nonexistent-${suffix}`)).toBeUndefined();
    expect((await repository.readTag(shared.key))?.topics.map(t=>t.id)).toEqual([visible.topicId]);

    await service.setTopicVisibility(topicCommand(hidden,"moderator1",false,1,"Restore tagged topic"));
    expect(await row(shared.key)).toMatchObject({topicCount:2});
    expect(await row(secret.key)).toMatchObject({name:secret.name,topicCount:1});
    expect((await repository.readTag(secret.key))?.topics.map(t=>t.id)).toEqual([hidden.topicId]);

    await service.setTopicVisibility(topicCommand(visible));
    await service.setTopicVisibility(topicCommand(hidden,"moderator1",true,2,"Hide tagged topic again"));
    expect(await row(shared.key)).toBeUndefined();
    expect(await repository.readTag(shared.key)).toBeUndefined();
    await service.setTopicVisibility(topicCommand(visible,"moderator1",false,1,"Restore visible shared tag"));
    expect(await row(shared.key)).toMatchObject({topicCount:1});
  });
});

describe("B3 public visibility projection and leak-safe discovery", () => {
  it("retains a hidden selected Help solution while masking its source and profile counts", async () => {
    const f=await fixture(
      "B3_HELP_ROOT_2926", "B3_HELP_SELECTED_2926", HELP_SOLUTIONS_SERVICE_SECTION_ID,
    );
    const answerId=randomUUID(),revisionId=randomUUID();
    await repository.createPost({
      id:answerId,topicId:f.topicId,authorId:"ordinary",parentPostId:f.postId,
      bodyRevision:{id:revisionId,originalContent:"B3_HIDDEN_BEST_SOURCE_2926",sourceLocale:"en"},
    });
    await repository.selectBestAnswer(f.topicId,answerId,"author");
    await repository.markTopicSolved(f.topicId,"author");
    const before=await repository.readProfile("ordinary");
    const publicBefore=await repository.readTopicPage(f.topicId);
    expect(publicBefore).toMatchObject({isSolved:true,bestAnswerPostId:answerId});
    expect(publicBefore?.posts[1]).toMatchObject({
      id:answerId,body:{originalContent:"B3_HIDDEN_BEST_SOURCE_2926"},
    });
    expect((await repository.readHelpSolutionsAll())?.questions.find(x=>x.id===f.topicId))
      .toMatchObject({isSolved:true,hasBestAnswer:true,replyCount:1});

    await service.setPostVisibility({
      topicId:f.topicId,postId:answerId,actorId:"moderator1",hidden:true,
      expectedVisibilityVersion:0,expectedRevisionId:revisionId,reason:"Hide selected solution",
    });
    const page=await repository.readTopicPage(f.topicId);
    expect(page).toMatchObject({isSolved:true,bestAnswerPostId:answerId});
    expect(page?.posts[1]).toEqual({
      kind:"hidden",id:answerId,topicId:f.topicId,parentPostId:f.postId,createdAt:expect.any(Date),
    });
    expect(JSON.stringify(page)).not.toContain("B3_HIDDEN_BEST_SOURCE_2926");
    expect(JSON.stringify(page)).not.toContain(revisionId);
    const hiddenHelp=(await repository.readHelpSolutionsAll())?.questions.find(x=>x.id===f.topicId);
    expect(hiddenHelp).toMatchObject({
      isSolved:true,hasBestAnswer:true,replyCount:0,solutionModerationStatus:null,
    });
    expect(JSON.stringify(hiddenHelp)).not.toContain("B3_HIDDEN_BEST_SOURCE_2926");
    expect((await repository.readProfile("ordinary"))?.messageCount).toBe(before!.messageCount-1);
    expect((await repository.readProfile("ordinary"))?.bestAnswerCount).toBe(before!.bestAnswerCount-1);

    await service.setPostVisibility({
      topicId:f.topicId,postId:answerId,actorId:"moderator1",hidden:false,
      expectedVisibilityVersion:1,expectedRevisionId:revisionId,reason:"Restore selected solution",
    });
    expect((await repository.readTopicPage(f.topicId))?.posts[1]).toMatchObject({
      id:answerId,body:{id:revisionId,originalContent:"B3_HIDDEN_BEST_SOURCE_2926"},
    });
    expect((await repository.readHelpSolutionsAll())?.questions.find(x=>x.id===f.topicId))
      .toMatchObject({isSolved:true,hasBestAnswer:true,replyCount:1});
    expect((await repository.readProfile("ordinary"))?.messageCount).toBe(before!.messageCount);
    expect((await repository.readProfile("ordinary"))?.bestAnswerCount).toBe(before!.bestAnswerCount);
  });

  it("ranks Popular by visible post activity before its period limits", async () => {
    const first=await fixture("B3_POPULAR_FIRST_2926");
    const second=await fixture("B3_POPULAR_SECOND_2926");
    const replyId=randomUUID(),revisionId=randomUUID();
    await repository.createPost({
      id:replyId,topicId:first.topicId,authorId:"ordinary",parentPostId:first.postId,
      bodyRevision:{id:revisionId,originalContent:"B3_POPULAR_REPLY_2926",sourceLocale:"en"},
    });
    // The future reference isolates Popular ranking, but temporary future post dates
    // must not poison the per-author write cooldown for later tests in this shared schema.
    const reference=new Date("2035-05-01T12:00:00.000Z");
    const originalDates=await client.query<{id:string;created_at:Date}>(
      "select id,created_at from forum_posts where id in ($1,$2,$3)",
      [first.postId,second.postId,replyId],
    );
    try {
      for(const [id,time] of [
        [first.postId,"2035-05-01T07:00:00.000Z"],
        [second.postId,"2035-05-01T08:00:00.000Z"],
        [replyId,"2035-05-01T09:00:00.000Z"],
      ]){
        await client.query("update forum_posts set created_at=$1 where id=$2",[new Date(time),id]);
      }
      const top=async() => {
        const popular=await repository.readPopular(reference,1);
        return ["24h","7d","30d"].map(period=>popular[period as "24h"|"7d"|"30d"][0]?.id);
      };
      expect(await top()).toEqual([first.topicId,first.topicId,first.topicId]);
      await service.setPostVisibility({
        topicId:first.topicId,postId:replyId,actorId:"moderator1",hidden:true,
        expectedVisibilityVersion:0,expectedRevisionId:revisionId,reason:"Hide ranked Popular reply",
      });
      expect(await top()).toEqual([second.topicId,second.topicId,second.topicId]);
      await service.setPostVisibility({
        topicId:first.topicId,postId:replyId,actorId:"moderator1",hidden:false,
        expectedVisibilityVersion:1,expectedRevisionId:revisionId,reason:"Restore ranked Popular reply",
      });
      expect(await top()).toEqual([first.topicId,first.topicId,first.topicId]);
    } finally {
      for(const row of originalDates.rows){
        await client.query("update forum_posts set created_at=$1 where id=$2",[row.created_at,row.id]);
      }
    }
  });


  it("filters hidden reply from search body matching and reply counts, then restores it", async () => {
    const f=await fixture("B3_UNIQUE_SEARCH_ROOT_20261120");
    const postId=randomUUID(),revisionId=randomUUID();
    await repository.createPost({
      id:postId,topicId:f.topicId,authorId:"ordinary",parentPostId:f.postId,
      bodyRevision:{id:revisionId,originalContent:"B3_UNIQUE_SEARCH_REPLY_20261120",sourceLocale:"en"},
    });
    expect((await repository.search("B3_UNIQUE_SEARCH_ROOT_20261120")).find(x=>x.id===f.topicId)?.postCount).toBe(2);
    expect((await repository.search("B3_UNIQUE_SEARCH_REPLY_20261120")).map(x=>x.id)).toContain(f.topicId);
    await service.setPostVisibility({topicId:f.topicId,postId,actorId:"moderator1",hidden:true,
      expectedVisibilityVersion:0,expectedRevisionId:revisionId,reason:"Hide search reply"});
    expect((await repository.search("B3_UNIQUE_SEARCH_REPLY_20261120")).map(x=>x.id)).not.toContain(f.topicId);
    expect((await repository.search("B3_UNIQUE_SEARCH_ROOT_20261120")).find(x=>x.id===f.topicId)?.postCount).toBe(1);
    expect((await repository.readTopicPage(f.topicId))?.posts[1]).toEqual({
      kind:"hidden",id:postId,topicId:f.topicId,parentPostId:f.postId,createdAt:expect.any(Date),
    });
    await service.setPostVisibility({topicId:f.topicId,postId,actorId:"moderator1",hidden:false,
      expectedVisibilityVersion:1,expectedRevisionId:revisionId,reason:"Restore search reply"});
    expect((await repository.search("B3_UNIQUE_SEARCH_REPLY_20261120")).map(x=>x.id)).toContain(f.topicId);
    expect((await repository.search("B3_UNIQUE_SEARCH_ROOT_20261120")).find(x=>x.id===f.topicId)?.postCount).toBe(2);
  });

  it("ranks only visible post activity before search LIMIT and reverses rank on Restore", async () => {
    const first=await fixture("Ranked root one", "B3_SEARCH_LIMIT_RANK_20261120");
    const second=await fixture("Ranked root two", "B3_SEARCH_LIMIT_RANK_20261120");
    const postId=randomUUID(),revisionId=randomUUID();
    await repository.createPost({
      id:postId,topicId:first.topicId,authorId:"ordinary",parentPostId:first.postId,
      bodyRevision:{id:revisionId,originalContent:"Activity raising first topic",sourceLocale:"en"},
    });
    // Separate the three activity levels deterministically without relying on wall-clock scheduling.
    const [originalTopicDate] = (await client.query<{created_at:Date}>(
      "select created_at from forum_topics where id=$1", [second.topicId],
    )).rows;
    const [originalPostDate] = (await client.query<{created_at:Date}>(
      "select created_at from forum_posts where id=$1", [postId],
    )).rows;
    if (!originalTopicDate || !originalPostDate) throw new Error("missing rank fixtures");
    try {
      await client.query("update forum_topics set created_at=clock_timestamp()+interval '1 minute' where id=$1", [second.topicId]);
      await client.query("update forum_posts set created_at=clock_timestamp()+interval '2 minutes' where id=$1", [postId]);
      const top=async()=>(await repository.search("B3_SEARCH_LIMIT_RANK_20261120",1))[0]?.id;
      expect(await top()).toBe(first.topicId);
      await service.setPostVisibility({topicId:first.topicId,postId,actorId:"moderator1",hidden:true,
        expectedVisibilityVersion:0,expectedRevisionId:revisionId,reason:"Hide rank raising reply"});
      expect(await top()).toBe(second.topicId);
      await service.setPostVisibility({topicId:first.topicId,postId,actorId:"moderator1",hidden:false,
        expectedVisibilityVersion:1,expectedRevisionId:revisionId,reason:"Restore ranked reply"});
      expect(await top()).toBe(first.topicId);
    } finally {
      await client.query("update forum_topics set created_at=$1 where id=$2",
        [originalTopicDate.created_at,second.topicId]);
      await client.query("update forum_posts set created_at=$1 where id=$2",
        [originalPostDate.created_at,postId]);
    }
  });

  it("classifies unanswered using visible non-root replies with a hidden root", async () => {
    const f=await fixture("B3_UNANSWERED_ROOT_20261120");
    const postId=randomUUID(),revisionId=randomUUID();
    const isUnanswered=async()=> (await repository.readUnanswered()).some(x=>x.id===f.topicId);
    expect(await isUnanswered()).toBe(true);
    await repository.createPost({
      id:postId,topicId:f.topicId,authorId:"ordinary",parentPostId:f.postId,
      bodyRevision:{id:revisionId,originalContent:"B3_UNANSWERED_REPLY_20261120",sourceLocale:"en"},
    });
    expect(await isUnanswered()).toBe(false);
    await service.setPostVisibility(postCommand(f));
    expect(await isUnanswered()).toBe(false);
    await service.setPostVisibility({topicId:f.topicId,postId,actorId:"moderator1",hidden:true,
      expectedVisibilityVersion:0,expectedRevisionId:revisionId,reason:"Hide sole answer"});
    expect(await isUnanswered()).toBe(true);
    await service.setPostVisibility({topicId:f.topicId,postId,actorId:"moderator1",hidden:false,
      expectedVisibilityVersion:1,expectedRevisionId:revisionId,reason:"Restore sole answer"});
    expect(await isUnanswered()).toBe(false);
  });

  it("keeps trusted raw post and hierarchy usable under hidden post and topic while public readers deny source", async () => {
    const categoryId="visibility-trusted-"+randomUUID();
    const sectionId="visibility-trusted-"+randomUUID();
    await repository.createCategory({id:categoryId,name:"Trusted test category"});
    await repository.createSection({id:sectionId,categoryId,name:"Trusted test section"});
    const source="B3_TRUSTED_HIDDEN_POST_SOURCE_20261121";
    const f=await fixture(source,"B3_TRUSTED_HIDDEN_TOPIC_TITLE_20261121",sectionId);
    const rawHierarchyTopic=async()=> (await repository.readHierarchy(categoryId))?.sections
      .find(section=>section.id===sectionId)?.topics.find(topic=>topic.id===f.topicId);
    expect((await repository.readPost(f.postId))?.body)
      .toMatchObject({id:f.bodyRevisionId,originalContent:source});
    expect((await rawHierarchyTopic())?.posts[0]?.body.originalContent).toBe(source);

    await service.setPostVisibility(postCommand(f));
    expect((await repository.readPost(f.postId))?.body.originalContent).toBe(source);
    expect((await rawHierarchyTopic())?.posts[0]?.body.originalContent).toBe(source);
    expect((await repository.readTopicPage(f.topicId))?.posts[0]).toEqual({
      kind:"hidden",id:f.postId,topicId:f.topicId,parentPostId:null,createdAt:expect.any(Date),
    });
    expect(await repository.readPostLocation(f.postId)).toBeUndefined();
    expect(await repository.readPostHistory(f.postId,f.topicId)).toEqual([]);

    await service.setTopicVisibility(topicCommand(f));
    expect((await repository.readPost(f.postId))?.body.originalContent).toBe(source);
    expect((await rawHierarchyTopic())?.posts[0]?.body.originalContent).toBe(source);
    expect(await repository.readTopicPage(f.topicId)).toBeUndefined();
    expect(await repository.readPostLocation(f.postId)).toBeUndefined();
    expect(await repository.readPostHistory(f.postId,f.topicId)).toEqual([]);
    expect((await repository.search(source)).map(topic=>topic.id)).not.toContain(f.topicId);

    await service.setTopicVisibility(topicCommand(f,"moderator1",false,1,"Restore trusted test topic"));
    expect((await repository.readTopicPage(f.topicId))?.posts[0]).toMatchObject({kind:"hidden"});
    await service.setPostVisibility(postCommand(f,"moderator1",false,1,"Restore trusted test post"));
    expect((await repository.readTopicPage(f.topicId))?.posts[0])
      .toMatchObject({body:{id:f.bodyRevisionId,originalContent:source}});
  });

  it("treats hidden topics as neutral absence across thread, lists, search and counts", async () => {
    const f = await fixture("B3_SECRET_HIDDEN_ROOT_TEXT_6492");
    const categoryBefore = await repository.readHomepage();
    const sectionBefore = await repository.readSection("visibility-section");
    const profileBefore = await repository.readProfile("author");
    const publicVisible = await repository.readTopicPage(f.topicId);
    expect(publicVisible?.posts[0]).toMatchObject({
      body: { originalContent: "B3_SECRET_HIDDEN_ROOT_TEXT_6492" },
    });
    expect((await repository.search("B3_SECRET_HIDDEN_ROOT_TEXT_6492")).map(x=>x.id)).toContain(f.topicId);

    await service.setTopicVisibility(topicCommand(f));
    expect(await repository.readTopicPage(f.topicId)).toBeUndefined();
    expect((await repository.readPost(f.postId))?.body.originalContent).toBe("B3_SECRET_HIDDEN_ROOT_TEXT_6492");
    expect(await repository.readPostLocation(f.postId)).toBeUndefined();
    expect(await repository.readPostHistory(f.postId,f.topicId)).toEqual([]);
    expect((await repository.search("B3_SECRET_HIDDEN_ROOT_TEXT_6492")).map(x=>x.id)).not.toContain(f.topicId);
    expect((await repository.search("PRIVATE TOPIC")).map(x=>x.id)).not.toContain(f.topicId);
    expect((await repository.readSection("visibility-section"))?.topics.map(x=>x.id)).not.toContain(f.topicId);
    expect((await repository.readUnreadForUser("ordinary")).map(x=>x.id)).not.toContain(f.topicId);
    expect((await repository.readHomepage()).find(x=>x.id==="visibility-category")?.topicCount)
      .toBe(categoryBefore.find(x=>x.id==="visibility-category")!.topicCount-1);
    expect((await repository.readCategory("visibility-category"))?.sections
      .find(s=>s.id==="visibility-section")?.topicCount)
      .toBe(sectionBefore!.topics.length-1);
    expect((await repository.readProfile("author"))?.messageCount).toBe(profileBefore!.messageCount-1);

    await service.setTopicVisibility(topicCommand(f,"moderator1",false,1,"Restore public topic"));
    expect((await repository.readTopicPage(f.topicId))?.title.id).toBe(f.titleRevisionId);
    expect((await repository.search("B3_SECRET_HIDDEN_ROOT_TEXT_6492")).map(x=>x.id)).toContain(f.topicId);
  });

  it("returns only a typed hidden post stub, retaining chronology, parent and unread anchors", async () => {
    const f = await fixture("B3_SECRET_ROOT_TEXT_8953");
    const childId=randomUUID(),childRevisionId=randomUUID();
    await repository.createPost({
      id:childId,topicId:f.topicId,authorId:"ordinary",parentPostId:f.postId,
      bodyRevision:{id:childRevisionId,originalContent:"B3_VISIBLE_CHILD_8953",sourceLocale:"en"},
    });
    const before=await repository.readTopicPage(f.topicId);
    expect(before?.posts.map(x=>x.id)).toEqual([f.postId,childId]);
    await repository.advanceTopicReadState("ordinary",f.topicId,f.postId);
    await service.setPostVisibility(postCommand(f));
    const page=await repository.readTopicPage(f.topicId);
    expect(page).toBeDefined();
    expect(page?.posts.map(x=>x.id)).toEqual([f.postId,childId]);
    const stub=page!.posts[0]!;
    expect(stub).toEqual({
      kind:"hidden",id:f.postId,topicId:f.topicId,parentPostId:null,
      createdAt:expect.any(Date),
    });
    expect(JSON.stringify(page)).not.toContain("B3_SECRET_ROOT_TEXT_8953");
    expect(JSON.stringify(page)).not.toContain(f.bodyRevisionId);
    expect(page?.posts[1]).toMatchObject({parentPostId:f.postId,body:{originalContent:"B3_VISIBLE_CHILD_8953"}});
    expect(await repository.readPostLocation(f.postId)).toBeUndefined();
    expect((await repository.readPost(f.postId))?.body.originalContent).toBe("B3_SECRET_ROOT_TEXT_8953");
    expect(await repository.readPostHistory(f.postId,f.topicId)).toEqual([]);
    expect((await repository.search("B3_SECRET_ROOT_TEXT_8953")).map(x=>x.id)).not.toContain(f.topicId);
    expect((await repository.search("PRIVATE TOPIC")).map(x=>x.id)).toContain(f.topicId);
    const read=await repository.readTopicReadState("ordinary",f.topicId);
    expect(read).toMatchObject({
      lastReadPostId:f.postId,firstUnreadPostId:childId,latestPostId:childId,state:"unread",
    });
    expect((await repository.readUnreadForUser("ordinary")).find(x=>x.id===f.topicId))
      .toMatchObject({firstUnreadPostId:childId,latestPostId:childId,unreadCount:1});

    await service.setPostVisibility(postCommand(f,"moderator1",false,1,"Restore hidden root"));
    expect((await repository.readTopicPage(f.topicId))?.posts[0]).toMatchObject({
      body:{id:f.bodyRevisionId,originalContent:"B3_SECRET_ROOT_TEXT_8953"},
    });
    expect((await repository.readTopicReadState("ordinary",f.topicId))?.firstUnreadPostId).toBe(childId);
  });

  it("preserves a hidden middle parent and visible descendant without manufacturing unread on Restore", async () => {
    const f=await fixture("B3_VISIBLE_ROOT_BEFORE_HIDDEN_PARENT_3146");
    const middleId=randomUUID(),middleRevisionId=randomUUID();
    const childId=randomUUID(),childRevisionId=randomUUID();
    await repository.createPost({
      id:middleId,topicId:f.topicId,authorId:"ordinary",parentPostId:f.postId,
      bodyRevision:{
        id:middleRevisionId,originalContent:"B3_PRIVATE_MIDDLE_PARENT_SOURCE_3146",sourceLocale:"en",
      },
    });
    await repository.createPost({
      id:childId,topicId:f.topicId,authorId:"author",parentPostId:middleId,
      bodyRevision:{id:childRevisionId,originalContent:"B3_VISIBLE_DESCENDANT_3146",sourceLocale:"en"},
    });
    const original=await repository.readTopicPage(f.topicId);
    expect(original?.posts.map(p=>p.id)).toEqual([f.postId,middleId,childId]);
    expect(original?.posts[2]).toMatchObject({parentPostId:middleId});
    await repository.advanceTopicReadState("ordinary",f.topicId,f.postId);
    expect((await repository.readUnreadForUser("ordinary")).find(x=>x.id===f.topicId))
      .toMatchObject({firstUnreadPostId:middleId,latestPostId:childId,unreadCount:2});

    await service.setPostVisibility({
      topicId:f.topicId,postId:middleId,actorId:"moderator1",hidden:true,
      expectedVisibilityVersion:0,expectedRevisionId:middleRevisionId,
      reason:"Hide intermediate parent",
    });
    const hidden=await repository.readTopicPage(f.topicId);
    expect(hidden?.posts.map(p=>p.id)).toEqual([f.postId,middleId,childId]);
    expect(hidden?.posts[1]).toEqual({
      kind:"hidden",id:middleId,topicId:f.topicId,parentPostId:f.postId,createdAt:expect.any(Date),
    });
    expect(hidden?.posts[2]).toMatchObject({
      id:childId,parentPostId:middleId,
      body:{id:childRevisionId,originalContent:"B3_VISIBLE_DESCENDANT_3146"},
    });
    expect(JSON.stringify(hidden)).not.toContain("B3_PRIVATE_MIDDLE_PARENT_SOURCE_3146");
    expect(JSON.stringify(hidden)).not.toContain(middleRevisionId);
    expect((await repository.readPost(middleId))?.body.originalContent).toBe("B3_PRIVATE_MIDDLE_PARENT_SOURCE_3146");
    expect(await repository.readPostLocation(middleId)).toBeUndefined();
    expect(await repository.readPostHistory(middleId,f.topicId)).toEqual([]);
    expect((await repository.readTopicReadState("ordinary",f.topicId)))
      .toMatchObject({lastReadPostId:f.postId,firstUnreadPostId:childId,latestPostId:childId,state:"unread"});
    expect((await repository.readUnreadForUser("ordinary")).find(x=>x.id===f.topicId))
      .toMatchObject({firstUnreadPostId:childId,latestPostId:childId,unreadCount:1});

    await repository.advanceTopicReadState("ordinary",f.topicId,childId);
    expect((await repository.readTopicReadState("ordinary",f.topicId)))
      .toMatchObject({lastReadPostId:childId,firstUnreadPostId:null,state:"read"});
    await service.setPostVisibility({
      topicId:f.topicId,postId:middleId,actorId:"moderator1",hidden:false,
      expectedVisibilityVersion:1,expectedRevisionId:middleRevisionId,
      reason:"Restore intermediate parent",
    });
    expect((await repository.readTopicPage(f.topicId))?.posts[1]).toMatchObject({
      id:middleId,body:{
        id:middleRevisionId,originalContent:"B3_PRIVATE_MIDDLE_PARENT_SOURCE_3146",
      },
    });
    expect(await repository.readTopicReadState("ordinary",f.topicId))
      .toMatchObject({lastReadPostId:childId,firstUnreadPostId:null,state:"read"});
    expect((await repository.readUnreadForUser("ordinary")).map(x=>x.id)).not.toContain(f.topicId);
  });

  it("does not disclose blocked authors whose only posts are hidden", async () => {
    const f=await fixture("B3_VISIBLE_TOPIC_FOR_BLOCK_PROJECTION_6039");
    const replyId=randomUUID(),revisionId=randomUUID();
    await repository.createPost({
      id:replyId,topicId:f.topicId,authorId:"ordinary",parentPostId:f.postId,
      bodyRevision:{
        id:revisionId,originalContent:"B3_PRIVATE_BLOCKED_AUTHOR_POST_6039",sourceLocale:"en",
      },
    });
    await repository.setUserBlock({actorId:"author",blockedUserId:"ordinary",blocked:true});
    try {
      expect(await repository.readTopicBlockedAuthors("author",f.topicId)).toEqual(["ordinary"]);

      await service.setPostVisibility({
        topicId:f.topicId,postId:replyId,actorId:"moderator1",hidden:true,
        expectedVisibilityVersion:0,expectedRevisionId:revisionId,
        reason:"Hide the only post by a blocked author",
      });
      expect((await repository.readTopicPage(f.topicId))?.posts[1]).toEqual({
        kind:"hidden",id:replyId,topicId:f.topicId,
        parentPostId:f.postId,createdAt:expect.any(Date),
      });
      expect(await repository.readTopicBlockedAuthors("author",f.topicId)).toEqual([]);

      await service.setPostVisibility({
        topicId:f.topicId,postId:replyId,actorId:"moderator1",hidden:false,
        expectedVisibilityVersion:1,expectedRevisionId:revisionId,
        reason:"Restore blocked author's post",
      });
      expect(await repository.readTopicBlockedAuthors("author",f.topicId)).toEqual(["ordinary"]);

      await service.setTopicVisibility(topicCommand(f));
      expect(await repository.readTopicPage(f.topicId)).toBeUndefined();
      expect(await repository.readTopicBlockedAuthors("author",f.topicId)).toEqual([]);
      await service.setTopicVisibility(topicCommand(f,"moderator1",false,1,"Restore visible topic"));
      expect(await repository.readTopicBlockedAuthors("author",f.topicId)).toEqual(["ordinary"]);
    } finally {
      await repository.setUserBlock({actorId:"author",blockedUserId:"ordinary",blocked:false});
    }
  });

  it("preserves retained duplicate state but removes a hidden canonical original's ID/title/link data", async () => {
    const makeQuestion=async(title:string)=>{
      const topicId=randomUUID(),postId=randomUUID(),titleRevisionId=randomUUID(),bodyRevisionId=randomUUID();
      await repository.createTopicWithInitialPost({
        id:topicId,sectionId:HELP_SOLUTIONS_SERVICE_SECTION_ID,authorId:"author",
        titleRevision:{id:titleRevisionId,originalContent:title,sourceLocale:"en"},
        initialPost:{id:postId,topicId,authorId:"author",
          bodyRevision:{id:bodyRevisionId,originalContent:"Ordinary question",sourceLocale:"en"}},
      });
      return {topicId,postId,titleRevisionId,bodyRevisionId};
    };
    const original=await makeQuestion("B3_SECRET_CANONICAL_8472");
    const duplicate=await makeQuestion("B3_VISIBLE_DUPLICATE_8472");
    await service.confirmHelpDuplicate(duplicate.topicId,original.topicId,"owner");
    const visible=await repository.readTopicPage(duplicate.topicId);
    expect(visible?.duplicateOf).toMatchObject({
      id:original.topicId,title:"B3_SECRET_CANONICAL_8472",
    });
    await service.setTopicVisibility(topicCommand(original));
    const hidden=await repository.readTopicPage(duplicate.topicId);
    expect(hidden?.duplicateOf).toEqual({id:"",title:"",unavailable:true});
    expect(hidden?.duplicateRelationshipId).toBe(visible?.duplicateRelationshipId);
    expect(JSON.stringify(hidden)).not.toContain(original.topicId);
    expect(JSON.stringify(hidden)).not.toContain("B3_SECRET_CANONICAL_8472");
    expect((await repository.readHelpSolutionsAll())?.questions.map(x=>x.id)).not.toContain(original.topicId);
    const dup=(await repository.readHelpSolutionsAll())?.questions.find(x=>x.id===duplicate.topicId);
    expect(dup?.duplicateOf).toEqual({id:"",title:"",unavailable:true});
    await service.setTopicVisibility(topicCommand(original,"moderator1",false,1,"Restore canonical"));
    expect((await repository.readTopicPage(duplicate.topicId))?.duplicateOf?.title)
      .toBe("B3_SECRET_CANONICAL_8472");
  });
});

describe("B3 F4 SQL page boundaries and persisted root chronology", () => {
  it("matches title and tag without visible bodies, excluding hidden stronger matches before search LIMIT", async () => {
    const token=`f4token${randomUUID().replaceAll("-","")}`;
    const titleTopic=await fixture("F4 hidden root source",`F4 visible title ${token}`);
    await service.setPostVisibility(postCommand(titleTopic));

    const tag={key:`f4-tag-${randomUUID().slice(0,8)}`,name:`F4 tag ${token}`};
    const tagTopic={
      topicId:randomUUID(),postId:randomUUID(),
      titleRevisionId:randomUUID(),bodyRevisionId:randomUUID(),
    };
    await repository.createTopicWithInitialPost({
      id:tagTopic.topicId,sectionId:"visibility-section",authorId:"author",
      titleRevision:{id:tagTopic.titleRevisionId,originalContent:"F4 tag-only topic",sourceLocale:"en"},
      initialPost:{id:tagTopic.postId,topicId:tagTopic.topicId,authorId:"author",
        bodyRevision:{id:tagTopic.bodyRevisionId,originalContent:"F4 tag-only hidden body",sourceLocale:"en"}},
      tags:[tag],
    });
    await service.setPostVisibility(postCommand(tagTopic));

    const suppressed=await fixture(`F4 strong hidden match ${token}`,`F4 suppressed ${token}`);
    await service.setTopicVisibility(topicCommand(suppressed));
    const one=await repository.search(token,1);
    expect(one.map(row=>row.id)).toEqual([titleTopic.topicId]);
    expect(one[0]?.postCount).toBe(0);
    const two=await repository.search(token,2);
    expect(two.map(row=>row.id)).toEqual([titleTopic.topicId,tagTopic.topicId]);
    expect(two.map(row=>row.postCount)).toEqual([0,0]);
    expect(JSON.stringify(two)).not.toContain(suppressed.topicId);
    expect((await repository.readTag(tag.key))?.topics).toMatchObject([{id:tagTopic.topicId,postCount:0}]);
  });

  it("fills bounded category latest and pin ranks after hidden rows and ignores hidden post activity", async () => {
    const categoryId=`b3-f4-category-${randomUUID()}`;
    const sectionId=`b3-f4-section-${randomUUID()}`;
    await repository.createCategory({id:categoryId,name:"F4 category"});
    await repository.createSection({id:sectionId,categoryId,name:"F4 section"});
    const topics:Fixture[]=[];
    for(let index=0;index<8;index++){
      const f=await fixture(`F4 root ${index}`,`F4 topic ${index}`,sectionId);
      topics.push(f);
      await client.query("update forum_topics set created_at=$1 where id=$2",
        [new Date(Date.UTC(2034,0,1,0,index)),f.topicId]);
    }
    for(const index of [0,1,2,7]){
      const topic=topics[index]!;
      await repository.pinTopic(topic.topicId,"moderator1");
      await client.query("update forum_topic_pins set pinned_at=$1 where topic_id=$2",
        [new Date(Date.UTC(2035,0,1,0,index)),topic.topicId]);
    }
    const latePostId=randomUUID(),lateRevisionId=randomUUID();
    await repository.createPost({
      id:latePostId,topicId:topics[0]!.topicId,authorId:"ordinary",parentPostId:topics[0]!.postId,
      bodyRevision:{id:lateRevisionId,originalContent:"F4 hidden late activity",sourceLocale:"en"},
    });
    const [originalLateDate] = (await client.query<{created_at:Date}>(
      "select created_at from forum_posts where id=$1", [latePostId],
    )).rows;
    if (!originalLateDate) throw new Error("missing late reply fixture");
    try {
      await client.query("update forum_posts set created_at=$1 where id=$2",
        [new Date(Date.UTC(2037,0,1)),latePostId]);
      await service.setPostVisibility({
        topicId:topics[0]!.topicId,postId:latePostId,actorId:"moderator1",hidden:true,
        expectedVisibilityVersion:0,expectedRevisionId:lateRevisionId,reason:"Hide late activity",
      });
      await service.setTopicVisibility(topicCommand(topics[7]!));
      const section=(await repository.readCategory(categoryId,2))?.sections[0];
      expect(section).toMatchObject({topicCount:7,postCount:7});
      expect(section?.latestTopics.map(topic=>topic.id))
        .toEqual([6,5,4,3,2,1].map(index=>topics[index]!.topicId));
      expect(section?.pinnedTopics.map(topic=>topic.id))
        .toEqual([topics[2]!.topicId,topics[1]!.topicId]);
      expect((await repository.readSection(sectionId))?.topics.find(topic=>topic.id===topics[0]!.topicId)?.postCount).toBe(1);
      await service.setTopicVisibility(topicCommand(topics[7]!,"moderator1",false,1,"Restore ranked topic"));
      await service.setPostVisibility({
        topicId:topics[0]!.topicId,postId:latePostId,actorId:"moderator1",hidden:false,
        expectedVisibilityVersion:1,expectedRevisionId:lateRevisionId,reason:"Restore late activity",
      });
      const restored=(await repository.readCategory(categoryId,2))?.sections[0];
      expect(restored).toMatchObject({topicCount:8,postCount:9});
      expect(restored?.latestTopics[0]?.id).toBe(topics[0]!.topicId);
      expect(restored?.pinnedTopics.map(topic=>topic.id))
        .toEqual([topics[7]!.topicId,topics[2]!.topicId]);
    } finally {
      await client.query("update forum_posts set created_at=$1 where id=$2",
        [originalLateDate.created_at,latePostId]);
    }
  });

  it("counts only visible non-root Help replies when both root and intermediate parent are hidden", async () => {
    const f=await fixture("F4 root source","F4 root chronology",HELP_SOLUTIONS_SERVICE_SECTION_ID);
    const middleId=randomUUID(),middleRevisionId=randomUUID();
    const childId=randomUUID(),childRevisionId=randomUUID();
    await repository.createPost({
      id:middleId,topicId:f.topicId,authorId:"ordinary",parentPostId:f.postId,
      bodyRevision:{id:middleRevisionId,originalContent:"F4 hidden middle source",sourceLocale:"en"},
    });
    await repository.createPost({
      id:childId,topicId:f.topicId,authorId:"author",parentPostId:middleId,
      bodyRevision:{id:childRevisionId,originalContent:"F4 visible descendant",sourceLocale:"en"},
    });
    await service.setPostVisibility(postCommand(f));
    await service.setPostVisibility({
      topicId:f.topicId,postId:middleId,actorId:"moderator1",hidden:true,
      expectedVisibilityVersion:0,expectedRevisionId:middleRevisionId,reason:"Hide middle reply",
    });
    const has=async()=>(await repository.readHelpSolutionsAll({answers:"has"}))?.questions.find(topic=>topic.id===f.topicId);
    const none=async()=>(await repository.readHelpSolutionsAll({answers:"none"}))?.questions.find(topic=>topic.id===f.topicId);
    expect(await has()).toMatchObject({replyCount:1});
    expect(await none()).toBeUndefined();
    expect((await repository.readUnanswered()).map(topic=>topic.id)).not.toContain(f.topicId);
    const thread=await repository.readTopicPage(f.topicId);
    expect(thread?.posts.map(post=>post.id)).toEqual([f.postId,middleId,childId]);
    expect(thread?.posts.slice(0,2).map(post=>post.kind)).toEqual(["hidden","hidden"]);
    expect(thread?.posts[2]).toMatchObject({parentPostId:middleId,body:{originalContent:"F4 visible descendant"}});
    expect(JSON.stringify(thread)).not.toContain("F4 hidden middle source");

    await service.setPostVisibility({
      topicId:f.topicId,postId:childId,actorId:"moderator1",hidden:true,
      expectedVisibilityVersion:0,expectedRevisionId:childRevisionId,reason:"Hide final visible reply",
    });
    expect(await has()).toBeUndefined();
    expect(await none()).toMatchObject({replyCount:0});
    expect((await repository.readUnanswered()).map(topic=>topic.id)).toContain(f.topicId);
    await service.setPostVisibility({
      topicId:f.topicId,postId:middleId,actorId:"moderator1",hidden:false,
      expectedVisibilityVersion:1,expectedRevisionId:middleRevisionId,reason:"Restore middle reply",
    });
    expect(await has()).toMatchObject({replyCount:1});
    expect(await none()).toBeUndefined();
  });
});
