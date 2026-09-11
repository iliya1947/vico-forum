import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { createRequestRegistryLoader, type LoadedLocaleRegistry } from "../app/localization/persistent-registry";
import { DrizzleLocaleRepository } from "./locale-repository";

interface PostgreSqlClientFactory {
  (connectionString: string): Client;
}

const defaultClientFactory: PostgreSqlClientFactory = (connectionString) => new Client({ connectionString });

/** Creates a lazy registry loader for one Worker request. */
export function createHyperdriveRegistryLoader(
  connectionString: string,
  createClient: PostgreSqlClientFactory = defaultClientFactory,
): () => Promise<LoadedLocaleRegistry> {
  return createRequestRegistryLoader({
    async readAll() {
      const client = createClient(connectionString);
      await client.connect();
      return new DrizzleLocaleRepository(drizzle(client)).readAll();
    },
  });
}
