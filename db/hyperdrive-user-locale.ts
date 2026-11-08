import type { Client } from "pg";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import {
  bestEffortDiscardClient, createWebClient, isPostgresConnectionTimeout, isPostgresQueryTimeout,
} from "./postgres-deadlines";

export class UserLocaleUnavailableError extends Error {}
export class UserLocaleAccountMissingError extends Error {}

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
        const result = await client.query(
          `update "user" set locale=$2, updated_at=now() where id=$1 returning id`,
          [actorId, locale],
        );
        if (result.rowCount !== 1) throw new UserLocaleAccountMissingError("Authenticated account no longer exists");
      } catch (error) {
        if (isPostgresAvailabilityFailure(error) || isPostgresConnectionTimeout(error)
          || isPostgresQueryTimeout(error)) {
          throw new UserLocaleUnavailableError("Account locale storage unavailable", { cause: error });
        }
        throw error;
      } finally {
        bestEffortDiscardClient(client);
      }
    },
  };
}
