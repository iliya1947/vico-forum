import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useAdministrativeRouting } from "../administrative-routing/provider";
import { SA02_MONITORS, type Sa02Area, type Sa02MonitorKey } from "../../db/owner-sa02-catalog";
import type { SuperAdminMonitorScope } from "../administrative-routing/addresses";
import { superAdminAreaMonitorHistoryPath } from "./paths";
import type { Sa02CurrentState } from "../../db/owner-sa02-current";
import type { UiKey } from "../localization/catalog";
import { adminUsersPath } from "../admin/users-paths";
import { settingsAccountPath, settingsForumPath } from "../settings/paths";
import { attentionEntryPath } from "../settings/workspace-access";
import { SuperAdminShell, formatTime } from "./view";

type FieldKind = "count" | "flag" | "time";
type Field = readonly [name:string, label:UiKey, kind:FieldKind];
type MonitorPresentation = {
  title:UiKey; fields:readonly Field[]; note:UiKey;
  context?: "users" | "account" | "registration" | "attachments";
};
const presentations:Record<Sa02MonitorKey,MonitorPresentation> = {
  "accounts.users": {
    title:"superAdminSa02Users",context:"users",note:"superAdminSa02UsersNote",
    fields:[["total","superAdminSa02TotalUsers","count"],["created24h","superAdminSa02Created24h","count"]],
  },
  "accounts.methods": {
    title:"superAdminSa02Methods",context:"account",note:"superAdminSa02MethodsNote",
    fields:[["passwordUsers","superAdminSa02PasswordUsers","count"],
      ["googleUsers","superAdminSa02GoogleUsers","count"],["bothUsers","superAdminSa02BothUsers","count"]],
  },
  "accounts.sessions": {
    title:"superAdminSa02Sessions",context:"account",note:"superAdminSa02SessionsNote",
    fields:[["active","superAdminSa02ActiveSessions","count"],["expiredRetained","superAdminSa02ExpiredSessions","count"]],
  },
  "accounts.registration": {
    title:"superAdminSa02Registration",context:"registration",note:"superAdminSa02RegistrationNote",
    fields:[["googleEnabled","superAdminSa02GoogleEnabled","flag"],
      ["emailEnabled","superAdminSa02EmailEnabled","flag"],
      ["version","superAdminSa02PolicyVersion","count"],["updatedAt","superAdminSa02PolicyUpdatedAt","time"]],
  },
  "security.auth": {
    title:"superAdminSa02Auth",note:"superAdminSa02AttemptsNote",
    fields:[["attributedAttempts","superAdminSa02Attempts","count"],
      ["rateLimitedAttempts","superAdminSa02RateLimited","count"],
      ["retainedPatterns","superAdminSa02Patterns","count"],
      ["unknownAttempts","superAdminSa02Unknown","count"],
      ["overflowAttempts","superAdminSa02Overflow","count"],
      ["gapAttempts","superAdminSa02Gaps","count"],
      ["lastSeenAt","superAdminSa02LastSeen","time"],
      ["currentHourAuthenticatedUsed","superAdminSa02AuthenticatedUsed","count"],
      ["currentHourAnonymousUsed","superAdminSa02AnonymousUsed","count"],
      ["hourlyCapacityPerPool","superAdminSa02Capacity","count"]],
  },
  "security.access": {
    title:"superAdminSa02Access",note:"superAdminSa02AttemptsNote",
    fields:[["attributedAttempts","superAdminSa02Attempts","count"],
      ["rateLimitedAttempts","superAdminSa02RateLimited","count"],
      ["retainedPatterns","superAdminSa02Patterns","count"],
      ["unknownAttempts","superAdminSa02Unknown","count"],
      ["overflowAttempts","superAdminSa02Overflow","count"],
      ["gapAttempts","superAdminSa02Gaps","count"],
      ["lastSeenAt","superAdminSa02LastSeen","time"],
      ["currentHourAuthenticatedUsed","superAdminSa02AuthenticatedUsed","count"],
      ["currentHourAnonymousUsed","superAdminSa02AnonymousUsed","count"],
      ["hourlyCapacityPerPool","superAdminSa02Capacity","count"]],
  },
  "security.attachments": {
    title:"superAdminSa02Attachments",context:"attachments",note:"superAdminSa02AttachmentsNote",
    fields:[["total","superAdminSa02TotalEvidence","count"],
      ["evidence24h","superAdminSa02Evidence24h","count"],["lastEventAt","superAdminSa02LastEvidence","time"]],
  },
};

function monitorScope(key:Sa02MonitorKey):SuperAdminMonitorScope {
  if ((SA02_MONITORS.accounts as readonly string[]).includes(key))
    return {area:"accounts",monitorKey:key as (typeof SA02_MONITORS.accounts)[number]};
  return {area:"security",monitorKey:key as (typeof SA02_MONITORS.security)[number]};
}

/** Counts are decimal bigint strings from PostgreSQL. Never round them through Number. */
function displayCount(value:string|number|boolean):string {
  if (typeof value === "string" && /^\\d+$/.test(value))
    return new Intl.NumberFormat("en", {useGrouping:true}).format(BigInt(value));
  return String(value);
}

function contextLink(key:Sa02MonitorKey,locale:string,routing:ReturnType<typeof useAdministrativeRouting>){
  const choice=presentations[key].context;
  if(choice==="users") return {href:adminUsersPath(locale,routing),label:"adminUsers" as const};
  if(choice==="account") return {href:settingsAccountPath(locale),label:"settingsAccount" as const};
  if(choice==="registration") return {href:settingsForumPath(locale),label:"settingsForumRoles" as const};
  if(choice==="attachments") return {href:attentionEntryPath(locale,"security","attachments"),
    label:"attentionSecurityAttachments" as const};
  return null;
}

export function SuperAdminSa02Current({locale,area,state}:{
  locale:string;area:Sa02Area;state:Sa02CurrentState
}){
  const {t}=useTranslation("common");
  const routing=useAdministrativeRouting();
  const ownPath=area==="accounts" ? routing.superAdmin.accounts(locale) : routing.superAdmin.security(locale);
  return <SuperAdminShell locale={locale} current="monitoring">
    <section className="admin-overview" aria-labelledby="super-admin-sa02-heading">
      <h2 id="super-admin-sa02-heading">{t(area==="accounts"?"superAdminAreaAccounts":"superAdminAreaSecurity")}</h2>
      <p>{t("superAdminSa02SnapshotNote")}</p>
      {state.recording==="unavailable" ? <p role="status">{t("superAdminRecordingUnavailable")}</p> : null}
      {area==="security" ? <p>{t("superAdminSa02HourNote")}</p> : null}
      <p><Link to={routing.superAdmin.overview(locale)}>{t("superAdminOverview")}</Link>
        <span aria-hidden="true"> · </span>
        <Link to={routing.superAdmin.monitoring(locale)}>{t("superAdminMonitoring")}</Link></p>
      <div className="super-admin-monitors" data-monitor-count={state.monitors.length}>
        {state.monitors.map(m=>{
          const presentation=presentations[m.key];
          const link=contextLink(m.key,locale,routing);
          return <article className="super-admin-monitor" key={m.key} data-monitor-key={m.key}>
            <h3>{t(presentation.title)}</h3>
            <p className="super-admin-monitor-note">{t(presentation.note)}</p>
            <dl>{presentation.fields.map(([name,label,kind])=>{
              const value=m.values[name];
              return <div key={name}>
                <dt>{t(label)}</dt>
                <dd dir="auto">
                  {value===null || value===undefined ? t("superAdminNotRecorded")
                    : kind==="time" ? <time dateTime={String(value)}>{formatTime(String(value),locale)}</time>
                    : kind==="flag" ? t(value ? "superAdminSa02FlagEnabled" : "superAdminSa02FlagDisabled")
                    : <bdi>{displayCount(value)}</bdi>}
                </dd>
              </div>;
            })}</dl>
            <p className="super-admin-freshness">{t("superAdminObservedAt")}:
              <time dateTime={state.observedAt}>{formatTime(state.observedAt,locale)}</time>
            </p>
            <p className="super-admin-freshness">{t("superAdminSa02LastSample")}:
              {m.lastObservedAt ? <time dateTime={m.lastObservedAt}>
                {formatTime(m.lastObservedAt,locale)}</time> : t("superAdminNotRecorded")}
            </p>
            <p className="super-admin-freshness">{t("superAdminCoverage")}:
              {m.coverageFrom ? <time dateTime={m.coverageFrom}>
                {formatTime(m.coverageFrom,locale)}</time> : t("superAdminNotRecorded")}
            </p>
            <p className="super-admin-freshness">{t("superAdminQuality")}:
              {t("superAdminQualityMeasured")}</p>
            <nav aria-label={t("superAdminMonitorActions")}>
              <Link to={superAdminAreaMonitorHistoryPath(locale,monitorScope(m.key),undefined,routing)}>
                {t("superAdminHistory")}</Link>
              <span aria-hidden="true"> · </span>
              <Link to={ownPath}>{t("superAdminRefresh")}</Link>
              {link ? <>
                <span aria-hidden="true"> · </span>
                <Link to={link.href}>{t(link.label)}</Link>
              </> : null}
            </nav>
          </article>;
        })}
      </div>
    </section>
  </SuperAdminShell>;
}
