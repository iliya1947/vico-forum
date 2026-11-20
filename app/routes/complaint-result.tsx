import {useLoaderData,type RouterContextProvider,type ShouldRevalidateFunctionArgs} from "react-router";
import {authSessionForRequest} from "../auth/request-context";
import {complaintAppealContext} from "../complaints/appeal-context";
import {readAppealForm} from "../complaints/appeal.server";
import {complaintHttpError,complaintCommandFailure,complaintPrivateHeaders} from "../complaints/queue.server";
import {complaintId,ComplaintInputError} from "../../db/complaints-domain";
import {ForumShell,ForumRouteError} from "../forum/ui";
import {ComplaintResultView} from "../complaints/result-view";
export function headers(){return complaintPrivateHeaders;}
export function shouldRevalidate({actionStatus,formData,defaultShouldRevalidate}:ShouldRevalidateFunctionArgs){
 if(actionStatus===409&&formData?.get("intent")==="appeal")return true;
 return defaultShouldRevalidate;
}
export async function loader({params,context}:{params:{caseId?:string;locale?:string};context:RouterContextProvider}){
 try{
  const session=authSessionForRequest(context);
  if(!session)throw new Response("Unauthorized",{status:401,headers:complaintPrivateHeaders});
  const result=await context.get(complaintAppealContext).ownResult(session.user.id,complaintId(params.caseId));
  return {locale:params.locale??"en",result:{...result,decidedAt:new Date(result.decidedAt).toISOString(),
    appeals:result.appeals.map(a=>({...a,resolvedAt:a.resolvedAt?new Date(a.resolvedAt).toISOString():null}))}};
 }catch(error){return complaintHttpError(error);}
}
export async function action({request,params,context}:{request:Request;params:{caseId?:string};context:RouterContextProvider}){
 try{
  const session=authSessionForRequest(context);
  if(!session)throw new Response("Unauthorized",{status:401,headers:complaintPrivateHeaders});
  const form=await readAppealForm(request,32768,["intent","decisionId","operationId","argument"]);
  if(form.get("intent")!=="appeal")throw new ComplaintInputError("invalid intent");
  const result=await context.get(complaintAppealContext).submit(session.user.id,{
    caseId:complaintId(params.caseId),decisionId:complaintId(form.get("decisionId")),
    operationId:complaintId(form.get("operationId")),argument:form.get("argument")!});
  return {ok:true,appealId:result,operationId:form.get("operationId")!};
 }catch(error){return complaintCommandFailure(error);}
}
export default function ComplaintResultRoute(){
 const {locale,result}=useLoaderData<typeof loader>();
 return <ComplaintResultView locale={locale} result={result}/>;
}
export const ErrorBoundary=ForumRouteError;
