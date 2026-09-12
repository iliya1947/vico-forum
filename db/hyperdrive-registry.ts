import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import {
  RegistryConnectionUnavailableError,
  createRequestRegistryLoader,
  isPostgresAvailabilityFailure,
  type LoadedLocaleRegistry,
  type RegistryDegradedReason,
} from "../app/localization/persistent-registry";
import { DrizzleLocaleRepository } from "./locale-repository";
import {
  bestEffortDiscardClient,
  createLocalizationClient,
  isPostgresConnectionTimeout,
  isPostgresQueryTimeout,
} from "./postgres-deadlines";

interface PostgreSqlClientFactory {
  (connectionString: string): Client;
}

type RegistryDegradedReporter = (reason: RegistryDegradedReason) => void;

const defaultClientFactory: PostgreSqlClientFactory = createLocalizationClient;

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
        return await new DrizzleLocaleRepository(drizzle(client)).readAll();
      } catch (error) {
        if (
          !isPostgresAvailabilityFailure(error) &&
          !isPostgresConnectionTimeout(error) &&
          !isPostgresQueryTimeout(error)
        ) throw error;
        bestEffortDiscardClient(client);
        throw new RegistryConnectionUnavailableError({ cause: error });
      }
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
