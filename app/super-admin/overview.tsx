import {Link} from "react-router";
import {useTranslation} from "react-i18next";
import type {UiKey} from "../localization/catalog";
import type {OwnerOverview} from "../../db/owner-overview-catalog";
import {OWNER_MONITORS,type OwnerMonitorArea} from "../../db/owner-monitor-catalog";
import type {SuperAdminMonitorScope} from "../administrative-routing/addresses";
import {useAdministrativeRouting} from "../administrative-routing/provider";
import {useOwnerSnapshot} from "./owner-snapshot";
import {SuperAdminShell,Timeline,formatTime} from "./view";
import {ownerAreaLabels,ownerAreaPath} from "./area-navigation";
import {withOwnerHistoryFilters} from "./history-query-links";
import {dataLabels} from "./data-labels";
import {nativeLabels} from "./native-labels";
import {taskLabels} from "./task-labels";
import {fileLabels} from "./file-labels";
import {localizationLabels} from "./localization-labels";
import {integrationLabels} from "./integration-labels";
const special:Record<string,UiKey<"common">>={
  "accounts.users:total":"superAdminSa02TotalUsers","accounts.users:deactivatedUsers":"superAdminDeactivatedUsers","accounts.users:retentionPendingUsers":"superAdminRetentionPendingUsers",
  "accounts.methods:googleUsers":"superAdminSa02GoogleUsers","accounts.sessions:active":"superAdminSa02ActiveSessions",
  "security.auth:attributedAttempts":"superAdminOverviewAuthAttempts","security.access:attributedAttempts":"superAdminOverviewAccessAttempts",
  "security.auth:gapAttempts":"superAdminOverviewAuthGaps","security.access:gapAttempts":"superAdminOverviewAccessGaps","security.attachments:total":"superAdminSa02TotalEvidence",
  "system.runtime:state":"superAdminRuntimeState","system.dependencies:state":"superAdminDatabaseState","system.dependencies:version":"superAdminDatabaseVersion","system.requests:count":"superAdminFailuresRecorded",
  "data.retention:retainedOwnerEvents":"sa08RetainedOwnerEvents","data.retention:retainedObservations":"sa08RetainedObservations","data.retention:minimumBoundaryFuture":"superAdminRetentionPendingUsers",
  "integrations.storage:retainedSlots":"sa08RetainedSlots",
  "integrations.database:actualWebState":"sa07IState","integrations.database:actualWebVersion":"sa07IVersion",
  "integrations.authentication:linkedGoogleUsers":"superAdminSa02GoogleUsers","integrations.authentication:genericActiveSessions":"superAdminSa02ActiveSessions","integrations.authentication:googleRegistrationEnabled":"superAdminSa02GoogleEnabled",
  "integrations.translation:actualPending":"sa07Pending","integrations.translation:actualFailed":"sa07Failed",
};
export function SuperAdminOverview({locale,state,viewerId}:{locale:string;state:OwnerOverview;viewerId:string}){
  const {t}=useTranslation("common"),routing=useAdministrativeRouting(),visible=useOwnerSnapshot(state,viewerId);
  if(!visible)return <SuperAdminShell locale={locale} current="overview"><p role="status">{t("profileSectionUnavailable")}</p></SuperAdminShell>;
  return <SuperAdminShell locale={locale} current="overview"><section className="admin-overview" data-owner-overview aria-labelledby="owner-overview-heading">
    <h2 id="owner-overview-heading">{t("superAdminOverview")}</h2><p>{t("sa08Note")}</p><p>{t("sa08SampleNote")}</p><p><Link data-overview-refresh to={routing.superAdmin.overview(locale)}>{t("superAdminRefresh")}</Link></p>
    {state.recording==="unavailable"?<p role="status">{t("superAdminRecordingUnavailable")}</p>:null}
    <section data-overview-terminal-coverage data-status={state.terminalCoverage.status} aria-labelledby="overview-terminal-coverage">
      <h3 id="overview-terminal-coverage">{t("sa07DTerminalCoverage")}</h3>
      <p>{t("sa08TerminalCoverageNote")}</p>
      {state.terminalCoverage.status==="unavailable"?<p role="status">{t("sa08Unavailable")}</p>:<>
        {state.terminalCoverage.status==="limited"?<p role="status">{t("sa08TerminalCoverageLimited")}</p>:null}
        <p><bdi>web-database</bdi>: <time dateTime={state.terminalCoverage.observedAt}>{formatTime(state.terminalCoverage.observedAt,locale)} · <bdi>{state.terminalCoverage.observedAt}</bdi></time></p>
        <dl>{Object.entries(state.terminalCoverage.values).map(([field,value])=><div key={field} data-overview-coverage-field={field}><dt>{t(dataLabels[field])}</dt><dd><bdi>{new Intl.NumberFormat(locale).format(BigInt(value))}</bdi></dd></div>)}</dl>
      </>}
      <Link to={ownerAreaPath(routing,locale,"data")}>{t("superAdminOverviewDetails")}</Link>{" · "}
      <Link to={routing.superAdmin.monitorAreaHistory(locale,{area:"data",monitorKey:"data.retention"})}>{t("superAdminHistory")}</Link>
    </section>
    <div className="super-admin-monitors">{state.areas.map(area=><article className="super-admin-monitor" key={area.area} data-overview-area={area.area} data-status={area.status}>
      <h3><Link to={ownerAreaPath(routing,locale,area.area)}>{t(ownerAreaLabels[area.area])}</Link></h3>
      <p>{t(area.status==="placeholder"?"superAdminStage6":area.status==="measured"?"sa08Measured":area.status==="partial"?"sa08Partial":"sa08Unavailable")}</p>
      {area.figures.length?<dl>{area.figures.map(figure=>{
        const label=special[figure.monitorKey+":"+figure.field]??(figure.monitorKey.startsWith("localization.")?localizationLabels:figure.monitorKey.startsWith("integrations.")?integrationLabels:figure.monitorKey.startsWith("files.")||figure.monitorKey==="background.attachments"?fileLabels:figure.monitorKey.startsWith("background.")?taskLabels:nativeLabels)[figure.field];
        return <div key={figure.monitorKey+":"+figure.field} data-overview-field={figure.monitorKey+":"+figure.field}><dt>{label?t(label):<bdi>{figure.field}</bdi>}</dt><dd>
          {typeof figure.value==="boolean"?t(figure.value?"superAdminHistoryYes":"superAdminHistoryNo"):
            <bdi>{typeof figure.value==="string"&&/^\d+$/.test(figure.value)?new Intl.NumberFormat(locale).format(BigInt(figure.value)):
              figure.value==="serving"?t("superAdminStateServing"):figure.value==="available"?t("superAdminStateAvailable"):String(figure.value)}</bdi>}
        </dd></div>;
      })}</dl>:null}
      {area.status!=="placeholder"?<>
        <details><summary>{t("sa08SourceDetails")}</summary><h4>{t("sa08SourceClocks")}</h4>
          {area.sources.map(source=><p key={source.id} data-overview-source={source.id}><bdi>{source.connection} / {source.id}</bdi>:{" "}
            {source.status==="measured"&&source.observedAt?<time dateTime={source.observedAt}>{formatTime(source.observedAt,locale)} · <bdi>{source.observedAt}</bdi></time>:
              t(source.code==="deadline"?"sa08Budget":source.code==="source-incompatible"?"sa08Incompatible":"sa08Dependency")}</p>)}
          <h4>{t("sa08SampleCoverage")}</h4>
          {state.sampleCoverageUnavailable?<p>{t("sa08Unavailable")}</p>:null}
          <ul>{OWNER_MONITORS[area.area as OwnerMonitorArea].map(key=>{
            const sample=state.samples.find(s=>s.key===key);
            return <li key={key}><Link to={routing.superAdmin.monitorAreaHistory(locale,{area:area.area,monitorKey:key} as SuperAdminMonitorScope)}><bdi>{key}</bdi></Link>
              {sample?.first?<p>{t("superAdminCoverage")}: <time dateTime={sample.first}>{formatTime(sample.first,locale)} · <bdi>{sample.first}</bdi></time></p>:<p>{t("superAdminNotRecorded")}</p>}
              {sample?.last?<p>{t("superAdminSa02LastSample")}: <time dateTime={sample.last}>{formatTime(sample.last,locale)} · <bdi>{sample.last}</bdi></time></p>:null}
            </li>;
          })}</ul>
        </details>
        <nav aria-label={t("superAdminMonitorActions")}><Link to={ownerAreaPath(routing,locale,area.area)}>{t("superAdminOverviewDetails")}</Link>{" · "}
          <Link to={withOwnerHistoryFilters(routing.superAdmin.events(locale),{area:area.area})}>{t("sa08AreaHistory")}</Link></nav>
      </>:null}
    </article>)}</div>
    {state.recent?<Timeline locale={locale} page={state.recent} viewerId={viewerId} path={before=>routing.superAdmin.events(locale,before)}/>:<p role="status">{t("sa08RecentUnavailable")}</p>}
    <Link to={routing.superAdmin.events(locale)}>{t("superAdminAllEvents")}</Link>
  </section></SuperAdminShell>;
}
