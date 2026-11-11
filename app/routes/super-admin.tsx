import { data, useLoaderData, type RouterContextProvider } from "react-router";
import { requireSuperAdmin, superAdminPrivateHeaders } from "../super-admin/access.server";
import { ownerMonitoringForRequest, ownerSa02MonitoringForRequest } from "../super-admin/request-context";
import { OwnerSystemUnavailableError } from "../../db/hyperdrive-owner-system";
import { SuperAdminOverview } from "../super-admin/view";
import { ForumRouteError } from "../forum/ui";
export function headers() { return superAdminPrivateHeaders; }
export function meta() { return [{ title: "Super-admin · Vico Forum" }]; }
export async function loader({params,context}:{params:{locale?:string};context:RouterContextProvider}) {
  requireSuperAdmin(context);
  try {
    const reader = ownerMonitoringForRequest(context);
    const [system,recent] = await Promise.all([
      reader.readSystem(),ownerSa02MonitoringForRequest(context).readSa02History({limit:5}),
    ]);
    return data({locale:params.locale??"en",system,recent},{headers:superAdminPrivateHeaders});
  } catch(error) {
    if(error instanceof OwnerSystemUnavailableError) throw new Response("Unavailable",{status:503,headers:superAdminPrivateHeaders});
    throw error;
  }
}
export default function SuperAdminRoute() {
  const {locale,system,recent}=useLoaderData<typeof loader>();
  return <SuperAdminOverview locale={locale} system={system} recent={recent}/>;
}
export const ErrorBoundary=ForumRouteError;
