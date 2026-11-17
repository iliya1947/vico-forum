import {createWebPool} from "./postgres-deadlines";
import {PostgresOwnerOperationalFactSink} from "./owner-operational-facts";
import {PostgresOwnerStorageObservations} from "./owner-storage-observations";
import type {OwnerOperationalFact,OwnerOperationalFactSink} from "../app/observability/operational-facts";
import {StorageObservationCollector,RequestRecordingBudget,createStorageAdmissionGate} from "../app/observability/storage-observations";

// Fixed13-entry isolate suppression only. All request candidates remain request-local.
const storageGate=createStorageAdmissionGate();
export function createHyperdriveOperationalRecording(connectionString:string){
  const budget=new RequestRecordingBudget(),pending:OwnerOperationalFact[]=[];
  let finalized=false,omitted=false;
  const sink:OwnerOperationalFactSink={async append(fact){if(finalized||!budget.admit()){omitted=true;return;}pending.push(fact);}};
  const storage=new StorageObservationCollector({async record(candidates){
    const pool=createWebPool(connectionString);
    try{await new PostgresOwnerStorageObservations(pool).record(candidates);}finally{await pool.end().catch(()=>undefined);}
  }},storageGate,budget);
  return {sink,storageCapture:storage.capture,async flush(){
    if(finalized)return;finalized=true;
    const facts=pending.splice(0),deadline=Date.now()+5000;
    if(facts.length){
      const pool=createWebPool(connectionString),writer=new PostgresOwnerOperationalFactSink(pool);
      try{for(const fact of facts){if(Date.now()>=deadline){omitted=true;break;}try{await writer.append(fact);}catch{omitted=true;}}}
      finally{await pool.end().catch(()=>undefined);}
    }
    await storage.flush();
    if(omitted)try{console.warn("owner-operational-recording-unavailable");}catch{/* No response veto. */}
  }};
}
