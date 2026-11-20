import { readFile, readdir } from "node:fs/promises";
import { Client, Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { appendVisibilityHistory } from "../../db/forum-history";
import { PostgresAdminHistoryReader } from "../../db/admin-history";

const url = process.env.DATABASE_URL!;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("Disposable loopback *_test DB required");
}
const schema = "visibility_history_append_test";
const client = new Client({ connectionString: url, options: "-c search_path=" + schema });
const pool = new Pool({ connectionString: url, options: "-c search_path=" + schema });
const db = drizzle(pool);
const reader = new PostgresAdminHistoryReader(pool);

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const filename of (await readdir("drizzle")).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort()) {
    await client.query((await readFile("drizzle/" + filename, "utf8")).replaceAll('"public".', `"${schema}".`));
  }
  await client.query(`insert into "user"(id,name,email)
    values('visibility-reviewer','Reviewer','reviewer@visibility.invalid')`);
});
afterAll(async () => {
  await pool.end();
  await client.query(`drop schema ${schema} cascade`);
  await client.end();
});

const topicId = "private-title-not-a-label";
const postId = "private-body-not-a-label";
const topic = {
  action: "topic.hidden" as const, targetType: "topic" as const, targetId: topicId,
  reason: "Spam hidden", context: {
    topicId, before: false, after: true, previousVersion: 0, version: 1,
    observedRevisionId: "topic-title-r1",
  },
};
const post = {
  action: "post.restored" as const, targetType: "post" as const, targetId: postId,
  reason: "Reviewed and restored", context: {
    topicId, postId, before: true, after: false, previousVersion: 1, version: 2,
    observedRevisionId: "post-body-r2",
  },
};

describe("visibility History atomic neutral append", () => {
  it("writes typed topic/post events with ID-only labels, reason and revision context", async () => {
    await db.transaction(async tx => {
      await appendVisibilityHistory(tx, "visibility-reviewer", topic);
      await appendVisibilityHistory(tx, "visibility-reviewer", post);
    });
    const { events } = await reader.read(undefined, 50);
    const topicEvent = events.find(event => event.change.action === "topic.hidden");
    const postEvent = events.find(event => event.change.action === "post.restored");
    expect(topicEvent?.change).toMatchObject({
      action: "topic.hidden", targetType: "topic", targetId: topicId,
      targetLabel: "topic:" + topicId, context: topic.context,
    });
    expect(postEvent?.change).toMatchObject({
      action: "post.restored", targetType: "post", targetId: postId,
      targetLabel: "post:" + postId, context: post.context,
    });
    expect(topicEvent?.reason).toBe(topic.reason);
    expect(postEvent?.reason).toBe(post.reason);
  });

  it("lets PostgreSQL reject a blank reason and rolls back the event", async () => {
    await expect(db.transaction(async tx =>
      appendVisibilityHistory(tx, "visibility-reviewer", {
        ...topic, targetId: "no-reason-event", reason: "   ",
      }),
    )).rejects.toThrow();
    const count = await client.query("select count(*)::int as n from admin_history where target_id='no-reason-event'");
    expect(count.rows[0]?.n).toBe(0);
  });

  it("rolls back an appended event with its enclosing transaction", async () => {
    await expect(db.transaction(async tx => {
      await appendVisibilityHistory(tx, "visibility-reviewer", {
        ...post, targetId: "rollback-event",
      });
      throw new Error("force-rollback");
    })).rejects.toThrow("force-rollback");
    const count = await client.query("select count(*)::int as n from admin_history where target_id='rollback-event'");
    expect(count.rows[0]?.n).toBe(0);
  });
});
