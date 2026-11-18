import {FileMonitorCard} from "./file-current";
import type {FileCurrentMonitor} from "../../db/owner-file-monitoring";
import {Link} from "react-router";
import {useTranslation} from "react-i18next";
import type {OwnerTaskCurrent} from "../../db/owner-task-monitoring";
import {useAdministrativeRouting} from "../administrative-routing/provider";
import {SuperAdminShell,formatTime} from "./view";
import {useOwnerSnapshot} from "./owner-snapshot";
import {taskLabels} from "./task-labels";

export function SuperAdminBackground({locale,state,viewerId,cleanup}:{locale:string;state:OwnerTaskCurrent;viewerId:string;cleanup?:FileCurrentMonitor}){
  const {t}=useTranslation("common"),routing=useAdministrativeRouting(),visible=useOwnerSnapshot(state,viewerId);
  if(!visible)return <SuperAdminShell locale={locale} current="monitoring"><p role="status">{t("profileSectionUnavailable")}</p></SuperAdminShell>;
  return <SuperAdminShell locale={locale} current="monitoring"><section className="admin-overview" data-task-current aria-labelledby="background-heading">
    <h2 id="background-heading">{t("superAdminAreaBackground")}</h2><p>{t("sa07Note")}</p>
    <article className="super-admin-monitor" data-monitor-key="background.translation">
      <h3>{t("sa07Title")}</h3><dl>{Object.entries(state.values).map(([name,value])=><div key={name}>
        <dt>{t(taskLabels[name])}</dt><dd>{value===null?t("superAdminNotRecorded"):
          typeof value==="boolean"?t(value?"superAdminSa02FlagEnabled":"superAdminSa02FlagDisabled"):
          name.endsWith("At")?<time dateTime={value}>{formatTime(value,locale)} · <bdi>{value}</bdi></time>:
          <bdi>{/^\d+$/.test(value)?new Intl.NumberFormat(locale).format(BigInt(value)):value}</bdi>}</dd>
      </div>)}</dl>
      <p>{t("superAdminObservedAt")}: <time dateTime={state.observedAt}>{formatTime(state.observedAt,locale)} · <bdi>{state.observedAt}</bdi></time></p>
      <p>{t("superAdminHistorySource")}: <bdi>{state.source}</bdi> · {t("superAdminQualityMeasured")}</p>
      <p>{t("superAdminSa02LastSample")}: {state.lastObservedAt?formatTime(state.lastObservedAt,locale):t("superAdminNotRecorded")}</p>
      <p>{t("superAdminCoverage")}: {state.coverageFrom?formatTime(state.coverageFrom,locale):t("superAdminNotRecorded")}</p>
      {state.recording==="unavailable"?<p role="status">{t("superAdminRecordingUnavailable")}</p>:null}
      <nav aria-label={t("superAdminMonitorActions")}>
        <Link to={routing.superAdmin.monitorAreaHistory(locale,{area:"background",monitorKey:"background.translation"})}>{t("superAdminHistory")}</Link>
        {" · "}<Link to={routing.superAdmin.background(locale)}>{t("superAdminRefresh")}</Link>
        {" · "}<Link to={routing.superAdmin.localization(locale)}>{t("superAdminAreaLocalization")}</Link>
        {" · "}<Link to={routing.superAdmin.monitoring(locale)}>{t("superAdminMonitoring")}</Link>
      </nav>
    </article>
    {cleanup?<FileMonitorCard locale={locale} monitor={cleanup}/>:null}
  </section></SuperAdminShell>;
}
