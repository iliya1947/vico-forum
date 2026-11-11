import { readdir, readFile } from "node:fs/promises";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PostgresOwnerSa02History, parseOwnerHistoryCursor } from "../../db/owner-sa02-history";
import { PostgresAuthFactWriter } from "../../db/owner-auth-facts";

const url=process.env.DATABASE_URL!;
if(!url || !["127.0.0.1","localhost"].includes(new URL(url).hostname) ||
   !new URL(url).pathname.endsWith("_test"))
  throw new Error("SA02 History tests require a disposable loopback *_test database");
const schema="sa02_source_history_test";
const client=new Client({connectionString:url,options:"-c search_path="+schema});
const pool=new Pool({connectionString:url,options:"-c search_path="+schema});
const reader=new PostgresOwnerSa02History(pool);
const U="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const S="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const M="cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const REG="eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const BASE="2026-11-10T18:00:00.001Z";
async function addOwner(id:string,kind:string,monitor:string,source:"auth"|"system"="auth",
  at=BASE) {
  await client.query("insert into owner_events "+
    "(id,occurred_at,source,occurrence_key,kind,monitor_key,payload) "+
    "values($1,$2,$3,$4,$5,$6,'{}'::jsonb)",[id,at,source,id,kind,monitor]);
}
async function seedBasic(){
  await client.query('insert into "user" (id,name,email) values ($1,$2,$3)',
    ["real-member","Sensitive member","member@example.test"]);
  await addOwner(U,"account.created","accounts.users");
  await addOwner(M,"auth.methodLinked","accounts.methods");
  await addOwner(S,"system.requestFailed","system.requests","system");
  await client.query("insert into owner_monitor_observations "+
    "(id,monitor_key,resource_scope,source,schema_version,quality,value,fingerprint) values "+
    "($1,'accounts.users','global','database',1,'measured','{\"total\":\"1\"}','f1'),"+
    "($2,'security.auth','global','database',1,'measured','{\"retainedPatterns\":\"1\"}','f2'),"+
    "($3,'system.requests','global','application',1,'measured','{\"count\":1}','f3')",
    [crypto.randomUUID(),crypto.randomUUID(),crypto.randomUUID()]);
  await client.query("insert into admin_history "+
    "(id,actor_id,actor_label,action,target_type,target_id,target_label,context) "+
    "values ($1,'real-member','Private Admin Label','settings.registrationChanged',"+
    "'forum-settings','registration','Private Registration Title',$2::jsonb)",
    [REG,JSON.stringify({privateToken:"must-not-leak",
      before:{googleRegistrationEnabled:true,emailRegistrationEnabled:true,version:1},
      after:{googleRegistrationEnabled:false,emailRegistrationEnabled:true,version:2}})]);
  await client.query("insert into forum_attachment_security_events "+
    "(id,upload_id,uploaded_by_user_id,context_key,draft_id,file_name,declared_mime,"+
    "detected_type,reason,declared_byte_size,created_at) values "+
    "('attachment:~first','upload-evidence','real-member','private-context','private-draft',"+
    "'private-filename.png','image/png','unknown','unsafe-signature',777,"+
    "'2026-11-10 18:00:00.123456+00'),"+
    "('attachment/second','upload-second','real-member','private-context','private-draft',"+
    "'private-filename-2.png','image/png','unknown','unsafe-signature',778,"+
    "'2026-11-10 18:00:00.123457+00')");
  await client.query("insert into owner_attempt_patterns "+
    "(id,recording_epoch_start,admitted_at,pool,actor_user_id,network_ip,network_quality,"+
    "surface,operation,outcome,http_status,first_occurred_at,last_occurred_at,count) "+
    "values ('11111111-1111-4111-8111-111111111111',"+
    "'2026-11-10T18:00:00Z','2026-11-10T18:00:00.130Z',"+
    "'authenticated','real-member','2001:db8::1234','trusted',"+
    "'auth','registration-admission','rate-limited',429,"+
    "'2026-11-10T17:59:30Z','2026-11-10T18:00:10Z',120)");
  await client.query("insert into owner_attempt_telemetry_state "+
    "(recording_epoch_start,slot,admitted_at,first_occurred_at,last_occurred_at,count) values "+
    "('2026-11-10T17:00:00Z','unknown.auth','2026-11-10T17:08:00Z',"+
    "'2026-11-10T17:08:00Z','2026-11-10T17:08:10Z',20),"+
    "('2026-11-10T17:00:00Z','overflow.anonymous.access','2026-11-10T17:08:01Z',"+
    "'2026-11-10T17:08:01Z','2026-11-10T17:08:20Z',13),"+
    "('2026-11-10T18:00:00Z','gap.auth','2026-11-10T18:08:00Z',"+
    "'2026-11-10T18:08:00Z','2026-11-10T18:08:10Z',2)");
  await client.query("insert into owner_attempt_telemetry_state "+
    "(recording_epoch_start,slot,capacity,used) values "+
    "('2026-11-10T18:00:00Z','quota.anonymous',256,0)");
}
beforeAll(async()=>{
  await client.connect();
  await client.query("drop schema if exists "+schema+" cascade;create schema "+schema);
  for(const name of (await readdir("drizzle")).filter(x=>/^\d{4}_.+\.sql$/.test(x)).sort())
    await client.query((await readFile("drizzle/"+name,"utf8")).replaceAll('"public".','"'+schema+'".'));
});
beforeEach(async()=>{
  await client.query('truncate "user",account,session,verification,rate_limit,'+
    'admin_history,owner_events,owner_monitor_observations,owner_attempt_patterns,'+
    'owner_attempt_telemetry_state,forum_attachment_security_events cascade');
});
afterAll(async()=>{
  await pool.end();
  await client.query("drop schema if exists "+schema+" cascade");
  await client.end();
});

describe("SA02 native source-aware Owner History projection",()=>{
  it("projects authentic source identities globally once and maps shared facts to both monitors",async()=>{
    await seedBasic();
    const global=await reader.readTimeline({limit:50});
    expect(global.entries.length).toBe(13);
    const identities=global.entries.map(e=>e.origin+":"+e.id);
    expect(new Set(identities).size).toBe(identities.length);
    expect(global.next).toBeNull();
    expect(global.entries.find(e=>e.id===M)).toMatchObject({
      origin:"auth-event",monitorKeys:["accounts.methods","security.auth"],
    });
    const methods=await reader.readTimeline({area:"accounts",monitorKey:"accounts.methods"});
    const auth=await reader.readTimeline({area:"security",monitorKey:"security.auth"});
    expect(methods.entries.map(e=>e.id)).toEqual([M]);
    expect(auth.entries.map(e=>e.id)).toContain(M);
    expect(auth.entries.map(e=>e.id)).toContain("11111111-1111-4111-8111-111111111111");
    expect(auth.entries.some(e=>e.kind==="attempt.unknown")).toBe(true);
    const registration=await reader.readTimeline({area:"accounts",monitorKey:"accounts.registration"});
    expect(registration.entries.map(e=>e.id)).toEqual(expect.arrayContaining([
      REG,"11111111-1111-4111-8111-111111111111",
    ]));
    expect(registration.entries.find(e=>e.id===REG)?.origin).toBe("admin-history");
    expect(registration.entries.find(e=>e.id===REG)?.values).toMatchObject({
      beforeGoogleEnabled:true,afterGoogleEnabled:false,
      beforeEmailEnabled:true,afterEmailEnabled:true,beforeVersion:"1",afterVersion:"2",
    });
    const system=await reader.readTimeline({area:"system",monitorKey:"system.requests"});
    expect(system.entries.every(e=>e.monitorKeys.includes("system.requests"))).toBe(true);
    expect(system.entries.some(e=>e.id===S)).toBe(true);
    expect(JSON.stringify(global)).not.toContain("must-not-leak");
    expect(JSON.stringify(global)).not.toContain("member@example.test");
    expect(JSON.stringify(global)).not.toContain("private-filename");
    expect(JSON.stringify(global)).not.toContain("private-context");
    expect(JSON.stringify(global)).toContain("2001:db8::1234");
  });

  it("projects native stored auth actor, target and entity refs globally and in both scoped Histories",async()=>{
    const writer=new PostgresAuthFactWriter(pool);
    const first=await writer.append({
      kind:"auth.sessionDeleted",userId:"target-user",sessionId:"deleted-session",
      reason:"revoke-one",actorUserId:"trusted-actor",
    });
    const second=await writer.append({
      kind:"auth.sessionCreated",userId:"unknown-actor-target",sessionId:"created-session",
      actorUserId:null,
    });
    const stored=(await client.query<{
      id:string;actor_user_id:string|null;target_user_id:string;
      entity_type:string;entity_id:string;
    }>("select id,actor_user_id,target_user_id,entity_type,entity_id "+
      "from owner_events where source='auth' order by position")).rows;
    expect(stored.map(row=>row.id)).toEqual([first.id,second.id]);
    const global=await reader.readTimeline({limit:10});
    const accounts=await reader.readTimeline({area:"accounts",monitorKey:"accounts.sessions"});
    const security=await reader.readTimeline({area:"security",monitorKey:"security.auth"});
    for(const page of [global,accounts,security]) {
      const deletion=page.entries.find(entry=>entry.id===first.id);
      const creation=page.entries.find(entry=>entry.id===second.id);
      expect(deletion?.origin).toBe("auth-event");
      expect(creation?.origin).toBe("auth-event");
      expect(deletion?.values).toMatchObject({
        actorUserId:"trusted-actor",targetUserId:"target-user",
        entityType:"session",entityId:"deleted-session",reason:"revoke-one",
      });
      expect(creation?.values).toMatchObject({
        actorUserId:null,targetUserId:"unknown-actor-target",
        entityType:"session",entityId:"created-session",
      });
      expect(deletion?.values.actorUserId).not.toBe(deletion?.values.targetUserId);
      expect(JSON.stringify(page)).not.toContain("session_token");
      expect(JSON.stringify(page)).not.toContain("password");
    }
    expect(global.entries.map(entry=>entry.id).sort()).toEqual([first.id,second.id].sort());
    expect(stored[0]).toMatchObject({
      actor_user_id:"trusted-actor",target_user_id:"target-user",
      entity_type:"session",entity_id:"deleted-session",
    });
    expect(stored[1].actor_user_id).toBeNull();
  });

  it("retains exact microsecond ordering and arbitrary bounded native text IDs across page cursor",async()=>{
    await seedBasic();
    const attachments=await reader.readTimeline({area:"security",monitorKey:"security.attachments",limit:1});
    expect(attachments.entries).toHaveLength(1);
    expect(attachments.entries[0].id).toBe("attachment/second");
    const cursor=parseOwnerHistoryCursor(attachments.next!,{
      area:"security",monitorKey:"security.attachments",
    });
    expect(cursor?.at).toBe("2026-11-10T18:00:00.123457Z");
    expect(cursor?.origin).toBe("attachment-evidence");
    const older=await reader.readTimeline({area:"security",monitorKey:"security.attachments",
      limit:1,before:attachments.next!});
    expect(older.entries.map(e=>e.id)).toEqual(["attachment:~first"]);
    expect(older.next).toBeNull();
    expect(older.entries[0].values).toMatchObject({declaredByteSize:777,
      uploadId:"upload-evidence",detectedType:"unknown",reason:"unsafe-signature"});
  });

  it("paginates mixed origins and >50 retained aggregates without skipping/duplicating across changing counts",async()=>{
    await seedBasic();
    await client.query("insert into owner_attempt_patterns "+
      "(id,recording_epoch_start,admitted_at,pool,actor_user_id,network_ip,network_quality,"+
      "surface,operation,outcome,http_status,first_occurred_at,last_occurred_at,count) "+
      "select gen_random_uuid(),'2026-11-10T18:00:00Z',"+
      "'2026-11-10T18:00:01Z'::timestamptz+(n||' milliseconds')::interval,"+
      "'authenticated','actor-'||n,'198.51.100.20','trusted',"+
      "'auth','sign-in','denied',401,'2026-11-10T18:00:00Z',"+
      "'2026-11-10T18:00:10Z',2 from generate_series(1,75) n");
    const all=await reader.readTimeline({limit:50});
    expect(all.entries).toHaveLength(50);
    expect(all.next).toBeTruthy();
    const seen=[...all.entries.map(e=>e.origin+":"+e.id)];
    let next=all.next;
    await client.query("update owner_attempt_patterns set count=count+33,"+
      "last_occurred_at='2026-11-10T19:00:00Z' where actor_user_id='actor-1'");
    while(next){
      const page=await reader.readTimeline({limit:13,before:next});
      seen.push(...page.entries.map(e=>e.origin+":"+e.id));
      next=page.next;
    }
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen).toHaveLength(88);
    expect(seen.filter(s=>s==="auth-event:"+M)).toHaveLength(1);
    expect(seen.filter(s=>s==="attachment-evidence:attachment:~first")).toHaveLength(1);
  });

  it("distinguishes equal native IDs and identical timestamps by original source on separate pages",async()=>{
    await addOwner(U,"account.created","accounts.users");
    await client.query("insert into admin_history "+
      "(id,occurred_at,actor_id,actor_label,action,target_type,target_id,target_label,context) "+
      "values ($1,$2,'author','Private','settings.registrationChanged',"+
      "'forum-settings','registration','Private','{}'::jsonb)",[U,BASE]);
    const first=await reader.readTimeline({limit:1});
    const second=await reader.readTimeline({limit:1,before:first.next!});
    expect(first.entries).toHaveLength(1);
    expect(second.entries).toHaveLength(1);
    expect(first.entries[0].id).toBe(U);
    expect(second.entries[0].id).toBe(U);
    expect(new Set([first.entries[0].origin,second.entries[0].origin])).toEqual(
      new Set(["auth-event","admin-history"]));
    expect(first.entries[0].occurredAt).toBe(second.entries[0].occurredAt);
    expect(second.next).toBeNull();
  });

  it("preserves valid legacy SA01 three-part cursor and never grants it to other areas",async()=>{
    await seedBasic();
    const legacy=BASE+"~system-event~"+S;
    expect(parseOwnerHistoryCursor(legacy,{area:"system",monitorKey:"system.requests"}))
      .toMatchObject({origin:"system-event",id:S,at:"2026-11-10T18:00:00.001000Z"});
    const scoped=await reader.readTimeline({area:"system",monitorKey:"system.requests",before:legacy});
    expect(scoped.entries.every(e=>e.origin!=="system-event" || e.id!==S)).toBe(true);
    const global=await reader.readTimeline({before:legacy});
    expect(global.entries.every(e=>e.origin!=="system-event" || e.id!==S)).toBe(true);
    await expect(reader.readTimeline({area:"security",monitorKey:"security.auth",
      before:legacy})).rejects.toThrow("cursor");
  });

  it("rejects noncalendar dates, malformed/tampered cursor, wrong area/scope and arbitrary client keys before SQL",async()=>{
    await seedBasic();
    const first=await reader.readTimeline({area:"accounts",monitorKey:"accounts.users",limit:1});
    const good=first.next??"";
    // Use a page with >1 source so next is non-null.
    const global=await reader.readTimeline({limit:1});
    const cursor=global.next!;
    expect(cursor.startsWith("v1.")).toBe(true);
    expect(()=>parseOwnerHistoryCursor(cursor,{area:"accounts"})).toThrow("cursor");
    expect(()=>parseOwnerHistoryCursor(cursor+"a")).toThrow("cursor");
    const raw=JSON.parse(new TextDecoder().decode(Uint8Array.from(
      atob(cursor.slice(3).replace(/-/g,"+").replace(/_/g,"/")+
        "=".repeat((4-cursor.slice(3).length%4)%4)),c=>c.charCodeAt(0))));
    const altered=(changes:object)=>{
      const binary=Array.from(new TextEncoder().encode(JSON.stringify({...raw,...changes})),
        x=>String.fromCharCode(x)).join("");
      return "v1."+btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
    };
    for(const value of ["2026-02-30T00:00:00.000000Z",
      "2026-11-10T24:00:00.000000Z","2026-11-10T18:00:00.000Z",
      "0000-01-01T00:00:00.000000Z"]){
      expect(()=>parseOwnerHistoryCursor(altered({at:value}))).toThrow("cursor");
    }
    expect(()=>parseOwnerHistoryCursor(altered({origin:"injected-table"}))).toThrow("cursor");
    expect(()=>parseOwnerHistoryCursor(altered({
      area:"accounts",monitor:null,origin:"attachment-evidence",
    }),{area:"accounts"})).toThrow("cursor");

    expect(()=>parseOwnerHistoryCursor(altered({id:"bad\nid"}))).toThrow("cursor");
    expect(()=>parseOwnerHistoryCursor(altered({id:"x".repeat(201)}))).toThrow("cursor");
    await expect(reader.readTimeline({area:"future" as never})).rejects.toThrow("area");
    await expect(reader.readTimeline({area:"accounts",monitorKey:"security.auth"}))
      .rejects.toThrow("mismatch");
    await expect(reader.readTimeline({area:"accounts",monitorKey:"arbitrary" as never}))
      .rejects.toThrow("monitor");
    await expect(reader.readTimeline({limit:51})).rejects.toThrow("limit");
    expect(good.startsWith("v1.")).toBe(true);
  });
});
