import { createWebPool, bestEffortDiscardClient,
  isPostgresConnectionTimeout, isPostgresQueryTimeout } from "./postgres-deadlines";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import { PostgresOwnerUserProfile, type OwnerUserProfileReader } from "./owner-user-profile";
import { PostgresOwnerUserHistory, type OwnerUserHistoryReader } from "./owner-user-history";

export class OwnerProfileUnavailableError extends Error {}

function isUnavailable(error: unknown): boolean {
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

/** A one-operation bounded pool; no private state is cached between requests. */
/** Classified operation-scoped pool; no cached target or cross-account state. */
export function createHyperdriveOwnerProfile(connectionString: string): OwnerUserProfileReader & OwnerUserHistoryReader {
  async function run<T>(operation: (pool: ReturnType<typeof createWebPool>) => Promise<T>): Promise<T> {
    const pool = createWebPool(connectionString);
    try {
      return await operation(pool);
    } catch (error) {
      if (isUnavailable(error)) {
        throw new OwnerProfileUnavailableError("Owner profile unavailable", { cause: error });
      }
      throw error;
    } finally {
      bestEffortDiscardClient(pool);
    }
  }
  return {
    readTarget: query => run(pool => new PostgresOwnerUserProfile(pool).readTarget(query)),
    readHistory: (targetId, before) =>
      run(pool => new PostgresOwnerUserHistory(pool).readHistory(targetId, before)),
  };
}
