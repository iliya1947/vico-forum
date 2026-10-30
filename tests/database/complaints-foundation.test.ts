import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ComplaintsService } from "../../db/complaints-service";
import { DrizzleComplaintsRepository } from "../../db/complaints-repository";
import { ComplaintConflictError, ComplaintForbiddenError, ComplaintInputError, ComplaintNotFoundError, ComplaintPolicyRequiredError, ComplaintRateLimitError, type ComplaintTarget } from "../../db/complaints-domain";
import { PostgresAuthorizationRepository } from "../../db/authorization-repository";
import { AuthorizationService, AuthorizationUnavailableError, createAuthorizationCapability } from "../../db/authorization-service";
import { createHyperdriveAuthorization } from "../../db/hyperdrive-authorization";
import type { PermissionKey } from "../../app/authorization/catalog";
import { DrizzleForumRepository } from "../../db/forum-repository";
import { ForumAttachmentCleanup } from "../../db/forum-attachment-cleanup";
import { RouterContextProvider } from "react-router";
import { authSessionContext } from "../../app/auth/request-context";
import { authorizationContext } from "../../app/authorization/request-context";
import { complaintSubmissionContext } from "../../app/complaints/request-context";
import { createHyperdriveComplaintSubmission } from "../../db/hyperdrive-complaints";
import { action as submitAction } from "../../app/routes/complaint-submit";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL required");
const url = new URL(databaseUrl);
if (!["localhost","127.0.0.1"].includes(url.hostname) || !url.pathname.endsWith("_test")) throw new Error("Disposable local *_test database required");
const schema = "complaints_foundation_test";
const options = `-c search_path=${schema}`;
const client = new Client({ connectionString: databaseUrl, options });
const pool = new Pool({ connectionString: databaseUrl, options });
const authorization = createAuthorizationCapability(new PostgresAuthorizationRepository(pool));
// Lifecycle fixtures share actors across tests; quota tests below use production limits.
const service = (connection = client) => new ComplaintsService(new DrizzleComplaintsRepository(drizzle(connection), { tenMinutes:10000, day:10000 }), authorization);
const limitedService = (connection = client) => new ComplaintsService(new DrizzleComplaintsRepository(drizzle(connection)), authorization);
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
  for (const id of ["content-author","reporter-one","reporter-two","reviewer","appeal-reviewer","outsider","admin","snapshot-reader"])
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
  it("permits a later revision after resolution", async () => {
    const c = await decision();
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

describe("linked Cases for a previously resolved revision", () => {
  it.each(["post", "title"] as const)("uses authoritative %s author rather than the revision editor", async kind => {
    const c = await content(), revisionId = randomUUID();
    if (kind === "post") {
      await client.query(`insert into forum_post_revisions(id,post_id,author_id,original_content,source_locale)
        values ($1,$2,'reporter-two','Revised body','en')`, [revisionId,c.post.postId]);
      await client.query("update forum_posts set current_revision_id=$1 where id=$2", [revisionId,c.post.postId]);
    } else {
      await client.query(`insert into forum_topic_title_revisions(id,topic_id,author_id,original_content,source_locale)
        values ($1,$2,'reporter-two','Revised title','en')`, [revisionId,c.title.topicId]);
      await client.query("update forum_topics set current_title_revision_id=$1 where id=$2", [revisionId,c.title.topicId]);
    }
    const saved = await service().submit("reporter-one", report({ ...c[kind], revisionId }));
    expect((await service().readCase("reviewer", saved.caseId)).affectedAuthorId).toBe("content-author");
    const decisionId = await service().decide("reviewer", { caseId:saved.caseId, operationId:randomUUID(),
      expectedVersion:1, outcome:"confirmed", reasoning:"Author boundary" });
    await expect(service().readOwnResult("reporter-two", saved.caseId)).rejects.toThrow("result not found");
    const input = { caseId:saved.caseId, decisionId, operationId:randomUUID(), argument:"Author appeal" };
    await expect(service().appeal("reporter-two", input)).rejects.toBeInstanceOf(ComplaintForbiddenError);
    await service().appeal("content-author", input);
  });

  it.each(["post", "title"] as const)("links successive %s Cases and preserves lifetime duplicates", async kind => {
    const c = await content(), target = c[kind], input = report(target);
    const first = await service().submit("reporter-one", input);
    await service().decide("reviewer", { caseId: first.caseId, operationId: randomUUID(), expectedVersion: 1,
      outcome: "not-confirmed", reasoning: "First resolution" });
    const before = await service().readCase("reviewer", first.caseId);
    expect(before.previousCaseId).toBeNull();
    const next = await service().submit("reporter-two", report(target));
    expect(next.caseId).not.toBe(first.caseId);
    const linked = await service().readCase("reviewer", next.caseId);
    expect(linked.previousCaseId).toBe(first.caseId);
    expect(linked.targetId).toBe(before.targetId);
    expect(linked.reports.items[0]).not.toHaveProperty("reporter");
    expect(await service().submit("reporter-one", { ...input, operationId: randomUUID() })).toEqual(first);
    await expect(service().submit("reporter-one", { ...input, operationId: randomUUID(), explanation: "Changed" }))
      .rejects.toBeInstanceOf(ComplaintConflictError);
    const joined = await service().submit("outsider", report(target));
    expect(joined.caseId).toBe(next.caseId);
    expect((await service().readCase("reviewer", next.caseId)).independentReporterCount).toBe(2);
    expect(await service().readCase("reviewer", first.caseId)).toEqual(before);
    expect(await service().readOwnResult("reporter-one", first.caseId)).not.toHaveProperty("previousCaseId");
    await service().decide("reviewer", { caseId: next.caseId, operationId: randomUUID(), expectedVersion: 2,
      outcome: "not-confirmed", reasoning: "Second resolution" });
    const third = await service().submit("admin", report(target));
    expect((await service().readCase("reviewer", third.caseId)).previousCaseId).toBe(next.caseId);
  });

  it.each(["post", "title"] as const)("serializes concurrent new reporters for a closed %s target", async kind => {
    const c = await content(), target = c[kind];
    const first = await service().submit("reporter-one", report(target));
    await service().decide("reviewer", { caseId: first.caseId, operationId: randomUUID(), expectedVersion: 1,
      outcome: "confirmed", reasoning: "Resolved" });
    const a = new Client({ connectionString: databaseUrl, options });
    const b = new Client({ connectionString: databaseUrl, options });
    await Promise.all([a.connect(), b.connect()]);
    try {
      const [one, two] = await Promise.all([
        service(a).submit("reporter-two", report(target)), service(b).submit("outsider", report(target)),
      ]);
      expect(one.caseId).toBe(two.caseId);
      expect(one.caseId).not.toBe(first.caseId);
      const data = await service().readCase("reviewer", one.caseId);
      expect(data.previousCaseId).toBe(first.caseId);
      expect(data.independentReporterCount).toBe(2);
      expect(data.events.items.map(e => e.kind)).toEqual(["submitted", "submitted"]);
    } finally { await Promise.all([a.end(), b.end()]); }
  });

  it("rejects cross-target, open, self and rewritten predecessor links", async () => {
    const first = await decision(), other = await decision();
    const row = await service().readCase("reviewer", first.caseId);
    const insert = (id: string, target: string, previous: string) => client.query(`insert into forum_complaint_cases
      (id,target_id,previous_case_id) values ($1,$2,$3)`, [id,target,previous]);
    await expectCode(insert(randomUUID(), row.targetId, other.caseId), "23514");
    const self = randomUUID();
    await expectCode(insert(self, row.targetId, self), "23514");
    const next = await service().submit("reporter-two", report(first.post));
    await expectCode(insert(randomUUID(), row.targetId, next.caseId), "23514");
    await expectCode(client.query("update forum_complaint_cases set previous_case_id=null where id=$1", [next.caseId]), "55000");
  });

  it.each(["post","title"] as const)("links a new %s revision immediately while the previous Case stays open", async kind => {
    const c = await content();
    const first = await service().submit("reporter-one", report(c[kind]));
    const revisionId = randomUUID();
    if (kind === "post") {
      await forum.editPublishedPost({ topicId:c.post.topicId, postId:c.post.postId, actorId:"content-author",
        expectedRevisionId:c.post.revisionId, body:"Newer revision", draftId:randomUUID(), attachmentIds:[] });
    } else {
      await client.query(`insert into forum_topic_title_revisions(id,topic_id,author_id,original_content,source_locale)
        values($1,$2,'content-author','Newer title','en')`,[revisionId,c.title.topicId]);
      await client.query("update forum_topics set current_title_revision_id=$1 where id=$2",[revisionId,c.title.topicId]);
    }
    const row = kind === "post" ? await client.query("select current_revision_id as id from forum_posts where id=$1",[c.post.postId]) : {rows:[{id:revisionId}]};
    const before = await service().readCase("reviewer",first.caseId);
    const next = await service().submit("reporter-one", report({ ...c[kind], revisionId:row.rows[0].id }));
    expect(next.caseId).not.toBe(first.caseId);
    expect((await service().readCase("reviewer",next.caseId)).previousCaseId).toBe(first.caseId);
    expect(await service().readCase("reviewer",first.caseId)).toEqual(before);
  });
});

async function quotaActor() {
  const id=randomUUID();
  await client.query('insert into "user"(id,name,email) values($1,$1,$2)',[id,id+'@quota.test']);
  return id;
}

describe("production complaint submission windows", () => {
  it("allows ten new reports, rejects the eleventh, and accepts a duplicate without spending budget", async () => {
    const actor=await quotaActor();let first: Awaited<ReturnType<ComplaintsService["submit"]>> | undefined;
    let input: ReturnType<typeof report> | undefined;
    for(let n=0;n<10;n++) {
      const c=await content(), next=report(c.post);
      const saved=await limitedService().submit(actor,next);
      if(!n){first=saved;input=next;}
    }
    const c=await content();
    const error=await limitedService().submit(actor,report(c.title)).then(()=>null,e=>e);
    expect(error).toBeInstanceOf(ComplaintRateLimitError);
    expect(error.retryAfterMs).toBeGreaterThan(590_000);
    expect(await limitedService().submit(actor,{...input!,operationId:randomUUID()})).toEqual(first);
    expect((await client.query("select count(*)::int n from forum_complaints where reporter_user_id=$1",[actor])).rows[0].n).toBe(10);
    expect((await client.query("select id from forum_complaint_targets where title_revision_id=$1",[c.title.revisionId])).rows).toHaveLength(0);
  });

  it("enforces fifty per 24 hours and ignores expired history", async () => {
    const actor=await quotaActor(), expired=await quotaActor();
    // Historical fixtures are inserted with their original timestamps; append-only
    // production records are never edited to simulate time passing.
    for(let n=0;n<50;n++) {
      const c=await content(), seeded=await service().submit("reporter-one",report(c.post));
      const target=(await service().readCase("reviewer",seeded.caseId)).targetId;
      for(const [id,seconds] of [[actor,1200],[expired,90_000]] as const) {
        await client.query(`insert into forum_complaints(id,case_id,target_id,reporter_user_id,reason,created_at)
          values($1,$2,$3,$4,'spam',statement_timestamp()-($5::double precision*interval '1 second'))`,[randomUUID(),seeded.caseId,target,id,seconds]);
      }
    }
    const c=await content();
    const error=await limitedService().submit(actor,report(c.post)).then(()=>null,e=>e);
    expect(error).toBeInstanceOf(ComplaintRateLimitError);
    expect(error.retryAfterMs).toBeGreaterThan(85_000_000);
    await limitedService().submit(expired,report(c.post));
  });

  it("serializes concurrent last-slot submissions to different targets", async () => {
    const actor=await quotaActor();
    for(let n=0;n<9;n++)await limitedService().submit(actor,report((await content()).post));
    const a=await content(),b=await content();
    const connection=new Client({connectionString:databaseUrl,options});await connection.connect();
    try {
      const results=await Promise.allSettled([limitedService().submit(actor,report(a.post)),limitedService(connection).submit(actor,report(b.title))]);
      expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
      const rejected=results.find(r=>r.status==="rejected");
      expect(rejected?.status==="rejected"&&rejected.reason).toBeInstanceOf(ComplaintRateLimitError);
      expect((await client.query("select count(*)::int n from forum_complaints where reporter_user_id=$1",[actor])).rows[0].n).toBe(10);
    } finally {await connection.end();}
  });
});

it("submits through actual HTTP guard, authorization and PostgreSQL adapter without exposing Case IDs", async () => {
  const actor=await quotaActor(),c=await content();
  const context=new RouterContextProvider();context.set(authSessionContext,{user:{id:actor}} as never);
  const auth=createAuthorizationCapability(new PostgresAuthorizationRepository(pool));
  context.set(authorizationContext,auth as never);
  context.set(complaintSubmissionContext,createHyperdriveComplaintSubmission(databaseUrl!,auth,()=>new Client({connectionString:databaseUrl,options})));
  const send=(revisionId:string)=>submitAction({params:{topicId:c.post.topicId},context,
    request:new Request(`https://forum.test/en/topics/${c.post.topicId}/complaints`,{method:"POST",headers:{Origin:"https://forum.test"},
      body:new URLSearchParams({kind:"post",postId:c.post.postId,revisionId,reason:"spam",operationId:randomUUID()})})});
  const saved=await send(c.post.revisionId);
  expect(saved).toMatchObject({data:{ok:true}});
  if(!(saved instanceof Response))expect(Object.keys(saved.data).sort()).toEqual(["ok","operationId"]);
  expect(await send(randomUUID())).toMatchObject({data:{error:"conflict"},init:{status:409}});
  expect((await client.query("select count(*)::int n from forum_complaints where reporter_user_id=$1",[actor])).rows[0].n).toBe(1);
});

it("enforces normalized Unicode code-point explanation bounds through the actual HTTP service", async () => {
  const actor=await quotaActor();
  const context=new RouterContextProvider();context.set(authSessionContext,{user:{id:actor}} as never);
  const auth=createAuthorizationCapability(new PostgresAuthorizationRepository(pool));
  context.set(authorizationContext,auth as never);
  context.set(complaintSubmissionContext,createHyperdriveComplaintSubmission(databaseUrl!,auth,()=>new Client({connectionString:databaseUrl,options})));
  for(const [acceptedBefore,text] of ["😀".repeat(2000),"a".repeat(1000)+"😀".repeat(1000)].entries()) {
    const c=await content(),operationId=randomUUID();
    const send=(explanation:string)=>submitAction({params:{topicId:c.post.topicId},context,
      request:new Request(`https://forum.test/en/topics/${c.post.topicId}/complaints`,{method:"POST",headers:{Origin:"https://forum.test"},
        body:new URLSearchParams({kind:"post",postId:c.post.postId,revisionId:c.post.revisionId,reason:"other",operationId,explanation})})});
    expect(await send(text+"x")).toMatchObject({data:{error:"invalid"},init:{status:400}});
    expect((await client.query("select count(*)::int n from forum_complaints where reporter_user_id=$1",[actor])).rows[0].n).toBe(acceptedBefore);
    expect(await send("  "+text+"  ")).toMatchObject({data:{ok:true,operationId}});
    expect((await client.query("select explanation from forum_complaints c join forum_complaint_targets t on t.id=c.target_id where reporter_user_id=$1 and post_id=$2",[actor,c.post.postId])).rows[0].explanation).toBe(text);
  }
});

it("classifies actual wrapped database lock timeout as unavailable and permits retry", async () => {
  const actor=await quotaActor(),c=await content();
  const context=new RouterContextProvider();context.set(authSessionContext,{user:{id:actor}} as never);
  const auth=createAuthorizationCapability(new PostgresAuthorizationRepository(pool));context.set(authorizationContext,auth as never);
  context.set(complaintSubmissionContext,createHyperdriveComplaintSubmission(databaseUrl!,auth,
    ()=>new Client({connectionString:databaseUrl,options:options+" -c lock_timeout=100ms -c statement_timeout=200ms"})));
  const send=()=>submitAction({params:{topicId:c.title.topicId},context,
    request:new Request(`https://forum.test/en/topics/${c.title.topicId}/complaints`,{method:"POST",headers:{Origin:"https://forum.test"},
      body:new URLSearchParams({kind:"topic-title",revisionId:c.title.revisionId,reason:"spam",operationId:randomUUID()})})});
  const holder=new Client({connectionString:databaseUrl,options});await holder.connect();
  try {
    await holder.query("begin");await holder.query("lock table forum_complaints in access exclusive mode");
    expect(await send()).toMatchObject({data:{error:"unavailable"},init:{status:503}});
    await holder.query("rollback");expect(await send()).toMatchObject({data:{ok:true}});
  } finally {await holder.query("rollback");await holder.end();}
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

// Observe actual authorization SQL without changing its result or transaction boundaries.
// Commits on the independent management connection happen before the reader continues.
function observedAuthorizationPool(afterQuery: (sql: string) => Promise<void>): Pool {
  type QueryTarget = { query(sql: string, values?: unknown[]): Promise<unknown> };
  const query = async (target: QueryTarget, sql: string, values?: unknown[]) => {
    const result = await target.query(sql, values);
    await afterQuery(sql);
    return result;
  };
  return {
    query: (sql: string, values?: unknown[]) => query(pool as unknown as QueryTarget, sql, values),
    connect: async () => {
      const connection = await pool.connect();
      return {
        query: (sql: string, values?: unknown[]) => query(connection as unknown as QueryTarget, sql, values),
        release: () => connection.release(),
      } as unknown as PoolClient;
    },
    // The shared native pool belongs to this test file, not the request adapter.
    end: async () => {},
  } as unknown as Pool;
}

const identityPermission = "forum.complaint.reporterIdentity.read" as const;
const snapshotActor = "snapshot-reader";
const authorizationRepository = new PostgresAuthorizationRepository(pool);
const management = new AuthorizationService(authorizationRepository);
function readAuthorization(adapter: "postgres" | "hyperdrive", database = pool) {
  return adapter === "postgres"
    ? createAuthorizationCapability(new PostgresAuthorizationRepository(database))
    : createHyperdriveAuthorization(databaseUrl!, () => database === pool
      ? observedAuthorizationPool(async () => {}) : database);
}
async function readerPermissions(primary: PermissionKey, review: boolean, identity: boolean) {
  for (const key of ["forum.complaint.review", "forum.complaint.appeal.review", identityPermission] as const)
    await management.setUserOverride("admin", snapshotActor, key, "deny");
  if (review) await management.setUserOverride("admin", snapshotActor, primary, "allow");
  if (identity) await management.setUserOverride("admin", snapshotActor, identityPermission, "allow");
}
async function appealedCase() {
  const c = await decision();
  await service().appeal("reporter-one", { caseId: c.caseId, decisionId: c.decisionId,
    argument: "Snapshot review", operationId: randomUUID() });
  return c.caseId;
}

describe.each(["postgres", "hyperdrive"] as const)("complaint authorization snapshot / %s", (adapter) => {
  describe.each(["readCase", "readAppealCase"] as const)("%s", (method) => {
    const primary = method === "readCase" ? "forum.complaint.review" : "forum.complaint.appeal.review";

    it("never combines review-only and identity-only committed states", async () => {
      const caseId = await appealedCase();
      await readerPermissions(primary, true, false);
      const states: string[][] = [];
      const capture = async () => {
        const state = await authorizationRepository.resolveUser(snapshotActor);
        states.push(state.effectivePermissions.filter(key => key === primary || key === identityPermission));
      };
      await capture();
      let switched = false;
      const database = observedAuthorizationPool(async sql => {
        // Old has() path: one completed permission SELECT. Snapshot path: role SELECT
        // pins the transaction snapshot before grants/overrides are fetched.
        if (switched || !(sql.startsWith("select case") || sql.includes("explicit_assignment"))) return;
        switched = true;
        await management.setUserOverride("admin", snapshotActor, primary, "deny");
        await capture();
        await management.setUserOverride("admin", snapshotActor, identityPermission, "allow");
        await capture();
      });
      const capability = readAuthorization(adapter, database);
      const reader = new ComplaintsService(new DrizzleComplaintsRepository(drizzle(client)), capability);
      const data = await reader[method](snapshotActor, caseId);
      expect(switched).toBe(true);
      expect(states).toEqual([[primary], [], [identityPermission]]);
      expect(data.reports.items[0]).not.toHaveProperty("reporter");
      expect(data.appeals[0]).not.toHaveProperty("appellant");
      const next = adapter === "postgres" ? reader
        : new ComplaintsService(new DrizzleComplaintsRepository(drizzle(client)), readAuthorization(adapter));
      await expect(next[method](snapshotActor, caseId)).rejects.toBeInstanceOf(ComplaintForbiddenError);
    });

    it("keeps projection and next-call freshness across allow, deny and inherit", async () => {
      const caseId = await appealedCase();
      const capability = readAuthorization(adapter);
      const repository = new DrizzleComplaintsRepository(drizzle(client));
      const projected = vi.spyOn(repository, "readCase");
      // Reuse the ordinary capability across service calls; Hyperdrive is request-local.
      const reader = () => new ComplaintsService(repository, adapter === "postgres" ? capability : readAuthorization(adapter));
      for (const [review, identity] of [[true, false], [false, true], [true, true], [false, false]] as const) {
        await readerPermissions(primary, review, identity);
        projected.mockClear();
        if (!review) {
          await expect(reader()[method](snapshotActor, caseId)).rejects.toBeInstanceOf(ComplaintForbiddenError);
          expect(projected).not.toHaveBeenCalled();
        } else {
          const data = await reader()[method](snapshotActor, caseId);
          expect(data.reports.items[0]?.reporter?.id).toBe(identity ? "reporter-one" : undefined);
          expect(data.appeals[0]?.appellant?.id).toBe(identity ? "reporter-one" : undefined);
        }
      }
      await management.assignUserRole("admin", snapshotActor, "builtin-moderator");
      try {
        await management.setUserOverride("admin", snapshotActor, primary, null);
        const data = await reader()[method](snapshotActor, caseId);
        expect(data.reports.items[0]).not.toHaveProperty("reporter");
        await management.setUserOverride("admin", snapshotActor, primary, "deny");
        await expect(reader()[method](snapshotActor, caseId)).rejects.toBeInstanceOf(ComplaintForbiddenError);
      } finally {
        await management.assignUserRole("admin", snapshotActor, "builtin-user");
        projected.mockRestore();
      }
    });

    it("propagates authorization failure before any case projection", async () => {
      const failure = Object.assign(new Error("connection lost"), { code: "08006" });
      const database = {
        query: async () => { throw failure; },
        connect: async () => { throw failure; },
        end: async () => {},
      } as unknown as Pool;
      const repository = new DrizzleComplaintsRepository(drizzle(client));
      const projected = vi.spyOn(repository, "readCase");
      try {
        const reader = new ComplaintsService(repository, readAuthorization(adapter, database));
        const result = reader[method](snapshotActor, randomUUID());
        if (adapter === "hyperdrive") await expect(result).rejects.toBeInstanceOf(AuthorizationUnavailableError);
        else await expect(result).rejects.toBe(failure);
        expect(projected).not.toHaveBeenCalled();
      } finally { projected.mockRestore(); }
    });
  });
});

describe("complaints queue triage",()=>{
  it.each([
    ["spam",1],["harassment",2],["threats",3],["fraud-phishing",3],
    ["malicious-content",3],["personal-data",3],["impersonation",2],["other",1],
  ] as const)("assigns deterministic priority for %s and aggregates every independent report",async(reason,priority)=>{
    const c=await content();
    const first=await service().submit("reporter-one",{...report(c.post),reason,explanation:"Private explanation"});
    await service().submit("reporter-two",{...report(c.post),reason,explanation:"Another private explanation"});
    const triage=await service().readTriage("reviewer",first.caseId);
    expect(triage).toMatchObject({kind:"post",state:"open",priority,automaticPriority:priority,priorityOverride:null,reportCount:2,reasons:{[reason]:2}});
    expect(new Date(triage.firstReportedAt).getTime()).toBeLessThanOrEqual(new Date(triage.lastReportedAt).getTime());
    const serialized=JSON.stringify(triage);
    for(const hidden of ["reporter-one","reporter-two","Private explanation","Another private explanation","actorUserId","reporterUserId"])
      expect(serialized).not.toContain(hidden);
  });
  it("keeps full totals across bounded pages, ordered by effective priority, and excludes resolved Cases",async()=>{
    const before=(await service().readQueue("reviewer",0)).total;
    for(let n=0;n<27;n++)await service().submit("reporter-one",report((await content()).title));
    const closed=await decision();
    await expect(service().readTriage("reviewer",closed.caseId)).rejects.toBeInstanceOf(ComplaintNotFoundError);
    const total=before+27, ids:string[]=[],priorities:number[]=[];
    for(let page=0;page<Math.ceil(total/25);page++){
      const result=await service().readQueue("reviewer",page);
      expect(result.total).toBe(total);expect(result.cases.length).toBeLessThanOrEqual(25);
      expect(result.hasMore).toBe((page+1)*25<total);
      ids.push(...result.cases.map(c=>c.id));priorities.push(...result.cases.map(c=>c.priority));
    }
    expect(new Set(ids).size).toBe(total);expect(ids).not.toContain(closed.caseId);
    expect(priorities).toEqual([...priorities].sort((a,b)=>b-a));
    const empty=await service().readQueue("reviewer",Math.ceil(total/25));
    expect(empty).toMatchObject({total,cases:[],hasMore:false});
  });
  it("overrides automatic max priority with replay/CAS and can return to automatic",async()=>{
    const c=await content(),saved=await service().submit("reporter-one",report(c.title));
    const input={caseId:saved.caseId,operationId:randomUUID(),expectedVersion:1,priority:1};
    await service().changePriority("reviewer",input);
    await service().changePriority("reviewer",input);
    await service().changePriority("reviewer",{priority:1,expectedVersion:1,operationId:input.operationId,caseId:saved.caseId});
    await expect(service().changePriority("reviewer",{...input,priority:3})).rejects.toBeInstanceOf(ComplaintConflictError);
    await expect(service().changePriority("reviewer",{...input,operationId:randomUUID()})).rejects.toBeInstanceOf(ComplaintConflictError);
    await service().submit("reporter-two",{...report(c.title),reason:"threats"});
    expect(await service().readTriage("reviewer",saved.caseId)).toMatchObject({priority:1,automaticPriority:3,priorityOverride:1,version:3});
    await service().changePriority("reviewer",{caseId:saved.caseId,operationId:randomUUID(),expectedVersion:3,priority:null});
    expect(await service().readTriage("reviewer",saved.caseId)).toMatchObject({priority:3,priorityOverride:null,version:4});
    const events=await client.query("select priority_override from forum_complaint_events where case_id=$1 and kind='priority-changed' order by created_at",[saved.caseId]);
    expect(events.rows).toEqual([{priority_override:1},{priority_override:null}]);
    await expectCode(client.query("update forum_complaint_events set priority_override=2 where case_id=$1 and kind='priority-changed'",[saved.caseId]),"55000");
  });
  it("serializes concurrent overrides and rolls back when priority event persistence fails",async()=>{
    const c=await content(),saved=await service().submit("reporter-one",report(c.post));
    const other=new Client({connectionString:databaseUrl,options});await other.connect();
    try{
      const commands=[service().changePriority("reviewer",{caseId:saved.caseId,operationId:randomUUID(),expectedVersion:1,priority:3}),
        service(other).changePriority("admin",{caseId:saved.caseId,operationId:randomUUID(),expectedVersion:1,priority:2})];
      const results=await Promise.allSettled(commands);
      expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
      const rejected=results.find(r=>r.status==="rejected");expect(rejected?.status==="rejected"&&rejected.reason).toBeInstanceOf(ComplaintConflictError);
    }finally{await other.end();}
    const before=await service().readTriage("reviewer",saved.caseId);
    await client.query(`create function fail_queue_event() returns trigger language plpgsql as $$begin if new.kind='priority-changed' then raise exception 'priority event failure'; end if; return new; end$$;
      create trigger fail_queue_event before insert on forum_complaint_events for each row execute function fail_queue_event()`);
    try{
      await expect(service().changePriority("reviewer",{caseId:saved.caseId,operationId:randomUUID(),expectedVersion:before.version,priority:null})).rejects.toThrow();
      expect(await service().readTriage("reviewer",saved.caseId)).toEqual(before);
    }finally{await client.query("drop trigger fail_queue_event on forum_complaint_events;drop function fail_queue_event()");}
  });
  it("allows non-exclusive activity, excludes oneself and expires by DB time without touching Case version",async()=>{
    const c=await content(),saved=await service().submit("reporter-one",report(c.post));
    const before=(await client.query("select * from forum_complaint_cases where id=$1",[saved.caseId])).rows;
    await service().activity("reviewer",saved.caseId,true);await service().activity("admin",saved.caseId,true);
    expect((await service().readTriage("reviewer",saved.caseId)).activeElsewhere).toBe(true);
    expect((await service().readTriage("admin",saved.caseId)).activeElsewhere).toBe(true);
    const expiry=await client.query("select extract(epoch from expires_at-statement_timestamp()) as seconds from forum_complaint_activity where case_id=$1",[saved.caseId]);
    expect(expiry.rows.every(r=>Number(r.seconds)>85&&Number(r.seconds)<=90)).toBe(true);
    await service().activity("admin",saved.caseId,false);
    expect((await service().readTriage("reviewer",saved.caseId)).activeElsewhere).toBe(false);
    await service().activity("admin",saved.caseId,true);
    await client.query("update forum_complaint_activity set expires_at=statement_timestamp()-interval '1 second' where case_id=$1",[saved.caseId]);
    expect((await service().readTriage("reviewer",saved.caseId)).activeElsewhere).toBe(false);
    expect((await client.query("select * from forum_complaint_cases where id=$1",[saved.caseId])).rows).toEqual(before);
  });
  it("requires fresh review permission for all queue capabilities and rejects invalid/stale/closed writes",async()=>{
    const c=await content(),saved=await service().submit("reporter-one",report(c.title));
    await expect(service().readQueue("reporter-one",0)).rejects.toBeInstanceOf(ComplaintForbiddenError);
    await expect(service().activity("outsider",saved.caseId,true)).rejects.toBeInstanceOf(ComplaintForbiddenError);
    await client.query("insert into authz_user_permission_overrides(user_id,permission_key,effect) values('outsider','forum.complaint.review','allow')");
    try{
      await service().readQueue("outsider",0);await service().activity("outsider",saved.caseId,true);
      await client.query("update authz_user_permission_overrides set effect='deny' where user_id='outsider' and permission_key='forum.complaint.review'");
      await expect(service().readTriage("outsider",saved.caseId)).rejects.toBeInstanceOf(ComplaintForbiddenError);
      await expect(service().changePriority("outsider",{caseId:saved.caseId,operationId:randomUUID(),expectedVersion:1,priority:3})).rejects.toBeInstanceOf(ComplaintForbiddenError);
    }finally{await client.query("delete from authz_user_permission_overrides where user_id='outsider' and permission_key='forum.complaint.review'");}
    for(const priority of [0,4,1.5])await expect(service().changePriority("reviewer",{caseId:saved.caseId,operationId:randomUUID(),expectedVersion:1,priority})).rejects.toBeInstanceOf(ComplaintInputError);
    await expect(service().readQueue("reviewer",10001)).rejects.toBeInstanceOf(ComplaintInputError);
    await service().decide("reviewer",{caseId:saved.caseId,operationId:randomUUID(),expectedVersion:1,outcome:"not-confirmed",reasoning:"Resolved"});
    await expect(service().changePriority("reviewer",{caseId:saved.caseId,operationId:randomUUID(),expectedVersion:2,priority:3})).rejects.toBeInstanceOf(ComplaintConflictError);
    await expect(service().activity("reviewer",saved.caseId,true)).rejects.toBeInstanceOf(ComplaintNotFoundError);
  });
});
