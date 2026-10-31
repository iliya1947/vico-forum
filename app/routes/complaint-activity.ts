import type { RouterContextProvider } from "react-router";
import { complaintQueueContext } from "../complaints/queue-context";
import { complaintCommand, complaintHttpError, complaintPrivateHeaders } from "../complaints/queue.server";
import { complaintId, ComplaintInputError } from "../../db/complaints-domain";

export function headers(){return complaintPrivateHeaders;}
export function loader(){throw new Response("Method Not Allowed",{status:405,headers:{...complaintPrivateHeaders,Allow:"POST"}});}
export async function action({request,params,context}:{request:Request;params:{caseId?:string};context:RouterContextProvider}):Promise<Response> {
  try{
    const {actor,form}=await complaintCommand(request,context);
    if(!["true","false"].includes(form.get("active")??""))throw new ComplaintInputError();
    await context.get(complaintQueueContext).activity(actor,complaintId(params.caseId),form.get("active")==="true");
    return new Response(null,{status:204,headers:complaintPrivateHeaders});
  }catch(error){return complaintHttpError(error);}
}
