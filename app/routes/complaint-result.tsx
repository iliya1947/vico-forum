import {useEffect,useRef,useState,type FormEvent} from "react";
import {useFetcher,useLoaderData,type RouterContextProvider} from "react-router";
import {authSessionForRequest} from "../auth/request-context";
import {complaintAppealContext} from "../complaints/appeal-context";
import {readAppealForm} from "../complaints/appeal.server";
import {complaintHttpError,complaintCommandFailure,complaintPrivateHeaders} from "../complaints/queue.server";
import {complaintId,ComplaintInputError} from "../../db/complaints-domain";
import {ForumShell,ForumRouteError} from "../forum/ui";
import {useTranslation} from "react-i18next";
export function headers(){return complaintPrivateHeaders;}
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
 const {locale,result}=useLoaderData<typeof loader>();const {t}=useTranslation("common");
 const appeal=useFetcher<{ok?:true;appealId?:string;operationId?:string;error?:string}>();
 const [argument,setArgument]=useState("");const nonce=useRef("");const ack=useRef("");
 useEffect(()=>{if(appeal.data?.ok&&appeal.data.operationId===nonce.current&&ack.current!==nonce.current){
   ack.current=nonce.current;nonce.current="";setArgument("");
 }},[appeal.data]);
 const onSubmit=(event:FormEvent<HTMLFormElement>)=>{
  const input=event.currentTarget.elements.namedItem("operationId") as HTMLInputElement;
  if(!nonce.current)nonce.current=crypto.randomUUID();
  input.value=nonce.current;
 };
 return <ForumShell locale={locale} variant="notifications"><section className="complaint-review">
  <h1>{t("complaintReviewDecision")}</h1>
  <h2>{t("complaintAppealInitialResult")}</h2>
  <p>{result.outcome==="confirmed"?t("complaintReviewConfirmed"):t("complaintReviewNotConfirmed")}</p>
  <p dir="auto">{result.reasoning}</p>
  <time dateTime={result.decidedAt}>{new Date(result.decidedAt).toLocaleString(locale)}</time>
  <h2>{t("complaintAppealEffectiveResult")}</h2>
  <p>{result.effectiveOutcome==="confirmed"?t("complaintReviewConfirmed"):t("complaintReviewNotConfirmed")}</p>
  <p>{t("complaintAppealRemaining",{number:result.remaining})}</p>
  <h2>{t("complaintAppealsHeading")}</h2>
  <ul>{result.appeals.map(a=><li key={a.id} id={`appeal-${a.id}`}>
    <strong>{t("complaintHistoryAppealOrdinal",{number:a.ordinal})}</strong>{" · "}
    {t(a.side==="author"?"complaintHistoryAppealSideAuthor":"complaintHistoryAppealSideReporter")}
    <p>{a.status==="pending"?t("complaintAppealPending"):
      a.outcome==="upheld"?t("complaintHistoryAppealUpheld"):t("complaintHistoryAppealOverturned")}</p>
    {a.ownArgument?<p dir="auto">{a.ownArgument}</p>:null}
    {a.status==="resolved"?<><p dir="auto">{a.reasoning}</p>
      {a.resolvedAt?<time dateTime={a.resolvedAt}>{new Date(a.resolvedAt).toLocaleString(locale)}</time>:null}</>:null}
  </li>)}</ul>
  {result.canAppeal?<appeal.Form method="post" onSubmit={onSubmit}>
    <input type="hidden" name="intent" value="appeal"/>
    <input type="hidden" name="decisionId" value={result.decisionId}/>
    <input type="hidden" name="operationId" defaultValue=""/>
    <label>{t("complaintAppealArgument")}<textarea name="argument" required value={argument}
      onChange={e=>setArgument(e.target.value)} dir="auto"/></label>
    <button type="submit" disabled={appeal.state!=="idle"}>{t("complaintAppealSubmit")}</button>
  </appeal.Form>:<p role="status">{result.pending?t("complaintAppealPending"):
    result.remaining===0?t("complaintAppealLimit"):t("complaintAppealOtherSide")}</p>}
  {appeal.data?.error?<p role="alert">{t(appeal.data.error==="conflict"?"complaintError_conflict":"complaintError_invalid")}</p>:null}
  {appeal.data?.ok?<p role="status">{t("complaintAppealSubmitted")}</p>:null}
 </section></ForumShell>;
}
export const ErrorBoundary=ForumRouteError;
