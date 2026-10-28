import { readdir, readFile } from "node:fs/promises";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeAll, expect, it } from "vitest";
import { RouterContextProvider } from "react-router";
import { authSessionContext } from "../../app/auth/request-context";
import { authorizationContext } from "../../app/authorization/request-context";
import { forumWriterContext } from "../../app/forum/request-context";
import { helpSolutionsCategoryAction, sectionAction, topicAction } from "../../app/forum/actions.server";
import { parseForumMarkdown } from "../../app/markdown-syntax";
import { DrizzleForumRepository } from "../../db/forum-repository";
import { createHyperdriveForumWriter } from "../../db/hyperdrive-forum";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const url = new URL(databaseUrl);
if (!["localhost", "127.0.0.1"].includes(url.hostname) || !url.pathname.endsWith("_test")) {
  throw new Error("Disposable local test database required");
}
const schema = "forum_markdown_publication_test";
const connection = () => new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
const client = connection();
const policy = { cooldownMs: 0, now: () => new Date() };
const repository = new DrizzleForumRepository(drizzle(client), policy);
const context = new RouterContextProvider();
context.set(authSessionContext, { user: { id: "markdown-author" } } as never);
context.set(authorizationContext, { forUser: () => ({ has: async () => true }) } as never);
context.set(forumWriterContext, createHyperdriveForumWriter(databaseUrl, connection, policy));

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const file of (await readdir("drizzle")).filter((file) => /^\d{4}_.+\.sql$/u.test(file)).sort()) {
    await client.query((await readFile(`drizzle/${file}`, "utf8")).replaceAll('"public".', `"${schema}".`));
  }
  for (const id of ["markdown-author", "markdown-label", "markdown-quote", "markdown-body", "markdown-cell"]) {
    await client.query('insert into "user" (id, name, email) values ($1, $1, $2)', [id, `${id}@test.invalid`]);
  }
  await repository.createCategory({ id: "markdown-category", name: "Markdown" });
  await repository.createSection({ id: "markdown-section", categoryId: "markdown-category", name: "Markdown" });
});

afterAll(async () => {
  await client.query(`drop schema if exists ${schema} cascade`);
  await client.end();
});

function request(path: string, fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return new Request("https://forum.test" + path, {
    method: "POST", headers: { Origin: "https://forum.test" }, body: form,
  });
}

it.each(["section", "help"])("preserves indented code and trailing whitespace through native %s publication and reply", async (kind) => {
  const source = "    const first = 1;\r\n    const second = 2;\r\n\r\nTrailing spaces  \r\n";
  const fields = { title: "Code", body: source, editorOperationId: crypto.randomUUID(), editorAttachmentIds: "[]" };
  const publish = () => kind === "section"
    ? sectionAction({ request: request("/en/sections/markdown-section", fields), params: { locale: "en", sectionId: "markdown-section" }, context })
    : helpSolutionsCategoryAction({ request: request("/en/categories/help-solutions", { ...fields, intent: "createHelpQuestion" }), params: { locale: "en", categoryId: "help-solutions" }, context });
  const response = await publish();
  expect(response).toBeInstanceOf(Response);
  if (!(response instanceof Response)) throw new Error("Expected redirect");
  expect(response.status).toBe(302);
  const topicId = response.headers.get("Location")!.split("/").at(-1)!;
  const first = (await repository.readTopicPage(topicId))!.posts[0]!;
  expect(first.body.originalContent).toBe(source);
  expect(parseForumMarkdown(first.body.originalContent).children[0]?.type).toBe("code");
  const replay = await publish() as Response;
  expect(replay.headers.get("Location")).toBe(response.headers.get("Location"));
  const reply = await topicAction({
    request: request(`/en/topics/${topicId}`, { ...fields, intent: "reply", editorOperationId: crypto.randomUUID() }),
    params: { locale: "en", topicId }, context,
  });
  expect(reply).toBeInstanceOf(Response);
  const posts = (await repository.readTopicPage(topicId))!.posts;
  expect(posts).toHaveLength(2);
  expect(posts[1]!.body.originalContent).toBe(source);
  expect(parseForumMarkdown(posts[1]!.body.originalContent).children[0]?.type).toBe("code");
});

it("creates notifications only for links rendered in spoiler bodies and nonquoted table cells", async () => {
  const writer = createHyperdriveForumWriter(databaseUrl, connection, policy);
  const { topicId } = await writer.createTopic({ sectionId: "markdown-section", authorId: "markdown-author", title: "Mentions", body: "Original" });
  const { postId } = await writer.createReply({ topicId, authorId: "markdown-author", body: [
    ":::spoiler [Label](/en/users/markdown-label)", "[Body](/en/users/markdown-body)", ":::", "",
    "| A | B |", "| --- | --- |", "| > [Quote](/en/users/markdown-quote) | [Cell](/en/users/markdown-cell) |",
  ].join("\n") });
  const rows = await client.query<{ recipient_user_id: string; kind: string }>(
    "select recipient_user_id, kind from forum_reply_notifications where post_id = $1 order by recipient_user_id", [postId],
  );
  expect(rows.rows).toEqual([
    { recipient_user_id: "markdown-body", kind: "mention" },
    { recipient_user_id: "markdown-cell", kind: "mention" },
  ]);
});
