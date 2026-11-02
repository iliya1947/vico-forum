import {useEffect,useRef,useState,type FormEvent} from "react";
import {Link,useFetcher} from "react-router";
import {useTranslation} from "react-i18next";
import type {AppealReviewPage} from "../../db/complaint-appeal-read";
import type {ReviewPages,ReviewPage,ReviewContextPost,ReviewFullPost} from "./review-contract";
import {ForumShell} from "../forum/ui";

export const appealReviewUrl=(locale:string,caseId:string,appealId:string)=>
 `/${encodeURIComponent(locale)}/attention/complaints/${encodeURIComponent(caseId)}/appeals/${encodeURIComponent(appealId)}`;
const iso=(x:string|Date)=>new Date(x).toISOString();
function Source({source}:{source:{originalContent:string;sourceLocale:string;direction?:"ltr"|"rtl"|"auto";createdAt:string}}){
 return <div className="complaint-review-source" lang={source.sourceLocale==="und"?undefined:source.sourceLocale}
   dir={source.direction??"auto"}><pre>{source.originalContent}</pre>
   <time dateTime={iso(source.createdAt)}>{iso(source.createdAt)}</time></div>;
}
function Pagination<T>({base,kind,value,pages}:{base:string;kind:keyof ReviewPages;value:ReviewPage<T>;pages:ReviewPages}){
 const {t}=useTranslation("common");
 const target=(n:number)=>{const params=new URLSearchParams();for(const [k,v] of Object.entries({...pages,[kind]:n}))
  if(v)params.set(k,String(v));return base+(params.size?"?"+params:"");};
 return <nav aria-label={t("attentionCasePagination")} className="complaint-review-pagination">
  <span>{value.total}</span>{value.page>0?<Link to={target(value.page-1)}>{t("attentionCasePrevious")}</Link>:null}
  {value.hasMore?<Link to={target(value.page+1)}>{t("attentionCaseNext")}</Link>:null}
 </nav>;
}
function Post({locale,caseId,appealId,post}:{locale:string;caseId:string;appealId:string;post:ReviewContextPost}){
 const {t}=useTranslation("common");const fetcher=useFetcher<ReviewFullPost>();
 const url=appealReviewUrl(locale,caseId,appealId)+"/context/"+encodeURIComponent(post.id);
 return <li><strong>#{post.number} · {post.author.name}</strong>
   <p dir={post.direction??"auto"}>{post.excerpt}{post.truncated?"…":""}</p>
   <button type="button" onClick={()=>fetcher.load(url)} disabled={fetcher.state!=="idle"}>{t("complaintReviewExpand")}</button>
   {fetcher.data?.source?<Source source={fetcher.data.source}/>:null}
 </li>;
}
export function ComplaintAppealReviewView({locale,result}:{locale:string;result:AppealReviewPage}){
 const {t}=useTranslation("common");const {appeal,caseReview:item}=result;
 const pages:ReviewPages={reports:item.reports.page,notes:item.notes.page,evidence:item.evidence.page,context:item.context.page};
 const base=appealReviewUrl(locale,item.id,appeal.id);
 const resolve=useFetcher<{ok?:true;operationId?:string;error?:string}>();
 const [outcome,setOutcome]=useState<"upheld"|"overturned">("upheld");
 const [reasoning,setReasoning]=useState("");const nonce=useRef("");const acknowledged=useRef("");
 useEffect(()=>{if(resolve.data?.ok&&resolve.data.operationId===nonce.current&&acknowledged.current!==nonce.current){
   acknowledged.current=nonce.current;nonce.current="";setReasoning("");
 }},[resolve.data]);
 const submit=(e:FormEvent<HTMLFormElement>)=>{
  const target=e.currentTarget.elements.namedItem("operationId") as HTMLInputElement;
  if(!nonce.current)nonce.current=crypto.randomUUID();target.value=nonce.current;
 };
 return <ForumShell locale={locale} variant="attention">
  <section className="complaint-review">
   <nav><Link to={`/${encodeURIComponent(locale)}/attention?mode=complaints&group=group2`}>{t("complaintAppealsHeading")}</Link></nav>
   <h1>{t("complaintAppealReviewHeading")}</h1>
   <p>{t("complaintHistoryAppealOrdinal",{number:appeal.ordinal})}</p>
   <p>{appeal.ownInitialDecision?t("complaintAppealPreferOther"):null}</p>
   <h2>{t("complaintAppealInitialResult")}</h2>
   <p>{appeal.initialOutcome==="confirmed"?t("complaintReviewConfirmed"):t("complaintReviewNotConfirmed")}</p>
   {item.decision?.reasoning?<p dir="auto">{item.decision.reasoning}</p>:null}
   <h2>{t("complaintAppealEffectiveResult")}</h2>
   <p>{appeal.effectiveOutcome==="confirmed"?t("complaintReviewConfirmed"):t("complaintReviewNotConfirmed")}</p>
   <h2>{t("complaintAppealArgument")}</h2>
   <p dir="auto">{appeal.argument}</p>
   {appeal.appellant?<p>{appeal.appellant.name}</p>:null}
   <h2>{t("complaintReviewEvidence")}</h2>
   <h3>{t("complaintReviewReported")}</h3><Source source={item.reported}/>
   <h3>{t("complaintReviewCurrent")}</h3><Source source={item.current}/>
   <section><h2>{t("complaintReviewReports")}</h2>
    <ul>{item.reports.items.map(r=><li key={r.id}><strong>{t(("complaintReason_"+r.reason) as "complaintReason_spam")}</strong>
     {r.reporter?<span> · {r.reporter.name}</span>:null}
     {r.explanation?<p dir="auto">{r.explanation}</p>:null}</li>)}</ul>
    <Pagination base={base} kind="reports" value={item.reports} pages={pages}/>
   </section>
   <section><h2>{t("complaintReviewNotes")}</h2>
    <ul>{item.notes.items.map(n=><li key={n.id}><strong>{n.author.name}</strong>
      <time dateTime={n.createdAt}>{iso(n.createdAt)}</time><p dir="auto">{n.body}</p></li>)}</ul>
    <Pagination base={base} kind="notes" value={item.notes} pages={pages}/>
   </section>
   <section><h2>{t("complaintReviewAttachments")}</h2>
    <ul>{item.evidence.items.map(e=><li key={e.id}><a href={base+"/evidence/"+encodeURIComponent(e.id)}>{e.fileName}</a></li>)}</ul>
    <Pagination base={base} kind="evidence" value={item.evidence} pages={pages}/>
   </section>
   <section><h2>{t("complaintReviewContext")}</h2>
    <ul>{item.context.items.map(post=><Post key={post.id} locale={locale} caseId={item.id} appealId={appeal.id} post={post}/>)}</ul>
    <Pagination base={base} kind="context" value={item.context} pages={pages}/>
   </section>
   <h2>{t("complaintAppealPrevious")}</h2>
   <ol>{result.appeals.map(a=><li key={a.id}>
    <strong>{t("complaintHistoryAppealOrdinal",{number:a.ordinal})}</strong>
    {a.id===appeal.id?" · "+t("complaintAppealCurrent"):<Link to={appealReviewUrl(locale,item.id,a.id)}>{t("complaintAppealOpen")}</Link>}
    <p>{a.status==="pending"?t("complaintAppealPending"):
      a.outcome==="upheld"?t("complaintHistoryAppealUpheld"):t("complaintHistoryAppealOverturned")}</p>
    <p dir="auto">{a.argument}</p>{a.reasoning?<p dir="auto">{a.reasoning}</p>:null}
   </li>)}</ol>
   {appeal.status==="pending"?<resolve.Form method="post" onSubmit={submit}>
    <input type="hidden" name="intent" value="resolve"/>
    <input type="hidden" name="operationId" defaultValue=""/>
    <label>{t("complaintAppealResolution")}
      <select name="outcome" value={outcome} onChange={e=>setOutcome(e.target.value as typeof outcome)}>
       <option value="upheld">{t("complaintHistoryAppealUpheld")}</option>
       <option value="overturned">{t("complaintHistoryAppealOverturned")}</option>
      </select>
    </label>
    <label>{t("complaintReviewReasoning")}<textarea name="reasoning" required dir="auto"
      value={reasoning} onChange={e=>setReasoning(e.target.value)}/></label>
    <button type="submit" disabled={resolve.state!=="idle"}>{t("complaintAppealResolve")}</button>
   </resolve.Form>:<p>{t("complaintHistoryAppealResolved")}</p>}
   {resolve.data?.error?<p role="alert">{t(resolve.data.error==="conflict"?"complaintError_conflict":"complaintError_invalid")}</p>:null}
   {resolve.data?.ok?<p role="status">{t("complaintAppealResolved")}</p>:null}
  </section>
 </ForumShell>;
}
