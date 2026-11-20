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
async function fixture() {
  const topicId = randomUUID(), postId = randomUUID(), titleRevisionId = randomUUID(), bodyRevisionId = randomUUID();
  await repository.createTopicWithInitialPost({
    id: topicId, sectionId: "visibility-section", authorId: "author",
    titleRevision: { id: titleRevisionId, originalContent: "PRIVATE TOPIC", sourceLocale: "en" },
    initialPost: {
      id: postId, topicId, authorId: "author",
      bodyRevision: { id: bodyRevisionId, originalContent: "PRIVATE POST", sourceLocale: "en" },
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
});
