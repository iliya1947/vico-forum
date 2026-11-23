import { data, type RouterContextProvider } from "react-router";
import { forumStructureReaderContext, requireStructureRead, structureQuery, structureReadError } from "../admin/structure.server";
import { adminPrivateHeaders } from "../admin/forum.server";
import { inlineStructureQuery, inlineStructureError } from "../admin/structure-inline.server";
export function headers(){return adminPrivateHeaders;}
export async function loader({request,context}:{request:Request;context:RouterContextProvider}) {
  const inline=inlineStructureQuery(request.url);
  try {
    const actorId=await requireStructureRead(context,false);
    const result=await context.get(forumStructureReaderContext)
      .listDestinations(actorId,structureQuery(inline?.url??request.url));
    return data(inline?{...result,readId:inline.readId}:result,{headers:adminPrivateHeaders});
  }catch(error){
    let mapped:unknown=error;
    try {structureReadError(error);} catch(failure){mapped=failure;}
    if(inline)return inlineStructureError(mapped,inline.readId);
    throw mapped;
  }
}
