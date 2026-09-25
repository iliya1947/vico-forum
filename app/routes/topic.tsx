import { useEffect, useRef, useState } from "react";
import { Form, useActionData, useFetcher, useLoaderData, useRevalidator, type RouterContextProvider } from "react-router";
import { useTranslation } from "react-i18next";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationForRequest } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { forumCategoryPath, forumSectionPath } from "../forum/paths";
import { forumReaderForRequest } from "../forum/request-context";
import { PostBodyPresentation, TopicTitlePresentation } from "../forum/content-translation-view";
import {
  contentGenerationActionForRequest,
  contentGenerationStatusForRequest,
  contentTranslationPresentationForRequest,
  localeContext,
  registryForRequest,
} from "../localization/request-context";
import {
  buildContentGenerationView,
  type ContentGenerationViewUnit,
} from "../localization/content-generation-view.server";
import {
  CONTENT_GENERATION_MAX_POLLS_PER_HYDRATION,
  CONTENT_GENERATION_POLL_DELAY_MS,
  hasActiveTrackedGeneration,
  initialAutomaticGenerationQueue,
} from "../localization/content-generation-client";
import type { ContentGenerationActionResponse } from "../forum/actions.server";
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
  let canReply = false, canManageSolution = false, canCorrectTitleSourceLocale = false, canGenerateTranslation = false;
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
      correctablePostIds = sourceAny
        ? topic.posts.map((post) => post.id)
        : sourceOwn
          ? topic.posts.filter((post) => post.authorId === session.user.id).map((post) => post.id)
          : [];
      canGenerateTranslation = generation && contentGenerationActionForRequest(context).enabled;
    } catch (error) {
      if (!(error instanceof AuthorizationUnavailableError)) throw error;
      // Public topic reads remain available when optional presentation authorization is unavailable.
    }
  }
  const generationUnits = canGenerateTranslation
    ? await buildContentGenerationView(
        revisions,
        presentations,
        resolvedLocale.translationLocale,
        contentGenerationStatusForRequest(context),
      )
    : null;

  return {
    locale: resolvedLocale.translationLocale,
    topic,
    titlePresentation,
    postPresentations,
    generationUnits,
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
    titlePresentation,
    postPresentations,
    generationUnits,
    canReply,
    canManageSolution,
    canCorrectTitleSourceLocale,
    correctablePostIds,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<ForumMutationError | SourceLocaleCorrectionMutationError>();
  const correctablePosts = new Set(correctablePostIds);
  const presentedPosts = new Map(postPresentations.map((presentation) => [presentation.contentId, presentation]));
  const generationByContent = new Map(
    (generationUnits ?? []).map((unit) => [`${unit.contentType}:${unit.contentId}`, unit]),
  );
  const generationOrchestrator = useContentGenerationOrchestrator(generationUnits ?? []);
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
      <Breadcrumbs locale={locale} items={[
        { label: topic.section.category.name, to: forumCategoryPath(locale, topic.section.category.id) },
        { label: topic.section.name, to: forumSectionPath(locale, topic.section.id) },
        { label: titlePresentation.content },
      ]} />
      <section className="page-heading"><p className="eyebrow">{t("topicLabel")}</p><TopicTitlePresentation presentation={titlePresentation} /><p>{t("startedBy", { author: topic.authorName })}</p>
        {topic.isSolved && <strong className="solved-badge">{t("solved")}</strong>}
        {topic.bestAnswerPostId && <p><a href={`#post-${encodeURIComponent(topic.bestAnswerPostId)}`}>{t("goToSolution")}</a></p>}
        {canManageSolution && !topic.isSolved && <Form method="post"><input type="hidden" name="intent" value="markSolved" /><button type="submit">{t("markSolved")}</button></Form>}
        <ContentGenerationUnitUi
          unit={generationByContent.get(`topic-title:${topic.id}`)}
          transient={generationOrchestrator.feedback[generationByContent.get(`topic-title:${topic.id}`)?.key ?? ""]}
        />
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
          {topic.posts.map((post, index) => (
            <li id={`post-${post.id}`} className={`forum-post${topic.bestAnswerPostId === post.id ? " best-answer" : ""}`} key={post.id}>
              <header><strong>{post.authorName}</strong><span>{t("postNumber", { number: index + 1 })}</span></header>
              <div className="forum-post-content">
                {topic.bestAnswerPostId === post.id && <strong className="best-answer-label">{t("bestAnswer")}</strong>}
                <PostBodyPresentation presentation={presentedPosts.get(post.id)!} />
                <ContentGenerationUnitUi
                  unit={generationByContent.get(`post-body:${post.id}`)}
                  transient={generationOrchestrator.feedback[generationByContent.get(`post-body:${post.id}`)?.key ?? ""]}
                />
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



type GenerationTransientFeedback =
  | "requesting"
  | "queued"
  | "retry-later"
  | "unavailable"
  | "failed"
  | "explicit-required";

function useContentGenerationOrchestrator(units: readonly ContentGenerationViewUnit[]) {
  const fetcher = useFetcher<ContentGenerationActionResponse>();
  const revalidator = useRevalidator();
  const initial = useRef<{
    queue: ReturnType<typeof initialAutomaticGenerationQueue>;
    trackedKeys: ReadonlySet<string>;
  } | null>(null);
  if (!initial.current) {
    initial.current = {
      queue: initialAutomaticGenerationQueue(units),
      trackedKeys: new Set(units.map((unit) => unit.key)),
    };
  }

  const queueIndex = useRef(0);
  const inFlightKey = useRef<string | null>(null);
  const observedBusy = useRef(false);
  const queueStarted = useRef(false);
  const queueRevalidated = useRef(false);
  const pollCount = useRef(0);
  const [feedback, setFeedback] = useState<Record<string, GenerationTransientFeedback>>({});

  useEffect(() => {
    if (fetcher.state !== "idle") {
      observedBusy.current = true;
      return;
    }

    if (inFlightKey.current) {
      if (!observedBusy.current) return;
      const key = inFlightKey.current;
      observedBusy.current = false;
      inFlightKey.current = null;
      const result = fetcher.data;
      const nextFeedback: GenerationTransientFeedback = result?.outcome === "queued"
        ? "queued"
        : result?.outcome === "explicit-required"
          ? "explicit-required"
          : result?.outcome === "unavailable"
            ? "unavailable"
            : result?.outcome === "no-op" && result.reason === "request-budget-denied"
              ? "retry-later"
              : result?.outcome === "no-op"
                ? "queued"
                : "failed";
      setFeedback((current) => ({ ...current, [key]: nextFeedback }));
    }

    const next = initial.current?.queue[queueIndex.current];
    if (next) {
      queueIndex.current += 1;
      queueStarted.current = true;
      inFlightKey.current = next.key;
      setFeedback((current) => ({ ...current, [next.key]: "requesting" }));
      fetcher.submit(
        {
          intent: next.intent,
          ...(next.postId ? { postId: next.postId } : {}),
        },
        {
          method: "post",
          defaultShouldRevalidate: false,
        },
      );
      return;
    }

    if (queueStarted.current && !queueRevalidated.current) {
      queueRevalidated.current = true;
      void revalidator.revalidate();
    }
  }, [fetcher.state, fetcher.data, fetcher, revalidator]);

  const trackedKeys = initial.current.trackedKeys;
  const active = hasActiveTrackedGeneration(units, trackedKeys);
  useEffect(() => {
    if (
      !active
      || revalidator.state !== "idle"
      || pollCount.current >= CONTENT_GENERATION_MAX_POLLS_PER_HYDRATION
    ) return;

    const retrySeconds = units.reduce((maximum, unit) => (
      trackedKeys.has(unit.key) && unit.state === "deferred" && unit.retryAfterSeconds !== undefined
        ? Math.max(maximum, unit.retryAfterSeconds)
        : maximum
    ), 0);
    const delay = Math.max(
      CONTENT_GENERATION_POLL_DELAY_MS,
      Math.min(30_000, retrySeconds * 1_000),
    );
    const timer = window.setTimeout(() => {
      pollCount.current += 1;
      void revalidator.revalidate();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [active, revalidator, revalidator.state, trackedKeys, units]);

  return { feedback };
}

function ContentGenerationUnitUi({
  unit,
  transient,
}: {
  unit: ContentGenerationViewUnit | undefined;
  transient?: GenerationTransientFeedback;
}) {
  const { t } = useTranslation("common");
  const fetcher = useFetcher<ContentGenerationActionResponse>();
  if (!unit) return null;

  const explicitBusy = fetcher.state !== "idle";
  const explicitResult = fetcher.data;
  const feedback = explicitBusy
    ? "requesting"
    : explicitResult?.outcome === "queued"
      ? "queued"
      : explicitResult?.outcome === "unavailable"
        ? "unavailable"
        : explicitResult?.outcome === "no-op" && explicitResult.reason === "request-budget-denied"
          ? "retry-later"
          : explicitResult?.outcome === "no-op"
            ? "queued"
            : transient;

  const stateKey = feedback === "requesting"
    ? "translationGenerationRequesting"
    : feedback === "queued"
      ? "translationGenerationPending"
      : feedback === "retry-later"
        ? "translationGenerationDeferred"
        : feedback === "unavailable"
          ? "translationGenerationUnavailable"
          : feedback === "failed"
            ? "translationGenerationFailed"
            : feedback === "explicit-required"
              ? "translationGenerationExplicitRequired"
              : unit.state === "pending"
                ? "translationGenerationPending"
                : unit.state === "processing"
                  ? "translationGenerationProcessing"
                  : unit.state === "deferred"
                    ? "translationGenerationDeferred"
                    : unit.state === "failed"
                      ? "translationGenerationFailed"
                      : unit.state === "unavailable"
                        ? "translationGenerationUnavailable"
                        : unit.state === "current"
                          ? "translationGenerationCurrent"
                          : unit.explicitRequired
                            ? "translationGenerationExplicitRequired"
                            : null;

  return (
    <div className="translation-generation-ui">
      {stateKey && (
        <p role="status" aria-live="polite">
          {t(stateKey, {
            seconds: explicitResult?.outcome === "no-op"
              ? explicitResult.retryAfterSeconds
              : unit.retryAfterSeconds,
          })}
        </p>
      )}
      {unit.explicitRequired && unit.state === "idle" && (
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="generatePostBodyTranslationExplicit" />
          <input type="hidden" name="postId" value={unit.contentId} />
          <button type="submit" disabled={explicitBusy}>
            {t("translationGenerationExplicitAction")}
          </button>
        </fetcher.Form>
      )}
    </div>
  );
}

export const ErrorBoundary = ForumRouteError;
