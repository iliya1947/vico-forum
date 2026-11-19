import { useEffect, useRef, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";
import type { TopicMuteActionResult, UserBlockActionResult } from "./mutations.server";
import { forumProfilePath, forumTopicPath } from "./paths";

export type PersonalFilterState = "on" | "off" | "unavailable";

export function PersonalFilterControl({ kind, targetId, actorId, locale, state }: {
  kind: "topic" | "user"; targetId: string; actorId: string;
  locale: string; state: PersonalFilterState;
}) {
  const { t } = useTranslation("common");
  const fetcher = useFetcher<TopicMuteActionResult | UserBlockActionResult>();
  const revalidator = useRevalidator();
  const [confirmed, setConfirmed] = useState<PersonalFilterState>(state);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const submitted = useRef<{ actorId: string; targetId: string; desired: boolean } | null>(null);
  const processed = useRef<unknown>(null);
  const pending = fetcher.state !== "idle";
  const enabled = confirmed === "on";
  const locked = pending || refreshing || needsRefresh || confirmed === "unavailable";
  const desired = !enabled;

  useEffect(() => {
    if (!pending && !submitted.current && !needsRefresh && !refreshing) setConfirmed(state);
  }, [state, pending, needsRefresh, refreshing]);

  useEffect(() => {
    if (pending || !submitted.current || !fetcher.data || processed.current === fetcher.data) return;
    const request = submitted.current;
    submitted.current = null;
    processed.current = fetcher.data;
    const value = fetcher.data;
    const matched = kind === "topic"
      ? value.operation === "topicMute" && "ok" in value && value.ok
        && value.actorId === request.actorId && value.topicId === request.targetId && value.muted === request.desired
      : value.operation === "userBlock" && "ok" in value && value.ok
        && value.actorId === request.actorId && value.targetId === request.targetId && value.blocked === request.desired;
    if (matched && actorId === request.actorId && targetId === request.targetId) {
      setConfirmed(request.desired ? "on" : "off");
      setNeedsRefresh(false);
      setFailed(false);
    } else {
      setConfirmed("unavailable");
      setNeedsRefresh(true);
      setFailed(true);
    }
  }, [pending, fetcher.data, actorId, targetId, kind]);

  const refresh = () => {
    if (pending || refreshing) return;
    setRefreshing(true);
    void revalidator.revalidate()
      .then(() => { setNeedsRefresh(false); setFailed(false); })
      .catch(() => setFailed(true))
      .finally(() => setRefreshing(false));
  };
  const action = kind === "topic" ? forumTopicPath(locale, targetId) : forumProfilePath(locale, targetId);
  const intent = kind === "topic" ? "setTopicMute" : "setUserBlock";
  const field = kind === "topic" ? "muted" : "blocked";
  return <div className="topic-watch-control" aria-busy={pending || refreshing}>
    {confirmed !== "unavailable" && <fetcher.Form method="post" action={action}
      onSubmit={event => {
        if (locked) { event.preventDefault(); return; }
        submitted.current = { actorId, targetId, desired };
      }}>
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="editorActorId" value={actorId} />
      <input type="hidden" name={field} value={String(desired)} />
      <button type="submit" disabled={locked} aria-pressed={enabled}>
        {t(pending ? "personalFilterUpdating" :
          kind === "topic" ? (enabled ? "topicUnmute" : "topicMute") : (enabled ? "userUnblock" : "userBlock"))}
      </button>
    </fetcher.Form>}
    <span role="status" aria-live="polite" className="topic-watch-status">
      {t(kind === "topic"
        ? confirmed === "unavailable" ? "topicMuteUnavailable" : enabled ? "topicMuteOn" : "topicMuteOff"
        : confirmed === "unavailable" ? "userBlockUnavailable" : enabled ? "userBlockOn" : "userBlockOff")}
    </span>
    {failed && <p role="alert">{t("personalFilterVerify")}</p>}
    {(needsRefresh || confirmed === "unavailable") && <button type="button"
      disabled={pending || refreshing} onClick={refresh}>
      {t(refreshing ? "personalFilterUpdating" : "personalFilterRefresh")}
    </button>}
  </div>;
}
