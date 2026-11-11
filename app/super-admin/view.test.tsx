import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createInstance } from "i18next";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { russianCommonValues, hebrewCommonValues } from "../localization/manual-values";
import { SuperAdminOverview, SuperAdminMonitoringIndex } from "./view";
import { AdministrativeRoutingProvider } from "../administrative-routing/provider";
import { createAdministrativeRouting } from "../administrative-routing/addresses";
import { AdminShell } from "../admin/shell";
import { adminAccess } from "../admin/access";
import { ProfileView } from "../forum/profile-view";
import type { SystemOverview, OwnerTimelinePage } from "../../db/owner-system-monitoring";
import type { Sa02CurrentState } from "../../db/owner-sa02-current";

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
const recent: OwnerTimelinePage = { entries: [], next: null };
const sa02:Sa02CurrentState = {
  observedAt:"2026-11-11T09:00:00.000Z",recording:"available",
  monitors:[
    {key:"accounts.users",source:"database",quality:"measured",coverageFrom:null,lastObservedAt:null,
      values:{total:"9007199254740993",created24h:"2"}},
    {key:"accounts.methods",source:"database",quality:"measured",coverageFrom:null,lastObservedAt:null,
      values:{passwordUsers:"3"}},
    {key:"accounts.sessions",source:"database",quality:"measured",coverageFrom:null,lastObservedAt:null,
      values:{active:"4"}},
    {key:"accounts.registration",source:"database",quality:"measured",coverageFrom:null,lastObservedAt:null,
      values:{googleEnabled:true,emailEnabled:false}},
    {key:"security.auth",source:"database",quality:"measured",coverageFrom:null,lastObservedAt:null,
      values:{attributedAttempts:"12",gapAttempts:"1"}},
    {key:"security.access",source:"database",quality:"measured",coverageFrom:null,lastObservedAt:null,
      values:{attributedAttempts:"8",gapAttempts:"0"}},
    {key:"security.attachments",source:"database",quality:"measured",coverageFrom:null,lastObservedAt:null,
      values:{total:"2"}},
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

describe("SA-01 Owner-only UI/locale navigation", () => {
  it.each(["en", "ru", "he"] as const)("renders one localized shell, actual System and 3 adjacent History links in %s", locale => {
    const { container, router } = mount(locale, <SuperAdminOverview locale={locale} system={data} recent={recent} sa02={sa02}/>);
    try {
      expect(screen.getByRole("heading", { level: 1, name: titles[locale].title })).toBeInTheDocument();
      expect(container.querySelectorAll("main")).toHaveLength(1);
      expect(container.querySelectorAll(".super-admin-monitor")).toHaveLength(3);
      expect(screen.getByText(titles[locale].serving)).toBeInTheDocument();
      expect(screen.getByText(titles[locale].database)).toBeInTheDocument();
      expect(container.querySelectorAll('a[href*="/monitoring/system/"][href$="/history"]')).toHaveLength(3);
      expect(container.querySelector('nav.admin-panel-nav a[aria-current="page"]')?.getAttribute("href"))
        .toBe(`/${locale}/super-admin`);
      expect(container.querySelector('a[href$="/super-admin/infrastructure"]')).not.toBeNull();
    } finally { router.dispose(); }
  });

  it.each(["en","ru","he"] as const)("renders compact Accounts/Security summaries in %s without duplicating seven monitors", locale=>{
    const {container,router}=mount(locale,
      <SuperAdminOverview locale={locale} system={data} recent={recent} sa02={sa02}/>);
    try {
      const cards=[...container.querySelectorAll(".super-admin-summary")];
      expect(cards).toHaveLength(2);
      expect(container.querySelectorAll(".super-admin-monitor")).toHaveLength(3);
      const values=locale==="ru"?russianCommonValues:locale==="he"?hebrewCommonValues:
        Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([key,d])=>[key,d.source]));
      expect(cards[0]).toHaveAttribute("data-sa02-summary","accounts");
      expect(cards[1]).toHaveAttribute("data-sa02-summary","security");
      expect(cards[0].textContent).toContain(values.superAdminAreaAccounts);
      expect(cards[1].textContent).toContain(values.superAdminAreaSecurity);
      expect(cards[0].textContent).toContain(new Intl.NumberFormat(locale).format(9007199254740993n));
      expect(cards[0].textContent).toContain(values.superAdminOverviewAccountsNote);
      expect(cards[1].textContent).toContain(values.superAdminOverviewSecurityNote);
      expect(cards[1].textContent).toContain(values.superAdminOverviewAuthGaps);
      expect(cards[1].textContent).toContain(values.superAdminOverviewAccessGaps);
      expect(cards[0].querySelector("a")).toHaveAttribute("href",`/${locale}/super-admin/monitoring/accounts`);
      expect(cards[1].querySelector("a")).toHaveAttribute("href",`/${locale}/super-admin/monitoring/security`);
      expect(cards[0].querySelector("a")).toHaveAttribute("aria-label",
        `${values.superAdminAreaAccounts}: ${values.superAdminOverviewDetails}`);
      expect(cards[1].querySelector("a")).toHaveAttribute("aria-label",
        `${values.superAdminAreaSecurity}: ${values.superAdminOverviewDetails}`);
      expect(container.querySelectorAll('a[href$="/super-admin/events"]')).toHaveLength(2);
      expect(container.querySelectorAll(".super-admin-timeline li")).toHaveLength(0);
    }finally{router.dispose();}
  });
  it("discloses unavailable observation recording without hiding current values",()=>{
    const {container,router}=mount("en",
      <SuperAdminOverview locale="en" system={data} recent={recent}
        sa02={{...sa02,recording:"unavailable"}}/>);
    try{
      expect(screen.getByRole("status")).toHaveTextContent("observation recording is unavailable");
      expect(container.querySelectorAll(".super-admin-summary")).toHaveLength(2);
      expect(container.querySelector('[data-sa02-summary="security"]')).toHaveTextContent("zero does not prove");
    }finally{router.dispose();}
  });

  it.each(["ru", "he"] as const)("shows pending areas as localized, not functional monitors in %s", locale => {
    const { container, router } = mount(locale, <SuperAdminMonitoringIndex locale={locale}/>);
    try {
      expect(container.querySelectorAll(".super-admin-pending-areas li")).toHaveLength(10);
      expect(container.querySelector(".super-admin-monitor")).toBeNull();
      const labels = locale === "ru" ? russianCommonValues : hebrewCommonValues;
      expect(container.querySelector(".super-admin-pending-areas")?.textContent).toContain(labels.superAdminAreaForum);
      expect(container.querySelectorAll('.admin-overview > a.admin-destination')).toHaveLength(3);
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
    const own = mount("en", <ProfileView locale="en" profile={profile} isOwner canEditProfile={false}/>);
    expect(own.container.querySelector('a[href="/en/super-admin"]')).not.toBeNull();
    own.unmount(); own.router.dispose();
    const other = mount("en", <ProfileView locale="en" profile={{ ...profile, id: "someone-else" }}
      isSelf={false} canEditProfile={false}/>);
    expect(other.container.querySelector('a[href="/en/super-admin"]')).toBeNull();
    other.unmount(); other.router.dispose();
    const unbound = mount("en", <ProfileView locale="en" profile={profile} isOwner canEditProfile={false}/>, false);
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
      <ProfileView locale="en" profile={profile} isOwner canEditProfile={false}/>
    </AdministrativeRoutingProvider>);
    expect(own.container.querySelector('a[href="https://owner.invalid/en/control"]')).not.toBeNull();
    own.unmount(); own.router.dispose();

    const monitoring = mount("en", <AdministrativeRoutingProvider routing={routing}>
      <SuperAdminOverview locale="en" system={data} recent={recent} sa02={sa02}/>
    </AdministrativeRoutingProvider>);
    expect(monitoring.container.querySelector('nav.admin-panel-nav a[aria-current="page"]')?.getAttribute("href"))
      .toBe("https://owner.invalid/en/control");
    expect(monitoring.container.querySelectorAll('a[href^="https://owner.invalid/en/control/monitoring/system/"][href$="/history"]'))
      .toHaveLength(3);
    expect(monitoring.container.querySelector('a[href="https://owner.invalid/en/control/events"]')).not.toBeNull();
    expect(monitoring.container.querySelector('[data-sa02-summary="accounts"] a')).toHaveAttribute("href",
      "https://owner.invalid/en/control/monitoring/accounts");
    expect(monitoring.container.querySelector('[data-sa02-summary="security"] a')).toHaveAttribute("href",
      "https://owner.invalid/en/control/monitoring/security");
    expect(monitoring.container.querySelector('a[href="https://owner.invalid/en/control/infrastructure"]')).not.toBeNull();
    monitoring.unmount(); monitoring.router.dispose();
  });

});
