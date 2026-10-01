import { useState } from "react";
import { Form, Link, useNavigation } from "react-router";
import { useTranslation } from "react-i18next";

import type {
  ForumCategoryPage,
  ForumSectionPage,
  ForumTopicPage,
} from "../../db/forum-repository";
import type { ContentTranslationPresentation } from "../localization/content-translation-presentation";
import type { ContentGenerationUnitView } from "../localization/content-generation-view";
import type { ContentGenerationActionResponse } from "../localization/content-generation-response";
import type {
  ForumMutationError,
  SourceLocaleCorrectionMutationError,
} from "./mutations.server";
import { forumCategoryPath, forumSectionPath, forumTopicPath, underDevelopmentPath } from "./paths";
import {
  HOMEPAGE_COMPACT_LATEST_LIMIT,
  HOMEPAGE_COMPACT_PINNED_LIMIT,
  type HomepageCategoryOverview,
  type HomepageTopicSummary,
} from "./homepage";
import { PostBodyPresentation, TopicTitlePresentation } from "./content-translation-view";
import {
  ContentGenerationNavigationBoundary,
  ContentGenerationUnitStatus,
} from "./content-generation-controls";
import { Breadcrumbs, EmptyState, ForumShell } from "./ui";

export function HomeView({
  locale,
  categories,
  referenceTime,
}: {
  locale: string;
  categories: readonly HomepageCategoryOverview[];
  referenceTime: string;
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
          <h1 className="home-sections-heading">{t("homeForumSectionsHeading")}</h1>
          <section className="home-forum-sections" aria-label={t("homeForumSectionsHeading")}>
          {categories.map((category) => (
            <HomepageCategoryCard
              key={category.id}
              locale={locale}
              category={category}
              referenceTime={referenceTime}
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

function HomepageCategoryCard({
  locale,
  category,
  referenceTime,
}: {
  locale: string;
  category: HomepageCategoryOverview;
  referenceTime: string;
}) {
  const { t } = useTranslation("common");
  const [expanded, setExpanded] = useState(false);
  const pinned = expanded
    ? category.pinnedTopics
    : category.pinnedTopics.slice(0, HOMEPAGE_COMPACT_PINNED_LIMIT);
  const latest = expanded
    ? category.latestTopics
    : category.latestTopics.slice(0, HOMEPAGE_COMPACT_LATEST_LIMIT);
  const hasMore = category.pinnedTopics.length > HOMEPAGE_COMPACT_PINNED_LIMIT
    || category.latestTopics.length > HOMEPAGE_COMPACT_LATEST_LIMIT;
  const detailsId = `home-category-${category.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  return (
    <article className="home-section-card">
      <div className="home-section-identity">
        <HomepageCategoryIcon icon={category.icon} name={category.name} />
        <div>
          <h2>
            <Link to={forumCategoryPath(locale, category.id)}>{category.name}</Link>
          </h2>
          <p>{category.description ?? t("homepageSectionFallbackDescription")}</p>
        </div>
      </div>

      <div className="home-section-column home-section-pinned" id={`${detailsId}-pinned`}>
        <h3>{t("pinnedHeading")}</h3>
        <HomepageTopicList
          locale={locale}
          topics={pinned}
          emptyLabel={t("homepagePinnedEmpty")}
          emptyHref={underDevelopmentPath(locale, "pinned-topics")}
          referenceTime={referenceTime}
          showActivity={false}
          pinned
        />
      </div>

      <div className="home-section-column home-section-latest" id={`${detailsId}-latest`}>
        <h3>{t("latestTopicsHeading")}</h3>
        <HomepageTopicList
          locale={locale}
          topics={latest}
          emptyLabel={t("homepageLatestEmpty")}
          referenceTime={referenceTime}
          showActivity
        />
      </div>

      <div className="home-section-stats">
        <span>
          <strong>{category.topicCount}</strong>
          {t("topicsHeading")}
        </span>
        <span>
          <strong>{category.messageCount}</strong>
          {t("postsColumn")}
        </span>
      </div>

      <Link
        className="home-section-enter"
        to={underDevelopmentPath(locale, "forum-discovery")}
        aria-label={t("forumDiscoveryDevelopmentStatus", { section: category.name })}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="m9 5 7 7-7 7" />
        </svg>
      </Link>

      <button
        className="home-section-expand"
        type="button"
        disabled={!hasMore}
        aria-expanded={expanded}
        aria-controls={`${detailsId}-pinned ${detailsId}-latest`}
        aria-label={t(expanded ? "homepageCollapse" : "homepageExpand")}
        onClick={() => setExpanded((value) => !value)}
      >
        <svg aria-hidden="true" viewBox="0 0 20 20">
          <path d={expanded ? "m5 12 5-5 5 5" : "m5 8 5 5 5-5"} />
        </svg>
      </button>
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
    <div className="home-section-icon" aria-hidden="true">
      {path ? <svg viewBox="0 0 24 24">{path}</svg> : name.trim().slice(0, 1).toUpperCase()}
    </div>
  );
}

function HomepageTopicList({
  locale,
  topics,
  emptyLabel,
  emptyHref,
  referenceTime,
  showActivity,
  pinned = false,
}: {
  locale: string;
  topics: readonly HomepageTopicSummary[];
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
                  {formatRelativeActivity(topic.activityAt, referenceTime, locale)}
                </time>
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function formatRelativeActivity(activityAt: string, referenceTime: string, locale: string): string {
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

export function CategoryView({
  locale,
  category,
}: {
  locale: string;
  category: ForumCategoryPage;
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
                <Link className="category-section-card" to={forumSectionPath(locale, section.id)}>
                  <span className="category-section-main">
                    <span className="category-section-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path d="M4 6.5h6l2 2h8v9H4z" />
                        <path d="M7 12h10M7 15h7" />
                      </svg>
                    </span>
                    <strong>{section.name}</strong>
                  </span>

                  <span
                    className="category-section-stats"
                    role="group"
                    aria-label={`${t("topicCount", { count: section.topicCount })} · ${t("messageCount", { count: section.postCount })}`}
                  >
                    <span aria-hidden="true">
                      <strong>{section.topicCount}</strong>
                      <small>{t("topicsHeading")}</small>
                    </span>
                    <span aria-hidden="true">
                      <strong>{section.postCount}</strong>
                      <small>{t("postsColumn")}</small>
                    </span>
                  </span>

                  <span className="category-section-enter" aria-hidden="true">
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

export function SectionView({
  locale,
  section,
  canCreateTopic,
  actionData,
}: {
  locale: string;
  section: ForumSectionPage;
  canCreateTopic: boolean;
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
                      <strong>{topic.title.originalContent}</strong>
                      <small>{t("startedBy", { author: topic.authorName })}</small>
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
            <label className="forum-write-field">
              <span>{t("topicTitleLabel")}</span>
              <input
                name="title"
                required
                disabled={isCreateTopicSubmitting}
                aria-describedby="create-topic-title-help"
              />
              <small id="create-topic-title-help">{t("topicTitleHelp")}</small>
            </label>

            <label className="forum-write-field">
              <span>{t("initialPostLabel")}</span>
              <textarea
                name="body"
                required
                rows={8}
                disabled={isCreateTopicSubmitting}
                aria-describedby="create-topic-body-help"
              />
              <small id="create-topic-body-help">{t("messageBodyHelp")}</small>
            </label>
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

export function TopicView({
  locale,
  topic,
  titlePresentation,
  postPresentations,
  generationUnits,
  canReply,
  canManageSolution,
  canCorrectTitleSourceLocale,
  correctablePostIds,
  actionData,
}: {
  locale: string;
  topic: ForumTopicPage;
  titlePresentation: ContentTranslationPresentation;
  postPresentations: readonly ContentTranslationPresentation[];
  generationUnits: readonly ContentGenerationUnitView[];
  canReply: boolean;
  canManageSolution: boolean;
  canCorrectTitleSourceLocale: boolean;
  correctablePostIds: readonly string[];
  actionData?: TopicViewActionData;
}) {
  const correctablePosts = new Set(correctablePostIds);
  const generationByContentId = new Map(generationUnits.map((unit) => [unit.contentId, unit]));
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
  const { t } = useTranslation("common");
  const navigation = useNavigation();
  const isReplySubmitting =
    navigation.state === "submitting"
    && navigation.formData?.get("intent") === "reply";

  return (
    <ContentGenerationNavigationBoundary
      pageIdentity={JSON.stringify([locale, topic.id])}
      units={generationUnits}
    >
      <ForumShell locale={locale} variant="topic">
        <Breadcrumbs locale={locale} items={[
          { label: topic.section.category.name, to: forumCategoryPath(locale, topic.section.category.id) },
          { label: topic.section.name, to: forumSectionPath(locale, topic.section.id) },
          { label: titlePresentation.content },
        ]} />

        <section className="topic-heading">
          <div className="topic-heading-main">
            <p className="eyebrow">{t("topicLabel")}</p>
            <TopicTitlePresentation presentation={titlePresentation} />
            <ContentGenerationUnitStatus unit={generationByContentId.get(topic.id)} />
            <div className="topic-heading-meta">
              <span>{t("startedBy", { author: topic.authorName })}</span>
              {topic.isSolved && <strong className="solved-badge">{t("solved")}</strong>}
            </div>
          </div>

          <div className="topic-heading-actions">
            {topic.bestAnswerPostId && (
              <a className="topic-solution-link" href={`#post-${encodeURIComponent(topic.bestAnswerPostId)}`}>
                {t("goToSolution")}
              </a>
            )}
            {canManageSolution && !topic.isSolved && (
              <Form method="post">
                <input type="hidden" name="intent" value="markSolved" />
                <button type="submit">{t("markSolved")}</button>
              </Form>
            )}
          </div>

          {canCorrectTitleSourceLocale && (
            <Form method="post" className="source-locale-form topic-heading-secondary">
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
        </section>

        {correctionError && <p className="topic-page-alert" role="alert">{t(`sourceLocaleCorrectionError_${correctionError}`)}</p>}
        {forumWriteError && <p className="topic-page-alert" role="alert">{t(`forumWriteError_${forumWriteError}`)}</p>}

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
                  </header>

                  <div className="forum-post-content">
                    <div className="topic-message-toolbar">
                      <span className="topic-message-labels">
                        {isOriginalQuestion && (
                          <strong className="original-question-label">{t("originalQuestion")}</strong>
                        )}
                        {isBestAnswer && (
                          <strong className="best-answer-label">{t("bestAnswer")}</strong>
                        )}
                      </span>
                      <a className="topic-message-anchor" href={`#post-${encodeURIComponent(post.id)}`}>
                        {t("postNumber", { number: messageNumber })}
                      </a>
                    </div>

                    <PostBodyPresentation presentation={presentedPosts.get(post.id)!} />
                    <ContentGenerationUnitStatus unit={generationByContentId.get(post.id)} />

                    {correctablePosts.has(post.id) && (
                      <Form method="post" className="source-locale-form">
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

                    {canManageSolution && topic.isSolved && topic.bestAnswerPostId !== post.id && (
                      <Form method="post" className="solution-form">
                        <input type="hidden" name="intent" value="selectBestAnswer" />
                        <input type="hidden" name="postId" value={post.id} />
                        <button type="submit">{t("selectBestAnswer")}</button>
                      </Form>
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

            <header className="forum-write-header">
              <div>
                <p className="eyebrow">{t("authoringLabel")}</p>
                <h2 id="reply-heading">{t("replyHeading")}</h2>
              </div>
              <p>{t("replyHelp")}</p>
            </header>

            <div className="forum-write-fields">
              <label className="forum-write-field">
                <span>{t("replyBodyLabel")}</span>
                <textarea
                  name="body"
                  required
                  rows={8}
                  disabled={isReplySubmitting}
                  aria-describedby="reply-body-help"
                />
                <small id="reply-body-help">{t("messageBodyHelp")}</small>
              </label>
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
