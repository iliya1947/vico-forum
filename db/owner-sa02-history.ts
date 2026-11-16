import type { Pool } from "pg";
import { actionLabels } from "../app/admin/history-labels";
import { SA02_FACT_MONITORS } from "./owner-sa02-catalog";
import { OWNER_MONITORS, ADMIN_MONITOR_SCOPES_SQL, type OwnerMonitorArea, type OwnerMonitorKey } from "./owner-monitor-catalog";
import { nativeHistoryBranches, NATIVE_HISTORY_ORIGINS, NATIVE_ORIGIN_MONITORS, HISTORY_COLUMNS, readNativeHistoryCoverage, type NativeHistoryOrigin, type OwnerSourceCoverage } from "./owner-native-history";
import { SYSTEM_MONITORS } from "./owner-system-history";
import { parseOwnerTimelineCursor } from "./owner-system-monitoring";
import { ACCOUNT_HISTORY_SELECT_SQL } from "./owner-account-history";

/** Server-only source projection; caller must authorize exact Owner before invoking it. */
export type OwnerHistoryArea = OwnerMonitorArea;
export type OwnerHistoryMonitor = OwnerMonitorKey;
export type OwnerHistoryOrigin =
  | "system-event" | "auth-event" | "account-event" | "system-observation" | "admin-history"
  | "attachment-evidence" | "attempt-pattern" | "attempt-state" | NativeHistoryOrigin;
const ORIGINS: readonly string[] = [
  "system-event", "auth-event", "account-event", "system-observation", "admin-history",
  "attachment-evidence", "attempt-pattern", "attempt-state", ...NATIVE_HISTORY_ORIGINS,
];
const AREAS: readonly string[] = Object.keys(OWNER_MONITORS);
const MONITORS: Record<OwnerHistoryArea,readonly string[]> = OWNER_MONITORS;
export type OwnerHistoryValue = string | number | boolean | null;
export type OwnerHistoryPayload = Record<string,OwnerHistoryValue>;
export interface OwnerHistoryEntry {
  origin: OwnerHistoryOrigin; id: string; occurredAt: string; recordedAt: string | null;
  monitorKeys: OwnerHistoryMonitor[]; kind: string; source: string; quality: string | null;
  values: OwnerHistoryPayload;
}
export interface OwnerHistoryPage {entries:OwnerHistoryEntry[]; next:string|null; coverage?:OwnerSourceCoverage[]}
export interface OwnerHistoryOptions {
  area?: OwnerHistoryArea;
  monitorKey?: OwnerHistoryMonitor;
  before?:string;
  limit?:number;
  origin?:OwnerHistoryOrigin;
  kind?:string;
  from?:string;
  until?:string;
}
const ORIGIN_SCOPES: Record<OwnerHistoryOrigin,readonly string[]> = {
  ...NATIVE_ORIGIN_MONITORS,
  "system-event": SYSTEM_MONITORS,
  "auth-event": ["accounts.users","accounts.methods","accounts.sessions","security.auth"],
  "account-event": ["accounts.users"],
  "system-observation": Object.values(OWNER_MONITORS).flat(),
  "admin-history": ["accounts.registration","administration.registration","administration.authorization","administration.measures","forum.content","forum.state","moderation.help"],
  "attachment-evidence": ["security.attachments"],
  "attempt-pattern": ["accounts.registration","security.auth","security.access"],
  "attempt-state": ["security.auth","security.access"],
};
const KINDS_BY_ORIGIN: Record<OwnerHistoryOrigin,readonly string[]> = {
  "system-event":["system.dependencyUnavailable","system.requestFailed"],
  "auth-event":Object.keys(SA02_FACT_MONITORS),
  "account-event":["account.deactivated"],
  "system-observation":["monitor.observed"],
  "admin-history":Object.keys(actionLabels),
  "attachment-evidence":["attachment.securityEvidence"],
  "attempt-pattern":["attempt.coalesced"],
  "attempt-state":["attempt.unknown","attempt.overflow","attempt.gap"],
  "forum-title-revision":["forum.titleRevisionCreated"],
  "forum-post-revision":["forum.postRevisionCreated"],
  "complaint-event":["complaint.submitted","complaint.noted","complaint.decided","complaint.appealed","complaint.appeal-resolved","complaint.priority-changed","complaint.review-started"],
  "help-signal-created":["help.signalCreated"],
  "duplicate-appeal-created":["help.duplicateAppealCreated"],
  "measure-appeal-created":["measure.appealCreated"],
  "help-signal-terminal":["help.signalWithdrawn","help.signalSuperseded"],
  "measure-appeal-moot":["measure.appealMoot"],
  "notification-created":["notification.created"],
  "notification-first-read":["notification.firstRead"],
};
type Scope = {area:OwnerHistoryArea|null;monitor:OwnerHistoryMonitor|null};
function compatibleOrigin(origin:OwnerHistoryOrigin,scope:Scope):boolean {
  const allowed=ORIGIN_SCOPES[origin];
  if(scope.monitor!==null) return allowed.includes(scope.monitor);
  return scope.area===null || allowed.some(key=>MONITORS[scope.area!].includes(key));
}
type Cursor = {v:1;at:string;origin:OwnerHistoryOrigin;id:string;
  area:OwnerHistoryArea|null;monitor:OwnerHistoryMonitor|null};
const EXACT = /^([1-9][0-9]{3})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])\.([0-9]{6})Z$/;
function safeId(value: unknown): value is string {
  if(typeof value!=="string" || value.length<1 || value.length>200) return false;
  return ![...value].some(char=>{
    const code=char.codePointAt(0)??0;
    return code<32 || code===127;
  });
}
function checkedScope(options:OwnerHistoryOptions):Scope {
  const area=options.area??null, monitor=options.monitorKey??null;
  if(area!==null && !AREAS.includes(area)) throw new Error("Unknown Owner History area");
  if(monitor!==null && !Object.values(MONITORS).some(items=>items.includes(monitor)))
    throw new Error("Unknown Owner History monitor");
  if(area!==null && monitor!==null && !MONITORS[area].includes(monitor))
    throw new Error("Owner History area/monitor mismatch");
  return {area,monitor};
}
function checkExactAt(at:unknown):at is string {
  if(typeof at!=="string" || !EXACT.test(at)) return false;
  const millisecond=at.slice(0,23)+ "Z";
  const asDate=new Date(millisecond);
  return Number.isFinite(asDate.getTime()) && asDate.toISOString()===millisecond;
}
/** Closed SQL-filter values; exact UTC calendar validation precedes any database call. */
function canonicalUtcTime(value:unknown):string|null {
  if(value===undefined)return null;
  if(typeof value!=="string")throw new Error("Invalid Owner History time");
  const m=/^([1-9][0-9]{3}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9])(?:\.([0-9]{3})([0-9]{3})?)?Z$/.exec(value);
  if(!m)throw new Error("Invalid Owner History time");
  const millis=m[1]+"."+(m[2]??"000")+"Z";
  const date=new Date(millis);
  if(!Number.isFinite(date.getTime())||date.toISOString()!==millis)
    throw new Error("Invalid Owner History calendar time");
  return m[1]+"."+(m[2]??"000")+(m[3]??"000")+"Z";
}
function checkedFilters(options:OwnerHistoryOptions){
  const scope=checkedScope(options);
  const origin=options.origin??null,kind=options.kind??null;
  if(origin!==null&&(!ORIGINS.includes(origin)||!compatibleOrigin(origin,scope)))
    throw new Error("Invalid Owner History origin/scope");
  if(kind!==null&&(typeof kind!=="string"||kind.length>80||
      !Object.entries(KINDS_BY_ORIGIN).some(([source,kinds])=>
        (origin===null||source===origin)&&
        compatibleOrigin(source as OwnerHistoryOrigin,scope)&&kinds.includes(kind))))
    throw new Error("Invalid Owner History kind/scope");
  const from=canonicalUtcTime(options.from),until=canonicalUtcTime(options.until);
  if(from!==null&&until!==null&&from>until)
    throw new Error("Invalid Owner History time range");
  return {scope,origin,kind,from,until};
}
function base64url(value:string):string {
  const octets=new TextEncoder().encode(value);
  let binary="";
  for(const byte of octets) binary+=String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function fromBase64url(value:string):string {
  const padded=value.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-value.length%4)%4);
  const binary=atob(padded);
  const buffer=Uint8Array.from(binary,char=>char.charCodeAt(0));
  return new TextDecoder("utf-8",{fatal:true}).decode(buffer);
}
function checkedCursorShape(value:unknown,scope:Scope):Cursor {
  if(value===null || typeof value!=="object" || Array.isArray(value))
    throw new Error("Invalid Owner History cursor");
  const cursor=value as Record<string,unknown>;
  if(Object.keys(cursor).sort().join(",")!=="area,at,id,monitor,origin,v" ||
     cursor.v!==1 || !checkExactAt(cursor.at) ||
     typeof cursor.origin!=="string" || !ORIGINS.includes(cursor.origin) ||
     typeof cursor.id!=="string" || !safeId(cursor.id) ||
     cursor.area!==scope.area || cursor.monitor!==scope.monitor ||
     !compatibleOrigin(cursor.origin as OwnerHistoryOrigin,scope))
    throw new Error("Invalid Owner History cursor");
  return cursor as unknown as Cursor;
}
export function parseOwnerHistoryCursor(value:string|undefined,options:OwnerHistoryOptions={}):Cursor|null{
  const filters=checkedFilters(options),scope=filters.scope;
  if(value===undefined) return null;
  if(typeof value==="string"&&value.startsWith("v2.")){
    if(value.length>4096||!/^v2\.[A-Za-z0-9_-]+$/.test(value))throw new Error("Invalid Owner History cursor");
    try{
      const decoded=fromBase64url(value.slice(3));
      if(new TextEncoder().encode(decoded).length>3072||base64url(decoded)!==value.slice(3))throw new Error("Noncanonical cursor");
      const parsed=JSON.parse(decoded),f=parsed?.filters;
      if(!parsed||Object.keys(parsed).sort().join(",")!=="area,at,filters,id,monitor,origin,v"||parsed.v!==2
        ||!f||Object.keys(f).sort().join(",")!=="area,from,kind,monitor,origin,pageSize,until"
        ||f.area!==scope.area||f.monitor!==scope.monitor||f.origin!==filters.origin||f.kind!==filters.kind||f.from!==filters.from||f.until!==filters.until||f.pageSize!==(options.limit??25))throw new Error("Filter-bound cursor mismatch");
      const {filters:ignored,...legacy}=parsed;void ignored;
      return checkedCursorShape({...legacy,v:1},scope);
    }catch{throw new Error("Invalid Owner History cursor");}
  }
  if(filters.origin!==null||filters.kind!==null||filters.from!==null||filters.until!==null)
    throw new Error("Legacy cursor cannot carry Owner History filters");
  if(typeof value!=="string" || value.length<1 || value.length>680)
    throw new Error("Invalid Owner History cursor");
  // Preserve the existing valid SA-01 three-part timestamp/origin/UUID cursor.
  if(value.includes("~") && !value.startsWith("v1.")) {
    if(scope.area!==null && scope.area!=="system")
      throw new Error("Invalid Owner History cursor");
    const legacy=parseOwnerTimelineCursor(value);
    if(!legacy || !compatibleOrigin(legacy.origin,scope)) throw new Error("Invalid Owner History cursor");
    return {v:1,at:legacy.at.slice(0,-1)+"000Z",
      origin:legacy.origin,id:legacy.id,area:scope.area,monitor:scope.monitor};
  }
  if(!value.startsWith("v1.")) throw new Error("Invalid Owner History cursor");
  if(scope.area!==null&&!["system","accounts","security"].includes(scope.area))throw new Error("Legacy cursor incompatible with new area");
  const raw=value.slice(3);
  if(!/^[A-Za-z0-9_-]{1,675}$/.test(raw)) throw new Error("Invalid Owner History cursor");
  try{
    const decoded=fromBase64url(raw);
    if(base64url(decoded)!==raw) throw new Error("Noncanonical cursor");
    const cursor=checkedCursorShape(JSON.parse(decoded),scope);
    if((NATIVE_HISTORY_ORIGINS as readonly string[]).includes(cursor.origin))throw new Error("Legacy cursor incompatible with native source");
    return cursor;
  }catch{
    throw new Error("Invalid Owner History cursor");
  }
}
function encodeCursor(row:HistoryRow,filters:ReturnType<typeof checkedFilters>,limit:number):string{
  const {scope}=filters;
  const result:Cursor={v:1,at:row.exact_at,origin:row.origin,id:row.source_id,
    area:scope.area,monitor:scope.monitor};
  if(filters.origin!==null||filters.kind!==null||filters.from!==null||filters.until!==null||
      (NATIVE_HISTORY_ORIGINS as readonly string[]).includes(row.origin)||
      (scope.area!==null&&!["system","accounts","security"].includes(scope.area))){
    const text=JSON.stringify({...result,v:2,filters:{area:scope.area,monitor:scope.monitor,
      origin:filters.origin,kind:filters.kind,from:filters.from,until:filters.until,pageSize:limit}});
    const encoded="v2."+base64url(text);
    if(new TextEncoder().encode(text).length>3072||encoded.length>4096)throw new Error("Owner History cursor bounds exceeded");
    return encoded;
  }
  return "v1."+base64url(JSON.stringify(result));
}
type HistoryRow = {
  origin:OwnerHistoryOrigin;source_id:string;at:Date;exact_at:string;
  recorded_at:Date|null;scopes:OwnerHistoryMonitor[];kind:string;
  source:string;quality:string|null;details:OwnerHistoryPayload;
};
function readRow(row:HistoryRow):OwnerHistoryEntry {
  if(!checkExactAt(row.exact_at) || !ORIGINS.includes(row.origin) ||
     typeof row.source_id!=="string" || !safeId(row.source_id))
    throw new Error("Owner History source identity invariant failed");
  if(!Array.isArray(row.scopes) ||
    row.scopes.some(m=>!Object.values(MONITORS).some(items=>items.includes(m))))
    throw new Error("Owner History scope invariant failed");
  if(!row.details || typeof row.details!=="object" || Array.isArray(row.details))
    throw new Error("Owner History source payload invariant failed");
  const native=(NATIVE_HISTORY_ORIGINS as readonly string[]).includes(row.origin);
  return {origin:row.origin,id:row.source_id,
    occurredAt:native?row.exact_at:row.at.toISOString(),recordedAt:native?row.exact_at:row.recorded_at?.toISOString()??null,
    monitorKeys:row.scopes,kind:row.kind,source:row.source,quality:row.quality,
    values:row.details};
}

/** The source identities and immutable ordering timestamps are never copied or updated. */
const LEGACY_SOURCE_SQL = [
  "select 'system-event'::text origin,e.id::text source_id,e.occurred_at at,",
  " e.recorded_at recorded_at, ARRAY[e.monitor_key]::text[] scopes,",
  " e.kind,e.source,null::text quality,e.payload details",
  " from owner_events e where e.source='system'",
  "union all",
  "select 'auth-event'::text,e.id::text,e.occurred_at,e.recorded_at,",
  " case e.kind",
  " when 'account.created' then ARRAY['accounts.users']::text[]",
  " when 'auth.methodLinked' then ARRAY['accounts.methods','security.auth']::text[]",
  " when 'auth.passwordChanged' then ARRAY['accounts.methods','security.auth']::text[]",
  " when 'auth.sessionCreated' then ARRAY['accounts.sessions','security.auth']::text[]",
  " when 'auth.sessionDeleted' then ARRAY['accounts.sessions','security.auth']::text[]",
  " else ARRAY[]::text[] end,",
  " e.kind,e.source,null::text,",
  " e.payload || jsonb_build_object(",
  " 'actorUserId',e.actor_user_id,'targetUserId',e.target_user_id,",
  " 'entityType',e.entity_type,'entityId',e.entity_id)",
  " from owner_events e where e.source='auth' and e.kind in",
  " ('account.created','auth.methodLinked','auth.passwordChanged',",
  " 'auth.sessionCreated','auth.sessionDeleted')",
  "union all",
  ACCOUNT_HISTORY_SELECT_SQL,
  "union all",
  "select 'system-observation'::text,o.id::text,o.observed_at,o.observed_at,",
  " ARRAY[o.monitor_key]::text[],'monitor.observed'::text,o.source,o.quality,o.value",
  " from owner_monitor_observations o where o.resource_scope='global'",
  "union all",
  "select 'admin-history'::text,a.id::text,a.occurred_at,a.occurred_at,",
  ADMIN_MONITOR_SCOPES_SQL+",",
  " a.action,'admin_history'::text,null::text,",
  " jsonb_build_object('actorUserId',a.actor_id,'targetType',a.target_type,'targetId',a.target_id) ||",
  " case when a.action='settings.registrationChanged' then jsonb_build_object(",
  " 'beforeGoogleEnabled',case when jsonb_typeof(a.context#>'{before,googleRegistrationEnabled}')='boolean'",
  " then (a.context#>>'{before,googleRegistrationEnabled}')::boolean end,",
  " 'afterGoogleEnabled',case when jsonb_typeof(a.context#>'{after,googleRegistrationEnabled}')='boolean'",
  " then (a.context#>>'{after,googleRegistrationEnabled}')::boolean end,",
  " 'beforeEmailEnabled',case when jsonb_typeof(a.context#>'{before,emailRegistrationEnabled}')='boolean'",
  " then (a.context#>>'{before,emailRegistrationEnabled}')::boolean end,",
  " 'afterEmailEnabled',case when jsonb_typeof(a.context#>'{after,emailRegistrationEnabled}')='boolean'",
  " then (a.context#>>'{after,emailRegistrationEnabled}')::boolean end,",
  " 'beforeVersion',case when jsonb_typeof(a.context#>'{before,version}')='number'",
  " then left(a.context#>>'{before,version}',16) end,",
  " 'afterVersion',case when jsonb_typeof(a.context#>'{after,version}')='number'",
  " then left(a.context#>>'{after,version}',16) end",
  " ) else '{}'::jsonb end",
  " from admin_history a",
  "union all",
  "select 'attachment-evidence'::text,f.id::text,f.created_at,f.created_at,",
  " ARRAY['security.attachments']::text[],'attachment.securityEvidence'::text,",
  " 'forum_attachment_security_events'::text,null::text,",
  " jsonb_build_object('uploadId',f.upload_id,'uploadedByUserId',f.uploaded_by_user_id,",
  " 'detectedType',f.detected_type,'reason',f.reason,'declaredByteSize',f.declared_byte_size)",
  " from forum_attachment_security_events f",
  "union all",
  "select 'attempt-pattern'::text,p.id::text,p.admitted_at,p.admitted_at,",
  " case when p.surface='auth' and p.operation='registration-admission'",
  " then ARRAY['security.auth','accounts.registration']::text[]",
  " when p.surface='auth' then ARRAY['security.auth']::text[]",
  " else ARRAY['security.access']::text[] end,",
  " 'attempt.coalesced'::text,p.surface::text,'coalesced'::text,",
  " jsonb_build_object(",
  " 'recordingEpochStart',to_char(p.recording_epoch_start at time zone 'UTC',",
  " 'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"'),",
  " 'actorUserId',p.actor_user_id,'networkIp',host(p.network_ip),",
  " 'networkQuality',p.network_quality,'operation',p.operation,'outcome',p.outcome,",
  " 'httpStatus',p.http_status,'directCode',p.direct_code,",
  " 'firstOccurredAt',to_char(p.first_occurred_at at time zone 'UTC',",
  " 'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"'),",
  " 'lastOccurredAt',to_char(p.last_occurred_at at time zone 'UTC',",
  " 'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"'),",
  " 'count',p.count::text,'saturated',p.saturated_count)",
  " from owner_attempt_patterns p",
  "union all",
  "select 'attempt-state'::text,",
  " (to_char(s.recording_epoch_start at time zone 'UTC',",
  " 'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"')||'/'||s.slot)::text,",
  " s.admitted_at,s.admitted_at,",
  " case when right(s.slot,5)='.auth' then ARRAY['security.auth']::text[]",
  " else ARRAY['security.access']::text[] end,",
  " 'attempt.'||split_part(s.slot,'.',1),",
  " 'attempt_state'::text,'coalesced'::text,",
  " jsonb_build_object('slot',s.slot,",
  " 'recordingEpochStart',to_char(s.recording_epoch_start at time zone 'UTC',",
  " 'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"'),",
  " 'firstOccurredAt',case when s.first_occurred_at is not null then",
  " to_char(s.first_occurred_at at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') end,",
  " 'lastOccurredAt',case when s.last_occurred_at is not null then",
  " to_char(s.last_occurred_at at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') end,",
  " 'count',s.count::text,'saturated',s.saturated_count)",
  " from owner_attempt_telemetry_state s where s.slot not like 'quota.%'",
].join("\n");

function timelineSql(filterOrigin:OwnerHistoryOrigin|null=null,scope:Scope={area:null,monitor:null}){
  const predicates = "($1::text is null or $1=any(scopes)) and ($2::text is null or exists(select 1 from unnest(scopes) m where m like ($2||'.%'))) and ($3::timestamptz is null or (at,origin,source_id)<($3::timestamptz,$4::text,$5::text)) and ($7::text is null or kind=$7::text) and ($8::timestamptz is null or at>=$8::timestamptz) and ($9::timestamptz is null or at<$9::timestamptz)";
  const legacyOrigins:OwnerHistoryOrigin[]=["system-event","auth-event","account-event","system-observation","admin-history","attachment-evidence","attempt-pattern","attempt-state"];
  const legacy=LEGACY_SOURCE_SQL.split("\nunion all\n").flatMap((sql,index)=>{
    if(filterOrigin!==null && legacyOrigins[index]!==filterOrigin)return [];
    if(!compatibleOrigin(legacyOrigins[index],scope))return [];
    // Preserve direct equality prefixes for scoped chronological indexes.
    const direct=index===0?" and ($1::text is null or e.monitor_key=$1)":index===3?" and ($1::text is null or o.monitor_key=$1)":"";
    return [`(select ${HISTORY_COLUMNS} from (${sql+direct}) facts(${HISTORY_COLUMNS}) where ${predicates} order by at desc nulls last,origin desc nulls last,source_id desc nulls last limit $6)`];
  });
  const native=nativeHistoryBranches({monitor:"$1",area:"$2",at:"$3",origin:"$4",id:"$5",limit:"$6",
    filterOrigin,filterArea:scope.area,filterMonitor:scope.monitor,
    kind:"$7",from:"$8",until:"$9"});
  return `with candidates as (${[...legacy,...native].join(" union all ")}) select ${HISTORY_COLUMNS},to_char(at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') exact_at from candidates order by at desc nulls last,origin desc nulls last,source_id desc nulls last limit $6`;
}
const TIMELINE_SQL=timelineSql();

export class PostgresOwnerSa02History {
  constructor(private readonly pool:Pick<Pool,"query">){}
  async readTimeline(options:OwnerHistoryOptions={}):Promise<OwnerHistoryPage> {
    const filters=checkedFilters(options),scope=filters.scope;
    const limit=options.limit??25;
    if(!Number.isInteger(limit) || limit<1 || limit>50)
      throw new Error("Invalid Owner History limit");
    const cursor=parseOwnerHistoryCursor(options.before,options);
    const result=await this.pool.query<HistoryRow>(filters.origin===null&&scope.area===null&&scope.monitor===null?TIMELINE_SQL:timelineSql(filters.origin,scope),[
      scope.monitor,scope.area,cursor?.at??null,cursor?.origin??null,
      cursor?.id??null,limit+1,filters.kind,filters.from,filters.until,
    ]);
    const rows=result.rows.slice(0,limit);
    const entries=rows.map(readRow);
    const last=rows.at(-1);
    return {entries,next:result.rows.length>limit && last ? encodeCursor(last,filters,limit) : null,
      coverage:await readNativeHistoryCoverage(this.pool,undefined,
        (!scope.area||scope.area==="administration")&&(!scope.monitor||scope.monitor==="administration.measures")&&
        (filters.origin===null||filters.origin==="measure-appeal-moot")&&
        (filters.kind===null||filters.kind==="measure.appealMoot"))};
  }
}
