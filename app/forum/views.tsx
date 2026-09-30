import { useState } from "react";
import { Form, Link } from "react-router";
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
  HOMEPAGE_COMPACT_TOPIC_LIMIT,
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
    <ForumShell locale={locale}>
      {categories.length === 0 ? <EmptyState>{t("categoriesEmpty")}</EmptyState> : (
        <section className="home-forum-sections" aria-label={t("categoriesHeading")}>
          {categories.map((category) => (
            <HomepageCategoryCard
              key={category.id}
              locale={locale}
              category={category}
              referenceTime={referenceTime}
            />
          ))}
        </section>
      )}

      <section className="home-information" aria-label={t("forumStatisticsHeading")}>
        <article className="home-information-card">
          <p className="eyebrow">{t("whosOnlineHeading")}</p>
          <h2>{t("whosOnlineHeading")}</h2>
          <p>{t("onlinePresencePending")}</p>
          <Link to={underDevelopmentPath(locale, "online-presence")}>{t("viewDevelopmentStatus")}</Link>
        </article>
        <article className="home-information-card">
          <p className="eyebrow">{t("forumStatisticsHeading")}</p>
          <h2>{t("forumStatisticsHeading")}</h2>
          <dl className="forum-statistics">
            <div>
              <dt>{t("categoriesHeading")}</dt>
              <dd>{categories.length}</dd>
            </div>
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
    : category.pinnedTopics.slice(0, HOMEPAGE_COMPACT_TOPIC_LIMIT);
  const latest = expanded
    ? category.latestTopics
    : category.latestTopics.slice(0, HOMEPAGE_COMPACT_TOPIC_LIMIT);
  const hasMore = category.pinnedTopics.length > HOMEPAGE_COMPACT_TOPIC_LIMIT
    || category.latestTopics.length > HOMEPAGE_COMPACT_TOPIC_LIMIT;
  const detailsId = `home-category-${category.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  return (
    <article className="home-section-card">
      <div className="home-section-identity">
        <div className="home-section-icon" aria-hidden="true">
          {category.icon ?? category.name.trim().slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h2>
            <Link to={forumCategoryPath(locale, category.id)}>{category.name}</Link>
          </h2>
          <p>{category.description ?? t("homepageSectionFallbackDescription")}</p>
          <span className="home-section-meta">{t("sectionCount", { count: category.sectionCount })}</span>
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

      <button
        className="home-section-expand"
        type="button"
        disabled={!hasMore}
        aria-expanded={expanded}
        aria-controls={`${detailsId}-pinned ${detailsId}-latest`}
        aria-label={t(expanded ? "homepageCollapse" : "homepageExpand")}
        onClick={() => setExpanded((value) => !value)}
      >
        <span aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button>
    </article>
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
        <li key={topic.id}>
          <span className="home-topic-title">
            {pinned ? <span className="home-pinned-marker" aria-hidden="true" /> : null}
            <Link to={forumTopicPath(locale, topic.id)}>{topic.title}</Link>
          </span>
          {showActivity ? (
            <span className="home-topic-meta">
              <span className="home-topic-avatar" aria-hidden="true">
                {topic.authorName.trim().slice(0, 1).toUpperCase()}
              </span>
              <span>{topic.authorName}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={topic.activityAt}>
                {formatRelativeActivity(topic.activityAt, referenceTime, locale)}
              </time>
            </span>
          ) : null}
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
  return (
    <ForumShell locale={locale}>
      <Breadcrumbs locale={locale} items={[{ label: category.name }]} />
      <section className="page-heading">
        <p className="eyebrow">{t("categoryLabel")}</p>
        <h1>{category.name}</h1>
      </section>
      {category.sections.length === 0 ? <EmptyState>{t("sectionsEmpty")}</EmptyState> : (
        <ul className="forum-list">
          {category.sections.map((section) => (
            <li key={section.id}>
              <Link className="forum-list-link" to={forumSectionPath(locale, section.id)}>
                <strong>{section.name}</strong>
                <span>
                  {t("topicCount", { count: section.topicCount })} · {t("messageCount", { count: section.postCount })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
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
  return (
    <ForumShell locale={locale}>
      <Breadcrumbs locale={locale} items={[
        { label: section.category.name, to: forumCategoryPath(locale, section.category.id) },
        { label: section.name },
      ]} />
      <section className="page-heading">
        <p className="eyebrow">{t("sectionLabel")}</p>
        <h1>{section.name}</h1>
      </section>
      {section.topics.length === 0 ? <EmptyState>{t("topicsEmpty")}</EmptyState> : (
        <div className="topic-table" role="table" aria-label={t("topicsHeading")}>
          <div className="topic-row topic-table-header" role="row">
            <span role="columnheader">{t("topicColumn")}</span>
            <span role="columnheader">{t("postsColumn")}</span>
          </div>
          {section.topics.map((topic) => (
            <div className="topic-row" role="row" key={topic.id}>
              <span role="cell">
                <Link to={forumTopicPath(locale, topic.id)}>{topic.title.originalContent}</Link>
                <small>{t("startedBy", { author: topic.authorName })}</small>
              </span>
              <span role="cell" className="count-cell">{topic.postCount}</span>
            </div>
          ))}
        </div>
      )}
      {canCreateTopic && (
        <Form method="post" className="forum-write-form">
          <h2>{t("createTopicHeading")}</h2>
          {actionData?.error && <p role="alert">{t(`forumWriteError_${actionData.error}`)}</p>}
          <label>{t("topicTitleLabel")}<input name="title" required /></label>
          <label>{t("initialPostLabel")}<textarea name="body" required rows={7} /></label>
          <button type="submit">{t("createTopicSubmit")}</button>
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
  const { t } = useTranslation("common");

  return (
    <ContentGenerationNavigationBoundary
      pageIdentity={JSON.stringify([locale, topic.id])}
      units={generationUnits}
    >
      <ForumShell locale={locale}>
        <Breadcrumbs locale={locale} items={[
          { label: topic.section.category.name, to: forumCategoryPath(locale, topic.section.category.id) },
          { label: topic.section.name, to: forumSectionPath(locale, topic.section.id) },
          { label: titlePresentation.content },
        ]} />
        <section className="page-heading">
          <p className="eyebrow">{t("topicLabel")}</p>
          <TopicTitlePresentation presentation={titlePresentation} />
          <ContentGenerationUnitStatus unit={generationByContentId.get(topic.id)} />
          <p>{t("startedBy", { author: topic.authorName })}</p>
          {topic.isSolved && <strong className="solved-badge">{t("solved")}</strong>}
          {topic.bestAnswerPostId && (
            <p><a href={`#post-${encodeURIComponent(topic.bestAnswerPostId)}`}>{t("goToSolution")}</a></p>
          )}
          {canManageSolution && !topic.isSolved && (
            <Form method="post">
              <input type="hidden" name="intent" value="markSolved" />
              <button type="submit">{t("markSolved")}</button>
            </Form>
          )}
          {canCorrectTitleSourceLocale && (
            <Form method="post" className="source-locale-form">
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
        {correctionError && <p role="alert">{t(`sourceLocaleCorrectionError_${correctionError}`)}</p>}
        {forumWriteError && <p role="alert">{t(`forumWriteError_${forumWriteError}`)}</p>}
        {topic.posts.length === 0 ? <EmptyState>{t("postsEmpty")}</EmptyState> : (
          <ol className="post-list">
            {topic.posts.map((post, index) => (
              <li
                id={`post-${post.id}`}
                className={`forum-post${topic.bestAnswerPostId === post.id ? " best-answer" : ""}`}
                key={post.id}
              >
                <header>
                  <strong>{post.authorName}</strong>
                  <span>{t("postNumber", { number: index + 1 })}</span>
                </header>
                <div className="forum-post-content">
                  {topic.bestAnswerPostId === post.id && (
                    <strong className="best-answer-label">{t("bestAnswer")}</strong>
                  )}
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
            ))}
          </ol>
        )}
        {canReply && (
          <Form method="post" className="forum-write-form">
            <h2>{t("replyHeading")}</h2>
            <label>{t("replyBodyLabel")}<textarea name="body" required rows={7} /></label>
            <button type="submit">{t("replySubmit")}</button>
          </Form>
        )}
      </ForumShell>
    </ContentGenerationNavigationBoundary>
  );
}
