import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import type { PermissionKey } from "../app/authorization/catalog";
import type { AuthorizationManagementCapability } from "./authorization-service";
import { AuthorizationUnavailableError } from "./authorization-service";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import {
  bestEffortDiscardClient, createWebPool, isPostgresConnectionTimeout, isPostgresQueryTimeout,
} from "./postgres-deadlines";
import { assertNoActiveUserMeasureRestriction, UserMeasureRestrictedError } from "./user-measure-policy";

const FORUM_ADMIN_PERMISSIONS = new Set<PermissionKey>([
  "forum.topic.pin", "forum.topic.close", "forum.solution.manageAny",
  "forum.helpNeedsDetails.manage", "forum.helpDuplicate.manage",
  "forum.sourceLocale.correctAny", "forum.post.history.read",
]);

type PoolFactory = (connectionString: string) => Pool;

/**
 * Request-local effective action view. Raw role grants, overrides and
 * management/authority methods are untouched. Each Worker request creates a
 * new wrapper and checks current database state, with no cross-request cache.
 */
export function withForumAdministrativeRestrictions(
  raw: AuthorizationManagementCapability,
  connectionString: string,
  poolFactory: PoolFactory = createWebPool,
): AuthorizationManagementCapability {
  const blocked = new Map<string, Promise<boolean>>();
  function isRestricted(actorId: string): Promise<boolean> {
    let current = blocked.get(actorId);
    if (!current) {
      current = (async () => {
        const pool = poolFactory(connectionString);
        try {
          return await drizzle(pool).transaction(async tx => {
            try {
              await assertNoActiveUserMeasureRestriction(tx, actorId, "admin.forum");
              return false;
            } catch (error) {
              if (error instanceof UserMeasureRestrictedError) return true;
              throw error;
            }
          });
        } catch (error) {
          if (
            isPostgresAvailabilityFailure(error)
            || isPostgresConnectionTimeout(error)
            || isPostgresQueryTimeout(error)
          ) throw new AuthorizationUnavailableError({ cause: error });
          throw error;
        } finally {
          bestEffortDiscardClient(pool);
        }
      })();
      blocked.set(actorId, current);
    }
    return current;
  }
  return {
    ...raw,
    forUser(actorId) {
      const resolver = raw.forUser(actorId);
      return {
        async has(permission) {
          if (!FORUM_ADMIN_PERMISSIONS.has(permission)) return resolver.has(permission);
          if (!await resolver.has(permission)) return false;
          return !(await isRestricted(actorId));
        },
        async resolve() {
          const snapshot = await resolver.resolve();
          if (!snapshot.effectivePermissions.some(p => FORUM_ADMIN_PERMISSIONS.has(p))) return snapshot;
          if (!await isRestricted(actorId)) return snapshot;
          return {
            ...snapshot,
            effectivePermissions: snapshot.effectivePermissions.filter(p => !FORUM_ADMIN_PERMISSIONS.has(p)),
          };
        },
      };
    },
  };
}
