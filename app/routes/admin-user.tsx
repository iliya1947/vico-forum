import { useEffect, useRef } from "react";
import { data, isRouteErrorResponse, useLoaderData, useLocation, useNavigate, useRouteError, type RouterContextProvider } from "react-router";
import { requireAdminUsersAccess, adminObjectId, adminPrivateHeaders } from "../admin/users.server";
import { forumReaderForRequest } from "../forum/request-context";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationForRequest } from "../authorization/request-context";
import { AuthorizationNotFoundError } from "../../db/authorization-repository";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { PERMISSION_CATALOG } from "../authorization/catalog";
import { AdminUserDetail } from "../admin/users";
import { ForumRouteError } from "../forum/ui";
export { headers, meta } from "./admin";

export async function loader({ params, context }: {
  params: { locale?: string; userId?: string }; context: RouterContextProvider;
}) {
  const access = await requireAdminUsersAccess(context);
  const id = adminObjectId(params.userId);
  try {
    const profile = await forumReaderForRequest(context).readProfile(id);
    if (!profile) throw new Response("Not found", { status: 404, headers: adminPrivateHeaders });
    const user = {
      id: profile.id, name: profile.name, image: profile.image,
      joinedAt: profile.joinedAt.toISOString(), bio: profile.bio,
      githubUrl: profile.githubUrl, websiteUrl: profile.websiteUrl,
      role: { slug: profile.role.slug, displayName: profile.role.displayName, isSystem: profile.role.isSystem },
      messageCount: profile.messageCount, bestAnswerCount: profile.bestAnswerCount,
    };
    // The independent admin.users.read gate never grants access to authorization management data.
    if (!access.canManageAuthorization) {
      return data({ locale: params.locale ?? "en", access, user }, { headers: adminPrivateHeaders });
    }
    const management = await authorizationForRequest(context).readUserManagementState(id);
    const managerActorId = authSessionForRequest(context)!.user.id;
    return data({ locale: params.locale ?? "en", access, user,
      management, managerActorId, permissions: PERMISSION_CATALOG }, { headers: adminPrivateHeaders });
  } catch (error) {
    if (error instanceof AuthorizationNotFoundError) {
      throw new Response("Not found", { status: 404, headers: adminPrivateHeaders });
    }
    if (error instanceof AuthorizationUnavailableError) {
      throw new Response("Unavailable", { status: 503, headers: adminPrivateHeaders });
    }
    if (error instanceof ForumStorageUnavailableError) {
      throw new Response("Unavailable", { status: 503, headers: adminPrivateHeaders });
    }
    throw error;
  }
}
export default function AdminUserRoute() {
  return <AdminUserDetail {...useLoaderData<typeof loader>()} />;
}
export function ErrorBoundary() {
  const error = useRouteError();
  const location = useLocation();
  const navigate = useNavigate();
  const denied = isRouteErrorResponse(error) && error.status === 403;
  const recoveryAttempted = useRef(false);

  useEffect(() => {
    if (!denied || recoveryAttempted.current) return;
    recoveryAttempted.current = true;
    // Limit a denial to one GET while this error boundary is mounted.
    // A successful read-only detail unmounts it, allowing a later independent denial to recover.
    void navigate(location.pathname + location.search + location.hash, { replace: true });
  }, [denied, location.pathname, location.search, location.hash, navigate]);

  return <ForumRouteError />;
}
