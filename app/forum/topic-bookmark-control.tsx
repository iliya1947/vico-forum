import { useEffect, useRef, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";
import type { ForumMutationError, TopicBookmarkActionResult } from "./mutations.server";
import { forumTopicPath } from "./paths";

export type TopicBookmarkState = "on" | "off" | "unavailable";

/** Independent from Watch and all editors. No optimistic or automatic mutation retry. */
export function TopicBookmarkControl({ topicId, actorId, locale, state }: {
  topicId: string; actorId: string; locale: string; state: TopicBookmarkState;
}) {
  const { t } = useTranslation("common");
  const fetcher = useFetcher<TopicBookmarkActionResult | ForumMutationError>();
  const revalidator = useRevalidator();
  // The route loader owns confirmed Bookmark state; ACK is not a second authority.
  const [requiresRefresh, setRequiresRefresh] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const submitted = useRef<{ topicId: string; actorId: string; bookmarked: boolean } | null>(null);
  const handledResponse = useRef<unknown>(null);
  const pending = fetcher.state !== "idle";

  const displayState: TopicBookmarkState = requiresRefresh ? "unavailable" : state;

  useEffect(() => {
    if (pending || !submitted.current || !fetcher.data || handledResponse.current === fetcher.data) return;
    const expected = submitted.current;
    submitted.current = null;
    handledResponse.current = fetcher.data;
    const result = fetcher.data;
    if ("operation" in result && result.operation === "topicBookmark" && "ok" in result && result.ok
      && result.topicId === expected.topicId && result.actorId === expected.actorId
      && result.bookmarked === expected.bookmarked
      && expected.topicId === topicId && expected.actorId === actorId) {
      setRequiresRefresh(false);
      setFailed(false);
    } else {
      setRequiresRefresh(true);
      setFailed(true);
    }
  }, [pending, fetcher.data, topicId, actorId]);

  const refresh = () => {
    if (pending || refreshing) return;
    setRefreshing(true);
    void revalidator.revalidate()
      .then(() => { setRequiresRefresh(false); setFailed(false); })
      .catch(() => setFailed(true))
      .finally(() => setRefreshing(false));
  };
  const isSaved = displayState === "on";
  const blocked = pending || refreshing || requiresRefresh || displayState === "unavailable";
  const next = !isSaved;

  return <div className="topic-bookmark-control" aria-busy={pending || refreshing}>
    {displayState !== "unavailable" && <fetcher.Form method="post" action={forumTopicPath(locale, topicId)}
      onSubmit={event => {
        if (blocked) { event.preventDefault(); return; }
        submitted.current = { topicId, actorId, bookmarked: next };
      }}>
      <input type="hidden" name="intent" value="setTopicBookmark" />
      <input type="hidden" name="editorActorId" value={actorId} />
      <input type="hidden" name="bookmarked" value={String(next)} />
      <button type="submit" disabled={blocked} aria-pressed={isSaved}>
        {t(pending ? "topicBookmarkUpdating" : isSaved ? "bookmarksRemove" : "topicBookmarkAdd")}
      </button>
    </fetcher.Form>}
    <span className="topic-bookmark-status" role="status" aria-live="polite">
      {displayState === "unavailable" ? t("topicBookmarkUnavailable")
        : t(isSaved ? "topicBookmarkOn" : "topicBookmarkOff")}
    </span>
    {failed && <p role="alert">{t("topicBookmarkVerify")}</p>}
    {(requiresRefresh || displayState === "unavailable") &&
      <button type="button" onClick={refresh} disabled={pending || refreshing}>
        {t(refreshing ? "topicBookmarkUpdating" : "topicBookmarkRefresh")}
      </button>}
  </div>;
}
