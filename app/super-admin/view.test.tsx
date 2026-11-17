import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createInstance } from "i18next";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { russianCommonValues, hebrewCommonValues } from "../localization/manual-values";
import {SuperAdminMonitoringIndex} from "./view";
import {SuperAdminOverview} from "./overview";
import {OWNER_MONITORS} from "../../db/owner-monitor-catalog";
import type {OwnerOverview} from "../../db/owner-overview-catalog";
import { AdministrativeRoutingProvider } from "../administrative-routing/provider";
import { createAdministrativeRouting } from "../administrative-routing/addresses";
import { AdminShell } from "../admin/shell";
import { adminAccess } from "../admin/access";
import { ProfileView } from "../forum/profile-view";
import type { SystemOverview } from "../../db/owner-system-monitoring";

afterEach(cleanup);

const data: SystemOverview = {
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
const profile = { id: "owner", name: "Owner", image: null, joinedAt: "2026-09-01T00:00:00.000Z",
  bio: "", githubUrl: null, websiteUrl: null,
  role: { slug: "user", displayName: "User", isSystem: true }, messageCount: 0, bestAnswerCount: 0 };

function mount(locale: "en"|"ru"|"he", element: React.ReactNode, canViewSuperAdmin = true) {
  const en = Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([key, descriptor]) =>
    [key, descriptor.source]));
  const i18n = createInstance();
  void i18n.init({
    lng: locale, fallbackLng: "en", initAsync: false, defaultNS: "common",
    resources: { en: { common: en }, ru: { common: russianCommonValues }, he: { common: hebrewCommonValues } },
  });
  const router = createMemoryRouter([{ path: "*", element:
    <HeaderAuthProvider initialUser={{ id: "owner", name: "Owner", canViewSuperAdmin }}>
      {element}
    </HeaderAuthProvider> }], { initialEntries: [`/${locale}/super-admin`] });
  const view = render(<I18nextProvider i18n={i18n}><RouterProvider router={router}/></I18nextProvider>);
  return { ...view, router };
}
const titles = {
  en: { title: "Super-admin", serving: "Serving requests", database: "Available" },
  ru: { title: "Суперадмин", serving: "Обрабатывает запросы", database: "Доступна" },
  he: { title: "ניהול-על", serving: "מטפל בבקשות", database: "זמין" },
};

const overviewState:OwnerOverview={
 areas:[...Object.keys(OWNER_MONITORS).map(name=>({
  area:name as keyof typeof OWNER_MONITORS,status:"measured" as const,sources:[{id:name,connection:"web-database" as const,status:"measured" as const,code:"none" as const,observedAt:data.observedAt}],
  figures:name==="system"?data.monitors.map(m=>({monitorKey:m.key,field:m.key==="system.requests"?"count":"state",value:m.values[m.key==="system.requests"?"count":"state"]})):
    name==="accounts"?[{monitorKey:"accounts.users" as const,field:"total",value:"9007199254740993"}]:[]
 })),{area:"infrastructure",status:"placeholder",sources:[],figures:[]}],
 recent:{entries:[],next:null},recentUnavailable:false,samples:[],sampleCoverageUnavailable:false,recording:"available",readStatements:37,
};
describe("Owner-only UI/locale navigation and SA08 composition", () => {
  it.each(["en","ru","he"] as const)("renders all13 areas, honest Infrastructure and typed original-source History in %s",locale=>{
   const {container,router}=mount(locale,<SuperAdminOverview locale={locale} state={overviewState} viewerId="owner"/>);
   try{
    expect(screen.getByRole("heading",{level:1,name:titles[locale].title})).toBeInTheDocument();
    expect(container.querySelectorAll("[data-overview-area]")).toHaveLength(13);
    expect(container.querySelector('[data-overview-area="infrastructure"]')).toHaveAttribute("data-status","placeholder");
    expect(container.querySelector('[data-overview-area="infrastructure"] a[href*="history"]')).toBeNull();
    expect(container.querySelectorAll('a[href*="/monitoring/system/"][href$="/history"]')).toHaveLength(3);
    expect(container.querySelector('[data-overview-area="accounts"]')?.textContent).toContain(new Intl.NumberFormat(locale).format(9007199254740993n));
   }finally{router.dispose();}
  });
  it("keeps actual measurements and unavailable History distinct when recording fails",()=>{
   const {container,router}=mount("en",<SuperAdminOverview locale="en" state={{...overviewState,recording:"unavailable",recent:null,recentUnavailable:true}} viewerId="owner"/>);
   try{
    expect(container.querySelector('[data-overview-area="accounts"]')).toHaveTextContent(new Intl.NumberFormat("en").format(9007199254740993n));
    expect(screen.getAllByRole("status").length).toBe(2);
   }finally{router.dispose();}
  });
  it.each(["ru", "he"] as const)("shows pending areas as localized, not functional monitors in %s", locale => {
    const { container, router } = mount(locale, <SuperAdminMonitoringIndex locale={locale}/>);
    try {
      expect(container.querySelectorAll(".super-admin-pending-areas li")).toHaveLength(1);
      expect(container.querySelector(".super-admin-monitor")).toBeNull();
      const labels = locale === "ru" ? russianCommonValues : hebrewCommonValues;
      expect(container.querySelector(".super-admin-pending-areas")?.textContent).not.toContain(labels.superAdminAreaForum);
      expect(container.querySelector('a[href$="/super-admin/monitoring/forum"]')).toHaveTextContent(labels.superAdminAreaForum);
      expect(container.querySelector('a[href$="/super-admin/monitoring/background"]')).toHaveTextContent(labels.superAdminAreaBackground);
      expect(container.querySelectorAll('.admin-overview > a.admin-destination')).toHaveLength(12);
      expect(container.querySelector('a[href$="/super-admin/monitoring/security"]'))
        .toHaveTextContent(labels.superAdminAreaSecurity);
      expect(container.querySelector('a[href$="/super-admin/monitoring/accounts"]'))
        .toHaveTextContent(labels.superAdminAreaAccounts);
      expect(container.querySelector('a[href$="/super-admin/monitoring/system"]')).not.toBeNull();
    } finally { router.dispose(); }
  });

  it("offers the ordinary Admin entry only to the Owner, without changing Admin permissions", () => {
    const access = adminAccess(new Set(["admin.history.read"]));
    const owner = mount("en", <AdminShell locale="en" access={access}><p>Existing Admin content</p></AdminShell>);
    expect(owner.container.querySelector('.admin-panel-nav a[href="/en/super-admin"]')).not.toBeNull();
    owner.unmount(); owner.router.dispose();
    const manager = mount("en", <AdminShell locale="en" access={access}><p>Existing Admin content</p></AdminShell>, false);
    try { expect(manager.container.querySelector('.admin-panel-nav a[href="/en/super-admin"]')).toBeNull(); }
    finally { manager.router.dispose(); }
  });

  it("offers the Owner account/profile entry only on the signed-in Owner's own profile", () => {
    const own = mount("en", <ProfileView locale="en" profile={profile} isSelf canEditProfile={false}/>);
    expect(own.container.querySelector('a[href="/en/super-admin"]')).not.toBeNull();
    own.unmount(); own.router.dispose();
    const other = mount("en", <ProfileView locale="en" profile={{ ...profile, id: "someone-else" }}
      isSelf={false} canEditProfile={false}/>);
    expect(other.container.querySelector('a[href="/en/super-admin"]')).toBeNull();
    other.unmount(); other.router.dispose();
    const unbound = mount("en", <ProfileView locale="en" profile={profile} isSelf canEditProfile={false}/>, false);
    try { expect(unbound.container.querySelector('a[href="/en/super-admin"]')).toBeNull(); }
    finally { unbound.router.dispose(); }
  });
  it("routes both Owner entries and monitored History to an independent Owner origin", () => {
    const routing = createAdministrativeRouting(
      locale => `https://forum.invalid/${locale}/office`,
      locale => `https://owner.invalid/${locale}/control`,
    );
    const access = adminAccess(new Set(["admin.history.read"]));
    const admin = mount("en", <AdministrativeRoutingProvider routing={routing}>
      <AdminShell locale="en" access={access}><p>Admin body</p></AdminShell>
    </AdministrativeRoutingProvider>);
    expect(admin.container.querySelector('a[href="https://owner.invalid/en/control"]')).not.toBeNull();
    expect(admin.container.querySelector('a[href="https://forum.invalid/en/office/history"]')).not.toBeNull();
    admin.unmount(); admin.router.dispose();

    const own = mount("en", <AdministrativeRoutingProvider routing={routing}>
      <ProfileView locale="en" profile={profile} isSelf canEditProfile={false}/>
    </AdministrativeRoutingProvider>);
    expect(own.container.querySelector('a[href="https://owner.invalid/en/control"]')).not.toBeNull();
    own.unmount(); own.router.dispose();

    const monitoring = mount("en", <AdministrativeRoutingProvider routing={routing}>
      <SuperAdminOverview locale="en" state={overviewState} viewerId="owner"/>
    </AdministrativeRoutingProvider>);
    expect(monitoring.container.querySelector('nav.admin-panel-nav a[aria-current="page"]')?.getAttribute("href"))
      .toBe("https://owner.invalid/en/control");
    expect(monitoring.container.querySelectorAll('a[href^="https://owner.invalid/en/control/monitoring/system/"][href$="/history"]'))
      .toHaveLength(3);
    expect(monitoring.container.querySelector('a[href="https://owner.invalid/en/control/events"]')).not.toBeNull();
    expect(monitoring.container.querySelector('[data-overview-area="accounts"] a')).toHaveAttribute("href",
      "https://owner.invalid/en/control/monitoring/accounts");
    expect(monitoring.container.querySelector('[data-overview-area="security"] a')).toHaveAttribute("href",
      "https://owner.invalid/en/control/monitoring/security");
    expect(monitoring.container.querySelector('a[href="https://owner.invalid/en/control/infrastructure"]')).not.toBeNull();
    monitoring.unmount(); monitoring.router.dispose();
  });

});
