import { useAdministrativeRouting } from "../administrative-routing/provider";
import { data, useLoaderData, type RouterContextProvider } from "react-router";
import { requireSuperAdmin, superAdminPrivateHeaders } from "../super-admin/access.server";
import { ownerMonitoringForRequest } from "../super-admin/request-context";
import { OwnerSystemUnavailableError } from "../../db/hyperdrive-owner-system";
import { parseOwnerTimelineQuery } from "../../db/owner-system-monitoring";
import { superAdminEventLogPath } from "../super-admin/paths";
import { SuperAdminShell, Timeline } from "../super-admin/view";
import { ForumRouteError } from "../forum/ui";
export {headers,meta} from "./super-admin";
export async function loader({request,params,context}:{request:Request;params:{locale?:string};context:RouterContextProvider}) {
  requireSuperAdmin(context);
  let before:string|undefined;
  try {before=parseOwnerTimelineQuery(request.url);}
  catch {throw new Response("Invalid history cursor",{status:400,headers:superAdminPrivateHeaders});}
  try {
    const page=await ownerMonitoringForRequest(context).readTimeline({before});
    return data({locale:params.locale??"en",page},{headers:superAdminPrivateHeaders});
  } catch(error) {
    if(error instanceof OwnerSystemUnavailableError) throw new Response("Unavailable",{status:503,headers:superAdminPrivateHeaders});
    throw error;
  }
}
export default function SuperAdminEventsRoute() {
  const {locale,page}=useLoaderData<typeof loader>();
  const routing = useAdministrativeRouting();
  return <SuperAdminShell locale={locale} current="events">
    <Timeline page={page} locale={locale} path={before=>superAdminEventLogPath(locale,before,routing)}/>
  </SuperAdminShell>;
}
export const ErrorBoundary=ForumRouteError;
