import {data,type RouterContextProvider} from "react-router";
import {complaintReviewContext} from "../complaints/review-context";
import {complaintReviewer,complaintHttpError} from "../complaints/queue.server";
import {complaintId} from "../../db/complaints-domain";
import {reviewHeaders} from "../complaints/review.server";
export function headers(){return reviewHeaders;}
export async function loader({params,context}:{params:{caseId?:string;postId?:string};context:RouterContextProvider}){
 try{
  const actor=await complaintReviewer(context);
  const post=await context.get(complaintReviewContext).context(actor,complaintId(params.caseId),complaintId(params.postId));
  return data(post,{headers:reviewHeaders});
 }catch(error){return complaintHttpError(error);}
}
