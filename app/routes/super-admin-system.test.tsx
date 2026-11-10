import "@testing-library/jest-dom/vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { createAdministrativeRouting, type AdministrativeRouting } from "../administrative-routing/addresses";
import { AdministrativeRoutingProvider } from "../administrative-routing/provider";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { canonicalEnglishCatalog } from "../localization/catalog";
import type { SystemOverview } from "../../db/owner-system-monitoring";
import SuperAdminSystemRoute from "./super-admin-system";

const system: SystemOverview = {
  observedAt: "2026-11-09T17:00:00.000Z", recording: "available", monitors: [
    { key: "system.runtime", source: "application", quality: "measured",
      values: { state: "serving", build: "production" }, coverageFrom: "2026-11-09T16:00:00.000Z",
      lastObservedAt: "2026-11-09T17:00:00.000Z" },
    { key: "system.dependencies", source: "database", quality: "measured",
      values: { state: "available", version: "17.11" }, coverageFrom: "2026-11-09T16:00:00.000Z",
      lastObservedAt: "2026-11-09T17:00:00.000Z" },
    { key: "system.requests", source: "application", quality: "measured",
      values: { state: "limited-coverage", count: 2 }, coverageFrom: null, lastObservedAt: null },
  ],
};

let router: ReturnType<typeof createMemoryRouter> | undefined;
afterEach(() => {
  cleanup();
  router?.dispose();
  router = undefined;
});

function mount(routing?: AdministrativeRouting) {
  const english = Object.fromEntries(Object.entries(canonicalEnglishCatalog.common)
    .map(([key, descriptor]) => [key, descriptor.source]));
  const i18n = createInstance();
  void i18n.init({
    lng: "en", fallbackLng: "en", initAsync: false, defaultNS: "common",
    resources: { en: { common: english } },
  });

  // Render the actual route element with fixture loader data; no route, path, or provider mocks.
  router = createMemoryRouter([
    { path: "/en/super-admin/monitoring/system",
      loader: () => ({ locale: "en", system }),
      element: <SuperAdminSystemRoute /> },
  ], { initialEntries: ["/en/super-admin/monitoring/system"] });

  return render(
    <I18nextProvider i18n={i18n}>
      <AdministrativeRoutingProvider routing={routing}>
        <HeaderAuthProvider initialUser={{ id: "owner", name: "Owner", canViewSuperAdmin: true }}>
          <RouterProvider router={router} />
        </HeaderAuthProvider>
      </AdministrativeRoutingProvider>
    </I18nextProvider>,
  );
}

describe("Super-admin System route outbound routing", () => {
  it("keeps the default Monitoring back-link aligned with the shell and monitor cards", async () => {
    const { container } = mount();
    const monitoring = "/en/super-admin/monitoring";
    await waitFor(() => expect(container.querySelector(".admin-overview > p:last-child a"))
      .toHaveAttribute("href", monitoring));
    expect(container.querySelector('nav.admin-panel-nav a[aria-current="page"]'))
      .toHaveAttribute("href", monitoring);
    expect(container.querySelectorAll(
      'a[href^="/en/super-admin/monitoring/system/"][href$="/history"]',
    )).toHaveLength(3);
  });

  it("uses the independent substituted Owner origin for the real System page back-link", async () => {
    const routing = createAdministrativeRouting(
      locale => `https://forum.invalid/${locale}/office`,
      locale => `https://owner.invalid/${locale}/control`,
    );
    const { container } = mount(routing);
    const monitoring = "https://owner.invalid/en/control/monitoring";
    await waitFor(() => expect(container.querySelector(".admin-overview > p:last-child a"))
      .toHaveAttribute("href", monitoring));
    expect(container.querySelector('nav.admin-panel-nav a[aria-current="page"]'))
      .toHaveAttribute("href", monitoring);
    expect(container.querySelectorAll(
      'a[href^="https://owner.invalid/en/control/monitoring/system/"][href$="/history"]',
    )).toHaveLength(3);
    expect(container.querySelector('.admin-overview > p:last-child a'))
      .not.toHaveAttribute("href", "/en/super-admin/monitoring");
    expect(routing.admin.overview("en")).toBe("https://forum.invalid/en/office");
  });
});
