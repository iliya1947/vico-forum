import { data, useLoaderData, type RouterContextProvider } from "react-router";
import { requireSuperAdmin, superAdminPrivateHeaders } from "../super-admin/access.server";
import { ownerOverviewMonitoringContext } from "../super-admin/request-context";
import { OwnerSystemUnavailableError } from "../../db/owner-system-error";
import { SuperAdminOverview } from "../super-admin/overview";
import { ForumRouteError } from "../forum/ui";
export function headers() { return superAdminPrivateHeaders; }
export function meta() { return [{ title: "Super-admin · Vico Forum" }]; }
export async function loader({request,params,context}:{request:Request;params:{locale?:string};context:RouterContextProvider}) {
  const viewerId=requireSuperAdmin(context);
  if(new URL(request.url).searchParams.size)throw new Response("Invalid overview query",{status:400,headers:superAdminPrivateHeaders});
  try {
    return data({locale:params.locale??"en",state:await context.get(ownerOverviewMonitoringContext).readCurrent(),viewerId},{headers:superAdminPrivateHeaders});
  } catch(error) {
    if(error instanceof OwnerSystemUnavailableError) throw new Response("Unavailable",{status:503,headers:superAdminPrivateHeaders});
    throw error;
  }
}
export default function SuperAdminRoute() {
  const {locale,state,viewerId}=useLoaderData<typeof loader>();
  return <SuperAdminOverview locale={locale} state={state} viewerId={viewerId}/>;
}
export const ErrorBoundary=ForumRouteError;
