/**
 * B7 HTTP cache probe against the actual built Worker and disposable PG17.
 * The caller owns the local worker, authenticated sessions and isolated topic.
 * No extra authorization bypass, mock router or production connection.
 */
import assert from "node:assert/strict";
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
  client, http, submit, topicId, postId, titleRevisionId,
  moderator, ordinary, titleSource, currentPostSource,
}: {
  client: Client; http: Http; submit: Submit; topicId: string; postId: string;
  titleRevisionId: string; moderator: Actor; ordinary: Actor;
  titleSource: string; currentPostSource: string;
}) {
  const topic = "/en/topics/" + topicId;
  const topicData = topic + ".data";
  const queue = "/en/admin/forum/content?kind=topic";
  const queueData = "/en/admin/forum/content.data?kind=topic";
  const inspect = "/en/admin/forum/topics/" + topicId + "/inspect";
  const inspectData = inspect + ".data";

  for (const path of [topic, topicData]) {
    const response = await http(path);
    cache(response, path, 200, "public");
    assert.ok((await response.text()).includes(titleSource), path + " visible title absent");
  }
  const revisions = await client.query<{ current_revision_id: string }>(
    "select current_revision_id from forum_posts where id=$1 and topic_id=$2",
    [postId, topicId],
  );
  assert.equal(revisions.rows.length, 1, "B7 probe post membership");
  const postRevisionId = revisions.rows[0]!.current_revision_id;
  assert.ok(postRevisionId);

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
  for (const path of [topic, topicData]) {
    response = await http(path);
    cache(response, path + " with hidden post", 200, "public");
    const body = await response.text();
    assert.ok(body.includes(titleSource), path + " visible topic title lost");
    sourceAbsent(body, path, [currentPostSource]);
  }
  response = await submit(topic, moderator.cookie,
    visibility("post", false, 1, "B7 post cache restore"));
  cache(response, topic + " post restore", 200, "private");

  response = await submit(topic, moderator.cookie,
    visibility("topic", true, 0, "B7 private hide reason"));
  cache(response, topic + " topic hide", 200, "private");
  sourceAbsent(await response.text(), "topic hide action", [titleSource, currentPostSource]);
  for (const path of [topic, topicData, topicData + "?_routes=routes%2Ftopic"]) {
    for (const cookie of [undefined, moderator.cookie]) {
      response = await http(path, {}, cookie);
      cache(response, path + " hidden topic", 404, "public");
      sourceAbsent(await response.text(), path, [
        titleSource, currentPostSource, "B7 private hide reason",
      ]);
    }
  }
  for (const path of [queue, queueData, inspect, inspectData]) {
    response = await http(path);
    cache(response, path + " guest", 401, "private");
    response = await http(path, {}, ordinary.cookie);
    cache(response, path + " ordinary", 403, "private");
    response = await http(path, {}, moderator.cookie);
    cache(response, path + " moderator", 200, "private");
    const body = await response.text();
    if (path === inspect || path === inspectData) {
      assert.ok(body.includes("B7 private hide reason"), path + " private reason absent");
    }
  }
  response = await submit(topic, moderator.cookie,
    visibility("topic", false, 1, "B7 topic cache restore"));
  cache(response, topic + " topic restore", 200, "private");
  for (const path of [topic, topicData]) {
    response = await http(path);
    cache(response, path + " after restore", 200, "public");
    assert.ok((await response.text()).includes(titleSource), path + " restored title absent");
  }
  console.log("B7 real Worker HTTP document/.data/404/private cache transport: PASS");
}
