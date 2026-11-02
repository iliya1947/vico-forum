import {sql} from "drizzle-orm";
import type {NodePgDatabase} from "drizzle-orm/node-postgres";
import {ComplaintNotFoundError} from "./complaints-domain";
import {COMPLAINT_CONTEXT_PAGE_SIZE,COMPLAINT_REVIEW_PAGE_SIZE,type ReviewCase,type ReviewPages,type ReviewFullPost} from "../app/complaints/review-contract";
type Tx = Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0];
type Base = Record<string,unknown> & {
 id:string;targetId:string;previousCaseId:string|null;state:"open"|"resolved";version:number;
 kind:"post"|"topic-title";topicId:string;postId:string|null;
 reportedId:string;reportedText:string;reportedLocale:string;reportedAt:Date;
 currentId:string;currentText:string;currentLocale:string;currentAt:Date;
 titleId:string;titleText:string;titleLocale:string;titleAt:Date;
 sectionId:string;topicAuthorId:string;isPinned:boolean;isSolved:boolean;bestAnswerPostId:string|null;
 duplicateRelationshipId:string|null;duplicateOriginalId:string|null;bestStatus:"needs-review"|"outdated"|null;bestReason:string|null;
 pendingHelpAppealId:string|null;priorityOverride:number|null;automaticPriority:number;
};
const iso=(v:Date|string)=>new Date(v).toISOString();
const source=(id:string,content:string,locale:string,at:Date)=>({
 revisionId:id,originalContent:content,sourceLocale:locale,createdAt:iso(at),
});
const page=<T,>(rows:T[],total:number,index:number,size:number)=>({
 items:rows.slice(0,size),total,page:index,hasMore:rows.length>size,
});
async function base(tx:Tx,id:string,help:boolean):Promise<Base>{
 const query=await tx.execute<Base>(sql`select c.id,c.target_id as "targetId",c.previous_case_id as "previousCaseId",c.state,c.version,
  t.kind,t.topic_id as "topicId",t.post_id as "postId",
  coalesce(pr.id,tr.id) as "reportedId",coalesce(pr.original_content,tr.original_content) as "reportedText",
  coalesce(pr.source_locale,tr.source_locale) as "reportedLocale",coalesce(pr.created_at,tr.created_at) as "reportedAt",
  coalesce(cp.id,ct.id) as "currentId",coalesce(cp.original_content,ct.original_content) as "currentText",
  coalesce(cp.source_locale,ct.source_locale) as "currentLocale",coalesce(cp.created_at,ct.created_at) as "currentAt",
  ct.id as "titleId",ct.original_content as "titleText",ct.source_locale as "titleLocale",ct.created_at as "titleAt",
  topic.section_id as "sectionId",topic.author_id as "topicAuthorId",topic.is_solved as "isSolved",
  exists(select 1 from forum_topic_pins pin where pin.topic_id=topic.id) as "isPinned",
  topic.best_answer_post_id as "bestAnswerPostId",
  rel.id as "duplicateRelationshipId",rel.original_topic_id as "duplicateOriginalId",
  best.solution_moderation_status as "bestStatus",best.solution_outdated_reason as "bestReason",
  ${help?sql`(select appeal.id from forum_help_duplicate_appeals appeal
   where appeal.relationship_id=rel.id and appeal.status='pending' limit 1)`:sql`null::text`} as "pendingHelpAppealId",
  c.priority_override as "priorityOverride",
  (select max((settings.weights->>r.reason)::int)::int from forum_complaints r
   cross join forum_complaint_priority_settings settings
   where r.case_id=c.id and settings.id=1) as "automaticPriority"
 from forum_complaint_cases c join forum_complaint_targets t on t.id=c.target_id
 join forum_topics topic on topic.id=t.topic_id
 join forum_topic_title_revisions ct on ct.id=topic.current_title_revision_id
 left join forum_posts p on p.id=t.post_id
 left join forum_post_revisions pr on pr.id=t.post_revision_id and pr.post_id=t.post_id
 left join forum_topic_title_revisions tr on tr.id=t.title_revision_id and tr.topic_id=t.topic_id
 left join forum_post_revisions cp on cp.id=p.current_revision_id and cp.post_id=p.id
 left join forum_help_duplicate_relationships rel on rel.duplicate_topic_id=topic.id and rel.removed_at is null
 left join forum_posts best on best.id=topic.best_answer_post_id
 where c.id=${id}`);
 if(!query.rows[0])throw new ComplaintNotFoundError("case not found");
 return query.rows[0];
}
/** Read-only consistent projection. No event/appeal/operation-key serialization. */
export async function readComplaintReview(db:NodePgDatabase,id:string,pages:ReviewPages,identity:boolean,help:boolean,
 permissions:ReviewCase["permissions"]):Promise<ReviewCase>{
 return db.transaction(async tx=>{
 const b=await base(tx,id,help);
 const counts=await tx.execute<{reports:number;independent:number;notes:number;evidence:number;context:number}>(sql`
  select (select count(*)::int from forum_complaints where case_id=${id}) as reports,
  (select count(distinct reporter_user_id)::int from forum_complaints where case_id=${id}) as independent,
  (select count(*)::int from forum_complaint_notes where case_id=${id}) as notes,
  (select count(*)::int from forum_complaint_evidence_attachments where target_id=${b.targetId}) as evidence,
  (select count(*)::int from forum_posts where topic_id=${b.topicId}) as context`);
 const n=counts.rows[0]!;
 const reports=await tx.execute<{id:string;reason:ReviewCase["reports"]["items"][number]["reason"];explanation:string|null;createdAt:Date;
  reporter?:{id:string;name:string}}>(sql`select r.id,r.reason,r.explanation,r.created_at as "createdAt"
  ${identity?sql`,json_build_object('id',u.id,'name',u.name) as reporter`:sql``}
  from forum_complaints r
  ${identity?sql`join "user" u on u.id=r.reporter_user_id`:sql``}
  where r.case_id=${id} order by r.created_at,r.id
  limit ${COMPLAINT_REVIEW_PAGE_SIZE+1} offset ${pages.reports*COMPLAINT_REVIEW_PAGE_SIZE}`);
 const notes=await tx.execute<{id:string;body:string;authorId:string;authorName:string;createdAt:Date}>(sql`
  select n.id,n.body,u.id as "authorId",u.name as "authorName",n.created_at as "createdAt"
  from forum_complaint_notes n join "user" u on u.id=n.author_user_id
  where n.case_id=${id} order by n.created_at,n.id
  limit ${COMPLAINT_REVIEW_PAGE_SIZE+1} offset ${pages.notes*COMPLAINT_REVIEW_PAGE_SIZE}`);
 const evidence=await tx.execute<{id:string;fileName:string;byteSize:number;detectedType:string}>(sql`
  select a.id,a.file_name as "fileName",a.byte_size as "byteSize",a.detected_type as "detectedType"
  from forum_complaint_evidence_attachments e join forum_attachments a on a.id=e.attachment_id
  where e.target_id=${b.targetId} order by a.id
  limit ${COMPLAINT_REVIEW_PAGE_SIZE+1} offset ${pages.evidence*COMPLAINT_REVIEW_PAGE_SIZE}`);
 const context=await tx.execute<{id:string;number:string|number;authorId:string;authorName:string;createdAt:Date;excerpt:string;truncated:boolean;sourceLocale:string}>(sql`
  with numbered as (select p.id,p.author_id,p.created_at,p.current_revision_id,
   row_number() over(order by p.created_at,p.id) as num
   from forum_posts p where p.topic_id=${b.topicId})
  select p.id,p.num as number,u.id as "authorId",u.name as "authorName",p.created_at as "createdAt",
    left(rev.original_content,1000) as excerpt,char_length(rev.original_content)>1000 as truncated,
    rev.source_locale as "sourceLocale"
  from numbered p join "user" u on u.id=p.author_id
  join forum_post_revisions rev on rev.id=p.current_revision_id and rev.post_id=p.id
  order by p.num limit ${COMPLAINT_CONTEXT_PAGE_SIZE+1} offset ${pages.context*COMPLAINT_CONTEXT_PAGE_SIZE}`);
 const decisions=await tx.execute<{id:string;outcome:"confirmed"|"not-confirmed";reasoning:string;createdAt:Date;reviewerName:string}>(sql`
  select d.id,d.outcome,d.reasoning,d.created_at as "createdAt",u.name as "reviewerName"
  from forum_complaint_cases c join forum_complaint_decisions d on d.id=c.initial_decision_id and d.case_id=c.id
  join "user" u on u.id=d.reviewer_user_id where c.id=${id}`);
 const decision=decisions.rows[0];
 return {
  id:b.id,previousCaseId:b.previousCaseId,state:b.state,version:b.version,kind:b.kind,
  targetId:b.targetId,topicId:b.topicId,postId:b.postId,
  reported:source(b.reportedId,b.reportedText,b.reportedLocale,b.reportedAt),
  current:source(b.currentId,b.currentText,b.currentLocale,b.currentAt),
  currentTopicTitle:source(b.titleId,b.titleText,b.titleLocale,b.titleAt),
  targetPresent:true,automaticPriority:b.automaticPriority as 1|2|3,
  priorityOverride:b.priorityOverride as 1|2|3|null,priority:(b.priorityOverride??b.automaticPriority) as 1|2|3,
  reports:page(reports.rows.map(x=>({...x,createdAt:iso(x.createdAt)})),n.reports,pages.reports,COMPLAINT_REVIEW_PAGE_SIZE),
  independentReporterCount:n.independent,
  notes:page(notes.rows.map(x=>({id:x.id,body:x.body,author:{id:x.authorId,name:x.authorName},createdAt:iso(x.createdAt)})),n.notes,pages.notes,COMPLAINT_REVIEW_PAGE_SIZE),
  evidence:page(evidence.rows,n.evidence,pages.evidence,COMPLAINT_REVIEW_PAGE_SIZE),
  context:page(context.rows.map(x=>({id:x.id,number:Number(x.number),author:{id:x.authorId,name:x.authorName},
   createdAt:iso(x.createdAt),excerpt:x.excerpt,truncated:x.truncated,sourceLocale:x.sourceLocale})),n.context,pages.context,COMPLAINT_CONTEXT_PAGE_SIZE),
  topic:{id:b.topicId,title:source(b.titleId,b.titleText,b.titleLocale,b.titleAt),sectionId:b.sectionId,authorId:b.topicAuthorId,
   isPinned:b.isPinned,isSolved:b.isSolved,bestAnswerPostId:b.bestAnswerPostId,
   duplicateRelationshipId:b.duplicateRelationshipId,duplicateOf:b.duplicateOriginalId?{id:b.duplicateOriginalId}:null,
   bestAnswer:b.bestAnswerPostId?{id:b.bestAnswerPostId,solutionModerationStatus:b.bestStatus,solutionOutdatedReason:b.bestReason}:null,
   pendingHelpDuplicateAppeal:b.pendingHelpAppealId?{id:b.pendingHelpAppealId}:null},
  decision:decision?{...decision,createdAt:iso(decision.createdAt)}:null,permissions,
 };
 },{isolationLevel:"repeatable read",accessMode:"read only"});
}
export async function readComplaintContextPost(db:NodePgDatabase,caseId:string,postId:string):Promise<ReviewFullPost>{
 return db.transaction(async tx=>{
 const found=await tx.execute<{id:string;topicId:string;number:string|number;revisionId:string;originalContent:string;
  sourceLocale:string;revisionAt:Date;authorId:string;authorName:string}>(sql`
  with belonging as (select t.topic_id from forum_complaint_cases c join forum_complaint_targets t on t.id=c.target_id where c.id=${caseId}),
  numbered as (select p.id,p.topic_id,p.author_id,p.current_revision_id,
    row_number() over(order by p.created_at,p.id) as num from forum_posts p join belonging b on b.topic_id=p.topic_id)
  select p.id,p.topic_id as "topicId",p.num as number,rev.id as "revisionId",
   rev.original_content as "originalContent",rev.source_locale as "sourceLocale",rev.created_at as "revisionAt",
   u.id as "authorId",u.name as "authorName"
  from numbered p join forum_post_revisions rev on rev.id=p.current_revision_id and rev.post_id=p.id
  join "user" u on u.id=p.author_id where p.id=${postId}`);
 if(!found.rows[0])throw new ComplaintNotFoundError("post does not belong to case topic");
 const row=found.rows[0];
 return {id:row.id,topicId:row.topicId,number:Number(row.number),
  source:source(row.revisionId,row.originalContent,row.sourceLocale,row.revisionAt),
  author:{id:row.authorId,name:row.authorName}};
 },{isolationLevel:"repeatable read",accessMode:"read only"});
}
export async function readComplaintEvidenceObject(db:NodePgDatabase,caseId:string,attachmentId:string){
 const x=await db.execute<{objectKey:string;fileName:string;byteSize:number}>(sql`
  select a.object_key as "objectKey",a.file_name as "fileName",a.byte_size as "byteSize"
  from forum_complaint_cases c join forum_complaint_evidence_attachments e on e.target_id=c.target_id
  join forum_attachments a on a.id=e.attachment_id
  where c.id=${caseId} and a.id=${attachmentId}`);
 if(!x.rows[0])throw new ComplaintNotFoundError("evidence does not belong to case");
 return x.rows[0];
}
