/** Own synthetic task producers and inspection; no HTTP listener or authoritative substitute. */
import process from 'node:process';import console from 'node:console';import readline from 'node:readline';import {URL} from 'node:url';
import pg from 'pg';import {drizzle} from 'drizzle-orm/node-postgres';
import {DrizzleTranslationTaskStore} from '../../../db/translation-task-store.ts';
import {PostgresOwnerOperationalFactSink} from '../../../db/owner-operational-facts.ts';
import {uiTranslationJobIdentity} from '../../../app/localization/ui-translation-service.ts';
const url=process.env.DATABASE_URL,target=new URL(url??'http://invalid');
if(process.env.CI!=='true'||!['127.0.0.1','localhost'].includes(target.hostname)||target.pathname!=='/vico_sa07_browser_test')throw Error('Own disposable SA07 database required');
const c=new pg.Client({connectionString:url}),pool=new pg.Pool({connectionString:url,max:1});await c.connect();
const tasks=new DrizzleTranslationTaskStore(drizzle(c),new PostgresOwnerOperationalFactSink(pool));console.log('READY');
try{for await(const line of readline.createInterface({input:process.stdin,crlfDelay:Infinity}))try{
  const x=JSON.parse(line);let result;
  if(x.operation==='sql'){const reply=await c.query(x.sql,x.params??[]);result=Array.isArray(reply)?reply.flatMap(p=>p.rows??[]):reply.rows;}
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
