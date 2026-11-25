/** Passive operational evidence. Never carries source text, requester HMACs or raw capabilities. */
export const TASK_TRANSITION_KINDS = ["task.planned","task.claimed","task.allowanceAdmitted",
  "task.allowanceDeferred","task.retryReleased","task.failed","task.stale","task.completed"] as const;
export type TaskTransitionKind = typeof TASK_TRANSITION_KINDS[number];
export const FILE_TRANSITION_KINDS=["file.accepted","file.published","file.unpublished","file.referencesChanged","file.cleanupPass"] as const;
export type FileTransitionKind=typeof FILE_TRANSITION_KINDS[number];
export type OperationalKind = TaskTransitionKind | "task.reconciliationPass" | "integration.translationCall" | "integration.authMailOutcome" | FileTransitionKind;
export const VERIFICATION_MAIL_TRANSPORTS = ["none", "unknown", "fake", "resend", "brevo"] as const;
export const VERIFICATION_MAIL_OUTCOMES = ["accepted", "rejected", "unavailable", "uncertain", "disabled"] as const;
export type VerificationMailObservation = {
  mailPurpose: "email-verification";
  mailTransport: typeof VERIFICATION_MAIL_TRANSPORTS[number];
  mailOutcome: typeof VERIFICATION_MAIL_OUTCOMES[number];
};
export type OperationalScalar = string | number | boolean | null;
export interface OwnerOperationalFact {
  kind: OperationalKind; sourceId: string; occurredAt: string; occurrenceDigest: string;
  actorUserId: string | null; values: Record<string, OperationalScalar>;
}
export interface OwnerOperationalFactSink { append(fact: OwnerOperationalFact): Promise<void> }
export interface OperationalTaskRow {
  id: string; translationKind: string; generation: number; attemptCount: number; maxAttempts: number;
  operationAt: string;
  lastFailureCode?: string|null; failureDisposition?: string|null;
}
type Pending = Omit<OwnerOperationalFact,"occurrenceDigest"> & { identity: readonly (string|number)[] };
export const MAX_OPERATIONAL_FACTS = 32;

/** Scoped to an actual store operation/job pass. Capture performs no I/O under domain locks. */
export class OperationalFactBuffer {
  private pending: Pending[] = [];
  private missed = 0;
  private finalized = false;
  constructor(private readonly sink?: OwnerOperationalFactSink) {}
  get recording(): "unwired"|"available"|"unavailable" {
    return !this.sink?"unwired":this.missed?"unavailable":"available";
  }
  captureTask(kind:TaskTransitionKind,row:OperationalTaskRow,ownership="",actorUserId:string|null=null,
    extra:{attemptStarted?:boolean}={}) {
    // An omitted sink is explicitly unwired, never a claim of full runtime coverage.
    if(!this.sink)return;
    this.capture({kind,sourceId:row.id,occurredAt:row.operationAt,actorUserId,
      identity:[kind,row.id,row.generation,row.attemptCount,row.operationAt,ownership],
      values:{schemaVersion:1,taskKind:row.translationKind,generation:row.generation,
        attemptCount:row.attemptCount,maxAttempts:row.maxAttempts,
        ...(kind==="task.failed"||kind==="task.retryReleased"?{
          failureCode:row.lastFailureCode??null,failureDisposition:row.failureDisposition??null}:{}),...extra}});
  }
  capturePass(sourceId:string,occurredAt:string,values:{selected:number;enqueued:number;
    enqueueFailures:number;pending:number;expiredProcessing:number;outcome:"complete"|"partial-failure"}) {
    this.capture({kind:"task.reconciliationPass",sourceId,occurredAt,actorUserId:null,
      identity:["task.reconciliationPass",sourceId],values:{schemaVersion:1,...values}});
  }
  captureCall(sourceId:string,occurredAt:string,identity:readonly(string|number)[],values:{
    taskKind:string;generation:number;attemptCount:number;calls:number;succeeded:number;failed:number;durationMs:number;
  }) {
    this.capture({kind:"integration.translationCall",sourceId,occurredAt,actorUserId:null,
      identity:["integration.translationCall",...identity],values:{schemaVersion:1,...values}});
  }
  captureFileAccepted(row:{id:string;ownerId:string;detectedType:string;byteSize:number;operationAt:string}){
    const known=["png","jpeg","gif","webp","pdf","zip","7z","gzip","tar","ole","text","executable","unknown"];
    this.capture({kind:"file.accepted",sourceId:row.id,occurredAt:row.operationAt,actorUserId:row.ownerId,
      identity:["file.accepted",row.id,row.operationAt],values:{schemaVersion:1,detectedType:known.includes(row.detectedType)?row.detectedType:"other",byteSize:row.byteSize}});
  }
  captureFileReferences(postId:string,actorUserId:string,changes:{added:FileReferenceTransition[];removed:FileReferenceTransition[]}){
    if(!this.sink)return;
    const total=changes.added.length+changes.removed.length;if(!total)return;
    // At most19 detail facts leave room for all13 storage slots in an ordinary request.
    if(total>19||this.pending.length+total>MAX_OPERATIONAL_FACTS){
      const runId=crypto.randomUUID(),occurredAt=[...changes.added,...changes.removed].map(r=>r.operationAt).sort().at(-1)!;
      this.capture({kind:"file.referencesChanged",sourceId:runId,occurredAt,actorUserId,
        identity:["file.referencesChanged",runId],values:{schemaVersion:1,postId,addedCount:changes.added.length,removedCount:changes.removed.length,perFileDetailsComplete:false}});return;
    }
    for(const [rows,kind]of [[changes.added,"file.published"],[changes.removed,"file.unpublished"]] as const)for(const row of rows)
      this.capture({kind,sourceId:row.attachmentId,occurredAt:row.operationAt,actorUserId,
        identity:[kind,postId,row.attachmentId,row.referenceCreatedAt,row.operationAt],
        values:{schemaVersion:1,postId,attachmentId:row.attachmentId,referenceCreatedAt:row.referenceCreatedAt,perFileDetailsComplete:true}});
  }
  captureCleanup(sourceId:string,occurredAt:string,values:CleanupPassValues){
    this.capture({kind:"file.cleanupPass",sourceId,occurredAt,actorUserId:null,
      identity:["file.cleanupPass",sourceId],values:{schemaVersion:1,...values}});
  }
  captureVerificationMail(sourceId:string,occurredAt:string,values:VerificationMailObservation) {
    this.capture({kind:"integration.authMailOutcome",sourceId,occurredAt,actorUserId:null,
      identity:["integration.authMailOutcome",sourceId],values:{schemaVersion:1,
        mailPurpose:values.mailPurpose,mailTransport:values.mailTransport,mailOutcome:values.mailOutcome}});
  }
  private capture(fact:Pending) {
    if(!this.sink)return;
    if(this.finalized||this.pending.length>=MAX_OPERATIONAL_FACTS){this.missed++;return;}
    this.pending.push(fact);
  }
  async flush():Promise<void> {
    if(this.finalized)return;
    this.finalized=true;
    const pending=this.pending;this.pending=[];
    const deadline=Date.now()+5000;
    for(let index=0;index<pending.length;index++)try{
      if(Date.now()>=deadline){this.missed+=pending.length-index;break;}
      const fact=pending[index];
      const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(fact.identity)));
      const occurrenceDigest=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
      const {identity:discarded,...safe}=fact;void discarded;
      await this.sink!.append({...safe,occurrenceDigest});
    }catch{this.missed++;} // No retry after an ambiguous append, and no telemetry about telemetry.
    if(this.missed)try{console.warn("owner-operational-recording-unavailable");}catch{/* Reporting cannot veto the domain result. */}
  }
}
export interface FileReferenceTransition {attachmentId:string;referenceCreatedAt:string;operationAt:string}
export interface CleanupPassValues {
  prunedRefs:number;assetClaimed:number;assetDeleted:number;assetFailed:number;
  journalClaimed:number;journalDeleteAcknowledged:number;journalDeletedRows:number;journalRetiredRegistered:number;journalFailed:number;
  markerClaimed:number;markerDeleteAcknowledged:number;markerFailed:number;partialCounts:boolean;
  stoppedPhase:"prune"|"journal"|"assets"|"markers"|"complete";
}

/** Counts only adapter invocations admitted by the actual provider router. */
export class OperationalProviderCalls {
  private task:{id:string;translationKind:string;generation:number;attemptCount:number;claimToken:string}|undefined;
  private calls=0;private succeeded=0;private failed=0;private durationMs=0;
  private returnedAt="";
  private readonly executionId=crypto.randomUUID();
  constructor(private readonly sink?:OwnerOperationalFactSink){}
  configure(task:NonNullable<OperationalProviderCalls["task"]>){this.task={id:task.id,
    translationKind:task.translationKind,generation:task.generation,attemptCount:task.attemptCount,claimToken:task.claimToken};}
  readonly observe=async<T>(work:()=>Promise<T>):Promise<T>=>{
    const start=performance.now();this.calls++;
    try{const result=await work();this.succeeded++;return result;}
    catch(error){this.failed++;throw error;}
    finally{this.durationMs+=Math.max(0,Math.round(performance.now()-start));
      this.returnedAt=new Date().toISOString().replace("Z","000Z");}
  };
  async flush(){
    if(!this.calls||!this.task||!this.sink)return;
    const task=this.task,facts=new OperationalFactBuffer(this.sink);
    facts.captureCall(task.id,this.returnedAt,[task.id,task.generation,task.attemptCount,task.claimToken,this.executionId],
      {taskKind:task.translationKind,generation:task.generation,attemptCount:task.attemptCount,
        calls:this.calls,succeeded:this.succeeded,failed:this.failed,durationMs:this.durationMs});
    await facts.flush();
  }
}

/** Only a resolved outer transaction/autocommit result may release evidence to its sink. */
export async function withOperationalFacts<T>(sink:OwnerOperationalFactSink|undefined,
  work:(facts:OperationalFactBuffer)=>Promise<T>):Promise<T>{
  const facts=new OperationalFactBuffer(sink);
  const result=await work(facts);
  await facts.flush();
  return result;
}

export async function withProviderCallEvidence<T>(sink:OwnerOperationalFactSink|undefined,
  work:(calls:OperationalProviderCalls)=>Promise<T>):Promise<T>{
  const calls=new OperationalProviderCalls(sink);
  try{return await work(calls);}finally{await calls.flush();}
}
