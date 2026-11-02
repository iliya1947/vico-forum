import type {RouterContextProvider} from "react-router";
import {complaintReviewContext} from "../complaints/review-context";
import {complaintReviewer,complaintHttpError} from "../complaints/queue.server";
import {complaintId} from "../../db/complaints-domain";
import {attachmentBucketForRequest,AttachmentBucketUnavailableError} from "../forum/attachment-request-context";
import {reviewHeaders} from "../complaints/review.server";

const evidenceHeaders={...reviewHeaders,"X-Content-Type-Options":"nosniff","Content-Security-Policy":"sandbox"};
export function headers(){return evidenceHeaders;}
function safeDisposition(name:string){
 const fallback=name.replace(/[^\x20-\x7e]|["\\]/gu,"_").slice(0,180)||"attachment";
 const encoded=encodeURIComponent(name).replace(/[!'()*]/gu,ch=>"%"+ch.charCodeAt(0).toString(16).toUpperCase());
 return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
export async function loader({params,context}:{params:{caseId?:string;attachmentId?:string};context:RouterContextProvider}){
 try{
  const actor=await complaintReviewer(context);
  const item=await context.get(complaintReviewContext).evidence(actor,complaintId(params.caseId),complaintId(params.attachmentId));
  try{
   const bucket=attachmentBucketForRequest(context);
   const object=await bucket.get(item.objectKey,{range:{offset:0,length:item.byteSize}});
   if(!object?.body||object.size!==item.byteSize)return new Response(null,{status:503,headers:evidenceHeaders});
   return new Response(object.body,{headers:{...evidenceHeaders,"Content-Type":"application/octet-stream",
     "Content-Disposition":safeDisposition(item.fileName)}});
  }catch(error){
   if(error instanceof AttachmentBucketUnavailableError)return new Response(null,{status:503,headers:evidenceHeaders});
   return new Response(null,{status:503,headers:evidenceHeaders});
  }
 }catch(error){return complaintHttpError(error);}
}
