import type { Client } from "pg";
import { signJWT, verifyJWT } from "better-auth/crypto";
import { safeMailAddress } from "./auth-mail-contract.server";
import type { FreshCredentialSession } from "./credential-lifecycle.server";
import type { AuthLifecycleBudget } from "./lifecycle-budget.server";
import { AuthLifecycleState, InvalidLifecycleProofError, lifecycleProofTtlSeconds, type LifecycleClaims,
  type LifecycleProof, type IssuedLifecycleProof } from "./lifecycle-state.server";

export class AccountMethodConflictError extends Error {
  constructor() { super("Account operation conflicts with current state"); this.name = "AccountMethodConflictError"; }
}

export async function assertFreshAccountSession(client: Pick<Client, "query">, actor: FreshCredentialSession): Promise<void> {
  if (!Number.isSafeInteger(actor.freshAgeSeconds) || actor.freshAgeSeconds < 1) throw new InvalidLifecycleProofError();
  const result = await client.query(`
    select 1 from session where id=$1 and user_id=$2
      and expires_at > timezone('UTC',clock_timestamp())
      and created_at > timezone('UTC',clock_timestamp()) - $3::int*interval '1 second' for update
  `, [actor.sessionId, actor.userId, actor.freshAgeSeconds]);
  if (result.rowCount !== 1) throw new InvalidLifecycleProofError();
}

/** Called while the user row is locked, including native adapter deletes. */
export async function assertRemainingAccountMethod(client: Pick<Client, "query">,
  userId: string, deletingIds: readonly string[], googleEnabled: boolean): Promise<void> {
  const remaining = await client.query(`
    select 1 from account a join "user" u on u.id=a.user_id where a.user_id=$1
      and not (a.id=any($2::text[]))
      and ((a.provider_id='credential' and a.account_id=u.id and coalesce(a.password<>'',false) and u.email_verified)
        or (a.provider_id='google' and a.account_id<>'' and $3::boolean)) limit 1
  `, [userId, deletingIds, googleEnabled]);
  if (remaining.rowCount !== 1) throw new AccountMethodConflictError();
}

export type AccountLifecycleTransition =
  | { kind: "email"; userId: string; generation: string; revokedSessionIds: string[] }
  | { kind: "unlink"; userId: string; accountId: string };

export class AccountSecurityLifecycle {
  constructor(private readonly client: Pick<Client, "query">, private readonly state: AuthLifecycleState,
    private readonly budget: AuthLifecycleBudget, private readonly secret: string,
    private readonly googleEnabled: boolean) {}

  private sign(claims: LifecycleClaims): Promise<string> {
    return signJWT({ proofType: "vico-email-change:v1", ...claims }, this.secret, lifecycleProofTtlSeconds["email-change"]);
  }

  private async decode(actor: FreshCredentialSession, token: unknown): Promise<LifecycleProof> {
    if (typeof token !== "string" || token.length > 2048) throw new InvalidLifecycleProofError();
    const claims = await verifyJWT<Record<string, unknown>>(token, this.secret);
    if (!claims || claims.proofType !== "vico-email-change:v1" || claims.userId !== actor.userId ||
        claims.purpose !== "email-change" || (claims.phase !== "old-address" && claims.phase !== "new-address") ||
        typeof claims.generation !== "string") throw new InvalidLifecycleProofError();
    return { token, userId: actor.userId, purpose: "email-change", phase: claims.phase,
      generation: claims.generation, sessionId: actor.sessionId };
  }

  async requestEmailChange(actor: FreshCredentialSession, newEmail: string): Promise<IssuedLifecycleProof> {
    const email = newEmail.trim().toLowerCase();
    if (!safeMailAddress(email)) throw new InvalidLifecycleProofError();
    await this.budget.run({ kind: "own", purpose: "email-change", userId: actor.userId }, async () => undefined);
    return this.budget.run({ kind: "mail", purpose: "email-change", userId: actor.userId, email }, () =>
        this.state.withSubject(actor.userId, async subject => {
          await assertFreshAccountSession(this.client, actor);
          const current = (await this.client.query<{ email: string; email_verified: boolean }>(
            'select email,email_verified from "user" where id=$1', [actor.userId])).rows[0];
          if (!current?.email_verified || current.email === email) throw new InvalidLifecycleProofError();
          return subject.issue({ purpose: "email-change", sessionId: actor.sessionId, newEmail: email },
            ({ claims }) => this.sign(claims));
        }));
  }

  async confirmEmailChange(actor: FreshCredentialSession, token: unknown): Promise<
    { proof: IssuedLifecycleProof } | { transition: AccountLifecycleTransition }> {
    return this.budget.run({ kind: "own", purpose: "email-change", userId: actor.userId }, async () => {
      const proof = await this.decode(actor, token);
      try {
        return await this.state.withSubject(actor.userId, async subject => {
          await assertFreshAccountSession(this.client, actor);
          if (proof.phase === "old-address") {
            return { proof: await subject.advanceEmailChange(proof, ({ claims }) => this.sign(claims)) };
          }
          const consumed = await subject.consume(proof);
          if (!consumed.newEmail) throw new InvalidLifecycleProofError();
          const updated = await this.client.query(`
            update "user" set email=$1,email_verified=true,updated_at=timezone('UTC',clock_timestamp())
            where id=$2 and email=$3 and email_verified=true returning id
          `, [consumed.newEmail, actor.userId, consumed.email]);
          if (updated.rowCount !== 1) throw new InvalidLifecycleProofError();
          await subject.invalidate(["email-verification", "password-reset", "password-create", "email-change"]);
          const revoked = await this.client.query<{ id: string }>(
            'delete from session where user_id=$1 and id<>$2 returning id', [actor.userId, actor.sessionId]);
          return { transition: { kind: "email", userId: actor.userId, generation: proof.generation,
            revokedSessionIds: revoked.rows.map(row => row.id) } };
        });
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "23505") {
          throw new AccountMethodConflictError();
        }
        throw error;
      }
    });
  }

  async unlinkGoogle(actor: FreshCredentialSession, accountId: string): Promise<AccountLifecycleTransition> {
    return this.budget.run({ kind: "own", purpose: "unlink-account", userId: actor.userId }, () =>
      this.state.withSubject(actor.userId, async () => {
        await assertFreshAccountSession(this.client, actor);
        const row = await this.client.query(
          "select id from account where id=$1 and user_id=$2 and provider_id='google'", [accountId, actor.userId]);
        if (row.rowCount !== 1) throw new AccountMethodConflictError();
        await assertRemainingAccountMethod(this.client, actor.userId, [accountId], this.googleEnabled);
        const deleted = await this.client.query(
          "delete from account where id=$1 and user_id=$2 and provider_id='google' returning id", [accountId, actor.userId]);
        if (deleted.rowCount !== 1) throw new AccountMethodConflictError();
        return { kind: "unlink", userId: actor.userId, accountId };
      }));
  }
}
