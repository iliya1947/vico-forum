import type { Client } from "pg";
import type { AuthLifecycleTransaction } from "../auth/lifecycle-transaction.server";
import { isBoundOwner } from "../authorization/owner";
import { forumControlScopes } from "./write-tool-contract";
import {
  ForumControlDenied, requireLiveSession, requireLockedForumControlGrant, requireLiveForumControlGrant, requireScopedProviderClaims,
  validForumControlScopes, type ForumControlBinding, type ForumControlGrant, type ForumControlScope,
} from "./delegation-admission.server";

type Connection = Pick<Client, "query">;
type Identity = { userId: string; sessionId: string };
type ProviderTokenRow = {
  authorizationCodeId: string;
  userId: string;
  sessionId: string;
  clientId: string;
  referenceId: string;
  resources: string[];
  scopes: string[];
};

function exactString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.trim() === value;
}

const projection = 'id, user_id as "userId", session_id as "sessionId", client_id as "clientId", ' +
  'issuer, resource, repository_id as "repositoryId", scopes, revoked_at as "revokedAt"';

export async function loadForumControlGrant(connection: Connection, id: string,
  lock = false): Promise<ForumControlGrant | null> {
  if (!exactString(id)) return null;
  const result = await connection.query<ForumControlGrant>(
    'select ' + projection + ' from forum_control_grant where id=$1' + (lock ? ' for update' : ''), [id]);
  if (result.rows.length > 1) throw new Error("Invalid forum control grant state");
  return result.rows[0] ?? null;
}

function requireTransaction(connection: Connection, lifecycle: AuthLifecycleTransaction): void {
  lifecycle.assertConnection(connection);
  if (!lifecycle.ownsCurrentWork()) throw new ForumControlDenied();
}

function requireTokenBinding(value: unknown, binding: ForumControlBinding): ProviderTokenRow {
  if (!value || typeof value !== "object") throw new ForumControlDenied();
  const row = value as Partial<ProviderTokenRow>;
  if (!exactString(row.authorizationCodeId) || !exactString(row.userId) ||
    !exactString(row.sessionId) || row.referenceId !== row.sessionId ||
    !isBoundOwner(row.userId, binding.ownerUserId) || row.clientId !== binding.clientId ||
    !Array.isArray(row.resources) || row.resources.length !== 1 || row.resources[0] !== binding.resource ||
    !Array.isArray(row.scopes) || !validForumControlScopes(row.scopes)) throw new ForumControlDenied();
  return row as ProviderTokenRow;
}

/** Called only at the native provider token insertion boundary, after code or
 * refresh credential validation. Code exchange may establish a new grant;
 * refresh is never permitted to establish/revive a grant.
 */
export async function admitForumControlTokenInsert(connection: Connection, lifecycle: AuthLifecycleTransaction,
  binding: ForumControlBinding & { redirectUri: string }, value: unknown, initial: boolean): Promise<ForumControlGrant> {
  requireTransaction(connection, lifecycle);
  const row = requireTokenBinding(value, binding);
  await requireLiveSession(connection, row.userId, row.sessionId, true);
  // Client/resource restrictions are checked on current persisted rows, not
  // cached configuration. This also denies missing or disabled client/link.
  await requireRegisteredClientResource(connection, binding);
  if (initial) {
    await connection.query(
      'insert into forum_control_grant (id,user_id,session_id,client_id,issuer,resource,repository_id,scopes,created_at) ' +
      "values ($1,$2,$3,$4,$5,$6,$7,$8,timezone('UTC',clock_timestamp())) on conflict (id) do nothing",
      [row.authorizationCodeId, row.userId, row.sessionId, binding.clientId, binding.issuer,
        binding.resource, binding.repositoryId, row.scopes],
    );
  }
  const grant = await requireLockedForumControlGrant(connection, lifecycle, binding, row.authorizationCodeId,
    { userId: row.userId, sessionId: row.sessionId }, (db, id) => loadForumControlGrant(db, id, true));
  if (!row.scopes.every(scope => grant.scopes.includes(scope))) throw new ForumControlDenied();
  return grant;
}

/** One-way revocation. Keep the tombstone so an old code or pending command
 * can never resurrect a revoked grant. Lock in the same account/session/grant
 * order as issuance and subsequent execution. Owner may revoke an old session
 * from the current live Owner session; replacement does not confer access.
 */
export async function revokeForumControlGrant(connection: Connection, lifecycle: AuthLifecycleTransaction,
  binding: ForumControlBinding, actor: Identity, grantId: string): Promise<boolean> {
  requireTransaction(connection, lifecycle);
  if (!isBoundOwner(actor.userId, binding.ownerUserId)) throw new ForumControlDenied();
  await requireLiveSession(connection, actor.userId, actor.sessionId, true);
  const grant = await loadForumControlGrant(connection, grantId, true);
  if (!grant || grant.userId !== actor.userId || grant.clientId !== binding.clientId ||
    grant.issuer !== binding.issuer || grant.resource !== binding.resource ||
    grant.repositoryId !== binding.repositoryId) throw new ForumControlDenied();
  if (grant.revokedAt !== null) return false;
  await connection.query(
    "update forum_control_grant set revoked_at=timezone('UTC',clock_timestamp()) where id=$1 and revoked_at is null", [grantId]);
  await connection.query(
    "update oauth_access_token set revoked=timezone('UTC',clock_timestamp()) where authorization_code_id=$1 and client_id=$2 and revoked is null",
    [grantId, binding.clientId]);
  await connection.query(
    "update oauth_refresh_token set revoked=timezone('UTC',clock_timestamp()) where authorization_code_id=$1 and client_id=$2 and revoked is null",
    [grantId, binding.clientId]);
  return true;
}

export async function hashForumControlToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
}

/** Resolve only an opaque access token issued by this provider. No claim from
 * the model can select the grant. Introspection must still independently pass.
 */
export async function grantForAccessToken(connection: Connection, binding: ForumControlBinding,
  token: string): Promise<ForumControlGrant | null> {
  if (!exactString(token) || token.length > 2048) return null;
  const result = await connection.query<{ grant_id: string }>(
    "select authorization_code_id as grant_id from oauth_access_token where token=$1 and client_id=$2 " +
    "and revoked is null and expires_at > timezone('UTC',clock_timestamp())",
    [await hashForumControlToken(token), binding.clientId],
  );
  return result.rows.length === 1 ? loadForumControlGrant(connection, result.rows[0].grant_id) : null;
}

/** Provider revocation/replay invalidation also closes the Vico delegation.
 * Caller holds the existing account lock and native transaction. Do not
 * revoke during ordinary successful refresh rotation.
 */
export async function markForumControlGrantsRevoked(connection: Connection,
  binding: ForumControlBinding, grantIds: readonly string[]): Promise<void> {
  if (!grantIds.length) return;
  await connection.query(
    "update forum_control_grant set revoked_at=timezone('UTC',clock_timestamp()) " +
    "where id=any($1::text[]) and client_id=$2 and user_id=$3 and revoked_at is null",
    [[...new Set(grantIds)], binding.clientId, binding.ownerUserId],
  );
}

/** Current persisted client registration and resource association, not stale
 * config or a caller-selected audience. Locks only when a transaction owns it. */
export async function requireRegisteredClientResource(connection: Connection,
  binding: ForumControlBinding & { redirectUri: string }, lock = true): Promise<void> {
  const result = await connection.query<{ client_id: string }>(
    'select c.client_id from oauth_client c join oauth_client_resource l on l.client_id=c.client_id ' +
    'join oauth_resource r on r.identifier=l.resource_id where c.client_id=$1 and r.identifier=$2 ' +
    'and c.disabled is not true and r.disabled is not true and c.require_pkce is true ' +
    "and c.skip_consent is not true and (c.subject_type is null or c.subject_type='public') " +
    'and c.redirect_uris=array[$3]::text[]' + (lock ? ' for share of c,l,r' : ''),
    [binding.clientId, binding.resource, binding.redirectUri],
  );
  if (result.rows.length !== 1) throw new ForumControlDenied();
}

/** Complete access-token admission from the native authenticated provider
 * response, authoritative grant row and current Vico AccountState/session. */
export async function admitForumControlAccessToken(connection: Connection,
  binding: ForumControlBinding & { redirectUri: string }, token: string,
  claims: unknown, required?: ForumControlScope): Promise<ForumControlGrant> {
  const grant = await grantForAccessToken(connection, binding, token);
  if (!grant || !claims || typeof claims !== "object" || Array.isArray(claims)) throw new ForumControlDenied();
  const scope = (claims as Record<string, unknown>).scope;
  const requiredScope = required ?? (typeof scope === "string" && scope.split(" ").includes(forumControlScopes.read)
    ? forumControlScopes.read : forumControlScopes.write);
  requireScopedProviderClaims(claims, binding, grant, requiredScope);
  await requireRegisteredClientResource(connection, binding, false);
  await requireLiveForumControlGrant(connection, binding, grant, requiredScope);
  return grant;
}

/** Native revocation can address an authorization code, a refresh family, an
 * individual token or its refresh parent. No adapter result-page limit can
 * leave a grant live while the native delete removes its token evidence. */
export async function revokeForumControlProviderSelection(connection: Connection, binding: ForumControlBinding,
  model: "oauthAccessToken" | "oauthRefreshToken",
  where: readonly { field?: unknown; value?: unknown; operator?: unknown }[]): Promise<void> {
  const table = model === "oauthAccessToken" ? "oauth_access_token" : "oauth_refresh_token";
  const equalSelectors = where.every(selector => selector.operator === undefined || selector.operator === "eq");
  // Native refresh-token revoke uses a CAS on id + revoked IS NULL.
  const casId = model === "oauthRefreshToken" && where.length === 2 && equalSelectors &&
    where.some(selector => selector.field === "revoked" && selector.value === null)
    ? where.find(selector => selector.field === "id") : undefined;
  if (casId && exactString(casId.value)) {
    await revokeForumControlProviderSelection(connection, binding, model, [casId]);
    return;
  }
  if (where.length === 2 && equalSelectors) {
    const owner = where.find(selector => selector.field === "userId")?.value;
    const client = where.find(selector => selector.field === "clientId")?.value;
    if (owner !== binding.ownerUserId || client !== binding.clientId) throw new ForumControlDenied();
    await connection.query(
      "update forum_control_grant set revoked_at=timezone('UTC',clock_timestamp()) " +
      "where client_id=$1 and user_id=$2 and revoked_at is null", [binding.clientId, binding.ownerUserId]);
    return;
  }
  const selector = where.length === 1 ? where[0] : undefined;
  if (!selector) throw new ForumControlDenied();
  const equal = selector.operator === undefined || selector.operator === "eq";
  if (equal && selector.field === "authorizationCodeId" && exactString(selector.value)) {
    await markForumControlGrantsRevoked(connection, binding, [selector.value]);
    return;
  }
  const column = selector.field === "id" ? "id" : selector.field === "token" ? "token"
    : model === "oauthAccessToken" && selector.field === "refreshId" ? "refresh_id" : null;
  if (!column) throw new ForumControlDenied();
  const values = equal && exactString(selector.value) ? [selector.value]
    : selector.operator === "in" && Array.isArray(selector.value) && selector.value.every(exactString) ? selector.value : null;
  if (!values) throw new ForumControlDenied();
  const rows = await connection.query<{ grant_id: string | null }>(
    "select distinct authorization_code_id as grant_id from " + table +
    " where " + column + "=any($1::text[]) and client_id=$2 and user_id=$3",
    [values, binding.clientId, binding.ownerUserId]);
  await markForumControlGrantsRevoked(connection, binding, rows.rows.flatMap(row => row.grant_id ? [row.grant_id] : []));
}
