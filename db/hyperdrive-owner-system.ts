import { createWebPool, isPostgresConnectionTimeout, isPostgresQueryTimeout } from "./postgres-deadlines";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import {
  PostgresOwnerSystemMonitoring, type OwnerSystemMonitoring,
} from "./owner-system-monitoring";

export class OwnerSystemUnavailableError extends Error {}

function isStorageUnavailable(error: unknown): boolean {
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

export function createHyperdriveOwnerSystem(connectionString: string, mode: string): OwnerSystemMonitoring {
  async function run<T>(work: (instance: PostgresOwnerSystemMonitoring) => Promise<T>): Promise<T> {
    const pool = createWebPool(connectionString);
    try {
      return await work(new PostgresOwnerSystemMonitoring(pool, mode));
    } catch (error) {
      if (isStorageUnavailable(error)) throw new OwnerSystemUnavailableError("Owner monitoring unavailable", { cause: error });
      throw error;
    } finally {
      await pool.end().catch(() => undefined);
    }
  }
  return {
    readSystem: () => run(instance => instance.readSystem()),
    readTimeline: options => run(instance => instance.readTimeline(options)),
    recordRequestFailure: (status, latency) => run(instance => instance.recordRequestFailure(status, latency)),
  };
}
