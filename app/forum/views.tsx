import { Form, Link } from "react-router";
import { useTranslation } from "react-i18next";

import type {
  ForumCategoryPage,
  ForumCategorySummary,
  ForumSectionPage,
  ForumTopicPage,
} from "../../db/forum-repository";
import type { ContentTranslationPresentation } from "../localization/content-translation-presentation";
import type { ContentGenerationUnitView } from "../localization/content-generation-view";
import { forumCategoryPath, forumSectionPath, forumTopicPath } from "./paths";
import { PostBodyPresentation, TopicTitlePresentation } from "./content-translation-view";
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
  categories: readonly ForumCategorySummary[];
}) {
  const { t } = useTranslation("common");
  return (
    <ForumShell locale={locale}>
      <section className="page-heading">
        <p className="eyebrow">{t("forumIndex")}</p>
        <h1>{t("categoriesHeading")}</h1>
        <p>{t("categoriesIntro")}</p>
      </section>
      {categories.length === 0 ? <EmptyState>{t("categoriesEmpty")}</EmptyState> : (
        <ul className="forum-list">
          {categories.map((category) => (
            <li key={category.id}>
              <Link className="forum-list-link" to={forumCategoryPath(locale, category.id)}>
                <strong>{category.name}</strong>
                <span>{t("sectionCount", { count: category.sectionCount })}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ForumShell>
  );
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
  actionData?: { readonly error?: string };
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

export interface TopicViewActionData {
  readonly operation?: string;
  readonly error?: string;
}

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
  const correctionError = actionData?.operation === "sourceLocaleCorrection"
    ? actionData.error
    : null;
  const forumWriteError = actionData && actionData.operation === undefined
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
