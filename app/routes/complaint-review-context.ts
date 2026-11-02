import {data,type RouterContextProvider} from "react-router";
import {registryForRequest} from "../localization/request-context";
import {RegistryConnectionUnavailableError} from "../localization/persistent-registry";
import {ComplaintStorageUnavailableError} from "../../db/hyperdrive-complaints";
import {complaintReviewContext} from "../complaints/review-context";
import {complaintReviewer,complaintHttpError} from "../complaints/queue.server";
import {complaintId} from "../../db/complaints-domain";
import {reviewHeaders} from "../complaints/review.server";
export function headers(){return reviewHeaders;}
export async function loader({params,context}:{params:{caseId?:string;postId?:string};context:RouterContextProvider}){
 try{
  const actor=await complaintReviewer(context);
  const post=await context.get(complaintReviewContext).context(actor,complaintId(params.caseId),complaintId(params.postId));
  let registry;
  try{({registry}=await registryForRequest(context));}
  catch(error){
   if(error instanceof RegistryConnectionUnavailableError)throw new ComplaintStorageUnavailableError("source registry unavailable",{cause:error});
   throw error;
  }
  const direction=post.source.sourceLocale==="und"?"auto":registry.find(post.source.sourceLocale)?.locale.direction??"auto";
  return data({...post,source:{...post.source,direction}},{headers:reviewHeaders});
 }catch(error){return complaintHttpError(error);}
}
