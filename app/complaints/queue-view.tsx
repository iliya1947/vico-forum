import { useEffect } from "react";
import { Link, useFetcher, useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";
import { ForumShell } from "../forum/ui";
import { forumTopicPath } from "../forum/paths";
import { COMPLAINT_REASONS } from "../../db/complaints-domain";
import type { ComplaintQueueCase, ComplaintQueuePage } from "./queue-contract";

export const complaintQueuePath=(locale:string)=>`/${encodeURIComponent(locale)}/attention?mode=complaints&group=group1`;
export const complaintTriagePath=(locale:string,id:string)=>`/${encodeURIComponent(locale)}/attention/complaints/${encodeURIComponent(id)}`;

export function ComplaintCaseSummary({locale,item,openLink=true}:{locale:string;item:ComplaintQueueCase;openLink?:boolean}) {
  const {t}=useTranslation("common");
  const number=new Intl.NumberFormat(locale);
  const date=new Intl.DateTimeFormat(locale,{dateStyle:"medium",timeStyle:"short",timeZone:"UTC"});
  return <article className="attention-case complaint-case" data-case-id={item.id}>
    <div className="attention-case-heading"><strong>{t(item.kind==="post"?"complaintTargetPost":"complaintTargetTitle")}</strong>
      <span>{t("complaintCaseOpen")}</span><span>{t(`complaintPriority${item.priority}`)}</span></div>
    <Link to={forumTopicPath(locale,item.topicId)+(item.postId?`#post-${encodeURIComponent(item.postId)}`:"")}>
      <bdi dir={item.topicDirection??"auto"} lang={item.topicLocale==="und"?undefined:item.topicLocale}>{item.topicTitle}</bdi>
    </Link>
    <p className="complaint-excerpt" dir={item.excerptDirection??"auto"} lang={item.sourceLocale==="und"?undefined:item.sourceLocale}>{item.excerpt}</p>
    <dl className="complaint-triage-metadata">
      <div><dt>{t("complaintReportCount")}</dt><dd>{number.format(item.reportCount)}</dd></div>
      <div><dt>{t("complaintFirstReport")}</dt><dd><time dateTime={item.firstReportedAt}>{date.format(new Date(item.firstReportedAt))} UTC</time></dd></div>
      <div><dt>{t("complaintLastReport")}</dt><dd><time dateTime={item.lastReportedAt}>{date.format(new Date(item.lastReportedAt))} UTC</time></dd></div>
      <div><dt>{t("complaintPriorityMode")}</dt><dd>{t(item.priorityOverride===null?"complaintPriorityAutomatic":"complaintPriorityManual")}</dd></div>
    </dl>
    <ul className="complaint-reason-summary">{COMPLAINT_REASONS.filter(reason=>item.reasons[reason]).map(reason=>
      <li key={reason}>{t(`complaintReason_${reason}`)}: {number.format(item.reasons[reason]!)}</li>)}</ul>
    <p className="complaint-activity" role="status">{t(item.activeElsewhere?"complaintActivityOther":"complaintActivityNone")}</p>
    {openLink&&<Link className="complaint-open-case" to={complaintTriagePath(locale,item.id)}>{t("complaintOpenCase")}</Link>}
  </article>;
}

export function ComplaintQueueList({locale,queue}:{locale:string;queue:ComplaintQueuePage}) {
  const {t}=useTranslation("common");
  return <div className="complaint-queue">
    <p className="complaint-queue-total">{t("complaintQueueTotal",{total:new Intl.NumberFormat(locale).format(queue.total)})}</p>
    {queue.cases.length?<ul className="attention-case-list">{queue.cases.map(item=><li key={item.id}><ComplaintCaseSummary locale={locale} item={item}/></li>)}</ul>:
      <p>{t("complaintQueueEmpty")}</p>}
    <nav className="attention-case-pagination" aria-label={t("attentionCasePagination")}>
      {queue.page>0&&<Link to={complaintQueuePath(locale)+`&page=${queue.page-1}`}>{t("attentionCasePrevious")}</Link>}
      {queue.hasMore&&<Link to={complaintQueuePath(locale)+`&page=${queue.page+1}`}>{t("attentionCaseNext")}</Link>}
      <Link to={complaintQueuePath(locale)}>{t("complaintQueueRefresh")}</Link>
    </nav>
  </div>;
}

function ComplaintActivity({locale,caseId}:{locale:string;caseId:string}) {
  const {revalidate}=useRevalidator();
  useEffect(()=>{
    const url=complaintTriagePath(locale,caseId)+"/activity";
    let stopped=false,busy=false;
    const send=(active:boolean)=>fetch(url,{method:"POST",credentials:"same-origin",keepalive:!active,
      headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({active:String(active)})});
    const ping=()=>{
      if(stopped||busy||document.visibilityState!=="visible")return;
      busy=true;
      void send(true).then(r=>{if(stopped)return;if([401,403,404].includes(r.status)){stopped=true;return;}
        if(r.ok)void revalidate();}).catch(()=>{/* Supplemental presence expires without renewal. */}).finally(()=>{busy=false;});
    };
    const visibility=()=>{if(document.visibilityState==="visible")ping();else void send(false).catch(()=>{});};
    const timer=window.setInterval(ping,30_000);ping();document.addEventListener("visibilitychange",visibility);
    return()=>{stopped=true;window.clearInterval(timer);document.removeEventListener("visibilitychange",visibility);void send(false).catch(()=>{});};
  },[locale,caseId,revalidate]);
  return null;
}

export function ComplaintTriageView({locale,item}:{locale:string;item:ComplaintQueueCase}) {
  const {t}=useTranslation("common");
  const fetcher=useFetcher<{ok?:true;error?:"invalid"|"conflict"|"forbidden"|"notFound"|"unavailable"}>();
  return <ForumShell locale={locale} variant="attention"><section className="complaint-triage">
    <Link to={complaintQueuePath(locale)}>{t("complaintQueueHeading")}</Link>
    <h1>{t("complaintTriageHeading")}</h1>
    <ComplaintActivity locale={locale} caseId={item.id}/>
    <ComplaintCaseSummary locale={locale} item={item} openLink={false}/>
    <fetcher.Form key={item.version} method="post" className="complaint-priority-form" onSubmit={event=>{
      const input=event.currentTarget.elements.namedItem("operationId") as HTMLInputElement;
      if(!input.value)input.value=crypto.randomUUID();
    }}>
      <input type="hidden" name="operationId" defaultValue=""/>
      <input type="hidden" name="expectedVersion" value={item.version}/>
      <fieldset disabled={fetcher.state!=="idle"}>
        <label>{t("complaintPriorityLabel")}<select name="priority" defaultValue={item.priorityOverride??"auto"}>
          <option value="auto">{t("complaintPriorityAutomatic")} ({t(`complaintPriority${item.automaticPriority}`)})</option>
          {([1,2,3] as const).map(priority=><option key={priority} value={priority}>{t(`complaintPriority${priority}`)}</option>)}
        </select></label><button type="submit">{t("complaintPrioritySave")}</button>
      </fieldset>
    </fetcher.Form>
    {fetcher.data?.ok&&<p role="status">{t("complaintPrioritySaved")}</p>}
    {fetcher.data?.error&&<p role="alert">{t(fetcher.data.error==="conflict"?"complaintTriageConflict":`complaintError_${fetcher.data.error}`)}</p>}
    <p>{t("complaintTriageBoundary")}</p>
  </section></ForumShell>;
}
