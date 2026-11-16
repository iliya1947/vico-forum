import type { Pool } from "pg";
import { AccountStateUnavailableError } from "./account-state";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import { bestEffortDiscardClient, createWebPool, isPostgresConnectionTimeout, isPostgresQueryTimeout } from "./postgres-deadlines";
import { PostgresOwnerAccountLifecycleCommand, OwnerAccountLifecycleCommitUncertainError,
  type OwnerAccountLifecycleCommand } from "./owner-account-lifecycle";

export class OwnerAccountLifecycleUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("Account lifecycle storage unavailable", options);
    this.name = "OwnerAccountLifecycleUnavailableError";
  }
}
function unavailable(error: unknown): boolean {
  let current = error;
  const seen = new Set<unknown>();
  for (let depth = 0; depth < 16 && current && typeof current === "object" && !seen.has(current); depth++) {
    seen.add(current);
    if (current instanceof AccountStateUnavailableError || isPostgresAvailabilityFailure(current)
      || isPostgresConnectionTimeout(current) || isPostgresQueryTimeout(current)) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

/** Operation-scoped facade; Owner binding comes from trusted server configuration. */
export function createHyperdriveOwnerAccountLifecycle(connectionString: string, ownerBinding: unknown,
  poolFactory: (connectionString: string) => Pool = createWebPool): OwnerAccountLifecycleCommand {
  return {
    async deactivate(input) {
      const pool = poolFactory(connectionString);
      try {
        return await new PostgresOwnerAccountLifecycleCommand(pool, ownerBinding).deactivate(input);
      } catch (error) {
        // Preserve an ambiguous COMMIT as such, even when its cause is a transport failure.
        if (error instanceof OwnerAccountLifecycleCommitUncertainError) throw error;
        if (unavailable(error)) throw new OwnerAccountLifecycleUnavailableError({ cause: error });
        throw error;
      } finally { bestEffortDiscardClient(pool); }
    },
  };
}
