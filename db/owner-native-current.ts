import {recordOwnerMonitorSnapshot} from "./owner-monitor-observations";
import type { Pool, PoolClient } from "pg";
import { NATIVE_MONITORS, type NativeMonitorArea, type NativeMonitorKey } from "./owner-monitor-catalog";
import { HELP_SOLUTIONS_SERVICE_SECTION_ID } from "./forum-identifiers";
import { PERMISSION_CATALOG } from "../app/authorization/catalog";
import { nativeHistoryCoverageSql } from "./owner-native-history";
import { USER_MEASURE_ADMIN_PERMISSION_FAMILIES, USER_MEASURE_ADMIN_RESTRICTIONS } from "../app/admin/user-measure-restrictions";
import { BLOCK_MANAGE_PRIVILEGED_PERMISSION } from "./user-measure-authority";

export type NativeMonitorScalar = string | number | boolean | null;
export interface NativeCurrentMonitor {
  key: NativeMonitorKey; schemaVersion: 1; values: Record<string, NativeMonitorScalar>;
  source: "database"; quality: "measured"; capability: "available"; enabled: true;
  recording: "available" | "unavailable"; coverageFrom: string | null; lastObservedAt: string | null;
}
export interface NativeCurrentState {
  observedAt: string; recording: "available" | "unavailable"; monitors: NativeCurrentMonitor[];
}
const at = "(select at from clock)", owner = "(select owner_id from clock)";
const activeMeasure = `m.lifted_at is null and (m.expires_at is null or m.expires_at>${at})`;
// Same raw-role/grant/allow-minus-deny hierarchy as AP-10's authoritative
// user-measure-policy query. Deliberately excludes sanction-filtered permissions.
const rawAdminPermissions = [...new Set(Object.values(USER_MEASURE_ADMIN_PERMISSION_FAMILIES).flat())];
const sqlKey = (value:string) => "'" + value.replaceAll("'", "''") + "'";
const rawTargetAuthority = `(
  with raw_permissions as (
    select rp.permission_key
    from "user" u
    left join authz_user_roles ur on ur.user_id=u.id
    join authz_roles role on role.id=coalesce(ur.role_id,(select id from authz_roles where slug='user'))
    join authz_role_permissions rp on rp.role_id=role.id
    where u.id=m.target_user_id
    union
    select o.permission_key from authz_user_permission_overrides o
    where o.user_id=m.target_user_id and o.effect='allow'
    except
    select o.permission_key from authz_user_permission_overrides o
    where o.user_id=m.target_user_id and o.effect='deny'
  )
  select case
    when m.target_user_id=${owner} then 3
    when exists(select 1 from raw_permissions where permission_key=${sqlKey(BLOCK_MANAGE_PRIVILEGED_PERMISSION)}) then 2
    when exists(select 1 from raw_permissions where permission_key in (${rawAdminPermissions.map(sqlKey).join(",")})) then 1
    else 0
  end
)`;
const adminFloorApplies = `m.issuer_authority_floor>${rawTargetAuthority}`;
const adminKeySql = USER_MEASURE_ADMIN_RESTRICTIONS.map(sqlKey).join(",");
const restrictionApplies = `(r.restriction_key not in (${adminKeySql}) or ${adminFloorApplies})`;
const effectiveMeasure = `${activeMeasure} and m.target_user_id<>${owner}
  and exists(select 1 from user_measure_restrictions r where r.measure_id=m.id
    and r.enabled and ${restrictionApplies})`;
const count = (table: string, where = "true") => `(select count(*)::text from ${table} where ${where})`;
const select = (fields: Record<string, string>) => Object.entries(fields).map(([key, sql]) => `${sql} as "${key}"`).join(",\n");
const RESTRICTIONS = ["topics.create","replies.create","attachments.upload","posts.edit","profile.edit","complaints.submit","helpSignals.submit","translations.generate","admin.forum","admin.complaints","admin.security","admin.usersAccess"] as const;
const REASONS = ["spam","harassment","threats","fraud-phishing","malicious-content","personal-data","impersonation","other"] as const;
const SIGNAL_KINDS = ["needs-details","needs-review","solution-outdated","duplicate"] as const;
const SIGNAL_STATES = ["pending","accepted","rejected","withdrawn","superseded"] as const;
const NOTIFICATION_KINDS = ["reply","mention","complaint-decision","complaint-appeal-result"] as const;
const recent = (column: string) => `${column} between ${at}-interval '24 hours' and ${at}`;
const missingMootTime = "a.status='moot' and (a.resolved_at is null or not isfinite(a.resolved_at) or a.resolved_at<a.created_at)";

/** The names and expressions are code constants, never request-selected SQL. */
const FIELDS: Record<NativeMonitorKey, Record<string, string>> = {
  "forum.structure": {
    categories: count("forum_categories"), sections: count("forum_sections"), topics: count("forum_topics"), posts: count("forum_posts"),
    tags: count("forum_tags"), tagLinks: count("forum_topic_tags"),
  },
  "forum.state": {
    openTopics: count("forum_topics", "not is_closed"), closedTopics: count("forum_topics", "is_closed"), pins: count("forum_topic_pins"),
    helpSolved: count("forum_topics", `section_id='${HELP_SOLUTIONS_SERVICE_SECTION_ID}' and is_solved`),
    helpBestAnswers: count("forum_topics", `section_id='${HELP_SOLUTIONS_SERVICE_SECTION_ID}' and best_answer_post_id is not null`),
    activeDuplicates: count("forum_help_duplicate_relationships", "removed_at is null"),
  },
  "forum.content": {
    currentTitles: count("forum_topics t", "exists(select 1 from forum_topic_title_revisions r where r.topic_id=t.id and r.id=t.current_title_revision_id)"),
    currentBodies: count("forum_posts p", "exists(select 1 from forum_post_revisions r where r.post_id=p.id and r.id=p.current_revision_id)"),
    titleRevisions: count("forum_topic_title_revisions"), bodyRevisions: count("forum_post_revisions"),
    titleRevisions24h: count("forum_topic_title_revisions", recent("created_at")), bodyRevisions24h: count("forum_post_revisions", recent("created_at")),
    missingCurrentTitles: count("forum_topics t", "not exists(select 1 from forum_topic_title_revisions r where r.topic_id=t.id and r.id=t.current_title_revision_id)"),
    missingCurrentBodies: count("forum_posts p", "not exists(select 1 from forum_post_revisions r where r.post_id=p.id and r.id=p.current_revision_id)"),
  },
  "forum.presence": {
    visible: count('forum_online_presence p join "user" u on u.id=p.user_id left join user_privacy_preferences v on v.user_id=u.id', `${at}-interval '5 minutes'<=p.last_seen_at and u.deactivated_at is null and coalesce(v.show_online,true)`),
    staleRetained: count("forum_online_presence", `last_seen_at<${at}-interval '5 minutes'`),
    excludedRetained: count('forum_online_presence p join "user" u on u.id=p.user_id left join user_privacy_preferences v on v.user_id=u.id', `${at}-interval '5 minutes'<=p.last_seen_at and (u.deactivated_at is not null or not coalesce(v.show_online,true))`),
  },
  "administration.authorization": {
    roles: count("authz_roles"), roleGrants: count("authz_role_permissions"), assignments: count("authz_user_roles"),
    allowOverrides: count("authz_user_permission_overrides", "effect='allow'"), denyOverrides: count("authz_user_permission_overrides", "effect='deny'"),
  },
  "administration.measures": {
    total: count("user_measures"), active: count("user_measures m", activeMeasure), effective: count("user_measures m", effectiveMeasure),
    expired: count("user_measures m", `m.lifted_at is null and m.expires_at<=${at}`), lifted: count("user_measures", "lifted_at is not null"),
    ...Object.fromEntries(RESTRICTIONS.map((key, i) => [`restriction${i}`, count("user_measures m join user_measure_restrictions r on r.measure_id=m.id", `${activeMeasure} and m.target_user_id<>${owner} and r.enabled and r.restriction_key='${key}'${(USER_MEASURE_ADMIN_RESTRICTIONS as readonly string[]).includes(key)?` and ${adminFloorApplies}`:""}`)])),
    ...Object.fromEntries(["pending","accepted","rejected","moot"].map(status => [`appeals${status[0].toUpperCase()+status.slice(1)}`, count("user_measure_appeals", `status='${status}'`)])),
    mootTimeUnproven: count("user_measure_appeals a", missingMootTime),
  },
  "administration.registration": {
    googleEnabled: "(select google_registration_enabled from forum_registration_settings where id=1)",
    emailEnabled: "(select email_registration_enabled from forum_registration_settings where id=1)",
    version: "(select version from forum_registration_settings where id=1 and (select count(*) from forum_registration_settings)=1)",
    updatedAt: `(select to_char(updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') from forum_registration_settings where id=1)`,
  },
  "moderation.help": {
    signals: count("forum_help_signals"),
    ...Object.fromEntries(SIGNAL_STATES.map(status => [status, count("forum_help_signals", `status='${status}'`)])),
    ...Object.fromEntries(SIGNAL_KINDS.map((kind,i) => [`signalKind${i}`, count("forum_help_signals", `kind='${kind}'`)])),
    actionableSignals: count("forum_help_signals s join forum_topics t on t.id=s.topic_id", `s.status='pending' and t.section_id='${HELP_SOLUTIONS_SERVICE_SECTION_ID}'`),
    pendingDuplicateAppeals: count("forum_help_duplicate_appeals a join forum_help_duplicate_relationships r on r.id=a.relationship_id", "a.status='pending' and r.removed_at is null"),
    retainedDuplicateAppeals: count("forum_help_duplicate_appeals"), activeDuplicates: count("forum_help_duplicate_relationships", "removed_at is null"),
  },
  "moderation.complaints": {
    cases: count("forum_complaint_cases"), open: count("forum_complaint_cases", "state='open'"), resolved: count("forum_complaint_cases", "state='resolved'"),
    reports: count("forum_complaints"), pendingAppeals: count("forum_complaint_appeals", "status='pending'"),
    liveReviewers: count("forum_complaint_activity", `expires_at>${at}`), expiredReviewers: count("forum_complaint_activity", `expires_at<=${at}`),
    settingsVersion: "(select version from forum_complaint_priority_settings where id=1)",
    ...Object.fromEntries(REASONS.map((reason,i) => [`weight${i}`, `(select (weights->>'${reason}')::integer from forum_complaint_priority_settings where id=1)`])),
    ...Object.fromEntries([1,2,3].map(p => [`priority${p}`, `(select count(*)::text from forum_complaint_cases c where c.state='open' and coalesce(c.priority_override,(select max((s.weights->>r.reason)::integer) from forum_complaints r cross join forum_complaint_priority_settings s where r.case_id=c.id and s.id=1))=${p})`])),
  },
  "notifications.inbox": {
    total: count("forum_reply_notifications"), unread: count("forum_reply_notifications", "read_at is null"), read: count("forum_reply_notifications", "read_at is not null"),
    ...Object.fromEntries(NOTIFICATION_KINDS.map((kind,i) => [`notificationKind${i}`, count("forum_reply_notifications", `kind='${kind}'`)])),
    oldestUnreadAt: `(select to_char(min(created_at) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') from forum_reply_notifications where read_at is null)`,
    oldestUnreadAgeSeconds: `(select case when min(created_at) is not null then greatest(0,floor(extract(epoch from (${at}-min(created_at)))))::text end from forum_reply_notifications where read_at is null)`,
    validTargets: count("forum_reply_notifications n", `(n.kind in ('reply','mention') and exists(select 1 from forum_posts p join forum_topics t on t.id=p.topic_id where p.id=n.post_id and t.id=n.topic_id)) or (n.kind='complaint-decision' and exists(select 1 from forum_complaint_decisions d where d.id=n.complaint_decision_id)) or (n.kind='complaint-appeal-result' and exists(select 1 from forum_complaint_appeals a where a.id=n.complaint_appeal_id))`),
  },
};

export function nativeMonitorFields(key:NativeMonitorKey):readonly string[]{return Object.keys(FIELDS[key]);}
const NON_COUNTS = new Set(["googleEnabled","emailEnabled","version","updatedAt","oldestUnreadAt","settingsVersion",...REASONS.map((_,i)=>"weight"+i)]);
function checkedValues(key: NativeMonitorKey, value: Record<string, NativeMonitorScalar>) {
  const fields = [...nativeMonitorFields(key),...(key==="administration.authorization"?["catalogPermissions"]:[]),...(key==="notifications.inbox"?["missingTargets"]:[])];
  if(Object.keys(value).length!==fields.length || Object.keys(value).some(name=>!fields.includes(name)))throw new Error("Unexpected Owner monitor fields");
  for(const [name,v] of Object.entries(value)){
    if(NON_COUNTS.has(name)){
      if(name.endsWith("Enabled")){if(typeof v!=="boolean")throw new Error("Missing registration flags");}
      else if(name.endsWith("At")){if(v!==null&&(typeof v!=="string"||!Number.isFinite(new Date(v).getTime())))throw new Error("Invalid observation time");}
      else if(typeof v!=="number"||!Number.isSafeInteger(v)||v<1||(name.startsWith("weight")&&v>3))throw new Error("Invalid policy version/weight");
    }else if(!(name==="oldestUnreadAgeSeconds"&&v===null)&&(typeof v!=="string"||!/^\d+$/.test(v)))throw new Error("Invalid exact Owner monitor count");
  }
  if(new TextEncoder().encode(JSON.stringify(value)).length>8192)throw new Error("Oversized Owner snapshot");
}

/** One area's fixed sources, one DB clock/snapshot; observation writes follow COMMIT. */
export class PostgresOwnerNativeCurrent {
  constructor(private readonly pool:Pool,private readonly ownerUserId:string){}
  async readCurrent(area:NativeMonitorArea):Promise<NativeCurrentState>{
    if(!Object.hasOwn(NATIVE_MONITORS,area))throw new Error("Unknown Owner area");
    const c=await this.pool.connect();let begun=false;let now:Date;
    const measured:Array<{key:NativeMonitorKey;values:Record<string,NativeMonitorScalar>}>=[];
    try{
      await c.query("begin isolation level repeatable read read only");begun=true;
      await c.query("set local statement_timeout='1500ms';set local lock_timeout='500ms'");
      now=(await c.query<{at:Date}>("select transaction_timestamp() at")).rows[0]?.at;
      if(!(now instanceof Date)||!Number.isFinite(now.getTime()))throw new Error("Missing database clock");
      for(const key of NATIVE_MONITORS[area]){
        const values=await this.read(c,key,now);
        checkedValues(key,values);measured.push({key,values});
      }
      await c.query("commit");begun=false;
    }catch(error){if(begun)try{await c.query("rollback");}catch{/* preserve cause */}throw error;}finally{c.release();}
    let recording:NativeCurrentState["recording"]="available";const monitors:NativeCurrentMonitor[]=[];
    for(const item of measured){
      let itemRecording:NativeCurrentMonitor["recording"]="available",first:string|null=null,last:string|null=null;
      try{await recordOwnerMonitorSnapshot(this.pool,item.key,item.values);}catch{itemRecording="unavailable";}
      try{
        const row=(await this.pool.query<{first:Date|null;last:Date|null}>(nativeHistoryCoverageSql(item.key),[item.key])).rows[0];
        first=row.first?.toISOString()??null;last=row.last?.toISOString()??null;
      }catch{itemRecording="unavailable";}
      if(itemRecording==="unavailable")recording="unavailable";
      monitors.push({...item,schemaVersion:1,source:"database",quality:"measured",capability:"available",enabled:true,recording:itemRecording,coverageFrom:first,lastObservedAt:last});
    }
    return {observedAt:now!.toISOString(),recording,monitors};
  }
  private async read(c:PoolClient,key:NativeMonitorKey,now:Date){
    const values=(await c.query<Record<string,NativeMonitorScalar>>(`with clock as(select $1::timestamptz at,$2::text owner_id) select ${select(FIELDS[key])}`,[now,this.ownerUserId])).rows[0];
    if(!values)throw new Error("Missing aggregate snapshot");
    if(key==="administration.authorization")values.catalogPermissions=String(PERMISSION_CATALOG.length);
    if(key==="notifications.inbox")values.missingTargets=(BigInt(values.total as string)-BigInt(values.validTargets as string)).toString();
    return values;
  }
}
