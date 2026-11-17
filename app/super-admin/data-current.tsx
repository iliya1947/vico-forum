import {Link} from "react-router";
import {useTranslation} from "react-i18next";
import type {DataCheck,DataValues,OwnerDataCurrent} from "../../db/owner-data-catalog";
import {useAdministrativeRouting} from "../administrative-routing/provider";
import {SuperAdminShell,formatTime} from "./view";
import {useOwnerSnapshot} from "./owner-snapshot";
import {dataLabels} from "./data-labels";
function DataFields({locale,values}:{locale:string;values:DataValues}){
  const {t}=useTranslation('common');
  return <dl>{Object.entries(values).map(([key,value])=><div key={key}>
    <dt>{dataLabels[key]?t(dataLabels[key]):<bdi>{key}</bdi>}</dt><dd>{value===null?t('superAdminNotRecorded'):typeof value==='boolean'?t(value?'sa07DYes':'sa07DNo'):
      <bdi>{typeof value==='string'&&/^\d+$/.test(value)?new Intl.NumberFormat(locale).format(BigInt(value)):String(value)}</bdi>}</dd>
  </div>)}</dl>;
}
function Check({locale,check}:{locale:string;check:DataCheck}){
  const {t}=useTranslation('common'),failed=check.status==='incompatible'||check.status==='unavailable';
  return <details data-data-check={check.id} data-status={check.status} open={failed||undefined}>
    <summary>{dataLabels[check.id]?t(dataLabels[check.id]):<bdi>{check.id}</bdi>} · {t(dataLabels[check.status])}</summary>
    <p>{t('superAdminHistorySource')}: <bdi>{check.source}</bdi></p>
    <p>{t('superAdminObservedAt')}: <time dateTime={check.observedAt}>{formatTime(check.observedAt,locale)} · <bdi>{check.observedAt}</bdi></time></p>
    {check.code!=='none'?<p role="status">{t(dataLabels[check.code])}</p>:null}
    {Object.keys(check.values).length?<DataFields locale={locale} values={check.values}/>:<p>{t('sa07DNoMeasurement')}</p>}
  </details>;
}
export function SuperAdminData({locale,state,viewerId}:{locale:string;state:OwnerDataCurrent;viewerId:string}){
  const {t}=useTranslation('common'),routing=useAdministrativeRouting(),visible=useOwnerSnapshot(state,viewerId);
  if(!visible)return <SuperAdminShell locale={locale} current="monitoring"><p role="status">{t('profileSectionUnavailable')}</p></SuperAdminShell>;
  return <SuperAdminShell locale={locale} current="monitoring"><section className="admin-overview" data-data-current aria-labelledby="data-heading">
    <h2 id="data-heading">{t('superAdminAreaData')}</h2><p>{t('sa07DNote')}</p>
    <div className="super-admin-monitors">{state.monitors.map(m=><article className="super-admin-monitor" data-monitor-key={m.key} key={m.key}>
      <h3>{t(dataLabels[m.key])}</h3><DataFields locale={locale} values={Object.fromEntries(['checks','successful','incompatible','unavailable'].map(k=>[k,m.values[k]]))}/>
      {m.key==='data.compatibility'?<><p>{t('sa07DCompatibilityNote')}</p><dl>
        <div><dt>{t('sa07DCompiledExpected')}</dt><dd><bdi>{state.compiledExpectedMigration}</bdi></dd></div>
        <div><dt>{t('sa07DDeployedMigration')}</dt><dd>{t('sa07DUnchecked')}</dd></div>
      </dl></>:m.key==='data.retention'?<><p>{t('sa07DRetentionNote')}</p><p>{t('sa07DAttemptNote')}</p><p>{t('sa07DLifecycleNote')}</p></>:null}
      {m.checks.map(check=><Check locale={locale} check={check} key={check.source+':'+check.id}/>)}
      <p>{t('superAdminObservedAt')}: <time dateTime={m.observedAt}>{formatTime(m.observedAt,locale)} · <bdi>{m.observedAt}</bdi></time></p>
      <p>{t('superAdminSa02LastSample')}: {m.lastObservedAt?formatTime(m.lastObservedAt,locale):t('superAdminNotRecorded')}</p>
      <p>{t('superAdminCoverage')}: {m.coverageFrom?formatTime(m.coverageFrom,locale):t('superAdminNotRecorded')}</p>
      {m.recording==='unavailable'?<p role="status">{t('superAdminRecordingUnavailable')}</p>:null}
      <nav aria-label={t('superAdminMonitorActions')}><Link to={routing.superAdmin.monitorAreaHistory(locale,{area:'data',monitorKey:m.key})}>{t('superAdminHistory')}</Link>
        {' · '}<Link to={routing.superAdmin.data(locale)}>{t('superAdminRefresh')}</Link></nav>
    </article>)}</div>
  </section></SuperAdminShell>;
}
