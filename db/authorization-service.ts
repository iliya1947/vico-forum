import { isPermissionKey, PERMISSION_CATALOG, type PermissionKey } from "../app/authorization/catalog";
import { PostgresAuthorizationRepository, type OverrideEffect, type UserAuthorization } from "./authorization-repository";

export class InvalidAuthorizationInputError extends Error {}

export interface PermissionResolver {
  has(permission: PermissionKey): Promise<boolean>;
  resolve(): Promise<UserAuthorization>;
}

export interface AuthorizationCapability {
  forUser(userId: string): PermissionResolver;
}
export interface AuthorizationManagementCapability extends AuthorizationCapability {
  listRoles(): ReturnType<AuthorizationService["listRoles"]>;
  readRole(roleId: string): ReturnType<AuthorizationService["readRole"]>;
  listUsers(): ReturnType<AuthorizationService["listUsers"]>;
  resolveUser(userId: string): ReturnType<AuthorizationService["resolveUser"]>;
  readManagementState(): ReturnType<AuthorizationService["readManagementState"]>;
  createCustomRole(actorId: string, input: { slug: string; displayName: string }): ReturnType<AuthorizationService["createCustomRole"]>;
  renameCustomRole(actorId: string, roleId: string, input: { displayName: string }): ReturnType<AuthorizationService["renameCustomRole"]>;
  replaceRoleGrants(actorId: string, roleId: string, permissions: unknown): ReturnType<AuthorizationService["replaceRoleGrants"]>;
  deleteCustomRole(actorId: string, roleId: string): ReturnType<AuthorizationService["deleteCustomRole"]>;
  assignUserRole(actorId: string, userId: string, roleId: string): ReturnType<AuthorizationService["assignUserRole"]>;
  setUserOverride(actorId: string, userId: string, permission: unknown, effect: unknown): ReturnType<AuthorizationService["setUserOverride"]>;
}

export class AuthorizationService {
  constructor(private readonly repository: PostgresAuthorizationRepository) {}
  listRoles() { return this.repository.listRoles(); }
  listUsers() { return this.repository.listUsers(); }
  readManagementState() { return this.repository.readManagementState(); }
  readRole(roleId: string) { return this.repository.readRole(text(roleId, "role id")); }
  resolveUser(userId: string) { return this.repository.resolveUser(text(userId, "user id")); }

  createCustomRole(actorId: string, input: { slug: string; displayName: string }) {
    return this.repository.createCustomRole(text(actorId, "actor id"), {
      id: crypto.randomUUID(), slug: slug(input.slug), displayName: text(input.displayName, "display name"),
    });
  }
  renameCustomRole(actorId: string, roleId: string, input: { displayName: string }) {
    return this.repository.renameCustomRole(text(actorId, "actor id"), text(roleId, "role id"), {
      displayName: text(input.displayName, "display name"),
    });
  }
  replaceRoleGrants(actorId: string, roleId: string, permissions: unknown) {
    if (!Array.isArray(permissions) || !permissions.every(isPermissionKey)) invalid("permissions must be known catalog keys");
    return this.repository.replaceRoleGrants(text(actorId, "actor id"), text(roleId, "role id"), [...new Set(permissions)]);
  }
  deleteCustomRole(actorId: string, roleId: string) {
    return this.repository.deleteCustomRole(text(actorId, "actor id"), text(roleId, "role id"));
  }
  assignUserRole(actorId: string, userId: string, roleId: string) {
    return this.repository.assignUserRole(text(actorId, "actor id"), text(userId, "user id"), text(roleId, "role id"));
  }
  setUserOverride(actorId: string, userId: string, permission: unknown, effect: unknown) {
    if (!isPermissionKey(permission)) invalid("permission must be a known catalog key");
    if (effect !== "allow" && effect !== "deny" && effect !== null) invalid("override must be allow, deny, or null");
    return this.repository.setUserOverride(text(actorId, "actor id"), text(userId, "user id"), permission, effect as OverrideEffect | null);
  }
}

export function createAuthorizationCapability(repository: PostgresAuthorizationRepository): AuthorizationCapability {
  const cache = new Map<string, Promise<UserAuthorization>>();
  return { forUser(userId) {
    const validUserId = text(userId, "user id");
    const resolve = () => {
      let current = cache.get(validUserId);
      if (!current) { current = repository.resolveUser(validUserId); cache.set(validUserId, current); }
      return current;
    };
    return {
      resolve,
      async has(permission) {
        if (!PERMISSION_CATALOG.includes(permission)) invalid("permission must be a known catalog key");
        return repository.hasPermission(validUserId, permission);
      },
    };
  } };
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") invalid(`${field} must not be blank`);
  return value as string;
}
function slug(value: unknown): string {
  const result = text(value, "role slug");
  if (!/^[a-z][a-z0-9-]{0,62}$/.test(result)) invalid("role slug is invalid");
  return result;
}
function invalid(message: string): never { throw new InvalidAuthorizationInputError(message); }
