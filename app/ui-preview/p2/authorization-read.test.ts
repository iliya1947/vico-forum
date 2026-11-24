import { describe, expect, it } from "vitest";
import {
  isPermissionKey, PERMISSION_CATALOG, INITIAL_ROLE_GRANTS, type PermissionKey,
} from "../../authorization/catalog";
import { authorizationForRequest, authorizationOwnerContext } from "../../authorization/request-context";
import { authSessionForRequest } from "../../auth/request-context";
import { requireAdminAccess } from "../../admin/access.server";
import { loader as settingsAdministratorLoader } from "../../routes/settings-administrator";
import { InvalidAuthorizationInputError } from "../../../db/authorization-error";
import { AuthorizationNotFoundError } from "../../../db/authorization-repository";
import { createP2RawBaseline } from "./raw-baseline";
import { createP2AuthSessionFlow } from "./session-context";
import {
  createP2AuthorizationReadCapability, P2AuthorizationManagementNotConfiguredError,
} from "./authorization-read";

const origin = "https://vico.test";
const referenceTime = new Date("2026-11-24T10:00:00.000Z");
const baseline = () => createP2RawBaseline(referenceTime);
type Flow = ReturnType<typeof createP2AuthSessionFlow>;
async function contextFor(flow: Flow, extraHeaders?: HeadersInit) {
  const { context } = await flow.createRequestContext(
    new Request(origin + "/en/settings/administrator", { headers: extraHeaders }),
  );
  return context;
}
async function originalSettings(flow: Flow, extraHeaders?: HeadersInit) {
  return settingsAdministratorLoader({
    params: { locale: "en" }, context: await contextFor(flow, extraHeaders),
  });
}

describe("P2-B8a original AuthorizationCapability + production route admission", () => {
  it("projects original built-in User role, raw grants, explicit assignment and no Owner authority", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "member");
    const context = await contextFor(flow);
    const selected = authSessionForRequest(context)!;
    expect(selected.user.id).toBe(seed.actorIds.member);
    const access = authorizationForRequest(context).forUser(selected.user.id);
    const resolved = await access.resolve();
    expect(resolved).toEqual({
      role: { id: "builtin-user", slug: "user", displayName: "User", isSystem: true },
      explicitAssignment: true,
      grants: [...INITIAL_ROLE_GRANTS.user],
      overrides: {},
      effectivePermissions: [...INITIAL_ROLE_GRANTS.user].sort(),
    });
    expect(await access.has("forum.topic.create")).toBe(true);
    expect(await access.has("forum.topic.pin")).toBe(false);
    expect(await access.has("access.authorization.manage")).toBe(false);
    expect(context.get(authorizationOwnerContext)).toBe(seed.ownerUserId);
    expect(JSON.stringify(resolved)).not.toContain("credentialPassword");
  });

  it.each([
    ["moderator", "moderator", true, false],
    ["admin", "admin", true, true],
    ["owner", "user", true, true],
  ] as const)("preserves selected %s raw role while resolving effective privileges independently", async (actor, roleId, adminPanel, canManage) => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, actor);
    const context = await contextFor(flow);
    const resolver = authorizationForRequest(context).forUser(seed.actorIds[actor]);
    const auth = await resolver.resolve();
    expect(auth.role.slug).toBe(roleId);
    expect(auth.explicitAssignment).toBe(true);
    expect(await resolver.has("forum.topic.pin")).toBe(true);
    expect(await resolver.has("access.authorization.manage")).toBe(canManage);
    const entry = await requireAdminAccess(context);
    expect(entry.canEnter).toBe(adminPanel);
    expect(entry.actorId).toBe(seed.actorIds[actor]);
    if (actor === "owner") {
      expect(auth.role.slug).toBe("user");
      expect(auth.authoritySource).toBe("owner");
      expect(auth.grants).toEqual([...INITIAL_ROLE_GRANTS.user]);
      expect(auth.effectivePermissions).toEqual([...PERMISSION_CATALOG].sort());
    } else {
      expect(auth.authoritySource).toBeUndefined();
    }
  });

  it("original Administrator Settings loader rejects Guest, inactive, and ordinary User with private HTTP responses", async () => {
    for (const actor of ["guest", "inactive", "member"] as const) {
      const flow = createP2AuthSessionFlow(baseline(), actor);
      await expect(originalSettings(flow)).rejects.toMatchObject({
        status: actor === "member" ? 403 : 401,
      });
      await expect(requireAdminAccess(await contextFor(flow))).rejects.toMatchObject({
        status: actor === "member" ? 403 : 401,
      });
    }
  });

  it("original protected Administrator Settings loader admits moderator, Admin and exact Owner", async () => {
    for (const actor of ["moderator", "admin", "owner"] as const) {
      const seed = baseline();
      const flow = createP2AuthSessionFlow(seed, actor);
      const response = await originalSettings(flow);
      expect(response.data.accountId).toBe(seed.actorIds[actor]);
      expect(response.data.canViewForum).toBe(actor === "owner");
      expect(response.data.admin.length + Object.values(response.data.attention)
        .reduce((sum, value) => sum + value.length, 0)).toBeGreaterThan(0);
      expect(response.init?.headers).toMatchObject({ "Cache-Control": "private, no-store" });
    }
  });

  it("does not trust forged Owner cookies, headers, role claims or arbitrary forUser target to select current route actor", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "member");
    const context = await contextFor(flow, {
      Cookie: "better-auth.session_token=preview-session-owner",
      Authorization: "Bearer preview-session-owner",
      "X-Preview-Actor": "owner", "X-Role": "admin", "X-Owner-User-Id": seed.ownerUserId,
    });
    expect(authSessionForRequest(context)?.user.id).toBe(seed.actorIds.member);
    expect(await authorizationForRequest(context).forUser(seed.actorIds.member)
      .has("access.authorization.manage")).toBe(false);
    await expect(settingsAdministratorLoader({ params: { locale: "en" }, context }))
      .rejects.toMatchObject({ status: 403 });
    // forUser(target) is a neutral server capability, not a way to switch session actor.
    expect((await authorizationForRequest(context).forUser(seed.ownerUserId).resolve())
      .authoritySource).toBe("owner");
    await expect(requireAdminAccess(context)).rejects.toMatchObject({ status: 403 });
  });

  it("applies deny > allow > role grant with immutable original fixture source", async () => {
    const seed = baseline();
    const modified = {
      ...seed,
      overrides: [
        ...seed.overrides.filter((override) =>
          !(override.userId === seed.actorIds.member && override.permission === "forum.topic.pin")),
        { userId: seed.actorIds.member, permission: "forum.topic.create" as const, effect: "deny" as const },
        { userId: seed.actorIds.member, permission: "forum.topic.pin" as const, effect: "allow" as const },
        { userId: seed.actorIds.member, permission: "forum.reply.create" as const, effect: "inherit" as const },
      ],
    };
    const flow = createP2AuthSessionFlow(modified, "member");
    const resolver = authorizationForRequest(await contextFor(flow)).forUser(seed.actorIds.member);
    const resolved = await resolver.resolve();
    expect(resolved.grants).toContain("forum.topic.create");
    expect(resolved.overrides).toEqual({
      "forum.topic.create": "deny",
      "forum.topic.pin": "allow",
    });
    expect(resolved.effectivePermissions).not.toContain("forum.topic.create");
    expect(resolved.effectivePermissions).toContain("forum.topic.pin");
    expect(resolved.effectivePermissions).toContain("forum.reply.create");
    expect(await resolver.has("forum.topic.create")).toBe(false);
    expect(await resolver.has("forum.topic.pin")).toBe(true);
    expect(await requireAdminAccess(await contextFor(flow))).toMatchObject({
      actorId: seed.actorIds.member, canEnter: true, canReadForum: true,
    });
    expect(seed.overrides).toHaveLength(2);
    expect(seed.roles.find((role) => role.id === "user")?.grants).toEqual([...INITIAL_ROLE_GRANTS.user]);
  });

  it("does not let any stored deny or raw role reduce exact bound Owner effective authority", async () => {
    const seed = baseline();
    const modified = {
      ...seed,
      overrides: [
        ...seed.overrides,
        { userId: seed.ownerUserId, permission: "access.authorization.manage" as const, effect: "deny" as const },
        { userId: seed.ownerUserId, permission: "forum.topic.pin" as const, effect: "deny" as const },
      ],
    };
    const flow = createP2AuthSessionFlow(modified, "owner");
    const resolver = authorizationForRequest(await contextFor(flow)).forUser(seed.ownerUserId);
    const snapshot = await resolver.resolve();
    expect(snapshot.role.slug).toBe("user");
    expect(snapshot.grants).not.toContain("access.authorization.manage");
    expect(snapshot.overrides).toMatchObject({
      "access.authorization.manage": "deny", "forum.topic.pin": "deny",
    });
    expect(snapshot.effectivePermissions).toEqual([...PERMISSION_CATALOG].sort());
    expect(await resolver.has("access.authorization.manage")).toBe(true);
    expect(await resolver.has("forum.topic.pin")).toBe(true);
  });

  it("implements default User role for existing raw users without an explicit assignment", async () => {
    const seed = baseline();
    const modified = {
      ...seed, assignments: seed.assignments.filter((row) => row.userId !== seed.actorIds.member),
    };
    const flow = createP2AuthSessionFlow(modified, "member");
    const permission = authorizationForRequest(await contextFor(flow)).forUser(seed.actorIds.member);
    const value = await permission.resolve();
    expect(value.explicitAssignment).toBe(false);
    expect(value.role.id).toBe("builtin-user");
    expect(await permission.has("forum.reply.create")).toBe(true);
    expect(await permission.has("admin.history.read")).toBe(false);
  });

  it("keeps per-handle resolve() snapshot stable while has() uses current raw facts", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "member");
    const context = await contextFor(flow);
    const resolver = authorizationForRequest(context).forUser(seed.actorIds.member);
    const before = await resolver.resolve();
    expect(await resolver.resolve()).toBe(before);
    const role = seed.roles.find((item) => item.id === "user")!;
    (role.grants as PermissionKey[]).push("forum.topic.pin");
    expect(await resolver.has("forum.topic.pin")).toBe(true);
    expect(await resolver.resolve()).toBe(before);
    const subsequent = authorizationForRequest(await contextFor(flow)).forUser(seed.actorIds.member);
    expect((await subsequent.resolve()).effectivePermissions).toContain("forum.topic.pin");
    expect(before.effectivePermissions).not.toContain("forum.topic.pin");
  });

  it("fails loudly for unknown permission names, malformed user ID and unresolved accounts", async () => {
    const seed = baseline();
    const capability = createP2AuthorizationReadCapability(seed);
    expect(isPermissionKey("unknown.capability")).toBe(false);
    await expect(capability.forUser(seed.actorIds.member)
      .has("unknown.capability" as PermissionKey)).rejects.toBeInstanceOf(InvalidAuthorizationInputError);
    expect(() => capability.forUser("  ")).toThrow(InvalidAuthorizationInputError);
    await expect(capability.forUser("not-registered").resolve()).rejects
      .toBeInstanceOf(AuthorizationNotFoundError);
    expect(await capability.forUser("not-registered").has("forum.topic.create")).toBe(false);
  });

  it("does not fabricate success or management state for unconfigured authorization writers", async () => {
    const capability = createP2AuthorizationReadCapability(baseline());
    for (const method of ["readManagementState", "listRoles", "createCustomRole", "assignUserRole",
      "replaceRoleGrants", "setUserOverride", "readUserManagementState", "deleteCustomRole"]) {
      expect(() => Reflect.get(capability, method))
        .toThrow(P2AuthorizationManagementNotConfiguredError);
    }
  });

  it("new fixture email registration receives default User permissions without changing raw role assignments", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "guest");
    const signUp = new Request(origin + "/api/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({
        name: "Preview newcomer", email: "b8a-authorization@preview.invalid",
        password: "Preview-New-Authz-2026!",
      }),
    });
    expect((await flow.runtime.handle(signUp)).status).toBe(200);
    const context = await contextFor(flow);
    const id = authSessionForRequest(context)!.user.id;
    expect(id).toBe("preview-registered-1");
    const authorization = authorizationForRequest(context).forUser(id);
    const resolved = await authorization.resolve();
    expect(resolved.role.slug).toBe("user");
    expect(resolved.explicitAssignment).toBe(false);
    expect(resolved.authoritySource).toBeUndefined();
    expect(await authorization.has("forum.reply.create")).toBe(true);
    expect(await authorization.has("admin.users.read")).toBe(false);
    await expect(originalSettings(flow)).rejects.toMatchObject({ status: 403 });
    expect(seed.assignments.some((row) => row.userId === id)).toBe(false);
  });

  it("new transient Google user also receives normal User grants without inheriting selected Owner authority", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "guest", "new-account");
    const start = await flow.runtime.handle(new Request(origin + "/api/auth/sign-in/social", {
      method: "POST", headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({
        provider: "google", disableRedirect: true, callbackURL: "/en/settings/administrator",
      }),
    }));
    const { url } = await start.json() as {url:string};
    expect((await flow.runtime.handle(new Request(url))).status).toBe(302);
    const context = await contextFor(flow);
    const id = authSessionForRequest(context)!.user.id;
    expect(id).toBe("preview-google-registered");
    const data = await authorizationForRequest(context).forUser(id).resolve();
    expect(data.role.slug).toBe("user");
    expect(data.authoritySource).toBeUndefined();
    expect(data.effectivePermissions).not.toContain("access.authorization.manage");
    expect(await authorizationForRequest(context).forUser(id).has("forum.complaint.create")).toBe(true);
    await expect(originalSettings(flow)).rejects.toMatchObject({ status: 403 });
  });

  it("does not treat an inactive raw user's stored grants as an authenticated route authority", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "inactive");
    const context = await contextFor(flow);
    expect(authSessionForRequest(context)).toBeNull();
    await expect(requireAdminAccess(context)).rejects.toMatchObject({ status: 401 });
    await expect(settingsAdministratorLoader({params:{locale:"en"},context}))
      .rejects.toMatchObject({status:401});
    // Repository target-user resolution may still return stored raw grants for
    // admin inspection, but it is not an active session or mutation admission.
    const raw = await authorizationForRequest(context).forUser(seed.actorIds.inactive).resolve();
    expect(raw.role.slug).toBe("user");
    expect(raw.authoritySource).toBeUndefined();
  });

  it("missing/unknown role assignments fail rather than silently grant default permissions", async () => {
    const seed = baseline();
    const modified = {
      ...seed, roles: seed.roles.filter((role) => role.id !== "moderator"),
    };
    const capability = createP2AuthorizationReadCapability(modified);
    await expect(capability.forUser(seed.actorIds.moderator).resolve())
      .rejects.toBeInstanceOf(AuthorizationNotFoundError);
    await expect(capability.forUser(seed.actorIds.moderator).has("forum.topic.pin"))
      .rejects.toBeInstanceOf(AuthorizationNotFoundError);
  });
});
