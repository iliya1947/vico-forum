import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import {
  isPostgresAvailabilityFailure,
} from "../app/localization/persistent-registry";
import type {
  PersistentUiTranslationRow,
  UiTranslationStore,
} from "../app/localization/persistent-sources";
import type { CompiledNamespaceBundle, TranslationBundleReader } from "../app/localization/bundles";
import {
  DrizzleUiTranslationBundleStore,
  PersistentBundleIntegrityError,
} from "./ui-translation-bundle-store";
import { DrizzleUiTranslationStore } from "./ui-translation-store";
import {
  bestEffortDiscardClient,
  createLocalizationClient,
  isPostgresConnectionTimeout,
  isPostgresQueryTimeout,
} from "./postgres-deadlines";

export type UiTranslationStoreDegradedReason = "unavailable" | "schema-mismatch" | "timeout" | "invalid-bundle";

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
): UiTranslationStore & TranslationBundleReader {
  let storePromise: Promise<{ raw: DrizzleUiTranslationStore; bundles: DrizzleUiTranslationBundleStore }> | undefined;
  let client: Client | undefined;
  let circuitOpen = false;
  let reportedDegraded = false;
  const reads = new Map<string, Promise<readonly PersistentUiTranslationRow[]>>();
  const bundleReads = new Map<string, Promise<CompiledNamespaceBundle | undefined>>();

  const loadStore = () => (storePromise ??= connectStore(connectionString, createClient, (connected) => {
    client = connected;
  }));
  const reportOnce = (reason: UiTranslationStoreDegradedReason) => {
    if (reportedDegraded) return;
    reportedDegraded = true;
    reportDegraded(reason);
  };

  const read = async (
    locale: string,
    namespaces: readonly string[],
  ): Promise<readonly PersistentUiTranslationRow[]> => {
    if (locale === "en" || namespaces.length === 0) return [];
    if (circuitOpen) return [];
    try {
      return await (await loadStore()).raw.readApproved(locale, namespaces);
    } catch (error) {
      const reason = classifyReadFailure(error);
      if (!reason) throw error;
      circuitOpen = true;
      if (client) bestEffortDiscardClient(client);
      reportOnce(reason);
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
    read(locale, namespace) {
      if (locale === "en") return Promise.resolve(undefined);
      const key = JSON.stringify([locale, namespace]);
      let pending = bundleReads.get(key);
      if (!pending) {
        pending = (async () => {
          if (circuitOpen) return undefined;
          try {
            return await (await loadStore()).bundles.read(locale, namespace);
          } catch (error) {
            if (error instanceof PersistentBundleIntegrityError) {
              reportOnce("invalid-bundle");
              return undefined;
            }
            const reason = classifyReadFailure(error);
            if (!reason) throw error;
            circuitOpen = true;
            if (client) bestEffortDiscardClient(client);
            reportOnce(reason);
            return undefined;
          }
        })();
        bundleReads.set(key, pending);
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
  const database = drizzle(client);
  return {
    raw: new DrizzleUiTranslationStore(database),
    bundles: new DrizzleUiTranslationBundleStore(database),
  };
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
