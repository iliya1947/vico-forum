import {createWebPool,createLocalizationClient,isPostgresConnectionTimeout,isPostgresQueryTimeout} from "./postgres-deadlines";
import {isPostgresAvailabilityFailure} from "../app/localization/persistent-registry";
import {OwnerSystemUnavailableError} from "./hyperdrive-owner-system";
import {PostgresOwnerDataMonitoring} from "./owner-data-monitoring";
import type {OwnerDataCurrent} from "./owner-data-catalog";
export interface OwnerDataMonitoring {readCurrent():Promise<OwnerDataCurrent>}
export function createHyperdriveOwnerData(webConnectionString:string,localizationConnectionString:string,ownerUserId:string|undefined):OwnerDataMonitoring{
  return {async readCurrent(){
    if(!ownerUserId)throw new Error("Owner Data binding missing");
    const web=createWebPool(webConnectionString),localization=createLocalizationClient(localizationConnectionString);
    try{await localization.connect();return await new PostgresOwnerDataMonitoring(web,localization).readCurrent();}
    catch(error){
      let current:unknown=error;const seen=new Set<unknown>();
      while(current&&typeof current==='object'&&!seen.has(current)){
        seen.add(current);
        if(isPostgresAvailabilityFailure(current)||isPostgresConnectionTimeout(current)||isPostgresQueryTimeout(current))throw new OwnerSystemUnavailableError("Owner Data unavailable",{cause:error});
        current=(current as {cause?:unknown}).cause;
      }
      throw error;
    }finally{await Promise.allSettled([web.end(),localization.end()]);}
  }};
}
