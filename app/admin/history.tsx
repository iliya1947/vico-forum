import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { AdminHistoryEvent, AdminHistoryPage, AdminHistoryChange } from "../../db/admin-history";

const actionLabels = {
  "role.created": "historyRoleCreated", "role.renamed": "historyRoleRenamed", "role.deleted": "historyRoleDeleted",
  "role.grantsChanged": "historyGrantsChanged", "user.roleAssigned": "historyRoleAssigned", "user.overrideChanged": "historyOverrideChanged",
  "help.signalReviewed": "historySignalReviewed",
  "topic.pinned": "historyTopicPinned", "topic.unpinned": "historyTopicUnpinned", "topic.solved": "historyTopicSolved",
  "topic.bestAnswerChanged": "historyBestAnswerChanged", "help.solutionModerationChanged": "historySolutionModerationChanged",
  "help.duplicateConfirmed": "historyDuplicateConfirmed", "help.duplicateRemoved": "historyDuplicateRemoved",
  "help.duplicateAppealResolved": "historyDuplicateAppealResolved", "topic.sourceLocaleCorrected": "historySourceLocaleCorrected", "post.sourceLocaleCorrected": "historySourceLocaleCorrected",
} as const;
function ModerationDetails({context}: {context:{postId:string;before:string|null;after:string|null}}) {
  const {t}=useTranslation("common");
  const status=(value:string|null)=>t(value==="outdated"?"helpSolutionOutdated":value==="needs-review"?"helpSolutionNeedsReview":"historyNoValue");
  return <p><code dir="ltr">{context.postId}</code>{" · "}{status(context.before)} → {status(context.after)}</p>;
}
function ChangeDetails({change}: {change: AdminHistoryChange}) {
  const {t} = useTranslation("common");
  switch (change.action) {
    case "help.signalReviewed": {
      const effect=change.context.effect;
      return <>
        <p><code dir="ltr">{change.context.signalId}</code>{" · "}{t(change.context.resolution === "accepted" ? "historyAccepted" : change.context.resolution === "rejected" ? "historyRejected" : "historySuperseded")}</p>
        {effect ? <p>{t(effect.action==="help.needsDetailsChanged"?"helpSolutionsFilterNeedsDetails":actionLabels[effect.action])}</p> : null}
        {effect?.action==="help.solutionModerationChanged" ? <ModerationDetails context={effect.context}/> : null}
        {effect?.action==="help.duplicateConfirmed" ? <p><code dir="ltr">{effect.context.originalTopicId}</code>{" · "}<code dir="ltr">{effect.context.relationshipId}</code></p> : null}
      </>;
    }
    case "topic.pinned": case "topic.unpinned": case "topic.solved": return null;
    case "topic.bestAnswerChanged": return <p><code dir="ltr">{change.context.before ?? t("historyNoValue")}</code> → <code dir="ltr">{change.context.after}</code></p>;
    case "help.solutionModerationChanged": return <ModerationDetails context={change.context}/>;
    case "help.duplicateConfirmed": case "help.duplicateRemoved": return <p><code dir="ltr">{change.context.originalTopicId}</code>{" · "}<code dir="ltr">{change.context.relationshipId}</code></p>;
    case "help.duplicateAppealResolved": return <p>{t(change.context.resolution === "accepted" ? "historyAccepted" : "historyRejected")}{" · "}<code dir="ltr">{change.context.appealId}</code></p>;
    case "topic.sourceLocaleCorrected": case "post.sourceLocaleCorrected": return <p><code dir="ltr">{change.context.before}</code> → <code dir="ltr">{change.context.after}</code></p>;
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
    {event.reason ? <p>{t("historyReason")}: <bdi>{event.reason}</bdi></p> : null}
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
