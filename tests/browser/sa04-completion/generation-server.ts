/** Test-only HTTP composition. Production Worker generation remains disabled.
 * Real canonical action, BA-issued session, current authorization, planner,
 * PostgreSQL stores and HMAC; supported provider/enqueue seams stay local.
 */
import { createServer } from "node:http";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { RouterContextProvider } from "react-router";
import { topicAction } from "../../../app/forum/actions.server";
import { authSessionContext, type AuthSession } from "../../../app/auth/request-context";
import { authorizationContext } from "../../../app/authorization/request-context";
import { forumReaderContext } from "../../../app/forum/request-context";
import { localeContext, contentGenerationActionContext, contentGenerationAdmissionContext } from "../../../app/localization/request-context";
import { DefaultContentGenerationActionCapability } from "../../../app/localization/content-generation-action.server";
import { WebCryptoContentTranslationRequesterPseudonymizer } from "../../../app/localization/content-request-budget.server";
import { ContentTopicTitleTranslationPlanner } from "../../../app/localization/content-translation-planning";
import { ContentPostBodyTranslationPlanner } from "../../../app/localization/content-post-body-planning";
import { ContentSourceLocaleResolver, ThresholdContentSourceLocalePolicy } from "../../../app/localization/content-source-locale";
import { ContentTranslationService } from "../../../app/localization/content-translation";
import { localeRegistry } from "../../../app/localization/registry";
import { DrizzleForumRepository } from "../../../db/forum-repository";
import { DrizzleContentTranslationStore } from "../../../db/content-translation-store";
import { DrizzleContentTopicTitlePlanningStore } from "../../../db/content-topic-title-task-store";
import { DrizzleContentPostBodyPlanningStore } from "../../../db/content-post-body-task-store";
import { createHyperdriveAuthorization } from "../../../db/hyperdrive-authorization";
import { createHyperdriveContentGenerationAdmission } from "../../../db/hyperdrive-content-generation-admission";

const connection=process.env.DATABASE_URL??"",databaseUrl=new URL(connection);
const authBase=process.env.SA04_AUTH_BASE??"http://127.0.0.1:4225";
const port=Number(process.env.SA04_GENERATION_PORT??4226),base="http://127.0.0.1:"+port;
if(!["127.0.0.1","localhost"].includes(databaseUrl.hostname)||!databaseUrl.pathname.endsWith("_test")
 ||!["127.0.0.1","localhost"].includes(new URL(authBase).hostname)||!Number.isInteger(port)||port<1024||port>65535){
 throw new Error("SA04 generation composition requires disposable loopback endpoints");
}
const pool=new Pool({connectionString:connection,max:8}),db=drizzle(pool);
const admission=createHyperdriveContentGenerationAdmission(connection);
const pseudonymizer=new WebCryptoContentTranslationRequesterPseudonymizer(new Uint8Array(32).fill(83),"sa04-test-v1");
const policy={cost:1,windowSeconds:3600,global:{name:"sa04-s-global",version:"v1",limit:10000},requester:{name:"sa04-s-requester",version:"v1",limit:10000}};
const deps={localeRegistry,sourceLocaleResolver:new ContentSourceLocaleResolver({detect:async()=>{throw new Error("fixtures use known source");}},new ThresholdContentSourceLocalePolicy(.8,()=>true)),
 contentTranslations:new ContentTranslationService(new DrizzleContentTranslationStore(db)),providerCapability:{supports:()=>true},generationPolicyVersion:"sa04-s-local-v1",
 enqueuer:{enqueue:async(message:{translationTaskId:string})=>{
  const result=await pool.query("select id from translation_tasks where id=$1",[message.translationTaskId]);
  if(result.rowCount!==1)throw new Error("enqueue preceded durable task COMMIT");
 }}};
const capability=new DefaultContentGenerationActionCapability({admission,pseudonymizer,titlePolicy:policy,postBodyPolicy:policy,
 titlePlanner:new ContentTopicTitleTranslationPlanner({...deps,tasks:new DrizzleContentTopicTitlePlanningStore(db)}),
 postBodyPlanner:new ContentPostBodyTranslationPlanner({...deps,tasks:new DrizzleContentPostBodyPlanningStore(db)})});
const server=createServer(async(incoming,outgoing)=>{
 try{
  const url=new URL(incoming.url??"/",base);
  if(url.pathname==="/_ready"){outgoing.writeHead(200);outgoing.end("ready");return;}
  const route=/^\/(en|ru|he)\/topics\/([^/]+)$/.exec(url.pathname);
  if(!route){outgoing.writeHead(404);outgoing.end();return;}
  const chunks:Buffer[]=[];let size=0;
  for await(const chunk of incoming){size+=chunk.length;if(size>32768){outgoing.writeHead(413);outgoing.end();return;}chunks.push(chunk);}
  const auth=await fetch(authBase+"/api/auth/get-session",{headers:{Cookie:incoming.headers.cookie??""}});
  if(!auth.ok){outgoing.writeHead(auth.status,{"Cache-Control":"private, no-store"});outgoing.end("Authentication unavailable");return;}
  const session=await auth.json() as AuthSession|null;
  const context=new RouterContextProvider();context.set(authSessionContext,session);
  context.set(authorizationContext,createHyperdriveAuthorization(connection));
  context.set(forumReaderContext,new DrizzleForumRepository(db));
  const locale=route[1]!;
  context.set(localeContext,{translationLocale:locale,fallbackLocales:["en"],direction:locale==="he"?"rtl":"ltr",formatting:{locale,timeZone:"UTC"},nativeName:locale,presentationMetadata:{}});
  context.set(contentGenerationAdmissionContext,admission);context.set(contentGenerationActionContext,{enabled:true,capability});
  const request=new Request(url,{method:incoming.method,headers:Object.fromEntries(Object.entries(incoming.headers).filter((entry):entry is [string,string]=>typeof entry[1]==="string")),
   ...(incoming.method!=="GET"&&incoming.method!=="HEAD"?{body:Buffer.concat(chunks)}:{})});
  const result=await topicAction({request,params:{locale,topicId:decodeURIComponent(route[2]!)},context});
  if(result instanceof Response){outgoing.writeHead(result.status,Object.fromEntries(result.headers));outgoing.end(await result.text());return;}
  const headers=new Headers(result.init?.headers);headers.set("Cache-Control","private, no-store");headers.set("Content-Type","application/json");
  outgoing.writeHead(result.init?.status??200,Object.fromEntries(headers));outgoing.end(JSON.stringify(result.data));
 }catch(error){
  if(error instanceof Response){outgoing.writeHead(error.status,Object.fromEntries(error.headers));outgoing.end(await error.text());return;}
  process.stderr.write("SA04_S_R_UNEXPECTED "+(error instanceof Error?error.name:"unknown")+"\n");
  outgoing.writeHead(500,{"Cache-Control":"private, no-store"});outgoing.end("Unexpected server failure");
 }
});
server.listen(port,"127.0.0.1",()=>process.stdout.write("SA04_S_R_COMPOSITION_READY\n"));
for(const signal of ["SIGTERM","SIGINT"] as const)process.on(signal,()=>{server.close();void pool.end().finally(()=>process.exit(0));});
