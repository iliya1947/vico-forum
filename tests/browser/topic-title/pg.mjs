/** Disposable fixture/inspection process for the actual Worker browser acceptance. */
import process from "node:process";
import console from "node:console";
import readline from "node:readline";
import { URL } from "node:url";
import crypto from "node:crypto";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { DrizzleForumRepository } from "../../../db/forum-repository.ts";
import { HELP_SOLUTIONS_SERVICE_SECTION_ID } from "../../../db/forum-identifiers.ts";

const url = new URL(process.env.DATABASE_URL ?? "http://invalid");
if (process.env.CI !== "true" || !["localhost", "127.0.0.1"].includes(url.hostname)
  || url.pathname !== "/vico_title_browser_test") throw new Error("Own disposable browser database required");
const client = new pg.Client({ connectionString: url.toString() });
await client.connect();
const forum = new DrizzleForumRepository(drizzle(client), { cooldownMs: 0, now: () => new Date() });
console.log("READY");
try {
  for await (const line of readline.createInterface({ input: process.stdin, crlfDelay: Infinity })) {
    try {
      const input = JSON.parse(line);
      let result;
      if (input.operation === "sql") result = (await client.query(input.sql, input.params ?? [])).rows;
      else if (input.operation === "seed") {
        await client.query(`insert into locales(tag,translation_status,publication_status,direction,fallback_chain,aliases,match_tags,native_name,presentation_metadata)
          values('he','draft','active','rtl','{en}','{}','{}','עברית','{}') on conflict(tag) do nothing`);
        await forum.createCategory({ id: input.prefix, name: "Title acceptance" });
        await forum.createSection({ id: input.prefix, categoryId: input.prefix, name: "Title acceptance" });
        result = [];
        for (const sectionId of [input.prefix, HELP_SOLUTIONS_SERVICE_SECTION_ID]) {
          const topicId = crypto.randomUUID(), postId = crypto.randomUUID(), revisionId = crypto.randomUUID();
          await forum.createTopicWithInitialPost({ id: topicId, sectionId, authorId: input.author,
            titleRevision: { id: revisionId, originalContent: "Original " + topicId, sourceLocale: "en" },
            initialPost: { id: postId, topicId, authorId: input.author,
              bodyRevision: { id: crypto.randomUUID(), originalContent: "First message remains unchanged", sourceLocale: "en" } },
          });
          result.push({ topicId, postId, revisionId, sectionId });
        }
      } else throw new Error("Unknown fixture operation");
      console.log(JSON.stringify({ result }));
    } catch (error) { console.log(JSON.stringify({ error: String(error) })); }
  }
} finally { await client.end(); }
