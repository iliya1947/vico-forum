import type {AuthorizationCapability} from "./authorization-service";
import {isPostgresAvailabilityFailure} from "../app/localization/persistent-registry";
import {createWebPool,bestEffortDiscardClient,isPostgresConnectionTimeout,isPostgresQueryTimeout} from "./postgres-deadlines";
import {PostgresStructureWriter,type StructureWriter} from "./forum-structure";

export class StructureWriteUnavailableError extends Error {}

export function createHyperdriveForumStructureWriter(
  connectionString:string,authorization:AuthorizationCapability,ownerUserId?:string,
):StructureWriter {
  async function write<T>(operation:(writer:StructureWriter)=>Promise<T>):Promise<T>{
    const pool=createWebPool(connectionString);
    try{return await operation(new PostgresStructureWriter(pool,authorization,ownerUserId));}
    catch(error){
      if(isPostgresAvailabilityFailure(error)||isPostgresConnectionTimeout(error)||isPostgresQueryTimeout(error))
        throw new StructureWriteUnavailableError("Structure write unavailable",{cause:error});
      throw error;
    }finally{bestEffortDiscardClient(pool);}
  }
  return {
    createCategory:(actor,input)=>write(w=>w.createCategory(actor,input)),
    renameCategory:(actor,id,input)=>write(w=>w.renameCategory(actor,id,input)),
    reorderCategory:(actor,id,input)=>write(w=>w.reorderCategory(actor,id,input)),
    createSection:(actor,id,input)=>write(w=>w.createSection(actor,id,input)),
    renameSection:(actor,id,input)=>write(w=>w.renameSection(actor,id,input)),
    reorderSection:(actor,id,input)=>write(w=>w.reorderSection(actor,id,input)),
    moveSection:(actor,id,input)=>write(w=>w.moveSection(actor,id,input)),
  };
}
