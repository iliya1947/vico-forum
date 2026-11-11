import { eq, isNull, sql, type SQL } from "drizzle-orm";
import { PgDialect, type AnyPgColumn } from "drizzle-orm/pg-core";
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
  deactivated_at: Date | null;
  deactivated_by_user_id: string | null;
  retain_at_least_until: Date | null;
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

/**
 * Read only, on the supplied PostgreSQL connection (including a caller-owned transaction).
 * Does not lock the user row or grant active-account admission to a mutation.
 * No private Better Auth account/session fields are selected.
 */
export async function readAccountState(connection: Pick<Client, "query">, userId: string): Promise<AccountState> {
  if (typeof userId !== "string" || userId.length === 0) {
    throw new AccountStateUnexpectedError();
  }
  try {
    const statement = dialect.sqlToQuery(sql`
      select ${user.deactivatedAt} as deactivated_at,
        ${user.deactivatedByUserId} as deactivated_by_user_id,
        ${user.retainAtLeastUntil} as retain_at_least_until
      from ${user}
      where ${eq(user.id, userId)}
    `);
    const rows = (await connection.query<AccountStateRow>(statement.sql, statement.params)).rows;
    if (rows.length === 0) return { status: "missing", userId };
    if (rows.length !== 1) throw new AccountStateUnexpectedError();
    const state = rows[0];
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
  } catch (error) {
    if (error instanceof AccountStateUnexpectedError) throw error;
    if (unavailable(error)) throw new AccountStateUnavailableError({ cause: error });
    throw new AccountStateUnexpectedError({ cause: error });
  }
}

/** Read-only admission helper. Mutation/row-lock protection is a separate SA04-A3 step. */
export async function assertActiveAccount(connection: Pick<Client, "query">, userId: string): Promise<void> {
  const state = await readAccountState(connection, userId);
  if (state.status === "missing") throw new AccountMissingError();
  if (state.status === "deactivated") throw new AccountInactiveError();
}
