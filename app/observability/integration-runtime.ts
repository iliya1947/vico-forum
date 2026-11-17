import type {LoadedLocaleRegistry} from "../localization/persistent-registry";

export interface RequiredLocalizationRead {
  source:"required-localization-registry-load";phase:"read-and-validation";observedAt:string;
  outcome:"valid-registry-returned"|"dependency-unavailable"|"schema-mismatch"|"registry-invalid";
  quality:"measured"|"degraded"|"unavailable";
}
/** Observes the already required request-local load; it never opens a connection. */
export function observeRequiredLocalizationRead(loader:()=>Promise<LoadedLocaleRegistry>){
  let pending:Promise<LoadedLocaleRegistry>|undefined,measurement:RequiredLocalizationRead|null=null;
  return {current:()=>measurement,load:()=>pending??=(async()=>{
    const result=await loader();
    // Unknown exceptions keep their original behavior and are not relabeled DB failures.
    try{const health=result.health;
    if(health.status==='healthy')measurement={source:'required-localization-registry-load',phase:'read-and-validation',observedAt:new Date().toISOString(),outcome:'valid-registry-returned',quality:'measured'};
    else if(health.status==='degraded')measurement={source:'required-localization-registry-load',phase:'read-and-validation',observedAt:new Date().toISOString(),
      outcome:health.reason==='unavailable'?'dependency-unavailable':health.reason==='schema-mismatch'?'schema-mismatch':'registry-invalid',quality:health.reason==='unavailable'?'unavailable':'degraded'};
    }catch{measurement=null;} // Passive metadata never vetoes the ordinary load.
    return result;
  })()};
}
/** Presence is not an OAuth credential validation or a provider-health probe. */
export function googleParametersPresent(environment:{GOOGLE_CLIENT_ID?:unknown;GOOGLE_CLIENT_SECRET?:unknown}):boolean{
  return [environment.GOOGLE_CLIENT_ID,environment.GOOGLE_CLIENT_SECRET].every(value=>typeof value==='string'&&value.trim().length>0);
}
export interface IntegrationRuntimeFacts {
  webBindingPresent:boolean;localizationBindingPresent:boolean;googleParametersPresent:boolean;bucketBound:boolean;
  generationEnabled:boolean;generationAdmissionWired:boolean;providerWired:boolean;enqueuerWired:boolean;consumerWired:boolean;
}
