import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import {
  RegistryConnectionUnavailableError,
  createRequestRegistryLoader,
  isTransportUnavailableCode,
  type LoadedLocaleRegistry,
  type RegistryDegradedReason,
} from "../app/localization/persistent-registry";
import { DrizzleLocaleRepository } from "./locale-repository";

interface PostgreSqlClientFactory {
  (connectionString: string): Client;
}

type RegistryDegradedReporter = (reason: RegistryDegradedReason) => void;

const defaultClientFactory: PostgreSqlClientFactory = (connectionString) => new Client({ connectionString });
const postgresUnavailableCodes = new Set(["57P01", "57P02", "57P03", "53300"]);

const defaultDegradedReporter: RegistryDegradedReporter = (reason) => {
  console.warn(JSON.stringify({ event: "locale_registry_degraded", reason }));
};

/** Creates a lazy registry loader for one Worker request. */
export function createHyperdriveRegistryLoader(
  connectionString: string,
  createClient: PostgreSqlClientFactory = defaultClientFactory,
  reportDegraded: RegistryDegradedReporter = defaultDegradedReporter,
): () => Promise<LoadedLocaleRegistry> {
  const load = createRequestRegistryLoader({
    async readAll() {
      const client = createClient(connectionString);
      try {
        await client.connect();
      } catch (error) {
        if (!isConnectAvailabilityFailure(error)) throw error;
        throw new RegistryConnectionUnavailableError({ cause: error });
      }
      return new DrizzleLocaleRepository(drizzle(client)).readAll();
    },
  });

  let reportedDegraded = false;
  return async () => {
    const loaded = await load();
    if (!reportedDegraded && loaded.health.status === "degraded") {
      reportedDegraded = true;
      reportDegraded(loaded.health.reason);
    }
    return loaded;
  };
}

function isConnectAvailabilityFailure(error: unknown): boolean {
  if (
    error instanceof TypeError ||
    error instanceof ReferenceError ||
    error instanceof SyntaxError ||
    error instanceof RangeError
  ) {
    return false;
  }

  const code =
    error && (typeof error === "object" || typeof error === "function")
      ? (error as { code?: unknown }).code
      : undefined;

  if (typeof code === "string") {
    return code.startsWith("08") || postgresUnavailableCodes.has(code) || isTransportUnavailableCode(code);
  }

  return error instanceof Error;
}
