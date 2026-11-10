import { data, useLoaderData, type RouterContextProvider } from "react-router";
import { requireSuperAdmin, superAdminPrivateHeaders } from "../super-admin/access.server";
import { SuperAdminMonitoringIndex } from "../super-admin/view";
import { ForumRouteError } from "../forum/ui";
export {headers,meta} from "./super-admin";
export function loader({params,context}:{params:{locale?:string};context:RouterContextProvider}) {
  requireSuperAdmin(context);
  return data({locale:params.locale??"en"},{headers:superAdminPrivateHeaders});
}
export default function SuperAdminMonitoringRoute() {
  return <SuperAdminMonitoringIndex {...useLoaderData<typeof loader>()}/>;
}
export const ErrorBoundary=ForumRouteError;
