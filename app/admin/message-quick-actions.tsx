import { useEffect, useRef, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";
import { useHeaderAuthUser } from "../auth/auth-controls";
import { forumTopicPath } from "../forum/paths";
import type { SourceLocaleCorrectionMutationError } from "../forum/mutations.server";

interface MessageQuickActionsProps {
  locale: string;
  topicId: string;
  postId: string;
  revisionId: string;
  sourceLocale: string;
  canCorrectAnySourceLocale: boolean;
  canReadPostHistory: boolean;
  actorId?: string | null;
}
type HistoryResponse = { operation: "postHistory"; postId: string; revisions: Array<{
  id: string; authorName: string; originalContent: string; sourceLocale: string; createdAt: string;
}> } | { error: string };
type CorrectionResponse = { ok?: boolean; error?: SourceLocaleCorrectionMutationError["error"] };

function MessageActionsForActor(props: MessageQuickActionsProps & { actorId: string }) {
  const { locale, topicId, postId, revisionId, sourceLocale, actorId,
    canCorrectAnySourceLocale, canReadPostHistory } = props;
  const { t } = useTranslation("common");
  const correction = useFetcher<CorrectionResponse>();
  const history = useFetcher<HistoryResponse>();
  const revalidator = useRevalidator();
  const lastRefreshedConflict = useRef<unknown>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRevision, setHistoryRevision] = useState<string | null>(null);
  const path = forumTopicPath(locale, topicId);

  // 409 does not revalidate framework loaders by default. Refresh the snapshot;
  // never replay a stale command.
  useEffect(() => {
    if (correction.state !== "idle" || correction.data?.error !== "conflict"
      || lastRefreshedConflict.current === correction.data) return;
    lastRefreshedConflict.current = correction.data;
    void revalidator.revalidate();
  }, [correction.state, correction.data, revalidator]);

  function toggleHistory() {
    if (history.state !== "idle") return;
    if (historyOpen && historyRevision === revisionId) {
      setHistoryOpen(false);
      history.reset();
      return;
    }
    setHistoryOpen(true);
    setHistoryRevision(revisionId);
    void history.submit(
      { intent: "readPostHistory", postId, editorActorId: actorId },
      { action: path, method: "post" },
    );
  }

  const currentHistory = historyOpen && historyRevision === revisionId;
  const historyResult = currentHistory && history.state === "idle" ? history.data : undefined;
  return <details className="message-admin-tools">
    <summary>{t("quickActions")}</summary>
    <div className="message-admin-panel">
      {canCorrectAnySourceLocale ? <div className="message-source-correction">
        <correction.Form method="post" action={path} className="source-locale-form">
          <input type="hidden" name="intent" value="correctPostSourceLocale"/>
          <input type="hidden" name="inlineQuickAction" value="1"/>
          <input type="hidden" name="operationScope" value="any"/>
          <input type="hidden" name="editorActorId" value={actorId}/>
          <input type="hidden" name="postId" value={postId}/>
          <input type="hidden" name="expectedRevisionId" value={revisionId}/>
          <p>{t("sourceLocaleCurrent", { locale: sourceLocale })}</p>
          <label>{t("sourceLocaleCorrectionInput")}
            <input key={revisionId} name="sourceLocale" required
              defaultValue={sourceLocale === "und" ? "" : sourceLocale} autoComplete="off"/>
          </label>
          <button type="submit" disabled={correction.state !== "idle"}>{t("sourceLocaleCorrectionSubmit")}</button>
        </correction.Form>
        {correction.state === "idle" && correction.data?.ok ? <p role="status">{t("complaintReviewActionSaved")}</p> : null}
        {correction.state === "idle" && correction.data?.error
          ? <p role="alert">{t(`sourceLocaleCorrectionError_${correction.data.error}`)}</p> : null}
      </div> : null}
      {canReadPostHistory ? <div className="message-history-action">
        <button type="button" onClick={toggleHistory} disabled={history.state !== "idle"}>
          {t("postHistory")}
        </button>
        {currentHistory ? <section className="topic-post-history" aria-label={t("postHistoryHeading")}>
          <h4>{t("postHistoryHeading")}</h4>
          {history.state !== "idle" ? <p role="status">{t("postHistoryLoading")}</p>
            : historyResult && "operation" in historyResult && historyResult.operation === "postHistory"
              && historyResult.postId === postId
              ? <ol>{historyResult.revisions.map((rev) => <li key={rev.id}>
                  <strong>{t("postRevisionBy", { author: rev.authorName,
                    date: new Date(rev.createdAt).toLocaleString(locale, { timeZone: "UTC", timeZoneName: "short" }) })}</strong>
                  <pre className="message-history-source" lang={rev.sourceLocale === "und" ? undefined : rev.sourceLocale}
                    dir="auto">{rev.originalContent}</pre>
                </li>)}</ol>
              : <p role="alert">{t("postHistoryUnavailable")}</p>}
        </section> : null}
      </div> : null}
    </div>
  </details>;
}

/** Changing actor, target or permission unmounts private fetchers and their responses. */
export function MessageQuickActions(props: MessageQuickActionsProps) {
  const actorId = props.actorId ?? useHeaderAuthUser()?.id ?? null;
  if (!actorId || (!props.canCorrectAnySourceLocale && !props.canReadPostHistory)) return null;
  const key = JSON.stringify([
    actorId, props.topicId, props.postId, props.canCorrectAnySourceLocale, props.canReadPostHistory,
  ]);
  return <MessageActionsForActor key={key} {...props} actorId={actorId}/>;
}
