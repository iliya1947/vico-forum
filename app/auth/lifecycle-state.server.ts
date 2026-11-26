import type { Client } from "pg";
import { assertActiveAccountForMutation } from "../../db/account-state";
import { AuthLifecycleTransaction } from "./lifecycle-transaction.server";

const PREFIX = "vico-auth-lifecycle:v1:";
export const lifecyclePurposes = ["email-verification", "password-reset", "password-create", "email-change"] as const;
export type LifecyclePurpose = typeof lifecyclePurposes[number];
type Phase = "pending" | "old-address" | "new-address";
export const lifecycleProofTtlSeconds: Readonly<Record<LifecyclePurpose, number>> = Object.freeze({
  "email-verification": 3600, "password-reset": 1800,
  "password-create": 1800, "email-change": 3600,
});
const idPattern = /^[A-Za-z0-9._:-]{1,200}$/;
const generationPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const digestPattern = /^[0-9a-f]{64}$/;

export type LifecycleIntent =
  | { purpose: "email-verification" }
  | { purpose: "password-reset"; nativeResetId?: string }
  | { purpose: "password-create"; sessionId: string }
  | { purpose: "email-change"; sessionId: string; newEmail: string };

export type LifecycleClaims = Readonly<{
  userId: string; purpose: LifecyclePurpose; phase: Phase; generation: string;
}>;

type State = LifecycleClaims & Readonly<{
  version: 1; email: string; tokenDigest: string;
  sessionId?: string; newEmail?: string; nativeResetId?: string;
}>;

export type IssuedLifecycleProof = Readonly<{
  claims: LifecycleClaims; token: string; expiresAt: Date; recipient: string;
}>;

/** Authoritative locked email snapshot for local signing and post-commit delivery. */
type TokenContext = Readonly<{
  claims: LifecycleClaims; email: string; recipient: string; newEmail?: string;
}>;

/** Claims must come from verified signing/native-token resolution, never a form userId.
 * sessionId, when required, is the authoritative current own session ID, NOT a bearer.
 * Origin, freshness, identity expectations and operation-specific eligibility are
 * enforced by the canonical endpoint before this private storage boundary.
 */
export type LifecycleProof = LifecycleClaims & Readonly<{ token: string; sessionId?: string }>;

export class InvalidLifecycleProofError extends Error {
  constructor() { super("Invalid or expired authentication operation"); this.name = "InvalidLifecycleProofError"; }
}
export class LifecycleStateInvariantError extends Error {
  constructor() { super("Unexpected authentication lifecycle state"); this.name = "LifecycleStateInvariantError"; }
}

function validId(value: unknown): value is string {
  return typeof value === "string" && idPattern.test(value);
}
function validEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && value === value.toLowerCase() &&
    /^[^\s@]+@[^\s@]+$/.test(value) &&
    !Array.from(value).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
}
function validPurpose(value: unknown): value is LifecyclePurpose {
  return typeof value === "string" && lifecyclePurposes.some(p => p === value);
}
function validPhase(purpose: LifecyclePurpose, phase: unknown): phase is Phase {
  return purpose === "email-change" ? phase === "old-address" || phase === "new-address" : phase === "pending";
}
function validToken(value: unknown): value is string {
  return typeof value === "string" && value.length >= 16 && value.length <= 4096 && /^[!-~]+$/.test(value);
}
async function digest(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}
async function key(userId: string, purpose: LifecyclePurpose): Promise<string> {
  return PREFIX + purpose + ":" + await digest(userId);
}

function decode(raw: unknown, userId: string, purpose: LifecyclePurpose): State {
  if (typeof raw !== "string" || raw.length > 4096) throw new LifecycleStateInvariantError();
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new LifecycleStateInvariantError(); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new LifecycleStateInvariantError();
  const state = value as Record<string, unknown>;
  const own = purpose === "password-create" || purpose === "email-change";
  const fields = ["version", "userId", "purpose", "phase", "generation", "email", "tokenDigest",
    ...(own ? ["sessionId"] : []), ...(purpose === "email-change" ? ["newEmail"] : []),
    ...(purpose === "password-reset" && Object.hasOwn(state, "nativeResetId") ? ["nativeResetId"] : [])];
  if (Object.keys(state).length !== fields.length || !Object.keys(state).every(k => fields.includes(k)) ||
    state.version !== 1 || state.userId !== userId || state.purpose !== purpose ||
    !validEmail(state.email) || !validPhase(purpose, state.phase) ||
    typeof state.generation !== "string" || !generationPattern.test(state.generation) ||
    typeof state.tokenDigest !== "string" || !digestPattern.test(state.tokenDigest) ||
    (own && !validId(state.sessionId)) ||
    (Object.hasOwn(state, "nativeResetId") && !validId(state.nativeResetId)) ||
    (purpose === "email-change" && (!validEmail(state.newEmail) || state.newEmail === state.email))) {
    throw new LifecycleStateInvariantError();
  }
  return state as State;
}

type TokenFactory = (context: TokenContext) => Promise<string> | string;
type Stored = { identifier: string; value: string; live: boolean };

export interface LockedLifecycleSubject {
  issue(intent: LifecycleIntent, createToken: TokenFactory): Promise<IssuedLifecycleProof>;
  /** Non-consuming validation for a landing page; terminal must recheck. */
  inspect(proof: LifecycleProof): Promise<void>;
  resolveNativeReset(token: string, nativeResetId: string): Promise<LifecycleProof>;
  consume(proof: LifecycleProof): Promise<Readonly<Omit<State, "tokenDigest">>>;
  advanceEmailChange(proof: LifecycleProof, createToken: TokenFactory): Promise<IssuedLifecycleProof>;
  invalidate(purposes: readonly LifecyclePurpose[]): Promise<void>;
}

/**
 * Server-only state primitives; no authentication endpoint, delivery or
 * credential mutation here. One deterministic verification PK per user/purpose.
 * Every operation participates in the caller's same-connection transaction.
 * A terminal endpoint MUST perform consume + all identity/session effects
 * inside a single withSubject callback, never commit a consume separately.
 */
export class AuthLifecycleState {
  constructor(private readonly client: Pick<Client, "query">,
    private readonly transaction: AuthLifecycleTransaction) {
    transaction.assertConnection(client);
  }

  async withSubject<T>(userId: string, work: (subject: LockedLifecycleSubject) => Promise<T>): Promise<T> {
    if (!validId(userId)) throw new InvalidLifecycleProofError();
    return this.transaction.run(async () => {
      await assertActiveAccountForMutation(this.client, userId);
      let open = true;
      const scoped = <R>(operation: () => Promise<R>): Promise<R> => {
        if (!open || !this.transaction.ownsCurrentWork()) throw new LifecycleStateInvariantError();
        return this.transaction.run(operation);
      };
      const capability: LockedLifecycleSubject = {
        issue: (intent, createToken) => scoped(() => this.issue(userId, intent, createToken)),
        inspect: proof => scoped(async () => { await this.match(userId, proof); }),
        resolveNativeReset: (token, nativeResetId) => scoped(async () => {
          const current = await this.load(await key(userId, "password-reset"), userId, "password-reset");
          if (!current?.row.live || current.state.nativeResetId !== nativeResetId) throw new InvalidLifecycleProofError();
          const proof: LifecycleProof = { token, userId, purpose: "password-reset",
            generation: current.state.generation, phase: "pending" };
          await this.match(userId, proof);
          return proof;
        }),
        consume: proof => scoped(async () => {
          const state = await this.consume(userId, proof);
          // An old-address confirmation must use the atomic phase transition.
          if (state.phase === "old-address") throw new InvalidLifecycleProofError();
          const { tokenDigest: _digest, ...result } = state;
          void _digest;
          return result;
        }),
        advanceEmailChange: (proof, createToken) => scoped(async () => {
          if (proof.purpose !== "email-change" || proof.phase !== "old-address") throw new InvalidLifecycleProofError();
          const state = await this.consume(userId, proof);
          if (!state.newEmail || !state.sessionId) throw new LifecycleStateInvariantError();
          return this.persist(userId, { purpose: "email-change", newEmail: state.newEmail,
            sessionId: state.sessionId }, "new-address", state.email, createToken);
        }),
        invalidate: purposes => scoped(async () => {
          // Fixed finite purposes, no arbitrary identifier or SQL pattern deletion.
          if (purposes.length > lifecyclePurposes.length || purposes.some(p => !validPurpose(p)))
            throw new LifecycleStateInvariantError();
          for (const purpose of new Set(purposes)) {
            const id = await key(userId, purpose);
            if (purpose === "password-reset") await this.deleteNativeReset((await this.load(id, userId, purpose))?.state);
            await this.client.query("delete from verification where id=$1 and identifier=$1", [id]);
          }
        }),
      };
      try { return await work(capability); }
      finally { open = false; }
    });
  }

  private async currentEmail(userId: string): Promise<string> {
    const row = (await this.client.query<{ email: string }>(
      'select email from "user" where id=$1', [userId],
    )).rows[0];
    if (!row || !validEmail(row.email)) throw new LifecycleStateInvariantError();
    return row.email;
  }

  private async assertSession(userId: string, sessionId: unknown): Promise<void> {
    if (!validId(sessionId)) throw new InvalidLifecycleProofError();
    const row = await this.client.query(
      'select id from "session" where id=$1 and user_id=$2 and expires_at > (clock_timestamp() at time zone \'UTC\')',
      [sessionId, userId],
    );
    if (row.rowCount !== 1) throw new InvalidLifecycleProofError();
  }

  private async load(id: string, userId: string, purpose: LifecyclePurpose): Promise<{ row: Stored; state: State } | null> {
    const row = (await this.client.query<Stored>(
      "select identifier,value,expires_at > (clock_timestamp() at time zone 'UTC') as live from verification where id=$1",
      [id],
    )).rows[0];
    if (!row) return null;
    if (row.identifier !== id) throw new LifecycleStateInvariantError();
    return { row, state: decode(row.value, userId, purpose) };
  }

  private async deleteNativeReset(state: State | undefined): Promise<void> {
    if (state?.nativeResetId) {
      await this.client.query("delete from verification where id=$1 and value=$2", [state.nativeResetId, state.userId]);
    }
  }

  private async issue(userId: string, intent: LifecycleIntent, createToken: TokenFactory): Promise<IssuedLifecycleProof> {
    if (!validPurpose(intent.purpose)) throw new LifecycleStateInvariantError();
    if (intent.purpose === "password-reset" && intent.nativeResetId !== undefined && !validId(intent.nativeResetId)) {
      throw new LifecycleStateInvariantError();
    }
    const email = await this.currentEmail(userId);
    if (intent.purpose === "password-create" || intent.purpose === "email-change") {
      await this.assertSession(userId, intent.sessionId);
    }
    if (intent.purpose === "email-change" && (!validEmail(intent.newEmail) || intent.newEmail === email))
      throw new InvalidLifecycleProofError();
    return this.persist(userId, intent, intent.purpose === "email-change" ? "old-address" : "pending", email, createToken);
  }

  private async persist(userId: string, intent: LifecycleIntent, phase: Phase, email: string,
    createToken: TokenFactory): Promise<IssuedLifecycleProof> {
    const claims: LifecycleClaims = Object.freeze({
      userId, purpose: intent.purpose, phase, generation: crypto.randomUUID(),
    });
    const newEmail = intent.purpose === "email-change" ? intent.newEmail : undefined;
    const recipient = phase === "new-address" && newEmail ? newEmail : email;
    // Local signing/random generation only. Mail/network effects occur after commit.
    // The factory and later delivery must use the locked snapshot, not preflight email.
    const token = await createToken(Object.freeze({ claims, email, recipient,
      ...(newEmail ? { newEmail } : {}) }));
    if (!validToken(token)) throw new LifecycleStateInvariantError();
    const state: State = {
      ...claims, version: 1, email, tokenDigest: await digest(token),
      ...(intent.purpose === "password-create" || intent.purpose === "email-change"
        ? { sessionId: intent.sessionId } : {}),
      ...(intent.purpose === "email-change" ? { newEmail: intent.newEmail } : {}),
      ...(intent.purpose === "password-reset" && intent.nativeResetId ? { nativeResetId: intent.nativeResetId } : {}),
    };
    const id = await key(userId, intent.purpose);
    // Do not silently overwrite unrelated or corrupt persisted data.
    const previous = await this.load(id, userId, intent.purpose);
    await this.deleteNativeReset(previous?.state);
    const result = await this.client.query<{ expires_at: Date }>(`
      insert into verification (id,identifier,value,expires_at,created_at,updated_at)
      values ($1,$1,$2,(clock_timestamp() at time zone 'UTC') + $3::int * interval '1 second',
        clock_timestamp() at time zone 'UTC',clock_timestamp() at time zone 'UTC')
      on conflict (id) do update set value=excluded.value, expires_at=excluded.expires_at,
        updated_at=excluded.updated_at where verification.identifier=excluded.identifier
      returning expires_at at time zone 'UTC' as expires_at
    `, [id, JSON.stringify(state), lifecycleProofTtlSeconds[intent.purpose]]);
    if (result.rowCount !== 1 || !result.rows[0]) throw new LifecycleStateInvariantError();
    return { claims, token, expiresAt: result.rows[0].expires_at, recipient };
  }

  private async match(userId: string, proof: LifecycleProof): Promise<{ id: string; row: Stored; state: State }> {
    if (proof.userId !== userId || !validPurpose(proof.purpose) ||
      !validPhase(proof.purpose, proof.phase) || typeof proof.generation !== "string" ||
      !generationPattern.test(proof.generation) ||
      !validToken(proof.token)) throw new InvalidLifecycleProofError();
    const id = await key(userId, proof.purpose);
    const current = await this.load(id, userId, proof.purpose);
    if (!current?.row.live) throw new InvalidLifecycleProofError();
    const { state, row } = current;
    if (state.generation !== proof.generation || state.phase !== proof.phase ||
      state.email !== await this.currentEmail(userId) || state.tokenDigest !== await digest(proof.token) ||
      state.sessionId !== proof.sessionId) throw new InvalidLifecycleProofError();
    if (state.sessionId) await this.assertSession(userId, proof.sessionId);
    return { id, row, state };
  }

  private async consume(userId: string, proof: LifecycleProof): Promise<State> {
    const { id, row, state } = await this.match(userId, proof);
    // Compare the complete previously read state and authoritative expiry at
    // deletion, not only identifier or a stale read-time validity check.
    const consumed = await this.client.query(
      "delete from verification where id=$1 and identifier=$1 and value=$2 " +
      "and expires_at > (clock_timestamp() at time zone 'UTC') returning id", [id, row.value],
    );
    if (consumed.rowCount !== 1) throw new InvalidLifecycleProofError();
    return state;
  }
}
