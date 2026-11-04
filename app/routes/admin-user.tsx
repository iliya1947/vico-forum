import { data, useLoaderData, type RouterContextProvider } from "react-router";
import { requireAdminUsersAccess, adminObjectId, adminPrivateHeaders } from "../admin/users.server";
import { forumReaderForRequest } from "../forum/request-context";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
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
    return data({ locale: params.locale ?? "en", access, user }, { headers: adminPrivateHeaders });
  } catch (error) {
    if (error instanceof ForumStorageUnavailableError) {
      throw new Response("Unavailable", { status: 503, headers: adminPrivateHeaders });
    }
    throw error;
  }
}
export default function AdminUserRoute() {
  return <AdminUserDetail {...useLoaderData<typeof loader>()} />;
}
export const ErrorBoundary = ForumRouteError;
