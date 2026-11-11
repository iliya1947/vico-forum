import { createWebPool, isPostgresConnectionTimeout, isPostgresQueryTimeout } from "./postgres-deadlines";
import { PostgresOwnerSa02Current, type Sa02CurrentState } from "./owner-sa02-current";
import {
  PostgresOwnerSa02History, type OwnerHistoryOptions, type OwnerHistoryPage,
} from "./owner-sa02-history";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import {
  PostgresOwnerSystemMonitoring, type OwnerSystemMonitoring,
} from "./owner-system-monitoring";

export class OwnerSystemUnavailableError extends Error {}

/** Exact-Owner-only SA02 reads; access control is enforced by each route before invoking them. */
export interface OwnerSa02Monitoring {
  readSa02Current(): Promise<Sa02CurrentState>;
  readSa02History(options?: OwnerHistoryOptions): Promise<OwnerHistoryPage>;
}

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

export function createHyperdriveOwnerSystem(connectionString: string, mode: string): OwnerSystemMonitoring & OwnerSa02Monitoring {
  async function run<T>(work: (pool: ReturnType<typeof createWebPool>) => Promise<T>): Promise<T> {
    const pool = createWebPool(connectionString);
    try {
      return await work(pool);
    } catch (error) {
      if (isStorageUnavailable(error)) throw new OwnerSystemUnavailableError("Owner monitoring unavailable", { cause: error });
      throw error;
    } finally {
      await pool.end().catch(() => undefined);
    }
  }
  return {
    readSystem: () => run(pool => new PostgresOwnerSystemMonitoring(pool, mode).readSystem()),
    readTimeline: options => run(pool => new PostgresOwnerSystemMonitoring(pool, mode).readTimeline(options)),
    recordRequestFailure: (status, latency) =>
      run(pool => new PostgresOwnerSystemMonitoring(pool, mode).recordRequestFailure(status, latency)),
    readSa02Current: () => run(pool => new PostgresOwnerSa02Current(pool).readCurrent()),
    readSa02History: options => run(pool => new PostgresOwnerSa02History(pool).readTimeline(options)),
  };
}
