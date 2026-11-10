import { administrativeRoutingForRequest } from "../administrative-routing/request-context";
import {adminForumPath} from "../admin/forum-paths";
import { adminUsersPath } from "../admin/users-paths";
import { adminPrivateHeaders } from "../admin/users.server";
import { requireAdminAccess } from "../admin/access.server";
import type { RouterContextProvider } from "react-router";
import { redirect, useLoaderData } from "react-router";
import { UnderDevelopmentView } from "../forum/under-development-view";

export function loader({ request, params, context }: { request: Request; params: { locale?: string }; context?: RouterContextProvider }) {
  const feature = new URL(request.url).searchParams.get("feature");
  if (feature === "admin-forum") return redirect(adminForumPath(params.locale ?? "en",
    context ? administrativeRoutingForRequest(context) : undefined));
  if (feature === "admin-users") {
    if (!context) throw new Response("Unauthorized", { status: 401, headers: { "Cache-Control": "private, no-store" } });
    return requireAdminAccess(context).then(access => {
      if (access.canReadUsers) return redirect(adminUsersPath(params.locale ?? "en", administrativeRoutingForRequest(context)), { headers: adminPrivateHeaders });
      if (access.canManageAuthorization) return redirect(administrativeRoutingForRequest(context).admin.authorization(params.locale ?? "en") + "#authorization-users-heading", { headers: adminPrivateHeaders });
      throw new Response("Forbidden", { status: 403, headers: { "Cache-Control": "private, no-store" } });
    });
  }
  return {
    locale: params.locale ?? "en",
    requestedFeature: new URL(request.url).searchParams.get("feature"),
  };
}

export default function UnderDevelopmentRoute() {
  return <UnderDevelopmentView {...useLoaderData<typeof loader>()} />;
}
