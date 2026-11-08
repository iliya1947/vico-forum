import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterContextProvider, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { authorizationContext, authorizationOwnerContext } from "../authorization/request-context";
import type { PermissionKey } from "../authorization/catalog";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { administratorPreferenceKey, readAdministratorPreferences } from "../settings/administrator-preferences";
import { allowedAttentionEntries } from "../settings/workspace-access";
import SettingsAdministratorRoute, { loader } from "./settings-administrator";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

function environment(actorId: string | null, keys: Set<PermissionKey>) {
  const context = new RouterContextProvider();
  context.set(authSessionContext, actorId ? {
    user: { id: actorId, name: actorId, email: actorId + "@test.invalid" },
  } as AuthSession : null);
  context.set(authorizationOwnerContext, "owner");
  const has = vi.fn(async (key: PermissionKey) => keys.has(key));
  const forUser = vi.fn(() => ({ has }));
  context.set(authorizationContext, { forUser } as never);
  return { context, has, forUser };
}

describe("SET-04 independently guarded administrator route", () => {
  it("rejects guests without any settings/local-storage access", async () => {
    const { context, forUser } = environment(null, new Set());
    await expect(loader({ params: { locale: "en" }, context }))
      .rejects.toMatchObject({ status: 401 });
    expect(forUser).not.toHaveBeenCalled();
  });

  it("requires current effective Admin or Attention access, not a role name or stored preference", async () => {
    const grants = new Set<PermissionKey>(["access.authorization.manage"]);
    const env = environment("manager", grants);
    const allowed = await loader({ params: { locale: "he" }, context: env.context });
    expect(allowed.data).toMatchObject({ locale: "he", accountId: "manager", canViewForum: false });
    expect(allowed.data.admin).toEqual(["overview", "roles"]);
    expect(allowed.data.attention).toEqual({ signals: [], complaints: [], security: [] });
    expect(new Headers(allowed.init?.headers).get("cache-control")).toBe("private, no-store");
    grants.clear(); // fresh next-request revoke, independent of any client preference
    await expect(loader({ params: { locale: "he" }, context: env.context }))
      .rejects.toMatchObject({ status: 403 });
    expect(env.forUser).toHaveBeenCalledWith("manager");
  });

  it("allows an Attention-only appeals reviewer while forbidding Admin entry", async () => {
    const env = environment("reviewer", new Set(["forum.complaint.appeal.review"]));
    const result = await loader({ params: { locale: "ru" }, context: env.context });
    expect(result.data.admin).toEqual([]);
    expect(result.data.attention).toEqual({
      signals: [], complaints: ["group2"], security: [],
    });
  });

  it("does not treat basic signed-in status as administrator authority", async () => {
    const env = environment("member", new Set());
    await expect(loader({ params: { locale: "en" }, context: env.context }))
      .rejects.toMatchObject({ status: 403 });
  });
});

function i18n() {
  const english = Object.fromEntries(Object.entries(canonicalEnglishCatalog.common)
    .map(([key, descriptor]) => [key, descriptor.source]));
  return createTranslationRuntime({
    locale: {
      translationLocale: "en", fallbackLocales: [], direction: "ltr",
      formatting: { locale: "en", timeZone: "UTC" },
      nativeName: "English", presentationMetadata: {},
    },
    fallbackLocales: [],
    resourcesByLocale: { en: { common: english } },
    bundleVersions: { en: { common: "test" } },
    staleKeys: {},
  });
}

describe("SET-04 real Settings surface", () => {
  it("updates real local controls and links using current allowed destination IDs", async () => {
    const attention = allowedAttentionEntries({
      canViewSignals: false, canReadSecurity: false,
      canReviewComplaints: false, canReviewAppeals: true,
      canManageComplaintPriorities: false,
    });
    const router = createMemoryRouter([{
      path: "/:locale/settings/administrator",
      loader: () => ({
        locale: "en", accountId: "alice", canViewForum: false,
        admin: ["overview", "roles"] as const, attention,
      }),
      Component: SettingsAdministratorRoute,
    }], { initialEntries: ["/en/settings/administrator"] });
    const view = render(<I18nextProvider i18n={i18n()}>
      <HeaderAuthProvider initialUser={{
        id: "alice", name: "Alice", canViewAdminPanel: true,
        adminEntryDestinations: ["overview", "roles"], attentionEntryGroups: attention,
      }}>
        <RouterProvider router={router} />
      </HeaderAuthProvider>
    </I18nextProvider>);
    const density = await screen.findByRole("combobox", { name: "Density" });
    expect(screen.getByRole("heading", { name: "Administrator preferences" })).toBeVisible();
    await userEvent.selectOptions(density, "compact");
    await waitFor(() => expect(readAdministratorPreferences("alice").density).toBe("compact"));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Default Admin section" }), "roles");
    expect(screen.getByRole("link", { name: "Open Admin workspace" }))
      .toHaveAttribute("href", "/en/admin/authorization");
    expect(screen.getByRole("link", { name: "Open Needs attention" }))
      .toHaveAttribute("href", "/en/attention?mode=complaints&group=group2");
    await userEvent.click(screen.getByRole("checkbox", {
      name: "Expand secondary technical details by default",
    }));
    expect(readAdministratorPreferences("alice").technicalDetailsExpanded).toBe(true);
    expect(JSON.parse(localStorage.getItem(administratorPreferenceKey("alice"))!)
      .adminDefault).toBe("roles");
    expect(view.container.querySelector(".settings-panel-nav a[aria-current='page']"))
      .toHaveAttribute("href", "/en/settings/administrator");
    view.unmount(); router.dispose();
  });

  it("disables client writes when a mounted Settings route exposes a different actor", async () => {
    const router = createMemoryRouter([{
      path: "/:locale/settings/administrator",
      loader: () => ({ locale: "en", accountId: "alice", canViewForum: false,
        admin: ["overview", "roles"] as const,
        attention: { signals: [], complaints: [], security: [] },
      }),
      Component: SettingsAdministratorRoute,
    }], { initialEntries: ["/en/settings/administrator"] });
    const view = render(<I18nextProvider i18n={i18n()}>
      <HeaderAuthProvider initialUser={{ id: "bob", name: "Bob", canViewAdminPanel: true }}>
        <RouterProvider router={router} />
      </HeaderAuthProvider>
    </I18nextProvider>);
    expect(await screen.findByRole("combobox", { name: "Density" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Default Admin section" })).toBeDisabled();
    expect(localStorage.getItem(administratorPreferenceKey("alice"))).toBeNull();
    view.unmount(); router.dispose();
  });
});
