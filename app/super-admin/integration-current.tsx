import {Link} from "react-router";
import {useTranslation} from "react-i18next";
import type {OwnerIntegrationsCurrent,IntegrationValues,RetainedIntegrationFact} from "../../db/owner-integration-catalog";
import {useAdministrativeRouting} from "../administrative-routing/provider";
import {SuperAdminShell,formatTime} from "./view";
import {useOwnerSnapshot} from "./owner-snapshot";
import {integrationLabels} from "./integration-labels";
import {taskLabels} from "./task-labels";
import {fileLabels} from "./file-labels";
import type {UiKey} from "../localization/catalog";
function Fields({locale,values,labels=integrationLabels}:{locale:string;values:IntegrationValues;labels?:Record<string,UiKey<'common'>>}){
  const {t}=useTranslation('common');
  return <dl>{Object.entries(values).map(([key,value])=><div key={key}><dt>{labels[key]?t(labels[key]):<bdi>{key}</bdi>}</dt>
    <dd>{value===null?t('superAdminNotRecorded'):typeof value==='boolean'?t(value?'sa07DYes':'sa07DNo'):
      <bdi>{typeof value==='string'&&/^\d+$/.test(value)?new Intl.NumberFormat(locale).format(BigInt(value)):String(value)}</bdi>}</dd>
  </div>)}</dl>;
}
function Time({locale,at}:{locale:string;at:string}){return <time dateTime={at}>{formatTime(at,locale)} · <bdi>{at}</bdi></time>;}
function Fact({locale,title,fact}:{locale:string;title:UiKey<'common'>;fact:RetainedIntegrationFact|null}){
  const {t}=useTranslation('common'),kind=fact?(integrationLabels[fact.kind]??taskLabels[fact.kind]):undefined;
  return <section data-integration-fact={fact?.kind??'unmeasured'}><h4>{t(title)}</h4>{!fact?<p>{t('superAdminNotRecorded')}</p>:<>
    <dl><div><dt>{t('superAdminHistoryIdentity')}</dt><dd><bdi>{fact.id}</bdi></dd></div>
      <div><dt>{t('superAdminHistorySource')}</dt><dd><bdi>{fact.source}</bdi></dd></div>
      <div><dt>{t('sa07IFactKind')}</dt><dd>{kind?t(kind):<bdi>{fact.kind}</bdi>}</dd></div>
      <div><dt>{t('superAdminHistoryOccurredAt')}</dt><dd><Time locale={locale} at={fact.occurredAt}/></dd></div></dl>
    <Fields locale={locale} values={fact.values} labels={{...taskLabels,...integrationLabels}}/>
  </>}</section>;
}
export function SuperAdminIntegrations({locale,state,viewerId}:{locale:string;state:OwnerIntegrationsCurrent;viewerId:string}){
  const {t}=useTranslation('common'),routing=useAdministrativeRouting(),visible=useOwnerSnapshot(state,viewerId);
  if(!visible)return <SuperAdminShell locale={locale} current="monitoring"><p role="status">{t('profileSectionUnavailable')}</p></SuperAdminShell>;
  return <SuperAdminShell locale={locale} current="monitoring"><section className="admin-overview" data-integration-current aria-labelledby="integration-heading">
    <h2 id="integration-heading">{t('superAdminAreaIntegrations')}</h2><p>{t('sa07INote')}</p>
    <div className="super-admin-monitors">{state.monitors.map(m=><article className="super-admin-monitor" data-monitor-key={m.key} key={m.key}>
      <h3>{t(integrationLabels[m.key])}</h3><h4>{t('sa07IConfiguration')}</h4>
      <Fields locale={locale} values={Object.fromEntries(Object.entries(m.values).filter(([key])=>!key.startsWith('requiredLocalization')))}/>
      {m.key==='integrations.database'?<><p>{t('sa07IDatabaseNote')}</p><h4>{t('sa07IActualWebRead')}</h4>
        <p>{t('superAdminObservedAt')}: <Time locale={locale} at={state.database.observedAt}/></p>
        <p>{t('superAdminHistorySource')}: <bdi>{state.database.source}</bdi> · <bdi>{state.database.quality}</bdi></p>
        <Fields locale={locale} values={state.database.values}/>
        <h4>{t('sa07IRetainedDependency')}</h4>{state.database.retainedSample?<><Fields locale={locale} values={{id:state.database.retainedSample.id,quality:state.database.retainedSample.quality}}/>
          <p>{t('sa07FSampleRecordedAt')}: <Time locale={locale} at={state.database.retainedSample.observedAt}/></p></>:<p>{t('superAdminNotRecorded')}</p>}
        <h4>{t('sa07IRequiredLocalization')}</h4>{state.requiredLocalizationRead?<Fields locale={locale} values={{...state.requiredLocalizationRead}}/>:<p>{t('sa07FUnmeasured')}</p>}
        <p><Link to={routing.superAdmin.system(locale)}>{t('superAdminSystem')}</Link></p>
      </>:m.key==='integrations.authentication'?<><p>{t('sa07IAuthNote')}</p>
        <p>{t('superAdminObservedAt')}: <Time locale={locale} at={state.authentication.observedAt}/></p>
        <p>{t('superAdminHistorySource')}: <bdi>{state.authentication.source}</bdi></p>
        <Fields locale={locale} values={state.authentication.values}/>
        <Fact locale={locale} title="sa07IGoogleMethodFact" fact={state.authentication.googleMethodLink}/>
        <Fact locale={locale} title="sa07IGenericSessionFact" fact={state.authentication.genericSession}/>
        <Fact locale={locale} title="sa07ILastVerificationMail" fact={state.authentication.verificationMail??null}/>
        <Fact locale={locale} title="authCredentialReset" fact={state.authentication.passwordResetMail??null}/>
        <Fact locale={locale} title="authCredentialCreate" fact={state.authentication.passwordCreateMail??null}/>
        <p><Link to={routing.superAdmin.accounts(locale)}>{t('superAdminAreaAccounts')}</Link></p>
      </>:m.key==='integrations.storage'?<><p>{t('sa07FStorageNote')}</p>{state.storageSamples.map(({scope,sample})=><details key={scope} data-storage-slot={scope}>
        <summary><bdi>{scope}</bdi> · {t(sample?'sa07FRetainedSample':'sa07FUnmeasured')}</summary>{sample?<>
          <Fields locale={locale} values={{id:sample.id,ageMs:sample.ageMs}}/>
          <p>{t('sa07FSampleRecordedAt')}: <Time locale={locale} at={sample.observedAt}/></p>
          <Fields locale={locale} values={{...sample.value}} labels={fileLabels}/>
        </>:null}
      </details>)}<p><Link to={routing.superAdmin.files(locale)}>{t('superAdminAreaFiles')}</Link></p></>:
        <><p>{t('sa07ITranslationNote')}</p><Fact locale={locale} title="sa07ILastTask" fact={state.translation.taskOutcome}/>
          <Fact locale={locale} title="sa07ILastProvider" fact={state.translation.providerExecution}/>
          <p><Link to={routing.superAdmin.background(locale)}>{t('superAdminAreaBackground')}</Link></p></>}
      <p>{t('superAdminObservedAt')}: <Time locale={locale} at={m.observedAt}/></p>
      <p>{t('superAdminSa02LastSample')}: {m.lastObservedAt?formatTime(m.lastObservedAt,locale):t('superAdminNotRecorded')}</p>
      <p>{t('superAdminCoverage')}: {m.coverageFrom?formatTime(m.coverageFrom,locale):t('superAdminNotRecorded')}</p>
      {m.recording==='unavailable'?<p role="status">{t('superAdminRecordingUnavailable')}</p>:null}
      <nav aria-label={t('superAdminMonitorActions')}><Link to={routing.superAdmin.monitorAreaHistory(locale,{area:'integrations',monitorKey:m.key})}>{t('superAdminHistory')}</Link>
        {' · '}<Link to={routing.superAdmin.integrations(locale)}>{t('superAdminRefresh')}</Link></nav>
    </article>)}</div>
  </section></SuperAdminShell>;
}
