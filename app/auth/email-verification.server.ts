import type { Client } from "pg";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import { AuthMailValidationError, type AuthMailStatus } from "./auth-mail-contract.server";
import type { AuthMailRuntime } from "./auth-mail.server";
import { decodeEmailVerificationProof, signEmailVerificationProof } from "./email-verification-proof.server";
import type { AuthLifecycleBudget } from "./lifecycle-budget.server";
import {
  InvalidLifecycleProofError, LifecycleStateInvariantError,
  type AuthLifecycleState, type IssuedLifecycleProof,
} from "./lifecycle-state.server";
import type { AuthLifecycleTransaction } from "./lifecycle-transaction.server";

type Eligibility = { email: string; email_verified: boolean; has_credential: boolean };
export type VerificationMailDestination = Readonly<{ locale: string; returnTo?: string }>;
// Internal outcome only: public signup/resend acknowledgement must not distinguish these values.
export type VerificationIssuanceOutcome = AuthMailStatus | "not-eligible";
export type VerifiedEmailReceipt = Readonly<{ userId: string; operationId: string }>;
type UpdateVerifiedUser = (userId: string) => Promise<{
  id: string; email: string; emailVerified: boolean;
} | null | undefined>;

function absentAccount(error: unknown): boolean {
  return error instanceof AccountMissingError || error instanceof AccountInactiveError;
}

/** Request-local verification operations shared by canonical HTTP/direct endpoints.
 * The caller owns request validation and native signup admission. This service
 * never creates a session, uses an ambient session, or accepts a public user ID.
 */
export class AuthEmailVerification {
  constructor(
    private readonly client: Pick<Client, "query">,
    private readonly transaction: AuthLifecycleTransaction,
    private readonly state: AuthLifecycleState,
    private readonly budget: AuthLifecycleBudget,
    private readonly secret: string,
    private readonly mail?: AuthMailRuntime,
  ) { transaction.assertConnection(client); }

  private assertOutsideTransaction(): void {
    // Returning a proof/receipt or sending mail before the outermost COMMIT
    // would turn an uncommitted operation into a success.
    if (this.transaction.ownsCurrentWork()) throw new LifecycleStateInvariantError();
  }

  private async eligibility(userId: string): Promise<Eligibility> {
    const result = await this.client.query<Eligibility>(`
      select u.email,u.email_verified,exists (
        select 1 from account a where a.user_id=u.id and a.provider_id='credential'
        and a.password is not null and a.password <> ''
      ) as has_credential
      from "user" u where u.id=$1
    `, [userId]);
    const row = result.rows[0];
    if (result.rowCount !== 1 || !row || typeof row.email !== "string" ||
      typeof row.email_verified !== "boolean" || typeof row.has_credential !== "boolean") {
      throw new LifecycleStateInvariantError();
    }
    return row;
  }

  private async issue(userId: string, expectedEmail: string): Promise<IssuedLifecycleProof | null> {
    this.assertOutsideTransaction();
    try {
      return await this.state.withSubject(userId, async subject => {
        // withSubject has locked the active account. Re-read method, verified
        // status and email after admission, rather than trusting the preflight.
        const row = await this.eligibility(userId);
        if (row.email !== expectedEmail || row.email_verified || !row.has_credential) return null;
        return subject.issue({ purpose: "email-verification" }, ({ claims }) =>
          signEmailVerificationProof(this.secret, claims));
      });
    } catch (error) {
      if (absentAccount(error)) return null;
      throw error;
    }
  }

  private async deliver(proof: IssuedLifecycleProof | null,
    destination: VerificationMailDestination): Promise<VerificationIssuanceOutcome> {
    if (!proof) return "not-eligible";
    this.assertOutsideTransaction();
    if (!this.mail) return "disabled";
    let actionURL: string;
    try {
      actionURL = await this.mail.buildActionURL({
        purpose: "email-verification", token: proof.token, ...destination,
      });
    } catch (error) {
      return error instanceof AuthMailValidationError ? "rejected" : "unavailable";
    }
    try {
      const result = await this.mail.sendAuthMail({
        purpose: "email-verification", recipient: proof.recipient, locale: destination.locale,
        actionURL, operationId: proof.claims.generation,
      });
      return result.status;
    } catch {
      // The transport may have accepted before the error. Never retry here.
      return "uncertain";
    }
  }

  /** Only for a native fresh-signup result with proven user+credential COMMIT.
   * The caller can spend the identical mail budget before native signup;
   * AuthLifecycleBudget shares that server-owned receipt for this call.
   */
  async issueForCommittedSignup(userId: string, email: string,
    destination: VerificationMailDestination): Promise<VerificationIssuanceOutcome> {
    this.assertOutsideTransaction();
    const normalized = email.trim().toLowerCase();
    return this.budget.run({ kind: "mail", purpose: "email-verification", email: normalized },
      async () => this.deliver(await this.issue(userId, normalized), destination));
  }

  /** Neutral guest resend; no session lookup and no registration policy gate. */
  async resend(email: string, destination: VerificationMailDestination): Promise<VerificationIssuanceOutcome> {
    this.assertOutsideTransaction();
    const normalized = email.trim().toLowerCase();
    return this.budget.run({ kind: "mail", purpose: "email-verification", email: normalized }, async () => {
      const result = await this.client.query<{ id: string }>('select id from "user" where email=$1', [normalized]);
      if (result.rowCount === 0) return "not-eligible";
      if (result.rowCount !== 1 || typeof result.rows[0]?.id !== "string") throw new LifecycleStateInvariantError();
      return this.deliver(await this.issue(result.rows[0].id, normalized), destination);
    });
  }

  /** GET landing is read-only. The terminal action must repeat all checks. */
  async inspect(token: unknown): Promise<void> {
    this.assertOutsideTransaction();
    const proof = await decodeEmailVerificationProof(this.secret, token);
    try {
      await this.state.withSubject(proof.userId, async subject => {
        const row = await this.eligibility(proof.userId);
        if (row.email_verified || !row.has_credential) throw new InvalidLifecycleProofError();
        await subject.inspect(proof);
      });
    } catch (error) {
      if (absentAccount(error)) throw new InvalidLifecycleProofError();
      throw error;
    }
  }

  /** Call the native Better Auth updateUser on the same connection, inside the
   * locked transaction. The returned receipt is available only after COMMIT.
   */
  async confirm(token: unknown, updateVerifiedUser: UpdateVerifiedUser): Promise<VerifiedEmailReceipt> {
    this.assertOutsideTransaction();
    return this.budget.run({ kind: "terminal", purpose: "email-verification" }, async () => {
      const proof = await decodeEmailVerificationProof(this.secret, token);
      try {
        return await this.state.withSubject(proof.userId, async subject => {
          const before = await this.eligibility(proof.userId);
          if (before.email_verified || !before.has_credential) throw new InvalidLifecycleProofError();
          await subject.consume(proof);
          const updated = await updateVerifiedUser(proof.userId);
          if (!updated || updated.id !== proof.userId || updated.email !== before.email || !updated.emailVerified) {
            throw new LifecycleStateInvariantError();
          }
          const after = await this.eligibility(proof.userId);
          if (after.email !== before.email || !after.email_verified || !after.has_credential) {
            throw new LifecycleStateInvariantError();
          }
          return { userId: proof.userId, operationId: proof.generation };
        });
      } catch (error) {
        if (absentAccount(error)) throw new InvalidLifecycleProofError();
        throw error;
      }
    });
  }
}
