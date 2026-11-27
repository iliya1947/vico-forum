import type { AuthorizationCapability } from "./authorization-service";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import { createWebPool, bestEffortDiscardClient, isPostgresConnectionTimeout, isPostgresQueryTimeout } from "./postgres-deadlines";
import { PostgresForumStructureReader, type ForumStructureReader } from "./forum-structure-reader";
export class StructureReadUnavailableError extends Error {}
export function createHyperdriveForumStructureReader(connectionString:string,authorization:AuthorizationCapability,ownerUserId?:string):ForumStructureReader {
  async function read<T>(operation:(reader:ForumStructureReader)=>Promise<T>) {
    const pool=createWebPool(connectionString);
    try { return await operation(new PostgresForumStructureReader(pool,authorization,ownerUserId)); }
    catch(error) {
      if(isPostgresAvailabilityFailure(error)||isPostgresConnectionTimeout(error)||isPostgresQueryTimeout(error))
        throw new StructureReadUnavailableError("Structure read unavailable",{cause:error});
      throw error;
    } finally { bestEffortDiscardClient(pool); }
  }
  return {readMoveContext:(actor,id)=>read(r=>r.readMoveContext(actor,id)),listDestinations:(actor,query)=>read(r=>r.listDestinations(actor,query))};
}
