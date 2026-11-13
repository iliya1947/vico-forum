import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { APIError, type BetterAuthOptions } from "better-auth";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Client } from "pg";
import {
  AccountInactiveError, AccountMissingError, AccountStateUnexpectedError,
  AccountStateUnavailableError, assertActiveAccountForMutation,
} from "../../db/account-state";

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
    return new Proxy(adapter, {
      get(target, property, receiver) {
        const method = Reflect.get(target, property, receiver);
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
            return Reflect.apply(method, adapter, args);
          }

          let begun = false;
          try {
            await connection.query("BEGIN");
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
              const rows = (await connection.query<{ user_id: string }>(
                'select user_id from "session" where token = $1', [selector.value],
              )).rows;
              if (rows.length > 1) throw new AccountStateUnexpectedError();
              if (rows.length === 0) {
                await connection.query("COMMIT");
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

            const result = await Reflect.apply(method, adapter, args);
            await connection.query("COMMIT");
            begun = false;
            return result;
          } catch (error) {
            if (begun) {
              try { await connection.query("ROLLBACK"); }
              catch { /* The caller closes this connection on failure. */ }
            }
            if (error instanceof AccountInactiveError || error instanceof AccountMissingError) {
              throw new APIError("UNAUTHORIZED", { message: "Unauthorized" });
            }
            if (error instanceof AccountStateUnavailableError ||
              error instanceof AccountStateUnexpectedError) {
              onAccountStateError?.(error);
            }
            throw error;
          }
        };
      },
    });
  };
}
