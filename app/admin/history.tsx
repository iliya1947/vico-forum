import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { AdminHistoryEvent, AdminHistoryPage, AuthorizationHistoryChange } from "../../db/admin-history";

const actionLabels = {
  "role.created": "historyRoleCreated", "role.renamed": "historyRoleRenamed", "role.deleted": "historyRoleDeleted",
  "role.grantsChanged": "historyGrantsChanged", "user.roleAssigned": "historyRoleAssigned", "user.overrideChanged": "historyOverrideChanged",
} as const;
function ChangeDetails({change}: {change: AuthorizationHistoryChange}) {
  const {t} = useTranslation("common");
  switch (change.action) {
    case "role.created": case "role.deleted": return <code dir="ltr">{change.context.slug}</code>;
    case "role.renamed": return <p><bdi>{change.context.before}</bdi> → <bdi>{change.context.after}</bdi></p>;
    case "role.grantsChanged": return <dl>
      <dt>{t("historyAdded")}</dt><dd>{change.context.added.map(key => <code key={key} dir="ltr">{key} </code>)}</dd>
      <dt>{t("historyRemoved")}</dt><dd>{change.context.removed.map(key => <code key={key} dir="ltr">{key} </code>)}</dd>
    </dl>;
    case "user.roleAssigned": return <p>
      <bdi>{change.context.before?.name ?? t("historyDefaultRole")}</bdi> → <bdi>{change.context.after.name}</bdi>
    </p>;
    case "user.overrideChanged": return <p><code dir="ltr">{change.context.permission}</code>{" · "}
      {t(`historyEffect_${change.context.before ?? "inherit"}`)} → {t(`historyEffect_${change.context.after ?? "inherit"}`)}
    </p>;
  }
}
export function HistoryEvents({events,locale}: {events: AdminHistoryEvent[]; locale: string}) {
  const {t} = useTranslation("common");
  const date = new Intl.DateTimeFormat(locale, {year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"UTC",timeZoneName:"short"});
  return events.length ? <ol className="admin-history-events">{events.map(event => <li key={event.id}>
    <h3>{t(actionLabels[event.change.action])}</h3>
    <time dateTime={event.at}>{date.format(new Date(event.at))}</time>
    <p>{t("historyActor")}: <bdi>{event.actorLabel}</bdi> <code dir="ltr">{event.actorId}</code></p>
    <p>{t("historyTarget")}: <bdi>{event.change.targetLabel}</bdi> <code dir="ltr">{event.change.targetId}</code></p>
    <ChangeDetails change={event.change} />
  </li>)}</ol> : <p>{t("historyEmpty")}</p>;
}
export function RecentHistory({recent,locale}: {recent: AdminHistoryPage | null; locale: string}) {
  const {t} = useTranslation("common");
  return <section aria-labelledby="admin-recent-heading">
    <h2 id="admin-recent-heading">{t("historyRecent")}</h2>
    {recent ? <HistoryEvents events={recent.events} locale={locale}/> : <p role="status">{t("historyUnavailable")}</p>}
    <Link to={`/${encodeURIComponent(locale)}/admin/history`}>{t("historyViewAll")}</Link>
  </section>;
}
