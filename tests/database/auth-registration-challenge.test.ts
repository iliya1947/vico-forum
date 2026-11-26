import { readdir, readFile } from "node:fs/promises";
import { betterAuth } from "better-auth";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { betterAuthOptions } from "../../app/auth/auth.server";
import type { RegistrationChallengeConfig, RegistrationChallengeVerifier } from "../../app/auth/registration-challenge.server";
import { syntheticAttemptIngressSource } from "../../app/observability/attempt-source";
import { markVerifiedCredentialFixture } from "./verified-credential-fixture";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname) || !new URL(url).pathname.endsWith("_test")) throw new Error("Disposable loopback *_test DB required");
const schema = "auth05_registration_challenge_test";
const client = new Client({ connectionString: url, options: "-c search_path=" + schema });
const origin = "http://localhost:3000", password = "local-only-challenge-password";
const env = { BETTER_AUTH_URL: origin, BETTER_AUTH_SECRET: "auth05-local-only-long-secret-0123456789abcdef",
  GOOGLE_CLIENT_ID: "local-only-google", GOOGLE_CLIENT_SECRET: "local-only-google-secret" };
const snapshot = async () => (await client.query('select (select count(*)::int from "user") users,(select count(*)::int from account) accounts,(select count(*)::int from session) sessions')).rows[0];
const headers = { Origin: origin, "Content-Type": "application/json", "cf-connecting-ip": "203.0.113.50" };
beforeAll(async () => {
  await client.connect();
  await client.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const file of (await readdir("drizzle")).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort()) {
    await client.query((await readFile("drizzle/" + file, "utf8")).replaceAll('"public".', '"' + schema + '".'));
  }
});
beforeEach(async () => {
  await client.query('truncate "user",account,session,verification,rate_limit,auth_lifecycle_budget cascade');
  await client.query("update forum_registration_settings set google_registration_enabled=true,email_registration_enabled=true where id=1");
});
afterAll(async () => { await client.query("drop schema if exists " + schema + " cascade"); await client.end(); });

function fake() {
  const consumed = new Set<string>();
  const verifier: RegistrationChallengeVerifier = { verifyRegistrationChallenge: vi.fn<RegistrationChallengeVerifier["verifyRegistrationChallenge"]>(async ({ proof, expected }) => {
    if (proof === "unavailable" || proof === "uncertain") return { status: "unavailable" };
    if (proof === "throw-private") throw new Error("private-provider-detail");
    if (proof === "wrong-binding") return { status: "passed", binding: { ...expected, method: expected.method === "email" ? "google" : "email" } };
    if (!proof.startsWith("local-valid-") || consumed.has(proof)) return { status: "rejected" };
    consumed.add(proof);
    return { status: "passed", binding: expected };
  }) };
  return verifier;
}
async function runtime(config?: RegistrationChallengeConfig, mode?: string) {
  let googleEmail = "google@example.test";
  const mails: string[] = [], failures: string[] = [];
  const options = betterAuthOptions(drizzle(client), { ...env, AUTH_REGISTRATION_CHALLENGE_MODE: mode }, undefined, false, undefined, {
    registrationChallenge: config, ingress: syntheticAttemptIngressSource("203.0.113.50"),
    observeRegistrationChallengeFailure: code => failures.push(code),
    mail: {
      async buildActionURL(input) { return origin + "/en/verify-email?token=" + input.token; },
      async sendAuthMail(input) { mails.push(input.purpose); return { status: "accepted" }; },
    },
  });
  const auth = betterAuth({ ...options, socialProviders: { google: {
    clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, verifyIdToken: async () => true,
    getUserInfo: async () => ({ user: { email: googleEmail, emailVerified: true, name: "Synthetic Google" },
      data: { sub: "google-" + googleEmail, email: googleEmail, email_verified: true, name: "Synthetic Google",
        iss: "https://accounts.google.com", aud: env.GOOGLE_CLIENT_ID, azp: env.GOOGLE_CLIENT_ID, exp: 2000000000, iat: 1900000000,
        family_name: "Google", given_name: "Synthetic", picture: "" } }),
  } } });
  const context = await auth.$context;
  const google = context.socialProviders.find(provider => provider.id === "google")!;
  google.validateAuthorizationCode = async () => ({ accessToken: "synthetic-local-access" });
  const post = (path: string, body: object) => auth.handler(new Request(origin + "/api/auth/" + path, { method: "POST", headers, body: JSON.stringify(body) }));
  return { auth, mails, failures, post,
    setGoogleEmail: (email: string) => { googleEmail = email; },
    signup: (email: string, proof?: string) => post("sign-up/email", { email, password, name: "Synthetic member", registrationChallengeProof: proof }),
    google: (email: string, proof?: string) => { googleEmail = email; return post("sign-in/social", { provider: "google", idToken: { token: "synthetic-id-token" }, additionalData: { registrationChallengeProof: proof } }); },
    googleDirect: (email: string, proof?: string) => { googleEmail = email; return auth.api.signInSocial({ headers: new Headers(headers), asResponse: true,
      body: { provider: "google", idToken: { token: "synthetic-id-token" }, additionalData: { registrationChallengeProof: proof } } }); },
    async start(email: string, proof?: string, additionalData: Record<string, unknown> = {}) {
      googleEmail = email;
      const response = await post("sign-in/social", { provider: "google", callbackURL: "/en", errorCallbackURL: "/en/sign-up", additionalData: { ...additionalData, registrationChallengeProof: proof } });
      expect(response.status).toBe(200);
      const value = await response.json() as { url: string };
      const state = new URL(value.url).searchParams.get("state")!;
      const cookie = response.headers.getSetCookie().map(value => value.split(";", 1)[0]).join("; ");
      return { state, cookie, response };
    },
    callback: (state: string, cookie: string) => auth.handler(new Request(origin + "/api/auth/callback/google?code=synthetic-code&state=" + encodeURIComponent(state), { headers: { cookie } })),
  };
}

describe("AUTH-05 actual fresh-create challenge admission", () => {
  it("bounds HTTP registration input before parsing or verifier/domain work", async () => {
    const verifier=fake(),r=await runtime({mode:"required",verifier});
    expect((await r.signup("large@example.test","x".repeat(40_000))).status).toBe(413);
    expect((await r.google("large-google@example.test","x".repeat(40_000))).status).toBe(413);
    for (const path of ["SIGN-UP/EMAIL", "sign-up/%65mail", "sign-up/email/"]) {
      expect((await r.post(path,{email:"alias-large@example.test",name:"Alias",password,registrationChallengeProof:"x".repeat(40_000)})).status).toBe(413);
    }
    expect(verifier.verifyRegistrationChallenge).not.toHaveBeenCalled();
    expect(await snapshot()).toEqual({users:0,accounts:0,sessions:0});
    expect((await client.query("select key from auth_lifecycle_budget")).rowCount).toBe(0);
    expect(r.mails).toEqual([]);
  });
  it.each([["required",503], ["invalid-mode",503]] as const)("fails closed for %s without a verifier in both identity methods", async (mode, status) => {
    const r = await runtime(undefined, mode);
    expect((await r.signup("required@example.test", "local-valid-private")).status).toBe(status);
    expect((await r.google("required-google@example.test", "local-valid-private")).status).toBe(status);
    expect(await snapshot()).toEqual({ users: 0, accounts: 0, sessions: 0 });
    expect(r.mails).toEqual([]);
    expect(r.failures).toEqual(["unavailable", "unavailable"]);
  });
  it.each([["expired",403], ["wrong-binding",403], ["unavailable",503], ["uncertain",503], ["throw-private",503]] as const)("rejects %s without identity/mail effects and preserves safe outcomes", async (proof, status) => {
    const verifier = fake(), r = await runtime({ mode: "required", verifier });
    for (const response of [await r.signup("denied@example.test", proof), await r.google("denied-google@example.test", proof)]) {
      expect(response.status).toBe(status);
      expect(await response.text()).not.toContain("private-provider-detail");
      expect(response.headers.getSetCookie().some(value => value.includes("session_token="))).toBe(false);
    }
    expect(await snapshot()).toEqual({ users: 0, accounts: 0, sessions: 0 });
    expect(r.mails).toEqual([]);
    expect(r.failures).toHaveLength(2);
    const counters = await client.query("select key,count from auth_lifecycle_budget");
    expect(counters.rowCount).toBeGreaterThan(0);
    expect(JSON.stringify(counters.rows)).not.toMatch(/example\.test|203\.0\.113|private/);
  });
  it.each([
    { label: "missing", proof: undefined, configured: true, status: 403, code: "vico_registration_challenge_rejected", observation: "invalid" },
    { label: "rejected", proof: "rejected", configured: true, status: 403, code: "vico_registration_challenge_rejected", observation: "invalid" },
    { label: "unavailable", proof: "unavailable", configured: true, status: 503, code: "vico_registration_challenge_unavailable", observation: "unavailable" },
    { label: "unconfigured", proof: "local-valid-proof", configured: false, status: 503, code: "vico_registration_challenge_unavailable", observation: "unavailable" },
  ])("F01: open email registration has identical existing/fresh $label outcomes in HTTP and direct signup", async ({ proof, configured, status, code, observation }) => {
    const existing = "f01-existing@example.test", fresh = "f01-fresh@example.test";
    const setup = await runtime();
    expect((await setup.signup(existing)).status).toBe(200);
    const verifier = fake();
    const r = await runtime(configured ? { mode: "required", verifier } : { mode: "required" });
    const before = await snapshot();
    const proofsBefore = (await client.query("select count(*)::int as n from verification")).rows;
    const responses = [await r.signup(existing, proof), await r.signup(fresh, proof)];
    const bodies = [];
    for (const response of responses) {
      expect(response.status).toBe(status);
      expect(response.headers.get("Cache-Control")).toContain("no-store");
      expect(response.headers.getSetCookie().some(value => value.includes("session_token="))).toBe(false);
      const body = await response.json();
      expect(body).toMatchObject({ code, message: "Registration unavailable" });
      expect(JSON.stringify(body)).not.toMatch(/f01-existing|f01-fresh|local-valid-proof/);
      bodies.push(body);
    }
    expect(bodies[0]).toEqual(bodies[1]);
    const direct = (email: string) => r.auth.api.signUpEmail({
      headers: new Headers(headers), body: { email, password, name: "Synthetic member", registrationChallengeProof: proof },
    });
    for (const email of [existing, fresh]) {
      await expect(direct(email)).rejects.toMatchObject({
        status: status === 403 ? "FORBIDDEN" : "SERVICE_UNAVAILABLE", body: { code, message: "Registration unavailable" },
      });
    }
    expect(await snapshot()).toEqual(before);
    expect((await client.query("select count(*)::int as n from verification")).rows).toEqual(proofsBefore);
    expect(r.mails).toEqual([]);
    expect(r.failures).toEqual(Array(4).fill(observation));
    expect(verifier.verifyRegistrationChallenge).toHaveBeenCalledTimes(configured && proof ? 4 : 0);
    // The original signup plus both HTTP and both direct attempts are spent;
    // rejecting either address is not a budget bypass or a second spend.
    expect((await client.query("select count from auth_lifecycle_budget order by count")).rows.map(row => row.count)).toEqual([2, 3, 5, 5]);
  });

  it("rechecks the actual SET-02 create policy after a passed email proof", async () => {
    const verifier: RegistrationChallengeVerifier = {
      async verifyRegistrationChallenge({ expected }) {
        await client.query("update forum_registration_settings set email_registration_enabled=false where id=1");
        return { status: "passed", binding: expected };
      },
    };
    const r = await runtime({ mode: "required", verifier });
    const response = await r.signup("f01-closed-during-proof@example.test", "synthetic-valid");
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "vico_email_registration_closed" });
    expect(await snapshot()).toEqual({ users: 0, accounts: 0, sessions: 0 });
    expect(r.mails).toEqual([]);
    expect(r.failures).toEqual([]);
  });

  it("admits explicit verified email and Google proofs, rejects reuse and keeps proof out of native storage/DTO", async () => {
    const r = await runtime({ mode: "required", verifier: fake() });
    const response = await r.signup("passed@example.test", "local-valid-private-email");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: true, token: null });
    expect(await snapshot()).toEqual({ users: 1, accounts: 1, sessions: 0 });
    expect(r.mails).toEqual(["email-verification"]);
    const duplicate = await r.signup("passed@example.test", "local-valid-private-duplicate");
    expect(duplicate.status).toBe(200);
    expect(await duplicate.json()).toEqual({ status: true, token: null });
    expect(await snapshot()).toEqual({ users: 1, accounts: 1, sessions: 0 });
    expect(r.mails).toEqual(["email-verification"]);
    expect((await r.signup("replay@example.test", "local-valid-private-email")).status).toBe(403);
    expect((await r.google("google-passed@example.test", "local-valid-private-google")).status).toBe(200);
    const stored = await client.query("select row_to_json(u)::text value from \"user\" u union all select value from verification");
    expect(JSON.stringify(stored.rows)).not.toContain("local-valid-private");
    expect(await snapshot()).toEqual({ users: 2, accounts: 2, sessions: 1 });
  });
  it("binds the receipt to genuine persisted OAuth serverContext and consumes native state once", async () => {
    const verifier = fake(), r = await runtime({ mode: "required", verifier });
    const started = await r.start("redirect@example.test", "local-valid-private-oauth", { serverContext: { vicoRegistrationChallenge: { decision: "passed" } } });
    const state = (await client.query<{ value: string }>("select value from verification where identifier=$1", ["auth-state:" + started.state])).rows[0];
    expect(state.value).not.toContain("local-valid-private-oauth");
    expect(JSON.parse(state.value).serverContext.vicoRegistrationChallenge).toMatchObject({ purpose: "fresh-registration", method: "google", decision: "passed", nonce: expect.stringMatching(/^[a-f0-9-]{36}$/) });
    const completed = await r.callback(started.state, started.cookie);
    expect(completed.status).toBe(302);
    expect(new URL(completed.headers.get("Location")!, origin).pathname).toBe("/en");
    expect(verifier.verifyRegistrationChallenge).toHaveBeenCalledTimes(1);
    const committed = await snapshot();
    expect(committed).toEqual({ users: 1, accounts: 1, sessions: 1 });
    expect((await r.callback(started.state, started.cookie)).status).toBe(302);
    expect(await snapshot()).toEqual(committed);
  });
  it("does not trust client serverContext without a verified exchange", async () => {
    const r = await runtime({ mode: "required", verifier: fake() });
    const started = await r.start("spoofed@example.test", undefined, { serverContext: { vicoRegistrationChallenge: { decision: "passed" } } });
    const response = await r.callback(started.state, started.cookie);
    expect(new URL(response.headers.get("Location")!, origin).searchParams.get("error")).toBe("vico_registration_challenge_rejected");
    expect(await snapshot()).toEqual({ users: 0, accounts: 0, sessions: 0 });
  });
  it("keeps existing email/Google login, explicit linking and recovery independent of required-without-verifier", async () => {
    const setup = await runtime();
    await setup.signup("existing@example.test");
    await markVerifiedCredentialFixture(client,"existing@example.test");
    await setup.google("existing-google@example.test");
    const r = await runtime(undefined, "required");
    await client.query("update forum_registration_settings set google_registration_enabled=false,email_registration_enabled=false where id=1");
    const before = (await client.query("select key,count,expires_at from auth_lifecycle_budget order by key")).rows;
    const login = await r.post("sign-in/email", { email: "existing@example.test", password });
    expect(login.status).toBe(200);
    expect((await r.google("existing-google@example.test")).status).toBe(200);
    expect((await client.query("select key,count,expires_at from auth_lifecycle_budget order by key")).rows).toEqual(before);
    const user = await login.clone().json() as { user: { id: string } };
    const cookie = login.headers.getSetCookie().find(value => value.includes("session_token="))!.split(";", 1)[0];
    r.setGoogleEmail("existing@example.test");
    const linked = await r.auth.api.linkSocialAccount({ headers: new Headers({ ...headers, cookie, "x-vico-link-user": user.user.id }),
      body: { provider: "google", idToken: { token: "synthetic-id-token" } }, asResponse: true });
    expect(linked.status).toBe(200);
    const duplicate = await r.signup("existing@example.test", "client-boolean-is-not-proof");
    expect(duplicate.status).toBe(200);
    expect(await duplicate.json()).toEqual({ status: true, token: null });
    const beforeClosedSignup = await snapshot();
    const closed = await r.signup("fresh-while-closed@example.test", "client-boolean-is-not-proof");
    expect(closed.status).toBe(403);
    expect(await closed.json()).toMatchObject({ code: "vico_email_registration_closed" });
    expect(await snapshot()).toEqual(beforeClosedSignup);
    expect((await r.post("request-password-reset", { email: "existing@example.test" })).status).toBe(200);
    expect(r.mails).toEqual(["password-reset"]);
    expect(r.failures).toEqual([]);
  });
  it("limits fresh Google creation atomically before its identity transaction while existing login remains available", async () => {
    const r = await runtime();
    for (let i = 0; i < 5; i++) expect((await r.googleDirect("burst-" + i + "@example.test")).status).toBe(200);
    const denied = await r.google("burst-denied@example.test");
    expect(denied.status).toBe(429);
    expect(denied.headers.get("Retry-After")).toMatch(/^\d+$/);
    expect(denied.headers.get("X-Retry-After")).toBe(denied.headers.get("Retry-After"));
    expect((await r.google("burst-0@example.test")).status).toBe(200);
    expect((await snapshot()).users).toBe(5);
    expect((await client.query("select count from auth_lifecycle_budget")).rows).toEqual([{ count: 5 }]);
  });

  it.each(["tampered", "missing-cookie", "expired-state", "wrong-receipt", "policy-enabled-after-start"] as const)("denies OAuth %s without identity/session effects", async kind => {
    const verifier = fake();
    const r = await runtime(kind === "policy-enabled-after-start" ? { mode: "disabled" } : { mode: "required", verifier });
    const started = await r.start("negative-" + kind + "@example.test", "local-valid-" + kind);
    if (kind === "expired-state") await client.query("update verification set value=jsonb_set(value::jsonb,'{expiresAt}',to_jsonb(1))::text where identifier=$1", ["auth-state:" + started.state]);
    if (kind === "wrong-receipt") await client.query("update verification set value=jsonb_set(value::jsonb,'{serverContext,vicoRegistrationChallenge,method}',to_jsonb('email'::text))::text where identifier=$1", ["auth-state:" + started.state]);
    const callbackRuntime = kind === "policy-enabled-after-start" ? await runtime({ mode: "required", verifier }) : r;
    const response = await callbackRuntime.callback(kind === "tampered" ? started.state + "x" : started.state, kind === "missing-cookie" ? "" : started.cookie);
    expect(response.status).toBe(302);
    expect(new URL(response.headers.get("Location")!, origin).searchParams.has("error")).toBe(true);
    expect(response.headers.getSetCookie().some(value => value.includes("session_token="))).toBe(false);
    expect(await snapshot()).toEqual({ users: 0, accounts: 0, sessions: 0 });
    expect(r.mails).toEqual([]);
  });

  it("rechecks independent registration flags after a verified OAuth challenge", async () => {
    const r = await runtime({ mode: "required", verifier: fake() });
    const started = await r.start("closed-after-proof@example.test", "local-valid-closed");
    await client.query("update forum_registration_settings set google_registration_enabled=false where id=1");
    const response = await r.callback(started.state, started.cookie);
    expect(new URL(response.headers.get("Location")!, origin).searchParams.get("error")).toBe("vico_google_registration_closed");
    expect(await snapshot()).toEqual({ users: 0, accounts: 0, sessions: 0 });
    expect(r.failures).toEqual([]);
  });

  it("shares normalized mail budgets between real HTTP/direct signup and resend without double spend or alias bypass", async () => {
    const r = await runtime();
    await r.signup("shared-target@example.test");
    await r.auth.api.sendVerificationEmail({ body: { email: "SHARED-TARGET@example.test" } });
    expect((await r.post("send-verification-email", { email: "shared-target@example.test" })).status).toBe(200);
    await expect(r.auth.api.sendVerificationEmail({ body: { email: "shared-target@example.test" } })).rejects.toMatchObject({ status: "TOO_MANY_REQUESTS" });
    const counts = (await client.query("select count from auth_lifecycle_budget order by count")).rows.map(row => row.count);
    expect(counts).toEqual([1, 3, 4]); // signup; target three; network includes denied attempt
    expect(r.mails).toHaveLength(3);
    for (const path of ["send-verification-email/", "SEND-VERIFICATION-EMAIL", "send-%76erification-email"]) {
      const response = await r.post(path, { email: "SHARED-TARGET@example.test" });
      expect([404,405,429]).toContain(response.status);
    }
    expect(r.mails).toHaveLength(3);
  });

  it("spends failed own operations once across HTTP/direct email/unlink/create paths and forwards retry timing", async () => {
    const r = await runtime();
    await r.google("own-shared@example.test");
    const login = await r.google("own-shared@example.test");
    const cookie = login.headers.getSetCookie().find(value => value.includes("session_token="))!.split(";", 1)[0];
    const current = await r.auth.api.getSession({ headers: new Headers({ cookie }) });
    const ownHeaders = new Headers({ ...headers, cookie, "x-vico-account-user": current!.user.id,
      "x-vico-account-session": current!.session.id, "x-vico-credential-user": current!.user.id,
      "x-vico-credential-session": current!.session.id });
    const before = await snapshot();
    for (let i=0;i<5;i++) await expect(r.auth.api.unlinkAccount({ headers: ownHeaders, body: { accountId: "not-owned-" + i } })).rejects.toMatchObject({ status: "CONFLICT" });
    const response = await r.auth.handler(new Request(origin + "/api/auth/change-email", { method: "POST", headers: ownHeaders, body: JSON.stringify({ newEmail: "limited@example.test" }) }));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toMatch(/^\d+$/);
    expect(response.headers.get("X-Retry-After")).toBe(response.headers.get("Retry-After"));
    await expect(r.auth.api.requestCredentialCreation({ headers: ownHeaders, body: {} })).rejects.toMatchObject({ status: "TOO_MANY_REQUESTS" });
    expect(await snapshot()).toEqual(before);
    expect(r.mails).toEqual([]);
    expect((await client.query("select id from verification")).rowCount).toBe(0);
  });

  it("fails closed on classified common-budget storage outage for canonical/direct and native Google creation", async () => {
    const r = await runtime();
    const original = client.query.bind(client);
    const fault = vi.spyOn(client,"query").mockImplementation(((...args: unknown[]) => {
      const statement = args[0];
      const text = typeof statement === "string" ? statement : (statement as { text?: string })?.text;
      if (text?.includes("auth_lifecycle_budget")) return Promise.reject(Object.assign(new Error("private-budget-storage-failure"), { code: "ECONNRESET" }));
      return Reflect.apply(original, client, args);
    }) as never);
    try {
      const signup = await r.signup("unavailable-budget@example.test");
      expect(signup.status).toBe(503);
      expect(await signup.text()).not.toContain("private-budget-storage-failure");
      await expect(r.auth.api.sendVerificationEmail({ body: { email: "missing@example.test" } })).rejects.toMatchObject({ status: "SERVICE_UNAVAILABLE" });
      expect((await r.post("request-password-reset", { email: "missing@example.test" })).status).toBe(503);
      expect((await r.googleDirect("unavailable-google@example.test")).status).toBe(503);
    } finally { fault.mockRestore(); }
    expect(await snapshot()).toEqual({ users: 0, accounts: 0, sessions: 0 });
    expect(r.mails).toEqual([]);
    expect((await client.query("select id from verification")).rowCount).toBe(0);
  });
  it("preserves classified own-session lookup outages before credential issuance or confirmation", async () => {
    const r = await runtime();
    const login = await r.google("session-outage@example.test");
    const cookie = login.headers.getSetCookie().find(value => value.includes("session_token="))!.split(";",1)[0];
    const current = await r.auth.api.getSession({ headers: new Headers({ cookie }) });
    const ownHeaders = new Headers({ ...headers,cookie,"x-vico-credential-user":current!.user.id,"x-vico-credential-session":current!.session.id });
    const before = await snapshot();
    const original = client.query.bind(client);
    const fault = vi.spyOn(client,"query").mockImplementation(((...args: unknown[]) => {
      const statement = args[0];
      const text = typeof statement === "string" ? statement : (statement as { text?: string })?.text;
      if (text?.includes('from "session"')) return Promise.reject(Object.assign(new Error("private-session-storage-failure"), { code: "ECONNRESET" }));
      return Reflect.apply(original,client,args);
    }) as never);
    try {
      const response = await r.auth.handler(new Request(origin+"/api/auth/request-password-create",{method:"POST",headers:ownHeaders,body:"{}"}));
      expect(response.status).toBe(503);
      await expect(r.auth.api.requestCredentialCreation({headers:ownHeaders,body:{}})).rejects.toMatchObject({status:"SERVICE_UNAVAILABLE"});
      await expect(r.auth.api.createCredential({headers:ownHeaders,body:{token:"invalid",newPassword:password}})).rejects.toMatchObject({status:"SERVICE_UNAVAILABLE"});
      await expect(r.auth.api.requestCredentialCreation({headers:new Headers(),body:{}})).rejects.toMatchObject({status:"UNAUTHORIZED"});
    } finally {fault.mockRestore();}
    expect(await snapshot()).toEqual(before);
    expect(r.mails).toEqual([]);
    expect((await client.query("select id from verification")).rowCount).toBe(0);
  });
});
