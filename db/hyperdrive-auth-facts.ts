import { createWebPool } from "./postgres-deadlines";
import { PostgresAuthFactWriter, type AuthFactWriter } from "./owner-auth-facts";

/** A separate short-lived best-effort pool; never shares an auth mutation client. */
export function createHyperdriveAuthFactWriter(connectionString: string):
  AuthFactWriter & { close(): Promise<void> } {
  const pool = createWebPool(connectionString);
  const writer = new PostgresAuthFactWriter(pool);
  return {
    append: (fact, occurredAt) => writer.append(fact, occurredAt),
    close: () => pool.end(),
  };
}
