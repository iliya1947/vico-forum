import {data,useLoaderData,type RouterContextProvider} from "react-router";
import {requireAdminForumAccess,adminBrowseQuery,readAdminForum,adminPrivateHeaders} from "../admin/forum.server";
import {AdminForumView} from "../admin/forum";
import {ForumRouteError} from "../forum/ui";
export {headers,meta} from "./admin";
export async function loader({request,params,context}:{request:Request;params:{locale?:string};context:RouterContextProvider}) {
  const access=await requireAdminForumAccess(context);
  const query=adminBrowseQuery(request.url);
  const page=await readAdminForum(context,reader=>reader.listCategories(query));
  return data({locale:params.locale??"en",access,page,query},{headers:adminPrivateHeaders});
}
export default function AdminForumRoute(){return <AdminForumView {...useLoaderData<typeof loader>()}/>;}
export const ErrorBoundary=ForumRouteError;
