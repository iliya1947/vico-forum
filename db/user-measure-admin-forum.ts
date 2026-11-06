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

const COMPLAINT_ADMIN_PERMISSIONS = new Set<PermissionKey>([
  "forum.complaint.review", "forum.complaint.appeal.review",
  "forum.complaint.priority.manage", "forum.complaint.reporterIdentity.read",
]);

type RestrictedFamily = "admin.forum" | "admin.complaints";
function familyFor(permission: PermissionKey): RestrictedFamily | null {
  if (FORUM_ADMIN_PERMISSIONS.has(permission)) return "admin.forum";
  if (COMPLAINT_ADMIN_PERMISSIONS.has(permission)) return "admin.complaints";
  return null;
}

type PoolFactory = (connectionString: string) => Pool;

/**
 * Request-local Forum/Complaints action view. Raw role grants, overrides and
 * management/authority methods are untouched. Each Worker request creates a
 * new wrapper and checks current database state, with no cross-request cache.
 */
export function withForumAdministrativeRestrictions(
  raw: AuthorizationManagementCapability,
  connectionString: string,
  poolFactory: PoolFactory = createWebPool,
): AuthorizationManagementCapability {
  const blocked = new Map<string, Promise<boolean>>();
  function isRestricted(actorId: string, family: RestrictedFamily): Promise<boolean> {
    const key = family + ":" + actorId;
    let current = blocked.get(key);
    if (!current) {
      current = (async () => {
        const pool = poolFactory(connectionString);
        try {
          return await drizzle(pool).transaction(async tx => {
            try {
              await assertNoActiveUserMeasureRestriction(tx, actorId, family);
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
      blocked.set(key, current);
    }
    return current;
  }
  return {
    ...raw,
    forUser(actorId) {
      const resolver = raw.forUser(actorId);
      return {
        async has(permission) {
          const family = familyFor(permission);
          if (!family) return resolver.has(permission);
          if (!await resolver.has(permission)) return false;
          return !(await isRestricted(actorId, family));
        },
        async resolve() {
          const snapshot = await resolver.resolve();
          const families = [...new Set(snapshot.effectivePermissions
            .map(familyFor).filter((family): family is RestrictedFamily => family !== null))];
          if (!families.length) return snapshot;
          const denied = new Set((await Promise.all(families.map(async family =>
            (await isRestricted(actorId, family)) ? family : null)))
            .filter((family): family is RestrictedFamily => family !== null));
          if (!denied.size) return snapshot;
          return {
            ...snapshot,
            effectivePermissions: snapshot.effectivePermissions.filter(p => {
              const family = familyFor(p);
              return family === null || !denied.has(family);
            }),
          };
        },
      };
    },
  };
}
