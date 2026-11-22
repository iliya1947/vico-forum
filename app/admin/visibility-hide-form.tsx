import { useFetcher, useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";
import { forumTopicPath } from "../forum/paths";
import type { VisibilityActionResult } from "../forum/visibility-actions.server";

/** B7-B1b: visible-only Hide; private Restore uses separate inspection surfaces. */
export function VisibilityHideForm({ locale, topicId, actorId, revisionId, visibilityVersion, postId }: {
  locale: string; topicId: string; actorId: string; revisionId: string;
  visibilityVersion: number; postId?: string;
}) {
  const { t } = useTranslation("common");
  const fetcher = useFetcher<VisibilityActionResult>();
  const revalidator = useRevalidator();
  // A stale CAS must be reviewed against a fresh loader; never resubmit it.
  const conflicted = fetcher.state === "idle" && fetcher.data?.operation === "contentVisibility"
    && "error" in fetcher.data && fetcher.data.error === "conflict";
  const isPost = postId !== undefined;
  return <fetcher.Form method="post" action={forumTopicPath(locale, topicId)}
    className="topic-admin-form visibility-hide-form">
    <input type="hidden" name="intent" value={isPost ? "setPostVisibility" : "setTopicVisibility"}/>
    <input type="hidden" name="editorActorId" value={actorId}/>
    <input type="hidden" name="hidden" value="true"/>
    <input type="hidden" name="expectedVisibilityVersion" value={String(visibilityVersion)}/>
    <input type="hidden" name="expectedRevisionId" value={revisionId}/>
    {postId !== undefined ? <input type="hidden" name="postId" value={postId}/> : null}
    <label>{t("visibilityHideReason")}
      <textarea name="reason" rows={2} required maxLength={2000}/>
    </label>
    <button type="submit" disabled={fetcher.state !== "idle" || conflicted}>
      {t(isPost ? "visibilityHidePost" : "visibilityHideTopic")}
    </button>
    {conflicted ? <div className="visibility-conflict">
      <p role="alert">{t("visibilityConflict")}</p>
      <button type="button" disabled={revalidator.state !== "idle"}
        onClick={() => void revalidator.revalidate()}>{t("visibilityReload")}</button>
    </div> : null}
  </fetcher.Form>;
}
