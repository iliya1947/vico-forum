import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, MemoryRouter, RouterProvider, useLocation } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { LocaleNavigationProvider } from "../localization/locale-navigation";
import { createTranslationRuntime } from "../localization/runtime";
import { THEME_BOOTSTRAP_SCRIPT } from "../theme";
import { ForumShell, LanguageSwitcher, ThemeToggle } from "./ui";

function canonicalCommonResources(): Record<string, string> {
  const resources: Record<string, string> = {};
  for (const [key, descriptor] of Object.entries(canonicalEnglishCatalog.common)) {
    if (typeof descriptor.source === "string") {
      resources[key] = descriptor.source;
      continue;
    }
    for (const [branch, value] of Object.entries(descriptor.source)) {
      resources[`${key}_${branch}`] = value;
    }
  }
  return resources;
}

function runtime() {
  return createTranslationRuntime({
    locale: {
      translationLocale: "en",
      fallbackLocales: [],
      direction: "ltr",
      formatting: { locale: "en", timeZone: "UTC" },
      nativeName: "English",
      presentationMetadata: {},
    },
    fallbackLocales: [],
    resourcesByLocale: { en: { common: canonicalCommonResources() } },
    bundleVersions: { en: { common: "test" } },
    staleKeys: {},
  });
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}{location.search}{location.hash}</span>;
}

function installMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({
      matches,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  return listeners;
}

function renderToggle() {
  return render(
    <I18nextProvider i18n={runtime()}>
      <ThemeToggle />
    </I18nextProvider>,
  );
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  vi.restoreAllMocks();
});

describe("ForumShell keyboard navigation", () => {
  it("puts a localized skip link first and targets the focusable forum content", async () => {
    const router = createMemoryRouter([{
      path: "*",
      element: (
        <HeaderAuthProvider initialUser={null}>
          <ForumShell locale="en" variant="home">
            <h1>Forum content</h1>
          </ForumShell>
        </HeaderAuthProvider>
      ),
    }], { initialEntries: ["/en"] });

    render(
      <I18nextProvider i18n={runtime()}>
        <LocaleNavigationProvider
          locales={[{ tag: "en", nativeName: "English", direction: "ltr" }]}
        >
          <RouterProvider router={router} />
        </LocaleNavigationProvider>
      </I18nextProvider>,
    );

    const skip = screen.getByRole("link", { name: "Skip to content" });
    await userEvent.tab();

    expect(skip).toHaveFocus();
    expect(skip).toHaveAttribute("href", "#forum-content");
    expect(document.getElementById("forum-content")).toHaveAttribute("tabindex", "-1");
  });
});

describe("LanguageSwitcher", () => {
  it("switches the locale segment while preserving the current route, query and hash", async () => {
    render(
      <I18nextProvider i18n={runtime()}>
        <LocaleNavigationProvider
          locales={[
            { tag: "en", nativeName: "English", direction: "ltr" },
            { tag: "he", nativeName: "עברית", direction: "rtl" },
            { tag: "ru", nativeName: "Русский", direction: "ltr" },
          ]}
        >
          <MemoryRouter initialEntries={["/en/topics/42?view=latest#post-2"]}>
            <LanguageSwitcher locale="en" />
            <LocationProbe />
          </MemoryRouter>
        </LocaleNavigationProvider>
      </I18nextProvider>,
    );

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "English" }), "ru");

    expect(screen.getByTestId("location")).toHaveTextContent("/ru/topics/42?view=latest#post-2");
  });

  it("uses the preview override instead of router navigation when one is provided", async () => {
    const onLocaleChange = vi.fn();

    render(
      <I18nextProvider i18n={runtime()}>
        <LocaleNavigationProvider
          locales={[
            { tag: "en", nativeName: "English", direction: "ltr" },
            { tag: "he", nativeName: "עברית", direction: "rtl" },
          ]}
          onLocaleChange={onLocaleChange}
        >
          <MemoryRouter initialEntries={["/en"]}>
            <LanguageSwitcher locale="en" />
            <LocationProbe />
          </MemoryRouter>
        </LocaleNavigationProvider>
      </I18nextProvider>,
    );

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "English" }), "he");

    expect(onLocaleChange).toHaveBeenCalledWith("he");
    expect(screen.getByTestId("location")).toHaveTextContent("/en");
  });
});

describe("ThemeToggle", () => {
  it("applies a persisted manual choice before React mounts", () => {
    window.localStorage.setItem("vico-theme", "light");
    installMatchMedia(true);

    // Execute the exact inline bootstrap emitted by the document shell.
    // eslint-disable-next-line no-eval
    window.eval(THEME_BOOTSTRAP_SCRIPT);

    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it("uses the system preference when no manual choice exists, then persists a manual choice", async () => {
    installMatchMedia(true);
    renderToggle();

    const button = await screen.findByRole("button", { name: "Switch to light theme" });
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");

    await userEvent.click(button);

    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(window.localStorage.getItem("vico-theme")).toBe("light");
    expect(screen.getByRole("button", { name: "Switch to dark theme" })).toBeVisible();
  });

  it("lets the persisted manual choice override the current system preference", async () => {
    window.localStorage.setItem("vico-theme", "light");
    installMatchMedia(true);
    renderToggle();

    expect(await screen.findByRole("button", { name: "Switch to dark theme" })).toBeVisible();
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });
});
