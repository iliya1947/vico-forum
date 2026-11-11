import { redirect, type RouterContextProvider } from "react-router";
import { requireAdminUsersAccess, adminObjectId, adminPrivateHeaders } from "../admin/users.server";
import { forumReaderForRequest } from "../forum/request-context";
import { forumProfilePath } from "../forum/paths";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { ForumRouteError } from "../forum/ui";
export { headers, meta } from "./admin";

/** Old AP09 detail is a guarded compatibility entry, never a second user-detail page. */
export async function loader({ params, context }: {
  params: { locale?: string; userId?: string }; context: RouterContextProvider;
}) {
  await requireAdminUsersAccess(context);
  const id = adminObjectId(params.userId);
  try {
    const profile = await forumReaderForRequest(context).readProfile(id);
    if (!profile) throw new Response("Not found", { status: 404, headers: adminPrivateHeaders });
    return redirect(forumProfilePath(params.locale ?? "en", profile.id), { headers: adminPrivateHeaders });
  } catch (error) {
    if (error instanceof ForumStorageUnavailableError) {
      throw new Response("Unavailable", { status: 503, headers: adminPrivateHeaders });
    }
    throw error;
  }
}
export const ErrorBoundary = ForumRouteError;
