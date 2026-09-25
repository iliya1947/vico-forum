import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import {
  ContentTranslationStorageUnavailableError,
} from "../app/localization/content-translation";
import {
  ContentTranslationPresentationService,
  type ContentTranslationPresentationCapability,
} from "../app/localization/content-translation-presentation";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import { DrizzleContentTranslationBatchReader } from "./content-translation-presentation-store";
import {
  createLocalizationClient,
  isPostgresConnectionTimeout,
  isPostgresQueryTimeout,
} from "./postgres-deadlines";

type ClientFactory = () => Client;

export function createHyperdriveContentTranslationPresentation(
  connectionString: string,
  clientFactory: ClientFactory = () => createLocalizationClient(connectionString),
): ContentTranslationPresentationCapability {
  return new ContentTranslationPresentationService({
    async readTopic(input) {
      const client = clientFactory();
      let connected = false;
      try {
        await client.connect();
        connected = true;
        return await new DrizzleContentTranslationBatchReader(drizzle(client)).readTopic(input);
      } catch (error) {
        if (error instanceof ContentTranslationStorageUnavailableError) throw error;
        if (isContentTranslationReadUnavailable(error)) {
          throw new ContentTranslationStorageUnavailableError(
            "content translation storage is unavailable",
            { cause: error },
          );
        }
        throw error;
      } finally {
        if (connected) await client.end();
      }
    },
  });
}

function isContentTranslationReadUnavailable(error: unknown): boolean {
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
