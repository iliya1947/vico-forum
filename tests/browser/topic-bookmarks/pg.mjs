/** Disposable fixture/inspection process for connected Bookmarks acceptance. */
import process from "node:process";
import readline from "node:readline";
import console from "node:console";
import { URL } from "node:url";
import crypto from "node:crypto";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { DrizzleForumRepository } from "../../../db/forum-repository.ts";
import { HELP_SOLUTIONS_SERVICE_SECTION_ID } from "../../../db/forum-identifiers.ts";

const url = new URL(process.env.DATABASE_URL ?? "http://invalid");
if (process.env.CI !== "true" || !["localhost", "127.0.0.1"].includes(url.hostname)
  || url.pathname !== "/vico_bookmarks_browser_test")
  throw new Error("Own disposable Bookmarks browser database required");
const client = new pg.Client({ connectionString: url.toString() });
await client.connect();
const forum = new DrizzleForumRepository(drizzle(client), { cooldownMs: 0, now: () => new Date() });

async function createTopic(authorId, sectionId, title) {
  const id = crypto.randomUUID(), postId = crypto.randomUUID();
  await forum.createTopicWithInitialPost({
    id, sectionId, authorId,
    titleRevision: { id: crypto.randomUUID(), originalContent: title, sourceLocale: "en" },
    initialPost: { id: postId, topicId: id, authorId,
      bodyRevision: { id: crypto.randomUUID(), originalContent: "Bookmark fixture body", sourceLocale: "en" } },
  });
  return { id, postId, title };
}

console.log("READY");
try {
  for await (const line of readline.createInterface({ input: process.stdin, crlfDelay: Infinity })) {
    try {
      const input = JSON.parse(line);
      let result;
      if (input.operation === "sql") {
        result = (await client.query(input.sql, input.params ?? [])).rows;
      } else if (input.operation === "seed") {
        for (const [tag, direction, nativeName] of [
          ["ru", "ltr", "Русский"], ["he", "rtl", "עברית"],
        ]) {
          await client.query(
            "insert into locales(tag,translation_status,publication_status,direction,fallback_chain,aliases,match_tags,native_name,presentation_metadata) "
            + "values($1,'draft','active',$2,'{en}','{}','{}',$3,'{}') on conflict(tag) do nothing",
            [tag, direction, nativeName],
          );
        }
        await forum.createCategory({ id: input.prefix, name: "Bookmark acceptance category" });
        await forum.createSection({ id: input.prefix, categoryId: input.prefix, name: "Bookmark acceptance section" });
        const ordinary = [];
        for (let index = 0; index < 54; index++) {
          ordinary.push(await createTopic(input.author, input.prefix, "Original saved topic " + index));
        }
        const help = [
          await createTopic(input.author, HELP_SOLUTIONS_SERVICE_SECTION_ID, "Help duplicate question"),
          await createTopic(input.author, HELP_SOLUTIONS_SERVICE_SECTION_ID, "Help original question"),
        ];
        const deleted = await createTopic(input.inactiveAuthor, input.prefix, "Topic by retired author");
        await client.query("update forum_topics set is_closed=true,closure_version=1 where id=$1",
          [ordinary[1].id]);
        await client.query("update forum_topics set is_solved=true where id=$1", [ordinary[2].id]);
        await client.query(
          "insert into forum_help_duplicate_relationships(id,duplicate_topic_id,original_topic_id,confirmed_by_user_id) "
          + "values($1,$2,$3,$4)", [crypto.randomUUID(), help[0].id, help[1].id, input.author],
        );
        await client.query(
          "update \"user\" set deactivated_at=now(), deactivated_by_user_id=$1, "
          + "retain_at_least_until=now()+interval '2 years' where id=$1",
          [input.inactiveAuthor],
        );
        result = { ordinary, help, deleted };
      } else throw new Error("Unknown fixture operation");
      console.log(JSON.stringify({ result }));
    } catch (error) {
      console.log(JSON.stringify({ error: String(error) }));
    }
  }
} finally {
  await client.end();
}
