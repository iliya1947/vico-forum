import { readdir, readFile } from "node:fs/promises";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createHyperdriveAuthRuntime, type AuthCreationObserver, type BetterAuthEnvironment,
} from "../../app/auth/auth.server";
import { PostgresAuthFactWriter, type AuthTransitionFact } from "../../db/owner-auth-facts";

const url = process.env.DATABASE_URL!;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA02 native password tests require disposable loopback *_test DB");
}
const schema = "sa02_auth_password_test";
const origin = "http://localhost:3000";
const oldPassword = "native-password-123";
const newPassword = "different-native-password-456";
const env: BetterAuthEnvironment = {
  BETTER_AUTH_URL: origin,
  BETTER_AUTH_SECRET: "sa02-native-password-local-secret-longer-than-32-characters",
  GOOGLE_CLIENT_ID: "synthetic-local-google",
  GOOGLE_CLIENT_SECRET: "synthetic-local-google-secret",
};
const client = new Client({ connectionString: url, options: "-c search_path=" + schema });
const pool = new Pool({ connectionString: url, options: "-c search_path=" + schema });
const connected = (connectionString: string) => new Client({
  connectionString, options: "-c search_path=" + schema,
});
const writer = new PostgresAuthFactWriter(pool);
function observer(events: AuthTransitionFact[]): AuthCreationObserver {
  return { capture: fact => { events.push(fact); }, trustedActorFor: () => null };
}
function authRequest(path: string, body: object, cookie?: string) {
  return new Request(origin + "/api/auth/" + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json", Origin: origin,
      "cf-connecting-ip": "203.0.113.75",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}
async function createActor(email: string, events: AuthTransitionFact[]) {
  const auth = createHyperdriveAuthRuntime(url, env, connected, undefined, observer(events));
  const response = await auth.handle(authRequest("sign-up/email", {
    name: "Password actor", email, password: oldPassword,
  }));
  expect(response.status).toBe(200);
  const cookie = response.headers.getSetCookie().find(item => item.includes("session_token="))?.split(";",1)[0];
  expect(cookie).toBeTruthy();
  const resolved = (await auth.getSession(new Headers({ Cookie: cookie! }))).session;
  expect(resolved).not.toBeNull();
  const savedAccount = (await client.query<{ id: string; password: string }>(
    "select id,password from account where user_id=$1 and provider_id='credential'",
    [resolved!.user.id],
  )).rows[0];
  expect(savedAccount).toBeDefined();
  events.splice(0);
  return { auth, userId: resolved!.user.id, sessionId: resolved!.session.id,
    cookie: cookie!, accountId: savedAccount.id, beforeHash: savedAccount.password };
}
async function passwordHash(accountId: string) {
  return (await client.query<{ password: string }>(
    "select password from account where id=$1",[accountId])).rows[0]?.password;
}
beforeAll(async () => {
  await client.connect();
  await client.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for(const file of (await readdir("drizzle")).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort()) {
    await client.query((await readFile("drizzle/" + file, "utf8"))
      .replaceAll('"public".','"' + schema + '".'));
  }
});
beforeEach(async () => {
  // Preserve actual Better Auth rate limiting within each independent test.
  // Avoid sharing a synthetic IP rate-limit budget across separate cases.
  await client.query("truncate rate_limit");
});
afterAll(async () => {
  await pool.end();
  await client.query("drop schema if exists " + schema + " cascade");
  await client.end();
});

describe("SA02 native Better Auth 1.7.7 credential password changes", () => {
  it("emits one persisted-row fact for an actual canonical HTTP password update", async () => {
    const events: AuthTransitionFact[] = [];
    const actor = await createActor("sa02-password-http@example.test",events);
    const response = await actor.auth.handle(authRequest("change-password", {
      currentPassword: oldPassword, newPassword, revokeOtherSessions: false,
    },actor.cookie));
    expect(response.status).toBe(200);
    expect(await passwordHash(actor.accountId)).not.toBe(actor.beforeHash);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind:"auth.passwordChanged",userId:actor.userId,
      accountId:actor.accountId,actorUserId:actor.userId,
    });
    expect(events[0]).toHaveProperty("operationId",expect.stringMatching(
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/));
    const saved=await writer.append(events[0]);
    expect(saved.inserted).toBe(true);
    expect((await writer.append(events[0])).inserted).toBe(false);
    const rows=(await client.query<{ entity_id: string; target_user_id: string;
      actor_user_id: string; payload: Record<string,string>; correlation_id:string; }>(
      "select entity_id,target_user_id,actor_user_id,payload,correlation_id from owner_events where id=$1",
      [saved.id])).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({entity_id:actor.accountId,target_user_id:actor.userId,
      actor_user_id:actor.userId,payload:{}});
    expect(rows[0].correlation_id).toBe((events[0] as { operationId:string }).operationId);
    expect(JSON.stringify(rows)).not.toContain(actor.beforeHash);
    expect(JSON.stringify(rows)).not.toContain(oldPassword);
    expect(JSON.stringify(rows)).not.toContain(newPassword);
    expect((await actor.auth.handle(authRequest("sign-in/email",{
      email:"sa02-password-http@example.test",password:oldPassword,
    }))).status).not.toBe(200);
    expect((await actor.auth.handle(authRequest("sign-in/email",{
      email:"sa02-password-http@example.test",password:newPassword,
    }))).status).toBe(200);
  });

  it("rejects invalid, wrong-password and unauthenticated attempts without success facts", async () => {
    const events:AuthTransitionFact[]=[];
    const actor=await createActor("sa02-password-denied@example.test",events);
    const wrong=await actor.auth.handle(authRequest("change-password",{
      currentPassword:"wrong-current-password",newPassword,
    },actor.cookie));
    expect(wrong.status).not.toBe(200);
    const short=await actor.auth.handle(authRequest("change-password",{
      currentPassword:oldPassword,newPassword:"short",
    },actor.cookie));
    expect(short.status).not.toBe(200);
    const guest=await actor.auth.handle(authRequest("change-password",{
      currentPassword:oldPassword,newPassword,
    }));
    expect(guest.status).not.toBe(200);
    expect(events).toHaveLength(0);
    expect(await passwordHash(actor.accountId)).toBe(actor.beforeHash);
  });

  it("also observes the existing Account & security direct operation through canonical HTTP routing", async () => {
    const events:AuthTransitionFact[]=[];
    const actor=await createActor("sa02-password-direct@example.test",events);
    await actor.auth.security!.changePassword(new Headers({Cookie:actor.cookie}),
      {userId:actor.userId,sessionId:actor.sessionId},oldPassword,newPassword);
    expect(await passwordHash(actor.accountId)).not.toBe(actor.beforeHash);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind:"auth.passwordChanged",userId:actor.userId,accountId:actor.accountId,
      actorUserId:actor.userId,
    });
  });

  it("preserves the canonical credential mutation if telemetry fails", async () => {
    const events:AuthTransitionFact[]=[];
    const actor=await createActor("sa02-password-fault@example.test",events);
    const broken = createHyperdriveAuthRuntime(url,env,connected,undefined,{
      capture: () => {throw new Error("observer unavailable");},
      trustedActorFor: () => null,
    });
    const response=await broken.handle(authRequest("change-password",{
      currentPassword:oldPassword,newPassword,
    },actor.cookie));
    expect(response.status).toBe(200);
    expect(await passwordHash(actor.accountId)).not.toBe(actor.beforeHash);
    expect(events).toHaveLength(0);
  });
});
