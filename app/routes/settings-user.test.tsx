import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterContextProvider, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { MarkdownEditor } from "../forum/markdown-editor";
import { ForumMarkdown } from "../forum/markdown";
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
function showUserSettings(locale: "en" | "ru" | "he", withEditor = false,
  accountId = "current-user", displayedUserId = accountId) {
  const router = createMemoryRouter([{
    path: "/:locale/settings/user",
    loader: ({ params }) => ({
      locale: params.locale, canViewForum: false, accountId,
      preferredLocale: null, localeAvailable: true, localeSaved: false,
      availableLocales: [
        { tag: "en", nativeName: "English", direction: "ltr" },
        { tag: "ru", nativeName: "Русский", direction: "ltr" },
        { tag: "he", nativeName: "עברית", direction: "rtl" },
      ],
    }),
    element: <>
      <SettingsUserRoute />
      {withEditor ? <div className="set03-editor-fixture">
        <form><MarkdownEditor id="set03-open-editor" name="body" defaultValue="Exact **source**" /></form>
        <ForumMarkdown>{"~~~ts\nconst x = 1;\n~~~"}</ForumMarkdown>
      </div> : null}
    </>,
  }], { initialEntries: [`/${locale}/settings/user`] });
  const page = render(<I18nextProvider i18n={runtime(locale)}>
    <HeaderAuthProvider initialUser={{ id: displayedUserId, name: "Current user" }}>
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
    expect(screen.getByRole("combobox", { name: commonResources(locale).settingsEditorMode })).toBeVisible();
    expect(screen.getByRole("combobox", { name: commonResources(locale).editorSpellcheck })).toBeVisible();
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


describe("SET-03 device-local Editor/code preferences connected to real consumers", () => {
  it("synchronizes Settings, a mounted Editor and code block both directions without rewriting Markdown", async () => {
    installSystemTheme(false);
    const { page, router } = showUserSettings("en", true);
    const mode = await screen.findByRole("combobox", { name: "Writing mode" });
    const spellcheck = screen.getByRole("combobox", { name: "Check spelling" });
    const wrap = screen.getByRole("checkbox", { name: "Wrap lines" });
    const numbers = screen.getByRole("checkbox", { name: "Line numbers" });
    const editor = page.container.querySelector(".set03-editor-fixture .markdown-editor")!;
    const code = page.container.querySelector(".set03-editor-fixture .forum-code-block")!;
    const form = page.container.querySelector<HTMLFormElement>(".set03-editor-fixture form")!;
    const body = () => new FormData(form).get("body");
    await waitFor(() => expect(mode).toHaveValue("default"));
    expect(editor).toHaveAttribute("data-authoring", "simple");
    expect(body()).toBe("Exact **source**");
    expect(code).toHaveAttribute("data-wrap", "false");
    expect(code.querySelector("pre")).toHaveAttribute("data-line-numbers", "false");

    await userEvent.selectOptions(mode, "advanced");
    await waitFor(() => expect(editor).toHaveAttribute("data-authoring", "advanced"));
    expect(localStorage.getItem("vico:editor:mode:current-user")).toBe("advanced");
    const textarea = page.container.querySelector<HTMLTextAreaElement>(".set03-editor-fixture textarea")!;
    textarea.focus();
    textarea.setSelectionRange(3, 3);
    expect(body()).toBe("Exact **source**");

    await userEvent.selectOptions(spellcheck, "true");
    expect(localStorage.getItem("vico:editor:spellcheck:current-user")).toBe("true");
    expect(textarea).toHaveAttribute("spellcheck", "true");
    await userEvent.click(wrap);
    await userEvent.click(numbers);
    expect(code).toHaveAttribute("data-wrap", "true");
    expect(code.querySelector("pre")).toHaveAttribute("data-line-numbers", "true");
    expect(localStorage.getItem("vico:editor:code-wrap:current-user")).toBe("true");
    expect(localStorage.getItem("vico:editor:code-lines:current-user")).toBe("true");

    await userEvent.selectOptions(mode, "simple");
    await waitFor(() => expect(editor).toHaveAttribute("data-authoring", "simple"));
    await userEvent.selectOptions(mode, "advanced");
    await waitFor(() => expect(editor).toHaveAttribute("data-authoring", "advanced"));
    expect(body()).toBe("Exact **source**");
    expect(textarea.selectionStart).toBe(3);

    await userEvent.click(screen.getByRole("button", { name: "Simple" }));
    await waitFor(() => expect(mode).toHaveValue("simple"));
    expect(localStorage.getItem("vico:editor:mode:current-user")).toBe("simple");
    await userEvent.click(screen.getByRole("button", { name: "No wrap" }));
    await waitFor(() => expect(wrap).not.toBeChecked());
    expect(localStorage.getItem("vico:editor:code-wrap:current-user")).toBe("false");
    expect(body()).toBe("Exact **source**");

    act(() => {
      localStorage.setItem("vico:editor:mode:current-user", "advanced");
      window.dispatchEvent(new StorageEvent("storage", { key: "vico:editor:mode:current-user" }));
      localStorage.setItem("vico:editor:code-wrap:current-user", "true");
      window.dispatchEvent(new StorageEvent("storage", { key: "vico:editor:code-wrap:current-user" }));
    });
    await waitFor(() => expect(mode).toHaveValue("advanced"));
    expect(editor).toHaveAttribute("data-authoring", "advanced");
    expect(wrap).toBeChecked();
    expect(code).toHaveAttribute("data-wrap", "true");
    expect(body()).toBe("Exact **source**");

    await userEvent.selectOptions(mode, "default");
    await userEvent.selectOptions(spellcheck, "auto");
    expect(localStorage.getItem("vico:editor:mode:current-user")).toBeNull();
    expect(localStorage.getItem("vico:editor:spellcheck:current-user")).toBeNull();
    expect(editor).toHaveAttribute("data-authoring", "simple");
    expect(page.container.querySelector("[data-visual-text='true']")).toHaveAttribute("spellcheck", "true");
    expect(body()).toBe("Exact **source**");
    page.unmount(); router.dispose();
  });

  it("keeps local preferences isolated after an account switch and rejects a stale Settings identity", async () => {
    installSystemTheme(false);
    localStorage.setItem("vico:editor:mode:set03-user-a", "advanced");
    localStorage.setItem("vico:editor:code-wrap:set03-user-a", "true");
    const first = showUserSettings("en", true, "set03-user-a");
    const firstMode = await screen.findByRole("combobox", { name: "Writing mode" });
    await waitFor(() => expect(firstMode).toHaveValue("advanced"));
    expect(first.page.container.querySelector(".set03-editor-fixture .markdown-editor"))
      .toHaveAttribute("data-authoring", "advanced");
    first.page.unmount(); first.router.dispose();

    const second = showUserSettings("en", true, "set03-user-b");
    const secondMode = await screen.findByRole("combobox", { name: "Writing mode" });
    await waitFor(() => expect(secondMode).toHaveValue("default"));
    expect(second.page.container.querySelector(".set03-editor-fixture .markdown-editor"))
      .toHaveAttribute("data-authoring", "simple");
    expect(screen.getByRole("checkbox", { name: "Wrap lines" })).not.toBeChecked();
    expect(localStorage.getItem("vico:editor:mode:set03-user-b")).toBeNull();
    second.page.unmount(); second.router.dispose();

    const stale = showUserSettings("en", true, "set03-user-a", "set03-user-b");
    const staleMode = await screen.findByRole("combobox", { name: "Writing mode" });
    expect(staleMode).toBeDisabled();
    expect(staleMode).toHaveValue("default");
    expect(screen.getByRole("checkbox", { name: "Wrap lines" })).toBeDisabled();
    expect(stale.page.container.querySelector(".set03-editor-fixture .markdown-editor"))
      .toHaveAttribute("data-authoring", "simple");
    stale.page.unmount(); stale.router.dispose();
    localStorage.removeItem("vico:editor:mode:set03-user-a");
    localStorage.removeItem("vico:editor:code-wrap:set03-user-a");
  });
});
