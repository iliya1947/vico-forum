import {readFile,readdir} from "node:fs/promises";
import {Client,Pool} from "pg";
import {beforeAll,beforeEach,afterAll,it,expect,vi} from "vitest";
import {PostgresOwnerOverview} from "../../db/owner-overview-monitoring";
import {readDataTerminalCoverage} from "../../db/owner-data-monitoring";
import {recordOwnerSnapshotBatch,type OwnerSnapshotCandidate} from "../../db/owner-overview-observations";
import {DrizzleForumRepository} from "../../db/forum-repository";
import {drizzle} from "drizzle-orm/node-postgres";
import {HELP_SOLUTIONS_SERVICE_SECTION_ID} from "../../db/forum-identifiers";
const url=process.env.DATABASE_URL;
if(!url||!["127.0.0.1","localhost"].includes(new URL(url).hostname)||!new URL(url).pathname.endsWith("_test"))throw Error("Disposable local PG17 required");
const schema="sa08_overview_test",options="-c search_path="+schema,c=new Client({connectionString:url,options});
const pool=new Pool({connectionString:url,options,max:1}),localClients:Client[]=[];
const runtime={webBindingPresent:true,localizationBindingPresent:true,googleParametersPresent:false,bucketBound:false,generationEnabled:false,generationAdmissionWired:true,providerWired:false,enqueuerWired:false,consumerWired:false};
const statements:Array<{sql:string;args:unknown[]|undefined}>=[];let readTransactions=0,writeWhileReading=false,connections=0;
pool.on("connect",client=>{
 connections++;const original=client.query.bind(client);
 client.query=((sql:string,args?:unknown[])=>{
   if(typeof sql==="string"){
     statements.push({sql,args});
     if(sql.startsWith("begin isolation"))readTransactions++;
     if(sql==="commit"||sql==="rollback")readTransactions=Math.max(0,readTransactions-1);
     if(/^insert into owner_monitor_observations/.test(sql)&&readTransactions)writeWhileReading=true;
   }
   return original(sql,args);
 }) as typeof client.query;
});
async function connectLocal(broken=false){
 const local=new Client({connectionString:broken?"postgresql://postgres:postgres@127.0.0.1:9/sa08_test":url,options,connectionTimeoutMillis:500});localClients.push(local);
 await local.connect();const original=local.query.bind(local);
 local.query=((sql:string,args?:unknown[])=>{
   statements.push({sql,args});
   if(typeof sql==="string"&&sql.startsWith("begin isolation"))readTransactions++;
   if(sql==="commit"||sql==="rollback")readTransactions=Math.max(0,readTransactions-1);
   return original(sql,args);
 }) as typeof local.query;return local;
}
const read=(broken=false)=>new PostgresOwnerOverview(pool,()=>connectLocal(broken),"owner","test",runtime,()=>null).readCurrent();
const area=(state:Awaited<ReturnType<typeof read>>,name:string)=>state.areas.find(a=>a.area===name)!;
const figure=(state:Awaited<ReturnType<typeof read>>,name:string,field:string)=>area(state,name).figures.find(f=>f.field===field)?.value;
beforeAll(async()=>{await c.connect();await c.query("drop schema if exists "+schema+" cascade;create schema "+schema);for(const file of(await readdir("drizzle")).filter(n=>/^\d{4}_.+\.sql$/.test(n)).sort())await c.query((await readFile("drizzle/"+file,"utf8")).replaceAll('"public".','"'+schema+'".'));});
beforeEach(async()=>{
 await c.query('truncate "user",owner_events,owner_monitor_observations,owner_attempt_patterns,owner_attempt_telemetry_state,translation_tasks cascade');
 await c.query("insert into forum_registration_settings(id) values(1) on conflict do nothing");
 await c.query('insert into "user"(id,name,email) values(\'owner\',\'SA08_PRIVATE_OWNER\',\'SA08_PRIVATE_EMAIL@test.invalid\')');
 statements.length=0;readTransactions=0;writeWhileReading=false;
});
afterAll(async()=>{await Promise.all(localClients.map(client=>client.end().catch(()=>undefined)));await pool.end();await c.query("drop schema if exists "+schema+" cascade");await c.end();});
it("composes all13 areas from native sources once, sharing clocks and registration, without emitting facts",async()=>{
 await c.query('insert into "user"(id,name,email) select \'member-\'||g,\'SA08_PRIVATE_NAME\',g||\'@test.invalid\' from generate_series(1,10002) g');
 const topic=crypto.randomUUID();
 await new DrizzleForumRepository(drizzle(c),{cooldownMs:0,now:()=>new Date()}).createTopicWithInitialPost({id:topic,sectionId:HELP_SOLUTIONS_SERVICE_SECTION_ID,authorId:"owner",titleRevision:{id:crypto.randomUUID(),sourceLocale:"en",originalContent:"SA08_PRIVATE_TITLE"},initialPost:{id:crypto.randomUUID(),topicId:topic,authorId:"owner",bodyRevision:{id:crypto.randomUUID(),sourceLocale:"en",originalContent:"SA08_PRIVATE_BODY"}}});
 const state=await read();
 expect(state.areas).toHaveLength(13);expect(state.areas.filter(a=>a.status==="measured")).toHaveLength(12);expect(area(state,"infrastructure")).toMatchObject({status:"placeholder",figures:[],sources:[]});
 expect(figure(state,"accounts","total")).toBe("10003");expect(figure(state,"forum","topics")).toBe("1");
 expect(state.terminalCoverage).toMatchObject({status:"measured",values:{mootTerminalTime:"0",measureHumanAttribution:"0"}});
 expect(state.terminalCoverage.observedAt).toBe(area(state,"system").sources[0].observedAt);
 expect(statements.filter(s=>s.sql.includes('as "helpHumanAttribution"'))).toHaveLength(1);
 expect(state.readStatements).toBeLessThanOrEqual(40);expect(state.recording).toBe("available");expect(writeWhileReading).toBe(false);expect(readTransactions).toBe(0);
 expect(new Set(state.areas.flatMap(a=>a.sources).filter(s=>s.connection==="web-database"&&s.status==="measured").map(s=>s.observedAt)).size).toBe(1);
 expect(statements.filter(s=>s.sql.includes("current_setting('server_version')"))).toHaveLength(1);
 expect(statements.filter(s=>s.sql.includes("from forum_registration_settings"))).toHaveLength(1);
 expect(figure(state,"integrations","retainedSlots")).toBe("0");expect(figure(state,"integrations","genericSessionProviderKnown")).toBe(false);
 expect((await c.query("select count(*)::int n from owner_events")).rows[0].n).toBe(0);
 const rows=(await c.query("select monitor_key,source,schema_version,value from owner_monitor_observations")).rows;
 expect(new Set(rows.map(r=>r.monitor_key)).size).toBe(rows.length);
 expect(rows.find(r=>r.monitor_key==="accounts.users").schema_version).toBe(2);
 expect(rows.find(r=>r.monitor_key==="administration.registration").value.googleEnabled).toBe(rows.find(r=>r.monitor_key==="accounts.registration").value.googleEnabled);
 expect(rows.filter(r=>r.monitor_key==="data.retention")).toHaveLength(0);
 expect(rows.find(r=>r.monitor_key==="integrations.storage").value.retainedSlots).toBeUndefined();
 expect(JSON.stringify(state)).not.toContain("SA08_PRIVATE");
});
it("keeps independent successful areas after a real missing source and savepoint rollback",async()=>{
 await c.query("alter table forum_attachment_sweep rename to sa08_hidden_sweep");
 try{
 const state=await read();expect(area(state,"files")).toMatchObject({status:"unavailable",figures:[]});expect(area(state,"background").status).toBe("partial");
 expect(figure(state,"background","pending")).toBe("0");expect(figure(state,"background","eligibleUnreferenced")).toBeUndefined();
 expect(area(state,"accounts").status).toBe("measured");expect(area(state,"data").status).toBe("measured");
 expect(statements.some(s=>s.sql==="rollback to savepoint owner_overview_source")).toBe(true);
 expect(writeWhileReading).toBe(false);
 }finally{await c.query("alter table sa08_hidden_sweep rename to forum_attachment_sweep");}
});
it("does not use web success as localization health or hide measured web budgets",async()=>{
 const state=await read(true);expect(area(state,"localization").status).toBe("partial");expect(area(state,"integrations").status).toBe("partial");
 expect(figure(state,"localization","activeLocales")).toBeUndefined();expect(figure(state,"localization","usedUnits")).toBe("0");
 expect(area(state,"forum").status).toBe("measured");expect(area(state,"localization").sources.find(s=>s.id==="localization")?.code).toBe("dependency-unavailable");
});
it("preserves measured values on an actual observation recorder failure and leaks no exception text",async()=>{
 await c.query("create function sa08_fault() returns trigger language plpgsql as $$begin raise exception 'SA08_PRIVATE_SQL';end$$;create trigger sa08_fault before insert on owner_monitor_observations for each row execute function sa08_fault()");
 try{const state=await read();expect(state.recording).toBe("unavailable");expect(area(state,"accounts").status).toBe("measured");expect(figure(state,"accounts","total")).toBe("1");expect(JSON.stringify(state)).not.toContain("SA08_PRIVATE");}
 finally{await c.query("drop trigger sa08_fault on owner_monitor_observations;drop function sa08_fault()");}
});
it("propagates an unexpected source invariant and releases the shared transaction before any sample write",async()=>{
 await c.query("delete from forum_registration_settings");
 await expect(read()).rejects.toThrow("registration settings invariant");expect(readTransactions).toBe(0);
 expect((await c.query("select count(*)::int n from owner_monitor_observations")).rows[0].n).toBe(0);
});
it("uses actual signed PostgreSQL hash locks in ascending distinct order and keeps the rolling gates under concurrency",async()=>{
 const inputs:OwnerSnapshotCandidate[]=[{key:"background.translation" as const,values:{pending:"1"},source:"database" as const,schemaVersion:1},{key:"files.assets" as const,values:{assets:"2"},source:"database" as const,schemaVersion:1}];
 await Promise.all([recordOwnerSnapshotBatch(pool,inputs),recordOwnerSnapshotBatch(pool,[...inputs].reverse())]);
 expect((await c.query("select count(*)::int n from owner_monitor_observations")).rows[0].n).toBe(2);
 const ordered=(await c.query("select distinct hashtext(key||':global') lock from unnest($1::text[]) key order by lock",[inputs.map(i=>i.key)])).rows.map(r=>r.lock);
 expect(statements.filter(s=>s.sql==="select pg_advisory_xact_lock(1447641936,$1)").map(s=>s.args?.[0])).toEqual([...ordered,...ordered]);
 const again=await read();expect(again.recording).toBe("available");expect((await c.query("select count(*)::int n from owner_monitor_observations where monitor_key='files.assets'")).rows[0].n).toBe(1);
 expect(connections).toBe(1);
});
it("stops issuing reads when its overall budget expires, retaining completed independent measurements",async()=>{
 const real=performance.now.bind(performance);let ticks=0;const clock=vi.spyOn(performance,"now").mockImplementation(()=>real()+ticks++*250);
 try{
  const state=await read();expect(state.readStatements).toBeLessThanOrEqual(40);
  expect(state.areas.some(a=>a.status==="partial"||a.status==="unavailable")).toBe(true);
  expect(area(state,"system").status).toBe("measured");expect(readTransactions).toBe(0);
  expect(state.areas.flatMap(a=>a.sources).some(s=>s.code==="deadline")).toBe(true);
 }finally{clock.mockRestore();}
});
it("runs under actual restricted web/localization roles and reports one denied source without credential fallback",async()=>{
 const suffix=crypto.randomUUID().replaceAll("-","").slice(0,10),wr="sa08_web_"+suffix,lr="sa08_local_"+suffix;
 await c.query(`create role ${wr};create role ${lr};grant usage on schema ${schema} to ${wr},${lr};
  grant select on all tables in schema ${schema} to ${wr};grant insert on owner_events,owner_monitor_observations to ${wr};
  grant usage on all sequences in schema ${schema} to ${wr};revoke select on forum_attachment_sweep from ${wr};
  grant select on locales,ui_translations,ui_translation_bundles to ${lr}`);
 const wp=new Pool({connectionString:url,options:options+" -c role="+wr,max:1}),lc=new Client({connectionString:url,options:options+" -c role="+lr});
 try{
 const state=await new PostgresOwnerOverview(wp,async()=>{await lc.connect();return lc;},"owner","test",runtime,()=>null).readCurrent();
 expect(area(state,"files")).toMatchObject({status:"unavailable",figures:[]});expect(area(state,"files").sources[0].code).toBe("source-incompatible");
 expect(area(state,"accounts").status).toBe("measured");expect(area(state,"localization").status).toBe("measured");expect(state.recording).toBe("available");
 expect(figure(state,"integrations","actualWebState")).toBe("available");
 }finally{await lc.end();await wp.end();await c.query(`drop owned by ${wr},${lr};drop role ${wr};drop role ${lr}`);}
});
it("classifies a real locked independent source without green zeroes or poisoned subsequent reads",async()=>{
 const held=new Client({connectionString:url,options});await held.connect();await held.query("begin");await held.query("lock table forum_reply_notifications in access exclusive mode");
 try{
 const state=await read();expect(area(state,"notifications")).toMatchObject({status:"unavailable",figures:[]});
 expect(area(state,"notifications").sources[0].code).toBe("deadline");expect(area(state,"forum").status).toBe("measured");
 expect(area(state,"data").status).toBe("partial");expect(state.terminalCoverage).toEqual({status:"unavailable",observedAt:null,values:{}});
 expect(figure(state,"data","retainedOwnerEvents")).toBe("0");expect(state.readStatements).toBeLessThanOrEqual(40);
 }finally{await held.query("rollback");await held.end();}
});

it("exposes actual untimed native tuples and retained legacy actor gaps using Data's unchanged definitions",async()=>{
 const measure=crypto.randomUUID(),moot=crypto.randomUUID(),legacy=crypto.randomUUID();
 await c.query("insert into user_measures(id,target_user_id,issuer_user_id,issuer_authority_floor,create_fingerprint,initial_reason) values($1,'owner','owner',3,repeat('a',64),'SA08_PRIVATE_REASON')",[measure]);
 // A native moot tuple can have no proven terminal time under today's constraints.
 await c.query("insert into user_measure_appeals(id,measure_id,subject_user_id,ordinal,body,status) values($1,$2,'owner',1,'SA08_PRIVATE_BODY','moot')",[moot,measure]);
 // Current constraints reject missing reviewers. Simulate one pre-existing corrupt
 // row in this disposable schema, then reinstall the EXACT constraint NOT VALID:
 // new writes remain checked, and only this retained row is deliberately invalid.
 const definition=(await c.query("select pg_get_constraintdef(oid) definition from pg_constraint where conrelid='user_measure_appeals'::regclass and conname='user_measure_appeals_resolution_check'")).rows[0].definition;
 await c.query("begin");
 try{
  await c.query("alter table user_measure_appeals drop constraint user_measure_appeals_resolution_check");
  await c.query("insert into user_measure_appeals(id,measure_id,subject_user_id,ordinal,body,status,resolved_at,reviewer_explanation) values($1,$2,'owner',2,'SA08_PRIVATE_BODY','rejected',clock_timestamp(),'SA08_PRIVATE_EXPLANATION')",[legacy,measure]);
  await c.query("alter table user_measure_appeals add constraint user_measure_appeals_resolution_check "+definition+" not valid");
  await c.query("commit");
 }catch(error){await c.query("rollback");throw error;}
 try{
  const canonical=await readDataTerminalCoverage(c),state=await read();
  expect(canonical).toMatchObject({mootTerminalTime:"1",measureHumanAttribution:"1"});
  expect(state.terminalCoverage).toEqual({status:"limited",observedAt:area(state,"system").sources[0].observedAt,values:canonical});
  expect(figure(state,"administration","mootTimeUnproven")).toBe("1");
  expect(state.readStatements).toBeLessThanOrEqual(40);expect(area(state,"data").status).toBe("measured");
  expect((await c.query("select count(*)::int n from owner_events")).rows[0].n).toBe(0);
  expect((await c.query("select count(*)::int n from owner_monitor_observations where monitor_key='data.retention'")).rows[0].n).toBe(0);
  expect(JSON.stringify(state)).not.toContain("SA08_PRIVATE");
  await expect(c.query("update user_measure_appeals set body='another' where id=$1",[legacy])).rejects.toMatchObject({code:"23514"});
 }finally{
  await c.query("delete from user_measure_appeals where id=$1",[legacy]);
  await c.query("alter table user_measure_appeals validate constraint user_measure_appeals_resolution_check");
 }
});
