import { readdir, readFile } from "node:fs/promises";
import { Client, Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { hashPassword } from "better-auth/crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createAuth } from "../../app/auth/auth.server";
import { AuthLifecycleTransaction } from "../../app/auth/lifecycle-transaction.server";
import { buildAuthMailActionURL } from "../../app/auth/auth-mail-urls.server";
import { localeRegistry } from "../../app/localization/registry";
import { PostgresOwnerAccountLifecycleCommand } from "../../db/owner-account-lifecycle";
import type { AuthTransitionFact } from "../../db/owner-auth-facts";
import type { AuthMailPurpose } from "../../app/auth/auth-mail-contract.server";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname) || !new URL(url).pathname.endsWith("_test")) throw new Error("Disposable loopback *_test DB required");
const schema = "auth06_whole_lifecycle_test", origin = "http://localhost:3000";
const member = "matrix-member", owner = "matrix-owner", foreign = "matrix-foreign";
const email = "member@example.test", newEmail = "changed@example.test";
const password = "matrix-current-password", replacement = "matrix-replaced-password";
const env = { BETTER_AUTH_URL: origin, BETTER_AUTH_SECRET: "auth06-local-only-long-secret-0123456789abcdef",
  GOOGLE_CLIENT_ID: "synthetic-google", GOOGLE_CLIENT_SECRET: "synthetic-only-google-secret" };
const connection = () => new Client({ connectionString: url, options: "-c search_path=" + schema });
const observer = connection();
const pool = new Pool({ connectionString: url, options: "-c search_path=" + schema, max: 1 });
const deactivate = new PostgresOwnerAccountLifecycleCommand(pool, owner);
let first: Client, second: Client, fixtureHash: string;
type Purpose = "verification-issue" | "verify" | "reset-issue" | "reset" | "create-issue" | "create" | "email-issue" | "email-old" | "email-commit" | "unlink" | "link" | "password-change";
type Mail = { purpose: AuthMailPurpose; token: string; recipient: string };

beforeAll(async () => {
  await observer.connect();
  await observer.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const name of (await readdir("drizzle")).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort()) {
    await observer.query((await readFile("drizzle/" + name,"utf8")).replaceAll('"public".', '"' + schema + '".'));
  }
  fixtureHash = await hashPassword(password);
});

/** Inject transport failure only after PostgreSQL has executed the selected statement.
 * The genuine transaction owner must decide rollback/uncertainty; no SQL result is faked.
 */
function failAfter(client: Client, match: (sql: string, values: unknown[]) => boolean,
  effect: () => Promise<void> = async () => { throw Object.assign(new Error("Synthetic acknowledgement loss after executed statement"), { code: "08006" }); }) {
  const original = client.query;
  let fired = 0;
  client.query = ((...args: unknown[]) => {
    const pending = Reflect.apply(original, client, args);
    if (fired || !match(sqlText(args[0]), parameters(args))) return pending;
    fired++;
    return Promise.resolve(pending).then(async value => { await effect(); return value; });
  }) as typeof client.query;
  return { count: () => fired, restore: () => { client.query = original; } };
}

const terminalPurposes: Purpose[] = ["verify", "reset", "create", "email-commit"];
const mutation = (sql: string) => /^\s*(update (account|"user")|insert into account)/i.test(sql);
const consumption = (sql: string, values: unknown[]) => /^\s*delete from verification/i.test(sql)
  && values.some(value => typeof value === "string" && value.startsWith("vico-auth-lifecycle:v1:"));
describe("AUTH-06 terminal lifecycle faults on genuine PG transactions", () => {
  it.each(terminalPurposes.flatMap(purpose => ["consume", "mutate", ...(purpose === "verify" ? [] : ["revoke"])].map(point => ({ purpose, point }))))(
    "$purpose rolls back every auth effect after executed $point fails", async ({ purpose, point }) => {
      const r = await prepare(purpose);
      const before = await state();
      const fault = failAfter(first, (sql, values) => point === "consume" ? consumption(sql, values)
        : point === "mutate" ? mutation(sql) : /^\s*delete from session/i.test(sql));
      let response: Response;
      try { response = await r.command(); } finally { fault.restore(); }
      expect(fault.count()).toBe(1);
      expect(response!.status).toBe(503);
      expect(await state()).toEqual(before);
      expect(r.facts).toEqual([]);
      expect(r.sent).toEqual([]);
      expect(r.tx.connectionUsable).toBe(true);
      // A deliberate retry with the same proof succeeds: rollback restored its use.
      expect((await r.command()).status).toBe(200);
    });

  it.each(terminalPurposes)("%s suppresses facts after COMMIT applied but its acknowledgement was lost", async purpose => {
    const r = await prepare(purpose);
    const before = await state();
    let domain = false;
    const fault = failAfter(first, (sql, values) => {
      if (targetLock(sql, values)) domain = true;
      return domain && /^commit$/i.test(sql);
    });
    let response: Response;
    try { response = await r.command(); } finally { fault.restore(); }
    expect(fault.count()).toBe(1);
    expect(response!.status).toBe(503);
    const committed = await state();
    expect(committed).not.toEqual(before);
    expect(committed.proofs).toEqual([]);
    expect(r.facts).toEqual([]);
    expect(r.sent).toEqual([]);
    expect(r.tx.controlFailure?.code).toBe("commit-uncertain");
    expect(r.tx.connectionUsable).toBe(false);
    // The caller must discard this client. An attempted reuse cannot reapply the write.
    await expect(r.command()).rejects.toMatchObject({ code: "closed" });
    expect(await state()).toEqual(committed);
  });

  it.each(terminalPurposes)("%s preserves committed state when post-commit observation fails", async purpose => {
    const r = await prepare(purpose, first, true);
    const before = await state();
    expect((await r.command()).status).toBe(200);
    expect(await state()).not.toEqual(before);
    expect(r.facts).toEqual([]);
    expect(r.tx.connectionUsable).toBe(true);
  });

  it.each(terminalPurposes)("%s reaches the real PG lock deadline with no partial write", async purpose => {
    const r = await prepare(purpose);
    const before = await state();
    await second.query("begin");
    await second.query('select id from "user" where id=$1 for no key update', [member]);
    try { expect((await r.command()).status).toBe(503); }
    finally { await second.query("rollback"); }
    expect(await state()).toEqual(before);
    expect(r.facts).toEqual([]);
    expect(r.tx.connectionUsable).toBe(true);
  });

  it.each(terminalPurposes)("%s rolls back consumed proof on a real PG statement timeout", async purpose => {
    const r = await prepare(purpose);
    const before = await state();
    const nativeQuery = first.query.bind(first);
    const fault = failAfter(first, consumption, async () => {
      // Use the actual runtime's 5s deadline, without changing its configuration.
      await nativeQuery("select pg_sleep(6)");
    });
    try { expect((await r.command()).status).toBe(503); }
    finally { fault.restore(); }
    expect(fault.count()).toBe(1);
    expect(await state()).toEqual(before);
    expect(r.facts).toEqual([]);
  });

  it.each(terminalPurposes)("%s loses its actual PG backend after consume without partial persistence", async purpose => {
    const r = await prepare(purpose);
    const before = await state();
    const pid = (await first.query("select pg_backend_pid() pid")).rows[0].pid;
    const fault = failAfter(first, consumption, async () => {
      const ended = new Promise<void>(resolve => first.once("error", () => resolve()));
      await observer.query("select pg_terminate_backend($1)", [pid]);
      await ended;
    });
    try {
      const [outcome] = await Promise.allSettled([r.command()]);
      if (outcome.status === "fulfilled") expect(outcome.value.status).toBe(503);
      else expect(outcome.reason).toBeInstanceOf(Error);
    } finally { fault.restore(); }
    expect(fault.count()).toBe(1);
    expect(await state()).toEqual(before);
    expect(r.facts).toEqual([]);
    expect(r.tx.connectionUsable).toBe(false);
    expect(r.tx.controlFailure?.code).toBe("rollback-uncertain");
  });
});
beforeEach(async () => {
  first = connection(); second = connection();
  first.on("error", () => {}); second.on("error", () => {});
  await Promise.all([first.connect(), second.connect()]);
  await observer.query('truncate "user",account,session,verification,rate_limit,auth_lifecycle_budget,owner_events,owner_attempt_patterns,owner_attempt_telemetry_state cascade');
  await observer.query('insert into "user"(id,name,email,email_verified,updated_at) values ($1,$1,$2,true,now()),($3,$3,$4,true,now()),($5,$5,$6,true,now())',
    [member,email,owner,"owner@example.test",foreign,"foreign@example.test"]);
  await observer.query("insert into account(id,user_id,provider_id,account_id,password,updated_at) values ('matrix-password',$1,'credential',$1,$2,now()),('foreign-password',$3,'credential',$3,$2,now()),('matrix-google',$1,'google','google-immutable-member',null,now())", [member,fixtureHash,foreign]);
});
afterEach(async () => { await Promise.allSettled([first.end(),second.end()]); });
afterAll(async () => { await pool.end(); await observer.query("drop schema if exists " + schema + " cascade"); await observer.end(); });

function sqlText(input: unknown): string {
  return typeof input === "string" ? input : input && typeof input === "object" && "text" in input ? String(input.text) : "";
}
function parameters(args: unknown[]): unknown[] {
  if (Array.isArray(args[1])) return args[1];
  return args[0] && typeof args[0] === "object" && "values" in args[0] && Array.isArray(args[0].values) ? args[0].values : [];
}
function pauseAfter(client: Pick<Client,"query">, match: (sql: string, values: unknown[]) => boolean, before = false) {
  const original = client.query;
  let reached!: () => void, release!: () => void, triggered = false;
  const entered = new Promise<void>(resolve => { reached=resolve; });
  const permitted = new Promise<void>(resolve => { release=resolve; });
  client.query = ((...args: unknown[]) => {
    if (triggered || !match(sqlText(args[0]),parameters(args))) return Reflect.apply(original,client,args);
    triggered=true;
    if (before) return (async () => { reached(); await permitted; return Reflect.apply(original,client,args); })();
    const pending = Reflect.apply(original,client,args);
    return Promise.resolve(pending).then(async value => { reached(); await permitted; return value; });
  }) as typeof client.query;
  return { entered, release, restore: () => { client.query=original; } };
}
const targetLock = (sql: string, values: unknown[]) => /for no key update/i.test(sql) && values.includes(member);
async function blocked(pid: number) {
  await vi.waitFor(async () => expect((await observer.query("select wait_event_type from pg_stat_activity where pid=$1",[pid])).rows[0]?.wait_event_type).toBe("Lock"), { interval: 10, timeout: 2000 });
}
async function state() {
  return {
    users: (await observer.query('select id,email,email_verified from "user" order by id')).rows,
    methods: (await observer.query("select id,user_id,provider_id,account_id,encode(sha256(convert_to(coalesce(password,''),'UTF8')),'hex') password_digest from account order by id")).rows,
    sessions: (await observer.query("select id,user_id from session order by id")).rows,
    proofs: (await observer.query("select id,identifier,encode(sha256(convert_to(value,'UTF8')),'hex') value_digest from verification order by id")).rows,
  };
}
async function runtime(client = first, observationFailure = false) {
  const tx = new AuthLifecycleTransaction(client);
  const facts: AuthTransitionFact[] = [], sent: Mail[] = [];
  const auth = createAuth(drizzle(client),env,undefined,undefined,undefined,{
    capture(fact) { if (observationFailure) throw new Error("synthetic observation unavailable"); facts.push(fact); },
    trustedActorFor() { return null; },
  },undefined,undefined,undefined,false,tx,{mail:{
    async buildActionURL(action) { return buildAuthMailActionURL(origin,localeRegistry,action); },
    async sendAuthMail(input) {
      const action = new URL(input.actionURL);
      const token = (input.purpose === "email-verification" ? action.searchParams : new URLSearchParams(action.hash.slice(1))).get("token")!;
      sent.push({purpose:input.purpose,token,recipient:input.recipient});
      return {status:"accepted"};
    },
  }});
  const context = await auth.$context;
  const google = context.socialProviders.find(provider => provider.id === "google")!;
  if (!google.options) throw new Error("Missing synthetic Google options");
  Object.assign(google.options, { verifyIdToken: async () => true });
  Object.assign(google,{
    getUserInfo: async () => ({user:{email,emailVerified:true,name:"Synthetic Google"},data:{sub:"google-immutable-member",email,email_verified:true,name:"Synthetic Google",iss:"https://accounts.google.com",aud:env.GOOGLE_CLIENT_ID,azp:env.GOOGLE_CLIENT_ID,exp:2000000000,iat:1900000000,family_name:"Google",given_name:"Synthetic",picture:""}}),
    validateAuthorizationCode: async () => ({accessToken:"synthetic-only-local-access"}),
  });
  return {auth,context,tx,facts,sent};
}
async function prepare(purpose: Purpose, client = first, observationFailure = false) {
  const r = await runtime(client, observationFailure);
  const unverified = purpose === "verification-issue" || purpose === "verify";
  const creation = purpose === "create-issue" || purpose === "create";
  if (unverified) await observer.query('update "user" set email_verified=false where id=$1',[member]);
  if (creation) await observer.query("delete from account where id='matrix-password'");
  if (purpose === "link") await observer.query("delete from account where id='matrix-google'");
  let headers = new Headers({Origin:origin,"Content-Type":"application/json"});
  let currentSession = "", cookie = "";
  if (!unverified) {
    const login = creation
      ? await r.auth.api.signInSocial({body:{provider:"google",idToken:{token:"synthetic-only-id-token"}},asResponse:true})
      : await r.auth.api.signInEmail({body:{email,password},asResponse:true});
    expect(login.status).toBe(200);
    cookie=login.headers.getSetCookie().find(value => value.includes("session_token="))!.split(";",1)[0];
    const current=await r.auth.api.getSession({headers:new Headers({cookie})});
    currentSession=current!.session.id;
    headers=new Headers({Origin:origin,"Content-Type":"application/json",cookie,
      "x-vico-account-user":member,"x-vico-account-session":currentSession,
      "x-vico-credential-user":member,"x-vico-credential-session":currentSession,"x-vico-link-user":member});
    await r.context.internalAdapter.createSession(member);
  }
  let token="";
  if (purpose === "verify") { await r.auth.api.sendVerificationEmail({body:{email}}); token=r.sent.at(-1)!.token; }
  if (purpose === "reset") { await r.auth.api.requestPasswordReset({body:{email}}); token=r.sent.at(-1)!.token; }
  if (purpose === "create") { await r.auth.api.requestCredentialCreation({headers,body:{}}); token=r.sent.at(-1)!.token; }
  if (purpose === "email-old" || purpose === "email-commit") {
    await r.auth.api.changeEmail({headers,body:{newEmail}}); token=r.sent.at(-1)!.token;
    if (purpose === "email-commit") { await r.auth.api.confirmEmailChange({headers,body:{token}}); token=r.sent.at(-1)!.token; }
  }
  r.facts.length=0; r.sent.length=0;
  const command = async () => {
    switch (purpose) {
      case "verification-issue": return r.auth.api.sendVerificationEmail({body:{email},asResponse:true});
      case "verify": return r.auth.api.verifyEmail({body:{token},asResponse:true});
      case "reset-issue": return r.auth.api.requestPasswordReset({body:{email},asResponse:true});
      case "reset": return r.auth.api.resetPassword({body:{token,newPassword:replacement},asResponse:true});
      case "create-issue": return r.auth.api.requestCredentialCreation({headers,body:{},asResponse:true});
      case "create": return r.auth.api.createCredential({headers,body:{token,newPassword:replacement},asResponse:true});
      case "email-issue": return r.auth.handler(new Request(origin+"/api/auth/change-email",{method:"POST",headers,body:JSON.stringify({newEmail})}));
      case "email-old": case "email-commit": return r.auth.api.confirmEmailChange({headers,body:{token},asResponse:true});
      case "unlink": return r.auth.api.unlinkAccount({headers,body:{accountId:"matrix-google"},asResponse:true});
      case "link": return r.auth.api.linkSocialAccount({headers,body:{provider:"google",idToken:{token:"synthetic-only-id-token"}},asResponse:true});
      case "password-change": return r.auth.api.changePassword({headers,body:{currentPassword:password,newPassword:replacement,revokeOtherSessions:false},asResponse:true});
    }
  };
  return {...r,command,currentSession,cookie,headers,token};
}

const purposes: Purpose[]=["verification-issue","verify","reset-issue","reset","create-issue","create","email-issue","email-old","email-commit","unlink","link","password-change"];
describe("AUTH-06 actual Owner deactivation × complete native lifecycle",()=>{
  it.each(purposes)("deactivation commits before %s: no new durable auth effect or false success fact",async purpose=>{
    const r=await prepare(purpose);
    const before=await state();
    const writerPid=(await first.query("select pg_backend_pid() pid")).rows[0].pid;
    // Complete password hashing/admission before starting Owner's 750ms lock
    // deadline. Ordering is still decided by actual user row locks in PG.
    const ready=pauseAfter(first,targetLock,true);
    const operation=r.command();void operation.catch(()=>{});
    await Promise.race([ready.entered, operation.then(async response => { throw new Error("Auth command missed its user lock: " + response.status + " " + await response.text()); })]);
    const deactivationClient=await pool.connect();
    const pid=(await deactivationClient.query("select pg_backend_pid() pid")).rows[0].pid;
    const barrier=pauseAfter(deactivationClient,targetLock);
    deactivationClient.release();
    const deactivating=deactivate.deactivate({actorId:owner,targetId:member,operationId:crypto.randomUUID()});
    void deactivating.catch(()=>{});
    try {
      await Promise.race([barrier.entered, deactivating.then(() => { throw new Error("Owner command completed without the target lock barrier"); })]);
      ready.release();ready.restore();
      await blocked(writerPid);
      expect((await observer.query("select wait_event_type from pg_stat_activity where pid=$1",[pid])).rows[0]?.wait_event_type).not.toBe("Lock");
    } finally {
      barrier.release();barrier.restore();
      ready.release();ready.restore();
      await deactivating;
    }
    const response=await operation;
    if(purpose==="verification-issue"||purpose==="reset-issue")expect(response.status).toBe(200);
    // Native Better Auth reports LINKING_FAILED as 417 after its guarded adapter rejects.
    else if (purpose === "link") expect(response.status).toBe(417);
    else expect([400,401,403]).toContain(response.status);
    expect(await state()).toEqual(before);
    expect(r.facts).toEqual([]);expect(r.sent).toEqual([]);
    expect((await observer.query("select kind from owner_events")).rows).toEqual([{kind:"account.deactivated"}]);
  });

  it.each(purposes)("%s obtains the user lock before Owner deactivation: auth commit is preserved",async purpose=>{
    const r=await prepare(purpose);
    const barrier=pauseAfter(first,targetLock);
    const deactivationClient=await pool.connect();
    const pid=(await deactivationClient.query("select pg_backend_pid() pid")).rows[0].pid;
    deactivationClient.release();
    const operation=r.command();void operation.catch(()=>{});
    let deactivating:ReturnType<typeof deactivate.deactivate>|undefined;
    try {
      await Promise.race([barrier.entered, operation.then(async response => { throw new Error("Auth command completed before the target lock barrier: " + response.status + " " + await response.text()); })]);
      deactivating=deactivate.deactivate({actorId:owner,targetId:member,operationId:crypto.randomUUID()});
      void deactivating.catch(()=>{});
      await blocked(pid);
      expect(r.facts).toEqual([]);
    } finally {barrier.release();barrier.restore();}
    const response=await operation;
    expect(response.status).toBe(200);
    const committed=await state();
    await deactivating;
    expect(await state()).toEqual(committed);
    expect((await observer.query("select kind from owner_events")).rows).toEqual([{kind:"account.deactivated"}]);
    if(["verification-issue","reset-issue","create-issue","email-issue","email-old"].includes(purpose))expect(r.sent).toHaveLength(1);
    if(purpose==="email-commit")expect(committed.users.find(row=>row.id===member)?.email).toBe(newEmail);
    if(purpose==="unlink")expect(committed.methods.some(row=>row.id==="matrix-google")).toBe(false);
  });
});

describe("AUTH-06 credential mutations × HTTP Google unlink", () => {
  it.each((["create", "reset", "password-change"] as const).flatMap(purpose =>
    [true, false].map(credentialFirst => ({ purpose, credentialFirst }))))(
    "$purpose / credential lock first=$credentialFirst retains a usable method", async ({ purpose, credentialFirst }) => {
      const r = await prepare(purpose);
      const rival = await runtime(second);
      const unlink = () => rival.auth.handler(new Request(origin + "/api/auth/unlink-account", {
        method: "POST", headers: r.headers, body: JSON.stringify({ accountId: "matrix-google" }),
      }));
      const holder = credentialFirst ? first : second;
      const waiter = credentialFirst ? second : first;
      const barrier = pauseAfter(holder, targetLock);
      const waitingPid = (await waiter.query("select pg_backend_pid() pid")).rows[0].pid;
      const leading = credentialFirst ? r.command() : unlink();
      void leading.catch(() => {});
      let following: Promise<Response> | undefined;
      try {
        await Promise.race([barrier.entered, leading.then(async response => {
          throw new Error("Leading command missed the user lock: " + response.status + " " + await response.text());
        })]);
        following = credentialFirst ? unlink() : r.command();
        void following.catch(() => {});
        await blocked(waitingPid);
      } finally { barrier.release(); barrier.restore(); }
      const results = await Promise.all([leading, following!]);
      const [credentialResult, unlinkResult] = credentialFirst ? results : [results[1], results[0]];
      expect(credentialResult.status).toBe(200);
      // A reset invalidates the in-flight unlink's ambient session. Google-only
      // unlink cannot remove its sole method before password creation commits.
      const denied = (purpose === "reset" && credentialFirst) || (purpose === "create" && !credentialFirst);
      expect(unlinkResult.status).toBe(denied ? purpose === "create" ? 409 : 400 : 200);
      const durable = await state();
      expect(durable.methods.filter(row => row.user_id === member && row.provider_id === "credential")).toHaveLength(1);
      expect(durable.methods.some(row => row.id === "matrix-google")).toBe(denied);
      expect(durable.proofs).toEqual([]);
      if (purpose === "reset") expect(durable.sessions.filter(row => row.user_id === member)).toEqual([]);
      else if (purpose === "create") expect(durable.sessions.filter(row => row.user_id === member).map(row => row.id)).toEqual([r.currentSession]);
      else {
        // Native false, also required by SET-05, preserves both sessions.
        expect(durable.sessions.filter(row => row.user_id === member)).toHaveLength(2);
        expect(durable.sessions.some(row => row.id === r.currentSession)).toBe(true);
      }
      expect(rival.facts.filter(fact => fact.kind === "auth.methodUnlinked")).toHaveLength(denied ? 0 : 1);
    });

  it("does not let old proofs claim another identity after its email address is reused", async () => {
    const r = await prepare("email-commit");
    await r.auth.api.requestPasswordReset({ body: { email } });
    const staleReset = r.sent.at(-1)!.token;
    r.sent.length = 0;
    expect((await r.command()).status).toBe(200);
    const googleBefore = (await state()).methods.find(row => row.id === "matrix-google");
    await observer.query('insert into "user" (id,name,email,email_verified,updated_at) values ($1,$1,$2,false,now())', ["matrix-reused-address", email]);
    await observer.query("insert into account(id,user_id,provider_id,account_id,password,updated_at) values ('reused-password',$1,'credential',$1,$2,now())", ["matrix-reused-address",fixtureHash]);
    const before = await state();
    expect((await r.auth.api.resetPassword({ body: { token: staleReset, newPassword: replacement }, asResponse: true })).status).toBe(400);
    expect((await r.command()).status).toBe(400);
    expect(await state()).toEqual(before);
    expect((await state()).methods.find(row => row.id === "matrix-google")).toEqual(googleBefore);
    expect(before.users.find(row => row.id === member)?.email).toBe(newEmail);
    expect(before.users.find(row => row.id === "matrix-reused-address")?.email_verified).toBe(false);
  });
});
