import {readFile,readdir} from "node:fs/promises";
import {Client,Pool} from "pg";
import {drizzle} from "drizzle-orm/node-postgres";
import {beforeAll,beforeEach,afterAll,expect,it} from "vitest";
import {DrizzleTranslationTaskStore} from "../../db/translation-task-store";
import {DrizzleUiTranslationPublicationStore} from "../../db/ui-translation-publication-store";
import {DrizzleUiTranslationStore} from "../../db/ui-translation-store";
import {PostgresOwnerOperationalFactSink} from "../../db/owner-operational-facts";
import {PostgresOwnerTaskMonitoring} from "../../db/owner-task-monitoring";
import {PostgresOwnerSa02History} from "../../db/owner-sa02-history";
import {UiTranslationTaskConsumer} from "../../app/localization/translation-task-consumer";
import {UiTranslationTaskExecutor} from "../../app/localization/translation-execution";
import {UiTranslationResultPublisher} from "../../app/localization/translation-publication";
import {TranslationProviderRouter} from "../../app/localization/translation-provider";
import {TranslationTaskReconciler} from "../../app/localization/translation-task-reconciliation";
import {InMemoryLocaleRegistry} from "../../app/localization/registry";
import {LocalTranslationSource} from "../../app/localization/sources";
import {manualTranslationPacks} from "../../app/localization/manual-packs";
import {IntlLocaleRulesProvider} from "../../app/localization/locale-rules";
import {canonicalEnglishCatalog} from "../../app/localization/catalog";
import {sourceFingerprint} from "../../app/localization/fingerprint";
import {uiTranslationJobIdentity} from "../../app/localization/ui-translation-service";
import {DrizzleForumRepository} from "../../db/forum-repository";
import {DrizzleContentTranslationStore} from "../../db/content-translation-store";
import {DrizzleContentTopicTitlePlanningStore} from "../../db/content-topic-title-task-store";
import {DrizzleContentPostBodyPlanningStore} from "../../db/content-post-body-task-store";
import {DrizzleContentTopicTitleExecutionStore} from "../../db/content-topic-title-execution-store";
import {DrizzleContentPostBodyExecutionStore} from "../../db/content-post-body-execution-store";
import {ContentTopicTitleTranslationPlanner} from "../../app/localization/content-translation-planning";
import {ContentPostBodyTranslationPlanner} from "../../app/localization/content-post-body-planning";
import {ContentSourceLocaleResolver,ThresholdContentSourceLocalePolicy} from "../../app/localization/content-source-locale";
import {TinyLdContentSourceLocaleDetector} from "../../app/localization/tinyld-source-locale-detector";
import {ContentTranslationService} from "../../app/localization/content-translation";
import {RoutedContentTopicTitleProviderCapability,RoutedContentPostBodyProviderCapability} from "../../app/localization/content-translation-provider";
import {ContentTopicTitleTaskConsumer} from "../../app/localization/content-translation-task-consumer";
import {ContentPostBodyTaskConsumer} from "../../app/localization/content-post-body-task-consumer";
import {ContentTopicTitleResultPublisher} from "../../app/localization/content-translation-publication";
import {ContentPostBodyResultPublisher} from "../../app/localization/content-post-body-publication";
import {ContentTopicTitleAllowanceGate,ContentPostBodyAllowanceGate} from "../../app/localization/content-provider-allowance";
import {ContentTopicTitleTaskExecutor} from "../../app/localization/content-translation-execution";
import {ContentPostBodyTaskExecutor} from "../../app/localization/content-post-body-execution";
import {PostgresOwnerAccountLifecycleCommand} from "../../db/owner-account-lifecycle";
import {PostgresOwnerUserHistory} from "../../db/owner-user-history";
import {CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION} from "../../app/localization/content-markdown-translation";

const url=process.env.DATABASE_URL;
if(!url||!["127.0.0.1","localhost"].includes(new URL(url).hostname)||!new URL(url).pathname.endsWith("_test"))throw new Error("Disposable local PG17 required");
const schema="sa07_task_monitoring_test",options="-c search_path="+schema;
const c=new Client({connectionString:url,options}),pool=new Pool({connectionString:url,options,max:6});
const db=drizzle(pool),sink=new PostgresOwnerOperationalFactSink(pool),tasks=new DrizzleTranslationTaskStore(db,sink);
beforeAll(async()=>{
  await c.connect();await c.query("drop schema if exists "+schema+" cascade;create schema "+schema);
  for(const name of(await readdir("drizzle")).filter(n=>/^\d{4}_.+\.sql$/.test(n)).sort())
    await c.query((await readFile("drizzle/"+name,"utf8")).replaceAll('"public".','"'+schema+'".'));
});
beforeEach(async()=>{await c.query("truncate translation_tasks,translation_task_generation_heads,owner_events,owner_monitor_observations,ui_translations,ui_translation_bundles cascade");});
afterAll(async()=>{await pool.end();await c.query("drop schema if exists "+schema+" cascade");await c.end();});
async function job(key="heading",exact=true){
  const source=canonicalEnglishCatalog.common.heading;
  const specification={translationKind:"ui" as const,sourceIdentity:{namespace:"common",key},
    sourceFingerprint:exact?await sourceFingerprint(source):"b".repeat(64),targetLocale:"fr",generationPolicyVersion:"ui-policy-v1"};
  return {...specification,taskIdentity:await uiTranslationJobIdentity(specification)};
}
async function events(){return(await c.query("select id,kind,entity_id,payload,occurrence_key,actor_user_id from owner_events where source='operation' order by position")).rows;}
function executor(onCall:()=>void=()=>{}){
  const localeRules=new IntlLocaleRulesProvider(),localeRegistry=new InMemoryLocaleRegistry([
    {tag:"fr",translationStatus:"draft",publicationStatus:"active",direction:"ltr",fallbackChain:["en"],nativeName:"Français"},
  ]);
  const dependencies={localeRules,localeRegistry,localManualSource:new LocalTranslationSource(manualTranslationPacks),
    persistentStore:new DrizzleUiTranslationStore(db),generationPolicyVersion:"ui-policy-v1",tasks};
  return new UiTranslationTaskExecutor({...dependencies,consumer:new UiTranslationTaskConsumer({...dependencies,leaseDurationMs:60000}),
    providerRouter:new TranslationProviderRouter([{providerId:"external-fixture",supports:()=>true,translate:async()=>{
      onCall();return {value:"Forum traduit",provenance:{provider:"external-fixture",model:"fixture-v1",origin:"machine" as const}};
    }}]),
    publisher:new UiTranslationResultPublisher({...dependencies,publications:new DrizzleUiTranslationPublicationStore(db,undefined,sink)}),
    failures:tasks,operational:sink});
}
it("real concurrent UI planning/claim/provider/publication records each committed transition once and current reads create no task facts",async()=>{
  const specification=await job();const planned=await Promise.all(Array.from({length:6},()=>tasks.upsertPending(specification,{freshPlanning:true})));
  expect(new Set(planned.map(t=>t.id)).size).toBe(1);expect((await events()).map(e=>e.kind)).toEqual(["task.planned"]);
  let calls=0;const run=executor(()=>calls++);
  expect(await run.execute({translationTaskId:planned[0].id})).toMatchObject({outcome:"published",delivery:"ack"});
  expect(await run.execute({translationTaskId:planned[0].id})).toMatchObject({outcome:"terminal"});expect(calls).toBe(1);
  const rows=await events();expect(rows.map(e=>e.kind)).toEqual(["task.planned","task.claimed","task.completed","integration.translationCall"]);
  expect(new Set(rows.map(e=>e.occurrence_key)).size).toBe(4);expect(rows.every(e=>e.actor_user_id===null)).toBe(true);
  expect(rows[3].payload).toMatchObject({calls:1,succeeded:1,failed:0});
  expect(JSON.stringify(rows)).not.toContain("sourceFingerprint");expect(JSON.stringify(rows)).not.toContain("claimToken");expect(JSON.stringify(rows)).not.toContain("Forum traduit");
  const current=new PostgresOwnerTaskMonitoring(pool);const first=await current.readCurrent();await current.readCurrent();
  expect(first.values).toMatchObject({completed:"1",pending:"0",runtimeWired:false,runtimeEnabled:false,bestEffort:true});
  expect((await events()).map(e=>e.id)).toEqual(rows.map(e=>e.id));
  expect((await c.query("select count(*)::int n from owner_monitor_observations where monitor_key='background.translation'")).rows[0].n).toBe(1);
  const history=new PostgresOwnerSa02History(pool),global=await history.readTimeline({origin:"operational-event"}),scoped=await history.readTimeline({area:"background",monitorKey:"background.translation",origin:"operational-event"});
  expect(scoped.entries).toEqual(global.entries);expect(global.entries).toHaveLength(4);
  expect((await history.readTimeline({area:"integrations",monitorKey:"integrations.translation",kind:"integration.translationCall"})).entries.map(e=>e.id)).toEqual([rows[3].id]);
});
it("real retry release, terminal exhaustion and stale ownership never invent claim-lost or duplicate events",async()=>{
  const pending=await tasks.upsertPending(await job("retry",false),{freshPlanning:true});
  const first=await tasks.claim(pending.id,60000);if(first.outcome!=="claimed")throw Error("claim");
  await tasks.recordFailure(pending.id,first.task.claimToken,{disposition:"retryable",code:"provider-temporary"});
  const second=await tasks.claim(pending.id,60000);if(second.outcome!=="claimed")throw Error("claim");
  expect(await tasks.markStale(pending.id,first.task.claimToken)).toBe(false);
  await tasks.recordFailure(pending.id,second.task.claimToken,{disposition:"terminal",code:"provider-terminal"});
  expect(await tasks.recordFailure(pending.id,second.task.claimToken,{disposition:"terminal",code:"provider-terminal"})).toEqual({outcome:"claim-lost"});
  expect((await events()).map(e=>e.kind)).toEqual(["task.planned","task.claimed","task.retryReleased","task.claimed","task.failed"]);
  const current=await new PostgresOwnerTaskMonitoring(pool).readCurrent();expect(current.values).toMatchObject({failed:"1",failedTerminal:"1",failure0Code:"provider-terminal",failure0Count:"1"});
});
it("publication rollback and a lost outer COMMIT acknowledgement produce no successful transition fact",async()=>{
  const pending=await tasks.upsertPending(await job(),{freshPlanning:true});const claim=await tasks.claim(pending.id,60000);if(claim.outcome!=="claimed")throw Error("claim");
  await c.query("create function sa07_bundle_fault() returns trigger language plpgsql as $$begin raise exception 'SA07_PRIVATE_SQL';end$$;create trigger sa07_bundle_fault before insert on ui_translation_bundles for each row execute function sa07_bundle_fault()");
  try{await expect(new DrizzleUiTranslationPublicationStore(db,undefined,sink).publishClaimedMachineResult({task:claim.task,value:"Forum traduit",provenance:{provider:"external-fixture",model:"fixture-v1",origin:"machine"}})).rejects.toThrow();}
  finally{await c.query("drop trigger sa07_bundle_fault on ui_translation_bundles;drop function sa07_bundle_fault()");}
  expect((await tasks.findById(pending.id))?.status).toBe("processing");expect((await c.query("select count(*)::int n from ui_translations")).rows[0].n).toBe(0);
  expect((await events()).some(e=>e.kind==="task.completed")).toBe(false);
  const unknown=new Proxy(db,{get(target,property){if(property==="transaction")return async(...args:Parameters<typeof db.transaction>)=>{await target.transaction(...args);throw Error("commit acknowledgement lost");};const value=Reflect.get(target,property);return typeof value==="function"?value.bind(target):value;}});
  await expect(new DrizzleTranslationTaskStore(unknown,sink).upsertPending(await job("unknown",false),{freshPlanning:true})).rejects.toThrow("acknowledgement lost");
  expect((await c.query("select count(*)::int n from translation_tasks where source_key='unknown'")).rows[0].n).toBe(1);
  expect((await events()).filter(e=>e.kind==="task.planned")).toHaveLength(1);
});
it("a failed actual journal insert cannot veto an already committed task plan",async()=>{
  await c.query("create function sa07_fact_fault() returns trigger language plpgsql as $$begin raise exception 'SA07_PRIVATE_SQL';end$$;create trigger sa07_fact_fault before insert on owner_events for each row execute function sa07_fact_fault()");
  try{const planned=await tasks.upsertPending(await job(),{freshPlanning:true});expect((await tasks.findById(planned.id))?.status).toBe("pending");expect(await events()).toEqual([]);}
  finally{await c.query("drop trigger sa07_fact_fault on owner_events;drop function sa07_fact_fault()");}
});

it("the same exact source occurrence can be appended twice without a false dedup mismatch",async()=>{
  let replays=0;
  const duplicate={append:async(fact:Parameters<typeof sink.append>[0])=>{await sink.append(fact);await sink.append(fact);replays++;}};
  await new DrizzleTranslationTaskStore(db,duplicate).upsertPending(await job(),{freshPlanning:true});
  expect(replays).toBe(1);expect(await events()).toHaveLength(1);
});
it("waiting for the journal append lock holds no task lock after the real outer COMMIT",async()=>{
  const lock=new Client({connectionString:url,options});await lock.connect();await lock.query("begin;select pg_advisory_xact_lock(1447641935,2)");
  const pending=tasks.upsertPending(await job(),{freshPlanning:true});
  try{
    let id:string|undefined;for(let n=0;n<100;n++){id=(await c.query("select id from translation_tasks limit 1")).rows[0]?.id;if(id)break;await new Promise(r=>setTimeout(r,10));}
    expect(id).toBeDefined();await c.query("begin");await c.query("select id from translation_tasks where id=$1 for update nowait",[id]);await c.query("commit");
  }finally{await lock.query("rollback");await lock.end();}
  await pending;expect(await events()).toHaveLength(1);
});
it("actual reconciler reservation and accepted enqueue yield one run summary and never a completed job fact",async()=>{
  await tasks.upsertPending(await job("reconcile-a",false),{freshPlanning:true});await tasks.upsertPending(await job("reconcile-b",false),{freshPlanning:true});
  let enqueues=0;const result=await new TranslationTaskReconciler(tasks,{enqueue:async()=>{if(++enqueues===2)throw Error("external transport failure");}},sink).reconcile({limit:2,pendingOlderThanMs:0});
  expect(result).toMatchObject({selected:2,enqueued:1,enqueueFailures:1,outcome:"partial-failure"});
  const rows=await events();expect(rows.filter(e=>e.kind==="task.reconciliationPass")).toHaveLength(1);expect(rows.some(e=>e.kind==="task.completed")).toBe(false);
  expect((await new PostgresOwnerTaskMonitoring(pool).readCurrent()).values).toMatchObject({pending:"2",reconciliationAttempted:"2"});
});

it("keeps actual reconciliationPass visible and kind-filterable in Integrations scoped History with one source identity",async()=>{
  await tasks.upsertPending(await job("reconcile-history",false),{freshPlanning:true});
  const result=await new TranslationTaskReconciler(tasks,{enqueue:async()=>{}},sink).reconcile({limit:1,pendingOlderThanMs:0});
  expect(result).toMatchObject({selected:1,enqueued:1,enqueueFailures:0,outcome:"complete"});
  expect((await events()).filter(event=>event.kind==="task.reconciliationPass")).toHaveLength(1);

  const reader=new PostgresOwnerSa02History(pool);
  const scope={area:"integrations" as const,monitorKey:"integrations.translation" as const,origin:"operational-event" as const};
  const unfiltered=await reader.readTimeline(scope);
  const filtered=await reader.readTimeline({...scope,kind:"task.reconciliationPass"});
  expect(filtered.entries).toHaveLength(1);
  expect(filtered.entries[0]).toMatchObject({
    origin:"operational-event",kind:"task.reconciliationPass",
    monitorKeys:expect.arrayContaining(["background.translation","integrations.translation"]),
  });
  const originalId=filtered.entries[0].id;
  expect(unfiltered.entries.filter(entry=>entry.kind==="task.reconciliationPass").map(entry=>entry.id)).toEqual([originalId]);
  expect((await reader.readTimeline({area:"integrations",monitorKey:"integrations.translation",kind:"task.reconciliationPass"})).entries.map(entry=>entry.id)).toEqual([originalId]);
  expect((await reader.readTimeline({area:"background",monitorKey:"background.translation",origin:"operational-event",kind:"task.reconciliationPass"})).entries.map(entry=>entry.id)).toEqual([originalId]);
  expect((await reader.readTimeline({origin:"operational-event",kind:"task.reconciliationPass"})).entries.map(entry=>entry.id)).toEqual([originalId]);
});

it.each(["topic-title","post-body"] as const)("real %s planning/allowance/claim/publication continues after actual Owner deactivation without invented person/provider events",async kind=>{
  const actor=crypto.randomUUID(),owner=crypto.randomUUID(),topic=crypto.randomUUID(),post=crypto.randomUUID();
  await c.query('insert into "user"(id,name,email) values($1,$1,$1||\'@test.invalid\'),($2,$2,$2||\'@test.invalid\')',[actor,owner]);
  await new DrizzleForumRepository(db,{cooldownMs:0,now:()=>new Date()}).createTopicWithInitialPost({id:topic,sectionId:"help-solutions-questions",authorId:actor,
    titleRevision:{id:crypto.randomUUID(),sourceLocale:"en",originalContent:"SA07 private source title"},
    initialPost:{id:post,topicId:topic,authorId:actor,bodyRevision:{id:crypto.randomUUID(),sourceLocale:"en",originalContent:"SA07 private source paragraph.\n\nSecond private source paragraph."}}});
  const localeRegistry=new InMemoryLocaleRegistry([{tag:"fr",translationStatus:"draft",publicationStatus:"active",direction:"ltr",fallbackChain:["en"],nativeName:"Français"}]);
  let calls=0,deferred=true;
  const providerRouter=new TranslationProviderRouter([{providerId:"external-fixture",supports:()=>true,translate:async request=>{
    const protectedTokens=typeof request.source==="string"?request.source.match(/⟦VICOPROTECTED\d+X\d+X\d+⟧/gu)??[]:[];
    calls++;return {value:["Texte traduit",...protectedTokens].join(" "),provenance:{provider:"external-fixture",model:"fixture-v1",origin:"machine" as const}};
  }}]);
  const translations=new DrizzleContentTranslationStore(db);
  const common={localeRegistry,sourceLocaleResolver:new ContentSourceLocaleResolver(new TinyLdContentSourceLocaleDetector(),new ThresholdContentSourceLocalePolicy(0.8,()=>true)),
    contentTranslations:new ContentTranslationService(translations),enqueuer:{enqueue:async()=>{}},generationPolicyVersion:"content-v1"};
  const budget={subjectKey:"E".repeat(43),cost:1,windowSeconds:60,global:{name:"sa07-global",version:"v1",limit:1000},requester:{name:"sa07-requester",version:"v1",limit:1000}};
  const allowanceCommon={store:tasks,tasks,providerRouter,localeRegistry,translations,generationPolicyVersion:"content-v1",admissionLeaseDurationMs:60000,
    adapter:{admit:async()=>deferred?{outcome:"deferred" as const,retryNotBefore:new Date(Date.now()+60000),reason:"quota"}:
      {outcome:"admitted" as const,reservationReference:"SA07_PRIVATE_RESERVATION"}}};
  const planStore=kind==="topic-title"?new DrizzleContentTopicTitlePlanningStore(db,sink):new DrizzleContentPostBodyPlanningStore(db,sink);
  const revision=await planStore.readCurrentRevision(kind==="topic-title"?topic:post);if(!revision)throw Error("revision");
  const planned=kind==="topic-title"?
    await new ContentTopicTitleTranslationPlanner({...common,tasks:new DrizzleContentTopicTitlePlanningStore(db,sink),providerCapability:new RoutedContentTopicTitleProviderCapability(providerRouter)}).planAndDispatch(revision,"fr",budget,actor):
    await new ContentPostBodyTranslationPlanner({...common,tasks:new DrizzleContentPostBodyPlanningStore(db,sink),providerCapability:new RoutedContentPostBodyProviderCapability(providerRouter)}).planAndDispatch(revision,"fr",budget,actor);
  if(planned.kind!=="queued")throw Error("Expected queued task: "+JSON.stringify(planned));
  await new PostgresOwnerAccountLifecycleCommand(pool,owner).deactivate({actorId:owner,targetId:actor,operationId:crypto.randomUUID()});
  let run:(()=>Promise<{outcome:string}>);
  if(kind==="topic-title"){
    const store=new DrizzleContentTopicTitleExecutionStore(db,sink),dependencies={tasks,revisions:store,translations,localeRegistry,generationPolicyVersion:"content-v1"};
    const actual=new ContentTopicTitleTaskExecutor({consumer:new ContentTopicTitleTaskConsumer({...dependencies,leaseDurationMs:60000}),
      allowance:new ContentTopicTitleAllowanceGate({...allowanceCommon,revisions:store}),providerRouter,failures:tasks,
      publisher:new ContentTopicTitleResultPublisher({...dependencies,publications:store}),operational:sink});
    run=()=>actual.execute({translationTaskId:planned.task.id});
  }else{
    const store=new DrizzleContentPostBodyExecutionStore(db,sink),dependencies={tasks,revisions:store,translations,localeRegistry,generationPolicyVersion:"content-v1",protectedContentPolicyVersion:CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION};
    const actual=new ContentPostBodyTaskExecutor({consumer:new ContentPostBodyTaskConsumer({...dependencies,leaseDurationMs:60000}),
      allowance:new ContentPostBodyAllowanceGate({...allowanceCommon,revisions:store,protectedContentPolicyVersion:CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,executionBounds:{maxSegments:20,maxTotalSegmentCharacters:20000}}),providerRouter,failures:tasks,
      publisher:new ContentPostBodyResultPublisher({...dependencies,publications:store}),executionBounds:{maxSegments:20,maxTotalSegmentCharacters:20000},operational:sink});
    run=()=>actual.execute({translationTaskId:planned.task.id});
  }
  expect(await run()).toMatchObject({outcome:"allowance-deferred"});expect(calls).toBe(0);
  expect((await new PostgresOwnerTaskMonitoring(pool).readCurrent()).values).toMatchObject({allowanceDeferred:"1",reason0Code:"other"});
  await c.query("update translation_tasks set allowance_updated_at=clock_timestamp()-interval '1 minute',allowance_retry_not_before=clock_timestamp()-interval '1 second' where id=$1",[planned.task.id]);
  deferred=false;const outcome=await run();expect(outcome,JSON.stringify(outcome)).toMatchObject({outcome:"published"});expect(calls).toBeGreaterThan(0);
  const rows=await events();expect(rows.map(e=>e.kind)).toEqual(["task.planned","task.allowanceDeferred","task.allowanceAdmitted","task.claimed","task.completed","integration.translationCall"]);
  expect(rows[0].actor_user_id).toBe(actor);expect(rows.slice(1).every(e=>e.actor_user_id===null)).toBe(true);
  expect(JSON.stringify(rows)).not.toContain("SA07_PRIVATE_RESERVATION");expect(JSON.stringify(rows)).not.toContain("SA07 private source");expect(JSON.stringify(rows)).not.toContain("Texte traduit");
  expect(rows.at(-1)!.payload).toMatchObject({calls,succeeded:calls,failed:0});
  const global=(await new PostgresOwnerSa02History(pool).readTimeline({origin:"operational-event"})).entries;
  const person=(await new PostgresOwnerUserHistory(pool).readHistory(actor)).entries.filter(e=>e.origin==="operational-event");
  expect(person).toEqual(global.filter(e=>e.values.actorUserId===actor));expect(person).toHaveLength(1);
  expect((await c.query("select status from translation_tasks where id=$1",[planned.task.id])).rows[0].status).toBe("completed");
});

it("counts the full backlog beyond a page, keeps current fresh inside the sample gate, and pages original operational facts",async()=>{
  for(let n=0;n<61;n++)await tasks.upsertPending(await job("backlog-"+n,false),{freshPlanning:true});
  const monitor=new PostgresOwnerTaskMonitoring(pool),first=await monitor.readCurrent();
  expect(first.values).toMatchObject({pending:"61",pendingUnattempted:"61",kind0:"61",processing:"0",oldestDeferredAgeMs:null});
  expect(first.values.pending).toBe((await c.query("select count(*)::text n from translation_tasks where status='pending'")).rows[0].n);
  const sample=(await c.query("select id,value from owner_monitor_observations where monitor_key='background.translation'")).rows[0];
  await tasks.upsertPending(await job("one-more",false),{freshPlanning:true});
  const second=await monitor.readCurrent();expect(second.values.pending).toBe("62");
  expect((await c.query("select id,value from owner_monitor_observations where monitor_key='background.translation'")).rows).toEqual([sample]);
  const reader=new PostgresOwnerSa02History(pool),seen=new Set<string>();let before:string|undefined;
  do{const page=await reader.readTimeline({area:"background",monitorKey:"background.translation",origin:"operational-event",kind:"task.planned",before});
    for(const fact of page.entries){expect(seen.has(fact.id)).toBe(false);seen.add(fact.id);}
    if(page.next)expect(page.next.startsWith("v2.")).toBe(true);before=page.next??undefined;
  }while(before);
  expect(seen.size).toBe(62);
});

it("observation failure preserves measured task values while a real source failure never becomes a zero",async()=>{
  await tasks.upsertPending(await job(),{freshPlanning:true});
  await c.query("create function sa07_sample_fault() returns trigger language plpgsql as $$begin raise exception 'SA07_PRIVATE_SQL';end$$;create trigger sa07_sample_fault before insert on owner_monitor_observations for each row execute function sa07_sample_fault()");
  try{expect(await new PostgresOwnerTaskMonitoring(pool).readCurrent()).toMatchObject({recording:"unavailable",values:{pending:"1"}});}
  finally{await c.query("drop trigger sa07_sample_fault on owner_monitor_observations;drop function sa07_sample_fault()");}
  await c.query("alter table translation_tasks rename to sa07_hidden_tasks");
  try{await expect(new PostgresOwnerTaskMonitoring(pool).readCurrent()).rejects.toMatchObject({code:"42P01"});}
  finally{await c.query("alter table sa07_hidden_tasks rename to translation_tasks");}
});

it("scoped operational branches use canonical monitor indexes among unrelated retained Owner events",async()=>{
  for(let n=0;n<40;n++)await tasks.upsertPending(await job("indexed-"+n,false),{freshPlanning:true});
  await c.query(`insert into owner_events(id,occurred_at,source,occurrence_key,kind,monitor_key,payload)
    select gen_random_uuid(),clock_timestamp()+interval '1 minute','system','sa07-plan-'||n,'system.requestFailed','system.requests','{}'::jsonb from generate_series(1,10000)n`);
  await c.query("analyze owner_events");
  let statement="",args:unknown[]=[];
  const reader=new PostgresOwnerSa02History({query:(async(text:string,values:unknown[])=>{if(text.startsWith("with candidates as")){statement=text;args=values;}return pool.query(text,values);})as Pool["query"]});
  const first=await reader.readTimeline({area:"background",monitorKey:"background.translation",origin:"operational-event"});expect(first.entries).toHaveLength(25);
  for(const before of [undefined,first.next!]){
    await reader.readTimeline({area:"background",monitorKey:"background.translation",origin:"operational-event",before});
    const plan=(await c.query("explain(analyze,buffers,format json) "+statement,args)).rows[0]["QUERY PLAN"][0];
    const nodes:Array<Record<string,unknown>>=[];const walk=(n:Record<string,unknown>)=>{nodes.push(n);for(const child of n.Plans as Array<Record<string,unknown>>??[])walk(child);};walk(plan.Plan);
    expect(nodes.some(n=>n["Index Name"]==="owner_events_scope_time_idx")).toBe(true);
    expect(nodes.filter(n=>n["Node Type"]==="Seq Scan"&&n["Relation Name"]==="owner_events")).toEqual([]);
  }
});

it("a broken native task state is an invariant failure rather than a measured empty backlog",async()=>{
  const planned=await tasks.upsertPending(await job(),{freshPlanning:true});
  const constraints=(await c.query<{name:string;definition:string}>("select conname name,pg_get_constraintdef(oid) definition from pg_constraint where conrelid='translation_tasks'::regclass and contype='c'")).rows;
  const quote=(name:string)=>'"'+name.replaceAll('"','""')+'"';
  try{
    for(const row of constraints)await c.query("alter table translation_tasks drop constraint "+quote(row.name));
    await c.query("update translation_tasks set status='broken-state' where id=$1",[planned.id]);
    await expect(new PostgresOwnerTaskMonitoring(pool).readCurrent()).rejects.toThrow("Invalid native task state");
  }finally{
    await c.query("update translation_tasks set status='pending' where id=$1",[planned.id]);
    for(const row of constraints)await c.query("alter table translation_tasks add constraint "+quote(row.name)+" "+row.definition);
  }
});
