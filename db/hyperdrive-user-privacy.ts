import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import {
  bestEffortDiscardClient, createWebClient, isPostgresConnectionTimeout, isPostgresQueryTimeout,
} from "./postgres-deadlines";
import { DrizzleUserPrivacyRepository } from "./user-privacy";

export class UserPrivacyUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("Personal privacy storage unavailable", options);
    this.name = "UserPrivacyUnavailableError";
  }
}

export interface UserPrivacyCapability {
  read(actorId: string): Promise<boolean>;
  save(actorId: string, showOnline: boolean): Promise<void>;
}

/** Only the server-authenticated session actor is passed as the subject. */
export function createHyperdriveUserPrivacy(
  connectionString: string,
  clientFactory: (connectionString: string) => Client = createWebClient,
): UserPrivacyCapability {
  async function withRepository<T>(work: (repository: DrizzleUserPrivacyRepository) => Promise<T>): Promise<T> {
    const client = clientFactory(connectionString);
    try {
      await client.connect();
      return await work(new DrizzleUserPrivacyRepository(drizzle(client)));
    } catch (error) {
      if (isPostgresAvailabilityFailure(error) || isPostgresConnectionTimeout(error)
        || isPostgresQueryTimeout(error)) {
        throw new UserPrivacyUnavailableError({ cause: error });
      }
      throw error;
    } finally {
      bestEffortDiscardClient(client);
    }
  }

  return {
    read: (actorId) => withRepository(repository => repository.read(actorId)),
    save: (actorId, showOnline) => withRepository(repository => repository.save(actorId, showOnline)),
  };
}
