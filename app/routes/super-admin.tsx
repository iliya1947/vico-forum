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
    const sa02Reader = ownerSa02MonitoringForRequest(context);
    const [system,recent,sa02] = await Promise.all([
      reader.readSystem(),sa02Reader.readSa02History({limit:5}),sa02Reader.readSa02Current(),
    ]);
    return data({locale:params.locale??"en",system,recent,sa02},{headers:superAdminPrivateHeaders});
  } catch(error) {
    if(error instanceof OwnerSystemUnavailableError) throw new Response("Unavailable",{status:503,headers:superAdminPrivateHeaders});
    throw error;
  }
}
export default function SuperAdminRoute() {
  const {locale,system,recent,sa02}=useLoaderData<typeof loader>();
  return <SuperAdminOverview locale={locale} system={system} recent={recent} sa02={sa02}/>;
}
export const ErrorBoundary=ForumRouteError;
