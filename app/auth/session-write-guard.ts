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
 * Better Auth 1.7.7's actual adapter writes are the atomic persistence seam.
 * Session create/update (I4a), existing-user update/updateMany (I4b)
 * account create/update/updateMany/delete/deleteMany (I4c), and session
 * delete/deleteMany (I4d) use the native request connection for persisted
 * target resolution, active user-row lock, original adapter write and COMMIT.
 * New-user creation and physical user deletion remain on their original paths.
 */
export function guardBetterAuthSessionWrites(
  database: NodePgDatabase,
  factory: ReturnType<typeof drizzleAdapter>,
  onAccountStateError?: (error: unknown) => void,
  consumeOwnSignOutToken?: (token: string) => boolean,
): ReturnType<typeof drizzleAdapter> {
  const connection = (database as NodePgDatabase & { $client: Client }).$client;
  return (options: BetterAuthOptions) => {
    const adapter = factory(options);
    // /revoke-other-sessions invokes concurrent deleteSession calls using one
    // request's native PG Client. Never interleave their BEGIN/COMMIT boundaries.
    let deletionTail: Promise<void> = Promise.resolve();
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
        if (typeof method !== "function" ||
          (property !== "create" && property !== "update" && property !== "updateMany" &&
            property !== "delete" && property !== "deleteMany")) {
          return method;
        }
        const guarded = async (...args: unknown[]) => {
          const command = args[0] as {
            model?: unknown;
            data?: { userId?: unknown };
            where?: { field?: unknown; value?: unknown; operator?: unknown }[];
            update?: { userId?: unknown; id?: unknown };
          } | undefined;
          const sessionWrite = command?.model === "session" &&
            (property === "create" || property === "update");
          const userWrite = command?.model === "user" &&
            (property === "update" || property === "updateMany");
          const accountWrite = command?.model === "account" &&
            (property === "create" || property === "update" || property === "updateMany" ||
              property === "delete" || property === "deleteMany");
          const sessionDelete = command?.model === "session" &&
            (property === "delete" || property === "deleteMany");
          if (!sessionWrite && !userWrite && !accountWrite && !sessionDelete) {
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
            if (accountWrite) {
              if (property === "create") {
                // BA createAccount/linkAccount and both registration paths
                // resolve the owner before canonical adapter persistence.
                await assertActiveAccountForMutation(connection, command.data?.userId as string);
              } else {
                // BA updateAccount/deleteAccount select by the persisted account
                // primary key. updatePassword targets one owner's credential rows;
                // deleteAccounts targets all account rows of one persisted owner.
                const where = command.where;
                if (!where?.length) throw new AccountStateUnexpectedError();
                const fields = new Map<string, string>();
                for (const selector of where) {
                  if ((selector.field !== "id" && selector.field !== "userId" &&
                    selector.field !== "providerId" && selector.field !== "accountId") ||
                    typeof selector.value !== "string" || !selector.value ||
                    (selector.operator !== undefined && selector.operator !== "eq") ||
                    fields.has(selector.field)) {
                    throw new AccountStateUnexpectedError();
                  }
                  fields.set(selector.field, selector.value);
                }
                const idOnly = fields.size === 1 && fields.has("id");
                const ownerOnly = fields.size === 1 && fields.has("userId") &&
                  property === "deleteMany";
                const credentialSet = fields.size === 3 && fields.has("userId") &&
                  fields.get("providerId") === "credential" &&
                  fields.get("accountId") === fields.get("userId") &&
                  property === "updateMany";
                if (!idOnly && !ownerOnly && !credentialSet) {
                  throw new AccountStateUnexpectedError();
                }
                const selected = idOnly
                  ? await query<{ user_id: string }>(
                    'select user_id from "account" where id = $1',
                    [fields.get("id")],
                  )
                  : credentialSet
                    ? await query<{ user_id: string }>(
                      'select user_id from "account" where user_id = $1 and provider_id = $2 and account_id = $3',
                      [fields.get("userId"), fields.get("providerId"), fields.get("accountId")],
                    )
                    : await query<{ user_id: string }>(
                      'select user_id from "account" where user_id = $1',
                      [fields.get("userId")],
                    );
                const owners = new Set(selected.rows.map(row => row.user_id));
                if (idOnly && selected.rows.length > 1 || owners.size > 1) {
                  throw new AccountStateUnexpectedError();
                }
                if (!owners.size) {
                  await query("COMMIT");
                  begun = false;
                  return property === "updateMany" || property === "deleteMany" ? 0 : null;
                }
                const owner = owners.values().next().value;
                if (typeof owner !== "string" || !owner ||
                  (command.update?.userId !== undefined && command.update.userId !== owner) ||
                  (command.update?.id !== undefined && command.update.id !== fields.get("id"))) {
                  throw new AccountStateUnexpectedError();
                }
                await assertActiveAccountForMutation(connection, owner);
              }
            } else if (userWrite) {
              // BA 1.7.7 internalAdapter.updateUser uses a unique id selector;
              // updateUserByEmail uses a normalized, unique email selector.
              // Resolve and lock the persisted row, never the submitted update.
              const where = command.where;
              const selector = where?.length === 1 ? where[0] : null;
              if (!selector || (selector.field !== "id" && selector.field !== "email") ||
                typeof selector.value !== "string" || !selector.value ||
                (selector.operator !== undefined && selector.operator !== "eq")) {
                throw new AccountStateUnexpectedError();
              }
              const rows = (await query<{ id: string }>(
                selector.field === "id"
                  ? 'select id from "user" where id = $1 for no key update'
                  : 'select id from "user" where email = $1 for no key update',
                [selector.value],
              )).rows;
              if (rows.length > 1) throw new AccountStateUnexpectedError();
              if (!rows.length) {
                await query("COMMIT");
                begun = false;
                return property === "updateMany" ? 0 : null;
              }
              // An update can modify the target's attributes, not transfer its id.
              if (command.update?.id !== undefined && command.update.id !== rows[0].id) {
                throw new AccountStateUnexpectedError();
              }
              await assertActiveAccountForMutation(connection, rows[0].id);
            } else if (property === "create") {
              await assertActiveAccountForMutation(connection, command.data?.userId as string);
            } else if (sessionDelete) {
              // BA 1.7.7 deletes one session by token, all owned sessions by
              // userId, or a selected token list. Resolve the actual persisted
              // owner; never trust an arbitrary request actor or submitted owner.
              const where = command.where;
              const selector = where?.length === 1 ? where[0] : null;
              const token = selector?.field === "token" && typeof selector.value === "string"
                ? selector.value : null;
              const byToken = property === "delete" && token && token.length > 0 &&
                (selector?.operator === undefined || selector.operator === "eq");
              const byUser = property === "deleteMany" && selector?.field === "userId" &&
                typeof selector.value === "string" && selector.value.length > 0 &&
                (selector.operator === undefined || selector.operator === "eq");
              const byTokens = property === "deleteMany" && selector?.field === "token" &&
                selector.operator === "in" && Array.isArray(selector.value) &&
                selector.value.every(value => typeof value === "string" && value.length > 0);
              if (!byToken && !byUser && !byTokens) throw new AccountStateUnexpectedError();
              const rows = byToken
                ? (await query<{ user_id: string }>(
                  'select distinct user_id from "session" where token = $1', [token],
                )).rows
                : byUser
                  ? (await query<{ user_id: string }>(
                    'select distinct user_id from "session" where user_id = $1', [selector!.value],
                  )).rows
                  : (await query<{ user_id: string }>(
                    'select distinct user_id from "session" where token = any($1::text[])',
                    [selector!.value],
                  )).rows;
              if (rows.length > 1) throw new AccountStateUnexpectedError();
              if (!rows.length) {
                await query("COMMIT");
                begun = false;
                return property === "deleteMany" ? 0 : null;
              }
              const owner = rows[0].user_id;
              // Only the signed current cookie of /sign-out admits inactive
              // cleanup. Never extend that exception to revoke or bulk writes.
              const ownSignOut = !!byToken && !!token && consumeOwnSignOutToken?.(token) === true;
              try {
                await assertActiveAccountForMutation(connection, owner);
              } catch (error) {
                if (!(error instanceof AccountInactiveError) || !ownSignOut) throw error;
                // The same FOR NO KEY UPDATE row lock survives this caught
                // inactive result through the canonical DELETE and COMMIT.
              }
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
              if (userWrite || accountWrite) {
                throw new APIError("UNAUTHORIZED", { message: "Unauthorized" });
              }
              throw new InactiveSessionWriteError();
            }
            if (failure instanceof AccountStateUnavailableError ||
              failure instanceof AccountStateUnexpectedError) {
              onAccountStateError?.(failure);
            }
            throw failure;
          }
        };
        return (...args: unknown[]) => {
          const command = args[0] as { model?: unknown } | undefined;
          if (command?.model !== "session" ||
            (property !== "delete" && property !== "deleteMany")) return guarded(...args);
          const task = deletionTail.then(() => guarded(...args));
          deletionTail = task.then(() => undefined, () => undefined);
          return task;
        };
      },
    });
    return wrap(adapter);
  };
}
