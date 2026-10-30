import type { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { createWebClient, bestEffortDiscardClient } from "./postgres-deadlines";
import { ComplaintsService } from "./complaints-service";
import { DrizzleComplaintsRepository } from "./complaints-repository";
import { ComplaintStorageUnavailableError, isComplaintStorageUnavailable } from "./hyperdrive-complaints";
import type { AuthorizationCapability } from "./authorization-service";
import type { ComplaintQueue } from "../app/complaints/queue-context";

export function createHyperdriveComplaintQueue(connectionString: string, authorization: AuthorizationCapability,
  clientFactory: () => Client = () => createWebClient(connectionString)): ComplaintQueue {
  async function run<T>(operation: (service: ComplaintsService) => Promise<T>): Promise<T> {
    const client=clientFactory();
    try {
      await client.connect();
      return await operation(new ComplaintsService(new DrizzleComplaintsRepository(drizzle(client)),authorization));
    } catch(error) {
      if(isComplaintStorageUnavailable(error))throw new ComplaintStorageUnavailableError("complaint queue unavailable",{cause:error});
      throw error;
    } finally {bestEffortDiscardClient(client);}
  }
  return {
    readPrioritySettings:actor=>run(s=>s.readPrioritySettings(actor)),
    savePrioritySettings:(actor,input)=>run(s=>s.savePrioritySettings(actor,input)),
    readQueue:(actor,page)=>run(s=>s.readQueue(actor,page)),
    readTriage:(actor,id)=>run(s=>s.readTriage(actor,id)),
    changePriority:(actor,input)=>run(s=>s.changePriority(actor,input)),
    activity:(actor,id,active)=>run(s=>s.activity(actor,id,active)),
  };
}
