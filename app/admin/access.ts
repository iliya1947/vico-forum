import type { PermissionKey } from "../authorization/catalog";

/** Implemented AP-01 admission matrix. These are capabilities, never role names. */
export const ADMIN_FORUM_PERMISSIONS = [
  "forum.topic.pin", "forum.topic.close", "forum.solution.manageAny", "forum.helpDuplicate.manage",
  "forum.sourceLocale.correctAny", "forum.post.history.read",
] as const satisfies readonly PermissionKey[];
export const ADMIN_ADMISSION_PERMISSIONS = [
  "access.authorization.manage", "admin.history.read", "admin.users.read", "admin.users.blocks.manage", ...ADMIN_FORUM_PERMISSIONS,
] as const;

export interface AdminAccess {
  canEnter: boolean;
  canReadHistory?: boolean;
  canReadUsers?: boolean;
  canManageMeasures?: boolean;
  canReadForum: boolean;
  canManageAuthorization: boolean;
}
export function adminAccess(permissions: ReadonlySet<PermissionKey>): AdminAccess {
  const canReadForum = ADMIN_FORUM_PERMISSIONS.some(key => permissions.has(key));
  const canManageAuthorization = permissions.has("access.authorization.manage");
  const canReadHistory = permissions.has("admin.history.read");
  const canReadUsers = permissions.has("admin.users.read");
  const canManageMeasures = permissions.has("admin.users.blocks.manage");
  return { canEnter: canReadForum || canManageAuthorization || canReadHistory || canReadUsers || canManageMeasures, canReadForum, canManageAuthorization,
    ...(canReadHistory ? { canReadHistory: true } : {}),
    ...(canReadUsers ? { canReadUsers: true } : {}),
    ...(canManageMeasures ? { canManageMeasures: true } : {}) };
}
