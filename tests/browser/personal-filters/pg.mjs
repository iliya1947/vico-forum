/** Minimal dedicated Mute/Block fixture for real Worker/BA/PG17/Chromium acceptance. */
import crypto from "node:crypto";
import process from "node:process";
import readline from "node:readline";
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
console.log("READY");
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
      } else {
        throw new Error("Unknown Mute/Block fixture operation");
      }
      console.log(JSON.stringify({ result }));
    } catch (error) {
      console.log(JSON.stringify({ error: String(error) }));
    }
  }
} finally {
  await client.end();
}
