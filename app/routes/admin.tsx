import { data, useLoaderData, type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationForRequest } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { forumReaderForRequest } from "../forum/request-context";
import { readAdminAccess, canEnterAdmin } from "../admin/access";
import { AdminOverview } from "../admin/overview";
import { ForumRouteError } from "../forum/ui";

export async function loader({ params, context }: {
  params: { locale?: string }; context: RouterContextProvider;
}) {
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthenticated", { status: 401, headers: { "Cache-Control": "no-store" } });
  let access;
  try {
    access = await readAdminAccess(authorizationForRequest(context).forUser(session.user.id));
  } catch (error) {
    if (error instanceof AuthorizationUnavailableError) throw new Response("Unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
    throw error;
  }
  if (!canEnterAdmin(access)) throw new Response("Forbidden", { status: 403, headers: { "Cache-Control": "no-store" } });
  const statistics = await forumReaderForRequest(context).readStatistics().catch((error: unknown) => {
    if (error instanceof ForumStorageUnavailableError) return null;
    throw error;
  });
  return data({ locale: params.locale ?? "en", access, statistics }, { headers: { "Cache-Control": "no-store" } });
}

export const ErrorBoundary = ForumRouteError;

export default function AdminRoute() {
  return <AdminOverview {...useLoaderData<typeof loader>()} />;
}
