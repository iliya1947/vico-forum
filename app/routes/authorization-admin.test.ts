import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { AuthorizationLockoutError, AuthorizationRoleSlugConflictError } from "../../db/authorization-repository";
import { action, loader } from "./authorization-admin";

const session = { user: { id: "manager", name: "Manager", email: "m@example.test" } } as AuthSession;
function capability(manage: boolean | Error = true) {
  return {
    forUser: () => ({
      has: vi.fn(async () => {
        if (manage instanceof Error) throw manage;
        return manage;
      }),
      resolve: vi.fn(),
    }),
    listRoles: vi.fn(async () => []), listUsers: vi.fn(async () => []), readRole: vi.fn(), resolveUser: vi.fn(),
    readManagementState: vi.fn(async () => ({ roles: [], users: [] })),
    createCustomRole: vi.fn(), renameCustomRole: vi.fn(), replaceRoleGrants: vi.fn(), deleteCustomRole: vi.fn(),
    assignUserRole: vi.fn(), setUserOverride: vi.fn(),
  };
}
function context(authenticated = true, manage: boolean | Error = true) {
  const context = new RouterContextProvider(); const value = capability(manage);
  context.set(authSessionContext, authenticated ? session : null); context.set(authorizationContext, value);
  return { context, value };
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
  it("maps permission resolver infrastructure failures to controlled 503 responses", async () => {
    const failure = new Error("database detail must not escape");
    await expect(loader({ params: { locale: "en" }, context: context(true, failure).context })).rejects.toMatchObject({ status: 503 });
    await expect(action({ request: request({ intent: "deleteRole", roleId: "r" }), context: context(true, failure).context })).rejects.toMatchObject({ status: 503 });
  });
  it("loads management state through one bulk capability operation", async () => {
    const state = context();
    const result = await loader({ params: { locale: "en" }, context: state.context });
    expect(result).toMatchObject({ locale: "en", roles: [], users: [] });
    expect(state.value.readManagementState).toHaveBeenCalledOnce();
    expect(state.value.listRoles).not.toHaveBeenCalled();
    expect(state.value.listUsers).not.toHaveBeenCalled();
    expect(state.value.readRole).not.toHaveBeenCalled();
    expect(state.value.resolveUser).not.toHaveBeenCalled();
  });
  it("uses the session actor and ignores forged authorization fields", async () => {
    const state = context(); await action({ request: request({ intent: "assignRole", userId: "target", roleId: "role", actorId: "forged", permission: "access.authorization.manage" }), context: state.context });
    expect(state.value.assignUserRole).toHaveBeenCalledWith("manager", "target", "role");
  });
  it("maps duplicate role slugs to controlled invalid input", async () => {
    const state = context(); state.value.createCustomRole.mockRejectedValueOnce(new AuthorizationRoleSlugConflictError("database detail"));
    const response = await action({ request: request({ intent: "createRole", slug: "duplicate", displayName: "Duplicate" }), context: state.context });
    expect(response).toMatchObject({ status: 400 }); expect(await (response as Response).json()).toEqual({ error: "invalid" });
  });
  it("maps atomic lockout protection to a controlled 409", async () => {
    const state = context(); state.value.replaceRoleGrants.mockRejectedValueOnce(new AuthorizationLockoutError("database detail"));
    const response = await action({ request: request({ intent: "roleGrants", roleId: "admin" }), context: state.context });
    expect(response).toMatchObject({ status: 409 }); expect(await (response as Response).json()).toEqual({ error: "conflict" });
  });
});
