import type { Pool } from "pg";
import { getTableColumns,sql } from "drizzle-orm";
import { translationTasks } from "./schema";
import { TASK_TRANSITION_KINDS,FILE_TRANSITION_KINDS,VERIFICATION_MAIL_TRANSPORTS,VERIFICATION_MAIL_OUTCOMES,type OwnerOperationalFact,type OwnerOperationalFactSink } from "../app/observability/operational-facts";

/** Exact RETURNING time retains microseconds even when ordinary Drizzle Dates use milliseconds. */
export const operationalTaskColumns={...getTableColumns(translationTasks),
  operationAt:sql<string>`to_char(${translationTasks.updatedAt} at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`};
const fields=new Set(["schemaVersion","taskKind","generation","attemptCount","maxAttempts","attemptStarted",
  "selected","enqueued","enqueueFailures","pending","expiredProcessing","outcome","calls","succeeded","failed","durationMs",
  "failureCode","failureDisposition","detectedType","byteSize","postId","attachmentId","referenceCreatedAt","addedCount","removedCount","perFileDetailsComplete",
  "prunedRefs","assetClaimed","assetDeleted","assetFailed","journalClaimed","journalDeleteAcknowledged","journalDeletedRows","journalRetiredRegistered","journalFailed",
  "markerClaimed","markerDeleteAcknowledged","markerFailed","partialCounts","stoppedPhase","mailPurpose","mailTransport","mailOutcome"]);
const taskKinds=["ui","content-topic-title","content-post-body"];
const failureCodes=["provider-rate-limited","provider-temporary","provider-terminal","provider-unsupported",
  "provider-output-invalid","message-kind-unsupported","dependency-temporary","execution-bound-exceeded","attempt-budget-exhausted"];

/** Same append ordering and identity dedup as the Owner journal, on a separate short transaction. */
export class PostgresOwnerOperationalFactSink implements OwnerOperationalFactSink {
  constructor(private readonly pool:Pick<Pool,"connect">){}
  async append(fact:OwnerOperationalFact):Promise<void>{
    if(![...TASK_TRANSITION_KINDS,...FILE_TRANSITION_KINDS,"task.reconciliationPass","integration.translationCall","integration.authMailOutcome"].includes(fact.kind)
      ||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(fact.occurredAt)
      ||!Number.isFinite(new Date(fact.occurredAt).getTime())||!/^[a-f0-9]{64}$/.test(fact.occurrenceDigest)
      ||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fact.sourceId)
      ||fact.actorUserId!==null&&!/^[A-Za-z0-9._:-]{1,200}$/.test(fact.actorUserId))throw new Error("Invalid operational fact identity");
    for(const [name,value]of Object.entries(fact.values)){
      if(!fields.has(name)||value!==null&&!["string","number","boolean"].includes(typeof value)
        ||typeof value==="number"&&(!Number.isSafeInteger(value)||value<0)
        ||typeof value==="string"&&!validStringField(name,value))
        throw new Error("Invalid operational fact field");
    }
    if(fact.values.schemaVersion!==1)throw new Error("Invalid operational fact version");
    const mailFields=["mailPurpose","mailTransport","mailOutcome"];
    if(fact.kind==="integration.authMailOutcome"){
      if(fact.actorUserId!==null||Object.keys(fact.values).sort().join(",")!=="mailOutcome,mailPurpose,mailTransport,schemaVersion"
        ||fact.values.mailPurpose!=="email-verification"
        ||!(VERIFICATION_MAIL_TRANSPORTS as readonly unknown[]).includes(fact.values.mailTransport)
        ||!(VERIFICATION_MAIL_OUTCOMES as readonly unknown[]).includes(fact.values.mailOutcome))
        throw new Error("Invalid verification mail observation");
    }else if(mailFields.some(name=>Object.prototype.hasOwnProperty.call(fact.values,name)))
      throw new Error("Unexpected verification mail observation field");
    // The existing journal stores milliseconds. Retain the original source
    // clock in the safe payload and identity without changing that schema.
    const payload=JSON.stringify({...fact.values,sourceTransitionAt:fact.occurredAt});
    if(new TextEncoder().encode(payload).length>8192)throw new Error("Oversized operational fact");
    const monitor=fact.kind==="integration.authMailOutcome"?"integrations.authentication":fact.kind==="integration.translationCall"?"integrations.translation":fact.kind==="file.accepted"?"files.assets":fact.kind==="file.cleanupPass"?"background.attachments":fact.kind.startsWith("file.")?"files.operations":"background.translation";
    const entityType=fact.kind==="integration.authMailOutcome"?"auth-mail-operation":fact.kind==="task.reconciliationPass"?"translation-pass":fact.kind==="file.cleanupPass"?"attachment-cleanup-pass":fact.kind==="file.referencesChanged"?"attachment-reference-operation":fact.kind.startsWith("file.")?"attachment":"translation-task";
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
function isSafeForumId(value:string){return value.length>0&&value.length<=200&&value===value.trim()&&![...value].some(char=>char.charCodeAt(0)<32||char.charCodeAt(0)===127);}

function validStringField(name:string,value:string):boolean{
  if(name==="postId")return isSafeForumId(value);
  if(name==="attachmentId")return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  if(name==="referenceCreatedAt")return /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(value)&&Number.isFinite(Date.parse(value));
  const allowed:Record<string,readonly string[]>={taskKind:taskKinds,failureCode:failureCodes,
    mailPurpose:["email-verification"],mailTransport:VERIFICATION_MAIL_TRANSPORTS,mailOutcome:VERIFICATION_MAIL_OUTCOMES,
    detectedType:["png","jpeg","gif","webp","pdf","zip","7z","gzip","tar","ole","text","executable","unknown","other"],
    stoppedPhase:["prune","journal","assets","markers","complete"],failureDisposition:["terminal","retry-exhausted"],outcome:["complete","partial-failure"]};
  return allowed[name]?.includes(value)??false;
}
