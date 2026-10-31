import { data, useLoaderData, type RouterContextProvider } from "react-router";
import { complaintQueueContext } from "../complaints/queue-context";
import { complaintCommand, complaintCommandFailure, complaintHttpError, complaintReviewer, complaintPrivateHeaders } from "../complaints/queue.server";
import { complaintId, ComplaintInputError } from "../../db/complaints-domain";
import { ComplaintTriageView } from "../complaints/queue-view";
import { ForumRouteError } from "../forum/ui";
import { presentComplaintCases } from "../complaints/queue-presentation.server";

export function headers(){return complaintPrivateHeaders;}
export async function loader({params,context}:{params:{locale?:string;caseId?:string};context:RouterContextProvider}) {
  try{const actor=await complaintReviewer(context);
    const item=await context.get(complaintQueueContext).readTriage(actor,complaintId(params.caseId));
    return {locale:params.locale??"en",item:(await presentComplaintCases(context,[item]))[0]!};
  }catch(error){return complaintHttpError(error);}
}
export async function action({request,params,context}:{request:Request;params:{caseId?:string};context:RouterContextProvider}): Promise<ReturnType<typeof data<{ok:true}>>|ReturnType<typeof complaintCommandFailure>> {
  try{
    const {actor,form}=await complaintCommand(request,context);
    const priority=form.get("priority"), version=form.get("expectedVersion");
    if(!["auto","1","2","3"].includes(priority??"")||!version||!/^[1-9]\d{0,9}$/.test(version))throw new ComplaintInputError();
    await context.get(complaintQueueContext).changePriority(actor,{caseId:complaintId(params.caseId),
      operationId:complaintId(form.get("operationId")),expectedVersion:Number(version),priority:priority==="auto"?null:Number(priority)});
    return data({ok:true as const},{headers:complaintPrivateHeaders});
  }catch(error){return complaintCommandFailure(error);}
}
export default function ComplaintTriageRoute(){return <ComplaintTriageView {...useLoaderData<typeof loader>()}/>;}
export const ErrorBoundary=ForumRouteError;
