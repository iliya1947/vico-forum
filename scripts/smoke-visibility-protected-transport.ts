/**
 * B8-B3 connected protected-domain/legacy-alias/fault transport acceptance.
 * Uses the disposable Worker, Better Auth session and PostgreSQL 17
 * already provisioned by smoke-complaints-local.ts. No mock or R2 binding.
 */
import assert from "node:assert/strict";
import type { Client } from "pg";
import { Client as PgClient } from "pg";

type Actor = { id: string; cookie: string };
type Http = (path: string, init?: RequestInit, cookie?: string) => Promise<Response>;
type Submit = (path: string, cookie: string, fields: Record<string,string>) => Promise<Response>;

function check(response: Response, expected: number, path: string, privacy = true) {
  assert.equal(response.status, expected, path + " unexpected HTTP status");
  const cache = new Set((response.headers.get("Cache-Control") ?? "").toLowerCase()
    .split(",").map(x => x.trim()));
  assert.ok(cache.has("no-store"), path + " missing no-store");
  if (privacy) assert.ok(cache.has("private"), path + " missing private");
}
function noLeak(text: string, path: string, secrets: string[]) {
  for (const secret of secrets) assert.ok(!text.includes(secret),
    path + " disclosed source or protected metadata");
}
async function confirmed(response: Response, path: string, token?: string) {
  check(response,200,path);
  const body = await response.text();
  if (token) assert.ok(body.includes(token),path + " failed to retain protected content");
  return body;
}
async function denied(response: Response, status: number, path: string, secrets: string[]) {
  check(response,status,path);
  const body = await response.text();
  noLeak(body,path,secrets);
  assert.ok(!response.headers.has("Content-Disposition"),path + " leaked file disposition");
}
function visibility(kind: "post" | "topic", hidden: boolean, version: number,
  moderator: Actor, postId: string, expectedRevisionId: string) {
  return {
    intent: kind === "post" ? "setPostVisibility" : "setTopicVisibility",
    editorActorId: moderator.id, hidden: String(hidden),
    expectedVisibilityVersion: String(version),expectedRevisionId,
    ...(kind === "post" ? {postId} : {}),
    reason: "B8-B3 protected-domain connected transport barrier",
  };
}

export async function verifyModerationProtectedDomainTransport({
  client,http,submit,topicId,postId,titleRevisionId,caseId,appealId,complaintOperationId,
  reviewer,reporter,author,currentPostSource,titleSource,
}: {
  client: Client; http: Http; submit: Submit; topicId: string; postId: string;
  titleRevisionId: string; caseId: string; appealId: string;
  complaintOperationId: string; reviewer: Actor; reporter: Actor; author: Actor;
  currentPostSource: string; titleSource: string;
}) {
  const topic="/en/topics/"+topicId;
  const review="/en/attention/complaints/"+caseId+"/review";
  const context="/en/attention/complaints/"+caseId+"/context/"+postId;
  const appeal="/en/attention/complaints/"+caseId+"/appeals/"+appealId;
  const appealContext=appeal+"/context/"+postId;
  const history="/en/attention/complaints/"+caseId+"/history?page=0";
  const result="/en/complaints/"+caseId+"/result";
  const evidence="/en/attention/complaints/"+caseId+"/evidence/";
  const oldEdit="/en/posts/"+postId+"/edit";
  const currentRevision=(await client.query<{current_revision_id:string}>(
    "select current_revision_id from forum_posts where topic_id=$1 and id=$2",
    [topicId,postId],
  )).rows[0]?.current_revision_id;
  assert.ok(currentRevision,"B8-B3 requires edited current post revision");
  const originalSource="P7 immutable report text";
  const secrets=[titleSource,currentPostSource,originalSource];
  const originalCase=(await client.query<{version:number;state:string}>(
    "select version,state from forum_complaint_cases where id=$1",[caseId],
  )).rows[0];
  assert.ok(originalCase,"Existing protected Case must be retained");
  const originalEvents=Number((await client.query<{count:string}>(
    "select count(*)::text as count from forum_complaint_events where case_id=$1",[caseId],
  )).rows[0]?.count);
  const originalDecisions=Number((await client.query<{count:string}>(
    "select count(*)::text as count from forum_complaint_decisions where case_id=$1",[caseId],
  )).rows[0]?.count);
  const originalAppeals=Number((await client.query<{count:string}>(
    "select count(*)::text as count from forum_complaint_appeals where case_id=$1",[caseId],
  )).rows[0]?.count);
  assert.equal(originalDecisions,1);
  assert.equal(originalAppeals,1);
  const reportInput={
    kind:"post",postId,revisionId:originalCase ? (
      await client.query<{revision_id:string}>(
        "select post_revision_id as revision_id from forum_complaint_targets t " +
          "join forum_complaint_cases c on c.target_id=t.id where c.id=$1",[caseId],
      )
    ).rows[0]!.revision_id : "",reason:"spam",operationId:complaintOperationId,
  };
  async function assertCaseSnapshot(stage:string) {
    const after=(await client.query<{version:number;state:string}>(
      "select version,state from forum_complaint_cases where id=$1",[caseId],
    )).rows[0];
    assert.deepEqual(after,originalCase,stage+" Hide/Restore mutated Complaint Case");
    for(const [table,total] of [
      ["forum_complaint_events",originalEvents],
      ["forum_complaint_decisions",originalDecisions],
      ["forum_complaint_appeals",originalAppeals],
    ] as const) {
      const count=Number((await client.query<{count:string}>(
        "select count(*)::text as count from "+table+" where case_id=$1",[caseId],
      )).rows[0]?.count);
      assert.equal(count,total,stage+" visibility changed protected "+table);
    }
  }
  async function assertProtected(stage:string) {
    for(const path of [review,review+".data",review+"?_routes=routes%2Fcomplaint-review",
      context,context+".data",appeal,appeal+".data",appealContext,appealContext+".data",
      history,history.replace("?page=0",".data?page=0")]) {
      const expected=path.startsWith(context)||path.startsWith(appealContext)
        ? currentPostSource : undefined;
      await confirmed(await http(path,{},reviewer.cookie),stage+" "+path,expected);
    }
    await confirmed(await http(result,{},reporter.cookie),stage+" member-only result");
    await confirmed(await http(result+".data",{},reporter.cookie),stage+" member result data");
    for(const path of [review,review+".data",context,appeal,appealContext,history]) {
      await denied(await http(path,{},reporter.cookie),403,stage+" ordinary "+path,secrets);
      await denied(await http(path),401,stage+" guest "+path,secrets);
    }
    await denied(await http(result,{},reviewer.cookie),404,
      stage+" unrelated reviewer cannot access member result",secrets);
    // Protected evidence has a retained case membership even when the current
    // published post has removed the attachment. The default Worker smoke has
    // no R2 binding; authorization must be established before that 503.
    const asset=(await client.query<{attachment_id:string}>(
      "select e.attachment_id from forum_complaint_evidence_attachments e " +
      "join forum_complaint_cases c on c.target_id=e.target_id where c.id=$1 limit 1",
      [caseId],
    )).rows[0]?.attachment_id;
    assert.ok(asset,"B8-B3 Case requires retained private evidence");
    await denied(await http(evidence+asset,{},reporter.cookie),403,
      stage+" ordinary evidence",secrets);
    await denied(await http(evidence+asset),401,stage+" guest evidence",secrets);
    check(await http(evidence+asset,{},reviewer.cookie),503,
      stage+" authorized retained evidence without R2");
  }

  async function change(kind: "post" | "topic",hidden:boolean,version:number) {
    const data=visibility(kind,hidden,version,reviewer,postId,
      kind==="post"?currentRevision:titleRevisionId);
    const table=kind==="topic"?"forum_topics":"forum_posts";
    const id=kind==="topic"?topicId:postId;
    const baseline=(await client.query<{
      is_hidden:boolean;visibility_version:number;revision_id:string;
    }>("select is_hidden,visibility_version,"+
      (kind==="topic"?"current_title_revision_id":"current_revision_id")+
      " as revision_id from "+table+" where id=$1",[id])).rows[0];
    assert.ok(baseline,"B8-B3 expected visibility target");
    const expected=data.expectedRevisionId;
    assert.equal(baseline.visibility_version,version-1,
      "B8-B3 fixture version differs before command");
    assert.equal(baseline.revision_id,expected,
      "B8-B3 fixture revision differs before command");
    const response=await submit(topic,reviewer.cookie,data);
    if(response.status===409) {
      const responseBody=await response.clone().text();
      throw new Error("B8-B3 visibility conflict diagnostic: "+
        JSON.stringify({kind,version,actorIdMatches:reviewer.id===data.editorActorId,
          baselineHidden:baseline.is_hidden,baselineVersion:baseline.visibility_version,
          revisionMatches:baseline.revision_id===expected,
          responseError:responseBody.match(/"error":\s*"[^"]+"/u)?.[0]??"masked"}));
    }
    if(kind==="topic"&&hidden) {
      assert.equal(response.status,404,"Committed topic Hide document is neutral 404");
      noLeak(await response.text(),"topic Hide document",secrets);
    } else {
      check(response,200,kind+(hidden?" Hide":" Restore")+" command");
      await response.arrayBuffer();
    }
    const table=kind==="topic"?"forum_topics":"forum_posts";
    const id=kind==="topic"?topicId:postId;
    assert.deepEqual((await client.query<{is_hidden:boolean;visibility_version:number}>(
      "select is_hidden,visibility_version from "+table+" where id=$1",[id],
    )).rows,[{is_hidden:hidden,visibility_version:version}],
      "real Worker visibility state and CAS");
  }
  await change("post",true,1);
  await assertProtected("post Hidden");
  // An exact operation replay must not create a second Complaint or alter
  // Case, even though the reported revision's current post is hidden/edited.
  const replay=await submit(topic+"/complaints",reporter.cookie,reportInput);
  check(replay,200,"hidden-post Complaint same-operation replay");
  await assertCaseSnapshot("post Hide + replay");
  for(const alias of [oldEdit,oldEdit+"?_routes=routes%2Fpost-edit"]) {
    await denied(await http(alias,{},author.cookie),404,
      "legacy post edit while post hidden",secrets);
  }
  await change("post",false,2);
  await change("topic",true,1);
  await assertProtected("topic Hidden");
  await assertCaseSnapshot("topic Hide");
  for(const path of [topic,topic+".data",topic+"?view=original",
    "/he/topics/"+topicId,"/he/topics/"+topicId+".data"]) {
    const response=await http(path,{},reporter.cookie);
    assert.equal(response.status,404,path+" hidden topic not neutral 404");
    assert.match(response.headers.get("Cache-Control")??"",/no-store/);
    noLeak(await response.text(),path,secrets);
  }
  for(const path of [oldEdit,oldEdit+"?_routes=routes%2Fpost-edit"]) {
    await denied(await http(path,{},author.cookie),404,
      "legacy post edit while topic hidden",secrets);
  }
  for(const path of ["/iw/topics/"+topicId,"/iw/attention/complaints/"+caseId+"/review"]) {
    const response=await http(path);
    assert.equal(response.status,308,"legacy locale must redirect");
    const location=response.headers.get("Location")??"";
    assert.ok(location.startsWith("/he/"),"legacy redirect must remain canonical");
    noLeak(await response.text(),path,secrets);
  }

  // Real PostgreSQL outage injection: block the protected Case reader on its
  // own table in a separate connection. A WEB query-timeout is classified as
  // a neutral private 503; it must not return a stale protected Case or raw SQL.
  const blocker=new PgClient({connectionString:process.env.DATABASE_URL!});
  await blocker.connect();
  try {
    await blocker.query("begin");
    await blocker.query("lock table forum_complaint_cases in access exclusive mode");
    const failure=await http(review,{},reviewer.cookie);
    check(failure,503,"blocked protected Case read");
    noLeak(await failure.text(),"blocked protected Case read",[
      ...secrets,"forum_complaint_cases","Query read timeout","connectionString",
    ]);
  } finally {
    await blocker.query("rollback").catch(()=>{});
    await blocker.end();
  }
  await assertProtected("protected DB recovered");
  await assertCaseSnapshot("fault/recovery");
  await change("topic",false,2);
  await assertCaseSnapshot("Restore");
  await confirmed(await http(topic), "public topic after Restore",titleSource);

  const actions=(await client.query<{action:string;target_id:string}>(
    "select action,target_id from admin_history where " +
      "(target_id=$1 and action in ('topic.hidden','topic.restored')) or " +
      "(target_id=$2 and action in ('post.hidden','post.restored')) " +
      "order by position",[topicId,postId],
  )).rows;
  assert.deepEqual(actions,[
    {action:"post.hidden",target_id:postId},
    {action:"post.restored",target_id:postId},
    {action:"topic.hidden",target_id:topicId},
    {action:"topic.restored",target_id:topicId},
  ],"one ID-only Admin History event per actual visibility transition");
  console.log("B8-B3 real Worker protected Complaint/replay/legacy/fault transport: PASS");
}
