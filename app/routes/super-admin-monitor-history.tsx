import { useAdministrativeRouting } from "../administrative-routing/provider";
import { data, useLoaderData, type RouterContextProvider } from "react-router";
import { requireSuperAdmin, superAdminPrivateHeaders } from "../super-admin/access.server";
import { ownerSa02MonitoringForRequest } from "../super-admin/request-context";
import { OwnerSystemUnavailableError } from "../../db/hyperdrive-owner-system";
import { parseOwnerHistoryQuery } from "../super-admin/history-query.server";
import { SYSTEM_MONITORS } from "../../db/owner-system-history";
import { SA02_MONITORS } from "../../db/owner-sa02-catalog";
import type { OwnerHistoryArea, OwnerHistoryMonitor, OwnerHistoryOptions } from "../../db/owner-sa02-history";
import { SuperAdminShell, Timeline } from "../super-admin/view";
import { superAdminAreaMonitorHistoryPath } from "../super-admin/paths";
import type { SuperAdminMonitorScope } from "../administrative-routing/addresses";
import { ForumRouteError } from "../forum/ui";
export {headers,meta} from "./super-admin";
const MONITORS:Record<OwnerHistoryArea,readonly string[]>={
  system:SYSTEM_MONITORS, accounts:SA02_MONITORS.accounts, security:SA02_MONITORS.security,
};
export async function loader({request,params,context}:{
  request:Request;params:{locale?:string;area?:string;monitorKey?:string};context:RouterContextProvider
}) {
  requireSuperAdmin(context);
  const area=params.area,monitorKey=params.monitorKey;
  if(!area || !Object.prototype.hasOwnProperty.call(MONITORS,area) ||
     !monitorKey || !MONITORS[area as OwnerHistoryArea].includes(monitorKey))
    throw new Response("Not Found",{status:404,headers:superAdminPrivateHeaders});
  const options:OwnerHistoryOptions={
    area:area as OwnerHistoryArea,monitorKey:monitorKey as OwnerHistoryMonitor,
  };
  let before:string|undefined;
  try {before=parseOwnerHistoryQuery(request.url,options);}
  catch {throw new Response("Invalid history cursor",{status:400,headers:superAdminPrivateHeaders});}
  try {
    const page=await ownerSa02MonitoringForRequest(context).readSa02History({...options,before});
    return data({locale:params.locale??"en",area:options.area!,monitorKey:options.monitorKey!,page},
      {headers:superAdminPrivateHeaders});
  }catch(error){
    if(error instanceof OwnerSystemUnavailableError)
      throw new Response("Unavailable",{status:503,headers:superAdminPrivateHeaders});
    throw error;
  }
}
export default function SuperAdminMonitorHistoryRoute(){
  const {locale,area,monitorKey,page}=useLoaderData<typeof loader>();
  const routing=useAdministrativeRouting();
  return <SuperAdminShell locale={locale} current="monitoring">
    <Timeline page={page} locale={locale}
      path={before=>superAdminAreaMonitorHistoryPath(locale,
        {area,monitorKey} as SuperAdminMonitorScope,before,routing)}/>
  </SuperAdminShell>;
}
export const ErrorBoundary=ForumRouteError;
