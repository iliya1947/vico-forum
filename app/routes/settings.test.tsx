import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { authorizationContext, authorizationOwnerContext } from "../authorization/request-context";
import { loader as settingsLoader } from "./settings";
import { loader as forumLoader } from "./settings-forum";

function environment(actorId: string | null = "owner", ownerBinding: unknown = "owner") {
  const context = new RouterContextProvider();
  context.set(authSessionContext, actorId ? {
    user: { id: actorId, email: `${actorId}@example.test`, name: actorId },
  } as AuthSession : null);
  context.set(authorizationOwnerContext, ownerBinding as string);
  const state = {
    forUser: vi.fn(() => ({
      has: vi.fn(async () => true),
      resolve: vi.fn(async () => ({
        effectivePermissions: ["access.authorization.manage"],
      })),
    })),
    readManagementState: vi.fn(async () => ({ roles: [], users: [] })),
  };
  context.set(authorizationContext, state as unknown as ReturnType<typeof context.get<typeof authorizationContext>>);
  return { context, state };
}

describe("SET-02 Settings route admission", () => {
  it("requires an authenticated session for both independently guarded routes", async () => {
    const { context } = environment(null);
    expect(() => settingsLoader({ params: { locale: "en" }, context }))
      .toThrow(expect.objectContaining({ status: 401 }));
    await expect(forumLoader({ params: { locale: "en" }, context }))
      .rejects.toMatchObject({ status: 401 });
  });

  it("renders a private Settings entrance without inventing non-Owner Forum authority", () => {
    const regular = environment("manager", "owner");
    const page = settingsLoader({ params: { locale: "ru" }, context: regular.context });
    expect(page.data).toEqual({ locale: "ru", canViewForum: false });
    expect(page.init?.headers).toEqual({ "Cache-Control": "private, no-store" });
    expect(regular.state.readManagementState).not.toHaveBeenCalled();
  });

  it("forbids non-Owner Forum reads even with existing authorization-management grant", async () => {
    const state = environment("manager", "owner");
    await expect(forumLoader({ params: { locale: "he" }, context: state.context }))
      .rejects.toMatchObject({ status: 403 });
    expect(state.state.readManagementState).not.toHaveBeenCalled();
  });

  it("fails closed on absent or malformed Owner binding", async () => {
    for (const binding of ["", " owner", "owner ", "other"]) {
      const actor = environment("owner", binding);
      await expect(forumLoader({ params: { locale: "en" }, context: actor.context }))
        .rejects.toMatchObject({ status: 403 });
    }
  });

  it("reuses the canonical management-state reader for the exact bound Owner", async () => {
    const actor = environment("owner", "owner");
    const page = await forumLoader({ params: { locale: "he" }, context: actor.context });
    expect(page.data).toMatchObject({
      locale: "he", roles: [], users: [], canMutateAuthorization: true, canManageElevated: true,
    });
    expect(page.init?.headers).toEqual({ "Cache-Control": "private, no-store" });
    expect(actor.state.readManagementState).toHaveBeenCalledOnce();
    expect(actor.state.forUser).toHaveBeenCalledExactlyOnceWith("owner");
  });
});
