import {useEffect,useRef,useState,type FormEvent} from "react";
import {useFetcher} from "react-router";
import {useTranslation} from "react-i18next";
import type {ParticipantAppealResult} from "./appeal-context";
import {appealFeedbackKey,type AppealCommandError} from "./appeal-feedback";
import {ForumShell} from "../forum/ui";

export type ComplaintParticipantResultPresentation =
  Omit<ParticipantAppealResult,"decidedAt"|"appeals"> & {
    decidedAt:string;
    appeals:Array<Omit<ParticipantAppealResult["appeals"][number],"resolvedAt"> & {
      resolvedAt:string|null;
    }>;
  };

export function ComplaintResultView({
  locale,
  result,
}:{
  locale:string;
  result:ComplaintParticipantResultPresentation;
}){
 const {t}=useTranslation("common");
 const appeal=useFetcher<{ok?:true;appealId?:string;operationId?:string;error?:AppealCommandError}>();
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
  <time dateTime={result.decidedAt}>{new Date(result.decidedAt).toLocaleString(locale,{timeZone:"UTC"})}</time>
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
      {a.resolvedAt?<time dateTime={a.resolvedAt}>{new Date(a.resolvedAt).toLocaleString(locale,{timeZone:"UTC"})}</time>:null}</>:null}
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
  {appeal.data?.error?<p role="alert">{t(appealFeedbackKey(appeal.data.error,"submit"))}</p>:null}
  {appeal.data?.ok?<p role="status">{t("complaintAppealSubmitted")}</p>:null}
 </section></ForumShell>;
}
