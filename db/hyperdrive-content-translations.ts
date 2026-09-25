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
  isPostgresConnectionTimeout,
  isPostgresQueryTimeout,
} from "./postgres-deadlines";

/** Creates one read-only persisted content-translation capability for a Worker request. */
export function createHyperdriveContentTranslationBatchReader(
  connectionString: string,
): ContentTranslationBatchReader {
  return {
    async readBatch(identities) {
      const client = new Client({ connectionString });
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
        try {
          await client.end();
        } catch {
          // Request-scoped cleanup is best effort and must not mask the read result/error.
        }
      }
    },
  };
}
