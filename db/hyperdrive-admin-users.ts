import { PostgresAdminUsersReader, type AdminUsersReader } from "./admin-users";
import { createWebPool, bestEffortDiscardClient, isPostgresConnectionTimeout, isPostgresQueryTimeout } from "./postgres-deadlines";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";

export class AdminUsersUnavailableError extends Error {}

export function createHyperdriveAdminUsers(connectionString: string): AdminUsersReader {
  return {
    async listUsers(query) {
      const pool = createWebPool(connectionString);
      try {
        return await new PostgresAdminUsersReader(pool).listUsers(query);
      } catch (error) {
        if (isPostgresAvailabilityFailure(error) || isPostgresConnectionTimeout(error) || isPostgresQueryTimeout(error)) {
          throw new AdminUsersUnavailableError("Admin Users read unavailable", { cause: error });
        }
        throw error;
      } finally {
        bestEffortDiscardClient(pool);
      }
    },
  };
}
