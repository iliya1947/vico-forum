/** Minimal dedicated Mute/Block fixture for real Worker/BA/PG17/Chromium acceptance. */
import crypto from "node:crypto";
import process from "node:process";
import readline from "node:readline";
import { URL } from "node:url";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { DrizzleForumRepository } from "../../../db/forum-repository.ts";

const url = new URL(process.env.DATABASE_URL ?? "https://invalid/");
if (process.env.CI !== "true"
  || !["localhost", "127.0.0.1"].includes(url.hostname)
  || url.pathname !== "/vico_filters_browser_test") {
  throw new Error("Dedicated disposable local Mute/Block test database required");
}
const client = new pg.Client({ connectionString: url.toString() });
await client.connect();
const forum = new DrizzleForumRepository(drizzle(client), { cooldownMs: 0, now: () => new Date() });
process.stdout.write("READY\n");
try {
  for await (const line of readline.createInterface({ input: process.stdin, crlfDelay: Infinity })) {
    try {
      const input = JSON.parse(line);
      let result;
      if (input.operation === "sql") {
        result = (await client.query(input.sql, input.params ?? [])).rows;
      } else if (input.operation === "seed") {
        const sectionId = input.prefix;
        await forum.createCategory({ id: sectionId, name: "Mute/Block browser acceptance" });
        await forum.createSection({ id: sectionId, categoryId: sectionId, name: "Mute/Block acceptance" });
        const topicId = crypto.randomUUID();
        await forum.createTopicWithInitialPost({
          id: topicId, sectionId, authorId: input.author,
          titleRevision: { id: crypto.randomUUID(), originalContent: "Personal filters smoke", sourceLocale: "en" },
          initialPost: { id: crypto.randomUUID(), topicId, authorId: input.author,
            bodyRevision: { id: crypto.randomUUID(), originalContent: "Public original post", sourceLocale: "en" } },
        });
        const otherTopicId = crypto.randomUUID();
        await forum.createTopicWithInitialPost({
          id: otherTopicId, sectionId, authorId: input.author,
          titleRevision: { id: crypto.randomUUID(), originalContent: "Unmuted comparison topic", sourceLocale: "en" },
          initialPost: { id: crypto.randomUUID(), topicId: otherTopicId, authorId: input.author,
            bodyRevision: { id: crypto.randomUUID(), originalContent: "Other public original", sourceLocale: "en" } },
        });
        result = { topicId, otherTopicId, authorId: input.author };
      } else if (input.operation === "seedFilterPages") {
        // A connected UI pagination fixture only: no application writer bypass
        // in acceptance assertions for actual Mute/Block actions.
        const count = input.count;
        if (!Number.isInteger(count) || count !== 50) throw new Error("Expected 50 extra pagination pairs");
        const topicIds = [];
        const topicNames = [];
        for (let i = 0; i < count; i++) {
          const id = crypto.randomUUID();
          const name = "Filter page topic " + String(i).padStart(3, "0");
          await forum.createTopicWithInitialPost({
            id, sectionId: input.sectionId, authorId: input.author,
            titleRevision: { id: crypto.randomUUID(), originalContent: name, sourceLocale: "en" },
            initialPost: { id: crypto.randomUUID(), topicId: id, authorId: input.author,
              bodyRevision: { id: crypto.randomUUID(), originalContent: "Public pagination fixture", sourceLocale: "en" } },
          });
          topicIds.push(id);
          topicNames.push(name);
        }
        const userIds = Array.from({ length: count }, (_, i) =>
          "filters-list-" + input.prefix + "-" + String(i).padStart(3, "0"));
        const userNames = userIds.map((_, i) => "Filter page user " + String(i).padStart(3, "0"));
        await client.query(
          'insert into "user"(id,name,email) select ids.id,ids.name,ids.id||\'@filters.test.invalid\' ' +
          'from unnest($1::text[],$2::text[]) as ids(id,name)',
          [userIds, userNames],
        );
        const timestamp = "2026-11-18T12:00:00.123Z";
        await client.query(
          "insert into forum_topic_mutes(user_id,topic_id,created_at) " +
          "select $1::text,ids.id,$2::timestamptz from unnest($3::text[]) as ids(id)",
          [input.actor, timestamp, topicIds],
        );
        await client.query(
          "insert into forum_user_blocks(user_id,blocked_user_id,created_at) " +
          "select $1::text,ids.id,$2::timestamptz from unnest($3::text[]) as ids(id)",
          [input.actor, timestamp, userIds],
        );
        result = { topicIds, topicNames, userIds, userNames };
      } else {
        throw new Error("Unknown Mute/Block fixture operation");
      }
      process.stdout.write(JSON.stringify({ result }) + "\n");
    } catch (error) {
      process.stdout.write(JSON.stringify({ error: String(error) }) + "\n");
    }
  }
} finally {
  await client.end();
}
