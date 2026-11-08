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
      if (isUserPrivacyAvailabilityFailure(error)) {
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

/** Drizzle 0.45.2 wraps underlying driver failures in DrizzleQueryError.cause. */
function isUserPrivacyAvailabilityFailure(error: unknown): boolean {
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
