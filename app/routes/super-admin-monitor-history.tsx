import {ownerAreaLabels,ownerAreaPath} from "../super-admin/area-navigation";
import {HistoryFilters} from "../super-admin/history-filters";
import {historyFilterCatalog} from "../super-admin/history-filters.server";
import { useAdministrativeRouting } from "../administrative-routing/provider";
import { data, Link, useLoaderData, type RouterContextProvider } from "react-router";
import { requireSuperAdmin, superAdminPrivateHeaders } from "../super-admin/access.server";
import { ownerSa02MonitoringForRequest } from "../super-admin/request-context";
import { OwnerSystemUnavailableError } from "../../db/owner-system-error";
import { parseOwnerHistoryQuery } from "../super-admin/history-query.server";
import { withOwnerHistoryFilters } from "../super-admin/history-query-links";
import { OWNER_MONITORS } from "../../db/owner-monitor-catalog";
import type { OwnerHistoryArea, OwnerHistoryMonitor, OwnerHistoryOptions } from "../../db/owner-sa02-history";
import { SuperAdminShell, Timeline } from "../super-admin/view";
import { useTranslation } from "react-i18next";
import { superAdminAreaMonitorHistoryPath } from "../super-admin/paths";
import type { SuperAdminMonitorScope } from "../administrative-routing/addresses";
import { ForumRouteError } from "../forum/ui";
export {headers,meta} from "./super-admin";
const MONITORS:Record<OwnerHistoryArea,readonly string[]>=OWNER_MONITORS;
export async function loader({request,params,context}:{
  request:Request;params:{locale?:string;area?:string;monitorKey?:string};context:RouterContextProvider
}) {
  const viewerId=requireSuperAdmin(context);
  const area=params.area,monitorKey=params.monitorKey;
  if(!area || !Object.prototype.hasOwnProperty.call(MONITORS,area) ||
     !monitorKey || !MONITORS[area as OwnerHistoryArea].includes(monitorKey))
    throw new Response("Not Found",{status:404,headers:superAdminPrivateHeaders});
  const options:OwnerHistoryOptions={
    area:area as OwnerHistoryArea,monitorKey:monitorKey as OwnerHistoryMonitor,
  };
  let filters;
  try {filters=parseOwnerHistoryQuery(request.url,options);}
  catch {throw new Response("Invalid history filter",{status:400,headers:superAdminPrivateHeaders});}
  try {
    const page=await ownerSa02MonitoringForRequest(context).readSa02History(filters);
    return data({locale:params.locale??"en",area:options.area!,monitorKey:options.monitorKey!,page,viewerId,filters,filterCatalog:historyFilterCatalog(options)},
      {headers:superAdminPrivateHeaders});
  }catch(error){
    if(error instanceof OwnerSystemUnavailableError)
      throw new Response("Unavailable",{status:503,headers:superAdminPrivateHeaders});
    throw error;
  }
}
export default function SuperAdminMonitorHistoryRoute(){
  const {locale,area,monitorKey,page,viewerId,filters,filterCatalog}=useLoaderData<typeof loader>();
  const routing=useAdministrativeRouting();
  const {t}=useTranslation("common");
  const currentArea=ownerAreaPath(routing,locale,area),currentAreaLabel=t(ownerAreaLabels[area]);
  return <SuperAdminShell locale={locale} current="monitoring">
    <p><Link to={currentArea}>{currentAreaLabel}</Link></p>
    <HistoryFilters key={JSON.stringify(filters)} path={superAdminAreaMonitorHistoryPath(locale,{area,monitorKey} as SuperAdminMonitorScope,undefined,routing)} filters={filters} catalog={filterCatalog} scoped/>
    <Timeline page={page} locale={locale} viewerId={viewerId}
      path={before=>withOwnerHistoryFilters(superAdminAreaMonitorHistoryPath(locale,
        {area,monitorKey} as SuperAdminMonitorScope,before,routing),
        {origin:filters.origin,kind:filters.kind,from:filters.from,until:filters.until})}/>
  </SuperAdminShell>;
}
export const ErrorBoundary=ForumRouteError;
