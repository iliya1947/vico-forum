import type { Pool } from "pg";
import { ADMIN_MONITOR_SCOPES_SQL, type NativeMonitorKey } from "./owner-monitor-catalog";

/** Native retained facts: creation and recorded terminal transitions, never body copies. */
export const NATIVE_HISTORY_ORIGINS = ["forum-title-revision","forum-post-revision","complaint-event","help-signal-created","duplicate-appeal-created","measure-appeal-created","help-signal-terminal","measure-appeal-moot","notification-created","notification-first-read"] as const;
export type NativeHistoryOrigin = typeof NATIVE_HISTORY_ORIGINS[number];
export interface OwnerSourceCoverage { reason:"moot-terminal-time-unproven"; count:string }
type Source = {
  origin:NativeHistoryOrigin; scopes:readonly string[]; from:string; at:string; id:string;
  kind:string; details:string; where:string; people:readonly string[];
  parent?:{from:string;where:string;id:string;child:string};
};
const payload=(values:Record<string,string>)=>"jsonb_build_object("+Object.entries(values).map(([k,v])=>`'${k}',${v}`).join(",")+")";
const proof="m.lifted_at is not null and isfinite(m.lifted_at) and m.lifted_by_user_id is not null and m.lifted_at>=m.created_at and m.lifted_at>=a.created_at and m.lifted_at<=a.resolved_at";
const directReviewFrom="forum_help_signals s left join lateral (select h.id from admin_history h where s.status='superseded' and h.action='help.signalReviewed' and h.target_type='topic' and h.target_id=s.topic_id and h.context->>'signalId'=s.id limit 1) direct_review on true";
const sources:readonly Source[]=[
  {origin:"forum-title-revision",scopes:["forum.content","localization.content"],from:"forum_topic_title_revisions r",at:"r.created_at",id:"r.id",kind:"'forum.titleRevisionCreated'",details:payload({actorUserId:"r.author_id",topicId:"r.topic_id",revisionId:"r.id",sourceLocale:"r.source_locale"}),where:"true",people:["r.author_id"]},
  {origin:"forum-post-revision",scopes:["forum.content","localization.content"],from:"forum_post_revisions r join forum_posts p on p.id=r.post_id",at:"r.created_at",id:"r.id",kind:"'forum.postRevisionCreated'",details:payload({actorUserId:"r.author_id",topicId:"p.topic_id",postId:"r.post_id",revisionId:"r.id",sourceLocale:"r.source_locale"}),where:"true",people:["r.author_id"]},
  {origin:"complaint-event",scopes:["moderation.complaints"],from:"forum_complaint_events e join forum_complaint_cases ec on ec.id=e.case_id join forum_complaint_targets et on et.id=ec.target_id",at:"e.created_at",id:"e.id",kind:"'complaint.'||e.kind",details:payload({actorUserId:"e.actor_user_id",targetUserId:"et.affected_author_id",caseId:"e.case_id",complaintId:"e.complaint_id",decisionId:"e.decision_id",noteId:"e.note_id",appealId:"e.appeal_id",priority:"e.priority_override"}),where:"true",people:["e.actor_user_id"],parent:{from:"forum_complaint_targets t cross join lateral (select pc.id from forum_complaint_cases pc where pc.target_id=t.id order by pc.id) c",where:"t.affected_author_id",id:"c.id",child:"e.case_id"}},
  {origin:"help-signal-created",scopes:["moderation.help"],from:"forum_help_signals s",at:"s.created_at",id:"s.id",kind:"'help.signalCreated'",details:payload({actorUserId:"s.submitted_by_user_id",topicId:"s.topic_id",signalId:"s.id",signalKind:"s.kind",postId:"s.target_post_id",originalTopicId:"s.proposed_original_topic_id"}),where:"true",people:["s.submitted_by_user_id"]},
  {origin:"duplicate-appeal-created",scopes:["moderation.help"],from:"forum_help_duplicate_appeals a join forum_help_duplicate_relationships r on r.id=a.relationship_id",at:"a.created_at",id:"a.id",kind:"'help.duplicateAppealCreated'",details:payload({actorUserId:"a.appellant_user_id",appealId:"a.id",relationshipId:"a.relationship_id",topicId:"r.duplicate_topic_id",originalTopicId:"r.original_topic_id"}),where:"true",people:["a.appellant_user_id"]},
  {origin:"measure-appeal-created",scopes:["administration.measures"],from:"user_measure_appeals a",at:"a.created_at",id:"a.id",kind:"'measure.appealCreated'",details:payload({actorUserId:"a.subject_user_id",targetUserId:"a.subject_user_id",appealId:"a.id::text",measureId:"a.measure_id::text"}),where:"true",people:["a.subject_user_id"]},
  {origin:"help-signal-terminal",scopes:["moderation.help"],from:directReviewFrom,at:"s.resolved_at",id:"s.id",kind:"case when s.status='withdrawn' then 'help.signalWithdrawn' else 'help.signalSuperseded' end",details:payload({actorUserId:"s.resolved_by_user_id",targetUserId:"s.submitted_by_user_id",topicId:"s.topic_id",signalId:"s.id"}),where:`s.status in ('withdrawn','superseded') and s.resolved_at is not null and isfinite(s.resolved_at) and s.resolved_at>=s.created_at and (s.status='withdrawn' or direct_review.id is null)`,people:["s.submitted_by_user_id","s.resolved_by_user_id"]},
  {origin:"measure-appeal-moot",scopes:["administration.measures"],from:"user_measure_appeals a join user_measures m on m.id=a.measure_id",at:"a.resolved_at",id:"a.id",kind:"'measure.appealMoot'",details:payload({actorUserId:`case when ${proof} then m.lifted_by_user_id end`,actorSource:`case when ${proof} then 'parent-measure-lift' else 'unproven' end`,targetUserId:"a.subject_user_id",appealId:"a.id::text",measureId:"a.measure_id::text"}),where:"a.status='moot' and a.resolved_at is not null and isfinite(a.resolved_at) and a.resolved_at>=a.created_at",people:["a.subject_user_id"],parent:{from:"user_measures pm",where:"pm.lifted_by_user_id",id:"pm.id",child:"a.measure_id"}},
  {origin:"notification-created",scopes:["notifications.inbox"],from:"forum_reply_notifications n",at:"n.created_at",id:"n.id",kind:"'notification.created'",details:payload({actorUserId:"n.actor_user_id",targetUserId:"n.recipient_user_id",notificationKind:"n.kind",topicId:"n.topic_id",postId:"n.post_id",decisionId:"n.complaint_decision_id",appealId:"n.complaint_appeal_id"}),where:"true",people:["n.recipient_user_id","n.actor_user_id"]},
  {origin:"notification-first-read",scopes:["notifications.inbox"],from:"forum_reply_notifications n",at:"n.read_at",id:"n.id",kind:"'notification.firstRead'",details:payload({actorUserId:"n.recipient_user_id",targetUserId:"n.recipient_user_id",notificationKind:"n.kind",topicId:"n.topic_id",postId:"n.post_id",decisionId:"n.complaint_decision_id",appealId:"n.complaint_appeal_id"}),where:"n.read_at is not null and isfinite(n.read_at) and n.read_at>=n.created_at",people:["n.recipient_user_id"]},
];
export const NATIVE_ORIGIN_MONITORS=Object.fromEntries(sources.map(s=>[s.origin,s.scopes])) as Record<NativeHistoryOrigin,readonly string[]>;
export const HISTORY_COLUMNS="origin,source_id,at,recorded_at,scopes,kind,source,quality,details";
export function nativeHistoryCoverageSql(key:NativeMonitorKey):string {
  const native=sources.filter(s=>s.scopes.includes(key)).map(s=>`select min(${s.at}) at,false sampled from ${s.from} where ${s.where}`);
  const admin=["forum.structure","forum.state","forum.content","administration.authorization","administration.measures","administration.registration","moderation.help"].includes(key)
    ?` union all select min(a.occurred_at),false from admin_history a where $1=any(${ADMIN_MONITOR_SCOPES_SQL})`:"";
  return `select min(at) first,max(at) filter(where sampled) last from (
    select min(observed_at) at,true sampled from owner_monitor_observations where monitor_key=$1 and resource_scope='global'
    union all select max(observed_at),true from owner_monitor_observations where monitor_key=$1 and resource_scope='global'
    ${admin}
    ${native.length?' union all '+native.join(' union all '):''}) retained`;
}
export type NativeHistoryBindings={person?:string;monitor?:string;area?:string;at:string;origin:string;id:string;limit:string;
  filterOrigin?:string|null;allowedOrigins?:readonly string[];filterArea?:string|null;filterMonitor?:string|null;
  kind?:string;from?:string;until?:string};

/** Every person/role and cursor predicate precedes its branch-local LIMIT. */
export function nativeHistoryBranches(b:NativeHistoryBindings):string[]{
  return sources.flatMap(s=>{
    // Origin selection is a validated closed catalog value; omit irrelevant branches.
    if(b.filterOrigin!==undefined&&b.filterOrigin!==null&&s.origin!==b.filterOrigin)return [];
    if(b.allowedOrigins!==undefined&&!b.allowedOrigins.includes(s.origin))return [];
    if(b.filterMonitor!==undefined&&b.filterMonitor!==null&&!s.scopes.includes(b.filterMonitor))return [];
    if(b.filterArea!==undefined&&b.filterArea!==null&&!s.scopes.some(k=>k.startsWith(b.filterArea+".")))return [];
    const scopes=`ARRAY[${s.scopes.map(k=>`'${k}'`).join(",")}]::text[]`;
    // Resolve the fixed origin comparison outside the native row key. Keeping
    // a constant between time/id in a three-column ROW prevents PostgreSQL
    // from using the source's two-column chronological cursor range.
    const cursor=`(${b.at}::timestamptz is null or ('${s.origin}'::text<${b.origin}::text and ${s.at}<=${b.at}::timestamptz) or ('${s.origin}'::text=${b.origin}::text and (${s.at},${s.id}::text)<(${b.at}::timestamptz,${b.id}::text)) or ('${s.origin}'::text>${b.origin}::text and ${s.at}<${b.at}::timestamptz))`;
    const scope=[b.monitor?`(${b.monitor}::text is null or ${b.monitor}::text=any(${scopes}))`:"true",b.area?`(${b.area}::text is null or ${b.area}::text=any(ARRAY[${s.scopes.map(k=>`'${k.split('.')[0]}'`).join(',')}]::text[]))`:"true"].join(" and ");
    const projection=`select '${s.origin}'::text origin,${s.id}::text source_id,${s.at} at,${s.at} recorded_at,${scopes} scopes,${s.kind} kind,'${s.from.split(' ')[0]}'::text source,null::text quality,${s.details} details from ${s.from}`;
    const byKind=b.kind?` and (${b.kind}::text is null or (${s.kind})=${b.kind}::text)`:"";
    const byFrom=b.from?` and (${b.from}::timestamptz is null or ${s.at}>=${b.from}::timestamptz)`:"";
    const byUntil=b.until?` and (${b.until}::timestamptz is null or ${s.at}<${b.until}::timestamptz)`:"";
    const query=(person="true",nulls="last")=>`${projection} where ${s.where} and ${scope} and ${cursor} and ${person}${byKind}${byFrom}${byUntil} order by ${s.at} desc nulls ${nulls},${s.id} desc nulls ${nulls} limit ${b.limit}`;
    if(!b.person)return ["("+query()+")"];
    const result=s.people.map(p=>"("+query(`${p}=${b.person}`,(s.origin==="help-signal-created"||s.origin==="notification-created"&&p==="n.recipient_user_id")?"first":"last")+")");
    if(s.parent){
      const p=s.parent;
      const guard=s.origin==="measure-appeal-moot"?` and pm.lifted_at is not null` : "";
      const childGuard=s.origin==="measure-appeal-moot"?` and ${proof}`:"";
      // No premature parent LIMIT: traverse this person's indexed parents, then
      // at most one page per parent before the final same-collation SQL merge.
      result.push(`(select ${HISTORY_COLUMNS.split(',').map(c=>"f."+c).join(',')} from (select ${p.id} id from ${p.from} where ${p.where}=${b.person}${guard}) parents cross join lateral (${query(`${p.child}=parents.id${childGuard}`,s.origin==="complaint-event"?"first":"last")}) f order by f.at desc nulls last,f.source_id desc nulls last limit ${b.limit})`);
    }
    return result;
  });
}

/** Missing native time is coverage metadata, never a fabricated chronological row. */
export async function readNativeHistoryCoverage(db:Pick<Pool,"query">,person?:string,enabled=true):Promise<OwnerSourceCoverage[]>{
  if(!enabled)return [];
  const row=(await db.query<{count:string}>(`select count(*)::text count from user_measure_appeals a join user_measures m on m.id=a.measure_id
    where a.status='moot' and (a.resolved_at is null or not isfinite(a.resolved_at) or a.resolved_at<a.created_at)
    and ($1::text is null or a.subject_user_id=$1)`,[person??null])).rows[0];
  if(!row||!/^\d+$/.test(row.count))throw new Error("Invalid terminal coverage count");
  return [{reason:"moot-terminal-time-unproven",count:row.count}];
}
