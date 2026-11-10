import { describe, expect, it } from "vitest";
import { RouterContextProvider } from "react-router";
import { createAdministrativeRouting, defaultAdministrativeRouting } from "./addresses";
import { administrativeRoutingContext, administrativeRoutingForRequest } from "./request-context";
import { adminForumPath, adminCategoryPath, adminSectionPath, adminTopicPath, adminBrowsePath } from "../admin/forum-paths";
import { adminUsersPath, adminUserPath, adminUsersBrowsePath } from "../admin/users-paths";
import { historyPagePath } from "../admin/history-path";
import { adminMeasuresPath, adminMeasurePath } from "../measures/paths";
import { canonicalAuthorizationPath } from "../settings/paths";
import { adminEntryPath } from "../settings/workspace-access";
import { superAdminPath, superAdminMonitoringPath, superAdminSystemPath,
  superAdminEventLogPath, superAdminMonitorHistoryPath, superAdminInfrastructurePath } from "../super-admin/paths";
import { loader as underDevelopmentLoader } from "../routes/under-development";

const alternate = createAdministrativeRouting(
  locale => `https://forum.invalid/${encodeURIComponent(locale)}/office`,
  locale => `https://owner.invalid/${encodeURIComponent(locale)}/control`,
);

describe("independent typed administrative destination families", () => {
  it("preserves all 17 current exact public default routes and canonical paths", () => {
    const routing = defaultAdministrativeRouting;
    const a = routing.admin, o = routing.superAdmin;
    expect([
      a.overview("en"), a.forum("en"), a.category("en", "id"), a.section("en", "id"),
      a.topic("en", "id"), a.users("en"), a.user("en", "id"),
      a.measures("en"), a.measure("en", "id"), a.history("en"), a.authorization("en"),
    ]).toEqual([
      "/en/admin", "/en/admin/forum", "/en/admin/forum/categories/id",
      "/en/admin/forum/sections/id", "/en/admin/forum/topics/id", "/en/admin/users",
      "/en/admin/users/id", "/en/admin/measures", "/en/admin/measures/id",
      "/en/admin/history", "/en/admin/authorization",
    ]);
    expect([
      o.overview("en"), o.monitoring("en"), o.system("en"),
      o.monitorHistory("en", "system.runtime"), o.events("en"), o.infrastructure("en"),
    ]).toEqual([
      "/en/super-admin", "/en/super-admin/monitoring", "/en/super-admin/monitoring/system",
      "/en/super-admin/monitoring/system/system.runtime/history", "/en/super-admin/events",
      "/en/super-admin/infrastructure",
    ]);
  });

  it("retains locale/id/query/cursor/hash encoding through existing delegating wrappers", () => {
    const id = "a b/עברית";
    expect(adminForumPath("he")).toBe("/he/admin/forum");
    expect(adminCategoryPath("he", id)).toBe("/he/admin/forum/categories/a%20b%2F%D7%A2%D7%91%D7%A8%D7%99%D7%AA");
    expect(adminSectionPath("en", "a/b")).toBe("/en/admin/forum/sections/a%2Fb");
    expect(adminTopicPath("ru", "a/b")).toBe("/ru/admin/forum/topics/a%2Fb");
    expect(adminBrowsePath(adminCategoryPath("en", "a/b"), {search: "hello world", after: "x/y"}))
      .toBe("/en/admin/forum/categories/a%2Fb?q=hello+world&after=x%2Fy");
    expect(adminUsersPath("en")).toBe("/en/admin/users");
    expect(adminUserPath("en", "a/b")).toBe("/en/admin/users/a%2Fb");
    expect(adminUsersBrowsePath("en", {search:"hello world",after:"x/y"}))
      .toBe("/en/admin/users?q=hello+world&after=x%2Fy");
    expect(adminMeasuresPath("en")).toBe("/en/admin/measures");
    expect(adminMeasurePath("en", "a/b")).toBe("/en/admin/measures/a%2Fb");
    expect(historyPagePath("en")).toBe("/en/admin/history");
    expect(historyPagePath("en", {position:"9223372036854775807"} as never))
      .toBe("/en/admin/history?before=9223372036854775807");
    expect(canonicalAuthorizationPath("he")).toBe("/he/admin/authorization");
    expect(adminEntryPath("he","roles")).toBe("/he/admin/authorization");
    const cursor="2026-11-09T18:00:00.000Z~system-event~123e4567-e89b-42d3-a456-426614174000";
    expect(superAdminMonitorHistoryPath("he","system.runtime",cursor))
      .toBe("/he/super-admin/monitoring/system/system.runtime/history?before="+encodeURIComponent(cursor));
    expect(superAdminEventLogPath("en",cursor)).toBe("/en/super-admin/events?before="+encodeURIComponent(cursor));
    expect(superAdminInfrastructurePath("en")).toBe("/en/super-admin/infrastructure");
    expect(superAdminMonitoringPath("ru")).toBe("/ru/super-admin/monitoring");
    expect(superAdminSystemPath("ru")).toBe("/ru/super-admin/monitoring/system");
    expect(superAdminPath("en")).toBe("/en/super-admin");
  });

  it("resolves two independent origins without forcing a shared base or stripping one", () => {
    expect(adminForumPath("en",alternate)).toBe("https://forum.invalid/en/office/forum");
    expect(adminUserPath("en","a/b",alternate)).toBe("https://forum.invalid/en/office/users/a%2Fb");
    expect(adminMeasuresPath("en",alternate)).toBe("https://forum.invalid/en/office/measures");
    expect(adminMeasurePath("en","a/b",alternate)).toBe("https://forum.invalid/en/office/measures/a%2Fb");
    expect(canonicalAuthorizationPath("en",alternate)).toBe("https://forum.invalid/en/office/authorization");
    expect(adminEntryPath("en","history",alternate)).toBe("https://forum.invalid/en/office/history");
    expect(superAdminPath("en",alternate)).toBe("https://owner.invalid/en/control");
    expect(superAdminMonitorHistoryPath("en","system.dependencies","cursor",alternate))
      .toBe("https://owner.invalid/en/control/monitoring/system/system.dependencies/history?before=cursor");
    expect(superAdminEventLogPath("en","cursor",alternate))
      .toBe("https://owner.invalid/en/control/events?before=cursor");
  });

  it("uses request-scoped server routing and retains the static default in another request", () => {
    const first = new RouterContextProvider();
    const second = new RouterContextProvider();
    expect(administrativeRoutingForRequest(first)).toBe(defaultAdministrativeRouting);
    first.set(administrativeRoutingContext,alternate);
    expect(administrativeRoutingForRequest(first).admin.authorization("en"))
      .toBe("https://forum.invalid/en/office/authorization");
    expect(administrativeRoutingForRequest(first).superAdmin.events("en"))
      .toBe("https://owner.invalid/en/control/events");
    expect(administrativeRoutingForRequest(second)).toBe(defaultAdministrativeRouting);
  });

  it("uses the injected server accessor for the real legacy Admin redirect", () => {
    const context=new RouterContextProvider();
    context.set(administrativeRoutingContext,alternate);
    const result=underDevelopmentLoader({
      request: new Request("https://forum.invalid/en/under-development?feature=admin-forum"),
      params:{locale:"en"},context,
    });
    expect(result).toBeInstanceOf(Response);
    if(result instanceof Response) expect(result.headers.get("Location"))
      .toBe("https://forum.invalid/en/office/forum");
  });
});
