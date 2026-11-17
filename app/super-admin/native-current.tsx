import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useAdministrativeRouting } from "../administrative-routing/provider";
import type { NativeMonitorArea } from "../../db/owner-monitor-catalog";
import { NATIVE_MONITOR_ACTIONS } from "../../db/owner-monitor-catalog";
import type { NativeCurrentState } from "../../db/owner-native-current";
import type { SuperAdminMonitorScope } from "../administrative-routing/addresses";
import { settingsForumPath } from "../settings/paths";
import { attentionEntryPath } from "../settings/workspace-access";
import { forumNotificationsPath } from "../forum/paths";
import { SuperAdminShell,formatTime } from "./view";
import { superAdminAreaMonitorHistoryPath } from "./paths";
import { nativeLabels,nativeAreaLabels } from "./native-labels";
import { useOwnerSnapshot } from "./owner-snapshot";

export function SuperAdminNativeCurrent({locale,area,viewerId,state}:{locale:string;area:NativeMonitorArea;viewerId:string;state:NativeCurrentState}){
  const {t}=useTranslation("common"),routing=useAdministrativeRouting(),visible=useOwnerSnapshot(state,viewerId);
  const ownPath=routing.superAdmin.nativeArea(locale,area);
  if(!visible)return <SuperAdminShell locale={locale} current="monitoring"><p role="status">{t("profileSectionUnavailable")}</p></SuperAdminShell>;
  return <SuperAdminShell locale={locale} current="monitoring">
    <section className="admin-overview" aria-labelledby="native-monitor-heading">
      <h2 id="native-monitor-heading">{t(nativeAreaLabels[area])}</h2>
      <p>{t("sa06RecordingNote")}</p>
      <p><Link to={routing.superAdmin.monitoring(locale)}>{t("superAdminMonitoring")}</Link></p>
      <div className="super-admin-monitors" data-native-area={area}>
        {state.monitors.map(m=>{
          const action=NATIVE_MONITOR_ACTIONS[m.key];
          const href=action==="forum"?routing.admin.forum(locale):action==="authorization"?routing.admin.authorization(locale):action==="measures"?routing.admin.measures(locale):action==="registration"?settingsForumPath(locale):action==="help"?attentionEntryPath(locale,"signals","mixed"):action==="complaints"?attentionEntryPath(locale,"complaints","group1"):action==="inbox"?forumNotificationsPath(locale):null;
          return <article className="super-admin-monitor" data-monitor-key={m.key} key={m.key}>
            <h3>{t(nativeLabels[m.key])}</h3>
            <dl>{Object.entries(m.values).map(([name,value])=><div key={name}>
              <dt>{t(nativeLabels[name])}</dt><dd>{value===null?t("superAdminNotRecorded")
                :typeof value==="boolean"?t(value?"superAdminSa02FlagEnabled":"superAdminSa02FlagDisabled")
                :name.endsWith("At")&&typeof value==="string"?<time dateTime={value}>{formatTime(value,locale)} · <bdi>{value}</bdi></time>
                :<bdi>{typeof value==="string"&&/^\d+$/.test(value)?new Intl.NumberFormat(locale).format(BigInt(value)):String(value)}</bdi>}</dd>
            </div>)}</dl>
            <p>{t("superAdminObservedAt")}: <time dateTime={state.observedAt}>{formatTime(state.observedAt,locale)}</time></p>
            <p>{t("superAdminSa02LastSample")}: {m.lastObservedAt?<time dateTime={m.lastObservedAt}>{formatTime(m.lastObservedAt,locale)}</time>:t("superAdminNotRecorded")}</p>
            <p>{t("superAdminCoverage")}: {m.coverageFrom?<time dateTime={m.coverageFrom}>{formatTime(m.coverageFrom,locale)}</time>:t("superAdminNotRecorded")}</p>
            <p>{t("superAdminQuality")}: {t("superAdminQualityMeasured")}</p>
            {m.recording==="unavailable"?<p role="status">{t("superAdminRecordingUnavailable")}</p>:null}
            <nav aria-label={t("superAdminMonitorActions")}>
              <Link to={superAdminAreaMonitorHistoryPath(locale,{area,monitorKey:m.key} as SuperAdminMonitorScope,undefined,routing)}>{t("superAdminHistory")}</Link>
              {" · "}<Link to={ownPath}>{t("superAdminRefresh")}</Link>
              {href?<> · <Link to={href}>{t(nativeAreaLabels[area])}</Link></>:null}
            </nav>
          </article>;
        })}
      </div>
    </section>
  </SuperAdminShell>;
}
