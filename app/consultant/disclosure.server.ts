import { isPermissionKey, type PermissionKey } from "../authorization/catalog";
import type { UserAuthorization } from "../../db/authorization-repository";

export type DisclosureLayer = "User" | "Moderator" | "Administrator";
const moderatorAnchors: readonly PermissionKey[] = [
  "forum.content.visibility.manage", "forum.solution.manageAny", "forum.helpDuplicate.manage",
  "forum.helpNeedsDetails.manage", "forum.complaint.review", "forum.complaint.appeal.review",
  "forum.attachmentSecurity.read",
];
const administratorAnchors: readonly PermissionKey[] = [
  "access.authorization.manage", "admin.history.read", "admin.users.read",
  "admin.users.blocks.manage", "forum.structure.manage",
];
export interface Disclosure {
  readonly layer: DisclosureLayer;
  readonly complete: boolean;
  readonly permissions: ReadonlySet<PermissionKey>;
  readonly exactOwner: boolean;
}
export function projectDisclosure(snapshot: UserAuthorization | null, exactOwner: boolean): Disclosure {
  if (!snapshot || !Array.isArray(snapshot.effectivePermissions) || !snapshot.effectivePermissions.every(isPermissionKey)) {
    return { layer: "User", complete: false, permissions: new Set(), exactOwner: false };
  }
  const permissions = new Set(snapshot.effectivePermissions);
  const layer = administratorAnchors.some(key => permissions.has(key)) ? "Administrator"
    : moderatorAnchors.some(key => permissions.has(key)) ? "Moderator" : "User";
  return { layer, complete: true, permissions, exactOwner: exactOwner && snapshot.authoritySource === "owner" };
}
const rank: Record<DisclosureLayer, number> = { User: 0, Moderator: 1, Administrator: 2 };
export function admitsLayer(disclosure: Disclosure, layer: DisclosureLayer): boolean {
  return rank[disclosure.layer] >= rank[layer];
}
