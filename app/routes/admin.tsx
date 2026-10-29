import { data, useLoaderData, type RouterContextProvider } from "react-router";
import { requireAdminAccess } from "../admin/access.server";
import { AdminOverview } from "../admin/overview";
import { ForumRouteError } from "../forum/ui";
import { forumReaderForRequest } from "../forum/request-context";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";

export function headers() { return {"Cache-Control":"private, no-store"}; }
export function meta() { return [{title:"Admin panel · Vico Forum"}]; }
export async function loader({params,context}: {params: {locale?: string}; context: RouterContextProvider}) {
  const access=await requireAdminAccess(context);
  let counts;
  try { counts=await forumReaderForRequest(context).readAdminOverviewCounts(); }
  catch (error) {
    if (!(error instanceof ForumStorageUnavailableError)) throw error;
    counts=null;
  }
  return data({locale:params.locale ?? "en",access,counts},{headers:{"Cache-Control":"private, no-store"}});
}
export default function AdminRoute() { return <AdminOverview {...useLoaderData<typeof loader>()} />; }
export const ErrorBoundary=ForumRouteError;
