import type {Client} from "pg";
import {drizzle} from "drizzle-orm/node-postgres";
import {createWebClient,bestEffortDiscardClient} from "./postgres-deadlines";
import {ComplaintStorageUnavailableError,isComplaintStorageUnavailable} from "./hyperdrive-complaints";
import {ComplaintsService} from "./complaints-service";
import {DrizzleComplaintsRepository} from "./complaints-repository";
import type {AuthorizationCapability} from "./authorization-service";
import type {ComplaintAppeal} from "../app/complaints/appeal-context";

export function createHyperdriveComplaintAppeal(connectionString:string,authorization:AuthorizationCapability,
 clientFactory:()=>Client=()=>createWebClient(connectionString)):ComplaintAppeal{
 async function run<T>(fn:(s:ComplaintsService)=>Promise<T>):Promise<T>{
  const client=clientFactory();
  try{
   await client.connect();
   return await fn(new ComplaintsService(new DrizzleComplaintsRepository(drizzle(client)),authorization));
  }catch(error){
   if(isComplaintStorageUnavailable(error))throw new ComplaintStorageUnavailableError("complaint Appeal unavailable",{cause:error});
   throw error;
  }finally{bestEffortDiscardClient(client);}
 }
 return {
  ownResult:(actor,caseId)=>run(s=>s.readOwnResult(actor,caseId)),
  submit:(actor,input)=>run(s=>s.appeal(actor,input)),
  pendingQueue:(actor,page)=>run(s=>s.readAppealQueue(actor,page)),
  review:(actor,caseId,appealId,pages)=>run(s=>s.readAppealCaseForReviewer(actor,caseId,appealId,pages)),
  resolve:(actor,input)=>run(s=>s.resolveAppeal(actor,input)),
  context:(actor,caseId,appealId,postId)=>run(s=>s.readAppealContext(actor,caseId,appealId,postId)),
  evidence:(actor,caseId,appealId,attachmentId)=>run(s=>s.readAppealEvidence(actor,caseId,appealId,attachmentId)),
 };
}
