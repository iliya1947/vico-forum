import {readFile,readdir} from "node:fs/promises";
import {Client,Pool} from "pg";
import {drizzle} from "drizzle-orm/node-postgres";
import {beforeAll,beforeEach,afterAll,it,expect} from "vitest";
import {PostgresOwnerLocalizationMonitoring,OwnerLocalizationUnavailableError,readLocalizationSource} from "../../db/owner-localization-monitoring";
import {PostgresOwnerSa02History} from "../../db/owner-sa02-history";
import {PostgresOwnerOperationalFactSink} from "../../db/owner-operational-facts";
import {DrizzleTranslationTaskStore} from "../../db/translation-task-store";
import {DrizzleForumRepository} from "../../db/forum-repository";
import {DrizzleContentTranslationStore} from "../../db/content-translation-store";
import {DrizzleUiTranslationBundleStore} from "../../db/ui-translation-bundle-store";
import {DrizzleUiTranslationStore} from "../../db/ui-translation-store";
import {catalogDescriptors,canonicalEnglishCatalog} from "../../app/localization/catalog";
import {sourceFingerprint} from "../../app/localization/fingerprint";
import {uiTranslationJobIdentity} from "../../app/localization/ui-translation-service";
import {compileNamespaceBundle} from "../../app/localization/bundles";
import {HELP_SOLUTIONS_SERVICE_SECTION_ID} from "../../db/forum-identifiers";
import {LOCALIZATION_KEYS} from "../../db/owner-localization-monitoring";
import {DatabaseManualTranslationSource} from "../../app/localization/persistent-sources";
import {TranslationResourceLoader} from "../../app/localization/resource-loader";
import {LocalTranslationSource,CanonicalEnglishSource} from "../../app/localization/sources";
import {attributedQuoteMarkdown} from "../../app/forum/quote-markdown";
import {manualTranslationPacks} from "../../app/localization/manual-packs";
import {DrizzleContentTopicTitlePlanningStore} from "../../db/content-topic-title-task-store";
import {contentTopicTitleTaskSpecification} from "../../app/localization/content-translation-planning";

const url=process.env.DATABASE_URL;
if(!url||!["localhost","127.0.0.1"].includes(new URL(url).hostname)||!new URL(url).pathname.endsWith("_test"))throw Error("Own disposable PG17 required");
const schema="sa07_localization_monitoring_test",options="-c search_path="+schema;
const c=new Client({connectionString:url,options}),local=new Client({connectionString:url,options}),pool=new Pool({connectionString:url,options,max:4});
const current=new PostgresOwnerLocalizationMonitoring(pool,local),history=new PostgresOwnerSa02History(pool),db=drizzle(pool);
const value=(s:Awaited<ReturnType<typeof current.readCurrent>>,key:string)=>s.monitors.find(m=>m.key===key)!.values;
beforeAll(async()=>{
  await c.connect();await local.connect();await c.query("drop schema if exists "+schema+" cascade;create schema "+schema);
  for(const file of(await readdir("drizzle")).filter(n=>/^\d{4}_.+\.sql$/.test(n)).sort())await c.query((await readFile("drizzle/"+file,"utf8")).replaceAll('"public".','"'+schema+'".'));
});
beforeEach(async()=>{await c.query('truncate locales,"user",translation_tasks,translation_task_generation_heads,ui_translations,ui_translation_bundles,content_translation_request_budget_counters,owner_events,owner_monitor_observations cascade');await locale("fr");await locale("de");});
afterAll(async()=>{await pool.end();await local.end();await c.query("drop schema if exists "+schema+" cascade");await c.end();});
async function locale(tag:string){await c.query("insert into locales(tag,translation_status,publication_status,direction,fallback_chain,aliases,match_tags,native_name,presentation_metadata) values($1,'draft','active','ltr','{en}','{}','{}',$1,'{}')",[tag]);}
async function approved(locale:string,key:string,origin="persistent_manual",fingerprint?:string,payload:unknown="Traduction privée"){
  const descriptor=catalogDescriptors().find(d=>d.key===key);
  await c.query(`insert into ui_translations(locale,namespace,key,origin,status,source_fingerprint,translated_payload,provider,provider_model,generation_policy_version)
    values($1,'common',$2,$3,'approved',$4,$5::jsonb,$6,$7,$8)`,[locale,key,origin,fingerprint??(descriptor?await sourceFingerprint(descriptor):"a".repeat(64)),JSON.stringify(payload),origin==="machine"?"private-provider":null,origin==="machine"?"private-model":null,origin==="machine"?"private-policy":null]);
}
async function content(sourceLocale="fr",body="A private message in natural language. SA07_L_PRIVATE_BODY"){
  const author=crypto.randomUUID();await c.query('insert into "user"(id,name,email) values($1,$1,$2)',[author,author+"@test.invalid"]);
  const id=crypto.randomUUID(),post=crypto.randomUUID(),title=crypto.randomUUID(),revision=crypto.randomUUID();
  await new DrizzleForumRepository(db,{cooldownMs:0,now:()=>new Date()}).createTopicWithInitialPost({id,sectionId:HELP_SOLUTIONS_SERVICE_SECTION_ID,authorId:author,titleRevision:{id:title,sourceLocale,originalContent:"SA07_L_PRIVATE_TITLE"},initialPost:{id:post,topicId:id,authorId:author,bodyRevision:{id:revision,sourceLocale,originalContent:body}}});
  return {id,post,title,revision,author};
}
it("compares the full shipped manifest and approved source precedence with actual served bundle rules",async()=>{
  await approved("fr","heading");await approved("fr","heading","machine");await approved("de","heading","machine");
  await approved("fr","stageSummary","persistent_manual","a".repeat(64));await approved("fr","SA07_L_PRIVATE_UNKNOWN");
  const empty=await compileNamespaceBundle("fr","common",{});await new DrizzleUiTranslationBundleStore(db).put(empty);
  await c.query("insert into ui_translation_bundles(locale,namespace,bundle_version,resources) values('de','common',$1,'{}')",["b".repeat(64)]);
  const s=await current.readCurrent(),v=value(s,"localization.ui"),expected=BigInt(catalogDescriptors().length)*2n;
  expect(v).toMatchObject({expectedUnits:expected.toString(),approvedRows:"5",persistentManual:"1",machine:"0",retainedMachine:"2",staleRows:"1",invalidRows:"1",missingUnits:(expected-1n).toString(),bundlesCurrent:"1",bundlesStale:"1",bundlesDifferFromRows:"1",servedMissingUnits:expected.toString(),machinePolicyConfigured:false});
  const actual=new TranslationResourceLoader([new LocalTranslationSource(manualTranslationPacks),new DatabaseManualTranslationSource(new DrizzleUiTranslationStore(db)),new CanonicalEnglishSource()],new DrizzleUiTranslationBundleStore(db),null);
  const snapshot=await actual.load({translationLocale:"fr",fallbackLocales:["en"],direction:"ltr",formatting:{locale:"fr",timeZone:"UTC"},nativeName:"fr",presentationMetadata:{}},["common"]);
  expect(snapshot.resourcesByLocale.fr.common.heading).toBeUndefined();expect(s.bundles.find(b=>b.locale==="fr")!.servedVersion).toBe(snapshot.bundleVersions.fr.common);
  expect(JSON.stringify(s)).not.toMatch(/Traduction privée|SA07_L_PRIVATE|sourceFingerprint|private-provider|private-model|private-policy/);
  expect((await c.query("select count(*)::text n from owner_monitor_observations where monitor_key like 'localization.%'")).rows[0].n).toBe("4");
  for(const key of LOCALIZATION_KEYS){const page=await history.readTimeline({monitorKey:key});expect(page.entries.some(e=>e.kind==="monitor.observed"&&e.values.sourceObservedAt===s.monitors.find(m=>m.key===key)!.observedAt)).toBe(true);}
});
it("classifies invalid bundles separately and measures fresh current state inside the sample gate",async()=>{
  await c.query("insert into ui_translation_bundles(locale,namespace,bundle_version,resources) values('de','common',$1,'{\"unknown-private-key\":\"PRIVATE_TEXT\"}')",["a".repeat(64)]);
  const a=await current.readCurrent();expect(value(a,"localization.ui")).toMatchObject({bundlesInvalid:"1",bundlesMissing:"3"});
  // Two active target locales now also need the independent authMail namespace.
  // The corrupt de/common bundle remains invalid, never counted as missing.
  expect(a.bundles.filter(b=>b.status==="missing").map(b=>`${b.locale}/${b.namespace}`).sort())
    .toEqual(["de/authMail","fr/authMail","fr/common"]);
  const rows=(await c.query("select id from owner_monitor_observations order by id")).rows;
  await approved("fr","heading");const b=await current.readCurrent();expect(value(b,"localization.ui").persistentManual).toBe("1");expect((await c.query("select id from owner_monitor_observations order by id")).rows).toEqual(rows);
  expect(b.monitors[0].observedAt>=a.monitors[0].observedAt).toBe(true);
});
it("counts full current content by active target and revision, excludes source/unresolved/protected-only missing work",async()=>{
  const x=await content(),unresolved=await content("und"),protectedOnly=await content("fr","```js\nconst privateValue=1;\n```");void unresolved;void protectedOnly;
  await new DrizzleContentTranslationStore(db).write({contentType:"topic-title",contentId:x.id,revisionId:x.title,targetLocale:"de",sourceLocale:"fr",translatedContent:"Titel",provenance:{origin:"persistent_manual"}});
  await new DrizzleContentTranslationStore(db).write({contentType:"post-body",contentId:x.post,revisionId:x.revision,targetLocale:"de",sourceLocale:"fr",translatedContent:"Text",provenance:{origin:"machine",provider:"private-provider",model:"private-model"}});
  const s=await current.readCurrent();expect(value(s,"localization.content")).toMatchObject({titleRevisions:"3",bodyRevisions:"3",eligiblePairs:"6",currentManual:"1",currentMachine:"1",missingPairs:"4",sameLocale:"4",sourceUnresolved:"6",noTranslatableContent:"2",runtimeEnabled:false});
  const independent=(await c.query("select (select count(*) from forum_topics)::text titles,(select count(*) from forum_posts)::text bodies")).rows[0];expect(value(s,"localization.content").titleRevisions).toBe(independent.titles);expect(value(s,"localization.content").bodyRevisions).toBe(independent.bodies);
  expect(JSON.stringify(s)).not.toMatch(/SA07_L_PRIVATE|private-provider|private-model|source_key/);
  const scoped=await history.readTimeline({area:"localization",monitorKey:"localization.content",kind:"forum.titleRevisionCreated"});expect(scoped.entries.some(e=>e.id===x.title&&e.monitorKeys.includes("forum.content"))).toBe(true);
});
it("does not count a previous revision as current or expose a broken quote-attribution translation as valid",async()=>{
  const x=await content("fr",attributedQuoteMarkdown({author:"Private source",messageNumber:7,permalink:"/en/topics/example#post-7",content:"Quoted text"})+"\n\nPrivate reply");
  await c.query(`insert into forum_post_body_translations(post_id,revision_id,target_locale,source_locale,translated_content,origin) values($1,$2,'de','fr','Bad translated quote','persistent_manual')`,[x.post,x.revision]);
  expect(value(await current.readCurrent(),"localization.content")).toMatchObject({invalidResults:"1",currentManual:"0"});
  const old=crypto.randomUUID();await c.query("insert into forum_topic_title_revisions(id,topic_id,author_id,original_content,source_locale) values($1,$2,$3,'old private title','fr')",[old,x.id,x.author]);
  await c.query("insert into forum_topic_title_translations(topic_id,revision_id,target_locale,source_locale,translated_content,origin) values($1,$2,'de','fr','old translated title','persistent_manual')",[x.id,old]);
  expect(value(await current.readCurrent(),"localization.content").staleRetainedResults).toBe("1");
});
it("retains one original task fact across Background, Localization and global History without reading a job into existence",async()=>{
  const store=new DrizzleTranslationTaskStore(db,new PostgresOwnerOperationalFactSink(pool));
  const input={translationKind:"ui" as const,sourceIdentity:{namespace:"common",key:"heading"},sourceFingerprint:await sourceFingerprint(canonicalEnglishCatalog.common.heading),targetLocale:"fr",generationPolicyVersion:"private-policy"};
  await store.upsertPending({...input,taskIdentity:await uiTranslationJobIdentity(input)},{freshPlanning:true});
  const old=(await c.query("select id from owner_events")).rows;await current.readCurrent();await current.readCurrent();expect((await c.query("select id from owner_events")).rows).toEqual(old);
  const a=(await history.readTimeline({monitorKey:"background.translation",origin:"operational-event"})).entries;
  const b=(await history.readTimeline({monitorKey:"localization.ui",origin:"operational-event"})).entries;
  expect(b).toEqual(a);expect(b).toHaveLength(1);expect((await history.readTimeline()).entries.filter(e=>e.id===b[0].id)).toHaveLength(1);
  expect(value(await current.readCurrent(),"localization.content").currentTasks0).toBe("1");
});
it("aggregates all budget windows exactly above Number.MAX_SAFE_INTEGER without requester identity or fake limits",async()=>{
  await c.query(`insert into content_translation_request_budget_counters(scope,subject_key,window_start,expires_at,used_units) values
    ('title@v1','_global',now(),now()+interval '1 hour',9007199254740991),('title@v1',$1,now(),now()+interval '1 hour',9007199254740991),
    ('title@v1',$2,now()-interval '2 hour',now()-interval '1 hour',17)`,["HMAC_PRIVATE_".padEnd(43,"A"),"HMAC_PRIVATE_".padEnd(43,"B")]);
  const s=await current.readCurrent();expect(value(s,"localization.budget")).toMatchObject({budgetCounters:"3",usedUnits:"18014398509481999",activeUsedUnits:"18014398509481982",expiredUsedUnits:"17",globalCounters:"1",requesterCounters:"2",windowGroups:"3",limitsConfigured:false});
  expect(JSON.stringify(s)).not.toMatch(/HMAC_PRIVATE|subject_key|subjectKey/);
  expect(s.budgetWindows.reduce((n,w)=>n+BigInt(w.usedUnits),0n).toString()).toBe((await c.query("select sum(used_units)::text n from content_translation_request_budget_counters")).rows[0].n);
});
it("does not replace unavailable or corrupt localization with synthetic English or successful empty counters",async()=>{
  await c.query("alter table locales rename to sa07_locales_hidden");
  try{await expect(current.readCurrent()).rejects.toMatchObject({code:"42P01"});expect((await c.query("select count(*)::int n from owner_monitor_observations")).rows[0].n).toBe(0);}
  finally{await c.query("alter table sa07_locales_hidden rename to locales");}
  await c.query("update locales set fallback_chain='{fr}' where tag='fr'");await expect(current.readCurrent()).rejects.toBeInstanceOf(OwnerLocalizationUnavailableError);
});
it("keeps successful measurements when passive observation insertion fails",async()=>{
  await c.query("create function sa07_l_fail() returns trigger language plpgsql as $$begin raise exception 'SA07_L_PRIVATE_SQL';end$$;create trigger sa07_l_fail before insert on owner_monitor_observations for each row execute function sa07_l_fail()");
  try{const s=await current.readCurrent();expect(s.monitors.every(m=>m.recording==="unavailable"&&m.quality==="measured")).toBe(true);expect(value(s,"localization.registry").activeLocales).toBe("3");expect(JSON.stringify(s)).not.toContain("PRIVATE_SQL");}
  finally{await c.query("drop trigger sa07_l_fail on owner_monitor_observations;drop function sa07_l_fail()");}
});
it("validates every locale beyond a presentation page and rejects incomplete bounded input",async()=>{
  for(const tag of ["es","it","pt","nl","pl","cs","sk","sl","ro","bg","hr","sv","da","fi","no","et","lv","lt","hu","el","tr","ar","he","uk","ja","ko","zh"])await locale(tag);
  const source=await readLocalizationSource(local,null,performance.now()+10000);expect(source.active).toHaveLength(30);expect(source.uiValues.targetLocales).toBe("29");
  expect(source.uiValues.expectedUnits).toBe((BigInt(catalogDescriptors().length)*29n).toString());
  await expect(readLocalizationSource(local,null,0)).rejects.toBeInstanceOf(OwnerLocalizationUnavailableError);
});
it("uses actual current generation and typed source resolution without invoking a detector or provider",async()=>{
  const x=await content("und");
  const revision={contentType:"topic-title" as const,contentId:x.id,revisionId:x.title,originalContent:"SA07_L_PRIVATE_TITLE",sourceLocale:"und"};
  const resolution={kind:"detected" as const,mayProceed:true as const,sourceLocale:"fr",resolutionOrigin:"detector" as const,confidence:1,evidence:{origin:"detector" as const,detector:"local-fixture"}};
  const spec=await contentTopicTitleTaskSpecification(revision,resolution,"fr","de","code-only-policy");
  const result=await new DrizzleContentTopicTitlePlanningStore(db,new PostgresOwnerOperationalFactSink(pool)).upsertPending(spec,revision,
    {subjectKey:"A".repeat(43),cost:1,windowSeconds:60,global:{name:"title-global",version:"v1",limit:100},requester:{name:"title-requester",version:"v1",limit:100}},x.author);
  expect(result.outcome).toBe("task");
  expect(value(await current.readCurrent(),"localization.content")).toMatchObject({eligiblePairs:"1",missingPairs:"1",sourceUnresolved:"5",currentTasks1:"1",staleRevisionTasks1:"0",runtimeEnabled:false});
  const next=crypto.randomUUID();await c.query("insert into forum_topic_title_revisions(id,topic_id,author_id,original_content,source_locale) values($1,$2,$3,'A new current title','und')",[next,x.id,x.author]);
  await c.query("update forum_topics set current_title_revision_id=$1 where id=$2",[next,x.id]);
  expect(value(await current.readCurrent(),"localization.content")).toMatchObject({eligiblePairs:"0",currentTasks1:"0",staleRevisionTasks1:"1"});
});
it("executes the reader with distinct non-owner localization and web roles and denies their cross-domain writes/reads",async()=>{
  const suffix=crypto.randomUUID().replaceAll("-","").slice(0,12),wr="sa07_l_web_"+suffix,lr="sa07_l_loc_"+suffix;
  await c.query(`create role ${wr} login;create role ${lr} login;grant usage on schema ${schema} to ${wr},${lr}`);
  const tables=["translation_tasks","translation_task_generation_heads","content_topic_title_translation_tasks","content_post_body_translation_tasks","content_translation_request_budget_counters","forum_topics","forum_posts","forum_topic_title_revisions","forum_post_revisions","forum_topic_title_translations","forum_post_body_translations","owner_events","owner_monitor_observations","admin_history"];
  await c.query(`grant select on ${tables.join(',')} to ${wr};grant insert on owner_monitor_observations to ${wr};grant select on locales,ui_translations,ui_translation_bundles to ${lr}`);
  const wp=new Pool({connectionString:url,options:options+" -c role="+wr,max:1}),lc=new Client({connectionString:url,options:options+" -c role="+lr});
  try{
    await lc.connect();expect((await lc.query("select current_user u")).rows[0].u).toBe(lr);
    const s=await new PostgresOwnerLocalizationMonitoring(wp,lc).readCurrent();expect(s.monitors.every(m=>m.recording==="available")).toBe(true);
    await expect(wp.query("select 1 from locales limit 0")).rejects.toMatchObject({code:"42501"});await expect(lc.query("select 1 from translation_tasks limit 0")).rejects.toMatchObject({code:"42501"});
    for(const table of tables.slice(0,5))await expect(wp.query(`delete from ${table} where false`)).rejects.toMatchObject({code:"42501"});
    await c.query(`revoke select on content_translation_request_budget_counters from ${wr}`);
    await expect(new PostgresOwnerLocalizationMonitoring(wp,lc).readCurrent()).rejects.toMatchObject({code:"42501"});
    // A successful localization snapshot never substitutes another credential for the web failure.
    expect((await c.query("select count(*)::int n from owner_monitor_observations")).rows[0].n).toBe(4);
  }finally{
    await wp.end();await lc.end();await c.query(`drop owned by ${wr},${lr};drop role ${wr};drop role ${lr}`);
  }
});
it("reports already readable manual content with und source without inventing missing provider work",async()=>{
  const x=await content("und");
  await new DrizzleContentTranslationStore(db).write({contentType:"topic-title",contentId:x.id,revisionId:x.title,targetLocale:"de",sourceLocale:"und",translatedContent:"Manueller Titel",provenance:{origin:"persistent_manual"}});
  expect(value(await current.readCurrent(),"localization.content")).toMatchObject({sourceUnresolved:"6",currentManual:"1",eligiblePairs:"0",missingPairs:"0"});
});
