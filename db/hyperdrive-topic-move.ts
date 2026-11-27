import type { AuthorizationCapability } from "./authorization-service";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import { createWebPool, bestEffortDiscardClient, isPostgresConnectionTimeout, isPostgresQueryTimeout } from "./postgres-deadlines";
import { PostgresTopicMoveWriter, type TopicMoveWriter } from "./topic-move";

import { TopicMoveWriteUnavailableError } from "./topic-move-error";
export { TopicMoveWriteUnavailableError } from "./topic-move-error";

/** The existing F3 transaction owns the move, effective authority and original History. */
export function createHyperdriveTopicMoveWriter(
  connectionString: string, authorization: AuthorizationCapability, ownerUserId?: string,
): TopicMoveWriter {
  return {
    async moveTopic(actorId, topicId, input) {
      const pool = createWebPool(connectionString);
      try {
        return await new PostgresTopicMoveWriter(pool, authorization, ownerUserId).moveTopic(actorId, topicId, input);
      } catch (error) {
        if (isPostgresAvailabilityFailure(error) || isPostgresConnectionTimeout(error) || isPostgresQueryTimeout(error))
          throw new TopicMoveWriteUnavailableError("Topic move unavailable", { cause: error });
        throw error;
      } finally {
        bestEffortDiscardClient(pool);
      }
    },
  };
}
