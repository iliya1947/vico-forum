import { PostgresAdminHistoryReader, type AdminHistoryReader } from "./admin-history";
import { createWebPool, bestEffortDiscardClient, isPostgresConnectionTimeout, isPostgresQueryTimeout } from "./postgres-deadlines";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
export class AdminHistoryUnavailableError extends Error {}
export function createHyperdriveAdminHistory(connectionString: string): AdminHistoryReader {
  return { async read(cursor, limit) {
    const pool = createWebPool(connectionString);
    try { return await new PostgresAdminHistoryReader(pool).read(cursor, limit); }
    catch (error) {
      if (isPostgresAvailabilityFailure(error) || isPostgresConnectionTimeout(error) || isPostgresQueryTimeout(error)) {
        throw new AdminHistoryUnavailableError("History unavailable", { cause: error });
      }
      throw error;
    } finally { bestEffortDiscardClient(pool); }
  } };
}
