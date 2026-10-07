import { useEffect, useRef, useState } from "react";
import { Form, Link, useFetcher, useLocation, useNavigation } from "react-router";
import { useTranslation } from "react-i18next";

import type {
  ForumHelpSolutionsPage,
  ForumPopularPeriod,
  ForumPopularTopicSummary,
  ForumReplyNotificationSummary,
  ForumSearchResult,
  ForumSectionPage,
  ForumTagPage,
  ForumTagSummary,
  ForumTopicPage,
  ForumTopicReadKind,
  ForumTopicReadState,
  ForumUnansweredTopicSummary,
  ForumUnreadTopicSummary,
} from "../../db/forum-repository";
import {
  HELP_SOLUTIONS_CATEGORY_ID,
  HELP_SOLUTIONS_SERVICE_SECTION_ID,
} from "../../db/forum-identifiers";
import type { ContentTranslationPresentation } from "../localization/content-translation-presentation";
import type { ContentGenerationUnitView } from "../localization/content-generation-view";
import type { ContentGenerationActionResponse } from "../localization/content-generation-response";
import type { SourceLocaleCorrectionMutationError } from "./mutations.server";
import type { HelpQuestionActionData } from "./help-question-action";
import { isHelpSimilarQuestionsActionData } from "./help-question-action";
import { forumCategoryPath, forumSearchPath, forumSectionPath, forumTagPath, forumTagsPath, forumTopicPath, underDevelopmentPath } from "./paths";
import type { HomepageCategoryOverview } from "./homepage";
import {
  PostBodyContent,
  PostBodyTranslationControls,
  TopicTitlePresentation,
} from "./content-translation-view";
import {
  ContentGenerationNavigationBoundary,
  ContentGenerationUnitStatus,
} from "./content-generation-controls";
import { Breadcrumbs, EmptyState, ForumShell } from "./ui";

export function HomeView({
  locale,
  categories,
}: {
  locale: string;
  categories: readonly HomepageCategoryOverview[];
}) {
  const { t } = useTranslation("common");
  const totals = categories.reduce(
    (sum, category) => ({
      sections: sum.sections + category.sectionCount,
      topics: sum.topics + category.topicCount,
      messages: sum.messages + category.messageCount,
    }),
    { sections: 0, topics: 0, messages: 0 },
  );

  return (
    <ForumShell locale={locale} variant="home">
      {categories.length === 0 ? <EmptyState>{t("categoriesEmpty")}</EmptyState> : (
        <>
          <section className="home-forum-categories" aria-label={t("categoriesHeading")}>
            {categories.map((category) => (
              <HomepageCategoryCard
                key={category.id}
                locale={locale}
                category={category}
              />
            ))}
          </section>
        </>
      )}

      <section className="home-information" aria-label={t("forumStatisticsHeading")}>
        <article className="home-information-card home-online-card">
          <h2>{t("whosOnlineHeading")}</h2>
          <p>{t("onlinePresencePending")}</p>
          <Link to={underDevelopmentPath(locale, "online-presence")}>{t("viewDevelopmentStatus")}</Link>
        </article>
        <article className="home-information-card home-statistics-card">
          <h2>{t("forumStatisticsHeading")}</h2>
          <dl className="forum-statistics">
            <div>
              <dt>{t("sectionLabel")}</dt>
              <dd>{totals.sections}</dd>
            </div>
            <div>
              <dt>{t("topicsHeading")}</dt>
              <dd>{totals.topics}</dd>
            </div>
            <div>
              <dt>{t("postsColumn")}</dt>
              <dd>{totals.messages}</dd>
            </div>
          </dl>
        </article>
      </section>
    </ForumShell>
  );
}

type PopularPeriodPresentation = Record<
  ForumPopularPeriod,
  readonly Pick<ForumPopularTopicSummary, "id" | "title" | "authorName" | "activityCount">[]
>;

export function PopularView({
  locale,
  periods,
}: {
  locale: string;
  periods: PopularPeriodPresentation;
}) {
  const { t } = useTranslation("common");
  const columns = [
    { key: "24h" as const, label: t("popularPeriod24h") },
    { key: "7d" as const, label: t("popularPeriod7d") },
    { key: "30d" as const, label: t("popularPeriod30d") },
  ];

  return (
    <ForumShell locale={locale} variant="popular">
      <Breadcrumbs locale={locale} items={[{ label: t("popularNav") }]} />
      <header className="popular-heading">
        <p className="eyebrow">{t("popularEyebrow")}</p>
        <h1>{t("popularHeading")}</h1>
        <p>{t("popularIntro")}</p>
      </header>

      <section className="popular-columns" aria-label={t("popularHeading")}>
        {columns.map(({ key, label }) => (
          <article className="popular-period" key={key}>
            <header className="popular-period-heading">
              <h2>{label}</h2>
            </header>
            {periods[key].length === 0 ? (
              <EmptyState>{t("popularEmpty")}</EmptyState>
            ) : (
              <ol className="popular-topic-list">
                {periods[key].map((topic, index) => (
                  <li key={topic.id}>
                    <Link className="popular-topic-card" to={forumTopicPath(locale, topic.id)}>
                      <span className="popular-topic-rank" aria-hidden="true">{index + 1}</span>
                      <span className="popular-topic-copy">
                        <strong>{topic.title}</strong>
                        <small>{t("startedBy", { author: topic.authorName })}</small>
                      </span>
                      <span className="popular-topic-activity">
                        {t("messageCount", { count: topic.activityCount })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </article>
        ))}
      </section>
    </ForumShell>
  );
}

type UnansweredTopicPresentation = Pick<
  ForumUnansweredTopicSummary,
  "id" | "title" | "authorName" | "section" | "category"
>;

export function UnansweredView({
  locale,
  topics,
}: {
  locale: string;
  topics: readonly UnansweredTopicPresentation[];
}) {
  const { t } = useTranslation("common");

  return (
    <ForumShell locale={locale} variant="unanswered">
      <Breadcrumbs locale={locale} items={[{ label: t("unansweredNav") }]} />

      <header className="unanswered-heading">
        <p className="eyebrow">{t("unansweredEyebrow")}</p>
        <h1>{t("unansweredHeading")}</h1>
        <p>{t("unansweredIntro")}</p>
      </header>

      {topics.length === 0 ? (
        <div className="unanswered-empty">
          <EmptyState>{t("unansweredEmpty")}</EmptyState>
        </div>
      ) : (
        <section className="unanswered-topics" aria-label={t("unansweredHeading")}>
          <ul className="unanswered-topic-list">
            {topics.map((topic) => (
              <li key={topic.id}>
                <Link className="unanswered-topic-card" to={forumTopicPath(locale, topic.id)}>
                  <span className="unanswered-topic-main">
                    <span className="unanswered-topic-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path d="M4 5.5h16v11H9l-5 3z" />
                        <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.9.4-1 1-1 1.7" />
                        <path d="M12 15.6h.01" />
                      </svg>
                    </span>
                    <span className="unanswered-topic-copy">
                      <strong dir="auto">{topic.title}</strong>
                      <small>{t("startedBy", { author: topic.authorName })}</small>
                    </span>
                  </span>

                  <span className="unanswered-topic-location">
                    <span>{topic.category.name}</span>
                    <span aria-hidden="true"> / </span>
                    <span>{topic.section.name}</span>
                  </span>

                  <span className="unanswered-topic-status">{t("unansweredNoReplies")}</span>

                  <span className="unanswered-topic-enter" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="m9 5 7 7-7 7" />
                    </svg>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </ForumShell>
  );
}


type UnreadTopicPresentation = Pick<
  ForumUnreadTopicSummary,
  "id" | "title" | "authorName" | "state" | "firstUnreadPostId" | "unreadCount" | "section" | "category"
>;

export function UnreadView({
  locale,
  topics,
}: {
  locale: string;
  topics: readonly UnreadTopicPresentation[];
}) {
  const { t } = useTranslation("common");
  const unreadTopics = topics.filter((topic) => topic.state === "unread");
  const newTopics = topics.filter((topic) => topic.state === "new");

  const topicList = (items: readonly UnreadTopicPresentation[]) => (
    <ul className="unanswered-topic-list">
      {items.map((topic) => (
        <li key={topic.id}>
          <Link
            className="unanswered-topic-card unread-topic-card"
            to={`${forumTopicPath(locale, topic.id)}#post-${encodeURIComponent(topic.firstUnreadPostId)}`}
          >
            <span className="unanswered-topic-main">
              <span className="unanswered-topic-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
                  <path d="m4.5 7 7.5 6 7.5-6" />
                </svg>
              </span>
              <span className="unanswered-topic-copy">
                <strong dir="auto">{topic.title}</strong>
                <small>{t("startedBy", { author: topic.authorName })}</small>
              </span>
            </span>

            <span className="unanswered-topic-location">
              <span>{topic.category.name}</span>
              <span>{topic.section.name}</span>
            </span>

            <span className="unanswered-topic-enter unread-topic-enter" aria-hidden="true">
              <strong className="unread-topic-enter-count">{topic.unreadCount}</strong>
              <svg viewBox="0 0 24 24">
                <path d="m9 5 7 7-7 7" />
              </svg>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <ForumShell locale={locale} variant="unread">
      <Breadcrumbs locale={locale} items={[{ label: t("unreadNav") }]} />

      <header className="unanswered-heading">
        <h1>{t("unreadHeading")}</h1>
        <p>{t("unreadIntro")}</p>
      </header>

      {topics.length === 0 ? (
        <div className="unanswered-empty">
          <EmptyState>{t("unreadEmpty")}</EmptyState>
        </div>
      ) : (
        <div className="unread-topic-groups">
          {unreadTopics.length > 0 ? (
            <section className="unanswered-topics unread-topic-group" aria-labelledby="unread-existing-heading">
              <h2 id="unread-existing-heading" className="unread-topic-group-heading">
                {t("unreadExistingHeading")}
              </h2>
              {topicList(unreadTopics)}
            </section>
          ) : null}

          {newTopics.length > 0 ? (
            <section className="unanswered-topics unread-topic-group" aria-labelledby="unread-new-heading">
              <h2 id="unread-new-heading" className="unread-topic-group-heading">
                {t("unreadNewHeading")}
              </h2>
              {topicList(newTopics)}
            </section>
          ) : null}
        </div>
      )}
    </ForumShell>
  );
}

type NotificationPresentation = Omit<ForumReplyNotificationSummary, "createdAt" | "readAt"> & {
  createdAt: string;
  readAt: string | null;
};

export function NotificationsView({
  locale,
  notifications,
}: {
  locale: string;
  notifications: readonly NotificationPresentation[];
}) {
  const { t } = useTranslation("common");
  const formatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <ForumShell locale={locale} variant="notifications">
      <Breadcrumbs locale={locale} items={[{ label: t("notifications") }]} />

      <header className="notifications-heading">
        <h1>{t("notifications")}</h1>
        <p>{t("notificationIntro")}</p>
      </header>

      {notifications.length === 0 ? (
        <div className="notifications-empty">
          <EmptyState>{t("notificationEmpty")}</EmptyState>
        </div>
      ) : (
        <section className="notifications-list-wrap" aria-label={t("notifications")}>
          <ul className="notifications-list">
            {notifications.map((notification) => {
              const unread = notification.readAt === null;
              return (
                <li key={notification.id}>
                  <Form method="post" className="notification-form">
                    <input type="hidden" name="intent" value="open" />
                    <input type="hidden" name="notificationId" value={notification.id} />
                    <button
                      className={unread ? "notification-card is-unread" : "notification-card"}
                      type="submit"
                      aria-label={`${t("notificationOpen")}: ${notification.topicTitle}`}
                    >
                      <span className="notification-avatar" aria-hidden="true">
                        {notification.actorName.trim().slice(0, 1).toUpperCase()}
                      </span>
                      <span className="notification-copy">
                        <span className="notification-summary">
                          <span>{t("notificationReplyBy", { actor: notification.actorName })}</span>
                          <strong dir="auto">{notification.topicTitle}</strong>
                        </span>
                        <time dateTime={notification.createdAt}>
                          {formatter.format(new Date(notification.createdAt))}
                        </time>
                      </span>
                      <span className={unread ? "notification-state is-unread" : "notification-state"}>
                        {t(unread ? "notificationUnread" : "notificationRead")}
                      </span>
                      <span className="notification-enter" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" /></svg>
                      </span>
                    </button>
                  </Form>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </ForumShell>
  );
}

export function SearchView({
  locale,
  query,
  results,
  queryTooLong = false,
}: {
  locale: string;
  query: string;
  results: readonly ForumSearchResult[];
  queryTooLong?: boolean;
}) {
  const { t } = useTranslation("common");

  return (
    <ForumShell locale={locale} variant="search">
      <Breadcrumbs locale={locale} items={[{ label: t("searchHeading") }]} />
      <header className="search-heading">
        <p className="eyebrow">{t("searchEyebrow")}</p>
        <h1>{t("searchHeading")}</h1>
        <p>{t("searchIntro")}</p>
      </header>

      <Form className="forum-search-form" method="get" action={forumSearchPath(locale)} role="search">
        <label htmlFor="forum-search-query">{t("searchInputLabel")}</label>
        <div className="forum-search-row">
          <input
            id="forum-search-query"
            name="q"
            type="search"
            defaultValue={query}
            maxLength={200}
            autoComplete="off"
            dir="auto"
            placeholder={t("searchInputPlaceholder")}
          />
          <button type="submit">{t("searchSubmit")}</button>
        </div>
      </Form>

      {queryTooLong ? (
        <div className="search-empty"><EmptyState>{t("searchTooLong")}</EmptyState></div>
      ) : !query ? (
        <div className="search-empty"><EmptyState>{t("searchPrompt")}</EmptyState></div>
      ) : results.length === 0 ? (
        <div className="search-empty"><EmptyState>{t("searchNoResults", { query })}</EmptyState></div>
      ) : (
        <section className="search-results" aria-label={t("searchResultsHeading", { query })}>
          <header className="search-results-heading">
            <h2>{t("searchResultsHeading", { query })}</h2>
            <span>{t("searchResultCount", { count: results.length })}</span>
          </header>
          <ul className="section-topic-list">
            {results.map((topic) => (
              <li key={topic.id}>
                <Link className="section-topic-card search-result-card" to={forumTopicPath(locale, topic.id)}>
                  <span className="section-topic-main">
                    <span className="section-topic-icon search-result-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <circle cx="10.5" cy="10.5" r="5.5" />
                        <path d="m15 15 4.5 4.5" />
                      </svg>
                    </span>
                    <span className="section-topic-copy">
                      <strong>{topic.title}</strong>
                      <small>{t("startedBy", { author: topic.authorName })}</small>
                      {topic.tags.length > 0 ? (
                        <span className="topic-tag-list" aria-label={t("topicTagsLabel")}>
                          {topic.tags.map((tag) => <span className="topic-tag" key={tag.key}>#{tag.name}</span>)}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <span className="tag-topic-location">
                    <span>{topic.category.name}</span>
                    <span aria-hidden="true"> / </span>
                    <span>{topic.section.name}</span>
                  </span>
                  <span className="section-topic-count" aria-label={t("messageCount", { count: topic.postCount })}>
                    <strong aria-hidden="true">{topic.postCount}</strong>
                    <small aria-hidden="true">{t("postsColumn")}</small>
                  </span>
                  <span className="section-topic-enter" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" /></svg>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </ForumShell>
  );
}

export function TagsView({
  locale,
  tags,
}: {
  locale: string;
  tags: readonly ForumTagSummary[];
}) {
  const { t } = useTranslation("common");
  return (
    <ForumShell locale={locale} variant="tags">
      <Breadcrumbs locale={locale} items={[{ label: t("tagsNav") }]} />
      <header className="tags-heading">
        <p className="eyebrow">{t("tagsEyebrow")}</p>
        <h1>{t("tagsHeading")}</h1>
        <p>{t("tagsIntro")}</p>
      </header>
      {tags.length === 0 ? (
        <div className="tags-empty"><EmptyState>{t("tagsEmpty")}</EmptyState></div>
      ) : (
        <section className="tags-grid" aria-label={t("tagsHeading")}>
          {tags.map((tag) => (
            <Link className="tag-card" key={tag.key} to={forumTagPath(locale, tag.key)}>
              <strong>#{tag.name}</strong>
              <span>{t("tagTopicCount", { count: tag.topicCount })}</span>
            </Link>
          ))}
        </section>
      )}
    </ForumShell>
  );
}

export function TagView({
  locale,
  page,
}: {
  locale: string;
  page: ForumTagPage;
}) {
  const { t } = useTranslation("common");
  return (
    <ForumShell locale={locale} variant="tags">
      <Breadcrumbs locale={locale} items={[
        { label: t("tagsNav"), to: forumTagsPath(locale) },
        { label: page.tag.name },
      ]} />
      <header className="tags-heading">
        <p className="eyebrow">{t("tagsEyebrow")}</p>
        <h1>#{page.tag.name}</h1>
        <p>{t("tagTopicsIntro")}</p>
      </header>
      {page.topics.length === 0 ? (
        <div className="tags-empty"><EmptyState>{t("tagTopicsEmpty")}</EmptyState></div>
      ) : (
        <section className="section-topics tag-topics" aria-label={t("tagTopicsHeading", { tag: page.tag.name })}>
          <ul className="section-topic-list">
            {page.topics.map((topic) => (
              <li key={topic.id}>
                <Link className="section-topic-card" to={forumTopicPath(locale, topic.id)}>
                  <span className="section-topic-main">
                    <span className="section-topic-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path d="M4.5 5.5h8.2l6.8 6.8-7.2 7.2-6.8-6.8z" />
                        <circle cx="9" cy="9" r="1.2" />
                      </svg>
                    </span>
                    <span className="section-topic-copy">
                      <strong>{topic.title}</strong>
                      <small>{t("startedBy", { author: topic.authorName })}</small>
                      <span className="topic-tag-list" aria-label={t("topicTagsLabel")}>
                        {topic.tags.map((tag) => <span className="topic-tag" key={tag.key}>#{tag.name}</span>)}
                      </span>
                    </span>
                  </span>
                  <span className="tag-topic-location">
                    <span>{topic.category.name}</span>
                    <span aria-hidden="true"> / </span>
                    <span>{topic.section.name}</span>
                  </span>
                  <span className="section-topic-count" aria-label={t("messageCount", { count: topic.postCount })}>
                    <strong aria-hidden="true">{topic.postCount}</strong>
                    <small aria-hidden="true">{t("postsColumn")}</small>
                  </span>
                  <span className="section-topic-enter" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" /></svg>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </ForumShell>
  );
}

function HomepageCategoryCard({
  locale,
  category,
}: {
  locale: string;
  category: HomepageCategoryOverview;
}) {
  const { t } = useTranslation("common");
  const [expanded, setExpanded] = useState(false);
  const detailsId = `home-category-${category.id.replace(/[^a-zA-Z0-9_-]/g, "-")}-sections`;
  const hasMoreSections = category.sections.length > 3;
  const remainingSectionCount = Math.max(0, category.sections.length - 3);
  const visibleSections = expanded ? category.sections : category.sections.slice(0, 3);

  return (
    <article className="home-category-card">
      <header className="home-category-header">
        <div className="home-category-identity">
          <HomepageCategoryIcon icon={category.icon} name={category.name} />
          <div className="home-category-copy">
            <h2>
              <Link to={forumCategoryPath(locale, category.id)}>{category.name}</Link>
            </h2>
            <p>{category.description ?? t("homepageSectionFallbackDescription")}</p>
          </div>
        </div>

        <div className="home-category-summary" role="group" aria-label={category.name}>
          <span>{t("sectionCount", { count: category.sectionCount })}</span>
          <span aria-hidden="true">·</span>
          <span>{t("topicCount", { count: category.topicCount })}</span>
          <span aria-hidden="true">·</span>
          <span>{t("messageCount", { count: category.messageCount })}</span>
        </div>
      </header>

      {category.sections.length > 0 ? (
        <div id={detailsId} className="home-category-details">
          <div className="home-category-sections">
            <ul className="home-category-section-list">
              {visibleSections.map((section) => (
                <li key={section.id}>
                  <Link className="home-category-section-row" to={forumSectionPath(locale, section.id)}>
                    <span className="home-category-section-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path d="M4 6.5h6l2 2h8v9H4z" />
                        <path d="M7 12h10M7 15h7" />
                      </svg>
                    </span>

                    <span className="home-category-section-copy">
                      <strong>{section.name}</strong>
                      <span className="home-category-section-description">
                        {t("homepageSectionFallbackDescription")}
                      </span>
                    </span>

                    <span
                      className="home-category-section-stats"
                      role="group"
                      aria-label={`${t("topicCount", { count: section.topicCount })} · ${t("messageCount", { count: section.messageCount })}`}
                    >
                      <span aria-hidden="true">
                        <strong>{section.topicCount}</strong>
                        <small>{t("topicsHeading")}</small>
                      </span>
                      <span aria-hidden="true">
                        <strong>{section.messageCount}</strong>
                        <small>{t("postsColumn")}</small>
                      </span>
                    </span>

                    <span className="home-category-section-enter" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path d="m9 5 7 7-7 7" />
                      </svg>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {hasMoreSections ? (
        <button
          className="home-category-toggle"
          type="button"
          aria-expanded={expanded}
          aria-controls={detailsId}
          aria-label={
            expanded
              ? t("homepageFewerSections")
              : t("homepageMoreSections", { count: remainingSectionCount })
          }
          onClick={() => setExpanded((value) => !value)}
        >
          <span className="home-category-toggle-core" aria-hidden="true">
            <svg viewBox="0 0 20 20">
              <path d={expanded ? "m5 12 5-5 5 5" : "m5 8 5 5 5-5"} />
            </svg>
          </span>
        </button>
      ) : null}
    </article>
  );
}

function HomepageCategoryIcon({ icon, name }: { icon?: string; name: string }) {
  const path = (() => {
    switch (icon) {
      case "help":
        return <><path d="M4 5.5h16v10H9l-5 4z" /><path d="M8 9.5h8M8 12.5h5" /></>;
      case "ai":
        return <><path d="M7 5.5h10l2 4v7H5v-7z" /><path d="M8.5 10.5h.01M15.5 10.5h.01M9 14h6" /><path d="M12 3v2.5" /></>;
      case "code":
        return <><path d="m8 7-4 5 4 5M16 7l4 5-4 5M14 4l-4 16" /></>;
      case "deploy":
        return <><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" /><path d="M5 14v5h14v-5" /></>;
      case "projects":
        return <><path d="M4 7h7l2 2h7v10H4z" /><path d="M7 4h6l2 3" /></>;
      case "community":
        return <><circle cx="9" cy="9" r="3" /><circle cx="17" cy="10" r="2.5" /><path d="M3.5 19c.6-3.2 2.5-5 5.5-5s5 1.8 5.5 5M14 15c2.9-.3 4.8 1 5.5 4" /></>;
      default:
        return null;
    }
  })();

  return (
    <div className="home-category-icon" aria-hidden="true">
      {path ? <svg viewBox="0 0 24 24">{path}</svg> : name.trim().slice(0, 1).toUpperCase()}
    </div>
  );
}

type CategoryTopicPresentation = {
  id: string;
  title: string;
  authorName: string;
  activityAt: string;
};

type CategorySectionPresentation = {
  id: string;
  name: string;
  topicCount: number;
  postCount: number;
  pinnedTopics: readonly CategoryTopicPresentation[];
  latestTopics: readonly CategoryTopicPresentation[];
};

type CategoryPagePresentation = {
  id: string;
  name: string;
  sections: readonly CategorySectionPresentation[];
};

const CATEGORY_SECTION_COMPACT_PINNED_LIMIT = 3;
const CATEGORY_SECTION_COMPACT_LATEST_LIMIT = 2;
const CATEGORY_SECTION_MOBILE_QUERY = "(max-width: 29.99rem)";

function useCategorySectionMobileLayout(): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia?.(CATEGORY_SECTION_MOBILE_QUERY);
    if (!media) return undefined;

    const sync = () => setMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return mobile;
}

function CategorySectionCard({
  locale,
  section,
  referenceTime,
}: {
  locale: string;
  section: CategorySectionPresentation;
  referenceTime: string;
}) {
  const { t } = useTranslation("common");
  const mobileLayout = useCategorySectionMobileLayout();
  const [expanded, setExpanded] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const pinned = expanded && !mobileLayout
    ? section.pinnedTopics
    : section.pinnedTopics.slice(0, CATEGORY_SECTION_COMPACT_PINNED_LIMIT);
  const latest = expanded && !mobileLayout
    ? section.latestTopics
    : section.latestTopics.slice(0, CATEGORY_SECTION_COMPACT_LATEST_LIMIT);
  const hasMore = section.pinnedTopics.length > CATEGORY_SECTION_COMPACT_PINNED_LIMIT
    || section.latestTopics.length > CATEGORY_SECTION_COMPACT_LATEST_LIMIT;
  const controlExpanded = mobileLayout ? mobileDetailsOpen : expanded;
  const detailsId = `category-section-${section.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  const toggleDetails = () => {
    if (mobileLayout) {
      setMobileDetailsOpen((value) => !value);
      return;
    }
    setExpanded((value) => !value);
  };

  return (
    <article
      className="home-section-card"
      data-mobile-details={mobileDetailsOpen ? "open" : "closed"}
    >
      <div className="home-section-identity">
        <div className="home-section-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M4 6.5h6l2 2h8v9H4z" />
            <path d="M7 12h10M7 15h7" />
          </svg>
        </div>
        <div>
          <h2>
            <Link to={forumSectionPath(locale, section.id)}>{section.name}</Link>
          </h2>
          <p>{t("homepageSectionFallbackDescription")}</p>
        </div>
      </div>

      <div className="home-section-column home-section-pinned" id={`${detailsId}-pinned`}>
        <h3>{t("pinnedHeading")}</h3>
        <CategorySectionTopicList
          locale={locale}
          topics={pinned}
          emptyLabel={t("homepagePinnedEmpty")}
          referenceTime={referenceTime}
          showActivity={false}
          pinned
        />
      </div>

      <div className="home-section-column home-section-latest" id={`${detailsId}-latest`}>
        <h3>{t("latestTopicsHeading")}</h3>
        <CategorySectionTopicList
          locale={locale}
          topics={latest}
          emptyLabel={t("homepageLatestEmpty")}
          referenceTime={referenceTime}
          showActivity
        />
      </div>

      <div
        className="home-section-stats"
        id={`${detailsId}-stats`}
        role="group"
        aria-label={`${t("topicCount", { count: section.topicCount })} · ${t("messageCount", { count: section.postCount })}`}
      >
        <span>
          <strong>{section.topicCount}</strong>
          {t("topicsHeading")}
        </span>
        <span>
          <strong>{section.postCount}</strong>
          {t("postsColumn")}
        </span>
      </div>

      <Link
        className="home-section-enter"
        to={forumSectionPath(locale, section.id)}
        aria-label={t("enterForumSection", { section: section.name })}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="m9 5 7 7-7 7" />
        </svg>
      </Link>

      <button
        className="home-section-expand"
        type="button"
        disabled={!mobileLayout && !hasMore}
        aria-expanded={controlExpanded}
        aria-controls={`${detailsId}-pinned ${detailsId}-latest ${detailsId}-stats`}
        aria-label={t(controlExpanded ? "homepageCollapse" : "homepageExpand")}
        onClick={toggleDetails}
      >
        <svg aria-hidden="true" viewBox="0 0 20 20">
          <path d={controlExpanded ? "m5 12 5-5 5 5" : "m5 8 5 5 5-5"} />
        </svg>
      </button>
    </article>
  );
}

function CategorySectionTopicList({
  locale,
  topics,
  emptyLabel,
  emptyHref,
  referenceTime,
  showActivity,
  pinned = false,
}: {
  locale: string;
  topics: readonly CategoryTopicPresentation[];
  emptyLabel: string;
  emptyHref?: string;
  referenceTime: string;
  showActivity: boolean;
  pinned?: boolean;
}) {
  if (topics.length === 0) {
    return (
      <p className="home-topic-empty">
        {emptyHref ? <Link to={emptyHref}>{emptyLabel}</Link> : emptyLabel}
      </p>
    );
  }

  return (
    <ul className="home-topic-list">
      {topics.map((topic) => (
        <li key={topic.id} className={showActivity ? "home-latest-topic" : undefined}>
          {showActivity ? (
            <span className="home-topic-avatar" aria-hidden="true">
              {topic.authorName.trim().slice(0, 1).toUpperCase()}
            </span>
          ) : null}
          <span className="home-topic-copy">
            <span className="home-topic-title">
              {pinned ? <span className="home-pinned-marker" aria-hidden="true" /> : null}
              <Link to={forumTopicPath(locale, topic.id)}>{topic.title}</Link>
            </span>
            {showActivity ? (
              <span className="home-topic-meta">
                <span>{topic.authorName}</span>
                <span aria-hidden="true">·</span>
                <time dateTime={topic.activityAt}>
                  {formatCategorySectionActivity(topic.activityAt, referenceTime, locale)}
                </time>
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function formatCategorySectionActivity(activityAt: string, referenceTime: string, locale: string): string {
  const activity = Date.parse(activityAt);
  const reference = Date.parse(referenceTime);
  if (!Number.isFinite(activity) || !Number.isFinite(reference)) return "";

  const difference = activity - reference;
  const absolute = Math.abs(difference);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  let unit: Intl.RelativeTimeFormatUnit;
  let divisor: number;
  if (absolute < hour) {
    unit = "minute";
    divisor = minute;
  } else if (absolute < day) {
    unit = "hour";
    divisor = hour;
  } else if (absolute < week) {
    unit = "day";
    divisor = day;
  } else {
    unit = "week";
    divisor = week;
  }

  try {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
      Math.round(difference / divisor),
      unit,
    );
  } catch {
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
      Math.round(difference / divisor),
      unit,
    );
  }
}

type HelpSolutionsQuestionPresentation = Omit<
  ForumHelpSolutionsPage["questions"][number],
  "createdAt" | "activityAt"
> & {
  createdAt: string;
  activityAt: string;
};

type HelpSolutionsPagePresentation = Omit<ForumHelpSolutionsPage, "questions"> & {
  questions: readonly HelpSolutionsQuestionPresentation[];
};

export function HelpSolutionsView({
  locale,
  mode,
  page,
  referenceTime,
  canAskQuestion = false,
  actionData,
}: {
  locale: string;
  mode: "all" | "open" | "solutions";
  page: HelpSolutionsPagePresentation;
  referenceTime: string;
  canAskQuestion?: boolean;
  actionData?: HelpQuestionActionData;
}) {
  const { t } = useTranslation("common");
  const navigation = useNavigation();
  const similarAction = isHelpSimilarQuestionsActionData(actionData) ? actionData : undefined;
  const mutationError = actionData && "error" in actionData ? actionData.error : undefined;
  const [questionComposerOpen, setQuestionComposerOpen] = useState(Boolean(similarAction));
  const submittingHelpQuestion = navigation.state === "submitting";
  const submittingIntent = navigation.formData?.get("intent");
  const isSimilarChecking =
    submittingHelpQuestion
    && submittingIntent === "checkSimilarHelpQuestions";
  const isQuestionSubmitting =
    submittingHelpQuestion
    && submittingIntent !== "checkSimilarHelpQuestions";
  const isQuestionFormBusy = isQuestionSubmitting || isSimilarChecking;
  const categoryPath = forumCategoryPath(locale, HELP_SOLUTIONS_CATEGORY_ID);
  const openPath = `${categoryPath}?mode=open`;
  const solutionsPath = `${categoryPath}?mode=solutions`;
  const allMode = mode === "all";
  const openMode = mode === "open";
  const solutionsMode = mode === "solutions";
  const listHeading = t(
    openMode
      ? "helpSolutionsNeedsHelpHeading"
      : solutionsMode
        ? "helpSolutionsSolutionsHeading"
        : "helpSolutionsAllHeading",
  );
  const emptyCopy = t(
    openMode
      ? "helpSolutionsNeedsHelpEmpty"
      : solutionsMode
        ? "helpSolutionsSolutionsEmpty"
        : "helpSolutionsEmpty",
  );

  return (
    <ForumShell locale={locale} variant="category">
      <div className="help-solutions-page">
        <Breadcrumbs locale={locale} items={[{ label: t("helpSolutionsHeading") }]} />

        <header className="help-solutions-heading">
          <div>
            <p className="eyebrow">{t("categoryLabel")}</p>
            <h1>{t("helpSolutionsHeading")}</h1>
            <p>{t("helpSolutionsIntro")}</p>
          </div>
          {canAskQuestion ? (
            <button
              type="button"
              className="help-solutions-ask-toggle"
              aria-expanded={questionComposerOpen}
              aria-controls="help-question-create-form"
              onClick={() => setQuestionComposerOpen((open) => !open)}
            >
              {t("helpSolutionsAskHeading")}
            </button>
          ) : null}
        </header>

        <nav className="help-solutions-modes" aria-label={t("helpSolutionsHeading")}>
          <Link
            className={"help-solutions-mode" + (allMode ? " is-active" : "")}
            to={categoryPath}
            aria-current={allMode ? "page" : undefined}
          >
            {t("helpSolutionsAllMode")}
          </Link>
          <Link
            className={"help-solutions-mode" + (openMode ? " is-active" : "")}
            to={openPath}
            aria-current={openMode ? "page" : undefined}
          >
            {t("helpSolutionsNeedsHelpMode")}
          </Link>
          <Link
            className={"help-solutions-mode" + (solutionsMode ? " is-active" : "")}
            to={solutionsPath}
            aria-current={solutionsMode ? "page" : undefined}
          >
            {t("helpSolutionsSolutionsMode")}
          </Link>
        </nav>

        {canAskQuestion && questionComposerOpen ? (
          <Form
            id="help-question-create-form"
            method="post"
            className="forum-write-form help-question-create-form"
            aria-labelledby="help-question-create-heading"
            aria-busy={isQuestionFormBusy}
          >
            <header className="forum-write-header">
              <div>
                <p className="eyebrow">{t("authoringLabel")}</p>
                <h2 id="help-question-create-heading">{t("helpSolutionsAskHeading")}</h2>
              </div>
              <p>{t("helpSolutionsAskHelp")}</p>
            </header>

            {mutationError ? (
              <p className="forum-write-alert" role="alert">
                {t(`forumWriteError_${mutationError}`)}
              </p>
            ) : null}

            <div className="forum-write-fields">
              <div className="forum-write-field">
                <label htmlFor="help-question-title">{t("helpSolutionsQuestionTitleLabel")}</label>
                <input
                  id="help-question-title"
                  name="title"
                  required
                  defaultValue={similarAction?.draft.title}
                  disabled={isQuestionFormBusy}
                  aria-describedby="help-question-title-help"
                />
                <small id="help-question-title-help">{t("topicTitleHelp")}</small>
              </div>

              <div className="forum-write-field">
                <label htmlFor="help-question-body">{t("helpSolutionsQuestionBodyLabel")}</label>
                <textarea
                  id="help-question-body"
                  name="body"
                  required
                  rows={8}
                  defaultValue={similarAction?.draft.body}
                  disabled={isQuestionFormBusy}
                  aria-describedby="help-question-body-help"
                />
                <small id="help-question-body-help">{t("messageBodyHelp")}</small>
              </div>

              <div className="forum-write-field">
                <label htmlFor="help-question-tags">{t("topicTagsInputLabel")}</label>
                <input
                  id="help-question-tags"
                  name="tags"
                  defaultValue={similarAction?.draft.tags}
                  disabled={isQuestionFormBusy}
                  aria-describedby="help-question-tags-help"
                />
                <small id="help-question-tags-help">{t("topicTagsInputHelp")}</small>
              </div>
            </div>

            {similarAction ? (
              <section className="help-similar-results" aria-live="polite" aria-labelledby="help-similar-heading">
                <h3 id="help-similar-heading">{t("helpSolutionsSimilarHeading")}</h3>
                {similarAction.outcome === "results" ? (
                  <>
                    <p>{t("helpSolutionsSimilarIntro")}</p>
                    <ul>
                      {similarAction.results.map((question) => (
                        <li key={question.id}>
                          <Link to={forumTopicPath(locale, question.id)}>
                            <strong dir="auto">{question.title}</strong>
                            <span>{t(question.isSolved ? "solved" : "helpSolutionsOpen")}</span>
                            <span>{t("helpSolutionsReplyCount", { count: question.replyCount })}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p>
                    {t(
                      similarAction.outcome === "empty"
                        ? "helpSolutionsSimilarEmpty"
                        : similarAction.outcome === "invalid"
                          ? "helpSolutionsSimilarInvalid"
                          : "helpSolutionsSimilarUnavailable",
                    )}
                  </p>
                )}
              </section>
            ) : null}

            <footer className="forum-write-actions help-question-create-actions">
              <button
                type="submit"
                name="intent"
                value="checkSimilarHelpQuestions"
                formNoValidate
                className="help-similar-check"
                disabled={isQuestionFormBusy}
              >
                {t(isSimilarChecking ? "helpSolutionsSimilarChecking" : "helpSolutionsSimilarCheck")}
              </button>
              <button
                type="submit"
                name="intent"
                value="createHelpQuestion"
                disabled={isQuestionFormBusy}
              >
                {t(isQuestionSubmitting ? "helpSolutionsAskSubmitting" : "helpSolutionsAskSubmit")}
              </button>
            </footer>
          </Form>
        ) : null}

        <section className="help-solutions-questions" aria-labelledby="help-solutions-mode-heading">
          <h2 id="help-solutions-mode-heading">{listHeading}</h2>
          {page.questions.length === 0 ? (
            <EmptyState>{emptyCopy}</EmptyState>
          ) : (
            <ul className="help-question-list">
              {page.questions.map((question) => (
                <li key={question.id}>
                  <Link className="help-question-card" to={forumTopicPath(locale, question.id)}>
                    <span className="help-question-main">
                      <span className="help-question-title-row">
                        <strong dir="auto">{question.title}</strong>
                        <span className={"help-question-status " + (question.isSolved ? "is-solved" : "is-open")}>
                          {t(question.isSolved ? "solved" : "helpSolutionsOpen")}
                        </span>
                        {question.hasBestAnswer ? (
                          <span className="help-question-best-answer">{t("bestAnswer")}</span>
                        ) : null}
                      </span>
                      <small>{t("startedBy", { author: question.authorName })}</small>
                      {question.tags.length > 0 ? (
                        <span className="topic-tag-list" aria-label={t("topicTagsLabel")}>
                          {question.tags.map((tag) => (
                            <span className="topic-tag" key={tag.key}>#{tag.name}</span>
                          ))}
                        </span>
                      ) : null}
                    </span>

                    <span className="help-question-activity">
                      {t("helpSolutionsUpdated", {
                        time: formatCategorySectionActivity(question.activityAt, referenceTime, locale),
                      })}
                    </span>

                    <span className="help-question-reply-count">
                      {t("helpSolutionsReplyCount", { count: question.replyCount })}
                    </span>

                    <span className="help-question-enter" aria-hidden="true">
                      <svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" /></svg>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </ForumShell>
  );
}
export function CategoryView({
  locale,
  category,
  referenceTime,
}: {
  locale: string;
  category: CategoryPagePresentation;
  referenceTime: string;
}) {
  const { t } = useTranslation("common");
  const totals = category.sections.reduce(
    (sum, section) => ({
      topics: sum.topics + section.topicCount,
      messages: sum.messages + section.postCount,
    }),
    { topics: 0, messages: 0 },
  );

  return (
    <ForumShell locale={locale} variant="category">
      <Breadcrumbs locale={locale} items={[{ label: category.name }]} />

      <section className="category-heading">
        <div>
          <p className="eyebrow">{t("categoryLabel")}</p>
          <h1>{category.name}</h1>
        </div>
        <div className="category-heading-stats" aria-label={category.name}>
          <span>{t("sectionCount", { count: category.sections.length })}</span>
          <span aria-hidden="true">·</span>
          <span>{t("topicCount", { count: totals.topics })}</span>
          <span aria-hidden="true">·</span>
          <span>{t("messageCount", { count: totals.messages })}</span>
        </div>
      </section>

      {category.sections.length === 0 ? (
        <div className="category-empty">
          <EmptyState>{t("sectionsEmpty")}</EmptyState>
        </div>
      ) : (
        <section className="category-sections" aria-label={t("sectionCount", { count: category.sections.length })}>
          <ul className="category-section-list">
            {category.sections.map((section) => (
              <li key={section.id}>
                <CategorySectionCard
                  locale={locale}
                  section={section}
                  referenceTime={referenceTime}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </ForumShell>
  );
}

export function SectionView({
  locale,
  section,
  canCreateTopic,
  topicReadStates,
  actionData,
}: {
  locale: string;
  section: ForumSectionPage;
  canCreateTopic: boolean;
  topicReadStates: Readonly<Record<string, ForumTopicReadKind>> | null;
  actionData?: ForumMutationError;
}) {
  const { t } = useTranslation("common");
  const navigation = useNavigation();
  const isCreateTopicSubmitting =
    navigation.state === "submitting"
    && navigation.formData?.get("intent") === "createTopic";
  const messageTotal = section.topics.reduce((sum, topic) => sum + topic.postCount, 0);

  return (
    <ForumShell locale={locale} variant="section">
      <Breadcrumbs locale={locale} items={[
        { label: section.category.name, to: forumCategoryPath(locale, section.category.id) },
        { label: section.name },
      ]} />

      <section className="section-heading">
        <div>
          <p className="eyebrow">{t("sectionLabel")}</p>
          <h1>{section.name}</h1>
        </div>

        <div className="section-heading-side">
          <div className="section-heading-stats" aria-label={section.name}>
            <span>{t("topicCount", { count: section.topics.length })}</span>
            <span aria-hidden="true">·</span>
            <span>{t("messageCount", { count: messageTotal })}</span>
          </div>
          {canCreateTopic ? (
            <a className="section-create-topic-link" href="#create-topic">
              {t("createTopicHeading")}
            </a>
          ) : null}
        </div>
      </section>

      {section.topics.length === 0 ? (
        <div className="section-empty">
          <EmptyState>{t("topicsEmpty")}</EmptyState>
        </div>
      ) : (
        <section className="section-topics" aria-label={t("topicsHeading")}>
          <ul className="section-topic-list">
            {section.topics.map((topic) => (
              <li key={topic.id}>
                <Link className="section-topic-card" to={forumTopicPath(locale, topic.id)}>
                  <span className="section-topic-main">
                    <span className="section-topic-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path d="M4 5.5h16v11H9l-5 3z" />
                        <path d="M8 10h8M8 13h5" />
                      </svg>
                    </span>
                    <span className="section-topic-copy">
                      <span className="section-topic-title-line">
                        <strong>{topic.title.originalContent}</strong>
                        {topic.isPinned ? <span className="pinned-topic-badge">{t("pinnedHeading")}</span> : null}
                      </span>
                      <small>{t("startedBy", { author: topic.authorName })}</small>
                      {topicReadStates?.[topic.id] ? (
                        <small className={`section-topic-read-state is-${topicReadStates[topic.id]}`}>
                          {topicReadStates[topic.id] === "new"
                            ? t("unreadNew")
                            : topicReadStates[topic.id] === "unread"
                              ? t("unreadNav")
                              : t("readStateRead")}
                        </small>
                      ) : null}
                      {topic.tags.length > 0 ? (
                        <span className="topic-tag-list" aria-label={t("topicTagsLabel")}>
                          {topic.tags.map((tag) => <span className="topic-tag" key={tag.key}>#{tag.name}</span>)}
                        </span>
                      ) : null}
                    </span>
                  </span>

                  <span
                    className="section-topic-count"
                    role="group"
                    aria-label={t("messageCount", { count: topic.postCount })}
                  >
                    <strong aria-hidden="true">{topic.postCount}</strong>
                    <small aria-hidden="true">{t("postsColumn")}</small>
                  </span>

                  <span className="section-topic-enter" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="m9 5 7 7-7 7" />
                    </svg>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {canCreateTopic && (
        <Form
          id="create-topic"
          method="post"
          className="forum-write-form section-create-form"
          aria-labelledby="create-topic-heading"
          aria-busy={isCreateTopicSubmitting}
        >
          <input type="hidden" name="intent" value="createTopic" />

          <header className="forum-write-header">
            <div>
              <p className="eyebrow">{t("authoringLabel")}</p>
              <h2 id="create-topic-heading">{t("createTopicHeading")}</h2>
            </div>
            <p>{t("createTopicHelp")}</p>
          </header>

          {actionData?.error && (
            <p className="forum-write-alert" role="alert">
              {t(`forumWriteError_${actionData.error}`)}
            </p>
          )}

          <div className="forum-write-fields">
            <div className="forum-write-field">
              <label htmlFor="create-topic-title">{t("topicTitleLabel")}</label>
              <input
                id="create-topic-title"
                name="title"
                required
                disabled={isCreateTopicSubmitting}
                aria-describedby="create-topic-title-help"
              />
              <small id="create-topic-title-help">{t("topicTitleHelp")}</small>
            </div>

            <div className="forum-write-field">
              <label htmlFor="create-topic-tags">{t("topicTagsInputLabel")}</label>
              <input
                id="create-topic-tags"
                name="tags"
                disabled={isCreateTopicSubmitting}
                aria-describedby="create-topic-tags-help"
              />
              <small id="create-topic-tags-help">{t("topicTagsInputHelp")}</small>
            </div>

            <div className="forum-write-field">
              <label htmlFor="create-topic-body">{t("initialPostLabel")}</label>
              <textarea
                id="create-topic-body"
                name="body"
                required
                rows={8}
                disabled={isCreateTopicSubmitting}
                aria-describedby="create-topic-body-help"
              />
              <small id="create-topic-body-help">{t("messageBodyHelp")}</small>
            </div>
          </div>

          <footer className="forum-write-actions">
            <p>{t("authoringRequiredHint")}</p>
            <button type="submit" disabled={isCreateTopicSubmitting}>
              {t(isCreateTopicSubmitting ? "createTopicSubmitting" : "createTopicSubmit")}
            </button>
          </footer>
        </Form>
      )}
    </ForumShell>
  );
}

export type TopicViewActionData =
  | ForumMutationError
  | SourceLocaleCorrectionMutationError
  | ContentGenerationActionResponse;

type MessageLinkState = "copied" | "error";
type MessageLinkFeedback = { postId: string; state: MessageLinkState } | null;

function MessagePermalinkControl({
  postId,
  messageNumber,
  feedback,
  onCopy,
}: {
  postId: string;
  messageNumber: number;
  feedback: MessageLinkFeedback;
  onCopy: (postId: string) => Promise<void>;
}) {
  const { t } = useTranslation("common");
  const messageLabel = t("postNumber", { number: messageNumber });
  const state = feedback?.postId === postId ? feedback.state : null;

  return (
    <span className="topic-message-permalink">
      <button
        type="button"
        className="topic-message-copy-link"
        onClick={() => void onCopy(postId)}
        aria-label={t("copyMessageLinkFor", { message: messageLabel })}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
          <path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" />
        </svg>
        <span>{t("copyMessageLink")}</span>
      </button>
      {state && (
        <span className={state === "error" ? "message-link-status is-error" : "message-link-status"} role="status" aria-live="polite">
          {t(state === "copied" ? "messageLinkCopied" : "messageLinkCopyFailed")}
        </span>
      )}
    </span>
  );
}

export function TopicView({
  locale,
  topic,
  titlePresentation,
  postPresentations,
  generationUnits,
  canReply,
  canManageSolution,
  isTopicAuthor = false,
  canCorrectTitleSourceLocale,
  canManagePin,
  correctablePostIds,
  topicReadState,
  actionData,
}: {
  locale: string;
  topic: ForumTopicPage;
  titlePresentation: ContentTranslationPresentation;
  postPresentations: readonly ContentTranslationPresentation[];
  generationUnits: readonly ContentGenerationUnitView[];
  canReply: boolean;
  canManageSolution: boolean;
  isTopicAuthor?: boolean;
  canCorrectTitleSourceLocale: boolean;
  canManagePin: boolean;
  correctablePostIds: readonly string[];
  topicReadState: ForumTopicReadState | null;
  actionData?: TopicViewActionData;
}) {
  const correctablePosts = new Set(correctablePostIds);
  const generationByContentId = new Map(generationUnits.map((unit) => [unit.contentId, unit]));
  const titleGenerationUnit = generationByContentId.get(topic.id);
  const presentedPosts = new Map(postPresentations.map((presentation) => [presentation.contentId, presentation]));
  const correctionError = actionData
    && "operation" in actionData
    && actionData.operation === "sourceLocaleCorrection"
    ? actionData.error
    : null;
  const forumWriteError = actionData && !("operation" in actionData)
    ? actionData.error
    : null;
  const originalPost = topic.posts[0];
  const bestAnswerPost = topic.bestAnswerPostId
    ? topic.posts.find((post) => post.id === topic.bestAnswerPostId)
    : undefined;
  const orderedPosts = originalPost
    ? [
        originalPost,
        ...(bestAnswerPost && bestAnswerPost.id !== originalPost.id ? [bestAnswerPost] : []),
        ...topic.posts.slice(1).filter((post) => post.id !== bestAnswerPost?.id),
      ]
    : [];
  const messageNumberById = new Map(topic.posts.map((post, index) => [post.id, index + 1]));
  const directRepliesByParent = new Map<string, string[]>();
  for (const post of topic.posts) {
    if (!post.parentPostId) continue;
    const replies = directRepliesByParent.get(post.parentPostId) ?? [];
    replies.push(post.id);
    directRepliesByParent.set(post.parentPostId, replies);
  }
  const { t } = useTranslation("common");
  const location = useLocation();
  const solutionPromptPostId = new URLSearchParams(location.search).get("solutionPrompt");
  const promptedBestAnswerPostId =
    isTopicAuthor
    && canManageSolution
    && !topic.isSolved
    && topic.bestAnswerPostId
    && topic.bestAnswerPostId === solutionPromptPostId
      ? topic.bestAnswerPostId
      : null;
  const [messageLinkFeedback, setMessageLinkFeedback] = useState<MessageLinkFeedback>(null);
  const [replyTargetPostId, setReplyTargetPostId] = useState<string | null>(null);
  const [quoteSelectionErrorPostId, setQuoteSelectionErrorPostId] = useState<string | null>(null);
  const [openMessageActionsPostId, setOpenMessageActionsPostId] = useState<string | null>(null);
  const messageLinkRequestId = useRef(0);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const navigation = useNavigation();
  const readStateFetcher = useFetcher();
  const markedReadSnapshot = useRef<string | null>(null);

  useEffect(() => {
    const latestPostId = topicReadState?.latestPostId;
    if (!latestPostId) return;
    const snapshot = `${topic.id}:${latestPostId}`;
    if (markedReadSnapshot.current === snapshot) return;
    markedReadSnapshot.current = snapshot;
    void readStateFetcher.submit(
      { intent: "markTopicRead", postId: latestPostId },
      { method: "post" },
    );
  }, [readStateFetcher, topic.id, topicReadState?.latestPostId]);

  const isReplySubmitting =
    navigation.state === "submitting"
    && navigation.formData?.get("intent") === "reply";

  async function copyMessageLink(postId: string) {
    const requestId = ++messageLinkRequestId.current;
    setMessageLinkFeedback(null);

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      const topicUrl = new URL(forumTopicPath(locale, topic.id), window.location.origin);
      const permanentUrl = `${topicUrl.origin}${topicUrl.pathname}#post-${encodeURIComponent(postId)}`;
      await navigator.clipboard.writeText(permanentUrl);
      if (requestId === messageLinkRequestId.current) {
        setMessageLinkFeedback({ postId, state: "copied" });
      }
    } catch {
      if (requestId === messageLinkRequestId.current) {
        setMessageLinkFeedback({ postId, state: "error" });
      }
    }
  }


  function focusReplyForm() {
    replyTextareaRef.current?.focus();
    const heading = document.getElementById("reply-heading");
    if (typeof heading?.scrollIntoView === "function") {
      heading.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  function targetReply(postId: string) {
    setReplyTargetPostId(postId);
    setQuoteSelectionErrorPostId(null);
    focusReplyForm();
  }

  function quoteSelectedText(postId: string) {
    const postElement = document.getElementById(`post-${postId}`);
    const bodyElement = postElement?.querySelector<HTMLElement>("[data-message-body]");
    const selection = window.getSelection();
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const selectedText = selection?.toString().trim() ?? "";

    if (
      !bodyElement
      || !range
      || selection?.isCollapsed
      || !selectedText
      || !bodyElement.contains(range.startContainer)
      || !bodyElement.contains(range.endContainer)
    ) {
      setQuoteSelectionErrorPostId(postId);
      return;
    }

    setReplyTargetPostId(postId);
    setQuoteSelectionErrorPostId(null);
    const quote = selectedText
      .split(/\r?\n/u)
      .map((line) => `> ${line}`)
      .join("\n") + "\n\n";

    const textarea = replyTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? start;
    textarea.setRangeText(quote, start, end, "end");
    textarea.focus();
    const heading = document.getElementById("reply-heading");
    if (typeof heading?.scrollIntoView === "function") {
      heading.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }
  return (
    <ContentGenerationNavigationBoundary
      pageIdentity={JSON.stringify([locale, topic.id])}
      units={generationUnits}
    >
      <ForumShell locale={locale} variant="topic">
        <Breadcrumbs
          locale={locale}
          items={topic.section.id === HELP_SOLUTIONS_SERVICE_SECTION_ID
            ? [
                { label: t("helpSolutionsHeading"), to: forumCategoryPath(locale, HELP_SOLUTIONS_CATEGORY_ID) },
                { label: titlePresentation.content },
              ]
            : [
                { label: topic.section.category.name, to: forumCategoryPath(locale, topic.section.category.id) },
                { label: topic.section.name, to: forumSectionPath(locale, topic.section.id) },
                { label: titlePresentation.content },
              ]}
        />

        <section className="topic-heading">
          <div className="topic-heading-side">
            <div className="topic-heading-author">
              <span className="topic-message-avatar" aria-hidden="true">
                {topic.authorName.trim().slice(0, 1).toUpperCase()}
              </span>
              <span className="topic-message-author-copy">
                <strong>{topic.authorName}</strong>
              </span>
            </div>
            <div className="topic-heading-state-badges">
              {topic.isPinned && <strong className="pinned-topic-badge">{t("pinnedHeading")}</strong>}
              {topic.isSolved && <strong className="solved-badge">{t("solved")}</strong>}
            </div>
          </div>

          <div className="topic-heading-content">
            <div className="topic-heading-main">
              <TopicTitlePresentation presentation={titlePresentation} />
              {titleGenerationUnit && (
                <div className="topic-generation-status">
                  <ContentGenerationUnitStatus unit={titleGenerationUnit} />
                </div>
              )}
              {topic.tags.length > 0 ? (
                <nav className="topic-tag-list topic-heading-tags" aria-label={t("topicTagsLabel")}>
                  {topic.tags.map((tag) => (
                    <Link className="topic-tag" key={tag.key} to={forumTagPath(locale, tag.key)}>#{tag.name}</Link>
                  ))}
                </nav>
              ) : null}
            </div>

            <div className="topic-heading-actions">
              {topic.bestAnswerPostId && (
                <a className="topic-solution-link" href={`#post-${encodeURIComponent(topic.bestAnswerPostId)}`}>
                  {t("goToSolution")}
                </a>
              )}
            </div>
          </div>

          {(canCorrectTitleSourceLocale || canManagePin || (canManageSolution && !topic.isSolved)) && (
            <details className="secondary-tools topic-heading-secondary">
              <summary>{t("topicTools")}</summary>
              <div className="secondary-tools-panel">
                {canManagePin && (
                  <Form method="post" className="pin-topic-form secondary-tools-form">
                    <input type="hidden" name="intent" value={topic.isPinned ? "unpinTopic" : "pinTopic"} />
                    <button type="submit">
                      {t(topic.isPinned ? "unpinTopic" : "pinTopic")}
                    </button>
                  </Form>
                )}

                {canManageSolution && !topic.isSolved && (
                  <Form method="post" className="solution-form secondary-tools-form">
                    <input type="hidden" name="intent" value="markSolved" />
                    <button type="submit">{t("markSolved")}</button>
                  </Form>
                )}

                {canCorrectTitleSourceLocale && (
                  <Form method="post" className="source-locale-form secondary-tools-form">
                    <input type="hidden" name="intent" value="correctTitleSourceLocale" />
                    <input type="hidden" name="expectedRevisionId" value={topic.title.id} />
                    <p>{t("sourceLocaleCurrent", { locale: topic.title.sourceLocale })}</p>
                    <label>
                      {t("sourceLocaleCorrectionInput")}
                      <input
                        name="sourceLocale"
                        required
                        defaultValue={topic.title.sourceLocale === "und" ? "" : topic.title.sourceLocale}
                        autoComplete="off"
                      />
                    </label>
                    <button type="submit">{t("sourceLocaleCorrectionSubmit")}</button>
                  </Form>
                )}
              </div>
            </details>
          )}
        </section>

        {correctionError && <p className="topic-page-alert" role="alert">{t(`sourceLocaleCorrectionError_${correctionError}`)}</p>}
        {forumWriteError && <p className="topic-page-alert" role="alert">{t(`forumWriteError_${forumWriteError}`)}</p>}

        {promptedBestAnswerPostId && (
          <section id="solution-confirmation" className="solution-confirmation" aria-label={t("problemSolvedPrompt")}>
            <strong>{t("problemSolvedPrompt")}</strong>
            <div className="solution-confirmation-actions">
              <Form method="post" className="solution-form">
                <input type="hidden" name="intent" value="markSolved" />
                <button type="submit">{t("problemSolvedYes")}</button>
              </Form>
              <Link
                className="solution-confirmation-dismiss"
                to={`${forumTopicPath(locale, topic.id)}#post-${encodeURIComponent(promptedBestAnswerPostId)}`}
              >
                {t("problemSolvedNo")}
              </Link>
            </div>
          </section>
        )}

        {orderedPosts.length === 0 ? (
          <div className="topic-empty">
            <EmptyState>{t("postsEmpty")}</EmptyState>
          </div>
        ) : (
          <ol className="post-list topic-message-list">
            {orderedPosts.map((post) => {
              const messageNumber = messageNumberById.get(post.id)!;
              const isOriginalQuestion = post.id === originalPost?.id;
              const isBestAnswer = topic.bestAnswerPostId === post.id;
              const generationUnit = generationByContentId.get(post.id);
              const canCorrectPostSourceLocale = correctablePosts.has(post.id);
              const canSelectBestAnswer =
                canManageSolution && !isOriginalQuestion && topic.bestAnswerPostId !== post.id;
              const hasMessageTools = canCorrectPostSourceLocale || canSelectBestAnswer;
              const messageLinkState =
                messageLinkFeedback?.postId === post.id ? messageLinkFeedback.state : null;
              const parentMessageNumber =
                post.parentPostId ? messageNumberById.get(post.parentPostId) : undefined;
              const directReplyIds = directRepliesByParent.get(post.id) ?? [];
              const postPresentation = presentedPosts.get(post.id)!;

              return (
                <li
                  id={`post-${post.id}`}
                  className={[
                    "forum-post",
                    "topic-message",
                    isOriginalQuestion ? "original-question" : "",
                    isBestAnswer ? "best-answer" : "",
                  ].filter(Boolean).join(" ")}
                  key={post.id}
                >
                  <header className="topic-message-author">
                    <span className="topic-message-avatar" aria-hidden="true">
                      {post.authorName.trim().slice(0, 1).toUpperCase()}
                    </span>
                    <span className="topic-message-author-copy">
                      <strong>{post.authorName}</strong>
                    </span>
                    <span className="topic-message-author-statuses">
                      {isOriginalQuestion && (
                        <strong className="original-question-label">{t("originalQuestion")}</strong>
                      )}
                      {isBestAnswer && (
                        <strong className="best-answer-label">{t("bestAnswer")}</strong>
                      )}
                    </span>
                    <a
                      className="topic-message-anchor topic-message-author-number"
                      href={`#post-${encodeURIComponent(post.id)}`}
                    >
                      {t("postNumber", { number: messageNumber })}
                    </a>
                  </header>

                  <div className="forum-post-content">
                    <div className="topic-message-mobile-head">
                      {parentMessageNumber !== undefined && (
                        <a
                          className="topic-message-mobile-parent-link"
                          href={`#post-${encodeURIComponent(post.parentPostId!)}`}
                        >
                          {t("replyToMessageNumberCompact", { number: parentMessageNumber })}
                        </a>
                      )}
                      <div className="topic-message-mobile-actions">
                        <button
                          type="button"
                          className="topic-message-mobile-actions-toggle"
                          aria-expanded={openMessageActionsPostId === post.id}
                          aria-controls={`message-actions-${post.id}`}
                          onClick={() => {
                            setOpenMessageActionsPostId((current) => current === post.id ? null : post.id);
                          }}
                        >
                          <span>{t("messageActions")}</span>
                          <span aria-hidden="true">{openMessageActionsPostId === post.id ? "⌃" : "⌄"}</span>
                        </button>
                        {openMessageActionsPostId === post.id && (
                          <div
                            id={`message-actions-${post.id}`}
                            className="topic-message-mobile-actions-menu"
                          >
                            {canReply && (
                              <button type="button" onClick={() => targetReply(post.id)}>
                                {t("replyToMessage")}
                              </button>
                            )}
                            {canReply && (
                              <button type="button" onClick={() => quoteSelectedText(post.id)}>
                                {t("quoteSelectedText")}
                              </button>
                            )}
                            <button type="button" onClick={() => void copyMessageLink(post.id)}>
                              {t("copyMessageLink")}
                            </button>
                            {quoteSelectionErrorPostId === post.id && (
                              <span className="topic-message-mobile-action-feedback" role="status" aria-live="polite">
                                {t("quoteSelectionRequired")}
                              </span>
                            )}
                            {messageLinkState && (
                              <span
                                className={messageLinkState === "error"
                                  ? "topic-message-mobile-action-feedback is-error"
                                  : "topic-message-mobile-action-feedback"}
                                role="status"
                                aria-live="polite"
                              >
                                {t(messageLinkState === "copied" ? "messageLinkCopied" : "messageLinkCopyFailed")}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      data-message-body
                      className={postPresentation.selected === "translation"
                        ? "topic-message-body has-translation"
                        : "topic-message-body"}
                    >
                      <PostBodyContent presentation={postPresentation} />
                    </div>

                    {generationUnit && (
                      <div className="message-generation-status">
                        <ContentGenerationUnitStatus unit={generationUnit} />
                      </div>
                    )}

                    <div className="topic-message-footer">
                      <div className="topic-message-relations">
                        {parentMessageNumber !== undefined && (
                          <a
                            className="topic-message-parent-link"
                            href={`#post-${encodeURIComponent(post.parentPostId!)}`}
                          >
                            {t("replyToMessageNumberCompact", { number: parentMessageNumber })}
                          </a>
                        )}
                        <a
                          className="topic-message-mobile-number"
                          href={`#post-${encodeURIComponent(post.id)}`}
                          aria-label={t("postNumber", { number: messageNumber })}
                        >
                          #{messageNumber}
                        </a>
                        {directReplyIds.length > 0 && (
                          <nav className="topic-message-direct-replies" aria-label={t("directReplies")}>
                            <span className="topic-message-direct-replies-label-desktop">{t("directReplies")}:</span>
                            <span className="topic-message-direct-replies-label-mobile">{t("directRepliesCompact")}</span>
                            {directReplyIds.map((replyId) => (
                              <a key={replyId} href={`#post-${encodeURIComponent(replyId)}`}>
                                #{messageNumberById.get(replyId)}
                              </a>
                            ))}
                          </nav>
                        )}
                      </div>

                      <PostBodyTranslationControls presentation={postPresentation} />
                      <div className="topic-message-desktop-actions">
                        <MessagePermalinkControl
                          postId={post.id}
                          messageNumber={messageNumber}
                          feedback={messageLinkFeedback}
                          onCopy={copyMessageLink}
                        />
                        {canReply && (
                          <div className="topic-message-participation">
                            <div className="topic-message-participation-actions">
                              <button type="button" onClick={() => quoteSelectedText(post.id)}>
                                {t("quoteSelectedText")}
                              </button>
                              <button type="button" onClick={() => targetReply(post.id)}>
                                {t("replyToMessage")}
                              </button>
                            </div>
                            {quoteSelectionErrorPostId === post.id && (
                              <span className="topic-message-quote-feedback" role="status" aria-live="polite">
                                {t("quoteSelectionRequired")}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {hasMessageTools && (
                      <details className="secondary-tools message-secondary-tools">
                        <summary>{t("messageTools")}</summary>
                        <div className="secondary-tools-panel">
                          {canCorrectPostSourceLocale && (
                            <Form method="post" className="source-locale-form secondary-tools-form">
                              <input type="hidden" name="intent" value="correctPostSourceLocale" />
                              <input type="hidden" name="postId" value={post.id} />
                              <input type="hidden" name="expectedRevisionId" value={post.body.id} />
                              <p>{t("sourceLocaleCurrent", { locale: post.body.sourceLocale })}</p>
                              <label>
                                {t("sourceLocaleCorrectionInput")}
                                <input
                                  name="sourceLocale"
                                  required
                                  defaultValue={post.body.sourceLocale === "und" ? "" : post.body.sourceLocale}
                                  autoComplete="off"
                                />
                              </label>
                              <button type="submit">{t("sourceLocaleCorrectionSubmit")}</button>
                            </Form>
                          )}

                          {canSelectBestAnswer && (
                            <Form method="post" className="solution-form secondary-tools-form">
                              <input type="hidden" name="intent" value="selectBestAnswer" />
                              <input type="hidden" name="postId" value={post.id} />
                              <button type="submit">{t("selectBestAnswer")}</button>
                            </Form>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {canReply && (
          <Form
            method="post"
            className="forum-write-form topic-reply-form"
            aria-labelledby="reply-heading"
            aria-busy={isReplySubmitting}
          >
            <input type="hidden" name="intent" value="reply" />
            {replyTargetPostId && <input type="hidden" name="parentPostId" value={replyTargetPostId} />}

            <header className="forum-write-header">
              <div>
                <p className="eyebrow">{t("authoringLabel")}</p>
                <h2 id="reply-heading">{t("replyHeading")}</h2>
              </div>
              <p>{t("replyHelp")}</p>
            </header>

            {replyTargetPostId && messageNumberById.has(replyTargetPostId) && (
              <div className="reply-target-banner">
                <span>{t("replyingToMessage", { number: messageNumberById.get(replyTargetPostId)! })}</span>
                <button
                  type="button"
                  onClick={() => {
                    setReplyTargetPostId(null);
                    setQuoteSelectionErrorPostId(null);
                    replyTextareaRef.current?.focus();
                  }}
                >
                  {t("clearReplyTarget")}
                </button>
              </div>
            )}

            <div className="forum-write-fields">
              <div className="forum-write-field">
                <label htmlFor="reply-body">{t("replyBodyLabel")}</label>
                <textarea
                  ref={replyTextareaRef}
                  id="reply-body"
                  name="body"
                  required
                  rows={8}
                  disabled={isReplySubmitting}
                  aria-describedby="reply-body-help"
                />
                <small id="reply-body-help">{t("messageBodyHelp")}</small>
              </div>
            </div>

            <footer className="forum-write-actions">
              <p>{t("authoringRequiredHint")}</p>
              <button type="submit" disabled={isReplySubmitting}>
                {t(isReplySubmitting ? "replySubmitting" : "replySubmit")}
              </button>
            </footer>
          </Form>
        )}
      </ForumShell>
    </ContentGenerationNavigationBoundary>
  );
}
