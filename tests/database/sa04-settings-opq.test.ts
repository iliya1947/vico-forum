import { readFile, readdir } from "node:fs/promises";
import { Client, type Pool, type PoolClient } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError, AccountMissingError, AccountStateUnexpectedError } from "../../db/account-state";
import { createHyperdriveUserLocale } from "../../db/hyperdrive-user-locale";
import { DrizzleUserPrivacyRepository } from "../../db/user-privacy";
import { PostgresRegistrationSettingsRepository } from "../../db/registration-settings";

const url=process.env.DATABASE_URL;
if(!url || !["127.0.0.1","localhost"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test"))throw new Error("Disposable local PostgreSQL *_test required");
const schema="sa04_settings_opq_test";
const options="-c search_path="+schema+" -c lock_timeout=8s";
const fixture=new Client({connectionString:url,options});
type Kind="locale"|"privacy-on"|"privacy-off"|"registration"|"registration-no-op";
const kinds:Kind[]=["locale","privacy-on","privacy-off","registration","registration-no-op"];
async function client(){const c=new Client({connectionString:url,options});await c.connect();return c;}
async function actor(){
  const id="opq-"+crypto.randomUUID();
  await fixture.query(`insert into "user"(id,name,email,locale) values($1,$1,$2,'en')`,[id,id+"@test.invalid"]);
  return id;
}
function pool(c:Client):Pool{
  return {query:c.query.bind(c),connect:async()=>({query:c.query.bind(c),release:()=>{}} as unknown as PoolClient)} as unknown as Pool;
}
function locale(c:Client){
  // Connection lifetime belongs to this test; the production writer/query is unchanged.
  return createHyperdriveUserLocale(url!,()=>({connect:async()=>{},query:c.query.bind(c),end:async()=>{}} as unknown as Client));
}
async function command(kind:Kind,id:string,c:Client){
  if(kind==="locale")return locale(c).save(id,"ru");
  if(kind.startsWith("privacy"))return new DrizzleUserPrivacyRepository(drizzle(c)).save(id,kind==="privacy-on");
  const r=new PostgresRegistrationSettingsRepository(pool(c)),current=await r.read();
  return r.update(id,id,{expectedVersion:current.version,
    googleRegistrationEnabled:kind==="registration-no-op"?current.googleRegistrationEnabled:!current.googleRegistrationEnabled,
    emailRegistrationEnabled:current.emailRegistrationEnabled});
}
async function deactivate(c:Client,id:string){
  await c.query(`update "user" set deactivated_at=clock_timestamp(),deactivated_by_user_id=$1,
    retain_at_least_until=now()+interval '2 years' where id=$1`,[id]);
}
async function facts(){
  return {
    accounts:(await fixture.query('select id,locale,updated_at from "user" order by id')).rows,
    preferences:(await fixture.query("select * from user_privacy_preferences order by user_id")).rows,
    presence:(await fixture.query("select * from forum_online_presence order by user_id")).rows,
    registration:(await fixture.query("select * from forum_registration_settings")).rows,
    history:(await fixture.query("select * from admin_history order by position")).rows,
  };
}
async function pid(c:Client){return (await c.query<{pid:number}>("select pg_backend_pid() as pid")).rows[0]!.pid;}
async function blocked(waiter:number,blocker:number){
  for(let n=0;n<200;n++){
    const r=await fixture.query<{pids:number[]}>("select pg_blocking_pids($1) as pids",[waiter]);
    if(r.rows[0]?.pids.includes(blocker))return;
    await new Promise(r=>setTimeout(r,15));
  }
  throw new Error("Expected actual PostgreSQL blocker was not observed");
}
function beforeCommit(c:Client){
  const original=c.query;
  let entered!:()=>void,resume!:()=>void,used=false;
  const observed=new Promise<void>(r=>{entered=r;}),released=new Promise<void>(r=>{resume=r;});
  c.query=((...args:unknown[])=>{
    const q=typeof args[0]==="string"?args[0]:args[0]&&typeof args[0]==="object"&&"text" in args[0]?String(args[0].text):"";
    if(!used && /^commit$/i.test(q.trim())){used=true;entered();return released.then(()=>Reflect.apply(original,c,args));}
    return Reflect.apply(original,c,args);
  }) as typeof c.query;
  return {observed,resume,restore:()=>{c.query=original;}};
}

beforeAll(async()=>{
  await fixture.connect();
  await fixture.query("drop schema if exists "+schema+" cascade;create schema "+schema);
  for(const file of (await readdir("drizzle")).filter(p=>/^\d{4}_.+\.sql$/.test(p)).sort()){
    await fixture.query((await readFile("drizzle/"+file,"utf8")).replaceAll('"public".','"'+schema+'".'));
  }
});
afterAll(async()=>{await fixture.query("drop schema if exists "+schema+" cascade");await fixture.end();});

describe("SA04 O/P/Q authoritative Settings lifecycle",()=>{
  it("active atomic locale/same-locale, ON/OFF/repeat and changed/no-op registration preserve native semantics",async()=>{
    const id=await actor();
    await fixture.query("insert into forum_online_presence(user_id) values($1)",[id]);
    await command("locale",id,fixture);await command("locale",id,fixture);
    expect((await fixture.query('select locale from "user" where id=$1',[id])).rows).toEqual([{locale:"ru"}]);
    await command("privacy-off",id,fixture);await command("privacy-off",id,fixture);
    expect((await fixture.query("select * from forum_online_presence where user_id=$1",[id])).rows).toEqual([]);
    await command("privacy-on",id,fixture);
    expect((await fixture.query("select * from forum_online_presence where user_id=$1",[id])).rows).toEqual([]);
    const before=await facts();await command("registration-no-op",id,fixture);
    expect(await facts()).toEqual(before);
    await command("registration",id,fixture);
    const after=await facts();expect(after.history.length).toBe(before.history.length+1);
    expect(after.registration[0].version).toBe(before.registration[0].version+1);
  });

  it.each(kinds)("inactive and missing %s cannot write/no-op, including retained privacy and stale presence",async kind=>{
    const id=await actor();
    await command("privacy-on",id,fixture);
    await fixture.query("insert into forum_online_presence(user_id) values($1)",[id]);
    await deactivate(fixture,id);const before=await facts();
    await expect(command(kind,id,fixture)).rejects.toBeInstanceOf(AccountInactiveError);
    await expect(command(kind,"opq-missing-"+crypto.randomUUID(),fixture)).rejects.toBeInstanceOf(AccountMissingError);
    expect(await facts()).toEqual(before);
  });

  it("an active locale account with an impossible zero-row UPDATE is an invariant failure, never saved",async()=>{
    const id=await actor(),before=await facts();
    await fixture.query("create function opq_skip_locale() returns trigger language plpgsql as $$begin return null;end $$");
    await fixture.query('create trigger opq_skip_locale before update on "user" for each row execute function opq_skip_locale()');
    try{
      await expect(locale(fixture).save(id,"he")).rejects.toBeInstanceOf(AccountStateUnexpectedError);
      expect(await facts()).toEqual(before);
    }finally{await fixture.query('drop trigger opq_skip_locale on "user";drop function opq_skip_locale()');}
  });

  it.each(kinds)("state-first %s waits on actual subject lock then denies with no durable effects",async kind=>{
    const id=await actor(),state=await client(),writer=await client();const before=await facts();
    let pending:Promise<unknown>|undefined;
    try{
      const s=await pid(state),w=await pid(writer);
      await state.query("begin");await deactivate(state,id);
      pending=command(kind,id,writer);void pending.catch(()=>undefined);
      await blocked(w,s);await state.query("commit");
      await expect(pending).rejects.toBeInstanceOf(AccountInactiveError);
      expect(await facts()).toEqual(before);
    }finally{
      await state.query("rollback").catch(()=>{});
      if(pending)await Promise.allSettled([pending]);
      await Promise.all([state.end(),writer.end()]);
    }
  },30000);

  it.each(kinds.filter(k=>k!=="locale"))("writer-first %s holds actor through COMMIT; subsequent retry denies",async kind=>{
    const id=await actor(),writer=await client(),state=await client();
    const barrier=beforeCommit(writer);let pending:Promise<unknown>|undefined,changing:Promise<unknown>|undefined;
    try{
      const w=await pid(writer),s=await pid(state);
      pending=command(kind,id,writer);void pending.catch(()=>undefined);await barrier.observed;
      changing=deactivate(state,id);void changing.catch(()=>undefined);await blocked(s,w);
      barrier.resume();await pending;await changing;
      const after=await facts();
      await expect(command(kind,id,fixture)).rejects.toBeInstanceOf(AccountInactiveError);
      expect(await facts()).toEqual(after);
    }finally{
      barrier.resume();barrier.restore();
      await Promise.allSettled([...(pending?[pending]:[]),...(changing?[changing]:[])]);
      await Promise.all([writer.end(),state.end()]);
    }
  },30000);

  it("locale writer-first locks the subject inside its real atomic UPDATE before lifecycle change",async()=>{
    const id=await actor(),writer=await client(),state=await client(),locker=await client();
    let writing:Promise<unknown>|undefined,changing:Promise<unknown>|undefined;
    await fixture.query(`create function opq_pause_locale() returns trigger language plpgsql as $$
      begin if new.locale is distinct from old.locale then perform pg_advisory_xact_lock(918372);end if;return new;end $$`);
    await fixture.query('create trigger opq_pause_locale before update on "user" for each row execute function opq_pause_locale()');
    try{
      const w=await pid(writer),s=await pid(state),l=await pid(locker);
      await locker.query("begin");await locker.query("select pg_advisory_xact_lock(918372)");
      writing=locale(writer).save(id,"he");void writing.catch(()=>undefined);await blocked(w,l);
      changing=deactivate(state,id);void changing.catch(()=>undefined);await blocked(s,w);
      await locker.query("commit");await writing;await changing;
      const after=await facts();
      expect(after.accounts.find(a=>a.id===id)?.locale).toBe("he");
      await expect(locale(fixture).save(id,"ru")).rejects.toBeInstanceOf(AccountInactiveError);
      expect(await facts()).toEqual(after);
    }finally{
      await locker.query("rollback").catch(()=>{});
      await Promise.allSettled([...(writing?[writing]:[]),...(changing?[changing]:[])]);
      await fixture.query('drop trigger opq_pause_locale on "user";drop function opq_pause_locale()');
      await Promise.all([writer.end(),state.end(),locker.end()]);
    }
  },30000);

  it("registration waiting at singleton rechecks no-op only after actor admission; other actors remain independent",async()=>{
    const id=await actor(),other=await actor(),writer=await client(),locker=await client();
    let pending:Promise<unknown>|undefined;
    try{
      const w=await pid(writer),l=await pid(locker);
      await locker.query("begin");await locker.query("select id from forum_registration_settings where id=1 for update");
      pending=command("registration-no-op",id,writer);void pending.catch(()=>undefined);await blocked(w,l);
      await command("locale",other,fixture); // No global actor lock.
      const state=await client();
      try{
        await state.query("set lock_timeout='180ms'");
        await expect(deactivate(state,id)).rejects.toMatchObject({code:"55P03"});
      }finally{await state.end();}
      await locker.query("commit");await pending;
      await deactivate(fixture,id);const before=await facts();
      await expect(command("registration-no-op",id,fixture)).rejects.toBeInstanceOf(AccountInactiveError);
      expect(await facts()).toEqual(before);
    }finally{
      await locker.query("rollback").catch(()=>{});if(pending)await Promise.allSettled([pending]);
      await Promise.all([writer.end(),locker.end()]);
    }
  },30000);
});
