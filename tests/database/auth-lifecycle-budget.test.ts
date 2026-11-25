import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
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
const persisted = async () => (await first.query<{ key:string; count:number; last_request:string }>(
  "select key,count,last_request from rate_limit order by key")).rows;
beforeAll(async () => {
  await first.connect(); await second.connect();
  await first.query("drop schema if exists "+schema+" cascade; create schema "+schema);
  await first.query((await readFile("drizzle/0003_gorgeous_donald_blake.sql","utf8"))
    .replaceAll('"public".','"'+schema+'".'));
});
beforeEach(async () => { await first.query("truncate rate_limit"); });
afterAll(async () => {
  await first.query("drop schema if exists "+schema+" cascade");
  await first.end(); await second.end();
});

describe("AUTH-02a shared private lifecycle budget", () => {
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
      expect(denied.every(r=>r.reason instanceof LifecycleBudgetExceededError)).toBe(true);
      expect((await persisted()).map(r=>r.count)).toEqual([5]);
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

  it("resets expired windows, survives native rate-limit sweep and only prunes its namespace", async () => {
    const runtime=budget();
    await runtime.run(mail(),ok);
    const initial=await persisted();
    expect(initial).toHaveLength(2);
    await first.query("insert into rate_limit(id,key,count,last_request) values('native','native',1,1)");
    // Better Auth v1.7.7's native sweep deletes old last_request timestamps.
    await first.query("delete from rate_limit where last_request < floor(extract(epoch from clock_timestamp())*1000)::bigint-60000");
    expect(await persisted()).toEqual(initial);
    await first.query("update rate_limit set last_request=1");
    await first.query("insert into rate_limit(id,key,count,last_request) values('native','native',1,1)");
    await runtime.run({kind:"signup"},ok);
    expect((await persisted()).map(r=>r.key)).toEqual([ "native",expect.stringMatching(/^vico-auth-budget:v1:/)]);
    await runtime.run(mail(),ok);
    expect((await persisted()).filter(r=>r.key!=="native").map(r=>r.count)).toEqual([1,1,1]);
  });

  it("uses separate HMAC keys on secret rotation and leaves old windows bounded", async () => {
    await budget().run(mail(),ok);
    const old=await persisted();
    await budget(first,source,secret+"-rotated").run(mail(),ok);
    expect(await persisted()).toHaveLength(4);
    expect((await persisted()).filter(r=>old.some(o=>o.key===r.key))).toEqual(old);
    await first.query("update rate_limit set last_request=1");
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
    await first.query("alter table rate_limit rename to unavailable_rate_limit");
    try { await expect(budget().run(mail(),work)).rejects.toBeTruthy(); }
    finally { await first.query("alter table unavailable_rate_limit rename to rate_limit"); }
    expect(called).toBe(0);
  });
});
