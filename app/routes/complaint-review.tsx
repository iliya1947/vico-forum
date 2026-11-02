import {data,useLoaderData,type RouterContextProvider,type ShouldRevalidateFunctionArgs} from "react-router";
import {registryForRequest} from "../localization/request-context";
import {RegistryConnectionUnavailableError} from "../localization/persistent-registry";
import {ComplaintStorageUnavailableError} from "../../db/hyperdrive-complaints";
import {complaintReviewContext} from "../complaints/review-context";
import {reviewPages,reviewHeaders} from "../complaints/review.server";
import {complaintReviewer,complaintHttpError,complaintCommandFailure} from "../complaints/queue.server";
import {complaintId,ComplaintInputError} from "../../db/complaints-domain";
import {requireSameOrigin} from "../forum/mutations.server";
import {ComplaintReviewView} from "../complaints/review-view";
import {ForumRouteError} from "../forum/ui";

export function headers(){return reviewHeaders;}
export function shouldRevalidate({actionStatus,formData,defaultShouldRevalidate}:ShouldRevalidateFunctionArgs){
 // A failed Decision leaves the reviewed version frozen, but must refresh the Case.
 if(actionStatus===409&&formData?.get("intent")==="decision")return true;
 return defaultShouldRevalidate;
}
export async function loader({url,params,context}:{request:Request;url:URL;params:{locale?:string;caseId?:string};context:RouterContextProvider}){
 try{
  const actor=await complaintReviewer(context);
  const id=complaintId(params.caseId);
  const page=await context.get(complaintReviewContext).read(actor,id,reviewPages(url.href));
  let registry;
  try{({registry}=await registryForRequest(context));}
  catch(error){
   if(error instanceof RegistryConnectionUnavailableError)throw new ComplaintStorageUnavailableError("source registry unavailable",{cause:error});
   throw error;
  }
  const direction=(locale:string)=>locale==="und"?"auto" as const:registry.find(locale)?.locale.direction??"auto" as const;
  const present=(source:typeof page.reported)=>({...source,direction:direction(source.sourceLocale)});
  const item={...page,reported:present(page.reported),current:present(page.current),
    currentTopicTitle:present(page.currentTopicTitle),
    context:{...page.context,items:page.context.items.map(post=>({...post,direction:direction(post.sourceLocale)}))}};
  return data({locale:params.locale??"en",item},{headers:reviewHeaders});
 }catch(e){return complaintHttpError(e);}
}
export async function action({request,params,context}:{request:Request;params:{caseId?:string};context:RouterContextProvider}){
 try{
  if(request.method!=="POST")throw new Response("Method Not Allowed",{status:405,headers:reviewHeaders});
  const actor=await complaintReviewer(context);
  if(!requireSameOrigin(request))throw new Response("Forbidden",{status:403,headers:reviewHeaders});
  if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded"))throw new ComplaintInputError();
  if(!request.body)throw new ComplaintInputError();
  const reader=request.body.getReader();const chunks:Uint8Array[]=[];let size=0;
  try{
    while(true){const p=await reader.read();if(p.done)break;size+=p.value.byteLength;
      if(size>262144){await reader.cancel();throw new ComplaintInputError();}chunks.push(p.value);}
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let pos=0;for(const part of chunks){bytes.set(part,pos);pos+=part.length;}
  let form:URLSearchParams;
  try{form=new URLSearchParams(new TextDecoder("utf-8",{fatal:true}).decode(bytes));}catch{throw new ComplaintInputError();}
  const intent=form.get("intent");
  const allowed=intent==="note"?["intent","operationId","body"]:intent==="decision"?
    ["intent","operationId","expectedVersion","outcome","reasoning"]:[];
  if(!allowed.length||[...form.keys()].some(k=>!allowed.includes(k)||form.getAll(k).length!==1)||allowed.some(k=>!form.has(k)))throw new ComplaintInputError();
  const caseId=complaintId(params.caseId),operationId=complaintId(form.get("operationId"));
  const review=context.get(complaintReviewContext);
  if(intent==="note"){
    await review.addNote(actor,{caseId,operationId,body:form.get("body")!});
  }else{
    const expected=form.get("expectedVersion")!;
    if(!/^[1-9]\d{0,9}$/.test(expected)||Number(expected)>2147483647)throw new ComplaintInputError();
    const outcome=form.get("outcome");
    if(outcome!=="confirmed"&&outcome!=="not-confirmed")throw new ComplaintInputError();
    await review.decide(actor,{caseId,operationId,expectedVersion:Number(expected),outcome,reasoning:form.get("reasoning")!});
  }
  return data({ok:true as const,intent,operationId},{headers:reviewHeaders});
 }catch(error){return complaintCommandFailure(error);}
}
export default function ComplaintReviewRoute(){const data=useLoaderData<typeof loader>();return <ComplaintReviewView key={data.item.id} {...data}/>;}
export const ErrorBoundary=ForumRouteError;
