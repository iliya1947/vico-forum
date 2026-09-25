import { Form, useActionData, useLoaderData, type RouterContextProvider } from "react-router";
import { useTranslation } from "react-i18next";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationForRequest } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { forumCategoryPath, forumSectionPath } from "../forum/paths";
import { forumReaderForRequest } from "../forum/request-context";
import { PostBodyPresentation, TopicTitlePresentation } from "../forum/content-translation-view";
import {
  ContentGenerationClientBoundary,
  ContentGenerationUnitControl,
} from "../forum/content-generation-controls";
import {
  contentGenerationStatusForRequest,
  contentTranslationPresentationForRequest,
  localeContext,
  registryForRequest,
} from "../localization/request-context";
import {
  ContentGenerationStatusStorageUnavailableError,
  composeContentGenerationView,
  unavailableContentGenerationView,
  type ContentGenerationViewModel,
} from "../localization/content-generation-status";
import {
  contentPostBodySemanticCharacterCount,
  MAX_AUTOMATIC_POST_TRANSLATION_SEMANTIC_CHARACTERS,
} from "../localization/content-generation-action.server";
import type {
  ForumMutationError,
  SourceLocaleCorrectionMutationError,
} from "../forum/mutations.server";
import { Breadcrumbs, EmptyState, ForumRouteError, ForumShell } from "../forum/ui";

export { topicAction as action } from "../forum/actions.server";

export async function loader({ params, context }: {
  params: { locale?: string; topicId?: string };
  context: RouterContextProvider;
}) {
  const topic = await forumReaderForRequest(context).readTopicPage(params.topicId ?? "");
  if (!topic) throw new Response("Not Found", { status: 404 });

  const resolvedLocale = context.get(localeContext);
  const loadedRegistry = await registryForRequest(context);
  const revisions = [
    {
      contentType: "topic-title" as const,
      contentId: topic.id,
      revisionId: topic.title.id,
      originalContent: topic.title.originalContent,
      sourceLocale: topic.title.sourceLocale,
    },
    ...topic.posts.map((post) => ({
      contentType: "post-body" as const,
      contentId: post.id,
      revisionId: post.body.id,
      originalContent: post.body.originalContent,
      sourceLocale: post.body.sourceLocale,
    })),
  ];
  const presentations = await contentTranslationPresentationForRequest(context).readCurrent(
    revisions,
    resolvedLocale.translationLocale,
    resolvedLocale.direction,
    (locale) => loadedRegistry.registry.find(locale)?.locale.direction,
  );
  const titlePresentation = presentations[0]!;
  const postPresentations = presentations.slice(1);

  const session = authSessionForRequest(context);
  let canReply = false;
  let canManageSolution = false;
  let canCorrectTitleSourceLocale = false;
  let canGenerateTranslation = false;
  let correctablePostIds: string[] = [];
  if (session) {
    try {
      const resolver = authorizationForRequest(context).forUser(session.user.id);
      const [reply, solutionAny, solutionOwn, sourceAny, sourceOwn, generation] = await Promise.all([
        resolver.has("forum.reply.create"),
        resolver.has("forum.solution.manageAny"),
        resolver.has("forum.solution.manageOwn"),
        resolver.has("forum.sourceLocale.correctAny"),
        resolver.has("forum.sourceLocale.correctOwn"),
        resolver.has("forum.translation.generate"),
      ]);
      canReply = reply;
      canManageSolution = solutionAny || (solutionOwn && session.user.id === topic.authorId);
      canCorrectTitleSourceLocale = sourceAny || (sourceOwn && session.user.id === topic.authorId);
      canGenerateTranslation = generation;
      correctablePostIds = sourceAny
        ? topic.posts.map((post) => post.id)
        : sourceOwn
          ? topic.posts.filter((post) => post.authorId === session.user.id).map((post) => post.id)
          : [];
    } catch (error) {
      if (!(error instanceof AuthorizationUnavailableError)) throw error;
      // Public topic reads remain available when optional presentation authorization is unavailable.
    }
  }

  let generationUnits: readonly ContentGenerationViewModel[] | null = null;
  if (session && canGenerateTranslation) {
    try {
      const statuses = await contentGenerationStatusForRequest(context).readCurrent(
        revisions,
        resolvedLocale.translationLocale,
      );
      generationUnits = composeContentGenerationView(
        revisions,
        presentations,
        statuses,
        resolvedLocale.translationLocale,
        (revision) => contentPostBodySemanticCharacterCount(revision.originalContent),
        MAX_AUTOMATIC_POST_TRANSLATION_SEMANTIC_CHARACTERS,
      );
    } catch (error) {
      if (!(error instanceof ContentGenerationStatusStorageUnavailableError)) throw error;
      generationUnits = unavailableContentGenerationView(
        revisions,
        resolvedLocale.translationLocale,
      );
    }
  }

  return {
    locale: resolvedLocale.translationLocale,
    topic,
    titlePresentation,
    postPresentations,
    canReply,
    canManageSolution,
    canCorrectTitleSourceLocale,
    correctablePostIds,
    generationUnits,
  };
}

export default function TopicRoute() {
  const {
    locale,
    topic,
    titlePresentation,
    postPresentations,
    canReply,
    canManageSolution,
    canCorrectTitleSourceLocale,
    correctablePostIds,
    generationUnits,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<ForumMutationError | SourceLocaleCorrectionMutationError>();
  const correctablePosts = new Set(correctablePostIds);
  const presentedPosts = new Map(postPresentations.map((presentation) => [presentation.contentId, presentation]));
  const generationByContent = new Map(
    (generationUnits ?? []).map((unit) => [
      JSON.stringify([unit.contentType, unit.contentId]),
      unit,
    ]),
  );
  const titleGeneration = generationByContent.get(
    JSON.stringify(["topic-title", topic.id]),
  );
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
    <ForumShell locale={locale}>
      <ContentGenerationClientBoundary units={generationUnits}>
        <Breadcrumbs locale={locale} items={[
          { label: topic.section.category.name, to: forumCategoryPath(locale, topic.section.category.id) },
          { label: topic.section.name, to: forumSectionPath(locale, topic.section.id) },
          { label: titlePresentation.content },
        ]} />
        <section className="page-heading">
          <p className="eyebrow">{t("topicLabel")}</p>
          <TopicTitlePresentation presentation={titlePresentation} />
          {titleGeneration && <ContentGenerationUnitControl unit={titleGeneration} />}
          <p>{t("startedBy", { author: topic.authorName })}</p>
          {topic.isSolved && <strong className="solved-badge">{t("solved")}</strong>}
          {topic.bestAnswerPostId && <p><a href={`#post-${encodeURIComponent(topic.bestAnswerPostId)}`}>{t("goToSolution")}</a></p>}
          {canManageSolution && !topic.isSolved && <Form method="post"><input type="hidden" name="intent" value="markSolved" /><button type="submit">{t("markSolved")}</button></Form>}
          {canCorrectTitleSourceLocale && <Form method="post" className="source-locale-form">
            <input type="hidden" name="intent" value="correctTitleSourceLocale" />
            <input type="hidden" name="expectedRevisionId" value={topic.title.id} />
            <p>{t("sourceLocaleCurrent", { locale: topic.title.sourceLocale })}</p>
            <label>{t("sourceLocaleCorrectionInput")}<input name="sourceLocale" required defaultValue={topic.title.sourceLocale === "und" ? "" : topic.title.sourceLocale} autoComplete="off" /></label>
            <button type="submit">{t("sourceLocaleCorrectionSubmit")}</button>
          </Form>}
        </section>
        {correctionError && <p role="alert">{t(`sourceLocaleCorrectionError_${correctionError}`)}</p>}
        {forumWriteError && <p role="alert">{t(`forumWriteError_${forumWriteError}`)}</p>}
        {topic.posts.length === 0 ? <EmptyState>{t("postsEmpty")}</EmptyState> : (
          <ol className="post-list">
            {topic.posts.map((post, index) => {
              const generation = generationByContent.get(
                JSON.stringify(["post-body", post.id]),
              );
              return (
                <li id={`post-${post.id}`} className={`forum-post${topic.bestAnswerPostId === post.id ? " best-answer" : ""}`} key={post.id}>
                  <header><strong>{post.authorName}</strong><span>{t("postNumber", { number: index + 1 })}</span></header>
                  <div className="forum-post-content">
                    {topic.bestAnswerPostId === post.id && <strong className="best-answer-label">{t("bestAnswer")}</strong>}
                    <PostBodyPresentation presentation={presentedPosts.get(post.id)!} />
                    {generation && <ContentGenerationUnitControl unit={generation} />}
                    {correctablePosts.has(post.id) && <Form method="post" className="source-locale-form">
                      <input type="hidden" name="intent" value="correctPostSourceLocale" />
                      <input type="hidden" name="postId" value={post.id} />
                      <input type="hidden" name="expectedRevisionId" value={post.body.id} />
                      <p>{t("sourceLocaleCurrent", { locale: post.body.sourceLocale })}</p>
                      <label>{t("sourceLocaleCorrectionInput")}<input name="sourceLocale" required defaultValue={post.body.sourceLocale === "und" ? "" : post.body.sourceLocale} autoComplete="off" /></label>
                      <button type="submit">{t("sourceLocaleCorrectionSubmit")}</button>
                    </Form>}
                    {canManageSolution && topic.isSolved && topic.bestAnswerPostId !== post.id && <Form method="post" className="solution-form"><input type="hidden" name="intent" value="selectBestAnswer" /><input type="hidden" name="postId" value={post.id} /><button type="submit">{t("selectBestAnswer")}</button></Form>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {canReply && <Form method="post" className="forum-write-form">
          <h2>{t("replyHeading")}</h2>
          <label>{t("replyBodyLabel")}<textarea name="body" required rows={7} /></label>
          <button type="submit">{t("replySubmit")}</button>
        </Form>}
      </ContentGenerationClientBoundary>
    </ForumShell>
  );
}

export const ErrorBoundary = ForumRouteError;
