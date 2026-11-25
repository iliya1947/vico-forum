/**
 * B8-B2: actual built Worker + Better Auth + PostgreSQL17 + local-only R2.
 * Run exclusively with the disposable SA04-K5 CI preview and its Miniflare R2.
 * No production bucket, remote binding, mocked Worker routes, or browser.
 */
import assert from "node:assert/strict";
import { signupConnectedVerifiedSession } from "../tests/database/verified-credential-fixture";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { getPlatformProxy } from "wrangler";
import { DrizzleForumRepository } from "../db/forum-repository";

const connectionString = process.env.DATABASE_URL;
if (process.env.CI !== "true" || !connectionString) throw new Error("Disposable CI PostgreSQL required");
const database = new URL(connectionString);
if (!["127.0.0.1", "localhost"].includes(database.hostname)
  || !database.pathname.endsWith("_test")) throw new Error("Loopback *_test database required");
const configPath = resolve("wrangler.jsonc");
const config = JSON.parse(await readFile(configPath, "utf8")) as {
  main?: string;
  r2_buckets?: Array<{ binding: string; bucket_name: string; remote?: boolean }>;
};
if (config.main !== "./tests/browser/sa04-attachments/worker-entry.ts"
  || config.r2_buckets?.length !== 1
  || config.r2_buckets[0]?.binding !== "ATTACHMENT_R2"
  || config.r2_buckets[0]?.bucket_name !== "sa04-k5-local-attachments"
  || config.r2_buckets[0]?.remote !== false) {
  throw new Error("B8-B2 requires the established CI-only local R2 Worker configuration");
}

const base = "http://127.0.0.1:4205";
const client = new Client({ connectionString });
const proxy = await getPlatformProxy<{ ATTACHMENT_R2: R2Bucket }>({
  configPath, persist: true, remoteBindings: false,
});
const bucket = proxy.env.ATTACHMENT_R2;
type Actor = { id: string; cookie: string };
type Attachment = { id: string; key: string; fileName: string; bytes: Uint8Array;
  detectedType: string; responseMime: string };

async function http(path: string, init: RequestInit = {}, cookie?: string) {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("Cookie", cookie);
  return fetch(base + path, { ...init, headers, redirect: "manual", signal: AbortSignal.timeout(15000) });
}
async function form(path: string, actor: Actor, fields: Record<string, string>) {
  return http(path, { method: "POST", headers: {
    Origin: base, "Content-Type": "application/x-www-form-urlencoded",
  }, body: new URLSearchParams(fields) }, actor.cookie);
}
function check(response: Response, status: number, label: string) {
  assert.equal(response.status, status, label + " HTTP status");
  const cache = (response.headers.get("Cache-Control") ?? "").toLowerCase();
  assert.match(cache, /\bprivate\b/, label + " cache privacy");
  assert.match(cache, /\bno-store\b/, label + " cache disablement");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff", label + " nosniff");
}
async function content(response: Response, attachment: Attachment, label: string,
  mode: "download" | "inline" | "text") {
  check(response, 200, label);
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.deepEqual(bytes, attachment.bytes, label + " real local R2 bytes");
  assert.equal(response.headers.get("Content-Security-Policy"), "sandbox", label + " sandbox");
  assert.equal(response.headers.get("Content-Type"), mode === "inline" ? "image/png"
    : mode === "text" ? "text/plain; charset=utf-8" : "application/octet-stream");
  const disposition = response.headers.get("Content-Disposition") ?? "";
  assert.ok(mode === "download" ? disposition.startsWith("attachment;") && disposition.includes(attachment.fileName)
    : disposition === "inline", label + " disposition");
}
async function denied(response: Response, status: number, label: string) {
  check(response, status, label);
  assert.equal((await response.arrayBuffer()).byteLength, 0, label + " no hidden bytes");
  assert.equal(response.headers.get("Content-Disposition"), null, label + " no filename");
}
async function deniedComplaintEvidence(response: Response, attachment: Attachment) {
  // Existing Complaint authorization errors are generic private text/HTML,
  // rather than empty attachment-resource failures. Do not impose the
  // visibility-private-resource failure shape on this separate domain.
  assert.equal(response.status, 403, "ordinary actor protected Complaint evidence");
  const cache = (response.headers.get("Cache-Control") ?? "").toLowerCase();
  assert.match(cache, /\bprivate\b/);
  assert.match(cache, /\bno-store\b/);
  assert.equal(response.headers.get("Content-Disposition"), null);
  const body = await response.text();
  assert.ok(!body.includes(attachment.fileName), "no private filename in Complaint denial");
  assert.ok(!body.includes(new TextDecoder().decode(attachment.bytes)),
    "no private R2 bytes in Complaint denial");
}
async function signup(label: string): Promise<Actor> {
  const response = await signupConnectedVerifiedSession(client,
    async req => http(new URL(req.url).pathname, {method:req.method,headers:req.headers,body:await req.text()}),
    new Request(base+"/api/auth/sign-up/email", {
    method: "POST", headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "B8-B2 " + label, email: label + "-" + randomUUID() + "@b8.invalid",
      password: "B8-B2-test-" + randomBytes(12).toString("hex") }),
  }));
  assert.equal(response.status, 200, label + " Better Auth signup");
  const cookie = response.headers.getSetCookie().find(x => x.includes("session_token"))?.split(";")[0];
  assert.ok(cookie, label + " live Better Auth session token");
  const session = await http("/api/auth/get-session", {}, cookie);
  assert.equal(session.status, 200, label + " Better Auth session read");
  const user = await session.json() as { user?: { id?: string } };
  assert.ok(user.user?.id, label + " real actor");
  return { id: user.user.id, cookie };
}
async function metadata(attachment: Attachment, ownerId: string, postIds: string[]) {
  await bucket.put(attachment.key, attachment.bytes, {
    httpMetadata: { contentType: "application/octet-stream" },
  });
  assert.equal((await bucket.head(attachment.key))?.size, attachment.bytes.byteLength,
    "B8-B2 local bucket must retain the seeded payload");
  await client.query(
    "insert into forum_attachments " +
      "(id,owner_id,object_key,file_name,declared_mime,detected_type,response_mime,byte_size," +
      "verification_status,created_at) values ($1,$2,$3,$4,$5,$6,$7,$8,'type-checked',now())",
    [attachment.id, ownerId, attachment.key, attachment.fileName,
      attachment.detectedType === "text" ? "text/plain" : "image/png",
      attachment.detectedType, attachment.responseMime, attachment.bytes.byteLength],
  );
  for (const postId of postIds) {
    await client.query("insert into forum_post_attachments(post_id,attachment_id,created_at) " +
      "values ($1,$2,now())", [postId, attachment.id]);
  }
}
function publicFile(attachmentId: string, postId: string, view?: "inline" | "text") {
  return "/api/attachments/file/" + attachmentId + "?post=" + postId +
    (view ? "&view=" + view : "");
}
function privateFile(topicId: string, postId: string, attachmentId: string, view?: string) {
  return "/en/admin/forum/topics/" + topicId + "/posts/" + postId +
    "/attachments/" + attachmentId + (view ? "?view=" + view : "");
}
function visibility(kind: "topic" | "post", hidden: boolean, version: number,
  titleId: string, postId: string, bodyId: string, moderator: Actor) {
  return {
    intent: kind === "topic" ? "setTopicVisibility" : "setPostVisibility",
    editorActorId: moderator.id, hidden: String(hidden),
    expectedVisibilityVersion: String(version),
    expectedRevisionId: kind === "topic" ? titleId : bodyId,
    ...(kind === "post" ? { postId } : {}),
    reason: "B8-B2 local R2 membership and visibility",
  };
}
async function acceptedVisibility(topicId: string, moderator: Actor,
  fields: Record<string, string>, hidden: boolean, kind: "topic" | "post", version: number) {
  const response = await form("/en/topics/" + topicId, moderator, fields);
  // Topic Hide document POST returns 404 after committing; post transitions
  // and restores return private 200 (the unchanged B7 Worker contract).
  if (kind === "topic" && hidden) {
    assert.equal(response.status, 404, "topic Hide commits then neutral document 404");
  } else {
    assert.equal(response.status, 200, kind + " visibility document POST");
  }
  await response.arrayBuffer();
  const table = kind === "topic" ? "forum_topics" : "forum_posts";
  const target = kind === "topic" ? topicId : fields.postId!;
  const row = (await client.query<{ is_hidden: boolean; visibility_version: number }>(
    "select is_hidden,visibility_version from " + table + " where id=$1", [target],
  )).rows[0];
  assert.deepEqual(row, { is_hidden: hidden, visibility_version: version },
    "Actual Worker visibility CAS committed");
}

async function main() {
  await client.connect();
  const [author, moderator, ordinary] = await Promise.all([
    signup("author"), signup("moderator"), signup("ordinary"),
  ]);
  for (const actor of [author, moderator, ordinary]) {
    await client.query("insert into authz_user_roles(user_id,role_id) " +
      "values ($1,$2) on conflict do nothing",
    [actor.id, actor.id === moderator.id ? "builtin-moderator" : "builtin-user"]);
  }

  const forum = new DrizzleForumRepository(drizzle(client), {
    cooldownMs: 0, now: () => new Date(),
  });
  const categoryId = randomUUID(), sectionId = randomUUID();
  await forum.createCategory({ id: categoryId, name: "B8-B2 local R2 fixture" });
  await forum.createSection({ id: sectionId, categoryId, name: "B8-B2 local section" });
  async function topic() {
    const topicId = randomUUID(), titleId = randomUUID(), postId = randomUUID(), bodyId = randomUUID();
    await forum.createTopicWithInitialPost({
      id: topicId, sectionId, authorId: author.id,
      titleRevision: { id: titleId, originalContent: "B8-B2 title " + randomUUID(), sourceLocale: "en" },
      initialPost: { id: postId, topicId, authorId: author.id,
        bodyRevision: { id: bodyId, originalContent: "B8-B2 visible post " + randomUUID(), sourceLocale: "en" } },
    });
    return { topicId, titleId, postId, bodyId };
  }
  const primary = await topic();
  const secondary = await topic();
  const textBytes = new TextEncoder().encode("B8-B2-local-R2-payload-" + randomUUID());
  const imageBytes = new Uint8Array(Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/mXcAAAAASUVORK5CYII=",
    "base64",
  ));
  const text: Attachment = {
    id: randomUUID(), key: "private/" + randomUUID(),
    fileName: "B8-B2-private-" + randomUUID() + ".txt", bytes: textBytes,
    detectedType: "text", responseMime: "text/plain",
  };
  const image: Attachment = {
    id: randomUUID(), key: "private/" + randomUUID(),
    fileName: "B8-B2-image-" + randomUUID() + ".png", bytes: imageBytes,
    detectedType: "png", responseMime: "image/png",
  };
  await metadata(text, author.id, [primary.postId, secondary.postId]);
  await metadata(image, author.id, [primary.postId]);

  const draftId = randomUUID(), contextKey = "post:" + primary.postId + ":edit";
  await client.query(
    "insert into forum_attachment_draft_refs(attachment_id,owner_id,context_key,draft_id,created_at) " +
      "values ($1,$2,$3,$4,now())", [text.id, author.id, contextKey, draftId],
  );
  const draftPath = "/api/attachments/file/" + text.id + "?operation=" + draftId +
    "&context=" + encodeURIComponent(contextKey);

  const report = await form("/en/topics/" + primary.topicId + "/complaints", ordinary, {
    kind: "post", postId: primary.postId, revisionId: primary.bodyId,
    reason: "spam", operationId: randomUUID(),
  });
  assert.equal(report.status, 200, "Actual Worker Complaint submission before Hide");
  const row = (await client.query<{ id: string }>(
    "select c.id from forum_complaint_cases c " +
      "join forum_complaint_targets t on t.id=c.target_id " +
      "where t.post_id=$1 and t.post_revision_id=$2", [primary.postId, primary.bodyId],
  )).rows[0];
  assert.ok(row, "Complaint Case must retain exact published attachment evidence");
  const evidencePath = "/en/attention/complaints/" + row.id + "/evidence/" + text.id;

  await content(await http(publicFile(text.id, primary.postId)), text, "visible public download", "download");
  await content(await http(publicFile(text.id, primary.postId, "text")), text,
    "visible plain-text preview", "text");
  await denied(await http(publicFile(text.id, primary.postId, "inline")), 404,
    "text is never rendered as image");
  await content(await http(publicFile(image.id, primary.postId, "inline")), image,
    "visible raster inline", "inline");
  await denied(await http(publicFile(image.id, primary.postId, "text")), 404,
    "image is never rendered as text");
  await content(await http(draftPath, {}, author.cookie), text,
    "owner draft reference", "download");
  await denied(await http(draftPath), 401, "guest draft reference");
  await denied(await http(draftPath, {}, ordinary.cookie), 404, "foreign draft reference");
  await content(await http(evidencePath, {}, moderator.cookie), text,
    "private Complaint evidence before Hide", "download");
  await deniedComplaintEvidence(await http(evidencePath, {}, ordinary.cookie), text);

  await acceptedVisibility(primary.topicId, moderator,
    visibility("post", true, 0, primary.titleId, primary.postId, primary.bodyId, moderator),
    true, "post", 1);
  for (const view of [undefined, "text", "inline"] as const) {
    await denied(await http(publicFile(text.id, primary.postId, view)), 404,
      "hidden post public text " + view);
    await denied(await http(publicFile(image.id, primary.postId, view)), 404,
      "hidden post public image " + view);
  }
  // A published reference whose physical R2 object was deliberately never
  // created must still yield 404, not a bucket-missing 503: SQL gating first.
  const missingAssetId = randomUUID(), absentKey = "private/" + randomUUID();
  await client.query(
    "insert into forum_attachments " +
      "(id,owner_id,object_key,file_name,declared_mime,detected_type,response_mime," +
      "byte_size,verification_status,created_at) " +
      "values($1,$2,$3,'missing-bucket.txt','text/plain','text','text/plain',5,'type-checked',now())",
    [missingAssetId, author.id, absentKey],
  );
  await client.query("insert into forum_post_attachments(post_id,attachment_id,created_at) " +
    "values($1,$2,now())", [primary.postId, missingAssetId]);
  assert.equal(await bucket.head(absentKey), null, "B8-B2 deliberately absent local R2 object");
  await denied(await http(publicFile(missingAssetId, primary.postId)), 404,
    "hidden-post SQL gate precedes absent local R2 object");

  const hiddenText = privateFile(primary.topicId, primary.postId, text.id, "text");
  const hiddenImage = privateFile(primary.topicId, primary.postId, image.id, "inline");
  await denied(await http(hiddenText), 401, "guest private hidden asset");
  await denied(await http(hiddenText, {}, ordinary.cookie), 403,
    "ordinary user private hidden asset");
  await content(await http(hiddenText, {}, moderator.cookie), text,
    "authorized private hidden text", "text");
  await content(await http(hiddenImage, {}, moderator.cookie), image,
    "authorized private hidden image", "inline");
  await denied(await http(privateFile(secondary.topicId, primary.postId, text.id), {}, moderator.cookie),
    404, "private asset mismatched topic membership");
  await denied(await http(privateFile(primary.topicId, secondary.postId, text.id), {}, moderator.cookie),
    404, "private asset mismatched post membership");
  await denied(await http(privateFile(primary.topicId, primary.postId, randomUUID()), {}, moderator.cookie),
    404, "private asset nonmember id");
  await denied(await http(privateFile(primary.topicId, primary.postId, text.id, "invalid"), {},
    moderator.cookie), 400, "private asset invalid view");
  // The same physical R2 bytes remain valid under their *other* visible
  // membership, an owner draft ref and independent protected Complaint Case.
  await content(await http(publicFile(text.id, secondary.postId)), text,
    "shared visible post still fetches real R2", "download");
  await content(await http(draftPath, {}, author.cookie), text,
    "owner draft survives post Hide", "download");
  await content(await http(evidencePath, {}, moderator.cookie), text,
    "Complaint evidence survives post Hide", "download");

  await client.query(
    "insert into authz_user_permission_overrides(user_id,permission_key,effect) " +
      "values($1,'forum.content.visibility.manage','deny') " +
      "on conflict(user_id,permission_key) do update set effect='deny'", [moderator.id],
  );
  await denied(await http(hiddenText, {}, moderator.cookie), 403,
    "moderator private bytes revoked at request time");
  await denied(await http(hiddenImage, {}, moderator.cookie), 403,
    "moderator private inline revoked at request time");
  await client.query(
    "update authz_user_permission_overrides set effect='allow' " +
      "where user_id=$1 and permission_key='forum.content.visibility.manage'", [moderator.id],
  );
  await content(await http(hiddenText, {}, moderator.cookie), text,
    "private bytes regranted", "text");

  await acceptedVisibility(primary.topicId, moderator,
    visibility("post", false, 1, primary.titleId, primary.postId, primary.bodyId, moderator),
    false, "post", 2);
  await content(await http(publicFile(text.id, primary.postId)), text,
    "public file restored after post Restore", "download");
  await acceptedVisibility(primary.topicId, moderator,
    visibility("topic", true, 0, primary.titleId, primary.postId, primary.bodyId, moderator),
    true, "topic", 1);
  for (const view of [undefined, "text", "inline"] as const) {
    await denied(await http(publicFile(text.id, primary.postId, view)), 404,
      "hidden-topic public download " + view);
  }
  await content(await http(privateFile(primary.topicId, primary.postId, text.id), {},
    moderator.cookie), text, "private text under topic Hide", "download");
  await content(await http(publicFile(text.id, secondary.postId)), text,
    "other topic remains visible under topic Hide", "download");
  await content(await http(draftPath, {}, author.cookie), text,
    "draft persists after topic Hide", "download");
  await content(await http(evidencePath, {}, moderator.cookie), text,
    "Complaint evidence persists after topic Hide", "download");
  await acceptedVisibility(primary.topicId, moderator,
    visibility("topic", false, 1, primary.titleId, primary.postId, primary.bodyId, moderator),
    false, "topic", 2);
  await content(await http(publicFile(text.id, primary.postId)), text,
    "public R2 bytes restored after topic Restore", "download");
  assert.equal((await bucket.head(text.key))?.size, text.bytes.byteLength,
    "Shared/draft/evidence references preserve physical R2 bytes after Hide/Restore");
  console.log("B8-B2 built Worker Better Auth local R2 published/private/draft/evidence: PASS");
}

try {
  await main();
} finally {
  await proxy.dispose();
  await client.end().catch(() => {});
}
