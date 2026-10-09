import { readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DrizzleForumRepository } from "../../db/forum-repository";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const url = new URL(databaseUrl);
if (!["127.0.0.1", "localhost"].includes(url.hostname) || !url.pathname.endsWith("_test")) {
  throw new Error("Disposable local test database required");
}
const schema = "forum_online_presence_test";
const client = new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
const repo = new DrizzleForumRepository(drizzle(client));
const migrations = [
  "0000_tan_johnny_storm", "0001_seed-locales", "0002_ui_translation_storage",
  "0003_gorgeous_donald_blake", "0004_forum_domain_foundation",
  "0005_calm_proemial_gods", "0006_loving_sentinels",
  "0021_forum_tags", "0022_forum_reply_relationships", "0024_forum_reply_notifications",
  "0025_forum_topic_pins", "0026_best_answer_independent_from_solved",
  "0027_help_solutions_foundation", "0028_help_solution_moderation",
  "0029_help_question_needs_details", "0030_help_duplicate_workflow",
  "0031_help_user_moderation_signals", "0032_forum_profiles", "0033_forum_online_presence",
];

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const tag of migrations) {
    await client.query((await readFile(`drizzle/${tag}.sql`, "utf8")).replaceAll('"public".', `"${schema}".`));
  }
  for (const id of ["online-a", "online-b", "online-unused"]) {
    await client.query(`insert into "user" (id, name, email) values ($1, $2, $3)`, [id, `Member ${id}`, `${id}@private.test`]);
  }
});
afterAll(async () => { await client.query(`drop schema if exists ${schema} cascade`); await client.end(); });

describe("recent authenticated presence persistence", () => {
  it("starts empty, accepts repeated heartbeat per user and excludes expired activity", async () => {
    expect(await repo.readOnlinePresence()).toEqual({ count: 0, members: [] });
    await repo.recordOnlinePresence("online-a");
    await repo.recordOnlinePresence("online-a");
    expect(await repo.readOnlinePresence()).toMatchObject({ count: 1, members: [{ id: "online-a" }] });
    expect((await client.query("select * from forum_online_presence")).rowCount).toBe(1);
    await client.query(`update forum_online_presence set last_seen_at = now() - interval '6 minutes' where user_id = 'online-a'`);
    expect(await repo.readOnlinePresence()).toEqual({ count: 0, members: [] });
    await repo.recordOnlinePresence("online-a");
    expect((await repo.readOnlinePresence()).count).toBe(1);
  });
  it("exposes only public identity, counts users once and ignores client-supplied identity", async () => {
    await repo.recordOnlinePresence("online-b");
    const result = await repo.readOnlinePresence();
    expect(result.count).toBe(2);
    expect(result.members).toHaveLength(2);
    expect(result.members.map((x) => x.id).sort()).toEqual(["online-a", "online-b"]);
    expect(JSON.stringify(result)).not.toContain("private.test");
    await expect(repo.recordOnlinePresence("nonexistent-user")).rejects.toMatchObject({ code: "23503" });
  });
  it("cascades presence when an account is removed", async () => {
    await repo.recordOnlinePresence("online-unused");
    expect((await repo.readOnlinePresence()).count).toBe(3);
    await client.query(`delete from "user" where id = 'online-unused'`);
    expect((await repo.readOnlinePresence()).count).toBe(2);
  });
});
