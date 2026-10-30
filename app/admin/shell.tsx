import type { ReactNode } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ForumShell, Breadcrumbs } from "../forum/ui";
import { underDevelopmentPath } from "../forum/paths";
import type { AdminAccess } from "./access";

/** Navigation to placeholders grants no future section-read or mutation authority. */
export function adminDestinations(locale: string, access: AdminAccess) {
  const base = `/${encodeURIComponent(locale)}/admin`;
  return [
    { id: "overview", label: "adminOverview" as const, href: base, pending: false },
    ...(access.canReadForum ? [{ id: "forum", label: "adminForum" as const, href: underDevelopmentPath(locale,"admin-forum"), pending: true }] : []),
    ...(access.canManageAuthorization ? [
      { id: "users", label: "adminUsers" as const, href: underDevelopmentPath(locale,"admin-users"), pending: true },
      { id: "roles", label: "adminRoles" as const, href: `${base}/authorization`, pending: false },
    ] : []),
    ...(access.canReadHistory ? [{ id: "history", label: "adminHistory" as const, href: `${base}/history`, pending: false }] : []),
    { id: "settings", label: "adminSettings" as const, href: underDevelopmentPath(locale,"admin-settings"), pending: true },
  ];
}

export function AdminShell({locale,access,children,current="overview"}: {locale: string; access: AdminAccess; children: ReactNode; current?: "overview" | "history" | "roles"}) {
  const {t} = useTranslation("common");
  return <ForumShell locale={locale} variant="admin">
    <div className="admin-panel">
      <Breadcrumbs locale={locale} items={[{label:t("adminPanelTitle")}]} />
      <header className="admin-panel-heading"><h1>{t("adminPanelTitle")}</h1></header>
      <nav className="admin-panel-nav" aria-label={t("adminNavigation")}>
        {adminDestinations(locale,access).map(item=><Link key={item.id} to={item.href}
          aria-current={item.id === current ? "page" : undefined}>
          <span>{t(item.label)}</span>
          {item.pending ? <span className="admin-panel-pending">{t("adminInDevelopment")}</span> : null}
        </Link>)}
      </nav>
      {children}
    </div>
  </ForumShell>;
}
