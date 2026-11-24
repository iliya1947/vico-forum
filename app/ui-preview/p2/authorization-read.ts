import {
  isPermissionKey, PERMISSION_CATALOG, type PermissionKey,
} from "../../authorization/catalog";
import { ownerAwareEffectivePermissions, isBoundOwner } from "../../authorization/owner";
import {
  InvalidAuthorizationInputError, AuthorizationNotFoundError,
} from "../../../db/authorization-error";
import type {
  AuthorizationCapability, AuthorizationManagementCapability, PermissionResolver,
} from "../../../db/authorization-service";
import type { UserAuthorization } from "../../../db/authorization-repository";
import type { PreviewRawBaseline, PreviewRoleId } from "./raw-baseline";

const builtInRoles = {
  user: { id: "builtin-user", slug: "user", displayName: "User", isSystem: true },
  moderator: { id: "builtin-moderator", slug: "moderator", displayName: "Moderator", isSystem: true },
  admin: { id: "builtin-admin", slug: "admin", displayName: "Administrator", isSystem: true },
} as const satisfies Record<PreviewRoleId, UserAuthorization["role"]>;

export class P2AuthorizationManagementNotConfiguredError extends Error {
  constructor(method: string) {
    super("P2 authorization management not configured: " + method);
    this.name = "P2AuthorizationManagementNotConfiguredError";
  }
}

/**
 * The original context accepts the full management capability. B8a provides
 * its read-only PermissionResolver alone, and rejects every unconfigured
 * management operation rather than fabricating a partial success.
 */
export function createP2AuthorizationReadCapability(
  baseline: PreviewRawBaseline, currentTransientUserId?: string,
): AuthorizationManagementCapability {
  function resolveUser(userId: string): UserAuthorization {
    const user = baseline.users.find((item) => item.identity.id === userId);
    if (!user && userId !== currentTransientUserId) {
      throw new AuthorizationNotFoundError("user does not exist");
    }
    const assignment = baseline.assignments.find((item) => item.userId === userId);
    const roleId = assignment?.roleId ?? "user";
    const role = baseline.roles.find((item) => item.id === roleId);
    if (!role) throw new AuthorizationNotFoundError("assigned role is missing");
    const grants = [...role.grants];
    const overrides: UserAuthorization["overrides"] = {};
    const effective = new Set<PermissionKey>(grants);
    for (const override of baseline.overrides) {
      if (override.userId !== userId) continue;
      if (override.effect === "inherit") continue;
      overrides[override.permission] = override.effect;
      if (override.effect === "deny") effective.delete(override.permission);
      else if (override.effect === "allow") effective.add(override.permission);
      else throw new Error("P2 invalid permission override effect");
    }
    const bound = isBoundOwner(userId, baseline.ownerUserId);
    return {
      role: { ...builtInRoles[roleId] },
      explicitAssignment: assignment !== undefined,
      grants,
      overrides,
      effectivePermissions: ownerAwareEffectivePermissions(userId, baseline.ownerUserId, effective),
      ...(bound ? { authoritySource: "owner" as const } : {}),
    };
  }

  const read: AuthorizationCapability = {
    forUser(userId: string): PermissionResolver {
      if (typeof userId !== "string" || userId.trim().length === 0) {
        throw new InvalidAuthorizationInputError("user id must not be blank");
      }
      // Production resolve() is consistent per handle; has() checks current
      // server-side authorization state on every call.
      let cached: Promise<UserAuthorization> | undefined;
      return {
        resolve() {
          cached ??= Promise.resolve().then(() => resolveUser(userId));
          return cached;
        },
        async has(permission: PermissionKey) {
          if (!isPermissionKey(permission)) {
            throw new InvalidAuthorizationInputError("permission must be a known catalog key");
          }
          if (!baseline.users.some((item) => item.identity.id === userId)
            && userId !== currentTransientUserId) return false;
          if (isBoundOwner(userId, baseline.ownerUserId)) {
            return PERMISSION_CATALOG.includes(permission);
          }
          const assignment = baseline.assignments.find((item) => item.userId === userId);
          const role = baseline.roles.find((item) => item.id === (assignment?.roleId ?? "user"));
          if (!role) throw new AuthorizationNotFoundError("assigned role is missing");
          const override = baseline.overrides.find((item) =>
            item.userId === userId && item.permission === permission);
          if (override?.effect === "deny") return false;
          if (override?.effect === "allow") return true;
          if (override && override.effect !== "inherit") {
            throw new Error("P2 invalid permission override effect");
          }
          return role.grants.includes(permission);
        },
      };
    },
  };

  return new Proxy(read as AuthorizationManagementCapability, {
    get(target, property, receiver) {
      if (property === "forUser") return Reflect.get(target, property, receiver);
      if (typeof property === "symbol") return Reflect.get(target, property, receiver);
      throw new P2AuthorizationManagementNotConfiguredError(property);
    },
  });
}
