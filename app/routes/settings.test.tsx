import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { authorizationContext, authorizationOwnerContext } from "../authorization/request-context";
import { loader as settingsLoader } from "./settings";
import { loader as forumLoader, action as registrationAction } from "./settings-forum";
import { registrationSettingsContext } from "../settings/request-context";
import { RegistrationSettingsConflictError, RegistrationSettingsForbiddenError } from "../../db/registration-settings";
import { RegistrationSettingsUnavailableError } from "../../db/hyperdrive-registration-settings";

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
  context.set(authorizationContext, state as never);
  const registration = {
    read: vi.fn(async () => ({
      googleRegistrationEnabled: true, emailRegistrationEnabled: true,
      version: 7, updatedAt: "2026-11-08T00:00:00.000Z",
    })),
    update: vi.fn(async (_actorId: string, input: {
      googleRegistrationEnabled: boolean; emailRegistrationEnabled: boolean; expectedVersion: number,
    }) => ({ ...input, version: input.expectedVersion + 1, updatedAt: "2026-11-08T00:00:00.000Z" })),
  };
  context.set(registrationSettingsContext, registration);
  return { context, state, registration };
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
      registration: { googleRegistrationEnabled: true, emailRegistrationEnabled: true, version: 7 },
    });
    expect(page.init?.headers).toEqual({ "Cache-Control": "private, no-store" });
    expect(actor.state.readManagementState).toHaveBeenCalledOnce();
    expect(actor.state.forUser).toHaveBeenCalledExactlyOnceWith("owner");
  });
});

describe("SET-02 Owner registration update HTTP guard", () => {
  const post = (fields: Record<string, string>, origin = "https://vico.test") => new Request(
    "https://vico.test/en/settings/forum", {
      method: "POST", headers: { Origin: origin, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields),
    },
  );

  it("denies guests and non-Owner managers before accessing the settings capability", async () => {
    for (const [actor, status] of [[environment(null), 401], [environment("manager"), 403]] as const) {
      await expect(registrationAction({ request: post({ expectedVersion: "7" }), context: actor.context }))
        .rejects.toMatchObject({ status });
      expect(actor.registration.update).not.toHaveBeenCalled();
    }
  });

  it("allows independently closing both methods with a precise CAS and never client-authoritative actor", async () => {
    const actor = environment();
    const response = await registrationAction({
      request: post({ expectedVersion: "7" }), context: actor.context,
    });
    expect(response.data).toEqual({ ok: true });
    expect(response.init?.headers).toEqual({ "Cache-Control": "private, no-store" });
    expect(actor.registration.update).toHaveBeenCalledExactlyOnceWith("owner", {
      expectedVersion: 7, googleRegistrationEnabled: false, emailRegistrationEnabled: false,
    });
    const second = await registrationAction({
      request: post({ expectedVersion: "8", googleRegistrationEnabled: "on" }), context: actor.context,
    });
    expect(second.data).toEqual({ ok: true });
    expect(actor.registration.update).toHaveBeenLastCalledWith("owner", {
      expectedVersion: 8, googleRegistrationEnabled: true, emailRegistrationEnabled: false,
    });
  });

  it.each([
    [{ expectedVersion: "7" }, "https://evil.test"],
    [{ expectedVersion: "7", userId: "owner" }, "https://vico.test"],
    [{ expectedVersion: "0" }, "https://vico.test"],
    [{ expectedVersion: "9999999999" }, "https://vico.test"],
    [{ expectedVersion: "7", googleRegistrationEnabled: "false" }, "https://vico.test"],
  ])("rejects forged origin or invalid form values before persistence", async (fields, origin) => {
    const actor = environment();
    const response = await registrationAction({ request: post(fields, origin), context: actor.context });
    expect(response.init?.status).toBe(origin === "https://vico.test" ? 400 : 403);
    expect(actor.registration.update).not.toHaveBeenCalled();
  });

  it("maps stale, forbidden and unavailable failures without leaking DB details", async () => {
    const errors = [
      [new RegistrationSettingsConflictError("secret"), 409, "conflict"],
      [new RegistrationSettingsForbiddenError("secret"), 403, "forbidden"],
      [new RegistrationSettingsUnavailableError("secret"), 503, "unavailable"],
    ] as const;
    for (const [error, status, code] of errors) {
      const actor = environment();
      actor.registration.update.mockRejectedValueOnce(error);
      const response = await registrationAction({
        request: post({ expectedVersion: "7", emailRegistrationEnabled: "on" }),
        context: actor.context,
      });
      expect(response.init?.status).toBe(status);
      expect(response.data).toEqual({ ok: false, error: code });
      expect(JSON.stringify(response.data)).not.toContain("secret");
    }
  });

  it("returns a safe 503 on unavailable Owner loader while unrelated invariant errors propagate", async () => {
    const actor = environment();
    actor.registration.read.mockRejectedValueOnce(new RegistrationSettingsUnavailableError());
    await expect(forumLoader({ params: { locale: "en" }, context: actor.context }))
      .rejects.toMatchObject({ status: 503 });
    actor.registration.read.mockRejectedValueOnce(new Error("unexpected schema"));
    await expect(forumLoader({ params: { locale: "en" }, context: actor.context }))
      .rejects.toThrow("unexpected schema");
  });
});
