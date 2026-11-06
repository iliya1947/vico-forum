import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import type { Pool } from "pg";
import type { PermissionKey } from "../app/authorization/catalog";
import type { AuthorizationManagementCapability } from "./authorization-service";
import { AuthorizationUnavailableError } from "./authorization-service";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import {
  bestEffortDiscardClient, createWebPool, isPostgresConnectionTimeout, isPostgresQueryTimeout,
} from "./postgres-deadlines";
import { rawUserMeasureAuthorityLevel } from "./user-measure-authority";

const FORUM_ADMIN_PERMISSIONS = new Set<PermissionKey>([
  "forum.topic.pin", "forum.topic.close", "forum.solution.manageAny",
  "forum.helpNeedsDetails.manage", "forum.helpDuplicate.manage",
  "forum.sourceLocale.correctAny", "forum.post.history.read",
]);

const COMPLAINT_ADMIN_PERMISSIONS = new Set<PermissionKey>([
  "forum.complaint.review", "forum.complaint.appeal.review",
  "forum.complaint.priority.manage", "forum.complaint.reporterIdentity.read",
]);

type RestrictedFamily = "admin.forum" | "admin.complaints" | "admin.security" | "admin.usersAccess";
function familyFor(permission: PermissionKey): RestrictedFamily | null {
  if (FORUM_ADMIN_PERMISSIONS.has(permission)) return "admin.forum";
  if (COMPLAINT_ADMIN_PERMISSIONS.has(permission)) return "admin.complaints";
  if (permission === "forum.attachmentSecurity.read") return "admin.security";
  if (permission === "admin.users.read" || permission === "admin.history.read" ||
      permission === "access.authorization.manage" ||
      permission === "admin.users.blocks.manage" ||
      permission === "admin.users.blocks.managePrivileged") return "admin.usersAccess";
  return null;
}

type PoolFactory = (connectionString: string) => Pool;

/**
 * Request-local Forum/Complaints/Security/Users action view. Raw role grants, overrides and
 * management/authority methods are untouched. Each Worker request creates a
 * new wrapper and checks current database state, with no cross-request cache.
 */
export function withForumAdministrativeRestrictions(
  raw: AuthorizationManagementCapability,
  connectionString: string,
  poolFactory: PoolFactory = createWebPool,
  ownerUserId?: string,
): AuthorizationManagementCapability {
  const blocked = new Map<string, Promise<boolean>>();
  function isRestricted(actorId: string, family: RestrictedFamily, rawTargetLevel: number): Promise<boolean> {
    const key = family + ":" + actorId + ":" + rawTargetLevel;
    let current = blocked.get(key);
    if (!current) {
      current = (async () => {
        const pool = poolFactory(connectionString);
        try {
          return await drizzle(pool).transaction(async tx => {
            // A saved administrative restriction cannot suppress permissions after the
            // target's newly granted raw authority reaches the issuer's recorded floor.
            // This check reads current RBAC independently of effective sanctions.
            const result = await tx.execute<{ restricted: boolean }>(sql`
              select exists (
                select 1 from user_measures measure
                join user_measure_restrictions child on child.measure_id=measure.id
                where measure.target_user_id=${actorId}
                  and child.restriction_key=${family} and child.enabled=true
                  and measure.lifted_at is null
                  and (measure.expires_at is null or measure.expires_at>clock_timestamp())
                  and measure.issuer_authority_floor>${rawTargetLevel}
              ) as restricted
            `);
            return result.rows[0]?.restricted === true;
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
          const snapshot = await resolver.resolve();
          if (!snapshot.effectivePermissions.includes(permission)) return false;
          const rawLevel = rawUserMeasureAuthorityLevel(
            actorId, new Set(snapshot.effectivePermissions), ownerUserId ?? "",
          );
          return !(await isRestricted(actorId, family, rawLevel));
        },
        async resolve() {
          const snapshot = await resolver.resolve();
          const rawLevel = rawUserMeasureAuthorityLevel(
            actorId, new Set(snapshot.effectivePermissions), ownerUserId ?? "",
          );
          const families = [...new Set(snapshot.effectivePermissions
            .map(familyFor).filter((family): family is RestrictedFamily => family !== null))];
          if (!families.length) return snapshot;
          const denied = new Set((await Promise.all(families.map(async family =>
            (await isRestricted(actorId, family, rawLevel)) ? family : null)))
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
