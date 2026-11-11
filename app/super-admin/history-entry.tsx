import { useTranslation } from "react-i18next";
import type { UiKey } from "../localization/catalog";
import type { OwnerHistoryEntry, OwnerHistoryOrigin, OwnerHistoryValue } from "../../db/owner-sa02-history";
import type { OwnerTimelineEntry } from "../../db/owner-system-monitoring";

type HistoryItem = OwnerHistoryEntry | OwnerTimelineEntry;
type Label = UiKey<"common">;

const origins: Record<OwnerHistoryOrigin,Label> = {
  "system-event":"superAdminHistoryOriginSystem",
  "auth-event":"superAdminHistoryOriginAuth",
  "system-observation":"superAdminHistoryOriginSample",
  "admin-history":"superAdminHistoryOriginAdmin",
  "attachment-evidence":"superAdminHistoryOriginAttachment",
  "attempt-pattern":"superAdminHistoryOriginGroup",
  "attempt-state":"superAdminHistoryOriginState",
};
const kinds: Record<string,Label> = {
  "account.created":"superAdminHistoryAccountCreated",
  "auth.methodLinked":"superAdminHistoryMethodLinked",
  "auth.passwordChanged":"superAdminHistoryPasswordChanged",
  "auth.sessionCreated":"superAdminHistorySessionCreated",
  "auth.sessionDeleted":"superAdminHistorySessionDeleted",
  "monitor.observed":"superAdminObservedEvent",
  "settings.registrationChanged":"superAdminHistoryRegistrationChanged",
  "attachment.securityEvidence":"superAdminHistoryAttachmentEvidence",
  "attempt.coalesced":"superAdminHistoryCoalesced",
  "attempt.unknown":"superAdminHistoryUnknownAttempts",
  "attempt.overflow":"superAdminHistoryOverflow",
  "attempt.gap":"superAdminHistoryGap",
};
const fields:Record<string,Label> = {
  actorUserId:"superAdminHistoryActor",
  targetUserId:"superAdminHistoryTargetUser",
  targetType:"superAdminHistoryTargetType",
  targetId:"superAdminHistoryTargetId",
  entityType:"superAdminHistoryEntityType",
  entityId:"superAdminHistoryEntityId",
  uploadId:"superAdminHistoryUpload",
  uploadedByUserId:"superAdminHistoryUploader",
  detectedType:"superAdminHistoryDetectedType",
  reason:"superAdminHistoryReason",
  declaredByteSize:"superAdminHistoryDeclaredSize",
  networkIp:"superAdminHistoryNetworkIp",
  networkQuality:"superAdminHistoryNetworkQuality",
  operation:"superAdminHistoryOperation",
  outcome:"superAdminHistoryOutcome",
  httpStatus:"superAdminHistoryHttpStatus",
  directCode:"superAdminHistoryDirectCode",
  firstOccurredAt:"superAdminHistoryFirst",
  lastOccurredAt:"superAdminHistoryLast",
  recordingEpochStart:"superAdminHistoryEpoch",
  count:"superAdminHistoryCount",
  saturated:"superAdminHistorySaturated",
  slot:"superAdminHistorySlot",
  beforeGoogleEnabled:"superAdminHistoryBeforeGoogle",
  afterGoogleEnabled:"superAdminHistoryAfterGoogle",
  beforeEmailEnabled:"superAdminHistoryBeforeEmail",
  afterEmailEnabled:"superAdminHistoryAfterEmail",
  beforeVersion:"superAdminHistoryBeforeVersion",
  afterVersion:"superAdminHistoryAfterVersion",
  state:"superAdminRuntimeState",
  build:"superAdminRuntimeMode",
  created24h:"superAdminSa02Created24h",
  passwordUsers:"superAdminSa02PasswordUsers",
  googleUsers:"superAdminSa02GoogleUsers",
  bothUsers:"superAdminSa02BothUsers",
  active:"superAdminSa02ActiveSessions",
  expiredRetained:"superAdminSa02ExpiredSessions",
  googleEnabled:"superAdminSa02GoogleEnabled",
  emailEnabled:"superAdminSa02EmailEnabled",
  updatedAt:"superAdminSa02PolicyUpdatedAt",
  evidence24h:"superAdminSa02Evidence24h",
  lastEventAt:"superAdminSa02LastEvidence",
  attributedAttempts:"superAdminSa02Attempts",
  rateLimitedAttempts:"superAdminSa02RateLimited",
  retainedPatterns:"superAdminSa02Patterns",
  unknownAttempts:"superAdminSa02Unknown",
  overflowAttempts:"superAdminSa02Overflow",
  gapAttempts:"superAdminSa02Gaps",
  lastSeenAt:"superAdminSa02LastSeen",
  currentHourAuthenticatedUsed:"superAdminSa02AuthenticatedUsed",
  currentHourAnonymousUsed:"superAdminSa02AnonymousUsed",
  hourlyCapacityPerPool:"superAdminSa02Capacity",
};
const timestampFields=new Set(["recordingEpochStart","firstOccurredAt","lastOccurredAt",
  "updatedAt","lastEventAt","lastSeenAt"]);
const numericFields=new Set([
  "total","created24h","passwordUsers","googleUsers","bothUsers","active",
  "expiredRetained","attributedAttempts","rateLimitedAttempts","retainedPatterns",
  "unknownAttempts","overflowAttempts","gapAttempts","currentHourAuthenticatedUsed",
  "currentHourAnonymousUsed","hourlyCapacityPerPool","evidence24h","declaredByteSize","count",
]);

/** Observation labels depend on the authoritative monitor, not just the field name. */
function fieldLabel(entry:HistoryItem,name:string):Label|undefined {
  if(entry.origin==="system-observation"){
    const monitors="monitorKeys" in entry?entry.monitorKeys:
      entry.monitorKey?[entry.monitorKey]:[];
    if(name==="total"){
      if(monitors.includes("security.attachments")) return "superAdminSa02TotalEvidence";
      if(monitors.includes("accounts.users")) return "superAdminSa02TotalUsers";
    }
    if(name==="version"){
      if(monitors.includes("accounts.registration")) return "superAdminSa02PolicyVersion";
      if(monitors.includes("system.dependencies")) return "superAdminDatabaseVersion";
    }
  }
  return fields[name];
}
function readableTime(value:string,locale:string):string {
  const date=new Date(value);
  if(!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale,{dateStyle:"medium",timeStyle:"medium",timeZone:"UTC"}).format(date);
}
function Value({name,value,locale}: {name:string;value:OwnerHistoryValue;locale:string}){
  const {t}=useTranslation("common");
  if(value===null) return <span>{t("superAdminHistoryUnknown")}</span>;
  if(typeof value==="boolean")
    return <span>{t(value?"superAdminHistoryYes":"superAdminHistoryNo")}</span>;
  if(typeof value==="string" && timestampFields.has(name) && Number.isFinite(new Date(value).getTime()))
    return <><time dateTime={value}>{readableTime(value,locale)}</time>
      <span> · </span><bdi>{value}</bdi></>;
  if(typeof value==="string" && numericFields.has(name) && /^[0-9]+$/.test(value))
    return <bdi>{new Intl.NumberFormat(locale).format(BigInt(value))}</bdi>;
  return <bdi>{String(value)}</bdi>;
}

/** Display the original safe source entry; no inferred actors, links to raw IPs, or copied events. */
export function HistoryEntry({entry,locale}: {entry:HistoryItem;locale:string}){
  const {t}=useTranslation("common");
  const grouped=entry.origin==="attempt-pattern" || entry.origin==="attempt-state";
  const observed=entry.origin==="system-observation";
  const timeKey=grouped?"superAdminHistoryAdmittedAt":
    observed?"superAdminObservedAt":"superAdminHistoryOccurredAt";
  const monitors="monitorKeys" in entry?entry.monitorKeys:
    entry.monitorKey?[entry.monitorKey]:[];
  const label=kinds[entry.kind];
  return <li data-history-origin={entry.origin} data-history-kind={entry.kind}>
    <h3>{label?t(label):<bdi>{entry.kind}</bdi>}</h3>
    <p>{t(origins[entry.origin])} · {t("superAdminHistorySource")}: <bdi>{entry.source}</bdi></p>
    <dl>
      <div><dt>{t("superAdminHistoryIdentity")}</dt>
        <dd><bdi>{entry.origin}</bdi> / <bdi>{entry.id}</bdi></dd></div>
      <div><dt>{t(timeKey)}</dt>
        <dd><time dateTime={entry.occurredAt}>{readableTime(entry.occurredAt,locale)}</time></dd></div>
      {entry.recordedAt ? <div><dt>{t("superAdminHistoryRecordedAt")}</dt>
        <dd><time dateTime={entry.recordedAt}>{readableTime(entry.recordedAt,locale)}</time></dd></div> : null}
      {monitors.length ? <div><dt>{t("superAdminHistoryMonitors")}</dt>
        <dd>{monitors.map((key,i)=><span key={key}>{i>0?", ":null}<bdi>{key}</bdi></span>)}</dd></div> : null}
      {entry.quality ? <div><dt>{t("superAdminQuality")}</dt>
        <dd>{entry.quality==="measured"?t("superAdminQualityMeasured")
          :entry.quality==="coalesced"?t("superAdminHistoryCoalescedQuality")
          :<bdi>{entry.quality}</bdi>}</dd></div> : null}
    </dl>
    {grouped ? <p className="super-admin-history-note">{t("superAdminHistoryGroupNote")}</p> : null}
    {entry.origin==="attachment-evidence" ? <p className="super-admin-history-note">
      {t("superAdminHistoryEvidenceNote")}</p> : null}
    <dl>{Object.entries(entry.values).map(([name,value])=>{
      const label=fieldLabel(entry,name);
      return <div key={name}>
        <dt>{label ? t(label) : <bdi>{name}</bdi>}</dt>
        <dd><Value name={name} value={value} locale={locale}/></dd>
      </div>;
    })}</dl>
  </li>;
}
