import { readdir, readFile } from "node:fs/promises";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PostgresOwnerSa02Current } from "../../db/owner-sa02-current";
import { PostgresAttemptTelemetryWriter } from "../../db/owner-attempt-telemetry";

const url=process.env.DATABASE_URL!;
if(!url || !["127.0.0.1","localhost"].includes(new URL(url).hostname) ||
  !new URL(url).pathname.endsWith("_test")) throw new Error("SA02 current test requires disposable loopback *_test DB");
const schema="sa02_current_state_test";
const client=new Client({connectionString:url,options:"-c search_path="+schema});
const pool=new Pool({connectionString:url,options:"-c search_path="+schema});
const reader=new PostgresOwnerSa02Current(pool);
const writer=new PostgresAttemptTelemetryWriter(pool);
const get=(items:Awaited<ReturnType<typeof reader.readCurrent>>, key:string) => {
  const found=items.monitors.find(item=>item.key===key);
  if(!found) throw new Error("Missing monitor "+key);
  return found;
};
async function person(id:string,old=false){
  await client.query('insert into "user" (id,name,email,created_at) values ($1,$2,$3,'+
    (old?"clock_timestamp()-interval '2 days'":"clock_timestamp()")+')',
    [id,"Synthetic name "+id,id+"@example.test"]);
}
async function method(id:string,owner:string,provider:string,secret:string|null){
  await client.query("insert into account(id,user_id,account_id,provider_id,password,updated_at) "+
    "values ($1,$2,$3,$4,$5,clock_timestamp())",[id,owner,id,provider,secret]);
}
async function activeSessions(){
  await client.query("insert into session(id,user_id,token,expires_at,updated_at) values "+
    "('active-1','sa02-a','private-active-token',clock_timestamp()+interval '2 days',clock_timestamp()),"+
    "('old-1','sa02-b','private-expired-token',clock_timestamp()-interval '2 hours',clock_timestamp()),"+
    "('old-2','sa02-c','private-expired-token-2',clock_timestamp()-interval '2 days',clock_timestamp())");
}
async function evidence(id:string,old=false){
  await client.query("insert into forum_attachment_security_events "+
    "(id,upload_id,uploaded_by_user_id,context_key,draft_id,file_name,declared_mime,"+
    "detected_type,reason,declared_byte_size,created_at) "+
    "values($1,$2,'sa02-a','synthetic-context','draft','private-filename.txt',"+
    "'text/plain','unknown','invalid',10,"+
    (old?"clock_timestamp()-interval '2 days'":"clock_timestamp()")+')',[id,"upload-"+id]);
}
beforeAll(async()=>{
  await client.connect();
  await client.query("drop schema if exists "+schema+" cascade;create schema "+schema);
  for(const file of (await readdir("drizzle")).filter(f=>/^\d{4}_.+\.sql$/.test(f)).sort()){
    await client.query((await readFile("drizzle/"+file,"utf8")).replaceAll('"public".','"'+schema+'".'));
  }
});
beforeEach(async()=>{
  await client.query('truncate "user",account,session,verification,rate_limit,'+
    'forum_attachment_security_events,owner_attempt_patterns,owner_attempt_telemetry_state,'+
    'owner_monitor_observations,owner_events cascade');
  await client.query("update forum_registration_settings set "+
    "google_registration_enabled=true,email_registration_enabled=true,version=1 where id=1");
});
afterAll(async()=>{
  await pool.end();
  await client.query("drop schema if exists "+schema+" cascade");
  await client.end();
});

describe("SA02 snapshot-consistent Owner current-state native sources",()=>{
  it("counts all users, distinct actual credential/Google methods, active/expired sessions and native evidence",async()=>{
    for(const id of ["sa02-a","sa02-b","sa02-c","sa02-d"]) await person(id,id==="sa02-c");
    await method("password-a","sa02-a","credential","hashed-not-plaintext");
    await method("password-a-extra","sa02-a","credential","hashed-again");
    await method("google-a","sa02-a","google",null);
    await method("google-a-extra","sa02-a","google",null);
    await method("google-b","sa02-b","google",null);
    await method("empty-c","sa02-c","credential",null);
    await method("password-d","sa02-d","credential","hash-d");
    await activeSessions();
    await evidence("event-new");
    await evidence("event-old",true);
    await client.query("update forum_registration_settings set "+
      "google_registration_enabled=false,email_registration_enabled=false,version=5 where id=1");

    const result=await reader.readCurrent();
    expect(result.monitors.map(m=>m.key)).toEqual([
      "accounts.users","accounts.methods","accounts.sessions","accounts.registration",
      "security.auth","security.access","security.attachments",
    ]);
    expect(result.recording).toBe("available");
    expect(get(result,"accounts.users").values).toEqual({total:"4",created24h:"3"});
    expect(get(result,"accounts.methods").values).toEqual({
      passwordUsers:"2",googleUsers:"2",bothUsers:"1",
    });
    expect(get(result,"accounts.sessions").values).toEqual({active:"1",expiredRetained:"2"});
    expect(get(result,"accounts.registration").values).toMatchObject({
      googleEnabled:false,emailEnabled:false,version:5,
    });
    expect(get(result,"security.attachments").values).toMatchObject({
      total:"2",evidence24h:"1",
    });
    expect(result.monitors.every(m=>m.coverageFrom && m.lastObservedAt)).toBe(true);
    const dto=JSON.stringify(result);
    for(const sensitive of ["@example.test","hashed-again","private-active-token",
      "private-filename.txt","synthetic-context"]) expect(dto).not.toContain(sensitive);
    const samples=await client.query<{monitor_key:string;value:object}>(
      "select monitor_key,value from owner_monitor_observations");
    expect(samples.rows).toHaveLength(7);
    expect(JSON.stringify(samples.rows)).not.toContain("private-active-token");
  });

  it("aggregates every retained attempt recording-hour, unknown/overflow/gaps, without page LIMIT",async()=>{
    await person("sa02-a");
    await client.query("insert into owner_attempt_patterns "+
      "(id,recording_epoch_start,pool,actor_user_id,network_ip,network_quality,"+
      "surface,operation,outcome,http_status,first_occurred_at,last_occurred_at,count) "+
      "select gen_random_uuid(),date_trunc('hour',now(),'UTC')-interval '1 hour',"+
      "'authenticated','actor-'||n::text,'198.51.100.20','trusted',"+
      "'auth','sign-in','rate-limited',429,now()-interval '1 hour',now(),2 "+
      "from generate_series(1,70) n");
    await writer.record({surface:"auth",operation:"sign-in",outcome:"denied",httpStatus:401,
      actorUserId:"sa02-a",networkIp:"2001:db8::20",networkQuality:"trusted",
      occurredAt:new Date()});
    await writer.record({surface:"access",operation:"owner-guard",outcome:"denied",httpStatus:403,
      networkIp:"198.51.100.8",networkQuality:"qualified",occurredAt:new Date()});
    await writer.recordGap({surface:"auth",occurredAt:new Date(),count:4});
    await client.query("insert into owner_attempt_telemetry_state "+
      "(recording_epoch_start,slot,first_occurred_at,last_occurred_at,count) "+
      "values(date_trunc('hour',now(),'UTC')-interval '1 hour','overflow.authenticated.auth',"+
      "now()-interval '1 hour',now(),9)");
    const first=await reader.readCurrent();
    expect(get(first,"security.auth").values).toMatchObject({
      attributedAttempts:"141",rateLimitedAttempts:"140",retainedPatterns:"71",
      unknownAttempts:"0",overflowAttempts:"9",gapAttempts:"4",
      currentHourAuthenticatedUsed:"1",currentHourAnonymousUsed:"1",hourlyCapacityPerPool:256,
    });
    expect(get(first,"security.access").values).toMatchObject({
      attributedAttempts:"1",retainedPatterns:"1",currentHourAnonymousUsed:"1",
    });
    await writer.record({surface:"auth",operation:"sign-in",outcome:"denied",httpStatus:401,
      actorUserId:"sa02-a",networkIp:"2001:db8::20",networkQuality:"trusted",
      occurredAt:new Date()});
    const second=await reader.readCurrent();
    expect(get(second,"security.auth").values.attributedAttempts).toBe("142");
    // Counter mutation does not generate a second durable sample within 15 minutes.
    expect((await client.query("select count(*)::int n from owner_monitor_observations "+
      "where monitor_key='security.auth'")).rows[0].n).toBe(1);
    expect(JSON.stringify(second)).not.toContain("2001:db8::20");
  });

  it("serializes 15-minute samples and resumes after the actual persisted interval",async()=>{
    const first=await reader.readCurrent();
    const second=await reader.readCurrent();
    expect(first.recording).toBe("available");
    expect(second.recording).toBe("available");
    expect((await client.query("select count(*)::int n from owner_monitor_observations")).rows[0].n).toBe(7);
    await client.query("update owner_monitor_observations set observed_at=now()-interval '16 minutes' "+
      "where monitor_key='accounts.users'");
    await person("sa02-later");
    const third=await reader.readCurrent();
    expect(get(third,"accounts.users").values.total).toBe("1");
    expect((await client.query("select count(*)::int n from owner_monitor_observations")).rows[0].n).toBe(8);
    expect((await client.query("select count(*)::int n from owner_monitor_observations "+
      "where monitor_key='accounts.users'")).rows[0].n).toBe(2);
    const [a,b]=await Promise.all([reader.readCurrent(),reader.readCurrent()]);
    expect(a.recording).toBe("available");
    expect(b.recording).toBe("available");
    expect((await client.query("select count(*)::int n from owner_monitor_observations")).rows[0].n).toBe(8);
  });

  it("keeps a real current read available if best-effort observation insertion fails",async()=>{
    await client.query("create function reject_sa02_observation() returns trigger language plpgsql as "+
      "$$ begin raise exception 'synthetic observation unavailable'; end; $$");
    await client.query("create trigger reject_sa02_observation before insert on owner_monitor_observations "+
      "for each row execute function reject_sa02_observation()");
    try{
      const read=await reader.readCurrent();
      expect(read.recording).toBe("unavailable");
      expect(get(read,"accounts.users").values.total).toBe("0");
      expect(read.monitors.every(m=>m.lastObservedAt===null)).toBe(true);
    }finally{
      await client.query("drop trigger reject_sa02_observation on owner_monitor_observations");
      await client.query("drop function reject_sa02_observation()");
    }
    const recovered=await reader.readCurrent();
    expect(recovered.recording).toBe("available");
    expect(recovered.monitors.every(m=>m.lastObservedAt!==null)).toBe(true);
  });

  it("fails closed on missing registration singleton without inventing closed/open values or samples",async()=>{
    await client.query("delete from forum_registration_settings where id=1");
    try{
      await expect(reader.readCurrent()).rejects.toThrow("registration settings invariant");
      expect((await client.query("select count(*)::int n from owner_monitor_observations")).rows[0].n).toBe(0);
    }finally{await client.query("insert into forum_registration_settings(id) values (1)");}
  });
});