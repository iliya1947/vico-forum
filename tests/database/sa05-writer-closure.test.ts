import { readdir, readFile } from "node:fs/promises";
import { Client, type Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError } from "../../db/account-state";
import { PostgresOwnerAccountLifecycleCommand, OwnerAccountLifecycleForbiddenError } from "../../db/owner-account-lifecycle";
import { DrizzleForumRepository } from "../../db/forum-repository";
import { DrizzleForumAttachments } from "../../db/forum-attachments";
import { DrizzleComplaintsRepository } from "../../db/complaints-repository";
import { UserMeasuresService, PostgresUserMeasuresRepository } from "../../db/user-measures";
import { PostgresAuthorizationRepository, AuthorizationForbiddenError } from "../../db/authorization-repository";
import { PostgresRegistrationSettingsRepository, RegistrationSettingsForbiddenError } from "../../db/registration-settings";
import { createHyperdriveUserLocale } from "../../db/hyperdrive-user-locale";
import { DrizzleUserPrivacyRepository } from "../../db/user-privacy";
import { HELP_SOLUTIONS_SERVICE_SECTION_ID } from "../../db/forum-identifiers";
import { DrizzleContentTopicTitlePlanningStore } from "../../db/content-topic-title-task-store";
import { DrizzleContentPostBodyPlanningStore } from "../../db/content-post-body-task-store";
import { contentTopicTitleTaskSpecification } from "../../app/localization/content-translation-planning";
import { contentPostBodyTaskSpecification } from "../../app/localization/content-post-body-planning";
import { CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION, protectMarkdownForTranslation } from "../../app/localization/content-markdown-translation";
import { localeRegistry } from "../../app/localization/registry";
import { TranslationProviderRouter } from "../../app/localization/translation-provider";
import { ContentTopicTitleAllowanceGate, ContentPostBodyAllowanceGate } from "../../app/localization/content-provider-allowance";
import { ContentTopicTitleTaskConsumer } from "../../app/localization/content-translation-task-consumer";
import { ContentPostBodyTaskConsumer } from "../../app/localization/content-post-body-task-consumer";
import { ContentTopicTitleTaskExecutor } from "../../app/localization/content-translation-execution";
import { ContentPostBodyTaskExecutor } from "../../app/localization/content-post-body-execution";
import { ContentTopicTitleResultPublisher } from "../../app/localization/content-translation-publication";
import { ContentPostBodyResultPublisher } from "../../app/localization/content-post-body-publication";
import { DrizzleTranslationTaskStore } from "../../db/translation-task-store";
import { DrizzleContentTranslationStore } from "../../db/content-translation-store";
import { DrizzleContentTopicTitleExecutionStore } from "../../db/content-topic-title-execution-store";
import { DrizzleContentPostBodyExecutionStore } from "../../db/content-post-body-execution-store";

const url=process.env.DATABASE_URL;
if(!url||!["localhost","127.0.0.1"].includes(new URL(url).hostname)||!new URL(url).pathname.endsWith("_test"))throw new Error("Disposable loopback *_test PG17 required");
const schema="sa05_writer_closure_test",options="-c search_path="+schema;
const fixture=new Client({connectionString:url,options}),owner="sa05-closure-bound-owner";
const uuid=()=>crypto.randomUUID();
const kinds=["topic","reply","edit","title-revision","body-revision","title-noop","body-noop","close","pin","unpin",
  "solved","best-answer","signal","signal-withdraw","signal-review","solution-moderation","duplicate","duplicate-remove","duplicate-appeal","duplicate-review",
  "profile","read-state","notification","reply-notification","presence",
  "upload-admission","upload-journal","upload-activation","upload-metadata","private-file","private-list","attachment-cancel",
  "measure-create","measure-change","measure-lift","measure-appeal","measure-review",
  "complaint-submit","complaint-weights","complaint-priority","complaint-start","complaint-end","complaint-note","complaint-decision","complaint-appeal","complaint-review",
  "locale","privacy","title-plan","body-plan"] as const;
type Kind=typeof kinds[number];
const effectFree=new Set<Kind>(["title-noop","body-noop","presence","upload-admission","private-file","private-list"]);
const tables=["forum_topics","forum_posts","forum_topic_title_revisions","forum_post_revisions","forum_profiles","forum_topic_pins","forum_topic_read_states","forum_reply_notifications",
  "forum_help_signals","forum_help_duplicate_relationships","forum_help_duplicate_appeals","forum_publication_receipts",
  "forum_attachments","forum_attachment_draft_refs","forum_attachment_draft_generations","forum_attachment_upload_objects",
  "authz_roles","authz_role_permissions","authz_user_roles","authz_user_permission_overrides","admin_history",
  "user_measures","user_measure_restrictions","user_measure_appeals","user_privacy_preferences","forum_registration_settings",
  "forum_complaint_targets","forum_complaint_cases","forum_complaints","forum_complaint_events","forum_complaint_notes","forum_complaint_decisions","forum_complaint_appeals","forum_complaint_activity","forum_complaint_priority_settings",
  "translation_tasks","translation_task_generation_heads","content_topic_title_translation_tasks","content_post_body_translation_tasks","content_translation_request_budget_counters"];
function pool(c:Client):Pool{
  // Only the connection lifetime/transport is owned by this test. The real
  // command, transaction, guard and store SQL execute on the actual client.
  return {query:c.query.bind(c),connect:async()=>Object.assign(c,{release:()=>{}})} as unknown as Pool;
}
const forum=(c=fixture)=>new DrizzleForumRepository(drizzle(c),{cooldownMs:0,now:()=>new Date()});
const files=(c=fixture)=>new DrizzleForumAttachments(drizzle(c));
const complaints=(c=fixture)=>new DrizzleComplaintsRepository(drizzle(c),{tenMinutes:10000,day:10000});
const measures=(c=fixture)=>new UserMeasuresService(new PostgresUserMeasuresRepository(pool(c),owner));
async function connect(){const c=new Client({connectionString:url,options});await c.connect();return c;}
async function person(admin=false){const id="writer-"+uuid();await fixture.query('insert into "user"(id,name,email) values($1,$1,$2)',[id,id+"@test.invalid"]);
  if(admin)await fixture.query("insert into authz_user_roles(user_id,role_id) values($1,'builtin-admin')",[id]);return id;}
async function snapshot(){
  const result:Record<string,unknown>={};
  result.users=(await fixture.query('select to_jsonb(u)-ARRAY[\'deactivated_at\',\'deactivated_by_user_id\',\'retain_at_least_until\'] data from "user" u order by id')).rows;
  for(const table of tables)result[table]=(await fixture.query("select to_jsonb(t) data from "+table+" t order by to_jsonb(t)::text")).rows;
  return result;
}
function barrier(c:Client,match:(s:string)=>boolean){
  const original=c.query;let enter!:()=>void,resume!:()=>void,used=false;
  const observed=new Promise<void>(r=>{enter=r;}),permitted=new Promise<void>(r=>{resume=r;});
  c.query=((...args:unknown[])=>{const first=args[0],sql=typeof first==="string"?first:first&&typeof first==="object"&&"text" in first?String(first.text):"";
    if(!used&&match(sql)){used=true;enter();return permitted.then(()=>Reflect.apply(original,c,args));}
    return Reflect.apply(original,c,args);
  }) as typeof c.query;
  return {observed,resume,restore:()=>{c.query=original;}};
}
const commit=(s:string)=>/^commit\s*;?$/i.test(s.trim());
async function blocked(waiter:number,blocker:number){
  for(let n=0;n<100;n++){
    const row=(await fixture.query<{pids:number[]}>("select pg_blocking_pids($1) pids",[waiter])).rows[0];
    if(row.pids.includes(blocker))return;await new Promise(r=>setTimeout(r,3));
  }
  throw new Error("Actual writer/Owner command blocking edge not observed");
}
async function frame(){
  const actor=await person(true),other=await person(),topic=uuid(),post=uuid(),title=uuid(),revision=uuid(),reply=uuid(),replyRevision=uuid();
  await forum().createTopicWithInitialPost({id:topic,sectionId:HELP_SOLUTIONS_SERVICE_SECTION_ID,authorId:actor,
    titleRevision:{id:title,originalContent:"Исходный заголовок SA05",sourceLocale:"ru"},
    initialPost:{id:post,topicId:topic,authorId:actor,bodyRevision:{id:revision,originalContent:"Исходный текст SA05",sourceLocale:"ru"}}});
  await forum().createPost({id:reply,topicId:topic,authorId:other,bodyRevision:{id:replyRevision,originalContent:"Ответ SA05",sourceLocale:"ru"}});
  await fixture.query("insert into forum_online_presence(user_id,last_seen_at) values($1,now()-interval '2 minutes')",[actor]);
  return {actor,other,topic,post,title,revision,reply,replyRevision};
}
async function planning(kind:"title-plan"|"body-plan",x:Awaited<ReturnType<typeof frame>>){
  const revision=kind==="title-plan"?{contentType:"topic-title" as const,contentId:x.topic,revisionId:x.title,originalContent:"Исходный заголовок SA05",sourceLocale:"ru"}
    :{contentType:"post-body" as const,contentId:x.post,revisionId:x.revision,originalContent:"Исходный текст SA05",sourceLocale:"ru"};
  const resolution={kind:"revision",mayProceed:true,sourceLocale:"ru",resolutionOrigin:"revision-metadata"} as const;
  const spec=kind==="title-plan"?await contentTopicTitleTaskSpecification(revision,resolution,"ru","he","sa05-closure-v1")
    :await contentPostBodyTaskSpecification(revision,resolution,"ru","he",CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,"sa05-closure-v1",protectMarkdownForTranslation(revision.originalContent));
  const budget={subjectKey:"S".repeat(43),cost:1,windowSeconds:3600,global:{name:"sa05-closure",version:"v1",limit:10000},requester:{name:"sa05-closure-person",version:"v1",limit:10000}};
  return {revision,spec,budget};
}
async function build(kind:Kind){
  const x=await frame(),id=uuid(),operationId=uuid();let run:(c:Client)=>Promise<unknown>;
  // AP-10 intentionally requires an explicit manage grant even for Admin.
  // This is fixture authority, read by the real repository under its lock.
  if(kind.startsWith("measure-"))await fixture.query("insert into authz_user_permission_overrides(user_id,permission_key,effect) values($1,'admin.users.blocks.manage','allow')",[x.actor]);
  switch(kind){
    case "topic":run=c=>forum(c).createTopicWithInitialPost({id,sectionId:"sa05-closure-section",authorId:x.actor,titleRevision:{id:uuid(),originalContent:"New topic",sourceLocale:"en"},initialPost:{id:uuid(),topicId:id,authorId:x.actor,bodyRevision:{id:uuid(),originalContent:"New body",sourceLocale:"en"}}});break;
    case "reply":run=c=>forum(c).createPost({id,topicId:x.topic,authorId:x.actor,parentPostId:x.reply,bodyRevision:{id:uuid(),originalContent:"New reply",sourceLocale:"en"}});break;
    case "edit":run=c=>forum(c).editPublishedPost({topicId:x.topic,postId:x.post,actorId:x.actor,expectedRevisionId:x.revision,body:"Edited body",draftId:id,attachmentIds:[]});break;
    case "title-revision":run=c=>forum(c).reviseTopicTitle(x.topic,x.title,{id,originalContent:"Заголовок",sourceLocale:"he"},x.actor,"any");break;
    case "body-revision":run=c=>forum(c).revisePostBody(x.post,x.revision,{id,originalContent:"Текст",sourceLocale:"he"},x.actor,"any");break;
    case "title-noop":case "body-noop":run=c=>forum(c).admitSourceLocaleNoop({kind:kind==="title-noop"?"topic":"post",contentId:kind==="title-noop"?x.topic:x.post,expectedRevisionId:kind==="title-noop"?x.title:x.revision,actorId:x.actor,scope:"own"});break;
    case "close":run=c=>forum(c).setTopicClosed({topicId:x.topic,actorId:x.actor,isClosed:true,expectedClosureVersion:0});break;
    case "pin":run=c=>forum(c).pinTopic(x.topic,x.actor);break;
    case "unpin":await forum().pinTopic(x.topic,x.actor);run=c=>forum(c).unpinTopic(x.topic,x.actor);break;
    case "solved":run=c=>forum(c).markTopicSolved(x.topic,x.actor);break;
    case "best-answer":run=c=>forum(c).selectBestAnswer(x.topic,x.reply,x.actor);break;
    case "signal":run=c=>forum(c).createHelpSignal({kind:"needs-details",topicId:x.topic,actorId:x.actor,explanation:"Needs details",proposedOriginalTopicId:null});break;
    case "signal-withdraw":case "signal-review":{
      const s=await forum().createHelpSignal({kind:"needs-details",topicId:x.topic,actorId:kind==="signal-withdraw"?x.actor:x.other,explanation:"Details",proposedOriginalTopicId:null});
      run=c=>kind==="signal-withdraw"?forum(c).withdrawHelpSignal(s.id,x.topic,x.actor):forum(c).resolveHelpSignal(s.id,x.actor,"rejected");break;}
    case "solution-moderation":await forum().selectBestAnswer(x.topic,x.reply,x.actor);await forum().markTopicSolved(x.topic,x.actor);run=c=>forum(c).setHelpSolutionModeration(x.topic,"needs-review",null,x.actor,x.reply);break;
    case "duplicate":case "duplicate-remove":case "duplicate-appeal":case "duplicate-review":{
      const original=uuid();await forum().createTopic({id:original,sectionId:HELP_SOLUTIONS_SERVICE_SECTION_ID,authorId:x.other,titleRevision:{id:uuid(),originalContent:"Original question",sourceLocale:"en"}});
      if(kind==="duplicate")run=c=>forum(c).confirmHelpDuplicate(x.topic,original,x.actor);
      else{
        await forum().confirmHelpDuplicate(x.topic,original,owner);
        const relationship=(await fixture.query("select id from forum_help_duplicate_relationships where duplicate_topic_id=$1 and removed_at is null",[x.topic])).rows[0].id;
        if(kind==="duplicate-remove")run=c=>forum(c).removeHelpDuplicate(x.topic,x.actor,relationship);
        else if(kind==="duplicate-appeal")run=c=>forum(c).appealHelpDuplicate(x.topic,x.actor,"Reconsider",relationship);
        else{await forum().appealHelpDuplicate(x.topic,x.actor,"Reconsider",relationship);const appeal=(await fixture.query("select id from forum_help_duplicate_appeals where relationship_id=$1",[relationship])).rows[0].id;run=c=>forum(c).resolveHelpDuplicateAppeal(x.topic,x.actor,"rejected",appeal);}
      }break;}
    case "profile":run=c=>forum(c).updateProfile(x.actor,{bio:"Changed",githubUrl:null,websiteUrl:null});break;
    case "read-state":run=c=>forum(c).advanceTopicReadState(x.actor,x.topic,x.reply);break;
    case "notification":case "reply-notification":{
      const n=(await fixture.query("select id from forum_reply_notifications where recipient_user_id=$1 and read_at is null order by id limit 1",[x.actor])).rows[0].id;
      run=c=>kind==="notification"?forum(c).markNotificationRead(x.actor,n):forum(c).markReplyNotificationRead(x.actor,n);break;}
    case "presence":run=c=>forum(c).recordOnlinePresence(x.actor);break;
    case "upload-admission":case "upload-journal":case "upload-activation":case "upload-metadata":case "private-file":case "private-list":case "attachment-cancel":{
      const contextKey="topic:"+x.topic+":reply",draftId=uuid(),objectKey="private/fenced-v1/"+uuid();
      if(kind==="upload-journal")run=c=>files(c).recordUploadObject(x.actor,objectKey);
      else if(kind==="upload-activation"){await files().recordUploadObject(x.actor,objectKey);run=c=>files(c).activateUploadObject(x.actor,objectKey,"real-test-reservation");}
      else{
        const input={id,ownerId:x.actor,contextKey,draftId,objectKey:"private/"+uuid(),fileName:"retained.txt",declaredMime:"text/plain",detectedType:"text" as const,responseMime:"text/plain; charset=utf-8",byteSize:9,verificationStatus:"type-checked" as const};
        if(["private-file","private-list","attachment-cancel"].includes(kind))await files().createDraftAttachment(input);
        run=c=>kind==="upload-admission"?files(c).admitUpload(x.actor,contextKey,draftId,id):kind==="upload-metadata"?files(c).createDraftAttachment(input):kind==="private-file"?files(c).readDraftAttachment(x.actor,contextKey,draftId,id):kind==="private-list"?files(c).listDraftAttachments(x.actor,contextKey,draftId):files(c).cancelOperation(x.actor,contextKey,draftId);
      }break;}
    case "measure-create":run=c=>measures(c).create({id,actorId:x.actor,targetUserId:x.other,reason:"Closure",restrictions:["topics.create"],expiresAt:null});break;
    case "measure-change":case "measure-lift":case "measure-appeal":case "measure-review":{
      const subject=kind==="measure-appeal"?x.actor:x.other,issuer=kind==="measure-appeal"?owner:x.actor;
      await measures().create({id,actorId:issuer,targetUserId:subject,reason:"Closure",restrictions:["topics.create"],expiresAt:null});
      if(kind==="measure-change")run=c=>measures(c).change({measureId:id,actorId:x.actor,operationId,expectedVersion:1,reason:"Change",restrictions:["replies.create"],expiresAt:null});
      else if(kind==="measure-lift")run=c=>measures(c).lift({measureId:id,actorId:x.actor,operationId,expectedVersion:1,reason:"Lift"});
      else if(kind==="measure-appeal")run=c=>measures(c).submitAppeal({id:operationId,measureId:id,actorId:x.actor,body:"Review"});
      else{const appeal=await measures().submitAppeal({id:operationId,measureId:id,actorId:subject,body:"Review"});run=c=>measures(c).resolveAppeal({measureId:id,appealId:appeal.id,actorId:x.actor,operationId:uuid(),expectedVersion:1,outcome:"rejected",explanation:"Reviewed",remedy:null,restrictions:null,expiresAt:null});}break;}
    case "complaint-weights":{
      const current=await complaints().readPrioritySettings();run=c=>complaints(c).savePrioritySettings(x.actor,{expectedVersion:current.version,weights:{...current.weights,spam:2}});break;}
    case "complaint-submit":case "complaint-priority":case "complaint-start":case "complaint-end":case "complaint-note":case "complaint-decision":case "complaint-appeal":case "complaint-review":{
      const submit={target:{kind:"post" as const,topicId:x.topic,postId:x.reply,revisionId:x.replyRevision},reason:"spam" as const,explanation:null,operationId};
      if(kind==="complaint-submit")run=c=>complaints(c).submit(x.actor,submit);
      else{
        const reporter=kind==="complaint-appeal"?x.actor:await person();
        const {caseId}=await complaints().submit(reporter,submit);
        const version=(await fixture.query("select version from forum_complaint_cases where id=$1",[caseId])).rows[0].version;
        if(kind==="complaint-priority")run=c=>complaints(c).changePriority(x.actor,{caseId,expectedVersion:version,operationId:uuid(),priority:3});
        else if(kind==="complaint-start"||kind==="complaint-end"){
          if(kind==="complaint-end")await complaints().activity(x.actor,caseId,true);
          run=c=>complaints(c).activity(x.actor,caseId,kind==="complaint-start");
        }else if(kind==="complaint-note")run=c=>complaints(c).addNote(x.actor,{caseId,operationId:uuid(),body:"Closure note"});
        else if(kind==="complaint-decision")run=c=>complaints(c).decide(x.actor,{caseId,operationId:uuid(),expectedVersion:version,outcome:"not-confirmed",reasoning:"Closure decision"});
        else{
          const decisionId=await complaints().decide(owner,{caseId,operationId:uuid(),expectedVersion:version,outcome:"not-confirmed",reasoning:"Original decision"});
          const appeal={caseId,decisionId,operationId:uuid(),argument:"Reconsider"};
          if(kind==="complaint-appeal")run=c=>complaints(c).appeal(x.actor,appeal);
          else{const appealId=await complaints().appeal(reporter,appeal);run=c=>complaints(c).resolveAppeal(x.actor,{caseId,appealId,operationId:uuid(),outcome:"upheld",reasoning:"Upheld"});}
        }
      }break;}
    case "locale":run=async c=>{
      // O is one atomic conditional UPDATE. A caller-owned test transaction
      // holds that actual row lock at the controlled COMMIT barrier.
      await c.query("begin");try{const r=await createHyperdriveUserLocale(url!,()=>({connect:async()=>{},query:c.query.bind(c),end:async()=>{}} as unknown as Client)).save(x.actor,"he");await c.query("commit");return r;}
      catch(error){await c.query("rollback");throw error;}
    };break;
    case "privacy":run=c=>new DrizzleUserPrivacyRepository(drizzle(c)).save(x.actor,false);break;
    case "title-plan":case "body-plan":{
      const p=await planning(kind,x);run=c=>p.spec.translationKind==="content-topic-title"?new DrizzleContentTopicTitlePlanningStore(drizzle(c)).upsertPending(p.spec,p.revision,p.budget,x.actor):new DrizzleContentPostBodyPlanningStore(drizzle(c)).upsertPending(p.spec,p.revision,p.budget,x.actor);break;}
  }
  return {actor:x.actor,run};
}

beforeAll(async()=>{
  await fixture.connect();await fixture.query("drop schema if exists "+schema+" cascade;create schema "+schema);
  for(const file of (await readdir("drizzle")).filter(f=>/^\d{4}_.+\.sql$/.test(f)).sort())await fixture.query((await readFile("drizzle/"+file,"utf8")).replaceAll('"public".','"'+schema+'".'));
  await fixture.query('insert into "user"(id,name,email) values($1,$1,$2)',[owner,owner+"@test.invalid"]);
  await forum().createCategory({id:"sa05-closure-category",name:"Closure"});await forum().createSection({id:"sa05-closure-section",categoryId:"sa05-closure-category",name:"Closure"});
});
afterAll(async()=>{await fixture.query("drop schema if exists "+schema+" cascade");await fixture.end();});

it.each(["title-plan","body-plan"] as const)("accepted %s work completes through the real executor after actual Owner deactivation",async kind=>{
  const x=await frame(),p=await planning(kind,x),db=drizzle(fixture);
  const planned=p.spec.translationKind==="content-topic-title"
    ?await new DrizzleContentTopicTitlePlanningStore(db).upsertPending(p.spec,p.revision,p.budget,x.actor)
    :await new DrizzleContentPostBodyPlanningStore(db).upsertPending(p.spec,p.revision,p.budget,x.actor);
  if(planned.outcome!=="task")throw new Error("Fresh revision must yield a task");
  const task=planned.task;
  const c=await connect();
  try{await new PostgresOwnerAccountLifecycleCommand(pool(c),owner).deactivate({actorId:owner,targetId:x.actor,operationId:uuid()});}finally{await c.end();}
  const tasks=new DrizzleTranslationTaskStore(db),translations=new DrizzleContentTranslationStore(db);
  // Only the external provider/allowance boundary is synthetic. Admission,
  // claim, publication and completion all use the real native stores.
  let calls=0;
  const providerRouter=new TranslationProviderRouter([{providerId:"sa05-local",supports:()=>true,translate:async request=>{
    calls++;if(typeof request.source!=="string")throw new Error("Expected plain segment");
    const tokens=request.source.match(/⟦VICOPROTECTED\d+X\d+X\d+⟧/gu)??[];
    return {value:["תרגום",...tokens].join(" "),provenance:{provider:"sa05-local",model:"fixture-v1",origin:"machine" as const}};
  }}]);
  const adapter={admit:async()=>({outcome:"admitted" as const,reservationReference:"sa05-local-reservation"})};
  const common={tasks,translations,localeRegistry,generationPolicyVersion:"sa05-closure-v1"};
  let executor:ContentTopicTitleTaskExecutor|ContentPostBodyTaskExecutor;
  if(kind==="title-plan"){
    const revisions=new DrizzleContentTopicTitleExecutionStore(db),deps={...common,revisions};
    executor=new ContentTopicTitleTaskExecutor({
      allowance:new ContentTopicTitleAllowanceGate({...deps,store:tasks,adapter,providerRouter,admissionLeaseDurationMs:60000}),
      consumer:new ContentTopicTitleTaskConsumer({...deps,leaseDurationMs:60000}),
      publisher:new ContentTopicTitleResultPublisher({...deps,publications:revisions}),providerRouter,failures:tasks,
    });
  }else{
    const revisions=new DrizzleContentPostBodyExecutionStore(db),deps={...common,revisions,protectedContentPolicyVersion:CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION};
    const executionBounds={maxSegments:32,maxTotalSegmentCharacters:100000};
    executor=new ContentPostBodyTaskExecutor({
      allowance:new ContentPostBodyAllowanceGate({...deps,store:tasks,adapter,providerRouter,executionBounds,admissionLeaseDurationMs:60000}),
      consumer:new ContentPostBodyTaskConsumer({...deps,leaseDurationMs:60000}),
      publisher:new ContentPostBodyResultPublisher({...deps,publications:revisions}),providerRouter,failures:tasks,executionBounds,
    });
  }
  const message={translationTaskId:task.id};
  await expect(executor.execute(message)).resolves.toEqual({outcome:"published",delivery:"ack"});
  expect(calls).toBeGreaterThan(0);const count=calls;
  expect((await fixture.query("select status from translation_tasks where id=$1",[task.id])).rows).toEqual([{status:"completed"}]);
  expect(await translations.read({...p.revision,targetLocale:"he"})).toMatchObject({translatedContent:kind==="title-plan"?"תרגום":"תרגום SA05\n"});
  await executor.execute(message);expect(calls).toBe(count);
  expect((await fixture.query('select deactivated_at is not null inactive from "user" where id=$1',[x.actor])).rows).toEqual([{inactive:true}]);
});

describe.each(kinds)("SA05 actual Owner command versus real %s",kind=>{
  it.each(["state-first","writer-first","deactivation-rollback"] as const)("%s preserves admission, commit order and physical effects",async order=>{
    const x=await build(kind),writer=await connect(),changing=await connect();
    const wp=(await writer.query("select pg_backend_pid() pid")).rows[0].pid,cp=(await changing.query("select pg_backend_pid() pid")).rows[0].pid;
    const before=await snapshot();let writing:Promise<unknown>|undefined,deactivating:Promise<unknown>|undefined;
    const changeBarrier=barrier(changing,order==="deactivation-rollback"?s=>/insert into owner_events/i.test(s):commit);
    const writeBarrier=barrier(writer,commit);
    const command=new PostgresOwnerAccountLifecycleCommand(pool(changing),owner);
    try{
      if(order==="deactivation-rollback"){
        await fixture.query("create function sa05_fail_event() returns trigger language plpgsql as $$begin raise exception 'SA05_CLOSURE_EVENT_FAULT';end $$");
        await fixture.query("create trigger sa05_fail_event before insert on owner_events for each row execute function sa05_fail_event()");
      }
      if(order==="writer-first"){
        writing=x.run(writer);void writing.catch(()=>{});await writeBarrier.observed;
        deactivating=command.deactivate({actorId:owner,targetId:x.actor,operationId:uuid()});void deactivating.catch(()=>{});
        await blocked(cp,wp);writeBarrier.resume();await writing;await changeBarrier.observed;
        const written=await snapshot();if(!effectFree.has(kind))expect(written).not.toEqual(before);
        changeBarrier.resume();await deactivating;expect(await snapshot()).toEqual(written);
      }else{
        deactivating=command.deactivate({actorId:owner,targetId:x.actor,operationId:uuid()});void deactivating.catch(()=>{});await changeBarrier.observed;
        writing=x.run(writer);void writing.catch(()=>{});await blocked(wp,cp);changeBarrier.resume();
        if(order==="state-first"){
          await deactivating;const committed=await snapshot();writeBarrier.resume();await expect(writing).rejects.toBeInstanceOf(AccountInactiveError);expect(await snapshot()).toEqual(committed);
        }else{
          await expect(deactivating).rejects.toThrow("SA05_CLOSURE_EVENT_FAULT");writeBarrier.resume();await writing;
          expect((await fixture.query('select deactivated_at from "user" where id=$1',[x.actor])).rows[0].deactivated_at).toBeNull();
          expect((await fixture.query("select id from owner_events where source='account' and target_user_id=$1",[x.actor])).rows).toEqual([]);
          if(!effectFree.has(kind))expect(await snapshot()).not.toEqual(before);
        }
      }
      if(order!=="deactivation-rollback"){
        expect((await fixture.query("select id from owner_events where source='account' and target_user_id=$1",[x.actor])).rows).toHaveLength(1);
        expect((await fixture.query("select user_id from forum_online_presence where user_id=$1",[x.actor])).rows).toEqual([]);
      }
    }finally{
      changeBarrier.resume();writeBarrier.resume();await Promise.allSettled([writing,deactivating].filter(Boolean));
      if(order==="deactivation-rollback")await fixture.query("drop trigger if exists sa05_fail_event on owner_events;drop function if exists sa05_fail_event()");
      changeBarrier.restore();writeBarrier.restore();await Promise.all([writer.end(),changing.end()]);
    }
  });
});

it.each(["role-create","role-rename","role-grants","role-delete","role-assign","override","registration"] as const)("Owner-only %s never gains a fictitious deactivation race or non-Owner mutation",async kind=>{
  const actor=await person(true),subject=await person(),role=uuid(),c=await connect();
  const roles=new PostgresAuthorizationRepository(pool(c),owner),deactivate=new PostgresOwnerAccountLifecycleCommand(pool(c),owner);
  try{
    if(kind!=="role-create"&&kind!=="registration")await roles.createCustomRole(owner,{id:role,slug:"sa05-"+role,displayName:"Closure"});
    const run=async(id:string)=>{
      if(kind==="role-create")return roles.createCustomRole(id,{id:role,slug:"sa05-"+role,displayName:"Closure"});
      if(kind==="role-rename")return roles.renameCustomRole(id,role,{displayName:"Changed"});
      if(kind==="role-grants")return roles.replaceRoleGrants(id,role,["forum.topic.pin"]);
      if(kind==="role-delete")return roles.deleteCustomRole(id,role);
      if(kind==="role-assign")return roles.assignUserRole(id,subject,role);
      if(kind==="override")return roles.setUserOverride(id,subject,"forum.topic.pin","deny");
      const settings=new PostgresRegistrationSettingsRepository(pool(c)),s=await settings.read();
      return settings.update(id,owner,{expectedVersion:s.version,googleRegistrationEnabled:!s.googleRegistrationEnabled,emailRegistrationEnabled:s.emailRegistrationEnabled});
    };
    const original=await snapshot();await expect(run(actor)).rejects.toBeInstanceOf(kind==="registration"?RegistrationSettingsForbiddenError:AuthorizationForbiddenError);expect(await snapshot()).toEqual(original);
    await expect(deactivate.deactivate({actorId:owner,targetId:owner,operationId:uuid()})).rejects.toBeInstanceOf(OwnerAccountLifecycleForbiddenError);
    expect(await snapshot()).toEqual(original);await run(owner);
    await deactivate.deactivate({actorId:owner,targetId:actor,operationId:uuid()});const after=await snapshot();
    await expect(run(actor)).rejects.toBeInstanceOf(kind==="registration"?RegistrationSettingsForbiddenError:AccountInactiveError);expect(await snapshot()).toEqual(after);
  }finally{await c.end();}
});
