import { useAdministrativeRouting } from "../administrative-routing/provider";
import { data, useLoaderData, type RouterContextProvider } from "react-router";
import { requireSuperAdmin, superAdminPrivateHeaders } from "../super-admin/access.server";
import { ownerMonitoringForRequest } from "../super-admin/request-context";
import { OwnerSystemUnavailableError } from "../../db/hyperdrive-owner-system";
import { parseOwnerTimelineQuery } from "../../db/owner-system-monitoring";
import { SYSTEM_MONITORS, type SystemMonitorKey } from "../../db/owner-system-history";
import { superAdminMonitorHistoryPath } from "../super-admin/paths";
import { SuperAdminShell, Timeline } from "../super-admin/view";
import { ForumRouteError } from "../forum/ui";
export {headers,meta} from "./super-admin";
export async function loader({request,params,context}:{request:Request;params:{locale?:string;monitorKey?:string};context:RouterContextProvider}) {
  requireSuperAdmin(context);
  if (!params.monitorKey || !SYSTEM_MONITORS.includes(params.monitorKey as SystemMonitorKey)) {
    throw new Response("Not Found",{status:404,headers:superAdminPrivateHeaders});
  }
  let before:string|undefined;
  try {before=parseOwnerTimelineQuery(request.url);}
  catch {throw new Response("Invalid history cursor",{status:400,headers:superAdminPrivateHeaders});}
  const monitorKey=params.monitorKey as SystemMonitorKey;
  try {
    const page=await ownerMonitoringForRequest(context).readTimeline({monitorKey,before});
    return data({locale:params.locale??"en",monitorKey,page},{headers:superAdminPrivateHeaders});
  } catch(error) {
    if(error instanceof OwnerSystemUnavailableError) throw new Response("Unavailable",{status:503,headers:superAdminPrivateHeaders});
    throw error;
  }
}
export default function SuperAdminMonitorHistoryRoute() {
  const {locale,monitorKey,page}=useLoaderData<typeof loader>();
  const routing = useAdministrativeRouting();
  return <SuperAdminShell locale={locale} current="monitoring">
    <Timeline page={page} locale={locale} path={before=>superAdminMonitorHistoryPath(locale,monitorKey,before,routing)}/>
  </SuperAdminShell>;
}
export const ErrorBoundary=ForumRouteError;
