import { useAdministrativeRouting } from "../administrative-routing/provider";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ForumShell, Breadcrumbs } from "../forum/ui";
import {
  superAdminPath, superAdminMonitoringPath, superAdminSystemPath, superAdminEventLogPath,
  superAdminInfrastructurePath, superAdminMonitorHistoryPath,
} from "./paths";
import type { SystemOverview, SystemMonitorState, OwnerTimelinePage } from "../../db/owner-system-monitoring";
import type { SystemMonitorKey } from "../../db/owner-system-history";
import type { OwnerHistoryPage } from "../../db/owner-sa02-history";

const keys: Record<SystemMonitorKey, "superAdminRuntime" | "superAdminDatabase" | "superAdminRequests"> = {
  "system.runtime": "superAdminRuntime",
  "system.dependencies": "superAdminDatabase",
  "system.requests": "superAdminRequests",
};
const monitoringAreas = [
  "superAdminAreaAccounts", "superAdminAreaSecurity", "superAdminAreaForum", "superAdminAreaLocalization", "superAdminAreaNotifications", "superAdminAreaFiles", "superAdminAreaAdministration", "superAdminAreaModeration", "superAdminAreaBackground", "superAdminAreaData", "superAdminAreaIntegrations"
] as const;

/** One Owner-only shell, reused across routes; a visible link never grants access. */
export function SuperAdminShell({ locale, current, children }: {
  locale: string;
  current: "overview" | "monitoring" | "events" | "infrastructure";
  children: ReactNode;
}) {
  const { t } = useTranslation("common");
  const routing = useAdministrativeRouting();
  const entries = [
    { id: "overview", href: superAdminPath(locale,routing), label: t("superAdminOverview") },
    { id: "monitoring", href: superAdminMonitoringPath(locale,routing), label: t("superAdminMonitoring") },
    { id: "events", href: superAdminEventLogPath(locale,undefined,routing), label: t("superAdminEvents") },
    { id: "infrastructure", href: superAdminInfrastructurePath(locale,routing), label: t("superAdminInfrastructure") },
  ];
  return <ForumShell locale={locale} variant="admin">
    <div className="admin-panel super-admin-panel">
      <Breadcrumbs locale={locale} items={[{ label: t("superAdminTitle") }]} />
      <header className="admin-panel-heading">
        <p className="eyebrow">{t("superAdminOwnerOnly")}</p>
        <h1>{t("superAdminTitle")}</h1>
      </header>
      <nav className="admin-panel-nav" aria-label={t("superAdminNavigation")}>
        {entries.map(entry => <Link key={entry.id} to={entry.href}
          aria-current={current === entry.id ? "page" : undefined}>{entry.label}</Link>)}
      </nav>
      {children}
    </div>
  </ForumShell>;
}
function monitorText(state: SystemMonitorState, locale: string) {
  if (state.key === "system.runtime") return [
    { label: "superAdminRuntimeState" as const, value: state.values.state },
    { label: "superAdminRuntimeMode" as const, value: state.values.build },
  ];
  if (state.key === "system.dependencies") return [
    { label: "superAdminDatabaseState" as const, value: state.values.state },
    { label: "superAdminDatabaseVersion" as const, value: state.values.version },
  ];
  return [
    { label: "superAdminFailuresRecorded" as const, value: new Intl.NumberFormat(locale).format(Number(state.values.count)) },
  ];
}
export function SystemMonitorCards({locale,system}: {locale:string;system:SystemOverview}) {
  const {t} = useTranslation("common");
  const routing = useAdministrativeRouting();
  return <div className="super-admin-monitors" data-monitor-count={system.monitors.length}>
    {system.monitors.map(state=><article className="super-admin-monitor" key={state.key}>
      <h3>{t(keys[state.key])}</h3>
      <dl>{monitorText(state,locale).map(row=><div key={row.label}>
        <dt>{t(row.label)}</dt><dd dir="auto">{row.value==="serving" ? t("superAdminStateServing")
          : row.value==="available" ? t("superAdminStateAvailable")
          : row.value==="limited-coverage" ? t("superAdminStateLimitedCoverage")
          : String(row.value)}</dd>
      </div>)}</dl>
      <p className="super-admin-freshness">{t("superAdminObservedAt")}:
        <time dateTime={system.observedAt}>{formatTime(system.observedAt,locale)}</time>
      </p>
      <p className="super-admin-freshness">{t("superAdminCoverage")}:
        {state.coverageFrom ? <time dateTime={state.coverageFrom}>{formatTime(state.coverageFrom,locale)}</time>
          : t("superAdminNotRecorded")}
      </p>
      <nav aria-label={t("superAdminMonitorActions")}>
        <Link to={superAdminMonitorHistoryPath(locale,state.key,undefined,routing)}>{t("superAdminHistory")}</Link>
        <span aria-hidden="true"> · </span>
        <Link to={superAdminSystemPath(locale,routing)}>{t("superAdminRefresh")}</Link>
      </nav>
    </article>)}
  </div>;
}
export function formatTime(value: string,locale:string) {
  return new Intl.DateTimeFormat(locale,{dateStyle:"medium",timeStyle:"medium",timeZone:"UTC"}).format(new Date(value));
}
export function Timeline({ page, locale, path }: {page:OwnerTimelinePage|OwnerHistoryPage;locale:string;path:(before?:string)=>string}) {
  const {t} = useTranslation("common");
  return <section aria-labelledby="super-admin-timeline-heading">
    <h2 id="super-admin-timeline-heading">{t("superAdminHistory")}</h2>
    <p>{t("superAdminTimelineCoverage")}</p>
    {page.entries.length === 0 ? <p className="empty-state">{t("superAdminNoHistory")}</p>
      : <ol className="super-admin-timeline">{page.entries.map(entry=><li key={entry.origin+entry.id}>
        <h3 dir="auto">{eventLabel(entry,t)}</h3>
        <p><time dateTime={entry.occurredAt}>{formatTime(entry.occurredAt,locale)}</time>
          <span> · </span><span dir="auto">{entry.source}</span>
        </p>
        {entry.quality ? <p>{t("superAdminQuality")}: <bdi>{entry.quality==="measured" ? t("superAdminQualityMeasured") : entry.quality}</bdi></p> : null}
        <dl>{Object.entries(entry.values).map(([name,value])=><div key={name}>
          <dt dir="auto">{name}</dt><dd dir="auto">{String(value)}</dd>
        </div>)}</dl>
      </li>)}</ol>}
    <nav aria-label={t("historyPaging")} className="admin-history-paging">
      <Link to={path()}>{t("historyNewest")}</Link>
      {page.next ? <Link to={path(page.next)}>{t("historyOlder")}</Link> : null}
    </nav>
  </section>;
}
function eventLabel(entry:{origin:string;kind:string},t:(key:string)=>string) {
  if(entry.origin==="system-observation") return t("superAdminObservedEvent");
  if(entry.origin==="admin-history") return t("superAdminAdminEvent") + ": " + entry.kind;
  return entry.kind;
}
export function SuperAdminOverview({locale,system,recent}: {locale:string;system:SystemOverview;recent:OwnerTimelinePage|OwnerHistoryPage}) {
  const {t}=useTranslation("common");
  const routing = useAdministrativeRouting();
  return <SuperAdminShell locale={locale} current="overview">
    <section aria-labelledby="super-admin-overview-heading" className="admin-overview">
      <h2 id="super-admin-overview-heading">{t("superAdminOverview")}</h2>
      <p>{t("superAdminIntro")}</p>
      {system.recording==="unavailable" ? <p role="status">{t("superAdminRecordingUnavailable")}</p> : null}
      <SystemMonitorCards locale={locale} system={system}/>
      <p><Link to={superAdminSystemPath(locale,routing)}>{t("superAdminAllMonitors")}</Link></p>
      <h2>{t("superAdminEvents")}</h2>
      <ul className="super-admin-recent">{recent.entries.map(event=><li key={event.origin+event.id}>
        <bdi>{event.kind}</bdi> — <time dateTime={event.occurredAt}>{formatTime(event.occurredAt,locale)}</time>
      </li>)}</ul>
      {recent.entries.length===0 ? <p>{t("superAdminNoHistory")}</p>:null}
      <Link to={superAdminEventLogPath(locale,undefined,routing)}>{t("superAdminAllEvents")}</Link>
    </section>
  </SuperAdminShell>;
}
export function SuperAdminMonitoringIndex({locale}: {locale:string}) {
  const {t}=useTranslation("common");
  const routing = useAdministrativeRouting();
  return <SuperAdminShell locale={locale} current="monitoring">
    <section aria-labelledby="super-admin-monitoring-heading" className="admin-overview">
      <h2 id="super-admin-monitoring-heading">{t("superAdminMonitoring")}</h2>
      <Link className="admin-destination" to={superAdminSystemPath(locale,routing)}>{t("superAdminSystem")}</Link>
      <p>{t("superAdminAreasLater")}</p>
      <ul className="super-admin-pending-areas">
        {monitoringAreas.map(area=><li key={area}><bdi>{t(area)}</bdi> <span>{t("adminInDevelopment")}</span></li>)}
        <li><bdi>{t("superAdminInfrastructure")}</bdi> <span>{t("superAdminStage6")}</span></li>
      </ul>
    </section>
  </SuperAdminShell>;
}
