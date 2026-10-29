import type { PermissionKey } from "../authorization/catalog";
import type { PermissionResolver } from "../../db/authorization-service";

// Presentation/admission from existing capabilities; actions retain their own gates.
export const ADMIN_FORUM_PERMISSIONS = [
  "forum.topic.pin", "forum.solution.manageAny", "forum.helpDuplicate.manage",
  "forum.sourceLocale.correctAny", "forum.post.history.read",
] as const satisfies readonly PermissionKey[];

export interface AdminAccess { forum: boolean; authorization: boolean }

export async function readAdminAccess(resolver: PermissionResolver): Promise<AdminAccess> {
  const [authorization, ...forum] = await Promise.all([
    resolver.has("access.authorization.manage"),
    ...ADMIN_FORUM_PERMISSIONS.map((permission) => resolver.has(permission)),
  ]);
  return { authorization, forum: forum.some(Boolean) };
}

export function canEnterAdmin(access: AdminAccess): boolean {
  return access.authorization || access.forum;
}
