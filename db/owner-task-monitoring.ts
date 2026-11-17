import type {Pool} from "pg";
import {recordOwnerMonitorSnapshot} from "./owner-monitor-observations";

export interface OwnerTaskCurrent {
  monitorKey:"background.translation";schemaVersion:1;source:"database";quality:"measured";
  observedAt:string;values:Record<string,string|boolean|null>;
  recording:"available"|"unavailable";coverageFrom:string|null;lastObservedAt:string|null;
}
const count=(condition:string)=>`count(*) filter(where ${condition})::text`;
const age=(field:string,condition:string,minimum=false)=>
  `${minimum?"min":"max"}(greatest(0,floor(extract(epoch from (${minimum?field+"-clock.at":"clock.at-"+field}))*1000))) filter(where ${condition})::text`;
const fields={
  invalidSourceRows:count("status is null or status not in ('pending','processing','stale','completed','failed') or translation_kind is null or translation_kind not in ('ui','content-topic-title','content-post-body') or (status='processing' and (claim_token is null or claimed_at is null or lease_expires_at is null))"),
  ...Object.fromEntries(["pending","processing","stale","completed","failed"].map(s=>[s,count(`status='${s}'`)])),
  ...Object.fromEntries(["ui","content-topic-title","content-post-body"].map((k,i)=>["kind"+i,count(`translation_kind='${k}'`)])),
  pendingUnattempted:count("status='pending' and attempt_count=0"),pendingRetryReleased:count("status='pending' and attempt_count>0"),
  oldestPendingAgeMs:age("updated_at","status='pending'"),
  processingLive:count("status='processing' and lease_expires_at>clock.at"),
  processingExpired:count("status='processing' and lease_expires_at<=clock.at"),
  oldestClaimAgeMs:age("claimed_at","status='processing'"),
  oldestExpiredLeaseAgeMs:age("lease_expires_at","status='processing' and lease_expires_at<=clock.at"),
  withAttemptsRemaining:count("status='processing' and attempt_count<max_attempts"),
  atAttemptBudget:count("status='processing' and attempt_count>=max_attempts"),
  failedTerminal:count("status='failed' and failure_disposition='terminal'"),
  failedRetryExhausted:count("status='failed' and failure_disposition='retry-exhausted'"),
  failureGroupCount:"(count(distinct(failure_disposition,last_failure_code)) filter(where status='failed'))::text",
  ...Object.fromEntries(["leasing","admitted","deferred"].map(s=>["allowance"+s[0].toUpperCase()+s.slice(1),count(`allowance_state='${s}'`)])),
  deferredWaiting:count("allowance_state='deferred' and allowance_retry_not_before>clock.at"),
  deferredReady:count("allowance_state='deferred' and allowance_retry_not_before<=clock.at"),
  oldestDeferredAgeMs:age("allowance_updated_at","allowance_state='deferred'"),
  earliestRetryInMs:age("allowance_retry_not_before","allowance_state='deferred' and allowance_retry_not_before>clock.at",true),
  allowanceReasonGroupCount:"(count(distinct allowance_reason) filter(where allowance_state='deferred'))::text",
  reconciliationAttempted:count("reconciliation_attempted_at is not null"),
  agedPending60s:count("status='pending' and updated_at<=clock.at-interval '1 minute'"),
  reconciliationAttemptedAt:"to_char(max(reconciliation_attempted_at) at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"')",
};
const nullable=new Set(["oldestPendingAgeMs","oldestClaimAgeMs","oldestExpiredLeaseAgeMs","oldestDeferredAgeMs","earliestRetryInMs","reconciliationAttemptedAt"]);
const failureCodes=["provider-rate-limited","provider-temporary","provider-terminal","provider-unsupported","provider-output-invalid",
  "message-kind-unsupported","dependency-temporary","execution-bound-exceeded","attempt-budget-exhausted"];
const safeCodes=failureCodes.map(s=>"'"+s+"'").join(",");

/** Read-only facts from the existing task state machine; never invokes a task or a provider. */
export class PostgresOwnerTaskMonitoring {
  constructor(private readonly pool:Pool){}
  async readCurrent():Promise<OwnerTaskCurrent>{
    const c=await this.pool.connect();let begun=false;let observedAt:string;
    let values:Record<string,string|boolean|null>;
    try{
      await c.query("begin isolation level repeatable read read only");begun=true;
      await c.query("set local statement_timeout='1500ms';set local lock_timeout='500ms'");
      observedAt=(await c.query<{at:string}>(`select to_char(transaction_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') at`)).rows[0].at;
      values=await readTaskSource(c,observedAt);
      await c.query("commit");begun=false;
    }catch(error){if(begun)try{await c.query("rollback");}catch{/* Preserve source failure. */}throw error;}
    finally{c.release();}
    let recording:OwnerTaskCurrent["recording"]="available",coverageFrom:string|null=null,lastObservedAt:string|null=null;
    try{await recordOwnerMonitorSnapshot(this.pool,"background.translation",values!);}catch{recording="unavailable";}
    try{
      const row=(await this.pool.query<{first:Date|null;last:Date|null}>(`select min(at) first,max(at) filter(where sampled) last from(
        select min(occurred_at) at,false sampled from owner_events where source='operation' and monitor_key in ('background.translation','integrations.translation')
        union all select min(observed_at),true from owner_monitor_observations where monitor_key='background.translation' and resource_scope='global'
        union all select max(observed_at),true from owner_monitor_observations where monitor_key='background.translation' and resource_scope='global') facts`)).rows[0];
      coverageFrom=row.first?.toISOString()??null;lastObservedAt=row.last?.toISOString()??null;
    }catch{recording="unavailable";}
    return {monitorKey:"background.translation",schemaVersion:1,source:"database",quality:"measured",observedAt:observedAt!,values:values!,recording,coverageFrom,lastObservedAt};
  }
}

export async function readTaskSource(c:Pick<import("pg").PoolClient,"query">,observedAt:string){
      const row=(await c.query<Record<string,string|null>>(`with clock as(select $1::timestamptz at)
        select ${Object.entries(fields).map(([name,value])=>`${value} as "${name}"`).join(",")}
        from translation_tasks cross join clock`,[observedAt])).rows[0];
      if(!row||Object.keys(row).length!==Object.keys(fields).length)throw new Error("Missing task snapshot");
      for(const [name,value]of Object.entries(row)){
        if(value===null&&nullable.has(name))continue;
        if(name==="reconciliationAttemptedAt"&&typeof value==="string"&&Number.isFinite(new Date(value).getTime()))continue;
        if(typeof value!=="string"||!/^\d+$/.test(value))throw new Error("Invalid exact task aggregate");
      }
      if(row.invalidSourceRows!=="0")throw new Error("Invalid native task state");
      const {invalidSourceRows:verified,...current}=row;void verified;
      const values:Record<string,string|boolean|null>={...current,hooksImplemented:true,runtimeWired:false,runtimeEnabled:false,bestEffort:true};
      const failures=(await c.query<{code:string;disposition:string;count:string}>(`select
        case when last_failure_code in (${safeCodes}) then last_failure_code else 'other' end code,
        failure_disposition disposition,count(*)::text count from translation_tasks where status='failed'
        group by 1,2 order by count(*) desc,1,2 limit 20`)).rows;
      const reasons=(await c.query<{code:string;count:string}>(`select
        case when allowance_reason in ('allowance-unconfigured','provider-unconfigured') then allowance_reason else 'other' end code,
        count(*)::text count from translation_tasks where allowance_state='deferred'
        group by 1 order by count(*) desc,1 limit 20`)).rows;
      for(const [index,failure]of failures.entries()){
        if(![...failureCodes,"other"].includes(failure.code)||!["terminal","retry-exhausted"].includes(failure.disposition)||!/^\d+$/.test(failure.count))throw new Error("Invalid failure group");
        values[`failure${index}Code`]=failure.code;values[`failure${index}Disposition`]=failure.disposition;values[`failure${index}Count`]=failure.count;
      }
      for(const [index,reason]of reasons.entries()){
        if(!["allowance-unconfigured","provider-unconfigured","other"].includes(reason.code)||!/^\d+$/.test(reason.count))throw new Error("Invalid allowance group");
        values[`reason${index}Code`]=reason.code;values[`reason${index}Count`]=reason.count;
      }
      values.failureGroupsShown=String(failures.length);values.failureGroupsTruncated=BigInt(row.failureGroupCount!)>BigInt(failures.length);
      values.reasonGroupsShown=String(reasons.length);values.reasonGroupsTruncated=BigInt(row.allowanceReasonGroupCount!)>BigInt(reasons.length);
      values.unrecognizedCodesGrouped=true;
      if(new TextEncoder().encode(JSON.stringify(values)).length>8192)throw new Error("Oversized task snapshot");
  return values;
}
