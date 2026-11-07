import { PERMISSION_CATALOG, type PermissionKey } from "./catalog";

/** Only the server-provided, exact, nonblank user ID can bind Owner authority. */
export function validOwnerUserId(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 && value.trim() === value
    ? value : undefined;
}

export function isBoundOwner(userId: string, binding: unknown): boolean {
  const ownerId = validOwnerUserId(binding);
  return ownerId !== undefined && userId === ownerId;
}

/** Keep stored roles/grants/overrides unchanged; only effective authority differs. */
export function ownerAwareEffectivePermissions(
  userId: string,
  binding: unknown,
  rawPermissions: Iterable<PermissionKey>,
): PermissionKey[] {
  return isBoundOwner(userId, binding)
    ? [...PERMISSION_CATALOG].sort()
    : [...new Set(rawPermissions)].sort();
}
