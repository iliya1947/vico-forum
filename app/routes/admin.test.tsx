import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterContextProvider, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loader } from "./admin";
import { loader as authorizationLoader, action as authorizationAction } from "./authorization-admin";
import { AdminOverview } from "../admin/overview";
import { ADMIN_FORUM_PERMISSIONS } from "../admin/access";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { forumReaderContext } from "../forum/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { russianCommonValues, hebrewCommonValues } from "../localization/manual-values";
import { UnderDevelopmentView } from "../forum/under-development-view";
import { HeaderAuthProvider } from "../auth/auth-controls";

afterEach(cleanup);

function fixture(permissions: string[] = [], authenticated = true) {
  const context = new RouterContextProvider();
  // A client/session role label is deliberately not evidence of permission.
  context.set(authSessionContext, authenticated ? { user: { id: "custom-member", name: "Custom member", role: "admin" } } as unknown as AuthSession : null);
  const granted = new Set(permissions);
  const has = vi.fn(async (key: string) => granted.has(key));
  const readManagementState = vi.fn(async () => ({ roles: [], users: [] }));
  context.set(authorizationContext, { forUser: () => ({ has, resolve: vi.fn() }), readManagementState } as never);
  const readStatistics = vi.fn(async () => ({ topics: 0, posts: 0, users: 0 }));
  context.set(forumReaderContext, { readStatistics } as never);
  return { context, granted, has, readStatistics, readManagementState };
}

describe("AP-02 protected Overview", () => {
  it("rejects guests and ordinary/attention-only permissions before reading counts", async () => {
    for (const [f, status] of [[fixture([], false), 401], [fixture(["forum.topic.create", "forum.solution.manageOwn", "forum.sourceLocale.correctOwn", "forum.helpNeedsDetails.manage", "forum.attachmentSecurity.read"]), 403]] as const) {
      await expect(loader({ params: { locale: "en" }, context: f.context })).rejects.toMatchObject({ status });
      expect(f.readStatistics).not.toHaveBeenCalled();
    }
  });
  it.each([...ADMIN_FORUM_PERMISSIONS, "access.authorization.manage"])("admits a custom identity with effective %s without another permission", async (permission) => {
    const f = fixture([permission]);
    const result = await loader({ params: { locale: "he" }, context: f.context });
    expect(result.data).toMatchObject({ locale: "he", statistics: { topics: 0, posts: 0, users: 0 }, access: { authorization: permission === "access.authorization.manage", forum: permission !== "access.authorization.manage" } });
    expect(result.init?.headers).toEqual({ "Cache-Control": "no-store" });
    expect(f.readStatistics).toHaveBeenCalledOnce();
    expect(f.readManagementState).not.toHaveBeenCalled();
  });
  it("rechecks changed effective permissions on the next request", async () => {
    const f = fixture(["forum.topic.pin"]);
    await loader({ params: { locale: "en" }, context: f.context });
    f.granted.delete("forum.topic.pin");
    await expect(loader({ params: { locale: "en" }, context: f.context })).rejects.toMatchObject({ status: 403 });
    f.granted.add("access.authorization.manage");
    expect((await loader({ params: { locale: "en" }, context: f.context })).data.access.authorization).toBe(true);
  });
  it("fails closed on authorization outage, without swallowing programming errors", async () => {
    const f = fixture();
    f.has.mockRejectedValue(new AuthorizationUnavailableError());
    await expect(loader({ params: {}, context: f.context })).rejects.toMatchObject({ status: 503 });
    expect(f.readStatistics).not.toHaveBeenCalled();
    const bug = new Error("schema bug");
    f.has.mockRejectedValue(bug);
    await expect(loader({ params: {}, context: f.context })).rejects.toBe(bug);
  });
  it("keeps destinations usable for classified count outages and propagates unexpected count failures", async () => {
    const f = fixture(["forum.topic.pin"]);
    f.readStatistics.mockRejectedValueOnce(new ForumStorageUnavailableError());
    expect((await loader({ params: {}, context: f.context })).data.statistics).toBeNull();
    const bug = new Error("bad SQL");
    f.readStatistics.mockRejectedValueOnce(bug);
    await expect(loader({ params: {}, context: f.context })).rejects.toBe(bug);
  });
  it("does not open the existing authorization loader/action to forum-only actors", async () => {
    const f = fixture(["forum.topic.pin"]);
    await loader({ params: {}, context: f.context });
    await expect(authorizationLoader({ params: {}, context: f.context })).rejects.toMatchObject({ status: 403 });
    await expect(authorizationAction({ request: new Request("https://vico.test/en/admin/authorization", { method: "POST", headers: { Origin: "https://vico.test" }, body: new URLSearchParams({ intent: "deleteRole", roleId: "user" }) }), context: f.context })).rejects.toMatchObject({ status: 403 });
    expect(f.readManagementState).not.toHaveBeenCalled();
    f.granted.add("access.authorization.manage");
    await expect(authorizationLoader({ params: { locale: "en" }, context: f.context })).resolves.toMatchObject({ locale: "en", roles: [], users: [] });
  });
});

function runtime(locale: string) {
  const en: Record<string, string> = {};
  for (const [key, descriptor] of Object.entries(canonicalEnglishCatalog.common)) {
    if (typeof descriptor.source === "string") en[key] = descriptor.source;
    else for (const [branch, value] of Object.entries(descriptor.source)) en[`${key}_${branch}`] = value;
  }
  const values = locale === "ru" ? russianCommonValues : locale === "he" ? hebrewCommonValues : en;
  const common: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string") common[key] = value;
    else if (value && typeof value === "object") for (const [branch, text] of Object.entries(value)) {
      if (typeof text === "string") common[`${key}_${branch}`] = text;
    }
  }
  return createTranslationRuntime({ locale: { translationLocale: locale, direction: locale === "he" ? "rtl" : "ltr", fallbackLocales: [], formatting: { locale, timeZone: "UTC" }, nativeName: "Test", presentationMetadata: {} }, fallbackLocales: [], resourcesByLocale: { en: { common: en }, [locale]: { common } }, bundleVersions: { [locale]: { common: "test" } }, staleKeys: {} });
}

describe("AP-02 shared navigation and truthful states", () => {
  it.each(["en", "ru", "he"])("renders localized zero counts and a working unfinished destination in %s", async (locale) => {
    const i18n = runtime(locale);
    const router = createMemoryRouter([
      { path: `/${locale}/admin`, Component: () => <AdminOverview locale={locale} access={{ authorization: true, forum: true }} statistics={{ topics: 0, posts: 0, users: 0 }} /> },
      { path: `/${locale}/under-development`, Component: () => <UnderDevelopmentView locale={locale} requestedFeature="admin-forum" /> },
    ], { initialEntries: [`/${locale}/admin`] });
    render(<I18nextProvider i18n={i18n}><HeaderAuthProvider initialUser={{ id: "custom", name: "Custom", canAccessAdmin: true }}><RouterProvider router={router} /></HeaderAuthProvider></I18nextProvider>);
    const nav = screen.getByRole("navigation", { name: i18n.t("adminPanelHeading") });
    expect(within(nav).getByRole("link", { name: i18n.t("adminOverview") })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: i18n.t("adminRoles") })).toHaveAttribute("href", `/${locale}/admin/authorization`);
    expect(document.querySelectorAll(".global-admin-statistics dd")).toHaveLength(3);
    expect([...document.querySelectorAll(".global-admin-statistics dd")].map(e => e.textContent)).toEqual(["0", "0", "0"]);
    await userEvent.click(within(nav).getByRole("link", { name: new RegExp(i18n.t("adminForum")) }));
    expect(router.state.location.pathname).toBe(`/${locale}/under-development`);
    expect(screen.getByRole("status")).toHaveTextContent(i18n.t("adminForum"));
  });
  it("does not expose authorization destinations or fabricated zero counts to a forum-only actor", () => {
    const i18n = runtime("en");
    const router = createMemoryRouter([{ path: "*", Component: () => <AdminOverview locale="en" access={{ authorization: false, forum: true }} statistics={null} /> }]);
    render(<I18nextProvider i18n={i18n}><RouterProvider router={router} /></I18nextProvider>);
    expect(screen.queryByRole("link", { name: "Roles & permissions" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Users/ })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("temporarily unavailable");
    expect(document.querySelectorAll(".global-admin-statistics dd")).toHaveLength(0);
    expect(screen.queryByRole("link", { name: /^History/ })).not.toBeInTheDocument();
  });
});
