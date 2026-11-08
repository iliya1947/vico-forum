import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterContextProvider, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { authorizationOwnerContext } from "../authorization/request-context";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { hebrewCommonValues, russianCommonValues } from "../localization/manual-values";
import { createTranslationRuntime } from "../localization/runtime";
import { registryLoaderContext } from "../localization/request-context";
import { localeRegistry } from "../localization/registry";
import SettingsUserRoute, { loader } from "./settings-user";

function commonResources(locale: "en" | "ru" | "he"): Record<string, string> {
  const english = Object.fromEntries(Object.entries(canonicalEnglishCatalog.common)
    .map(([key, value]) => [key, value.source]));
  const values: Record<string, unknown> =
    locale === "ru" ? russianCommonValues : locale === "he" ? hebrewCommonValues : english;
  return Object.fromEntries(Object.entries(values).flatMap(([key, value]) =>
    typeof value === "string"
      ? [[key, value]]
      : Object.entries(value as Record<string, string>)
        .map(([branch, text]) => [`${key}_${branch}`, text])));
}
function runtime(locale: "en" | "ru" | "he") {
  return createTranslationRuntime({
    locale: {
      translationLocale: locale, fallbackLocales: locale === "en" ? [] : ["en"],
      direction: locale === "he" ? "rtl" : "ltr",
      formatting: { locale, timeZone: "UTC" },
      nativeName: locale, presentationMetadata: {},
    },
    fallbackLocales: locale === "en" ? [] : ["en"],
    resourcesByLocale: {
      en: { common: commonResources("en") },
      [locale]: { common: commonResources(locale) },
    },
    bundleVersions: { en: { common: "test" }, [locale]: { common: "test" } },
    staleKeys: {},
  });
}
function installSystemTheme(initial: boolean) {
  let matches = initial;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn(() => ({
    get matches() { return matches; },
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_type: string, fn: (event: MediaQueryListEvent) => void) => listeners.add(fn),
    removeEventListener: (_type: string, fn: (event: MediaQueryListEvent) => void) => listeners.delete(fn),
  })) });
  return (next: boolean) => {
    matches = next;
    act(() => listeners.forEach(fn => fn({ matches: next } as MediaQueryListEvent)));
  };
}
function showUserSettings(locale: "en" | "ru" | "he") {
  const router = createMemoryRouter([{
    path: "/:locale/settings/user",
    loader: ({ params }) => ({
      locale: params.locale, canViewForum: false, accountId: "current-user",
      preferredLocale: null, localeAvailable: true, localeSaved: false,
      availableLocales: [
        { tag: "en", nativeName: "English", direction: "ltr" },
        { tag: "ru", nativeName: "Русский", direction: "ltr" },
        { tag: "he", nativeName: "עברית", direction: "rtl" },
      ],
    }),
    element: <SettingsUserRoute />,
  }], { initialEntries: [`/${locale}/settings/user`] });
  const page = render(<I18nextProvider i18n={runtime(locale)}>
    <HeaderAuthProvider initialUser={{ id: "current-user", name: "Current user" }}>
      <RouterProvider router={router} />
    </HeaderAuthProvider>
  </I18nextProvider>);
  return { page, router };
}
afterEach(() => {
  cleanup();
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  vi.restoreAllMocks();
});

describe("SET-03 authenticated User preferences and browser theme", () => {
  it("rejects an unauthenticated direct read and keeps private headers", async () => {
    const context = new RouterContextProvider();
    context.set(authSessionContext, null);
    await expect(loader({
      request: new Request("https://vico.test/en/settings/user"),
      params: { locale: "en" }, context,
    })).rejects.toMatchObject({ status: 401 });
    context.set(authSessionContext, { user: { id: "member" } } as AuthSession);
    context.set(authorizationOwnerContext, undefined);
    context.set(registryLoaderContext, async () => ({
      registry: localeRegistry, semanticIdentity: "test",
      health: { status: "healthy" },
    }));
    const authorized = await loader({
      request: new Request("https://vico.test/en/settings/user"),
      params: { locale: "en" }, context,
    });
    expect(authorized.data).toMatchObject({
      locale: "en", canViewForum: false, accountId: "member",
      preferredLocale: null, localeAvailable: true, localeSaved: false,
    });
    expect(authorized.data.availableLocales.map(locale => locale.tag)).toEqual(["en", "he", "ru"]);
    expect(new Headers(authorized.init?.headers).get("Cache-Control")).toBe("private, no-store");
  });

  it.each(["en", "ru", "he"] as const)("renders localized accessible System/Light/Dark choices in %s", async locale => {
    installSystemTheme(false);
    const { page, router } = showUserSettings(locale);
    await waitFor(() => expect(screen.getAllByRole("radio")).toHaveLength(3));
    await waitFor(() => expect(screen.getByRole("radio", { name: commonResources(locale).settingsThemeSystem })).toBeChecked());
    expect(page.container.querySelector('.settings-panel-nav [aria-current="page"]')).toHaveAttribute("href", `/${locale}/settings/user`);
    expect(page.container.querySelectorAll(".settings-panel-pending-item")).toHaveLength(3);
    expect(page.container.querySelectorAll("main")).toHaveLength(1);
    page.unmount(); router.dispose();
  });

  it("synchronizes Settings, header toggle, OS changes and cross-tab storage without another key", async () => {
    const changeSystemTheme = installSystemTheme(true);
    const { page, router } = showUserSettings("en");
    const system = await screen.findByRole("radio", { name: "System" });
    const light = screen.getByRole("radio", { name: "Light" });
    const dark = screen.getByRole("radio", { name: "Dark" });
    await waitFor(() => expect(system).toBeChecked());
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    await userEvent.click(light);
    expect(window.localStorage.getItem("vico-theme")).toBe("light");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(screen.getByRole("button", { name: "Switch to dark theme" })).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));
    await waitFor(() => expect(dark).toBeChecked());
    expect(window.localStorage.getItem("vico-theme")).toBe("dark");

    await userEvent.click(system);
    expect(window.localStorage.getItem("vico-theme")).toBeNull();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    changeSystemTheme(false);
    expect(document.documentElement).toHaveAttribute("data-theme", "light");

    window.localStorage.setItem("vico-theme", "dark");
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: "vico-theme" })));
    await waitFor(() => expect(dark).toBeChecked());
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeVisible();
    page.unmount(); router.dispose();
  });
});
