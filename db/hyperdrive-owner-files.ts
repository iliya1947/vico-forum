import {createWebPool,isPostgresConnectionTimeout,isPostgresQueryTimeout} from "./postgres-deadlines";
import {isPostgresAvailabilityFailure} from "../app/localization/persistent-registry";
import {OwnerSystemUnavailableError} from "./hyperdrive-owner-system";
import {PostgresOwnerFileMonitoring,type OwnerFilesCurrent,type FileCurrentMonitor} from "./owner-file-monitoring";

export interface OwnerFilesMonitoring {readCurrent():Promise<OwnerFilesCurrent>;readCleanup():Promise<FileCurrentMonitor>}
export function createHyperdriveOwnerFiles(connectionString:string,bucketBound:boolean,ownerUserId:string|undefined):OwnerFilesMonitoring{
  async function run<T>(work:(reader:PostgresOwnerFileMonitoring)=>Promise<T>):Promise<T>{
    if(!ownerUserId)throw new Error("Owner files binding missing");
    const pool=createWebPool(connectionString);
    try{return await work(new PostgresOwnerFileMonitoring(pool,bucketBound));}
    catch(error){
      let current:unknown=error;const seen=new Set<unknown>();
      while(current&&typeof current==="object"&&!seen.has(current)){
        seen.add(current);
        if(isPostgresAvailabilityFailure(current)||isPostgresConnectionTimeout(current)||isPostgresQueryTimeout(current)||["42501","42P01","42703"].includes(String((current as {code?:unknown}).code)))
          throw new OwnerSystemUnavailableError("Owner files unavailable",{cause:error});
        current=(current as {cause?:unknown}).cause;
      }
      throw error;
    }finally{await pool.end().catch(()=>undefined);}
  }
  return {readCurrent:()=>run(r=>r.readCurrent()),readCleanup:()=>run(r=>r.readCleanup())};
}
