/**
 * Package 7: local Worker -> Better Auth session -> permission -> PostgreSQL smoke.
 * Invoked only in CI with a disposable loopback *_test PostgreSQL database.
 * No production credentials, external OAuth, remote bucket, or browser required.
 */
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {randomBytes,randomUUID} from "node:crypto";
import {readdir,readFile,rm,writeFile} from "node:fs/promises";
import {openSync,closeSync} from "node:fs";
import {resolve} from "node:path";
import {drizzle} from "drizzle-orm/node-postgres";
import {Client} from "pg";
import {DrizzleForumRepository} from "../db/forum-repository";

const connectionString=process.env.DATABASE_URL;
const base="http://127.0.0.1:4181";
if(process.env.CI!=="true"||!connectionString)throw new Error("CI disposable test database required");
const dbUrl=new URL(connectionString);
if(!["127.0.0.1","localhost"].includes(dbUrl.hostname)||!dbUrl.pathname.endsWith("_test"))
  throw new Error("Only loopback *_test PostgreSQL is allowed");
const schema="complaints_p7_http_smoke";
const client=new Client({connectionString,options:"-c search_path="+schema});
const bindingsUrl=new URL(connectionString);
bindingsUrl.searchParams.set("options","-c search_path="+schema);
const localConnectionString=bindingsUrl.toString();
const vars=resolve(".dev.vars");
const previewLog=resolve(".vico-p7-preview.log");
let worker:ReturnType<typeof spawn>|undefined;

function expectStatus(response:Response,status:number,path:string){
  assert.equal(response.status,status,"Unexpected HTTP status for "+path);
}
function expectPrivate(response:Response,path:string){
  assert.match(response.headers.get("Cache-Control")??"",/no-store/,"Missing no-store: "+path);
}
async function http(path:string,init:RequestInit={},cookie?:string){
  const headers=new Headers(init.headers);
  if(cookie)headers.set("Cookie",cookie);
  return fetch(base+path,{...init,headers,redirect:"manual",signal:AbortSignal.timeout(15000)});
}
async function form(path:string,cookie:string,fields:Record<string,string>){
  return http(path,{method:"POST",headers:{
    Origin:base,"Content-Type":"application/x-www-form-urlencoded"
  },body:new URLSearchParams(fields)},cookie);
}
async function signUp(role:string){
  const response=await http("/api/auth/sign-up/email",{
    method:"POST",headers:{Origin:base,"Content-Type":"application/json"},
    body:JSON.stringify({name:"Smoke "+role,email:role+"-"+randomUUID()+"@p7.invalid",
      password:"Test-Only-"+randomBytes(12).toString("hex")})
  });
  assert.ok(response.status>=200&&response.status<300,"Signup HTTP failed for "+role+": "+response.status);
  const sessionCookie=response.headers.getSetCookie()
    .find(value=>value.includes("session_token"))?.split(";")[0];
  assert.ok(sessionCookie,"Better Auth must return a session cookie for "+role);
  const session=await http("/api/auth/get-session",{},sessionCookie);
  expectStatus(session,200,"/api/auth/get-session");
  const payload=await session.json() as {user?:{id?:string}};
  assert.ok(payload.user?.id,"Better Auth must resolve the actual session for "+role);
  return {id:payload.user.id,cookie:sessionCookie};
}
async function setupDatabase(){
  await client.connect();
  const existing=await client.query<{existing:string|null}>(
    "select to_regnamespace($1)::text as existing",[schema]);
  assert.equal(existing.rows[0]?.existing,null,"Refusing to reuse an existing smoke schema");
  await client.query("create schema "+schema);
  const files=(await readdir("drizzle")).filter(name=>/^\d{4}_.+\.sql$/.test(name)).sort();
  assert.ok(files.length>=55,"Expected accepted migration history in disposable database");
  for(const file of files)await client.query((await readFile("drizzle/"+file,"utf8"))
    .replaceAll('"public".','"'+schema+'".'));
}
async function ready(){
  for(let i=0;i<90;i++){
    if(worker?.exitCode!==null)throw new Error("Local preview exited early");
    try{
      const response=await http("/he/");
      if(response.status===200)return;
    }catch{ /* Local preview may not be ready yet. */ }
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  throw new Error("Local Worker did not reach ready state");
}
async function run(){
  await setupDatabase();
  // Cloudflare Vite preview consumes local, ignored .dev.vars; never print secrets.
  await writeFile(vars,[
    "BETTER_AUTH_SECRET="+randomBytes(32).toString("hex"),
    "BETTER_AUTH_URL="+base,
    "GOOGLE_CLIENT_ID=local-test-unused",
    "GOOGLE_CLIENT_SECRET=local-test-unused",
    ""
  ].join("\n"),{mode:0o600,flag:"wx"});
  const fd=openSync(previewLog,"w",0o600);
  worker=spawn("pnpm",["exec","vite","preview","--host","127.0.0.1",
    "--port","4181","--strictPort"],{stdio:["ignore",fd,fd],detached:true,env:{
      ...process.env,
      CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE:localConnectionString,
      CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_WEB_HYPERDRIVE:localConnectionString
    }});
  closeSync(fd);
  await ready();

  const [author,reporter,reviewer,appealReviewer]=await Promise.all([
    signUp("author"),signUp("reporter"),signUp("reviewer"),signUp("appeal-reviewer")
  ]);
  for(const user of [author,reporter,reviewer,appealReviewer])
    await client.query("insert into authz_user_roles(user_id,role_id) values ($1,'builtin-user') on conflict do nothing",[user.id]);
  await client.query("insert into authz_user_roles(user_id,role_id) values ($1,'builtin-moderator') on conflict do nothing",[reviewer.id]);
  await client.query("insert into authz_user_permission_overrides(user_id,permission_key,effect) "+
    "values ($1,'forum.complaint.appeal.review','deny'),($2,'forum.complaint.appeal.review','allow'),"+
    "($2,'forum.complaint.review','deny')",[reviewer.id,appealReviewer.id]);

  const categoryId=randomUUID(),sectionId=randomUUID();
  const topicId=randomUUID(),postId=randomUUID(),revisionId=randomUUID(),titleId=randomUUID();
  const forum=new DrizzleForumRepository(drizzle(client),{cooldownMs:0,now:()=>new Date()});
  await forum.createCategory({id:categoryId,name:"P7 local Worker smoke"});
  await forum.createSection({id:sectionId,categoryId,name:"P7 local Worker smoke"});
  await forum.createTopicWithInitialPost({id:topicId,sectionId,authorId:author.id,
    titleRevision:{id:titleId,originalContent:"P7 Worker title",sourceLocale:"en"},
    initialPost:{id:postId,topicId,authorId:author.id,bodyRevision:{
      id:revisionId,originalContent:"P7 immutable report text",sourceLocale:"en"
    }}});
  const attachmentId=randomUUID();
  await client.query("insert into forum_attachments "+
    "(id,owner_id,object_key,file_name,declared_mime,detected_type,response_mime,byte_size,verification_status,created_at) "+
    "values ($1,$2,$3,'report.txt','text/plain','text','text/plain',4,'type-checked',now())",
    [attachmentId,author.id,"private/"+attachmentId]);
  await client.query("insert into forum_post_attachments(post_id,attachment_id,created_at) "+
    "values ($1,$2,now())",[postId,attachmentId]);

  const casePost="/en/topics/"+topicId+"/complaints";
  let response=await form(casePost,reporter.cookie,{
    kind:"post",postId,revisionId,reason:"spam",operationId:randomUUID()
  });
  expectStatus(response,200,casePost);expectPrivate(response,casePost);
  const report=(await client.query<{id:string;version:number}>(
    "select c.id,c.version from forum_complaint_cases c "+
    "join forum_complaint_targets t on t.id=c.target_id "+
    "where t.post_id=$1 and t.post_revision_id=$2",[postId,revisionId])).rows;
  assert.equal(report.length,1,"Real HTTP submission must persist exactly one Case");
  const {id:caseId,version}=report[0]!;

  const queue="/en/attention?mode=complaints&group=group1&page=0";
  response=await http(queue,{},reviewer.cookie);expectStatus(response,200,queue);
  response=await http(queue,{},appealReviewer.cookie);expectStatus(response,403,queue);
  const review="/en/attention/complaints/"+caseId+"/review";
  response=await http(review,{},reviewer.cookie);expectStatus(response,200,review);
  expectPrivate(response,review);
  response=await http(review,{},reporter.cookie);expectStatus(response,403,review);
  await forum.editPublishedPost({topicId,postId,actorId:author.id,
    expectedRevisionId:revisionId,body:"P7 Worker current edited text",draftId:randomUUID(),
    attachmentIds:[],retainedAttachmentIds:[]});
  const context="/en/attention/complaints/"+caseId+"/context/"+postId;
  response=await http(context,{},reviewer.cookie);expectStatus(response,200,context);
  const protectedAsset="/en/attention/complaints/"+caseId+"/evidence/"+attachmentId;
  response=await http(protectedAsset,{},reporter.cookie);expectStatus(response,403,protectedAsset);
  response=await http(protectedAsset,{},reviewer.cookie);
  expectStatus(response,503,protectedAsset);expectPrivate(response,protectedAsset);
  const foreignAsset="/en/attention/complaints/"+caseId+"/evidence/"+randomUUID();
  response=await http(foreignAsset,{},reviewer.cookie);expectStatus(response,404,foreignAsset);

  response=await form(review,reviewer.cookie,{intent:"decision",expectedVersion:String(version),
    operationId:randomUUID(),outcome:"not-confirmed",reasoning:"Decision via real Worker"});
  expectStatus(response,200,review);
  const decision=(await client.query<{id:string}>(
    "select id from forum_complaint_decisions where case_id=$1",[caseId])).rows;
  assert.equal(decision.length,1,"Real HTTP Decision must persist once");
  const result="/ru/complaints/"+caseId+"/result";
  response=await http(result,{},reporter.cookie);expectStatus(response,200,result);
  expectPrivate(response,result);
  assert.match(await response.text(),/lang="ru"/,"Russian participant SSR must use ru");
  response=await http(result,{},appealReviewer.cookie);expectStatus(response,404,result);

  const appealPath="/en/complaints/"+caseId+"/result";
  response=await form(appealPath,reporter.cookie,{intent:"appeal",
    decisionId:decision[0]!.id,operationId:randomUUID(),argument:"Reporter Appeal over HTTP"});
  expectStatus(response,200,appealPath);
  const appeal=(await client.query<{id:string}>(
    "select id from forum_complaint_appeals where case_id=$1",[caseId])).rows;
  assert.equal(appeal.length,1,"Real HTTP Appeal must persist once");
  const appealQueue="/he/attention?mode=complaints&group=group2&page=0";
  response=await http(appealQueue,{},appealReviewer.cookie);
  expectStatus(response,200,appealQueue);
  const he=await response.text();
  assert.match(he,/lang="he"/);assert.match(he,/dir="rtl"/);
  response=await http(appealQueue,{},reviewer.cookie);expectStatus(response,403,appealQueue);
  const appealReview="/en/attention/complaints/"+caseId+"/appeals/"+appeal[0]!.id;
  response=await http(appealReview,{},appealReviewer.cookie);
  expectStatus(response,200,appealReview);expectPrivate(response,appealReview);
  response=await form(appealReview,appealReviewer.cookie,{intent:"resolve",
    operationId:randomUUID(),outcome:"overturned",reasoning:"Appeal resolved by Worker"});
  expectStatus(response,200,appealReview);
  const resolved=(await client.query<{status:string;outcome:string}>(
    "select status,outcome from forum_complaint_appeals where id=$1",[appeal[0]!.id])).rows[0];
  assert.deepEqual(resolved,{status:"resolved",outcome:"overturned"});
  const timeline="/en/attention/complaints/"+caseId+"/history?page=0";
  response=await http(timeline,{},reviewer.cookie);expectStatus(response,200,timeline);
  response=await http(timeline,{},reporter.cookie);expectStatus(response,403,timeline);
  const inbox="/en/notifications?page=0";
  response=await http(inbox,{},reporter.cookie);expectStatus(response,200,inbox);
  const notifications=(await client.query<{id:string;kind:string}>(
    "select id,kind from forum_reply_notifications "+
    "where recipient_user_id=$1 and kind in ('complaint-decision','complaint-appeal-result')",
    [reporter.id])).rows;
  assert.equal(notifications.length,2,"Decision and Appeal must reach shared inbox");
  const appealNotice=notifications.find(row=>row.kind==="complaint-appeal-result")!;
  response=await form("/en/notifications",reporter.cookie,{
    intent:"open",notificationId:appealNotice.id
  });
  assert.ok([302,303].includes(response.status),"Inbox open must redirect to participant result");
  assert.equal(response.headers.get("Location"),
    "/en/complaints/"+caseId+"/result#appeal-"+appeal[0]!.id);
  console.log("P7 local Worker/session/authorization/PostgreSQL HTTP smoke: PASS");
}
try{
  await run();
}catch(error){
  // Show only the failing step/status, never cookie, password, DB URL or secret.
  console.error("P7 HTTP smoke failed:",error instanceof Error?error.message:String(error));
  process.exitCode=1;
}finally{
  if(worker?.pid){
    try{process.kill(-worker.pid,"SIGTERM");}catch{ /* Preview may already have exited. */ }
  }
  await client.end().catch(()=>{});
  await rm(vars,{force:true});
  await rm(previewLog,{force:true});
}
