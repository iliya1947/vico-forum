import { useEffect, useRef, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";
import type { ForumMutationError, TopicWatchActionResult } from "./mutations.server";
import { forumTopicPath } from "./paths";

export type TopicWatchState = "on" | "off" | "unavailable";

/** This fetcher never owns a post/title editor and never retries an uncertain write. */
export function TopicWatchControl({ topicId, actorId, locale, state }: {
  topicId: string; actorId: string; locale: string; state: TopicWatchState;
}) {
  const { t } = useTranslation("common");
  const fetcher = useFetcher<TopicWatchActionResult | ForumMutationError>();
  const revalidator = useRevalidator();
  const [confirmed, setConfirmed] = useState<TopicWatchState>(state);
  const [requiresRefresh, setRequiresRefresh] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ForumMutationError["error"] | null>(null);
  const submitted = useRef<{ topicId: string; actorId: string; watching: boolean } | null>(null);
  const handledResponse = useRef<unknown>(null);
  const pending = fetcher.state !== "idle";

  // Use only this actor/topic's authoritative loader snapshot; do not overwrite a pending write.
  useEffect(() => {
    if (!pending && !submitted.current && !requiresRefresh && !refreshing) setConfirmed(state);
  }, [state, pending, requiresRefresh, refreshing]);

  useEffect(() => {
    if (pending || !submitted.current || !fetcher.data || handledResponse.current === fetcher.data) return;
    const expected = submitted.current;
    submitted.current = null;
    handledResponse.current = fetcher.data;
    const result = fetcher.data;
    if ("operation" in result && result.operation === "topicWatch" && "ok" in result && result.ok
      && result.topicId === expected.topicId && result.actorId === expected.actorId
      && result.watching === expected.watching
      && expected.topicId === topicId && expected.actorId === actorId) {
      setConfirmed(result.watching ? "on" : "off");
      setRequiresRefresh(false);
      setError(null);
    } else {
      // An error response may follow a committed write with a lost acknowledgement.
      // Preserve the previous state without claiming it is the new server state.
      setError("error" in result ? result.error : "unexpected");
      setRequiresRefresh(true);
    }
  }, [pending, fetcher.data, actorId, topicId]);

  const refresh = () => {
    if (pending || refreshing) return;
    setRefreshing(true);
    void revalidator.revalidate()
      .then(() => { setRequiresRefresh(false); setError(null); })
      .catch(() => setError("unexpected"))
      .finally(() => setRefreshing(false));
  };
  const isWatching = confirmed === "on";
  const blocked = pending || refreshing || requiresRefresh || confirmed === "unavailable";
  const next = !isWatching;

  return <div className="topic-watch-control" aria-busy={pending || refreshing}>
    {confirmed !== "unavailable" && <fetcher.Form method="post" action={forumTopicPath(locale, topicId)}
      onSubmit={event => {
        if (blocked) { event.preventDefault(); return; }
        submitted.current = { topicId, actorId, watching: next };
      }}>
      <input type="hidden" name="intent" value="setTopicWatch" />
      <input type="hidden" name="editorActorId" value={actorId} />
      <input type="hidden" name="watching" value={String(next)} />
      <button type="submit" disabled={blocked} aria-pressed={isWatching}>
        {t(pending ? "topicWatchUpdating" : isWatching ? "topicUnwatch" : "topicWatch")}
      </button>
    </fetcher.Form>}
    <span className="topic-watch-status" role="status" aria-live="polite">
      {confirmed === "unavailable" ? t("topicWatchUnavailable")
        : t(isWatching ? "topicWatchOn" : "topicWatchOff")}
    </span>
    {error && <p role="alert">{t("forumWriteError_" + error)} {t("topicWatchVerify")}</p>}
    {(requiresRefresh || confirmed === "unavailable") &&
      <button type="button" onClick={refresh} disabled={pending || refreshing}>
        {t(refreshing ? "topicWatchUpdating" : "topicWatchRefresh")}
      </button>}
  </div>;
}
