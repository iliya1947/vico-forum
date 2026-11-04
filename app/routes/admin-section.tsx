import {data,useLoaderData,type RouterContextProvider} from "react-router";
import {requireAdminForumAccess,adminBrowseQuery,adminObjectId,readAdminForum,adminPrivateHeaders} from "../admin/forum.server";
import {AdminSectionView} from "../admin/forum";
import {ForumRouteError} from "../forum/ui";
export {headers,meta} from "./admin";
export async function loader({request,params,context}:{request:Request;params:{locale?:string;sectionId?:string};context:RouterContextProvider}) {
  const access=await requireAdminForumAccess(context);
  const id=adminObjectId(params.sectionId);const query=adminBrowseQuery(request.url);
  const result=await readAdminForum(context,reader=>reader.readSectionTopics(id,query));
  if(!result)throw new Response("Not found",{status:404,headers:adminPrivateHeaders});
  return data({locale:params.locale??"en",access,...result,query},{headers:adminPrivateHeaders});
}
export default function AdminSectionRoute(){return <AdminSectionView {...useLoaderData<typeof loader>()}/>;}
export const ErrorBoundary=ForumRouteError;
