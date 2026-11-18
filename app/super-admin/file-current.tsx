import {Link} from "react-router";
import {useTranslation} from "react-i18next";
import type {OwnerFilesCurrent,FileCurrentMonitor} from "../../db/owner-file-monitoring";
import {useAdministrativeRouting} from "../administrative-routing/provider";
import {SuperAdminShell,formatTime} from "./view";
import {useOwnerSnapshot} from "./owner-snapshot";
import {fileLabels} from "./file-labels";
import {attentionEntryPath} from "../settings/workspace-access";

export function FileMonitorCard({locale,monitor,children}:{locale:string;monitor:FileCurrentMonitor;children?:React.ReactNode}){
  const {t}=useTranslation("common"),routing=useAdministrativeRouting(),m=monitor;
  const scope=m.key==='background.attachments'?{area:"background" as const,monitorKey:m.key}:{area:"files" as const,monitorKey:m.key};
  return <article className="super-admin-monitor" data-monitor-key={m.key}>
    <h3>{t(fileLabels[m.key])}</h3><dl>{Object.entries(m.values).map(([name,value])=><div key={name}>
      <dt>{t(fileLabels[name])}</dt><dd>{value===null?t("superAdminNotRecorded"):typeof value==="boolean"?t(value?"superAdminSa02FlagEnabled":"superAdminSa02FlagDisabled"):
        <bdi>{/^\d+$/.test(value)?new Intl.NumberFormat(locale).format(BigInt(value)):value}</bdi>}</dd>
    </div>)}</dl>{children}
    <p>{t("superAdminObservedAt")}: <time dateTime={m.observedAt}>{formatTime(m.observedAt,locale)} · <bdi>{m.observedAt}</bdi></time></p>
    <p>{t("superAdminHistorySource")}: <bdi>{m.source}</bdi> · {t("superAdminQualityMeasured")}</p>
    <p>{t("superAdminSa02LastSample")}: {m.lastObservedAt?formatTime(m.lastObservedAt,locale):t("superAdminNotRecorded")}</p>
    <p>{t("superAdminCoverage")}: {m.coverageFrom?formatTime(m.coverageFrom,locale):t("superAdminNotRecorded")}</p>
    {m.recording==="unavailable"?<p role="status">{t("superAdminRecordingUnavailable")}</p>:null}
    <nav aria-label={t("superAdminMonitorActions")}>
      <Link to={routing.superAdmin.monitorAreaHistory(locale,scope)}>{t("superAdminHistory")}</Link>
      {" · "}<Link to={m.key==='background.attachments'?routing.superAdmin.background(locale):routing.superAdmin.files(locale)}>{t("superAdminRefresh")}</Link>
      {" · "}<Link to={m.key==='background.attachments'?routing.superAdmin.files(locale):routing.superAdmin.background(locale)}>{t(m.key==='background.attachments'?"superAdminAreaFiles":"superAdminAreaBackground")}</Link>
    </nav>
  </article>;
}
export function SuperAdminFiles({locale,state,viewerId}:{locale:string;state:OwnerFilesCurrent;viewerId:string}){
  const {t}=useTranslation("common"),visible=useOwnerSnapshot(state,viewerId);
  if(!visible)return <SuperAdminShell locale={locale} current="monitoring"><p role="status">{t("profileSectionUnavailable")}</p></SuperAdminShell>;
  return <SuperAdminShell locale={locale} current="monitoring"><section className="admin-overview" data-file-current aria-labelledby="files-heading">
    <h2 id="files-heading">{t("superAdminAreaFiles")}</h2><p>{t("sa07FNote")}</p>
    <p><Link to={attentionEntryPath(locale,"security","attachments")}>{t("superAdminAreaSecurity")}</Link></p>
    <div className="super-admin-monitors">{state.monitors.filter(m=>m.key!=='background.attachments').map(m=><FileMonitorCard locale={locale} monitor={m} key={m.key}>
      {m.key==='files.operations'?<section aria-label={t("sa07FStorageSamples")}>
        <h4>{t("sa07FStorageSamples")}</h4><p>{t(state.bucketBound?"sa07FBucketPresent":"sa07FBucketAbsent")}</p><p>{t("sa07FStorageNote")}</p>
        {state.storageSamples.map(({scope,sample})=><details key={scope} data-storage-slot={scope}>
          <summary><bdi>{scope}</bdi> · {t(sample?"sa07FRetainedSample":"sa07FUnmeasured")}</summary>
          {sample?<dl>
            <div><dt>{t("superAdminHistoryIdentity")}</dt><dd><bdi>{sample.id}</bdi></dd></div>
            <div><dt>{t("sa07FSampleRecordedAt")}</dt><dd><time dateTime={sample.observedAt}>{formatTime(sample.observedAt,locale)} · <bdi>{sample.observedAt}</bdi></time></dd></div>
            <div><dt>{t("sa07FSampleAgeMs")}</dt><dd><bdi>{sample.ageMs}</bdi></dd></div>
            {Object.entries(sample.value).map(([key,value])=><div key={key}><dt>{t(fileLabels[key])}</dt><dd><bdi>{value}</bdi></dd></div>)}
          </dl>:null}
        </details>)}
      </section>:null}
    </FileMonitorCard>)}</div>
  </section></SuperAdminShell>;
}
