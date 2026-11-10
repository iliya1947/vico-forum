import { readdir, readFile } from "node:fs/promises";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createHyperdriveAuthRuntime, type AuthCreationObserver, type BetterAuthEnvironment,
} from "../../app/auth/auth.server";
import { MAX_AUTH_FACTS_PER_REQUEST, PostgresAuthFactWriter, type AuthTransitionFact } from "../../db/owner-auth-facts";
import { RequestAuthFactCollector } from "../../app/observability/auth-fact-collector.server";

const url = process.env.DATABASE_URL!;
if (!url || !["127.0.0.1","localhost"].includes(new URL(url).hostname) ||
    !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA02 native session deletion tests require disposable loopback *_test DB");
}
const schema = "sa02_auth_session_delete_test";
const origin = "http://localhost:3000";
const env: BetterAuthEnvironment = {
  BETTER_AUTH_URL: origin,
  BETTER_AUTH_SECRET: "sa02-native-session-deletion-local-secret-over-32-chars",
  GOOGLE_CLIENT_ID: "synthetic-local-google",
  GOOGLE_CLIENT_SECRET: "synthetic-local-google-secret",
};
const password = "native-session-password-123";
const admin = new Client({connectionString:url,options:"-c search_path="+schema});
const pool = new Pool({connectionString:url,options:"-c search_path="+schema});
const connected = (cs:string) => new Client({connectionString:cs,options:"-c search_path="+schema});
const writer = new PostgresAuthFactWriter(pool);
const events: AuthTransitionFact[] = [];
const gaps: number[] = [];
const observer: AuthCreationObserver = {
  capture: fact => { events.push(fact); },
  trustedActorFor: () => null,
  recordGap: count => { gaps.push(count); },
};
const auth = createHyperdriveAuthRuntime(url,env,connected,undefined,observer);
const request = (path:string, body:object, cookie?:string, ip="203.0.113.10") =>
  new Request(origin+"/api/auth/"+path, {
    method:"POST",
    headers:{
      "Content-Type":"application/json",Origin:origin,"cf-connecting-ip":ip,
      ...(cookie ? {Cookie:cookie}:{})
    },
    body:JSON.stringify(body),
  });
async function sessionCookie(response:Response):Promise<string> {
  expect(response.status).toBe(200);
  const cookie=response.headers.getSetCookie()
    .find(value=>value.includes("session_token="))?.split(";",1)[0];
  expect(cookie).toBeTruthy();
  return cookie!;
}
async function login(email:string, ip:string) {
  const cookie=await sessionCookie(await auth.handle(request("sign-in/email",{email,password},undefined,ip)));
  const resolved=(await auth.getSession(new Headers({Cookie:cookie}))).session;
  expect(resolved).not.toBeNull();
  return {cookie,userId:resolved!.user.id,sessionId:resolved!.session.id};
}
async function register(email:string,ip:string) {
  const cookie=await sessionCookie(await auth.handle(request("sign-up/email",{
    email,name:"Session proof actor",password,
  },undefined,ip)));
  const resolved=(await auth.getSession(new Headers({Cookie:cookie}))).session;
  expect(resolved).not.toBeNull();
  return {cookie,userId:resolved!.user.id,sessionId:resolved!.session.id};
}
async function exists(id:string) {
  return (await admin.query("select id from session where id=$1",[id])).rowCount===1;
}
async function sessionToken(id:string) {
  const res=await admin.query<{token:string}>("select token from session where id=$1",[id]);
  expect(res.rows[0]).toBeDefined();
  return res.rows[0].token;
}
const deletions=()=>events.filter((x):x is Extract<AuthTransitionFact,{kind:"auth.sessionDeleted"}> =>
  x.kind==="auth.sessionDeleted");

beforeAll(async()=>{
  await admin.connect();
  await admin.query("drop schema if exists "+schema+" cascade; create schema "+schema);
  for(const file of (await readdir("drizzle")).filter(n=>/^\d{4}_.+\.sql$/.test(n)).sort()){
    await admin.query((await readFile("drizzle/"+file,"utf8"))
      .replaceAll('"public".','"'+schema+'".'));
  }
});
beforeEach(async()=>{
  await admin.query("truncate rate_limit");
  events.length=0; gaps.length=0;
});
afterAll(async()=>{
  await pool.end();
  await admin.query("drop schema if exists "+schema+" cascade");
  await admin.end();
});

describe("SA02 native Better Auth 1.7.7 committed session deletion receipts",()=>{
  it("records only an actually removed own other session through SET05 revoke-one",async()=>{
    const email="sa02-session-single@example.test";
    const first=await register(email,"203.0.113.11");
    const other=await login(email,"203.0.113.12");
    const foreign=await register("sa02-session-foreign@example.test","203.0.113.13");
    events.length=0;
    const headers=new Headers({Cookie:first.cookie});
    const identity={userId:first.userId,sessionId:first.sessionId};
    await expect(auth.security!.revokeOneOther(headers,identity,foreign.sessionId))
      .rejects.toMatchObject({code:"session-not-found"});
    await expect(auth.security!.revokeOneOther(headers,identity,first.sessionId))
      .rejects.toMatchObject({code:"current-session"});
    expect(deletions()).toHaveLength(0);
    await auth.security!.revokeOneOther(headers,identity,other.sessionId);
    expect(await exists(other.sessionId)).toBe(false);
    expect((await auth.getSession(new Headers({Cookie:other.cookie}))).session).toBeNull();
    expect(await exists(first.sessionId)).toBe(true);
    expect(await exists(foreign.sessionId)).toBe(true);
    expect(deletions()).toEqual([{
      kind:"auth.sessionDeleted",userId:first.userId,sessionId:other.sessionId,
      reason:"revoke-one",actorUserId:first.userId,
    }]);
    await expect(auth.security!.revokeOneOther(headers,identity,other.sessionId))
      .rejects.toMatchObject({code:"session-not-found"});
    expect(deletions()).toHaveLength(1);
    const persisted=await writer.append(deletions()[0]);
    expect(persisted.inserted).toBe(true);
    expect((await writer.append(deletions()[0])).inserted).toBe(false);
    const stored=await admin.query<{entity_id:string;payload:{reason:string};actor_user_id:string}>(
      "select entity_id,payload,actor_user_id from owner_events where id=$1",[persisted.id]);
    expect(stored.rows).toEqual([{
      entity_id:other.sessionId,payload:{reason:"revoke-one"},actor_user_id:first.userId,
    }]);
    expect(JSON.stringify(stored.rows)).not.toContain(await sessionToken(first.sessionId));
  });

  it("records native revoke-other-sessions individually and preserves caller/foreign rows",async()=>{
    const email="sa02-session-others@example.test";
    const first=await register(email,"203.0.113.21");
    const a=await login(email,"203.0.113.22");
    const b=await login(email,"203.0.113.23");
    const foreign=await register("sa02-session-others-foreign@example.test","203.0.113.24");
    events.length=0;
    await auth.security!.revokeAllOthers(new Headers({Cookie:first.cookie}),
      {userId:first.userId,sessionId:first.sessionId});
    expect(deletions().map(x=>x.sessionId).sort()).toEqual([a.sessionId,b.sessionId].sort());
    expect(deletions().every(x=>x.reason==="revoke-others" && x.actorUserId===first.userId)).toBe(true);
    expect(await exists(first.sessionId)).toBe(true);
    expect(await exists(foreign.sessionId)).toBe(true);
    expect(await exists(a.sessionId)).toBe(false);
    expect(await exists(b.sessionId)).toBe(false);
    await auth.security!.revokeAllOthers(new Headers({Cookie:first.cookie}),
      {userId:first.userId,sessionId:first.sessionId});
    expect(deletions()).toHaveLength(2);
  });

  it("records real revoke-sessions deletion for current and other sessions",async()=>{
    const email="sa02-session-all@example.test";
    const first=await register(email,"203.0.113.31");
    const other=await login(email,"203.0.113.32");
    events.length=0;
    const result=await auth.handle(request("revoke-sessions",{},first.cookie,"203.0.113.33"));
    expect(result.status).toBe(200);
    expect(await exists(first.sessionId)).toBe(false);
    expect(await exists(other.sessionId)).toBe(false);
    expect(deletions().map(x=>x.sessionId).sort()).toEqual([first.sessionId,other.sessionId].sort());
    expect(deletions().every(x=>x.reason==="revoke-all" && x.actorUserId===first.userId)).toBe(true);
  });

  it("bounds real Better Auth revoke-all evidence, query chunks and persisted exact facts",async()=>{
    const actor=await register("sa02-large-bulk@example.test","203.0.113.71");
    const total=101;
    await admin.query("insert into session(id,user_id,token,expires_at,updated_at) "+
      "select 'bulk-'||n::text,$1,'bulk-private-'||n::text,"+
      "clock_timestamp()+interval '1 day',clock_timestamp() "+
      "from generate_series(1,$2) n",[actor.userId,total-1]);
    const gapsLarge:number[]=[];
    const proofWidths:number[]=[];
    const observedClient=(cs:string)=>{
      const next=connected(cs);
      const native=next.query;
      next.query=((...args:unknown[])=>{
        const sql=typeof args[0]==="string" ? args[0] :
          args[0] && typeof args[0]==="object" && "text" in args[0]
            ? String((args[0] as {text:unknown}).text) : "";
        if(sql.includes('from "session"') && sql.includes(" in (")){
          const values=Array.isArray(args[1])?args[1]:
            args[0] && typeof args[0]==="object" && "values" in args[0]
              ? (args[0] as {values?:unknown}).values : null;
          if(Array.isArray(values)) proofWidths.push(values.length);
        }
        return Reflect.apply(native,next,args);
      }) as typeof next.query;
      return next;
    };
    const collector=new RequestAuthFactCollector(()=>({
      append:(fact,at)=>writer.append(fact,at),
      close:async()=>undefined,
    }),count=>gapsLarge.push(count));
    const bounded=createHyperdriveAuthRuntime(url,env,observedClient,undefined,collector);
    const outcome=await bounded.handle(request("revoke-sessions",{},actor.cookie,"203.0.113.72"));
    expect(outcome.status).toBe(200);
    await collector.flush();
    const retained=await admin.query<{id:string;kind:string;entity_id:string;
      payload:{reason:string};occurred_at:Date;recorded_at:Date}>(
      "select id,kind,entity_id,payload,occurred_at,recorded_at "+
      "from owner_events where source='auth' and target_user_id=$1 "+
      "order by position",[actor.userId]);
    expect(retained.rows).toHaveLength(MAX_AUTH_FACTS_PER_REQUEST);
    expect(retained.rows.every(r=>r.kind==="auth.sessionDeleted" &&
      r.payload.reason==="revoke-all" && r.occurred_at<=r.recorded_at)).toBe(true);
    expect(new Set(retained.rows.map(r=>r.entity_id)).size).toBe(MAX_AUTH_FACTS_PER_REQUEST);
    expect(gapsLarge.reduce((a,b)=>a+b,0)).toBe(total-MAX_AUTH_FACTS_PER_REQUEST);
    expect(proofWidths.length).toBeGreaterThan(1);
    expect(proofWidths.every(length=>length<=8)).toBe(true);
    expect((await admin.query<{count:string}>("select count(*)::text count "+
      "from session where user_id=$1",[actor.userId])).rows[0].count).toBe("0");
  });

  it("observes signed-cookie signout, never its repeated successful no-op",async()=>{
    const actor=await register("sa02-session-signout@example.test","203.0.113.41");
    events.length=0;
    const first=await auth.handle(request("sign-out",{},actor.cookie,"203.0.113.42"));
    expect(first.status).toBe(200);
    expect(await exists(actor.sessionId)).toBe(false);
    expect(deletions()).toEqual([{
      kind:"auth.sessionDeleted",userId:actor.userId,sessionId:actor.sessionId,
      reason:"sign-out",actorUserId:actor.userId,
    }]);
    const repeat=await auth.handle(request("sign-out",{},actor.cookie,"203.0.113.43"));
    expect(repeat.status).toBe(200);
    expect(deletions()).toHaveLength(1);
  });

  it("excludes expired-session cleanup and simultaneous same-target losing DELETE",async()=>{
    const expired=await register("sa02-session-expired@example.test","203.0.113.51");
    await admin.query("update session set expires_at=now()-interval '60 seconds' where id=$1",
      [expired.sessionId]);
    events.length=0;
    expect((await auth.getSession(new Headers({Cookie:expired.cookie}))).session).toBeNull();
    expect(deletions()).toHaveLength(0);
    const email="sa02-session-race@example.test";
    const first=await register(email,"203.0.113.52");
    const target=await login(email,"203.0.113.53");
    const token=await sessionToken(target.sessionId);
    events.length=0;
    const concurrent=createHyperdriveAuthRuntime(url,env,connected,undefined,observer);
    const responses=await Promise.all([
      auth.handle(request("revoke-session",{token},first.cookie,"203.0.113.54")),
      concurrent.handle(request("revoke-session",{token},first.cookie,"203.0.113.55")),
    ]);
    expect(responses.every(x=>x.status===200)).toBe(true);
    expect(await exists(target.sessionId)).toBe(false);
    expect(deletions()).toHaveLength(1);
    expect(deletions()[0]).toMatchObject({
      sessionId:target.sessionId,userId:first.userId,reason:"revoke-one",
    });
  });

  it("does not infer success from signout 200 when actual database DELETE fails",async()=>{
    const actor=await register("sa02-session-failed@example.test","203.0.113.61");
    events.length=0;
    const brokenClient=(cs:string):Client => {
      const connection=connected(cs);
      const query=connection.query.bind(connection);
      return new Proxy(connection,{
        get(target,property,receiver) {
          if(property!=="query") {
            const value=Reflect.get(target,property,receiver);
            return typeof value==="function" ? value.bind(target):value;
          }
          return (...args:unknown[])=>{
            const text=typeof args[0]==="string" ? args[0] :
              args[0] && typeof args[0]==="object" && "text" in args[0]
                ? String((args[0] as {text:unknown}).text):"";
            if (/delete\s+from\s+["']?session["']?/i.test(text)) {
              throw new Error("simulated native session deletion failure");
            }
            return Reflect.apply(query,connection,args);
          };
        },
      });
    };
    const broken=createHyperdriveAuthRuntime(url,env,brokenClient,undefined,observer);
    const response=await broken.handle(request("sign-out",{},actor.cookie,"203.0.113.62"));
    expect(response.status).toBe(200);
    expect(await exists(actor.sessionId)).toBe(true);
    expect(deletions()).toHaveLength(0);
  });
});
