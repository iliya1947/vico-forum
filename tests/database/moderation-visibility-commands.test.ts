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
