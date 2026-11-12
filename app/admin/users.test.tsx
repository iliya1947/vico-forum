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
import type { AdminUserSummary } from "../../db/admin-users";

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
function mount(locale: string, empty = false, users?: AdminUserSummary[]) {
  const view = <AdminUsersIndex locale={locale} access={access}
    query={{ search: "%_ עברית", after: "before" }}
    page={{ items: empty ? [] : users ?? [{ id, name: "Name עברית", image: null,
      joinedAt: "2026-10-01T10:00:00.000Z" }],
      total: empty ? 0 : users?.length ?? 26, next: empty || users ? null : id }}/>;
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

describe("SA04-D directory neutral rendering", () => {
  it.each(["en", "ru", "he"])("does not render a raw marked name/image or old-name avatar initials in %s", locale => {
    const inactiveId = "inactive/עברית😀";
    const activeId = "active/עברית😀";
    const root = mount(locale, false, [
      {
        id: activeId, name: "Active Admin User", image: "https://images.example.test/active-avatar.png",
        joinedAt: "2026-10-01T10:00:00.000Z",
      },
      {
        id: inactiveId, name: "SECRET_SA04_D_RETAINED_NAME",
        image: "https://images.example.test/SECRET_SA04_D_ORIGINAL_AVATAR.png",
        joinedAt: "2026-10-02T10:00:00.000Z", identityKind: "deleted",
      },
    ]);
    const deletedLabel = localized(locale).t("deletedUser");
    const cards = root.querySelectorAll(".admin-forum-objects > li");
    expect(cards).toHaveLength(2);
    expect(cards[0]!.textContent).toContain("Active Admin User");
    expect(cards[0]!.querySelector(".profile-avatar img")).toHaveAttribute(
      "src", "https://images.example.test/active-avatar.png",
    );
    expect(cards[1]!.textContent).toContain(deletedLabel);
    expect(cards[1]!.querySelector(".profile-avatar img")).toBeNull();
    expect(cards[1]!.querySelector(".profile-avatar")?.textContent?.trim())
      .toBe(Array.from(deletedLabel.trim())[0]?.toUpperCase());
    expect(root.innerHTML).not.toContain("SECRET_SA04_D_");
    const profile = "/" + locale + "/users/" + encodeURIComponent(inactiveId);
    const hrefs = [...cards[1]!.querySelectorAll<HTMLAnchorElement>("a")]
      .map(link => link.getAttribute("href"));
    expect(hrefs).toContain(profile);
    expect(hrefs).toContain(profile + "#authorization");
    expect(root.textContent).toContain("2");
    expect(root.querySelector('input[name="q"]')).toHaveValue("%_ עברית");
  });
});
