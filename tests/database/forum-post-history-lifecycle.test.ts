import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DrizzleForumRepository } from "../../db/forum-repository";
import { historicalForumMeasureAdmission } from "./historical-forum-measure-admission";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL required");
const url = new URL(databaseUrl);
if (!["localhost", "127.0.0.1"].includes(url.hostname) || !url.pathname.endsWith("_test")) {
  throw new Error("Disposable local *_test database required");
}

const schema = "forum_post_history_lifecycle_test";
const client = new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
const forum = new DrizzleForumRepository(drizzle(client), { cooldownMs: 0, now: () => new Date() },
  historicalForumMeasureAdmission);

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const file of (await readdir("drizzle")).filter(f => /^\d{4}_.+\.sql$/.test(f)).sort()) {
    await client.query((await readFile(`drizzle/${file}`, "utf8")).replaceAll('"public".', `"${schema}".`));
  }
  for (const [id, name] of [
    ["h-inactive", "SECRET_HISTORY_RETAINED_NAME"],
    ["h-active", "Active editor"],
    ["h-reviewer", "Reviewer"],
  ]) {
    await client.query('insert into "user"(id,name,email,image) values ($1,$2,$3,$4)', [
      id, name, `${id}@example.test`, `SECRET_HISTORY_IMAGE_${id}`,
    ]);
  }
  await forum.createCategory({ id: "h-category", name: "History test" });
  await forum.createSection({ id: "h-section", categoryId: "h-category", name: "History test section" });
  await forum.createTopicWithInitialPost({
    id: "h-topic", sectionId: "h-section", authorId: "h-inactive",
    titleRevision: { id: "h-title", originalContent: "Post history", sourceLocale: "en" },
    initialPost: {
      id: "h-post", topicId: "h-topic", authorId: "h-inactive",
      bodyRevision: { id: "h-rev-1", originalContent: "First **source**\nשלום", sourceLocale: "he" },
    },
  });
  // Revisions are append-only. Assign tied timestamps on INSERT relative to the
  // immutable original row, not by updating history.
  await client.query(`insert into forum_post_revisions
    (id,post_id,author_id,original_content,source_locale,created_at)
    values
    ('h-rev-2','h-post','h-active','Second source','en',
      (select created_at + interval '1 minute' from forum_post_revisions where id='h-rev-1')),
    ('h-rev-3','h-post','h-inactive','Third source','und',
      (select created_at + interval '1 minute' from forum_post_revisions where id='h-rev-1'))`);
});
afterAll(async () => {
  try { await client.query(`drop schema if exists ${schema} cascade`); } finally { await client.end(); }
});

describe("SA04-H native PostgreSQL post revision author lifecycle", () => {
  it("neutralizes inactive revision authors without changing the complete history chain", async () => {
    const original = await forum.readPostHistory("h-post", "h-topic");
    expect(original.map(x => x.id)).toEqual(["h-rev-3", "h-rev-2", "h-rev-1"]);
    expect(original.map(x => x.authorName)).toEqual([
      "SECRET_HISTORY_RETAINED_NAME", "Active editor", "SECRET_HISTORY_RETAINED_NAME",
    ]);
    expect(original.map(x => x.authorId)).toEqual(["h-inactive", "h-active", "h-inactive"]);
    expect(original.every(x => !("authorIdentityKind" in x))).toBe(true);
    expect(await forum.readPostHistory("h-post", "wrong-topic")).toEqual([]);
    expect(await forum.readPostHistory("wrong-post", "h-topic")).toEqual([]);

    await client.query(`update "user" set deactivated_at='2026-10-03',
      deactivated_by_user_id='h-reviewer', retain_at_least_until='2027-10-04'
      where id='h-inactive'`);
    const after = await forum.readPostHistory("h-post", "h-topic");
    expect(after.map(x => x.id)).toEqual(original.map(x => x.id));
    expect(after.map(x => x.authorId)).toEqual(original.map(x => x.authorId));
    expect(after.map(x => x.originalContent)).toEqual(original.map(x => x.originalContent));
    expect(after.map(x => x.sourceLocale)).toEqual(original.map(x => x.sourceLocale));
    expect(after.map(x => x.createdAt)).toEqual(original.map(x => x.createdAt));
    expect(after.map(x => x.authorName)).toEqual(["Deleted user", "Active editor", "Deleted user"]);
    expect(after.map(x => x.authorIdentityKind ?? null)).toEqual(["deleted", null, "deleted"]);
    for (const row of after) {
      expect(Object.keys(row).sort()).toEqual([
        "authorId", "authorName", ...(row.authorIdentityKind ? ["authorIdentityKind"] : []),
        "createdAt", "id", "originalContent", "sourceLocale",
      ].sort());
    }
    const serialized = JSON.stringify(after);
    for (const secret of ["SECRET_HISTORY_RETAINED_NAME", "SECRET_HISTORY_IMAGE_",
      '"deactivatedAt":', '"deactivatedByUserId":', '"retainAtLeastUntil":']) {
      expect(serialized).not.toContain(secret);
    }
    const physical = await client.query<{original_content:string;author_id:string}>(`
      select original_content,author_id from forum_post_revisions where post_id='h-post'
      order by created_at desc,id desc`);
    expect(physical.rows.map(row => row.original_content)).toEqual(after.map(row => row.originalContent));
    expect(physical.rows.map(row => row.author_id)).toEqual(after.map(row => row.authorId));
  });
});
