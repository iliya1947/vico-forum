import { act, cleanup, render, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { createAdministrativeRouting } from "../administrative-routing/addresses";
import { AdministrativeRoutingProvider } from "../administrative-routing/provider";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import {
  readAdministratorPreferences, selectAdminEntry, updateAdministratorPreferences,
} from "../settings/administrator-preferences";
import { adminAccess } from "./access";
import { AdminShell } from "./shell";

const allowed = ["overview", "users", "history"] as const;
const flatten = (values: Record<string, unknown>): Record<string, string> => Object.fromEntries(
  Object.entries(values).flatMap(([key, value]) =>
    typeof value === "string"
      ? [[key, value]]
      : Object.entries(value as Record<string, string>).map(([part, text]) => [`${key}_${part}`, text]),
  ),
);
const common = flatten(Object.fromEntries(
  Object.entries(canonicalEnglishCatalog.common).map(([key, entry]) => [key, entry.source]),
));
const i18n = () => createTranslationRuntime({
  locale: { translationLocale: "en", direction: "ltr", formatting: { locale: "en", timeZone: "UTC" },
    fallbackLocales: [], nativeName: "English", presentationMetadata: {} },
  fallbackLocales: [], resourcesByLocale: { en: { common } },
  bundleVersions: { en: { common: "test" } }, staleKeys: {},
});

let router: ReturnType<typeof createMemoryRouter> | undefined;
afterEach(() => {
  cleanup();
  router?.dispose();
  router = undefined;
  window.localStorage.clear();
});

function mount(routing: ReturnType<typeof createAdministrativeRouting>, accountId: string) {
  const access = {
    ...adminAccess(new Set(["admin.users.read", "admin.history.read"])),
    actorId: accountId,
  };
  const user = { id: accountId, name: "Current account", canViewAdminPanel: true,
    adminEntryDestinations: allowed };
  const element = <AdminShell locale="en" access={access} current="users"><p>Users content</p></AdminShell>;
  router = createMemoryRouter([
    { path: "/en/admin/users", element },
    { path: "/en/admin/users/:userId", element },
  ], { initialEntries: ["/en/admin/users/member"] });
  return render(
    <I18nextProvider i18n={i18n()}>
      <AdministrativeRoutingProvider routing={routing}>
        <HeaderAuthProvider initialUser={user}>
          <RouterProvider router={router} />
        </HeaderAuthProvider>
      </AdministrativeRoutingProvider>
    </I18nextProvider>,
  );
}

describe("AdminShell current logical index recording with substituted address families", () => {
  it.each([
    ["relative", false],
    ["absolute same-origin", true],
  ] as const)("records last section for %s Admin destinations, excluding user detail", async (_, absolute) => {
    const accountId = absolute ? "same-origin-owner" : "relative-owner";
    const routing = createAdministrativeRouting(
      locale => `${absolute ? window.location.origin : ""}/${locale}/admin`,
      locale => `https://owner.invalid/${locale}/control`,
    );
    updateAdministratorPreferences(accountId, { adminEntry: "last", adminLast: "history" });
    mount(routing, accountId);

    // A detail route can highlight Users without recording the Users top-level index.
    expect(readAdministratorPreferences(accountId).adminLast).toBe("history");
    expect(selectAdminEntry("en", allowed, readAdministratorPreferences(accountId), routing))
      .toBe(routing.admin.history("en"));

    await act(async () => { await router!.navigate("/en/admin/users"); });
    await waitFor(() => expect(readAdministratorPreferences(accountId).adminLast).toBe("users"));
    expect(selectAdminEntry("en", allowed, readAdministratorPreferences(accountId), routing))
      .toBe(routing.admin.users("en"));
    expect(readAdministratorPreferences("different-account").adminLast).toBeNull();
    expect(routing.superAdmin.overview("en")).toBe("https://owner.invalid/en/control");
  });

  it("does not record a local index against a different-origin Admin destination", () => {
    const accountId = "other-origin-owner";
    const routing = createAdministrativeRouting(
      locale => `https://other.invalid/${locale}/admin`,
      locale => `https://owner.invalid/${locale}/control`,
    );
    updateAdministratorPreferences(accountId, { adminEntry: "last", adminLast: "history" });
    // Current location has the same pathname but is not the trusted Admin destination.
    router = createMemoryRouter([
      { path: "/en/admin/users", element:
        <AdminShell locale="en" access={{
          ...adminAccess(new Set(["admin.users.read", "admin.history.read"])),
          actorId: accountId,
        }} current="users"><p>Users content</p></AdminShell> },
    ], { initialEntries: ["/en/admin/users"] });
    render(<I18nextProvider i18n={i18n()}>
      <AdministrativeRoutingProvider routing={routing}>
        <HeaderAuthProvider initialUser={{ id: accountId, name: "Current account" }}>
          <RouterProvider router={router} />
        </HeaderAuthProvider>
      </AdministrativeRoutingProvider>
    </I18nextProvider>);
    expect(readAdministratorPreferences(accountId).adminLast).toBe("history");
  });
});
