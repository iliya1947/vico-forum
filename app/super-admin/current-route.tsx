import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useAdministrativeRouting } from "../administrative-routing/provider";
import { SA02_MONITORS, type Sa02Area, type Sa02MonitorKey } from "../../db/owner-sa02-catalog";
import type { SuperAdminMonitorScope } from "../administrative-routing/addresses";
import { superAdminAreaMonitorHistoryPath } from "./paths";
import type { Sa02CurrentState } from "../../db/owner-sa02-current";
import { SuperAdminShell, formatTime } from "./view";
/** The accepted catalog alone decides the area of a monitor History link. */
function monitorScope(key:Sa02MonitorKey):SuperAdminMonitorScope {
  if ((SA02_MONITORS.accounts as readonly string[]).includes(key)) {
    return {area:"accounts",monitorKey:key as (typeof SA02_MONITORS.accounts)[number]};
  }
  return {area:"security",monitorKey:key as (typeof SA02_MONITORS.security)[number]};
}
/** Current-page presentation; semantic labels and contextual actions follow in D2.2. */
export function SuperAdminSa02Current({locale,area,state}:{
  locale:string;area:Sa02Area;state:Sa02CurrentState
}){
  const {t}=useTranslation("common");
  const routing=useAdministrativeRouting();
  return <SuperAdminShell locale={locale} current="monitoring">
    <section className="admin-overview" aria-labelledby="super-admin-sa02-heading">
      <h2 id="super-admin-sa02-heading">{t(area==="accounts"?"superAdminAreaAccounts":"superAdminAreaSecurity")}</h2>
      {state.recording==="unavailable" ? <p role="status">{t("superAdminRecordingUnavailable")}</p> : null}
      <div className="super-admin-monitors" data-monitor-count={state.monitors.length}>
        {state.monitors.map(m=><article className="super-admin-monitor" key={m.key}>
          <h3><bdi>{m.key}</bdi></h3>
          <dl>{Object.entries(m.values).map(([key,value])=><div key={key}>
            <dt><bdi>{key}</bdi></dt>
            <dd><bdi>{value===null ? "—" : String(value)}</bdi></dd>
          </div>)}</dl>
          <p className="super-admin-freshness">{t("superAdminObservedAt")}:
            <time dateTime={state.observedAt}>{formatTime(state.observedAt,locale)}</time>
          </p>
          <p className="super-admin-freshness">{t("superAdminCoverage")}:
            {m.coverageFrom
              ? <time dateTime={m.coverageFrom}>{formatTime(m.coverageFrom,locale)}</time>
              : t("superAdminNotRecorded")}
          </p>
          <nav aria-label={t("superAdminMonitorActions")}>
            <Link to={superAdminAreaMonitorHistoryPath(locale,monitorScope(m.key),undefined,routing)}>{t("superAdminHistory")}</Link>
            <span aria-hidden="true"> · </span>
            <Link to={routing.superAdmin.monitoring(locale)}>{t("superAdminMonitoring")}</Link>
          </nav>
        </article>)}
      </div>
    </section>
  </SuperAdminShell>;
}
