import type { Client } from "pg";
import {
  assertActiveAccount, assertActiveAccountForMutation,
  AccountInactiveError, AccountMissingError,
} from "../../db/account-state";
import { isBoundOwner } from "../authorization/owner";
import type { AuthSession } from "../auth/request-context";
import type { AuthLifecycleTransaction } from "../auth/lifecycle-transaction.server";
import { forumControlScopes } from "./write-tool-contract";

export type ForumControlScope = typeof forumControlScopes[keyof typeof forumControlScopes];

export interface ForumControlBinding {
  readonly ownerUserId: string;
  readonly issuer: string;
  readonly clientId: string;
  readonly resource: string;
  readonly repositoryId: string;
}

/** Persisted server-owned delegation. Never deserialize this from a tool call. */
export interface ForumControlGrant {
  readonly id: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly clientId: string;
  readonly issuer: string;
  readonly resource: string;
  readonly repositoryId: string;
  readonly scopes: readonly string[];
  readonly revokedAt: Date | null;
}

export class ForumControlDenied extends Error {
  constructor() { super("Forum control access denied"); this.name = "ForumControlDenied"; }
}

type Connection = Pick<Client, "query">;
const read = forumControlScopes.read;
const write = forumControlScopes.write;

function nonblank(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.trim() === value;
}

export function validForumControlScopes(scopes: readonly string[]): boolean {
  return scopes.length > 0 && new Set(scopes).size === scopes.length &&
    scopes.every(scope => scope === read || scope === write || scope === "offline_access") &&
    scopes.some(scope => scope === read || scope === write);
}

function matchesGrant(binding: ForumControlBinding, grant: ForumControlGrant): boolean {
  return nonblank(grant.id) && nonblank(grant.sessionId) &&
    nonblank(binding.clientId) && nonblank(binding.issuer) && nonblank(binding.resource) &&
    nonblank(binding.repositoryId) && isBoundOwner(grant.userId, binding.ownerUserId) &&
    grant.clientId === binding.clientId && grant.issuer === binding.issuer &&
    grant.resource === binding.resource && grant.repositoryId === binding.repositoryId &&
    grant.revokedAt === null && validForumControlScopes(grant.scopes);
}

/** Checks identity using the existing authoritative session row, not a cookie,
 * email, role, bearer claims alone, or a replacement session of the same user.
 * The mutation path locks the account in the established auth lock order.
 */
export async function requireLiveSession(connection: Connection, userId: string, sessionId: string,
  forMutation: boolean): Promise<void> {
  if (!nonblank(userId) || !nonblank(sessionId)) throw new ForumControlDenied();
  try {
    if (forMutation) await assertActiveAccountForMutation(connection, userId);
    else await assertActiveAccount(connection, userId);
  } catch (error) {
    if (error instanceof AccountInactiveError || error instanceof AccountMissingError) throw new ForumControlDenied();
    throw error;
  }
  // Better Auth timestamps are stored without timezone, in UTC. No session
  // refresh is performed here. A read alone never authorizes a later write.
  const result = await connection.query<{ id: string }>(
    'select id from "session" where id = $1 and user_id = $2 ' +
    "and expires_at > timezone('UTC', clock_timestamp())" +
    (forMutation ? " for update" : ""),
    [sessionId, userId],
  );
  if (result.rows.length !== 1 || result.rows[0].id !== sessionId) throw new ForumControlDenied();
}

/** Use before accepting consent. Session must come from canonical Better Auth. */
export async function requireOwnerConsentSession(connection: Connection, binding: ForumControlBinding,
  session: AuthSession | null): Promise<{ userId: string; sessionId: string }> {
  if (!session || !isBoundOwner(session.user.id, binding.ownerUserId) ||
      session.session.userId !== session.user.id) throw new ForumControlDenied();
  await requireLiveSession(connection, session.user.id, session.session.id, false);
  return { userId: session.user.id, sessionId: session.session.id };
}

/** Input is the result of authenticated provider introspection, not decoded
 * unverified input. A grant is separately resolved from the provider token
 * reference in persistent storage. Missing sid/aud/sub is a denial.
 */
export function requireScopedProviderClaims(claims: unknown, binding: ForumControlBinding,
  grant: ForumControlGrant, required: ForumControlScope, now = Date.now()): void {
  if (!matchesGrant(binding, grant) || !claims || typeof claims !== "object" || Array.isArray(claims)) {
    throw new ForumControlDenied();
  }
  const token = claims as Record<string, unknown>;
  const audience = token.aud === binding.resource ||
    (Array.isArray(token.aud) && token.aud.length === 1 && token.aud[0] === binding.resource);
  const scopes = typeof token.scope === "string" ? token.scope.split(" ") : [];
  if (token.active !== true || token.iss !== binding.issuer || !audience ||
      token.client_id !== grant.clientId || token.sub !== grant.userId || token.sid !== grant.sessionId ||
      token.token_type !== "Bearer" || typeof token.exp !== "number" ||
      !Number.isSafeInteger(token.exp) || token.exp <= Math.floor(now / 1000) ||
      !validForumControlScopes(scopes) || !scopes.includes(required) || !scopes.every(scope => grant.scopes.includes(scope))) {
    throw new ForumControlDenied();
  }
}

/** Fresh check for read/receive/result. Revocation and effects must also use
 * the mutation path with a freshly locked persisted grant on the same client.
 */
export async function requireLiveForumControlGrant(connection: Connection, binding: ForumControlBinding,
  grant: ForumControlGrant, required?: ForumControlScope): Promise<void> {
  if (!matchesGrant(binding, grant) || (required !== undefined && !grant.scopes.includes(required))) {
    throw new ForumControlDenied();
  }
  await requireLiveSession(connection, grant.userId, grant.sessionId, false);
}

/** Only called inside the existing native transaction. Resolve and lock the
 * persisted grant after the account/session locks, before allowing the effect.
 * The callback is server-owned storage, not tool input. Its row lock is held
 * through the caller's commit or rollback. A stale grant snapshot is insufficient.
 */
export async function requireLockedForumControlGrant(connection: Connection,
  lifecycle: AuthLifecycleTransaction, binding: ForumControlBinding, grantId: string,
  identity: { userId: string; sessionId: string },
  lockGrant: (connection: Connection, grantId: string) => Promise<ForumControlGrant | null>,
  required?: ForumControlScope): Promise<ForumControlGrant> {
  lifecycle.assertConnection(connection);
  if (!lifecycle.ownsCurrentWork() || !nonblank(grantId) ||
      !isBoundOwner(identity.userId, binding.ownerUserId)) throw new ForumControlDenied();
  await requireLiveSession(connection, identity.userId, identity.sessionId, true);
  const grant = await lockGrant(connection, grantId);
  if (!grant || grant.id !== grantId || grant.userId !== identity.userId ||
      grant.sessionId !== identity.sessionId || !matchesGrant(binding, grant) ||
      (required !== undefined && !grant.scopes.includes(required))) throw new ForumControlDenied();
  return grant;
}
