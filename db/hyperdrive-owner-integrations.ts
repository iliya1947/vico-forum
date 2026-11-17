import {createWebPool,isPostgresConnectionTimeout,isPostgresQueryTimeout} from "./postgres-deadlines";
import {isPostgresAvailabilityFailure} from "../app/localization/persistent-registry";
import {OwnerSystemUnavailableError} from "./hyperdrive-owner-system";
import {PostgresOwnerIntegrationMonitoring} from "./owner-integration-monitoring";
import type {OwnerSystemMonitoring} from "./owner-system-monitoring";
import type {OwnerIntegrationsCurrent} from "./owner-integration-catalog";
import type {IntegrationRuntimeFacts,RequiredLocalizationRead} from "../app/observability/integration-runtime";
export interface OwnerIntegrationsMonitoring {readCurrent():Promise<OwnerIntegrationsCurrent>}
export function createHyperdriveOwnerIntegrations(connectionString:string,ownerUserId:string|undefined,readSystem:OwnerSystemMonitoring['readSystem'],
  runtime:IntegrationRuntimeFacts,requiredLocalizationRead:()=>RequiredLocalizationRead|null):OwnerIntegrationsMonitoring{
  return {async readCurrent(){
    if(!ownerUserId)throw new Error('Owner Integrations binding missing');
    const pool=createWebPool(connectionString);
    try{return await new PostgresOwnerIntegrationMonitoring(pool,readSystem,runtime,requiredLocalizationRead).readCurrent();}
    catch(error){
      if(error instanceof OwnerSystemUnavailableError)throw error;
      let current:unknown=error;const seen=new Set<unknown>();
      while(current&&typeof current==='object'&&!seen.has(current)){
        seen.add(current);
        if(isPostgresAvailabilityFailure(current)||isPostgresConnectionTimeout(current)||isPostgresQueryTimeout(current)||['42P01','42703','42501'].includes(String((current as {code?:unknown}).code)))throw new OwnerSystemUnavailableError('Owner Integrations unavailable',{cause:error});
        current=(current as {cause?:unknown}).cause;
      }
      throw error;
    }finally{await pool.end().catch(()=>undefined);}
  }};
}
