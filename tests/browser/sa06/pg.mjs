/** SA06 synthetic fixture/inspection process, no network listener or app substitute. */
import process from 'node:process';import console from 'node:console';import crypto from 'node:crypto';import {URL} from 'node:url';import readline from 'node:readline';import pg from 'pg';import {drizzle} from 'drizzle-orm/node-postgres';
import {DrizzleForumRepository} from '../../../db/forum-repository.ts';import {DrizzleComplaintsRepository} from '../../../db/complaints-repository.ts';import {UserMeasuresService,PostgresUserMeasuresRepository} from '../../../db/user-measures.ts';
const url=process.env.DATABASE_URL,db=new URL(url??'http://invalid');
if(process.env.CI!=='true'||!['127.0.0.1','localhost'].includes(db.hostname)||db.pathname!=='/vico_sa06_browser_test')throw new Error('Own disposable SA06 test database required');
const c=new pg.Client({connectionString:url});await c.connect();const forum=new DrizzleForumRepository(drizzle(c),{cooldownMs:0,now:()=>new Date()}),uuid=()=>crypto.randomUUID();console.log('READY');
try{for await(const line of readline.createInterface({input:process.stdin,crlfDelay:Infinity})){
 try{const x=JSON.parse(line);let result;
  if(x.operation==='sql'){const reply=await c.query(x.sql,x.params??[]);result=Array.isArray(reply)?reply.flatMap(part=>part.rows??[]):reply.rows;}
  else if(x.operation==='seed'){
   await forum.createCategory({id:x.prefix,name:'SA06 native fixture'});await forum.createSection({id:x.prefix,categoryId:x.prefix,name:'SA06 native fixture'});const topics=[];
   for(let n=0;n<32;n++){const id=uuid(),post=uuid(),title=uuid(),body=uuid();await forum.createTopicWithInitialPost({id,sectionId:x.prefix,authorId:x.owner,titleRevision:{id:title,sourceLocale:'en',originalContent:'SA06_PRIVATE_TITLE'},initialPost:{id:post,topicId:id,authorId:x.owner,bodyRevision:{id:body,sourceLocale:'en',originalContent:'SA06_PRIVATE_BODY'}}});topics.push({id,post,title,body});}
   const first=topics[0],reply=uuid(),replyRevision=uuid();await forum.createPost({id:reply,topicId:first.id,authorId:x.member,bodyRevision:{id:replyRevision,sourceLocale:'en',originalContent:'SA06_PRIVATE_REPLY'}});
   const pool={query:c.query.bind(c),connect:async()=>Object.assign(c,{release:()=>{}})};
   const measures=new UserMeasuresService(new PostgresUserMeasuresRepository(pool,x.owner)),measure=uuid();
   await measures.create({id:measure,actorId:x.owner,targetUserId:x.member,reason:'SA06_PRIVATE_REASON',restrictions:['replies.create'],expiresAt:null});
   const appeal=await measures.submitAppeal({id:uuid(),measureId:measure,actorId:x.member,body:'SA06_PRIVATE_APPEAL'});await measures.lift({measureId:measure,actorId:x.owner,operationId:uuid(),expectedVersion:1,reason:'SA06_PRIVATE_LIFT'});
   const complaints=new DrizzleComplaintsRepository(drizzle(c),{tenMinutes:10000,day:10000});
   const {caseId}=await complaints.submit(x.owner,{target:{kind:'post',topicId:first.id,postId:reply,revisionId:replyRevision},reason:'spam',explanation:'SA06_PRIVATE_REPORT',operationId:uuid()});
   const version=(await c.query('select version from forum_complaint_cases where id=$1',[caseId])).rows[0].version;
   const decisionId=await complaints.decide(x.admin,{caseId,operationId:uuid(),expectedVersion:version,outcome:'not-confirmed',reasoning:'SA06_PRIVATE_DECISION'});
   const complaintAppeal=await complaints.appeal(x.owner,{caseId,decisionId,operationId:uuid(),argument:'SA06_PRIVATE_ARGUMENT'});await complaints.resolveAppeal(x.admin,{caseId,appealId:complaintAppeal,operationId:uuid(),outcome:'upheld',reasoning:'SA06_PRIVATE_OUTCOME'});
   const help=uuid(),helpPost=uuid();await forum.createTopicWithInitialPost({id:help,sectionId:'help-solutions-questions',authorId:x.owner,titleRevision:{id:uuid(),sourceLocale:'en',originalContent:'SA06_PRIVATE_HELP'},initialPost:{id:helpPost,topicId:help,authorId:x.owner,bodyRevision:{id:uuid(),sourceLocale:'en',originalContent:'SA06_PRIVATE_HELP_BODY'}}});
   const signal=await forum.createHelpSignal({kind:'needs-details',topicId:help,actorId:x.member,explanation:'SA06_PRIVATE_SIGNAL',proposedOriginalTopicId:null});await forum.withdrawHelpSignal(signal.id,help,x.member);
   result={topic:first.id,title:first.title,post:first.post,body:first.body,measure,appeal:appeal.id,caseId,signal:signal.id};
  }else throw new Error('Unknown fixture command');
  console.log(JSON.stringify({result}));
 }catch(error){console.log(JSON.stringify({error:{message:String(error),code:error?.code}}));}
}}finally{await c.end();}
