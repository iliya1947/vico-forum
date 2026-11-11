import { useAdministrativeRouting } from "../administrative-routing/provider";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ForumShell, Breadcrumbs } from "../forum/ui";
import {
  superAdminPath, superAdminMonitoringPath, superAdminSystemPath, superAdminEventLogPath,
  superAdminInfrastructurePath, superAdminMonitorHistoryPath, superAdminAccountsPath,
  superAdminSecurityPath,
} from "./paths";
import type { SystemOverview, SystemMonitorState, OwnerTimelinePage } from "../../db/owner-system-monitoring";
import type { SystemMonitorKey } from "../../db/owner-system-history";
import type { OwnerHistoryPage } from "../../db/owner-sa02-history";
import type { Sa02CurrentState } from "../../db/owner-sa02-current";
import { HistoryEntry } from "./history-entry";

const keys: Record<SystemMonitorKey, "superAdminRuntime" | "superAdminDatabase" | "superAdminRequests"> = {
  "system.runtime": "superAdminRuntime",
  "system.dependencies": "superAdminDatabase",
  "system.requests": "superAdminRequests",
};
const monitoringAreas = [
  "superAdminAreaForum", "superAdminAreaLocalization", "superAdminAreaNotifications", "superAdminAreaFiles", "superAdminAreaAdministration", "superAdminAreaModeration", "superAdminAreaBackground", "superAdminAreaData", "superAdminAreaIntegrations"
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
      : <ol className="super-admin-timeline">{page.entries.map(entry=>
        <HistoryEntry key={entry.origin+":"+entry.id} entry={entry} locale={locale}/>)}</ol>}
    <nav aria-label={t("historyPaging")} className="admin-history-paging">
      <Link to={path()}>{t("historyNewest")}</Link>
      {page.next ? <Link to={path(page.next)}>{t("historyOlder")}</Link> : null}
    </nav>
  </section>;
}
const sa02OverviewAreas = [
  {
    area: "accounts", title: "superAdminAreaAccounts",
    note: "superAdminOverviewAccountsNote",
    fields: [
      ["accounts.users", "total", "superAdminSa02TotalUsers"],
      ["accounts.users", "created24h", "superAdminSa02Created24h"],
      ["accounts.sessions", "active", "superAdminSa02ActiveSessions"],
    ],
  },
  {
    area: "security", title: "superAdminAreaSecurity",
    note: "superAdminOverviewSecurityNote",
    fields: [
      ["security.auth", "attributedAttempts", "superAdminOverviewAuthAttempts"],
      ["security.access", "attributedAttempts", "superAdminOverviewAccessAttempts"],
      ["security.auth", "gapAttempts", "superAdminOverviewAuthGaps"],
      ["security.access", "gapAttempts", "superAdminOverviewAccessGaps"],
    ],
  },
] as const;

/** Compact current-state summary only; source and history remain the same SA02 readers. */
function Sa02OverviewSummaries({locale,state}: {locale:string;state:Sa02CurrentState}) {
  const {t}=useTranslation("common");
  const routing=useAdministrativeRouting();
  return <>
    {state.recording==="unavailable"
      ? <p role="status">{t("superAdminRecordingUnavailable")}</p> : null}
    <div className="super-admin-summaries">
      {sa02OverviewAreas.map(area=><article className="super-admin-summary" key={area.area}
        data-sa02-summary={area.area}>
        <h3>{t(area.title)}</h3>
        <dl>{area.fields.map(([monitor,field,label])=>{
          const value=state.monitors.find(item=>item.key===monitor)?.values[field];
          const text=value===null || value===undefined
            ? t("superAdminNotRecorded")
            : typeof value==="string" && /^[0-9]+$/.test(value)
              ? new Intl.NumberFormat(locale).format(BigInt(value)) : String(value);
          return <div key={monitor+"."+field}>
            <dt>{t(label)}</dt><dd><bdi>{text}</bdi></dd>
          </div>;
        })}</dl>
        <p className="super-admin-freshness">{t("superAdminObservedAt")}:
          <time dateTime={state.observedAt}>{formatTime(state.observedAt,locale)}</time>
        </p>
        <p>{t(area.note)}</p>
        <Link to={area.area==="accounts" ? superAdminAccountsPath(locale,routing)
          : superAdminSecurityPath(locale,routing)}
          aria-label={`${t(area.title)}: ${t("superAdminOverviewDetails")}`}>
          {t("superAdminOverviewDetails")}</Link>
      </article>)}
    </div>
  </>;
}
export function SuperAdminOverview({locale,system,recent,sa02}: {
  locale:string;system:SystemOverview;recent:OwnerTimelinePage|OwnerHistoryPage;sa02:Sa02CurrentState;
}) {
  const {t}=useTranslation("common");
  const routing = useAdministrativeRouting();
  return <SuperAdminShell locale={locale} current="overview">
    <section aria-labelledby="super-admin-overview-heading" className="admin-overview">
      <h2 id="super-admin-overview-heading">{t("superAdminOverview")}</h2>
      <p>{t("superAdminIntro")}</p>
      {system.recording==="unavailable" ? <p role="status">{t("superAdminRecordingUnavailable")}</p> : null}
      <SystemMonitorCards locale={locale} system={system}/>
      <p><Link to={superAdminSystemPath(locale,routing)}>{t("superAdminAllMonitors")}</Link></p>
      <Sa02OverviewSummaries locale={locale} state={sa02}/>
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
      <Link className="admin-destination" to={superAdminAccountsPath(locale,routing)}>{t("superAdminAreaAccounts")}</Link>
      <Link className="admin-destination" to={superAdminSecurityPath(locale,routing)}>{t("superAdminAreaSecurity")}</Link>
      <p>{t("superAdminAreasLater")}</p>
      <ul className="super-admin-pending-areas">
        {monitoringAreas.map(area=><li key={area}><bdi>{t(area)}</bdi> <span>{t("adminInDevelopment")}</span></li>)}
        <li><bdi>{t("superAdminInfrastructure")}</bdi> <span>{t("superAdminStage6")}</span></li>
      </ul>
    </section>
  </SuperAdminShell>;
}
