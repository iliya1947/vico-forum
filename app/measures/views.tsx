import { useAdministrativeRouting } from "../administrative-routing/provider";
import { useEffect, useRef, useState, type FormEvent } from "react";
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
  UserMeasurePendingAppealPage,
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
function RestrictionChoices({selected=[],allowAdministration=false}:{
  selected?:readonly string[];allowAdministration?:boolean;
}) {
  const [chosen,setChosen]=useState<ReadonlySet<string>>(()=>new Set(selected));
  const onToggle=(ids:readonly UserMeasureRestrictionId[],checked:boolean)=>{
    setChosen(previous=>{
      const next=new Set(previous);
      for(const id of ids)if(checked)next.add(id);else next.delete(id);
      return next;
    });
  };
  return <div className="admin-forum-objects">
    {USER_MEASURE_RESTRICTION_GROUPS.filter(group=>
      allowAdministration || group.id!=="administration").map(group=>
      <RestrictionGroupChoices key={group.id} group={group} chosen={chosen} onToggle={onToggle}/>)}
  </div>;
}
type MeasureExpiryMode = "permanent" | "hour" | "day" | "week" | "month" | "duration" | "date";
type MeasureExpiryUnit = "hours" | "days" | "weeks";

/**
 * Presentation-only duration shortcut. The server continues to receive one
 * authoritative UTC expiresAt instant (or blank for permanent); no preset IDs.
 */
export function selectedMeasureExpiry(form: HTMLFormElement, now = Date.now()): string | undefined {
  const mode = (form.querySelector("[data-measure-expiry-mode]") as (Element & {value:string})|null)?.value as MeasureExpiryMode|undefined;
  const presetHours: Partial<Record<MeasureExpiryMode,number>> = {
    hour:1,day:24,week:7*24,month:30*24,
  };
  if(mode==="permanent")return "";
  let hours = mode ? presetHours[mode] : undefined;
  if(mode==="duration") {
    const amount=form.querySelector<HTMLInputElement>("[data-measure-expiry-amount]")?.valueAsNumber;
    const unit=(form.querySelector("[data-measure-expiry-unit]") as (Element & {value:string})|null)?.value as MeasureExpiryUnit|undefined;
    const multiplier=unit==="hours"?1:unit==="days"?24:unit==="weeks"?7*24:undefined;
    if(amount===undefined || !Number.isSafeInteger(amount) || amount<=0 || multiplier===undefined)return;
    hours=amount*multiplier;
  }
  let date:Date;
  if(mode==="date") {
    const value=form.querySelector<HTMLInputElement>("[data-measure-expiry-date]")?.value;
    if(!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value))return;
    date=new Date(value+"Z");
  } else {
    if(!Number.isFinite(hours) || !hours || hours<=0)return;
    date=new Date(now+hours*60*60*1000);
  }
  if(!Number.isFinite(date.getTime()) || date.getTime()<=now)return;
  return date.toISOString();
}

function encodeMeasureExpiry(event:FormEvent<HTMLFormElement>) {
  const expiresAt=selectedMeasureExpiry(event.currentTarget);
  const input=event.currentTarget.querySelector<HTMLInputElement>('input[name="expiresAt"]');
  if(!input)return; // Rejected/lift decisions have no expiry field.
  if(expiresAt===undefined) { event.preventDefault();return; }
  input.value=expiresAt;
}

function MeasureExpiryField({initial=null}: {initial?:string|null}) {
  const {t}=useTranslation("common");
  const [mode,setMode]=useState<MeasureExpiryMode>(initial?"date":"permanent");
  const choices:readonly {value:MeasureExpiryMode;label:string}[]=[
    {value:"permanent",label:t("measuresPermanent")},
    {value:"hour",label:t("measuresDurationHour")},
    {value:"day",label:t("measuresDurationDay")},
    {value:"week",label:t("measuresDurationWeek")},
    {value:"month",label:t("measuresDurationMonth")},
    {value:"duration",label:t("measuresDurationCustom")},
    {value:"date",label:t("measuresDurationEnd")},
  ];
  return <fieldset className="profile-form">
    <legend>{t("measuresDurationMode")}</legend>
    <label>{t("measuresDurationMode")}
      <select data-measure-expiry-mode value={mode}
        onChange={event=>setMode(event.target.value as MeasureExpiryMode)}>
        {choices.map(choice=><option key={choice.value} value={choice.value}>{choice.label}</option>)}
      </select>
    </label>
    {mode==="duration"&&<>
      <label>{t("measuresDurationAmount")}
        <input data-measure-expiry-amount type="number" required min={1} step={1} defaultValue={1}/>
      </label>
      <label>{t("measuresDurationMode")}
        <select data-measure-expiry-unit defaultValue="days">
          <option value="hours">{t("measuresDurationUnitsHours")}</option>
          <option value="days">{t("measuresDurationUnitsDays")}</option>
          <option value="weeks">{t("measuresDurationUnitsWeeks")}</option>
        </select>
      </label>
    </>}
    {mode==="date"&&<label>{t("measuresDurationEnd")}
      <input data-measure-expiry-date type="datetime-local" step={1} required
        defaultValue={initial?new Date(initial).toISOString().slice(0,19):""} dir="ltr"/>
    </label>}
    <input type="hidden" name="expiresAt" defaultValue={initial??""}/>
  </fieldset>;
}

function MeasureSummary({measure,locale,admin=false,detailRoute}:{
  measure:UserMeasureSummary;locale:string;admin?:boolean;detailRoute?:"own"|"admin";
}) {
  const {t}=useTranslation("common");
  const routing = useAdministrativeRouting();
  const link=(detailRoute??(admin?"admin":"own"))==="admin"
    ?adminMeasurePath(locale,measure.id,routing):ownMeasurePath(locale,measure.id);
  return <li>
    <h3><Link to={link}><DateText date={measure.createdAt} locale={locale}/></Link></h3>
    <p>{t("measuresStatus")}: {t(statusKeys[measure.status])}</p>
    <p>{t("measuresReason")}: <bdi dir="auto">{measure.initialReason}</bdi></p>
    <p>{t("measuresRestrictions")}:</p><RestrictionList items={measure.restrictions}/>
    <p>{t("measuresAppealQuota")}: {measure.usedAppeals}/3</p>
  </li>;
}
const measureStatusOrder = ["active","expired","lifted"] as const;

export function GroupedMeasures({measures,locale,admin=false,detailRoute}:{
  measures:readonly UserMeasureSummary[];locale:string;admin?:boolean;detailRoute?:"own"|"admin";
}) {
  const {t}=useTranslation("common");
  return <>{measureStatusOrder.map(status=>{
    const group=measures.filter(measure=>measure.status===status);
    if(!group.length)return null;
    const heading=t(statusKeys[status])+" ("+group.length+")";
    return <section key={status} aria-label={heading}>
      {admin?<h4>{heading}</h4>:<h2>{heading}</h2>}
      <ol className="admin-forum-objects">{group.map(measure=>
        <MeasureSummary key={measure.id} measure={measure} locale={locale} admin={admin}
          detailRoute={detailRoute}/>)}</ol>
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

export function AdminMeasuresIndex({locale,target,pendingAppeals,requestedTarget,createId,
  access,maySelectAdministrativeRestrictions=false,feedback}:{
  locale:string;target:UserMeasureTargetView|null;pendingAppeals?:UserMeasurePendingAppealPage|null;
  requestedTarget:string;createId:string;
  access:AdminAccess;maySelectAdministrativeRestrictions?:boolean;feedback:Feedback;
}) {
  const {t}=useTranslation("common");
  const routing = useAdministrativeRouting();
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
      {pendingAppeals&&<section aria-label={t("measuresPendingHeading")}>
        <h3>{t("measuresPendingHeading")}</h3>
        {pendingAppeals.appeals.length?<ol className="admin-forum-objects">
          {pendingAppeals.appeals.map(appeal=><li key={appeal.id}>
            <p><bdi dir="auto">{appeal.targetName}</bdi> <code dir="ltr">{appeal.targetUserId}</code></p>
            <p>{t("measuresCreated")}: <DateText date={appeal.submittedAt} locale={locale}/></p>
            <p><Link to={adminMeasurePath(locale,appeal.measureId,routing)+"#measure-review-"+appeal.id}>
              {t("measuresPendingOpen")} #{appeal.ordinal}
            </Link></p>
          </li>)}
        </ol>:<p>{t("measuresPendingNone")}</p>}
        {pendingAppeals.nextPage!==null&&<Link
          to={adminMeasuresPath(locale,routing)+"?page="+(pendingAppeals.nextPage+1)}>
          {t("measuresPendingMore")}</Link>}
      </section>}
      {target&&<>
        <h3><bdi dir="auto">{target.name}</bdi></h3>
        <p><bdi dir="ltr">{target.id}</bdi></p>
        {target.measures.length?<GroupedMeasures measures={target.measures} locale={locale} admin/>
          :<p>{t("measuresNone")}</p>}
        <Form method="post" key={createId} className="profile-form" aria-busy={pending}
          onSubmitCapture={encodeMeasureExpiry}>
          <h3>{t("measuresCreate")}</h3>
          <input type="hidden" name="intent" value="create"/>
          <input type="hidden" name="measureId" value={createId}/>
          <input type="hidden" name="targetId" value={target.id}/>
          <label htmlFor="measure-create-reason">{t("measuresReason")}</label>
          <textarea id="measure-create-reason" name="reason" required rows={4} maxLength={2000} dir="auto"/>
          <MeasureExpiryField/>
          <RestrictionChoices allowAdministration={maySelectAdministrativeRestrictions}/>
          <button type="submit" disabled={pending}>{t("measuresCreate")}</button>
        </Form>
      </>}
    </section>
  </AdminShell>;
}

function AppealReviewForm({measure,appealId,ordinal,operationId,pending,allowAdministration}:{
  measure:UserMeasureDetail;appealId:string;ordinal:number;operationId:string;pending:boolean;
  allowAdministration:boolean;
}) {
  const {t}=useTranslation("common");
  const [outcome,setOutcome]=useState<"accepted"|"rejected">("rejected");
  const [remedy,setRemedy]=useState<""|"change"|"lift">("");
  const accepting=outcome==="accepted";
  const changing=accepting&&remedy==="change";
  return <Form method="post" id={"measure-review-"+appealId} className="profile-form" aria-busy={pending}
    onSubmitCapture={encodeMeasureExpiry}>
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
      <MeasureExpiryField initial={measure.expiresAt}/>
      <RestrictionChoices selected={measure.restrictions} allowAdministration={allowAdministration}/>
    </>}
    <button type="submit" disabled={pending}>{t("measuresReview")}</button>
  </Form>;
}

export function AdminMeasureDetail({locale,measure,access,changeId,liftId,reviewIds,
  maySelectAdministrativeRestrictions=false,feedback}:{
  locale:string;measure:UserMeasureDetail&{targetUserId:string;targetName:string;canMutate:boolean};
  access:AdminAccess;changeId:string;liftId:string;reviewIds:{appealId:string;operationId:string}[];
  maySelectAdministrativeRestrictions?:boolean;feedback:Feedback;
}) {
  const {t}=useTranslation("common");
  const routing = useAdministrativeRouting();
  const {pending,refresh}=useMeasurePageState();
  const isActive=measure.status==="active";
  return <AdminShell locale={locale} access={access} current="measures">
    <section className="admin-forum">
      <nav><Link to={adminMeasuresPath(locale,routing)+"?target="+encodeURIComponent(measure.targetUserId)}>
        {t("measuresAdmin")}</Link></nav>
      <h2><bdi dir="auto">{measure.targetName}</bdi></h2>
      <button type="button" disabled={pending} onClick={refresh}>{t("measuresRefresh")}</button>
      <FeedbackMessage feedback={feedback}/>
      <MeasureInfo measure={measure} locale={locale}/>
      {isActive&&measure.canMutate&&<>
        <Form method="post" key={changeId} className="profile-form" aria-busy={pending}
          onSubmitCapture={encodeMeasureExpiry}>
          <h3>{t("measuresChange")}</h3>
          <input type="hidden" name="intent" value="change"/>
          <input type="hidden" name="operationId" value={changeId}/>
          <input type="hidden" name="expectedVersion" value={measure.version}/>
          <label htmlFor="measure-change-reason">{t("measuresExplanation")}</label>
          <textarea id="measure-change-reason" name="reason" required maxLength={2000} rows={3} dir="auto"/>
          <MeasureExpiryField initial={measure.expiresAt}/>
          <RestrictionChoices selected={measure.restrictions}
            allowAdministration={maySelectAdministrativeRestrictions}/>
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
      {isActive&&measure.canMutate&&measure.appeals.filter(appeal=>appeal.status==="pending").map(appeal=>
        <AppealReviewForm key={appeal.id+":"+measure.version} measure={measure}
          appealId={appeal.id} ordinal={appeal.ordinal}
          operationId={reviewIds.find(x=>x.appealId===appeal.id)?.operationId??""}
          pending={pending} allowAdministration={maySelectAdministrativeRestrictions}/>)}
    </section>
  </AdminShell>;
}
