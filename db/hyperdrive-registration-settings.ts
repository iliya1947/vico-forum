import type { Pool } from "pg";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import { createWebPool, bestEffortDiscardClient, isPostgresConnectionTimeout, isPostgresQueryTimeout } from "./postgres-deadlines";
import { PostgresRegistrationSettingsRepository, type RegistrationSettingsUpdate } from "./registration-settings";

export class RegistrationSettingsUnavailableError extends Error {}

function classifiedAvailability(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    if (isPostgresAvailabilityFailure(current) || isPostgresConnectionTimeout(current)
      || isPostgresQueryTimeout(current)) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

export function createHyperdriveRegistrationSettings(
  connectionString: string, ownerBinding?: string,
  poolFactory: (connectionString: string) => Pool = createWebPool,
) {
  const run = async <T>(operation: (repository: PostgresRegistrationSettingsRepository) => Promise<T>): Promise<T> => {
    const pool = poolFactory(connectionString);
    try {
      return await operation(new PostgresRegistrationSettingsRepository(pool));
    } catch (error) {
      if (classifiedAvailability(error)) throw new RegistrationSettingsUnavailableError("Registration settings unavailable", { cause: error });
      throw error;
    } finally { bestEffortDiscardClient(pool); }
  };
  return {
    read: () => run(repository => repository.read()),
    update: (actorId: string, input: RegistrationSettingsUpdate) =>
      run(repository => repository.update(actorId, ownerBinding, input)),
  };
}
