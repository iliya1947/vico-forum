import type { AuthorizationCapability } from "./authorization-service";
import {
  HiddenQueueForbiddenError, HiddenQueueUnavailableError,
  PostgresHiddenQueueReader, type HiddenQueueReader,
} from "./private-visibility-queue";
import { createWebPool, bestEffortDiscardClient } from "./postgres-deadlines";

/**
 * Every call obtains a fresh bounded PostgreSQL connection. The provided
 * authorization is already AP-10-filtered by the per-request Worker context.
 * Unexpected storage/auth failures never return raw private SQL or source.
 */
export function createHyperdriveHiddenQueue(
  connectionString: string, authorization: AuthorizationCapability,
): HiddenQueueReader {
  return {
    async list(actorId, query) {
      const pool = createWebPool(connectionString);
      try {
        return await new PostgresHiddenQueueReader(pool, authorization).list(actorId, query);
      } catch (error) {
        if (error instanceof HiddenQueueForbiddenError) throw error;
        throw new HiddenQueueUnavailableError();
      } finally {
        bestEffortDiscardClient(pool);
      }
    },
    async inspect(actorId, target) {
      const pool = createWebPool(connectionString);
      try {
        return await new PostgresHiddenQueueReader(pool, authorization).inspect(actorId, target);
      } catch (error) {
        if (error instanceof HiddenQueueForbiddenError) throw error;
        throw new HiddenQueueUnavailableError();
      } finally {
        bestEffortDiscardClient(pool);
      }
    },
    async revisions(actorId, target, before) {
      const pool = createWebPool(connectionString);
      try {
        return await new PostgresHiddenQueueReader(pool, authorization).revisions(actorId, target, before);
      } catch (error) {
        if (error instanceof HiddenQueueForbiddenError) throw error;
        throw new HiddenQueueUnavailableError();
      } finally {
        bestEffortDiscardClient(pool);
      }
    },
  };
}
