import type { Pool } from "pg";
import { SYSTEM_MONITORS } from "./owner-system-history";
import { SA02_MONITORS, type Sa02Area, type Sa02MonitorKey } from "./owner-sa02-catalog";
import { parseOwnerTimelineCursor } from "./owner-system-monitoring";

/** Server-only source projection; caller must authorize exact Owner before invoking it. */
export type OwnerHistoryArea = "system" | Sa02Area;
export type OwnerHistoryMonitor = typeof SYSTEM_MONITORS[number] | Sa02MonitorKey;
export type OwnerHistoryOrigin =
  | "system-event" | "auth-event" | "system-observation" | "admin-history"
  | "attachment-evidence" | "attempt-pattern" | "attempt-state";
const ORIGINS: readonly string[] = [
  "system-event", "auth-event", "system-observation", "admin-history",
  "attachment-evidence", "attempt-pattern", "attempt-state",
];
const AREAS: readonly string[] = ["system","accounts","security"];
const MONITORS: Record<OwnerHistoryArea,readonly string[]> = {
  system: SYSTEM_MONITORS, accounts: SA02_MONITORS.accounts, security: SA02_MONITORS.security,
};
export type OwnerHistoryValue = string | number | boolean | null;
export type OwnerHistoryPayload = Record<string,OwnerHistoryValue>;
export interface OwnerHistoryEntry {
  origin: OwnerHistoryOrigin; id: string; occurredAt: string; recordedAt: string | null;
  monitorKeys: OwnerHistoryMonitor[]; kind: string; source: string; quality: string | null;
  values: OwnerHistoryPayload;
}
export interface OwnerHistoryPage {entries:OwnerHistoryEntry[]; next:string|null}
export interface OwnerHistoryOptions {
  area?: OwnerHistoryArea;
  monitorKey?: OwnerHistoryMonitor;
  before?:string;
  limit?:number;
}
type Scope = {area:OwnerHistoryArea|null;monitor:OwnerHistoryMonitor|null};
type Cursor = {v:1;at:string;origin:OwnerHistoryOrigin;id:string;
  area:OwnerHistoryArea|null;monitor:OwnerHistoryMonitor|null};
const EXACT = /^([1-9][0-9]{3})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])\.([0-9]{6})Z$/;
const ID = /^[^\u0000-\u001f\u007f]{1,200}$/u;
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
     typeof cursor.id!=="string" || !ID.test(cursor.id) ||
     cursor.area!==scope.area || cursor.monitor!==scope.monitor)
    throw new Error("Invalid Owner History cursor");
  return cursor as unknown as Cursor;
}
export function parseOwnerHistoryCursor(value:string|undefined,options:OwnerHistoryOptions={}):Cursor|null{
  const scope=checkedScope(options);
  if(value===undefined) return null;
  if(typeof value!=="string" || value.length<1 || value.length>680)
    throw new Error("Invalid Owner History cursor");
  // Preserve the existing valid SA-01 three-part timestamp/origin/UUID cursor.
  if(value.includes("~") && !value.startsWith("v1.")) {
    if(scope.area!==null && scope.area!=="system")
      throw new Error("Invalid Owner History cursor");
    const legacy=parseOwnerTimelineCursor(value);
    if(!legacy) throw new Error("Invalid Owner History cursor");
    return {v:1,at:legacy.at.slice(0,-1)+"000Z",
      origin:legacy.origin,id:legacy.id,area:scope.area,monitor:scope.monitor};
  }
  if(!value.startsWith("v1.")) throw new Error("Invalid Owner History cursor");
  const raw=value.slice(3);
  if(!/^[A-Za-z0-9_-]{1,675}$/.test(raw)) throw new Error("Invalid Owner History cursor");
  try{
    const decoded=fromBase64url(raw);
    if(base64url(decoded)!==raw) throw new Error("Noncanonical cursor");
    return checkedCursorShape(JSON.parse(decoded),scope);
  }catch{
    throw new Error("Invalid Owner History cursor");
  }
}
function encodeCursor(row:HistoryRow,scope:Scope):string{
  const result:Cursor={v:1,at:row.exact_at,origin:row.origin,id:row.source_id,
    area:scope.area,monitor:scope.monitor};
  return "v1."+base64url(JSON.stringify(result));
}
type HistoryRow = {
  origin:OwnerHistoryOrigin;source_id:string;at:Date;exact_at:string;
  recorded_at:Date|null;scopes:OwnerHistoryMonitor[];kind:string;
  source:string;quality:string|null;details:OwnerHistoryPayload;
};
function readRow(row:HistoryRow):OwnerHistoryEntry {
  if(!checkExactAt(row.exact_at) || !ORIGINS.includes(row.origin) ||
     typeof row.source_id!=="string" || !ID.test(row.source_id))
    throw new Error("Owner History source identity invariant failed");
  if(!Array.isArray(row.scopes) ||
    row.scopes.some(m=>!Object.values(MONITORS).some(items=>items.includes(m))))
    throw new Error("Owner History scope invariant failed");
  if(!row.details || typeof row.details!=="object" || Array.isArray(row.details))
    throw new Error("Owner History source payload invariant failed");
  return {origin:row.origin,id:row.source_id,
    occurredAt:row.at.toISOString(),recordedAt:row.recorded_at?.toISOString()??null,
    monitorKeys:row.scopes,kind:row.kind,source:row.source,quality:row.quality,
    values:row.details};
}

/** The source identities and immutable ordering timestamps are never copied or updated. */
const TIMELINE_SQL = [
  "with entries as (",
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
  " e.kind,e.source,null::text,e.payload",
  " from owner_events e where e.source='auth' and e.kind in",
  " ('account.created','auth.methodLinked','auth.passwordChanged',",
  " 'auth.sessionCreated','auth.sessionDeleted')",
  "union all",
  "select 'system-observation'::text,o.id::text,o.observed_at,o.observed_at,",
  " ARRAY[o.monitor_key]::text[],'monitor.observed'::text,o.source,o.quality,o.value",
  " from owner_monitor_observations o where o.resource_scope='global'",
  "union all",
  "select 'admin-history'::text,a.id::text,a.occurred_at,a.occurred_at,",
  " case when a.action='settings.registrationChanged' then ARRAY['accounts.registration']::text[]",
  " else ARRAY[]::text[] end,",
  " a.action,'admin_history'::text,null::text,",
  " jsonb_build_object('actorUserId',a.actor_id,'targetType',a.target_type,'targetId',a.target_id)",
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
  "), scoped as (select *,",
  " to_char(at at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') exact_at",
  " from entries where ($1::text is null or $1::text = any(scopes))",
  " and ($2::text is null or exists (select 1 from unnest(scopes) m",
  " where m like ($2::text||'.%'))))",
  " select origin,source_id,at,exact_at,recorded_at,scopes,kind,source,quality,details",
  " from scoped where ($3::timestamptz is null or",
  " (at,origin,source_id)<($3::timestamptz,$4::text,$5::text))",
  " order by at desc,origin desc,source_id desc limit $6",
].join("\n");

export class PostgresOwnerSa02History {
  constructor(private readonly pool:Pick<Pool,"query">){}
  async readTimeline(options:OwnerHistoryOptions={}):Promise<OwnerHistoryPage> {
    const scope=checkedScope(options);
    const limit=options.limit??25;
    if(!Number.isInteger(limit) || limit<1 || limit>50)
      throw new Error("Invalid Owner History limit");
    const cursor=parseOwnerHistoryCursor(options.before,options);
    const result=await this.pool.query<HistoryRow>(TIMELINE_SQL,[
      scope.monitor,scope.area,cursor?.at??null,cursor?.origin??null,
      cursor?.id??null,limit+1,
    ]);
    const rows=result.rows.slice(0,limit);
    const entries=rows.map(readRow);
    const last=rows.at(-1);
    return {entries,next:result.rows.length>limit && last ? encodeCursor(last,scope) : null};
  }
}
