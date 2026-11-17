/** Passive operational evidence. Never carries source text, requester HMACs or raw capabilities. */
export const TASK_TRANSITION_KINDS = ["task.planned","task.claimed","task.allowanceAdmitted",
  "task.allowanceDeferred","task.retryReleased","task.failed","task.stale","task.completed"] as const;
export type TaskTransitionKind = typeof TASK_TRANSITION_KINDS[number];
export type OperationalKind = TaskTransitionKind | "task.reconciliationPass" | "integration.translationCall";
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
