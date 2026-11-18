import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError } from "../../db/account-state";
import { DrizzleForumRepository, ForumAuthorizationError, ForumStateConflictError } from "../../db/forum-repository";
import { ForumService, InvalidForumContentError } from "../../db/forum-service";
import { DrizzleContentTranslationStore, DrizzleContentTranslationBatchReader } from "../../db/content-translation-store";
import { ContentTranslationPresentationService } from "../../app/localization/content-translation-presentation";
import { UserMeasureRestrictedError, withOwnerUserMeasureAdmission } from "../../db/user-measure-policy";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname) || !new URL(url).pathname.endsWith("_test"))
  throw new Error("Disposable loopback *_test PostgreSQL is required");
const schema = "topic_title_edit_test";
const options = "-c search_path=" + schema;
const client = new Client({ connectionString: url, options });
const pool = new Pool({ connectionString: url, options, max: 4, application_name: "own-title-writer" });
const policy = { cooldownMs: 0, now: () => new Date() };
const repository = new DrizzleForumRepository(drizzle(pool), policy);
const forum = new ForumService(repository);
const uuid = () => crypto.randomUUID();

async function seed() {
  const actorId = uuid(), topicId = uuid(), postId = uuid(), revisionId = uuid();
  await client.query('insert into "user"(id,name,email) values($1,$1,$2)', [actorId, actorId + "@test.invalid"]);
  await repository.createTopicWithInitialPost({
    id: topicId, sectionId: "title-section", authorId: actorId,
    titleRevision: { id: revisionId, originalContent: "Original title", sourceLocale: "en" },
    initialPost: { id: postId, topicId, authorId: actorId,
      bodyRevision: { id: uuid(), originalContent: "Untouched first post", sourceLocale: "en" } },
  });
  return { topicId, actorId, postId, expectedRevisionId: revisionId, title: "New title שלום <script>" };
}
async function facts(topicId: string) {
  const query = await client.query(`select
    (select to_jsonb(t) from forum_topics t where id=$1) as topic,
    (select jsonb_agg(to_jsonb(r) order by id) from forum_topic_title_revisions r where topic_id=$1) as titles,
    (select jsonb_agg(to_jsonb(p) order by id) from forum_posts p where topic_id=$1) as posts,
    (select jsonb_agg(to_jsonb(r) order by id) from forum_post_revisions r where post_id in
      (select id from forum_posts where topic_id=$1)) as bodies`, [topicId]);
  return query.rows[0];
}

beforeAll(async () => {
  await client.connect();
  await client.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const file of (await readdir("drizzle")).filter(name => /^\d{4}_.+\.sql$/u.test(name)).sort())
    await client.query((await readFile("drizzle/" + file, "utf8")).replaceAll('"public".', '"' + schema + '".'));
  await client.query('insert into "user"(id,name,email) values(\'other\',\'Other\',\'title-other@test.invalid\')');
  await repository.createCategory({ id: "title-category", name: "Title" });
  await repository.createSection({ id: "title-section", categoryId: "title-category", name: "Title" });
});
afterAll(async () => {
  await pool.end();
  await client.query("drop schema if exists " + schema + " cascade");
  await client.end();
});

describe("own topic title transaction", () => {
  it("creates immutable revisions, preserves unrelated state, and has no edit cooldown", async () => {
    const input = await seed();
    await client.query('update forum_topics set is_closed=true,closure_version=1,is_solved=true where id=$1', [input.topicId]);
    const before = await facts(input.topicId);
    const noOp = await forum.editOwnTopicTitle({ ...input, title: " Original title " });
    expect(noOp).toEqual({ id: input.expectedRevisionId, originalContent: "Original title", sourceLocale: "en" });
    expect(await facts(input.topicId)).toEqual(before);
    const changed = await forum.editOwnTopicTitle({ ...input, title: " " + input.title + " " });
    expect(changed).toMatchObject({ originalContent: input.title, sourceLocale: "und" });
    expect(changed.id).not.toBe(input.expectedRevisionId);
    const after = await facts(input.topicId);
    expect(after.titles).toHaveLength(2);
    expect(after.titles.find((r: { id: string }) => r.id === input.expectedRevisionId)).toEqual(before.titles[0]);
    expect(after.posts).toEqual(before.posts);
    expect(after.bodies).toEqual(before.bodies);
    expect(after.topic).toEqual({ ...before.topic, current_title_revision_id: changed.id });
    await expect(forum.editOwnTopicTitle({ ...input, expectedRevisionId: changed.id, title: "Immediate second edit" }))
      .resolves.toMatchObject({ originalContent: "Immediate second edit" });
    await expect(forum.editOwnTopicTitle(input)).rejects.toBeInstanceOf(ForumStateConflictError);
    expect((await facts(input.topicId)).titles).toHaveLength(3);
  });

  it("denies nonauthor, invalid input, inactive actors and unchanged-title bypasses without writing", async () => {
    const input = await seed(), before = await facts(input.topicId);
    await expect(forum.editOwnTopicTitle({ ...input, actorId: "other" })).rejects.toBeInstanceOf(ForumAuthorizationError);
    for (const title of ["   ", "NUL\u0000title"])
      expect(() => forum.editOwnTopicTitle({ ...input, title })).toThrow(InvalidForumContentError);
    await client.query('update "user" set deactivated_at=now(),deactivated_by_user_id=\'other\',retain_at_least_until=now()+interval \'2 years\' where id=$1', [input.actorId]);
    for (const title of [input.title, "Original title"])
      await expect(forum.editOwnTopicTitle({ ...input, title })).rejects.toBeInstanceOf(AccountInactiveError);
    expect(await facts(input.topicId)).toEqual(before);
  });

  it("enforces actual posts.edit measures, retaining Owner immunity and ownership", async () => {
    const input = await seed(), id = uuid(), before = await facts(input.topicId);
    await client.query(`insert into user_measures(id,target_user_id,issuer_user_id,issuer_authority_floor,create_fingerprint,initial_reason)
      values($1,$2,'other',1,$3,'Title edit restriction')`, [id, input.actorId, "a".repeat(64)]);
    await client.query("insert into user_measure_restrictions(measure_id,restriction_key) values($1,'posts.edit')", [id]);
    for (const title of [input.title, "Original title"])
      await expect(forum.editOwnTopicTitle({ ...input, title })).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect(await facts(input.topicId)).toEqual(before);
    const owner = new ForumService(new DrizzleForumRepository(drizzle(pool), policy, withOwnerUserMeasureAdmission(input.actorId)));
    await expect(owner.editOwnTopicTitle(input)).resolves.toMatchObject({ originalContent: input.title });
    await expect(owner.editOwnTopicTitle({ ...await seed(), actorId: input.actorId })).rejects.toBeInstanceOf(ForumAuthorizationError);
  });

  it("serializes two competing edits from the same revision without an orphan revision", async () => {
    const input = await seed();
    const results = await Promise.allSettled([
      forum.editOwnTopicTitle(input), forum.editOwnTopicTitle({ ...input, title: "Other edit" }),
    ]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find(r => r.status === "rejected")).toMatchObject({ reason: expect.any(ForumStateConflictError) });
    expect((await facts(input.topicId)).titles).toHaveLength(2);
  });

  it("refuses late deactivation after acquiring the topic lock, with no revision side effects", async () => {
    const input = await seed(), before = await facts(input.topicId);
    await client.query("begin");
    await client.query('update "user" set deactivated_at=now(),deactivated_by_user_id=\'other\',retain_at_least_until=now()+interval \'2 years\' where id=$1', [input.actorId]);
    const pending = forum.editOwnTopicTitle(input);
    // Attach the rejection handler before releasing the real PostgreSQL row lock.
    const rejected = expect(pending).rejects.toBeInstanceOf(AccountInactiveError);
    try {
      let blocked = false;
      for (let attempt = 0; attempt < 500; attempt++) {
        await client.query("select pg_stat_clear_snapshot()");
        const result = await client.query("select 1 from pg_stat_activity where application_name='own-title-writer' and wait_event_type='Lock' and query ilike '%from \"user\"%'");
        if (result.rowCount) { blocked = true; break; }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(blocked).toBe(true);
      await client.query("commit");
      await rejected;
      expect(await facts(input.topicId)).toEqual(before);
    } finally {
      await client.query("rollback");
      await rejected;
    }
  });

  it("conflicts with concurrent source-locale correction on the same immutable baseline", async () => {
    const input = await seed();
    const results = await Promise.allSettled([
      forum.editOwnTopicTitle(input),
      forum.correctTopicTitleSourceLocale({ ...input, sourceLocale: "ru", scope: "own" }),
    ]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find(r => r.status === "rejected")).toMatchObject({ reason: expect.any(ForumStateConflictError) });
    expect((await facts(input.topicId)).titles).toHaveLength(2);
  });

  it("retains old translations and presents the new original after an edit", async () => {
    const input = await seed();
    const store = new DrizzleContentTranslationStore(drizzle(pool));
    const identity = { contentType: "topic-title" as const, contentId: input.topicId, revisionId: input.expectedRevisionId, targetLocale: "he" };
    await store.write({ ...identity, sourceLocale: "en", translatedContent: "כותרת קודמת", provenance: { origin: "persistent_manual" } });
    const changed = await forum.editOwnTopicTitle(input);
    const presentation = new ContentTranslationPresentationService(new DrizzleContentTranslationBatchReader(drizzle(pool)));
    expect(await presentation.readCurrent([{ contentType: "topic-title", contentId: input.topicId,
      revisionId: changed.id, originalContent: changed.originalContent, sourceLocale: changed.sourceLocale }], "he", "rtl", () => "rtl"))
      .toMatchObject([{ selected: "original", content: input.title, revisionId: changed.id }]);
    expect(await store.read(identity)).toMatchObject({ translatedContent: "כותרת קודמת" });
  });
});
