import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";
import { ContentGenerationPlanningUnavailableError } from "../app/localization/content-generation-action.server";
import type { ContentGenerationAdmission } from "../app/localization/request-context";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import {
  bestEffortDiscardClient,
  createWebClient,
  isPostgresConnectionTimeout,
  isPostgresQueryTimeout,
} from "./postgres-deadlines";
import { assertNoActiveUserMeasureRestriction } from "./user-measure-policy";

type ClientFactory = () => Client;

/**
 * Request-scoped preflight for new generation plans. Never checks queued tasks
 * or task consumers: accepted jobs must continue after an actor is restricted.
 * The Worker currently leaves generation disabled; this adapter is inert until
 * an explicitly enabled action runtime reaches the generation route.
 */
export function createHyperdriveContentGenerationAdmission(
  connectionString: string,
  clientFactory: ClientFactory = () => createWebClient(connectionString),
  ownerUserId?: string,
): ContentGenerationAdmission {
  return {
    async assertAllowed(actorId) {
      if (typeof actorId !== "string" || !actorId.trim()) throw new TypeError("generation actor is missing");
      const client = clientFactory();
      try {
        await client.connect();
        await drizzle(client).transaction(async tx => {
          await assertNoActiveUserMeasureRestriction(tx, actorId, "translations.generate", ownerUserId);
        });
      } catch (error) {
        if (isPostgresAvailabilityFailure(error) ||
          isPostgresConnectionTimeout(error) || isPostgresQueryTimeout(error)) {
          throw new ContentGenerationPlanningUnavailableError({ cause: error });
        }
        throw error;
      } finally {
        bestEffortDiscardClient(client);
      }
    },
  };
}
