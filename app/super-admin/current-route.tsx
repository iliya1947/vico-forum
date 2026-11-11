import { data, Link, type RouterContextProvider } from "react-router";
import { useTranslation } from "react-i18next";
import { useAdministrativeRouting } from "../administrative-routing/provider";
import { SA02_MONITORS, type Sa02Area } from "../../db/owner-sa02-catalog";
import type { Sa02CurrentState } from "../../db/owner-sa02-current";
import { OwnerSystemUnavailableError } from "../../db/hyperdrive-owner-system";
import { requireSuperAdmin, superAdminPrivateHeaders } from "./access.server";
import { ownerSa02MonitoringForRequest } from "./request-context";
import { SuperAdminShell, formatTime } from "./view";
export async function loadSa02CurrentArea({request,params,context}:{
  request:Request;params:{locale?:string};context:RouterContextProvider;
},area:Sa02Area){
  requireSuperAdmin(context);
  if(new URL(request.url).searchParams.size!==0)
    throw new Response("Invalid monitoring query",{status:400,headers:superAdminPrivateHeaders});
  try{
    const snapshot=await ownerSa02MonitoringForRequest(context).readSa02Current();
    return data({locale:params.locale??"en",area,
      state:{...snapshot,monitors:snapshot.monitors.filter(m=>
        (SA02_MONITORS[area] as readonly string[]).includes(m.key))}},
      {headers:superAdminPrivateHeaders});
  }catch(error){
    if(error instanceof OwnerSystemUnavailableError)
      throw new Response("Unavailable",{status:503,headers:superAdminPrivateHeaders});
    throw error;
  }
}
/** Bounded D1 current-page presentation; semantic labels and actions land in D2. */
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
            <Link to={routing.superAdmin.monitorAreaHistory(locale,area,m.key)}>{t("superAdminHistory")}</Link>
            <span aria-hidden="true"> · </span>
            <Link to={routing.superAdmin.monitoring(locale)}>{t("superAdminMonitoring")}</Link>
          </nav>
        </article>)}
      </div>
    </section>
  </SuperAdminShell>;
}
