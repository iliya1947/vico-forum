import { strictPageQuery } from "../complaints/page-query";
import { useLoaderData,type RouterContextProvider } from "react-router";
import { complaintQueueContext } from "../complaints/queue-context";
import { complaintHttpError,complaintReviewer,complaintPrivateHeaders } from "../complaints/queue.server";
import { complaintId } from "../../db/complaints-domain";
import { ComplaintTimelineView } from "../complaints/history-view";
import { ForumRouteError } from "../forum/ui";
export function headers(){return complaintPrivateHeaders;}
export async function loader({params,context,url}:{params:{caseId?:string;locale?:string};context:RouterContextProvider;url:URL}){
 try{
  const actor=await complaintReviewer(context);
  const page=strictPageQuery(url.searchParams,["page"]);
  const timeline=await context.get(complaintQueueContext).readHistoryTimeline(actor,complaintId(params.caseId),page);
  return {locale:params.locale??"en",timeline};
 }catch(error){return complaintHttpError(error);}
}
export default function ComplaintHistoryRoute(){return <ComplaintTimelineView {...useLoaderData<typeof loader>()}/>;}
export const ErrorBoundary=ForumRouteError;
