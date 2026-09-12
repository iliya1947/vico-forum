import { Client } from "pg";

/** Initial values; keep the server deadlines below the caller deadline and calibrate in staging. */
export const LOCALIZATION_DB_DEADLINES = {
  connectionTimeoutMillis: 1_000,
  queryTimeoutMillis: 2_000,
  lockTimeoutMillis: 500,
  statementTimeoutMillis: 1_500,
} as const;

export function createLocalizationClient(connectionString: string): Client {
  return new Client({
    connectionString,
    connectionTimeoutMillis: LOCALIZATION_DB_DEADLINES.connectionTimeoutMillis,
    query_timeout: LOCALIZATION_DB_DEADLINES.queryTimeoutMillis,
  });
}

export function isPostgresConnectionTimeout(error: unknown): boolean {
  return findError(error, ({ code, message }) => code === undefined && message === "timeout expired");
}

export function isPostgresQueryTimeout(error: unknown): boolean {
  return findError(error, ({ code, message }) =>
    message === "Query read timeout" ||
    (code === "57014" && message === "canceling statement due to statement timeout") ||
    (code === "55P03" && message === "canceling statement due to lock timeout")
  );
}

export function bestEffortDiscardClient(client: Client): void {
  try {
    void Promise.resolve(client.end()).catch(() => undefined);
  } catch {
    // Cleanup must not replace the classified database failure.
  }
}

function findError(
  error: unknown,
  predicate: (error: { code?: string; message?: string }) => boolean,
): boolean {
  const seen = new Set<unknown>();
  let current = error;
  while (current && (typeof current === "object" || typeof current === "function") && !seen.has(current)) {
    seen.add(current);
    const candidate = current as { cause?: unknown; code?: unknown; message?: unknown };
    if (predicate({
      code: typeof candidate.code === "string" ? candidate.code : undefined,
      message: typeof candidate.message === "string" ? candidate.message : undefined,
    })) return true;
    current = candidate.cause;
  }
  return false;
}
