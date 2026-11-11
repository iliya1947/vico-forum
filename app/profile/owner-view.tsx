import { Link, useLocation, useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";
import type { ProfileOwnerData } from "./sections";
import { HistoryEntry } from "../super-admin/history-entry";
import { forumProfilePath } from "../forum/paths";

function utc(value: string, locale: string) {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat(locale, {
    dateStyle: "medium", timeStyle: "medium", timeZone: "UTC",
  }).format(parsed) : value;
}

export function SectionUnavailable({ id, label }: { id: string; label: string }) {
  const { t } = useTranslation("common");
  const revalidator = useRevalidator();
  return <section id={id} className="profile-card" aria-labelledby={id + "-heading"}>
    <h2 id={id + "-heading"}>{label}</h2>
    <p role="status">{t("profileSectionUnavailable")}</p>
    <button type="button" onClick={() => revalidator.revalidate()}
      disabled={revalidator.state !== "idle"}>{t("profileSectionRefresh")}</button>
  </section>;
}

export function OwnerProfileSections({ locale, targetId, owner }: {
  locale: string; targetId: string; owner: ProfileOwnerData;
}) {
  const { t } = useTranslation("common");
  const location = useLocation();
  const base = forumProfilePath(locale, targetId);
  const page = (key: "sessionsBefore" | "historyBefore", cursor: string) => {
    const params = new URLSearchParams(location.search);
    params.set(key, cursor);
    params.delete("edit");
    params.delete("saved");
    return base + "?" + params.toString() + "#" + (key === "sessionsBefore" ? "owner-sessions" : "owner-history");
  };
  const account = owner.account.status === "ready" ? owner.account.value : null;
  return <>
    {owner.account.status === "unavailable" ?
      <SectionUnavailable id="owner-account" label={t("profileOwnerPrivate")} /> :
      <section id="owner-account" className="profile-card" aria-labelledby="owner-account-heading"
        key={owner.viewerId + ":" + targetId}>
        <h2 id="owner-account-heading">{t("profileOwnerPrivate")}</h2>
        <dl>
          <div><dt>{t("profileOwnerEmail")}</dt><dd><bdi dir="auto">{account!.email}</bdi></dd></div>
          <div><dt>{t("profileOwnerEmailVerified")}</dt><dd>{t(account!.emailVerified ? "superAdminHistoryYes" : "superAdminHistoryNo")}</dd></div>
          <div><dt>{t("profileJoined")}</dt><dd><time dateTime={account!.createdAt}>{utc(account!.createdAt, locale)}</time></dd></div>
          <div><dt>{t("profileOwnerMethods")}</dt><dd>{
            account!.linkedMethods.length
              ? account!.linkedMethods.map(method => <span key={method}>{t(method === "password" ?
                "profileOwnerAuthPassword" : "profileOwnerAuthGoogle")}{" "}</span>)
              : t("profileOwnerNone")
          }</dd></div>
        </dl>
        <section id="owner-sessions" aria-labelledby="owner-sessions-heading">
          <h3 id="owner-sessions-heading">{t("settingsSecuritySessions")}</h3>
          <p>{t("profileOwnerSessionsNote")}</p>
          <p>{t("superAdminSa02ActiveSessions")}: {new Intl.NumberFormat(locale).format(BigInt(account!.sessionCounts.active))}
            {" · "}{t("superAdminSa02ExpiredSessions")}: {new Intl.NumberFormat(locale).format(BigInt(account!.sessionCounts.expiredRetained))}</p>
          {account!.sessions.length ? <ol className="admin-forum-objects">{account!.sessions.map(session =>
            <li key={session.id}>
              <p><bdi>{session.id}</bdi> {session.current ? t("profileOwnerSessionCurrent") : null}
                {" · "}{t(session.status === "active" ? "superAdminSa02ActiveSessions" : "superAdminSa02ExpiredSessions")}</p>
              <dl>
                <div><dt>{t("profileOwnerSessionCreated")}</dt><dd><time dateTime={session.createdAt}>{utc(session.createdAt, locale)}</time></dd></div>
                <div><dt>{t("profileOwnerSessionExpires")}</dt><dd><time dateTime={session.expiresAt}>{utc(session.expiresAt, locale)}</time></dd></div>
                <div><dt>{t("profileOwnerSessionDevice")}</dt><dd><bdi dir="auto">{session.deviceLabel}</bdi></dd></div>
                <div><dt>{t("profileOwnerSessionIp")}</dt><dd><bdi>{session.recordedIp ?? t("superAdminHistoryUnknown")}</bdi></dd></div>
              </dl>
            </li>)}</ol> : <p>{t("profileOwnerNone")}</p>}
          {account!.nextSessionsCursor ?
            <Link to={page("sessionsBefore", account!.nextSessionsCursor)}>{t("profileOwnerOlderSessions")}</Link> : null}
        </section>
      </section>}
    {owner.history.status === "unavailable" ?
      <SectionUnavailable id="owner-history" label={t("superAdminHistory")} /> :
      <section id="owner-history" className="profile-card" aria-labelledby="owner-history-heading"
        key={owner.viewerId + ":" + targetId + ":history"}>
        <h2 id="owner-history-heading">{t("superAdminHistory")}</h2>
        <p>{t("profileOwnerHistoryNote")}</p>
        {owner.history.value.entries.length ?
          <ol className="super-admin-history-list">{owner.history.value.entries.map(entry =>
            <HistoryEntry key={entry.origin + ":" + entry.id} entry={entry} locale={locale}/>)}</ol> :
          <p>{t("superAdminNoHistory")}</p>}
        {owner.history.value.next ?
          <Link to={page("historyBefore", owner.history.value.next)}>{t("profileOwnerOlderEvents")}</Link> : null}
      </section>}
  </>;
}
