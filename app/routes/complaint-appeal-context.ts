import {data,type RouterContextProvider} from "react-router";
import {complaintAppealContext} from "../complaints/appeal-context";
import {complaintReviewer,complaintHttpError,complaintPrivateHeaders} from "../complaints/queue.server";
import {complaintId} from "../../db/complaints-domain";
export function headers(){return complaintPrivateHeaders;}
export async function loader({params,context}:{params:{caseId?:string;appealId?:string;postId?:string};context:RouterContextProvider}){
 try{
  const actor=await complaintReviewer(context,"forum.complaint.appeal.review");
  const result=await context.get(complaintAppealContext).context(actor,complaintId(params.caseId),
    complaintId(params.appealId),complaintId(params.postId));
  return data(result,{headers:complaintPrivateHeaders});
 }catch(error){return complaintHttpError(error);}
}
