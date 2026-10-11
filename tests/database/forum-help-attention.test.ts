import { readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DrizzleForumRepository } from "../../db/forum-repository";
import { HELP_SOLUTIONS_SERVICE_SECTION_ID } from "../../db/forum-identifiers";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const parsed = new URL(url);
if (!["localhost", "127.0.0.1"].includes(parsed.hostname) || !parsed.pathname.endsWith("_test")) {
  throw new Error("Attention integration tests require a disposable local *_test database");
}

const schema = "forum_help_attention_test";
const client = new Client({ connectionString: url, options: `-c search_path=${schema}` });
const migrations = [
  "0000_tan_johnny_storm.sql",
  "0001_seed-locales.sql",
  "0002_ui_translation_storage.sql",
  "0003_gorgeous_donald_blake.sql",
  "0004_forum_domain_foundation.sql",
  "0005_calm_proemial_gods.sql",
  "0006_loving_sentinels.sql",
  "0018_source_locale_correction_permissions.sql",
  "0020_translation_generation_permission.sql",
  "0021_forum_tags.sql",
  "0022_forum_reply_relationships.sql",
  "0024_forum_reply_notifications.sql",
  "0025_forum_topic_pins.sql",
  "0026_best_answer_independent_from_solved.sql",
  "0027_help_solutions_foundation.sql",
  "0028_help_solution_moderation.sql",
  "0029_help_question_needs_details.sql",
  "0030_help_duplicate_workflow.sql",
  "0031_help_user_moderation_signals.sql",
] as const;
let clock = Date.parse("2026-10-01T00:00:00Z");
const forum = new DrizzleForumRepository(drizzle(client), {
  cooldownMs: 5000,
  now: () => new Date(clock += 5001),
});

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  await client.query(`set search_path to ${schema}`);
  for (const name of migrations) {
    const statement = (await readFile(`drizzle/${name}`, "utf8"))
      .replaceAll('"public".', `"${schema}".`);
    await client.query(statement);
  }
  for (const id of ["author", "reporter", "manager"]) {
    await client.query(
      `insert into "user" (id, name, email, email_verified, created_at, updated_at)
       values ($1, $1, $2, true, now(), now())`,
      [id, `${id}@example.test`],
    );
  }
  for (const id of ["unanswered", "single", "mixed", "appeal"]) {
    await forum.createTopicWithInitialPost({
      id,
      sectionId: HELP_SOLUTIONS_SERVICE_SECTION_ID,
      authorId: "author",
      titleRevision: { id: `${id}-title`, originalContent: `Question ${id}`, sourceLocale: "en" },
      initialPost: {
        id: `${id}-post`,
        topicId: id,
        authorId: "author",
        bodyRevision: { id: `${id}-body`, originalContent: `Details for ${id}`, sourceLocale: "en" },
      },
    });
  }
  await client.query(`
    insert into forum_help_signals
      (id, kind, topic_id, submitted_by_user_id, explanation, proposed_original_topic_id)
    values
      ('s1', 'needs-details', 'single', 'reporter', 'Please clarify', null),
      ('s2', 'needs-details', 'mixed', 'reporter', 'Need details', null),
      ('s3', 'duplicate', 'mixed', 'manager', null, 'unanswered')
  `);
  await client.query(`
    insert into forum_help_duplicate_relationships
      (id, duplicate_topic_id, original_topic_id, confirmed_by_user_id)
    values ('d1', 'mixed', 'unanswered', 'manager'),
           ('d2', 'appeal', 'unanswered', 'manager')
  `);
  await client.query(`
    insert into forum_help_duplicate_appeals
      (id, relationship_id, appellant_user_id, explanation)
    values ('a1', 'd1', 'author', 'I dispute this duplicate'),
           ('a2', 'd2', 'author', 'Please review the decision')
  `);
});

afterAll(async () => {
  await client.query("set search_path to public");
  await client.query(`drop schema if exists ${schema} cascade`);
  await client.end();
});

describe("Help moderator attention queue", () => {
  const all = {
    signalKinds: ["needs-details", "needs-review", "solution-outdated", "duplicate"] as const,
    appeals: true,
  };

  it("selects pending cases, duplicates mixed questions across groups and excludes merely unanswered topics", async () => {
    const page = await forum.readHelpSolutionsNeedsAttention({}, all);
    expect(page?.questions.map((question) => question.id).sort()).toEqual(["appeal", "mixed", "single"]);
    expect(page?.questions.some((question) => question.id === "unanswered")).toBe(false);
    expect(page?.questions.find((question) => question.id === "single")?.attention).toEqual({
      signals: { "needs-details": 1 },
      totalSignals: 1,
      appeal: false,
    });
    expect(page?.questions.find((question) => question.id === "mixed")?.attention).toEqual({
      signals: { "needs-details": 1, duplicate: 1 },
      totalSignals: 2,
      appeal: true,
    });
    expect(page?.questions.find((question) => question.id === "appeal")?.attention).toEqual({
      signals: {},
      totalSignals: 0,
      appeal: true,
    });
  });

  it("isolates inaccessible signal types and appeals by effective moderation permission", async () => {
    const details = await forum.readHelpSolutionsNeedsAttention({}, { signalKinds: ["needs-details"], appeals: false });
    expect(details?.questions.map((question) => question.id).sort()).toEqual(["mixed", "single"]);
    expect(details?.questions.find((question) => question.id === "mixed")?.attention).toEqual({
      signals: { "needs-details": 1 }, totalSignals: 1, appeal: false,
    });

    const appeals = await forum.readHelpSolutionsNeedsAttention({}, { signalKinds: [], appeals: true });
    expect(appeals?.questions.map((question) => question.id).sort()).toEqual(["appeal", "mixed"]);
    expect(appeals?.questions.find((question) => question.id === "mixed")?.attention).toEqual({
      signals: {}, totalSignals: 0, appeal: true,
    });
    expect((await forum.readHelpSolutionsNeedsAttention({}, { signalKinds: [], appeals: false }))?.questions).toEqual([]);
  });

  it("returns full individual case records and preserves moderator visibility", async () => {
    const details = await forum.readHelpAttentionCases("needs-details", all);
    expect(details.cases.map(({ id }) => id)).toEqual(["s1", "s2"]);
    expect(details.cases[0]).toMatchObject({
      type: "signal", id: "s1", kind: "needs-details",
      submittedByUserId: "reporter", submittedByName: "reporter",
      topicId: "single", topicTitle: "Question single", explanation: "Please clarify",
      targetPostId: null, original: null,
    });
    expect(details.hasMore).toBe(false);
    expect(details.cases[0]?.createdAt).toBeInstanceOf(Date);

    const duplicate = await forum.readHelpAttentionCases("duplicate", all);
    expect(duplicate.cases).toHaveLength(1);
    expect(duplicate.cases[0]).toMatchObject({
      type: "signal", id: "s3", kind: "duplicate",
      submittedByUserId: "manager",
      original: { id: "unanswered", title: "Question unanswered" },
    });

    const appeals = await forum.readHelpAttentionCases("appeals", all);
    expect(appeals.cases.map(({ id }) => id)).toEqual(["a1", "a2"]);
    expect(appeals.cases[0]).toMatchObject({
      type: "appeal", kind: "appeal", submittedByUserId: "author",
      explanation: "I dispute this duplicate",
      original: { id: "unanswered", title: "Question unanswered" },
    });

    const mixed = await forum.readHelpAttentionCases("mixed", all);
    expect(mixed.cases.map(({ id }) => id)).toEqual(["s2", "s3"]);
    expect((await forum.readHelpAttentionCases("mixed", {
      signalKinds: ["needs-details"], appeals: false,
    })).cases).toEqual([]);
    expect((await forum.readHelpAttentionCases("duplicate", {
      signalKinds: ["needs-details"], appeals: true,
    })).cases).toEqual([]);
    expect((await forum.readHelpAttentionCases("appeals", {
      signalKinds: ["duplicate"], appeals: false,
    })).cases).toEqual([]);
    expect((await forum.readHelpAttentionCases("needs-review", {
      signalKinds: [], appeals: false,
    })).cases).toEqual([]);
    await expect(forum.readHelpAttentionCases("needs-details", all, -1))
      .rejects.toThrow(RangeError);
  });

  it("honors combined filters before attention selection and drops resolved tasks", async () => {
    expect((await forum.readHelpSolutionsNeedsAttention({ solution: "solved" }, all))?.questions).toEqual([]);
    await client.query(`
      update forum_help_signals
      set status = 'rejected', resolved_by_user_id = 'manager', resolved_at = now()
      where id = 's1'
    `);
    await client.query(`
      update forum_help_duplicate_appeals
      set status = 'rejected', resolved_by_user_id = 'manager', resolved_at = now()
      where id = 'a2'
    `);
    const remaining = await forum.readHelpSolutionsNeedsAttention({}, all);
    expect(remaining?.questions.map((question) => question.id)).toEqual(["mixed"]);
  });

  it("keeps authoritative Needs review distinct from user submissions", async () => {
    await forum.createTopicWithInitialPost({
      id: "review",
      sectionId: HELP_SOLUTIONS_SERVICE_SECTION_ID,
      authorId: "author",
      titleRevision: { id: "review-title", originalContent: "Review solution", sourceLocale: "en" },
      initialPost: {
        id: "review-question", topicId: "review", authorId: "author",
        bodyRevision: { id: "review-question-body", originalContent: "Question", sourceLocale: "en" },
      },
    });
    await forum.createPost({
      id: "review-answer", topicId: "review", authorId: "manager",
      bodyRevision: { id: "review-answer-body", originalContent: "Answer", sourceLocale: "en" },
    });
    await forum.selectBestAnswer("review", "review-answer", "author");
    await forum.markTopicSolved("review", "author");
    await forum.setHelpSolutionModeration("review", "needs-review", null, "manager");

    const queue = await forum.readHelpAttentionCases("needs-review", all);
    expect(queue.cases).toContainEqual(expect.objectContaining({
      type: "review-status", kind: "review-status", id: "review-answer",
      topicId: "review", topicTitle: "Review solution",
      submittedByUserId: null, submittedByName: null,
      explanation: null, targetPostId: "review-answer",
    }));
    expect((await forum.readHelpAttentionCases("needs-review", {
      signalKinds: ["duplicate"], appeals: true,
    })).cases).toEqual([]);
  });

  it("pages individual signals after filtering by the selected group", async () => {
    await client.query(`
      insert into "user" (id, name, email, email_verified, created_at, updated_at)
      select 'batch-' || n, 'Batch ' || n, 'batch-' || n || '@example.test', true, now(), now()
      from generate_series(1, 53) as n
    `);
    await client.query(`
      insert into forum_help_signals (id, kind, topic_id, submitted_by_user_id, explanation)
      select 'batch-signal-' || n, 'needs-details', 'unanswered', 'batch-' || n, 'Please clarify'
      from generate_series(1, 53) as n
    `);
    const first = await forum.readHelpAttentionCases("needs-details", all);
    const second = await forum.readHelpAttentionCases("needs-details", all, 1);
    expect(first.cases).toHaveLength(50);
    expect(first.hasMore).toBe(true);
    expect(second.cases).toHaveLength(4);
    expect(second.hasMore).toBe(false);
    expect(new Set([...first.cases, ...second.cases].map(({ id }) => id)).size).toBe(54);
    const mixed = await forum.readHelpAttentionCases("mixed", all);
    expect(mixed.cases.filter(({ topicId }) => topicId === "unanswered")).toHaveLength(53);
  });
});
