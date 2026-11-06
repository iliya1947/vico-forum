import { Form, Link, useNavigation } from "react-router";
import { useTranslation } from "react-i18next";
import { ForumShell } from "../forum/ui";
import { AdminShell } from "../admin/shell";
import type { AdminAccess } from "../admin/access";
import {
  USER_MEASURE_RESTRICTION_GROUPS, type UserMeasureRestrictionId,
} from "../admin/user-measure-restrictions";
import type {
  UserMeasureSummary, UserMeasureDetail,
  UserMeasureTargetView, UserMeasureAppealDisplayStatus, UserMeasureDisplayStatus,
} from "../../db/user-measure-read";
import type { MeasureActionError } from "./routes.server";

export const ownMeasuresPath = (locale: string) => "/" + encodeURIComponent(locale) + "/account/measures";
export const ownMeasurePath = (locale: string, id: string) =>
  ownMeasuresPath(locale) + "/" + encodeURIComponent(id);
export const adminMeasuresPath = (locale: string) =>
  "/" + encodeURIComponent(locale) + "/admin/measures";
export const adminMeasurePath = (locale: string, id: string) =>
  adminMeasuresPath(locale) + "/" + encodeURIComponent(id);
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
function RestrictionChoices({selected=[]}:{selected?:readonly string[]}) {
  const {t}=useTranslation("common");
  return <div className="admin-forum-objects">
    {USER_MEASURE_RESTRICTION_GROUPS.map(group=>
      <fieldset key={group.id}>
        <legend>{t(groupKeys[group.id])}</legend>
        {group.ids.map(id=><label key={id} className="profile-form-choice">
          <input type="checkbox" name="restriction" value={id} defaultChecked={selected.includes(id)} />
          <span>{t(restrictionKeys[id])}</span>
        </label>)}
      </fieldset>)}
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
  return <ForumShell locale={locale} variant="profile">
    <main className="profile-card">
      <h1>{t("measuresOwn")}</h1>
      {measures.length?<ol className="admin-forum-objects">{measures.map(item=>
        <MeasureSummary key={item.id} measure={item} locale={locale}/>)}</ol>:<p>{t("measuresNone")}</p>}
    </main>
  </ForumShell>;
}
export function OwnMeasureDetail({locale,measure,appealId,feedback}:{
  locale:string;measure:UserMeasureDetail;appealId:string;feedback:Feedback;
}) {
  const {t}=useTranslation("common");
  const navigation=useNavigation();
  const canAppeal=measure.status==="active"&&!measure.pendingAppeal&&measure.usedAppeals<3;
  return <ForumShell locale={locale} variant="profile">
    <main className="profile-card">
      <nav><Link to={ownMeasuresPath(locale)}>{t("measuresOwn")}</Link></nav>
      <h1>{t("measuresDetail")}</h1>
      <FeedbackMessage feedback={feedback}/>
      <MeasureInfo measure={measure} locale={locale}/>
      {canAppeal&&<Form method="post" className="profile-form" aria-busy={navigation.state==="submitting"}>
        <input type="hidden" name="intent" value="appeal"/>
        <input type="hidden" name="appealId" value={appealId}/>
        <label htmlFor="measure-appeal-body">{t("measuresAppealBody")}</label>
        <textarea id="measure-appeal-body" name="body" rows={5} required maxLength={2000} dir="auto"/>
        <button type="submit" disabled={navigation.state==="submitting"}>{t("measuresAppealSubmit")}</button>
      </Form>}
      <AppealsAndTimeline measure={measure} locale={locale}/>
    </main>
  </ForumShell>;
}

export function AdminMeasuresIndex({locale,target,requestedTarget,createId,access,feedback}:{
  locale:string;target:UserMeasureTargetView|null;requestedTarget:string;createId:string;
  access:AdminAccess;feedback:Feedback;
}) {
  const {t}=useTranslation("common");
  return <AdminShell locale={locale} access={access} current="measures">
    <section className="admin-forum">
      <h2>{t("measuresAdmin")}</h2>
      <FeedbackMessage feedback={feedback}/>
      <Form method="get" className="admin-forum-search">
        <label htmlFor="measure-target">{t("measuresTargetId")}</label>
        <div><input id="measure-target" name="target" defaultValue={requestedTarget}
          maxLength={2048} required/><button type="submit">{t("measuresFindTarget")}</button></div>
      </Form>
      {target&&<>
        <h3><bdi dir="auto">{target.name}</bdi></h3>
        <p><bdi dir="ltr">{target.id}</bdi></p>
        {target.measures.length?<ol className="admin-forum-objects">{target.measures.map(item=>
          <MeasureSummary key={item.id} measure={item} locale={locale} admin/>)}</ol>
          :<p>{t("measuresNone")}</p>}
        <Form method="post" className="profile-form">
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
          <button type="submit">{t("measuresCreate")}</button>
        </Form>
      </>}
    </section>
  </AdminShell>;
}

export function AdminMeasureDetail({locale,measure,access,changeId,liftId,reviewIds,feedback}:{
  locale:string;measure:UserMeasureDetail&{targetUserId:string;targetName:string};
  access:AdminAccess;changeId:string;liftId:string;reviewIds:{appealId:string;operationId:string}[];
  feedback:Feedback;
}) {
  const {t}=useTranslation("common");
  const isActive=measure.status==="active";
  return <AdminShell locale={locale} access={access} current="measures">
    <section className="admin-forum">
      <nav><Link to={adminMeasuresPath(locale)+"?target="+encodeURIComponent(measure.targetUserId)}>
        {t("measuresAdmin")}</Link></nav>
      <h2><bdi dir="auto">{measure.targetName}</bdi></h2>
      <FeedbackMessage feedback={feedback}/>
      <MeasureInfo measure={measure} locale={locale}/>
      {isActive&&<>
        <Form method="post" className="profile-form">
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
          <button type="submit">{t("measuresChange")}</button>
        </Form>
        <Form method="post" className="profile-form">
          <h3>{t("measuresLift")}</h3>
          <input type="hidden" name="intent" value="lift"/>
          <input type="hidden" name="operationId" value={liftId}/>
          <input type="hidden" name="expectedVersion" value={measure.version}/>
          <label htmlFor="measure-lift-reason">{t("measuresExplanation")}</label>
          <textarea id="measure-lift-reason" name="reason" required maxLength={2000} rows={3} dir="auto"/>
          <button type="submit">{t("measuresLift")}</button>
        </Form>
      </>}
      <AppealsAndTimeline measure={measure} locale={locale}/>
      {isActive&&measure.appeals.filter(appeal=>appeal.status==="pending").map(appeal=>
        <Form method="post" className="profile-form" key={appeal.id}>
          <h3>{t("measuresReview")} #{appeal.ordinal}</h3>
          <input type="hidden" name="intent" value="review"/>
          <input type="hidden" name="appealId" value={appeal.id}/>
          <input type="hidden" name="operationId"
            value={reviewIds.find(x=>x.appealId===appeal.id)?.operationId??""}/>
          <input type="hidden" name="expectedVersion" value={measure.version}/>
          <label>{t("measuresOutcome")}
            <select name="outcome" required defaultValue="rejected">
              <option value="rejected">{t("measuresStatusRejected")}</option>
              <option value="accepted">{t("measuresStatusAccepted")}</option>
            </select>
          </label>
          <label>{t("measuresRemedy")}
            <select name="remedy" defaultValue="">
              <option value="">{t("measuresNoRemedy")}</option>
              <option value="change">{t("measuresChange")}</option>
              <option value="lift">{t("measuresLift")}</option>
            </select>
          </label>
          <label>{t("measuresExplanation")}
            <textarea name="explanation" required rows={3} maxLength={2000} dir="auto"/>
          </label>
          <label>{t("measuresExpires")}
            <input type="text" name="expiresAt" defaultValue={measure.expiresAt??""} dir="ltr"/>
          </label>
          <RestrictionChoices selected={measure.restrictions}/>
          <button type="submit">{t("measuresReview")}</button>
        </Form>)}
    </section>
  </AdminShell>;
}
