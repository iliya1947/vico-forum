import { generateRandomString } from "better-auth/crypto";
import type { Client } from "pg";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import type { AuthLifecycleBudget } from "./lifecycle-budget.server";
import {
  decodeCredentialProof, signCredentialProof, type CredentialProofPurpose,
} from "./credential-lifecycle-proof.server";
import {
  InvalidLifecycleProofError, LifecycleStateInvariantError, lifecycleProofTtlSeconds,
  type AuthLifecycleState, type IssuedLifecycleProof, type LifecycleProof,
} from "./lifecycle-state.server";
import type { AuthLifecycleTransaction } from "./lifecycle-transaction.server";

export type FreshCredentialSession = Readonly<{
  userId: string;
  sessionId: string;
  freshAgeSeconds: number;
}>;

export type CredentialTransition = Readonly<{
  purpose: CredentialProofPurpose;
  userId: string;
  generation: string;
  accountId: string;
  revokedSessionIds: readonly string[];
}>;

export class CredentialAlreadySetError extends Error {
  constructor() { super("A password is already set"); this.name = "CredentialAlreadySetError"; }
}

type WriteResetVerification = (data: { identifier: string; value: string; expiresAt: Date }) => Promise<{ id: string }>;
type ResetTarget = Readonly<{ purpose: "password-reset"; token: string; identifier: string; nativeId: string; userId: string }>;

async function nativeResetIdentifier(token: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("reset-password:" + token));
  return btoa(String.fromCharCode(...new Uint8Array(hash))).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

type Identity = {
  email: string;
  email_verified: boolean;
  credential_id: string | null;
  has_password: boolean;
  has_google: boolean;
};

function absentAccount(error: unknown): boolean {
  return error instanceof AccountMissingError || error instanceof AccountInactiveError;
}

/** All identity reads and writes run inside the lifecycle subject lock.
 * Proofs are returned after commit so callers can send mail outside the transaction.
 */
export class AuthCredentialLifecycle {
  constructor(
    private readonly client: Pick<Client, "query">,
    private readonly transaction: AuthLifecycleTransaction,
    private readonly state: AuthLifecycleState,
    private readonly budget: AuthLifecycleBudget,
    private readonly secret: string,
  ) {
    transaction.assertConnection(client);
  }

  private assertOutsideTransaction(): void {
    if (this.transaction.ownsCurrentWork()) throw new LifecycleStateInvariantError();
  }

  private async identity(userId: string): Promise<Identity> {
    const result = await this.client.query<Identity>(`
      select u.email, u.email_verified, c.id as credential_id,
        coalesce(c.password <> '', false) as has_password,
        exists(select 1 from account g where g.user_id=u.id and g.provider_id='google') as has_google
      from "user" u
      left join account c on c.user_id=u.id and c.provider_id='credential'
      where u.id=$1
    `, [userId]);
    if (result.rowCount !== 1 || !result.rows[0]) throw new LifecycleStateInvariantError();
    return result.rows[0];
  }

  private async assertFresh(session: FreshCredentialSession): Promise<void> {
    if (!Number.isSafeInteger(session.freshAgeSeconds) || session.freshAgeSeconds <= 0) {
      throw new InvalidLifecycleProofError();
    }
    const result = await this.client.query(`
      select 1 from session
      where id=$1 and user_id=$2
        and expires_at > timezone('UTC', clock_timestamp())
        and created_at > timezone('UTC', clock_timestamp()) - $3::int * interval '1 second'
      for update
    `, [session.sessionId, session.userId, session.freshAgeSeconds]);
    if (result.rowCount !== 1) throw new InvalidLifecycleProofError();
  }

  async requestReset(email: string, writeNative: WriteResetVerification): Promise<IssuedLifecycleProof | null> {
    this.assertOutsideTransaction();
    return this.budget.run({ kind: "mail", purpose: "password-reset", email }, async () => {
      const result = await this.client.query<{ id: string }>('select id from "user" where email=$1', [email]);
      const userId = result.rows[0]?.id;
      if (!userId) return null;
      try {
        return await this.state.withSubject(userId, async subject => {
          const identity = await this.identity(userId);
          if (identity.email !== email || !identity.email_verified || !identity.has_password) return null;
          const token = generateRandomString(24, "a-z", "A-Z", "0-9");
          const { rows } = await this.client.query<{ expires_at: Date }>(
            "select clock_timestamp() + $1::int * interval '1 second' as expires_at", [lifecycleProofTtlSeconds["password-reset"]],
          );
          const native = await writeNative({ identifier: "reset-password:" + token, value: userId, expiresAt: rows[0].expires_at });
          if (!native.id) throw new LifecycleStateInvariantError();
          return subject.issue({ purpose: "password-reset", nativeResetId: native.id }, () => token);
        });
      } catch (error) {
        if (absentAccount(error)) return null;
        throw error;
      }
    });
  }

  async requestCreation(session: FreshCredentialSession, expectedEmail: string): Promise<IssuedLifecycleProof> {
    this.assertOutsideTransaction();
    return this.budget.run({ kind: "mail", purpose: "password-create", userId: session.userId, email: expectedEmail },
      async () => this.state.withSubject(session.userId, async subject => {
        await this.assertFresh(session);
        const identity = await this.identity(session.userId);
        if (identity.email !== expectedEmail || !identity.email_verified || identity.has_password || !identity.has_google) {
          throw new InvalidLifecycleProofError();
        }
        return subject.issue({ purpose: "password-create", sessionId: session.sessionId },
          ({ claims }) => signCredentialProof(this.secret, claims));
      }));
  }

  private async resolveReset(token: unknown): Promise<ResetTarget> {
    if (typeof token !== "string" || !/^[A-Za-z0-9]{24}$/.test(token)) throw new InvalidLifecycleProofError();
    const identifier = await nativeResetIdentifier(token);
    const result = await this.client.query<{ id: string; value: string }>(`
      select id,value from verification where identifier=$1 and expires_at > timezone('UTC', clock_timestamp())
      limit 2
    `, [identifier]);
    if (result.rowCount !== 1 || !result.rows[0]) throw new InvalidLifecycleProofError();
    return { purpose: "password-reset", token, identifier, nativeId: result.rows[0].id, userId: result.rows[0].value };
  }

  async inspectReset(token: unknown): Promise<void> {
    this.assertOutsideTransaction();
    const proof = await this.resolveReset(token);
    try {
      await this.state.withSubject(proof.userId, async subject => {
        const identity = await this.identity(proof.userId);
        if (!identity.has_password || !identity.email_verified) throw new InvalidLifecycleProofError();
        const current = await this.resolveReset(proof.token);
        if (current.nativeId !== proof.nativeId || current.userId !== proof.userId) throw new InvalidLifecycleProofError();
        await subject.resolveNativeReset(proof.token, proof.nativeId);
      });
    } catch (error) {
      if (absentAccount(error)) throw new InvalidLifecycleProofError();
      throw error;
    }
  }

  async reset(token: unknown, password: string, hash: (password: string) => Promise<string>): Promise<CredentialTransition> {
    this.assertOutsideTransaction();
    return this.budget.run({ kind: "terminal", purpose: "password-reset" }, async () => {
      const proof = await this.resolveReset(token);
      return this.change(proof, password, hash);
    });
  }

  async create(session: FreshCredentialSession, token: unknown, password: string,
    hash: (password: string) => Promise<string>): Promise<CredentialTransition> {
    this.assertOutsideTransaction();
    return this.budget.run({ kind: "own", purpose: "password-create", userId: session.userId }, async () => {
      const proof = await decodeCredentialProof(this.secret, token, "password-create");
      if (proof.userId !== session.userId) throw new InvalidLifecycleProofError();
      return this.change({ ...proof, sessionId: session.sessionId }, password, hash, session);
    });
  }

  private async change(target: LifecycleProof | ResetTarget, password: string,
    hash: (password: string) => Promise<string>, session?: FreshCredentialSession): Promise<CredentialTransition> {
    if (typeof password !== "string" || password.length < 8 || password.length > 128) {
      throw new InvalidLifecycleProofError();
    }
    const hashed = await hash(password);
    if (typeof hashed !== "string" || !hashed) throw new LifecycleStateInvariantError();
    try {
      return await this.state.withSubject(target.userId, async subject => {
        const proof = "nativeId" in target ? await subject.resolveNativeReset(target.token, target.nativeId) : target;
        if (session) await this.assertFresh(session);
        const identity = await this.identity(proof.userId);
        if (!identity.email_verified || (session ? !identity.has_google : !identity.has_password)) {
          throw new InvalidLifecycleProofError();
        }
        if (session && identity.has_password) throw new CredentialAlreadySetError();
        await subject.consume(proof);
        if ("nativeId" in target) {
          const consumed = await this.client.query(`
            delete from verification where id=$1 and identifier=$2 and value=$3
              and expires_at > timezone('UTC', clock_timestamp()) returning id
          `, [target.nativeId, target.identifier, target.userId]);
          if (consumed.rowCount !== 1) throw new InvalidLifecycleProofError();
        }
        const changed = identity.credential_id
          ? await this.client.query<{ id: string }>(`
              update account set password=$1, updated_at=timezone('UTC', clock_timestamp())
              where id=$2 and user_id=$3 and provider_id='credential'
                and coalesce(password <> '', false)=$4 returning id
            `, [hashed, identity.credential_id, proof.userId, !session])
          : await this.client.query<{ id: string }>(`
              insert into account (id, account_id, provider_id, user_id, password, updated_at)
              values ($1, $2, 'credential', $2, $3, timezone('UTC', clock_timestamp()))
              on conflict do nothing returning id
            `, [crypto.randomUUID(), proof.userId, hashed]);
        if (changed.rowCount !== 1 || !changed.rows[0]) {
          if (session) throw new CredentialAlreadySetError();
          throw new InvalidLifecycleProofError();
        }

        await subject.invalidate(["password-reset", "password-create", "email-change"]);
        const revoked = await this.client.query<{ id: string }>(`
          delete from session where user_id=$1 and ($2::text is null or id <> $2)
          returning id
        `, [proof.userId, session?.sessionId ?? null]);
        return { userId: proof.userId, generation: proof.generation, accountId: changed.rows[0].id,
          purpose: session ? "password-create" : "password-reset", revokedSessionIds: revoked.rows.map(row => row.id) };
      });
    } catch (error) {
      if (absentAccount(error)) throw new InvalidLifecycleProofError();
      throw error;
    }
  }
}
