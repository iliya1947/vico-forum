import type { PermissionKey } from "../app/authorization/catalog";
import { hasAdministrativeUserMeasureRestrictions, USER_MEASURE_ADMIN_PERMISSION_FAMILIES,
  type UserMeasureRestrictionId } from "../app/admin/user-measure-restrictions";

/** A separate AP-10 authority hierarchy, not an RBAC role or permission override. */
export const BLOCK_MANAGE_PERMISSION = "admin.users.blocks.manage" as const satisfies PermissionKey;
export const BLOCK_MANAGE_PRIVILEGED_PERMISSION =
  "admin.users.blocks.managePrivileged" as const satisfies PermissionKey;

export type UserMeasureAuthorityLevel = 0 | 1 | 2 | 3;

export class UserMeasureConfigurationUnavailableError extends Error {
  constructor() {
    super("user measure owner binding is unavailable");
    this.name = "UserMeasureConfigurationUnavailableError";
  }
}

export class UserMeasureForbiddenError extends Error {
  constructor() {
    super("insufficient user measure authority");
    this.name = "UserMeasureForbiddenError";
  }
}

const privateAdministrativePermissions = new Set<PermissionKey>(
  Object.values(USER_MEASURE_ADMIN_PERMISSION_FAMILIES).flat(),
);

/** The owner binding is server-owned; no role name, email or client-provided identity is valid. */
export function requireUserMeasureOwnerId(value: unknown): string {
  if (typeof value !== "string" || !value || value.trim() !== value) {
    throw new UserMeasureConfigurationUnavailableError();
  }
  return value;
}

/**
 * Caller supplies raw effective RBAC permissions, before any administrative restriction filtering.
 * Expiration/lift of a restriction must not downgrade the target's hierarchy.
 */
export function rawUserMeasureAuthorityLevel(
  userId: string,
  permissions: ReadonlySet<PermissionKey>,
  ownerUserId: string,
): UserMeasureAuthorityLevel {
  if (userId === ownerUserId) return 3;
  if (permissions.has(BLOCK_MANAGE_PRIVILEGED_PERMISSION)) return 2;
  for (const permission of privateAdministrativePermissions) {
    if (permissions.has(permission)) return 1;
  }
  return 0;
}

/** Guard latent administrative sanctions before saving them, even for ordinary targets. */
export function assertUserMeasureAdminRestrictionsAuthority(
  actorLevel: UserMeasureAuthorityLevel,
  restrictions: readonly UserMeasureRestrictionId[],
): void {
  if (hasAdministrativeUserMeasureRestrictions(restrictions) && actorLevel < 2)
    throw new UserMeasureForbiddenError();
}

export interface UserMeasureAuthorityInput {
  actorId: string;
  targetUserId: string;
  actorRawPermissions: ReadonlySet<PermissionKey>;
  targetRawPermissions: ReadonlySet<PermissionKey>;
  ownerUserId: unknown;
  /** Stored issuer authority floor for an existing measure (create has no floor). */
  issuerAuthorityFloor?: number;
}

/**
 * Called only after holding authz_mutation_lock in the surrounding authoritative transaction.
 * This function does not acquire a lock or accept session role claims as authority.
 */
export function assertUserMeasureAuthority(input: UserMeasureAuthorityInput): UserMeasureAuthorityLevel {
  const ownerId = requireUserMeasureOwnerId(input.ownerUserId);
  if (input.actorId === input.targetUserId || input.targetUserId === ownerId) {
    throw new UserMeasureForbiddenError();
  }
  if (!input.actorRawPermissions.has(BLOCK_MANAGE_PERMISSION)) {
    throw new UserMeasureForbiddenError();
  }
  const actorLevel = rawUserMeasureAuthorityLevel(input.actorId, input.actorRawPermissions, ownerId);
  const targetLevel = rawUserMeasureAuthorityLevel(input.targetUserId, input.targetRawPermissions, ownerId);
  if (actorLevel <= targetLevel) throw new UserMeasureForbiddenError();
  if (input.issuerAuthorityFloor !== undefined) {
    if (!Number.isInteger(input.issuerAuthorityFloor) ||
        input.issuerAuthorityFloor < 1 || input.issuerAuthorityFloor > 3) {
      throw new RangeError("invalid issuer authority floor");
    }
    if (actorLevel < input.issuerAuthorityFloor) throw new UserMeasureForbiddenError();
  }
  return actorLevel;
}
