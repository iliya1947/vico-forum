import { readdir, readFile } from "node:fs/promises";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createHyperdriveAuthRuntime, type BetterAuthEnvironment, type AuthCreationObserver,
} from "../../app/auth/auth.server";
import { RequestAuthFactCollector } from "../../app/observability/auth-fact-collector.server";
import { PostgresAuthFactWriter, type AuthTransitionFact } from "../../db/owner-auth-facts";
import { PostgresOwnerSystemMonitoring } from "../../db/owner-system-monitoring";

const url = process.env.DATABASE_URL!;
if (!url || !["127.0.0.1","localhost"].includes(new URL(url).hostname) ||
    !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA02 native creations test requires disposable loopback *_test DB");
}
const schema = "sa02_auth_creations_test";
const origin = "http://localhost:3000";
const env: BetterAuthEnvironment = {
  BETTER_AUTH_URL: origin,
  BETTER_AUTH_SECRET: "sa02-native-creations-local-secret-minimum-32-characters",
  GOOGLE_CLIENT_ID: "synthetic-local-google",
  GOOGLE_CLIENT_SECRET: "synthetic-local-google-secret",
};
const client = new Client({ connectionString: url, options: "-c search_path=" + schema });
const pool = new Pool({ connectionString: url, options: "-c search_path=" + schema });
const connected = (value: string) => new Client({ connectionString: value,
  options: "-c search_path=" + schema });
const factWriter = new PostgresAuthFactWriter(pool);
const allFacts = async () => (await client.query<{
  kind: string; target_user_id: string; entity_id: string; payload: Record<string,string>;
  actor_user_id: string | null; source: string;
}>("select kind,target_user_id,entity_id,payload,actor_user_id,source from owner_events where source='auth' order by owner_events.position")).rows;
const submit = (path: string, data: unknown) => new Request(origin + "/api/auth/" + path, {
  method: "POST",
  headers: { "Content-Type":"application/json", Origin:origin },
  body: JSON.stringify(data),
});
const email = "sa02-created@example.test", password = "synthetic-secret-123";

beforeAll(async () => {
  await client.connect();
  await client.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for(const file of (await readdir("drizzle")).filter(n=>/^\d{4}_.+\.sql$/.test(n)).sort()) {
    const sql=(await readFile("drizzle/" + file,"utf8"))
      .replaceAll('"public".','"' + schema + '".');
    await client.query(sql);
  }
});
afterAll(async () => {
  await pool.end();
  await client.query("drop schema if exists " + schema + " cascade");
  await client.end();
});

describe("SA02 actual Better Auth v1.7.7 committed-create facts", () => {
  it("records persisted user, credential account and session IDs, not HTTP guesses or credentials", async () => {
    const lost: number[] = [];
    const facts = new RequestAuthFactCollector(() => ({
      append: input => factWriter.append(input),
      close: async () => undefined,
    }), count => lost.push(count));
    const auth = createHyperdriveAuthRuntime(url, env, connected, undefined, facts);
    const response = await auth.handle(submit("sign-up/email",
      { email, name:"Native created", password }));
    expect(response.status).toBe(200);
    expect(await allFacts()).toHaveLength(0); // Worker-style flush is separate.
    await facts.flush();
    expect(lost).toEqual([]);
    const user = (await client.query<{ id:string }>(
      'select id from "user" where email=$1',[email])).rows[0];
    expect(user?.id).toBeTruthy();
    const account = (await client.query<{id:string}>(
      'select id from account where user_id=$1 and provider_id=$2',[user.id,"credential"])).rows[0];
    const session = (await client.query<{id:string}>(
      'select id from session where user_id=$1',[user.id])).rows[0];
    const persisted = await allFacts();
    expect(persisted).toHaveLength(3);
    expect(persisted.map(e=>e.kind)).toEqual([
      "account.created","auth.methodLinked","auth.sessionCreated",
    ]);
    expect(persisted.map(e=>e.entity_id)).toEqual([user.id,account.id,session.id]);
    expect(persisted.map(e=>e.target_user_id)).toEqual([user.id,user.id,user.id]);
    expect(persisted[1].payload).toEqual({method:"password",linkContext:"registration"});
    expect(persisted.every(e=>e.actor_user_id===null)).toBe(true);
    expect(JSON.stringify(persisted)).not.toContain(email);
    expect(JSON.stringify(persisted)).not.toContain(password);
    expect(JSON.stringify(persisted)).not.toContain("token");
  });

  it("records a real returning sign-in session creation, never another user or linked method", async () => {
    const queued: AuthTransitionFact[] = [];
    const collector: AuthCreationObserver = {
      capture: fact => queued.push(fact),
      trustedActorFor: () => null,
    };
    const auth = createHyperdriveAuthRuntime(url, env, connected, undefined, collector);
    const response=await auth.handle(submit("sign-in/email",{email,password}));
    expect(response.status).toBe(200);
    expect(queued).toHaveLength(1);
    expect(queued[0].kind).toBe("auth.sessionCreated");
    await factWriter.append(queued[0]);
    expect((await allFacts()).filter(e=>e.kind==="account.created")).toHaveLength(1);
    expect((await allFacts()).filter(e=>e.kind==="auth.methodLinked")).toHaveLength(1);
    expect((await allFacts()).filter(e=>e.kind==="auth.sessionCreated")).toHaveLength(2);
  });

  it("has no phantom creation events on rejected policy admission", async () => {
    await client.query("update forum_registration_settings set email_registration_enabled=false where id=1");
    const queued: AuthTransitionFact[]=[];
    try {
      const auth=createHyperdriveAuthRuntime(url,env,connected,undefined,{
        capture: fact=>queued.push(fact), trustedActorFor:()=>null,
      });
      const response=await auth.handle(submit("sign-up/email",{
        email:"sa02-rejected@example.test",name:"Rejected",password,
      }));
      expect(response.status).toBe(403);
      expect(queued).toHaveLength(0);
      expect((await client.query(
        'select id from "user" where email=$1',["sa02-rejected@example.test"])).rows).toHaveLength(0);
    } finally {
      await client.query("update forum_registration_settings set email_registration_enabled=true where id=1");
    }
  });

  it("does not veto a real committed creation if telemetry callback throws", async () => {
    const auth=createHyperdriveAuthRuntime(url,env,connected,undefined,{
      capture: () => { throw new Error("collector unavailable"); },
      trustedActorFor: () => null,
    });
    const response=await auth.handle(submit("sign-up/email",{
      email:"sa02-hook-failure@example.test",name:"Should persist",password,
    }));
    expect(response.status).toBe(200);
    const result=await client.query('select id from "user" where email=$1',
      ["sa02-hook-failure@example.test"]);
    expect(result.rows).toHaveLength(1);
    expect((await allFacts()).filter(e=>e.target_user_id===result.rows[0].id)).toHaveLength(0);
  });

  it("does not mislabel auth records as SA01 System events before source-aware SA02 History", async () => {
    const monitoring = new PostgresOwnerSystemMonitoring(pool,"test");
    const timeline=await monitoring.readTimeline();
    expect(timeline.entries.filter(e=>e.origin==="system-event"&&e.source==="auth")).toHaveLength(0);
    const keys=timeline.entries.filter(e=>e.origin==="system-event").map(e=>e.monitorKey);
    expect(keys.every(key=>key?.startsWith("system."))).toBe(true);
  });
});
