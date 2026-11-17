import type { Pool } from "pg";
import { getTableColumns,sql } from "drizzle-orm";
import { translationTasks } from "./schema";
import { TASK_TRANSITION_KINDS,type OwnerOperationalFact,type OwnerOperationalFactSink } from "../app/observability/operational-facts";

/** Exact RETURNING time retains microseconds even when ordinary Drizzle Dates use milliseconds. */
export const operationalTaskColumns={...getTableColumns(translationTasks),
  operationAt:sql<string>`to_char(${translationTasks.updatedAt} at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`};
const fields=new Set(["schemaVersion","taskKind","generation","attemptCount","maxAttempts","attemptStarted",
  "selected","enqueued","enqueueFailures","pending","expiredProcessing","outcome","calls","succeeded","failed","durationMs",
  "failureCode","failureDisposition"]);
const taskKinds=["ui","content-topic-title","content-post-body"];
const failureCodes=["provider-rate-limited","provider-temporary","provider-terminal","provider-unsupported",
  "provider-output-invalid","message-kind-unsupported","dependency-temporary","execution-bound-exceeded","attempt-budget-exhausted"];

/** Same append ordering and identity dedup as the Owner journal, on a separate short transaction. */
export class PostgresOwnerOperationalFactSink implements OwnerOperationalFactSink {
  constructor(private readonly pool:Pick<Pool,"connect">){}
  async append(fact:OwnerOperationalFact):Promise<void>{
    if(![...TASK_TRANSITION_KINDS,"task.reconciliationPass","integration.translationCall"].includes(fact.kind)
      ||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(fact.occurredAt)
      ||!Number.isFinite(new Date(fact.occurredAt).getTime())||!/^[a-f0-9]{64}$/.test(fact.occurrenceDigest)
      ||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fact.sourceId)
      ||fact.actorUserId!==null&&!/^[A-Za-z0-9._:-]{1,200}$/.test(fact.actorUserId))throw new Error("Invalid operational fact identity");
    for(const [name,value]of Object.entries(fact.values)){
      if(!fields.has(name)||value!==null&&!["string","number","boolean"].includes(typeof value)
        ||typeof value==="number"&&(!Number.isSafeInteger(value)||value<0)
        ||typeof value==="string"&&!(name==="taskKind"?taskKinds:name==="failureCode"?failureCodes:
          name==="failureDisposition"?["terminal","retry-exhausted"]:name==="outcome"?["complete","partial-failure"]:[]).includes(value))
        throw new Error("Invalid operational fact field");
    }
    if(fact.values.schemaVersion!==1)throw new Error("Invalid operational fact version");
    // The existing journal stores milliseconds. Retain the original source
    // clock in the safe payload and identity without changing that schema.
    const payload=JSON.stringify({...fact.values,sourceTransitionAt:fact.occurredAt});
    if(new TextEncoder().encode(payload).length>8192)throw new Error("Oversized operational fact");
    const monitor=fact.kind==="integration.translationCall"?"integrations.translation":"background.translation";
    const entityType=fact.kind==="task.reconciliationPass"?"translation-pass":"translation-task";
    const c=await this.pool.connect();let begun=false,committing=false,discard=false;
    try{
      await c.query("begin");begun=true;
      await c.query("set local transaction_timeout='3000ms';set local statement_timeout='1500ms';set local lock_timeout='500ms'");
      await c.query("select pg_advisory_xact_lock(1447641935,2)");
      const key="sa07:"+fact.occurrenceDigest;
      const saved=await c.query(`insert into owner_events(id,occurred_at,source,occurrence_key,kind,monitor_key,
        entity_type,entity_id,actor_user_id,payload) values($1,$2::timestamptz,'operation',$3,$4,$5,$9,$6,$7,$8::jsonb)
        on conflict(source,occurrence_key) do nothing returning id`,
      [crypto.randomUUID(),fact.occurredAt,key,fact.kind,monitor,fact.sourceId,fact.actorUserId,payload,entityType]);
      if(!saved.rows[0]){
        const previous=await c.query<{matches:boolean}>(`select kind=$2 and monitor_key=$3 and entity_id=$4
          and actor_user_id is not distinct from $5::text and payload=$6::jsonb and occurred_at=$7::timestamptz(3) and entity_type=$8 matches
          from owner_events where source='operation' and occurrence_key=$1`,
        [key,fact.kind,monitor,fact.sourceId,fact.actorUserId,payload,fact.occurredAt,entityType]);
        if(!previous.rows[0]?.matches)throw new Error("Operational occurrence identity mismatch");
      }
      committing=true;await c.query("commit");committing=false;
    }catch(error){
      if(committing)discard=true;
      else if(begun)try{await c.query("rollback");}catch{discard=true;}
      throw error;
    }finally{c.release(discard);}
  }
}
