import {data,useLoaderData,type RouterContextProvider} from "react-router";
import {requireAdminForumAccess,adminObjectId,readAdminForum,adminPrivateHeaders} from "../admin/forum.server";
import {AdminSectionView} from "../admin/forum";
import {ForumRouteError} from "../forum/ui";
export {headers,meta} from "./admin";
export async function loader({params,context}:{params:{locale?:string;sectionId?:string};context:RouterContextProvider}) {
  const access=await requireAdminForumAccess(context);
  const id=adminObjectId(params.sectionId);
  const section=await readAdminForum(context,reader=>reader.readSection(id));
  if(!section)throw new Response("Not found",{status:404,headers:adminPrivateHeaders});
  return data({locale:params.locale??"en",access,section},{headers:adminPrivateHeaders});
}
export default function AdminSectionRoute(){return <AdminSectionView {...useLoaderData<typeof loader>()}/>;}
export const ErrorBoundary=ForumRouteError;
