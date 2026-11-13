import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { APIError, type BetterAuthOptions } from "better-auth";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Client, QueryResultRow } from "pg";
import { isPostgresConnectionTimeout, isPostgresQueryTimeout } from "../../db/postgres-deadlines";
import { isPostgresAvailabilityFailure } from "../localization/persistent-registry";
import {
  AccountInactiveError, AccountMissingError, AccountStateUnexpectedError,
  AccountStateUnavailableError, assertActiveAccountForMutation,
} from "../../db/account-state";

/** Distinguishes an I4a late session-write denial from unrelated auth failures. */
export class InactiveSessionWriteError extends APIError {
  constructor() {
    super("UNAUTHORIZED", { message: "Unauthorized" });
  }
}

function classifySessionWriteSqlError(error: unknown): AccountStateUnavailableError | AccountStateUnexpectedError {
  const seen = new Set<unknown>();
  let current = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    if (isPostgresAvailabilityFailure(current) || isPostgresConnectionTimeout(current) ||
      isPostgresQueryTimeout(current)) {
      return new AccountStateUnavailableError({ cause: error });
    }
    current = (current as { cause?: unknown }).cause;
  }
  return new AccountStateUnexpectedError({ cause: error });
}

/**
 * Better Auth 1.7.7's session create/update adapter calls are the canonical
 * persistence seam. The earlier session.create.before hook performs admission
 * but cannot hold a PostgreSQL row lock across the subsequent adapter call.
 *
 * This adapter wrapper uses the same native request connection for the
 * transaction, authoritative target lookup, user-row lock and actual write.
 * Other models and session deletion/revocation stay on their original paths.
 */
export function guardBetterAuthSessionWrites(
  database: NodePgDatabase,
  factory: ReturnType<typeof drizzleAdapter>,
  onAccountStateError?: (error: unknown) => void,
): ReturnType<typeof drizzleAdapter> {
  const connection = (database as NodePgDatabase & { $client: Client }).$client;
  return (options: BetterAuthOptions) => {
    const adapter = factory(options);
    // The pinned Better Auth as-is transaction fallback calls its callback
    // with the underlying adapter, then uses that value via AsyncLocalStorage.
    // Re-wrap the supplied transaction adapter so signup/OAuth session creates
    // cannot bypass this same-client lock/write boundary.
    const wrap = (current: typeof adapter): typeof adapter => new Proxy(current, {
      get(target, property, receiver) {
        const method = Reflect.get(target, property, receiver);
        if (property === "transaction" && typeof method === "function") {
          return <T>(fn: (trx: typeof adapter) => Promise<T>): Promise<T> =>
            Reflect.apply(method, target, [async (trx: typeof adapter) => fn(wrap(trx))]);
        }
        if (typeof method !== "function" || (property !== "create" && property !== "update")) {
          return method;
        }
        return async (...args: unknown[]) => {
          const command = args[0] as {
            model?: unknown;
            data?: { userId?: unknown };
            where?: { field?: unknown; value?: unknown; operator?: unknown }[];
            update?: { userId?: unknown };
          } | undefined;
          if (command?.model !== "session") {
            return Reflect.apply(method, target, args);
          }

          // Only wrapper-owned SQL is classified here. Adapter/BA errors
          // retain their original semantics and are not reclassified.
          const query = async <T extends QueryResultRow>(sql: string, params?: unknown[]) => {
            try { return await connection.query<T>(sql, params); }
            catch (error) { throw classifySessionWriteSqlError(error); }
          };
          let begun = false;
          try {
            await query("BEGIN");
            begun = true;
            if (property === "create") {
              await assertActiveAccountForMutation(connection, command.data?.userId as string);
            } else {
              // The pinned internalAdapter.updateSession writes by the trusted
              // session token, not a caller-supplied userId or request identity.
              const where = command.where;
              const selector = where?.length === 1 ? where[0] : null;
              if (selector?.field !== "token" || typeof selector.value !== "string" ||
                (selector.operator !== undefined && selector.operator !== "eq")) {
                throw new AccountStateUnexpectedError();
              }
              const rows = (await query<{ user_id: string }>(
                'select user_id from "session" where token = $1', [selector.value],
              )).rows;
              if (rows.length > 1) throw new AccountStateUnexpectedError();
              if (rows.length === 0) {
                await query("COMMIT");
                begun = false;
                return null;
              }
              // A session-target transfer must not bypass its original owner.
              if (command.update?.userId !== undefined &&
                command.update.userId !== rows[0].user_id) {
                throw new AccountStateUnexpectedError();
              }
              await assertActiveAccountForMutation(connection, rows[0].user_id);
            }

            const result = await Reflect.apply(method, target, args);
            await query("COMMIT");
            begun = false;
            return result;
          } catch (error) {
            let failure = error;
            if (begun) {
              try { await query("ROLLBACK"); }
              catch (rollbackError) {
                // Losing the connection during rollback is not a normal denial.
                failure = rollbackError;
              }
            }
            if (failure instanceof AccountInactiveError || failure instanceof AccountMissingError) {
              throw new InactiveSessionWriteError();
            }
            if (failure instanceof AccountStateUnavailableError ||
              failure instanceof AccountStateUnexpectedError) {
              onAccountStateError?.(failure);
            }
            throw failure;
          }
        };
      },
    });
    return wrap(adapter);
  };
}
