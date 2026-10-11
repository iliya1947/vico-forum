import { readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DrizzleForumEditorDrafts } from "../../db/forum-editor-drafts";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const url = new URL(databaseUrl);
if (!["localhost", "127.0.0.1"].includes(url.hostname) || !url.pathname.endsWith("_test")) {
  throw new Error("Disposable local test database required");
}
const schema = "forum_editor_drafts_test";
const client = new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
const store = new DrizzleForumEditorDrafts(drizzle(client));
const migrations = [
  "0000_tan_johnny_storm", "0001_seed-locales", "0002_ui_translation_storage",
  "0003_gorgeous_donald_blake", "0004_forum_domain_foundation",
  "0005_calm_proemial_gods", "0006_loving_sentinels",
  "0021_forum_tags", "0022_forum_reply_relationships", "0024_forum_reply_notifications",
  "0025_forum_topic_pins", "0026_best_answer_independent_from_solved",
  "0027_help_solutions_foundation", "0028_help_solution_moderation",
  "0029_help_question_needs_details", "0030_help_duplicate_workflow",
  "0031_help_user_moderation_signals", "0032_forum_profiles", "0033_forum_online_presence",
  "0034_forum_editor_drafts",
];
const id1 = "e7bdbd73-61d4-4b06-bc03-b24b1c217d55";
const id2 = "e7bdbd73-61d4-4b06-bc03-b24b1c217d56";
const text1 = { title: "first", body: "Draft **one**", tags: "typescript" };
const text2 = { title: "second", body: "Draft **two**", tags: "" };
const timestamp = () => new Date();

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const tag of migrations) {
    await client.query((await readFile(`drizzle/${tag}.sql`, "utf8")).replaceAll('"public".', `"${schema}".`));
  }
  for (const id of ["draft-owner", "draft-other"]) {
    await client.query('insert into "user" (id, name, email) values ($1, $2, $3)', [id,id,`${id}@test.invalid`]);
  }
});
afterAll(async () => { await client.query(`drop schema if exists ${schema} cascade`); await client.end(); });

describe("account-scoped durable editor drafts", () => {
  it("saves and retrieves only the requesting owner's context, with metadata not bodies", async () => {
    const saved = await store.save("draft-owner", "help:new", id1, text1, 0, timestamp());
    expect(saved.outcome).toBe("saved");
    expect((await store.get("draft-other", "help:new"))).toBeNull();
    const list = await store.metadata("draft-owner");
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ contextKey: "help:new", version: 1, status: "active" });
    expect(JSON.stringify(list[0])).not.toContain('"payload"');
  });

  it("blocks conflicting versions and preserves both contents for explicit selection", async () => {
    const updated = await store.save("draft-owner", "help:new", id1, text2, 1, timestamp());
    expect(updated.outcome).toBe("saved");
    expect((await store.save("draft-owner", "help:new", id1, text1, 1, timestamp())).outcome).toBe("conflict");
    expect((await store.get("draft-owner", "help:new"))?.payload.body).toBe(text2.body);
    expect((await store.save("draft-owner", "help:new", id2, text1, 0, timestamp())).outcome).toBe("gone");
  });

  it("published and deleted drafts cannot be overwritten by their stale IDs", async () => {
    await store.finish("draft-owner", "help:new", id1, "published");
    expect((await store.get("draft-owner", "help:new"))?.status).toBe("published");
    expect((await store.save("draft-owner", "help:new", id1, text1, 2, timestamp())).outcome).toBe("gone");
    const next = await store.save("draft-owner", "help:new", id2, text1, 0, timestamp());
    expect(next.outcome).toBe("saved");
    await store.finish("draft-owner", "help:new", id1, "published");
    expect((await store.get("draft-owner", "help:new"))?.status).toBe("active");
    await store.finish("draft-owner", "help:new", id2, "deleted");
    expect((await store.save("draft-owner", "help:new", id2, text1, 0, timestamp())).outcome).toBe("gone");
  });

  it("refuses expired edits and purges expired drafts by 30 days", async () => {
    await expect(store.save("draft-owner", "topic:abc:reply", id1, text1, 0, new Date(Date.now()-32*86_400_000)))
      .rejects.toThrow("invalid draft");
    await client.query('update forum_editor_drafts set updated_at = now()-interval \'31 days\' where owner_id = $1', ["draft-owner"]);
    expect(await store.metadata("draft-owner")).toEqual([]);
  });
});
