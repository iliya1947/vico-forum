import { useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { ForumShell, Breadcrumbs } from "../forum/ui";
import {adminForumPath} from "./forum-paths";
import {adminUsersPath} from "./users-paths";
import { settingsPath } from "../settings/paths";
import type { AdminAccess } from "./access";
import { useHeaderAuthUser } from "../auth/auth-controls";
import { adminEntryPath, type AdminEntryId } from "../settings/workspace-access";
import { recordAdminIndex, useAdministratorPreferences } from "../settings/administrator-preferences";

/** Navigation to placeholders grants no future section-read or mutation authority. */
export function adminDestinations(locale: string, access: AdminAccess) {
  const base = `/${encodeURIComponent(locale)}/admin`;
  return [
    { id: "overview", label: "adminOverview" as const, href: base, pending: false },
    ...(access.canReadForum ? [{ id: "forum", label: "adminForum" as const, href: adminForumPath(locale), pending: false }] : []),
    ...(access.canReadUsers ? [{ id: "users", label: "adminUsers" as const, href: adminUsersPath(locale), pending: false }]
      : access.canManageAuthorization ? [{ id: "users", label: "adminUsers" as const, href: `${base}/authorization#authorization-users-heading`, pending: false }] : []),
    ...(access.canManageMeasures ? [{ id: "measures", label: "measuresAdmin" as const,
      href: base + "/measures", pending: false }] : []),
    ...(access.canManageAuthorization ? [{ id: "roles", label: "adminRoles" as const, href: `${base}/authorization`, pending: false }] : []),
    ...(access.canReadHistory ? [{ id: "history", label: "adminHistory" as const, href: `${base}/history`, pending: false }] : []),
    { id: "settings", label: "adminSettings" as const, href: settingsPath(locale), pending: false },
  ];
}

export function AdminShell({locale,access,children,current="overview"}: {locale: string; access: AdminAccess; children: ReactNode; current?: "overview" | "history" | "roles" | "forum" | "users" | "measures"}) {
  const {t} = useTranslation("common");
  const authUser = useHeaderAuthUser();
  const accountId = access.actorId && authUser?.id === access.actorId ? access.actorId : null;
  const preferences = useAdministratorPreferences(accountId);
  const location = useLocation();
  useEffect(() => {
    const index = current as AdminEntryId;
    if (accountId && location.pathname === adminEntryPath(locale, index)) recordAdminIndex(accountId, index);
  }, [accountId, location.pathname, locale, current]);
  return <ForumShell locale={locale} variant="admin">
    <div className="admin-panel" data-density={preferences.density}>
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
