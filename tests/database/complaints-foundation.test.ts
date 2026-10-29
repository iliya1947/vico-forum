import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ComplaintsService } from "../../db/complaints-service";
import { DrizzleComplaintsRepository } from "../../db/complaints-repository";
import { ComplaintConflictError, ComplaintForbiddenError, ComplaintInputError, ComplaintPolicyRequiredError, type ComplaintTarget } from "../../db/complaints-domain";
import { PostgresAuthorizationRepository } from "../../db/authorization-repository";
import { createAuthorizationCapability } from "../../db/authorization-service";
import { DrizzleForumRepository } from "../../db/forum-repository";
import { ForumAttachmentCleanup } from "../../db/forum-attachment-cleanup";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL required");
const url = new URL(databaseUrl);
if (!["localhost","127.0.0.1"].includes(url.hostname) || !url.pathname.endsWith("_test")) throw new Error("Disposable local *_test database required");
const schema = "complaints_foundation_test";
const options = `-c search_path=${schema}`;
const client = new Client({ connectionString: databaseUrl, options });
const pool = new Pool({ connectionString: databaseUrl, options });
const authorization = createAuthorizationCapability(new PostgresAuthorizationRepository(pool));
const service = (connection = client) => new ComplaintsService(new DrizzleComplaintsRepository(drizzle(connection)), authorization);
const forum = new DrizzleForumRepository(drizzle(client), { cooldownMs: 0, now: () => new Date() });
const report = (target: ComplaintTarget, explanation: string | null = null) => ({ target, explanation, reason: "spam" as const, operationId: randomUUID() });
async function content() {
  const id = randomUUID();
  const postId = randomUUID(), revisionId = randomUUID(), titleId = randomUUID();
  await forum.createTopicWithInitialPost({ id, sectionId: "complaints-section", authorId: "content-author",
    titleRevision: { id: titleId, originalContent: "Reported title", sourceLocale: "en" },
    initialPost: { id: postId, topicId: id, authorId: "content-author", bodyRevision: { id: revisionId, originalContent: "Reported body", sourceLocale: "en" } } });
  return { post: { kind: "post", topicId: id, postId, revisionId } as const,
    title: { kind: "topic-title", topicId: id, revisionId: titleId } as const };
}
async function asset(postId?: string) {
  const id = randomUUID();
  await client.query(`insert into forum_attachments
    (id,owner_id,object_key,file_name,declared_mime,detected_type,response_mime,byte_size,verification_status,created_at)
    values ($1,'content-author',$2,'evidence.txt','text/plain','text','text/plain',4,'type-checked','2020-01-01')`, [id, `private/${id}`]);
  if (postId) await client.query("insert into forum_post_attachments(post_id,attachment_id,created_at) values ($1,$2,now())", [postId,id]);
  return id;
}
async function decision(outcome: "confirmed" | "not-confirmed" = "not-confirmed") {
  const c = await content();
  const saved = await service().submit("reporter-one", report(c.post));
  const decisionId = await service().decide("reviewer", { caseId: saved.caseId, operationId: randomUUID(), expectedVersion: 1, outcome, reasoning: "Public result" });
  return { ...saved, decisionId, ...c };
}
async function expectCode(promise: Promise<unknown>, code: string) {
  const error = await promise.then(() => null, e => e);
  expect(error?.code ?? error?.cause?.code).toBe(code);
}

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const file of (await readdir("drizzle")).filter(f => /^\d{4}_.+\.sql$/.test(f)).sort()) {
    await client.query((await readFile(`drizzle/${file}`, "utf8")).replaceAll('"public".', `"${schema}".`));
  }
  for (const id of ["content-author","reporter-one","reporter-two","reviewer","appeal-reviewer","outsider","admin"])
    await client.query('insert into "user" (id,name,email) values ($1,$1,$2)', [id,`${id}@test.invalid`]);
  await client.query(`insert into authz_user_roles(user_id,role_id) values ('reviewer','builtin-moderator'),('admin','builtin-admin')`);
  await client.query(`insert into authz_user_permission_overrides(user_id,permission_key,effect)
    values ('appeal-reviewer','forum.complaint.appeal.review','allow')`);
  await forum.createCategory({ id: "complaints-category", name: "Complaints test" });
  await forum.createSection({ id: "complaints-section", categoryId: "complaints-category", name: "Cases" });
});
afterAll(async () => {
  await pool.end();
  await client.query(`drop schema ${schema} cascade`);
  await client.end();
});

describe("complaints domain foundation / real PostgreSQL", () => {
  it("groups independent reports but separates topic title and first post", async () => {
    const c = await content();
    const one = await service().submit("reporter-one", report(c.post));
    const two = await service().submit("reporter-two", report(c.post));
    const title = await service().submit("reporter-one", report(c.title));
    expect(two.caseId).toBe(one.caseId);
    expect(two.complaintId).not.toBe(one.complaintId);
    expect(title.caseId).not.toBe(one.caseId);
    expect((await service().readCase("reviewer",one.caseId)).independentReporterCount).toBe(2);
  });
  it("validates reasons/Other explanation and target-revision ownership without writes", async () => {
    const a = await content(), b = await content();
    await expect(service().submit("reporter-one", { ...report(a.post), reason: "other", explanation: " " })).rejects.toBeInstanceOf(ComplaintInputError);
    await expect(service().submit("reporter-one", { ...report(a.post), reason: "invented" as "spam" })).rejects.toBeInstanceOf(ComplaintInputError);
    await expect(service().submit("reporter-one",report({ ...a.post, revisionId: b.post.revisionId }))).rejects.toBeInstanceOf(ComplaintConflictError);
    await expectCode(client.query(`insert into forum_complaint_targets(id,kind,topic_id,post_id,post_revision_id,affected_author_id)
      values ($1,'post',$2,$3,$4,'content-author')`, [randomUUID(),a.post.topicId,a.post.postId,b.post.revisionId]),"23503");
    await expectCode(client.query(`insert into forum_complaint_targets(id,kind,topic_id,affected_author_id)
      values ($1,'post',$2,'content-author')`,[randomUUID(),a.post.topicId]),"23514");
  });
  it("keeps same-operation replay and lifetime duplicate idempotent, detects modified retry", async () => {
    const c = await content(), input = report(c.post);
    const first = await service().submit("reporter-one", input);
    expect(await service().submit("reporter-one",input)).toEqual(first);
    expect(await service().submit("reporter-one",{ ...input,operationId: randomUUID() })).toEqual(first);
    await expect(service().submit("reporter-one",{ ...input,explanation: "Changed" })).rejects.toBeInstanceOf(ComplaintConflictError);
    const data = await service().readCase("reviewer",first.caseId);
    expect(data.reports.items).toHaveLength(1);
    expect(data.events.items.map(e => e.kind)).toEqual(["submitted"]);
  });
  it("filters structured identities from every ordinary reviewer projection and requires separate elevated grant", async () => {
    const c = await decision();
    await service().appeal("reporter-one",{ caseId:c.caseId,decisionId:c.decisionId,argument:"Please reconsider",operationId:randomUUID() });
    await service().addNote("reviewer",{caseId:c.caseId,operationId:randomUUID(),body:"Internal note"});
    for (const actor of ["reviewer","admin","appeal-reviewer"]) {
      const data = actor === "appeal-reviewer" ? await service().readAppealCase(actor,c.caseId) : await service().readCase(actor,c.caseId);
      const serialized = JSON.stringify(data);
      expect(serialized).not.toContain("reporter-one");
      expect(serialized).not.toContain("appellantUserId");
      expect(data.reports.items[0]).not.toHaveProperty("reporter");
      expect(data.appeals[0]).not.toHaveProperty("appellant");
      expect(data.events.items[0]).not.toHaveProperty("actorUserId");
    }
    await client.query(`insert into authz_user_permission_overrides(user_id,permission_key,effect)
      values ('reviewer','forum.complaint.reporterIdentity.read','allow')`);
    expect((await service().readCase("reviewer",c.caseId)).reports.items[0]?.reporter?.id).toBe("reporter-one");
    await client.query(`update authz_user_permission_overrides set effect='deny'
      where user_id='reviewer' and permission_key='forum.complaint.reporterIdentity.read'`);
    expect((await service().readCase("reviewer",c.caseId)).reports.items[0]).not.toHaveProperty("reporter");
    await expect(service().readCase("outsider",c.caseId)).rejects.toBeInstanceOf(ComplaintForbiddenError);
    const own = await service().readOwnResult("reporter-one",c.caseId);
    expect(own).toEqual({caseId:c.caseId,decisionId:c.decisionId,outcome:"not-confirmed",reasoning:"Public result"});
    expect(JSON.stringify(own)).not.toContain("Internal note");
    await expect(service().readOwnResult("outsider",c.caseId)).rejects.toThrow("result not found");
  });
  it("honors role grants and per-user deny/allow/inherit on the next service call", async () => {
    const c = await content(), s = service();
    await client.query(`insert into authz_user_permission_overrides(user_id,permission_key,effect)
      values ('reporter-two','forum.complaint.create','deny')`);
    await expect(s.submit("reporter-two",report(c.post))).rejects.toBeInstanceOf(ComplaintForbiddenError);
    await client.query(`update authz_user_permission_overrides set effect='allow' where user_id='reporter-two' and permission_key='forum.complaint.create'`);
    await s.submit("reporter-two",report(c.post));
    await client.query(`delete from authz_user_permission_overrides where user_id='reporter-two' and permission_key='forum.complaint.create'`);
    const other = await content();
    await s.submit("reporter-two",report(other.post));
  });
  it("retains reported text and attachment evidence after a real edit and cleanup", async () => {
    const c = await content(), attachmentId = await asset(c.post.postId);
    const input = report(c.post);
    const saved = await service().submit("reporter-one",input);
    await forum.editPublishedPost({topicId:c.post.topicId,postId:c.post.postId,actorId:"content-author",expectedRevisionId:c.post.revisionId,
      body:"Current edited body",draftId:randomUUID(),attachmentIds:[],retainedAttachmentIds:[]});
    const deleted: string[] = [];
    await new ForumAttachmentCleanup(drizzle(client), {delete:async key=>{deleted.push(key);},listReservations:async()=>({keys:[]})},()=>new Date("2040-01-01")).runOnce();
    expect(deleted).not.toContain(`private/${attachmentId}`);
    const data = await service().readCase("reviewer",saved.caseId);
    expect(data.reportedContent).toBe("Reported body");
    expect(data.currentContent).toBe("Current edited body");
    expect(data.evidence.items[0]?.id).toBe(attachmentId);
    expect(JSON.stringify(data)).not.toContain("object_key");
    expect(await service().submit("reporter-one",input)).toEqual(saved);
    await expect(service().submit("reporter-one",report(c.post))).rejects.toBeInstanceOf(ComplaintConflictError);
  });
  it("atomically resolves once and keeps decisions/events/notes immutable", async () => {
    const c = await decision("confirmed");
    await expect(service().decide("reviewer",{caseId:c.caseId,expectedVersion:1,outcome:"not-confirmed",reasoning:"stale",operationId:randomUUID()})).rejects.toBeInstanceOf(ComplaintConflictError);
    await expectCode(client.query("update forum_complaint_decisions set reasoning='tampered' where id=$1",[c.decisionId]),"55000");
    await expectCode(client.query("delete from forum_complaint_events where case_id=$1",[c.caseId]),"55000");
    await expectCode(client.query("delete from forum_complaints where id=$1",[c.complaintId]),"55000");
    await expectCode(client.query("update forum_complaint_cases set initial_decision_id=$1 where id=$2",[randomUUID(),c.caseId]),"23503");
    expect((await service().readCase("reviewer",c.caseId)).events.items.map(e=>e.kind)).toEqual(["submitted","decided"]);
  });
  it("persists first appeals in both directions and preserves unspecified later transition policy", async () => {
    for (const outcome of ["confirmed","not-confirmed"] as const) {
      const c = await decision(outcome), actor = outcome === "confirmed" ? "content-author" : "reporter-one";
      const input = {caseId:c.caseId,decisionId:c.decisionId,argument:"Please reconsider",operationId:randomUUID()};
      await expect(service().appeal("outsider",input)).rejects.toBeInstanceOf(ComplaintForbiddenError);
      const appealId = await service().appeal(actor,input);
      expect(await service().appeal(actor,input)).toBe(appealId);
      await expect(service().appeal(actor,{...input,operationId:randomUUID()})).rejects.toBeInstanceOf(ComplaintPolicyRequiredError);
      const resolution = {caseId:c.caseId,appealId,outcome:"overturned" as const,reasoning:"Appeal result",operationId:randomUUID()};
      expect(await service().resolveAppeal("appeal-reviewer",resolution)).toBe(appealId);
      expect(await service().resolveAppeal("appeal-reviewer",resolution)).toBe(appealId);
      const data = await service().readCase("reviewer",c.caseId);
      expect(data.decision?.outcome).toBe(outcome);
      expect(data.appeals[0]?.outcome).toBe("overturned");
      await expectCode(client.query("update forum_complaint_appeals set argument='changed' where id=$1",[appealId]),"55000");
    }
  });
  it("has a database-enforced three-appeal total and same-case ownership without imposing one-pending uniqueness", async () => {
    const c = await decision(), other = await decision();
    const insert = (ordinal: number, caseId = c.caseId, decisionId = c.decisionId) => client.query(`insert into forum_complaint_appeals
      (id,case_id,decision_id,appellant_user_id,side,argument,ordinal) values ($1,$2,$3,'reporter-one','reporter','Argument',$4)`,[randomUUID(),caseId,decisionId,ordinal]);
    await insert(1); await insert(2); await insert(3);
    await expectCode(insert(4),"23514");
    await expectCode(insert(3),"23505");
    await expectCode(insert(1,c.caseId,other.decisionId),"23503");
  });
  it("defers ambiguous incident grouping but permits a later revision after resolution", async () => {
    const c = await decision();
    await expect(service().submit("reporter-two",report(c.post))).rejects.toBeInstanceOf(ComplaintPolicyRequiredError);
    await forum.editPublishedPost({topicId:c.post.topicId,postId:c.post.postId,actorId:"content-author",expectedRevisionId:c.post.revisionId,
      body:"Later incident",draftId:randomUUID(),attachmentIds:[]});
    const row = await client.query("select current_revision_id from forum_posts where id=$1",[c.post.postId]);
    const next = await service().submit("reporter-two",report({...c.post,revisionId:row.rows[0].current_revision_id}));
    expect(next.caseId).not.toBe(c.caseId);
  });
  it("serializes concurrent independent submissions and concurrent decisions on real connections", async () => {
    const c = await content(), second = new Client({connectionString:databaseUrl,options});
    await second.connect();
    try {
      const one = report(c.post), two = report(c.post);
      const results = await Promise.all([service().submit("reporter-one",one),service(second).submit("reporter-two",two)]);
      expect(results[0].caseId).toBe(results[1].caseId);
      const base = {caseId:results[0].caseId,expectedVersion:2,reasoning:"Resolve"};
      const resolved = await Promise.allSettled([
        service().decide("reviewer",{...base,outcome:"confirmed",operationId:randomUUID()}),
        service(second).decide("admin",{...base,outcome:"not-confirmed",operationId:randomUUID()}),
      ]);
      expect(resolved.filter(r=>r.status==="fulfilled")).toHaveLength(1);
      expect(resolved.filter(r=>r.status==="rejected")).toHaveLength(1);
    } finally { await second.end(); }
  });
  it("fences evidence insertion against an already claimed cleanup asset", async () => {
    const c = await content(), saved = await service().submit("reporter-one",report(c.post));
    const data = await service().readCase("reviewer",saved.caseId), attachmentId = await asset();
    await client.query(`update forum_attachments set cleanup_status='deleting',cleanup_claim_token=$1,cleanup_claimed_at=now() where id=$2`,[randomUUID(),attachmentId]);
    await expectCode(client.query("insert into forum_complaint_evidence_attachments(target_id,attachment_id) values ($1,$2)",[data.targetId,attachmentId]),"23514");
  });
});

async function waitForLock(name: string) {
  for (let n=0;n<200;n++) {
    const r=await pool.query("select 1 from pg_stat_activity where application_name=$1 and wait_event_type='Lock'",[name]);
    if (r.rowCount) return;
    await new Promise(resolve=>setTimeout(resolve,10));
  }
  throw new Error("expected database lock was not reached");
}

it("commits evidence before a waiting real edit can detach it (deterministic two-writer ordering)", async () => {
  const c=await content(), attachmentId=await asset(c.post.postId);
  const holder=new Client({connectionString:databaseUrl,options});
  const submitter=new Client({connectionString:databaseUrl,options,application_name:"complaints-evidence-submit"});
  const editor=new Client({connectionString:databaseUrl,options,application_name:"complaints-evidence-edit"});
  await Promise.all([holder.connect(),submitter.connect(),editor.connect()]);
  let submission: ReturnType<ComplaintsService["submit"]> | undefined;
  let editing: Promise<void> | undefined;
  try {
    await holder.query("begin");
    await holder.query("select id from forum_attachments where id=$1 for update",[attachmentId]);
    submission=service(submitter).submit("reporter-one",report(c.post));
    await waitForLock("complaints-evidence-submit");
    editing=new DrizzleForumRepository(drizzle(editor)).editPublishedPost({topicId:c.post.topicId,postId:c.post.postId,
      actorId:"content-author",expectedRevisionId:c.post.revisionId,body:"After report",draftId:randomUUID(),attachmentIds:[],retainedAttachmentIds:[]});
    await waitForLock("complaints-evidence-edit");
    await holder.query("commit");
    const saved=await submission;
    await editing;
    const data=await service().readCase("reviewer",saved.caseId);
    expect(data.reportedContent).toBe("Reported body");
    expect(data.currentContent).toBe("After report");
    expect(data.evidence.items.map(e=>e.id)).toEqual([attachmentId]);
  } finally {
    await holder.query("rollback");
    await Promise.allSettled([submission,editing]);
    await Promise.all([holder.end(),submitter.end(),editor.end()]);
  }
});

it("rejects a fresh complaint after an edit wins the current-revision lock", async () => {
  const c=await content(), editor=new Client({connectionString:databaseUrl,options});
  const submitter=new Client({connectionString:databaseUrl,options,application_name:"complaints-after-edit"});
  await Promise.all([editor.connect(),submitter.connect()]);
  let pending: ReturnType<ComplaintsService["submit"]> | undefined;
  try {
    await editor.query("begin");
    await editor.query("select id from forum_posts where id=$1 for update",[c.post.postId]);
    const revisionId=randomUUID();
    await editor.query(`insert into forum_post_revisions(id,post_id,author_id,original_content,source_locale)
      values ($1,$2,'content-author','Edited first','en')`,[revisionId,c.post.postId]);
    await editor.query("update forum_posts set current_revision_id=$1 where id=$2",[revisionId,c.post.postId]);
    pending=service(submitter).submit("reporter-one",report(c.post));
    const rejected=expect(pending).rejects.toBeInstanceOf(ComplaintConflictError);
    await waitForLock("complaints-after-edit");
    await editor.query("commit");
    await rejected;
    const targets=await client.query("select id from forum_complaint_targets where post_id=$1",[c.post.postId]);
    expect(targets.rows).toHaveLength(0);
  } finally {
    await editor.query("rollback");
    await Promise.allSettled([pending]);
    await Promise.all([editor.end(),submitter.end()]);
  }
});

it("rolls back report/evidence and resolution if durable lifecycle persistence fails", async () => {
  const c=await content();await asset(c.post.postId);
  const input=report(c.post);
  await client.query("alter table forum_complaint_events add constraint test_reject_new_report check (kind<>'submitted') not valid");
  try { await expect(service().submit("reporter-one",input)).rejects.toThrow(); }
  finally { await client.query("alter table forum_complaint_events drop constraint test_reject_new_report"); }
  expect((await client.query("select id from forum_complaint_targets where post_id=$1",[c.post.postId])).rowCount).toBe(0);
  const saved=await service().submit("reporter-one",input);
  await client.query("alter table forum_complaint_events add constraint test_reject_new_decision check (kind<>'decided') not valid");
  try {
    await expect(service().decide("reviewer",{caseId:saved.caseId,operationId:randomUUID(),expectedVersion:1,outcome:"confirmed",reasoning:"Result"})).rejects.toThrow();
  } finally { await client.query("alter table forum_complaint_events drop constraint test_reject_new_decision"); }
  const data=await service().readCase("reviewer",saved.caseId);
  expect(data.state).toBe("open");expect(data.decision).toBeNull();
  expect(data.events.items.map(e=>e.kind)).toEqual(["submitted"]);
});

it("runs real complaint commands under the repository web ACL without UPDATE on immutable evidence", async () => {
  const { pathToFileURL }=await import("node:url");
  const { resolve }=await import("node:path");
  const { runtimeCapabilityContracts }=await import(pathToFileURL(resolve(".github/scripts/runtime-privileges.mjs")).href);
  const role=`complaints_web_${randomUUID().replaceAll("-","")}`;
  const c=await content();await asset(c.post.postId);
  const connection=new Client({connectionString:databaseUrl,options});await connection.connect();
  await client.query(`create role ${role} nologin`);
  try {
    await client.query(`grant usage on schema ${schema} to ${role}`);
    for (const [table,privileges] of Object.entries(runtimeCapabilityContracts.web.relations as Record<string,string[]>))
      await client.query(`grant ${privileges.join(",")} on ${schema}.${table} to ${role}`);
    await connection.query(`set role ${role}`);
    const s=service(connection), input=report(c.post), saved=await s.submit("reporter-one",input);
    expect(await s.submit("reporter-one",input)).toEqual(saved);
    const noteId=await s.addNote("reviewer",{caseId:saved.caseId,operationId:randomUUID(),body:"ACL note"});
    const snapshot=await s.readCase("reviewer",saved.caseId);
    expect(snapshot.notes.items[0]?.id).toBe(noteId);
    const id=await s.decide("reviewer",{caseId:saved.caseId,operationId:randomUUID(),expectedVersion:snapshot.version,outcome:"not-confirmed",reasoning:"ACL result"});
    const appealId=await s.appeal("reporter-one",{caseId:saved.caseId,decisionId:id,operationId:randomUUID(),argument:"ACL appeal"});
    await s.resolveAppeal("appeal-reviewer",{caseId:saved.caseId,appealId,operationId:randomUUID(),outcome:"upheld",reasoning:"ACL review"});
    await expectCode(connection.query("delete from forum_complaint_events"),"42501");
    await expectCode(connection.query("update forum_complaint_targets set kind=kind"),"42501");
    await expectCode(connection.query("update forum_complaint_evidence_attachments set target_id=target_id"),"42501");
  } finally {
    await connection.query("reset role");await connection.end();
    await client.query(`drop owned by ${role};drop role ${role}`);
  }
});

it("keeps report counts independent of bounded report pages", async () => {
  const c=await content();let caseId="";
  for (let i=0;i<51;i++) {
    const actor=`page-${randomUUID()}`;
    await client.query('insert into "user"(id,name,email) values ($1,$1,$2)',[actor,`${actor}@test.invalid`]);
    caseId=(await service().submit(actor,report(c.post))).caseId;
  }
  const first=await service().readCase("reviewer",caseId);
  const next=await service().readCase("reviewer",caseId,{reports:1,notes:0,events:0});
  expect(first.reports.items).toHaveLength(50);expect(first.reports.hasMore).toBe(true);
  expect(next.reports.items).toHaveLength(1);expect(next.reports.hasMore).toBe(false);
  expect(first.independentReporterCount).toBe(51);expect(next.independentReporterCount).toBe(51);
  expect(first.reports.items.map(r=>r.id)).not.toContain(next.reports.items[0]!.id);
});
