import { data, type RouterContextProvider } from "react-router";
import { forumStructureReaderContext, requireStructureRead, structureQuery, structureReadError } from "../admin/structure.server";
import { adminPrivateHeaders } from "../admin/forum.server";
export function headers(){return adminPrivateHeaders;}
export async function loader({request,context}:{request:Request;context:RouterContextProvider}) {
  const actorId=await requireStructureRead(context,false);
  try {
    const result=await context.get(forumStructureReaderContext).listDestinations(actorId,structureQuery(request.url));
    return data(result,{headers:adminPrivateHeaders});
  }catch(error){return structureReadError(error);}
}
