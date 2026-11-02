import { useLoaderData,type RouterContextProvider } from "react-router";
import { complaintQueueContext } from "../complaints/queue-context";
import { complaintHttpError,complaintReviewer,complaintPrivateHeaders } from "../complaints/queue.server";
import { complaintId,ComplaintInputError } from "../../db/complaints-domain";
import { ComplaintTimelineView } from "../complaints/history-view";
import { ForumRouteError } from "../forum/ui";
export function headers(){return complaintPrivateHeaders;}
export async function loader({params,context,url}:{params:{caseId?:string;locale?:string};context:RouterContextProvider;url:URL}){
 try{
  const actor=await complaintReviewer(context);
  const value=url.searchParams.get("page")??"0";
  if([...url.searchParams.keys()].some(k=>k!=="page"||url.searchParams.getAll(k).length!==1)||
    !/^(0|[1-9]\\d{0,4})$/.test(value)||Number(value)>10000)throw new ComplaintInputError();
  const timeline=await context.get(complaintQueueContext).readHistoryTimeline(actor,complaintId(params.caseId),Number(value));
  return {locale:params.locale??"en",timeline};
 }catch(error){return complaintHttpError(error);}
}
export default function ComplaintHistoryRoute(){return <ComplaintTimelineView {...useLoaderData<typeof loader>()}/>;}
export const ErrorBoundary=ForumRouteError;
