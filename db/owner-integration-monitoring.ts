import type {Pool,PoolClient} from "pg";
import type {OwnerSystemMonitoring} from "./owner-system-monitoring";
import type {SafePayload} from "./owner-system-history";
import type {IntegrationRuntimeFacts,RequiredLocalizationRead} from "../app/observability/integration-runtime";
import {TASK_TRANSITION_KINDS} from "../app/observability/operational-facts";
import type {TranslationFailureCode} from "../app/localization/translation-failures";
import {STORAGE_SLOTS} from "../app/observability/storage-observations";
import {readRetainedStorageSamples} from "./owner-file-monitoring";
import {recordOwnerMonitorSnapshot} from "./owner-monitor-observations";
import {INTEGRATION_MONITOR_KEYS,type IntegrationMonitorKey,type IntegrationValues,type OwnerIntegrationsCurrent,type IntegrationCurrentMonitor,type RetainedIntegrationFact} from "./owner-integration-catalog";

const failureCodes=['provider-rate-limited','provider-temporary','provider-terminal','provider-unsupported','provider-output-invalid','message-kind-unsupported','dependency-temporary','execution-bound-exceeded','attempt-budget-exhausted'] as const satisfies readonly TranslationFailureCode[];
const exact=(value:unknown):string=>{if(typeof value!=='string'||!/^\d+$/.test(value))throw new Error('Invalid exact integration count');return value;};
const timestamp=(column:string)=>`to_char(${column} at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
const dependencyValues=(value:unknown):SafePayload=>{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid native dependency values');
  const v=value as Record<string,unknown>,safe:SafePayload={};
  for(const key of ['component','state','version'] as const)if(v[key]!==undefined){
    if(typeof v[key]!=='string'||v[key].length>200)throw new Error('Invalid native dependency metadata');safe[key]=v[key];
  }
  return safe;
};
type FactRow={id:string;at:string;kind:string;value:Record<string,unknown>};
function fact(row:FactRow|undefined,source:string,operational=false):RetainedIntegrationFact|null{
  if(!row)return null;
  if(!/^[0-9a-f-]{36}$/i.test(row.id)||!Number.isFinite(Date.parse(row.at)))throw new Error('Invalid retained integration fact');
  const values:IntegrationValues={};
  if(operational){
    values.payloadSchemaRecognized=row.value?.schemaVersion===1;
    if(!values.payloadSchemaRecognized)return {id:row.id,occurredAt:row.at,kind:row.kind,source,values};
    if(['ui','content-topic-title','content-post-body'].includes(String(row.value.taskKind)))values.taskKind=String(row.value.taskKind);
    for(const key of ['generation','attemptCount','calls','succeeded','failed','durationMs'] as const){
      const value=row.value[key];if(typeof value==='number'&&Number.isSafeInteger(value)&&value>=0)values[key]=value;
    }
    if(typeof row.value.failureCode==='string')values.failureCode=(failureCodes as readonly string[]).includes(row.value.failureCode)?row.value.failureCode:'other';
    if(['retryable','terminal','retry-exhausted'].includes(String(row.value.failureDisposition)))values.failureDisposition=String(row.value.failureDisposition);
  }else if(row.kind==='auth.methodLinked')values.method='google';
  // Session facts deliberately contain no provider, method, user/time inference or joins.
  return {id:row.id,occurredAt:row.at,kind:row.kind,source,values};
}
async function lastOperational(c:PoolClient,monitor:string,kinds:readonly string[]){
  const row=(await c.query<FactRow>(`select id::text id,${timestamp('occurred_at')} at,kind,payload value from owner_events
    where source='operation' and monitor_key=$1 and kind=any($2::text[]) order by occurred_at desc,id desc limit 1`,[monitor,kinds])).rows[0];
  return fact(row,'owner_events.operation',true);
}
async function readSources(c:PoolClient){
  const at=(await c.query<{at:string}>(`select ${timestamp('transaction_timestamp()')} at`)).rows[0].at;
  const settings=(await c.query<{id:number;google:boolean;email:boolean;version:number;updated:Date}>('select id,google_registration_enabled google,email_registration_enabled email,version,updated_at updated from forum_registration_settings')).rows;
  if(settings.length!==1||settings[0].id!==1||typeof settings[0].google!=='boolean'||typeof settings[0].email!=='boolean'||!Number.isSafeInteger(settings[0].version)||settings[0].version<1||!Number.isFinite(settings[0].updated?.getTime()))throw new Error('Invalid registration source');
  const counts=(await c.query<Record<string,string>>(`select
    (select count(distinct user_id)::text from account where provider_id='google') as "googleLinkedUsers",
    count(*) filter(where kind='auth.methodLinked' and payload->>'method'='google')::text as "googleMethodLinkFacts",
    count(*) filter(where kind='auth.sessionCreated')::text as "genericSessionCreatedFacts",
    count(*) filter(where kind='auth.sessionDeleted')::text as "genericSessionDeletedFacts",
    count(*) filter(where kind='auth.passwordChanged')::text as "passwordChangeFacts",
    (select count(*)::text from owner_attempt_patterns where pool='auth') as "retainedGenericAuthGroups"
    from owner_events where source='auth'`)).rows[0];
  const authValues:IntegrationValues=Object.fromEntries(Object.entries(counts).map(([key,value])=>[key,exact(value)]));
  Object.assign(authValues,{googleRegistrationEnabled:settings[0].google,emailRegistrationEnabled:settings[0].email,registrationVersion:settings[0].version,registrationUpdatedAt:settings[0].updated.toISOString()});
  const google=(await c.query<FactRow>(`select id::text id,${timestamp('occurred_at')} at,kind,'{}'::jsonb value from owner_events
    where source='auth' and monitor_key='accounts.methods' and kind='auth.methodLinked' and payload->>'method'='google' order by occurred_at desc,id desc limit 1`)).rows[0];
  const session=(await c.query<FactRow>(`select id::text id,${timestamp('occurred_at')} at,kind,'{}'::jsonb value from owner_events
    where source='auth' and monitor_key='accounts.sessions' and kind in ('auth.sessionCreated','auth.sessionDeleted') order by occurred_at desc,id desc limit 1`)).rows[0];
  const dependency=(await c.query<{id:string;at:string;source:string;schema:number;quality:string;value:unknown}>(`select id::text id,${timestamp('observed_at')} at,source,schema_version schema,quality,value
    from owner_monitor_observations where monitor_key='system.dependencies' and resource_scope='global' order by observed_at desc,id desc limit 1`)).rows[0];
  let retainedSample:OwnerIntegrationsCurrent['database']['retainedSample']=null;
  if(dependency){
    if(dependency.source!=='database'||dependency.schema!==1||!['measured','degraded','unavailable'].includes(dependency.quality)||!Number.isFinite(Date.parse(dependency.at)))throw new Error('Invalid native dependency observation');
    retainedSample={id:dependency.id,observedAt:dependency.at,source:'database',schemaVersion:1,quality:dependency.quality,values:dependencyValues(dependency.value)};
  }
  return {at,authentication:{source:'database' as const,observedAt:at,values:authValues,googleMethodLink:fact(google,'owner_events.auth'),genericSession:fact(session,'owner_events.auth')},
    retainedSample,storageSamples:await readRetainedStorageSamples(c,at),translation:{
      taskOutcome:await lastOperational(c,'background.translation',TASK_TRANSITION_KINDS),
      providerExecution:await lastOperational(c,'integrations.translation',['integration.translationCall'])}};
}
export function integrationConfiguration(config:IntegrationRuntimeFacts,local:RequiredLocalizationRead|null):Record<IntegrationMonitorKey,IntegrationValues>{
  // Select individual trusted booleans. Never spread an environment or serialize credentials.
  return {
    'integrations.database':{webBindingPresent:config.webBindingPresent,localizationBindingPresent:config.localizationBindingPresent,webRoutingRole:'web',localizationRoutingRole:'localization-read',
      requiredLocalizationOutcome:local?.outcome??'unmeasured',requiredLocalizationObservedAt:local?.observedAt??null,requiredLocalizationQuality:local?.quality??'unmeasured'},
    'integrations.authentication':{googleParametersPresent:config.googleParametersPresent,googleCallbackCoverageMeasured:false,genericSessionProviderKnown:false},
    'integrations.storage':{bucketBound:config.bucketBound,fixedSampleSlots:STORAGE_SLOTS.length,recordingBestEffort:true,allCallsMeasured:false},
    'integrations.translation':{generationEnabled:config.generationEnabled,generationAdmissionWired:config.generationAdmissionWired,providerWired:config.providerWired,enqueuerWired:config.enqueuerWired,consumerWired:config.consumerWired,codeAvailable:true},
  };
}
export class PostgresOwnerIntegrationMonitoring {
  constructor(private readonly pool:Pool,private readonly readSystem:OwnerSystemMonitoring['readSystem'],private readonly runtime:IntegrationRuntimeFacts,
    private readonly requiredLocalizationRead:()=>RequiredLocalizationRead|null){}
  async readCurrent():Promise<OwnerIntegrationsCurrent>{
    // Exactly the existing dependency reader, once. It owns its actual measurement
    // and original System observations; there is no extra database ping here.
    const system=await this.readSystem(),dependency=system.monitors.find(m=>m.key==='system.dependencies');
    if(!dependency||dependency.source!=='database')throw new Error('Missing canonical System dependency measurement');
    const c=await this.pool.connect();let begun=false;let source:Awaited<ReturnType<typeof readSources>>;
    try{
      await c.query('begin isolation level repeatable read read only');begun=true;
      await c.query("set local statement_timeout='1500ms';set local lock_timeout='500ms'");
      source=await readSources(c);await c.query('commit');begun=false;
    }catch(error){if(begun)try{await c.query('rollback');}catch{/* Preserve source failure. */}throw error;}
    finally{c.release();}
    const local=this.requiredLocalizationRead(),values=integrationConfiguration(this.runtime,local),monitors:IntegrationCurrentMonitor[]=[];
    for(const key of INTEGRATION_MONITOR_KEYS){
      let recording:IntegrationCurrentMonitor['recording']='available',coverageFrom:string|null=null,lastObservedAt:string|null=null;
      // Only configuration/request-load provenance is sampled here. Native web DB,
      // auth, task and the13 storage-call samples keep their original identities.
      try{await recordOwnerMonitorSnapshot(this.pool,key,values[key],'application');}catch{recording='unavailable';}
      try{
        const extra=key==='integrations.database'?"union all select min(observed_at),false from owner_monitor_observations where monitor_key='system.dependencies' and resource_scope='global' union all select min(occurred_at),false from owner_events where source='system' and monitor_key='system.dependencies' and kind='system.dependencyUnavailable'":
          key==='integrations.authentication'?"union all select min(occurred_at),false from owner_events where source='auth' and kind in ('account.created','auth.methodLinked','auth.passwordChanged','auth.sessionCreated','auth.sessionDeleted') union all select min(occurred_at),false from admin_history where action='settings.registrationChanged' union all select min(admitted_at),false from owner_attempt_patterns where surface='auth' union all select min(admitted_at),false from owner_attempt_telemetry_state where right(slot,5)='.auth'":
          key==='integrations.storage'?"union all select min(observed_at),false from owner_monitor_observations where monitor_key='integrations.storage' and resource_scope=any($2::text[])":
          "union all select min(occurred_at),false from owner_events where source='operation' and monitor_key in ('background.translation','integrations.translation') and kind=any($2::text[])";
        const r=(await this.pool.query<{first:Date|null;last:Date|null}>(`select min(at) first,max(at) filter(where own) last from(
          select min(observed_at) at,true own from owner_monitor_observations where monitor_key=$1 and resource_scope='global'
          union all select max(observed_at),true from owner_monitor_observations where monitor_key=$1 and resource_scope='global' ${extra}) retained`,key==='integrations.storage'?[key,STORAGE_SLOTS]:key==='integrations.translation'?[key,[...TASK_TRANSITION_KINDS,'integration.translationCall']]:[key])).rows[0];
        coverageFrom=r.first?.toISOString()??null;lastObservedAt=r.last?.toISOString()??null;
      }catch{recording='unavailable';}
      if(key==='integrations.database'&&system.recording==='unavailable')recording='unavailable';
      monitors.push({key,schemaVersion:1,source:'application',quality:'measured',observedAt:source.at,values:values[key],recording,coverageFrom,lastObservedAt});
    }
    return {monitors,database:{observedAt:system.observedAt,source:'existing-system-dependency-reader',quality:dependency.quality,values:dependencyValues(dependency.values),recording:system.recording,retainedSample:source.retainedSample},
      requiredLocalizationRead:local,authentication:source.authentication,storageSamples:source.storageSamples,translation:source.translation};
  }
}
