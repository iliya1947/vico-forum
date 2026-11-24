import {readFile,readdir} from "node:fs/promises";
import {Client,Pool} from "pg";
import {drizzle} from "drizzle-orm/node-postgres";
import {beforeAll,beforeEach,afterAll,it,expect} from "vitest";
import {PostgresOwnerDataMonitoring} from "../../db/owner-data-monitoring";
import {DATA_COUNT_GROUPS,DATA_LOCALIZATION_COUNTS,type DataMonitorKey} from "../../db/owner-data-catalog";
import {PostgresOwnerSa02History} from "../../db/owner-sa02-history";
import {PostgresOwnerSystemMonitoring} from "../../db/owner-system-monitoring";
import {OwnerSystemUnavailableError} from "../../db/hyperdrive-owner-system";
import {PostgresOwnerSystemHistory} from "../../db/owner-system-history";
import {PostgresOwnerAccountLifecycleCommand} from "../../db/owner-account-lifecycle";
import {DrizzleForumRepository} from "../../db/forum-repository";
import {DrizzleForumAttachments} from "../../db/forum-attachments";
import {PostgresOwnerOperationalFactSink} from "../../db/owner-operational-facts";
import {HELP_SOLUTIONS_SERVICE_SECTION_ID} from "../../db/forum-identifiers";
import {createHyperdriveOwnerData} from "../../db/hyperdrive-owner-data";

const url=process.env.DATABASE_URL;
if(!url||!["localhost","127.0.0.1"].includes(new URL(url).hostname)||!new URL(url).pathname.endsWith('_test'))throw Error('Disposable local PG17 required');
const schema='sa07_data_monitoring_test',options='-c search_path='+schema,c=new Client({connectionString:url,options}),local=new Client({connectionString:url,options}),pool=new Pool({connectionString:url,options,max:4});
const reader=new PostgresOwnerDataMonitoring(pool,local),owner='sa07d-owner',member='sa07d-member';
const history=new PostgresOwnerSa02History(pool),forum=new DrizzleForumRepository(drizzle(pool),{cooldownMs:0,now:()=>new Date()});
type Snapshot=Awaited<ReturnType<typeof reader.readCurrent>>;
const monitor=(s:Snapshot,key:DataMonitorKey)=>s.monitors.find(m=>m.key===key)!;
const check=(s:Snapshot,key:DataMonitorKey,id:string,source='web-database')=>monitor(s,key).checks.find(c=>c.id===id&&c.source===source)!;
beforeAll(async()=>{
  await c.connect();await c.query('drop schema if exists '+schema+' cascade;create schema '+schema);
  for(const name of(await readdir('drizzle')).filter(n=>/^\d{4}_.+\.sql$/.test(n)).sort())await c.query((await readFile('drizzle/'+name,'utf8')).replaceAll('"public".','"'+schema+'".'));
  await local.connect();
});
beforeEach(async()=>{
  await c.query('truncate "user",owner_events,owner_monitor_observations,owner_attempt_patterns,owner_attempt_telemetry_state cascade');
  await c.query('insert into "user"(id,name,email) values($1,$1,$1||\'@test.invalid\'),($2,$2,$2||\'@test.invalid\')',[owner,member]);
});
afterAll(async()=>{await local.end();await pool.end();await c.query('drop schema if exists '+schema+' cascade');await c.end();});
async function topic(){
  const id=crypto.randomUUID(),post=crypto.randomUUID(),revision=crypto.randomUUID();
  await forum.createTopicWithInitialPost({id,sectionId:HELP_SOLUTIONS_SERVICE_SECTION_ID,authorId:member,titleRevision:{id:crypto.randomUUID(),sourceLocale:'en',originalContent:'A native Data topic'},
    initialPost:{id:post,topicId:id,authorId:member,bodyRevision:{id:revision,sourceLocale:'en',originalContent:'A native Data body'}}});return {id,post,revision};
}
it('reads every named full source and actual compatibility subset with distinct connection clocks, without migration-ledger claims',async()=>{
  const s=await reader.readCurrent();expect(s.compiledExpectedMigration).toBe('0072_forum_structure_foundation');expect(s.deployedMigration).toBe('unchecked');
  for(const m of s.monitors){expect(m.recording).toBe('available');expect(m.checks.every(c=>c.status==='measured'||c.status==='compatible')).toBe(true);expect(m.coverageFrom).not.toBeNull();}
  for(const [group,tables]of Object.entries(DATA_COUNT_GROUPS)){
    const actual=check(s,'data.application','counts.'+group);expect(Object.keys(actual.values)).toEqual([...tables]);
    for(const table of tables){const expected=(await c.query('select count(*)::text n from "'+table+'"')).rows[0].n;
      // Observations are appended only after this read snapshot closes.
      expect(actual.values[table]).toBe(table==='owner_monitor_observations'?'0':expected);}
  }
  expect(Object.keys(check(s,'data.application','counts.localization','localization-database').values)).toEqual([...DATA_LOCALIZATION_COUNTS]);
  expect((await c.query('select count(*)::text n from owner_events')).rows[0].n).toBe('0');
  expect((await c.query("select monitor_key,count(*)::text n from owner_monitor_observations group by monitor_key")).rows).toHaveLength(3);
});
it('counts complete large relations and real Forum rows rather than a display prefix',async()=>{
  await c.query("insert into \"user\"(id,name,email) select 'large-'||n,'Large','large-'||n||'@test.invalid' from generate_series(1,10001) n");
  await topic();const s=await reader.readCurrent();expect(check(s,'data.application','counts.accounts').values.user).toBe('10003');
  expect(check(s,'data.application','counts.forum').values).toMatchObject({forum_topics:'1',forum_posts:'1',forum_post_revisions:'1',forum_topic_title_revisions:'1'});
  expect(Object.values(check(s,'data.application','relationships').values).every(v=>v==='0')).toBe(true);
});
it('preserves native current-head and polymorphic FKs and measures the time anomaly that constraints permit',async()=>{
  const a=await topic(),b=await topic();
  // The actual composite FKs protect both kinds of relationship. Keep them
  // intact; first-read chronology has no corresponding native CHECK.
  await expect(c.query('update forum_posts set current_revision_id=$1 where id=$2',[b.revision,a.post])).rejects.toMatchObject({code:'23503'});
  await expect(c.query("insert into forum_reply_notifications(id,recipient_user_id,actor_user_id,topic_id,post_id,kind) values($1,$2,$3,$4,$5,'reply')",[crypto.randomUUID(),owner,member,a.id,b.post])).rejects.toMatchObject({code:'23503'});
  await c.query("insert into forum_reply_notifications(id,recipient_user_id,actor_user_id,topic_id,post_id,kind) values($1,$2,$3,$4,$5,'reply')",[crypto.randomUUID(),owner,member,a.id,a.post]);
  await c.query("update forum_reply_notifications set read_at=created_at-interval '1 second'");
  const s=await reader.readCurrent();expect(check(s,'data.application','relationships')).toMatchObject({status:'measured',values:{postCurrentBody:'0',notificationPost:'0'}});
  expect(check(s,'data.retention','terminalCoverage').values.notificationReadTime).toBe('1');
});
it('classifies a missing required column as incompatible and a type drift separately, with no SQL or private error text',async()=>{
  await c.query('alter table forum_profiles rename column bio to sa07d_private_bio');
  try{
    const s=await reader.readCurrent();expect(check(s,'data.compatibility','forum_profiles')).toMatchObject({status:'incompatible',code:'missing-column',values:{}});
    expect(check(s,'data.application','counts.forum').status).toBe('measured');expect(JSON.stringify(s)).not.toContain('sa07d_private_bio');
  }finally{await c.query('alter table forum_profiles rename column sa07d_private_bio to bio');}
  await c.query('alter table forum_profiles alter column bio type varchar(1000)');
  try{expect(check(await reader.readCurrent(),'data.compatibility','forum_profiles')).toMatchObject({status:'incompatible',code:'type-mismatch',values:{mismatchedColumns:'1'}});}
  finally{await c.query('alter table forum_profiles alter column bio type text');}
});
it('reports insufficient ordinary SELECT without a superuser compatibility fallback or fabricated counts',async()=>{
  const role='sa07d_reader_'+crypto.randomUUID().replaceAll('-',''),restricted=new Pool({connectionString:url,options:options+' -c role='+role,max:1});
  await c.query('create role '+role+' nologin');await c.query('grant usage on schema '+schema+' to '+role);await c.query('grant select on all tables in schema '+schema+' to '+role);await c.query('revoke select on forum_profiles from '+role);
  try{
    const s=await new PostgresOwnerDataMonitoring(restricted,local).readCurrent();
    expect(check(s,'data.compatibility','forum_profiles')).toMatchObject({status:'incompatible',code:'insufficient-grant'});
    expect(check(s,'data.application','counts.forum')).toMatchObject({status:'unavailable',code:'insufficient-grant',values:{}});
    expect(check(s,'data.application','counts.accounts').values.user).toBe('2');expect(monitor(s,'data.application').recording).toBe('unavailable');
  }finally{await restricted.end();await c.query('drop owned by '+role);await c.query('drop role '+role);}
});
it('keeps retained native times, schema versions and minimum account boundary distinct after a genuine deactivation',async()=>{
  await new PostgresOwnerAccountLifecycleCommand(pool,owner).deactivate({actorId:owner,targetId:member,operationId:crypto.randomUUID()});
  const s=await reader.readCurrent();expect(check(s,'data.retention','lifecycle').values).toMatchObject({deactivated:'1',minimumBoundaryFuture:'1',minimumBoundaryReached:'0',invalidTuple:'0'});
  expect(check(s,'data.retention','ownerEvents').values).toMatchObject({rows:'1',unprovenTime:'0'});
  await new DrizzleForumAttachments(drizzle(pool),undefined,new PostgresOwnerOperationalFactSink(pool)).createDraftAttachment({id:crypto.randomUUID(),ownerId:owner,contextKey:'help:new',draftId:crypto.randomUUID(),objectKey:'private/'+crypto.randomUUID(),fileName:'Data.txt',declaredMime:'text/plain',detectedType:'text',responseMime:'text/plain',byteSize:4,verificationStatus:'type-checked'});
  await c.query("insert into owner_monitor_observations(id,monitor_key,resource_scope,source,schema_version,quality,value,fingerprint) values($1,'system.runtime','global','application',2,'measured','{}',$2)",[crypto.randomUUID(),'0'.repeat(64)]);
  const next=await reader.readCurrent();expect(check(next,'data.retention','sampleSchemas').values).toMatchObject({distinctVersions:'2',versions:'1, 2',versionsComplete:true});
  expect(check(next,'data.retention','factSchemas').values).toMatchObject({versionedFactRows:'1',unversionedFactRows:'1',unrecognizedFactRows:'0',factVersions:'1',factVersionsComplete:true});
  expect(check(next,'data.retention','observations').values.rows).toBe('4');
});
it('preserves actual dependency sample identity across System/Data/global History and excludes generic HTTP failures',async()=>{
  const system=new PostgresOwnerSystemHistory(pool);
  await system.recordObservation({monitorKey:'system.dependencies',resourceScope:'global',source:'database',schemaVersion:1,quality:'measured',value:{state:'available',version:'17'}});
  await new PostgresOwnerSystemMonitoring(pool,'test').recordRequestFailure(500,15);
  const own=await reader.readCurrent(),data=await history.readTimeline({monitorKey:'data.compatibility'}),native=await history.readTimeline({monitorKey:'system.dependencies'}),all=await history.readTimeline();
  const original=native.entries.find(e=>e.origin==='system-observation')!;expect(data.entries.some(e=>e.id===original.id)).toBe(true);expect(all.entries.filter(e=>e.id===original.id)).toHaveLength(1);
  expect(data.entries.some(e=>e.kind==='system.requestFailed')).toBe(false);
  expect(data.entries.some(e=>e.monitorKeys.includes('data.compatibility')&&e.id!==original.id)).toBe(true);expect(monitor(own,'data.compatibility').recording).toBe('available');
});
it('keeps successful source measurements when only passive recording fails',async()=>{
  await c.query("create function sa07d_sample_fault() returns trigger language plpgsql as $$begin raise exception 'SA07_D_PRIVATE_SQL';end$$;create trigger sa07d_sample_fault before insert on owner_monitor_observations for each row execute function sa07d_sample_fault()");
  try{const s=await reader.readCurrent();expect(s.monitors.every(m=>m.recording==='unavailable')).toBe(true);expect(check(s,'data.application','counts.accounts').values.user).toBe('2');expect(JSON.stringify(s)).not.toContain('SA07_D_PRIVATE_SQL');}
  finally{await c.query('drop trigger sa07d_sample_fault on owner_monitor_observations;drop function sa07d_sample_fault()');}
});
it('classifies a real unavailable connection at the canonical facade without using the other capability',async()=>{
  const unavailable='postgresql://postgres:postgres@127.0.0.1:9/vico_data_test';
  await expect(createHyperdriveOwnerData(unavailable,unavailable,owner).readCurrent()).rejects.toBeInstanceOf(OwnerSystemUnavailableError);
});
it('reports a missing relation as a named configuration failure without successful zero counts',async()=>{
  await c.query('alter table forum_attachment_sweep rename to sa07d_hidden_sweep');
  try{
    const s=await reader.readCurrent();
    expect(check(s,'data.application','counts.files')).toMatchObject({status:'unavailable',code:'missing-relation',values:{}});
    expect(check(s,'data.compatibility','forum_attachment_sweep')).toMatchObject({status:'incompatible',code:'missing-relation',values:{}});
    expect(check(s,'data.application','counts.accounts').values.user).toBe('2');
  }finally{await c.query('alter table sa07d_hidden_sweep rename to forum_attachment_sweep');}
});
it('closes both source transactions before a blocked passive observation and preserves measurement',async()=>{
  const blocker=new Client({connectionString:url,options});await blocker.connect();
  await blocker.query("begin;select pg_advisory_xact_lock(1447641936,hashtext('data.application:global'))");
  try{
    const pending=reader.readCurrent();let waiting=false;
    for(let n=0;n<80;n++){
      waiting=(await c.query("select exists(select 1 from pg_locks where locktype='advisory' and not granted and classid=1447641936) waiting")).rows[0].waiting;
      if(waiting)break;await new Promise(resolve=>setTimeout(resolve,5));
    }
    expect(waiting).toBe(true);
    await c.query('begin;lock table forum_posts,locales in access exclusive mode nowait;rollback');
    const s=await pending;expect(monitor(s,'data.application').recording).toBe('unavailable');expect(check(s,'data.application','counts.accounts').values.user).toBe('2');
  }finally{await blocker.query('rollback');await blocker.end();}
});
it('counts every retained schema version while explicitly bounding displayed version details',async()=>{
  await c.query("insert into owner_monitor_observations(id,monitor_key,resource_scope,source,schema_version,quality,value,fingerprint) select gen_random_uuid(),'system.runtime','global','application',n,'measured','{}',repeat('0',64) from generate_series(1,40) n");
  const s=await reader.readCurrent(),v=check(s,'data.retention','sampleSchemas').values;
  expect(v.distinctVersions).toBe('40');expect(v.versionsComplete).toBe(false);expect(String(v.versions).split(', ')).toHaveLength(32);
  expect(check(s,'data.retention','observations').values.rows).toBe('40');
});
it('uses a genuinely separate localization role restricted to its existing three SELECT sources',async()=>{
  const role='sa07d_local_'+crypto.randomUUID().replaceAll('-',''),limited=new Client({connectionString:url,options:options+' -c role='+role});
  await c.query('create role '+role+' nologin');await c.query('grant usage on schema '+schema+' to '+role);
  await c.query('grant select on locales,ui_translations,ui_translation_bundles to '+role);
  try{
    await limited.connect();const s=await new PostgresOwnerDataMonitoring(pool,limited).readCurrent();
    expect(check(s,'data.application','counts.localization','localization-database').status).toBe('measured');
    expect(monitor(s,'data.compatibility').checks.filter(c=>c.source==='localization-database').every(c=>c.status==='compatible')).toBe(true);
    await expect(limited.query('select 1 from "user" limit 0')).rejects.toMatchObject({code:'42501'});
  }finally{await limited.end();await c.query('drop owned by '+role);await c.query('drop role '+role);}
});
