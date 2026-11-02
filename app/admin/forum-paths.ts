import type {AdminBrowseQuery} from "../../db/admin-forum";
export function adminForumPath(locale:string) {return `/${encodeURIComponent(locale)}/admin/forum`;}
export function adminCategoryPath(locale:string,id:string) {return `${adminForumPath(locale)}/categories/${encodeURIComponent(id)}`;}
export function adminSectionPath(locale:string,id:string) {return `${adminForumPath(locale)}/sections/${encodeURIComponent(id)}`;}
export function adminBrowsePath(path:string,query:AdminBrowseQuery) {
  const params=new URLSearchParams();if(query.search)params.set("q",query.search);if(query.after)params.set("after",query.after);
  return path+(params.size?`?${params}`:"");
}
