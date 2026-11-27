import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { createAuth } from "../../app/auth/auth.server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthLifecycleBudget, LifecycleBudgetExceededError, LifecycleBudgetInvariantError,
  type LifecycleBudgetIntent } from "../../app/auth/lifecycle-budget.server";
import { AuthLifecycleTransaction } from "../../app/auth/lifecycle-transaction.server";
import { captureAttemptIngressSource, syntheticAttemptIngressSource } from "../../app/observability/attempt-source";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname) ||
  !new URL(url).pathname.endsWith("_test")) throw new Error("Disposable loopback *_test DB required");
const schema = "auth02a_shared_budget_test";
const connection = () => new Client({ connectionString:url, options:"-c search_path="+schema });
const first = connection(), second = connection();
const secret = "disposable-local-budget-signing-secret-at-least-32";
const source = syntheticAttemptIngressSource("203.0.113.7");
const budget = (client = first, ingress = source, key = secret) =>
  new AuthLifecycleBudget(client,new AuthLifecycleTransaction(client),key,ingress);
const mail = (email = "member@example.test"): LifecycleBudgetIntent =>
  ({kind:"mail",purpose:"email-verification",email});
const ok = async () => "ok";
const persisted = async () => (await first.query<{ key:string; count:number; expires_at:Date }>(
  "select key,count,expires_at from auth_lifecycle_budget order by key")).rows;
beforeAll(async () => {
  await first.connect(); await second.connect();
  await first.query("drop schema if exists "+schema+" cascade; create schema "+schema);
  await first.query((await readFile("drizzle/0003_gorgeous_donald_blake.sql","utf8"))
    .replaceAll('"public".','"'+schema+'".'));
  await first.query(await readFile("drizzle/0073_auth_account_uniqueness.sql","utf8"));
  await first.query(await readFile("drizzle/0074_auth_lifecycle_budget.sql","utf8"));
});
beforeEach(async () => { await first.query("truncate auth_lifecycle_budget,rate_limit"); });
afterAll(async () => {
  await first.query("drop schema if exists "+schema+" cascade");
  await first.end(); await second.end();
});

describe("AUTH-02a shared private lifecycle budget", () => {
  it("limits a normalized recipient burst across separate clients and network sources", async () => {
    const clients=Array.from({length:9},connection);
    let mutations=0;
    try {
      await Promise.all(clients.map(c=>c.connect()));
      const results=await Promise.allSettled(clients.map((c,i)=>budget(c,syntheticAttemptIngressSource("203.0.113."+(30+i)))
        .run(mail(i%2?" MEMBER@example.test ":"member@example.test"),async()=>{mutations++;})));
      expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(3);
      expect(results.filter(r=>r.status==="rejected").map(r=>r.reason)).toEqual(Array(6).fill(expect.any(LifecycleBudgetExceededError)));
      expect(mutations).toBe(3);
      expect((await persisted()).map(r=>r.count).sort((a,b)=>a-b)).toEqual([...Array(9).fill(1),3]);
    } finally { await Promise.all(clients.map(c=>c.end())); }
  });
  it("does not permit an escaped asynchronous receipt after its logical operation closes", async () => {
    const runtime=budget();
    let release!:()=>void,escaped:Promise<string>|undefined;
    await runtime.run(mail(),async()=>{
      escaped=new Promise<void>(resolve=>{release=resolve;}).then(()=>runtime.run(mail(),ok));
      void escaped.catch(()=>{});
    });
    release();
    await expect(escaped).rejects.toBeInstanceOf(LifecycleBudgetInvariantError);
    expect((await persisted()).map(row=>row.count)).toEqual([1,1]);
  });
  it("uses authoritative DB time despite a skewed application clock", async () => {
    const clock=vi.spyOn(Date,"now").mockReturnValue(1);
    try {
      await budget().run(mail(),ok);
      expect((await first.query("select bool_and(expires_at between clock_timestamp()+interval '590 seconds' and clock_timestamp()+interval '610 seconds') bounded from auth_lifecycle_budget")).rows[0].bounded).toBe(true);
    } finally { clock.mockRestore(); }
  });
  it("shares canonical target budget across network and HTTP/direct nested calls", async () => {
    const runtime = budget();
    // Both entry styles call the same service; the nested server-owned receipt
    // identifies a logical command and is never a header/body bypass.
    const http = () => runtime.run(mail(" MEMBER@example.test "), () =>
      runtime.run(mail("member@example.test"),ok));
    const direct = () => budget(second,syntheticAttemptIngressSource("203.0.113.8"))
      .run(mail("member@example.test"),ok);
    expect(await http()).toBe("ok");
    expect(await direct()).toBe("ok");
    expect(await http()).toBe("ok");
    await expect(direct()).rejects.toMatchObject({retryAfterSeconds:expect.any(Number)});
    const records = await persisted();
    expect(records.map(r=>r.count).sort((a,b)=>a-b)).toEqual([2,2,3]);
    expect(JSON.stringify(records)).not.toContain("member@example.test");
    expect(JSON.stringify(records)).not.toContain("203.0.113.");
    expect(records.every(r=>/^vico-auth-budget:v1:[a-f0-9]{64}$/.test(r.key))).toBe(true);
  });

  it("counts failed domain attempts and rejects a different nested intent", async () => {
    const runtime=budget();
    const failure=new Error("test mutation failure");
    await expect(runtime.run(mail(),async()=>{throw failure})).rejects.toBe(failure);
    await expect(runtime.run(mail(),()=>runtime.run(mail("other@example.test"),ok)))
      .rejects.toBeInstanceOf(LifecycleBudgetInvariantError);
    expect(await runtime.run(mail(),ok)).toBe("ok");
    await expect(runtime.run(mail(),ok)).rejects.toBeInstanceOf(LifecycleBudgetExceededError);
    expect((await persisted()).some(r=>r.count===3)).toBe(true);
  });

  it("admits exactly five concurrent signup attempts across native clients", async () => {
    const clients=Array.from({length:10},connection);
    try {
      await Promise.all(clients.map(c=>c.connect()));
      const results=await Promise.allSettled(clients.map(c=>budget(c).run({kind:"signup"},ok)));
      expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(5);
      const denied=results.filter(r=>r.status==="rejected");
      expect(denied).toHaveLength(5);
      expect(denied.map(r=>r.reason)).toEqual(Array(5).fill(expect.any(LifecycleBudgetExceededError)));
      expect((await persisted()).map(r=>r.count)).toEqual([5]);
      expect((await persisted())[0]?.key).toMatch(/^vico-auth-budget:v1:[a-f0-9]{64}$/);
    } finally { await Promise.all(clients.map(c=>c.end())); }
  });

  it("shares an unknown-network limit and ignores spoofed header variants", async () => {
    for (let i=0;i<5;i++) {
      const request=new Request("https://forum.test/api/auth/sign-up/email",{
        headers:{"cf-connecting-ip":"203.0.113."+i,"x-forwarded-for":"198.51.100."+i},
      });
      expect(await budget(first,captureAttemptIngressSource(request)).run({kind:"signup"},ok)).toBe("ok");
    }
    await expect(budget(first,captureAttemptIngressSource(new Request("https://forum.test")))
      .run({kind:"signup"},ok)).rejects.toBeInstanceOf(LifecycleBudgetExceededError);
    expect(await budget().run({kind:"signup"},ok)).toBe("ok");
    expect((await persisted()).map(r=>r.count).sort()).toEqual([1,5]);
  });

  it("separates mail, terminal and own budgets and keeps own issuance bounded", async () => {
    const runtime=budget();
    for(let i=0;i<5;i++) {
      await runtime.run({kind:"mail",purpose:"email-change",email:"new"+i+"@example.test",userId:"member"},ok);
    }
    await expect(runtime.run({kind:"mail",purpose:"password-create",email:"member@example.test",userId:"member"},ok))
      .rejects.toBeInstanceOf(LifecycleBudgetExceededError);
    for(let i=0;i<5;i++) await runtime.run({kind:"own",purpose:"unlink-account",userId:"member"},ok);
    await expect(runtime.run({kind:"own",purpose:"email-change",userId:"member"},ok))
      .rejects.toBeInstanceOf(LifecycleBudgetExceededError);
    for(let i=0;i<10;i++) await runtime.run({kind:"terminal",purpose:"password-reset"},ok);
    await expect(runtime.run({kind:"terminal",purpose:"email-verification"},ok))
      .rejects.toBeInstanceOf(LifecycleBudgetExceededError);
  });

  it("keeps a fixed DB window across allowed and denied attempts, resetting only on expiry", async () => {
    const runtime=budget();
    await runtime.run(mail(),ok);
    const initial=await persisted();
    await runtime.run(mail(),ok);
    await runtime.run(mail(),ok);
    await expect(runtime.run(mail(),ok)).rejects.toMatchObject({retryAfterSeconds:expect.any(Number)});
    const current=await persisted();
    expect(current.map(r=>r.expires_at)).toEqual(initial.map(r=>r.expires_at));
    expect(current.map(r=>r.count).sort((a,b)=>a-b)).toEqual([3,4]);
    await first.query("update auth_lifecycle_budget set expires_at=clock_timestamp()-interval '1 second'");
    await runtime.run(mail(),ok);
    const reset=await persisted();
    expect(reset.map(r=>r.count)).toEqual([1,1]);
    expect(reset.every(r=>r.expires_at.getTime()>Date.now())).toBe(true);
  });

  it("runs actual native HTTP reset/sweep without touching live Vico target limits", async () => {
    const runtime=budget();
    for(let i=0;i<3;i++) await runtime.run(mail(),ok);
    const original=await persisted();
    const auth=createAuth(drizzle(first),{
      BETTER_AUTH_SECRET:secret, BETTER_AUTH_URL:"http://localhost:3000",
      GOOGLE_CLIENT_ID:"unused-google-client", GOOGLE_CLIENT_SECRET:"unused-google-secret",
    });
    const request=()=>new Request("http://localhost:3000/api/auth/get-session",{
      headers:{"cf-connecting-ip":"203.0.113.100"},
    });
    expect((await auth.handler(request())).status).toBe(200);
    const native=(await first.query<{id:string}>("select id from rate_limit")).rows;
    expect(native).toHaveLength(1);
    await first.query("update rate_limit set last_request=$1",[Date.now()-120000]);
    await first.query("insert into rate_limit(id,key,count,last_request) values('expired-probe','expired-probe',1,$1)",[Date.now()-120000]);
    expect((await auth.handler(request())).status).toBe(200);
    expect((await first.query("select id,count from rate_limit")).rows).toEqual([{id:native[0].id,count:1}]);
    expect(await persisted()).toEqual(original);
    await expect(runtime.run(mail(),ok)).rejects.toBeInstanceOf(LifecycleBudgetExceededError);
    const target=(await persisted()).find(row=>row.count===3);
    expect(target).toBeDefined();
    expect(target?.expires_at).toEqual(original.find(row=>row.key===target?.key)?.expires_at);
  });

  it("enforces finite expiry, valid HMAC key and positive count on the forward schema", async () => {
    const key="vico-auth-budget:v1:"+"a".repeat(64);
    for(const [candidate,count,expiry] of [
      ["raw@example.test",1,"2030-01-01"], [key,0,"2030-01-01"],[key,1,"infinity"],
    ]) await expect(first.query("insert into auth_lifecycle_budget(key,count,expires_at) values($1,$2,$3)",
      [candidate,count,expiry])).rejects.toMatchObject({code:"23514"});
    expect(await persisted()).toEqual([]);
  });

  it("cleans at most 64 expired rows, skips locks and leaves native/live rows unchanged", async () => {
    const prefix="vico-auth-budget:v1:";
    await first.query("insert into auth_lifecycle_budget(key,count,expires_at) select $1||lpad(to_hex(n),64,'0'),1,clock_timestamp()-interval '1 minute' from generate_series(1,70)n",[prefix]);
    const lockedKey=prefix+"1".padStart(64,"0");
    const liveKey=prefix+"f".repeat(64);
    await first.query("insert into auth_lifecycle_budget(key,count,expires_at) values($1,2,clock_timestamp()+interval '10 minutes')",[liveKey]);
    await first.query("insert into rate_limit(id,key,count,last_request) values('native','native',1,1)");
    await second.query("begin");
    try {
      await second.query("select key from auth_lifecycle_budget where key=$1 for update",[lockedKey]);
      await budget().run({kind:"signup"},ok);
      expect((await persisted()).filter(r=>r.expires_at.getTime()<Date.now())).toHaveLength(6);
      expect((await persisted()).some(r=>r.key===lockedKey)).toBe(true);
      // Renew the locked expired row before allowing another cleanup.
      await second.query("update auth_lifecycle_budget set expires_at=clock_timestamp()+interval '10 minutes' where key=$1",[lockedKey]);
      await second.query("commit");
    } catch (error) { await second.query("rollback"); throw error; }
    await budget().run({kind:"signup"},ok);
    expect((await persisted()).map(r=>r.key)).toEqual(expect.arrayContaining([lockedKey,liveKey]));
    expect((await persisted()).filter(r=>r.expires_at.getTime()<Date.now())).toHaveLength(0);
    expect((await first.query("select id,key,count,last_request from rate_limit")).rows).toEqual([{id:"native",key:"native",count:1,last_request:"1"}]);
  });

  it("recreates an expired bucket when a concurrent cleanup deletes it first", async () => {
    await budget(second).run({kind:"signup"},ok);
    const key=(await persisted())[0].key;
    await first.query("update auth_lifecycle_budget set expires_at=clock_timestamp()-interval '1 second'");
    // A distinct real admission owns the cleanup transaction. Pause the
    // native query only after DELETE has executed and before its COMMIT.
    const native=first.query;
    let deleted!:()=>void,release!:()=>void;
    const deletionReached=new Promise<void>(resolve=>{deleted=resolve;});
    const barrier=new Promise<void>(resolve=>{release=resolve;});
    first.query=((...args:unknown[])=>{
      const result=Reflect.apply(native,first,args);
      if(typeof args[0]!=="string" || !args[0].includes("delete from auth_lifecycle_budget as budget")) return result;
      return Promise.resolve(result).then(async value=>{deleted();await barrier;return value;});
    }) as typeof first.query;
    const cleaner=budget(first,syntheticAttemptIngressSource("203.0.113.99")).run({kind:"signup"},ok);
    let renewal:Promise<string>|undefined;
    try {
      await Promise.race([deletionReached,cleaner.then(()=>{throw new Error("cleanup did not reach DELETE");})]);
      const pid=(await second.query<{pid:number}>("select pg_backend_pid() as pid")).rows[0].pid;
      renewal=budget(second).run({kind:"signup"},ok);
      // A separate observer cannot borrow the blocked renewal connection.
      const observer=connection();
      await observer.connect();
      try {
        await vi.waitFor(async()=>{
          const activity=await observer.query("select wait_event_type from pg_stat_activity where pid=$1",[pid]);
          expect(activity.rows[0]?.wait_event_type).toBe("Lock");
        },{timeout:1000,interval:20});
      } finally {await observer.end();}
    } finally {
      release();
      first.query=native;
      await Promise.allSettled([cleaner,...(renewal?[renewal]:[])]);
    }
    await expect(cleaner).resolves.toBe("ok");
    await expect(renewal).resolves.toBe("ok");
    const saved=(await persisted()).find(row=>row.key===key);
    expect(saved?.count).toBe(1);
    expect(saved?.expires_at.getTime()).toBeGreaterThan(Date.now());
  });

  it("uses separate HMAC keys on secret rotation and leaves old windows bounded", async () => {
    await budget().run(mail(),ok);
    const old=await persisted();
    await budget(first,source,secret+"-rotated").run(mail(),ok);
    expect(await persisted()).toHaveLength(4);
    expect((await persisted()).filter(r=>old.some(o=>o.key===r.key))).toEqual(old);
    await first.query("update auth_lifecycle_budget set expires_at=clock_timestamp()-interval '1 second'");
    await budget(first,source,secret+"-rotated").run(mail(),ok);
    expect(await persisted()).toHaveLength(2);
  });

  it("fails closed before domain work on storage failure, invalid configuration or active mutation transaction", async () => {
    let called=0;
    const work=async()=>{called++;};
    await expect(budget(first,source,"short").run(mail(),work)).rejects.toBeInstanceOf(LifecycleBudgetInvariantError);
    const transaction=new AuthLifecycleTransaction(first);
    const scoped=new AuthLifecycleBudget(first,transaction,secret,source);
    await expect(transaction.run(()=>scoped.run(mail(),work))).rejects.toBeInstanceOf(LifecycleBudgetInvariantError);
    await first.query("alter table auth_lifecycle_budget rename to unavailable_auth_lifecycle_budget");
    try { await expect(budget().run(mail(),work)).rejects.toBeTruthy(); }
    finally { await first.query("alter table unavailable_auth_lifecycle_budget rename to auth_lifecycle_budget"); }
    expect(called).toBe(0);
  });
});
