import { readdir, readFile } from "node:fs/promises";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  betterAuthOptions, betterAuthSchema, createAuth, observeAuthNativeMutations,
  type AuthCreationObserver,
  type BetterAuthEnvironment,
} from "../../app/auth/auth.server";
import { PostgresAuthFactWriter, type AuthTransitionFact } from "../../db/owner-auth-facts";
import { AuthCreationEvidence } from "../../app/auth/auth-creation-evidence";

const url = process.env.DATABASE_URL!;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname) ||
    !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA02 OAuth tests require disposable loopback *_test DB");
}
const schema = "sa02_auth_oauth_rollback_test", origin = "http://localhost:3000";
const env: BetterAuthEnvironment = {
  BETTER_AUTH_URL: origin,
  BETTER_AUTH_SECRET: "sa02-native-oauth-rollback-local-secret-longer-than-32-chars",
  GOOGLE_CLIENT_ID: "synthetic-local-google",
  GOOGLE_CLIENT_SECRET: "synthetic-local-google-secret",
};
const client = new Client({connectionString:url,options:"-c search_path="+schema});
const pool = new Pool({connectionString:url,options:"-c search_path="+schema});
const database = drizzle(client), writer = new PostgresAuthFactWriter(pool);
const password = "native-oauth-password-123";
const events: AuthTransitionFact[] = [];
let identityEmail="", identitySub="", identityVerified=true, sequence=100;
const observer = (actor:string|null=null):AuthCreationObserver => ({
  capture: fact => {events.push(fact);},
  trustedActorFor: id => actor===id?id:null,
});
const post = (path:string, body:object, headers:Record<string,string>={})=>
  new Request(origin+"/api/auth/"+path,{
    method:"POST",headers:{
      Origin:origin,"Content-Type":"application/json",
      "cf-connecting-ip":"203.0.113."+String(sequence++%100+40),...headers,
    },body:JSON.stringify(body),
  });
const cookies=(response:Response)=>response.headers.getSetCookie().map(c=>c.split(";",1)[0]).join("; ");
const sessionCookie=(response:Response)=>response.headers.getSetCookie()
  .find(c=>c.includes("session_token="))?.split(";",1)[0];
async function countRows(){
  return (await client.query<{users:number;accounts:number;sessions:number;facts:number}>(
    "select (select count(*)::int from \"user\") users,"+
    "(select count(*)::int from account) accounts,"+
    "(select count(*)::int from session) sessions,"+
    "(select count(*)::int from owner_events where source='auth') facts"
  )).rows[0];
}
async function accounts(){
  return (await client.query<{id:string;user_id:string;provider_id:string}>(
    "select id,user_id,provider_id from account order by provider_id,id"
  )).rows;
}
async function authFactory(actor:string|null=null,transaction=false,config?:{
  withObserver?:boolean;
  onProfile?:()=>Promise<void>;
  observer?:AuthCreationObserver;
  onStateError?:(error:unknown)=>void;
}) {
  const sink=config?.withObserver===false?undefined:config?.observer??observer(actor);
  const proof=sink?new AuthCreationEvidence(database,
    fact=>sink.capture(fact),id=>sink.trustedActorFor(id),count=>sink.recordGap?.(count)):undefined;
  const base=createAuth(database,env,undefined,undefined,undefined,sink,undefined,proof,
    config?.onStateError);
  const auth=transaction ? betterAuth({
    ...betterAuthOptions(database,env),
    database:drizzleAdapter(database,{provider:"pg",schema:betterAuthSchema,transaction:true}),
    databaseHooks:(await base.$context).options.databaseHooks,
  }):base;
  const context=await auth.$context;
  const google=context.socialProviders.find(p=>p.id==="google");
  if(!google) throw new Error("Synthetic Google provider not registered");
  Object.assign(google,{
    validateAuthorizationCode:async()=>({accessToken:"synthetic-provider-access"}),
    getUserInfo:async()=>{
      await config?.onProfile?.();
      return {
      user:{email:identityEmail,emailVerified:identityVerified,name:"Synthetic Google"},
      data:{sub:identitySub,email:identityEmail,email_verified:identityVerified,
        name:"Synthetic Google",iss:"https://accounts.google.com",
        aud:env.GOOGLE_CLIENT_ID,azp:env.GOOGLE_CLIENT_ID,
        exp:2000000000,iat:1900000000,jti:"synthetic-jti"},
      };
    },
  });
  // Mirror the production request's after-operation proof flush, with the
  // genuine Better Auth handler and PostgreSQL adapter unchanged.
  return new Proxy(auth,{
    get(target,property,receiver){
      if(property!=="handler") return Reflect.get(target,property,receiver);
      return async (request:Request)=>{
        const restore=observeAuthNativeMutations(client,proof);
        try{return await auth.handler(request);}
        finally{
          restore();
          // Match createHyperdriveAuthRuntime's best-effort proof flush:
          // telemetry failures cannot override an already committed auth outcome.
          try{await proof?.flush();}catch{/* best effort */}
        }
      };
    },
  });
}
async function initiate(auth:Awaited<ReturnType<typeof authFactory>>,
  path:"sign-in/social"|"link-social",headers:Record<string,string>={}) {
  const response=await auth.handler(post(path,{
    provider:"google",callbackURL:"/en",
    errorCallbackURL:"/en/sign-up?returnTo=%2Fen",
  },headers));
  expect(response.status).toBe(200);
  const body=await response.json() as {url:string};
  const state=new URL(body.url).searchParams.get("state");
  expect(state).toBeTruthy();
  return {state:state!,cookies:cookies(response)};
}
async function callback(auth:Awaited<ReturnType<typeof authFactory>>,
  state:string,cookie:string) {
  return auth.handler(new Request(origin+"/api/auth/callback/google?code=synthetic-code&state="+
    encodeURIComponent(state),{headers:{Cookie:cookie}}));
}
async function registerEmail(email:string) {
  const response=await (await authFactory()).handler(post("sign-up/email",{
    name:"Local member",email,password,
  }));
  expect(response.status).toBe(200);
  const cookie=sessionCookie(response);
  expect(cookie).toBeTruthy();
  const result=await response.json() as {user:{id:string}};
  return {userId:result.user.id,cookie:cookie!};
}
async function persistFacts() {
  for(const fact of events) {
    const saved=await writer.append(fact);
    expect(saved.inserted).toBe(true);
    expect((await writer.append(fact)).inserted).toBe(false);
  }
}
async function rejectAccountInsert(provider:"google"|"credential") {
  const name="sa02_reject_"+provider;
  await client.query("create function "+name+"() returns trigger language plpgsql as $$ "+
    "begin raise exception 'injected account insert failure'; end; $$");
  await client.query("create trigger "+name+" before insert on account for each row "+
    "when (new.provider_id='"+provider+"') execute function "+name+"()");
  return async()=>{await client.query("drop trigger "+name+" on account");
    await client.query("drop function "+name+"()");};
}
beforeAll(async()=>{
  await client.connect();
  await client.query("drop schema if exists "+schema+" cascade; create schema "+schema);
  for(const file of (await readdir("drizzle")).filter(n=>/^\d{4}_.+\.sql$/.test(n)).sort()){
    await client.query((await readFile("drizzle/"+file,"utf8"))
      .replaceAll('"public".','"'+schema+'".'));
  }
});
beforeEach(async()=>{
  await client.query('truncate "user",account,session,verification,rate_limit,owner_events cascade');
  await client.query("update forum_registration_settings set "+
    "google_registration_enabled=true,email_registration_enabled=true where id=1");
  events.length=0;identityEmail="";identitySub="";identityVerified=true;
});
afterAll(async()=>{
  await pool.end();
  await client.query("drop schema if exists "+schema+" cascade");
  await client.end();
});

describe("SA02 native Better Auth v1.7.7 OAuth, partial commit and rollback facts",()=>{
  it("proves signed Google callback account/session creation; returning login only creates a session",async()=>{
    identityEmail="sa02-oauth-first@example.test";identitySub="google-first";
    const start=await initiate(await authFactory(),"sign-in/social");
    expect(events).toEqual([]);
    expect(await countRows()).toEqual({users:0,accounts:0,sessions:0,facts:0});
    const response=await callback(await authFactory(),start.state,start.cookies);
    expect(response.status).toBe(302);
    expect(new URL(response.headers.get("Location")!,origin).pathname).toBe("/en");
    expect(sessionCookie(response)).toBeTruthy();
    expect(events.map(f=>f.kind)).toEqual(["account.created","auth.methodLinked","auth.sessionCreated"]);
    const [linked]=await accounts();
    expect(linked.provider_id).toBe("google");
    expect(events[0]).toMatchObject({kind:"account.created",userId:linked.user_id});
    expect(events[1]).toMatchObject({kind:"auth.methodLinked",userId:linked.user_id,
      accountId:linked.id,method:"google",linkContext:"registration",actorUserId:null});
    await persistFacts();
    const saved=(await client.query<{kind:string;payload:Record<string,string>}>(
      "select kind,payload from owner_events where source='auth' order by position")).rows;
    expect(saved.map(f=>f.kind)).toEqual(events.map(f=>f.kind));
    expect(JSON.stringify(saved)).not.toContain(identityEmail);
    expect(JSON.stringify(saved)).not.toContain("synthetic-provider-access");
    events.length=0;
    const repeat=await initiate(await authFactory(),"sign-in/social");
    expect((await callback(await authFactory(),repeat.state,repeat.cookies)).status).toBe(302);
    expect(events.map(f=>f.kind)).toEqual(["auth.sessionCreated"]);
    expect((await accounts()).length).toBe(1);
    expect((await countRows()).sessions).toBe(2);
  });

  it("SA04-I3 gates returning Google callbacks before session persistence, preserving SA02 facts",async()=>{
    identityEmail="sa04-i3-oauth-returning@example.test";identitySub="sa04-i3-google";
    const first=await initiate(await authFactory(),"sign-in/social");
    const enrolled=await callback(await authFactory(),first.state,first.cookies);
    expect(enrolled.status).toBe(302);
    expect(sessionCookie(enrolled)).toBeTruthy();
    const linked=(await accounts()).find(row=>row.provider_id==="google");
    expect(linked).toBeDefined();
    const userId=linked!.user_id;
    expect(events.map(e=>e.kind)).toEqual(["account.created","auth.methodLinked","auth.sessionCreated"]);
    events.length=0;

    const before=(await client.query<{id:string;token:string}>(
      'select id,token from session where user_id=$1 order by id',[userId])).rows;
    expect(before).toHaveLength(1);
    await client.query(`update "user" set deactivated_at='2026-11-12T00:00:00Z',
      deactivated_by_user_id=$1, retain_at_least_until='2027-11-13T00:00:00Z'
      where id=$1`,[userId]);
    const blockedStart=await initiate(await authFactory(),"sign-in/social");
    const blocked=await callback(await authFactory(),blockedStart.state,blockedStart.cookies);
    // A session-create admission APIError is returned directly by this
    // Better Auth 1.7.7 callback path rather than a synthetic redirect.
    expect(blocked.status).toBe(401);
    expect(sessionCookie(blocked)).toBeFalsy();
    expect((await client.query<{id:string;token:string}>(
      'select id,token from session where user_id=$1 order by id',[userId])).rows).toEqual(before);
    expect(events).toEqual([]);
    expect((await accounts()).filter(row=>row.provider_id==="google"))
      .toEqual([linked]);

    await client.query(`update "user" set deactivated_at=null,
      deactivated_by_user_id=null, retain_at_least_until=null where id=$1`,[userId]);
    const restored=await initiate(await authFactory(),"sign-in/social");
    const accepted=await callback(await authFactory(),restored.state,restored.cookies);
    expect(accepted.status).toBe(302);
    expect(sessionCookie(accepted)).toBeTruthy();
    expect(events).toEqual([expect.objectContaining({
      kind:"auth.sessionCreated",userId,
    })]);
    expect((await client.query<{total:number}>(
      'select count(*)::int total from session where user_id=$1',[userId])).rows[0]?.total).toBe(2);
  });

  it("proves explicit verified Google link from current account, not OAuth initiation or repeated link",async()=>{
    const local=await registerEmail("sa02-oauth-link@example.test");
    events.length=0;
    identityEmail="sa02-oauth-link@example.test";identitySub="google-linked";
    const state=await initiate(await authFactory(local.userId),"link-social",
      {Cookie:local.cookie,"x-vico-link-user":local.userId});
    expect(events).toEqual([]);
    const response=await callback(await authFactory(local.userId),state.state,
      [local.cookie,state.cookies].filter(Boolean).join("; "));
    expect(response.status).toBe(302);
    const google=(await accounts()).find(a=>a.provider_id==="google");
    expect(google?.user_id).toBe(local.userId);
    expect(events).toEqual([{kind:"auth.methodLinked",userId:local.userId,
      accountId:google!.id,method:"google",linkContext:"explicit-link",actorUserId:local.userId}]);
    events.length=0;
    const repeat=await initiate(await authFactory(local.userId),"link-social",
      {Cookie:local.cookie,"x-vico-link-user":local.userId});
    expect((await callback(await authFactory(local.userId),repeat.state,
      [local.cookie,repeat.cookies].filter(Boolean).join("; "))).status).toBe(302);
    expect(events).toEqual([]);
    expect(await countRows()).toMatchObject({users:1,accounts:2});
  });

  it("denied new Google callback and unverified explicit link never manufacture facts",async()=>{
    identityEmail="sa02-oauth-denied@example.test";identitySub="google-denied";
    const state=await initiate(await authFactory(),"sign-in/social");
    await client.query("update forum_registration_settings set google_registration_enabled=false where id=1");
    const denied=await callback(await authFactory(),state.state,state.cookies);
    expect(denied.status).toBe(302);
    expect(new URL(denied.headers.get("Location")!,origin).searchParams.get("error"))
      .toBe("vico_google_registration_closed");
    expect(events).toEqual([]);
    expect(await countRows()).toEqual({users:0,accounts:0,sessions:0,facts:0});

    await client.query("update forum_registration_settings set google_registration_enabled=true where id=1");
    const local=await registerEmail("sa02-oauth-denied-link@example.test");
    events.length=0;
    identityEmail="sa02-oauth-denied-link@example.test";identitySub="google-unverified";
    identityVerified=false;
    const initiated=await initiate(await authFactory(local.userId),"link-social",
      {Cookie:local.cookie,"x-vico-link-user":local.userId});
    const failed=await callback(await authFactory(local.userId),initiated.state,
      [local.cookie,initiated.cookies].filter(Boolean).join("; "));
    expect(failed.status).toBe(302);
    expect(events).toEqual([]);
    expect((await accounts()).map(a=>a.provider_id)).toEqual(["credential"]);
  });

  it("when credential account insert fails after real email user commit, retains user fact only",async()=>{
    const cleanup=await rejectAccountInsert("credential");
    try{
      const outcome=await (await authFactory()).handler(post("sign-up/email",{
        email:"sa02-partial-email@example.test",name:"Partial",password,
      }));
      expect(outcome.ok).toBe(false);
      expect(await countRows()).toMatchObject({users:1,accounts:0,sessions:0});
      expect(events.map(f=>f.kind)).toEqual(["account.created"]);
      await persistFacts();
      expect((await countRows()).facts).toBe(1);
    }finally{await cleanup();}
  });

  it("default nontransactional OAuth account insert failure retains the real committed user only",async()=>{
    identityEmail="sa02-partial-google@example.test";identitySub="google-partial";
    const start=await initiate(await authFactory(),"sign-in/social");
    const cleanup=await rejectAccountInsert("google");
    try{
      const response=await callback(await authFactory(),start.state,start.cookies);
      expect(response.status).toBe(302);
      // The installed production Drizzle adapter has transaction:false.
      // Only facts for genuine persisted transitions are truthful.
      expect(await countRows()).toMatchObject({users:1,accounts:0,sessions:0});
      expect(events.map(f=>f.kind)).toEqual(["account.created"]);
    }finally{await cleanup();}
  });

  it("transaction-enabled native PostgreSQL rollback emits zero queued hooks; later commit emits all",async()=>{
    identityEmail="sa02-transaction-google@example.test";identitySub="google-transaction";
    const state=await initiate(await authFactory(),"sign-in/social");
    const cleanup=await rejectAccountInsert("google");
    try{
      // Test-only transaction:true exercises real Better Auth post-commit
      // callbacks. Production retains its verified transaction:false setting.
      const failed=await callback(await authFactory(null,true),state.state,state.cookies);
      expect(failed.status).toBe(302);
      expect(await countRows()).toEqual({users:0,accounts:0,sessions:0,facts:0});
      expect(events).toEqual([]);
    }finally{await cleanup();}
    const recovered=await initiate(await authFactory(),"sign-in/social");
    expect((await callback(await authFactory(null,true),recovered.state,recovered.cookies)).status).toBe(302);
    expect(events.map(f=>f.kind)).toEqual(["account.created","auth.methodLinked","auth.sessionCreated"]);
    expect(await countRows()).toMatchObject({users:1,accounts:1,sessions:1});
  });
});

const inactiveI5c = `update "user" set deactivated_at='2026-11-12T00:00:00Z',
  deactivated_by_user_id=$1, retain_at_least_until='2027-11-13T00:00:00Z' where id=$1`;

async function i5cPersistedRows(userId:string) {
  const linked=(await client.query<{
    id:string;provider_id:string;access_token:string|null;refresh_token:string|null;updated_at:Date;
  }>("select id,provider_id,access_token,refresh_token,updated_at from account where user_id=$1 order by id",
    [userId])).rows;
  const sessions=(await client.query<{id:string;token:string;expires_at:Date}>(
    "select id,token,expires_at from session where user_id=$1 order by id",[userId])).rows;
  const user=(await client.query<{id:string;name:string;email_verified:boolean}>(
    'select id,name,email_verified from "user" where id=$1',[userId])).rows;
  return {linked,sessions,user};
}

describe("SA04-I5c Better Auth Google callback lifecycle and exact-fact composition",()=>{
  it.each([
    {kind:"returning",withObserver:true},
    {kind:"returning",withObserver:false},
    {kind:"link",withObserver:true},
    {kind:"link",withObserver:false},
  ] as const)("holds $kind callback at provider seam; inactive final owner cannot mutate (observer=$withObserver)",
    async({kind,withObserver})=>{
      const email=`i5c-${kind}-${withObserver}@example.test`;
      const local=kind==="returning"?null:await registerEmail(email);
      identityEmail=email;identitySub=`i5c-${kind}-${withObserver}`;
      let ownerId:string;
      if(kind==="returning"){
        const initial=await initiate(await authFactory(),"sign-in/social");
        const enrolled=await callback(await authFactory(),initial.state,initial.cookies);
        expect(enrolled.status).toBe(302);
        ownerId=(await accounts()).find(a=>a.provider_id==="google")!.user_id;
      }else ownerId=local!.userId;

      events.length=0;
      const start=kind==="returning"
        ? await initiate(await authFactory(),"sign-in/social")
        : await initiate(await authFactory(ownerId),"link-social",{
          Cookie:local!.cookie,"x-vico-link-user":ownerId,
        });
      const before=await i5cPersistedRows(ownerId);
      const counts=await countRows();
      let release!:()=>void;
      let entered!:()=>void;
      const reached=new Promise<void>(resolve=>{entered=resolve;});
      const proceed=new Promise<void>(resolve=>{release=resolve;});
      const auth=await authFactory(ownerId,false,{
        withObserver,onProfile:async()=>{entered();await proceed;},
      });
      const request=callback(auth,start.state,
        [local?.cookie,start.cookies].filter(Boolean).join("; "));
      try{
        await reached;
        // The signed OAuth state is valid and provider exchange reached getUserInfo;
        // the independent persisted lifecycle change wins before BA's final write.
        await client.query(inactiveI5c,[ownerId]);
      }finally{release();}
      const denied=await request;
      expect([401,302,403]).toContain(denied.status);
      expect(sessionCookie(denied)).toBeFalsy();
      expect(await i5cPersistedRows(ownerId)).toEqual(before);
      expect(await countRows()).toEqual(counts);
      expect(events).toEqual([]);
      expect((await client.query<{deactivated_at:Date}>(
        'select deactivated_at from "user" where id=$1',[ownerId])).rows[0]?.deactivated_at)
        .toBeInstanceOf(Date);
    },30000);

  it("observer capture and gap failures cannot veto a genuine Google commit",async()=>{
    identityEmail="i5c-observer-fail@example.test";identitySub="i5c-observer-fail";
    const broken:AuthCreationObserver={
      capture:()=>{throw new Error("I5C_PRIVATE_OBSERVER_FAILURE");},
      trustedActorFor:()=>{throw new Error("I5C_PRIVATE_ACTOR_FAILURE");},
      recordGap:()=>{throw new Error("I5C_PRIVATE_GAP_FAILURE");},
    };
    const start=await initiate(await authFactory(),"sign-in/social");
    const enrolled=await callback(await authFactory(null,false,{observer:broken}),
      start.state,start.cookies);
    expect(enrolled.status).toBe(302);
    expect(sessionCookie(enrolled)).toBeTruthy();
    expect(await countRows()).toMatchObject({users:1,accounts:1,sessions:1,facts:0});
    expect(events).toEqual([]);
    const repeat=await initiate(await authFactory(),"sign-in/social");
    const returning=await callback(await authFactory(null,false,{observer:broken}),
      repeat.state,repeat.cookies);
    expect(returning.status).toBe(302);
    expect(sessionCookie(returning)).toBeTruthy();
    expect(await countRows()).toMatchObject({users:1,accounts:1,sessions:2,facts:0});
    expect(events).toEqual([]);
  },30000);
});
