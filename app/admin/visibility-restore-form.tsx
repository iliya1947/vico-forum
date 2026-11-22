import { useEffect, useRef } from "react";
import { useFetcher, useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";
import { forumTopicPath } from "../forum/paths";
import type { VisibilityActionResult } from "../forum/visibility-actions.server";

/** Restore only from a guarded current private inspection, never a public tombstone. */
export function VisibilityRestoreForm({ locale, topicId, actorId, revisionId, visibilityVersion, postId }: {
  locale: string; topicId: string; actorId: string; revisionId: string;
  visibilityVersion: number; postId?: string;
}) {
  const { t } = useTranslation("common");
  const fetcher = useFetcher<VisibilityActionResult>();
  const revalidator = useRevalidator();
  const refreshedDeniedResponse = useRef<unknown>(null);
  // A stale CAS must be reviewed against a fresh loader; never resubmit it.
  const conflicted = fetcher.state === "idle" && fetcher.data?.operation === "contentVisibility"
    && "error" in fetcher.data && fetcher.data.error === "conflict";
  const denied = fetcher.state === "idle" && fetcher.data?.operation === "contentVisibility"
    && "error" in fetcher.data
    && (fetcher.data.error === "forbidden" || fetcher.data.error === "unauthenticated");
  // 401/403 must refresh authorization immediately. Never replay the submitted CAS.
  useEffect(() => {
    if (!denied || refreshedDeniedResponse.current === fetcher.data) return;
    refreshedDeniedResponse.current = fetcher.data;
    void revalidator.revalidate();
  }, [denied, fetcher.data, revalidator]);
  return <fetcher.Form method="post" action={forumTopicPath(locale, topicId)}
    className="topic-admin-form visibility-restore-form">
    <input type="hidden" name="intent" value={postId === undefined ? "setTopicVisibility" : "setPostVisibility"}/>
    <input type="hidden" name="editorActorId" value={actorId}/>
    <input type="hidden" name="hidden" value="false"/>
    <input type="hidden" name="expectedVisibilityVersion" value={String(visibilityVersion)}/>
    <input type="hidden" name="expectedRevisionId" value={revisionId}/>
    {postId !== undefined ? <input type="hidden" name="postId" value={postId}/> : null}
    <label>{t("visibilityRestoreReason")}
      <textarea name="reason" rows={2} required maxLength={2000}/>
    </label>
    <button type="submit" disabled={fetcher.state !== "idle" || conflicted || denied}>
      {t(postId === undefined ? "visibilityRestoreTopic" : "visibilityRestorePost")}
    </button>
    {denied ? <p role="alert" className="visibility-denied">{t("visibilityDenied")}</p> : null}
    {conflicted ? <div className="visibility-conflict">
      <p role="alert">{t("visibilityConflict")}</p>
      <button type="button" disabled={revalidator.state !== "idle"}
        onClick={() => void revalidator.revalidate()}>{t("visibilityReload")}</button>
    </div> : null}
  </fetcher.Form>;
}
