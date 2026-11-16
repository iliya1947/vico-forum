import { useAdministrativeRouting } from "../administrative-routing/provider";
import { data, useLoaderData, type RouterContextProvider } from "react-router";
import { requireSuperAdmin, superAdminPrivateHeaders } from "../super-admin/access.server";
import { ownerSa02MonitoringForRequest } from "../super-admin/request-context";
import { OwnerSystemUnavailableError } from "../../db/hyperdrive-owner-system";
import { parseOwnerHistoryQuery } from "../super-admin/history-query.server";
import { withOwnerHistoryFilters } from "../super-admin/history-query-links";
import { superAdminEventLogPath } from "../super-admin/paths";
import { SuperAdminShell, Timeline } from "../super-admin/view";
import { ForumRouteError } from "../forum/ui";
export {headers,meta} from "./super-admin";
export async function loader({request,params,context}:{request:Request;params:{locale?:string};context:RouterContextProvider}) {
  const viewerId=requireSuperAdmin(context);
  let filters;
  try {filters=parseOwnerHistoryQuery(request.url);}
  catch {throw new Response("Invalid history filter",{status:400,headers:superAdminPrivateHeaders});}
  try {
    const page=await ownerSa02MonitoringForRequest(context).readSa02History(filters);
    return data({locale:params.locale??"en",page,viewerId,filters},{headers:superAdminPrivateHeaders});
  } catch(error) {
    if(error instanceof OwnerSystemUnavailableError) throw new Response("Unavailable",{status:503,headers:superAdminPrivateHeaders});
    throw error;
  }
}
export default function SuperAdminEventsRoute() {
  const {locale,page,viewerId,filters}=useLoaderData<typeof loader>();
  const routing = useAdministrativeRouting();
  return <SuperAdminShell locale={locale} current="events">
    <Timeline page={page} locale={locale} viewerId={viewerId} path={before=>withOwnerHistoryFilters(superAdminEventLogPath(locale,before,routing),filters)}/>
  </SuperAdminShell>;
}
export const ErrorBoundary=ForumRouteError;
