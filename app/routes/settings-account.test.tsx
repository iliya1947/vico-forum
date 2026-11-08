import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterContextProvider, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeaderAuthProvider } from "../auth/auth-controls";
import {
  AccountSecurityError, authRuntimeContext, authSessionContext,
  type AuthRuntime, type AuthSession,
} from "../auth/request-context";
import { authorizationOwnerContext } from "../authorization/request-context";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { russianCommonValues, hebrewCommonValues } from "../localization/manual-values";
import SettingsAccountRoute, { action, headers, loader } from "./settings-account";
import routes from "../routes";

const session = {
  user: { id: "member-a", name: "Member A" },
  session: { id: "current-session", userId: "member-a" },
} as AuthSession;

const snapshot = {
  linkedMethods: ["password"] as ("password" | "google")[],
  hasPassword: true,
  sessionAccess: "ready" as const,
  sessions: [
    { id: "current-session", current: true, createdAt: "2026-11-08T08:00:00.000Z",
      expiresAt: "2026-11-15T08:00:00.000Z", deviceLabel: "Current browser" },
    { id: "other-session", current: false, createdAt: "2026-11-07T08:00:00.000Z",
      expiresAt: "2026-11-14T08:00:00.000Z", deviceLabel: "Other browser" },
  ],
};
const security = {
  read: vi.fn(),
  changePassword: vi.fn(),
  revokeOneOther: vi.fn(),
  revokeAllOthers: vi.fn(),
};
function context(current: AuthSession | null = session) {
  const ctx = new RouterContextProvider();
  ctx.set(authSessionContext, current);
  ctx.set(authRuntimeContext, {
    getSession: vi.fn(), handle: vi.fn(), security,
  } satisfies AuthRuntime);
  ctx.set(authorizationOwnerContext, undefined);
  return ctx;
}
function formRequest(intent: string, fields: Record<string, string> = {}, origin = "https://vico.test") {
  const body = new FormData();
  body.set("intent", intent);
  body.set("expectedUserId", "member-a");
  body.set("expectedSessionId", "current-session");
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  return new Request("https://vico.test/en/settings/account", {
    method: "POST", headers: { Origin: origin }, body,
  });
}
function callAction(request: Request, ctx = context()) {
  return action({ request, params: { locale: "en" }, context: ctx });
}
function localizedResources(locale: "en" | "ru" | "he"): Record<string, string> {
  const english = Object.fromEntries(Object.entries(canonicalEnglishCatalog.common)
    .map(([key, value]) => [key, value.source]));
  const values: Record<string, unknown> =
    locale === "ru" ? russianCommonValues : locale === "he" ? hebrewCommonValues : english;
  return Object.fromEntries(Object.entries(values).flatMap(([key, value]) =>
    typeof value === "string" ? [[key, value]]
      : Object.entries(value as Record<string, string>)
        .map(([name, text]) => [`${key}_${name}`, text])));
}
function showAccount(locale: "en" | "ru" | "he" = "en",
  overrides: Partial<typeof snapshot> = {}, headerId = "member-a") {
  const i18n = createInstance();
  void i18n.init({
    lng: locale, initAsync: false, defaultNS: "common",
    resources: { en: { common: localizedResources("en") }, [locale]: { common: localizedResources(locale) } },
  });
  const state = {
    locale, accountId: "member-a", sessionId: "current-session", canViewForum: false,
    ...snapshot, ...overrides,
  };
  const router = createMemoryRouter([{
    path: "/:locale/settings/account",
    loader: () => state,
    Component: SettingsAccountRoute,
  }], { initialEntries: [`/${locale}/settings/account`] });
  const page = render(<I18nextProvider i18n={i18n}>
    <HeaderAuthProvider initialUser={{ id: headerId, name: "Authenticated member" }}>
      <RouterProvider router={router} />
    </HeaderAuthProvider>
  </I18nextProvider>);
  return { page, router };
}
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  security.read.mockResolvedValue(snapshot);
  security.changePassword.mockResolvedValue(undefined);
  security.revokeOneOther.mockResolvedValue(undefined);
  security.revokeAllOthers.mockResolvedValue(undefined);
});
security.read.mockResolvedValue(snapshot);
security.changePassword.mockResolvedValue(undefined);
security.revokeOneOther.mockResolvedValue(undefined);
security.revokeAllOthers.mockResolvedValue(undefined);

describe("SET-05 account route independent auth and private response", () => {
  it("registers only the authenticated Account settings route and keeps no-store headers", async () => {
    const paths = routes.find(route => route.path === ":locale")?.children?.map(child => child.path);
    expect(paths).toContain("settings/account");
    expect(headers()["Cache-Control"]).toBe("private, no-store");
    await expect(loader({ request: new Request("https://vico.test/en/settings/account"),
      params: { locale: "en" }, context: context(null) })).rejects.toMatchObject({ status: 401 });
    const request = new Request("https://vico.test/en/settings/account", { headers: { Cookie: "test-cookie" } });
    const result = await loader({ request, params: { locale: "en" }, context: context() });
    expect(result.data).toMatchObject({ accountId: "member-a", sessionId: "current-session",
      hasPassword: true, linkedMethods: ["password"], sessionAccess: "ready" });
    expect(new Headers(result.init?.headers).get("Cache-Control")).toBe("private, no-store");
    expect(security.read).toHaveBeenCalledExactlyOnceWith(request.headers,
      { userId: "member-a", sessionId: "current-session" });
    expect(JSON.stringify(result.data)).not.toContain("test-cookie");
  });

  it("classifies only known storage/session failures; leaves unexpected errors visible for investigation", async () => {
    security.read.mockRejectedValueOnce(new AccountSecurityError("unavailable"));
    await expect(loader({ request: new Request("https://vico.test/en/settings/account"),
      params: { locale: "en" }, context: context() })).rejects.toMatchObject({
        status: 503, headers: expect.any(Headers),
      });
    security.read.mockRejectedValueOnce(new AccountSecurityError("account-changed"));
    await expect(loader({ request: new Request("https://vico.test/en/settings/account"),
      params: { locale: "en" }, context: context() })).rejects.toMatchObject({ status: 401 });
    const defect = new Error("unexpected adapter defect");
    security.read.mockRejectedValueOnce(defect);
    await expect(loader({ request: new Request("https://vico.test/en/settings/account"),
      params: { locale: "en" }, context: context() })).rejects.toBe(defect);
  });

  it("denies guests, cross-origin, stale-account/session and unrecognized fields before writes", async () => {
    await expect(callAction(formRequest("revoke-others"), context(null))).rejects.toMatchObject({ status: 401 });
    const foreign = await callAction(formRequest("revoke-others", {}, "https://evil.test"));
    expect(foreign.data).toEqual({ error: "origin" });
    expect(new Headers(foreign.init?.headers).get("Cache-Control")).toBe("private, no-store");
    const stale = await callAction(formRequest("revoke-others", { expectedUserId: "user-b" }));
    expect(stale.data).toEqual({ error: "account-changed" });
    expect(stale.init?.status).toBe(409);
    const staleSession = await callAction(formRequest("revoke-others", { expectedSessionId: "previous" }));
    expect(staleSession.init?.status).toBe(409);
    const forged = await callAction(formRequest("revoke-others", { targetUserId: "user-b" }));
    expect(forged.data).toEqual({ error: "invalid" });
    const duplicate = formRequest("revoke-others");
    const duplicateData = await duplicate.formData();
    duplicateData.append("expectedUserId", "member-a");
    const repeated = await callAction(new Request(duplicate.url, {
      method: "POST", headers: { Origin: "https://vico.test" }, body: duplicateData,
    }));
    expect(repeated.data).toEqual({ error: "invalid" });
    expect(security.revokeAllOthers).not.toHaveBeenCalled();
  });

  it("accepts only exact password and session commands, with no credential reflections", async () => {
    const invalid = await callAction(formRequest("change-password", {
      currentPassword: "original-secret", newPassword: "short",
    }));
    expect(invalid.data).toEqual({ error: "invalid" });
    expect(security.changePassword).not.toHaveBeenCalled();
    const password = await callAction(formRequest("change-password", {
      currentPassword: "original-secret", newPassword: "new-secret-password",
    }));
    expect(password.data).toEqual({ saved: "change-password" });
    expect(JSON.stringify(password.data)).not.toMatch(/original-secret|new-secret-password/);
    expect(security.changePassword).toHaveBeenCalledExactlyOnceWith(
      expect.any(Headers), { userId: "member-a", sessionId: "current-session" },
      "original-secret", "new-secret-password");
    const one = await callAction(formRequest("revoke-one", { sessionId: "other-session" }));
    expect(one.data).toEqual({ saved: "revoke-one" });
    expect(security.revokeOneOther).toHaveBeenCalledExactlyOnceWith(
      expect.any(Headers), { userId: "member-a", sessionId: "current-session" }, "other-session");
    const others = await callAction(formRequest("revoke-others"));
    expect(others.data).toEqual({ saved: "revoke-others" });
    expect(security.revokeAllOthers).toHaveBeenCalledExactlyOnceWith(
      expect.any(Headers), { userId: "member-a", sessionId: "current-session" });
  });

  it.each([
    ["invalid-password", 400], ["no-password", 409], ["not-fresh", 403],
    ["session-not-found", 409], ["current-session", 409], ["unavailable", 503],
  ] as const)("maps a classified %s to private %i", async (code, status) => {
    security.changePassword.mockRejectedValueOnce(new AccountSecurityError(code));
    const result = await callAction(formRequest("change-password", {
      currentPassword: "old-password", newPassword: "new-password-123",
    }));
    expect(result.data).toEqual({ error: code });
    expect(result.init?.status).toBe(status);
    expect(new Headers(result.init?.headers).get("Cache-Control")).toBe("private, no-store");
  });
});

describe("SET-05 localized Settings presentation and existing Google linking", () => {
  it.each(["en", "ru", "he"] as const)("renders current/other sessions and native forms in %s", async locale => {
    const { page, router } = showAccount(locale);
    await waitFor(() => expect(page.container.querySelector(".settings-account-sessions li")).not.toBeNull());
    expect(page.container.querySelectorAll(".settings-account-sessions li")).toHaveLength(2);
    expect(page.container.querySelectorAll("main")).toHaveLength(1);
    expect(page.container.querySelectorAll(".settings-panel-pending-item")).toHaveLength(1);
    expect(page.container.querySelector(".settings-panel-nav [aria-current='page']"))
      .toHaveAttribute("href", `/${locale}/settings/account`);
    const form = page.container.querySelector<HTMLFormElement>(".settings-account-form")!;
    expect(form.querySelector('input[name="currentPassword"]')).toHaveAttribute("type", "password");
    expect(form.querySelector('input[name="newPassword"]')).toHaveAttribute("autocomplete", "new-password");
    const otherForm = page.container.querySelector<HTMLFormElement>(".settings-account-revoke-form")!;
    expect(otherForm.querySelector('input[name="sessionId"]')).toHaveValue("other-session");
    expect(page.container.querySelectorAll('input[value="current-session"][name="sessionId"]')).toHaveLength(0);
    expect(page.container.querySelectorAll('input[name="token"]')).toHaveLength(0);
    expect(page.container.textContent).not.toContain("session_token");
    expect(page.container.querySelectorAll(".settings-account-revoke-all")).toHaveLength(1);
    expect(page.container.querySelector(".settings-account-session-info bdi")).toHaveAttribute("dir", "auto");
    page.unmount();router.dispose();
  });

  it("does not show password controls on Google-only, and does not offer duplicate Google linking", async () => {
    const { page, router } = showAccount("en", { linkedMethods: ["google"], hasPassword: false });
    await screen.findByText("Google");
    expect(page.container.querySelector(".settings-account-form")).toBeNull();
    expect(screen.queryByRole("button", { name: "Connect Google" })).not.toBeInTheDocument();
    expect(screen.getByText(/no password credential/i)).toBeVisible();
    page.unmount();router.dispose();
  });

  it("reuses the explicit link component for a credential account and never exposes it on a stale header", async () => {
    const fresh = showAccount();
    await screen.findByRole("button", { name: "Connect Google" });
    fresh.page.unmount();fresh.router.dispose();
    const stale = showAccount("en", {}, "member-b");
    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: "Connect Google" })).not.toBeInTheDocument();
    expect(stale.page.container.querySelectorAll(".settings-account-sessions li")).toHaveLength(0);
    expect(stale.page.container.querySelector(".settings-account-form")).toBeNull();
    stale.page.unmount();stale.router.dispose();
  });

  it("renders the safe fresh-session reauthentication hint without accidental session revoke", async () => {
    const { page, router } = showAccount("en", {
      sessionAccess: "not-fresh", sessions: [],
    });
    await screen.findByText(/sign out and sign in again/i);
    expect(page.container.querySelector(".settings-account-revoke-form")).toBeNull();
    expect(page.container.querySelector(".settings-account-revoke-all")).toBeNull();
    page.unmount();router.dispose();
  });
});
