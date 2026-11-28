/**
 * B7 HTTP cache probe against the actual built Worker and disposable PG17.
 * The caller owns the local worker, authenticated sessions and isolated topic.
 * No extra authorization bypass, mock router or production connection.
 */
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import type { Client } from "pg";

type Actor = { id: string; cookie: string };
type Http = (path: string, init?: RequestInit, cookie?: string) => Promise<Response>;
type Submit = (path: string, cookie: string, fields: Record<string,string>) => Promise<Response>;

function cache(response: Response, path: string, status: number, privacy: "public" | "private") {
  assert.equal(response.status, status, path + " status");
  const directives = new Set((response.headers.get("Cache-Control") ?? "")
    .split(",").map(item => item.trim().toLowerCase()));
  assert.ok(directives.has("no-store"), path + " missing no-store");
  if (privacy === "private") assert.ok(directives.has("private"), path + " missing private");
}

function sourceAbsent(body: string, path: string, sentinels: readonly string[]) {
  for (const secret of sentinels) {
    assert.ok(!body.includes(secret), path + " exposed hidden source/reason");
  }
}

export async function verifyModerationVisibilityCacheTransport({
  client, http, submit, topicId, postId, titleRevisionId, attachmentId,
  moderator, ordinary, titleSource, currentPostSource,
}: {
  client: Client; http: Http; submit: Submit; topicId: string; postId: string;
  titleRevisionId: string; attachmentId: string; moderator: Actor; ordinary: Actor;
  titleSource: string; currentPostSource: string;
}) {
  const topic = "/en/topics/" + topicId;
  const topicData = topic + ".data";
  const legacyAliases = [topic + "?_routes=routes%2Ftopic", topicData + "?_routes=routes%2Ftopic"];
  const noLeak = (text: string, path: string, sentinels: string[]) => sourceAbsent(text, path, sentinels);
  const queue = "/en/admin/forum/content?kind=topic";
  const queueData = "/en/admin/forum/content.data?kind=topic";
  const inspect = "/en/admin/forum/topics/" + topicId + "/inspect";
  const inspectData = inspect + ".data";

  for (const path of [topic, topicData]) {
    const response = await http(path);
    cache(response, path, 200, "public");
    assert.ok((await response.text()).includes(titleSource), path + " visible title absent");
  }
  const revisions = await client.query<{ current_revision_id: string; source_locale: string }>(
    "select p.current_revision_id,rev.source_locale from forum_posts p " +
      "join forum_post_revisions rev on rev.id=p.current_revision_id " +
      "where p.id=$1 and p.topic_id=$2",
    [postId, topicId],
  );
  assert.equal(revisions.rows.length, 1, "B7 probe post membership");
  const postRevisionId = revisions.rows[0]!.current_revision_id;
  assert.ok(postRevisionId);
  // Seed unique revision-bound translations so /he/ must prove that the
  // sentinel could have been served before Hide, rather than merely absent.
  const titleTranslation = "B8-HIDDEN-TITLE-TRANSLATION-" + randomUUID();
  const bodyTranslation = "B8-HIDDEN-BODY-TRANSLATION-" + randomUUID();
  const privateReason = "B8-HIDDEN-VISIBILITY-REASON-" + randomUUID();
  await client.query(
    "insert into forum_topic_title_translations " +
      "(topic_id,revision_id,target_locale,source_locale,translated_content,origin,provider,provider_model) " +
      "values ($1,$2,'he','en',$3,'machine','b8-smoke','b8-v1')",
    [topicId,titleRevisionId,titleTranslation],
  );
  await client.query(
    "insert into forum_post_body_translations " +
      "(post_id,revision_id,target_locale,source_locale,translated_content,origin,provider,provider_model) " +
      "values ($1,$2,'he',$3,$4,'machine','b8-smoke','b8-v1')",
    [postId,postRevisionId,revisions.rows[0]!.source_locale,bodyTranslation],
  );
  // Existing Complaint evidence already retains this private object key
  // independently of the edited public attachment membership. Check its
  // real persisted value instead of introducing unrelated Complaint writes.
  const privateKey = (await client.query<{object_key:string}>(
    "select a.object_key from forum_complaint_evidence_attachments e " +
      "join forum_complaint_targets t on t.id=e.target_id " +
      "join forum_attachments a on a.id=e.attachment_id " +
      "where t.post_id=$1 and a.id=$2 limit 1",
    [postId,attachmentId],
  )).rows[0]?.object_key;
  assert.ok(privateKey,"B8 smoke requires a retained private Complaint evidence key");
  const privateMetadata=privateKey;
  const secrets = [titleSource,currentPostSource,titleTranslation,bodyTranslation,privateReason,privateMetadata];
  const hebrewPath = "/he/topics/" + topicId;
  const hebrew = await http(hebrewPath);
  cache(hebrew,hebrewPath,200,"public");
  const hebrewVisible = await hebrew.text();
  assert.ok(hebrewVisible.includes(titleTranslation), "B8 title translation must be public before Hide");
  assert.ok(hebrewVisible.includes(bodyTranslation), "B8 body translation must be public before Hide");

  const visibility = (kind: "topic" | "post", hidden: boolean, version: number, reason: string) => ({
    intent: kind === "topic" ? "setTopicVisibility" : "setPostVisibility",
    editorActorId: moderator.id, hidden: String(hidden),
    expectedVisibilityVersion: String(version),
    expectedRevisionId: kind === "topic" ? titleRevisionId : postRevisionId,
    ...(kind === "post" ? { postId } : {}),
    reason,
  });
  let response = await submit(topic, moderator.cookie,
    visibility("post", true, 0, "B7 post cache review"));
  cache(response, topic + " post hide", 200, "private");
  sourceAbsent(await response.text(), "post hide action", [currentPostSource]);
  for (const path of [topic, topicData, ...legacyAliases, hebrewPath, hebrewPath + ".data"]) {
    response = await http(path);
    cache(response, path + " with hidden post", 200, "public");
    const body = await response.text();
    assert.ok(body.includes(path.startsWith("/he/") ? titleTranslation : titleSource),
      path + " visible topic title lost");
    noLeak(body,path,[currentPostSource,bodyTranslation,privateReason,privateMetadata]);
    // The publicly addressable post keeps a stable tombstone/anchor, but no
    // hidden text, translation, attachment metadata or edit controls.
    assert.ok(body.includes(postId),path + " hidden post anchor missing");
    if(path === topic) assert.ok(body.includes("data-moderation-hidden-post"),
      path + " missing rendered hidden-post tombstone");
  }
  response = await submit(topic, moderator.cookie,
    visibility("post", false, 1, "B7 post cache restore"));
  cache(response, topic + " post restore", 200, "private");

  response = await submit(topic, moderator.cookie,
    visibility("topic", true, 0, privateReason));
  // A document POST runs the route loader again after the successful action.
  // Once the topic is hidden, that public loader correctly yields a neutral
  // 404. The JS clientAction separately redirects fetcher Hide to inspector.
  cache(response, topic + " topic hide document POST", 404, "public");
  sourceAbsent(await response.text(), "topic hide document POST", [
    ...secrets,
  ]);
  const hiddenRow = await client.query<{is_hidden: boolean; visibility_version: number}>(
    "select is_hidden, visibility_version from forum_topics where id=$1",
    [topicId],
  );
  assert.deepEqual(hiddenRow.rows, [{is_hidden:true, visibility_version:1}],
    "Document 404 must follow a committed Hide, not conceal a rejected action");
  for (const path of [topic,topicData,...legacyAliases,hebrewPath,hebrewPath+".data",
    topic+"?view=original",topicData+"?_routes=routes%2Ftopic&view=original"]) {
    for (const cookie of [undefined, moderator.cookie, ordinary.cookie]) {
      response = await http(path, {}, cookie);
      cache(response,path+" hidden topic",404,"public");
      noLeak(await response.text(),path,secrets);
    }
  }
  // Old Hebrew-locale alias redirects without returning previous content.
  const alias = "/iw/topics/" + topicId;
  response = await http(alias);
  assert.equal(response.status,308,"legacy Hebrew alias redirect");
  assert.ok(response.headers.get("Location")?.includes("/he/topics/"+topicId),
    "legacy alias must target canonical hidden topic");
  noLeak(await response.text(),alias,secrets);
  for (const path of [queue, queueData, inspect, inspectData]) {
    response = await http(path);
    cache(response, path + " guest", 401, "private");
    response = await http(path, {}, ordinary.cookie);
    cache(response, path + " ordinary", 403, "private");
    response = await http(path, {}, moderator.cookie);
    cache(response, path + " moderator", 200, "private");
    const body = await response.text();
    if (path === inspect || path === inspectData) {
      assert.ok(body.includes(privateReason), path + " private reason absent");
    }
  }
  // Authorization revocation must be observed by the next actual Better
  // Auth HTTP request, including private .data and the hidden-topic action.
  await client.query(
    "insert into authz_user_permission_overrides(user_id,permission_key,effect) " +
      "values ($1,'forum.content.visibility.manage','deny') " +
      "on conflict(user_id,permission_key) do update set effect='deny'",
    [moderator.id],
  );
  for (const path of [queue,queueData,inspect,inspectData]) {
    response = await http(path,{},moderator.cookie);
    cache(response,path+" after revocation",403,"private");
    noLeak(await response.text(),path+" after revocation",secrets);
  }
  const rejected = await submit(topic+".data",moderator.cookie,
    visibility("topic",false,1,"B8 rejected visibility after revocation"));
  assert.ok([403,404].includes(rejected.status),"revoked visibility action cannot succeed");
  noLeak(await rejected.text(),"revoked action",secrets);
  const stillHidden = await client.query<{is_hidden:boolean;visibility_version:number}>(
    "select is_hidden,visibility_version from forum_topics where id=$1",[topicId]);
  assert.deepEqual(stillHidden.rows,[{is_hidden:true,visibility_version:1}],
    "Revoked action must leave Hide, version and History unchanged");
  await client.query(
    "update authz_user_permission_overrides set effect='allow' " +
      "where user_id=$1 and permission_key='forum.content.visibility.manage'",
    [moderator.id],
  );
  for(const path of [queue,inspect]) {
    response=await http(path,{},moderator.cookie);
    cache(response,path+" after regrant",200,"private");
    assert.ok((await response.text()).includes(privateReason) || path === queue,
      "Only readmitted inspector may show private reason");
  }
  response = await submit(topic, moderator.cookie,
    visibility("topic", false, 1, "B7 topic cache restore"));
  cache(response, topic + " topic restore", 200, "private");
  for (const path of [topic, topicData]) {
    response = await http(path);
    cache(response, path + " after restore", 200, "public");
    assert.ok((await response.text()).includes(titleSource), path + " restored title absent");
  }
  console.log("B8-B1 real Worker/Better Auth public/private aliases, leakage and revoke transport: PASS");
}
