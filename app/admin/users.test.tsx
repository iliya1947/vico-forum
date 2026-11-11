import { render, cleanup } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { createTranslationRuntime } from "../localization/runtime";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { russianCommonValues, hebrewCommonValues } from "../localization/manual-values";
import { adminAccess } from "./access";
import { UNDER_DEVELOPMENT_FEATURES } from "../forum/under-development";
import { adminDestinations } from "./shell";
import { adminUsersPath } from "./users-paths";
import { AdminUsersIndex } from "./users";

const id = "user/עברית😀";
const access = adminAccess(new Set(["admin.users.read", "access.authorization.manage"]));
let dispose = () => {};
afterEach(() => { cleanup(); dispose(); });

function localized(locale: string) {
  const english = Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([key, value]) => [key, value.source]));
  const manual = locale === "ru" ? russianCommonValues : locale === "he" ? hebrewCommonValues : english;
  const flatten = (v: Record<string, unknown>): Record<string, string> =>
    Object.fromEntries(Object.entries(v).flatMap(([key, value]) => typeof value === "string"
      ? [[key, value]] : Object.entries(value as Record<string, string>).map(([form, text]) => [key + "_" + form, text])));
  return createTranslationRuntime({
    locale: { translationLocale: locale, direction: locale === "he" ? "rtl" : "ltr",
      formatting: { locale, timeZone: "UTC" }, fallbackLocales: locale === "en" ? [] : ["en"],
      nativeName: locale, presentationMetadata: {} },
    fallbackLocales: locale === "en" ? [] : ["en"],
    resourcesByLocale: { en: { common: flatten(english) }, [locale]: { common: flatten(manual) } },
    bundleVersions: { en: { common: "test" }, [locale]: { common: "test" } }, staleKeys: {},
  });
}
function mount(locale: string, empty = false) {
  const view = <AdminUsersIndex locale={locale} access={access}
    query={{ search: "%_ עברית", after: "before" }}
    page={{ items: empty ? [] : [{ id, name: "Name עברית", image: null,
      joinedAt: "2026-10-01T10:00:00.000Z" }],
      total: empty ? 0 : 26, next: empty ? null : id }}/>;
  const router = createMemoryRouter([{ path: "*", element: view }], { initialEntries: ["/" + locale + "/admin/users"] });
  dispose = () => router.dispose();
  return render(<I18nextProvider i18n={localized(locale)}><RouterProvider router={router}/></I18nextProvider>).container;
}
describe("SA03 Admin directory remains independent and links to single canonical profile", () => {
  it.each(["en", "ru", "he"])("keeps search, locale, paging and literal opaque ID in %s", locale => {
    const root = mount(locale);
    const profile = "/" + locale + "/users/" + encodeURIComponent(id);
    expect(root.querySelectorAll("main")).toHaveLength(1);
    expect(root.querySelector(".admin-panel-nav [aria-current=page]")?.getAttribute("href"))
      .toBe(adminUsersPath(locale));
    expect((root.querySelector("input[name=q]") as HTMLInputElement)?.value).toBe("%_ עברית");
    const links = [...root.querySelectorAll<HTMLAnchorElement>(".admin-forum-objects a")]
      .map(a => a.getAttribute("href"));
    expect(links).toContain(profile);
    expect(links).toContain(profile + "#authorization");
    expect(links.some(href => href?.includes("/admin/users/"))).toBe(false);
    const params = new URL(root.querySelector(".admin-forum-paging a:last-child")!.getAttribute("href")!,
      "https://forum.test").searchParams;
    expect(params.get("q")).toBe("%_ עברית");
    expect(params.get("after")).toBe(id);
  });
  it("keeps a truthful empty directory", () => {
    const root = mount("ru", true);
    expect(root.querySelector(".admin-forum-objects")).toBeNull();
    expect(root.textContent).toContain("Пользователи не найдены.");
  });
  it("does not weaken directory-only capability admission or mark Users unfinished", () => {
    expect(adminDestinations("en", adminAccess(new Set(["admin.users.read"])))
      .find(x => x.id === "users")?.href).toBe("/en/admin/users");
    expect(adminDestinations("en", adminAccess(new Set(["access.authorization.manage"])))
      .find(x => x.id === "users")?.href).toBe("/en/admin/authorization#authorization-users-heading");
    expect(UNDER_DEVELOPMENT_FEATURES.map(x=>x.id)).not.toContain("admin-users");
  });
});
