import type {Pool,PoolClient,ClientBase} from "pg";
import {readSystemSnapshot} from "./owner-system-monitoring";
import {PostgresOwnerSystemHistory} from "./owner-system-history";
import {readSa02Snapshot} from "./owner-sa02-current";
import {readNativeMonitor} from "./owner-native-current";
import {readTaskSource} from "./owner-task-monitoring";
import {readFileSource,readRetainedStorageSamples} from "./owner-file-monitoring";
import {readLocalizationSource,readLocalizationBudget,OwnerLocalizationUnavailableError} from "./owner-localization-monitoring";
import {readDataRetained,readDataTerminalCoverage} from "./owner-data-monitoring";
import {integrationConfiguration} from "./owner-integration-monitoring";
import {PostgresOwnerSa02History} from "./owner-sa02-history";
import {NATIVE_MONITORS,OWNER_MONITORS,type OwnerMonitorKey,type OwnerMonitorArea} from "./owner-monitor-catalog";
import {isPostgresAvailabilityFailure,RegistryIntegrityError} from "../app/localization/persistent-registry";
import {isPostgresConnectionTimeout,isPostgresQueryTimeout} from "./postgres-deadlines";
import type {IntegrationRuntimeFacts,RequiredLocalizationRead} from "../app/observability/integration-runtime";
import type {OwnerOverview,OverviewSource,OverviewValues,OverviewArea,OverviewFigure} from "./owner-overview-catalog";
import {recordOwnerSnapshotBatch,type OwnerSnapshotCandidate} from "./owner-overview-observations";

class OverviewBudgetError extends Error {}
type Reader=Pick<ClientBase,"query">;
type ValueMap=Partial<Record<OwnerMonitorKey,OverviewValues>>;
type SourceCode=OverviewSource["code"];
function unavailable(error:unknown):SourceCode|null{
  if(error instanceof OverviewBudgetError||error instanceof OwnerLocalizationUnavailableError)return "deadline";
  if(error instanceof RegistryIntegrityError)return "source-incompatible";
  const seen=new Set<unknown>();let current=error;
  while(current&&typeof current==="object"&&!seen.has(current)){
    seen.add(current);const code=String((current as {code?:unknown}).code);
    if(["42P01","42703","42501","42883"].includes(code))return "source-incompatible";
    if(isPostgresConnectionTimeout(current)||isPostgresQueryTimeout(current)||["55P03","57014","25P03"].includes(code))return "deadline";
    if(isPostgresAvailabilityFailure(current))return "dependency-unavailable";
    current=(current as {cause?:unknown}).cause;
  }
  return null;
}
const instant=(at:Date)=>{if(!(at instanceof Date)||!Number.isFinite(at.getTime()))throw Error("Invalid Overview source clock");return at.toISOString();};
const fields:Partial<Record<OwnerMonitorKey,readonly string[]>>={
  "system.runtime":["state"],"system.dependencies":["state","version"],"system.requests":["count"],
  "accounts.users":["total","deactivatedUsers","retentionPendingUsers"],"accounts.methods":["googleUsers"],"accounts.sessions":["active"],
  "security.auth":["attributedAttempts","gapAttempts"],"security.access":["attributedAttempts","gapAttempts"],"security.attachments":["total"],
  "forum.structure":["topics","posts"],"forum.content":["missingCurrentTitles","missingCurrentBodies"],
  "administration.authorization":["roles"],"administration.measures":["effective","appealsPending","mootTimeUnproven"],"administration.registration":["googleEnabled","emailEnabled"],
  "moderation.complaints":["open","pendingAppeals"],"moderation.help":["pending"],
  "notifications.inbox":["unread","missingTargets"],
  "background.translation":["pending","processingExpired","failed","runtimeEnabled"],"background.attachments":["eligibleUnreferenced","cleanupClaimsExpired","schedulerEnabled"],
  "files.assets":["assets","assetBytes"],"files.operations":["uploadJournal"],
  "localization.registry":["activeLocales"],"localization.ui":["missingUnits"],"localization.budget":["usedUnits","limitsConfigured"],
  "data.retention":["retainedOwnerEvents","retainedObservations","minimumBoundaryFuture"],
  "integrations.database":["webBindingPresent","localizationBindingPresent","actualWebState","actualWebVersion"],
  "integrations.authentication":["googleParametersPresent","genericSessionProviderKnown","linkedGoogleUsers","genericActiveSessions","googleRegistrationEnabled"],
  "integrations.storage":["fixedSampleSlots","retainedSlots","allCallsMeasured"],
  "integrations.translation":["generationEnabled","providerWired","consumerWired","actualPending","actualFailed"],
};
const areaSources:Record<OwnerMonitorArea,readonly string[]>={
  system:["system"],accounts:["accounts"],security:["security"],forum:["forum"],
  administration:["administration","accounts"],moderation:["moderation"],notifications:["notifications"],
  background:["tasks","files"],files:["files"],localization:["localization","budget"],
  data:["data","accounts","terminal-coverage"],integrations:["configuration","system","accounts","storage","localization","tasks"],
};
/** Shared read snapshots, pure existing source functions, no public endpoint fan-out. */
export class PostgresOwnerOverview {
  constructor(private readonly web:Pool,private readonly connectLocalization:()=>Promise<Reader>,
    private readonly owner:string,private readonly mode:string,private readonly runtime:IntegrationRuntimeFacts,
    private readonly requiredLocalizationRead:()=>RequiredLocalizationRead|null){}
  async readCurrent():Promise<OwnerOverview>{
    const until=performance.now()+10000,budget={reads:0};
    const values:ValueMap={},sources=new Map<string,OverviewSource>(),candidates:OwnerSnapshotCandidate[]=[];
    let recent:OwnerOverview["recent"]=null,samples:OwnerOverview["samples"]=[],coverageUnavailable=false;
    let terminalCoverage:OwnerOverview["terminalCoverage"]={status:"unavailable",observedAt:null,values:{}};
    let retainedSlots:string|undefined;
    let webReadable=false,recording:OwnerOverview["recording"]="available";
    let system:Awaited<ReturnType<typeof readSystemSnapshot>>|undefined;
    const queryGuard=(client:Reader):Reader=>({query:async(sql:string,args?:unknown[])=>{
      const remaining=until-performance.now()-100;
      if(remaining<1||budget.reads>=40)throw new OverviewBudgetError();
      budget.reads++;
      // Await the real server-bounded statement; never abandon a live query.
      await client.query("set local statement_timeout='"+Math.min(1500,Math.floor(remaining))+"ms'");
      return client.query(sql,args);
    }} as Reader);
    const add=(key:OwnerMonitorKey,v:OverviewValues,source:"database"|"application"="database",schemaVersion=1)=>{
      values[key]=v;candidates.push({key,values:v,source,schemaVersion});
    };
    const failed=(id:string,connection:OverviewSource["connection"],code:SourceCode)=>sources.set(id,{id,connection,status:"unavailable",observedAt:null,code});
    let c:PoolClient|undefined,begun=false;
    try{
      c=await this.web.connect();await c.query("begin isolation level repeatable read read only");begun=true;
      await c.query("set local lock_timeout='500ms';set local transaction_timeout='10000ms'");
      const read=queryGuard(c),now=(await read.query<{at:Date}>("select transaction_timestamp() at")).rows[0]?.at,at=instant(now);
      const group=async<T>(id:string,work:()=>Promise<T>):Promise<T|undefined>=>{
        if(until-performance.now()<100||budget.reads>=40){failed(id,"web-database","deadline");return;}
        await c!.query("savepoint owner_overview_source");
        try{
          const result=await work();await c!.query("release savepoint owner_overview_source");
          sources.set(id,{id,connection:"web-database",status:"measured",observedAt:at,code:"none"});return result;
        }catch(error){
          const code=unavailable(error);if(!code)throw error;
          await c!.query("rollback to savepoint owner_overview_source");await c!.query("release savepoint owner_overview_source");
          failed(id,"web-database",code);
        }
      };
      system=await group("system",()=>readSystemSnapshot(read,this.mode,now));
      if(system)for(const m of system.monitors)values[m.key]=m.values;
      for(const area of ["accounts","security"] as const){
        const snapshot=await group(area,()=>readSa02Snapshot(read,now,area));
        if(snapshot)for(const m of snapshot)add(m.key,m.values,"database",m.key==="accounts.users"?2:1);
      }
      for(const area of ["forum","administration","moderation","notifications"] as const){
        const snapshot=await group(area,async()=>{
          const result:Array<{key:OwnerMonitorKey;value:OverviewValues}>=[];
          for(const key of NATIVE_MONITORS[area]){
            if(key==="administration.registration")continue; // The same registration row is already read.
            result.push({key,value:await readNativeMonitor(read,key,now,this.owner)});
          }
          return result;
        });
        if(snapshot)for(const m of snapshot)add(m.key,m.value);
      }
      const registration=values["accounts.registration"];
      if(registration)add("administration.registration",{...registration,updatedAt:String(registration.updatedAt).replace(/Z$/,"000Z")});
      const tasks=await group("tasks",()=>readTaskSource(read,at));if(tasks)add("background.translation",tasks);
      const files=await group("files",()=>readFileSource(read,at));if(files)for(const key of ["files.assets","files.operations","background.attachments"] as const)add(key,files[key]);
      const budgetSource=await group("budget",()=>readLocalizationBudget(read,until));
      if(budgetSource)add("localization.budget",{...budgetSource.budget,windowsShown:String(budgetSource.windows.length),windowsTruncated:BigInt(budgetSource.budget.windowGroups)>BigInt(budgetSource.windows.length),limitsConfigured:false,sourceObservedAt:at,sourceConnection:"web-database"});
      const retained=await group("data",async()=>({events:await readDataRetained(read,"owner_events","occurred_at"),observations:await readDataRetained(read,"owner_monitor_observations","observed_at")}));
      // Compact retained figures reuse Data's source reader. They are not a full
      // data.retention schema1 snapshot and must never overwrite that observation.
      if(retained)values["data.retention"]={retainedOwnerEvents:retained.events.rows,retainedObservations:retained.observations.rows,minimumBoundaryFuture:values["accounts.users"]?.retentionPendingUsers??null};
      const terminal=await group("terminal-coverage",()=>readDataTerminalCoverage(read));
      if(terminal)terminalCoverage={status:Object.values(terminal).some(n=>BigInt(n)>0n)?"limited":"measured",observedAt:at,values:terminal};
      const slots=await group("storage",()=>readRetainedStorageSamples(read,at));
      if(slots)retainedSlots=String(slots.filter(s=>s.sample!==null).length);
      const history=await group("recent",()=>new PostgresOwnerSa02History(read).readTimeline({limit:5}));if(history)recent=history;
      const sampleRows=await group("sample-coverage",async()=>(await read.query<{key:OwnerMonitorKey;first:Date|null;last:Date|null}>("select monitor_key key,min(observed_at) first,max(observed_at) last from owner_monitor_observations where resource_scope='global' group by monitor_key")).rows);
      if(sampleRows)samples=sampleRows.filter(r=>Object.values(OWNER_MONITORS).some(keys=>(keys as readonly string[]).includes(r.key))).map(r=>({key:r.key,first:r.first?instant(r.first):null,last:r.last?instant(r.last):null}));else coverageUnavailable=true;
      await c.query("commit");begun=false;webReadable=true;
    }catch(error){
      if(begun)try{await c?.query("rollback");}catch{/* Preserve source cause. */}
      const code=unavailable(error);if(!code)throw error;
      // A failed shared transaction cannot supply a partial successful snapshot.
      for(const key of Object.keys(values))delete values[key as OwnerMonitorKey];candidates.length=0;terminalCoverage={status:"unavailable",observedAt:null,values:{}};system=undefined;recent=null;samples=[];coverageUnavailable=true;
      for(const id of new Set(Object.values(areaSources).flat().filter(id=>!["localization","configuration"].includes(id))))failed(id,"web-database",code);
    }finally{c?.release();}
    let local:Reader|undefined,localBegun=false;
    try{
      if(until-performance.now()<1100||budget.reads>=40)throw new OverviewBudgetError();
      local=await this.connectLocalization();
      await local.query("begin isolation level repeatable read read only");localBegun=true;
      await local.query("set local lock_timeout='500ms';set local transaction_timeout='10000ms'");
      const state=await readLocalizationSource(queryGuard(local),null,until);
      if(performance.now()>until)throw new OverviewBudgetError();
      await local.query("commit");localBegun=false;
      sources.set("localization",{id:"localization",connection:"localization-database",status:"measured",observedAt:state.observedAt,code:"none"});
      for(const [key,v]of [["localization.registry",state.registryValues],["localization.ui",state.uiValues]] as const)add(key,{...v,sourceObservedAt:state.observedAt,sourceConnection:"localization-database"});
    }catch(error){
      if(localBegun)try{await local?.query("rollback");}catch{/* Preserve source cause. */}
      const code=unavailable(error);if(!code)throw error;failed("localization","localization-database",code);
    }
    const config=integrationConfiguration(this.runtime,this.requiredLocalizationRead());
    for(const [key,v]of Object.entries(config))add(key as OwnerMonitorKey,v,"application");
    // Summary-only count does not change the existing configuration sample.
    if(retainedSlots!==undefined)values["integrations.storage"]={...values["integrations.storage"],retainedSlots};
    values["integrations.database"]={...values["integrations.database"],actualWebState:values["system.dependencies"]?.state??null,actualWebVersion:values["system.dependencies"]?.version??null};
    values["integrations.authentication"]={...values["integrations.authentication"],linkedGoogleUsers:values["accounts.methods"]?.googleUsers??null,genericActiveSessions:values["accounts.sessions"]?.active??null,googleRegistrationEnabled:values["accounts.registration"]?.googleEnabled??null};
    values["integrations.translation"]={...values["integrations.translation"],actualPending:values["background.translation"]?.pending??null,actualFailed:values["background.translation"]?.failed??null};
    sources.set("configuration",{id:"configuration",connection:"application",status:"measured",observedAt:new Date().toISOString(),code:"none"});
    // Both source transactions have closed before any observation is attempted.
    if(webReadable){
      try{
        const recorded=await recordOwnerSnapshotBatch(this.web,candidates);
        for(const sample of recorded){const existing=samples.find(s=>s.key===sample.key);if(existing){existing.first??=sample.at;existing.last=sample.at;}else samples.push({key:sample.key,first:sample.at,last:sample.at});}
      }catch{recording="unavailable";}
      if(system)for(const m of system.monitors)try{
        const recorded=await new PostgresOwnerSystemHistory(this.web).recordObservation({monitorKey:m.key,resourceScope:"global",source:m.source,schemaVersion:1,quality:"measured",value:m.values});
        void recorded;
      }catch{recording="unavailable";}
    }else recording="unavailable";
    const areas:OverviewArea[]=Object.keys(OWNER_MONITORS).map(name=>{
      const area=name as OwnerMonitorArea,parts=areaSources[area].map(id=>sources.get(id)??{id,connection:"web-database" as const,status:"unavailable" as const,observedAt:null,code:"dependency-unavailable" as const});
      const successful=parts.filter(s=>s.status==="measured").length;
      const figures:OverviewFigure[]=[];
      for(const key of OWNER_MONITORS[area])for(const field of fields[key]??[]){
        const value=values[key]?.[field];if(value!==undefined&&value!==null)figures.push({monitorKey:key,field,value});
      }
      return {area,status:successful===parts.length?"measured":successful?"partial":"unavailable",sources:parts,figures};
    });
    areas.push({area:"infrastructure",status:"placeholder",sources:[],figures:[]});
    return {terminalCoverage,areas,recent,recentUnavailable:recent===null,samples,sampleCoverageUnavailable:coverageUnavailable,recording,readStatements:budget.reads};
  }
}
