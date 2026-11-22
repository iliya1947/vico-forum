import { useEffect, useRef, useState } from "react";
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
  const refreshedDeniedResponse = useRef<unknown>(null);
  // The submission guard is synchronous: a second submit can overtake a React render.
  const submittedInCurrentSnapshot = useRef(false);
  // A stale CAS must be reviewed against a fresh loader; never resubmit it.
  const [submitted, setSubmitted] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const isPost = postId !== undefined;
  const outcome = fetcher.state === "idle" ? fetcher.data : undefined;
  const visibilityOutcome = outcome !== null && typeof outcome === "object"
    && "operation" in outcome && outcome.operation === "contentVisibility";
  // Only a matching success receipt establishes the requested result.
  const confirmed = visibilityOutcome && "ok" in outcome && outcome.ok === true
    && "target" in outcome && outcome.target === (isPost ? "post" : "topic")
    && "topicId" in outcome && outcome.topicId === topicId
    && "actorId" in outcome && outcome.actorId === actorId
    && "hidden" in outcome && outcome.hidden === true
    && "visibilityVersion" in outcome && typeof outcome.visibilityVersion === "number"
    && Number.isInteger(outcome.visibilityVersion) && outcome.visibilityVersion >= 0
    && outcome.visibilityVersion <= 2_147_483_647
    && (!isPost || ("postId" in outcome && outcome.postId === postId));
  const conflicted = visibilityOutcome && "error" in outcome && outcome.error === "conflict";
  const denied = visibilityOutcome && "error" in outcome
    && (outcome.error === "forbidden" || outcome.error === "unauthenticated" || outcome.error === "origin");
  // A 503, an unexpected clientAction failure or any unrecognized response does
  // not prove that the attempted mutation did not commit. Never replay it.
  const unconfirmed = fetcher.state === "idle" && submitted
    && !confirmed && !conflicted && !denied && !verified;
  // A denied action refreshes only authorization; it never resends the POST.
  useEffect(() => {
    if (!denied || refreshedDeniedResponse.current === fetcher.data) return;
    refreshedDeniedResponse.current = fetcher.data;
    void revalidator.revalidate();
  }, [denied, fetcher.data, revalidator]);
  async function verifyCurrentState() {
    if (verifying || revalidator.state !== "idle") return;
    setVerifying(true);
    try {
      // Only explicit user verification can unlock an unchanged fresh snapshot.
      // A changed target/version/actor is remounted by its caller's snapshot key.
      await revalidator.revalidate();
      // Explicit current-state verification permits a new deliberate command.
      submittedInCurrentSnapshot.current = false;
      setVerified(true);
    } finally {
      setVerifying(false);
    }
  }
  return <fetcher.Form method="post" action={forumTopicPath(locale, topicId)}
    className="topic-admin-form visibility-hide-form"
    aria-busy={fetcher.state !== "idle"}
    onSubmit={(event) => {
      if (submittedInCurrentSnapshot.current || fetcher.state !== "idle"
        || revalidator.state !== "idle" || verifying || conflicted || denied || unconfirmed || confirmed) {
        event.preventDefault();
        return;
      }
      submittedInCurrentSnapshot.current = true;
      setSubmitted(true);
      setVerified(false);
    }}>
    <input type="hidden" name="intent" value={isPost ? "setPostVisibility" : "setTopicVisibility"}/>
    <input type="hidden" name="editorActorId" value={actorId}/>
    <input type="hidden" name="hidden" value="true"/>
    <input type="hidden" name="expectedVisibilityVersion" value={String(visibilityVersion)}/>
    <input type="hidden" name="expectedRevisionId" value={revisionId}/>
    {postId !== undefined ? <input type="hidden" name="postId" value={postId}/> : null}
    <label>{t("visibilityHideReason")}
      <textarea name="reason" rows={2} required maxLength={2000}/>
    </label>
    <button type="submit" disabled={fetcher.state !== "idle" || conflicted || denied || unconfirmed || verifying || confirmed}>
      {t(isPost ? "visibilityHidePost" : "visibilityHideTopic")}
    </button>
    {submitted && fetcher.state !== "idle" ? <p role="status" className="visibility-pending">{t("visibilityPending")}</p> : null}
    {denied ? <p role="alert" className="visibility-denied">{t("visibilityDenied")}</p> : null}
    {conflicted ? <div className="visibility-conflict">
      <p role="alert">{t("visibilityConflict")}</p>
      <button type="button" disabled={revalidator.state !== "idle"}
        onClick={() => void revalidator.revalidate()}>{t("visibilityReload")}</button>
    </div> : null}
    {unconfirmed ? <div className="visibility-unconfirmed">
      <p role="alert">{t("visibilityUnconfirmed")}</p>
      <button type="button" disabled={verifying || revalidator.state !== "idle"}
        onClick={() => void verifyCurrentState()}>{t("visibilityReload")}</button>
    </div> : null}
  </fetcher.Form>;
}
