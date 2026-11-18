import { readdir, readFile } from "node:fs/promises";
import { Client, Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PostgresOwnerAccountLifecycleCommand } from "../../db/owner-account-lifecycle";
import { PostgresOwnerUserProfile } from "../../db/owner-user-profile";
import { PostgresOwnerUserHistory, parseOwnerUserHistoryCursor } from "../../db/owner-user-history";
import { PostgresOwnerSa02Current } from "../../db/owner-sa02-current";
import { PostgresOwnerSa02History, parseOwnerHistoryCursor, type OwnerHistoryEntry } from "../../db/owner-sa02-history";
import { DrizzleForumRepository } from "../../db/forum-repository";
import { PostgresAdminUsersReader } from "../../db/admin-users";
import { AccountStateUnexpectedError } from "../../db/account-state";

const url=process.env.DATABASE_URL;
if(!url || !["127.0.0.1","localhost"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) throw new Error("Disposable loopback *_test PostgreSQL required");
const schema="sa05_owner_read_projection_test", options="-c search_path="+schema;
const client=new Client({connectionString:url,options}), pool=new Pool({connectionString:url,options});
const owner="Owner-用户/1", target="Target-משתמש/2", other="Unrelated-person";
const command=new PostgresOwnerAccountLifecycleCommand(pool,owner);
const profile=new PostgresOwnerUserProfile(pool), current=new PostgresOwnerSa02Current(pool);
const history=new PostgresOwnerSa02History(pool), personHistory=new PostgresOwnerUserHistory(pool);
const query=(targetId=target)=>({targetId,viewerUserId:owner,currentSessionId:"synthetic-context"});
const users=(s:Awaited<ReturnType<typeof current.readCurrent>>)=>s.monitors.find(m=>m.key==="accounts.users")!;
async function person(id:string){
  await client.query('insert into "user"(id,name,email) values($1,$2,$3)',[id,"PRIVATE_NAME_"+id,id+"@private.invalid"]);
}
async function events(){return (await client.query("select * from owner_events order by position")).rows;}
async function retained(id:string,actor:string,subject:string,at="2024-02-29T12:00:00.123Z",source="account",kind="account.deactivated"){
  await client.query("insert into owner_events(id,occurred_at,source,occurrence_key,kind,monitor_key,"+
    "actor_user_id,target_user_id,entity_type,entity_id,correlation_id,payload) "+
    "values($1::uuid,$2,$3,$1::text,$4,'accounts.users',$5,$6,'user',$6,$7,$8::jsonb)",
    [id,at,source,kind,actor,subject,crypto.randomUUID(),JSON.stringify({state:"deactivated",
      retainAtLeastUntil:"2025-02-28T12:00:00.123Z",password:"PRIVATE_EVENT_SECRET",nested:{secret:"PRIVATE_NESTED"}})]);
}
async function allPages(read:(before?:string)=>Promise<{entries:readonly OwnerHistoryEntry[];next:string|null}>){
  const rows:OwnerHistoryEntry[]=[]; let before:string|undefined;
  for(let n=0;n<20;n++){
    const page=await read(before);rows.push(...page.entries);if(!page.next)return rows;before=page.next;
  }
  throw new Error("Unbounded History pagination");
}
beforeAll(async()=>{
  await client.connect(); await client.query("drop schema if exists "+schema+" cascade;create schema "+schema);
  for(const f of (await readdir("drizzle")).filter(n=>/^\d{4}_.+\.sql$/.test(n)).sort()){
    await client.query((await readFile("drizzle/"+f,"utf8")).replaceAll('"public".','"'+schema+'".'));
  }
});
beforeEach(async()=>{
  await client.query('truncate "user",owner_events,owner_monitor_observations,owner_attempt_patterns,'+
    'owner_attempt_telemetry_state,forum_attachment_security_events,admin_history cascade');
  for(const id of [owner,target,other])await person(id);
});
afterAll(async()=>{await pool.end();await client.query("drop schema if exists "+schema+" cascade");await client.end();});

describe("SA05-3 / original 05-A native read and retained-event projections",()=>{
  it("actual command preserves private identity/methods/raw sessions, exposes shared lifecycle only in Owner DTO",async()=>{
    await client.query("insert into account(id,user_id,account_id,provider_id,password,updated_at) "+
      "values('method',$1,'PRIVATE_PROVIDER_ID','credential','PRIVATE_HASH',now())",[target]);
    await client.query("insert into session(id,user_id,token,expires_at,updated_at) values "+
      "('session',$1,'PRIVATE_BEARER',now()+interval '1 day',now())",[target]);
    const before=await profile.readTarget(query());expect(before?.lifecycle).toEqual({status:"active"});
    const result=await command.deactivate({actorId:owner,targetId:target,operationId:crypto.randomUUID()});
    const after=await profile.readTarget(query());
    expect(after?.lifecycle).toEqual({status:"deactivated",deactivatedAt:result.deactivatedAt,
      deactivatedByUserId:owner,retainAtLeastUntil:result.retainAtLeastUntil});
    expect(after?.email).toBe(before?.email);expect(after?.linkedMethods).toEqual(["password"]);
    expect(after?.sessionCounts).toEqual({active:"1",expiredRetained:"0"});expect(after?.sessions).toEqual(before?.sessions);
    const publicProfile=await new DrizzleForumRepository(drizzle(pool)).readProfile(target);
    const directory=await new PostgresAdminUsersReader(pool).listUsers({search:target});
    expect(publicProfile).toMatchObject({id:target,identityKind:"deleted",name:"Deleted user",image:null});
    expect(directory.items).toHaveLength(1);expect(directory.items[0]).toMatchObject({id:target,name:"Deleted user",identityKind:"deleted"});
    expect(JSON.stringify([publicProfile,directory])).not.toMatch(/PRIVATE_|deactivatedAt|retainAtLeastUntil|deactivatedByUserId|lifecycle/);
    expect(JSON.stringify(after)).not.toMatch(/PRIVATE_HASH|PRIVATE_BEARER|PRIVATE_PROVIDER_ID/);
  });
  it("the same original command event appears once globally/scoped/in target and actor History, never on unrelated people",async()=>{
    const op=crypto.randomUUID(), first=await command.deactivate({actorId:owner,targetId:target,operationId:op});
    const saved=await events();
    await command.deactivate({actorId:owner,targetId:target,operationId:op});
    await command.deactivate({actorId:owner,targetId:target,operationId:crypto.randomUUID()});
    const global=await history.readTimeline(), scoped=await history.readTimeline({area:"accounts",monitorKey:"accounts.users"});
    const subject=await personHistory.readHistory(target), actor=await personHistory.readHistory(owner);
    const expected={origin:"account-event",id:first.eventId,source:"account",kind:"account.deactivated",
      monitorKeys:["accounts.users"],values:{state:"deactivated",retainAtLeastUntil:first.retainAtLeastUntil,
        actorUserId:owner,targetUserId:target,entityType:"user",entityId:target,operationId:op}};
    for(const p of [global,scoped,subject,actor]){
      expect(p.entries).toHaveLength(1);expect(p.entries[0]).toMatchObject(expected);
      expect(new Date(p.entries[0].occurredAt).toISOString()).toBe(first.deactivatedAt);
    }
    expect((await personHistory.readHistory(other)).entries).toEqual([]);
    expect((await history.readTimeline({area:"security"})).entries).toEqual([]);
    expect((await history.readTimeline({area:"accounts",monitorKey:"accounts.sessions"})).entries).toEqual([]);
    expect(await events()).toEqual(saved);
  });
  it("counts every complete tuple above page bounds with DB-time retention, without multiplying methods/sessions or purging retained rows",async()=>{
    await client.query('update "user" set created_at=\'2020-01-01\'');
    for(const [prefix,count,at] of [["active",70,null],["pending",31,"2030-01-01"],["retained",32,"2020-01-01"]] as const){
      await client.query('insert into "user"(id,name,email,created_at,deactivated_at,deactivated_by_user_id,retain_at_least_until) '+
        'select $1||n,\'PRIVATE_NAME\',$1||n||\'@private.invalid\',\'2020-01-01\',$3::timestamptz,'+
        'case when $3::timestamptz is null then null else $4::text end,'+
        'case when $3::timestamptz is null then null else (($3::timestamptz at time zone \'UTC\')+interval \'1 year\') at time zone \'UTC\' end '+
        'from generate_series(1,$2::int) n',[prefix,count,at,owner]);
    }
    await client.query('update "user" set created_at=clock_timestamp() where id in (select \'active\'||n from generate_series(1,7)n)');
    await client.query("insert into session(id,user_id,token,expires_at,updated_at) values "+
      "('pending-session','pending1','PRIVATE_ACTIVE_TOKEN',now()+interval '1 day',now()),"+
      "('expired-session','retained1','PRIVATE_EXPIRED_TOKEN',now()-interval '1 day',now())");
    const s=await current.readCurrent();
    expect(users(s).values).toEqual({total:"136",created24h:"7",activeUsers:"73",deactivatedUsers:"63",retentionPendingUsers:"31"});
    expect(s.monitors.find(m=>m.key==="accounts.sessions")?.values).toEqual({active:"1",expiredRetained:"1"});
    expect((await profile.readTarget(query("retained1")))?.lifecycle).toMatchObject({status:"deactivated",retainAtLeastUntil:"2021-01-01T00:00:00.000Z"});
    expect(await events()).toEqual([]);expect(JSON.stringify(s)).not.toMatch(/PRIVATE_|private.invalid/);
  });
  it("retains v1 samples unchanged, respects their fresh gate, then writes version2/fingerprint and renders both original schemas",async()=>{
    const old=crypto.randomUUID();
    await client.query("insert into owner_monitor_observations(id,monitor_key,resource_scope,source,schema_version,quality,value,fingerprint) "+
      "values($1,'accounts.users','global','database',1,'measured','{\"total\":\"2\",\"created24h\":\"1\"}','legacy')",[old]);
    expect(users(await current.readCurrent()).values.activeUsers).toBe("3");
    expect((await client.query("select schema_version,value from owner_monitor_observations where monitor_key='accounts.users'")).rows)
      .toEqual([{schema_version:1,value:{total:"2",created24h:"1"}}]);
    await client.query("update owner_monitor_observations set observed_at=now()-interval '16 minutes' where id=$1",[old]);
    const [a,b]=await Promise.all([current.readCurrent(),current.readCurrent()]);
    expect(a.recording).toBe("available");expect(b.recording).toBe("available");
    const rows=(await client.query("select schema_version,value,fingerprint from owner_monitor_observations where monitor_key='accounts.users' order by position")).rows;
    expect(rows.map(r=>r.schema_version)).toEqual([1,2]);expect(rows[0].value).toEqual({total:"2",created24h:"1"});
    const canonical=Object.fromEntries(Object.entries(rows[1].value).sort(([a],[b])=>a.localeCompare(b)));
    const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(["accounts.users","global","database",2,"measured",canonical])));
    expect(rows[1].fingerprint).toBe([...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join(""));
    const entries=(await history.readTimeline({area:"accounts",monitorKey:"accounts.users"})).entries;
    expect(entries.find(e=>e.id===old)?.values).toEqual({total:"2",created24h:"1"});
    expect(entries[0].values).toEqual(users(a).values);
  });
  it("coverage includes the retained deactivation occurrence instead of pretending current row age is History",async()=>{
    const id=crypto.randomUUID();await retained(id,owner,target);
    const before=await events(), s=await current.readCurrent();
    expect(users(s).coverageFrom).toBe("2024-02-29T12:00:00.123Z");expect(await events()).toEqual(before);
    expect((await history.readTimeline({area:"accounts",monitorKey:"accounts.users"})).entries.some(e=>e.id===id)).toBe(true);
  });
  it("read surfaces use one safe allowlist, preserve attribution, and deduplicate overlapping person roles",async()=>{
    const id=crypto.randomUUID();await retained(id,target,target);
    const global=(await history.readTimeline()).entries, scoped=(await history.readTimeline({area:"accounts",monitorKey:"accounts.users"})).entries;
    const own=(await personHistory.readHistory(target)).entries;
    for(const entries of [global,scoped,own]){
      expect(entries).toHaveLength(1);expect(entries[0].id).toBe(id);
      expect(entries[0].values.actorUserId).toBe(target);expect(entries[0].values.targetUserId).toBe(target);
      expect(JSON.stringify(entries)).not.toMatch(/PRIVATE_|password|nested/);
    }
    expect(scoped[0].values).toEqual(own[0].values);
  });
  it("stable tied-time keysets retain all original IDs across global, scoped and attributable-person pages",async()=>{
    const ids=[];
    for(let n=0;n<61;n++){const id=crypto.randomUUID();ids.push(id);await retained(id,owner,"subject-"+n);}
    // Other source/kind/attribution rows must not enter the lifecycle projection.
    await retained(crypto.randomUUID(),other,other,undefined,"auth");
    await retained(crypto.randomUUID(),other,other,undefined,"account","account.future");
    const read=()=>history.readTimeline({area:"accounts",monitorKey:"accounts.users"});
    const first=await read();expect(first.entries).toHaveLength(25);expect(first.next).toBeTruthy();
    const c=parseOwnerHistoryCursor(first.next!,{area:"accounts",monitorKey:"accounts.users"})!;
    expect(c.origin).toBe("account-event");expect(c.at).toBe("2024-02-29T12:00:00.123000Z");
    const global=await allPages(before=>history.readTimeline({before}));
    const scoped=await allPages(before=>history.readTimeline({area:"accounts",monitorKey:"accounts.users",before}));
    const actor=await allPages(before=>personHistory.readHistory(owner,before));
    const expected=ids.sort().reverse();
    for(const entries of [global,scoped,actor])expect(entries.map(e=>e.id)).toEqual(expected);
    expect((await personHistory.readHistory("subject-30")).entries.map(e=>e.id)).toEqual([ids.find(id=>scoped.find(e=>e.id===id)?.values.targetUserId==="subject-30")]);
    expect(()=>parseOwnerHistoryCursor(first.next!,{area:"security"})).toThrow();
    const person=(await personHistory.readHistory(owner));expect(()=>parseOwnerUserHistoryCursor(person.next!,other)).toThrow();
    expect((await history.readTimeline({area:"system"})).entries).toEqual([]);
  });
  it("uses existing person indexes for the actual prepared History query among many unrelated retained rows",async()=>{
    await client.query("insert into owner_events(id,occurred_at,source,occurrence_key,kind,monitor_key,"+
      "actor_user_id,target_user_id,entity_type,entity_id,payload) "+
      "select gen_random_uuid(),now(),'account','index-fixture-'||n,'account.deactivated','accounts.users',"+
      "'unrelated-actor-'||n,'unrelated-subject-'||n,'user','unrelated-subject-'||n,'{}'::jsonb "+
      "from generate_series(1,12000)n");
    for(let n=0;n<40;n++)await retained(crypto.randomUUID(),owner,"index-subject-"+n);
    await client.query("analyze owner_events");
    for(const id of [owner,"index-subject-19"]){
      let captured:{sql:string;values:unknown[]}|undefined;
      // SA06 adds an explicit coverage query after the timeline. EXPLAIN must
      // still inspect the actual chronological statement, not that metadata.
      const traced={query:(async(sql:string,values:unknown[])=>{if(sql.startsWith("with candidates as"))captured={sql,values};return pool.query(sql,values);}) as Pool["query"]};
      const page=await new PostgresOwnerUserHistory(traced).readHistory(id);
      expect(page.entries).toHaveLength(id===owner?25:1);
      const result=await client.query("explain (analyze,buffers,format json) "+captured!.sql,captured!.values);
      const nodes:Record<string,unknown>[]=[];
      function walk(n:Record<string,unknown>){nodes.push(n);for(const child of n.Plans as Record<string,unknown>[]??[])walk(child);}
      walk(result.rows[0]["QUERY PLAN"][0].Plan);
      const eventReads=nodes.filter(n=>n["Relation Name"]==="owner_events");
      expect(eventReads.length).toBeGreaterThan(0);
      expect(eventReads.some(n=>n["Node Type"]==="Seq Scan")).toBe(false);
      expect(nodes.some(n=>/^owner_events_(actor|target)(_occurred)?_idx$/.test(String(n["Index Name"])))).toBe(true);
      expect(page.entries.every(e=>e.values.actorUserId===id||e.values.targetUserId===id)).toBe(true);
    }
  });
  it.each(["partial","infinite"] as const)("rejects %s persisted tuples in counts/shared profile parsing without false samples",async mode=>{
    await client.query('alter table "user" drop constraint user_deactivation_state_check');
    try{
      if(mode==="partial")await client.query('update "user" set deactivated_by_user_id=$2 where id=$1',[target,owner]);
      else await client.query('update "user" set deactivated_at=\'infinity\',retain_at_least_until=\'infinity\',deactivated_by_user_id=$2 where id=$1',[target,owner]);
      await expect(profile.readTarget(query())).rejects.toBeInstanceOf(AccountStateUnexpectedError);
      await expect(current.readCurrent()).rejects.toThrow("lifecycle counters invariant");
      expect((await client.query("select count(*)::int n from owner_monitor_observations")).rows[0].n).toBe(0);
    }finally{
      await client.query('update "user" set deactivated_at=null,retain_at_least_until=null,deactivated_by_user_id=null where id=$1',[target]);
      // Restore exactly the accepted lifecycle CHECK by PostgreSQL's own definition.
      const sql=await readFile("drizzle/0065_sa04_account_state_foundation.sql","utf8");
      await client.query(sql.slice(sql.indexOf('ALTER TABLE "user" ADD CONSTRAINT')));
    }
  });
});
