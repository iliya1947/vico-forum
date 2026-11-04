import { render, cleanup } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { createTranslationRuntime } from "../localization/runtime";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { russianCommonValues, hebrewCommonValues } from "../localization/manual-values";
import { adminAccess } from "./access";
import { adminDestinations } from "./shell";
import { adminUserPath, adminUsersPath } from "./users-paths";
import { AdminUsersIndex, AdminUserDetail } from "./users";

const id = "user/עברית😀";
const user = {
  id, name: "Name עברית", image: null, joinedAt: "2026-10-01T10:00:00.000Z",
  bio: "Public biography", githubUrl: "https://github.com/example", websiteUrl: "https://example.org",
  role: { slug: "user", displayName: "Member", isSystem: true }, messageCount: 9, bestAnswerCount: 2,
};
const access = adminAccess(new Set(["admin.users.read"]));
let dispose = () => {};
afterEach(() => { cleanup(); dispose(); });

function localized(locale: string) {
  const english = Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([key, value]) => [key, value.source]));
  const manual = locale === "ru" ? russianCommonValues : locale === "he" ? hebrewCommonValues : english;
  const flatten = (v: Record<string, unknown>): Record<string, string> =>
    Object.fromEntries(Object.entries(v).flatMap(([key, value]) => typeof value === "string"
      ? [[key, value]] : Object.entries(value as Record<string, string>).map(([form, text]) => [`${key}_${form}`, text])));
  return createTranslationRuntime({
    locale: { translationLocale: locale, direction: locale === "he" ? "rtl" : "ltr",
      formatting: { locale, timeZone: "UTC" }, fallbackLocales: locale === "en" ? [] : ["en"],
      nativeName: locale, presentationMetadata: {} },
    fallbackLocales: locale === "en" ? [] : ["en"],
    resourcesByLocale: { en: { common: flatten(english) }, [locale]: { common: flatten(manual) } },
    bundleVersions: { en: { common: "test" }, [locale]: { common: "test" } }, staleKeys: {},
  });
}
function mount(locale: string, detail: boolean, empty = false) {
  const view = detail
    ? <AdminUserDetail locale={locale} access={access} user={user} />
    : <AdminUsersIndex locale={locale} access={access} query={{ search: "%_ עברית", after: "before" }}
      page={{ items: empty ? [] : [{ id, name: user.name, image: null, joinedAt: user.joinedAt }],
        total: empty ? 0 : 26, next: empty ? null : id }} />;
  const router = createMemoryRouter([{ path: "*", element: view }], { initialEntries: [`/${locale}/admin/users`] });
  dispose = () => router.dispose();
  return render(<I18nextProvider i18n={localized(locale)}><RouterProvider router={router}/></I18nextProvider>).container;
}

describe("AP-09 read-only Users presentation", () => {
  it.each(["en", "ru", "he"])("presents search, safe encoded targets and pagination in %s", locale => {
    const root = mount(locale, false);
    expect(root.querySelectorAll("main")).toHaveLength(1);
    expect(root.querySelectorAll("h1")).toHaveLength(1);
    expect(root.querySelector('.admin-panel-nav [aria-current="page"]')?.getAttribute("href")).toBe(adminUsersPath(locale));
    expect(root.querySelector('label[for="admin-users-query"]')?.textContent).not.toBe("adminUsersSearch");
    expect((root.querySelector('form[method="get"] input[name="q"]') as HTMLInputElement)?.value).toBe("%_ עברית");
    expect(root.querySelector('.admin-forum-objects h3 a')?.getAttribute("href")).toBe(adminUserPath(locale, id));
    const actions = [...root.querySelectorAll<HTMLAnchorElement>('.admin-forum-objects nav a')].map(a => a.getAttribute("href"));
    expect(actions).toContain(adminUserPath(locale, id));
    expect(actions).toContain(`/${locale}/users/${encodeURIComponent(id)}`);
    const next = root.querySelector('.admin-forum-paging a:last-child') as HTMLAnchorElement;
    const query = new URL(next.getAttribute("href")!, "https://vico.test").searchParams;
    expect(query.get("q")).toBe("%_ עברית");
    expect(query.get("after")).toBe(id);
  });

  it("shows truthfully empty Users state and no fabricated list", () => {
    const root = mount("ru", false, true);
    expect(root.querySelector(".admin-forum-objects")).toBeNull();
    expect(root.textContent).toContain("Пользователи не найдены.");
    expect(root.querySelectorAll(".admin-forum-paging a")).toHaveLength(1);
  });

  it.each(["en", "ru", "he"])("shows public-only detail with UTC and no manager controls in %s", locale => {
    const root = mount(locale, true);
    expect(root.querySelectorAll("main")).toHaveLength(1);
    expect(root.querySelectorAll("h1")).toHaveLength(1);
    expect(root.querySelector('.admin-panel-nav [aria-current="page"]')?.getAttribute("href")).toBe(adminUsersPath(locale));
    expect(root.querySelector('[id="admin-user-detail-heading"]')?.textContent).not.toBe("adminUsersDetail");
    expect(root.querySelector('.admin-forum form')).toBeNull();
    expect(root.querySelector('a[href="/'+locale+'/users/'+encodeURIComponent(id)+'"]')).toBeTruthy();
    expect(root.querySelector('time')?.getAttribute("datetime")).toBe(user.joinedAt);
    expect(root.textContent).toContain("Public biography");
    expect(root.querySelector('.profile-links a[href="https://example.org/"]')).toBeTruthy();
  });

  it("preserves capability-distinct navigation", () => {
    const reader = adminDestinations("he", adminAccess(new Set(["admin.users.read"])));
    expect(reader.find(x => x.id === "users")).toMatchObject({ href: "/he/admin/users", pending: false });
    expect(reader.some(x => x.id === "roles")).toBe(false);
    const manager = adminDestinations("he", adminAccess(new Set(["access.authorization.manage"])));
    expect(manager.find(x => x.id === "users")?.href).toBe("/he/admin/authorization#authorization-users-heading");
    expect(manager.find(x => x.id === "roles")?.href).toBe("/he/admin/authorization");
  });
});
