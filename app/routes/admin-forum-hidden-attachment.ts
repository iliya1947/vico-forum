import type { RouterContextProvider } from "react-router";
import { requireAdminAccess } from "../admin/access.server";
import { readHiddenAttachment } from "../admin/visibility-queue.server";
import { adminObjectId } from "../admin/forum.server";
import { isForumAttachmentUuid } from "../../db/forum-attachments";
import { deliverAttachment } from "./attachment-download";

const privateHeaders={
  "Cache-Control":"private, no-store",
  "Content-Security-Policy":"sandbox",
  "X-Content-Type-Options":"nosniff",
};
function failure(status:number):Response {
  return new Response(null,{status,headers:privateHeaders});
}
export function headers(){return privateHeaders;}

/**
 * Fresh capability and active-account admission on each private asset request.
 * Published exact membership and effective hidden state are checked before bucket.get.
 */
export async function loader({request,params,context}:{
  request:Request;
  params:{topicId?:string;postId?:string;attachmentId?:string};
  context:RouterContextProvider;
}):Promise<Response> {
  try {
    const access=await requireAdminAccess(context);
    if(!access.canManageVisibility)return failure(403);
    const topicId=adminObjectId(params.topicId),postId=adminObjectId(params.postId);
    const attachmentId=params.attachmentId??"";
    if(!isForumAttachmentUuid(attachmentId))return failure(404);
    const query=new URL(request.url).searchParams;
    const app=new URLSearchParams();
    for(const [key,value] of query){
      if(key!==".data"&&key!=="_routes")app.append(key,value);
    }
    if([...app.keys()].some(key=>key!=="view")||app.getAll("view").length>1)return failure(400);
    const view=app.get("view");
    if(view!==null&&view!=="inline"&&view!=="text")return failure(400);
    const attachment=await readHiddenAttachment(context,topicId,postId,attachmentId);
    if(!attachment)return failure(404);
    return await deliverAttachment(context,attachment,view);
  }catch(error){
    if(error instanceof Response&&[400,401,403,404,503].includes(error.status))return failure(error.status);
    return failure(503);
  }
}
