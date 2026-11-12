import { readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { historicalForumMeasureAdmission } from "./historical-forum-measure-admission";
import { DrizzleForumRepository, ForumEntityNotFoundError } from "../../db/forum-repository";
import { HELP_SOLUTIONS_SERVICE_SECTION_ID } from "../../db/forum-identifiers";
import { InvalidProfileError } from "../../app/forum/profile";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const url = new URL(databaseUrl);
if (!["127.0.0.1", "localhost"].includes(url.hostname) || !url.pathname.endsWith("_test")) throw new Error("Disposable local test database required");
const schema = "forum_profiles_test";
const client = new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
const repository = new DrizzleForumRepository(drizzle(client), { cooldownMs: 0, now: () => new Date() }, historicalForumMeasureAdmission);
const migrations = ["0000_tan_johnny_storm", "0001_seed-locales", "0002_ui_translation_storage", "0003_gorgeous_donald_blake", "0004_forum_domain_foundation", "0005_calm_proemial_gods", "0006_loving_sentinels", "0021_forum_tags", "0022_forum_reply_relationships", "0023_forum_topic_read_states", "0024_forum_reply_notifications", "0025_forum_topic_pins", "0026_best_answer_independent_from_solved", "0027_help_solutions_foundation", "0028_help_solution_moderation", "0029_help_question_needs_details", "0030_help_duplicate_workflow", "0031_help_user_moderation_signals", "0032_forum_profiles", "0033_forum_online_presence", "0034_forum_editor_drafts", "0035_forum_attachments_foundation", "0036_forum_attachment_security_events", "0037_forum_attachment_draft_generations", "0038_forum_attachment_cleanup_claims", "0040_post_edit_history_permissions", "0041_published_mentions", "0042_attachment_edit_snapshots", "0065_sa04_account_state_foundation"];
beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const tag of migrations) await client.query((await readFile(`drizzle/${tag}.sql`, "utf8")).replaceAll('"public".', `"${schema}".`));
  // Historical fixtures use current Drizzle topic writes while selecting old migration subsets.
  // Supply only AP-08 columns here without changing the historical migration sequence.
  await client.query("alter table forum_topics add column is_closed boolean not null default false, add column closure_version integer not null default 0");
  for (const id of ["profile-owner", "profile-helper", "profile-newcomer"]) {
    await client.query(`insert into "user" (id,name,email,image) values ($1,$1,$2,$3)`, [id, `${id}@private.test`, "https://example.com/avatar.png"]);
  }
  await repository.createCategory({ id: "profile-category", name: "Profiles" });
  await repository.createSection({ id: "profile-section", categoryId: "profile-category", name: "General" });
});
afterAll(async () => { await client.query(`drop schema if exists ${schema} cascade`); await client.end(); });
async function topic(id: string, sectionId = "profile-section") {
  await repository.createTopicWithInitialPost({ id, sectionId, tags: [{ key: "profile-tag-a", name: "profile-tag-a" }, { key: "profile-tag-b", name: "profile-tag-b" }], authorId: "profile-owner", titleRevision: { id: `${id}-title`, originalContent: "Question", sourceLocale: "en" }, initialPost: { id: `${id}-initial`, topicId: id, authorId: "profile-owner", bodyRevision: { id: `${id}-body`, originalContent: "Question body", sourceLocale: "en" } } });
}
async function reply(id: string, topicId: string, authorId: string) {
  await repository.createPost({ id, topicId, authorId, bodyRevision: { id: `${id}-body`, originalContent: "Answer", sourceLocale: "en" } });
}
describe("mention candidate lookup", () => {
  it("matches bounded case-insensitive member names, escapes wildcard input, and excludes private fields", async () => {
    await client.query('insert into "user" (id,name,email) values ($1,$2,$3)', [
      "mention-lovelace", "Ada Lovelace", "hidden-adal@example.test",
    ]);
    await client.query('insert into "user" (id,name,email) values ($1,$2,$3)', [
      "mention-wildcard", "A_100%", "hidden-wildcard@example.test",
    ]);
    const nameMatches = await repository.searchMentionableUsers("LOVEL");
    expect(nameMatches).toEqual([{ id: "mention-lovelace", name: "Ada Lovelace" }]);
    expect(await repository.searchMentionableUsers("_100%")).toEqual([
      { id: "mention-wildcard", name: "A_100%" },
    ]);
    expect(await repository.searchMentionableUsers("hidden-adal")).toEqual([]);
    expect(await repository.searchMentionableUsers("")).toEqual([]);
    expect(await repository.searchMentionableUsers("x".repeat(65))).toEqual([]);
  });
});

describe("persisted forum profiles", () => {
  it("reads existing users without a profile row and exposes no private identity fields", async () => {
    const profile = await repository.readProfile("profile-newcomer");
    expect(profile).toMatchObject({ id: "profile-newcomer", bio: "", githubUrl: null, websiteUrl: null, messageCount: 0, bestAnswerCount: 0, role: { slug: "user", isSystem: true }, image: "https://example.com/avatar.png" });
    expect(profile?.joinedAt).toBeInstanceOf(Date);
    expect(profile).not.toHaveProperty("email");
    expect(await repository.readProfile("missing")).toBeUndefined();
  });
  it("reads active profile unchanged then removes raw identity at the canonical repository boundary", async () => {
    await client.query("begin");
    try {
      const id = "profile-newcomer";
      const before = await repository.readProfile(id);
      expect(before).toBeDefined();
      await client.query('update "user" set name=$2, image=$3 where id=$1', [
        id, "SECRET_PROFILE_REAL_NAME", "https://images.example.test/SECRET_PROFILE_AVATAR.png",
      ]);
      await client.query(
        "insert into forum_profiles (user_id,bio,github_url,website_url)" +
          " values ($1,$2,$3,$4) on conflict (user_id) do update" +
          " set bio=excluded.bio, github_url=excluded.github_url, website_url=excluded.website_url",
        [id, "SECRET_PROFILE_BIO", "https://github.com/private-user",
          "https://website.example.test/SECRET_PROFILE_LINK"],
      );
      const active = await repository.readProfile(id);
      expect(active).toMatchObject({
        id, name: "SECRET_PROFILE_REAL_NAME",
        image: "https://images.example.test/SECRET_PROFILE_AVATAR.png",
        bio: "SECRET_PROFILE_BIO", githubUrl: "https://github.com/private-user",
        websiteUrl: "https://website.example.test/SECRET_PROFILE_LINK",
      });
      expect(active).not.toHaveProperty("identityKind");
      await client.query(
        'update "user" set deactivated_at=$2::timestamptz,' +
          ' deactivated_by_user_id=$3, retain_at_least_until=$4::timestamptz where id=$1',
        [id, "2024-02-29T12:34:56Z", "SECRET_DEACTIVATION_ACTOR", "2025-02-28T12:34:56Z"],
      );
      const deleted = await repository.readProfile(id);
      expect(deleted).toMatchObject({
        id, name: "Deleted user", image: null, bio: "", githubUrl: null, websiteUrl: null,
        identityKind: "deleted", role: active!.role, joinedAt: active!.joinedAt,
        messageCount: active!.messageCount, bestAnswerCount: active!.bestAnswerCount,
      });
      const serialized = JSON.stringify(deleted);
      for (const secret of [
        "SECRET_PROFILE_REAL_NAME", "SECRET_PROFILE_AVATAR", "SECRET_PROFILE_BIO",
        "private-user", "SECRET_PROFILE_LINK", "SECRET_DEACTIVATION_ACTOR",
        "profile-newcomer@private.test", "2024-02-29", "2025-02-28",
      ]) expect(serialized).not.toContain(secret);
      expect(Object.keys(deleted!).sort()).toEqual([
        "id", "name", "image", "bio", "githubUrl", "websiteUrl",
        "joinedAt", "role", "messageCount", "bestAnswerCount", "identityKind",
      ].sort());
    } finally {
      await client.query("rollback");
    }
    expect(await repository.readProfile("missing")).toBeUndefined();
  });

  it("upserts owner fields, clears optional values and rejects invalid data", async () => {
    await repository.updateProfile("profile-helper", { bio: "שלום 🙂", githubUrl: "https://github.com/octocat", websiteUrl: "https://example.com" });
    expect(await repository.readProfile("profile-helper")).toMatchObject({ bio: "שלום 🙂", githubUrl: "https://github.com/octocat", websiteUrl: "https://example.com/" });
    await repository.updateProfile("profile-helper", { bio: "", githubUrl: null, websiteUrl: null });
    expect(await repository.readProfile("profile-helper")).toMatchObject({ bio: "", githubUrl: null, websiteUrl: null });
    await expect(repository.updateProfile("missing", { bio: "", githubUrl: null, websiteUrl: null })).rejects.toBeInstanceOf(ForumEntityNotFoundError);
    await expect(repository.updateProfile("profile-helper", { bio: "x".repeat(501), githubUrl: null, websiteUrl: null })).rejects.toBeInstanceOf(InvalidProfileError);
    await expect(client.query(`update forum_profiles set github_url = 'javascript:alert(1)' where user_id = 'profile-helper'`)).rejects.toMatchObject({ code: "23514" });
  });
  it("counts initial posts and replies, selected answers independently from solved, and replacement", async () => {
    await topic("profile-topic-a"); await topic("profile-topic-b");
    await reply("profile-answer-a", "profile-topic-a", "profile-helper");
    await reply("profile-answer-b", "profile-topic-b", "profile-helper");
    await reply("profile-replacement", "profile-topic-a", "profile-newcomer");
    await repository.selectBestAnswer("profile-topic-a", "profile-answer-a", "profile-owner", "own");
    await repository.selectBestAnswer("profile-topic-b", "profile-answer-b", "profile-owner", "own");
    expect(await repository.readProfile("profile-owner")).toMatchObject({ messageCount: 2, bestAnswerCount: 0 });
    expect(await repository.readProfile("profile-helper")).toMatchObject({ messageCount: 2, bestAnswerCount: 2 });
    await repository.selectBestAnswer("profile-topic-a", "profile-replacement", "profile-owner", "own");
    expect(await repository.readProfile("profile-helper")).toMatchObject({ messageCount: 2, bestAnswerCount: 1 });
    expect(await repository.readProfile("profile-newcomer")).toMatchObject({ messageCount: 1, bestAnswerCount: 1 });
    expect((await repository.readTopicPage("profile-topic-a"))?.posts[0].authorImage).toBe("https://example.com/avatar.png");
  });
  it("counts Help messages and selected unsolved answers without tag multiplication", async () => {
    const before = await repository.readProfile("profile-helper");
    await topic("profile-help", HELP_SOLUTIONS_SERVICE_SECTION_ID);
    await reply("profile-help-answer", "profile-help", "profile-helper");
    await repository.selectBestAnswer("profile-help", "profile-help-answer", "profile-owner", "own");
    expect(await repository.readProfile("profile-helper")).toMatchObject({ messageCount: before!.messageCount + 1, bestAnswerCount: before!.bestAnswerCount + 1 });
    expect((await repository.readTopicPage("profile-help"))?.isSolved).toBe(false);
  });
  it("cascades optional profile deletion with a user that has no forum content", async () => {
    await client.query(`insert into "user" (id,name,email) values ('profile-unused','Unused','unused@private.test')`);
    await repository.updateProfile("profile-unused", { bio: "🙂".repeat(500), githubUrl: null, websiteUrl: null });
    await client.query(`delete from "user" where id = 'profile-unused'`);
    expect((await client.query(`select user_id from forum_profiles where user_id = 'profile-unused'`)).rowCount).toBe(0);
  });
  it("projects fresh custom role assignment without leaking permission grants", async () => {
    await client.query(`insert into authz_roles (id,slug,display_name,is_system) values ('profile-expert','profile-expert','Expert',false)`);
    await client.query(`insert into authz_user_roles (user_id,role_id) values ('profile-helper','profile-expert')`);
    expect((await repository.readProfile("profile-helper"))?.role).toEqual({ slug: "profile-expert", displayName: "Expert", isSystem: false });
    await client.query(`update authz_roles set display_name = 'Community expert' where id = 'profile-expert'`);
    expect((await repository.readProfile("profile-helper"))?.role.displayName).toBe("Community expert");
  });
});

describe("SA04-C1 canonical topic-page public author projection", () => {
  it("keeps published content and active authors while removing inactive names, images and lifecycle secrets", async () => {
    await topic("profile-c1-topic");
    await reply("profile-c1-helper", "profile-c1-topic", "profile-helper");
    await reply("profile-c1-active", "profile-c1-topic", "profile-newcomer");
    await client.query("begin");
    try {
      await client.query('update "user" set name=$2, image=$3 where id=$1', [
        "profile-owner", "SECRET_C1_TOPIC_AUTHOR", "https://images.example.test/SECRET_C1_TOPIC_AVATAR.png",
      ]);
      await client.query('update "user" set name=$2, image=$3 where id=$1', [
        "profile-helper", "SECRET_C1_REPLY_AUTHOR", "https://images.example.test/SECRET_C1_REPLY_AVATAR.png",
      ]);
      const active = (await repository.readTopicPage("profile-c1-topic"))!;
      expect(active).toMatchObject({
        id: "profile-c1-topic", authorId: "profile-owner", authorName: "SECRET_C1_TOPIC_AUTHOR",
        posts: [
          { authorId: "profile-owner", authorName: "SECRET_C1_TOPIC_AUTHOR", authorImage: "https://images.example.test/SECRET_C1_TOPIC_AVATAR.png" },
          { authorId: "profile-helper", authorName: "SECRET_C1_REPLY_AUTHOR", authorImage: "https://images.example.test/SECRET_C1_REPLY_AVATAR.png" },
          { authorId: "profile-newcomer", authorName: "profile-newcomer" },
        ],
      });
      expect(active).not.toHaveProperty("authorIdentityKind");
      expect(active.posts[0]).not.toHaveProperty("authorIdentityKind");

      await client.query(
        'update "user" set deactivated_at=$2::timestamptz, deactivated_by_user_id=$3,' +
          ' retain_at_least_until=$4::timestamptz where id=$1',
        ["profile-owner", "2024-02-29T12:34:56Z", "SECRET_C1_OWNER_DEACTIVATOR", "2025-02-28T12:34:56Z"],
      );
      const mixed = (await repository.readTopicPage("profile-c1-topic"))!;
      expect(mixed).toMatchObject({
        authorId: "profile-owner", authorName: "Deleted user", authorIdentityKind: "deleted",
        posts: [
          { authorId: "profile-owner", authorName: "Deleted user", authorImage: null, authorIdentityKind: "deleted" },
          { authorId: "profile-helper", authorName: "SECRET_C1_REPLY_AUTHOR", authorImage: "https://images.example.test/SECRET_C1_REPLY_AVATAR.png" },
          { authorId: "profile-newcomer", authorName: "profile-newcomer" },
        ],
      });
      await client.query(
        'update "user" set deactivated_at=$2::timestamptz, deactivated_by_user_id=$3,' +
          ' retain_at_least_until=$4::timestamptz where id=$1',
        ["profile-helper", "2024-02-29T12:34:56Z", "SECRET_C1_REPLY_DEACTIVATOR", "2025-02-28T12:34:56Z"],
      );
      const result = (await repository.readTopicPage("profile-c1-topic"))!;
      expect(result).toMatchObject({
        authorId: "profile-owner", authorName: "Deleted user", authorIdentityKind: "deleted",
        title: active.title, section: active.section, tags: active.tags,
        posts: [
          { id: "profile-c1-topic-initial", authorId: "profile-owner", authorName: "Deleted user", authorImage: null, authorIdentityKind: "deleted", body: { originalContent: "Question body" } },
          { id: "profile-c1-helper", authorId: "profile-helper", authorName: "Deleted user", authorImage: null, authorIdentityKind: "deleted", body: { originalContent: "Answer" } },
          { id: "profile-c1-active", authorId: "profile-newcomer", authorName: "profile-newcomer", authorImage: "https://example.com/avatar.png", body: { originalContent: "Answer" } },
        ],
      });
      expect(result.posts[2]).not.toHaveProperty("authorIdentityKind");
      expect(result.posts.map(({ id, topicId, parentPostId, createdAt, attachments }) =>
        ({ id, topicId, parentPostId, createdAt, attachments }))).toEqual(active.posts.map(
          ({ id, topicId, parentPostId, createdAt, attachments }) =>
            ({ id, topicId, parentPostId, createdAt, attachments }),
        ));
      const serialized = JSON.stringify(result);
      for (const secret of [
        "SECRET_C1_TOPIC_AUTHOR", "SECRET_C1_TOPIC_AVATAR",
        "SECRET_C1_REPLY_AUTHOR", "SECRET_C1_REPLY_AVATAR",
        "SECRET_C1_OWNER_DEACTIVATOR", "SECRET_C1_REPLY_DEACTIVATOR",
        "2024-02-29", "2025-02-28",
      ]) expect(serialized).not.toContain(secret);
      expect(Object.keys(result.posts[0]!)).not.toContain("authorDeactivatedAt");
      expect(Object.keys(result)).not.toContain("authorRetainAtLeastUntil");
    } finally {
      await client.query("rollback");
    }
  });
});

describe("SA04-C2 canonical category and section topic-list authors", () => {
  it("neutralizes mixed authors in both ranked category lists and the section without changing selection or counts", async () => {
    const categoryId = "profile-c2-category";
    const sectionId = "profile-c2-section";
    await repository.createCategory({ id: categoryId, name: "C2 category" });
    await repository.createSection({ id: sectionId, categoryId, name: "C2 section" });
    for (const [suffix, authorId] of [
      ["owner", "profile-owner"], ["helper", "profile-helper"], ["active", "profile-newcomer"],
    ] as const) {
      const id = `profile-c2-${suffix}`;
      await repository.createTopicWithInitialPost({
        id, sectionId, authorId,
        titleRevision: { id: `${id}-title`, originalContent: `Published ${suffix}`, sourceLocale: "en" },
        initialPost: { id: `${id}-post`, topicId: id, authorId,
          bodyRevision: { id: `${id}-body`, originalContent: `Body ${suffix}`, sourceLocale: "en" } },
        tags: suffix === "owner" ? [{ key: "c2-tag", name: "C2 tag" }] : [],
      });
    }
    await client.query(`
      update forum_topics set created_at = case id
        when 'profile-c2-owner' then '2026-10-01T00:00:00Z'::timestamptz
        when 'profile-c2-helper' then '2026-10-02T00:00:00Z'::timestamptz
        else '2026-10-03T00:00:00Z'::timestamptz end
      where section_id = 'profile-c2-section'
    `);
    await client.query(`
      update forum_posts set created_at = (select created_at from forum_topics where forum_topics.id = forum_posts.topic_id)
      where topic_id in ('profile-c2-owner', 'profile-c2-helper', 'profile-c2-active')
    `);
    await client.query(`
      insert into forum_topic_pins (topic_id,pinned_by_user_id,pinned_at) values
        ('profile-c2-owner','profile-newcomer','2026-10-05T00:00:00Z'),
        ('profile-c2-helper','profile-newcomer','2026-10-06T00:00:00Z')
    `);
    await client.query("begin");
    try {
      await client.query('update "user" set name=$2, image=$3 where id=$1', [
        "profile-owner", "SECRET_C2_OWNER_NAME", "https://images.example.test/SECRET_C2_OWNER_IMAGE.png",
      ]);
      await client.query('update "user" set name=$2, image=$3 where id=$1', [
        "profile-helper", "SECRET_C2_HELPER_NAME", "https://images.example.test/SECRET_C2_HELPER_IMAGE.png",
      ]);
      const originalCategory = (await repository.readCategory(categoryId, 2))!;
      const originalSection = (await repository.readSection(sectionId))!;
      expect(originalCategory.sections).toHaveLength(1);
      const originalLists = originalCategory.sections[0]!;
      expect(originalLists.topicCount).toBe(3);
      expect(originalLists.postCount).toBe(3);
      expect(originalLists.latestTopics.map((topic) => topic.id)).toEqual([
        "profile-c2-active", "profile-c2-helper", "profile-c2-owner",
      ]);
      expect(originalLists.pinnedTopics.map((topic) => topic.id)).toEqual(["profile-c2-helper", "profile-c2-owner"]);
      expect(originalSection.topics.map((topic) => topic.id)).toEqual([
        "profile-c2-owner", "profile-c2-helper", "profile-c2-active",
      ]);
      expect(originalLists.latestTopics.map((topic) => topic.authorName)).toEqual([
        "profile-newcomer", "SECRET_C2_HELPER_NAME", "SECRET_C2_OWNER_NAME",
      ]);
      expect(originalLists.pinnedTopics.map((topic) => topic.authorName)).toEqual([
        "SECRET_C2_HELPER_NAME", "SECRET_C2_OWNER_NAME",
      ]);
      expect(originalSection.topics[0]!.tags).toEqual([{ key: "c2-tag", name: "C2 tag" }]);
      await client.query(
        'update "user" set deactivated_at=$2::timestamptz, deactivated_by_user_id=$3,' +
          ' retain_at_least_until=$4::timestamptz where id=$1',
        ["profile-owner", "2024-02-29T12:34:56Z", "SECRET_C2_OWNER_DEACTIVATOR", "2025-02-28T12:34:56Z"],
      );
      await client.query(
        'update "user" set deactivated_at=$2::timestamptz, deactivated_by_user_id=$3,' +
          ' retain_at_least_until=$4::timestamptz where id=$1',
        ["profile-helper", "2024-02-29T12:34:56Z", "SECRET_C2_HELPER_DEACTIVATOR", "2025-02-28T12:34:56Z"],
      );
      const category = (await repository.readCategory(categoryId, 2))!;
      const section = (await repository.readSection(sectionId))!;
      const lists = category.sections[0]!;
      expect(lists.latestTopics).toMatchObject([
        { id: "profile-c2-active", authorName: "profile-newcomer" },
        { id: "profile-c2-helper", authorName: "Deleted user", authorIdentityKind: "deleted" },
        { id: "profile-c2-owner", authorName: "Deleted user", authorIdentityKind: "deleted" },
      ]);
      expect(lists.pinnedTopics).toMatchObject([
        { id: "profile-c2-helper", authorName: "Deleted user", authorIdentityKind: "deleted" },
        { id: "profile-c2-owner", authorName: "Deleted user", authorIdentityKind: "deleted" },
      ]);
      expect(section.topics).toMatchObject([
        { id: "profile-c2-owner", authorName: "Deleted user", authorIdentityKind: "deleted", isPinned: true },
        { id: "profile-c2-helper", authorName: "Deleted user", authorIdentityKind: "deleted", isPinned: true },
        { id: "profile-c2-active", authorName: "profile-newcomer", isPinned: false },
      ]);
      expect(section.topics[2]).not.toHaveProperty("authorIdentityKind");
      expect(lists.latestTopics[0]).not.toHaveProperty("authorIdentityKind");
      const categoryFields = (items: typeof lists.latestTopics) =>
        items.map(({ id, title, activityAt }) => ({ id, title, activityAt }));
      expect(categoryFields(lists.latestTopics)).toEqual(categoryFields(originalLists.latestTopics));
      expect(categoryFields(lists.pinnedTopics)).toEqual(categoryFields(originalLists.pinnedTopics));
      expect(lists.topicCount).toBe(originalLists.topicCount);
      expect(lists.postCount).toBe(originalLists.postCount);
      expect(section).toMatchObject({ id: originalSection.id, name: originalSection.name, category: originalSection.category });
      expect(section.topics.map(({ id, title, postCount, createdAt, isPinned, tags }) => ({
        id, title, postCount, createdAt, isPinned, tags,
      }))).toEqual(originalSection.topics.map(({ id, title, postCount, createdAt, isPinned, tags }) => ({
        id, title, postCount, createdAt, isPinned, tags,
      })));
      const serialized = JSON.stringify({ category, section });
      for (const marker of [
        "SECRET_C2_OWNER_NAME", "SECRET_C2_HELPER_NAME",
        "SECRET_C2_OWNER_IMAGE", "SECRET_C2_HELPER_IMAGE",
        "SECRET_C2_OWNER_DEACTIVATOR", "SECRET_C2_HELPER_DEACTIVATOR",
        "2024-02-29", "2025-02-28",
      ]) expect(serialized).not.toContain(marker);
      expect(Object.keys(lists.latestTopics[1]!)).toEqual(["id", "title", "authorName", "authorIdentityKind", "activityAt"]);
      expect(Object.keys(section.topics[0]!)).not.toContain("authorDeactivatedAt");
    } finally {
      await client.query("rollback");
    }
  });
});

describe("SA04-C3a Popular and Unanswered topic-author projections", () => {
  it("neutralizes inactive topic authors in each discovery reader without changing windows, ranks or eligibility", async () => {
    const entries = [
      { id: "profile-c3a-recent", authorId: "profile-owner", at: "2026-11-12T11:00:00Z" },
      { id: "profile-c3a-week", authorId: "profile-helper", at: "2026-11-10T11:00:00Z" },
      { id: "profile-c3a-active", authorId: "profile-newcomer", at: "2026-10-30T11:00:00Z" },
      { id: "profile-c3a-old", authorId: "profile-owner", at: "2026-09-01T11:00:00Z" },
    ] as const;
    for (const entry of entries) {
      await repository.createTopicWithInitialPost({
        id: entry.id, sectionId: "profile-section", authorId: entry.authorId,
        titleRevision: {
          id: `${entry.id}-title`,
          originalContent: `Public topic ${entry.id}`, sourceLocale: "en",
        },
        initialPost: {
          id: `${entry.id}-initial`, topicId: entry.id, authorId: entry.authorId,
          bodyRevision: {
            id: `${entry.id}-body`, originalContent: `Published body ${entry.id}`, sourceLocale: "en",
          },
        },
      });
      await client.query("update forum_topics set created_at=$2::timestamptz where id=$1", [entry.id, entry.at]);
      await client.query("update forum_posts set created_at=$2::timestamptz where topic_id=$1", [entry.id, entry.at]);
    }
    await reply("profile-c3a-recent-reply", "profile-c3a-recent", "profile-helper");
    await client.query("update forum_posts set created_at=$2::timestamptz where id=$1", [
      "profile-c3a-recent-reply", "2026-11-12T11:10:00Z",
    ]);
    const referenceTime = new Date("2026-11-12T12:00:00Z");
    const ownIds = new Set<string>(entries.map((entry) => entry.id));
    const onlyOwn = <T extends { id: string }>(items: T[]) => items.filter((item) => ownIds.has(item.id));
    const periods = ["24h", "7d", "30d"] as const;

    await client.query("begin");
    try {
      await client.query('update "user" set name=$2, image=$3 where id=$1', [
        "profile-owner", "SECRET_C3A_POPULAR_OWNER", "https://images.example.test/SECRET_C3A_OWNER_AVATAR.png",
      ]);
      await client.query('update "user" set name=$2, image=$3 where id=$1', [
        "profile-helper", "SECRET_C3A_UNANSWERED_HELPER", "https://images.example.test/SECRET_C3A_HELPER_AVATAR.png",
      ]);
      const activePopular = await repository.readPopular(referenceTime, 20);
      const activeUnanswered = await repository.readUnanswered();
      expect(onlyOwn(activePopular["24h"]).map((row) => row.id)).toEqual(["profile-c3a-recent"]);
      expect(onlyOwn(activePopular["7d"]).map((row) => row.id)).toEqual([
        "profile-c3a-recent", "profile-c3a-week",
      ]);
      expect(onlyOwn(activePopular["30d"]).map((row) => row.id)).toEqual([
        "profile-c3a-recent", "profile-c3a-week", "profile-c3a-active",
      ]);
      expect(onlyOwn(activePopular["24h"])[0]).toMatchObject({
        authorName: "SECRET_C3A_POPULAR_OWNER", activityCount: 2,
        latestActivityAt: new Date("2026-11-12T11:10:00Z"),
      });
      expect(onlyOwn(activeUnanswered).map((row) => row.id)).toEqual([
        "profile-c3a-week", "profile-c3a-active", "profile-c3a-old",
      ]);
      expect(onlyOwn(activeUnanswered)[0]).toMatchObject({
        authorName: "SECRET_C3A_UNANSWERED_HELPER", section: { id: "profile-section" },
        category: { id: "profile-category" },
      });

      for (const [id, actor] of [
        ["profile-owner", "SECRET_C3A_OWNER_DEACTIVATOR"],
        ["profile-helper", "SECRET_C3A_HELPER_DEACTIVATOR"],
      ] as const) {
        await client.query(
          'update "user" set deactivated_at=$2::timestamptz,' +
            ' deactivated_by_user_id=$3, retain_at_least_until=$4::timestamptz where id=$1',
          [id, "2024-02-29T12:34:56Z", actor, "2025-02-28T12:34:56Z"],
        );
      }

      const popular = await repository.readPopular(referenceTime, 20);
      const unanswered = await repository.readUnanswered();
      for (const period of periods) {
        const previous = activePopular[period];
        const current = popular[period];
        expect(current.map((row) => row.id)).toEqual(previous.map((row) => row.id));
        expect(current.map((row) => [row.id, row.title, row.activityCount, row.latestActivityAt]))
          .toEqual(previous.map((row) => [row.id, row.title, row.activityCount, row.latestActivityAt]));
      }
      const recent = onlyOwn(popular["24h"])[0]!;
      const week = onlyOwn(popular["7d"]).find((row) => row.id === "profile-c3a-week")!;
      const independent = onlyOwn(popular["30d"]).find((row) => row.id === "profile-c3a-active")!;
      expect(recent).toMatchObject({
        id: "profile-c3a-recent", authorName: "Deleted user", authorIdentityKind: "deleted",
        activityCount: 2, latestActivityAt: new Date("2026-11-12T11:10:00Z"),
      });
      expect(week).toMatchObject({
        id: "profile-c3a-week", authorName: "Deleted user", authorIdentityKind: "deleted",
      });
      expect(independent).toMatchObject({
        id: "profile-c3a-active", authorName: "profile-newcomer", activityCount: 1,
      });
      expect(independent).not.toHaveProperty("authorIdentityKind");
      expect(unanswered.map((row) => row.id)).toEqual(activeUnanswered.map((row) => row.id));
      expect(unanswered.map((row) => [
        row.id, row.title, row.sourceLocale, row.createdAt, row.section, row.category,
      ])).toEqual(activeUnanswered.map((row) => [
        row.id, row.title, row.sourceLocale, row.createdAt, row.section, row.category,
      ]));
      expect(onlyOwn(unanswered)).toMatchObject([
        { id: "profile-c3a-week", authorName: "Deleted user", authorIdentityKind: "deleted" },
        { id: "profile-c3a-active", authorName: "profile-newcomer" },
        { id: "profile-c3a-old", authorName: "Deleted user", authorIdentityKind: "deleted" },
      ]);
      expect(onlyOwn(unanswered)[1]).not.toHaveProperty("authorIdentityKind");
      const serialized = JSON.stringify({ popular, unanswered });
      for (const secret of [
        "SECRET_C3A_POPULAR_OWNER", "SECRET_C3A_UNANSWERED_HELPER",
        "SECRET_C3A_OWNER_AVATAR", "SECRET_C3A_HELPER_AVATAR",
        "SECRET_C3A_OWNER_DEACTIVATOR", "SECRET_C3A_HELPER_DEACTIVATOR",
        "2024-02-29", "2025-02-28",
      ]) expect(serialized).not.toContain(secret);
      expect(Object.keys(recent)).not.toContain("authorDeactivatedAt");
      expect(Object.keys(onlyOwn(unanswered)[1]!)).not.toContain("authorRetainAtLeastUntil");
    } finally {
      await client.query("rollback");
    }
  });
});

describe("SA04-C3b canonical Tag and Search author identities", () => {
  it("removes raw deleted identities while retaining tag membership and search match ranking", async () => {
    const entries = [
      { suffix: "title", authorId: "profile-owner", at: "2026-11-01T10:00:00Z",
        title: "QuartzNeedle public title", body: "Published title post", sourceLocale: "he" },
      { suffix: "tag", authorId: "profile-helper", at: "2026-11-02T10:00:00Z",
        title: "C3b tag discovery", body: "Published tag post", sourceLocale: "en" },
      { suffix: "body", authorId: "profile-newcomer", at: "2026-11-03T10:00:00Z",
        title: "C3b body discovery", body: "QuartzNeedle in the published body", sourceLocale: "en" },
      { suffix: "other", authorId: "profile-newcomer", at: "2026-11-04T10:00:00Z",
        title: "C3b other discovery", body: "Ordinary published content", sourceLocale: "en" },
    ] as const;
    for (const entry of entries) {
      const id = `profile-c3b-${entry.suffix}`;
      await repository.createTopicWithInitialPost({
        id, sectionId: "profile-section", authorId: entry.authorId,
        titleRevision: {
          id: `${id}-title`, originalContent: entry.title, sourceLocale: entry.sourceLocale,
        },
        initialPost: {
          id: `${id}-initial`, topicId: id, authorId: entry.authorId,
          bodyRevision: { id: `${id}-body`, originalContent: entry.body, sourceLocale: "en" },
        },
        tags: [
          { key: "c3b-shared", name: "C3b shared" },
          ...(entry.suffix === "tag" ? [{ key: "c3b-needle", name: "QuartzNeedle tag" }] : []),
        ],
      });
      await client.query("update forum_topics set created_at=$2::timestamptz where id=$1", [id, entry.at]);
      await client.query("update forum_posts set created_at=$2::timestamptz where topic_id=$1", [id, entry.at]);
    }
    await reply("profile-c3b-title-reply", "profile-c3b-title", "profile-helper");
    await client.query("update forum_posts set created_at=$2::timestamptz where id=$1", [
      "profile-c3b-title-reply", "2026-11-12T10:00:00Z",
    ]);
    const selected = ["profile-c3b-other", "profile-c3b-body", "profile-c3b-tag", "profile-c3b-title"];
    const found = ["profile-c3b-title", "profile-c3b-tag", "profile-c3b-body"];

    await client.query("begin");
    try {
      await client.query('update "user" set name=$2, image=$3 where id=$1', [
        "profile-owner", "SECRET_C3B_TITLE_AUTHOR", "https://images.example.test/SECRET_C3B_TITLE_AVATAR.png",
      ]);
      await client.query('update "user" set name=$2, image=$3 where id=$1', [
        "profile-helper", "SECRET_C3B_TAG_AUTHOR", "https://images.example.test/SECRET_C3B_TAG_AVATAR.png",
      ]);
      const activeTag = (await repository.readTag("c3b-shared"))!;
      const activeSearch = await repository.search("  ＱｕａｒｔｚＮｅｅｄｌｅ  ");
      expect(activeTag.tag).toEqual({ key: "c3b-shared", name: "C3b shared" });
      expect(activeTag.topics.map((row) => row.id)).toEqual(selected);
      expect(activeTag.topics.find((row) => row.id === "profile-c3b-title")).toMatchObject({
        authorName: "SECRET_C3B_TITLE_AUTHOR", postCount: 2,
        section: { id: "profile-section" }, category: { id: "profile-category" },
        tags: [{ key: "c3b-shared", name: "C3b shared" }],
      });
      expect(activeTag.topics.find((row) => row.id === "profile-c3b-tag")).toMatchObject({
        authorName: "SECRET_C3B_TAG_AUTHOR", postCount: 1,
        tags: expect.arrayContaining([{ key: "c3b-needle", name: "QuartzNeedle tag" }]),
      });
      expect(activeSearch.map((row) => row.id)).toEqual(found);
      expect(activeSearch[0]).toMatchObject({
        id: "profile-c3b-title", title: "QuartzNeedle public title", sourceLocale: "he",
        authorName: "SECRET_C3B_TITLE_AUTHOR", postCount: 2,
        activityAt: new Date("2026-11-12T10:00:00Z"),
      });
      expect(activeSearch[1]).toMatchObject({
        id: "profile-c3b-tag", authorName: "SECRET_C3B_TAG_AUTHOR",
      });
      expect(activeSearch[2]).toMatchObject({
        id: "profile-c3b-body", authorName: "profile-newcomer",
      });
      expect((await repository.search("QuartzNeedle", 2)).map((row) => row.id)).toEqual(found.slice(0, 2));
      expect(await repository.search("     ")).toEqual([]);

      for (const [id, actor] of [
        ["profile-owner", "SECRET_C3B_OWNER_DEACTIVATOR"],
        ["profile-helper", "SECRET_C3B_HELPER_DEACTIVATOR"],
      ] as const) {
        await client.query(
          'update "user" set deactivated_at=$2::timestamptz,' +
            ' deactivated_by_user_id=$3, retain_at_least_until=$4::timestamptz where id=$1',
          [id, "2024-02-29T12:34:56Z", actor, "2025-02-28T12:34:56Z"],
        );
      }
      const tagPage = (await repository.readTag("c3b-shared"))!;
      const search = await repository.search("  ＱｕａｒｔｚＮｅｅｄｌｅ  ");
      expect(tagPage.tag).toEqual(activeTag.tag);
      expect(tagPage.topics.map((row) => row.id)).toEqual(selected);
      expect(tagPage.topics.map((row) => [
        row.id, row.title, row.postCount, row.createdAt, row.section, row.category, row.tags,
      ])).toEqual(activeTag.topics.map((row) => [
        row.id, row.title, row.postCount, row.createdAt, row.section, row.category, row.tags,
      ]));
      expect(tagPage.topics).toMatchObject([
        { id: "profile-c3b-other", authorName: "profile-newcomer" },
        { id: "profile-c3b-body", authorName: "profile-newcomer" },
        { id: "profile-c3b-tag", authorName: "Deleted user", authorIdentityKind: "deleted" },
        { id: "profile-c3b-title", authorName: "Deleted user", authorIdentityKind: "deleted" },
      ]);
      expect(tagPage.topics[0]).not.toHaveProperty("authorIdentityKind");
      expect(search.map((row) => row.id)).toEqual(found);
      expect(search.map((row) => [
        row.id, row.title, row.sourceLocale, row.postCount, row.activityAt,
        row.section, row.category, row.tags,
      ])).toEqual(activeSearch.map((row) => [
        row.id, row.title, row.sourceLocale, row.postCount, row.activityAt,
        row.section, row.category, row.tags,
      ]));
      expect(search).toMatchObject([
        { id: "profile-c3b-title", authorName: "Deleted user", authorIdentityKind: "deleted" },
        { id: "profile-c3b-tag", authorName: "Deleted user", authorIdentityKind: "deleted" },
        { id: "profile-c3b-body", authorName: "profile-newcomer" },
      ]);
      expect(search[2]).not.toHaveProperty("authorIdentityKind");
      expect((await repository.search("QuartzNeedle", 2)).map((row) => row.id)).toEqual(found.slice(0, 2));
      expect(await repository.readTag("missing-c3b")).toBeUndefined();

      const serialized = JSON.stringify({ tagPage, search });
      for (const secret of [
        "SECRET_C3B_TITLE_AUTHOR", "SECRET_C3B_TAG_AUTHOR",
        "SECRET_C3B_TITLE_AVATAR", "SECRET_C3B_TAG_AVATAR",
        "SECRET_C3B_OWNER_DEACTIVATOR", "SECRET_C3B_HELPER_DEACTIVATOR",
        "2024-02-29", "2025-02-28",
      ]) expect(serialized).not.toContain(secret);
      expect(Object.keys(tagPage.topics[3]!)).not.toContain("authorDeactivatedAt");
      expect(Object.keys(search[0]!)).not.toContain("authorRetainAtLeastUntil");
    } finally {
      await client.query("rollback");
    }
  });
});

describe("SA04-C3c canonical authenticated Unread topic authors", () => {
  it("neutralizes inactive topic authors without changing unread classification, post pointers, count, location or order", async () => {
    const entries = [
      { id: "profile-c3c-unread", authorId: "profile-helper", at: "2026-11-12T09:00:00Z" },
      { id: "profile-c3c-new", authorId: "profile-owner", at: "2026-11-12T11:00:00Z" },
      { id: "profile-c3c-active", authorId: "profile-newcomer", at: "2026-11-12T10:00:00Z" },
    ] as const;
    for (const entry of entries) {
      await repository.createTopicWithInitialPost({
        id: entry.id, sectionId: "profile-section", authorId: entry.authorId,
        titleRevision: {
          id: `${entry.id}-title`, originalContent: `Public unread title ${entry.id}`, sourceLocale: "en",
        },
        initialPost: {
          id: `${entry.id}-initial`, topicId: entry.id, authorId: entry.authorId,
          bodyRevision: {
            id: `${entry.id}-body`, originalContent: "Published unread body", sourceLocale: "en",
          },
        },
      });
      await client.query("update forum_topics set created_at=$2::timestamptz where id=$1", [entry.id, entry.at]);
      await client.query("update forum_posts set created_at=$2::timestamptz where topic_id=$1", [entry.id, entry.at]);
    }
    await reply("profile-c3c-latest", "profile-c3c-unread", "profile-owner");
    await client.query("update forum_posts set created_at=$2::timestamptz where id=$1", [
      "profile-c3c-latest", "2026-11-12T12:00:00Z",
    ]);
    await repository.advanceTopicReadState(
      "profile-newcomer", "profile-c3c-unread", "profile-c3c-unread-initial",
    );
    const selected = new Set<string>(entries.map((entry) => entry.id));
    const own = (rows: Awaited<ReturnType<typeof repository.readUnreadForUser>>) =>
      rows.filter((row) => selected.has(row.id));

    await client.query("begin");
    try {
      await client.query('update "user" set name=$2, image=$3 where id=$1', [
        "profile-owner", "SECRET_C3C_NEW_AUTHOR", "https://images.example.test/SECRET_C3C_OWNER_AVATAR.png",
      ]);
      await client.query('update "user" set name=$2, image=$3 where id=$1', [
        "profile-helper", "SECRET_C3C_UNREAD_AUTHOR", "https://images.example.test/SECRET_C3C_HELPER_AVATAR.png",
      ]);
      const before = own(await repository.readUnreadForUser("profile-newcomer"));
      expect(before.map((row) => row.id)).toEqual([
        "profile-c3c-unread", "profile-c3c-new", "profile-c3c-active",
      ]);
      expect(before).toMatchObject([
        {
          authorName: "SECRET_C3C_UNREAD_AUTHOR", state: "unread",
          firstUnreadPostId: "profile-c3c-latest", latestPostId: "profile-c3c-latest",
          unreadCount: 1, activityAt: new Date("2026-11-12T12:00:00Z"),
        },
        {
          authorName: "SECRET_C3C_NEW_AUTHOR", state: "new",
          firstUnreadPostId: "profile-c3c-new-initial", latestPostId: "profile-c3c-new-initial",
          unreadCount: 1, activityAt: new Date("2026-11-12T11:00:00Z"),
        },
        { authorName: "profile-newcomer", state: "new", unreadCount: 1 },
      ]);

      for (const [id, actor] of [
        ["profile-owner", "SECRET_C3C_OWNER_DEACTIVATOR"],
        ["profile-helper", "SECRET_C3C_HELPER_DEACTIVATOR"],
      ] as const) {
        await client.query(
          'update "user" set deactivated_at=$2::timestamptz,' +
            ' deactivated_by_user_id=$3, retain_at_least_until=$4::timestamptz where id=$1',
          [id, "2024-02-29T12:34:56Z", actor, "2025-02-28T12:34:56Z"],
        );
      }
      const after = own(await repository.readUnreadForUser("profile-newcomer"));
      expect(after.map((row) => row.id)).toEqual(before.map((row) => row.id));
      expect(after.map((row) => [
        row.id, row.title, row.state, row.firstUnreadPostId, row.latestPostId,
        row.unreadCount, row.activityAt, row.section, row.category,
      ])).toEqual(before.map((row) => [
        row.id, row.title, row.state, row.firstUnreadPostId, row.latestPostId,
        row.unreadCount, row.activityAt, row.section, row.category,
      ]));
      expect(after).toMatchObject([
        { id: "profile-c3c-unread", authorName: "Deleted user", authorIdentityKind: "deleted" },
        { id: "profile-c3c-new", authorName: "Deleted user", authorIdentityKind: "deleted" },
        { id: "profile-c3c-active", authorName: "profile-newcomer" },
      ]);
      expect(after[2]).not.toHaveProperty("authorIdentityKind");
      expect(after[0]).toMatchObject({
        section: { id: "profile-section", name: "General" },
        category: { id: "profile-category", name: "Profiles" },
      });
      const serialized = JSON.stringify(after);
      for (const secret of [
        "SECRET_C3C_NEW_AUTHOR", "SECRET_C3C_UNREAD_AUTHOR",
        "SECRET_C3C_OWNER_AVATAR", "SECRET_C3C_HELPER_AVATAR",
        "SECRET_C3C_OWNER_DEACTIVATOR", "SECRET_C3C_HELPER_DEACTIVATOR",
        "2024-02-29", "2025-02-28",
      ]) expect(serialized).not.toContain(secret);
      expect(Object.keys(after[0]!)).not.toContain("authorDeactivatedAt");
      expect(Object.keys(after[1]!)).not.toContain("authorRetainAtLeastUntil");
    } finally {
      await client.query("rollback");
    }
  });
});

describe("SA04-C3d1 shared Help question-summary author identities", () => {
  it("preserves shared mode eligibility, filtering, state, order and tags while removing deactivated author identity", async () => {
    const entries = [
      { id: "profile-c3d1-open", authorId: "profile-owner", at: "2026-11-12T10:00:00Z" },
      { id: "profile-c3d1-solved", authorId: "profile-owner", at: "2026-11-11T10:00:00Z" },
      { id: "profile-c3d1-helper", authorId: "profile-helper", at: "2026-11-10T10:00:00Z" },
      { id: "profile-c3d1-active", authorId: "profile-newcomer", at: "2026-11-09T10:00:00Z" },
    ] as const;
    for (const entry of entries) {
      await repository.createTopicWithInitialPost({
        id: entry.id, sectionId: HELP_SOLUTIONS_SERVICE_SECTION_ID, authorId: entry.authorId,
        titleRevision: {
          id: `${entry.id}-title`, originalContent: `Published Help title ${entry.id}`, sourceLocale: "he",
        },
        initialPost: {
          id: `${entry.id}-initial`, topicId: entry.id, authorId: entry.authorId,
          bodyRevision: { id: `${entry.id}-body`, originalContent: "Published Help question body", sourceLocale: "en" },
        },
        tags: [{ key: "c3d1-shared", name: "C3d1 shared" }],
      });
      await client.query("update forum_topics set created_at=$2::timestamptz where id=$1", [entry.id, entry.at]);
      await client.query("update forum_posts set created_at=$2::timestamptz where topic_id=$1", [entry.id, entry.at]);
    }
    await reply("profile-c3d1-open-reply", "profile-c3d1-open", "profile-helper");
    await reply("profile-c3d1-solved-reply", "profile-c3d1-solved", "profile-helper");
    await client.query("update forum_posts set created_at=$2::timestamptz where id=$1", [
      "profile-c3d1-open-reply", "2026-11-12T11:00:00Z",
    ]);
    await client.query("update forum_posts set created_at=$2::timestamptz where id=$1", [
      "profile-c3d1-solved-reply", "2026-11-11T11:00:00Z",
    ]);
    await repository.selectBestAnswer("profile-c3d1-solved", "profile-c3d1-solved-reply", "profile-owner", "own");
    await repository.markTopicSolved("profile-c3d1-solved", "profile-owner", "own");
    await client.query("update forum_posts set solution_moderation_status='needs-review' where id=$1", [
      "profile-c3d1-solved-reply",
    ]);
    await client.query("update forum_topics set needs_details=true where id=$1", ["profile-c3d1-helper"]);

    const ownIds = new Set<string>(entries.map((entry) => entry.id));
    const own = (page: Awaited<ReturnType<typeof repository.readHelpSolutionsAll>>) =>
      page!.questions.filter((question) => ownIds.has(question.id));
    const modes = [
      { name: "all", read: () => repository.readHelpSolutionsAll(), ids: entries.map((entry) => entry.id) },
      { name: "open", read: () => repository.readHelpSolutionsOpen(),
        ids: ["profile-c3d1-open", "profile-c3d1-helper", "profile-c3d1-active"] },
      { name: "active", read: () => repository.readHelpSolutionsActive(),
        ids: ["profile-c3d1-open", "profile-c3d1-solved"] },
      { name: "solved", read: () => repository.readHelpSolutionsSolved(),
        ids: ["profile-c3d1-solved"] },
      { name: "mine", read: () => repository.readHelpSolutionsMine("profile-owner"),
        ids: ["profile-c3d1-open", "profile-c3d1-solved"] },
      { name: "want-to-help", read: () => repository.readHelpSolutionsWantToHelp("profile-owner"),
        ids: ["profile-c3d1-helper", "profile-c3d1-active"] },
      { name: "attention", read: () => repository.readHelpSolutionsNeedsAttention({}, {
        signalKinds: ["needs-review"], appeals: false,
      }), ids: ["profile-c3d1-solved"] },
      { name: "no-answers", read: () => repository.readHelpSolutionsAll({ answers: "none" }),
        ids: ["profile-c3d1-helper", "profile-c3d1-active"] },
      { name: "has-answers", read: () => repository.readHelpSolutionsAll({ answers: "has" }),
        ids: ["profile-c3d1-open", "profile-c3d1-solved"] },
      { name: "needs-details", read: () => repository.readHelpSolutionsAll({ quality: "needs-details" }),
        ids: ["profile-c3d1-helper"] },
    ];
    await client.query("begin");
    try {
      await client.query('update "user" set name=$2, image=$3 where id=$1', [
        "profile-owner", "SECRET_C3D1_OWNER_NAME", "https://images.example.test/SECRET_C3D1_OWNER_AVATAR.png",
      ]);
      await client.query('update "user" set name=$2, image=$3 where id=$1', [
        "profile-helper", "SECRET_C3D1_HELPER_NAME", "https://images.example.test/SECRET_C3D1_HELPER_AVATAR.png",
      ]);
      const before = await Promise.all(modes.map(async (mode) => ({
        name: mode.name, rows: own(await mode.read()),
      })));
      for (const [index, mode] of modes.entries()) {
        expect(before[index]!.rows.map((row) => row.id), mode.name).toEqual(mode.ids);
      }
      expect(before[0]!.rows).toMatchObject([
        { authorName: "SECRET_C3D1_OWNER_NAME", replyCount: 1, isSolved: false },
        { authorName: "SECRET_C3D1_OWNER_NAME", replyCount: 1, isSolved: true,
          hasBestAnswer: true, solutionModerationStatus: "needs-review" },
        { authorName: "SECRET_C3D1_HELPER_NAME", replyCount: 0, needsDetails: true },
        { authorName: "profile-newcomer", replyCount: 0 },
      ]);
      for (const [id, actor] of [
        ["profile-owner", "SECRET_C3D1_OWNER_DEACTIVATOR"],
        ["profile-helper", "SECRET_C3D1_HELPER_DEACTIVATOR"],
      ] as const) {
        await client.query(
          'update "user" set deactivated_at=$2::timestamptz,' +
            ' deactivated_by_user_id=$3, retain_at_least_until=$4::timestamptz where id=$1',
          [id, "2024-02-29T12:34:56Z", actor, "2025-02-28T12:34:56Z"],
        );
      }
      const after = await Promise.all(modes.map(async (mode) => ({
        name: mode.name, rows: own(await mode.read()),
      })));
      const withoutIdentity = (row: (typeof after)[number]["rows"][number]) => {
        const { authorName, authorIdentityKind, ...published } = row;
        void authorName;
        void authorIdentityKind;
        return published;
      };
      for (const [index, mode] of modes.entries()) {
        const previous = before[index]!.rows;
        const current = after[index]!.rows;
        expect(current.map((row) => row.id), mode.name).toEqual(mode.ids);
        expect(current.map(withoutIdentity), mode.name).toEqual(previous.map(withoutIdentity));
        for (const row of current) {
          if (row.id === "profile-c3d1-active") {
            expect(row.authorName).toBe("profile-newcomer");
            expect(row).not.toHaveProperty("authorIdentityKind");
          } else {
            expect(row).toMatchObject({ authorName: "Deleted user", authorIdentityKind: "deleted" });
          }
        }
      }
      expect(after[0]!.rows[0]).toMatchObject({
        title: "Published Help title profile-c3d1-open",
        tags: [{ key: "c3d1-shared", name: "C3d1 shared" }],
        replyCount: 1, isSolved: false,
      });
      expect(after[6]!.rows[0]!.attention).toMatchObject({ reviewRequired: true });
      const serialized = JSON.stringify(after);
      for (const secret of [
        "SECRET_C3D1_OWNER_NAME", "SECRET_C3D1_HELPER_NAME",
        "SECRET_C3D1_OWNER_AVATAR", "SECRET_C3D1_HELPER_AVATAR",
        "SECRET_C3D1_OWNER_DEACTIVATOR", "SECRET_C3D1_HELPER_DEACTIVATOR",
        "2024-02-29", "2025-02-28",
      ]) expect(serialized).not.toContain(secret);
      expect(Object.keys(after[0]!.rows[0]!)).not.toContain("authorDeactivatedAt");
      expect(Object.keys(after[6]!.rows[0]!)).not.toContain("authorRetainAtLeastUntil");
    } finally {
      await client.query("rollback");
    }
  });
});

describe("SA04-C3d2 For-me candidate topic-author identities", () => {
  it("preserves persisted interest signals, candidate rank/filters/state and truthful empty results while neutralizing inactive candidate authors", async () => {
    const createQuestion = async (id: string, authorId: string, tags: string[]) => {
      await repository.createTopicWithInitialPost({
        id, sectionId: HELP_SOLUTIONS_SERVICE_SECTION_ID, authorId,
        titleRevision: { id: `${id}-title`, originalContent: `Published For-me ${id}`, sourceLocale: "he" },
        tags: tags.map((key) => ({ key, name: key })),
        initialPost: {
          id: `${id}-post`, topicId: id, authorId,
          bodyRevision: { id: `${id}-body`, originalContent: "Published For-me question body", sourceLocale: "en" },
        },
      });
    };
    const setActivity = async (id: string, timestamp: string) => {
      await client.query("update forum_topics set created_at=$2::timestamptz where id=$1", [id, timestamp]);
      await client.query("update forum_posts set created_at=$2::timestamptz where topic_id=$1", [id, timestamp]);
    };
    await client.query('insert into "user" (id,name,email) values ($1,$2,$3),($4,$5,$6),($7,$8,$9)', [
      "profile-c3d2-no-signal", "No signal", "no-signal-c3d2@example.test",
      "profile-c3d2-no-match", "No match", "no-match-c3d2@example.test",
      "profile-c3d2-interest", "Interested C3d2", "interested-c3d2@example.test",
    ]);
    await createQuestion("profile-c3d2-signal-owned", "profile-c3d2-interest", ["c3d2-owned"]);
    await createQuestion("profile-c3d2-signal-replied", "profile-helper", ["c3d2-replied"]);
    await reply("profile-c3d2-signal-answer", "profile-c3d2-signal-replied", "profile-c3d2-interest");
    await repository.markTopicSolved("profile-c3d2-signal-replied", "profile-helper", "own");
    await createQuestion("profile-c3d2-two-match", "profile-helper", ["c3d2-owned", "c3d2-replied"]);
    await createQuestion("profile-c3d2-one-new", "profile-newcomer", ["c3d2-owned"]);
    await createQuestion("profile-c3d2-one-a", "profile-helper", ["c3d2-replied"]);
    await createQuestion("profile-c3d2-one-z", "profile-newcomer", ["c3d2-replied"]);
    await createQuestion("profile-c3d2-own", "profile-c3d2-interest", ["c3d2-owned", "c3d2-replied"]);
    await createQuestion("profile-c3d2-solved", "profile-helper", ["c3d2-owned", "c3d2-replied"]);
    await repository.markTopicSolved("profile-c3d2-solved", "profile-helper", "own");
    await createQuestion("profile-c3d2-unrelated", "profile-helper", ["c3d2-unrelated"]);
    await createQuestion("profile-c3d2-no-match-signal", "profile-c3d2-no-match", ["c3d2-isolated"]);
    await reply("profile-c3d2-two-answer", "profile-c3d2-two-match", "profile-newcomer");
    await client.query("update forum_topics set needs_details=true where id=$1", ["profile-c3d2-one-a"]);
    await setActivity("profile-c3d2-two-match", "2026-01-01T00:00:00Z");
    await setActivity("profile-c3d2-one-new", "2026-03-10T00:00:00Z");
    await setActivity("profile-c3d2-one-a", "2026-03-01T00:00:00Z");
    await setActivity("profile-c3d2-one-z", "2026-03-01T00:00:00Z");

    const expected = [
      "profile-c3d2-two-match", "profile-c3d2-one-new", "profile-c3d2-one-z", "profile-c3d2-one-a",
    ];
    const modes = [
      { name: "unfiltered", filters: {}, ids: expected },
      { name: "open", filters: { solution: "open" as const }, ids: expected },
      { name: "solved", filters: { solution: "solved" as const }, ids: [] },
      { name: "has replies", filters: { answers: "has" as const }, ids: ["profile-c3d2-two-match"] },
      { name: "no replies", filters: { answers: "none" as const },
        ids: ["profile-c3d2-one-new", "profile-c3d2-one-z", "profile-c3d2-one-a"] },
      { name: "needs details", filters: { quality: "needs-details" as const }, ids: ["profile-c3d2-one-a"] },
      { name: "standalone", filters: { relation: "standalone" as const }, ids: expected },
      { name: "combined", filters: { solution: "open" as const, answers: "none" as const,
        quality: "needs-details" as const, relation: "standalone" as const }, ids: ["profile-c3d2-one-a"] },
    ];
    await client.query("begin");
    try {
      await client.query('update "user" set name=$2,image=$3 where id=$1', [
        "profile-helper", "SECRET_C3D2_DELETED_AUTHOR", "https://example.test/SECRET_C3D2_AVATAR.png",
      ]);
      const read = async () => Promise.all(modes.map(async (mode) => ({
        name: mode.name, rows: (await repository.readHelpSolutionsForMe("profile-c3d2-interest", mode.filters))!.questions,
      })));
      const before = await read();
      for (const [i, mode] of modes.entries()) {
        expect(before[i]!.rows.map((row) => row.id), mode.name).toEqual(mode.ids);
      }
      expect(before[0]!.rows).toMatchObject([
        { authorName: "SECRET_C3D2_DELETED_AUTHOR", replyCount: 1, isSolved: false },
        { authorName: "profile-newcomer", replyCount: 0, isSolved: false },
        { authorName: "profile-newcomer", replyCount: 0, isSolved: false },
        { authorName: "SECRET_C3D2_DELETED_AUTHOR", replyCount: 0, needsDetails: true },
      ]);
      expect((await repository.readHelpSolutionsForMe("profile-c3d2-no-signal"))?.questions).toEqual([]);
      expect((await repository.readHelpSolutionsForMe("profile-c3d2-no-match"))?.questions).toEqual([]);
      await client.query(
        'update "user" set deactivated_at=$2::timestamptz, ' +
          'deactivated_by_user_id=$3, retain_at_least_until=$4::timestamptz where id=$1',
        ["profile-helper", "2024-03-01T02:03:04Z", "SECRET_C3D2_ACTOR", "2025-03-01T02:03:04Z"],
      );
      const after = await read();
      const publicData = (row: (typeof after)[number]["rows"][number]) => {
        const { authorName, authorIdentityKind, ...rest } = row;
        void authorName;
        void authorIdentityKind;
        return rest;
      };
      for (const [i, mode] of modes.entries()) {
        expect(after[i]!.rows.map((row) => row.id), mode.name).toEqual(mode.ids);
        expect(after[i]!.rows.map(publicData), mode.name).toEqual(before[i]!.rows.map(publicData));
        for (const row of after[i]!.rows) {
          if (row.id === "profile-c3d2-two-match" || row.id === "profile-c3d2-one-a") {
            expect(row).toMatchObject({ authorName: "Deleted user", authorIdentityKind: "deleted" });
          } else {
            expect(row.authorName).toBe("profile-newcomer");
            expect(row).not.toHaveProperty("authorIdentityKind");
          }
        }
      }
      expect(after[0]!.rows[0]).toMatchObject({
        title: "Published For-me profile-c3d2-two-match", replyCount: 1,
        hasBestAnswer: false, solutionModerationStatus: null, needsDetails: false,
        tags: [{ key: "c3d2-owned", name: "c3d2-owned" }, { key: "c3d2-replied", name: "c3d2-replied" }],
      });
      expect((await repository.readHelpSolutionsForMe("profile-c3d2-no-signal"))?.questions).toEqual([]);
      expect((await repository.readHelpSolutionsForMe("profile-c3d2-no-match"))?.questions).toEqual([]);
      const serialized = JSON.stringify(after);
      for (const secret of ["SECRET_C3D2_DELETED_AUTHOR", "SECRET_C3D2_AVATAR",
        "SECRET_C3D2_ACTOR", "2024-03-01", "2025-03-01"]) {
        expect(serialized).not.toContain(secret);
      }
      expect(after[0]!.rows[0]).not.toHaveProperty("authorDeactivatedAt");
      expect(after[0]!.rows[0]).not.toHaveProperty("authorRetainAtLeastUntil");
    } finally {
      await client.query("rollback");
    }
  });
});
