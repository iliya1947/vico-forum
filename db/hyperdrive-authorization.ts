import { Pool } from "pg";
import type { AuthorizationCapability } from "./authorization-service";
import { PostgresAuthorizationRepository } from "./authorization-repository";

/** Creates a request-local resolver and cache; PostgreSQL remains authoritative. */
export function createHyperdriveAuthorization(connectionString: string): AuthorizationCapability {
  const cache = new Map<string, ReturnType<PostgresAuthorizationRepository["resolveUser"]>>();
  return { forUser(userId) {
    const resolve = () => {
      let value = cache.get(userId);
      if (!value) {
        const pool = new Pool({ connectionString, max: 1 });
        value = new PostgresAuthorizationRepository(pool).resolveUser(userId).finally(() => pool.end());
        cache.set(userId, value);
      }
      return value;
    };
    return {
      resolve,
      async has(permission) { return (await resolve()).effectivePermissions.includes(permission); },
    };
  } };
}
