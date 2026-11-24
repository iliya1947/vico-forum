import { data, type RouterContextProvider } from "react-router";
import { forumStructureReaderContext, requireStructureRead, structureQuery, structureReadError } from "../admin/structure.server";
import { structureIdentity } from "../../db/structure-browse";
import { adminPrivateHeaders } from "../admin/forum.server";
import { inlineStructureQuery, inlineStructureError } from "../admin/structure-inline.server";
export function headers(){return adminPrivateHeaders;}
export async function loader({request,params,context}:{
  request:Request;params:{topicId?:string};context:RouterContextProvider;
}){
  const inline=inlineStructureQuery(request.url);
  try {
    const actorId=await requireStructureRead(context,true);
    structureQuery(inline?.url??request.url,true);
    const result=await context.get(forumStructureReaderContext).readMoveContext(actorId,structureIdentity(params.topicId));
    if(!result)throw new Response("Not found",{status:404,headers:adminPrivateHeaders});
    return data(inline?{...result,readId:inline.readId}:result,{headers:adminPrivateHeaders});
  }catch(error){
    let mapped:unknown=error;
    try {structureReadError(error);} catch(failure){mapped=failure;}
    if(inline)return inlineStructureError(mapped,inline.readId);
    throw mapped;
  }
}
export { default } from "../forum/topic-move-direct";
export { ForumRouteError as ErrorBoundary } from "../forum/ui";
