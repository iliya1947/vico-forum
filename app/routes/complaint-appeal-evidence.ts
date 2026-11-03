import type {RouterContextProvider} from "react-router";
import {complaintAppealContext} from "../complaints/appeal-context";
import {complaintReviewer,complaintHttpError,complaintPrivateHeaders} from "../complaints/queue.server";
import {complaintId} from "../../db/complaints-domain";
import {attachmentBucketForRequest,AttachmentBucketUnavailableError} from "../forum/attachment-request-context";
const headersValue={...complaintPrivateHeaders,"X-Content-Type-Options":"nosniff","Content-Security-Policy":"sandbox"};
export function headers(){return headersValue;}
export async function loader({params,context}:{params:{caseId?:string;appealId?:string;attachmentId?:string};context:RouterContextProvider}){
 try{
  const actor=await complaintReviewer(context,"forum.complaint.appeal.review");
  const item=await context.get(complaintAppealContext).evidence(actor,complaintId(params.caseId),
    complaintId(params.appealId),complaintId(params.attachmentId));
  try{
   const bucket=attachmentBucketForRequest(context);
   const object=await bucket.get(item.objectKey,{range:{offset:0,length:item.byteSize}});
   if(!object?.body||object.size!==item.byteSize)return new Response(null,{status:503,headers:headersValue});
   const safe=item.fileName.replace(/[^\x20-\x7e]|["\\]/gu,"_").slice(0,180)||"attachment";
   const encoded=encodeURIComponent(item.fileName).replace(/[!\u0027()*]/gu,ch=>"%"+ch.charCodeAt(0).toString(16).toUpperCase());
   return new Response(object.body,{headers:{...headersValue,"Content-Type":"application/octet-stream",
     "Content-Disposition":`attachment; filename="${safe}"; filename*=UTF-8\u0027\u0027${encoded}`}});
  }catch(error){
   if(error instanceof AttachmentBucketUnavailableError)return new Response(null,{status:503,headers:headersValue});
   return new Response(null,{status:503,headers:headersValue});
  }
 }catch(error){return complaintHttpError(error);}
}
