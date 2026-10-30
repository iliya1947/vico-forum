import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { ForumAdminOverviewCounts } from "../../db/forum-repository";
import { AdminShell, adminDestinations } from "./shell";
import type { AdminAccess } from "./access";

export function AdminOverview({locale,access,counts}: {locale: string; access: AdminAccess; counts: ForumAdminOverviewCounts | null}) {
  const {t}=useTranslation("common");
  const number=new Intl.NumberFormat(locale);
  return <AdminShell locale={locale} access={access}>
    <section className="admin-overview" aria-labelledby="admin-overview-heading">
      <h2 id="admin-overview-heading">{t("adminOverview")}</h2>
      <p>{t("adminOverviewIntro")}</p>
      <div className="admin-destinations">
        {adminDestinations(locale,access).filter(item=>item.id !== "overview").map(item=><Link
          key={item.id} to={item.href} className="admin-destination">
          <span>{t(item.label)}</span>
          {item.pending ? <span className="admin-panel-pending">{t("adminInDevelopment")}</span> : null}
        </Link>)}
      </div>
      <section className="admin-overview-stats" aria-labelledby="admin-stats-heading">
        <h2 id="admin-stats-heading">{t("adminStatsTitle")}</h2>
        {counts ? <dl className="admin-stat-list">
          {([
            ["adminCategoryCount",counts.categories], ["adminSectionCount",counts.sections],
            ["adminTopicCount",counts.topics], ["adminPostCount",counts.posts],
          ] as const).map(([label,value])=><div key={label}><dt>{t(label)}</dt><dd>{number.format(value)}</dd></div>)}
        </dl> : <div className="admin-stats-unavailable" role="status">
          <p>{t("adminStatsUnavailable")}</p><Link reloadDocument to={`/${encodeURIComponent(locale)}/admin`}>{t("adminRetry")}</Link>
        </div>}
      </section>
    </section>
  </AdminShell>;
}
