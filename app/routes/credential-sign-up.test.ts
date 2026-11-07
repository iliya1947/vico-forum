import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { registrationSettingsContext } from "../settings/request-context";
import { RegistrationSettingsUnavailableError } from "../../db/hyperdrive-registration-settings";
import { loader } from "./credential-sign-up";
import { loader as signInLoader } from "./credential-sign-in";

function context(user: string | null = null) {
  const instance = new RouterContextProvider();
  instance.set(authSessionContext, user ? { user: { id: user } } as AuthSession : null);
  const read = vi.fn(async () => ({
    googleRegistrationEnabled: false, emailRegistrationEnabled: true,
    version: 19, updatedAt: "2026-11-08T00:00:00.000Z",
  }));
  instance.set(registrationSettingsContext, { read, update: vi.fn() });
  return { instance, read };
}
const page = (path: string, context: RouterContextProvider) =>
  loader({ request: new Request(`https://vico.test${path}`), params: { locale: "en" }, context });

describe("SET-02 public sign-up loader", () => {
  it("reveals only two registration flags, never Owner metadata or history", async () => {
    const ctx = context();
    const result = await page("/en/sign-up?returnTo=%2Fen%2Ftopics%2Fone", ctx.instance);
    expect(result.data).toEqual({
      locale: "en", returnTo: "/en/topics/one",
      registrationFlags: { googleRegistrationEnabled: false, emailRegistrationEnabled: true },
      callbackError: null,
    });
    expect(JSON.stringify(result.data)).not.toContain("version");
    expect(result.init?.headers).toEqual({ "Cache-Control": "no-store" });
    expect(ctx.read).toHaveBeenCalledOnce();
  });
  it("keeps existing signed-in users out of signup without querying registration flags", async () => {
    const ctx = context("member");
    await expect(page("/en/sign-up", ctx.instance)).rejects.toMatchObject({ status: 302 });
    expect(ctx.read).not.toHaveBeenCalled();
  });
  it("only accepts known error codes and never leaks error_description or external returnTo", async () => {
    const ctx = context();
    const result = await page("/en/sign-up?error=vico_google_registration_closed&error_description=SECRET&returnTo=https%3A%2F%2Fevil.test", ctx.instance);
    expect(result.data).toMatchObject({ returnTo: "/en", callbackError: "google-closed" });
    expect(JSON.stringify(result.data)).not.toContain("SECRET");
    const unknown = await page("/en/sign-up?error=internal-provider-secret", ctx.instance);
    expect(unknown.data.callbackError).toBe("authentication");
    expect(JSON.stringify(unknown.data)).not.toContain("internal-provider-secret");
  });
  it("disables both presentation options on classified PG outage without allowing registration", async () => {
    const ctx = context();
    ctx.read.mockRejectedValueOnce(new RegistrationSettingsUnavailableError("private sql"));
    const result = await page("/en/sign-up", ctx.instance);
    expect(result.data.registrationFlags).toEqual({
      googleRegistrationEnabled: false, emailRegistrationEnabled: false,
    });
    expect(JSON.stringify(result.data)).not.toContain("private sql");
  });
  it("does not conceal unexpected missing-row or programming errors", async () => {
    const ctx = context();
    ctx.read.mockRejectedValueOnce(new Error("missing singleton"));
    await expect(page("/en/sign-up", ctx.instance)).rejects.toThrow("missing singleton");
  });
});

describe("SET-02 Google sign-in callback error presentation", () => {
  it("shows only generic feedback, ignores provider error_description and retains safe returnTo", () => {
    const ctx = context();
    const response = signInLoader({
      request: new Request("https://vico.test/en/sign-in?returnTo=%2Fen%2Ftopics%2Fone&error=internal-token&error_description=PRIVATE"),
      params: { locale: "en" }, context: ctx.instance,
    });
    expect(response).toEqual({
      locale: "en", returnTo: "/en/topics/one", callbackError: "authentication",
    });
    expect(JSON.stringify(response)).not.toContain("PRIVATE");
    expect(JSON.stringify(response)).not.toContain("internal-token");
    expect(ctx.read).not.toHaveBeenCalled();
  });
});
