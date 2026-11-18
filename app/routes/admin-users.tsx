import { data, useLoaderData, type RouterContextProvider } from "react-router";
import { requireAdminUsersAccess, adminBrowseQuery, readAdminUsers, adminPrivateHeaders } from "../admin/users.server";
import { AdminUsersIndex } from "../admin/users";
import { DELETED_USER_NAME } from "../../db/public-identity";
import { ForumRouteError } from "../forum/ui";
export { headers, meta } from "./admin";

export async function loader({ request, params, context }: {
  request: Request; params: { locale?: string }; context: RouterContextProvider;
}) {
  const access = await requireAdminUsersAccess(context);
  const query = adminBrowseQuery(request.url);
  const page = await readAdminUsers(context, reader => reader.listUsers(query));
  return data({
    locale: params.locale ?? "en", access, query,
    page: {
      items: page.items.map(({ id, name, image, joinedAt, identityKind }) => ({
        id, name: identityKind === "deleted" ? DELETED_USER_NAME : name,
        image: identityKind === "deleted" ? null : image, joinedAt,
        ...(identityKind === "deleted" ? { identityKind } : {}),
      })),
      total: page.total, next: page.next,
    },
  }, { headers: adminPrivateHeaders });
}
export default function AdminUsersRoute() {
  return <AdminUsersIndex {...useLoaderData<typeof loader>()} />;
}
export const ErrorBoundary = ForumRouteError;
