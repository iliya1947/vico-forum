import { createHash, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { readComplaintQueue } from "./complaint-queue-read";
import { COMPLAINT_ACTIVITY_SECONDS, type ComplaintPriorityCommand } from "../app/complaints/queue-contract";
import {
  ComplaintConflictError, ComplaintForbiddenError, ComplaintNotFoundError,
  ComplaintPolicyRequiredError, ComplaintRateLimitError, COMPLAINT_SUBMISSION_LIMITS,
  type ComplaintOutcome, type ComplaintReason, type ComplaintTarget,
} from "./complaints-domain";

type Tx = Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0];
export interface ComplaintCommand { operationId: string }
export interface SubmitComplaint extends ComplaintCommand {
  target: ComplaintTarget; reason: ComplaintReason; explanation: string | null;
}
export interface ComplaintCaseCommand extends ComplaintCommand { caseId: string }
export interface DecideComplaint extends ComplaintCaseCommand {
  expectedVersion: number; outcome: ComplaintOutcome; reasoning: string;
}
export interface AppealComplaint extends ComplaintCaseCommand { decisionId: string; argument: string }
export interface ResolveComplaintAppeal extends ComplaintCaseCommand {
  appealId: string; outcome: "upheld" | "overturned"; reasoning: string;
}
export interface ComplaintRecord {
  id: string; reason: ComplaintReason; explanation: string | null; createdAt: Date;
  reporter?: { id: string; name: string };
}
export interface ComplaintAppealRecord {
  id: string; decisionId: string; side: "author" | "reporter"; argument: string; ordinal: number;
  status: string; outcome: string | null; reasoning: string | null; createdAt: Date; resolvedAt: Date | null;
  appellant?: { id: string; name: string };
}
interface CaseRow extends Record<string, unknown> {
  id: string; targetId: string; state: string; version: number; initialDecisionId: string | null;
  previousCaseId: string | null;
  priorityOverride: number | null;
}
interface ReplayRow extends Record<string, unknown> { fingerprint: string; entityId: string; caseId: string }

/** Trusted DB adapter; application callers use ComplaintsService, never browser-supplied access flags. */
export class DrizzleComplaintsRepository {
  constructor(private readonly database: NodePgDatabase,
    private readonly limits: { tenMinutes: number; day: number } = COMPLAINT_SUBMISSION_LIMITS) {}

  private async submissionBudget(tx: Tx, actorId: string) {
    // The caller holds the actor mutex across this read and the complaint INSERT.
    const recent = await tx.execute<{ createdAt: number; now: number }>(sql`
      select extract(epoch from created_at)::double precision*1000 as "createdAt",
        extract(epoch from statement_timestamp())::double precision*1000 as now from forum_complaints
      where reporter_user_id=${actorId} and created_at > statement_timestamp() - interval '24 hours'
      order by created_at desc,id desc limit ${Math.max(this.limits.tenMinutes,this.limits.day)}`);
    const now = recent.rows[0]?.now;
    if (now === undefined) return;
    const burst = recent.rows[this.limits.tenMinutes - 1];
    const daily = recent.rows[this.limits.day - 1];
    const retryAfterMs = Math.max(0,
      burst ? burst.createdAt + 600_000 - now : 0,
      daily ? daily.createdAt + 86_400_000 - now : 0);
    if (retryAfterMs > 0) throw new ComplaintRateLimitError(retryAfterMs);
  }

  private async actorMutex(tx: Tx, actorId: string) {
    // Compatible with FK KEY SHARE; never use FOR UPDATE on this user mutex.
    const r = await tx.execute(sql`select id from "user" where id=${actorId} for no key update`);
    if (!r.rows.length) throw new ComplaintForbiddenError("authenticated actor required");
  }

  private async replay(tx: Tx, actorId: string, operationId: string, fingerprint: string) {
    const r = await tx.execute<ReplayRow>(sql`
      select fingerprint, case_id as "caseId", coalesce(complaint_id,decision_id,note_id,appeal_id) as "entityId"
      from forum_complaint_events where actor_user_id=${actorId} and operation_id=${operationId}`);
    const row = r.rows[0];
    if (row && row.fingerprint !== fingerprint) throw new ComplaintConflictError("operation payload changed");
    return row;
  }

  private async event(tx: Tx, actorId: string, input: ComplaintCaseCommand, fingerprint: string,
    kind: "submitted" | "decided" | "noted" | "appealed" | "appeal-resolved" | "priority-changed", entityId: string, priority: number | null = null) {
    await tx.execute(sql`insert into forum_complaint_events
      (id,case_id,kind,actor_user_id,operation_id,fingerprint,complaint_id,decision_id,note_id,appeal_id,priority_override,created_at)
      values (${randomUUID()},${input.caseId},${kind},${actorId},${input.operationId},${fingerprint},
      ${kind === "submitted" ? entityId : null},${kind === "decided" ? entityId : null},
      ${kind === "noted" ? entityId : null},${kind === "appealed" || kind === "appeal-resolved" ? entityId : null},${priority},statement_timestamp())`);
  }

  private async lockCase(tx: Tx, caseId: string): Promise<CaseRow> {
    const r = await tx.execute<CaseRow>(sql`select id,target_id as "targetId",state,version,
      initial_decision_id as "initialDecisionId",previous_case_id as "previousCaseId",priority_override as "priorityOverride" from forum_complaint_cases where id=${caseId} for update`);
    if (!r.rows[0]) throw new ComplaintNotFoundError("case not found");
    return r.rows[0];
  }

  async readQueue(actorId: string, page: number) { return readComplaintQueue(this.database,actorId,page); }

  async readTriage(actorId: string, caseId: string) {
    const result=await readComplaintQueue(this.database,actorId,0,caseId);
    if(!result.cases[0])throw new ComplaintNotFoundError("open case not found");
    return result.cases[0];
  }

  async changePriority(actorId: string, input: ComplaintPriorityCommand) {
    const fingerprint=digest("priority",input);
    await this.database.transaction(async tx=>{
      await this.actorMutex(tx,actorId);
      const c=await this.lockCase(tx,input.caseId);
      if(await this.replay(tx,actorId,input.operationId,fingerprint))return;
      if(c.state!=="open"||c.version!==input.expectedVersion)throw new ComplaintConflictError("case changed");
      await tx.execute(sql`update forum_complaint_cases set priority_override=${input.priority},version=version+1 where id=${c.id}`);
      await this.event(tx,actorId,input,fingerprint,"priority-changed",c.id,input.priority);
    });
  }

  async activity(actorId: string, caseId: string, active: boolean) {
    await this.database.transaction(async tx=>{
      const c=await tx.execute(sql`select id from forum_complaint_cases where id=${caseId} and state='open' for share`);
      if(!c.rows.length)throw new ComplaintNotFoundError("open case not found");
      await tx.execute(sql`insert into forum_complaint_activity(case_id,reviewer_user_id,expires_at)
        values(${caseId},${actorId},statement_timestamp()+${active?COMPLAINT_ACTIVITY_SECONDS:0}*interval '1 second')
        on conflict(case_id,reviewer_user_id) do update set expires_at=excluded.expires_at`);
    });
  }

  async submit(actorId: string, input: SubmitComplaint) {
    const fingerprint = digest("submit", input);
    return this.database.transaction(async tx => {
      const t = input.target;
      // Lock authoritative current content before actor/target/case, matching forum lock order.
      const content = t.kind === "post"
        ? await tx.execute<{ revisionId: string; authorId: string }>(sql`select current_revision_id as "revisionId", author_id as "authorId"
            from forum_posts where id=${t.postId} and topic_id=${t.topicId} for update`)
        : await tx.execute<{ revisionId: string; authorId: string }>(sql`select current_title_revision_id as "revisionId", author_id as "authorId"
            from forum_topics where id=${t.topicId} for update`);
      const current = content.rows[0];
      if (!current) throw new ComplaintNotFoundError("target not found");
      await this.actorMutex(tx, actorId);
      const replay = await this.replay(tx, actorId, input.operationId, fingerprint);
      if (replay) return { complaintId: replay.entityId, caseId: replay.caseId };
      // A committed identical retry remains valid after edits; a fresh report never silently retargets.
      if (current.revisionId !== t.revisionId) throw new ComplaintConflictError("reported revision changed");
      const where = t.kind === "post"
        ? sql`kind='post' and post_id=${t.postId} and post_revision_id=${t.revisionId}`
        : sql`kind='topic-title' and topic_id=${t.topicId} and title_revision_id=${t.revisionId}`;
      let targets = await tx.execute<{ id: string }>(sql`select id from forum_complaint_targets where ${where}`);
      if (!targets.rows.length) {
        await tx.execute(sql`insert into forum_complaint_targets
          (id,kind,topic_id,post_id,post_revision_id,title_revision_id,affected_author_id)
          values (${randomUUID()},${t.kind},${t.topicId},${t.kind === "post" ? t.postId : null},
          ${t.kind === "post" ? t.revisionId : null},${t.kind === "topic-title" ? t.revisionId : null},${current.authorId})`);
        targets = await tx.execute<{ id: string }>(sql`select id from forum_complaint_targets where ${where}`);
      }
      const targetId = targets.rows[0]!.id;
      const duplicate = await tx.execute<{ id: string; caseId: string; reason: string; explanation: string | null }>(sql`
        select id,case_id as "caseId",reason,explanation from forum_complaints
        where reporter_user_id=${actorId} and target_id=${targetId}`);
      if (duplicate.rows[0]) {
        const d = duplicate.rows[0];
        if (d.reason !== input.reason || d.explanation !== input.explanation) throw new ComplaintConflictError("report already submitted");
        return { complaintId: d.id, caseId: d.caseId };
      }
      await this.submissionBudget(tx, actorId);
      const cases = await tx.execute<{ id: string }>(sql`select id from forum_complaint_cases where target_id=${targetId} and state='open' for update`);
      let caseId = cases.rows[0]?.id;
      const existingCase = Boolean(caseId);
      if (!caseId) {
        const previous = await tx.execute<{ id: string }>(sql`select id from forum_complaint_cases
          where target_id=${targetId} and state='resolved' order by resolved_at desc,created_at desc,id desc limit 1`);
        const otherRevision = previous.rows.length ? previous : await tx.execute<{ id: string }>(sql`
          select c.id from forum_complaint_cases c join forum_complaint_targets t on t.id=c.target_id
          where t.id <> ${targetId} and t.kind=${t.kind} and t.topic_id=${t.topicId}
          and t.post_id is not distinct from ${t.kind === "post" ? t.postId : null}
          order by c.created_at desc,c.id desc limit 1`);
        caseId = randomUUID();
        await tx.execute(sql`insert into forum_complaint_cases (id,target_id,previous_case_id,created_at)
          values (${caseId},${targetId},${otherRevision.rows[0]?.id ?? null},statement_timestamp())`);
        if (t.kind === "post") {
          // Content lock serializes capture with edits. Active-ref trigger serializes with cleanup.
          await tx.execute(sql`insert into forum_complaint_evidence_attachments(target_id,attachment_id,created_at)
            select ${targetId},attachment_id,statement_timestamp() from forum_post_attachments
            where post_id=${t.postId} order by attachment_id on conflict do nothing`);
        }
      }
      if (existingCase) await tx.execute(sql`update forum_complaint_cases set version=version+1 where id=${caseId}`);
      const complaintId = randomUUID();
      await tx.execute(sql`insert into forum_complaints(id,case_id,target_id,reporter_user_id,reason,explanation,created_at)
        values (${complaintId},${caseId},${targetId},${actorId},${input.reason},${input.explanation},statement_timestamp())`);
      await this.event(tx, actorId, { ...input, caseId }, fingerprint, "submitted", complaintId);
      return { complaintId, caseId };
    });
  }

  async addNote(actorId: string, input: ComplaintCaseCommand & { body: string }) {
    const fingerprint = digest("note", input);
    return this.database.transaction(async tx => {
      await this.actorMutex(tx, actorId);
      const c = await this.lockCase(tx, input.caseId);
      const replay = await this.replay(tx, actorId, input.operationId, fingerprint);
      if (replay) return replay.entityId;
      const id = randomUUID();
      await tx.execute(sql`insert into forum_complaint_notes(id,case_id,author_user_id,body,created_at)
        values (${id},${c.id},${actorId},${input.body},statement_timestamp())`);
      await tx.execute(sql`update forum_complaint_cases set version=version+1 where id=${c.id}`);
      await this.event(tx, actorId, input, fingerprint, "noted", id);
      return id;
    });
  }

  async decide(actorId: string, input: DecideComplaint) {
    const fingerprint = digest("decide", input);
    return this.database.transaction(async tx => {
      await this.actorMutex(tx, actorId);
      const c = await this.lockCase(tx, input.caseId);
      const replay = await this.replay(tx, actorId, input.operationId, fingerprint);
      if (replay) return replay.entityId;
      if (c.state !== "open" || c.version !== input.expectedVersion) throw new ComplaintConflictError("case changed");
      const id = randomUUID();
      await tx.execute(sql`insert into forum_complaint_decisions(id,case_id,outcome,reviewer_user_id,reasoning,created_at)
        values (${id},${c.id},${input.outcome},${actorId},${input.reasoning},statement_timestamp())`);
      await tx.execute(sql`update forum_complaint_cases set state='resolved',initial_decision_id=${id},
        version=version+1,resolved_at=statement_timestamp() where id=${c.id}`);
      await this.event(tx, actorId, input, fingerprint, "decided", id);
      return id;
    });
  }

  async appeal(actorId: string, input: AppealComplaint) {
    const fingerprint = digest("appeal", input);
    return this.database.transaction(async tx => {
      await this.actorMutex(tx, actorId);
      const c = await this.lockCase(tx, input.caseId);
      const replay = await this.replay(tx, actorId, input.operationId, fingerprint);
      if (replay) return replay.entityId;
      if (c.state !== "resolved" || c.initialDecisionId !== input.decisionId) throw new ComplaintConflictError("decision changed");
      const r = await tx.execute<{ outcome: ComplaintOutcome; author: string }>(sql`select d.outcome,t.affected_author_id as author
        from forum_complaint_decisions d join forum_complaint_cases c on c.id=d.case_id
        join forum_complaint_targets t on t.id=c.target_id where d.id=${input.decisionId} and c.id=${c.id}`);
      const decision = r.rows[0]!;
      let side: "author" | "reporter";
      if (decision.outcome === "confirmed" && decision.author === actorId) side = "author";
      else if (decision.outcome === "not-confirmed") {
        const own = await tx.execute(sql`select id from forum_complaints where case_id=${c.id} and reporter_user_id=${actorId} limit 1`);
        if (!own.rows.length) throw new ComplaintForbiddenError("not a participant in this direction");
        side = "reporter";
      } else throw new ComplaintForbiddenError("not a participant in this direction");
      const existing = await tx.execute<{ ordinal: number; status: string }>(sql`select ordinal,status from forum_complaint_appeals
        where decision_id=${input.decisionId} order by ordinal`);
      if (existing.rows.length >= 3) throw new ComplaintConflictError("appeal limit reached");
      // Only the first appeal is product-unambiguous. Storage supports 1..3; no pending uniqueness policy.
      if (existing.rows.length) throw new ComplaintPolicyRequiredError("subsequent appeal transitions require product policy");
      const id = randomUUID();
      await tx.execute(sql`insert into forum_complaint_appeals(id,case_id,decision_id,appellant_user_id,side,argument,ordinal,created_at)
        values (${id},${c.id},${input.decisionId},${actorId},${side},${input.argument},1,statement_timestamp())`);
      await this.event(tx, actorId, input, fingerprint, "appealed", id);
      return id;
    });
  }

  async resolveAppeal(actorId: string, input: ResolveComplaintAppeal) {
    const fingerprint = digest("resolve-appeal", input);
    return this.database.transaction(async tx => {
      await this.actorMutex(tx, actorId);
      await this.lockCase(tx, input.caseId);
      const replay = await this.replay(tx, actorId, input.operationId, fingerprint);
      if (replay) return replay.entityId;
      const r = await tx.execute(sql`update forum_complaint_appeals set status='resolved',outcome=${input.outcome},
        reasoning=${input.reasoning},reviewer_user_id=${actorId},resolved_at=statement_timestamp()
        where id=${input.appealId} and case_id=${input.caseId} and status='pending' returning id`);
      if (!r.rows.length) throw new ComplaintConflictError("appeal is not the expected pending appeal");
      await this.event(tx, actorId, input, fingerprint, "appeal-resolved", input.appealId);
      // Original Decision remains immutable; no sanctions or speculative re-appeal/effective-outcome policy.
      return input.appealId;
    });
  }

  async readCase(caseId: string, identities: boolean, pages: { reports: number; notes: number; events: number }) {
    return this.database.transaction(async tx => {
      const c = await tx.execute<CaseRow & { kind: string; topicId: string; postId: string | null; reportedContent: string; currentContent: string; affectedAuthorId: string }>(sql`
        select c.id,c.target_id as "targetId",c.previous_case_id as "previousCaseId",c.priority_override as "priorityOverride",c.state,c.version,c.initial_decision_id as "initialDecisionId",
        t.kind,t.topic_id as "topicId",t.post_id as "postId",t.affected_author_id as "affectedAuthorId",
        coalesce(pr.original_content,tr.original_content) as "reportedContent",
        coalesce(cp.original_content,ct.original_content) as "currentContent"
        from forum_complaint_cases c join forum_complaint_targets t on t.id=c.target_id
        left join forum_post_revisions pr on pr.id=t.post_revision_id and pr.post_id=t.post_id
        left join forum_topic_title_revisions tr on tr.id=t.title_revision_id and tr.topic_id=t.topic_id
        left join forum_posts p on p.id=t.post_id
        left join forum_post_revisions cp on cp.id=p.current_revision_id and cp.post_id=p.id
        join forum_topics topic on topic.id=t.topic_id
        left join forum_topic_title_revisions ct on ct.id=topic.current_title_revision_id and t.kind='topic-title'
        where c.id=${caseId}`);
      const row = c.rows[0];
      if (!row) throw new ComplaintNotFoundError("case not found");
      const reports = await tx.execute<ComplaintRecord & Record<string, unknown>>(sql`select r.id,r.reason,r.explanation,r.created_at as "createdAt"
        ${identities ? sql`, json_build_object('id',u.id,'name',u.name) as reporter` : sql``}
        from forum_complaints r ${identities ? sql`join "user" u on u.id=r.reporter_user_id` : sql``}
        where r.case_id=${caseId} order by r.created_at,r.id limit 51 offset ${pages.reports * 50}`);
      const notes = await tx.execute<{ id: string; body: string; authorId: string; createdAt: Date }>(sql`
        select id,body,author_user_id as "authorId",created_at as "createdAt" from forum_complaint_notes
        where case_id=${caseId} order by created_at,id limit 51 offset ${pages.notes * 50}`);
      const events = await tx.execute<{ id: string; kind: string; createdAt: Date }>(sql`
        select id,kind,created_at as "createdAt" from forum_complaint_events where case_id=${caseId}
        order by created_at,id limit 51 offset ${pages.events * 50}`);
      const appeals = await tx.execute<ComplaintAppealRecord & Record<string, unknown>>(sql`
        select a.id,a.decision_id as "decisionId",a.side,a.argument,a.ordinal,a.status,a.outcome,a.reasoning,
        a.created_at as "createdAt",a.resolved_at as "resolvedAt"
        ${identities ? sql`,json_build_object('id',u.id,'name',u.name) as appellant` : sql``}
        from forum_complaint_appeals a ${identities ? sql`join "user" u on u.id=a.appellant_user_id` : sql``}
        where a.case_id=${caseId} order by a.ordinal`);
      const decisions = await tx.execute<{ id: string; outcome: ComplaintOutcome; reasoning: string; createdAt: Date }>(sql`
        select id,outcome,reasoning,created_at as "createdAt" from forum_complaint_decisions where case_id=${caseId}`);
      const counts = await tx.execute<{ total: number }>(sql`select count(distinct reporter_user_id)::int as total from forum_complaints where case_id=${caseId}`);
      const evidence = await tx.execute<{ id: string; fileName: string; byteSize: number; detectedType: string }>(sql`
        select a.id,a.file_name as "fileName",a.byte_size as "byteSize",a.detected_type as "detectedType"
        from forum_complaint_evidence_attachments e join forum_attachments a on a.id=e.attachment_id
        where e.target_id=${row.targetId} order by a.id limit 101`);
      return { ...row, reports: page(reports.rows), notes: page(notes.rows), events: page(events.rows),
        appeals: appeals.rows, decision: decisions.rows[0] ?? null, independentReporterCount: counts.rows[0]!.total,
        evidence: { items: evidence.rows.slice(0,100), hasMore: evidence.rows.length > 100 } };
    }, { isolationLevel: "repeatable read", accessMode: "read only" });
  }

  async readOwnResult(actorId: string, caseId: string) {
    const r = await this.database.execute<{ caseId: string; decisionId: string; outcome: ComplaintOutcome; reasoning: string }>(sql`
      select c.id as "caseId",d.id as "decisionId",d.outcome,d.reasoning
      from forum_complaint_cases c join forum_complaint_targets t on t.id=c.target_id
      join forum_complaint_decisions d on d.id=c.initial_decision_id and d.case_id=c.id
      where c.id=${caseId} and (t.affected_author_id=${actorId} or exists
        (select 1 from forum_complaints r where r.case_id=c.id and r.reporter_user_id=${actorId}))`);
    if (!r.rows[0]) throw new ComplaintNotFoundError("result not found");
    return r.rows[0];
  }
}

function digest(kind: string, input: object) {
  return createHash("sha256").update(JSON.stringify([kind,input])).digest("hex");
}
function page<T>(rows: T[]) { return { items: rows.slice(0,50), hasMore: rows.length > 50 }; }
