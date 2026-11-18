import {createWebPool,createLocalizationClient} from "./postgres-deadlines";
import {PostgresOwnerOverview} from "./owner-overview-monitoring";
import type {OwnerOverview} from "./owner-overview-catalog";
import type {IntegrationRuntimeFacts,RequiredLocalizationRead} from "../app/observability/integration-runtime";
export interface OwnerOverviewMonitoring {readCurrent():Promise<OwnerOverview>}
export function createHyperdriveOwnerOverview(webConnection:string,localizationConnection:string,owner:string|undefined,mode:string,
  runtime:IntegrationRuntimeFacts,requiredLocalizationRead:()=>RequiredLocalizationRead|null):OwnerOverviewMonitoring{
  return {async readCurrent(){
    if(!owner)throw Error("Owner Overview binding missing");
    const web=createWebPool(webConnection),localization=createLocalizationClient(localizationConnection);
    try{return await new PostgresOwnerOverview(web,async()=>{await localization.connect();return localization;},owner,mode,runtime,requiredLocalizationRead).readCurrent();}
    finally{await localization.end().catch(()=>undefined);await web.end().catch(()=>undefined);}
  }};
}
