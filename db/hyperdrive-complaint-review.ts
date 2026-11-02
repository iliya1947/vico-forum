import type {Client} from "pg";
import {drizzle} from "drizzle-orm/node-postgres";
import {createWebClient,bestEffortDiscardClient} from "./postgres-deadlines";
import {ComplaintsService} from "./complaints-service";
import {DrizzleComplaintsRepository} from "./complaints-repository";
import {ComplaintStorageUnavailableError,isComplaintStorageUnavailable} from "./hyperdrive-complaints";
import type {AuthorizationCapability} from "./authorization-service";
import type {ComplaintReview} from "../app/complaints/review-context";

export function createHyperdriveComplaintReview(connectionString:string, authorization:AuthorizationCapability,
 clientFactory:()=>Client=()=>createWebClient(connectionString)):ComplaintReview {
 async function run<T>(fn:(s:ComplaintsService)=>Promise<T>):Promise<T> {
   const client=clientFactory();
   try {
     await client.connect();
     return await fn(new ComplaintsService(new DrizzleComplaintsRepository(drizzle(client)),authorization));
   } catch(error) {
     if(isComplaintStorageUnavailable(error))throw new ComplaintStorageUnavailableError("complaint review unavailable",{cause:error});
     throw error;
   } finally {bestEffortDiscardClient(client);}
 }
 return {
   read:(actor,id,pages)=>run(s=>s.readReview(actor,id,pages)),
   context:(actor,id,postId)=>run(s=>s.readReviewContext(actor,id,postId)),
   evidence:(actor,id,attachmentId)=>run(s=>s.readReviewEvidence(actor,id,attachmentId)),
   ownResult:(actor,caseId)=>run(s=>s.readOwnResult(actor,caseId)),
   addNote:(actor,input)=>run(s=>s.addNote(actor,input)),
   decide:(actor,input)=>run(s=>s.decide(actor,input)),
 };
}
