import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { ComplaintNotFoundError } from "./complaints-domain";

export interface ComplaintResolvedHistoryItem {
  id:string;kind:"post"|"topic-title";text:string;sourceLocale:string;
  resolvedAt:Date;outcome:"confirmed"|"not-confirmed";independentReporterCount:number;
}
export interface ComplaintResolvedHistoryPage {
  cases:ComplaintResolvedHistoryItem[];page:number;total:number;hasMore:boolean;
}
export interface ComplaintTimelineEvent {
  id:string;kind:"submitted"|"noted"|"decided"|"priority-changed"|"review-started"|"appealed"|"appeal-resolved";
  createdAt:Date;moderatorName:string|null;reason:string|null;explanation:string|null;
  noteBody:string|null;decisionOutcome:string|null;reasoning:string|null;
  priorityOverride:number|null;appealArgument:string|null;appealSide:string|null;
  appealOrdinal:number|null;appealOutcome:string|null;appealReasoning:string|null;
  reporterName:string|null;reporterId:string|null;appellantName:string|null;appellantId:string|null;
}
export interface ComplaintTimelinePage {
  caseId:string;outcome:"confirmed"|"not-confirmed";resolvedAt:Date;events:ComplaintTimelineEvent[];
  page:number;total:number;hasMore:boolean;
}
export async function readComplaintResolvedHistory(db:NodePgDatabase,page:number):Promise<ComplaintResolvedHistoryPage>{
  return db.transaction(async tx=>{
    const counts=await tx.execute<{total:number}>(sql`select count(*)::int as total from forum_complaint_cases where state='resolved'`);
    const list=await tx.execute<ComplaintResolvedHistoryItem & Record<string,unknown>>(sql`
      select c.id,t.kind,left(coalesce(pr.original_content,tr.original_content,''),500) as text,
        coalesce(pr.source_locale,tr.source_locale,'und') as "sourceLocale",
        c.resolved_at as "resolvedAt",d.outcome,
        (select count(distinct reporter_user_id)::int from forum_complaints r where r.case_id=c.id) as "independentReporterCount"
      from forum_complaint_cases c join forum_complaint_targets t on t.id=c.target_id
      join forum_complaint_decisions d on d.id=c.initial_decision_id
      left join forum_post_revisions pr on pr.id=t.post_revision_id and pr.post_id=t.post_id
      left join forum_topic_title_revisions tr on tr.id=t.title_revision_id and tr.topic_id=t.topic_id
      where c.state='resolved' order by c.resolved_at desc,c.id desc
      limit 26 offset ${page*25}`);
    return {cases:list.rows.slice(0,25),page,total:counts.rows[0]?.total??0,hasMore:list.rows.length>25};
  },{isolationLevel:"repeatable read",accessMode:"read only"});
}
export async function readComplaintTimeline(db:NodePgDatabase,caseId:string,page:number,identity:boolean):Promise<ComplaintTimelinePage>{
  return db.transaction(async tx=>{
    const header=await tx.execute<{outcome:"confirmed"|"not-confirmed";resolvedAt:Date}>(sql`
      select d.outcome,c.resolved_at as "resolvedAt" from forum_complaint_cases c
      join forum_complaint_decisions d on d.id=c.initial_decision_id
      where c.id=${caseId} and c.state='resolved'`);
    if(!header.rows[0])throw new ComplaintNotFoundError("resolved case not found");
    const counts=await tx.execute<{total:number}>(sql`select count(*)::int as total from forum_complaint_events where case_id=${caseId}`);
    const events=await tx.execute<ComplaintTimelineEvent & Record<string,unknown>>(sql`
      select e.id,e.kind,e.created_at as "createdAt",
        case when e.kind in ('submitted','appealed') then null else moderator.name end as "moderatorName",
        report.reason,report.explanation,note.body as "noteBody",
        decision.outcome as "decisionOutcome",decision.reasoning,
        e.priority_override as "priorityOverride",
        appeal.argument as "appealArgument",appeal.side as "appealSide",appeal.ordinal as "appealOrdinal",
        case when e.kind='appeal-resolved' then appeal.outcome else null end as "appealOutcome",
        case when e.kind='appeal-resolved' then appeal.reasoning else null end as "appealReasoning",
        ${identity?sql`reporter.name`:sql`null::text`} as "reporterName",
        ${identity?sql`reporter.id`:sql`null::text`} as "reporterId",
        ${identity?sql`appellant.name`:sql`null::text`} as "appellantName",
        ${identity?sql`appellant.id`:sql`null::text`} as "appellantId"
      from forum_complaint_events e
      left join forum_complaints report on report.id=e.complaint_id and report.case_id=e.case_id
      left join forum_complaint_notes note on note.id=e.note_id and note.case_id=e.case_id
      left join forum_complaint_decisions decision on decision.id=e.decision_id and decision.case_id=e.case_id
      left join forum_complaint_appeals appeal on appeal.id=e.appeal_id and appeal.case_id=e.case_id
      left join "user" moderator on moderator.id=e.actor_user_id and e.kind not in ('submitted','appealed')
      ${identity?sql`left join "user" reporter on reporter.id=report.reporter_user_id
        left join "user" appellant on appellant.id=appeal.appellant_user_id`:sql``}
      where e.case_id=${caseId}
      order by e.created_at,e.id limit 51 offset ${page*50}`);
    return {caseId,outcome:header.rows[0].outcome,resolvedAt:header.rows[0].resolvedAt,
      events:events.rows.slice(0,50),total:counts.rows[0]?.total??0,page,hasMore:events.rows.length>50};
  },{isolationLevel:"repeatable read",accessMode:"read only"});
}
