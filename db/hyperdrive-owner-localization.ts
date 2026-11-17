import type {Client, Pool} from "pg";
import {createLocalizationClient,createWebPool,isPostgresConnectionTimeout,isPostgresQueryTimeout} from "./postgres-deadlines";
import {isPostgresAvailabilityFailure} from "../app/localization/persistent-registry";
import {PostgresOwnerLocalizationMonitoring,OwnerLocalizationUnavailableError,type OwnerLocalizationCurrent} from "./owner-localization-monitoring";
import {OwnerSystemUnavailableError} from "./hyperdrive-owner-system";

export interface OwnerLocalizationMonitoring {readCurrent():Promise<OwnerLocalizationCurrent>}
/** Fresh explicit capabilities; neither failed source may fall back to the other role. */
export function createHyperdriveOwnerLocalization(webConnectionString:string,localizationConnectionString:string,ownerUserId:string|undefined,
  factories:{web:(s:string)=>Pool;localization:(s:string)=>Client}={web:createWebPool,localization:createLocalizationClient}):OwnerLocalizationMonitoring{
  return {async readCurrent(){
    if(!ownerUserId)throw new Error("Owner monitoring binding missing");
    const web=factories.web(webConnectionString),local=factories.localization(localizationConnectionString);
    try{
      await local.connect();
      // Current Worker uiGenerationPolicyContext is null; no provider policy or budget limit is configured.
      return await new PostgresOwnerLocalizationMonitoring(web,local,null).readCurrent();
    }catch(error){
      let current:unknown=error;const seen=new Set<unknown>();
      while(current&&typeof current==="object"&&!seen.has(current)){
        seen.add(current);
        if(current instanceof OwnerLocalizationUnavailableError||isPostgresAvailabilityFailure(current)||isPostgresConnectionTimeout(current)||isPostgresQueryTimeout(current)||
          ["42P01","42703","42501","42804"].includes(String((current as {code?:unknown}).code)))
          throw new OwnerSystemUnavailableError("Owner localization unavailable",{cause:error});
        current=(current as {cause?:unknown}).cause;
      }
      throw error;
    }finally{await local.end().catch(()=>undefined);await web.end().catch(()=>undefined);}
  }};
}
