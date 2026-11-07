import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { authorizationContext, authorizationOwnerContext } from "../authorization/request-context";
import { AuthorizationRoleAssignedError, AuthorizationRoleSlugConflictError } from "../../db/authorization-repository";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { action, loader } from "./authorization-admin";

const session = { user: { id: "manager", name: "Manager", email: "m@example.test" } } as AuthSession;
function capability(manage: boolean | Error = true) {
  return {
    forUser: () => ({
      has: vi.fn(async () => {
        if (manage instanceof Error) throw manage;
        return manage;
      }),
      resolve: vi.fn(async () => ({role:{id:"manager-role",slug:"custom-manager",displayName:"Manager",isSystem:false},explicitAssignment:true,grants:[],overrides:{},effectivePermissions: ["access.authorization.manage" as const]})),
    }),
    listRoles: vi.fn(async () => []), listUsers: vi.fn(async () => []), readRole: vi.fn(), resolveUser: vi.fn(),
    readManagementState: vi.fn(async () => ({ roles: [], users: [] })),
    readUserManagementState: vi.fn(),
    createCustomRole: vi.fn(), renameCustomRole: vi.fn(), replaceRoleGrants: vi.fn(), deleteCustomRole: vi.fn(),
    assignUserRole: vi.fn(), setUserOverride: vi.fn(),
  };
}
function context(authenticated = true, manage: boolean | Error = true) {
  const context = new RouterContextProvider(); const value = capability(manage);
  context.set(authSessionContext, authenticated ? session : null); context.set(authorizationContext, value);
  context.set(authorizationOwnerContext, "bound-owner");
  return { context, value };
}
function ownerContext() {
  const actor = context();
  actor.context.set(authorizationOwnerContext, "manager");
  return actor;
}
function request(fields: Record<string, string>, origin = "https://forum.example") {
  const form = new FormData(); Object.entries(fields).forEach(([key, value]) => form.set(key, value));
  return new Request("https://forum.example/en/admin/authorization", { method: "POST", headers: { Origin: origin }, body: form });
}
describe("authorization management route", () => {
  it("protects loader and action independently", async () => {
    await expect(loader({ params: { locale: "en" }, context: context(false).context })).rejects.toMatchObject({ status: 401 });
    await expect(action({ request: request({ intent: "deleteRole", roleId: "r" }), context: context(false).context })).rejects.toMatchObject({ status: 401 });
    await expect(loader({ params: { locale: "en" }, context: context(true, false).context })).rejects.toMatchObject({ status: 403 });
    await expect(action({ request: request({ intent: "deleteRole", roleId: "r" }), context: context(true, false).context })).rejects.toMatchObject({ status: 403 });
  });
  it("maps classified permission resolver outages to controlled 503 responses", async () => {
    const failure = new AuthorizationUnavailableError({ cause: new Error("database detail must not escape") });
    await expect(loader({ params: { locale: "en" }, context: context(true, failure).context })).rejects.toMatchObject({ status: 503 });
    await expect(action({ request: request({ intent: "deleteRole", roleId: "r" }), context: context(true, failure).context })).rejects.toMatchObject({ status: 503 });
  });
  it("does not mask unexpected permission resolver errors", async () => {
    const failure = new Error("unexpected permission resolver bug");
    await expect(loader({ params: { locale: "en" }, context: context(true, failure).context })).rejects.toBe(failure);
    await expect(action({ request: request({ intent: "deleteRole", roleId: "r" }), context: context(true, failure).context })).rejects.toBe(failure);
  });
  it("loads management state through one bulk capability operation", async () => {
    const state = context();
    const result = await loader({ params: { locale: "en" }, context: state.context });
    expect(result).toMatchObject({ locale: "en", roles: [], users: [] });
    expect(result.canManageElevated).toBe(false);
    expect(result.canMutateAuthorization).toBe(false);
    expect(state.value.readManagementState).toHaveBeenCalledOnce();
    expect(state.value.listRoles).not.toHaveBeenCalled();
    expect(state.value.listUsers).not.toHaveBeenCalled();
    expect(state.value.readRole).not.toHaveBeenCalled();
    expect(state.value.resolveUser).not.toHaveBeenCalled();
  });
  it("offers elevated operations only to the bound owner in route data",async()=>{
    const actor=context();
    expect((await loader({params:{locale:"en"},context:actor.context}))).toMatchObject({
      canManageElevated: false, canMutateAuthorization: false,
    });
    actor.context.set(authorizationOwnerContext,"manager");
    expect((await loader({params:{locale:"en"},context:actor.context}))).toMatchObject({
      canManageElevated: true, canMutateAuthorization: true,
    });
    for (const binding of [" manager", "manager ", "", "other-manager"]) {
      actor.context.set(authorizationOwnerContext,binding);
      expect((await loader({params:{locale:"en"},context:actor.context}))).toMatchObject({
        canManageElevated: false, canMutateAuthorization: false,
      });
    }
  });
  it("derives navigation from the same resolver handle as the independent management gate", async () => {
    const state=context();
    const resolver=state.value.forUser();
    resolver.resolve.mockResolvedValue({role:{id:"custom",slug:"different-label",displayName:"Custom",isSystem:false},explicitAssignment:true,grants:[],overrides:{},effectivePermissions:["access.authorization.manage"]});
    const forUser=vi.spyOn(state.value,"forUser").mockReturnValue(resolver);
    const result=await loader({params:{locale:"he"},context:state.context});
    expect(forUser).toHaveBeenCalledExactlyOnceWith("manager");
    expect(resolver.has).toHaveBeenCalledExactlyOnceWith("access.authorization.manage");
    expect(resolver.resolve).toHaveBeenCalledOnce();
    expect(result.access).toEqual({canEnter:true,canReadForum:false,canManageAuthorization:true});
  });

  it("keeps non-Owner reads but rejects all six direct write intents even with management permission", async () => {
    const state = context();
    const visible = await loader({ params: { locale: "en" }, context: state.context });
    expect(visible).toMatchObject({ canMutateAuthorization: false, roles: [], users: [] });
    const attempts: Record<string, string>[] = [
      { intent: "createRole", slug: "test", displayName: "Test" },
      { intent: "renameRole", roleId: "role", displayName: "Changed" },
      { intent: "roleGrants", roleId: "role" },
      { intent: "deleteRole", roleId: "role" },
      { intent: "assignRole", userId: "target", roleId: "role" },
      { intent: "override", userId: "target", permission: "forum.topic.pin", effect: "inherit" },
    ];
    for (const fields of attempts) {
      const response = await action({ request: request({ ...fields, actorId: "bound-owner" }), context: state.context });
      expect(response).toBeInstanceOf(Response);
      expect((response as Response).status).toBe(403);
      expect((response as Response).headers.get("Cache-Control")).toBe("private, no-store");
      expect(await (response as Response).json()).toEqual({ error: "forbidden" });
    }
    for (const mutate of ["createCustomRole", "renameCustomRole", "replaceRoleGrants",
      "deleteCustomRole", "assignUserRole", "setUserOverride"] as const) {
      expect(state.value[mutate]).not.toHaveBeenCalled();
    }
  });
  it("uses the session actor and ignores forged authorization fields", async () => {
    const state = ownerContext(); await action({ request: request({ intent: "assignRole", userId: "target", roleId: "role", actorId: "forged", permission: "access.authorization.manage" }), context: state.context });
    expect(state.value.assignUserRole).toHaveBeenCalledWith("manager", "target", "role");
  });
  it("maps duplicate role slugs to controlled invalid input", async () => {
    const state = ownerContext(); state.value.createCustomRole.mockRejectedValueOnce(new AuthorizationRoleSlugConflictError("database detail"));
    const response = await action({ request: request({ intent: "createRole", slug: "duplicate", displayName: "Duplicate" }), context: state.context });
    expect(response).toMatchObject({ status: 400 }); expect(await (response as Response).json()).toEqual({ error: "invalid" });
  });
  it("maps assigned-role deletion to a controlled private 409", async () => {
    const state = ownerContext(); state.value.deleteCustomRole.mockRejectedValueOnce(new AuthorizationRoleAssignedError("database detail"));
    const response = await action({ request: request({ intent: "deleteRole", roleId: "assigned-custom" }), context: state.context });
    expect(response).toMatchObject({ status: 409 });
    expect((response as Response).headers.get("cache-control")).toContain("private");
    expect((response as Response).headers.get("cache-control")).toContain("no-store");
    expect(await (response as Response).json()).toEqual({ error: "conflict" });
  });
  it("maps only classified management operation outages to unavailable", async () => {
    const loaderState = context();
    loaderState.value.readManagementState.mockRejectedValueOnce(new AuthorizationUnavailableError());
    await expect(loader({ params: { locale: "en" }, context: loaderState.context })).rejects.toMatchObject({ status: 503 });

    const loaderBug = context();
    const unexpectedRead = new Error("unexpected management read bug");
    loaderBug.value.readManagementState.mockRejectedValueOnce(unexpectedRead);
    await expect(loader({ params: { locale: "en" }, context: loaderBug.context })).rejects.toBe(unexpectedRead);

    const actionState = ownerContext();
    actionState.value.deleteCustomRole.mockRejectedValueOnce(new AuthorizationUnavailableError());
    const unavailable = await action({
      request: request({ intent: "deleteRole", roleId: "r" }),
      context: actionState.context,
    });
    expect(unavailable).toMatchObject({ status: 503 });
    expect(await (unavailable as Response).json()).toEqual({ error: "unavailable" });

    const actionBug = ownerContext();
    const unexpectedMutation = new Error("unexpected management mutation bug");
    actionBug.value.deleteCustomRole.mockRejectedValueOnce(unexpectedMutation);
    await expect(action({
      request: request({ intent: "deleteRole", roleId: "r" }),
      context: actionBug.context,
    })).rejects.toBe(unexpectedMutation);
  });

  it("reuses canonical user assignment and override writes without Users-read, with fresh management and origin guards", async () => {
    const managerOnly = ownerContext();
    const resolver = managerOnly.value.forUser();
    vi.spyOn(managerOnly.value, "forUser").mockReturnValue(resolver);
    expect(await action({ request: request({ intent: "assignRole", userId: "target", roleId: "builtin-admin" }),
      context: managerOnly.context })).toEqual({ ok: true });
    expect(await action({ request: request({ intent: "override", userId: "target",
      permission: "admin.users.read", effect: "allow" }), context: managerOnly.context })).toEqual({ ok: true });
    expect(resolver.has).toHaveBeenCalledTimes(2);
    expect(resolver.has).toHaveBeenCalledWith("access.authorization.manage");
    expect(managerOnly.value.assignUserRole).toHaveBeenCalledExactlyOnceWith("manager", "target", "builtin-admin");
    expect(managerOnly.value.setUserOverride).toHaveBeenCalledExactlyOnceWith("manager", "target", "admin.users.read", "allow");

    const readerOnly = context(true, false);
    await expect(action({ request: request({ intent: "override", userId: "target",
      permission: "admin.users.read", effect: "allow" }), context: readerOnly.context }))
      .rejects.toMatchObject({ status: 403 });
    expect(readerOnly.value.setUserOverride).not.toHaveBeenCalled();

    const wrongOrigin = ownerContext();
    const rejected = await action({ request: request({ intent: "assignRole", userId: "target",
      roleId: "builtin-admin" }, "https://other.test"), context: wrongOrigin.context });
    expect(rejected).toBeInstanceOf(Response);
    expect((rejected as Response).status).toBe(403);
    expect(wrongOrigin.value.assignUserRole).not.toHaveBeenCalled();

  });

});
