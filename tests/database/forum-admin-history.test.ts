import {RouterContextProvider} from "react-router";
import {authSessionContext} from "../../app/auth/request-context";
import {authorizationContext} from "../../app/authorization/request-context";
import {forumWriterContext} from "../../app/forum/request-context";
import {topicAction} from "../../app/forum/actions.server";
import {createHyperdriveForumWriter} from "../../db/hyperdrive-forum";
import {createHyperdriveAuthorization} from "../../db/hyperdrive-authorization";
import {readFile,readdir} from "node:fs/promises";
import {drizzle} from "drizzle-orm/node-postgres";
import {Client,Pool} from "pg";
import {afterAll,beforeAll,describe,it,expect} from "vitest";
import {DrizzleForumRepository,ForumStateConflictError,ForumAuthorizationError} from "../../db/forum-repository";
import {ForumService} from "../../db/forum-service";
import {HELP_SOLUTIONS_SERVICE_SECTION_ID} from "../../db/forum-identifiers";
import {PostgresAdminHistoryReader,ADMIN_HISTORY_ORDER_LOCK_SQL} from "../../db/admin-history";
import {PostgresAuthorizationRepository} from "../../db/authorization-repository";

const url=process.env.DATABASE_URL!;
if(!url||!["127.0.0.1","localhost"].includes(new URL(url).hostname)||!new URL(url).pathname.endsWith("_test"))throw new Error("Disposable loopback *_test DB required");
const schema="forum_admin_history_test";
const client=new Client({connectionString:url,options:`-c search_path=${schema}`});
const pool=new Pool({connectionString:url,application_name:"forum-admin-history-producer",options:`-c search_path=${schema}`});
let clock=Date.now();
const repository=new DrizzleForumRepository(drizzle(pool),{cooldownMs:5000,now:()=>new Date(clock+=5001)});
const forum=new ForumService(repository);
const reader=new PostgresAdminHistoryReader(pool);
const events=async(id:string)=>(await reader.read(undefined,50)).events.filter(e=>e.change.targetId===id);
async function topic(id:string,authorId="author"){
 await forum.createTopicWithInitialPost({id,sectionId:HELP_SOLUTIONS_SERVICE_SECTION_ID,authorId,
  titleRevision:{id:`${id}-title`,originalContent:`Question ${id}`,sourceLocale:"en"},
  initialPost:{id:`${id}-first`,topicId:id,authorId,bodyRevision:{id:`${id}-body`,originalContent:"PRIVATE body",sourceLocale:"en"}}});
 await forum.createPost({id:`${id}-answer`,topicId:id,authorId:"other",bodyRevision:{id:`${id}-answer-body`,originalContent:"PRIVATE answer",sourceLocale:"en"}});
}
async function route(actorId:string,topicId:string,fields:Record<string,string>){
 const context=new RouterContextProvider();const now=new Date();
 context.set(authSessionContext,{user:{id:actorId,name:actorId,email:`${actorId}@test.invalid`,emailVerified:true,createdAt:now,updatedAt:now},session:{id:"test",token:"test",userId:actorId,expiresAt:new Date(now.getTime()+60000),createdAt:now,updatedAt:now}});
 context.set(authorizationContext,createHyperdriveAuthorization(url,()=>new Pool({connectionString:url,options:`-c search_path=${schema}`})));
 context.set(forumWriterContext,createHyperdriveForumWriter(url,()=>new Client({connectionString:url,options:`-c search_path=${schema}`})));
 const body=new FormData();for(const [key,value] of Object.entries(fields))body.set(key,value);
 return topicAction({request:new Request(`https://forum.test/en/topics/${topicId}`,{method:"POST",headers:{Origin:"https://forum.test"},body}),params:{locale:"en",topicId},context});
}
beforeAll(async()=>{
 await client.connect();await client.query(`drop schema if exists ${schema} cascade;create schema ${schema}`);
 for(const f of(await readdir("drizzle")).filter(f=>/^\d{4}_.+\.sql$/.test(f)).sort())await client.query((await readFile(`drizzle/${f}`,"utf8")).replaceAll('"public".',`"${schema}".`));
 await client.query(`insert into "user"(id,name,email) values('manager','Manager עברית','private-manager@test.invalid'),('author','Author','private-author@test.invalid'),('other','Other','private-other@test.invalid');
 insert into authz_user_roles(user_id,role_id) values('manager','builtin-admin')`);
});
afterAll(async()=>{await pool.end();await client.query(`drop schema ${schema} cascade`);await client.end();});
describe("ordinary History from authoritative forum transactions",()=>{
 it("retains explicit own/admin route semantics and rejects forged own resources",async()=>{
  await topic("route-own","manager");await topic("route-admin","manager");await topic("route-foreign");
  expect(await route("manager","route-own",{intent:"markSolved",operationScope:"own"})).toMatchObject({status:302});
  expect(await events("route-own")).toHaveLength(0);
  expect(await route("manager","route-admin",{intent:"markSolved",operationScope:"any"})).toMatchObject({status:302});
  expect((await events("route-admin"))[0].change.action).toBe("topic.solved");
  expect(await route("manager","route-foreign",{intent:"markSolved",operationScope:"own"})).toMatchObject({init:{status:403}});
  expect(await route("author","route-foreign",{intent:"markSolved",operationScope:"any"})).toMatchObject({init:{status:403}});
  expect(await events("route-foreign")).toHaveLength(0);
 });
 it("keeps an opened own source operation own after an Any grant and checks revision identity",async()=>{
  await topic("route-source");
  const opened={intent:"correctTitleSourceLocale",operationScope:"own",expectedRevisionId:"route-source-title",sourceLocale:"he"};
  await client.query(`insert into authz_user_permission_overrides(user_id,permission_key,effect) values('author','forum.sourceLocale.correctAny','allow')`);
  expect(await route("author","route-source",opened)).toMatchObject({status:302});
  expect(await events("route-source")).toHaveLength(0);
  expect(await route("author","route-source",{...opened,sourceLocale:"ru"})).toMatchObject({init:{status:409}});
  const revision=(await repository.readTopicPage("route-source"))!.title.id;
  expect(await route("author","route-source",{...opened,expectedRevisionId:revision,operationScope:"any",sourceLocale:"ru"})).toMatchObject({status:302});
  expect((await events("route-source"))[0].change.action).toBe("topic.sourceLocaleCorrected");
 });
 it("rolls back pending-appeal removal with a failed append, then records its identity once",async()=>{
  await topic("pending-remove");await topic("pending-original");
  await forum.confirmHelpDuplicate("pending-remove","pending-original","manager");
  const relationship=(await repository.readTopicPage("pending-remove"))!.duplicateRelationshipId!;
  await forum.appealHelpDuplicate("pending-remove","author","PRIVATE removal appeal",relationship);
  const appeal=(await client.query("select id from forum_help_duplicate_appeals where relationship_id=$1",[relationship])).rows[0].id;
  const before=(await events("pending-remove")).length;
  await client.query(`create function reject_pending_history() returns trigger language plpgsql as $$begin raise exception 'synthetic append failure';end$$;create trigger reject_pending_history before insert on admin_history for each row execute function reject_pending_history()`);
  try{
   await expect(forum.removeHelpDuplicate("pending-remove","manager",relationship)).rejects.toThrow();
   expect((await client.query("select status from forum_help_duplicate_appeals where id=$1",[appeal])).rows[0].status).toBe("pending");
   expect((await repository.readTopicPage("pending-remove"))!.duplicateRelationshipId).toBe(relationship);
   expect(await events("pending-remove")).toHaveLength(before);
  }finally{await client.query("drop trigger reject_pending_history on admin_history;drop function reject_pending_history()");}
  await expect(forum.removeHelpDuplicate("pending-remove","manager","stale")).rejects.toBeInstanceOf(ForumStateConflictError);
  await forum.removeHelpDuplicate("pending-remove","manager",relationship);
  const after=await events("pending-remove");expect(after).toHaveLength(before+1);
  expect(after[0].change).toMatchObject({action:"help.duplicateRemoved",context:{relationshipId:relationship,originalTopicId:"pending-original",resolvedAppeal:{id:appeal,outcome:"accepted"}}});
  expect(JSON.stringify(after)).not.toContain("PRIVATE");
  await expect(forum.removeHelpDuplicate("pending-remove","manager",relationship)).rejects.toBeInstanceOf(ForumStateConflictError);
  expect(await events("pending-remove")).toHaveLength(before+1);
 });
 it("records only actual pin transitions with the unpin actor",async()=>{
  await topic("pins");
  await forum.pinTopic("pins","manager");await forum.pinTopic("pins","manager");
  await forum.unpinTopic("pins","other");await forum.unpinTopic("pins","other");
  expect((await events("pins")).map(e=>[e.change.action,e.actorId])).toEqual([["topic.unpinned","other"],["topic.pinned","manager"]]);
 });
 it("rolls back a domain change if the History insert fails and allows one real retry",async()=>{
  await topic("rollback");
  await client.query(`create function reject_forum_history() returns trigger language plpgsql as $$begin raise exception 'synthetic history failure';end$$;
   create trigger reject_forum_history before insert on admin_history for each row execute function reject_forum_history()`);
  try{
   await expect(forum.pinTopic("rollback","manager")).rejects.toThrow();
   expect((await repository.readTopicPage("rollback"))?.isPinned).toBe(false);
   expect(await events("rollback")).toHaveLength(0);
  }finally{await client.query("drop trigger reject_forum_history on admin_history;drop function reject_forum_history()");}
  await forum.pinTopic("rollback","manager");await forum.pinTopic("rollback","manager");
  expect(await events("rollback")).toHaveLength(1);
 });
 it("keeps own-only actions out of admin History even for a manager",async()=>{
  await topic("own","manager");
  await forum.selectBestAnswer("own","own-answer","manager","own");
  await forum.markTopicSolved("own","manager","own");
  await forum.correctTopicTitleSourceLocale({topicId:"own",expectedRevisionId:"own-title",sourceLocale:"he",actorId:"manager",scope:"own"});
  await forum.correctPostBodySourceLocale({topicId:"own",postId:"own-first",expectedRevisionId:"own-body",sourceLocale:"he",actorId:"manager",scope:"own"});
  expect(await events("own")).toHaveLength(0);expect(await events("own-first")).toHaveLength(0);
 });
 it("records administrative answer/solved changes, not retries or resource denial",async()=>{
  await topic("answer");
  await expect(forum.markTopicSolved("answer","other","own")).rejects.toBeInstanceOf(ForumAuthorizationError);
  await forum.selectBestAnswer("answer","answer-answer","manager","any");
  await forum.selectBestAnswer("answer","answer-answer","manager","any");
  await forum.markTopicSolved("answer","manager","any");
  await expect(forum.markTopicSolved("answer","manager","any")).rejects.toBeInstanceOf(ForumStateConflictError);
  expect((await events("answer")).map(e=>e.change.action)).toEqual(["topic.solved","topic.bestAnswerChanged"]);
 });
 it("retains validated outdated reasons and rejects stale answer identity",async()=>{
  await topic("moderation");await forum.selectBestAnswer("moderation","moderation-answer","author","own");await forum.markTopicSolved("moderation","author","own");
  expect(()=>forum.setHelpSolutionModeration("moderation","outdated"," ","manager","moderation-answer")).toThrow();
  await expect(forum.setHelpSolutionModeration("moderation","needs-review",null,"manager","wrong-answer")).rejects.toBeInstanceOf(ForumStateConflictError);
  await forum.setHelpSolutionModeration("moderation","outdated","Version no longer supported","manager","moderation-answer");
  await forum.setHelpSolutionModeration("moderation","outdated","Version no longer supported","manager","moderation-answer");
  await forum.setHelpSolutionModeration("moderation",null,null,"manager","moderation-answer");
  const history=await events("moderation");expect(history).toHaveLength(2);
  expect(history[1]).toMatchObject({reason:"Version no longer supported",change:{action:"help.solutionModerationChanged",context:{before:null,after:"outdated",postId:"moderation-answer"}}});
 });
 it("keeps duplicate/appeal identities and emits one event for accepted removal",async()=>{
  await topic("duplicate");await topic("original");
  await forum.confirmHelpDuplicate("duplicate","original","manager");
  const relationship=(await repository.readTopicPage("duplicate"))!.duplicateRelationshipId!;
  await expect(forum.removeHelpDuplicate("duplicate","manager","stale")).rejects.toBeInstanceOf(ForumStateConflictError);
  await client.query(`insert into forum_help_duplicate_appeals(id,relationship_id,appellant_user_id,explanation) values('appeal',$1,'author','PRIVATE appeal')`,[relationship]);
  await expect(forum.resolveHelpDuplicateAppeal("duplicate","manager","accepted","stale")).rejects.toBeInstanceOf(ForumStateConflictError);
  await forum.resolveHelpDuplicateAppeal("duplicate","manager","accepted","appeal");
  await expect(forum.resolveHelpDuplicateAppeal("duplicate","manager","accepted","appeal")).rejects.toBeInstanceOf(ForumStateConflictError);
  expect((await events("duplicate")).map(e=>e.change.action)).toEqual(["help.duplicateAppealResolved","help.duplicateConfirmed"]);
  await forum.confirmHelpDuplicate("duplicate","original","manager");
  await forum.removeHelpDuplicate("duplicate","manager",(await repository.readTopicPage("duplicate"))!.duplicateRelationshipId!);
  expect((await events("duplicate"))[0].change).toMatchObject({action:"help.duplicateRemoved"});
  expect(Object.keys((await events("duplicate"))[0].change.context).sort()).toEqual(["originalTopicId","relationshipId"]);
 });
 it("records signal review outcome and effect once, excluding private explanations",async()=>{
  await topic("signals");await forum.selectBestAnswer("signals","signals-answer","author","own");await forum.markTopicSolved("signals","author","own");
  await client.query(`insert into forum_help_signals(id,kind,topic_id,target_post_id,submitted_by_user_id,explanation) values
   ('signal-a','solution-outdated','signals','signals-answer','other','PRIVATE signal'),
   ('signal-b','needs-review','signals','signals-answer','author','PRIVATE rejection')`);
  await forum.resolveHelpSignal("signal-a","manager","accepted");
  await expect(forum.resolveHelpSignal("signal-a","manager","accepted")).rejects.toBeInstanceOf(ForumStateConflictError);
  // The accepted outdated effect supersedes pending needs-review. A fresh independent case can be rejected.
  await client.query(`insert into forum_help_signals(id,kind,topic_id,submitted_by_user_id,explanation) values('signal-c','needs-details','signals','other','PRIVATE rejection')`);
  await forum.resolveHelpSignal("signal-c","manager","rejected");
  await client.query(`insert into forum_help_signals(id,kind,topic_id,target_post_id,submitted_by_user_id,explanation) values('signal-d','solution-outdated','signals','signals-answer','other','PRIVATE stale')`);
  await forum.resolveHelpSignal("signal-d","manager","accepted");
  const history=await events("signals");expect(history).toHaveLength(3);
  expect(history.every(e=>e.change.action==="help.signalReviewed")).toBe(true);
  expect(history[2].change.context).toMatchObject({resolution:"accepted",effect:{action:"help.solutionModerationChanged",context:{after:"outdated"}}});
  expect(history[0].change.context).toMatchObject({resolution:"superseded"});
  expect(JSON.stringify(history)).not.toContain("PRIVATE");
 });
 it("uses revision CAS for source correction, with metadata-only History",async()=>{
  await topic("locale");
  await forum.correctTopicTitleSourceLocale({topicId:"locale",expectedRevisionId:"locale-title",sourceLocale:"he",actorId:"manager",scope:"any"});
  const current=(await repository.readTopicPage("locale"))!.title.id;
  await forum.correctTopicTitleSourceLocale({topicId:"locale",expectedRevisionId:current,sourceLocale:"he",actorId:"manager",scope:"any"});
  await expect(forum.correctTopicTitleSourceLocale({topicId:"locale",expectedRevisionId:"locale-title",sourceLocale:"ru",actorId:"manager",scope:"any"})).rejects.toBeInstanceOf(ForumStateConflictError);
  await forum.correctPostBodySourceLocale({topicId:"locale",postId:"locale-answer",expectedRevisionId:"locale-answer-body",sourceLocale:"ru",actorId:"manager",scope:"any"});
  expect(await events("locale")).toHaveLength(1);expect(await events("locale-answer")).toHaveLength(1);
  expect((await events("locale-answer"))[0].change).toMatchObject({targetType:"post",context:{topicId:"locale",before:"en",after:"ru"}});
  expect(JSON.stringify(await events("locale-answer"))).not.toContain("PRIVATE");
 });
 it("serializes identity allocation across forum and authorization commits",async()=>{
  await topic("order");
  const blocker=await pool.connect();
  const pending:Promise<unknown>[]=[];
  const waitForProducers=async(expected:number)=>{
   for(let n=0;n<200;n++){
    const result=await client.query(`select count(*)::int n from pg_stat_activity where application_name='forum-admin-history-producer' and wait_event='advisory'`);
    if(result.rows[0].n===expected)return;
    await new Promise(resolve=>setTimeout(resolve,10));
   }
   throw new Error(`Expected ${expected} actual producers waiting on shared History order lock`);
  };
  try{
   await blocker.query("begin");await blocker.query(ADMIN_HISTORY_ORDER_LOCK_SQL);
   pending.push(forum.pinTopic("order","manager"));
   await waitForProducers(1);
   const auth=new PostgresAuthorizationRepository(pool);
   pending.push(auth.createCustomRole("manager",{id:"ordered-role",slug:"ordered-role",displayName:"Ordered"}));
   await waitForProducers(2);
   await blocker.query(`insert into admin_history(id,actor_id,actor_label,action,target_type,target_id,target_label,context) values(gen_random_uuid(),'manager','Manager','role.created','role','order-role','Order','{"slug":"order-role"}')`);
   const beforeCommit=await reader.read(undefined,1);
   await blocker.query("commit");await Promise.all(pending);
   const history=(await reader.read(undefined,3)).events;
   expect(history.map(e=>e.change.action)).toEqual(["role.created","topic.pinned","role.created"]);
   expect(beforeCommit.next).not.toBeNull();
   const older=await reader.read(beforeCommit.next!,50);
   expect(older.events.some(e=>["order","ordered-role","order-role"].includes(e.change.targetId))).toBe(false);
  }finally{await blocker.query("rollback");blocker.release();await Promise.allSettled(pending);}
 });
});
