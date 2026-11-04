import type { AdminBrowseQuery } from "../../db/admin-forum";
export function adminUsersPath(locale: string) { return `/${encodeURIComponent(locale)}/admin/users`; }
export function adminUserPath(locale: string, id: string) { return `${adminUsersPath(locale)}/${encodeURIComponent(id)}`; }
export function adminUsersBrowsePath(locale: string, query: AdminBrowseQuery) {
  const params = new URLSearchParams();
  if (query.search) params.set("q", query.search);
  if (query.after) params.set("after", query.after);
  const search = params.toString();
  return adminUsersPath(locale) + (search ? `?${search}` : "");
}
