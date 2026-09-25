import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";

import {
  ContentTranslationStorageUnavailableError,
} from "../app/localization/content-translation";
import type {
  ContentTranslationBatchReader,
} from "../app/localization/content-translation-presentation";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import { DrizzleContentTranslationBatchReader } from "./content-translation-store";
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

/** Creates one read-only persisted content-translation capability for a Worker request. */
export function createHyperdriveContentTranslationBatchReader(
  connectionString: string,
  createClient: PostgreSqlClientFactory = defaultClientFactory,
): ContentTranslationBatchReader {
  return {
    async readBatch(identities) {
      const client = createClient(connectionString);
      try {
        await client.connect();
        return await new DrizzleContentTranslationBatchReader(drizzle(client)).readBatch(identities);
      } catch (error) {
        if (error instanceof ContentTranslationStorageUnavailableError) throw error;
        if (
          isPostgresAvailabilityFailure(error)
          || isPostgresConnectionTimeout(error)
          || isPostgresQueryTimeout(error)
        ) {
          throw new ContentTranslationStorageUnavailableError(
            "content translation storage is unavailable",
            { cause: error },
          );
        }
        throw error;
      } finally {
        bestEffortDiscardClient(client);
      }
    },
  };
}
