import { readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  DrizzleForumEditorDrafts,
  ForumEditorDraftContextNotFoundError,
} from "../../db/forum-editor-drafts";

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
  "0035_forum_attachments_foundation", "0036_forum_attachment_security_events",
  "0037_forum_attachment_draft_generations",
  "0044_attachment_draft_conflict_boundaries",
];
const id1 = "e7bdbd73-61d4-4b06-bc03-b24b1c217d55";
const id2 = "e7bdbd73-61d4-4b06-bc03-b24b1c217d56";
const id3 = "e7bdbd73-61d4-4b06-bc03-b24b1c217d57";
const text1 = { title: "first", body: "Draft **one**", tags: "typescript" };
const text2 = { title: "second", body: "Draft **two**", tags: "" };

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const tag of migrations) {
    await client.query((await readFile(`drizzle/${tag}.sql`, "utf8")).replaceAll('"public".', `"${schema}".`));
  }
  for (const id of ["draft-owner", "draft-other"]) {
    await client.query('insert into "user" (id, name, email) values ($1, $2, $3)', [id,id,`${id}@test.invalid`]);
  }
  await client.query(
    'insert into forum_categories (id, name) values ($1, $2)',
    ["draft-category", "Draft category"],
  );
  await client.query(
    'insert into forum_sections (id, category_id, name) values ($1, $2, $3)',
    ["draft/opaque:✓", "draft-category", "Opaque draft section"],
  );
});
afterAll(async () => { await client.query(`drop schema if exists ${schema} cascade`); await client.end(); });

describe("account-scoped durable editor drafts", () => {
  it("saves and retrieves only the requesting owner's context, with metadata not bodies", async () => {
    const saved = await store.save("draft-owner", "help:new", id1, text1, 0);
    expect(saved.outcome).toBe("saved");
    expect((await store.get("draft-other", "help:new"))).toBeNull();
    const list = await store.metadata("draft-owner");
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ contextKey: "help:new", version: 1, status: "active" });
    expect(JSON.stringify(list[0])).not.toContain('"payload"');
  });

  it("blocks conflicting versions and preserves both contents for explicit selection", async () => {
    const updated = await store.save("draft-owner", "help:new", id1, text2, 1);
    expect(updated.outcome).toBe("saved");
    expect((await store.save("draft-owner", "help:new", id1, text1, 1)).outcome).toBe("conflict");
    expect((await store.get("draft-owner", "help:new"))?.payload.body).toBe(text2.body);
    expect((await store.save("draft-owner", "help:new", id2, text1, 0)).outcome).toBe("gone");
  });

  it("published and deleted drafts cannot be overwritten by their stale IDs", async () => {
    await store.finish("draft-owner", "help:new", id1, "published");
    expect((await store.get("draft-owner", "help:new"))?.status).toBe("published");
    expect((await store.get("draft-owner", "help:new"))?.payload.body).toBe("");
    expect((await store.save("draft-owner", "help:new", id1, text1, 2)).outcome).toBe("gone");
    const marker = await store.get("draft-owner", "help:new");
    const next = await store.save("draft-owner", "help:new", id2, text1, marker!.version);
    expect(next.outcome).toBe("saved");
    await store.finish("draft-owner", "help:new", id1, "published");
    expect((await store.get("draft-owner", "help:new"))?.status).toBe("active");
    await store.finish("draft-owner", "help:new", id2, "deleted");
    expect((await store.save("draft-owner", "help:new", id2, text1, 0)).outcome).toBe("gone");
  });

  it("accepts opaque existing context ids and rejects fabricated new contexts", async () => {
    const key = "section:draft/opaque:✓:new";
    const marker = await store.get("draft-owner", key);
    const saved = await store.save("draft-owner", key, id1, text1, marker?.version ?? 0);
    expect(saved.outcome).toBe("saved");
    await expect(
      store.save("draft-owner", "section:missing/context:new", id2, text1, 0),
    ).rejects.toBeInstanceOf(ForumEditorDraftContextNotFoundError);
  });

  it("CAS-deletes only the server generation and version the user actually saw", async () => {
    const key = "section:draft/opaque:✓:new";
    const current = await store.get("draft-owner", key);
    expect(current?.status).toBe("active");
    expect(await store.delete("draft-owner", key, id1, current!.version + 1)).toBe(false);
    expect((await store.get("draft-owner", key))?.status).toBe("active");
    expect(await store.delete("draft-owner", key, id1, current!.version)).toBe(true);
    expect((await store.get("draft-owner", key))?.status).toBe("deleted");
  });

  it("expires server-stored edits after 30 days without modification", async () => {
    const key = "section:draft/opaque:✓:new";
    const marker = await store.get("draft-owner", key);
    const created = await store.save("draft-owner", key, id2, text1, marker!.version);
    expect(created.outcome).toBe("saved");
    await client.query(
      'update forum_editor_drafts set edited_at = now()-interval \'31 days\', updated_at = now()-interval \'31 days\' where owner_id = $1 and context_key = $2',
      ["draft-owner", key],
    );
    const expired = await store.metadata("draft-owner");
    expect(expired.find((draft) => draft.contextKey === key)?.status).toBe("deleted");
    expect((await store.get("draft-owner", key))?.payload.body).toBe("");
  });

  it("never lets terminal tombstones displace a valid active draft from metadata discovery", async () => {
    const key = "section:draft/opaque:✓:new";
    const marker = await store.get("draft-owner", key);
    const active = await store.save("draft-owner", key, id3, text2, marker!.version);
    expect(active.outcome).toBe("saved");
    await client.query(
      'update forum_editor_drafts set edited_at = now()-interval \'20 days\', updated_at = now()-interval \'20 days\' where owner_id = $1 and context_key = $2',
      ["draft-owner", key],
    );
    await client.query(`
      insert into forum_editor_drafts
        (owner_id, context_key, draft_id, version, status, payload, edited_at, updated_at)
      select
        'draft-owner',
        'terminal:' || value::text,
        'terminal-' || value::text,
        1,
        'published',
        '{"title":"","body":"","tags":""}'::jsonb,
        now() - (value::text || ' seconds')::interval,
        now() - (value::text || ' seconds')::interval
      from generate_series(1, 205) value
    `);
    await client.query(`
      insert into forum_editor_drafts
        (owner_id, context_key, draft_id, version, status, payload, edited_at, updated_at)
      values
        ('draft-owner', 'terminal:expired', 'terminal-expired', 1, 'published',
         '{"title":"","body":"","tags":""}'::jsonb,
         now() - interval '40 days', now() - interval '40 days')
    `);

    const metadata = await store.metadata("draft-owner");
    expect(metadata.find((draft) => draft.contextKey === key)).toMatchObject({
      status: "active",
      draftId: id3,
    });
    expect(metadata.filter((draft) => draft.contextKey.startsWith("terminal:"))).toHaveLength(205);
    expect(metadata.some((draft) => draft.contextKey === "terminal:expired")).toBe(false);
  });

  it("saves a new generation when the prior terminal tombstone is beyond the metadata window", async () => {
    const owner = "draft-other";
    const key = "section:draft/opaque:✓:new";
    expect((await store.save(owner, key, id1, text1, 0)).outcome).toBe("saved");
    expect(await store.finish(owner, key, id1, "deleted")).toBe(true);
    expect((await store.save(owner, key, id2, text2, 0)).outcome).toBe("gone");

    await client.query(
      "update forum_editor_drafts set edited_at=now()-interval '31 days', updated_at=now()-interval '31 days' where owner_id=$1 and context_key=$2",
      [owner, key],
    );
    expect((await store.metadata(owner)).some((row) => row.contextKey === key)).toBe(false);
    expect(await store.get(owner, key)).toMatchObject({ draftId: id1, version: 2, status: "deleted" });

    // A fresh editor sees no metadata and sends the normal expectedVersion:0.
    expect(await store.save(owner, key, id2, text2, 0)).toMatchObject({
      outcome: "saved", draft: { draftId: id2, version: 3, status: "active", payload: text2 },
    });
    expect((await store.save(owner, key, id1, text1, 2)).outcome).toBe("gone");
  });

  it("keeps previously retired generations closed even with the latest different terminal CAS", async () => {
    expect((await store.save("draft-other", "help:new", id1, text1, 0)).outcome).toBe("saved");
    expect(await store.finish("draft-other", "help:new", id1, "deleted")).toBe(true);
    expect((await store.save("draft-other", "help:new", id2, text2, 2)).outcome).toBe("saved");
    expect(await store.finish("draft-other", "help:new", id2, "published")).toBe(true);
    expect(await store.save("draft-other", "help:new", id1, text1, 4)).toEqual({ outcome: "gone", version: 4 });
    expect(await store.get("draft-other", "help:new")).toMatchObject({
      draftId: id2, version: 4, status: "published", payload: { title: "", body: "", tags: "" },
    });
  });
});
