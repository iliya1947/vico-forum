import type {Pool,ClientBase} from "pg";
import expectedManifest from "../.github/production-schema-manifest.json";
import {recordOwnerMonitorSnapshot} from "./owner-monitor-observations";
import {DATA_COUNT_GROUPS,DATA_LOCALIZATION_COUNTS,DATA_COMPATIBILITY_COLUMNS,DATA_LOCALIZATION_COMPATIBILITY_COLUMNS,DATA_MONITOR_KEYS,
  type DataCheck,type DataFailureCode,type DataValues,type DataMonitorKey,type OwnerDataCurrent,type DataCurrentMonitor} from "./owner-data-catalog";

const identifier=(value:string)=>'"'+value+'"';
const exact=(value:unknown):string=>{if(typeof value!=="string"||!/^\d+$/.test(value))throw new Error("Invalid exact Data count");return value;};
const instant=(field:string)=>`to_char(${field} at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
const count=(table:string,where="true")=>`(select count(*)::text from ${table} where ${where})`;
function failureCode(error:unknown):DataFailureCode|null {
  const code=error&&typeof error==="object"?String((error as {code?:unknown}).code):"";
  return code==="42P01"?"missing-relation":code==="42703"?"missing-column":code==="42501"?"insufficient-grant":
    ["55P03","57014"].includes(code)?"deadline":["08000","08003","08006","57P01","57P02","57P03"].includes(code)?"dependency-unavailable":null;
}
/** SAVEPOINT recovers only classified per-check failures; no retry or fabricated zero. */
async function checked(c:ClientBase,id:string,source:DataCheck["source"],observedAt:string,compatibility:boolean,work:()=>Promise<DataValues>):Promise<DataCheck>{
  await c.query("savepoint owner_data_check");
  try{
    const values=await work();await c.query("release savepoint owner_data_check");
    return {id,source,observedAt,status:compatibility?"compatible":"measured",code:"none",values};
  }catch(error){
    const code=failureCode(error);if(!code)throw error;
    await c.query("rollback to savepoint owner_data_check");await c.query("release savepoint owner_data_check");
    return {id,source,observedAt,status:compatibility&&["missing-relation","missing-column","insufficient-grant"].includes(code)?"incompatible":"unavailable",code,values:{}};
  }
}
async function counts(c:ClientBase,relations:readonly string[]):Promise<DataValues>{
  const fields=relations.map(table=>`${count(identifier(table))} as ${identifier(table)}`).join(',');
  const row=(await c.query<Record<string,string>>(`select ${fields}`)).rows[0];
  if(!row)throw new Error("Missing Data count group");
  return Object.fromEntries(relations.map(table=>[table,exact(row[table])]));
}
const ANOMALIES:Record<string,string>={
  topicCurrentTitle:count("forum_topics t","not exists(select 1 from forum_topic_title_revisions r where r.id=t.current_title_revision_id and r.topic_id=t.id)"),
  postCurrentBody:count("forum_posts p","not exists(select 1 from forum_post_revisions r where r.id=p.current_revision_id and r.post_id=p.id)"),
  postTopic:count("forum_posts p","not exists(select 1 from forum_topics t where t.id=p.topic_id)"),
  notificationPost:count("forum_reply_notifications n","n.kind in ('reply','mention') and not exists(select 1 from forum_posts p where p.id=n.post_id and p.topic_id=n.topic_id)"),
  notificationDecision:count("forum_reply_notifications n","n.kind='complaint-decision' and not exists(select 1 from forum_complaint_decisions d where d.id=n.complaint_decision_id)"),
  notificationAppeal:count("forum_reply_notifications n","n.kind='complaint-appeal-result' and not exists(select 1 from forum_complaint_appeals a where a.id=n.complaint_appeal_id)"),
  notificationKind:count("forum_reply_notifications n","n.kind not in ('reply','mention','complaint-decision','complaint-appeal-result')"),
  attachmentPublication:count("forum_post_attachments r","not exists(select 1 from forum_attachments a where a.id=r.attachment_id) or not exists(select 1 from forum_posts p where p.id=r.post_id)"),
  attachmentDraft:count("forum_attachment_draft_refs r","not exists(select 1 from forum_attachments a where a.id=r.attachment_id and a.owner_id=r.owner_id)"),
  attachmentEvidence:count("forum_complaint_evidence_attachments r","not exists(select 1 from forum_attachments a where a.id=r.attachment_id) or not exists(select 1 from forum_complaint_targets t where t.id=r.target_id)"),
};
async function fields(c:Pick<ClientBase,"query">,expressions:Record<string,string>):Promise<Record<string,string>>{
  const row=(await c.query<Record<string,string>>('select '+Object.entries(expressions).map(([key,expression])=>expression+' as '+identifier(key)).join(','))).rows[0];
  if(!row)throw new Error("Missing Data aggregate");
  return Object.fromEntries(Object.keys(expressions).map(key=>[key,exact(row[key])]));
}
const RETAINED_SOURCES={
  ownerEvents:{table:"owner_events",time:"occurred_at"},
  observations:{table:"owner_monitor_observations",time:"observed_at"},
  administration:{table:"admin_history",time:"occurred_at"},
  attachmentEvidenceSource:{table:"forum_attachment_security_events",time:"created_at"},
  attemptPatterns:{table:"owner_attempt_patterns",time:"admitted_at"},
  attemptState:{table:"owner_attempt_telemetry_state",time:"admitted_at"},
  titleRevisions:{table:"forum_topic_title_revisions",time:"created_at"},
  postRevisions:{table:"forum_post_revisions",time:"created_at"},
  complaintEvents:{table:"forum_complaint_events",time:"created_at"},
  helpSignals:{table:"forum_help_signals",time:"created_at"},
  measureAppeals:{table:"user_measure_appeals",time:"created_at"},
  notifications:{table:"forum_reply_notifications",time:"created_at"},
} as const;
export async function readDataRetained(c:Pick<ClientBase,"query">,table:string,time:string):Promise<DataValues>{
  const row=(await c.query<{rows:string;first:string|null;last:string|null;unprovenTime:string}>(`select count(*)::text rows,
    ${instant(`min(${time}) filter(where isfinite(${time}))`)} first,${instant(`max(${time}) filter(where isfinite(${time}))`)} last,
    count(*) filter(where ${time} is null or not isfinite(${time}))::text "unprovenTime" from ${table}`)).rows[0];
  if(!row)throw new Error("Missing Data retained aggregate");
  for(const at of [row.first,row.last])if(at!==null&&(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(at)||!Number.isFinite(Date.parse(at))))throw new Error("Invalid retained source time");
  return {rows:exact(row.rows),first:row.first,last:row.last,unprovenTime:exact(row.unprovenTime)};
}
const TERMINAL_ANOMALIES={
  helpTerminalTime:count("forum_help_signals a","a.status in ('withdrawn','superseded') and (a.resolved_at is null or not isfinite(a.resolved_at) or a.resolved_at<a.created_at)"),
  mootTerminalTime:count("user_measure_appeals a","a.status='moot' and (a.resolved_at is null or not isfinite(a.resolved_at) or a.resolved_at<a.created_at)"),
  notificationReadTime:count("forum_reply_notifications n","n.read_at is not null and (not isfinite(n.read_at) or n.read_at<n.created_at)"),
  complaintTerminalTime:count("forum_complaint_appeals a","a.status<>'pending' and (a.resolved_at is null or not isfinite(a.resolved_at) or a.resolved_at<a.created_at)"),
  helpHumanAttribution:count("forum_help_signals a","a.status in ('accepted','rejected') and a.resolved_by_user_id is null"),
  measureHumanAttribution:count("user_measure_appeals a","a.status in ('accepted','rejected') and a.reviewer_user_id is null"),
  complaintHumanAttribution:count("forum_complaint_appeals a","a.status<>'pending' and a.reviewer_user_id is null"),
};
/** The same retained time/actor gap definitions used by Data and Overview. */
export const readDataTerminalCoverage=(c:Pick<ClientBase,"query">)=>fields(c,TERMINAL_ANOMALIES);
type ManifestTable=keyof typeof expectedManifest.tables;
async function compatibility(c:ClientBase,table:string,columns:readonly string[]):Promise<DataValues>{
  // Probe ordinary access before catalog inspection; pg_catalog visibility alone
  // does not prove SELECT capability or application compatibility.
  await c.query(`select ${columns.map(identifier).join(',')} from ${identifier(table)} limit 0`);
  const expected=expectedManifest.tables[table as ManifestTable];if(!expected)throw new Error("Unknown compiled compatibility source");
  const actual=(await c.query<{name:string;type:string;nullable:boolean}>(`select attname name,pg_catalog.format_type(atttypid,atttypmod) type,not attnotnull nullable
    from pg_catalog.pg_attribute where attrelid=pg_catalog.to_regclass($1) and attname=any($2::text[]) and attnum>0 and not attisdropped`,[identifier(table),columns])).rows;
  let mismatch=0;
  for(const name of columns){const e=expected.columns.find(c=>c.name===name),a=actual.find(c=>c.name===name);if(!e)throw new Error("Unknown compiled compatibility column");if(!a||a.type!==e.type||a.nullable!==e.nullable)mismatch++;}
  return {columnsChecked:columns.length,mismatchedColumns:mismatch.toString()};
}
interface SourceRead {at:string;application:DataCheck[];compatibility:DataCheck[];retention:DataCheck[]}
async function readSource(c:ClientBase,localization:boolean):Promise<SourceRead>{
  let begun=false;
  try{
    await c.query("begin isolation level repeatable read read only");begun=true;
    await c.query("set local statement_timeout='1500ms';set local lock_timeout='500ms';set local transaction_timeout='10000ms'");
    const at=(await c.query<{at:string}>(`select ${instant('transaction_timestamp()')} at`)).rows[0].at;
    const source=localization?"localization-database":"web-database",application:DataCheck[]=[],compatibilityChecks:DataCheck[]=[],retention:DataCheck[]=[];
    const groups=localization?{localization:DATA_LOCALIZATION_COUNTS}:DATA_COUNT_GROUPS;
    for(const [group,relations]of Object.entries(groups))application.push(await checked(c,'counts.'+group,source,at,false,()=>counts(c,relations)));
    if(!localization)application.push(await checked(c,'relationships',source,at,false,()=>fields(c,ANOMALIES)));
    compatibilityChecks.push(await checked(c,'server',source,at,true,async()=>{
      const version=(await c.query<{version:string}>("select current_setting('server_version_num') version")).rows[0].version;
      exact(version);return {serverVersion:version,requiredMajor:'17',supportedMajor:Math.floor(Number(version)/10000)===17};
    }));
    for(const [table,columns]of Object.entries(localization?DATA_LOCALIZATION_COMPATIBILITY_COLUMNS:DATA_COMPATIBILITY_COLUMNS)){
      const check=await checked(c,table,source,at,true,()=>compatibility(c,table,columns));
      if(check.status==='compatible'&&check.values.mismatchedColumns!=='0'){check.status='incompatible';check.code='type-mismatch';}
      compatibilityChecks.push(check);
    }
    if(compatibilityChecks[0].values.supportedMajor===false){compatibilityChecks[0].status='incompatible';compatibilityChecks[0].code='type-mismatch';}
    if(!localization){
      for(const [id,{table,time}]of Object.entries(RETAINED_SOURCES))retention.push(await checked(c,id,source,at,false,()=>readDataRetained(c,table,time)));
      retention.push(await checked(c,'terminalCoverage',source,at,false,()=>readDataTerminalCoverage(c)));
      retention.push(await checked(c,'sampleSchemas',source,at,false,async()=>{
        const row=(await c.query<{distinctVersions:string;versions:number[]}>(`select count(distinct schema_version)::text "distinctVersions",
          array(select distinct schema_version from owner_monitor_observations order by schema_version limit 32) versions from owner_monitor_observations`)).rows[0];
        const distinct=exact(row.distinctVersions);if(row.versions.some(n=>!Number.isSafeInteger(n)))throw new Error("Invalid sample schema version");
        return {distinctVersions:distinct,versions:row.versions.join(', '),versionsComplete:BigInt(distinct)===BigInt(row.versions.length)};
      }));
      retention.push(await checked(c,'factSchemas',source,at,false,async()=>{
        const row=(await c.query<{versionedFactRows:string;unversionedFactRows:string;unrecognizedFactRows:string;factDistinctVersions:string;versions:number[]}>(`with metadata as(
          select payload?'schemaVersion' present,case when jsonb_typeof(payload->'schemaVersion')='number' and
            (payload->>'schemaVersion')~'^[1-9][0-9]{0,8}([.]0+)?$' then (payload->>'schemaVersion')::numeric::integer end version from owner_events)
          select count(*) filter(where version is not null)::text "versionedFactRows",
            count(*) filter(where not present)::text "unversionedFactRows",count(*) filter(where present and version is null)::text "unrecognizedFactRows",
            count(distinct version)::text "factDistinctVersions",array(select distinct version from metadata where version is not null order by version limit 32) versions from metadata`)).rows[0];
        const distinct=exact(row.factDistinctVersions);if(row.versions.some(n=>!Number.isSafeInteger(n)))throw new Error('Invalid fact schema metadata');
        return {versionedFactRows:exact(row.versionedFactRows),unversionedFactRows:exact(row.unversionedFactRows),unrecognizedFactRows:exact(row.unrecognizedFactRows),factDistinctVersions:distinct,
          factVersions:row.versions.join(', '),factVersionsComplete:BigInt(distinct)===BigInt(row.versions.length)};
      }));
      retention.push(await checked(c,'lifecycle',source,at,false,async()=>{
        const row=(await c.query<Record<string,string>>(`select count(*) filter(where deactivated_at is not null)::text deactivated,
          count(*) filter(where deactivated_at is not null and retain_at_least_until>$1::timestamptz)::text "minimumBoundaryFuture",
          count(*) filter(where deactivated_at is not null and retain_at_least_until<=$1::timestamptz)::text "minimumBoundaryReached",
          count(*) filter(where (deactivated_at is null and (deactivated_by_user_id is not null or retain_at_least_until is not null)) or
            (deactivated_at is not null and (deactivated_by_user_id is null or btrim(deactivated_by_user_id)='' or retain_at_least_until is null or not isfinite(deactivated_at) or not isfinite(retain_at_least_until) or
            (retain_at_least_until at time zone 'UTC')<(deactivated_at at time zone 'UTC')+interval '1 year')))::text "invalidTuple" from "user"`,[at])).rows[0];
        return Object.fromEntries(Object.entries(row).map(([k,v])=>[k,exact(v)]));
      }));
    }
    await c.query('commit');begun=false;
    return {at,application,compatibility:compatibilityChecks,retention};
  }catch(error){if(begun)try{await c.query('rollback');}catch{/* Preserve the real source failure. */}throw error;}
}
function snapshot(checks:DataCheck[]):DataValues{
  const values:DataValues={checks:checks.length,successful:checks.filter(c=>c.status==='measured'||c.status==='compatible').length,
    incompatible:checks.filter(c=>c.status==='incompatible').length,unavailable:checks.filter(c=>c.status==='unavailable').length};
  for(const check of checks){const prefix=check.source+':'+check.id+':';values[prefix+'status']=check.status;values[prefix+'code']=check.code;
    for(const [key,value]of Object.entries(check.values))values[prefix+key]=value;}
  return values;
}
export class PostgresOwnerDataMonitoring {
  constructor(private readonly web:Pool,private readonly localization:ClientBase){}
  async readCurrent():Promise<OwnerDataCurrent>{
    const connection=await this.web.connect();let web:SourceRead;
    try{web=await readSource(connection,false);}finally{connection.release();}
    const localization=await readSource(this.localization,true);
    const sources:Record<DataMonitorKey,DataCheck[]>={'data.application':[...web.application,...localization.application],
      'data.compatibility':[...web.compatibility,...localization.compatibility],'data.retention':web.retention};
    const monitors:DataCurrentMonitor[]=[];
    for(const key of DATA_MONITOR_KEYS){
      const checks=sources[key],values=snapshot(checks);let recording:DataCurrentMonitor['recording']='available',coverageFrom:string|null=null,lastObservedAt:string|null=null;
      // Read transactions and all source locks are closed before independent recording.
      try{await recordOwnerMonitorSnapshot(this.web,key,values);}catch{recording='unavailable';}
      try{
        const r=(await this.web.query<{first:Date|null;last:Date|null}>(`select min(at) first,max(at) filter(where own) last from(
          select min(observed_at) at,true own from owner_monitor_observations where monitor_key=$1 and resource_scope='global'
          union all select max(observed_at),true from owner_monitor_observations where monitor_key=$1 and resource_scope='global'
          ${key==='data.compatibility'?"union all select min(observed_at),false from owner_monitor_observations where monitor_key='system.dependencies' and resource_scope='global' union all select min(occurred_at),false from owner_events where source='system' and monitor_key='system.dependencies' and kind='system.dependencyUnavailable'":""}) retained`,[key])).rows[0];
        coverageFrom=r.first?.toISOString()??null;lastObservedAt=r.last?.toISOString()??null;
      }catch{recording='unavailable';}
      monitors.push({key,schemaVersion:1,source:'database',quality:'measured',observedAt:web.at,values,checks,recording,coverageFrom,lastObservedAt});
    }
    return {monitors,compiledExpectedMigration:expectedManifest.targetMigration,deployedMigration:'unchecked'};
  }
}
