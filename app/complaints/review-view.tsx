import {useEffect,useRef,useState,type FormEvent} from "react";
import {Link,useFetcher} from "react-router";
import {useTranslation} from "react-i18next";
import {ForumShell} from "../forum/ui";
import {TopicQuickActions} from "../admin/quick-actions";
import {ComplaintActivity,complaintQueuePath,complaintReviewPath} from "./queue-view";
import type {ReviewCase,ReviewPages,ReviewPage,ReviewContextPost,ReviewSource,ReviewFullPost} from "./review-contract";

const reviewUrl=(locale:string,id:string)=>complaintReviewPath(locale,id);
const moment=(value:string)=>new Date(value).toISOString().replace("T"," ").slice(0,19)+" UTC";
function OriginalText({source}:{source:ReviewSource}){
 return <div className="complaint-review-source" lang={source.sourceLocale==="und"?undefined:source.sourceLocale}
  dir="auto"><pre>{source.originalContent}</pre><small>{source.sourceLocale} · {moment(source.createdAt)}</small></div>;
}
function PageLinks<T>({locale,id,kind,value,pages}:{locale:string;id:string;kind:keyof ReviewPages;
 value:ReviewPage<T>;pages:ReviewPages}){
 const {t}=useTranslation("common");
 const link=(n:number)=>{
  const next={...pages,[kind]:n},query=new URLSearchParams();
  for(const [k,v] of Object.entries(next))if(v!==0)query.set(k,String(v));
  return reviewUrl(locale,id)+(query.size?"?"+query:"");
 };
 return <nav className="complaint-review-pagination" aria-label={t("attentionCasePagination")}>
  <span>{value.total} · {value.page+1}</span>
  {value.page>0?<Link to={link(value.page-1)}>{t("attentionCasePrevious")}</Link>:null}
  {value.hasMore?<Link to={link(value.page+1)}>{t("attentionCaseNext")}</Link>:null}
 </nav>;
}
function ExpandPost({locale,id,post}:{locale:string;id:string;post:ReviewContextPost}){
 const {t}=useTranslation("common");
 const fetcher=useFetcher<ReviewFullPost>();
 const path="/"+encodeURIComponent(locale)+"/attention/complaints/"+encodeURIComponent(id)+"/context/"+encodeURIComponent(post.id);
 return <li className="complaint-context-post">
  <strong>#{post.number} · {post.author.name}</strong> <time dateTime={post.createdAt}>{moment(post.createdAt)}</time>
  <p dir="auto" lang={post.sourceLocale==="und"?undefined:post.sourceLocale}>{post.excerpt}{post.truncated?"…":""}</p>
  <button type="button" onClick={()=>fetcher.load(path)} disabled={fetcher.state!=="idle"}>{t("complaintReviewExpand")}</button>
  {fetcher.data?.source?<OriginalText source={fetcher.data.source}/>:null}
 </li>;
}
function CaseQuickActions({item,locale}:{item:ReviewCase;locale:string}){
 const p=item.permissions,q=item.topic;
 const posts:Array<{id:string;solutionModerationStatus:"needs-review"|"outdated"|null;solutionOutdatedReason:string|null}>=
  item.context.items.map(x=>({id:x.id,solutionModerationStatus:null,solutionOutdatedReason:null}));
 if(q.bestAnswer&&!posts.some(x=>x.id===q.bestAnswer!.id))posts.push(q.bestAnswer);
 return <TopicQuickActions locale={locale} inline
  topic={{id:q.id,isPinned:q.isPinned,isSolved:q.isSolved,bestAnswerPostId:q.bestAnswerPostId,
   duplicateOf:q.duplicateOf,duplicateRelationshipId:q.duplicateRelationshipId,
   title:{id:q.title.revisionId,originalContent:q.title.originalContent,sourceLocale:q.title.sourceLocale},
   section:{id:q.sectionId},posts}}
  postCandidates={item.context.items.map(x=>({id:x.id,number:x.number}))}
  canManagePin={p.pin} canManageAnySolution={p.solution} canManageHelpDuplicate={p.duplicate}
  canCorrectAnySourceLocale={p.sourceLocale} canModerateHelpSolution={p.solutionModeration}
  pendingDuplicateAppeal={q.pendingHelpDuplicateAppeal}/>;
}
export function ComplaintReviewView({locale,item}:{locale:string;item:ReviewCase}){
 const {t}=useTranslation("common");
 const note=useFetcher<{ok?:true;intent?:string;operationId?:string;error?:string}>();
 const decision=useFetcher<{ok?:true;intent?:string;operationId?:string;error?:string}>();
 const [noteDraft,setNoteDraft]=useState("");
 const [reasoning,setReasoning]=useState("");
 const [outcome,setOutcome]=useState<"confirmed"|"not-confirmed">("confirmed");
 const [reviewedVersion,setReviewedVersion]=useState(item.version);
 const noteNonce=useRef(""),decisionNonce=useRef(""),lastAck=useRef("");
 useEffect(()=>{
  if(note.data?.ok&&note.data.intent==="note"&&note.data.operationId===noteNonce.current&&lastAck.current!==note.data.operationId){
   lastAck.current=note.data.operationId;noteNonce.current="";setNoteDraft("");
  }
 },[note.data]);
 const pages:ReviewPages={reports:item.reports.page,notes:item.notes.page,evidence:item.evidence.page,context:item.context.page};
 const stale=item.version!==reviewedVersion;
 const onSubmitNonce=(ref:{current:string})=>(event:FormEvent<HTMLFormElement>)=>{
  const input=event.currentTarget.elements.namedItem("operationId") as HTMLInputElement;
  if(!ref.current)ref.current=crypto.randomUUID();
  input.value=ref.current;
 };
 return <ForumShell locale={locale} variant="attention">
 <section className="complaint-review">
  <nav><Link to={complaintQueuePath(locale)}>{t("complaintQueueHeading")}</Link></nav>
  <h1>{t("complaintReviewHeading")}</h1>
  {item.previousCaseId?<Link to={reviewUrl(locale,item.previousCaseId)}>{t("complaintReviewPrevious")}</Link>:null}
  <p>{item.state==="resolved"?t("complaintReviewResolved"):t("complaintCaseOpen")} · {t(("complaintPriority"+item.priority) as "complaintPriority1")} · {t("complaintReportCount")}: {item.independentReporterCount}</p>
  {item.state==="open"?<><ComplaintActivity locale={locale} caseId={item.id}/>
    <p className="complaint-activity" role="status">{t(item.activeElsewhere?"complaintActivityOther":"complaintActivityNone")}</p></>:null}
  <section>
   <h2>{t("complaintReviewEvidence")}</h2>
   <p>{t(item.kind==="post"?"complaintTargetPost":"complaintTargetTitle")}</p>
   <h3>{t("complaintReviewReported")}</h3><OriginalText source={item.reported}/>
   <h3>{t("complaintReviewCurrent")}</h3><OriginalText source={item.current}/>
   <h3>{t("complaintReviewTopicTitle")}</h3><OriginalText source={item.currentTopicTitle}/>
  </section>
  <section>
   <h2>{t("complaintReviewReports")}</h2>
   <ul>{item.reports.items.map(r=><li key={r.id}>
    <strong>{t(("complaintReason_"+r.reason) as "complaintReason_spam")}</strong> · <time dateTime={r.createdAt}>{moment(r.createdAt)}</time>
    {r.reporter?<span> · {r.reporter.name} ({r.reporter.id})</span>:null}
    {r.explanation?<p dir="auto">{r.explanation}</p>:null}
   </li>)}</ul>
   <PageLinks locale={locale} id={item.id} kind="reports" pages={pages} value={item.reports}/>
  </section>
  <section>
   <h2>{t("complaintReviewAttachments")}</h2>
   <ul>{item.evidence.items.map(a=><li key={a.id}>
    <a href={"/"+encodeURIComponent(locale)+"/attention/complaints/"+encodeURIComponent(item.id)+"/evidence/"+encodeURIComponent(a.id)}>
     {a.fileName}</a> · {a.byteSize}
   </li>)}</ul>
   <PageLinks locale={locale} id={item.id} kind="evidence" pages={pages} value={item.evidence}/>
  </section>
  <section>
   <h2>{t("complaintReviewContext")}</h2>
   <ul>{item.context.items.map(post=><ExpandPost key={post.id} locale={locale} id={item.id} post={post}/>)}</ul>
   <PageLinks locale={locale} id={item.id} kind="context" pages={pages} value={item.context}/>
  </section>
  <CaseQuickActions locale={locale} item={item}/>
  <section>
   <h2>{t("complaintReviewNotes")}</h2>
   <ul>{item.notes.items.map(n=><li key={n.id}><strong>{n.author.name}</strong> · <time dateTime={n.createdAt}>{moment(n.createdAt)}</time><p dir="auto">{n.body}</p></li>)}</ul>
   <PageLinks locale={locale} id={item.id} kind="notes" pages={pages} value={item.notes}/>
   <note.Form method="post" onSubmit={onSubmitNonce(noteNonce)}>
    <input type="hidden" name="intent" value="note"/><input type="hidden" name="operationId" defaultValue=""/>
    <label>{t("complaintReviewNoteInput")}<textarea required rows={4} name="body" value={noteDraft} onChange={e=>setNoteDraft(e.currentTarget.value)}/></label>
    <button type="submit" disabled={note.state!=="idle"}>{t("complaintReviewNoteSave")}</button>
   </note.Form>
   {note.data?.ok?<p role="status">{t("complaintReviewNoteSaved")}</p>:null}
   {note.data?.error?<p role="alert">{t(note.data.error==="conflict"?"complaintTriageConflict":("complaintError_"+note.data.error) as "complaintError_invalid")}</p>:null}
  </section>
  <section>
   <h2>{t("complaintReviewDecision")}</h2>
   {item.decision?<article><strong>{item.decision.outcome==="confirmed"?t("complaintReviewConfirmed"):t("complaintReviewNotConfirmed")}</strong>
     <p dir="auto">{item.decision.reasoning}</p><p>{item.decision.reviewerName} · {moment(item.decision.createdAt)}</p></article>
    :<decision.Form method="post" onSubmit={onSubmitNonce(decisionNonce)}>
      <input type="hidden" name="intent" value="decision"/><input type="hidden" name="operationId" defaultValue=""/>
      <input type="hidden" name="expectedVersion" value={reviewedVersion}/>
      <label>{t("complaintReviewOutcome")}<select name="outcome" value={outcome} onChange={e=>setOutcome(e.currentTarget.value as "confirmed"|"not-confirmed")}>
       <option value="confirmed">{t("complaintReviewConfirmed")}</option>
       <option value="not-confirmed">{t("complaintReviewNotConfirmed")}</option>
      </select></label>
      <label>{t("complaintReviewReasoning")}<textarea required name="reasoning" rows={5} value={reasoning} onChange={e=>setReasoning(e.currentTarget.value)}/></label>
      {stale?<p role="alert">{t("complaintReviewChanged")} <button type="button" onClick={()=>{setReviewedVersion(item.version);decisionNonce.current="";}}>{t("complaintReviewAcceptChanges")}</button></p>:null}
      <button type="submit" disabled={stale||decision.state!=="idle"}>{t("complaintReviewResolve")}</button>
     </decision.Form>}
   {decision.data?.error?<p role="alert">{t(decision.data.error==="conflict"?"complaintReviewChanged":("complaintError_"+decision.data.error) as "complaintError_invalid")}</p>:null}
  </section>
 </section></ForumShell>;
}
