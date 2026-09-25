import { Form, useActionData, useLoaderData, type RouterContextProvider } from "react-router";
import { useTranslation } from "react-i18next";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationForRequest } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { forumCategoryPath, forumSectionPath } from "../forum/paths";
import { forumReaderForRequest } from "../forum/request-context";
import type {
  ForumMutationError,
  SourceLocaleCorrectionMutationError,
} from "../forum/mutations.server";
import { ForumMarkdown } from "../forum/markdown";
import { Breadcrumbs, EmptyState, ForumRouteError, ForumShell } from "../forum/ui";
import type { ContentTranslationPresentation } from "../localization/content-translation-presentation";
import {
  contentTranslationPresentationForRequest,
  localeContext,
  registryForRequest,
} from "../localization/request-context";

export { topicAction as action } from "../forum/actions.server";

export async function loader({ params, context }: {
  params: { locale?: string; topicId?: string };
  context: RouterContextProvider;
}) {
  const topic = await forumReaderForRequest(context).readTopicPage(params.topicId ?? "");
  if (!topic) throw new Response("Not Found", { status: 404 });

  const resolvedLocale = context.get(localeContext);
  const loadedRegistry = await registryForRequest(context);
  const translationPresentation = await contentTranslationPresentationForRequest(context).presentTopic({
    title: {
      contentType: "topic-title",
      contentId: topic.id,
      revisionId: topic.title.id,
      originalContent: topic.title.originalContent,
      sourceLocale: topic.title.sourceLocale,
    },
    posts: topic.posts.map((post) => ({
      contentType: "post-body" as const,
      contentId: post.id,
      revisionId: post.body.id,
      originalContent: post.body.originalContent,
      sourceLocale: post.body.sourceLocale,
    })),
    targetLocale: resolvedLocale.translationLocale,
    targetDirection: resolvedLocale.direction,
    sourceDirection(sourceLocale) {
      if (sourceLocale === "und") return "auto";
      return loadedRegistry.registry.find(sourceLocale)?.locale.direction ?? "auto";
    },
  });

  const session = authSessionForRequest(context);
  let canReply = false, canManageSolution = false, canCorrectTitleSourceLocale = false;
  let correctablePostIds: string[] = [];
  if (session) {
    try {
      const resolver = authorizationForRequest(context).forUser(session.user.id);
      const [reply, solutionAny, solutionOwn, sourceAny, sourceOwn] = await Promise.all([
        resolver.has("forum.reply.create"),
        resolver.has("forum.solution.manageAny"),
        resolver.has("forum.solution.manageOwn"),
        resolver.has("forum.sourceLocale.correctAny"),
        resolver.has("forum.sourceLocale.correctOwn"),
      ]);
      canReply = reply;
      canManageSolution = solutionAny || (solutionOwn && session.user.id === topic.authorId);
      canCorrectTitleSourceLocale = sourceAny || (sourceOwn && session.user.id === topic.authorId);
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
  return {
    locale: resolvedLocale.translationLocale,
    topic,
    translationPresentation,
    canReply,
    canManageSolution,
    canCorrectTitleSourceLocale,
    correctablePostIds,
  };
}

export default function TopicRoute() {
  const {
    locale,
    topic,
    translationPresentation,
    canReply,
    canManageSolution,
    canCorrectTitleSourceLocale,
    correctablePostIds,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<ForumMutationError | SourceLocaleCorrectionMutationError>();
  const correctablePosts = new Set(correctablePostIds);
  const correctionError = actionData
    && "operation" in actionData
    && actionData.operation === "sourceLocaleCorrection"
    ? actionData.error
    : null;
  const forumWriteError = actionData && !("operation" in actionData)
    ? actionData.error
    : null;
  const { t } = useTranslation("common");
  const titlePresentation = translationPresentation.title;
  const translatedTitle = titlePresentation.selected === "translation";
  return (
    <ForumShell locale={locale}>
      <div className="topic-title-presentation">
        {translatedTitle && <TranslationToggle className="topic-title-toggle" />}
        <Breadcrumbs locale={locale} items={[
          { label: topic.section.category.name, to: forumCategoryPath(locale, topic.section.category.id) },
          { label: topic.section.name, to: forumSectionPath(locale, topic.section.id) },
          { label: <TitlePresentationText presentation={titlePresentation} /> },
        ]} />
        <section className="page-heading">
          <p className="eyebrow">{t("topicLabel")}</p>
          <h1><TitlePresentationText presentation={titlePresentation} /></h1>
          {translatedTitle && <TranslationMetadata presentation={titlePresentation} />}
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
      </div>
      {correctionError && <p role="alert">{t(`sourceLocaleCorrectionError_${correctionError}`)}</p>}
      {forumWriteError && <p role="alert">{t(`forumWriteError_${forumWriteError}`)}</p>}
      {topic.posts.length === 0 ? <EmptyState>{t("postsEmpty")}</EmptyState> : (
        <ol className="post-list">
          {topic.posts.map((post, index) => (
            <li id={`post-${post.id}`} className={`forum-post${topic.bestAnswerPostId === post.id ? " best-answer" : ""}`} key={post.id}>
              <header><strong>{post.authorName}</strong><span>{t("postNumber", { number: index + 1 })}</span></header>
              <div className="forum-post-content">
                {topic.bestAnswerPostId === post.id && <strong className="best-answer-label">{t("bestAnswer")}</strong>}
                <PostBodyPresentation presentation={translationPresentation.posts[index]!} />
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
          ))}
        </ol>
      )}
      {canReply && <Form method="post" className="forum-write-form">
        <h2>{t("replyHeading")}</h2>
        <label>{t("replyBodyLabel")}<textarea name="body" required rows={7} /></label>
        <button type="submit">{t("replySubmit")}</button>
      </Form>}
    </ForumShell>
  );
}

function TitlePresentationText({ presentation }: { presentation: ContentTranslationPresentation }) {
  if (presentation.selected === "original") {
    return <span lang={presentation.original.locale} dir={presentation.original.direction}>{presentation.original.content}</span>;
  }
  return (
    <>
      <span
        className="translation-current-inline"
        lang={presentation.translation!.locale}
        dir={presentation.translation!.direction}
      >
        {presentation.translation!.content}
      </span>
      <span
        className="translation-original-inline"
        lang={presentation.original.locale}
        dir={presentation.original.direction}
      >
        {presentation.original.content}
      </span>
    </>
  );
}

function PostBodyPresentation({ presentation }: { presentation: ContentTranslationPresentation }) {
  if (presentation.selected === "original") {
    return (
      <div lang={presentation.original.locale} dir={presentation.original.direction}>
        <ForumMarkdown>{presentation.original.content}</ForumMarkdown>
      </div>
    );
  }
  return (
    <div className="post-translation-presentation">
      <TranslationToggle className="post-translation-toggle" />
      <div
        className="translation-current-block"
        lang={presentation.translation!.locale}
        dir={presentation.translation!.direction}
      >
        <ForumMarkdown>{presentation.translation!.content}</ForumMarkdown>
        <TranslationMetadata presentation={presentation} />
      </div>
      <div
        className="translation-original-block"
        lang={presentation.original.locale}
        dir={presentation.original.direction}
      >
        <ForumMarkdown>{presentation.original.content}</ForumMarkdown>
      </div>
    </div>
  );
}

function TranslationToggle({ className }: { className: string }) {
  const { t } = useTranslation("common");
  return (
    <details className={`translation-toggle ${className}`}>
      <summary>
        <span className="translation-label-show-original">{t("contentTranslationShowOriginal")}</span>
        <span className="translation-label-show-translation">{t("contentTranslationShowTranslation")}</span>
      </summary>
    </details>
  );
}

function TranslationMetadata({ presentation }: { presentation: ContentTranslationPresentation }) {
  const { t } = useTranslation("common");
  const provenance = presentation.translation?.provenance;
  if (!provenance) return null;
  return (
    <p className="translation-meta">
      {provenance.origin === "machine"
        ? t("contentTranslationMachine")
        : t("contentTranslationManual")}
      {provenance.attribution ? <> · <span>{provenance.attribution}</span></> : null}
    </p>
  );
}

export const ErrorBoundary = ForumRouteError;
