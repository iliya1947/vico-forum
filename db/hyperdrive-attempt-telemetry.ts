import { createWebPool } from "./postgres-deadlines";
import {
  PostgresAttemptTelemetryWriter, type AttemptTelemetryWriter,
} from "./owner-attempt-telemetry";

/** Short-lived writer pool, separate from auth mutations and Owner readers. */
export function createHyperdriveAttemptTelemetry(connectionString: string):
  AttemptTelemetryWriter & { close(): Promise<void> } {
  const pool = createWebPool(connectionString);
  const writer = new PostgresAttemptTelemetryWriter(pool);
  return {
    record: input => writer.record(input),
    recordGap: input => writer.recordGap(input),
    close: () => pool.end(),
  };
}
