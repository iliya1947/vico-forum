import { readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, type DatabaseError } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DrizzleForumAttachments } from "../../db/forum-attachments";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const url = new URL(databaseUrl);
if (!["localhost", "127.0.0.1"].includes(url.hostname) || !url.pathname.endsWith("_test")) {
  throw new Error("Disposable local test database required");
}

const schema = "forum_attachments_test";
const client = new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
const store = new DrizzleForumAttachments(drizzle(client));
const migrations = [
  "0000_tan_johnny_storm", "0001_seed-locales", "0002_ui_translation_storage",
  "0003_gorgeous_donald_blake", "0004_forum_domain_foundation",
  "0005_calm_proemial_gods", "0006_loving_sentinels",
  "0021_forum_tags", "0022_forum_reply_relationships", "0024_forum_reply_notifications",
  "0025_forum_topic_pins", "0026_best_answer_independent_from_solved",
  "0027_help_solutions_foundation", "0028_help_solution_moderation",
  "0029_help_question_needs_details", "0030_help_duplicate_workflow",
  "0031_help_user_moderation_signals", "0032_forum_profiles", "0033_forum_online_presence",
  "0034_forum_editor_drafts", "0035_forum_attachments_foundation",
];

const ownerId = "attachment-owner";
const otherId = "attachment-other";
const attachmentId = "23b93562-0550-4eef-88af-f951d6ea6138";
const draftId = "76568e3b-7cf0-4f32-9847-051d5a9b8071";
const contextKey = "topic:attachment-topic:reply";

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const tag of migrations) {
    await client.query((await readFile(`drizzle/${tag}.sql`, "utf8")).replaceAll('"public".', `"${schema}".`));
  }

  for (const id of [ownerId, otherId]) {
    await client.query('insert into "user" (id, name, email) values ($1, $2, $3)', [
      id, id, `${id}@test.invalid`,
    ]);
  }
  await client.query(
    "insert into forum_categories (id, name) values ('attachment-category', 'Attachments')",
  );
  await client.query(
    "insert into forum_sections (id, category_id, name) values ('attachment-section', 'attachment-category', 'Files')",
  );
  await client.query("begin");
  await client.query(
    "insert into forum_topics (id, section_id, author_id, current_title_revision_id) values ('attachment-topic', 'attachment-section', $1, 'attachment-title-rev')",
    [ownerId],
  );
  await client.query(
    "insert into forum_topic_title_revisions (id, topic_id, author_id, original_content, source_locale) values ('attachment-title-rev', 'attachment-topic', $1, 'Attachment topic', 'en')",
    [ownerId],
  );
  await client.query(
    "insert into forum_posts (id, topic_id, author_id, current_revision_id) values ('attachment-post', 'attachment-topic', $1, 'attachment-body-rev')",
    [ownerId],
  );
  await client.query(
    "insert into forum_post_revisions (id, post_id, author_id, original_content, source_locale) values ('attachment-body-rev', 'attachment-post', $1, 'Attachment body', 'en')",
    [ownerId],
  );
  await client.query("commit");
});

afterAll(async () => {
  await client.query(`drop schema if exists ${schema} cascade`);
  await client.end();
});

describe("forum attachment lifecycle foundation", () => {
  it("creates an owner-private draft reference without forcing a server draft save", async () => {
    const created = await store.createDraftAttachment({
      id: attachmentId,
      ownerId,
      contextKey,
      draftId,
      objectKey: "private/8cd55954-9cb6-48fd-a42f-e4a5e85ae90c",
      fileName: "example.txt",
      declaredMime: "text/plain",
      detectedType: "text",
      responseMime: "text/plain; charset=utf-8",
      byteSize: 12,
      verificationStatus: "type-checked",
    });
    expect(created).toMatchObject({
      id: attachmentId,
      fileName: "example.txt",
      verificationStatus: "type-checked",
    });

    const draftRows = await client.query<{ count: string }>(
      "select count(*)::text as count from forum_editor_drafts",
    );
    expect(draftRows.rows[0]?.count).toBe("0");
    expect(await store.listDraftAttachments(ownerId, contextKey, draftId)).toHaveLength(1);
    expect(await store.listDraftAttachments(otherId, contextKey, draftId)).toEqual([]);
  });

  it("rolls back asset creation when the uploader identity does not exist", async () => {
    const id = "9ca389ff-e74a-4f61-89b2-67072d02686c";
    await expect(store.createDraftAttachment({
      id,
      ownerId: "missing-owner",
      contextKey,
      draftId,
      objectKey: "private/e8aff4de-a525-448a-a030-24034e67bdfa",
      fileName: "missing.txt",
      declaredMime: "text/plain",
      detectedType: "text",
      responseMime: "text/plain; charset=utf-8",
      byteSize: 1,
      verificationStatus: "type-checked",
    })).rejects.toMatchObject({ cause: { code: "23503" } });
    const rows = await client.query("select id from forum_attachments where id = $1", [id]);
    expect(rows.rowCount).toBe(0);
  });

  it("database-enforces draft-reference ownership", async () => {
    await expect(client.query(
      "insert into forum_attachment_draft_refs (attachment_id, owner_id, context_key, draft_id, created_at) values ($1, $2, $3, $4, now())",
      [attachmentId, otherId, contextKey, "c526541e-a1ff-4b80-bcbf-6b20ec30ce74"],
    )).rejects.toMatchObject({ code: "23503" } satisfies Partial<DatabaseError>);
  });

  it("allows draft and published references to coexist and protects shared assets from deletion", async () => {
    await client.query(
      "insert into forum_post_attachments (post_id, attachment_id, created_at) values ('attachment-post', $1, now())",
      [attachmentId],
    );

    await expect(client.query(
      "delete from forum_attachments where id = $1",
      [attachmentId],
    )).rejects.toMatchObject({ code: "23503" } satisfies Partial<DatabaseError>);

    await client.query("delete from forum_posts where id = 'attachment-post'");
    const postRefs = await client.query(
      "select 1 from forum_post_attachments where attachment_id = $1",
      [attachmentId],
    );
    expect(postRefs.rowCount).toBe(0);
    expect(await store.listDraftAttachments(ownerId, contextKey, draftId)).toHaveLength(1);

    expect(await store.removeDraftAttachment(ownerId, contextKey, draftId, attachmentId)).toBe(true);
    expect(await store.removeDraftAttachment(ownerId, contextKey, draftId, attachmentId)).toBe(false);
    const deleted = await client.query(
      "delete from forum_attachments where id = $1 returning id",
      [attachmentId],
    );
    expect(deleted.rows).toEqual([{ id: attachmentId }]);
  });
});
