import type { ReactNode } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Breadcrumbs, ForumShell } from "../forum/ui";
import { settingsForumPath, settingsPath, settingsUserPath, settingsAdministratorPath, settingsAccountPath } from "./paths";
import { useHeaderAuthUser } from "../auth/auth-controls";

/** A shared Settings shell inside ForumShell, never another AdminShell. */
export function SettingsShell({
  locale, canViewForum, current, children,
}: {
  locale: string;
  canViewForum: boolean;
  current?: "forum" | "user" | "administrator" | "account";
  children: ReactNode;
}) {
  const { t } = useTranslation("common");
  const header = useHeaderAuthUser();
  const canViewAdministrator = !!(header?.canViewAdminPanel || header?.canViewModerationAttention);
  return <ForumShell locale={locale} variant="system">
    <div className="admin-panel settings-panel">
      <Breadcrumbs locale={locale} items={[
        { label: t("adminSettings"), ...(current ? { to: settingsPath(locale) } : {}) },
        ...(current === "forum" ? [{ label: t("settingsForumRoles") }] : []),
        ...(current === "administrator" ? [{ label: t("settingsAdministrator") }] : []),
        ...(current === "user" ? [{ label: t("settingsUser") }] : []),
        ...(current === "account" ? [{ label: t("settingsAccount") }] : []),
      ]} />
      <header className="admin-panel-heading">
        <h1>{t("adminSettings")}</h1>
      </header>
      <nav className="admin-panel-nav settings-panel-nav" aria-label={t("settingsNavigation")}>
        {canViewForum ? <Link to={settingsForumPath(locale)} aria-current={current === "forum" ? "page" : undefined}>
          {t("settingsForumRoles")}
        </Link> : null}
        {canViewAdministrator ? <Link to={settingsAdministratorPath(locale)}
          aria-current={current === "administrator" ? "page" : undefined}>
          {t("settingsAdministrator")}
        </Link> : null}
        <Link to={settingsUserPath(locale)} aria-current={current === "user" ? "page" : undefined}>
          {t("settingsUser")}
        </Link>
        <Link to={settingsAccountPath(locale)} aria-current={current === "account" ? "page" : undefined}>
          {t("settingsAccount")}
        </Link>
        <span className="settings-panel-pending-item">
          <span>{t("settingsPrivacy")}</span>
          <span className="admin-panel-pending">{t("adminInDevelopment")}</span>
        </span>
      </nav>
      {children}
    </div>
  </ForumShell>;
}
