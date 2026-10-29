import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import type { ForumStatistics } from "../../db/forum-repository";
import type { AdminAccess } from "./access";
import { ForumShell } from "../forum/ui";
import { underDevelopmentPath } from "../forum/paths";

export function AdminShell({ locale, access, children }: {
  locale: string; access: AdminAccess; children: ReactNode;
}) {
  const { t } = useTranslation("common");
  const root = `/${encodeURIComponent(locale)}/admin`;
  return <ForumShell locale={locale} variant="admin">
    <div className="global-admin-layout">
      <nav className="global-admin-nav" aria-label={t("adminPanelHeading")}>
        <Link to={root} aria-current="page">{t("adminOverview")}</Link>
        {access.forum ? <Link to={underDevelopmentPath(locale, "admin-forum")}>
          {t("adminForum")} <small>{t("underDevelopmentHeading")}</small>
        </Link> : null}
        {access.authorization ? <>
          <Link to={underDevelopmentPath(locale, "admin-users")}>{t("adminUsers")} <small>{t("underDevelopmentHeading")}</small></Link>
          <Link to={`${root}/authorization`}>{t("adminRoles")}</Link>
        </> : null}
        <span className="global-admin-unfinished">{t("adminHistory")} <small>{t("underDevelopmentHeading")}</small></span>
        <Link to={underDevelopmentPath(locale, "admin-settings")}>{t("adminSettings")} <small>{t("underDevelopmentHeading")}</small></Link>
      </nav>
      <div className="global-admin-content">{children}</div>
    </div>
  </ForumShell>;
}

export function AdminOverview({ locale, access, statistics }: {
  locale: string; access: AdminAccess; statistics: ForumStatistics | null;
}) {
  const { t } = useTranslation("common");
  const format = new Intl.NumberFormat(locale);
  return <AdminShell locale={locale} access={access}>
    <header className="admin-heading">
      <div><p className="eyebrow">{t("adminPanelHeading")}</p><h1>{t("adminOverview")}</h1></div>
    </header>
    <section className="admin-section" aria-labelledby="admin-statistics-heading">
      <h2 id="admin-statistics-heading">{t("forumStatisticsHeading")}</h2>
      {statistics === null ? <p role="status">{t("adminStatisticsUnavailable")}</p> :
        <dl className="global-admin-statistics">
          {(["topics", "posts", "users"] as const).map((key) => <div key={key}>
            <dt>{t(key === "topics" ? "adminTopics" : key === "posts" ? "adminPosts" : "adminUsers")}</dt>
            <dd>{format.format(statistics[key])}</dd>
          </div>)}
        </dl>}
    </section>
    <p className="global-admin-intro">{t("adminOverviewHint")}</p>
  </AdminShell>;
}
