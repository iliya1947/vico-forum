import { useEffect, useRef, useState } from "react";
import { Link, useFetcher, useLocation, useNavigate, useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";
import type { ForumMutationError, TopicBookmarkActionResult } from "./mutations.server";
import { forumBookmarksPath, forumTopicPath } from "./paths";
import { Breadcrumbs, EmptyState, ForumShell } from "./ui";

/** Tab-local presentation history, never a bookmark authorization or cursor authority. */
const BOOKMARKS_ACTOR_TAB_KEY = "vico:bookmarks:actor";

export type BookmarkItemPresentation = { id: string; savedAt: string } & (
  | { unavailable: true }
  | {
    unavailable?: false;
    title: string;
    authorName: string;
    authorIdentityKind?: "deleted";
    category: { name: string };
    section: { name: string } | null;
  }
);
export interface BookmarkListNext {
  beforeSavedAt: string;
  beforeTopicId: string;
}

function BookmarkListRow({ item, actorId, locale, formatDate }: {
  item: BookmarkItemPresentation;
  actorId: string;
  locale: string;
  formatDate: Intl.DateTimeFormat;
}) {
  const { t } = useTranslation("common");
  const fetcher = useFetcher<TopicBookmarkActionResult | ForumMutationError>();
  const revalidator = useRevalidator();
  const [requiresRefresh, setRequiresRefresh] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const submitted = useRef(false);
  const handledResponse = useRef<unknown>(null);
  const pending = fetcher.state !== "idle";

  useEffect(() => {
    if (pending || !submitted.current || !fetcher.data || handledResponse.current === fetcher.data) return;
    submitted.current = false;
    handledResponse.current = fetcher.data;
    const result = fetcher.data;
    if ("operation" in result && result.operation === "topicBookmark" && "ok" in result && result.ok
      && result.topicId === item.id && result.actorId === actorId && result.bookmarked === false) {
      setRequiresRefresh(false);
    } else {
      setRequiresRefresh(true);
    }
  }, [pending, fetcher.data, item.id, actorId]);

  const refresh = () => {
    if (pending || refreshing) return;
    setRefreshing(true);
    void revalidator.revalidate()
      .then(() => setRequiresRefresh(false))
      .catch(() => setRequiresRefresh(true))
      .finally(() => setRefreshing(false));
  };

  return <li className="bookmarks-list-row" aria-busy={pending || refreshing}>
    {item.unavailable ? (
      <div className="bookmarks-topic-unavailable">
        <strong>{t("bookmarksUnavailableTopic")}</strong>
        <time dateTime={item.savedAt}>{t("bookmarksSavedAt", { date: formatDate.format(new Date(item.savedAt)) })}</time>
      </div>
    ) : (
      <Link className="bookmarks-topic-link" to={forumTopicPath(locale, item.id)}>
        <strong dir="auto">{item.title}</strong>
        <span className="bookmarks-topic-metadata">
          <span>{t("startedBy", { author: item.authorIdentityKind === "deleted" ? t("deletedUser") : item.authorName })}</span>
          <span><bdi dir="auto">{item.category.name}</bdi>{item.section && <> · <bdi dir="auto">{item.section.name}</bdi></>}</span>
          <time dateTime={item.savedAt}>{t("bookmarksSavedAt", { date: formatDate.format(new Date(item.savedAt)) })}</time>
        </span>
      </Link>
    )}
    <div className="bookmarks-row-actions">
      <fetcher.Form method="post" action={forumTopicPath(locale, item.id)}
        onSubmit={event => {
          if (pending || refreshing || requiresRefresh) { event.preventDefault(); return; }
          submitted.current = true;
        }}>
        <input type="hidden" name="intent" value="setTopicBookmark" />
        <input type="hidden" name="editorActorId" value={actorId} />
        <input type="hidden" name="bookmarked" value="false" />
        <button type="submit" disabled={pending || refreshing || requiresRefresh}>
          {t(pending ? "bookmarksRemoving" : "bookmarksRemove")}
        </button>
      </fetcher.Form>
      {requiresRefresh && <>
        <p role="alert">{t("bookmarksVerify")}</p>
        <button type="button" disabled={pending || refreshing} onClick={refresh}>
          {t("bookmarksRefresh")}
        </button>
      </>}
    </div>
  </li>;
}

export function BookmarksView({ locale, actorId, items, next }: {
  locale: string;
  actorId: string;
  items: readonly BookmarkItemPresentation[];
  next: BookmarkListNext | null;
}) {
  const { t } = useTranslation("common");
  const location = useLocation();
  const navigate = useNavigate();
  const olderPage = new URLSearchParams(location.search).has("beforeSavedAt");

  useEffect(() => {
    // The URL can survive sign-out/sign-in through credential returnTo. Reset only
    // on a real actor transition; an initial foreign/deleted cursor remains valid
    // and is always filtered by the server for the authenticated actor.
    try {
      const previousActor = window.sessionStorage.getItem(BOOKMARKS_ACTOR_TAB_KEY);
      window.sessionStorage.setItem(BOOKMARKS_ACTOR_TAB_KEY, actorId);
      if (previousActor !== null && previousActor !== actorId && olderPage) {
        void navigate(forumBookmarksPath(locale), { replace: true });
      }
    } catch {
      // Blocked tab storage cannot grant access or alter server-side own filtering.
    }
  }, [actorId, locale, olderPage, navigate]);
  const formatDate = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
  });
  const nextQuery = next && new URLSearchParams({
    beforeSavedAt: next.beforeSavedAt, beforeTopicId: next.beforeTopicId,
  }).toString();

  return <ForumShell locale={locale} variant="bookmarks">
    <Breadcrumbs locale={locale} items={[{ label: t("bookmarksNav") }]} />
    <header className="unanswered-heading">
      <h1>{t("bookmarksHeading")}</h1>
      <p>{t("bookmarksIntro")}</p>
    </header>
    {items.length === 0 ? (
      <div className="unanswered-empty">
        <EmptyState>{t(olderPage ? "bookmarksEmptyPage" : "bookmarksEmpty")}</EmptyState>
      </div>
    ) : (
      <section className="bookmarks-list-wrap" aria-label={t("bookmarksList")}>
        <ul className="bookmarks-list">
          {items.map(item => <BookmarkListRow key={JSON.stringify([actorId, item.id])}
            actorId={actorId} item={item} locale={locale} formatDate={formatDate} />)}
        </ul>
      </section>
    )}
    {(olderPage || nextQuery) && <nav className="bookmarks-pagination" aria-label={t("bookmarksList")}>
      {olderPage && <Link to={forumBookmarksPath(locale)}>{t("bookmarksNewest")}</Link>}
      {nextQuery && <Link to={`${forumBookmarksPath(locale)}?${nextQuery}`}>{t("bookmarksOlder")}</Link>}
    </nav>}
  </ForumShell>;
}
