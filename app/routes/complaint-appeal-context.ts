import {registryForRequest} from "../localization/request-context";
import {RegistryConnectionUnavailableError} from "../localization/persistent-registry";
import {ComplaintStorageUnavailableError} from "../../db/hyperdrive-complaints";
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
  let registry;
  try{({registry}=await registryForRequest(context));}
  catch(error){
   if(error instanceof RegistryConnectionUnavailableError)
     throw new ComplaintStorageUnavailableError("source registry unavailable",{cause:error});
   throw error;
  }
  const direction=result.source.sourceLocale==="und"?"auto":
    registry.find(result.source.sourceLocale)?.locale.direction??"auto";
  return data({...result,source:{...result.source,direction}},{headers:complaintPrivateHeaders});
 }catch(error){return complaintHttpError(error);}
}
