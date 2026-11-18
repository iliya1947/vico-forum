import { readFile, readdir } from "node:fs/promises";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import { DrizzleForumRepository } from "../../db/forum-repository";
import { DrizzleComplaintsRepository } from "../../db/complaints-repository";
import { createHyperdriveContentGenerationAdmission } from "../../db/hyperdrive-content-generation-admission";
import { DrizzleContentTopicTitlePlanningStore } from "../../db/content-topic-title-task-store";
import { DrizzleContentPostBodyPlanningStore } from "../../db/content-post-body-task-store";
import { DrizzleContentTranslationStore } from "../../db/content-translation-store";
import { DrizzleTranslationTaskStore } from "../../db/translation-task-store";
import { DrizzleContentTopicTitleExecutionStore } from "../../db/content-topic-title-execution-store";
import { DrizzleContentPostBodyExecutionStore } from "../../db/content-post-body-execution-store";
import { ContentTopicTitleTaskConsumer } from "../../app/localization/content-translation-task-consumer";
import { ContentPostBodyTaskConsumer } from "../../app/localization/content-post-body-task-consumer";
import { contentTopicTitleTaskSpecification, ContentTopicTitleTranslationPlanner } from "../../app/localization/content-translation-planning";
import { contentPostBodyTaskSpecification, ContentPostBodyTranslationPlanner } from "../../app/localization/content-post-body-planning";
import { ContentSourceLocaleResolver, ThresholdContentSourceLocalePolicy } from "../../app/localization/content-source-locale";
import { ContentTranslationService, type ContentTranslationRevision } from "../../app/localization/content-translation";
import { CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION, protectMarkdownForTranslation } from "../../app/localization/content-markdown-translation";
import { FakeTranslationTaskEnqueuer, type ContentTopicTitleTranslationTaskSpecification, type ContentPostBodyTranslationTaskSpecification } from "../../app/localization/translation-tasks";
import { localeRegistry } from "../../app/localization/registry";

const url=process.env.DATABASE_URL;
if(!url || !["127.0.0.1","localhost"].includes(new URL(url).hostname)
 || !new URL(url).pathname.endsWith("_test"))throw new Error("Disposable local PG17 *_test required");
const schema="sa04_content_generation_r_test",options="-c search_path="+schema+" -c lock_timeout=8s";
const fixture=new Client({connectionString:url,options});
type Kind="title"|"body";
type Spec=ContentTopicTitleTranslationTaskSpecification|ContentPostBodyTranslationTaskSpecification;
const kinds=["title","body"] as const;
const uuid=()=>crypto.randomUUID();
const budget={subjectKey:"R".repeat(43),cost:1,windowSeconds:3600,
 global:{name:"sa04-r-global",version:"v1",limit:10000},requester:{name:"sa04-r-requester",version:"v1",limit:10000}};
const resolution={kind:"revision",mayProceed:true,sourceLocale:"ru",resolutionOrigin:"revision-metadata"} as const;
async function connection(){const c=new Client({connectionString:url,options});await c.connect();return c;}
async function person(){const id="r-actor-"+uuid();await fixture.query('insert into "user"(id,name,email) values($1,$1,$2)',[id,id+"@test.invalid"]);return id;}
async function deactivate(c:Client,id:string){await c.query(`update "user" set deactivated_at=clock_timestamp(),
 deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years' where id=$1`,[id]);}
async function content(){
 const author=await person(),topic=uuid(),post=uuid(),title=uuid(),body=uuid();
 const f=new DrizzleForumRepository(drizzle(fixture),{cooldownMs:0,now:()=>new Date()});
 await f.createTopicWithInitialPost({id:topic,sectionId:"r-section",authorId:author,
  titleRevision:{id:title,originalContent:"Исходный заголовок",sourceLocale:"ru"},
  initialPost:{id:post,topicId:topic,authorId:author,bodyRevision:{id:body,originalContent:"Исходный **текст** сообщения",sourceLocale:"ru"}}});
 return {author,topic,post,title,body};
}
async function spec(kind:Kind,u:Awaited<ReturnType<typeof content>>,policy="sa04-r-v1"){
 const revision:ContentTranslationRevision=kind==="title"
  ?{contentType:"topic-title",contentId:u.topic,revisionId:u.title,originalContent:"Исходный заголовок",sourceLocale:"ru"}
  :{contentType:"post-body",contentId:u.post,revisionId:u.body,originalContent:"Исходный **текст** сообщения",sourceLocale:"ru"};
 const specification=kind==="title"
  ?await contentTopicTitleTaskSpecification(revision,resolution,"ru","he",policy)
  :await contentPostBodyTaskSpecification(revision,resolution,"ru","he",CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,policy,protectMarkdownForTranslation(revision.originalContent));
 return {revision,specification};
}
function upsert(c:Client,s:Spec,r:ContentTranslationRevision,actorId:string,admission=budget){
 return s.translationKind==="content-topic-title"
  ?new DrizzleContentTopicTitlePlanningStore(drizzle(c)).upsertPending(s,r,admission,actorId)
  :new DrizzleContentPostBodyPlanningStore(drizzle(c)).upsertPending(s,r,admission,actorId);
}
async function facts(){
 const result:Record<string,unknown[]>={};
 for(const name of ["translation_task_generation_heads","translation_tasks","content_topic_title_translation_tasks",
  "content_post_body_translation_tasks","content_translation_request_budget_counters"]){
  result[name]=(await fixture.query("select * from "+name+" order by 1")).rows;
 }
 return result;
}
async function pid(c:Client){return (await c.query<{pid:number}>("select pg_backend_pid() as pid")).rows[0]!.pid;}
async function blocked(w:number,b:number){for(let n=0;n<220;n++){
 const r=await fixture.query<{pids:number[]}>("select pg_blocking_pids($1) as pids",[w]);
 if(r.rows[0]?.pids.includes(b))return;await new Promise(r=>setTimeout(r,15));
}throw new Error("Expected physical PG17 blocker not observed");}
function pause(c:Client,matches:(s:string)=>boolean){
 const original=c.query;let entered!:()=>void,resume!:()=>void,used=false;
 const observed=new Promise<void>(r=>{entered=r;}),released=new Promise<void>(r=>{resume=r;});
 c.query=((...args:unknown[])=>{
  const q=typeof args[0]==="string"?args[0]:args[0]&&typeof args[0]==="object"&&"text" in args[0]?String(args[0].text):"";
  if(!used&&matches(q)){used=true;entered();return released.then(()=>Reflect.apply(original,c,args));}
  return Reflect.apply(original,c,args);
 }) as typeof c.query;
 return {observed,resume,restore:()=>{c.query=original;}};
}
async function admit(id:string){
 const tasks=new DrizzleTranslationTaskStore(drizzle(fixture));
 const acquired=await tasks.acquireContentProviderAllowance(id,60000);
 if(acquired.outcome!=="acquired")throw new Error("expected allowance acquisition: "+acquired.outcome);
 expect(await tasks.persistContentProviderAllowanceAdmission(id,acquired.admissionToken,acquired.occurrence,"synthetic-provider","sa04-r-reservation")).toBe(true);
}
async function claim(kind:Kind,id:string){const tasks=new DrizzleTranslationTaskStore(drizzle(fixture));
 await admit(id);
 return kind==="title"?tasks.claimContentTopicTitle(id,60000):tasks.claimContentPostBody(id,60000);}

beforeAll(async()=>{
 await fixture.connect();await fixture.query("drop schema if exists "+schema+" cascade;create schema "+schema);
 for(const f of (await readdir("drizzle")).filter(p=>/^\d{4}_.+\.sql$/.test(p)).sort()){
  await fixture.query((await readFile("drizzle/"+f,"utf8")).replaceAll('"public".','"'+schema+'".'));
 }
 const forum=new DrizzleForumRepository(drizzle(fixture));
 await forum.createCategory({id:"r-category",name:"R"});await forum.createSection({id:"r-section",categoryId:"r-category",name:"R"});
});
afterAll(async()=>{await fixture.query("drop schema if exists "+schema+" cascade");await fixture.end();});

describe("SA04-R both authoritative real content planning stores",()=>{
 it.each(kinds)("active %s preserves task identity, pending/processing claim and transient actor privacy",async kind=>{
  const u=await content(),actor=await person(),s=await spec(kind,u);
  const first=await upsert(fixture,s.specification,s.revision,actor);expect(first.outcome).toBe("task");
  if(first.outcome!=="task")throw new Error("task missing");
  expect(first.created).toBe(true);expect(JSON.stringify(first)).not.toContain(actor);
  const claimed=await claim(kind,first.task.id);expect(claimed.outcome).toBe("claimed");
  const duplicate=await upsert(fixture,s.specification,s.revision,actor);
  expect(duplicate).toMatchObject({outcome:"task",created:false,task:{id:first.task.id,status:"processing"}});
  if(claimed.outcome!=="claimed"||duplicate.outcome!=="task")throw new Error("claim missing");
  expect(duplicate.task.claimToken).toBe(claimed.task.claimToken);
  expect(duplicate.task.leaseExpiresAt).toEqual(claimed.task.leaseExpiresAt);
 });

 for(const mode of ["same-unit-different-actors","different-units-same-actor"] as const){
  it.each(kinds)("concurrent %s "+mode+" serializes only on existing head/actor dependencies",async kind=>{
   const s=await spec(kind,await content()),other=mode==="same-unit-different-actors"?s:await spec(kind,await content());
   const actor=await person(),otherActor=mode==="same-unit-different-actors"?await person():actor;
   const a=await connection(),b=await connection(),barrier=pause(a,q=>/^commit$/i.test(q.trim()));
   let first:ReturnType<typeof upsert>|undefined,second:ReturnType<typeof upsert>|undefined;
   try{
    const ap=await pid(a),bp=await pid(b);first=upsert(a,s.specification,s.revision,actor);await barrier.observed;
    second=upsert(b,other.specification,other.revision,otherActor);await blocked(bp,ap);
    if(mode==="different-units-same-actor")expect((await fixture.query("select query from pg_stat_activity where pid=$1",[bp])).rows[0].query).toMatch(/from "user"/i);
    barrier.resume();const [x,y]=await Promise.all([first,second]);
    if(x.outcome!=="task"||y.outcome!=="task")throw new Error("expected accepted tasks");
    expect(y.task.id===x.task.id).toBe(mode==="same-unit-different-actors");
    expect(y.created).toBe(mode!=="same-unit-different-actors");
   }finally{barrier.resume();barrier.restore();await Promise.allSettled([...(first?[first]:[]),...(second?[second]:[])]);await Promise.all([a.end(),b.end()]);}
  },30000);
 }

 it.each(kinds)("different %s units/actors competing for the same one-unit budget admit exactly one",async kind=>{
  const s=await spec(kind,await content()),t=await spec(kind,await content()),a=await connection(),b=await connection();
  const actor=await person(),other=await person(),global={...budget.global,name:"r-race-"+uuid(),limit:1};
  try{
   const results=await Promise.all([
    upsert(a,s.specification,s.revision,actor,{...budget,subjectKey:"A".repeat(43),global}),
    upsert(b,t.specification,t.revision,other,{...budget,subjectKey:"B".repeat(43),global}),
   ]);
   expect(results.map(r=>r.outcome).sort()).toEqual(["request-budget-denied","task"]);
   expect((await fixture.query("select id from translation_tasks where task_identity in ($1,$2)",[s.specification.taskIdentity,t.specification.taskIdentity])).rowCount).toBe(1);
  }finally{await Promise.all([a.end(),b.end()]);}
 });

 for(const phase of ["fresh","pending","processing","stale","superseded","completed","manual-current"] as const){
  it.each(kinds)("inactive %s "+phase+" denies before receipt, quota, claim or durable provisional head",async kind=>{
   const u=await content(),actor=await person(),s=await spec(kind,u);
   if(phase!=="fresh"&&phase!=="manual-current"){
    const first=await upsert(fixture,s.specification,s.revision,actor);
    if(first.outcome!=="task")throw new Error("expected task");
    if(phase==="processing"||phase==="stale"){
     const claimed=await claim(kind,first.task.id);if(claimed.outcome!=="claimed")throw new Error("expected claim");
     if(phase==="stale")expect(await new DrizzleTranslationTaskStore(drizzle(fixture)).markStale(first.task.id,claimed.task.claimToken)).toBe(true);
    }
    if(phase==="superseded"){
     const newer=await spec(kind,u,"sa04-r-v2");await upsert(fixture,newer.specification,newer.revision,actor);
    }
    if(phase==="completed"){
     const claimed=await claim(kind,first.task.id);if(claimed.outcome!=="claimed")throw new Error("expected claim");
     await fixture.query("update translation_tasks set status='completed',completed_at=clock_timestamp(),claim_token=null,lease_expires_at=null where id=$1",[first.task.id]);
    }
   }
   if(phase==="manual-current")await new DrizzleContentTranslationStore(drizzle(fixture)).write({
    contentType:s.revision.contentType,contentId:s.revision.contentId,revisionId:s.revision.revisionId,
    sourceLocale:"ru",targetLocale:"he",translatedContent:"תרגום ידני",provenance:{origin:"persistent_manual"}});
   await deactivate(fixture,actor);const before=await facts();
   await expect(upsert(fixture,s.specification,s.revision,actor)).rejects.toBeInstanceOf(AccountInactiveError);
   expect(await facts()).toEqual(before);
  });
 }
 it.each(kinds)("missing %s actor rolls back first head/tasks/budgets",async kind=>{
  const s=await spec(kind,await content()),before=await facts();
  await expect(upsert(fixture,s.specification,s.revision,"missing-"+uuid())).rejects.toBeInstanceOf(AccountMissingError);
  expect(await facts()).toEqual(before);
 });
 it.each(kinds)("%s state-first actual lock wait denies and rolls back provisional head",async kind=>{
  const s=await spec(kind,await content()),actor=await person(),state=await connection(),writer=await connection();
  const before=await facts();let pending:ReturnType<typeof upsert>|undefined;
  try{
   const w=await pid(writer),b=await pid(state);await state.query("begin");await deactivate(state,actor);
   pending=upsert(writer,s.specification,s.revision,actor);void pending.catch(()=>{});
   await blocked(w,b);await state.query("commit");await expect(pending).rejects.toBeInstanceOf(AccountInactiveError);
   expect(await facts()).toEqual(before);
  }finally{await state.query("rollback").catch(()=>{});if(pending)await Promise.allSettled([pending]);await Promise.all([state.end(),writer.end()]);}
 },30000);
 it.each(kinds)("%s writer-first holds actor to COMMIT and later replay denies",async kind=>{
  const s=await spec(kind,await content()),actor=await person(),writer=await connection(),state=await connection();
  const barrier=pause(writer,q=>/^commit$/i.test(q.trim()));let writing:ReturnType<typeof upsert>|undefined,changing:Promise<void>|undefined;
  try{
   const w=await pid(writer),b=await pid(state);writing=upsert(writer,s.specification,s.revision,actor);void writing.catch(()=>{});
   await barrier.observed;changing=deactivate(state,actor);void changing.catch(()=>{});await blocked(b,w);
   barrier.resume();expect(await writing).toMatchObject({outcome:"task",created:true});await changing;const after=await facts();
   await expect(upsert(fixture,s.specification,s.revision,actor)).rejects.toBeInstanceOf(AccountInactiveError);expect(await facts()).toEqual(after);
  }finally{barrier.resume();barrier.restore();await Promise.allSettled([...(writing?[writing]:[]),...(changing?[changing]:[])]);await Promise.all([writer.end(),state.end()]);}
 },30000);

 it.each(kinds)("%s rechecks lifecycle after preflight and real content dependency wait",async kind=>{
  const u=await content(),s=await spec(kind,u),actor=await person(),writer=await connection(),locker=await connection();
  await createHyperdriveContentGenerationAdmission(url!,()=>new Client({connectionString:url,options})).assertAllowed(actor);
  const before=await facts();let pending:ReturnType<typeof upsert>|undefined;
  try{
   const w=await pid(writer),l=await pid(locker);await locker.query("begin");
   await locker.query(kind==="title"?"select id from forum_topics where id=$1 for update":"select id from forum_posts where id=$1 for update",[kind==="title"?u.topic:u.post]);
   pending=upsert(writer,s.specification,s.revision,actor);void pending.catch(()=>{});await blocked(w,l);
   await deactivate(fixture,actor);await locker.query("commit");
   await expect(pending).rejects.toBeInstanceOf(AccountInactiveError);expect(await facts()).toEqual(before);
  }finally{await locker.query("rollback").catch(()=>{});if(pending)await Promise.allSettled([pending]);await Promise.all([writer.end(),locker.end()]);}
 },30000);

 for(const order of ["generation-first","complaint-first"] as const){
  it.each(kinds)("R/N %s "+order+" same actor commits both real writers without reversed locks",async kind=>{
   const u=await content(),s=await spec(kind,u),actor=await person(),r=await connection(),n=await connection();
   const barrier=pause(order==="generation-first"?r:n,q=>/from "user"[\s\S]*for no key update/i.test(q));
   const report=()=>new DrizzleComplaintsRepository(drizzle(n)).submit(actor,{
    operationId:uuid(),reason:"spam",explanation:null,target:kind==="title"
     ?{kind:"topic-title",topicId:u.topic,revisionId:u.title}:{kind:"post",topicId:u.topic,postId:u.post,revisionId:u.body}});
   let planning:ReturnType<typeof upsert>|undefined,reporting:ReturnType<typeof report>|undefined;
   try{
    const rp=await pid(r),np=await pid(n);
    if(order==="generation-first"){
     planning=upsert(r,s.specification,s.revision,actor);await barrier.observed;reporting=report();await blocked(np,rp);
    }else{reporting=report();await barrier.observed;planning=upsert(r,s.specification,s.revision,actor);await blocked(rp,np);}
    barrier.resume();expect(await planning).toMatchObject({outcome:"task"});
    const recorded=await reporting;
    expect((await fixture.query("select id from forum_complaints where id=$1",[recorded!.complaintId])).rowCount).toBe(1);
   }finally{barrier.resume();barrier.restore();await Promise.allSettled([...(planning?[planning]:[]),...(reporting?[reporting]:[])]);await Promise.all([r.end(),n.end()]);}
  },30000);
 }

 it.each(kinds)("%s task-insert failure rolls back provisional head/budget and releases actor",async kind=>{
  const s=await spec(kind,await content()),actor=await person(),before=await facts();
  await fixture.query(`create function r_insert_failure() returns trigger language plpgsql as $$begin raise exception 'R_PRIVATE_FAULT';end $$`);
  await fixture.query("create trigger r_insert_failure before insert on translation_tasks for each row execute function r_insert_failure()");
  try{
   await expect(upsert(fixture,s.specification,s.revision,actor)).rejects.toThrow();expect(await facts()).toEqual(before);
   const state=await connection();try{await state.query("set lock_timeout='180ms'");await deactivate(state,actor);}finally{await state.end();}
  }finally{await fixture.query("drop trigger r_insert_failure on translation_tasks;drop function r_insert_failure()");}
 });

 for(const order of ["generation-first","edit-first"] as const){
  it.each(kinds)("R/J %s "+order+" uses content-before-actor and preserves revision/evidence identity",async kind=>{
   const u=await content(),s=await spec(kind,u),actor=await person(),r=await connection(),j=await connection();
   const first=order==="generation-first"?r:j,barrier=pause(first,q=>/from "user"[\s\S]*for no key update/i.test(q));
   const editRepo=new DrizzleForumRepository(drizzle(j)),revised={id:uuid(),originalContent:"Новая версия",sourceLocale:"he"};
   const edit=()=>kind==="title"?editRepo.reviseTopicTitle(u.topic,u.title,revised,u.author,"any"):editRepo.revisePostBody(u.post,u.body,revised,u.author,"any");
   let planning:ReturnType<typeof upsert>|undefined,editing:ReturnType<typeof edit>|undefined;
   try{
    const rp=await pid(r),jp=await pid(j);
    if(order==="generation-first"){
     planning=upsert(r,s.specification,s.revision,actor);await barrier.observed;editing=edit();await blocked(jp,rp);
    }else{editing=edit();await barrier.observed;planning=upsert(r,s.specification,s.revision,actor);await blocked(rp,jp);}
    barrier.resume();await editing;
    expect(await planning).toMatchObject({outcome:order==="generation-first"?"task":"revision-changed"});
    const current=kind==="title"?await new DrizzleContentTopicTitlePlanningStore(drizzle(fixture)).readCurrentRevision(u.topic)
     :await new DrizzleContentPostBodyPlanningStore(drizzle(fixture)).readCurrentRevision(u.post);
    expect(current?.revisionId).toBe(revised.id);
   }finally{barrier.resume();barrier.restore();await Promise.allSettled([...(planning?[planning]:[]),...(editing?[editing]:[])]);await Promise.all([r.end(),j.end()]);}
  },30000);
 }

 it.each(kinds)("accepted %s consumer still claims after requesting actor deactivation",async kind=>{
  const s=await spec(kind,await content()),actor=await person(),result=await upsert(fixture,s.specification,s.revision,actor);
  if(result.outcome!=="task")throw new Error("expected accepted task");await deactivate(fixture,actor);
  await admit(result.task.id);
  const database=drizzle(fixture),tasks=new DrizzleTranslationTaskStore(database),translations=new DrizzleContentTranslationStore(database);
  const consumer=kind==="title"?new ContentTopicTitleTaskConsumer({tasks,translations,revisions:new DrizzleContentTopicTitleExecutionStore(database),localeRegistry,generationPolicyVersion:"sa04-r-v1",leaseDurationMs:60000})
   :new ContentPostBodyTaskConsumer({tasks,translations,revisions:new DrizzleContentPostBodyExecutionStore(database),localeRegistry,generationPolicyVersion:"sa04-r-v1",protectedContentPolicyVersion:CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,leaseDurationMs:60000});
  expect(await consumer.consume({translationTaskId:result.task.id})).toMatchObject({outcome:"eligible",context:{attemptStarted:true}});
 });

 it.each(kinds)("%s dispatch after admitted COMMIT may follow state change; lost enqueue does not erase durable task",async kind=>{
  const u=await content(),s=await spec(kind,u),actor=await person();
  let observed=false;const enqueuer=new FakeTranslationTaskEnqueuer(async message=>{
   expect((await fixture.query("select id from translation_tasks where id=$1",[message.translationTaskId])).rowCount).toBe(1);
   await deactivate(fixture,actor);observed=true;throw new Error("synthetic enqueue ACK lost");
  });
  const deps={localeRegistry,sourceLocaleResolver:new ContentSourceLocaleResolver({detect:async()=>{throw new Error("known source");}},new ThresholdContentSourceLocalePolicy(.8,()=>true)),
   contentTranslations:new ContentTranslationService(new DrizzleContentTranslationStore(drizzle(fixture))),providerCapability:{supports:()=>true},enqueuer,generationPolicyVersion:"sa04-r-v1"};
  const p=kind==="title"?new ContentTopicTitleTranslationPlanner({...deps,tasks:new DrizzleContentTopicTitlePlanningStore(drizzle(fixture))})
   :new ContentPostBodyTranslationPlanner({...deps,tasks:new DrizzleContentPostBodyPlanningStore(drizzle(fixture))});
  await expect(p.planAndDispatch(s.revision,"he",budget,actor)).rejects.toThrow("synthetic enqueue ACK lost");
  expect(observed).toBe(true);expect((await fixture.query("select id,status from translation_tasks where task_identity=$1",[s.specification.taskIdentity])).rows)
   .toEqual([{id:expect.any(String),status:"pending"}]);
 });
});
