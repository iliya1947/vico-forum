import type {Pool,PoolClient} from "pg";
import {ATTACHMENT_CLEANUP_GRACE_MS,ATTACHMENT_CLEANUP_CLAIM_LEASE_MS,ATTACHMENT_OPERATION_IDLE_MS} from "./forum-attachment-cleanup";
import {STORAGE_SLOTS,checkedStorageCandidate,type StorageSlot,type StorageObservationValue} from "../app/observability/storage-observations";
import {recordOwnerMonitorSnapshot} from "./owner-monitor-observations";

export const FILE_MONITOR_KEYS=["files.assets","files.operations","background.attachments"] as const;
export type FileMonitorKey=typeof FILE_MONITOR_KEYS[number];
export type FileValues=Record<string,string|boolean|null>;
export interface FileCurrentMonitor {
  key:FileMonitorKey;schemaVersion:1;source:"database";quality:"measured";observedAt:string;values:FileValues;
  recording:"available"|"unavailable";coverageFrom:string|null;lastObservedAt:string|null;
}
export interface RetainedStorageSample {
  scope:StorageSlot;sample:null|{id:string;observedAt:string;ageMs:string;value:StorageObservationValue};
}
export interface OwnerFilesCurrent {monitors:FileCurrentMonitor[];storageSamples:RetainedStorageSample[];bucketBound:boolean}
const types=["png","jpeg","gif","webp","pdf","zip","7z","gzip","tar","ole","text","executable","unknown","other"] as const;
const referenced=`exists(select 1 from forum_post_attachments p where p.attachment_id=a.id)
  or exists(select 1 from forum_attachment_draft_refs r where r.attachment_id=a.id)
  or exists(select 1 from forum_complaint_evidence_attachments e where e.attachment_id=a.id)`;
const number=(condition:string)=>`count(*) filter(where ${condition})::text`;
const maxAge=(field:string,condition:string)=>`max(greatest(0,floor(extract(epoch from (clock.at-${field}))*1000))) filter(where ${condition})::text`;
function exactRow(row:Record<string,string|null>,nullable:readonly string[]=[]):FileValues{
  if(!row)throw new Error("Missing file source aggregate");
  for(const [key,value]of Object.entries(row))if(!(value===null&&nullable.includes(key))&&(typeof value!=="string"||!/^\d+$/.test(value)))throw new Error("Invalid exact file aggregate");
  return {...row};
}

/** Fixed full aggregates. Object keys, owner/context IDs, capabilities and opaque cursors stay inside SQL. */
export async function readFileSource(c:Pick<PoolClient,"query">,observedAt:string){
  const typeSql=`case when detected_type in (${types.filter(t=>t!=="other").map(t=>"'"+t+"'").join(',')}) then detected_type else 'other' end`;
  const typeFields=types.flatMap((type,index)=>["active","deleting"].flatMap(status=>[
    `${number(`(${typeSql})='${type}' and cleanup_status='${status}'`)} as "type${index}${status}Count"`,
    `coalesce(sum(byte_size) filter(where (${typeSql})='${type}' and cleanup_status='${status}'),0)::text as "type${index}${status}Bytes"`]));
  const assets=exactRow((await c.query<Record<string,string>>(`select count(*)::text as "assets",coalesce(sum(byte_size),0)::text as "assetBytes",
    ${number("cleanup_status='active'")} as "activeAssets",${number("cleanup_status='deleting'")} as "deletingAssets",
    ${number("exists(select 1 from forum_post_attachments p where p.attachment_id=a.id)")} as "publishedAssets",
    ${number("exists(select 1 from forum_attachment_draft_refs r where r.attachment_id=a.id)")} as "draftAssets",
    ${number("exists(select 1 from forum_complaint_evidence_attachments e where e.attachment_id=a.id)")} as "evidenceAssets",
    ${number(`not (${referenced})`)} as "unreferencedAssets",${typeFields.join(',')},
    ${number("cleanup_status not in ('active','deleting') or byte_size<0 or (cleanup_status='deleting' and (cleanup_claim_token is null or cleanup_claimed_at is null))")} as "invalidRows"
    from forum_attachments a`)).rows[0]);
  if(assets.invalidRows!=="0")throw new Error("Invalid native file state");delete assets.invalidRows;
  const operations=exactRow((await c.query<Record<string,string|null>>(`with clock as(select $1::timestamptz at),operations as(
    select max(created_at) updated,count(*) n from forum_attachment_draft_refs group by owner_id,context_key,draft_id)
    select (select count(*)::text from forum_attachment_upload_objects) as "uploadJournal",
      (select count(*) filter(where reservation_etag is null and claim_token is null)::text from forum_attachment_upload_objects) as "uploadPreparing",
      (select count(*) filter(where reservation_etag is not null and claim_token is null)::text from forum_attachment_upload_objects) as "uploadReady",
      (select count(*) filter(where claim_token is not null)::text from forum_attachment_upload_objects) as "uploadClaimed",
      (select ${maxAge("created_at","true")} from forum_attachment_upload_objects cross join clock) as "oldestUploadAgeMs",
      count(*) filter(where updated>=clock.at-$2::double precision*interval '1 millisecond')::text as "draftOperationsActive",
      count(*) filter(where updated<clock.at-$2::double precision*interval '1 millisecond')::text as "draftOperationsStale",
      coalesce(sum(n) filter(where updated>=clock.at-$2::double precision*interval '1 millisecond'),0)::text as "draftRefsActive",
      coalesce(sum(n) filter(where updated<clock.at-$2::double precision*interval '1 millisecond'),0)::text as "draftRefsStale",
      (select count(*)::text from forum_attachment_draft_contexts) as "retainedDraftContexts",
      (select count(*)::text from forum_post_attachments) as "publicationReferences",
      (select count(*)::text from forum_complaint_evidence_attachments) as "evidenceReferences"
    from operations cross join clock`,[observedAt,ATTACHMENT_OPERATION_IDLE_MS])).rows[0],["oldestUploadAgeMs"]);
  const cleanup=exactRow((await c.query<Record<string,string|null>>(`with clock as(select $1::timestamptz at)
    select ${number("cleanup_status='deleting'")} as "cleanupClaims",
      ${number("cleanup_status='deleting' and cleanup_claimed_at>=clock.at-$2::double precision*interval '1 millisecond'")} as "cleanupClaimsLive",
      ${number("cleanup_status='deleting' and cleanup_claimed_at<clock.at-$2::double precision*interval '1 millisecond'")} as "cleanupClaimsExpired",
      ${number(`cleanup_status='active' and created_at<clock.at-$3::double precision*interval '1 millisecond' and not (${referenced})`)} as "eligibleUnreferenced",
      ${number(`cleanup_status='deleting' and (${referenced})`)} as "deletingReferenced",
      ${maxAge("cleanup_claimed_at","cleanup_status='deleting'")} as "oldestCleanupClaimAgeMs",
      (select count(*) filter(where created_at<clock.at-$3::double precision*interval '1 millisecond' and
        (claim_token is null or claimed_at<clock.at-$2::double precision*interval '1 millisecond'))::text from forum_attachment_upload_objects cross join clock) as "eligibleUploadJournal"
    from forum_attachments a cross join clock`,[observedAt,ATTACHMENT_CLEANUP_CLAIM_LEASE_MS,ATTACHMENT_CLEANUP_GRACE_MS])).rows[0],["oldestCleanupClaimAgeMs"]);
  const sweep=(await c.query<{cursorPresent:boolean;claimed:boolean;live:boolean;expired:boolean;age:string|null}>(`select cursor is not null as "cursorPresent",claim_token is not null claimed,
    claimed_at>=$1::timestamptz-$2::double precision*interval '1 millisecond' live,
    claimed_at<$1::timestamptz-$2::double precision*interval '1 millisecond' expired,
    greatest(0,floor(extract(epoch from ($1::timestamptz-claimed_at))*1000))::text age from forum_attachment_sweep where id='reservations-v2'`,[observedAt,ATTACHMENT_CLEANUP_CLAIM_LEASE_MS])).rows;
  if(sweep.length!==1||typeof sweep[0].cursorPresent!=="boolean"||typeof sweep[0].claimed!=="boolean"||sweep[0].claimed&&(!/^\d+$/.test(sweep[0].age??"")||typeof sweep[0].live!=="boolean"||typeof sweep[0].expired!=="boolean"))throw new Error("Invalid attachment sweep source");
  return {"files.assets":assets,"files.operations":{...operations,recordingBestEffort:true},"background.attachments":{...cleanup,
    sweepCursorPresent:sweep[0].cursorPresent,sweepClaimed:sweep[0].claimed,sweepClaimLive:sweep[0].claimed&&sweep[0].live,sweepClaimExpired:sweep[0].claimed&&sweep[0].expired,
    sweepClaimAgeMs:sweep[0].claimed?sweep[0].age:null,codeAvailable:true,schedulerWired:false,schedulerEnabled:false,recordingBestEffort:true}} satisfies Record<FileMonitorKey,FileValues>;
}

/** One indexed lookup per fixed slot within one SQL statement. No adapter invocation or new sample. */
export async function readRetainedStorageSamples(c:Pick<PoolClient,"query">,observedAt:string):Promise<RetainedStorageSample[]>{
  const rows=(await c.query<{scope:StorageSlot;id:string|null;at:string|null;age:string|null;value:StorageObservationValue|null;source:string|null;schema:number|null;quality:string|null}>(`select scopes.scope,o.id,
    to_char(o.observed_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') at,
    greatest(0,floor(extract(epoch from ($2::timestamptz-o.observed_at))*1000))::text age,o.value,o.source,o.schema_version as schema,o.quality
    from unnest($1::text[]) scopes(scope) left join lateral(select * from owner_monitor_observations
      where monitor_key='integrations.storage' and resource_scope=scopes.scope order by observed_at desc,id desc limit 1)o on true`,[STORAGE_SLOTS,observedAt])).rows;
  if(rows.length!==STORAGE_SLOTS.length||new Set(rows.map(r=>r.scope)).size!==STORAGE_SLOTS.length)throw new Error("Invalid storage slot result");
  return rows.map(row=>{
    if(!(STORAGE_SLOTS as readonly string[]).includes(row.scope))throw new Error("Invalid retained storage scope");
    if(row.id===null)return {scope:row.scope,sample:null};
    if(!/^[0-9a-f-]{36}$/i.test(row.id)||row.source!=="application"||row.schema!==1||row.quality!=="measured"||!row.value||!row.at||!Number.isFinite(Date.parse(row.at))||!/^\d+$/.test(row.age??""))throw new Error("Invalid retained storage sample");
    const candidate=checkedStorageCandidate(row.value);if(candidate.scope!==row.scope)throw new Error("Retained storage scope/value mismatch");
    return {scope:row.scope,sample:{id:row.id,observedAt:row.at,ageMs:row.age!,value:candidate.value}};
  });
}

export class PostgresOwnerFileMonitoring {
  constructor(private readonly pool:Pool,private readonly bucketBound:boolean){}
  private async read():Promise<OwnerFilesCurrent>{
    const c=await this.pool.connect();let begun=false;let observedAt:string;let values:Awaited<ReturnType<typeof readFileSource>>,storageSamples:RetainedStorageSample[];
    try{
      await c.query("begin isolation level repeatable read read only");begun=true;
      await c.query("set local statement_timeout='1500ms';set local lock_timeout='500ms'");
      observedAt=(await c.query<{at:string}>(`select to_char(transaction_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') at`)).rows[0].at;
      values=await readFileSource(c,observedAt);storageSamples=await readRetainedStorageSamples(c,observedAt);
      await c.query("commit");begun=false;
    }catch(error){if(begun)try{await c.query("rollback");}catch{/* Preserve source failure. */}throw error;}
    finally{c.release();}
    const monitors:FileCurrentMonitor[]=[];
    for(const key of FILE_MONITOR_KEYS){
      let recording:FileCurrentMonitor["recording"]="available",coverageFrom:string|null=null,lastObservedAt:string|null=null;
      try{await recordOwnerMonitorSnapshot(this.pool,key,values[key]);}catch{recording="unavailable";}
      try{
        const row=(await this.pool.query<{first:Date|null;last:Date|null}>(`select min(at) first,max(at) filter(where sampled) last from(
          select min(observed_at) at,true sampled from owner_monitor_observations where monitor_key=$1 and resource_scope='global'
          union all select max(observed_at),true from owner_monitor_observations where monitor_key=$1 and resource_scope='global'
          union all select min(occurred_at),false from owner_events where source='operation' and monitor_key=any($2::text[])
          ${key==='files.assets'?"union all select min(created_at),false from forum_attachment_security_events":""}
          ${key==='files.operations'?"union all select min(observed_at),false from owner_monitor_observations where monitor_key='integrations.storage' and resource_scope=any($3::text[])":""}) retained`,
        key==='files.operations'?[key,["files.assets","files.operations","background.attachments"],STORAGE_SLOTS]:[key,key==='files.assets'?["files.assets","files.operations"]:[key]])).rows[0];
        coverageFrom=row.first?.toISOString()??null;lastObservedAt=row.last?.toISOString()??null;
      }catch{recording="unavailable";}
      monitors.push({key,schemaVersion:1,source:"database",quality:"measured",observedAt,values:values[key],recording,coverageFrom,lastObservedAt});
    }
    return {monitors,storageSamples,bucketBound:this.bucketBound};
  }
  readCurrent(){return this.read();}
  async readCleanup(){return (await this.read()).monitors.find(m=>m.key==='background.attachments')!;}
}
