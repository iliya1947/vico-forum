import { Link, useLoaderData } from "react-router";
import { useHeaderAuthUser } from "../auth/auth-controls";
import type { AdminAccess } from "./access";
import type { HiddenInspection } from "../../db/private-visibility-queue";
import { VisibilityRestoreForm } from "./visibility-restore-form";
import { useTranslation } from "react-i18next";
import { AdminShell } from "./shell";
import { hiddenInspectionPath, hiddenQueuePath } from "./visibility-queue-path";
import { useAdministrativeRouting } from "../administrative-routing/provider";
import type { loader } from "../routes/admin-forum-inspect";

/** Current read snapshot is private and pre-authorized by the B6 route/reader. */
export function canRestoreHiddenInspection(
  access: Pick<AdminAccess, "canManageVisibility" | "actorId">,
  inspection: HiddenInspection, viewerId: string | null,
): boolean {
  return Boolean(access.canManageVisibility && access.actorId && access.actorId === viewerId
    && inspection.isHidden && Number.isInteger(inspection.visibilityVersion)
    && inspection.visibilityVersion > 0 && inspection.visibilityVersion <= 2_147_483_647
    && inspection.currentRevisionId && inspection.currentRevisionId === inspection.currentRevisionId.trim());
}

export default function VisibilityInspector() {
  const {locale,access,canReadPostHistory,inspection,revisions}=useLoaderData<typeof loader>();
  const {t}=useTranslation("common");
  const viewerId=useHeaderAuthUser()?.id??null;
  const canRestore=canRestoreHiddenInspection(access,inspection,viewerId);
  const routing=useAdministrativeRouting();
  const target=inspection.kind==="topic"
    ? {kind:"topic" as const,topicId:inspection.topicId}
    : {kind:"post" as const,topicId:inspection.topicId,postId:inspection.id};
  const canShowRevisions=inspection.kind==="post"&&canReadPostHistory;
  const eventLabels={
    "topic.hidden":"historyTopicHidden","topic.restored":"historyTopicRestored",
    "post.hidden":"historyPostHidden","post.restored":"historyPostRestored",
  } as const;
  // A retained private loader snapshot belongs to its original account. Hide its
  // source synchronously when HeaderAuth changes, even before a fresh loader GET
  // or an older in-flight visibility action finishes.
  if (!viewerId || viewerId !== access.actorId) return null;
  return <AdminShell locale={locale} access={access} current="forum">
    <section className="admin-forum" aria-labelledby="admin-hidden-inspector-heading">
      <h2 id="admin-hidden-inspector-heading">{t("adminHiddenInspectorTitle")}</h2>
      <p><Link to={hiddenQueuePath(locale,inspection.kind,undefined,routing)}>
        {t("adminHiddenInspectorBack")}</Link></p>
      <dl className="admin-forum-counts">
        <div><dt>{inspection.kind==="topic"?t("adminHiddenTopics"):t("adminHiddenPosts")}</dt>
          <dd><bdi>{inspection.id}</bdi></dd></div>
        <div><dt>{t("adminHiddenQueueTopicRef")}</dt><dd><bdi>{inspection.topicId}</bdi></dd></div>
        <div><dt>{t("adminHiddenInspectorState")}</dt><dd>
          {t(inspection.isHidden?"adminHiddenInspectorHidden":"adminHiddenInspectorVisible")}</dd></div>
        <div><dt>{t("adminHiddenQueueVersion")}</dt><dd>{inspection.visibilityVersion}</dd></div>
        <div><dt>{t("adminHiddenInspectorCurrentRevision")}</dt><dd><bdi>{inspection.currentRevisionId}</bdi></dd></div>
        {inspection.visibilityChangedAt?<div><dt>{t("adminHiddenQueueChangedAt")}</dt>
          <dd><time dateTime={inspection.visibilityChangedAt}><bdi>{inspection.visibilityChangedAt}</bdi></time></dd></div>:null}
        {inspection.kind==="post"?<>
          {inspection.parentPostId?<div><dt>{t("adminHiddenQueueParentRef")}</dt>
            <dd><bdi>{inspection.parentPostId}</bdi></dd></div>:null}
          <div><dt>{t("adminHiddenQueueContextStatus")}</dt><dd>
            {t(inspection.parentUnavailable?"adminHiddenQueueParentUnavailable":"adminHiddenQueueParentAvailable")}
          </dd></div>
        </>:null}
      </dl>
      {canRestore?<VisibilityRestoreForm
        key={JSON.stringify([access.actorId,inspection.kind,inspection.topicId,inspection.id,
          inspection.visibilityVersion,inspection.currentRevisionId])}
        locale={locale} topicId={inspection.topicId} actorId={access.actorId!}
        revisionId={inspection.currentRevisionId} visibilityVersion={inspection.visibilityVersion}
        {...(inspection.kind==="post"?{postId:inspection.id}:{})}/>:null}
      <h3>{t("adminHiddenInspectorLastEvent")}</h3>
      {inspection.lastEvent?<dl>
        <div><dt>{t(eventLabels[inspection.lastEvent.action])}</dt>
          <dd><time dateTime={inspection.lastEvent.at}><bdi>{inspection.lastEvent.at}</bdi></time></dd></div>
        <div><dt>{t("historyReason")}</dt><dd><bdi>{inspection.lastEvent.reason}</bdi></dd></div>
      </dl>:<p>{t("historyNoValue")}</p>}
      {canShowRevisions?<section aria-labelledby="admin-hidden-revisions-heading">
        <h3 id="admin-hidden-revisions-heading">{t("adminHiddenInspectorRevisions")}</h3>
        {revisions?<>
          {revisions.items.length?<ol>{revisions.items.map(revision=><li key={revision.id}>
            <p><bdi>{revision.id}</bdi> — <time dateTime={revision.createdAt}><bdi>{revision.createdAt}</bdi></time></p>
            <p>{t("adminHiddenInspectorSourceLocale")}: <bdi>{revision.sourceLocale}</bdi></p>
            <p>{t("adminHiddenInspectorText")}</p>
            <pre dir="auto"><code>{revision.originalContent}</code></pre>
          </li>)}</ol>:<p>{t("historyNoValue")}</p>}
          {revisions.next?<Link to={hiddenInspectionPath(locale,target,routing,{before:revisions.next})}>
            {t("adminHiddenInspectorOlder")}</Link>:null}
        </>:<Link to={hiddenInspectionPath(locale,target,routing,{})}>
          {t("adminHiddenInspectorShowRevisions")}</Link>}
      </section>:null}
    </section>
  </AdminShell>;
}
