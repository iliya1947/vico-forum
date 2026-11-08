import type { ReactNode } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Breadcrumbs, ForumShell } from "../forum/ui";
import { settingsAdministratorPath, settingsForumPath, settingsPath, settingsUserPath } from "./paths";

/** A shared Settings shell inside ForumShell, never another AdminShell. */
export function SettingsShell({
  locale, canViewForum, canViewAdministrator = false, current, children,
}: {
  locale: string;
  canViewForum: boolean;
  canViewAdministrator?: boolean;
  current?: "forum" | "user" | "administrator";
  children: ReactNode;
}) {
  const { t } = useTranslation("common");
  return <ForumShell locale={locale} variant="system">
    <div className="admin-panel settings-panel">
      <Breadcrumbs locale={locale} items={[
        { label: t("adminSettings"), ...(current ? { to: settingsPath(locale) } : {}) },
        ...(current === "forum" ? [{ label: t("settingsForumRoles") }] : []),
        ...(current === "user" ? [{ label: t("settingsUser") }] : []),
        ...(current === "administrator" ? [{ label: t("settingsAdministrator") }] : []),
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
        {(["settingsAccount", "settingsPrivacy"] as const).map(key =>
          <span className="settings-panel-pending-item" key={key}>
            <span>{t(key)}</span>
            <span className="admin-panel-pending">{t("adminInDevelopment")}</span>
          </span>)}
      </nav>
      {children}
    </div>
  </ForumShell>;
}
