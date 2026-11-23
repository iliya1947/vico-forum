import { data, type RouterContextProvider } from "react-router";
import { forumStructureReaderContext, requireStructureRead, structureQuery, structureReadError } from "../admin/structure.server";
import { structureIdentity } from "../../db/structure-browse";
import { adminPrivateHeaders } from "../admin/forum.server";
export function headers(){return adminPrivateHeaders;}
// Read-only resource in F4. The shared direct/inline form is supplied by F5.
export async function loader({request,params,context}:{request:Request;params:{topicId?:string};context:RouterContextProvider}) {
  const actorId=await requireStructureRead(context,true);
  try {
    structureQuery(request.url,true);
    const result=await context.get(forumStructureReaderContext).readMoveContext(actorId,structureIdentity(params.topicId));
    if(!result)throw new Response("Not found",{status:404,headers:adminPrivateHeaders});
    return data(result,{headers:adminPrivateHeaders});
  }catch(error){return structureReadError(error);}
}
