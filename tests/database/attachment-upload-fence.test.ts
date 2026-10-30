import { readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { ForumAttachmentStorageUnavailableError, createHyperdriveForumAttachmentStore } from "../../db/hyperdrive-forum-attachments";
import { ATTACHMENT_UPLOAD_PREFIX, ATTACHMENT_RESERVATION_KIND } from "../../app/forum/attachment-storage-protocol";
import type { PrivateAttachmentBucket } from "../../app/forum/attachment-r2";
import { RouterContextProvider } from "react-router";
import { authSessionContext } from "../../app/auth/request-context";
import { forumReaderContext } from "../../app/forum/request-context";
import { authorizationContext } from "../../app/authorization/request-context";
import { forumAttachmentStoreContext, privateAttachmentBucketContext } from "../../app/forum/attachment-request-context";
import { action as uploadAction } from "../../app/routes/attachment-upload";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { DrizzleForumAttachments, InvalidForumAttachmentError, type CreateDraftAttachmentInput } from "../../db/forum-attachments";
import { ForumAttachmentCleanup } from "../../db/forum-attachment-cleanup";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const url = new URL(databaseUrl);
if (!["localhost", "127.0.0.1"].includes(url.hostname) || !url.pathname.endsWith("_test")) {
  throw new Error("Disposable local test database required");
}

const schema = "attachment_fence_test";
const client = new Client({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
const store = new DrizzleForumAttachments(drizzle(client));
const migrations = [
  "0000_tan_johnny_storm", "0001_seed-locales", "0002_ui_translation_storage",
  "0003_gorgeous_donald_blake", "0004_forum_domain_foundation",
  "0005_calm_proemial_gods", "0006_loving_sentinels",
  "0021_forum_tags", "0022_forum_reply_relationships", "0024_forum_reply_notifications",
  "0025_forum_topic_pins", "0026_best_answer_independent_from_solved",
  "0027_help_solutions_foundation", "0028_help_solution_moderation",
  "0029_help_question_needs_details", "0030_help_duplicate_workflow",
  "0031_help_user_moderation_signals", "0032_forum_profiles", "0033_forum_online_presence",
  "0034_forum_editor_drafts", "0035_forum_attachments_foundation",
  "0036_forum_attachment_security_events",
  "0037_forum_attachment_draft_generations", "0038_forum_attachment_cleanup_claims", "0039_forum_publication_receipts", "0040_post_edit_history_permissions",
  "0041_published_mentions",
  "0042_attachment_edit_snapshots",
  "0043_attachment_security_read_permission",
  "0044_attachment_draft_conflict_boundaries",
  "0046_attachment_upload_fences",
  "0047_complaints_domain_foundation",
  "0048_complaint_case_links",
  "0049_complaint_submission",
];

const ownerId = "attachment-owner";
const otherId = "attachment-other";

function upload(context: string, generation: string, id: string = crypto.randomUUID()): CreateDraftAttachmentInput {
  return {
    id, ownerId, contextKey: context, draftId: generation,
    objectKey: `private/${crypto.randomUUID()}`, fileName: "concurrent.txt",
    declaredMime: "text/plain", detectedType: "text", responseMime: "text/plain; charset=utf-8",
    byteSize: 12, verificationStatus: "type-checked",
  };
}

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const tag of migrations) {
    await client.query((await readFile(`drizzle/${tag}.sql`, "utf8")).replaceAll('"public".', `"${schema}".`));
  }

  for (const id of [ownerId, otherId]) {
    await client.query('insert into "user" (id, name, email) values ($1, $2, $3)', [
      id, id, `${id}@test.invalid`,
    ]);
  }
  await client.query(
    "insert into forum_categories (id, name) values ('attachment-category', 'Attachments')",
  );
  await client.query(
    "insert into forum_sections (id, category_id, name) values ('attachment-section', 'attachment-category', 'Files')",
  );
  await client.query("begin");
  await client.query(
    "insert into forum_topics (id, section_id, author_id, current_title_revision_id) values ('attachment-topic', 'attachment-section', $1, 'attachment-title-rev')",
    [ownerId],
  );
  await client.query(
    "insert into forum_topic_title_revisions (id, topic_id, author_id, original_content, source_locale) values ('attachment-title-rev', 'attachment-topic', $1, 'Attachment topic', 'en')",
    [ownerId],
  );
  await client.query(
    "insert into forum_posts (id, topic_id, author_id, current_revision_id) values ('attachment-post', 'attachment-topic', $1, 'attachment-body-rev')",
    [ownerId],
  );
  await client.query(
    "insert into forum_post_revisions (id, post_id, author_id, original_content, source_locale) values ('attachment-body-rev', 'attachment-post', $1, 'Attachment body', 'en')",
    [ownerId],
  );
  await client.query("commit");
});

afterAll(async () => {
  await client.query(`drop schema if exists ${schema} cascade`);
  await client.end();
});


interface Stored { bytes: Uint8Array; etag: string; kind: string }
function gate() { let resolve!: () => void; const promise = new Promise<void>(r => {resolve=r;}); return {promise, resolve}; }
function memoryStorage() {
  const objects = new Map<string, Stored>();
  const control = {
    reserveGate: null as ReturnType<typeof gate> | null,
    payloadGate: null as ReturnType<typeof gate> | null,
    reservationEntered: gate(), payloadEntered: gate(),
    reserveLostAck: false, unknownPayload: false, rejectPayload: false, deleteFails: false,
    latePayload: null as (() => {size: number} | null) | null,
    deletes: [] as string[], listCalls: [] as Array<{limit:number;cursor?:string}>,
  };
  const storage: PrivateAttachmentBucket = {
    async reserve(key) {
      control.reservationEntered.resolve(); await control.reserveGate?.promise;
      if(objects.has(key)) return null;
      objects.set(key,{bytes:new Uint8Array(),etag:'guard-'+key,kind:ATTACHMENT_RESERVATION_KIND});
      if(control.reserveLostAck) throw new Error('initialization acknowledgement lost');
      return {etag:'guard-'+key};
    },
    async put(key, body, options) {
      const bytes = new Uint8Array(await new Response(body).arrayBuffer());
      control.payloadEntered.resolve();
      const commit = () => {
        if(objects.get(key)?.etag !== options.reservationEtag) return null;
        objects.set(key,{bytes,etag:'payload-'+key,kind:'data'});return {size:bytes.length};
      };
      if(control.rejectPayload) return null;
      if(control.unknownPayload) {control.latePayload=commit;throw new Error('full-body result unknown');}
      await control.payloadGate?.promise;return commit();
    },
    async get(key,{range}) {
      const object=objects.get(key);return object?{size:object.bytes.length,body:new Response(object.bytes.slice(range.offset,range.offset+range.length)).body!}:null;
    },
    async delete(key) {control.deletes.push(key);if(control.deleteFails) throw new Error('DELETE unavailable');objects.delete(key);},
    async listReservations(options) {
      control.listCalls.push(options);
      // Key-based cursor deliberately survives deletions between pages.
      const keys=[...objects.keys()].sort().filter(k=>!options.cursor || k>options.cursor);
      const page=keys.slice(0,options.limit);
      return {keys:page.filter(k=>objects.get(k)?.kind===ATTACHMENT_RESERVATION_KIND),cursor:keys.length>page.length?page.at(-1):undefined};
    },
  };
  return {storage,objects,control};
}
function uploadContext(storage:PrivateAttachmentBucket, overrides:Record<string,unknown>={}) {
  const context=new RouterContextProvider();
  context.set(authSessionContext,{user:{id:ownerId}} as never);
  context.set(forumReaderContext,{readSection:async()=>({id:'attachment-section'})}as never);
  context.set(authorizationContext,{forUser:()=>({has:async()=>true})}as never);
  context.set(privateAttachmentBucketContext,storage);
  context.set(forumAttachmentStoreContext,{
    recordUploadObject:(key:string)=>store.recordUploadObject(key),
    activateUploadObject:(key:string,etag:string)=>store.activateUploadObject(key,etag),
    createDraftAttachment:(input:CreateDraftAttachmentInput)=>store.createDraftAttachment(input),...overrides,
  }as never);return context;
}
function send(storage:PrivateAttachmentBucket, {body='hello',size=typeof body==='string'?body.length:10000,overrides={}}:{body?:string|ReadableStream<Uint8Array>;size?:number;overrides?:Record<string,unknown>}={}) {
 return uploadAction({context:uploadContext(storage,overrides),request:new Request('https://forum.test/api/attachments',{
  method:'POST',headers:{Origin:'https://forum.test','Content-Type':'text/plain','X-Vico-Attachment-Id':crypto.randomUUID(),
   'X-Vico-Attachment-Name':'notes.txt','X-Vico-Attachment-Size':String(size),'X-Vico-Editor-Context':encodeURIComponent('section:attachment-section:new'),'X-Vico-Operation-Id':crypto.randomUUID()},
  body,duplex:'half',
 }as RequestInit)});
}
async function journal(key:string) {return (await client.query('select * from forum_attachment_upload_objects where object_key=$1',[key])).rows[0];}
async function age(key:string) {await client.query("update forum_attachment_upload_objects set created_at=now()-interval '2 hours' where object_key=$1",[key]);}
async function sweepAll(storage:PrivateAttachmentBucket) {
 let now=new Date();for(let n=0;n<8;n++){await new ForumAttachmentCleanup(drizzle(client),storage,()=>now).runOnce();now=new Date(now.getTime()+6*60_000);}
}

describe('v2 upload writer fencing with actual PostgreSQL',()=>{
 it('admits a verified payload and protects its authoritative asset even from stale marker listing',async()=>{
  const {storage,objects}=memoryStorage();const response=await send(storage);expect(response.status).toBe(201);
  const key=[...objects.keys()][0]!;expect(key.startsWith(ATTACHMENT_UPLOAD_PREFIX)).toBe(true);expect((await journal(key)).reservation_etag).toBe('guard-'+key);
  await age(key);
  storage.listReservations=async()=>({keys:[key]});
  await sweepAll(storage);expect(await journal(key)).toBeUndefined();expect(objects.get(key)?.kind).toBe('data');
  expect((await client.query('select 1 from forum_attachments where object_key=$1',[key])).rowCount).toBe(1);
 });
 it.each(['rejected','short','read']as const)('retires terminal %s without a post-write settlement operation',async fault=>{
  const {storage,objects,control}=memoryStorage();control.rejectPayload=fault==='rejected';let pulls=0;
  const body=fault==='read'?new ReadableStream<Uint8Array>({pull(c){if(pulls++===0)c.enqueue(new TextEncoder().encode('x'.repeat(4096)));else c.error(new Error('upstream failed'));}}):'x'.repeat(5000);
  let key='';const response=await send(storage,{body,size:fault==='rejected'?5000:10000,overrides:{recordUploadObject:async(k:string)=>{key=k;await store.recordUploadObject(k);}}});
  expect(response.status).toBe(fault==='rejected'?503:400);expect(key).not.toBe('');await age(key);await sweepAll(storage);
  expect(await journal(key)).toBeUndefined();expect(objects.has(key)).toBe(false);
 });
 it('does not start payload on an actual SQL activation timeout and still retires the journal',async()=>{
  const {storage,objects,control}=memoryStorage();
  await client.query(`create function delay_activation() returns trigger language plpgsql as $$begin perform pg_sleep(0.2);return new;end$$;
   create trigger delay_activation before update of reservation_etag on forum_attachment_upload_objects for each row execute function delay_activation()`);
  const adapter=createHyperdriveForumAttachmentStore(databaseUrl!,()=>new Client({connectionString:databaseUrl,options:`-c search_path=${schema} -c statement_timeout=50`}));
  let key='';try{
   const response=await send(storage,{overrides:{recordUploadObject:async(k:string)=>{key=k;await store.recordUploadObject(k);},activateUploadObject:(k:string,e:string)=>adapter.activateUploadObject(k,e)}});
   expect(response.status).toBe(503);expect(control.latePayload).toBeNull();expect((await journal(key)).reservation_etag).toBeNull();
  }finally{await client.query('drop trigger delay_activation on forum_attachment_upload_objects;drop function delay_activation()');}
  await age(key);await sweepAll(storage);expect(await journal(key)).toBeUndefined();expect(objects.size).toBe(0);
 });
 it.each([false,true])('cleans a post-PUT DB failure, while protecting a committed metadata ACK loss=%s',async committed=>{
  const {storage,objects}=memoryStorage();let key='';
  const response=await send(storage,{overrides:{recordUploadObject:async(k:string)=>{key=k;await store.recordUploadObject(k);},
   createDraftAttachment:async(input:CreateDraftAttachmentInput)=>{if(committed)await store.createDraftAttachment(input);throw new ForumAttachmentStorageUnavailableError();}}});
  expect(response.status).toBe(503);await age(key);await sweepAll(storage);expect(await journal(key)).toBeUndefined();expect(objects.has(key)).toBe(committed);
 });
 it.each(['before','after']as const)('revokes an unknown full-body PUT whose commit is %s cleanup',async order=>{
  const {storage,objects,control}=memoryStorage();control.unknownPayload=true;control.deleteFails=true;let key='';
  expect((await send(storage,{overrides:{recordUploadObject:async(k:string)=>{key=k;await store.recordUploadObject(k);}}})).status).toBe(503);
  control.deleteFails=false;if(order==='before')expect(control.latePayload!()).not.toBeNull();
  await age(key);await sweepAll(storage);
  if(order==='after')expect(control.latePayload!()).toBeNull();
  expect(await journal(key)).toBeUndefined();expect(objects.has(key)).toBe(false);
 });
 it('claims READY while an actual request is waiting before payload commit; metadata cannot resurrect it',async()=>{
  const {storage,objects,control}=memoryStorage();control.payloadGate=gate();let key='';
  const pending=send(storage,{overrides:{recordUploadObject:async(k:string)=>{key=k;await store.recordUploadObject(k);}}});
  await control.payloadEntered.promise;await age(key);await new ForumAttachmentCleanup(drizzle(client),storage).runOnce();
  expect(await journal(key)).toBeUndefined();control.payloadGate.resolve();expect((await pending).status).toBe(503);expect(objects.has(key)).toBe(false);
 });
 it.each([false,true])('reclaims late PREPARING initialization with lost ACK=%s; no old key is recreated',async lost=>{
  const {storage,objects,control}=memoryStorage();control.reserveGate=gate();control.reserveLostAck=lost;
  let key='',activations=0;const payload=vi.spyOn(storage,'put'),reserve=vi.spyOn(storage,'reserve');
  const pending=send(storage,{overrides:{recordUploadObject:async(k:string)=>{key=k;await store.recordUploadObject(k);},activateUploadObject:async(k:string,e:string)=>{activations++;await store.activateUploadObject(k,e);}}});
  await control.reservationEntered.promise;await age(key);await new ForumAttachmentCleanup(drizzle(client),storage).runOnce();expect(await journal(key)).toBeUndefined();
  // A cleanup round was allowed to finish before initialization actually commits.
  control.deleteFails=true;control.reserveGate.resolve();expect([400,503]).toContain((await pending).status);expect(payload).not.toHaveBeenCalled();expect(reserve).toHaveBeenCalledOnce();expect(activations).toBe(lost?0:1);
  expect(objects.get(key)?.kind).toBe(ATTACHMENT_RESERVATION_KIND);
  control.deleteFails=false;await sweepAll(storage);expect(objects.has(key)).toBe(false);
 });
 it('refuses activation after a durable claim, including expired leases',async()=>{
  const key=ATTACHMENT_UPLOAD_PREFIX+crypto.randomUUID();await store.recordUploadObject(key);
  await client.query("update forum_attachment_upload_objects set claim_token=$2,claimed_at=now()-interval '1 hour' where object_key=$1",[key,crypto.randomUUID()]);
  await expect(store.activateUploadObject(key,'guard')).rejects.toBeInstanceOf(InvalidForumAttachmentError);
  await age(key);await sweepAll(memoryStorage().storage);expect(await journal(key)).toBeUndefined();
 });
 it('cannot admit fenced metadata without a READY unclaimed journal even if requireUploadRecord is omitted',async()=>{
  const input=upload('section:attachment-section:new',crypto.randomUUID());input.objectKey=ATTACHMENT_UPLOAD_PREFIX+crypto.randomUUID();
  await expect(store.createDraftAttachment(input)).rejects.toBeInstanceOf(InvalidForumAttachmentError);
  await store.recordUploadObject(input.objectKey);await expect(store.createDraftAttachment(input)).rejects.toBeInstanceOf(InvalidForumAttachmentError);
  await store.activateUploadObject(input.objectKey,'guard');expect(await store.createDraftAttachment(input)).toMatchObject({objectKey:input.objectKey});
 });
 it('keeps marker pagination bounded and durable across fresh cleanup instances',async()=>{
  const {storage,objects,control}=memoryStorage();const keys=Array.from({length:13},()=>ATTACHMENT_UPLOAD_PREFIX+crypto.randomUUID());
  for(const key of keys)objects.set(key,{bytes:new Uint8Array(),etag:'guard',kind:ATTACHMENT_RESERVATION_KIND});
  await new ForumAttachmentCleanup(drizzle(client),storage).runOnce(4);expect(objects.size).toBe(12);
  expect(control.listCalls[0]?.limit).toBe(1);expect((await client.query('select cursor from forum_attachment_sweep')).rows[0].cursor).not.toBeNull();
  for(let n=0;n<15;n++)await new ForumAttachmentCleanup(drizzle(client),storage).runOnce(4);
  expect(objects.size).toBe(0);expect(control.listCalls.every(c=>c.limit===1)).toBe(true);
 });
 it('does not infer absence on a real PostgreSQL ownership-read failure',async()=>{
  const {storage,objects}=memoryStorage();const key=ATTACHMENT_UPLOAD_PREFIX+crypto.randomUUID();
  objects.set(key,{bytes:new Uint8Array(),etag:'guard',kind:ATTACHMENT_RESERVATION_KIND});
  const role='fence_probe_'+crypto.randomUUID().replaceAll('-','');
  await client.query(`create role "${role}";grant usage on schema ${schema} to "${role}";grant select, update on forum_attachment_sweep to "${role}"`);
  const original=storage.listReservations;storage.listReservations=async options=>{
    const page=await original(options);await client.query(`set role "${role}"`);return page;
  };
  try {
    const outcome=await new ForumAttachmentCleanup(drizzle(client),storage).runOnce();
    expect(outcome.failed).toBe(1);expect(objects.has(key)).toBe(true);
  }finally{await client.query(`reset role;drop owned by "${role}";drop role "${role}"`);}
  storage.listReservations=original;await sweepAll(storage);expect(objects.has(key)).toBe(false);
 });
 it('recovers when the first post-PUT metadata write actually times out in PostgreSQL',async()=>{
  const {storage,objects}=memoryStorage();let key='';
  await client.query(`create function delay_metadata() returns trigger language plpgsql as $$begin perform pg_sleep(0.2);return new;end$$;
   create trigger delay_metadata before insert on forum_attachments for each row execute function delay_metadata()`);
  const adapter=createHyperdriveForumAttachmentStore(databaseUrl!,()=>new Client({connectionString:databaseUrl,options:`-c search_path=${schema} -c statement_timeout=50`}));
  try{
   const response=await send(storage,{overrides:{recordUploadObject:async(k:string)=>{key=k;await store.recordUploadObject(k);},createDraftAttachment:(input:CreateDraftAttachmentInput)=>adapter.createDraftAttachment(input)}});
   expect(response.status).toBe(503);expect(objects.get(key)?.kind).toBe('data');
  }finally{await client.query('drop trigger delay_metadata on forum_attachments;drop function delay_metadata()');}
  await age(key);await sweepAll(storage);expect(await journal(key)).toBeUndefined();expect(objects.has(key)).toBe(false);
 });
 it('fences overlapping and expired journal cleanup claims before a delayed payload',async()=>{
  const {storage,objects,control}=memoryStorage();control.payloadGate=gate();let key='';
  const pending=send(storage,{overrides:{recordUploadObject:async(k:string)=>{key=k;await store.recordUploadObject(k);}}});
  await control.payloadEntered.promise;await age(key);
  const entered=gate(),release=gate(),original=storage.delete;let deletes=0;
  storage.delete=async(k)=>{if(++deletes===1){entered.resolve();await release.promise;}await original(k);};
  const first=new ForumAttachmentCleanup(drizzle(client),storage).runOnce();await entered.promise;
  const token=(await journal(key)).claim_token;
  expect((await new ForumAttachmentCleanup(drizzle(client),storage).runOnce()).claimed).toBe(0);
  const next=new ForumAttachmentCleanup(drizzle(client),storage,()=>new Date(Date.now()+6*60_000));
  expect((await next.runOnce()).claimed).toBe(1);expect(await journal(key)).toBeUndefined();expect(token).not.toBeNull();
  release.resolve();await first;control.payloadGate.resolve();expect((await pending).status).toBe(503);expect(objects.has(key)).toBe(false);
 });
 it('does not let an expired marker-sweep processor overwrite a newer checkpoint',async()=>{
  const {storage}=memoryStorage();const entered=gate(),release=gate();let calls=0;
  storage.listReservations=async()=>{if(++calls===1){entered.resolve();await release.promise;return {keys:[],cursor:'stale'};}return {keys:[],cursor:'fresh'};};
  const first=new ForumAttachmentCleanup(drizzle(client),storage).runOnce();await entered.promise;
  await new ForumAttachmentCleanup(drizzle(client),storage).runOnce();expect(calls).toBe(1);
  await new ForumAttachmentCleanup(drizzle(client),storage,()=>new Date(Date.now()+6*60_000)).runOnce();expect(calls).toBe(2);
  release.resolve();await first;expect((await client.query('select cursor from forum_attachment_sweep')).rows[0].cursor).toBe('fresh');
  await client.query('update forum_attachment_sweep set cursor=null');
 });

});
