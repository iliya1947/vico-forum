import { Pool } from "pg";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import {
  AuthorizationService,
  AuthorizationUnavailableError,
  type AuthorizationManagementCapability,
} from "./authorization-service";
import { PostgresAuthorizationRepository } from "./authorization-repository";
import {
  isPostgresConnectionTimeout,
  isPostgresQueryTimeout,
} from "./postgres-deadlines";

type AuthorizationPoolFactory = (connectionString: string) => Pool;

const defaultPoolFactory: AuthorizationPoolFactory = (connectionString) =>
  new Pool({ connectionString, max: 1 });

/** Creates a request-local resolver and cache; PostgreSQL remains authoritative. */
export function createHyperdriveAuthorization(
  connectionString: string,
  createPool: AuthorizationPoolFactory = defaultPoolFactory,
): AuthorizationManagementCapability {
  const cache = new Map<string, ReturnType<PostgresAuthorizationRepository["resolveUser"]>>();

  const run = <T>(operation: (service: AuthorizationService) => Promise<T>): Promise<T> =>
    withAuthorizationAvailability(async () => {
      const pool = createPool(connectionString);
      try {
        return await operation(new AuthorizationService(new PostgresAuthorizationRepository(pool)));
      } finally {
        await pool.end();
      }
    });

  return {
    forUser(userId) {
      const resolve = () => {
        let value = cache.get(userId);
        if (!value) {
          value = withAuthorizationAvailability(async () => {
            const pool = createPool(connectionString);
            try {
              return await new PostgresAuthorizationRepository(pool).resolveUser(userId);
            } finally {
              await pool.end();
            }
          });
          cache.set(userId, value);
        }
        return value;
      };
      return {
        resolve,
        async has(permission) {
          return (await resolve()).effectivePermissions.includes(permission);
        },
      };
    },
    listRoles: () => run((service) => service.listRoles()),
    readRole: (roleId) => run((service) => service.readRole(roleId)),
    listUsers: () => run((service) => service.listUsers()),
    resolveUser: (userId) => run((service) => service.resolveUser(userId)),
    readManagementState: () => run((service) => service.readManagementState()),
    createCustomRole: (actorId, input) => run((service) => service.createCustomRole(actorId, input)),
    renameCustomRole: (actorId, roleId, input) => run((service) => service.renameCustomRole(actorId, roleId, input)),
    replaceRoleGrants: (actorId, roleId, permissions) =>
      run((service) => service.replaceRoleGrants(actorId, roleId, permissions)),
    deleteCustomRole: (actorId, roleId) => run((service) => service.deleteCustomRole(actorId, roleId)),
    assignUserRole: (actorId, userId, roleId) => run((service) => service.assignUserRole(actorId, userId, roleId)),
    setUserOverride: (actorId, userId, permission, effect) =>
      run((service) => service.setUserOverride(actorId, userId, permission, effect)),
  };
}

async function withAuthorizationAvailability<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isAuthorizationAvailabilityFailure(error)) {
      throw new AuthorizationUnavailableError({ cause: error });
    }
    throw error;
  }
}

function isAuthorizationAvailabilityFailure(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current = error;
  while (current && (typeof current === "object" || typeof current === "function") && !seen.has(current)) {
    seen.add(current);
    if (
      isPostgresAvailabilityFailure(current) ||
      isPostgresConnectionTimeout(current) ||
      isPostgresQueryTimeout(current)
    ) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
