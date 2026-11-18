/** Closed sampled RPC outcomes. These are neither all calls nor domain publication facts. */
export const STORAGE_SLOTS=["storage:reserve:returned","storage:reserve:declined","storage:reserve:threw",
  "storage:put:returned","storage:put:declined","storage:put:threw","storage:get:returned","storage:get:declined","storage:get:threw",
  "storage:delete:returned","storage:delete:threw","storage:listReservations:returned","storage:listReservations:threw"] as const;
export type StorageSlot=typeof STORAGE_SLOTS[number];
export type StorageOperation="reserve"|"put"|"get"|"delete"|"listReservations";
export type StorageResultClass="returned"|"declined"|"threw";
const categories={
  "storage:reserve:returned":["reservation-returned"],"storage:reserve:declined":["reservation-declined"],"storage:reserve:threw":["reservation-error"],
  "storage:put:returned":["write-settled"],"storage:put:declined":["conditional-rejection"],"storage:put:threw":["settled-call-error","outcome-unknown"],
  "storage:get:returned":["object-returned"],"storage:get:declined":["not-found"],"storage:get:threw":["get-error"],
  "storage:delete:returned":["acknowledged"],"storage:delete:threw":["acknowledgement-unknown"],
  "storage:listReservations:returned":["page-returned"],"storage:listReservations:threw":["list-error"],
} as const;
export type StorageCategory=(typeof categories)[StorageSlot][number];
export type StoragePhase="rpc-return"|"rpc-error"|"write-settled"|"write-unknown";
export interface StorageObservationValue {
  operation:StorageOperation;resultClass:StorageResultClass;category:StorageCategory;phase:StoragePhase;
  callReturnedAt:string;durationMs:number;
}
export interface StorageObservationCandidate {scope:StorageSlot;value:StorageObservationValue}
export interface StorageObservationRecorder {record(candidates:readonly StorageObservationCandidate[]):Promise<void>}
export type StorageObservationCapture=(value:StorageObservationValue)=>void;
export const STORAGE_SAMPLE_INTERVAL_MS=15*60_000;
export class RequestRecordingBudget {
  private remaining=32;
  admit(){if(this.remaining===0)return false;this.remaining--;return true;}
}
/** Exactly13 local entries; only durable PostgreSQL admission establishes a retained sample. */
export function createStorageAdmissionGate():Record<StorageSlot,number>{
  return Object.fromEntries(STORAGE_SLOTS.map(slot=>[slot,0])) as Record<StorageSlot,number>;
}
export function checkedStorageCandidate(value:StorageObservationValue):StorageObservationCandidate{
  if(!value||typeof value!=="object"||Object.keys(value).sort().join(",")!=="callReturnedAt,category,durationMs,operation,phase,resultClass")throw new Error("Invalid storage sample fields");
  const scope=`storage:${value.operation}:${value.resultClass}` as StorageSlot;
  const expectedPhase=value.operation==="put"?(value.category==="outcome-unknown"?"write-unknown":"write-settled"):
    value.resultClass==="threw"?"rpc-error":"rpc-return";
  if(!(STORAGE_SLOTS as readonly string[]).includes(scope)||!(categories[scope] as readonly string[]).includes(value.category)||
    value.phase!==expectedPhase||
    !Number.isFinite(value.durationMs)||value.durationMs<0||value.durationMs>60000||
    typeof value.callReturnedAt!=="string"||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value.callReturnedAt)||
    !Number.isFinite(Date.parse(value.callReturnedAt))||new Date(value.callReturnedAt).toISOString()!==value.callReturnedAt)throw new Error("Invalid storage sample value");
  return {scope,value:{...value}};
}
export function captureStorageObservation(capture:StorageObservationCapture|undefined,operation:StorageOperation,
  resultClass:StorageResultClass,category:StorageCategory,phase:StoragePhase,started:number){
  if(!capture)return;
  try{capture({operation,resultClass,category,phase,callReturnedAt:new Date().toISOString(),durationMs:Math.max(0,Math.min(60000,Math.round(performance.now()-started)))});}
  catch{/* Passive capture must preserve the actual adapter result/exception. */}
}
export class StorageObservationCollector {
  private readonly candidates=new Map<StorageSlot,StorageObservationCandidate>();
  private finalized=false;
  constructor(private readonly recorder:StorageObservationRecorder,private readonly gate=createStorageAdmissionGate(),
    private readonly budget=new RequestRecordingBudget(),private readonly clock:()=>number=Date.now){}
  readonly capture:StorageObservationCapture=value=>{
    if(this.finalized)return;
    const candidate=checkedStorageCandidate(value),now=this.clock();
    if(this.candidates.has(candidate.scope)||this.gate[candidate.scope]>now||!this.budget.admit())return;
    this.candidates.set(candidate.scope,candidate);
    // Bound simultaneous local attempts too; completion extends the gate only after authoritative admission.
    this.gate[candidate.scope]=now+60000;
  };
  async flush(){
    if(this.finalized)return;this.finalized=true;
    const candidates=[...this.candidates.values()];this.candidates.clear();if(!candidates.length)return;
    try{
      await this.recorder.record(candidates);
      for(const c of candidates)this.gate[c.scope]=this.clock()+STORAGE_SAMPLE_INTERVAL_MS;
    }catch{
      for(const c of candidates)this.gate[c.scope]=this.clock()+60000;
      try{console.warn("owner-storage-recording-unavailable");}catch{/* No recursive telemetry. */}
    }
  }
}
