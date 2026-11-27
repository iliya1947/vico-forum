import { AccountSecurityLifecycle, AccountMethodConflictError } from "../../app/auth/account-security-lifecycle.server";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountInactiveError } from "../../db/account-state";
import { createAuth } from "../../app/auth/auth.server";
import {
  AuthLifecycleState, InvalidLifecycleProofError, LifecycleStateInvariantError,
  type IssuedLifecycleProof, type LifecycleIntent, type LifecycleProof,
} from "../../app/auth/lifecycle-state.server";
import { AuthLifecycleTransaction } from "../../app/auth/lifecycle-transaction.server";
import { createEmailVerificationToken } from "better-auth/api";
import { hashPassword, signJWT, verifyPassword } from "better-auth/crypto";
import { AuthCredentialLifecycle } from "../../app/auth/credential-lifecycle.server";
import { decodeEmailVerificationProof, signEmailVerificationProof } from "../../app/auth/email-verification-proof.server";
import { installRegistrationPolicyFixture } from "./registration-policy-fixture";
import { AuthEmailVerification } from "../../app/auth/email-verification.server";
import { AuthLifecycleBudget, LifecycleBudgetExceededError } from "../../app/auth/lifecycle-budget.server";
import type { AuthMailRuntime } from "../../app/auth/auth-mail.server";
import type { OwnerOperationalFact } from "../../app/observability/operational-facts";
import type { AuthTransitionFact } from "../../db/owner-auth-facts";
import type { AuthMailStatus } from "../../app/auth/auth-mail-contract.server";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname) ||
    !new URL(url).pathname.endsWith("_test")) {
  throw new Error("Auth lifecycle state requires a disposable loopback *_test DB");
}
const schema = "auth02a_lifecycle_state_test";
const connection = () => new Client({ connectionString: url, options: "-c search_path=" + schema });
const first = connection(), second = connection();
const state = new AuthLifecycleState(first, new AuthLifecycleTransaction(first));
const concurrent = new AuthLifecycleState(second, new AuthLifecycleTransaction(second));
const userId = "state-member", otherId = "state-other";
const sessionId = "state-session", otherSessionId = "state-other-session";
const testToken = () => "test-only-" + crypto.randomUUID();
const issue = (intent: LifecycleIntent, id = userId) =>
  state.withSubject(id, subject => subject.issue(intent, testToken));
const proof = (value: IssuedLifecycleProof, ownSession?: string): LifecycleProof =>
  ({ ...value.claims, token: value.token, ...(ownSession ? { sessionId: ownSession } : {}) });
const consume = (value: LifecycleProof, id = userId) =>
  state.withSubject(id, subject => subject.consume(value));
const rows = async () => (await second.query<{ id: string; identifier: string; value: string }>(
  "select id,identifier,value from verification order by id",
)).rows;

beforeAll(async () => {
  await first.connect();
  await second.connect();
  await first.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  await first.query((await readFile("drizzle/0003_gorgeous_donald_blake.sql", "utf8"))
    .replaceAll('"public".', '"' + schema + '".'));
  await first.query(await readFile("drizzle/0065_sa04_account_state_foundation.sql", "utf8"));
  await installRegistrationPolicyFixture(first);
  await first.query(await readFile("drizzle/0074_auth_lifecycle_budget.sql", "utf8"));
});
beforeEach(async () => {
  await first.query('truncate "user", account, session, verification, rate_limit, auth_lifecycle_budget cascade');
  await first.query('insert into "user"(id,name,email,updated_at) values ($1,$1,$2,now()),($3,$3,$4,now())',
    [userId, "member@example.test", otherId, "other@example.test"]);
  await first.query('insert into "session"(id,user_id,token,expires_at,updated_at) values ' +
    "($1,$2,$3,now()+interval '1 day',now()),($4,$5,$6,now()+interval '1 day',now())",
    [sessionId, userId, "private-bearer-first", otherSessionId, otherId, "private-bearer-second"]);
});
afterAll(async () => {
  await first.query("drop schema if exists " + schema + " cascade");
  await first.end();
  await second.end();
});

describe("AUTH-02a server-only lifecycle state", () => {
  it("registers one request-local service and replaces the canonical verification endpoint", async () => {
    const auth = createAuth(drizzle(first), {
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: "disposable-lifecycle-state-test-secret-32-chars",
      GOOGLE_CLIENT_ID: "fake-local-google",
      GOOGLE_CLIENT_SECRET: "fake-local-secret",
    });
    const context = await auth.$context;
    const service = (context as unknown as { vicoAuthLifecycle: AuthLifecycleState }).vicoAuthLifecycle;
    expect(service).toBeInstanceOf(AuthLifecycleState);
    expect(context.options.plugins?.filter(plugin => plugin.id === "vico-auth-lifecycle")).toHaveLength(1);
    const endpoints = context.options.plugins?.find(plugin => plugin.id === "vico-auth-lifecycle")?.endpoints;
    expect(endpoints?.verifyEmail?.options.method).toBe("POST");
    expect(endpoints?.sendVerificationEmail?.options.method).toBe("POST");
    expect(endpoints?.inspectEmailVerification?.options.method).toBe("GET");
    expect(context.options.emailAndPassword?.requireEmailVerification).toBe(true);
    expect(context.options.emailAndPassword?.autoSignIn).toBe(false);
    const issued = await service.withSubject(userId, subject =>
      subject.issue({ purpose: "email-verification" }, testToken));
    expect(await consume(proof(issued))).toMatchObject({ userId, purpose: "email-verification" });
  });

  it("uses one current generation per subject/purpose without retaining a raw token or bearer", async () => {
    const initial = await issue({ purpose: "email-verification" });
    const reset = await issue({ purpose: "password-reset" });
    const own = await issue({ purpose: "password-create", sessionId });
    const other = await issue({ purpose: "email-verification" }, otherId);
    const replacement = await issue({ purpose: "email-verification" });
    expect(replacement.claims.generation).not.toBe(initial.claims.generation);
    const persisted = await rows();
    expect(persisted).toHaveLength(4);
    expect(persisted.every(row => row.id === row.identifier &&
      row.id.startsWith("vico-auth-lifecycle:v1:"))).toBe(true);
    const serialized = JSON.stringify(persisted);
    for (const value of [initial, reset, own, other, replacement]) {
      expect(serialized).not.toContain(value.token);
    }
    expect(serialized).not.toContain("private-bearer");
    expect(persisted.map(row => JSON.parse(row.value).tokenDigest)).toEqual(
      Array(4).fill(expect.stringMatching(/^[0-9a-f]{64}$/)));
    await expect(consume(proof(initial))).rejects.toBeInstanceOf(InvalidLifecycleProofError);
    await expect(consume({ ...proof(replacement), token: testToken() })).rejects.toBeInstanceOf(InvalidLifecycleProofError);
    await expect(consume({ ...proof(replacement), purpose: "password-reset" })).rejects.toBeInstanceOf(InvalidLifecycleProofError);
    await expect(consume({ ...proof(replacement), userId: otherId }, otherId)).rejects.toBeInstanceOf(InvalidLifecycleProofError);
    expect(await rows()).toEqual(persisted);
    expect(await consume(proof(replacement))).toMatchObject({ userId, purpose: "email-verification" });
    await expect(consume(proof(replacement))).rejects.toBeInstanceOf(InvalidLifecycleProofError);
    expect(await consume(proof(reset))).toMatchObject({ purpose: "password-reset" });
    expect(await consume(proof(other), otherId)).toMatchObject({ userId: otherId });
    expect(await consume(proof(own, sessionId))).toMatchObject({ purpose: "password-create" });
    expect(await rows()).toHaveLength(0);
  });

  it("validates a signed current verification proof without consuming or changing identity", async () => {
    const secret = "disposable-lifecycle-proof-test-secret-32-chars";
    const signed = () => state.withSubject(userId, subject =>
      subject.issue({ purpose: "email-verification" }, ({ claims }) =>
        signEmailVerificationProof(secret, claims)));
    const firstProof = await signed();
    const current = await signed();
    const before = await rows();
    const parsed = await decodeEmailVerificationProof(secret, current.token);
    const inspect = (value: LifecycleProof) => state.withSubject(value.userId, subject => subject.inspect(value));
    expect(parsed).toMatchObject(current.claims);
    await inspect(parsed);
    await inspect(parsed);
    expect(await rows()).toEqual(before);
    expect(before[0].value).not.toContain(current.token);
    expect((await second.query<{ email_verified: boolean }>(
      'select email_verified from "user" where id=$1', [userId])).rows[0].email_verified).toBe(false);
    await expect(inspect(await decodeEmailVerificationProof(secret, firstProof.token)))
      .rejects.toBeInstanceOf(InvalidLifecycleProofError);
    const legacy = await createEmailVerificationToken(secret, "member@example.test");
    const expired = await signJWT({ proofType: "vico-email-verification:v1", ...current.claims }, secret, -1);
    const parts = current.token.split(".");
    const tampered = parts[0] + "." + parts[1] + "." +
      (parts[2][0] === "A" ? "B" : "A") + parts[2].slice(1);
    for (const token of [legacy, expired, tampered]) {
      await expect(decodeEmailVerificationProof(secret, token)).rejects.toBeInstanceOf(InvalidLifecycleProofError);
    }
    await expect(decodeEmailVerificationProof(secret + "-wrong", current.token))
      .rejects.toBeInstanceOf(InvalidLifecycleProofError);
    expect(await rows()).toEqual(before);
    await expect(consume(parsed)).resolves.toMatchObject({userId, purpose:"email-verification"});
    await expect(inspect(parsed)).rejects.toBeInstanceOf(InvalidLifecycleProofError);
  });

  it("checks authoritative expiry and current email snapshot; invalidation is purpose-scoped", async () => {
    const expired = await issue({ purpose: "email-verification" });
    await first.query("update verification set expires_at=(clock_timestamp() at time zone 'UTC')-interval '1 second'");
    await expect(consume(proof(expired))).rejects.toBeInstanceOf(InvalidLifecycleProofError);
    const pending = await issue({ purpose: "email-verification" });
    const reset = await issue({ purpose: "password-reset" });
    await first.query('update "user" set email=$1 where id=$2', ["changed@example.test", userId]);
    await expect(consume(proof(pending))).rejects.toBeInstanceOf(InvalidLifecycleProofError);
    await expect(consume(proof(reset))).rejects.toBeInstanceOf(InvalidLifecycleProofError);
    await first.query("insert into verification(id,identifier,value,expires_at,updated_at) values " +
      "('native-state','native-state','native-opaque-value',now()+interval '1 hour',now())");
    const fresh = await state.withSubject(userId, subject =>
      subject.issue({ purpose: "email-verification" }, context => {
        expect(context.email).toBe("changed@example.test");
        expect(context.recipient).toBe("changed@example.test");
        return testToken();
      }));
    expect(fresh.recipient).toBe("changed@example.test");
    await state.withSubject(userId, subject => subject.invalidate(["email-verification"]));
    expect((await rows()).map(row => row.id)).toEqual(expect.arrayContaining([
      "native-state", expect.stringContaining("password-reset:"),
    ]));
    expect(await rows()).toHaveLength(2);
  });

  it("keeps authenticated proof bound to its initiating live own session and enforces email-change phase order", async () => {
    await expect(issue({ purpose: "password-create", sessionId: otherSessionId }))
      .rejects.toBeInstanceOf(InvalidLifecycleProofError);
    const old = await issue({ purpose: "email-change", sessionId, newEmail: "new@example.test" });
    expect(old.claims.phase).toBe("old-address");
    expect(old.recipient).toBe("member@example.test");
    await expect(consume(proof(old, sessionId))).rejects.toBeInstanceOf(InvalidLifecycleProofError);
    await expect(state.withSubject(userId, subject =>
      subject.advanceEmailChange(proof(old, otherSessionId), testToken))).rejects.toBeInstanceOf(InvalidLifecycleProofError);
    const next = await state.withSubject(userId, subject =>
      subject.advanceEmailChange(proof(old, sessionId), testToken));
    expect(next.claims.phase).toBe("new-address");
    expect(next.recipient).toBe("new@example.test");
    expect(next.claims.generation).not.toBe(old.claims.generation);
    expect(await rows()).toHaveLength(1);
    await expect(state.withSubject(userId, subject =>
      subject.advanceEmailChange(proof(old, sessionId), testToken))).rejects.toBeInstanceOf(InvalidLifecycleProofError);
    await expect(consume(proof(next))).rejects.toBeInstanceOf(InvalidLifecycleProofError);
    const result = await consume(proof(next, sessionId));
    expect(result).toMatchObject({ newEmail: "new@example.test", email: "member@example.test", phase: "new-address" });
    expect(result).not.toHaveProperty("tokenDigest");
    // The foundation does not change the actual login email or credentials.
    expect((await first.query<{ email: string }>('select email from "user" where id=$1', [userId])).rows[0].email)
      .toBe("member@example.test");
    const create = await issue({ purpose: "password-create", sessionId });
    await first.query('delete from "session" where id=$1', [sessionId]);
    await expect(consume(proof(create, sessionId))).rejects.toBeInstanceOf(InvalidLifecycleProofError);
  });

  it("rolls consumption and issuance back with the same identity transaction", async () => {
    const value = await issue({ purpose: "email-verification" });
    const failure = new Error("test-only failure after consume");
    await expect(state.withSubject(userId, async subject => {
      await subject.consume(proof(value));
      await first.query('update "user" set email_verified=true where id=$1', [userId]);
      expect(await rows()).toHaveLength(1);
      throw failure;
    })).rejects.toBe(failure);
    expect(await rows()).toHaveLength(1);
    expect((await first.query<{ email_verified: boolean }>(
      'select email_verified from "user" where id=$1', [userId])).rows[0].email_verified).toBe(false);
    await expect(state.withSubject(userId, async subject => {
      await subject.issue({ purpose: "email-verification" }, testToken);
      throw failure;
    })).rejects.toBe(failure);
    expect(await consume(proof(value))).toMatchObject({ userId });
    expect(await rows()).toHaveLength(0);
  });

  it("serializes competing native clients; a current proof can be consumed once", async () => {
    const value = await issue({ purpose: "email-verification" });
    const results = await Promise.allSettled([
      consume(proof(value)),
      concurrent.withSubject(userId, subject => subject.consume(proof(value))),
    ]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const denied = results.find(result => result.status === "rejected");
    expect(denied?.reason).toBeInstanceOf(InvalidLifecycleProofError);
    expect(await rows()).toHaveLength(0);
    const issued = await Promise.all([
      issue({ purpose: "password-reset" }),
      concurrent.withSubject(userId, subject => subject.issue({ purpose: "password-reset" }, testToken)),
    ]);
    const saved = await rows();
    expect(saved).toHaveLength(1);
    const generation = JSON.parse(saved[0].value).generation;
    const latest = issued.find(item => item.claims.generation === generation)!;
    const stale = issued.find(item => item.claims.generation !== generation)!;
    await expect(consume(proof(stale))).rejects.toBeInstanceOf(InvalidLifecycleProofError);
    expect(await consume(proof(latest))).toMatchObject({ purpose: "password-reset" });
  });

  it("holds the shared active-account lock and denies state-first mutations", async () => {
    const deactivate = 'update "user" set deactivated_at=now(),deactivated_by_user_id=$1,' +
      "retain_at_least_until=now()+interval '2 years' where id=$1";
    const issued = await state.withSubject(userId, async subject => {
      const value = await subject.issue({ purpose: "email-verification" }, testToken);
      await second.query("set lock_timeout='120ms'");
      try {
        await expect(second.query(deactivate, [userId])).rejects.toMatchObject({ code: "55P03" });
      } finally { await second.query("set lock_timeout='0'"); }
      return value;
    });
    await second.query(deactivate, [userId]);
    await expect(consume(proof(issued))).rejects.toBeInstanceOf(AccountInactiveError);
    await expect(issue({ purpose: "password-reset" })).rejects.toBeInstanceOf(AccountInactiveError);
    expect(await rows()).toHaveLength(1);
  });

  it("rejects malformed persisted state without replacing it and prevents escaped capabilities", async () => {
    await issue({ purpose: "email-verification" });
    await first.query("update verification set value=$1", [JSON.stringify({ version: 1, unexpected: "invalid" })]);
    const corrupted = await rows();
    await expect(issue({ purpose: "email-verification" })).rejects.toBeInstanceOf(LifecycleStateInvariantError);
    expect(await rows()).toEqual(corrupted);
    const escaped = await state.withSubject(userId, async subject => subject);
    await expect(state.withSubject(userId, async () => {
      await escaped.invalidate(["email-verification"]);
    })).rejects.toBeInstanceOf(LifecycleStateInvariantError);
    expect(await rows()).toEqual(corrupted);
  });
});

describe("AUTH-02b verification domain operations", () => {
  const secret = "disposable-lifecycle-verification-test-secret-32-chars";
  const env = {
    BETTER_AUTH_URL: "http://localhost:3000", BETTER_AUTH_SECRET: secret,
    GOOGLE_CLIENT_ID: "fake-local-google", GOOGLE_CLIENT_SECRET: "fake-local-secret",
  };
  const destination = { locale: "en" };
  const memberEmail = "member@example.test";
  const makeRuntime = async (client = first, mailStatus: AuthMailStatus = "accepted") => {
    const tx = new AuthLifecycleTransaction(client);
    const sent: string[] = [];
    const captured: AuthTransitionFact[] = [];
    const mailOutcomes: OwnerOperationalFact[] = [];
    const mail: AuthMailRuntime = {
      async buildActionURL(action) {
        // The independent connection must already see the issued proof.
        const saved = await rows();
        expect(saved.some(row => JSON.parse(row.value).purpose === "email-verification")).toBe(true);
        expect(tx.ownsCurrentWork()).toBe(false);
        return "https://forum.example/en/verify-email?token=" + action.token;
      },
      async sendAuthMail(input, observeTransport) {
        observeTransport?.("fake");
        expect(input.recipient).toBe(memberEmail);
        sent.push(new URL(input.actionURL).searchParams.get("token")!);
        return { status: mailStatus };
      },
    };
    const service = new AuthEmailVerification(client, tx, new AuthLifecycleState(client, tx),
      new AuthLifecycleBudget(client, tx, secret), secret, mail,
      fact => { expect(tx.ownsCurrentWork()).toBe(false); captured.push(fact); },
      { append: async fact => { expect(tx.ownsCurrentWork()).toBe(false); mailOutcomes.push(fact); } });
    const auth = createAuth(drizzle(client), env, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, false, tx);
    const native = (await auth.$context).internalAdapter;
    const update = (id: string) => native.updateUser(id, { emailVerified: true });
    return { service, update, sent, captured, mailOutcomes };
  };
  const installCredential = async () => {
    await first.query("insert into account(id,user_id,provider_id,account_id,password,updated_at) " +
      "values ('member-credential',$1,'credential',$1,'test-fixture-hash',now())", [userId]);
  };
  const verified = async () => (await second.query<{ email_verified: boolean }>(
    'select email_verified from "user" where id=$1', [userId])).rows[0].email_verified;
  const sessions = async () => (await second.query("select id,user_id,token from session order by id")).rows;

  it("issues after commit, inspects without mutation and atomically consumes via the native user update", async () => {
    await installCredential();
    const runtime = await makeRuntime();
    const beforeSessions = await sessions();
    expect(await runtime.service.issueForCommittedSignup(userId, memberEmail, destination)).toBe("accepted");
    expect(runtime.sent).toHaveLength(1);
    const token = runtime.sent[0];
    expect(runtime.captured).toEqual([]);
    expect(runtime.mailOutcomes).toEqual([expect.objectContaining({kind:"integration.authMailOutcome",actorUserId:null,
      values:{schemaVersion:1,mailPurpose:"email-verification",mailTransport:"fake",mailOutcome:"accepted"}})]);
    expect(JSON.stringify(runtime.mailOutcomes)).not.toContain(token);
    expect(JSON.stringify(runtime.mailOutcomes)).not.toContain(memberEmail);
    const before = await rows();
    await runtime.service.inspect(token);
    await runtime.service.inspect(token);
    expect(await rows()).toEqual(before);
    expect(await verified()).toBe(false);
    const receipt = await runtime.service.confirm(token, runtime.update);
    expect(receipt).toEqual({ userId, operationId: expect.stringMatching(/^[0-9a-f-]{36}$/) });
    expect(runtime.captured).toEqual([{kind:"auth.emailVerified",...receipt,actorUserId:null}]);
    expect(await verified()).toBe(true);
    expect(await rows()).toHaveLength(0);
    expect(await sessions()).toEqual(beforeSessions);
    await expect(runtime.service.confirm(token, runtime.update)).rejects.toBeInstanceOf(InvalidLifecycleProofError);
    expect(await runtime.service.resend(memberEmail, destination)).toBe("not-eligible");
    expect(runtime.sent).toHaveLength(1);
    expect(runtime.captured).toHaveLength(1);
    expect(runtime.mailOutcomes).toHaveLength(1);
  });

  it("resend replaces the proof and rolls back consume and native mutation on a post-update failure", async () => {
    await installCredential();
    const runtime = await makeRuntime();
    expect(await runtime.service.resend(memberEmail, destination)).toBe("accepted");
    expect(await runtime.service.resend(memberEmail, destination)).toBe("accepted");
    const [stale, current] = runtime.sent;
    await expect(runtime.service.inspect(stale)).rejects.toBeInstanceOf(InvalidLifecycleProofError);
    const before = await rows();
    const failure = new Error("test-only post-update failure");
    await expect(runtime.service.confirm(current, async id => {
      await runtime.update(id);
      throw failure;
    })).rejects.toBe(failure);
    expect(await rows()).toEqual(before);
    expect(await verified()).toBe(false);
    expect(runtime.captured).toEqual([]);
    await runtime.service.confirm(current, runtime.update);
    expect(runtime.captured).toHaveLength(1);
    expect(await verified()).toBe(true);
  });

  it("does not issue to missing, passwordless or inactive accounts, or send on target budget denial", async () => {
    const runtime = await makeRuntime();
    expect(await runtime.service.resend("absent@example.test", destination)).toBe("not-eligible");
    expect(await runtime.service.resend(memberEmail, destination)).toBe("not-eligible");
    await installCredential();
    await first.query('update "user" set deactivated_at=now(),deactivated_by_user_id=$1,' +
      "retain_at_least_until=now()+interval '2 years' where id=$1", [userId]);
    expect(await runtime.service.resend(memberEmail, destination)).toBe("not-eligible");
    expect(await runtime.service.resend(memberEmail, destination)).toBe("not-eligible");
    await expect(runtime.service.resend(memberEmail, destination)).rejects.toBeInstanceOf(LifecycleBudgetExceededError);
    expect(runtime.sent).toEqual([]);
    expect(runtime.mailOutcomes).toEqual([]);
    expect(runtime.captured).toEqual([]);
    expect(await rows()).toHaveLength(0);
  });

  it("keeps a committed proof after uncertain mail without creating or refreshing any session", async () => {
    await installCredential();
    const runtime = await makeRuntime(first, "uncertain");
    const beforeSessions = await sessions();
    expect(await runtime.service.resend(memberEmail, destination)).toBe("uncertain");
    expect(runtime.sent).toHaveLength(1);
    await runtime.service.inspect(runtime.sent[0]);
    expect(runtime.captured).toEqual([]);
    expect(runtime.mailOutcomes[0].values).toMatchObject({mailOutcome:"uncertain",mailTransport:"fake"});
    expect(await verified()).toBe(false);
    expect(await sessions()).toEqual(beforeSessions);
  });

  it("serializes competing terminal operations and rejects deactivation-first verification", async () => {
    await installCredential();
    const a = await makeRuntime(first), b = await makeRuntime(second);
    await a.service.resend(memberEmail, destination);
    const token = a.sent[0];
    const results = await Promise.allSettled([
      a.service.confirm(token, a.update), b.service.confirm(token, b.update),
    ]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect([...a.captured,...b.captured]).toHaveLength(1);
    expect(results.find(result => result.status === "rejected")).toMatchObject({
      reason: expect.any(InvalidLifecycleProofError),
    });
    expect(await verified()).toBe(true);
    await first.query('update "user" set email_verified=false where id=$1', [userId]);
    await a.service.resend(memberEmail, destination);
    const next = a.sent[1];
    await first.query('update "user" set deactivated_at=now(),deactivated_by_user_id=$1,' +
      "retain_at_least_until=now()+interval '2 years' where id=$1", [userId]);
    const before = await rows();
    await expect(a.service.confirm(next, a.update)).rejects.toBeInstanceOf(InvalidLifecycleProofError);
    expect(await rows()).toEqual(before);
    expect(await verified()).toBe(false);
  });
});


describe("AUTH-03 credential lifecycle domain", () => {
  const secret = "disposable-credential-lifecycle-test-secret-32-chars";
  const email = "member@example.test";
  const newPassword = "fixture-only-new-credential";
  const makeService = (client = first) => {
    const tx = new AuthLifecycleTransaction(client);
    const service = new AuthCredentialLifecycle(client, tx, new AuthLifecycleState(client, tx),
      new AuthLifecycleBudget(client, tx, secret), secret);
    const auth = createAuth(drizzle(client), {
      BETTER_AUTH_URL: "http://localhost:3000", BETTER_AUTH_SECRET: secret,
      GOOGLE_CLIENT_ID: "fake-local-google", GOOGLE_CLIENT_SECRET: "fake-local-secret",
    }, undefined, undefined, undefined, undefined, undefined, undefined, undefined, false, tx);
    const requestReset = service.requestReset.bind(service);
    return Object.assign(service, {
      requestReset: async (email: string) => requestReset(email, (await auth.$context).internalAdapter.createVerificationValue),
    });
  };

  async function installMethod(provider: "google" | "credential") {
    await first.query('update "user" set email_verified=true where id=$1', [userId]);
    await first.query(`
      insert into account(id,user_id,provider_id,account_id,password,updated_at)
      values ($1,$2,$3,$2,$4,now())
    `, [provider + "-fixture", userId, provider, provider === "credential" ? await hashPassword("fixture-only-old-credential") : null]);
  }

  it("resets only a verified credential, consumes its proof and atomically removes target sessions", async () => {
    const service = makeService();
    expect(await service.requestReset(email)).toBeNull();
    await installMethod("credential");
    const issued = await service.requestReset(email);
    expect(issued).not.toBeNull();
    await service.inspectReset(issued!.token);
    expect((await second.query("select id from session order by id")).rows).toHaveLength(2);
    const result = await service.reset(issued!.token, newPassword, hashPassword);
    expect(result).toMatchObject({ userId, purpose: "password-reset", revokedSessionIds: [sessionId] });
    await expect(service.reset(issued!.token, newPassword, hashPassword)).rejects.toBeInstanceOf(InvalidLifecycleProofError);
    expect((await second.query("select id from session")).rows).toEqual([{ id: otherSessionId }]);
    const stored = await second.query<{ password: string }>("select password from account where user_id=$1", [userId]);
    await expect(verifyPassword({ hash: stored.rows[0].password, password: newPassword })).resolves.toBe(true);
  });

  it("binds password creation to the fresh issuing session and preserves that session and Google", async () => {
    await installMethod("google");
    const service = makeService();
    const actor = { userId, sessionId, freshAgeSeconds: 3600 };
    expect(await service.requestReset(email)).toBeNull();
    await first.query(`
      insert into session (id,user_id,token,expires_at,updated_at)
      values ('additional-own-session',$1,'fixture-only-extra-bearer',now()+interval '1 day',now())
    `, [userId]);
    const issued = await service.requestCreation(actor, email);
    await expect(service.create({ ...actor, sessionId: "additional-own-session" }, issued.token, newPassword, hashPassword))
      .rejects.toBeInstanceOf(InvalidLifecycleProofError);
    const result = await service.create(actor, issued.token, newPassword, hashPassword);
    expect(result).toMatchObject({ purpose: "password-create", revokedSessionIds: ["additional-own-session"] });
    expect((await second.query("select id from session order by id")).rows.map(row => row.id).sort())
      .toEqual([sessionId, otherSessionId].sort());
    expect((await second.query("select provider_id from account where user_id=$1 order by provider_id", [userId])).rows)
      .toEqual([{ provider_id: "credential" }, { provider_id: "google" }]);
  });

  it("stores opaque reset in hashed native storage and SET-05 invalidates its current binding", async () => {
    await installMethod("credential");
    const service = makeService();
    const issued = await service.requestReset(email);
    expect(issued).not.toBeNull();
    const token = issued!.token;
    expect(token).toMatch(/^[A-Za-z0-9]{24}$/);
    const nativeIdentifier = createHash("sha256").update("reset-password:" + token).digest("base64url");
    const stored = await rows();
    const native = stored.find(row => row.identifier === nativeIdentifier);
    expect(native?.value).toBe(userId);
    const binding = stored.find(row => row.id.includes(":password-reset:"));
    expect(JSON.parse(binding!.value)).toMatchObject({
      nativeResetId: native!.id, generation: issued!.claims.generation, userId, email,
    });
    expect(JSON.stringify(stored)).not.toContain(token);

    const auth = createAuth(drizzle(first), {
      BETTER_AUTH_URL: "http://localhost:3000", BETTER_AUTH_SECRET: secret,
      GOOGLE_CLIENT_ID: "fake-local-google", GOOGLE_CLIENT_SECRET: "fake-local-secret",
    });
    const legacy = await auth.handler(new Request(`http://localhost:3000/api/auth/reset-password/${token}?callbackURL=%2Fen`));
    expect(legacy.status).toBe(404);
    expect(legacy.headers.get("Location")).toBeNull();
    const session = await auth.api.signInEmail({
      body: { email, password: "fixture-only-old-credential" }, asResponse: true,
    });
    const cookie = session.headers.getSetCookie().find(value => value.includes("session_token="))!.split(";", 1)[0];
    await expect(auth.api.changePassword({
      headers: new Headers({ cookie }),
      body: { currentPassword: "fixture-only-old-credential", newPassword, revokeOtherSessions: false },
    })).resolves.toMatchObject({ user: { id: userId } });
    expect(await rows()).toEqual([]);
    await expect(service.reset(token, "fixture-only-late-reset", hashPassword))
      .rejects.toBeInstanceOf(InvalidLifecycleProofError);
    expect((await second.query("select id from session")).rowCount).toBe(3);
  });

  it("replaces the old native reset row and checks native expiry independently of the Vico binding", async () => {
    await installMethod("credential");
    const service = makeService();
    const firstProof = await service.requestReset(email);
    const current = await service.requestReset(email);
    expect(firstProof).not.toBeNull();
    expect(current).not.toBeNull();
    await expect(service.inspectReset(firstProof!.token)).rejects.toBeInstanceOf(InvalidLifecycleProofError);
    const hashed = createHash("sha256").update("reset-password:" + current!.token).digest("base64url");
    expect(await rows()).toHaveLength(2);
    const expired = await first.query("update verification set expires_at=(clock_timestamp() at time zone 'UTC') - interval '1 second' where identifier=$1", [hashed]);
    expect(expired.rowCount).toBe(1);
    await expect(service.reset(current!.token, newPassword, hashPassword)).rejects.toBeInstanceOf(InvalidLifecycleProofError);
    expect((await second.query("select id from session")).rowCount).toBe(2);
    expect(await rows()).toHaveLength(2);
  });

  it("rejects reset already in flight when SET-05 wins the subject lock", async () => {
    await installMethod("credential");
    const reset = makeService(second);
    const issued = await reset.requestReset(email);
    expect(issued).not.toBeNull();
    const auth = createAuth(drizzle(first), {
      BETTER_AUTH_URL: "http://localhost:3000", BETTER_AUTH_SECRET: secret,
      GOOGLE_CLIENT_ID: "fake-local-google", GOOGLE_CLIENT_SECRET: "fake-local-secret",
    });
    const signIn = await auth.api.signInEmail({ body: { email, password: "fixture-only-old-credential" }, asResponse: true });
    const cookie = signIn.headers.getSetCookie().find(value => value.includes("session_token="))!.split(";", 1)[0];
    const latch = connection();
    await latch.connect();
    const backend = async (client: Client): Promise<number> =>
      (await client.query<{ pid: number }>("select pg_backend_pid() pid")).rows[0].pid;
    const [changePid, resetPid, latchPid] = await Promise.all([backend(first), backend(second), backend(latch)]);
    const waitBlockedBy = async (pid: number, holder: number) => {
      for (let attempt = 0; attempt < 100; attempt++) {
        const result = await latch.query("select 1 where $2::int = any(pg_blocking_pids($1))", [pid, holder]);
        if (result.rowCount) return;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      throw new Error("Expected a credential operation to wait for the other transaction");
    };
    await first.query(`
      create function wait_for_credential_change() returns trigger language plpgsql as $$
        begin perform pg_advisory_xact_lock(32796014); return new; end;
      $$;
      create trigger wait_for_credential_change before update of password on account
        for each row execute function wait_for_credential_change()
    `);
    let change: Promise<unknown> | undefined;
    let pendingReset: ReturnType<typeof reset.reset> | undefined;
    try {
      await latch.query("select pg_advisory_lock(32796014)");
      change = auth.api.changePassword({ headers: new Headers({ cookie }),
        body: { currentPassword: "fixture-only-old-credential", newPassword, revokeOtherSessions: false } });
      void change.catch(() => {});
      await waitBlockedBy(changePid, latchPid);
      pendingReset = reset.reset(issued!.token, "fixture-only-losing-reset", hashPassword);
      void pendingReset.catch(() => {});
      await waitBlockedBy(resetPid, changePid);
      await latch.query("select pg_advisory_unlock(32796014)");
      await expect(change).resolves.toMatchObject({ user: { id: userId } });
      await expect(pendingReset).rejects.toBeInstanceOf(InvalidLifecycleProofError);
      expect((await second.query("select id from session")).rowCount).toBe(3);
      expect(await rows()).toEqual([]);
    } finally {
      await latch.query("select pg_advisory_unlock_all()");
      await Promise.allSettled([change, pendingReset]);
      await first.query(`
        drop trigger wait_for_credential_change on account;
        drop function wait_for_credential_change()
      `);
      await latch.end();
    }
  });

  it("rolls back proof consumption and the password if session revocation fails", async () => {
    await installMethod("credential");
    const service = makeService();
    const issued = await service.requestReset(email);
    expect(issued).not.toBeNull();
    const snapshot = await second.query("select password from account where user_id=$1", [userId]);
    await first.query(`
      create function reject_credential_session_delete() returns trigger language plpgsql as $$
        begin raise exception 'injected revocation failure'; end;
      $$;
      create trigger reject_credential_session_delete before delete on session
        for each row execute function reject_credential_session_delete()
    `);
    try {
      await expect(service.reset(issued!.token, newPassword, hashPassword)).rejects.toThrow();
      await service.inspectReset(issued!.token);
      expect((await second.query("select password from account where user_id=$1", [userId])).rows).toEqual(snapshot.rows);
      expect((await second.query("select id from session")).rows).toHaveLength(2);
    } finally {
      await first.query(`
        drop trigger reject_credential_session_delete on session;
        drop function reject_credential_session_delete()
      `);
    }
  });

  it("serializes two reset contenders for the same proof across PostgreSQL connections", async () => {
    await installMethod("credential");
    const service = makeService();
    const contender = makeService(second);
    const issued = await service.requestReset(email);
    expect(issued).not.toBeNull();
    const results = await Promise.allSettled([
      service.reset(issued!.token, newPassword, hashPassword),
      contender.reset(issued!.token, newPassword + "-other", hashPassword),
    ]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const loser = results.find(result => result.status === "rejected");
    expect(loser?.reason).toBeInstanceOf(InvalidLifecycleProofError);
    expect((await second.query("select id from session")).rows).toEqual([{ id: otherSessionId }]);
    expect(await rows()).toEqual([]);
  });


  it("uses canonical HTTP request and direct reset against the same mail proof and budget", async () => {
    await installMethod("credential");
    const sent: string[] = [];
    const env = {
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: secret,
      GOOGLE_CLIENT_ID: "fake-local-google",
      GOOGLE_CLIENT_SECRET: "fake-local-secret",
    };
    const mail: AuthMailRuntime = {
      async buildActionURL(input) {
        expect(input.purpose).toBe("password-reset");
        expect((await rows()).some(row => row.id.includes(":password-reset:"))).toBe(true);
        return "http://localhost:3000/en/reset-password#token=" + input.token;
      },
      async sendAuthMail(input) {
        sent.push(new URLSearchParams(new URL(input.actionURL).hash.slice(1)).get("token")!);
        return { status: "accepted" };
      },
    };
    const auth = createAuth(drizzle(first), env, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, false, undefined, { mail });
    const request = (address: string) => auth.handler(new Request("http://localhost:3000/api/auth/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
      body: JSON.stringify({ email: address }),
    }));

    const eligible = await request(email);
    const unknown = await request("not-a-user@example.test");
    expect(eligible.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(await eligible.json()).toEqual(await unknown.json());
    expect(sent).toHaveLength(1);
    await expect(auth.api.resetPassword({ body: { token: sent[0], newPassword } })).resolves.toEqual({ status: true });
    await expect(auth.api.resetPassword({ body: { token: sent[0], newPassword } })).rejects.toMatchObject({ status: "BAD_REQUEST" });
    expect((await second.query("select id from session")).rows).toEqual([{ id: otherSessionId }]);
  });


  it("requires exact current session and mail proof for Google-only creation through the canonical API", async () => {
    await installMethod("credential");
    await first.query('update "user" set locale=$1 where id=$2', ["ru", userId]);
    const sent: string[] = [];
    const mailLocales: Array<{ locale: string; actionLocale?: string }> = [];
    const facts: AuthTransitionFact[] = [];
    const auth = createAuth(drizzle(first), {
      BETTER_AUTH_URL: "http://localhost:3000", BETTER_AUTH_SECRET: secret,
      GOOGLE_CLIENT_ID: "fake-local-google", GOOGLE_CLIENT_SECRET: "fake-local-secret",
    }, undefined, undefined, undefined, {
      capture(fact) { facts.push(fact); },
      trustedActorFor() { return null; },
    }, undefined, undefined, undefined, false, undefined, {
      mail: {
        async buildActionURL(input) {
          expect(input.purpose).toBe("password-create");
          expect(input.locale).toBe("en");
          return "http://localhost:3000/en/settings/account#token=" + input.token;
        },
        async sendAuthMail(input) {
          mailLocales.push({ locale: input.locale, actionLocale: input.actionLocale });
          sent.push(new URLSearchParams(new URL(input.actionURL).hash.slice(1)).get("token")!);
          return { status: "accepted" };
        },
      },
    });
    const signIn = await auth.api.signInEmail({
      body: { email, password: "fixture-only-old-credential" }, asResponse: true,
    });
    expect(signIn.status).toBe(200);
    const cookie = signIn.headers.getSetCookie().find(value => value.includes("session_token="))!.split(";", 1)[0];
    const current = await auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(current?.user.id).toBe(userId);

    // Use an already authenticated test session. The fixture swaps the provider
    // to Google so no real OAuth access is needed to exercise password creation.
    await first.query("delete from account where user_id=$1", [userId]);
    await installMethod("google");
    const expected = new Headers({
      cookie, "x-vico-credential-user": userId, "x-vico-credential-session": current!.session.id,
    });
    await expect(auth.api.setPassword({ headers: expected, body: { newPassword } }))
      .rejects.toMatchObject({ status: "UNAUTHORIZED", message: "Password creation requires confirmation" });
    await expect(auth.api.createCredential({ headers: expected, body: { newPassword } }))
      .rejects.toMatchObject({ status: "BAD_REQUEST" });
    await expect(auth.api.requestCredentialCreation({ headers: new Headers({ cookie }), body: {} }))
      .rejects.toMatchObject({ status: "CONFLICT" });
    await expect(auth.api.requestCredentialCreation({ headers: expected, body: {} })).resolves.toEqual({ status: true });
    expect(sent).toHaveLength(1);
    expect(mailLocales).toEqual([{ locale: "ru", actionLocale: "en" }]);
    await expect(auth.api.createCredential({ headers: expected, body: { newPassword, token: sent[0] } }))
      .resolves.toEqual({ status: true });
    expect(facts).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "auth.methodLinked", userId, linkContext: "password-create" }),
      expect.objectContaining({ kind: "auth.sessionDeleted", userId, sessionId, reason: "password-create" }),
    ]));
    expect((await second.query("select id from session order by id")).rows.map(row => row.id).sort())
      .toEqual([current!.session.id, otherSessionId].sort());
  });


  it.each(["sign-in", "change-password"] as const)("denies %s using the old password when a concurrent reset wins the subject lock", async operation => {
    await installMethod("credential");
    const reset = makeService();
    const issued = await reset.requestReset(email);
    expect(issued).not.toBeNull();
    const latch = connection();
    await latch.connect();
    const backend = async (client: Client): Promise<number> =>
      (await client.query<{ pid: number }>("select pg_backend_pid() pid")).rows[0].pid;
    const [resetPid, signInPid] = await Promise.all([backend(first), backend(second)]);
    const auth = createAuth(drizzle(second), {
      BETTER_AUTH_URL: "http://localhost:3000", BETTER_AUTH_SECRET: secret,
      GOOGLE_CLIENT_ID: "fake-local-google", GOOGLE_CLIENT_SECRET: "fake-local-secret",
    });
    const credentials = { email, password: "fixture-only-old-credential" };
    let actorHeaders: Headers | undefined;
    if (operation === "change-password") {
      const initial = await auth.api.signInEmail({ body: credentials, asResponse: true });
      expect(initial.status).toBe(200);
      const cookie = initial.headers.getSetCookie().find(value => value.includes("session_token="))!.split(";", 1)[0];
      actorHeaders = new Headers({ cookie });
    }
    await first.query(`
      create function wait_for_credential_reset() returns trigger language plpgsql as $$
        begin perform pg_advisory_xact_lock(32796013); return new; end;
      $$;
      create trigger wait_for_credential_reset before update of password on account
        for each row execute function wait_for_credential_reset()
    `);
    const waitBlockedBy = async (pid: number, holder: number) => {
      for (let attempt = 0; attempt < 100; attempt++) {
        const result = await latch.query("select 1 where $2::int = any(pg_blocking_pids($1))", [pid, holder]);
        if (result.rowCount) return;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      throw new Error("Expected a credential operation to wait for the other transaction");
    };
    let committed: ReturnType<typeof reset.reset> | undefined;
    let signIn: Promise<Response> | undefined;
    try {
      await latch.query("select pg_advisory_lock(32796013)");
      committed = reset.reset(issued!.token, newPassword, hashPassword);
      void committed.catch(() => {});
      await waitBlockedBy(resetPid, await backend(latch));
      signIn = operation === "sign-in" ? auth.api.signInEmail({ body: credentials, asResponse: true })
        : auth.api.changePassword({ headers: actorHeaders!, asResponse: true,
            body: { currentPassword: credentials.password, newPassword: "fixture-only-racing-change", revokeOtherSessions: false } });
      void signIn.catch(() => {});
      await waitBlockedBy(signInPid, resetPid);
      await latch.query("select pg_advisory_unlock(32796013)");
      await committed;
      const denied = await signIn;
      expect(denied.status).toBe(operation === "sign-in" ? 401 : 400);
      expect(denied.headers.getSetCookie()).toHaveLength(0);
      expect((await second.query("select id from session")).rows).toEqual([{ id: otherSessionId }]);
    } finally {
      await latch.query("select pg_advisory_unlock_all()");
      await Promise.allSettled([committed, signIn]);
      await first.query(`
        drop trigger wait_for_credential_reset on account;
        drop function wait_for_credential_reset()
      `);
      await latch.end();
    }
  });

});

describe("AUTH-04 account lifecycle", () => {
  const secret = "disposable-account-security-secret-0123456789";
  const actor = { userId, sessionId, freshAgeSeconds: 3600 };
  const makeService = (client = first) => {
    const tx = new AuthLifecycleTransaction(client);
    return new AccountSecurityLifecycle(client, new AuthLifecycleState(client, tx),
      new AuthLifecycleBudget(client, tx, secret), secret, true);
  };
  const email = async () => (await second.query('select email,email_verified from "user" where id=$1', [userId])).rows[0];
  const environment = { BETTER_AUTH_URL: "http://localhost:3000", BETTER_AUTH_SECRET: secret,
    GOOGLE_CLIENT_ID: "fake-local-google", GOOGLE_CLIENT_SECRET: "fake-local-secret" };
  async function ownFixture(dependencies?: Parameters<typeof createAuth>[11]) {
    await first.query('update "user" set email_verified=true where id=$1', [userId]);
    await first.query("insert into account(id,user_id,provider_id,account_id,password,updated_at) values ('own-password',$1,'credential',$1,$2,now()),('own-google',$1,'google','immutable-google-id',null,now())",
      [userId, await hashPassword("fixture-only-original-password")]);
    const auth = createAuth(drizzle(first), environment, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, false, undefined, dependencies);
    const login = await auth.api.signInEmail({ body: { email: "member@example.test", password: "fixture-only-original-password" }, asResponse: true });
    const cookie = login.headers.getSetCookie().find(value => value.includes("session_token="))!.split(";", 1)[0];
    const current = await auth.api.getSession({ headers: new Headers({ cookie }) });
    const headers = new Headers({ cookie, Origin: environment.BETTER_AUTH_URL, "Content-Type": "application/json",
      "x-vico-account-user": userId, "x-vico-account-session": current!.session.id });
    return { auth, headers, current: current! };
  }

  it("F01 preserves classified session-read outages for HTTP and direct calls, distinguishing a missing session", async () => {
    const directFailures: string[] = [], actors: string[] = [];
    const { auth, headers } = await ownFixture({
      observeVerificationDirectFailure: (operation, code) => directFailures.push(operation + ":" + code),
      observeResolvedAccountActor: id => actors.push(id),
    });
    const before = { email: await email(), sessions: (await second.query("select * from session order by id")).rows,
      accounts: (await second.query("select * from account order by id")).rows };
    const original = first.query.bind(first);
    const fault = vi.spyOn(first, "query").mockImplementation(((...args: unknown[]) => {
      const statement = args[0];
      const text = typeof statement === "string" ? statement : (statement as { text?: string })?.text;
      if (text?.includes('from "session"')) return Promise.reject(Object.assign(new Error("private-session-storage-failure"), { code: "ECONNRESET" }));
      return Reflect.apply(original, first, args);
    }) as never);
    try {
      for (const [path, body] of [["change-email", { newEmail: "outage@example.test" }],
        ["confirm-email-change", { token: "not-a-proof" }], ["unlink-account", { accountId: "own-google" }]] as const) {
        const response = await auth.handler(new Request(environment.BETTER_AUTH_URL + "/api/auth/" + path,
          { method: "POST", headers, body: JSON.stringify(body) }));
        expect(response.status).toBe(503);
        expect(response.headers.get("Cache-Control")).toBe("private, no-store");
        expect(response.headers.getSetCookie()).toEqual([]);
        expect(await response.text()).not.toContain("private-session-storage-failure");
      }
      await expect(auth.api.changeEmail({ headers, body: { newEmail: "outage@example.test" } })).rejects.toMatchObject({ status: "SERVICE_UNAVAILABLE" });
      await expect(auth.api.confirmEmailChange({ headers, body: { token: "not-a-proof" } })).rejects.toMatchObject({ status: "SERVICE_UNAVAILABLE" });
      await expect(auth.api.unlinkAccount({ headers, body: { accountId: "own-google" } })).rejects.toMatchObject({ status: "SERVICE_UNAVAILABLE" });
      expect(directFailures).toEqual(["email-change:unavailable", "email-change:unavailable", "unlink-account:unavailable"]);
      expect(actors).toEqual([]);
      await expect(auth.api.changeEmail({ headers: new Headers(), body: { newEmail: "outage@example.test" } })).rejects.toMatchObject({ status: "UNAUTHORIZED" });
      expect(directFailures.at(-1)).toBe("email-change:invalid");
    } finally { fault.mockRestore(); }
    expect({ email: await email(), sessions: (await second.query("select * from session order by id")).rows,
      accounts: (await second.query("select * from account order by id")).rows }).toEqual(before);
    expect(await rows()).toEqual([]);
    const staleHeaders = new Headers(headers); staleHeaders.set("x-vico-account-user", otherId);
    await expect(auth.api.changeEmail({ headers: staleHeaders, body: { newEmail: "outage@example.test" } })).rejects.toMatchObject({ status: "CONFLICT" });
    expect(actors).toEqual([userId]); // resolved identity, never the submitted expectation
  });

  it("F04 rejects duplicate wire fields before email issuance, phase advancement or unlink", async () => {
    const { auth, headers, current } = await ownFixture();
    const service = makeService();
    const initial = await service.requestEmailChange({ ...actor, sessionId: current.session.id }, "wire@example.test");
    const pending = await rows();
    let network = 10;
    const post = (path: string, body: string, contentType = "application/json") => {
      const wireHeaders = new Headers(headers);
      wireHeaders.set("cf-connecting-ip", "203.0.113." + network++);
      wireHeaders.set("Content-Type", contentType);
      return auth.handler(new Request(environment.BETTER_AUTH_URL + "/api/auth/" + path, { method: "POST", headers: wireHeaders, body }));
    };
    for (const [path, body] of [
      ["change-email", '{"newEmail":"wire@example.test","newEmail":"wire@example.test"}'],
      ["change-email", '{"newEmail":"wire@example.test","callbackURL":"/en","callbackURL":"/ru"}'],
      ["change-email", '{"newEmail":"wire@example.test","new\\u0045mail":"wire@example.test"}'],
      ["confirm-email-change", JSON.stringify({ token: initial.token }).replace(/}$/, ',"token":' + JSON.stringify(initial.token) + '}')],
      ["unlink-account", '{"accountId":"own-google","accountId":"own-google"}'],
      ["unlink-account", '{"accountId":"own-google","providerId":"google","providerId":"google"}'],
    ]) {
      const response = await post(path, body);
      expect(response.status).toBe(400);
      expect(response.headers.getSetCookie()).toEqual([]);
      expect(await response.text()).not.toContain(initial.token);
    }
    for (const contentType of ["application/x-www-form-urlencoded", "multipart/form-data; boundary=fixture"]) {
      expect((await post("unlink-account", "accountId=own-google&accountId=own-google", contentType)).status).toBe(415);
    }
    expect(await rows()).toEqual(pending);
    expect((await email()).email).toBe("member@example.test");
    expect((await second.query("select id from account where id='own-google'")).rowCount).toBe(1);
    expect((await post("change-email", JSON.stringify({ newEmail: "valid@example.test", callbackURL: "/en" }))).status).toBe(200);
    expect(await rows()).not.toEqual(pending);
    await expect(auth.api.unlinkAccount({ headers, body: { accountId: "own-google" } })).resolves.toEqual({ status: true });
  });

  it.each(["disabled", "rejected", "unavailable", "uncertain"] as const)("F03 retains safe pending state and permits explicit restart after %s mail in both phases", async status => {
    const tokens: string[] = [], observed: OwnerOperationalFact[] = [];
    const { auth, headers } = await ownFixture({
      mail: {
        async buildActionURL(input) { tokens.push(input.token); return "http://localhost:3000/en/settings/account#token=" + input.token; },
        async sendAuthMail() { return { status }; },
      },
      mailObservations: { async append(fact) { observed.push(fact); } },
    });
    const sessions = (await second.query("select * from session order by id")).rows;
    await expect(auth.api.changeEmail({ headers, body: { newEmail: "failed-mail@example.test" } })).resolves.toEqual({ status: true });
    expect(JSON.parse((await rows())[0].value).phase).toBe("old-address");
    await expect(auth.api.confirmEmailChange({ headers, body: { token: tokens[0] } })).resolves.toEqual({ status: true });
    expect(JSON.parse((await rows())[0].value).phase).toBe("new-address");
    expect((await email()).email).toBe("member@example.test");
    expect((await second.query("select * from session order by id")).rows).toEqual(sessions);
    expect(observed).toHaveLength(2);
    expect(observed.map(fact => fact.values)).toEqual([
      expect.objectContaining({ mailPurpose: "email-change-confirmation", mailOutcome: status }),
      expect.objectContaining({ mailPurpose: "email-change-verification", mailOutcome: status }),
    ]);
    await auth.api.changeEmail({ headers, body: { newEmail: "restart@example.test" } });
    expect(JSON.parse((await rows())[0].value).phase).toBe("old-address");
    for (const token of tokens.slice(0, 2)) {
      await expect(auth.api.confirmEmailChange({ headers, body: { token } })).rejects.toMatchObject({ status: "BAD_REQUEST" });
    }
    expect((await email()).email).toBe("member@example.test");
  });

  it.each(["old-address", "new-address"] as const)("rejects a different real own session and a stale initiating session in %s", async phase => {
    const { auth, headers, current } = await ownFixture();
    const service = makeService();
    const owner = { ...actor, sessionId: current.session.id };
    const initial = await service.requestEmailChange(owner, "bound@example.test");
    const next = phase === "new-address" ? await service.confirmEmailChange(owner, initial.token) : null;
    const token = next && "proof" in next ? next.proof.token : initial.token;
    const login = await auth.api.signInEmail({ body: { email: "member@example.test", password: "fixture-only-original-password" }, asResponse: true });
    const cookie = login.headers.getSetCookie().find(value => value.includes("session_token="))!.split(";", 1)[0];
    const other = await auth.api.getSession({ headers: new Headers({ cookie }) });
    const switched = new Headers(headers); switched.set("cookie", cookie); switched.set("x-vico-account-session", other!.session.id);
    const pending = await rows();
    const request = (given: Headers) => auth.handler(new Request(environment.BETTER_AUTH_URL + "/api/auth/confirm-email-change", {
      method: "POST", headers: given, body: JSON.stringify({ token }),
    }));
    expect((await request(switched)).status).toBe(400);
    await first.query("update session set created_at=now()-interval '2 days' where id=$1", [current.session.id]);
    await expect(auth.api.confirmEmailChange({ headers, body: { token } })).rejects.toMatchObject({ status: "BAD_REQUEST" });
    expect(await rows()).toEqual(pending);
    expect((await email()).email).toBe("member@example.test");
    expect((await second.query("select id from session where user_id=$1", [userId])).rowCount).toBe(3);
  });

  it("email commit invalidates existing verification, native reset and own creation proofs", async () => {
    const { auth, headers, current } = await ownFixture();
    const owner = { ...actor, sessionId: current.session.id };
    const tx = new AuthLifecycleTransaction(first);
    const lifecycle = new AuthLifecycleState(first, tx);
    const credential = new AuthCredentialLifecycle(first, tx, lifecycle, new AuthLifecycleBudget(first, tx, secret), secret);
    const verification = await lifecycle.withSubject(userId, subject => subject.issue({ purpose: "email-verification" }, ({ claims }) => signEmailVerificationProof(secret, claims)));
    const creation = await lifecycle.withSubject(userId, subject => subject.issue({ purpose: "password-create", sessionId: current.session.id }, testToken));
    const reset = await credential.requestReset("member@example.test", (await auth.$context).internalAdapter.createVerificationValue);
    expect(reset).not.toBeNull();
    const service = makeService();
    const initial = await service.requestEmailChange(owner, "invalidate@example.test");
    const next = await service.confirmEmailChange(owner, initial.token);
    if (!("proof" in next)) throw new Error("Expected second phase");
    await service.confirmEmailChange(owner, next.proof.token);
    expect(await rows()).toEqual([]); // includes the hashed native reset record
    await expect(auth.api.verifyEmail({ body: { token: verification.token } })).rejects.toMatchObject({ status: "BAD_REQUEST" });
    await expect(auth.api.resetPassword({ body: { token: reset!.token, newPassword: "must-not-replace-password" } })).rejects.toMatchObject({ status: "BAD_REQUEST" });
    await expect(lifecycle.withSubject(userId, subject => subject.consume(proof(creation, current.session.id)))).rejects.toBeInstanceOf(InvalidLifecycleProofError);
    await expect(auth.api.confirmEmailChange({ headers, body: { token: initial.token } })).rejects.toMatchObject({ status: "BAD_REQUEST" });
    expect((await email()).email).toBe("invalidate@example.test");
  });

  it("changes email only after explicit old and new address confirmations and preserves the initiating session", async () => {
    await first.query('update "user" set email_verified=true where id=$1', [userId]);
    await first.query("insert into session(id,user_id,token,expires_at,updated_at) values ('other-own',$1,'other-own-token',now()+interval '1 day',now())", [userId]);
    const service = makeService();
    const original = await email();
    const issued = await service.requestEmailChange(actor, "new@example.test");
    expect(issued.recipient).toBe("member@example.test");
    expect(await email()).toEqual(original);
    const next = await service.confirmEmailChange(actor, issued.token);
    expect("proof" in next).toBe(true);
    if (!("proof" in next)) throw new Error("Expected new-address proof");
    expect(next.proof.recipient).toBe("new@example.test");
    await expect(service.confirmEmailChange(actor, issued.token)).rejects.toBeInstanceOf(InvalidLifecycleProofError);
    expect(await email()).toEqual(original);
    const final = await service.confirmEmailChange(actor, next.proof.token);
    expect(final).toMatchObject({ transition: { kind: "email", userId, revokedSessionIds: ["other-own"] } });
    expect(await email()).toEqual({ email: "new@example.test", email_verified: true });
    expect((await second.query("select id from session order by id")).rows.map(row => row.id).sort()).toEqual([sessionId,otherSessionId].sort());
    expect(await rows()).toEqual([]);
  });

  it("invalidates a prior generation on restart and rejects a different current session", async () => {
    await first.query('update "user" set email_verified=true where id=$1', [userId]);
    const service = makeService();
    const a = await service.requestEmailChange(actor, "a@example.test");
    const b = await service.requestEmailChange(actor, "b@example.test");
    await expect(service.confirmEmailChange(actor, a.token)).rejects.toBeInstanceOf(InvalidLifecycleProofError);
    await expect(service.confirmEmailChange({ ...actor, sessionId: otherSessionId }, b.token)).rejects.toBeInstanceOf(InvalidLifecycleProofError);
    expect((await email()).email).toBe("member@example.test");
  });

  it("rejects Google-only and hashless unlink, then permits unlink with verified usable password", async () => {
    await first.query('update "user" set email_verified=true where id=$1', [userId]);
    await first.query("insert into account(id,user_id,provider_id,account_id,password,updated_at) values ('own-google',$1,'google','google-immutable',null,now()),('empty-password',$1,'credential',$1,'',now())", [userId]);
    const service = makeService();
    await expect(service.unlinkGoogle(actor, "own-google")).rejects.toBeInstanceOf(AccountMethodConflictError);
    await first.query("update account set password='fixture-usable-hash' where id='empty-password'");
    const transition = await service.unlinkGoogle(actor, "own-google");
    expect(transition).toEqual({ kind: "unlink", userId, accountId: "own-google" });
    expect((await second.query("select id from session")).rowCount).toBe(2);
  });
  it("shares HTTP and direct own-email confirmation, protects last method in the native adapter", async () => {
    const sent: Array<{ token: string; recipient: string; purpose: string }> = [];
    const actionLocales: string[] = [];
    const mailLocales: Array<{ locale: string; actionLocale?: string }> = [];
    const facts: AuthTransitionFact[] = [];
    await first.query('update "user" set email_verified=true,locale=$2 where id=$1', [userId, "he"]);
    await first.query("insert into account(id,user_id,provider_id,account_id,password,updated_at) values ('own-password',$1,'credential',$1,$2,now()),('own-google',$1,'google','immutable-google-id',null,now())",
      [userId, await hashPassword("fixture-only-original-password")]);
    const auth = createAuth(drizzle(first), {
      BETTER_AUTH_URL: "http://localhost:3000", BETTER_AUTH_SECRET: secret,
      GOOGLE_CLIENT_ID: "fake-local-google", GOOGLE_CLIENT_SECRET: "fake-local-secret",
    }, undefined, undefined, undefined, { capture(f) { facts.push(f); }, trustedActorFor() { return null; } },
    undefined, undefined, undefined, false, undefined, { mail: {
      async buildActionURL(input) { actionLocales.push(input.locale); return "http://localhost:3000/" + input.locale + "/settings/account#token=" + input.token; },
      async sendAuthMail(input) {
        mailLocales.push({ locale: input.locale, actionLocale: input.actionLocale });
        sent.push({ token: new URL(input.actionURL).hash.slice(7), recipient: input.recipient, purpose: input.purpose });
        return { status: "accepted" };
      },
    } });
    const login = await auth.api.signInEmail({ body: { email: "member@example.test", password: "fixture-only-original-password" }, asResponse: true });
    const cookie = login.headers.getSetCookie().find(value => value.includes("session_token="))!.split(";",1)[0];
    const current = await auth.api.getSession({ headers: new Headers({ cookie }) });
    const headers = new Headers({ cookie, Origin: "http://localhost:3000",
      "Content-Type": "application/json", "x-vico-account-user": userId, "x-vico-account-session": current!.session.id });
    await expect(auth.api.changeEmail({ headers: new Headers({ cookie }), body: { newEmail: "changed@example.test" } }))
      .rejects.toMatchObject({ status: "CONFLICT" });
    const requested = await auth.handler(new Request("http://localhost:3000/api/auth/change-email",
      { method: "POST", headers, body: JSON.stringify({ newEmail: "changed@example.test" }) }));
    expect(requested.status).toBe(200);
    expect(sent[0]).toMatchObject({ recipient: "member@example.test", purpose: "email-change-confirmation" });
    // A preference changed after issuance is read again for the second phase.
    // Null is the bootstrap fallback, not the newly submitted callback locale.
    await second.query('update "user" set locale=null where id=$1', [userId]);
    await auth.api.confirmEmailChange({ headers, body: { token: sent[0].token, callbackURL: "/ru" } });
    expect(actionLocales).toEqual(["en", "ru"]);
    expect(mailLocales).toEqual([{ locale: "he", actionLocale: "en" }, { locale: "en", actionLocale: "ru" }]);
    expect(sent[1]).toMatchObject({ recipient: "changed@example.test", purpose: "email-change-verification" });
    await auth.api.confirmEmailChange({ headers, body: { token: sent[1].token } });
    expect((await email()).email).toBe("changed@example.test");
    await auth.api.unlinkAccount({ headers, body: { accountId: "own-google" } });
    expect(facts).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "auth.emailChanged", userId }),
      expect.objectContaining({ kind: "auth.methodUnlinked", accountId: "own-google", userId }),
    ]));
    const native = (await auth.$context).adapter;
    await expect(native.delete({ model: "account", where: [{ field: "id", value: "own-password" }] }))
      .rejects.toMatchObject({ status: "CONFLICT" });
  });

  it("rolls back final email consumption and update if session revocation fails", async () => {
    await first.query('update "user" set email_verified=true where id=$1', [userId]);
    await first.query("insert into session(id,user_id,token,expires_at,updated_at) values ('own-extra',$1,'own-extra-token',now()+interval '1 day',now())", [userId]);
    const service = makeService();
    const issued = await service.requestEmailChange(actor, "rollback@example.test");
    const next = await service.confirmEmailChange(actor, issued.token);
    if (!("proof" in next)) throw new Error("Expected second phase");
    await first.query(`
      create function deny_email_session_delete() returns trigger language plpgsql as $$
      begin raise exception 'test revocation failure'; end; $$;
      create trigger deny_email_session_delete before delete on session for each row execute function deny_email_session_delete()
    `);
    try {
      await expect(service.confirmEmailChange(actor, next.proof.token)).rejects.toThrow();
      expect((await email()).email).toBe("member@example.test");
      expect(await rows()).toHaveLength(1);
      expect((await second.query("select id from session")).rowCount).toBe(3);
    } finally {
      await first.query("drop trigger deny_email_session_delete on session; drop function deny_email_session_delete()");
    }
    await expect(service.confirmEmailChange(actor, next.proof.token)).resolves.toHaveProperty("transition");
  });

  it("lets only one of two verified identities commit an occupied-address race", async () => {
    await first.query('update "user" set email_verified=true');
    const a = makeService();
    const b = makeService(second);
    const other = { userId: otherId, sessionId: otherSessionId, freshAgeSeconds: 3600 };
    const initial = await a.requestEmailChange(actor, "occupied@example.test");
    const initialOther = await b.requestEmailChange(other, "occupied@example.test");
    const next = await a.confirmEmailChange(actor, initial.token);
    const nextOther = await b.confirmEmailChange(other, initialOther.token);
    if (!("proof" in next) || !("proof" in nextOther)) throw new Error("Expected second phase");
    const results = await Promise.allSettled([
      a.confirmEmailChange(actor, next.proof.token), b.confirmEmailChange(other, nextOther.proof.token),
    ]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find(result => result.status === "rejected")?.reason).toBeInstanceOf(AccountMethodConflictError);
    expect((await first.query('select id from "user" where email=$1', ["occupied@example.test"])).rowCount).toBe(1);
    expect(await rows()).toHaveLength(1);
  });

  it("serializes native adapter deletes so two contenders cannot remove both usable methods", async () => {
    await first.query('update "user" set email_verified=true where id=$1', [userId]);
    await first.query("insert into account(id,user_id,provider_id,account_id,password,updated_at) values ('race-password',$1,'credential',$1,'fixture-hash',now()),('race-google',$1,'google','immutable-google',null,now())", [userId]);
    const env = { BETTER_AUTH_URL: "http://localhost:3000", BETTER_AUTH_SECRET: secret,
      GOOGLE_CLIENT_ID: "fake-local-google", GOOGLE_CLIENT_SECRET: "fake-local-secret" };
    const a = (await createAuth(drizzle(first), env).$context).adapter;
    const b = (await createAuth(drizzle(second), env).$context).adapter;
    const result = await Promise.allSettled([
      a.delete({ model: "account", where: [{ field: "id", value: "race-password" }] }),
      b.delete({ model: "account", where: [{ field: "id", value: "race-google" }] }),
    ]);
    expect(result.filter(item => item.status === "fulfilled")).toHaveLength(1);
    expect(result.find(item => item.status === "rejected")?.reason).toMatchObject({ status: "CONFLICT" });
    expect((await first.query("select id from account where user_id=$1", [userId])).rowCount).toBe(1);
    expect((await first.query("select id from session")).rowCount).toBe(2);
  });

});
