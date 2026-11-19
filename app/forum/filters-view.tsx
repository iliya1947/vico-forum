import { useEffect, useRef, useState } from "react";
import { Link, useFetcher, useLocation, useNavigate, useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";
import { useHeaderAuthUser } from "../auth/auth-controls";
import type { TopicMuteActionResult, UserBlockActionResult } from "./mutations.server";
import { forumFiltersPath, forumTopicPath, forumProfilePath } from "./paths";
import { Breadcrumbs, EmptyState, ForumShell } from "./ui";

const FILTERS_ACTOR_TAB_KEY = "vico:filters:actor";
export type FilterListItem =
  | { kind: "topic"; id: string; name: string; createdAt: string;
      authorName: string; authorIdentityKind?: "deleted"; category: { name: string };
      section: { name: string } | null }
  | { kind: "user"; id: string; name: string; createdAt: string; identityKind?: "deleted" };

function FilterRow({ item, actorId, locale, formatDate }: {
  item: FilterListItem; actorId: string; locale: string; formatDate: Intl.DateTimeFormat;
}) {
  const { t } = useTranslation("common");
  const fetcher = useFetcher<TopicMuteActionResult | UserBlockActionResult>();
  const revalidator = useRevalidator();
  const [removed, setRemoved] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const submitted = useRef(false);
  const handled = useRef<unknown>(null);
  const pending = fetcher.state !== "idle";
  const isTopic = item.kind === "topic";

  useEffect(() => {
    if (pending || !submitted.current || !fetcher.data || handled.current === fetcher.data) return;
    submitted.current = false;
    handled.current = fetcher.data;
    const value = fetcher.data;
    const valid = isTopic
      ? value.operation === "topicMute" && "ok" in value && value.ok
        && value.actorId === actorId && value.topicId === item.id && value.muted === false
      : value.operation === "userBlock" && "ok" in value && value.ok
        && value.actorId === actorId && value.targetId === item.id && value.blocked === false;
    if (valid) { setRemoved(true); setUncertain(false); }
    else setUncertain(true);
  }, [pending, fetcher.data, actorId, item.id, isTopic]);

  const refresh = () => {
    if (pending || refreshing) return;
    setRefreshing(true);
    void revalidator.revalidate()
      .then(() => setUncertain(false))
      .catch(() => setUncertain(true))
      .finally(() => setRefreshing(false));
  };
  if (removed) return null;
  const destination = isTopic ? forumTopicPath(locale, item.id) : forumProfilePath(locale, item.id);
  return <li className="bookmarks-list-row" aria-busy={pending || refreshing}>
    <Link className="bookmarks-topic-link" to={destination}>
      <strong dir="auto">{isTopic ? item.name : item.identityKind === "deleted" ? t("deletedUser") : item.name}</strong>
      <span className="bookmarks-topic-metadata">
        {isTopic && <>
          <span>{t("startedBy", { author: item.authorIdentityKind === "deleted" ? t("deletedUser") : item.authorName })}</span>
          <span><bdi dir="auto">{item.category.name}</bdi>{item.section && <> · <bdi dir="auto">{item.section.name}</bdi></>}</span>
        </>}
        <time dateTime={item.createdAt}>{t("personalFiltersAddedAt", { date: formatDate.format(new Date(item.createdAt)) })}</time>
      </span>
    </Link>
    <div className="bookmarks-row-actions">
      <fetcher.Form method="post" action={destination} onSubmit={event => {
        if (pending || refreshing || uncertain) { event.preventDefault(); return; }
        submitted.current = true;
      }}>
        <input type="hidden" name="intent" value={isTopic ? "setTopicMute" : "setUserBlock"} />
        <input type="hidden" name="editorActorId" value={actorId} />
        <input type="hidden" name={isTopic ? "muted" : "blocked"} value="false" />
        <button type="submit" disabled={pending || refreshing || uncertain}>
          {t(pending ? "personalFiltersRemoving" : isTopic ? "personalFiltersRemoveMute" : "personalFiltersRemoveBlock")}
        </button>
      </fetcher.Form>
      {uncertain && <>
        <p role="alert">{t("personalFiltersVerify")}</p>
        <button type="button" disabled={pending || refreshing} onClick={refresh}>
          {t("personalFiltersRefresh")}
        </button>
      </>}
    </div>
  </li>;
}

export function FiltersView({ locale, actorId, tab, items, next }: {
  locale: string; actorId: string; tab: "topics" | "users";
  items: readonly FilterListItem[];
  next: { beforeCreatedAt: string; beforeTargetId: string } | null;
}) {
  const { t } = useTranslation("common");
  const location = useLocation();
  const navigate = useNavigate();
  const headerActor = useHeaderAuthUser()?.id;
  const olderPage = new URLSearchParams(location.search).has("beforeCreatedAt");
  const base = forumFiltersPath(locale);
  const tabQuery = tab === "users" ? "?tab=users" : "";
  useEffect(() => {
    try {
      const previous = window.sessionStorage.getItem(FILTERS_ACTOR_TAB_KEY);
      window.sessionStorage.setItem(FILTERS_ACTOR_TAB_KEY, actorId);
      if (previous !== null && previous !== actorId && olderPage) {
        void navigate(base + tabQuery, { replace: true });
      }
    } catch {
      // Tab storage is never an authority for reading private pairs.
    }
  }, [actorId, olderPage, navigate, base, tabQuery]);
  const formatDate = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
  });
  const nextQuery = next && new URLSearchParams({
    ...(tab === "users" ? { tab: "users" } : {}),
    beforeCreatedAt: next.beforeCreatedAt, beforeTargetId: next.beforeTargetId,
  }).toString();
  return <ForumShell locale={locale} variant="bookmarks">
    <Breadcrumbs locale={locale} items={[{ label: t("personalFiltersNav") }]} />
    <header className="unanswered-heading">
      <h1>{t("personalFiltersHeading")}</h1>
      <p>{t("personalFiltersIntro")}</p>
    </header>
    <nav className="bookmarks-pagination" aria-label={t("personalFiltersHeading")}>
      <Link to={base} aria-current={tab === "topics" ? "page" : undefined}>{t("personalFiltersTopics")}</Link>
      <Link to={base + "?tab=users"} aria-current={tab === "users" ? "page" : undefined}>{t("personalFiltersUsers")}</Link>
    </nav>
    {headerActor !== actorId ? <p role="status">{t("personalFiltersRefreshing")}</p>
      : items.length === 0 ? <div className="unanswered-empty">
        <EmptyState>{t(olderPage ? "personalFiltersEmptyPage" :
          tab === "topics" ? "personalFiltersEmptyTopics" : "personalFiltersEmptyUsers")}</EmptyState>
      </div> : <section className="bookmarks-list-wrap" aria-label={t("personalFiltersList")}>
        <ul className="bookmarks-list">
          {items.map(item => <FilterRow key={JSON.stringify([actorId, item.kind, item.id])}
            item={item} actorId={actorId} locale={locale} formatDate={formatDate} />)}
        </ul>
      </section>}
    {headerActor === actorId && (olderPage || nextQuery) && <nav className="bookmarks-pagination" aria-label={t("personalFiltersList")}>
      {olderPage && <Link to={base + tabQuery}>{t("personalFiltersNewest")}</Link>}
      {nextQuery && <Link to={base + "?" + nextQuery}>{t("personalFiltersOlder")}</Link>}
    </nav>}
  </ForumShell>;
}
