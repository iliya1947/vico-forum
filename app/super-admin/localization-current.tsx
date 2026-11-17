import {Link} from "react-router";
import {useTranslation} from "react-i18next";
import type {OwnerLocalizationCurrent} from "../../db/owner-localization-monitoring";
import {useAdministrativeRouting} from "../administrative-routing/provider";
import {SuperAdminShell,formatTime} from "./view";
import {useOwnerSnapshot} from "./owner-snapshot";
import {localizationLabels} from "./localization-labels";

export function SuperAdminLocalization({locale,state,viewerId}:{locale:string;state:OwnerLocalizationCurrent;viewerId:string}){
  const {t}=useTranslation("common"),routing=useAdministrativeRouting(),visible=useOwnerSnapshot(state,viewerId);
  if(!visible)return <SuperAdminShell locale={locale} current="monitoring"><p role="status">{t("profileSectionUnavailable")}</p></SuperAdminShell>;
  const value=(v:string|boolean|null)=>v===null?t("superAdminNotRecorded"):typeof v==="boolean"?t(v?"superAdminSa02FlagEnabled":"superAdminSa02FlagDisabled"):
    /^\d+$/.test(v)?new Intl.NumberFormat(locale).format(BigInt(v)):<bdi>{v}</bdi>;
  return <SuperAdminShell locale={locale} current="monitoring"><section className="admin-overview" data-localization-current aria-labelledby="localization-heading">
    <h2 id="localization-heading">{t("superAdminAreaLocalization")}</h2><p>{t("sa07LNote")}</p>
    <div className="super-admin-monitors">{state.monitors.map(m=><article className="super-admin-monitor" data-monitor-key={m.key} key={m.key}>
      <h3>{t(localizationLabels[m.key])}</h3><dl>{Object.entries(m.values).map(([name,v])=><div key={name}>
        <dt>{t(localizationLabels[name])}</dt><dd>{value(v)}</dd>
      </div>)}</dl>
      {m.key==="localization.registry"?<><h4>{t("sa07LActiveLanguages")}</h4><ul>{state.locales.map(l=><li key={l.tag}><bdi>{l.tag}</bdi> · <bdi>{l.direction}</bdi> · <bdi>{l.translationStatus}</bdi></li>)}</ul></>:null}
      {m.key==="localization.ui"?<><h4>{t("sa07LBundleVersions")}</h4>{state.bundles.map(b=><details key={b.locale+":"+b.namespace}>
        <summary><bdi>{b.locale} / {b.namespace}</bdi> · {t(localizationLabels["bundle"+b.status])}</summary>
        <dl>{(["storedVersion","servedVersion","rowVersion","servedMissing"] as const).map(k=><div key={k}><dt>{t(localizationLabels[k])}</dt><dd><bdi>{value(b[k])}</bdi></dd></div>)}</dl>
      </details>)}</>:null}
      {m.key==="localization.budget"?<><p>{t("sa07LBudgetNote")}</p>{state.budgetWindows.map(w=><details key={JSON.stringify([w.scope,w.pool,w.windowStart,w.expiresAt])}>
        <summary><bdi>{w.scope}</bdi> · {t(w.pool==="global"?"sa07LGlobalCounters":"sa07LRequesterCounters")}</summary>
        <dl>{(["windowStart","expiresAt","usedUnits","counterCount"] as const).map(k=><div key={k}><dt>{t(localizationLabels[k])}</dt><dd><bdi>{w[k]}</bdi></dd></div>)}</dl>
      </details>)}</>:null}
      <p>{t("superAdminObservedAt")}: <time dateTime={m.observedAt}>{formatTime(m.observedAt,locale)} · <bdi>{m.observedAt}</bdi></time></p>
      <p>{t("superAdminHistorySource")}: <bdi>{m.source}</bdi> · {t("superAdminQualityMeasured")}</p>
      <p>{t("superAdminSa02LastSample")}: {m.lastObservedAt?formatTime(m.lastObservedAt,locale):t("superAdminNotRecorded")}</p>
      <p>{t("superAdminCoverage")}: {m.coverageFrom?formatTime(m.coverageFrom,locale):t("superAdminNotRecorded")}</p>
      {m.recording==="unavailable"?<p role="status">{t("superAdminRecordingUnavailable")}</p>:null}
      <nav aria-label={t("superAdminMonitorActions")}>
        <Link to={routing.superAdmin.monitorAreaHistory(locale,{area:"localization",monitorKey:m.key})}>{t("superAdminHistory")}</Link>
        {" · "}<Link to={routing.superAdmin.localization(locale)}>{t("superAdminRefresh")}</Link>
        {" · "}<Link to={routing.superAdmin.background(locale)}>{t("superAdminAreaBackground")}</Link>
      </nav>
    </article>)}</div>
  </section></SuperAdminShell>;
}
