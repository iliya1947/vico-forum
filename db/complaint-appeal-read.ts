import {sql} from "drizzle-orm";
import type {NodePgDatabase} from "drizzle-orm/node-postgres";
import {ComplaintNotFoundError,type ComplaintOutcome} from "./complaints-domain";
import {deriveAppealPolicy,type AppealState} from "./complaint-appeal-policy";
import {readComplaintReview} from "./complaint-review-read";
import type {ReviewCase,ReviewPages} from "../app/complaints/review-contract";

export interface PendingAppealSummary {
 id:string;caseId:string;ordinal:number;createdAt:Date;kind:"post"|"topic-title";
 excerpt:string;sourceLocale:string;initialOutcome:ComplaintOutcome;effectiveOutcome:ComplaintOutcome;
 ownInitialDecision:boolean;
}
export interface PendingAppealsPage {appeals:PendingAppealSummary[];total:number;page:number;hasMore:boolean}
export interface AppealReviewSummary {
 id:string;caseId:string;decisionId:string;ordinal:number;side:"author"|"reporter";
 argument:string;status:"pending"|"resolved";outcome:"upheld"|"overturned"|null;
 reasoning:string|null;createdAt:Date;resolvedAt:Date|null;
 initialOutcome:ComplaintOutcome;effectiveOutcome:ComplaintOutcome;
 ownInitialDecision:boolean;appellant?:{id:string;name:string};
}
export interface AppealReviewPage {appeal:AppealReviewSummary;caseReview:ReviewCase;appeals:AppealReviewSummary[]}

/** Independent total, priority toward appeals where the viewer did not make the initial Decision. */
export async function readPendingAppeals(db:NodePgDatabase,actor:string,page:number):Promise<PendingAppealsPage>{
 return db.transaction(async tx=>{
   const total=await tx.execute<{total:number}>(sql`select count(*)::int as total
     from forum_complaint_appeals where status='pending'`);
   const rows=await tx.execute<(PendingAppealSummary & Record<string,unknown>)>(sql`
     select a.id,a.case_id as "caseId",a.ordinal,a.created_at as "createdAt",
       target.kind,left(coalesce(pr.original_content,tr.original_content,''),500) as excerpt,
       coalesce(pr.source_locale,tr.source_locale,'und') as "sourceLocale",
       d.outcome as "initialOutcome",
       case when (select count(*) from forum_complaint_appeals prior
          where prior.decision_id=a.decision_id and prior.ordinal<a.ordinal and prior.status='resolved'
          and prior.outcome='overturned') % 2 = 0 then d.outcome
          when d.outcome='confirmed' then 'not-confirmed' else 'confirmed' end as "effectiveOutcome",
       (d.reviewer_user_id=${actor}) as "ownInitialDecision"
     from forum_complaint_appeals a
     join forum_complaint_cases c on c.id=a.case_id and c.initial_decision_id=a.decision_id
     join forum_complaint_decisions d on d.id=a.decision_id
     join forum_complaint_targets target on target.id=c.target_id
     left join forum_post_revisions pr on pr.id=target.post_revision_id and pr.post_id=target.post_id
     left join forum_topic_title_revisions tr on tr.id=target.title_revision_id and tr.topic_id=target.topic_id
     where a.status='pending'
     order by (d.reviewer_user_id=${actor}) asc,a.created_at,a.id
     limit 26 offset ${page*25}`);
   return {appeals:rows.rows.slice(0,25),page,total:total.rows[0]?.total??0,hasMore:rows.rows.length>25};
 },{isolationLevel:"repeatable read",accessMode:"read only"});
}

/** Reviewer authority is passed only by the server service after a fresh permission snapshot. */
export async function readAppealReviewerCase(db:NodePgDatabase,actor:string,caseId:string,appealId:string,
 identity:boolean,pages:ReviewPages,permissions:ReviewCase["permissions"]):Promise<AppealReviewPage>{
 const appeals=await db.transaction(async tx=>{
   const initial=await tx.execute<{outcome:ComplaintOutcome;reviewerId:string;decisionId:string}>(sql`
     select d.outcome,d.reviewer_user_id as "reviewerId",d.id as "decisionId"
     from forum_complaint_cases c join forum_complaint_decisions d on d.id=c.initial_decision_id
     where c.id=${caseId} and c.state='resolved'`);
   if(!initial.rows[0])throw new ComplaintNotFoundError("resolved case not found");
   const rows=await tx.execute<(AppealReviewSummary & Record<string,unknown>)>(sql`
     select a.id,a.case_id as "caseId",a.decision_id as "decisionId",
       a.ordinal,a.side,a.argument,a.status,a.outcome,a.reasoning,
       a.created_at as "createdAt",a.resolved_at as "resolvedAt"
       ${identity?sql`,json_build_object('id',u.id,'name',u.name) as appellant`:sql``}
     from forum_complaint_appeals a
     ${identity?sql`join "user" u on u.id=a.appellant_user_id`:sql``}
     where a.case_id=${caseId} and a.decision_id=${initial.rows[0].decisionId}
     order by a.ordinal`);
   if(!rows.rows.some(x=>x.id===appealId))throw new ComplaintNotFoundError("appeal not found in Case");
   const p=deriveAppealPolicy(initial.rows[0].outcome,rows.rows as AppealState[]);
   return rows.rows.map(row=>({...row,initialOutcome:p.initialOutcome,
     effectiveOutcome:p.effectiveOutcome,ownInitialDecision:initial.rows[0].reviewerId===actor}));
 },{isolationLevel:"repeatable read",accessMode:"read only"});
 const caseReview=await readComplaintReview(db,caseId,actor,pages,identity,false,permissions);
 return {appeal:appeals.find(a=>a.id===appealId)!,appeals,caseReview};
}
