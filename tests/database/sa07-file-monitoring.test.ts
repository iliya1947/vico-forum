import {readFile,readdir} from "node:fs/promises";
import {Client,Pool,type PoolClient} from "pg";
import {drizzle} from "drizzle-orm/node-postgres";
import {beforeAll,beforeEach,afterAll,it,expect} from "vitest";
import {PostgresOwnerFileMonitoring} from "../../db/owner-file-monitoring";
import {PostgresOwnerOperationalFactSink} from "../../db/owner-operational-facts";
import {PostgresOwnerStorageObservations} from "../../db/owner-storage-observations";
import {PostgresOwnerSa02History} from "../../db/owner-sa02-history";
import {PostgresOwnerUserHistory} from "../../db/owner-user-history";
import {DrizzleForumAttachments} from "../../db/forum-attachments";
import {DrizzleForumRepository} from "../../db/forum-repository";
import {ForumAttachmentCleanup} from "../../db/forum-attachment-cleanup";
import {HELP_SOLUTIONS_SERVICE_SECTION_ID} from "../../db/forum-identifiers";
import {checkedStorageCandidate,STORAGE_SLOTS,type StorageObservationValue} from "../../app/observability/storage-observations";

const url=process.env.DATABASE_URL;
if(!url||!["localhost","127.0.0.1"].includes(new URL(url).hostname)||!new URL(url).pathname.endsWith("_test"))throw Error("Own disposable PG17 required");
const schema="sa07_file_monitoring_test",options="-c search_path="+schema,c=new Client({connectionString:url,options}),pool=new Pool({connectionString:url,options,max:8});
const db=drizzle(pool),sink=new PostgresOwnerOperationalFactSink(pool),owner="sa07f-owner";
const files=new PostgresOwnerFileMonitoring(pool,true),history=new PostgresOwnerSa02History(pool),people=new PostgresOwnerUserHistory(pool);
const attachments=new DrizzleForumAttachments(db,undefined,sink),forum=new DrizzleForumRepository(db,{cooldownMs:0,now:()=>new Date()},undefined,sink);
beforeAll(async()=>{await c.connect();await c.query("drop schema if exists "+schema+" cascade;create schema "+schema);for(const name of(await readdir("drizzle")).filter(n=>/^\d{4}_.+\.sql$/.test(n)).sort())await c.query((await readFile("drizzle/"+name,"utf8")).replaceAll('"public".','"'+schema+'".'));});
beforeEach(async()=>{await c.query('truncate "user",owner_events,owner_monitor_observations,forum_attachment_upload_objects cascade');await c.query('insert into "user"(id,name,email) values($1,$1,$2)',[owner,owner+"@test.invalid"]);await c.query("update forum_attachment_sweep set claim_token=null,claimed_at=null,cursor=null");});
afterAll(async()=>{await pool.end();await c.query("drop schema if exists "+schema+" cascade");await c.end();});
function upload(contextKey="help:new",draftId=crypto.randomUUID()){
  return {id:crypto.randomUUID(),ownerId:owner,contextKey,draftId,objectKey:"private/"+crypto.randomUUID(),fileName:"SA07_F_PRIVATE_NAME.txt",declaredMime:"text/plain",detectedType:"text",responseMime:"text/plain; charset=utf-8",byteSize:12,verificationStatus:"type-checked" as const};
}
const values=(s:Awaited<ReturnType<typeof files.readCurrent>>,key:string)=>s.monitors.find(m=>m.key===key)!.values;
it("measures complete empty native file state with13 unmeasured storage slots and no fabricated R2 call",async()=>{
  const s=await files.readCurrent();expect(values(s,"files.assets")).toMatchObject({assets:"0",assetBytes:"0",publishedAssets:"0",unreferencedAssets:"0"});
  expect(values(s,"files.operations")).toMatchObject({uploadJournal:"0",draftOperationsActive:"0",oldestUploadAgeMs:null});
  expect(values(s,"background.attachments")).toMatchObject({cleanupClaims:"0",eligibleUnreferenced:"0",schedulerEnabled:false,sweepClaimed:false,sweepCursorPresent:false});
  expect(s.storageSamples).toHaveLength(13);expect(s.storageSamples.every(s=>s.sample===null)).toBe(true);
  expect((await c.query("select count(*)::text n from owner_events")).rows[0].n).toBe("0");expect((await c.query("select count(*)::text n from owner_monitor_observations where resource_scope<>'global'")).rows[0].n).toBe("0");
});
it("captures committed metadata once and original publication/removal facts through real native writers",async()=>{
  const context="section:"+HELP_SOLUTIONS_SERVICE_SECTION_ID+":new",a=upload(context),id=crypto.randomUUID(),post=crypto.randomUUID(),revision=crypto.randomUUID();
  await attachments.createDraftAttachment(a);await attachments.createDraftAttachment(a);
  const input={id,sectionId:HELP_SOLUTIONS_SERVICE_SECTION_ID,authorId:owner,titleRevision:{id:crypto.randomUUID(),sourceLocale:"en",originalContent:"A native attachment topic"},initialPost:{id:post,topicId:id,authorId:owner,bodyRevision:{id:revision,sourceLocale:"en",originalContent:"A native body"}},publishedDraft:{contextKey:context,draftId:a.draftId,attachmentIds:[a.id]}};
  await forum.createTopicWithInitialPost(input);await forum.createTopicWithInitialPost(input);
  await forum.editPublishedPost({postId:post,topicId:id,actorId:owner,expectedRevisionId:revision,body:"A changed body",draftId:crypto.randomUUID(),attachmentIds:[],retainedAttachmentIds:[]});
  const events=(await c.query("select id,kind,payload from owner_events where source='operation' order by position")).rows;expect(events.map(e=>e.kind)).toEqual(["file.accepted","file.published","file.unpublished"]);
  const snapshot=await files.readCurrent();expect(values(snapshot,"files.assets")).toMatchObject({assets:"1",assetBytes:"12",unreferencedAssets:"1",publishedAssets:"0"});
  for(const key of ["files.assets","files.operations"] as const){const p=await history.readTimeline({monitorKey:key,origin:"operational-event"});expect(new Set(p.entries.map(e=>e.id))).toEqual(new Set(events.map(e=>e.id)));}
  const global=(await history.readTimeline({origin:"operational-event"})).entries,person=(await people.readHistory(owner)).entries;
  for(const event of global)expect(person.find(e=>e.id===event.id)).toEqual(event);
  expect(JSON.stringify(snapshot)).not.toMatch(/SA07_F_PRIVATE|object_key|claim_token|reservation_etag|draft_id/);expect(JSON.stringify(global)).not.toMatch(/SA07_F_PRIVATE|object_key|claim_token|reservation_etag|draft_id/);
});
it("distinguishes a real token-guarded asset deletion from marker RPC acknowledgement and retains cleanup source identity",async()=>{
  const a=upload();await attachments.createDraftAttachment(a);
  await c.query("delete from forum_attachment_draft_refs where attachment_id=$1",[a.id]);await c.query("update forum_attachments set created_at=now()-interval '2 hours' where id=$1",[a.id]);
  const deleted:string[]=[];
  const cleanup=new ForumAttachmentCleanup(db,{delete:async key=>{deleted.push(key);},listReservations:async()=>({keys:[]})},()=>new Date(),sink);
  const result=await cleanup.runOnce(2);expect(result.deleted).toBe(1);expect(deleted).toEqual([a.objectKey]);
  const events=await history.readTimeline({monitorKey:"background.attachments",kind:"file.cleanupPass"});expect(events.entries).toHaveLength(1);expect(events.entries[0].values).toMatchObject({assetDeleted:1,markerDeleteAcknowledged:0,journalDeletedRows:0,partialCounts:false,stoppedPhase:"complete"});
  expect((await history.readTimeline({monitorKey:"files.operations",kind:"file.cleanupPass"})).entries).toEqual(events.entries);
  expect((await people.readHistory(owner)).entries.some(e=>e.kind==="file.cleanupPass")).toBe(false);
});
it("admits one retained sample per rolling slot across concurrent recorders and reuses its original identity in Files/global History",async()=>{
  const now=new Date().toISOString();let at=now;
  const candidate=checkedStorageCandidate({operation:"get",resultClass:"returned",category:"object-returned",phase:"rpc-return",callReturnedAt:now,durationMs:7} satisfies StorageObservationValue);
  const recorder=()=>new PostgresOwnerStorageObservations(pool,async()=>at);
  await Promise.all(Array.from({length:8},()=>recorder().record([candidate])));
  expect((await c.query("select count(*)::text n from owner_monitor_observations where resource_scope=$1",[candidate.scope])).rows[0].n).toBe("1");
  at=new Date(Date.parse(now)+15*60_000).toISOString();await recorder().record([candidate]);expect((await c.query("select count(*)::text n from owner_monitor_observations")).rows[0].n).toBe("1");
  at=new Date(Date.parse(at)+1).toISOString();await recorder().record([candidate]);expect((await c.query("select count(*)::text n from owner_monitor_observations")).rows[0].n).toBe("2");
  const f=await history.readTimeline({monitorKey:"files.operations",origin:"system-observation"});const i=await history.readTimeline({monitorKey:"integrations.storage",origin:"system-observation"});expect(f.entries).toEqual(i.entries);expect(f.entries).toHaveLength(2);
  const state=await files.readCurrent(),sample=state.storageSamples.find(s=>s.scope===candidate.scope)!.sample!;expect(sample.id).toBe(f.entries[0].id);expect(sample.value.callReturnedAt).toBe(now);
  expect((await c.query("select count(*)::text n from owner_events")).rows[0].n).toBe("0");
});
function commitAckLostPool(){
  let lost=false;
  return new Proxy(pool,{get(target,property){
    if(property==='connect')return async()=>{const client=await target.connect();return new Proxy(client,{get(connection,key){
      if(key==='query')return async(...args:unknown[])=>{
        const result=await (connection.query as (...a:unknown[])=>Promise<unknown>).apply(connection,args);
        if(!lost&&(typeof args[0]==='string'?args[0]:(args[0] as {text?:string})?.text)?.toLowerCase()==='commit'){lost=true;throw Error('SA07_F_commit_ACK_lost');}return result;
      };
      const value=Reflect.get(connection,key);return typeof value==='function'?value.bind(connection):value;
    }});};
    const value=Reflect.get(target,property);return typeof value==='function'?value.bind(target):value;
  }});
}
it("does not flush a metadata success after actual COMMIT acknowledgement loss and cannot veto committed metadata on journal failure",async()=>{
  const a=upload();await expect(new DrizzleForumAttachments(drizzle(commitAckLostPool()),undefined,sink).createDraftAttachment(a)).rejects.toThrow();
  expect((await c.query('select id from forum_attachments where id=$1',[a.id])).rows).toHaveLength(1);expect((await c.query('select id from owner_events')).rows).toHaveLength(0);
  await c.query("create function sa07f_journal_fault() returns trigger language plpgsql as $$begin raise exception 'SA07_F_PRIVATE_SQL';end$$;create trigger sa07f_journal_fault before insert on owner_events for each row execute function sa07f_journal_fault()");
  const b=upload();
  try{expect(await attachments.createDraftAttachment(b)).toMatchObject({id:b.id});expect((await c.query('select id from forum_attachments where id=$1',[b.id])).rows).toHaveLength(1);}
  finally{await c.query('drop trigger sa07f_journal_fault on owner_events;drop function sa07f_journal_fault()');}
});
it("rechecks durable admission after unknown sample COMMIT instead of duplicating a possibly retained sample",async()=>{
  const candidate=checkedStorageCandidate({operation:'delete',resultClass:'threw',category:'acknowledgement-unknown',phase:'rpc-error',callReturnedAt:new Date().toISOString(),durationMs:1});
  await expect(new PostgresOwnerStorageObservations(commitAckLostPool()).record([candidate])).rejects.toThrow('ACK_lost');
  expect((await c.query("select id from owner_monitor_observations")).rows).toHaveLength(1);
  await new PostgresOwnerStorageObservations(pool).record([candidate]);expect((await c.query("select id from owner_monitor_observations")).rows).toHaveLength(1);
});
it("publishes one explicit bounded operation summary above19 attachments and no second summary on receipt replay",async()=>{
  const context='section:'+HELP_SOLUTIONS_SERVICE_SECTION_ID+':new',draftId=crypto.randomUUID(),ids:string[]=[];
  for(let n=0;n<21;n++){const a=upload(context,draftId);await attachments.createDraftAttachment(a);ids.push(a.id);}
  const topic=crypto.randomUUID(),post=crypto.randomUUID(),input={id:topic,sectionId:HELP_SOLUTIONS_SERVICE_SECTION_ID,authorId:owner,titleRevision:{id:crypto.randomUUID(),sourceLocale:'en',originalContent:'Many actual files'},initialPost:{id:post,topicId:topic,authorId:owner,bodyRevision:{id:crypto.randomUUID(),sourceLocale:'en',originalContent:'A native body'}},publishedDraft:{contextKey:context,draftId,attachmentIds:ids}};
  await forum.createTopicWithInitialPost(input);await forum.createTopicWithInitialPost(input);
  const facts=(await history.readTimeline({monitorKey:'files.operations',kind:'file.referencesChanged'})).entries;
  expect(facts).toHaveLength(1);expect(facts[0].values).toMatchObject({postId:post,addedCount:21,removedCount:0,perFileDetailsComplete:false});
  expect((await history.readTimeline({monitorKey:'files.operations',kind:'file.published'})).entries).toHaveLength(0);
  expect(values(await files.readCurrent(),'files.assets')).toMatchObject({assets:'21',publishedAssets:'21',assetBytes:'252'});
});
it("keeps publication rollback from emitting a false reference transition",async()=>{
  const context='section:'+HELP_SOLUTIONS_SERVICE_SECTION_ID+':new',a=upload(context);await attachments.createDraftAttachment(a);
  await c.query("create function sa07f_pub_fault() returns trigger language plpgsql as $$begin raise exception 'SA07_F_PRIVATE_PUBLICATION_SQL';end$$;create trigger sa07f_pub_fault before insert on forum_post_attachments for each row execute function sa07f_pub_fault()");
  const topic=crypto.randomUUID(),post=crypto.randomUUID();
  try{await expect(forum.createTopicWithInitialPost({id:topic,sectionId:HELP_SOLUTIONS_SERVICE_SECTION_ID,authorId:owner,titleRevision:{id:crypto.randomUUID(),sourceLocale:'en',originalContent:'Rollback title'},initialPost:{id:post,topicId:topic,authorId:owner,bodyRevision:{id:crypto.randomUUID(),sourceLocale:'en',originalContent:'Rollback body'}},publishedDraft:{contextKey:context,draftId:a.draftId,attachmentIds:[a.id]}})).rejects.toThrow();}
  finally{await c.query('drop trigger sa07f_pub_fault on forum_post_attachments;drop function sa07f_pub_fault()');}
  expect((await c.query('select id from forum_posts where id=$1',[post])).rows).toHaveLength(0);expect((await history.readTimeline({monitorKey:'files.operations',kind:'file.published'})).entries).toHaveLength(0);
});
it("distinguishes upload-object DELETE acknowledgement from a lost native claim and zero journal-row deletion",async()=>{
  const key='private/fenced-v1/'+crypto.randomUUID();await c.query("insert into forum_attachment_upload_objects(object_key,created_at,reservation_etag) values($1,now()-interval '2 hours','SA07_F_PRIVATE_ETAG')",[key]);
  const cleanup=new ForumAttachmentCleanup(db,{delete:async()=>{await c.query("update forum_attachment_upload_objects set claim_token='another-worker' where object_key=$1",[key]);},listReservations:async()=>({keys:[]})},()=>new Date(),sink);
  await cleanup.runOnce(1);expect((await c.query('select object_key from forum_attachment_upload_objects')).rows).toHaveLength(1);
  const fact=(await history.readTimeline({kind:'file.cleanupPass'})).entries[0];expect(fact.values).toMatchObject({journalClaimed:1,journalDeleteAcknowledged:1,journalDeletedRows:0,assetDeleted:0});
});
it("orders actual signed hash locks, preserves slot separation under a controlled lock-key collision and bounds all13 slots over24 hours",async()=>{
  const outcomes=['reservation-returned','reservation-declined','reservation-error','write-settled','conditional-rejection','outcome-unknown','object-returned','not-found','get-error','acknowledged','acknowledgement-unknown','page-returned','list-error'] as const;
  const start=Date.parse(new Date().toISOString());let at=new Date(start).toISOString();
  const candidates=STORAGE_SLOTS.map((slot,index)=>{const [,operation,resultClass]=slot.split(':');return checkedStorageCandidate({operation,resultClass,category:outcomes[index],phase:operation==='put'?(resultClass==='threw'?'write-unknown':'write-settled'):resultClass==='threw'?'rpc-error':'rpc-return',callReturnedAt:at,durationMs:index} as StorageObservationValue);});
  const acquired:number[]=[];
  const monitored={async connect(){const client=await pool.connect();return new Proxy(client,{get(target,key){if(key==='query')return async(...args:unknown[])=>{
    if(typeof args[0]==='string'&&args[0].startsWith('select pg_advisory_xact_lock'))acquired.push((args[1] as number[])[0]);
    return (target.query as (...a:unknown[])=>Promise<unknown>).apply(target,args);
  };const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}}) as PoolClient;}};
  const recorder=new PostgresOwnerStorageObservations(monitored,async()=>at);await recorder.record([...candidates].reverse());expect(acquired).toEqual([...acquired].sort((a,b)=>a-b));expect(new Set(acquired).size).toBe(acquired.length);
  const collision={async connect(){const client=await pool.connect();return new Proxy(client,{get(target,key){if(key==='query')return async(...args:unknown[])=>{
    if(typeof args[0]==='string'&&args[0].startsWith("select distinct hashtext"))return {rows:[{key:123},{key:123}]};
    return (target.query as (...a:unknown[])=>Promise<unknown>).apply(target,args);
  };const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}}) as PoolClient;}};
  at=new Date(start+900001).toISOString();await new PostgresOwnerStorageObservations(collision,async()=>at).record(candidates.slice(0,2));
  expect((await c.query('select count(*)::int n from owner_monitor_observations')).rows[0].n).toBe(15);
  for(let step=2;step<=96;step++){at=new Date(start+step*900001).toISOString();await recorder.record(candidates);}
  const count=(await c.query("select count(*)::int n from owner_monitor_observations where resource_scope like 'storage:%' and observed_at between $1::timestamptz and $1::timestamptz+interval '24 hours'",[new Date(start).toISOString()])).rows[0].n;
  expect(count).toBeLessThanOrEqual(1261);expect((await c.query("select count(distinct resource_scope)::int n from owner_monitor_observations")).rows[0].n).toBe(13);
  expect((await c.query("select id from owner_events")).rows).toHaveLength(0);
});
it("counts full mixed metadata/journal/draft states without join multiplication or leaking internal capabilities",async()=>{
  const ids:string[]=[];
  for(let n=0;n<31;n++){const a=upload('help:new',n<2?'00000000-0000-4000-8000-000000000000':crypto.randomUUID());if(n===30)a.detectedType='SA07_F_PRIVATE_UNRECOGNIZED';await attachments.createDraftAttachment(a);ids.push(a.id);}
  await c.query("update forum_attachment_draft_refs set created_at=now()-interval '25 hours' where attachment_id=any($1::text[])",[ids.slice(0,2)]);
  await c.query("insert into forum_attachment_upload_objects(object_key,reservation_etag,claim_token,claimed_at) values($1,null,null,null),($2,'SA07_F_PRIVATE_ETAG',null,null),($3,null,'SA07_F_PRIVATE_CLAIM',now()-interval '10 minutes')",Array.from({length:3},()=>"private/fenced-v1/"+crypto.randomUUID()));
  await c.query("update forum_attachment_sweep set cursor='SA07_F_PRIVATE_CURSOR',claim_token='SA07_F_PRIVATE_SWEEP_TOKEN',claimed_at=now()-interval '10 minutes'");
  const s=await files.readCurrent(),independent=(await c.query('select count(*)::text n,sum(byte_size)::text bytes from forum_attachments')).rows[0];
  expect(values(s,'files.assets')).toMatchObject({assets:independent.n,assetBytes:independent.bytes,draftAssets:'31',type13activeCount:'1'});
  expect(values(s,'files.operations')).toMatchObject({uploadJournal:'3',uploadPreparing:'1',uploadReady:'1',uploadClaimed:'1',draftOperationsStale:'1',draftRefsStale:'2',draftRefsActive:'29'});
  expect(values(s,'background.attachments')).toMatchObject({sweepCursorPresent:true,sweepClaimed:true,sweepClaimExpired:true,sweepClaimLive:false});
  expect(JSON.stringify(s)).not.toContain('SA07_F_PRIVATE');
  const first=await history.readTimeline({monitorKey:'files.assets',origin:'operational-event'}),second=await history.readTimeline({monitorKey:'files.assets',origin:'operational-event',before:first.next!});
  expect(first.entries).toHaveLength(25);expect(second.entries).toHaveLength(6);expect(new Set([...first.entries,...second.entries].map(e=>e.id)).size).toBe(31);
});
it("closes the read transaction before a blocked observation and keeps measurement on recorder failure",async()=>{
  const a=upload();await attachments.createDraftAttachment(a);const blocker=new Client({connectionString:url,options});await blocker.connect();
  await blocker.query("begin;select pg_advisory_xact_lock(1447641936,hashtext('files.assets:global'))");
  try{
    const read=files.readCurrent();let waiting=false;
    for(let n=0;n<60;n++){
      waiting=(await c.query("select exists(select 1 from pg_locks where locktype='advisory' and not granted and classid=1447641936) waiting")).rows[0].waiting;
      if(waiting)break;await new Promise(resolve=>setTimeout(resolve,5));
    }
    expect(waiting).toBe(true);await c.query('begin;lock table forum_attachments in access exclusive mode nowait;rollback');
    const s=await read;expect(s.monitors.find(m=>m.key==='files.assets')).toMatchObject({recording:'unavailable',quality:'measured',values:{assets:'1'}});
  }finally{await blocker.query('rollback');await blocker.end();}
});
it("does not erase a native source failure into a successful zero snapshot",async()=>{
  await c.query('alter table forum_attachment_sweep rename to sa07f_hidden_sweep');
  try{await expect(files.readCurrent()).rejects.toMatchObject({code:'42P01'});expect((await c.query('select id from owner_monitor_observations')).rows).toHaveLength(0);}
  finally{await c.query('alter table sa07f_hidden_sweep rename to forum_attachment_sweep');}
});
it("interprets the native timestamptz sweep clock consistently when the connection uses a non-UTC timezone",async()=>{
  await c.query("update forum_attachment_sweep set claim_token='private-sweep',claimed_at=clock_timestamp()-interval '10 minutes'");
  const zoned=new Pool({connectionString:url,options:options+' -c TimeZone=Asia/Jerusalem',max:1});
  try{
    const s=values(await new PostgresOwnerFileMonitoring(zoned,true).readCurrent(),'background.attachments');
    expect(s.sweepClaimExpired).toBe(true);expect(BigInt(s.sweepClaimAgeMs as string)).toBeGreaterThanOrEqual(600000n);expect(BigInt(s.sweepClaimAgeMs as string)).toBeLessThan(620000n);
  }finally{await zoned.end();}
});
