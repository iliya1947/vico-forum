import { readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DrizzleForumRepository, ForumEntityNotFoundError } from "../../db/forum-repository";
import { HELP_SOLUTIONS_SERVICE_SECTION_ID } from "../../db/forum-identifiers";
import { InvalidProfileError } from "../../app/forum/profile";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const url = new URL(databaseUrl);
if (!["127.0.0.1", "localhost"].includes(url.hostname) || !url.pathname.endsWith("_test")) throw new Error("Disposable local test database required");
const schema = "forum_profiles_test";
const client = new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
const repository = new DrizzleForumRepository(drizzle(client), { cooldownMs: 0, now: () => new Date() });
const migrations = ["0000_tan_johnny_storm", "0001_seed-locales", "0002_ui_translation_storage", "0003_gorgeous_donald_blake", "0004_forum_domain_foundation", "0005_calm_proemial_gods", "0006_loving_sentinels", "0021_forum_tags", "0022_forum_reply_relationships", "0024_forum_reply_notifications", "0025_forum_topic_pins", "0026_best_answer_independent_from_solved", "0027_help_solutions_foundation", "0028_help_solution_moderation", "0029_help_question_needs_details", "0030_help_duplicate_workflow", "0031_help_user_moderation_signals", "0032_forum_profiles"];
beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const tag of migrations) await client.query((await readFile(`drizzle/${tag}.sql`, "utf8")).replaceAll('"public".', `"${schema}".`));
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
describe("persisted forum profiles", () => {
  it("reads existing users without a profile row and exposes no private identity fields", async () => {
    const profile = await repository.readProfile("profile-newcomer");
    expect(profile).toMatchObject({ id: "profile-newcomer", bio: "", githubUrl: null, websiteUrl: null, messageCount: 0, bestAnswerCount: 0, role: { slug: "user", isSystem: true }, image: "https://example.com/avatar.png" });
    expect(profile?.joinedAt).toBeInstanceOf(Date);
    expect(profile).not.toHaveProperty("email");
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
