import type {ClientBase, Pool, QueryResultRow} from "pg";
import {assemblePersistentRegistry, RegistryIntegrityError, type PersistentLocaleRow} from "../app/localization/persistent-registry";
import {canonicalEnglishCatalog, catalogDescriptors} from "../app/localization/catalog";
import {manualTranslationPacks} from "../app/localization/manual-packs";
import {CanonicalEnglishSource, LocalTranslationSource, type TranslationSourceBundle} from "../app/localization/sources";
import {DatabaseManualTranslationSource, DatabaseMachineTranslationSource, type PersistentUiTranslationRow, type UiTranslationStore} from "../app/localization/persistent-sources";
import {compileNamespaceBundle, verifyCompiledNamespaceBundle, CompiledBundleValidationError} from "../app/localization/bundles";
import {TranslationValidationError} from "../app/localization/translation-validation";
import {selectCurrentContentTranslation, ContentTranslationInvalidRecordError, type ContentTranslationRevision} from "../app/localization/content-translation";
import {protectMarkdownForTranslation} from "../app/localization/content-markdown-translation";
import {storedRow} from "./content-translation-store";
import {recordOwnerMonitorSnapshot} from "./owner-monitor-observations";
import {TASK_FACT_MONITOR_SCOPES_SQL,ADMIN_MONITOR_SCOPES_SQL} from "./owner-monitor-catalog";

export const LOCALIZATION_KEYS=["localization.registry","localization.ui","localization.content","localization.budget"] as const;
export type LocalizationKey=typeof LOCALIZATION_KEYS[number];
type Values=Record<string,string|boolean|null>;
export interface LocalizationMonitor {
  key:LocalizationKey;schemaVersion:1;source:"localization-database"|"web-database";quality:"measured";
  observedAt:string;values:Values;recording:"available"|"unavailable";coverageFrom:string|null;lastObservedAt:string|null;
}
export interface LocalizationBundleCoverage {
  locale:string;namespace:string;status:"missing"|"current"|"stale"|"invalid";
  storedVersion:string|null;servedVersion:string;rowVersion:string;servedMissing:string;
}
export interface OwnerLocalizationCurrent {
  monitors:LocalizationMonitor[];
  locales:{tag:string;direction:"ltr"|"rtl";translationStatus:string}[];
  bundles:LocalizationBundleCoverage[];
  budgetWindows:{scope:string;pool:"global"|"requester";windowStart:string;expiresAt:string;usedUnits:string;counterCount:string}[];
}
export class OwnerLocalizationUnavailableError extends Error {}
const exactTime=`to_char(transaction_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
const ROW_LIMIT=10000;
type Reader=Pick<ClientBase,"query">;
/** Complete input or explicit unavailability, never successful counts over a truncated prefix. */
async function boundedRows<T extends QueryResultRow>(c:Reader,sql:string,args:unknown[]=[]):Promise<T[]>{
  const rows=(await c.query<T>(sql+` limit ${ROW_LIMIT+1}`,args)).rows;
  if(rows.length>ROW_LIMIT)throw new OwnerLocalizationUnavailableError("Localization verification capacity unavailable");
  return rows;
}
function deadlineCheck(until:number){if(performance.now()>until)throw new OwnerLocalizationUnavailableError("Localization verification deadline");}
function counts(names:string[]):Record<string,bigint>{return Object.fromEntries(names.map(n=>[n,0n]));}
function strings(values:Record<string,bigint>):Values{return Object.fromEntries(Object.entries(values).map(([k,v])=>[k,v.toString()]));}
function mergeResources(parts:TranslationSourceBundle[]):TranslationSourceBundle{
  const out:TranslationSourceBundle={};
  for(const part of parts)for(const [ns,entries]of Object.entries(part))for(const [key,value]of Object.entries(entries))(out[ns]??={})[key]??=value;
  return out;
}
function logicalKeyCount(resources:Record<string,string>,namespace:string):bigint{
  return BigInt(catalogDescriptors().filter(d=>d.namespace===namespace&&(d.messageKind==="plural"
    ?Object.keys(resources).some(k=>k.startsWith(d.key+"_")):Object.hasOwn(resources,d.key))).length);
}

/** Three localization-only relations, one real read-only snapshot; no degraded bootstrap fallback. */
export async function readLocalizationSource(c:Reader,generationPolicyVersion:string|null,until:number){
  deadlineCheck(until);
  const observedAt=(await c.query<{at:string}>(`select ${exactTime} at`)).rows[0].at;
  const rows=await boundedRows<PersistentLocaleRow & QueryResultRow>(c,`select tag,translation_status as "translationStatus",publication_status as "publicationStatus",
    direction,fallback_chain as "fallbackChain",aliases,match_tags as "matchTags",native_name as "nativeName",presentation_metadata as "presentationMetadata" from locales order by tag`);
  const {registry}=await assemblePersistentRegistry(rows);
  const active=registry.activeLocales().map(l=>({tag:l.tag,direction:l.direction,translationStatus:l.translationStatus}));
  const targets=active.filter(l=>l.tag!=="en").map(l=>l.tag),namespaces=Object.keys(canonicalEnglishCatalog);
  deadlineCheck(until);
  const approved=await boundedRows<PersistentUiTranslationRow & QueryResultRow>(c,`select locale,namespace,key,origin,status,
    source_fingerprint as "sourceFingerprint",translated_payload as "translatedPayload",generation_policy_version as "generationPolicyVersion"
    from ui_translations where status='approved' and locale=any($1::text[]) order by locale,namespace,key,origin`,[targets]);
  deadlineCheck(until);
  const stored=await boundedRows<{locale:string;namespace:string;resources:unknown;bundleVersion:string}>(c,`select locale,namespace,resources,bundle_version as "bundleVersion"
    from ui_translation_bundles where locale=any($1::text[]) order by locale,namespace`,[targets]);
  const v=counts(["shippedKeys","namespaces","targetLocales","expectedUnits","localManual","persistentManual","machine","retainedMachine","missingUnits","staleRows","invalidRows","approvedRows","bundlesExpected","bundlesRetained","bundlesCurrent","bundlesStale","bundlesInvalid","bundlesMissing","bundlesDifferFromRows","servedMissingUnits"]);
  v.shippedKeys=BigInt(catalogDescriptors().length);v.namespaces=BigInt(namespaces.length);v.targetLocales=BigInt(targets.length);
  v.expectedUnits=v.shippedKeys*v.targetLocales;v.approvedRows=BigInt(approved.length);
  v.bundlesExpected=v.namespaces*v.targetLocales;v.bundlesRetained=BigInt(stored.length);
  v.invalidRows=BigInt(approved.filter(r=>!namespaces.includes(String(r.namespace))).length);
  const bundles:LocalizationBundleCoverage[]=[];
  for(const locale of targets){
    deadlineCheck(until);
    const store:UiTranslationStore={readApproved:async(l,ns)=>approved.filter(r=>r.locale===l&&ns.includes(String(r.namespace)))};
    const issue=(summary:{skippedRows:number})=>{v.invalidRows+=BigInt(summary.skippedRows);};
    const local=await new LocalTranslationSource(manualTranslationPacks).load(locale,namespaces);
    const manual=await new DatabaseManualTranslationSource(store,issue).load(locale,namespaces);
    const machine=await new DatabaseMachineTranslationSource(store,issue,generationPolicyVersion??undefined).load(locale,namespaces);
    v.staleRows+=BigInt(manual.staleKeys.length+machine.staleKeys.length);
    for(const entries of Object.values(machine.resources))v.retainedMachine+=BigInt(Object.keys(entries).length);
    const actualMachine=generationPolicyVersion===null?{}:machine.resources;
    const merged=mergeResources([local.resources,manual.resources,actualMachine]);
    for(const namespace of namespaces){
      deadlineCheck(until);
      const descriptors=catalogDescriptors().filter(d=>d.namespace===namespace);
      for(const d of descriptors){
        if(Object.hasOwn(local.resources[namespace]??{},d.key))v.localManual++;
        else if(Object.hasOwn(manual.resources[namespace]??{},d.key))v.persistentManual++;
        else if(Object.hasOwn(actualMachine[namespace]??{},d.key))v.machine++;
        else v.missingUnits++;
      }
      const compiled=await compileNamespaceBundle(locale,namespace,merged[namespace]??{},undefined,generationPolicyVersion);
      const row=stored.find(r=>r.locale===locale&&r.namespace===namespace);
      let status:LocalizationBundleCoverage["status"]="missing",served=compiled;
      if(row){
        try{
          if(!row.resources||typeof row.resources!=="object"||Array.isArray(row.resources))throw new CompiledBundleValidationError("Invalid bundle object");
          const verified=await verifyCompiledNamespaceBundle(locale,namespace,row.resources as Record<string,string>,undefined,generationPolicyVersion);
          if(verified.bundleVersion!==row.bundleVersion)status="stale";
          else{status="current";served=verified;if(verified.bundleVersion!==compiled.bundleVersion)v.bundlesDifferFromRows++;}
        }catch(error){if(!(error instanceof CompiledBundleValidationError)&&!(error instanceof TranslationValidationError))throw error;status="invalid";}
      }
      v[status==="missing"?"bundlesMissing":status==="current"?"bundlesCurrent":status==="stale"?"bundlesStale":"bundlesInvalid"]++;
      const servedMissing=BigInt(descriptors.length)-logicalKeyCount(served.resources,namespace);v.servedMissingUnits+=servedMissing;
      bundles.push({locale,namespace,status,storedVersion:row&&/^[a-f0-9]{64}$/.test(row.bundleVersion)?row.bundleVersion:null,
        servedVersion:served.bundleVersion,rowVersion:compiled.bundleVersion,servedMissing:servedMissing.toString()});
    }
  }
  // Unknown namespaces are retained invalid bundles, not an extra expected namespace or a hidden healthy result.
  v.bundlesInvalid+=BigInt(stored.filter(r=>!namespaces.includes(r.namespace)).length);
  // English is shipped directly from code; verify that canonical compilation is still valid too.
  const english=await new CanonicalEnglishSource().load("en",namespaces);
  for(const namespace of namespaces){deadlineCheck(until);await compileNamespaceBundle("en",namespace,english.resources[namespace],undefined,generationPolicyVersion);}
  return {observedAt,registry,active,bundles,registryValues:{configuredLocales:String(rows.length+1),activeLocales:String(active.length),registryHealthy:true,defaultEnglishValid:true,sourceStructuralValid:true} satisfies Values,
    uiValues:{...strings(v),machinePolicyConfigured:generationPolicyVersion!==null} as Values};
}

type RevisionRow=ContentTranslationRevision & QueryResultRow;
type TranslationRow=QueryResultRow & {contentType:"topic-title"|"post-body";contentId:string;revisionId:string;targetLocale:string;sourceLocale:string;translatedContent:string;origin:string;provider:string|null;providerModel:string|null;attribution:string|null};
const currentRevisions=`select 'topic-title'::text as "contentType",t.id as "contentId",t.current_title_revision_id as "revisionId",r.original_content as "originalContent",r.source_locale as "sourceLocale"
  from forum_topics t left join forum_topic_title_revisions r on r.id=t.current_title_revision_id and r.topic_id=t.id
  union all select 'post-body',p.id,p.current_revision_id,r.original_content,r.source_locale from forum_posts p left join forum_post_revisions r on r.id=p.current_revision_id and r.post_id=p.id`;
const results=`select 'topic-title'::text as "contentType",topic_id as "contentId",revision_id as "revisionId",target_locale as "targetLocale",source_locale as "sourceLocale",
  translated_content as "translatedContent",origin,provider,provider_model as "providerModel",attribution from forum_topic_title_translations
  union all select 'post-body',post_id,revision_id,target_locale,source_locale,translated_content,origin,provider,provider_model,attribution from forum_post_body_translations`;

/** Web-only current revisions/typed specs/heads and aggregate budgets. No domain operation is invoked. */
export async function readLocalizationWeb(c:Reader,active:readonly string[],until:number){
  deadlineCheck(until);
  const observedAt=(await c.query<{at:string}>(`select ${exactTime} at`)).rows[0].at;
  const revisions=await boundedRows<RevisionRow>(c,`select * from (${currentRevisions}) r`);
  deadlineCheck(until);
  const translations=await boundedRows<TranslationRow>(c,`select * from (${results}) r where "targetLocale"=any($1::text[])`,[active]);
  deadlineCheck(until);
  const resolutions=await boundedRows<{kind:string;id:string;locale:string;source:string}>(c,`select t.translation_kind kind,t.source_key id,t.target_locale locale,
    coalesce(tm.resolved_source_locale,bm.resolved_source_locale) source from translation_task_generation_heads h
    join translation_tasks t on (t.translation_kind,t.source_namespace,t.source_key,t.target_locale,t.generation)=
      (h.translation_kind,h.source_namespace,h.source_key,h.target_locale,h.current_generation)
    left join content_topic_title_translation_tasks tm on tm.task_id=t.id
    left join content_post_body_translation_tasks bm on bm.task_id=t.id
    left join forum_topics ft on ft.id=tm.topic_id left join forum_posts fp on fp.id=bm.post_id
    where t.target_locale=any($1::text[]) and
    ((tm.revision_source_locale='und' and tm.revision_id=ft.current_title_revision_id) or (bm.revision_source_locale='und' and bm.revision_id=fp.current_revision_id))`,[active]);
  const resolved=new Map(resolutions.map(r=>[JSON.stringify([r.kind,r.id,r.locale]),r.source]));
  const byIdentity=new Map(translations.map(r=>[JSON.stringify([r.contentType,r.contentId,r.revisionId,r.targetLocale]),r]));
  const v=counts(["titleRevisions","bodyRevisions","eligiblePairs","sameLocale","sourceUnresolved","noTranslatableContent","currentManual","currentMachine","missingPairs","invalidResults","staleRetainedResults"]);
  const current=new Map(revisions.map(r=>[JSON.stringify([r.contentType,r.contentId]),r.revisionId]));
  v.staleRetainedResults=BigInt(translations.filter(r=>current.get(JSON.stringify([r.contentType,r.contentId]))!==r.revisionId).length);
  if(BigInt(revisions.length)*BigInt(active.length)>100000n)throw new OwnerLocalizationUnavailableError("Localization pair verification capacity unavailable");
  for(const revision of revisions){
    deadlineCheck(until);
    if(!revision.sourceLocale||typeof revision.originalContent!=="string")throw new Error("Missing current content revision");
    v[revision.contentType==="topic-title"?"titleRevisions":"bodyRevisions"]++;
    const translatable=revision.contentType!=="post-body"||protectMarkdownForTranslation(revision.originalContent).segments.length>0;
    for(const locale of active){
      if(revision.sourceLocale===locale){v.sameLocale++;continue;}
      if(!translatable){v.noTranslatableContent++;continue;}
      // An unresolved source is not missing work; no detector is run from Monitoring.
      let sourceResolved=true;
      if(revision.sourceLocale==="und"){
        const source=resolved.get(JSON.stringify(["content-"+revision.contentType,revision.contentId,locale]));
        if(!source){v.sourceUnresolved++;sourceResolved=false;}
        if(source===locale){v.sameLocale++;continue;}
      }
      if(sourceResolved)v.eligiblePairs++;
      const raw=byIdentity.get(JSON.stringify([revision.contentType,revision.contentId,revision.revisionId,locale]));
      if(!raw){if(sourceResolved)v.missingPairs++;continue;}
      try{
        const selected=selectCurrentContentTranslation(revision,locale,storedRow(raw.contentType,raw.contentId,raw));
        if(selected.selected==="translation")v[selected.translation.provenance.origin==="machine"?"currentMachine":"currentManual"]++;
        else v.invalidResults++;
      }catch(error){if(!(error instanceof ContentTranslationInvalidRecordError))throw error;v.invalidResults++;}
    }
  }
  deadlineCheck(until);
  const taskRows=(await c.query<{kind:string;currentTasks:string;staleRevisionTasks:string;missingSpecifications:string;headsWithoutTask:string}>(`with heads as (
    select h.translation_kind,h.source_key,t.id task_id,h.target_locale,coalesce(tm.revision_id,bm.revision_id) revision_id,
      case when h.translation_kind='content-topic-title' then ft.current_title_revision_id when h.translation_kind='content-post-body' then fp.current_revision_id end current_revision
    from translation_task_generation_heads h left join translation_tasks t on (t.translation_kind,t.source_namespace,t.source_key,t.target_locale,t.generation)=
      (h.translation_kind,h.source_namespace,h.source_key,h.target_locale,h.current_generation)
    left join content_topic_title_translation_tasks tm on tm.task_id=t.id left join content_post_body_translation_tasks bm on bm.task_id=t.id
    left join forum_topics ft on h.translation_kind='content-topic-title' and ft.id=h.source_key
    left join forum_posts fp on h.translation_kind='content-post-body' and fp.id=h.source_key)
    select translation_kind kind,count(*) filter(where task_id is not null and (translation_kind='ui' or revision_id=current_revision))::text as "currentTasks",
      count(*) filter(where task_id is not null and translation_kind<>'ui' and revision_id is distinct from current_revision)::text as "staleRevisionTasks",
      count(*) filter(where task_id is not null and translation_kind<>'ui' and revision_id is null)::text as "missingSpecifications",
      count(*) filter(where task_id is null)::text as "headsWithoutTask" from heads group by translation_kind order by translation_kind`)).rows;
  const taskValues:Values={};
  for(const [i,kind]of ["ui","content-topic-title","content-post-body"].entries()){
    const row=taskRows.find(r=>r.kind===kind);
    for(const field of ["currentTasks","staleRevisionTasks","missingSpecifications","headsWithoutTask"] as const){
      const value=row?.[field]??"0";if(!/^\d+$/.test(value))throw new Error("Invalid task coverage aggregate");taskValues[`${field}${i}`]=value;
    }
  }
  if(taskRows.some(r=>!["ui","content-topic-title","content-post-body"].includes(r.kind)))throw new Error("Invalid generation kind");
  deadlineCheck(until);
  const {budget,windows}=await readLocalizationBudget(c,until);
  return {observedAt,contentValues:{...strings(v),...taskValues,runtimeEnabled:false,runtimeWired:false,providerCapabilityMeasured:false} satisfies Values,
    budgetValues:{...budget,windowsShown:String(windows.length),windowsTruncated:BigInt(budget.windowGroups)>BigInt(windows.length),limitsConfigured:false} satisfies Values,windows};
}

/** Sources commit/release first. Passive observation failure cannot erase successful measurements. */
export class PostgresOwnerLocalizationMonitoring {
  constructor(private readonly web:Pool,private readonly localization:ClientBase,private readonly generationPolicyVersion:string|null=null){}
  async readCurrent():Promise<OwnerLocalizationCurrent>{
    const until=performance.now()+10000;let localBegun=false;
    let local:Awaited<ReturnType<typeof readLocalizationSource>>;
    try{
      await this.localization.query("begin isolation level repeatable read read only");localBegun=true;
      await this.localization.query("set local statement_timeout='1500ms';set local lock_timeout='500ms'");
      local=await readLocalizationSource(this.localization,this.generationPolicyVersion,until);
      await this.localization.query("commit");localBegun=false;
    }catch(error){if(localBegun)try{await this.localization.query("rollback");}catch{/* Preserve source failure. */}
      if(error instanceof RegistryIntegrityError)throw new OwnerLocalizationUnavailableError("Registry integrity unavailable",{cause:error});throw error;}
    deadlineCheck(until);
    const c=await this.web.connect();let begun=false;let native:Awaited<ReturnType<typeof readLocalizationWeb>>;
    try{
      await c.query("begin isolation level repeatable read read only");begun=true;
      await c.query("set local statement_timeout='1500ms';set local lock_timeout='500ms'");
      native=await readLocalizationWeb(c,local.active.map(l=>l.tag),until);
      await c.query("commit");begun=false;
    }catch(error){if(begun)try{await c.query("rollback");}catch{/* Preserve source failure. */}throw error;}
    finally{c.release();}
    const monitors:LocalizationMonitor[]=[];
    for(const [i,currentValues]of [local.registryValues,local.uiValues,native.contentValues,native.budgetValues].entries()){
      const values:Values={...currentValues,sourceObservedAt:i<2?local.observedAt:native.observedAt,sourceConnection:i<2?"localization-database":"web-database"};
      const key=LOCALIZATION_KEYS[i];let recording:LocalizationMonitor["recording"]="available",coverageFrom:string|null=null,lastObservedAt:string|null=null;
      try{await recordOwnerMonitorSnapshot(this.web,key,values);}catch{recording="unavailable";}
      try{
        const row=(await this.web.query<{first:Date|null;last:Date|null}>(`select min(at) first,max(at) filter(where sampled) last from(
          select min(observed_at) at,true sampled from owner_monitor_observations where monitor_key=$1 and resource_scope='global'
          union all select max(observed_at),true from owner_monitor_observations where monitor_key=$1 and resource_scope='global'
          union all select min(e.occurred_at),false from owner_events e where e.source='operation' and e.monitor_key='background.translation' and $1=any(${TASK_FACT_MONITOR_SCOPES_SQL})
          ${key==='localization.content'?`union all select min(created_at),false from forum_topic_title_revisions
          union all select min(created_at),false from forum_post_revisions
          union all select min(a.occurred_at),false from admin_history a where $1=any(${ADMIN_MONITOR_SCOPES_SQL})`:''}) retained`,[key])).rows[0];
        coverageFrom=row.first?.toISOString()??null;lastObservedAt=row.last?.toISOString()??null;
      }catch{recording="unavailable";}
      monitors.push({key,schemaVersion:1,source:i<2?"localization-database":"web-database",quality:"measured",observedAt:i<2?local.observedAt:native.observedAt,values,recording,coverageFrom,lastObservedAt});
    }
    return {monitors,locales:local.active,bundles:local.bundles,budgetWindows:native.windows};
  }
}

export async function readLocalizationBudget(c:Reader,until:number){
  const budget=(await c.query<Record<string,string>>(`select count(*)::text as "budgetCounters",coalesce(sum(used_units),0)::text as "usedUnits",
    coalesce(sum(used_units) filter(where expires_at>transaction_timestamp()),0)::text as "activeUsedUnits",
    coalesce(sum(used_units) filter(where expires_at<=transaction_timestamp()),0)::text as "expiredUsedUnits",
    count(*) filter(where subject_key='_global')::text as "globalCounters",count(*) filter(where subject_key<>'_global')::text as "requesterCounters",
    count(distinct scope)::text as "scopeGroups",count(distinct(scope,window_start,expires_at,subject_key='_global'))::text as "windowGroups"
    from content_translation_request_budget_counters`)).rows[0];
  if(!budget||Object.values(budget).some(v=>!/^\d+$/.test(v)))throw new Error("Invalid budget aggregate");
  deadlineCheck(until);
  const windows=(await c.query<OwnerLocalizationCurrent["budgetWindows"][number]>(`select scope,case when subject_key='_global' then 'global' else 'requester' end pool,
    to_char(window_start at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as "windowStart",
    to_char(expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as "expiresAt",sum(used_units)::text as "usedUnits",count(*)::text as "counterCount"
    from content_translation_request_budget_counters group by scope,subject_key='_global',window_start,expires_at order by window_start desc,scope,pool,expires_at limit 20`)).rows;
  for(const w of windows)if(!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}@[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(w.scope)||!["global","requester"].includes(w.pool)||!/^\d+$/.test(w.usedUnits)||!/^\d+$/.test(w.counterCount)||!Number.isFinite(Date.parse(w.windowStart))||!Number.isFinite(Date.parse(w.expiresAt)))throw new Error("Invalid budget window");
  return {budget,windows};
}
