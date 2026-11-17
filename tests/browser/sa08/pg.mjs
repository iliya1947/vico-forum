/** Own synthetic task producers and inspection; no HTTP listener or authoritative substitute. */
import process from 'node:process';import console from 'node:console';import readline from 'node:readline';import {URL} from 'node:url';
import crypto from 'node:crypto';import pg from 'pg';import {drizzle} from 'drizzle-orm/node-postgres';
import {DrizzleTranslationTaskStore} from '../../../db/translation-task-store.ts';
import {PostgresOwnerOperationalFactSink} from '../../../db/owner-operational-facts.ts';
import {uiTranslationJobIdentity} from '../../../app/localization/ui-translation-service.ts';
import {DrizzleForumRepository} from '../../../db/forum-repository.ts';
import {DrizzleContentTranslationStore} from '../../../db/content-translation-store.ts';
import {DrizzleContentTranslationRequestBudgetStore} from '../../../db/content-request-budget-store.ts';
import {HELP_SOLUTIONS_SERVICE_SECTION_ID} from '../../../db/forum-identifiers.ts';
import {canonicalEnglishCatalog} from '../../../app/localization/catalog.ts';
import {sourceFingerprint} from '../../../app/localization/fingerprint.ts';
import {compileNamespaceBundle} from '../../../app/localization/bundles.ts';
import {DrizzleUiTranslationBundleStore} from '../../../db/ui-translation-bundle-store.ts';
import {account} from '../../../db/schema.ts';
import {AuthCreationEvidence} from '../../../app/auth/auth-creation-evidence.ts';
import {PostgresAuthFactWriter} from '../../../db/owner-auth-facts.ts';
const url=process.env.DATABASE_URL,target=new URL(url??'http://invalid');
if(process.env.CI!=='true'||!['127.0.0.1','localhost'].includes(target.hostname)||target.pathname!=='/vico_sa08_browser_test')throw Error('Own disposable SA08 database required');
const c=new pg.Client({connectionString:url}),pool=new pg.Pool({connectionString:url,max:1});await c.connect();
const tasks=new DrizzleTranslationTaskStore(drizzle(c),new PostgresOwnerOperationalFactSink(pool));console.log('READY');
try{for await(const line of readline.createInterface({input:process.stdin,crlfDelay:Infinity}))try{
  const x=JSON.parse(line);let result;
  if(x.operation==='sql'){const reply=await c.query(x.sql,x.params??[]);result=Array.isArray(reply)?reply.flatMap(p=>p.rows??[]):reply.rows;}
  else if(x.operation==='integrationSeed'){
    const id=crypto.randomUUID(),database=drizzle(c),captured=[];
    await database.insert(account).values({id,userId:x.member,accountId:'SA07_I_PRIVATE_EXTERNAL_ACCOUNT',providerId:'google'});
    const capture=(fact,at=new Date())=>captured.push({fact,at});
    const proof=new AuthCreationEvidence(database,capture,()=>null,()=>undefined);
    proof.noteAdapterCreate({model:'account'},{id,userId:x.member,providerId:'google'});
    await proof.flush();const writer=new PostgresAuthFactWriter(pool);
    for(const {fact,at} of captured)await writer.append(fact,at);
    const rows=(await c.query("select id from owner_events where source='auth' and target_user_id=$1 and kind='auth.methodLinked' and payload->>'method'='google' order by occurred_at desc,id desc limit 1",[x.member])).rows;
    if(rows.length!==1)throw Error('Confirmed native Google method-link fact required');
    result={googleFact:rows[0].id};
  }
  else if(x.operation==='localizationSeed'){
    const database=drizzle(c);
    for(const tag of ['fr','de'])await c.query("insert into locales(tag,translation_status,publication_status,direction,fallback_chain,aliases,match_tags,native_name,presentation_metadata) values($1,'draft','active','ltr','{en}','{}','{}',$1,'{}') on conflict(tag) do nothing",[tag]);
    await c.query("insert into ui_translations(locale,namespace,key,origin,status,source_fingerprint,translated_payload) values('fr','common','heading','persistent_manual','approved',$1,$2::jsonb)",[await sourceFingerprint(canonicalEnglishCatalog.common.heading),JSON.stringify('SA07_L_PRIVATE_TRANSLATION')]);
    await new DrizzleUiTranslationBundleStore(database).put(await compileNamespaceBundle('fr','common',{}));
    await c.query("insert into ui_translation_bundles(locale,namespace,bundle_version,resources) values('de','common',$1,$2::jsonb)",['a'.repeat(64),JSON.stringify({'SA07_L_PRIVATE_UNKNOWN':'SA07_L_PRIVATE_TEXT'})]);
    const topic=crypto.randomUUID(),post=crypto.randomUUID(),title=crypto.randomUUID(),body=crypto.randomUUID();
    await new DrizzleForumRepository(database,{cooldownMs:0,now:()=>new Date()}).createTopicWithInitialPost({id:topic,sectionId:HELP_SOLUTIONS_SERVICE_SECTION_ID,authorId:x.owner,titleRevision:{id:title,sourceLocale:'fr',originalContent:'SA07_L_PRIVATE_TITLE'},initialPost:{id:post,topicId:topic,authorId:x.owner,bodyRevision:{id:body,sourceLocale:'fr',originalContent:'A private natural language message. SA07_L_PRIVATE_BODY'}}});
    await new DrizzleContentTranslationStore(database).write({contentType:'topic-title',contentId:topic,revisionId:title,targetLocale:'de',sourceLocale:'fr',translatedContent:'SA07_L_PRIVATE_TRANSLATED_TITLE',provenance:{origin:'persistent_manual'}});
    await new DrizzleContentTranslationRequestBudgetStore(database).consume({subjectKey:'A'.repeat(43),cost:7,windowSeconds:3600,global:{name:'title-global',version:'v1',limit:100},requester:{name:'title-requester',version:'v1',limit:100}});
    result={topic,title,post,body};
  }
  else if(x.operation==='seed'){
    let first;
    for(let n=0;n<55;n++){
      const spec={translationKind:'ui',sourceIdentity:{namespace:'common',key:'SA07_PRIVATE_SOURCE_'+x.prefix+'_'+n},sourceFingerprint:'a'.repeat(64),targetLocale:'fr',generationPolicyVersion:'sa07-fixture-v1'};
      const planned=await tasks.upsertPending({...spec,taskIdentity:await uiTranslationJobIdentity(spec)},{freshPlanning:true});first??=planned;
    }
    const claim=await tasks.claim(first.id,60000);if(claim.outcome!=='claimed')throw Error('claim');
    await tasks.recordFailure(first.id,claim.task.claimToken,{disposition:'retryable',code:'provider-temporary'});
    const event=(await c.query("select id from owner_events where source='operation' and entity_id=$1 and kind='task.planned'",[first.id])).rows[0];
    result={task:first.id,event:event.id};
  }else throw Error('Unknown fixture operation');
  console.log(JSON.stringify({result}));
}catch(error){console.log(JSON.stringify({error:{message:String(error),code:error?.code}}));}}
finally{await c.end();await pool.end();}
