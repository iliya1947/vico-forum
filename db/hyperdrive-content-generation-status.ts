import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";

import {
  ContentGenerationStatusStorageUnavailableError,
  type ContentGenerationStatusReader,
} from "../app/localization/content-generation-status";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import { DrizzleContentGenerationStatusReader } from "./content-generation-status-store";
import {
  bestEffortDiscardClient,
  createLocalizationClient,
  isPostgresConnectionTimeout,
  isPostgresQueryTimeout,
} from "./postgres-deadlines";

interface PostgreSqlClientFactory {
  (connectionString: string): Client;
}

const defaultClientFactory: PostgreSqlClientFactory = createLocalizationClient;

export function createHyperdriveContentGenerationStatusReader(
  connectionString: string,
  createClient: PostgreSqlClientFactory = defaultClientFactory,
): ContentGenerationStatusReader {
  return {
    async readCurrent(revisions, targetLocale) {
      const client = createClient(connectionString);
      try {
        await client.connect();
        return await new DrizzleContentGenerationStatusReader(drizzle(client)).readCurrent(
          revisions,
          targetLocale,
        );
      } catch (error) {
        if (error instanceof ContentGenerationStatusStorageUnavailableError) throw error;
        if (isContentGenerationStatusAvailabilityFailure(error)) {
          throw new ContentGenerationStatusStorageUnavailableError({ cause: error });
        }
        throw error;
      } finally {
        bestEffortDiscardClient(client);
      }
    },
  };
}

function isContentGenerationStatusAvailabilityFailure(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current = error;
  while (
    current
    && (typeof current === "object" || typeof current === "function")
    && !seen.has(current)
  ) {
    seen.add(current);
    if (
      isPostgresAvailabilityFailure(current)
      || isPostgresConnectionTimeout(current)
      || isPostgresQueryTimeout(current)
    ) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
