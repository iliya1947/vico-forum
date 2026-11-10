import type { AdminBrowseQuery } from "../../db/admin-forum";
import { defaultAdministrativeRouting, type AdministrativeRouting } from "../administrative-routing/addresses";
export function adminUsersPath(locale: string, routing: AdministrativeRouting = defaultAdministrativeRouting) {
  return routing.admin.users(locale);
}
export function adminUserPath(locale: string, id: string, routing: AdministrativeRouting = defaultAdministrativeRouting) {
  return routing.admin.user(locale, id);
}
export function adminUsersBrowsePath(locale: string, query: AdminBrowseQuery, routing: AdministrativeRouting = defaultAdministrativeRouting) {
  const params = new URLSearchParams();
  if (query.search) params.set("q", query.search);
  if (query.after) params.set("after", query.after);
  const search = params.toString();
  return adminUsersPath(locale, routing) + (search ? `?${search}` : "");
}
