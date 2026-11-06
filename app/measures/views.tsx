import { useEffect, useRef, useState } from "react";
import { Form, Link, useNavigation, useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";
import { ForumShell } from "../forum/ui";
import { AdminShell } from "../admin/shell";
import { ownMeasuresPath, ownMeasurePath, adminMeasuresPath, adminMeasurePath } from "./paths";
import type { AdminAccess } from "../admin/access";
import {
  USER_MEASURE_RESTRICTION_GROUPS, type UserMeasureRestrictionId,
} from "../admin/user-measure-restrictions";
import type {
  UserMeasureSummary, UserMeasureDetail,
  UserMeasureTargetView, UserMeasureAppealDisplayStatus, UserMeasureDisplayStatus,
} from "../../db/user-measure-read";
import type { MeasureActionError } from "./routes.server";

type Feedback = {ok?:boolean;error?:MeasureActionError;ordinal?:number} | undefined;

const restrictionKeys = {
  "topics.create":"measuresRestrictionTopics", "replies.create":"measuresRestrictionReplies",
  "attachments.upload":"measuresRestrictionAttachments", "posts.edit":"measuresRestrictionPosts",
  "profile.edit":"measuresRestrictionProfile", "complaints.submit":"measuresRestrictionComplaints",
  "helpSignals.submit":"measuresRestrictionHelp", "translations.generate":"measuresRestrictionTranslation",
  "admin.forum":"measuresRestrictionAdminForum",
  "admin.complaints":"measuresRestrictionAdminComplaints",
  "admin.security":"measuresRestrictionAdminSecurity",
  "admin.usersAccess":"measuresRestrictionAdminUsers",
} as const satisfies Record<UserMeasureRestrictionId, string>;
const groupKeys = {
  publication:"measuresGroupPublication", ownContent:"measuresGroupOwnContent",
  submissions:"measuresGroupSubmissions", resources:"measuresGroupResources",
  administration:"measuresGroupAdministration",
} as const;
const statusKeys = {
  active:"measuresStatusActive", expired:"measuresStatusExpired", lifted:"measuresStatusLifted",
} as const satisfies Record<UserMeasureDisplayStatus,string>;
const appealKeys = {
  pending:"measuresStatusPending",rejected:"measuresStatusRejected",
  accepted:"measuresStatusAccepted",moot:"measuresStatusMoot",
} as const satisfies Record<UserMeasureAppealDisplayStatus,string>;
const errorKeys = {
  invalid:"measuresErrorInvalid",unauthenticated:"measuresErrorUnauthenticated",
  forbidden:"measuresErrorForbidden",notFound:"measuresErrorNotFound",
  conflict:"measuresErrorConflict",unavailable:"measuresErrorUnavailable",
} as const;

function useMeasurePageState() {
  const navigation=useNavigation();
  const revalidator=useRevalidator();
  const pending=navigation.state!=="idle" || revalidator.state!=="idle";
  return {pending,refresh:()=>{if(!pending)void revalidator.revalidate();}};
}

function FeedbackMessage({feedback}:{feedback:Feedback}) {
  const {t}=useTranslation("common");
  if (!feedback) return null;
  return feedback.error
    ? <p className="profile-feedback is-error" role="alert">{t(errorKeys[feedback.error])}</p>
    : feedback.ok ? <p className="profile-feedback" role="status">{t("measuresSaved")}</p> : null;
}
function DateText({date,locale}:{date:string;locale:string}) {
  return <time dateTime={date}>{new Intl.DateTimeFormat(locale,{
    year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"UTC",
  }).format(new Date(date))} UTC</time>;
}
function RestrictionList({items}:{items:readonly UserMeasureRestrictionId[]}) {
  const {t}=useTranslation("common");
  return <ul>{items.map(id=><li key={id}><span>{t(restrictionKeys[id])}</span></li>)}</ul>;
}
type RestrictionGroup = (typeof USER_MEASURE_RESTRICTION_GROUPS)[number];

function RestrictionGroupChoices({group,chosen,onToggle}:{
  group:RestrictionGroup;chosen:ReadonlySet<string>;
  onToggle:(ids:readonly UserMeasureRestrictionId[],checked:boolean)=>void;
}) {
  const {t}=useTranslation("common");
  const parent=useRef<HTMLInputElement>(null);
  const count=group.ids.filter(id=>chosen.has(id)).length;
  const all=count===group.ids.length;
  const mixed=count>0&&!all;
  useEffect(()=>{if(parent.current)parent.current.indeterminate=mixed;},[mixed]);
  return <fieldset>
    <legend>{t(groupKeys[group.id])}</legend>
    <label className="profile-form-choice">
      <input ref={parent} type="checkbox" checked={all} aria-checked={mixed?"mixed":all}
        onChange={event=>onToggle(group.ids,event.target.checked)}/>
      <strong>{t(groupKeys[group.id])}</strong>
    </label>
    {group.ids.map(id=><label key={id} className="profile-form-choice">
      <input type="checkbox" name="restriction" value={id} checked={chosen.has(id)}
        onChange={event=>onToggle([id],event.target.checked)}/>
      <span>{t(restrictionKeys[id])}</span>
    </label>)}
  </fieldset>;
}
function RestrictionChoices({selected=[]}:{selected?:readonly string[]}) {
  const [chosen,setChosen]=useState<ReadonlySet<string>>(()=>new Set(selected));
  const onToggle=(ids:readonly UserMeasureRestrictionId[],checked:boolean)=>{
    setChosen(previous=>{
      const next=new Set(previous);
      for(const id of ids)if(checked)next.add(id);else next.delete(id);
      return next;
    });
  };
  return <div className="admin-forum-objects">
    {USER_MEASURE_RESTRICTION_GROUPS.map(group=>
      <RestrictionGroupChoices key={group.id} group={group} chosen={chosen} onToggle={onToggle}/>)}
  </div>;
}
function MeasureSummary({measure,locale,admin=false}:{
  measure:UserMeasureSummary;locale:string;admin?:boolean;
}) {
  const {t}=useTranslation("common");
  const link=admin?adminMeasurePath(locale,measure.id):ownMeasurePath(locale,measure.id);
  return <li>
    <h3><Link to={link}><DateText date={measure.createdAt} locale={locale}/></Link></h3>
    <p>{t("measuresStatus")}: {t(statusKeys[measure.status])}</p>
    <p>{t("measuresReason")}: <bdi dir="auto">{measure.initialReason}</bdi></p>
    <p>{t("measuresRestrictions")}:</p><RestrictionList items={measure.restrictions}/>
    <p>{t("measuresAppealQuota")}: {measure.usedAppeals}/3</p>
  </li>;
}
const measureStatusOrder = ["active","expired","lifted"] as const;

function GroupedMeasures({measures,locale,admin=false}:{
  measures:readonly UserMeasureSummary[];locale:string;admin?:boolean;
}) {
  const {t}=useTranslation("common");
  return <>{measureStatusOrder.map(status=>{
    const group=measures.filter(measure=>measure.status===status);
    if(!group.length)return null;
    const heading=t(statusKeys[status])+" ("+group.length+")";
    return <section key={status} aria-label={heading}>
      {admin?<h4>{heading}</h4>:<h2>{heading}</h2>}
      <ol className="admin-forum-objects">{group.map(measure=>
        <MeasureSummary key={measure.id} measure={measure} locale={locale} admin={admin}/>)}</ol>
    </section>;
  })}</>;
}
function MeasureInfo({measure,locale}:{measure:UserMeasureDetail;locale:string}) {
  const {t}=useTranslation("common");
  return <section aria-labelledby="measure-info-title">
    <h2 id="measure-info-title">{t("measuresDetail")}</h2>
    <p>{t("measuresStatus")}: {t(statusKeys[measure.status])}</p>
    <p>{t("measuresCreated")}: <DateText date={measure.createdAt} locale={locale}/></p>
    <p>{t("measuresReason")}: <bdi dir="auto">{measure.initialReason}</bdi></p>
    {measure.latestChangeReason&&<p>{t("measuresLatestReason")}: <bdi dir="auto">{measure.latestChangeReason}</bdi></p>}
    <p>{t("measuresExpires")}: {measure.expiresAt?<DateText date={measure.expiresAt} locale={locale}/>:t("measuresPermanent")}</p>
    <p>{t("measuresRestrictions")}:</p><RestrictionList items={measure.restrictions}/>
    <p>{t("measuresVersion")}: {measure.version}</p>
  </section>;
}
function AppealsAndTimeline({measure,locale}:{measure:UserMeasureDetail;locale:string}) {
  const {t}=useTranslation("common");
  const actionKeys={
    "measure.created":"historyMeasureCreated","measure.changed":"historyMeasureChanged",
    "measure.lifted":"historyMeasureLifted","measure.appealResolved":"historyMeasureAppealResolved",
  } as const;
  return <>
    <section aria-labelledby="measure-appeals-title">
      <h2 id="measure-appeals-title">{t("measuresAppeals")}</h2>
      <p>{t("measuresAppealQuota")}: {measure.usedAppeals}/3</p>
      {measure.appeals.length?<ol>{measure.appeals.map(appeal=><li key={appeal.id}>
        <h3>{appeal.ordinal}. {t(appealKeys[appeal.status])}</h3>
        <p><DateText date={appeal.createdAt} locale={locale}/></p>
        <p dir="auto">{appeal.body}</p>
        {appeal.explanation&&<p>{t("measuresExplanation")}: <bdi dir="auto">{appeal.explanation}</bdi></p>}
        {appeal.resolvedAt&&<p><DateText date={appeal.resolvedAt} locale={locale}/></p>}
        {appeal.remedy&&<p>{t("measuresRemedy")}: {t(appeal.remedy==="lift"?"measuresLift":"measuresChange")}</p>}
      </li>)}</ol>:<p>{t("measuresNoAppeals")}</p>}
    </section>
    <section aria-labelledby="measure-timeline-title">
      <h2 id="measure-timeline-title">{t("measuresTimeline")}</h2>
      <ol>{measure.timeline.map((event,index)=><li key={index}>
        <h3>{t(actionKeys[event.action])}</h3>
        <p><DateText date={event.occurredAt} locale={locale}/></p>
        {event.reason&&<p dir="auto">{event.reason}</p>}
        <p>{t("measuresVersion")}: {event.after.version}</p>
        <RestrictionList items={event.after.restrictions}/>
        <p>{t("measuresExpires")}: {event.after.expiresAt
          ?<DateText date={event.after.expiresAt} locale={locale}/>:t("measuresPermanent")}</p>
        {event.outcome&&<p>{t(appealKeys[event.outcome])}</p>}
      </li>)}</ol>
    </section>
  </>;
}

export function OwnMeasuresIndex({locale,measures}: {locale:string;measures:UserMeasureSummary[]}) {
  const {t}=useTranslation("common");
  const {pending,refresh}=useMeasurePageState();
  return <ForumShell locale={locale} variant="profile">
    <section className="profile-card">
      <h1>{t("measuresOwn")}</h1>
      <button type="button" disabled={pending} onClick={refresh}>{t("measuresRefresh")}</button>
      {measures.length?<GroupedMeasures measures={measures} locale={locale}/>:<p>{t("measuresNone")}</p>}
    </section>
  </ForumShell>;
}
export function OwnMeasureDetail({locale,measure,appealId,feedback}:{
  locale:string;measure:UserMeasureDetail;appealId:string;feedback:Feedback;
}) {
  const {t}=useTranslation("common");
  const {pending,refresh}=useMeasurePageState();
  const canAppeal=measure.status==="active"&&!measure.pendingAppeal&&measure.usedAppeals<3;
  return <ForumShell locale={locale} variant="profile">
    <section className="profile-card">
      <nav><Link to={ownMeasuresPath(locale)}>{t("measuresOwn")}</Link></nav>
      <h1>{t("measuresDetail")}</h1>
      <button type="button" disabled={pending} onClick={refresh}>{t("measuresRefresh")}</button>
      <FeedbackMessage feedback={feedback}/>
      <MeasureInfo measure={measure} locale={locale}/>
      {canAppeal&&<Form method="post" className="profile-form" aria-busy={pending}>
        <input type="hidden" name="intent" value="appeal"/>
        <input type="hidden" name="appealId" value={appealId}/>
        <label htmlFor="measure-appeal-body">{t("measuresAppealBody")}</label>
        <textarea id="measure-appeal-body" name="body" rows={5} required maxLength={2000} dir="auto"/>
        <button type="submit" disabled={pending}>{t("measuresAppealSubmit")}</button>
      </Form>}
      <AppealsAndTimeline measure={measure} locale={locale}/>
    </section>
  </ForumShell>;
}

export function AdminMeasuresIndex({locale,target,requestedTarget,createId,access,feedback}:{
  locale:string;target:UserMeasureTargetView|null;requestedTarget:string;createId:string;
  access:AdminAccess;feedback:Feedback;
}) {
  const {t}=useTranslation("common");
  const {pending,refresh}=useMeasurePageState();
  return <AdminShell locale={locale} access={access} current="measures">
    <section className="admin-forum">
      <h2>{t("measuresAdmin")}</h2>
      <button type="button" disabled={pending} onClick={refresh}>{t("measuresRefresh")}</button>
      <FeedbackMessage feedback={feedback}/>
      <Form method="get" className="admin-forum-search">
        <label htmlFor="measure-target">{t("measuresTargetId")}</label>
        <div><input id="measure-target" key={requestedTarget} name="target" defaultValue={requestedTarget}
          maxLength={2048} required/><button type="submit">{t("measuresFindTarget")}</button></div>
      </Form>
      {target&&<>
        <h3><bdi dir="auto">{target.name}</bdi></h3>
        <p><bdi dir="ltr">{target.id}</bdi></p>
        {target.measures.length?<GroupedMeasures measures={target.measures} locale={locale} admin/>
          :<p>{t("measuresNone")}</p>}
        <Form method="post" key={createId} className="profile-form" aria-busy={pending}>
          <h3>{t("measuresCreate")}</h3>
          <input type="hidden" name="intent" value="create"/>
          <input type="hidden" name="measureId" value={createId}/>
          <input type="hidden" name="targetId" value={target.id}/>
          <label htmlFor="measure-create-reason">{t("measuresReason")}</label>
          <textarea id="measure-create-reason" name="reason" required rows={4} maxLength={2000} dir="auto"/>
          <label htmlFor="measure-create-expiry">{t("measuresExpires")}</label>
          <input id="measure-create-expiry" type="text" name="expiresAt"
            placeholder="2030-01-01T12:00:00Z" dir="ltr"/>
          <p>{t("measuresPermanentHint")}</p>
          <RestrictionChoices/>
          <button type="submit" disabled={pending}>{t("measuresCreate")}</button>
        </Form>
      </>}
    </section>
  </AdminShell>;
}

function AppealReviewForm({measure,appealId,ordinal,operationId,pending}:{
  measure:UserMeasureDetail;appealId:string;ordinal:number;operationId:string;pending:boolean;
}) {
  const {t}=useTranslation("common");
  const [outcome,setOutcome]=useState<"accepted"|"rejected">("rejected");
  const [remedy,setRemedy]=useState<""|"change"|"lift">("");
  const accepting=outcome==="accepted";
  const changing=accepting&&remedy==="change";
  return <Form method="post" className="profile-form" aria-busy={pending}>
    <h3>{t("measuresReview")} #{ordinal}</h3>
    <input type="hidden" name="intent" value="review"/>
    <input type="hidden" name="appealId" value={appealId}/>
    <input type="hidden" name="operationId" value={operationId}/>
    <input type="hidden" name="expectedVersion" value={measure.version}/>
    <label>{t("measuresOutcome")}
      <select name="outcome" required value={outcome} onChange={event=>{
        setOutcome(event.target.value==="accepted"?"accepted":"rejected");
        setRemedy("");
      }}>
        <option value="rejected">{t("measuresStatusRejected")}</option>
        <option value="accepted">{t("measuresStatusAccepted")}</option>
      </select>
    </label>
    {accepting?<label>{t("measuresRemedy")}
      <select name="remedy" value={remedy} required
        onChange={event=>setRemedy(event.target.value==="change"?"change":event.target.value==="lift"?"lift":"")}>
        <option value="">{t("measuresNoRemedy")}</option>
        <option value="change">{t("measuresChange")}</option>
        <option value="lift">{t("measuresLift")}</option>
      </select>
    </label>:<input type="hidden" name="remedy" value=""/>}
    <label>{t("measuresExplanation")}
      <textarea name="explanation" required rows={3} maxLength={2000} dir="auto"/>
    </label>
    {changing&&<>
      <label>{t("measuresExpires")}
        <input type="text" name="expiresAt" defaultValue={measure.expiresAt??""} dir="ltr"/>
      </label>
      <RestrictionChoices selected={measure.restrictions}/>
    </>}
    <button type="submit" disabled={pending}>{t("measuresReview")}</button>
  </Form>;
}

export function AdminMeasureDetail({locale,measure,access,changeId,liftId,reviewIds,feedback}:{
  locale:string;measure:UserMeasureDetail&{targetUserId:string;targetName:string};
  access:AdminAccess;changeId:string;liftId:string;reviewIds:{appealId:string;operationId:string}[];
  feedback:Feedback;
}) {
  const {t}=useTranslation("common");
  const {pending,refresh}=useMeasurePageState();
  const isActive=measure.status==="active";
  return <AdminShell locale={locale} access={access} current="measures">
    <section className="admin-forum">
      <nav><Link to={adminMeasuresPath(locale)+"?target="+encodeURIComponent(measure.targetUserId)}>
        {t("measuresAdmin")}</Link></nav>
      <h2><bdi dir="auto">{measure.targetName}</bdi></h2>
      <button type="button" disabled={pending} onClick={refresh}>{t("measuresRefresh")}</button>
      <FeedbackMessage feedback={feedback}/>
      <MeasureInfo measure={measure} locale={locale}/>
      {isActive&&<>
        <Form method="post" key={changeId} className="profile-form" aria-busy={pending}>
          <h3>{t("measuresChange")}</h3>
          <input type="hidden" name="intent" value="change"/>
          <input type="hidden" name="operationId" value={changeId}/>
          <input type="hidden" name="expectedVersion" value={measure.version}/>
          <label htmlFor="measure-change-reason">{t("measuresExplanation")}</label>
          <textarea id="measure-change-reason" name="reason" required maxLength={2000} rows={3} dir="auto"/>
          <label htmlFor="measure-change-expiry">{t("measuresExpires")}</label>
          <input id="measure-change-expiry" name="expiresAt" type="text"
            defaultValue={measure.expiresAt??""} dir="ltr"/>
          <p>{t("measuresPermanentHint")}</p>
          <RestrictionChoices selected={measure.restrictions}/>
          <button type="submit" disabled={pending}>{t("measuresChange")}</button>
        </Form>
        <Form method="post" key={liftId} className="profile-form" aria-busy={pending}>
          <h3>{t("measuresLift")}</h3>
          <input type="hidden" name="intent" value="lift"/>
          <input type="hidden" name="operationId" value={liftId}/>
          <input type="hidden" name="expectedVersion" value={measure.version}/>
          <label htmlFor="measure-lift-reason">{t("measuresExplanation")}</label>
          <textarea id="measure-lift-reason" name="reason" required maxLength={2000} rows={3} dir="auto"/>
          <button type="submit" disabled={pending}>{t("measuresLift")}</button>
        </Form>
      </>}
      <AppealsAndTimeline measure={measure} locale={locale}/>
      {isActive&&measure.appeals.filter(appeal=>appeal.status==="pending").map(appeal=>
        <AppealReviewForm key={appeal.id+":"+measure.version} measure={measure}
          appealId={appeal.id} ordinal={appeal.ordinal}
          operationId={reviewIds.find(x=>x.appealId===appeal.id)?.operationId??""}
          pending={pending}/>)}
    </section>
  </AdminShell>;
}
