import type { Client } from "pg";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { user } from "./schema";
import { activeAccountPredicate, assertActiveAccount, AccountStateUnavailableError, AccountStateUnexpectedError } from "./account-state";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import {
  bestEffortDiscardClient, createWebClient, isPostgresConnectionTimeout, isPostgresQueryTimeout,
} from "./postgres-deadlines";

import { UserLocaleUnavailableError } from "./user-locale-error";
export { UserLocaleUnavailableError } from "./user-locale-error";

const dialect = new PgDialect();
function unavailable(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current = error;
  for (let depth = 0; depth < 16 && current && typeof current === "object" && !seen.has(current); depth++) {
    seen.add(current);
    if (current instanceof AccountStateUnavailableError || isPostgresAvailabilityFailure(current)
      || isPostgresConnectionTimeout(current) || isPostgresQueryTimeout(current)) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

export interface UserLocaleWriter {
  save(actorId: string, locale: string): Promise<void>;
}

/** Request-scoped own-account writer. Locale eligibility is validated by the route's current registry. */
export function createHyperdriveUserLocale(
  connectionString: string,
  clientFactory: (connectionString: string) => Client = createWebClient,
): UserLocaleWriter {
  return {
    async save(actorId, locale) {
      const client = clientFactory(connectionString);
      try {
        await client.connect();
        // The UPDATE itself serializes with lifecycle changes; the shared predicate
        // is rechecked by PostgreSQL after any wait on the current account tuple.
        const statement = dialect.sqlToQuery(sql`update ${user}
          set locale=${locale}, updated_at=now()
          where ${user.id}=${actorId} and ${activeAccountPredicate()} returning ${user.id}`);
        const result = await client.query(statement.sql, statement.params);
        if (result.rowCount !== 1) {
          // Classification only, through the same connection; this read never
          // authorizes another write or turns an impossible zero-row save into success.
          await assertActiveAccount(client, actorId);
          throw new AccountStateUnexpectedError();
        }
      } catch (error) {
        if (unavailable(error)) {
          throw new UserLocaleUnavailableError("Account locale storage unavailable", { cause: error });
        }
        throw error;
      } finally {
        bestEffortDiscardClient(client);
      }
    },
  };
}
