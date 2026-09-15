import { Pool } from "pg";
import { AuthorizationService, type AuthorizationManagementCapability } from "./authorization-service";
import { PostgresAuthorizationRepository } from "./authorization-repository";

/** Creates a request-local resolver and cache; PostgreSQL remains authoritative. */
export function createHyperdriveAuthorization(connectionString: string): AuthorizationManagementCapability {
  const cache = new Map<string, ReturnType<PostgresAuthorizationRepository["resolveUser"]>>();
  const run = async <T>(operation: (service: AuthorizationService) => Promise<T>): Promise<T> => {
    const pool = new Pool({ connectionString, max: 1 });
    try { return await operation(new AuthorizationService(new PostgresAuthorizationRepository(pool))); }
    finally { await pool.end(); }
  };
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
  },
  listRoles: () => run((service) => service.listRoles()),
  readRole: (roleId) => run((service) => service.readRole(roleId)),
  listUsers: () => run((service) => service.listUsers()),
  resolveUser: (userId) => run((service) => service.resolveUser(userId)),
  createCustomRole: (actorId, input) => run((service) => service.createCustomRole(actorId, input)),
  renameCustomRole: (actorId, roleId, input) => run((service) => service.renameCustomRole(actorId, roleId, input)),
  replaceRoleGrants: (actorId, roleId, permissions) => run((service) => service.replaceRoleGrants(actorId, roleId, permissions)),
  deleteCustomRole: (actorId, roleId) => run((service) => service.deleteCustomRole(actorId, roleId)),
  assignUserRole: (actorId, userId, roleId) => run((service) => service.assignUserRole(actorId, userId, roleId)),
  setUserOverride: (actorId, userId, permission, effect) => run((service) => service.setUserOverride(actorId, userId, permission, effect)),
  };
}
