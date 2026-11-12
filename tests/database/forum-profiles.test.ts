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
const migrations = ["0000_tan_johnny_storm", "0001_seed-locales", "0002_ui_translation_storage", "0003_gorgeous_donald_blake", "0004_forum_domain_foundation", "0005_calm_proemial_gods", "0006_loving_sentinels", "0021_forum_tags", "0022_forum_reply_relationships", "0024_forum_reply_notifications", "0025_forum_topic_pins", "0026_best_answer_independent_from_solved", "0027_help_solutions_foundation", "0028_help_solution_moderation", "0029_help_question_needs_details", "0030_help_duplicate_workflow", "0031_help_user_moderation_signals", "0032_forum_profiles", "0033_forum_online_presence", "0034_forum_editor_drafts", "0035_forum_attachments_foundation", "0036_forum_attachment_security_events", "0037_forum_attachment_draft_generations", "0038_forum_attachment_cleanup_claims", "0040_post_edit_history_permissions", "0041_published_mentions", "0042_attachment_edit_snapshots", "0065_sa04_account_state_foundation"];
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
