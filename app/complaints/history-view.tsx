import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ForumShell } from "../forum/ui";
import type { ComplaintResolvedHistoryPage,ComplaintTimelinePage,ComplaintTimelineEvent } from "../../db/complaint-history-read";
import { complaintReviewPath } from "./queue-view";
const historyPath=(locale:string,id:string)=>`/${encodeURIComponent(locale)}/attention/complaints/${encodeURIComponent(id)}/history`;
export function ComplaintResolvedHistoryList({locale,history}:{locale:string;history:ComplaintResolvedHistoryPage}){
 const {t}=useTranslation("common");
 return <div className="complaint-history">
  <p>{t("complaintQueueTotal",{total:history.total})}</p>
  <ul className="attention-case-list">{history.cases.map(item=><li key={item.id}>
   <article className="attention-case complaint-case">
    <p>{t(item.kind==="post"?"complaintTargetPost":"complaintTargetTitle")}</p>
    <p dir="auto" lang={item.sourceLocale==="und"?undefined:item.sourceLocale}>{item.text.slice(0,500)}</p>
    <p>{item.outcome==="confirmed"?t("complaintReviewConfirmed"):t("complaintReviewNotConfirmed")}
    {" · "}<time dateTime={new Date(item.resolvedAt).toISOString()}>{new Date(item.resolvedAt).toLocaleString(locale)}</time></p>
    <p>{t("complaintReportCount")}: {item.independentReporterCount}</p>
    <Link to={historyPath(locale,item.id)}>{t("complaintHistoryHeading")}</Link>
    {" · "}<Link to={complaintReviewPath(locale,item.id)}>{t("complaintOpenCase")}</Link>
   </article>
  </li>)}</ul>
  {(history.page>0||history.hasMore)&&<nav className="attention-case-pagination" aria-label={t("attentionCasePagination")}>
   {history.page>0?<Link to={`?mode=complaints&group=group3&page=${history.page-1}`}>{t("attentionCasePrevious")}</Link>:null}
   {history.hasMore?<Link to={`?mode=complaints&group=group3&page=${history.page+1}`}>{t("attentionCaseNext")}</Link>:null}
  </nav>}
 </div>;
}
function EventDetails({event}:{event:ComplaintTimelineEvent}){
 const {t}=useTranslation("common");
 const label=event.kind==="submitted"?t("complaintReviewReports"):
 event.kind==="noted"?t("complaintReviewNotes"):
 event.kind==="decided"?t("complaintReviewDecision"):
 event.kind==="priority-changed"?t("complaintPriorityLabel"):
 event.kind==="appealed"||event.kind==="appeal-resolved"?t("complaintHistoryReviewStarted");
 return <li><article className="attention-case">
  <strong>{label}</strong>{" · "}<time dateTime={new Date(event.createdAt).toISOString()}>{new Date(event.createdAt).toISOString()}</time>
  {event.moderatorName?<p>{event.moderatorName}</p>:null}
  {event.reason?<p>{t(("complaintReason_"+event.reason) as "complaintReason_spam")}</p>:null}
  {event.explanation?<p dir="auto">{event.explanation}</p>:null}
  {event.reporterName?<p>{event.reporterName} ({event.reporterId})</p>:null}
  {event.noteBody?<p dir="auto">{event.noteBody}</p>:null}
  {event.decisionOutcome?<p>{event.decisionOutcome==="confirmed"?t("complaintReviewConfirmed"):t("complaintReviewNotConfirmed")}</p>:null}
  {event.reasoning?<p dir="auto">{event.reasoning}</p>:null}
  {event.kind==="priority-changed"?<p>{event.priorityOverride??t("complaintPriorityAutomatic")}</p>:null}
  {event.appealArgument?<p dir="auto">{event.appealArgument}</p>:null}
  {event.appellantName?<p>{event.appellantName} ({event.appellantId})</p>:null}
  {event.kind==="appeal-resolved"&&event.appealOutcome?<p>{event.appealOutcome}</p>:null}
  {event.appealReasoning&&event.kind==="appeal-resolved"?<p dir="auto">{event.appealReasoning}</p>:null}
 </article></li>;
}
export function ComplaintTimelineView({locale,timeline}:{locale:string;timeline:ComplaintTimelinePage}){
 const {t}=useTranslation("common");
 return <ForumShell locale={locale} variant="attention"><section className="complaint-review">
  <Link to={`/${encodeURIComponent(locale)}/attention?mode=complaints&group=group3`}>{t("complaintHistoryHeading")}</Link>
  <h1>{t("complaintHistoryHeading")}</h1>
  <p>{timeline.outcome==="confirmed"?t("complaintReviewConfirmed"):t("complaintReviewNotConfirmed")}</p>
  <p>{t("complaintHistoryCoverageNotice")}</p>
  <Link to={complaintReviewPath(locale,timeline.caseId)}>{t("complaintOpenCase")}</Link>
  <ul>{timeline.events.map(event=><EventDetails key={event.id} event={event}/>)}</ul>
  <nav className="attention-case-pagination" aria-label={t("attentionCasePagination")}>
   {timeline.page>0?<Link to={`?page=${timeline.page-1}`}>{t("attentionCasePrevious")}</Link>:null}
   <span>{timeline.total}</span>
   {timeline.hasMore?<Link to={`?page=${timeline.page+1}`}>{t("attentionCaseNext")}</Link>:null}
  </nav>
 </section></ForumShell>;
}
