import { readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AccountInactiveError } from "../../db/account-state";
import { createAuth } from "../../app/auth/auth.server";
import {
  AuthLifecycleState, InvalidLifecycleProofError, LifecycleStateInvariantError,
  type IssuedLifecycleProof, type LifecycleIntent, type LifecycleProof,
} from "../../app/auth/lifecycle-state.server";
import { AuthLifecycleTransaction } from "../../app/auth/lifecycle-transaction.server";
import { installRegistrationPolicyFixture } from "./registration-policy-fixture";

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
});
beforeEach(async () => {
  await first.query('truncate "user", account, session, verification, rate_limit cascade');
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
  it("registers the request-local service in canonical Better Auth with no added endpoints", async () => {
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
    expect(context.options.plugins?.find(plugin => plugin.id === "vico-auth-lifecycle")?.endpoints).toBeUndefined();
    expect(context.options.emailAndPassword?.requireEmailVerification).toBe(false);
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
