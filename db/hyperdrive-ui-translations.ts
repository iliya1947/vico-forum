import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import {
  isPostgresAvailabilityFailure,
} from "../app/localization/persistent-registry";
import type {
  PersistentUiTranslationRow,
  UiTranslationStore,
} from "../app/localization/persistent-sources";
import { DrizzleUiTranslationStore } from "./ui-translation-store";
import {
  bestEffortDiscardClient,
  createLocalizationClient,
  isPostgresConnectionTimeout,
  isPostgresQueryTimeout,
} from "./postgres-deadlines";

export type UiTranslationStoreDegradedReason = "unavailable" | "schema-mismatch" | "timeout";

type UiTranslationStoreDegradedReporter = (reason: UiTranslationStoreDegradedReason) => void;

interface PostgreSqlClientFactory {
  (connectionString: string): Client;
}

class UiTranslationConnectionUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("persistent UI translation connection unavailable", options);
    this.name = "UiTranslationConnectionUnavailableError";
  }
}

const schemaMismatchCodes = new Set(["42P01", "42703", "42804"]);
const defaultClientFactory: PostgreSqlClientFactory = createLocalizationClient;
const defaultDegradedReporter: UiTranslationStoreDegradedReporter = (reason) => {
  console.warn(JSON.stringify({ event: "ui_translation_store_degraded", reason }));
};

/** Creates one lazy read-only persistent UI translation store for a Worker request. */
export function createHyperdriveUiTranslationStore(
  connectionString: string,
  createClient: PostgreSqlClientFactory = defaultClientFactory,
  reportDegraded: UiTranslationStoreDegradedReporter = defaultDegradedReporter,
): UiTranslationStore {
  let storePromise: Promise<DrizzleUiTranslationStore> | undefined;
  let client: Client | undefined;
  let circuitOpen = false;
  let reportedDegraded = false;
  const reads = new Map<string, Promise<readonly PersistentUiTranslationRow[]>>();

  const loadStore = () => (storePromise ??= connectStore(connectionString, createClient, (connected) => {
    client = connected;
  }));

  const read = async (
    locale: string,
    namespaces: readonly string[],
  ): Promise<readonly PersistentUiTranslationRow[]> => {
    if (locale === "en" || namespaces.length === 0) return [];
    if (circuitOpen) return [];
    try {
      return await (await loadStore()).readApproved(locale, namespaces);
    } catch (error) {
      const reason = classifyReadFailure(error);
      if (!reason) throw error;
      circuitOpen = true;
      if (client) bestEffortDiscardClient(client);
      if (!reportedDegraded) {
        reportedDegraded = true;
        reportDegraded(reason);
      }
      return [];
    }
  };

  return {
    readApproved(locale, namespaces) {
      const normalizedNamespaces = [...new Set(namespaces)].sort();
      const key = JSON.stringify([locale, normalizedNamespaces]);
      let pending = reads.get(key);
      if (!pending) {
        pending = read(locale, normalizedNamespaces);
        reads.set(key, pending);
      }
      return pending;
    },
  };
}

async function connectStore(
  connectionString: string,
  createClient: PostgreSqlClientFactory,
  connected: (client: Client) => void,
) {
  const client = createClient(connectionString);
  connected(client);
  try {
    await client.connect();
  } catch (error) {
    if (!isPostgresAvailabilityFailure(error) && !isPostgresConnectionTimeout(error)) throw error;
    throw new UiTranslationConnectionUnavailableError({ cause: error });
  }
  return new DrizzleUiTranslationStore(drizzle(client));
}

function classifyReadFailure(error: unknown): UiTranslationStoreDegradedReason | undefined {
  const seen = new Set<unknown>();
  let current = error;

  while (current && (typeof current === "object" || typeof current === "function") && !seen.has(current)) {
    seen.add(current);
    if (current instanceof UiTranslationConnectionUnavailableError) return "unavailable";

    const candidate = current as { cause?: unknown; code?: unknown };
    const code = typeof candidate.code === "string" ? candidate.code : undefined;
    if (isPostgresQueryTimeout(current)) return "timeout";
    if (code && schemaMismatchCodes.has(code)) return "schema-mismatch";
    if (isPostgresAvailabilityFailure(current)) return "unavailable";
    current = candidate.cause;
  }

  return undefined;
}
