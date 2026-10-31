import { PostgresAdminForumReader, type AdminForumReader } from "./admin-forum";
import {createWebPool,bestEffortDiscardClient,isPostgresConnectionTimeout,isPostgresQueryTimeout} from "./postgres-deadlines";
import {isPostgresAvailabilityFailure} from "../app/localization/persistent-registry";
export class AdminForumUnavailableError extends Error {}
export function createHyperdriveAdminForum(connectionString:string):AdminForumReader {
  async function read<T>(operation:(reader:PostgresAdminForumReader)=>Promise<T>) {
    const pool=createWebPool(connectionString);
    try{return await operation(new PostgresAdminForumReader(pool));}
    catch(error){
      if(isPostgresAvailabilityFailure(error)||isPostgresConnectionTimeout(error)||isPostgresQueryTimeout(error))throw new AdminForumUnavailableError("Forum administration unavailable",{cause:error});
      throw error;
    }finally{bestEffortDiscardClient(pool);}
  }
  return {listCategories:query=>read(r=>r.listCategories(query)),readCategory:(id,query)=>read(r=>r.readCategory(id,query)),readSection:id=>read(r=>r.readSection(id))};
}
