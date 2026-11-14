import { eq, isNull, sql, type SQL } from "drizzle-orm";
import { PgDialect, type AnyPgColumn } from "drizzle-orm/pg-core";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Client } from "pg";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import { isPostgresConnectionTimeout, isPostgresQueryTimeout } from "./postgres-deadlines";
import { user } from "./schema";

/** Shared active-account predicate for Drizzle, including aliased user tables. */
export function activeAccountPredicate(deactivatedAt: AnyPgColumn = user.deactivatedAt): SQL {
  return isNull(deactivatedAt);
}

export type AccountState =
  | { readonly status: "missing"; readonly userId: string }
  | { readonly status: "active"; readonly userId: string }
  | {
      readonly status: "deactivated";
      readonly userId: string;
      readonly deactivatedAt: Date;
      readonly deactivatedByUserId: string;
      readonly retainAtLeastUntil: Date;
    };

export class AccountStateUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("Account state storage unavailable", options);
    this.name = "AccountStateUnavailableError";
  }
}

export class AccountStateUnexpectedError extends Error {
  constructor(options?: ErrorOptions) {
    super("Unexpected account state storage failure", options);
    this.name = "AccountStateUnexpectedError";
  }
}

export class AccountInactiveError extends Error {
  constructor() {
    super("Account is inactive");
    this.name = "AccountInactiveError";
  }
}

export class AccountMissingError extends Error {
  constructor() {
    super("Account does not exist");
    this.name = "AccountMissingError";
  }
}

type AccountStateRow = {
  deactivated_at: unknown;
  deactivated_by_user_id: unknown;
  retain_at_least_until: unknown;
};

const dialect = new PgDialect();

function validTimestamp(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function unavailable(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current = error;
  while (current && (typeof current === "object" || typeof current === "function") && !seen.has(current)) {
    seen.add(current);
    if (isPostgresAvailabilityFailure(current) || isPostgresConnectionTimeout(current)
      || isPostgresQueryTimeout(current)) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

function checkAccountId(userId: string): void {
  if (typeof userId !== "string" || userId.length === 0) {
    throw new AccountStateUnexpectedError();
  }
}

/** The native PG and Drizzle paths must accept exactly the same persisted tuple. */
function parseAccountStateRows(userId: string, rows: readonly AccountStateRow[]): AccountState {
  if (rows.length === 0) return { status: "missing", userId };
  if (rows.length !== 1) throw new AccountStateUnexpectedError();
  const state = rows[0];
  if (!state) throw new AccountStateUnexpectedError();
  if (state.deactivated_at === null) {
    if (state.deactivated_by_user_id !== null || state.retain_at_least_until !== null) {
      throw new AccountStateUnexpectedError();
    }
    return { status: "active", userId };
  }
  if (!validTimestamp(state.deactivated_at) || !validTimestamp(state.retain_at_least_until)
    || typeof state.deactivated_by_user_id !== "string" || state.deactivated_by_user_id.trim() === "") {
    throw new AccountStateUnexpectedError();
  }
  return {
    status: "deactivated",
    userId,
    deactivatedAt: state.deactivated_at,
    deactivatedByUserId: state.deactivated_by_user_id,
    retainAtLeastUntil: state.retain_at_least_until,
  };
}

function accountStateReadError(error: unknown): AccountStateUnavailableError | AccountStateUnexpectedError {
  if (error instanceof AccountStateUnavailableError || error instanceof AccountStateUnexpectedError) {
    return error;
  }
  if (unavailable(error)) return new AccountStateUnavailableError({ cause: error });
  return new AccountStateUnexpectedError({ cause: error });
}

/** Shared native state query: the mutation variant locks the caller's transaction row. */
async function loadAccountState(
  connection: Pick<Client, "query">, userId: string, lockForMutation: boolean,
): Promise<AccountState> {
  checkAccountId(userId);
  try {
    const statement = dialect.sqlToQuery(sql`
      select ${user.deactivatedAt} as deactivated_at,
        ${user.deactivatedByUserId} as deactivated_by_user_id,
        ${user.retainAtLeastUntil} as retain_at_least_until
      from ${user}
      where ${eq(user.id, userId)}
      ${lockForMutation ? sql`for no key update` : sql``}
    `);
    return parseAccountStateRows(userId,
      (await connection.query<AccountStateRow>(statement.sql, statement.params)).rows);
  } catch (error) {
    throw accountStateReadError(error);
  }
}

/** Query through the caller's Drizzle transaction, never a separate connection. */
async function loadDrizzleAccountStateForMutation(
  transaction: Pick<NodePgDatabase, "select">, userId: string,
): Promise<AccountState> {
  checkAccountId(userId);
  try {
    const rows = await transaction.select({
      deactivated_at: user.deactivatedAt,
      deactivated_by_user_id: user.deactivatedByUserId,
      retain_at_least_until: user.retainAtLeastUntil,
    }).from(user).where(eq(user.id, userId)).for("no key update");
    return parseAccountStateRows(userId, rows);
  } catch (error) {
    throw accountStateReadError(error);
  }
}

/** Unlocked, readonly state read; does not authorize subsequent mutation. */
export function readAccountState(connection: Pick<Client, "query">, userId: string): Promise<AccountState> {
  return loadAccountState(connection, userId, false);
}

function assertActiveState(state: AccountState): void {
  if (state.status === "missing") throw new AccountMissingError();
  if (state.status === "deactivated") throw new AccountInactiveError();
}

/** Readonly admission; never use this instead of the mutation guard for writes. */
export async function assertActiveAccount(connection: Pick<Client, "query">, userId: string): Promise<void> {
  assertActiveState(await readAccountState(connection, userId));
}

/**
 * Mutation admission for an already-open, caller-owned PostgreSQL transaction.
 * Caller MUST use the same connection for the protected writes and must keep
 * the transaction open until they finish (commit or rollback). In autocommit
 * mode the row lock is immediately released and provides NO write protection.
 *
 * FOR NO KEY UPDATE serializes state changes without conflicting with FK KEY SHARE.
 * If the caller already locked this user row, pass the SAME transaction connection;
 * PostgreSQL reuses its own row lock instead of taking a lock on another connection.
 * No state update or transaction control is performed by this guard.
 */
export async function assertActiveAccountForMutation(
  transaction: Pick<Client, "query">, userId: string,
): Promise<void> {
  assertActiveState(await loadAccountState(transaction, userId, true));
}

/**
 * Authoritative mutation admission inside an already-open Drizzle PostgreSQL
 * transaction. The caller must use this SAME transaction for protected writes
 * and keep it open through COMMIT/ROLLBACK. Do not invoke on an autocommit DB:
 * a transaction-local FOR NO KEY UPDATE lock would be immediately released.
 *
 * This adds no Forum writer integration or new lifecycle rule: both SQL paths
 * share the same persisted-tuple validator and error classifier.
 */
export async function assertActiveAccountForDrizzleMutation(
  transaction: Pick<NodePgDatabase, "select">, userId: string,
): Promise<void> {
  assertActiveState(await loadDrizzleAccountStateForMutation(transaction, userId));
}
