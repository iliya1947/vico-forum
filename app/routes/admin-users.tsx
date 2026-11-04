import { data, useLoaderData, type RouterContextProvider } from "react-router";
import { requireAdminUsersAccess, adminBrowseQuery, readAdminUsers, adminPrivateHeaders } from "../admin/users.server";
import { AdminUsersIndex } from "../admin/users";
import { ForumRouteError } from "../forum/ui";
export { headers, meta } from "./admin";

export async function loader({ request, params, context }: {
  request: Request; params: { locale?: string }; context: RouterContextProvider;
}) {
  const access = await requireAdminUsersAccess(context);
  const query = adminBrowseQuery(request.url);
  const page = await readAdminUsers(context, reader => reader.listUsers(query));
  return data({ locale: params.locale ?? "en", access, query, page }, { headers: adminPrivateHeaders });
}
export default function AdminUsersRoute() {
  return <AdminUsersIndex {...useLoaderData<typeof loader>()} />;
}
export const ErrorBoundary = ForumRouteError;
