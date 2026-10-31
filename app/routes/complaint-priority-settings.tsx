import { data, useLoaderData, type RouterContextProvider } from "react-router";
import { complaintQueueContext } from "../complaints/queue-context";
import { complaintCommand, complaintCommandFailure, complaintHttpError, complaintReviewer, complaintPrivateHeaders } from "../complaints/queue.server";
import { COMPLAINT_REASONS, ComplaintInputError } from "../../db/complaints-domain";
import type { ComplaintPriorityWeights } from "../complaints/queue-contract";
import { ComplaintPrioritySettingsView } from "../complaints/priority-settings-view";
import { ForumRouteError } from "../forum/ui";
import { authorizationForRequest } from "../authorization/request-context";

export function headers() { return complaintPrivateHeaders; }
export async function loader({params,context}:{params:{locale?:string};context:RouterContextProvider}) {
  try {
    const actor=await complaintReviewer(context,"forum.complaint.priority.manage");
    const settings=await context.get(complaintQueueContext).readPrioritySettings(actor);
    const canReview=await authorizationForRequest(context).forUser(actor).has("forum.complaint.review");
    return data({locale:params.locale??"en",settings,canReview},{headers:complaintPrivateHeaders});
  } catch(error) { return complaintHttpError(error); }
}
export async function action({request,context}:{request:Request;context:RouterContextProvider}) {
  try {
    const {actor,form}=await complaintCommand(request,context,"forum.complaint.priority.manage");
    const version=form.get("expectedVersion");
    if(!version||!/^[1-9]\d{0,9}$/.test(version)||Number(version)>2147483647||
      [...form.keys()].some(key=>key!=="expectedVersion"&&!COMPLAINT_REASONS.includes(key as typeof COMPLAINT_REASONS[number])))
      throw new ComplaintInputError();
    const weights=Object.fromEntries(COMPLAINT_REASONS.map(reason=>{
      const priority=form.get(reason);if(!["1","2","3"].includes(priority??""))throw new ComplaintInputError();
      return [reason,Number(priority)];
    })) as ComplaintPriorityWeights;
    await context.get(complaintQueueContext).savePrioritySettings(actor,{expectedVersion:Number(version),weights});
    return data({ok:true as const},{headers:complaintPrivateHeaders});
  } catch(error) { return complaintCommandFailure(error); }
}
export default function ComplaintPrioritySettingsRoute() { return <ComplaintPrioritySettingsView {...useLoaderData<typeof loader>()}/>; }
export const ErrorBoundary=ForumRouteError;
