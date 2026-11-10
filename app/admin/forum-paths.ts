import type { AdminBrowseQuery } from "../../db/admin-forum";
import { defaultAdministrativeRouting, type AdministrativeRouting } from "../administrative-routing/addresses";
export function adminForumPath(locale: string, routing: AdministrativeRouting = defaultAdministrativeRouting) {
  return routing.admin.forum(locale);
}
export function adminCategoryPath(locale: string, id: string, routing: AdministrativeRouting = defaultAdministrativeRouting) {
  return routing.admin.category(locale, id);
}
export function adminSectionPath(locale: string, id: string, routing: AdministrativeRouting = defaultAdministrativeRouting) {
  return routing.admin.section(locale, id);
}
export function adminTopicPath(locale: string, id: string, routing: AdministrativeRouting = defaultAdministrativeRouting) {
  return routing.admin.topic(locale, id);
}
export function adminBrowsePath(path: string, query: AdminBrowseQuery) {
  const params = new URLSearchParams();
  if (query.search) params.set("q", query.search);
  if (query.after) params.set("after", query.after);
  return path + (params.size ? `?${params}` : "");
}
