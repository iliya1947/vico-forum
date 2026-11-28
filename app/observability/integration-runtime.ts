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
/** Presence only: never return key, sender, raw mode or validate provider health. */
export function mailConfigurationPresence(environment: {
  AUTH_MAIL_MODE?: unknown; AUTH_MAIL_PROVIDER?: unknown; AUTH_MAIL_FROM_ADDRESS?: unknown;
  AUTH_MAIL_RESEND_KEY?: unknown; AUTH_MAIL_BREVO_KEY?: unknown;
}): {mailModeRequested:"disabled"|"fake"|"provider"|"invalid";mailProviderParametersPresent:boolean} {
  const mode=environment.AUTH_MAIL_MODE??"disabled";
  const provider=environment.AUTH_MAIL_PROVIDER;
  const key=provider==="resend"?environment.AUTH_MAIL_RESEND_KEY:provider==="brevo"?environment.AUTH_MAIL_BREVO_KEY:undefined;
  return {mailModeRequested:mode==="disabled"||mode==="fake"||mode==="provider"?mode:"invalid",
    mailProviderParametersPresent: [environment.AUTH_MAIL_FROM_ADDRESS,key].every(value=>typeof value==="string"&&value.trim().length>0)};
}
export interface IntegrationRuntimeFacts {
  mailConfiguration?: ReturnType<typeof mailConfigurationPresence>;
  webBindingPresent:boolean;localizationBindingPresent:boolean;googleParametersPresent:boolean;bucketBound:boolean;
  generationEnabled:boolean;generationAdmissionWired:boolean;providerWired:boolean;enqueuerWired:boolean;consumerWired:boolean;
}
