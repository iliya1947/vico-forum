import { useAdministrativeRouting } from "../administrative-routing/provider";
import { useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { ForumShell, Breadcrumbs } from "../forum/ui";
import {adminForumPath} from "./forum-paths";
import {adminUsersPath} from "./users-paths";
import { settingsPath } from "../settings/paths";
import { superAdminPath } from "../super-admin/paths";
import type { AdminAccess } from "./access";
import { useHeaderAuthUser } from "../auth/auth-controls";
import { adminEntryPath, type AdminEntryId } from "../settings/workspace-access";
import { recordAdminIndex, useAdministratorPreferences } from "../settings/administrator-preferences";
import { defaultAdministrativeRouting, type AdministrativeRouting } from "../administrative-routing/addresses";

/** Navigation to placeholders grants no future section-read or mutation authority. */
export function adminDestinations(locale: string, access: AdminAccess, routing: AdministrativeRouting = defaultAdministrativeRouting) {
  const base = routing.admin.overview(locale);
  return [
    { id: "overview", label: "adminOverview" as const, href: base, pending: false },
    ...(access.canReadForum ? [{ id: "forum", label: "adminForum" as const, href: adminForumPath(locale,routing), pending: false }] : []),
    ...(access.canReadUsers ? [{ id: "users", label: "adminUsers" as const, href: adminUsersPath(locale,routing), pending: false }]
      : access.canManageAuthorization ? [{ id: "users", label: "adminUsers" as const, href: routing.admin.authorization(locale) + "#authorization-users-heading", pending: false }] : []),
    ...(access.canManageMeasures ? [{ id: "measures", label: "measuresAdmin" as const,
      href: routing.admin.measures(locale), pending: false }] : []),
    ...(access.canManageAuthorization ? [{ id: "roles", label: "adminRoles" as const, href: routing.admin.authorization(locale), pending: false }] : []),
    ...(access.canReadHistory ? [{ id: "history", label: "adminHistory" as const, href: routing.admin.history(locale), pending: false }] : []),
    { id: "settings", label: "adminSettings" as const, href: settingsPath(locale), pending: false },
  ];
}

export function AdminShell({locale,access,children,current="overview"}: {locale: string; access: AdminAccess; children: ReactNode; current?: "overview" | "history" | "roles" | "forum" | "users" | "measures"}) {
  const {t} = useTranslation("common");
  const authUser = useHeaderAuthUser();
  const accountId = access.actorId && authUser?.id === access.actorId ? access.actorId : null;
  const preferences = useAdministratorPreferences(accountId);
  const location = useLocation();
  const routing = useAdministrativeRouting();
  useEffect(() => {
    const index = current as AdminEntryId;
    if (accountId && location.pathname === adminEntryPath(locale, index, routing)) recordAdminIndex(accountId, index);
  }, [accountId, location.pathname, locale, current, routing]);
  return <ForumShell locale={locale} variant="admin">
    <div className="admin-panel" data-density={preferences.density}>
      <Breadcrumbs locale={locale} items={[{label:t("adminPanelTitle")}]} />
      <header className="admin-panel-heading"><h1>{t("adminPanelTitle")}</h1></header>
      <nav className="admin-panel-nav" aria-label={t("adminNavigation")}>
        {adminDestinations(locale,access,routing).map(item=><Link key={item.id} to={item.href}
          aria-current={item.id === current ? "page" : undefined}>
          <span>{t(item.label)}</span>
          {item.pending ? <span className="admin-panel-pending">{t("adminInDevelopment")}</span> : null}
        </Link>)}
        {authUser?.canViewSuperAdmin ? <Link to={superAdminPath(locale,routing)}>{t("superAdminTitle")}</Link> : null}
      </nav>
      {children}
    </div>
  </ForumShell>;
}
