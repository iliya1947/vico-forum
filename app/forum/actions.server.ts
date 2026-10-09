import { data, redirect, type RouterContextProvider } from "react-router";
import {
  forumMutationGuard,
  mutationFailure,
  requireForumPermission,
  requiredFormText,
  runForumMutation,
  runSourceLocaleCorrection,
  solutionScope,
  sourceLocaleCorrectionFailure,
  sourceLocaleCorrectionScope,
  type HelpQuestionDraft,
  type HelpSimilarQuestionsActionData,
} from "./mutations.server";
import { forumTopicPath } from "./paths";
import { authSessionForRequest } from "../auth/request-context";
import { forumReaderForRequest } from "./request-context";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import {
  ContentGenerationPlanningUnavailableError,
  type ContentGenerationActionResult,
} from "../localization/content-generation-action.server";
import {
  contentGenerationActionForRequest,
  localeContext,
} from "../localization/request-context";
import type { ContentGenerationActionResponse } from "../localization/content-generation-response";
import {
  HELP_SOLUTIONS_CATEGORY_ID,
  HELP_SOLUTIONS_SERVICE_SECTION_ID,
} from "../../db/forum-identifiers";

export async function helpSolutionsCategoryAction({ request, params, context }: {
  request: Request;
  params: { locale?: string; categoryId?: string };
  context: RouterContextProvider;
}) {
  const categoryId = typeof params.categoryId === "string" && params.categoryId.trim()
    ? params.categoryId
    : undefined;
  const locale = typeof params.locale === "string" && params.locale.trim() ? params.locale : undefined;
  if (!categoryId || !locale) return mutationFailure("invalid", 400);
  if (categoryId !== HELP_SOLUTIONS_CATEGORY_ID) return mutationFailure("notFound", 404);
  const denied = forumMutationGuard(request, context);
  if (denied) return denied;
  const forbidden = await requireForumPermission(context, "forum.topic.create");
  if (forbidden) return forbidden;
  let formData: FormData;
  try { formData = await request.formData(); } catch { return mutationFailure("invalid", 400); }
  const intent = requiredFormText(formData, "intent");
  const draft = helpQuestionDraft(formData);

  if (intent === "checkSimilarHelpQuestions") {
    const normalizedTitle = draft.title.normalize("NFKC").trim().replace(/\s+/gu, " ");
    if (!normalizedTitle || normalizedTitle.length > 200) {
      return helpSimilarQuestionsResult("invalid", draft, [], 400);
    }
    try {
      const results = await forumReaderForRequest(context).searchHelpSolutionsSimilar(normalizedTitle, 5);
      return helpSimilarQuestionsResult(results.length > 0 ? "results" : "empty", draft, results, 200);
    } catch (error) {
      if (error instanceof ForumStorageUnavailableError) {
        return helpSimilarQuestionsResult("unavailable", draft, [], 503);
      }
      if (error instanceof RangeError) {
        return helpSimilarQuestionsResult("invalid", draft, [], 400);
      }
      throw error;
    }
  }

  if (intent !== "createHelpQuestion") return mutationFailure("invalid", 400);
  const title = requiredFormText(formData, "title");
  const body = requiredFormText(formData, "body");
  if (!title || !body) return mutationFailure("invalid", 400);
  const tags = draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
  return runForumMutation(request, context, async (writer, authorId) => {
    const created = await writer.createTopic({
      sectionId: HELP_SOLUTIONS_SERVICE_SECTION_ID,
      authorId,
      title,
      body,
      tags,
    });
    return redirect(forumTopicPath(locale, created.topicId));
  });
}

function helpQuestionDraft(formData: FormData): HelpQuestionDraft {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };
  return {
    title: text("title"),
    body: text("body"),
    tags: text("tags"),
  };
}

function helpSimilarQuestionsResult(
  outcome: HelpSimilarQuestionsActionData["outcome"],
  draft: HelpQuestionDraft,
  results: HelpSimilarQuestionsActionData["results"],
  status: number,
) {
  return data<HelpSimilarQuestionsActionData>(
    { operation: "helpSimilarQuestions", outcome, draft, results },
    { status },
  );
}

export async function sectionAction({ request, params, context }: {
  request: Request;
  params: { locale?: string; sectionId?: string };
  context: RouterContextProvider;
}) {
  const sectionId = typeof params.sectionId === "string" && params.sectionId.trim() ? params.sectionId : undefined;
  const locale = typeof params.locale === "string" && params.locale.trim() ? params.locale : undefined;
  if (!sectionId || !locale) return mutationFailure("invalid", 400);
  if (sectionId === HELP_SOLUTIONS_SERVICE_SECTION_ID) return mutationFailure("notFound", 404);
  const denied = forumMutationGuard(request, context);
  if (denied) return denied;
  const forbidden = await requireForumPermission(context, "forum.topic.create");
  if (forbidden) return forbidden;
  let formData: FormData;
  try { formData = await request.formData(); } catch { return mutationFailure("invalid", 400); }
  const title = requiredFormText(formData, "title");
  const body = requiredFormText(formData, "body");
  if (!title || !body) return mutationFailure("invalid", 400);
  const rawTags = formData.get("tags");
  const tags = typeof rawTags === "string"
    ? rawTags.split(",").map((tag) => tag.trim()).filter(Boolean)
    : [];
  return runForumMutation(request, context, async (writer, authorId) => {
    const created = await writer.createTopic({ sectionId, authorId, title, body, tags });
    return redirect(forumTopicPath(locale, created.topicId));
  });
}

export async function topicAction({ request, params, context }: {
  request: Request;
  params: { locale?: string; topicId?: string };
  context: RouterContextProvider;
}) {
  const topicId = typeof params.topicId === "string" && params.topicId.trim() ? params.topicId : undefined;
  const locale = typeof params.locale === "string" && params.locale.trim() ? params.locale : undefined;
  if (!topicId || !locale) return mutationFailure("invalid", 400);
  const denied = forumMutationGuard(request, context);
  if (denied) return denied;
  let formData: FormData;
  try { formData = await request.formData(); } catch { return mutationFailure("invalid", 400); }
  const intent = requiredFormText(formData, "intent") ?? "reply";
  if (intent === "pinTopic" || intent === "unpinTopic") {
    const forbidden = await requireForumPermission(context, "forum.topic.pin");
    if (forbidden) return forbidden;
    return runForumMutation(request, context, async (writer, actorId) => {
      if (intent === "pinTopic") await writer.pinTopic({ topicId, actorId });
      else await writer.unpinTopic({ topicId, actorId });
      return redirect(forumTopicPath(locale, topicId));
    });
  }
  if (intent === "markTopicRead") {
    const postId = requiredFormText(formData, "postId");
    if (!postId) return mutationFailure("invalid", 400);
    return runForumMutation(request, context, async (writer, userId) => {
      await writer.advanceTopicReadState({ userId, topicId, postId });
      return data({ ok: true }, { status: 200 });
    });
  }
  if (
    intent === "generateTopicTitleTranslation"
    || intent === "generatePostBodyTranslation"
    || intent === "generateExplicitPostBodyTranslation"
  ) {
    const forbidden = await requireForumPermission(context, "forum.translation.generate");
    if (forbidden) return forbidden;

    const runtime = contentGenerationActionForRequest(context);
    if (!runtime.enabled) return generationFailure("unavailable", 503);

    const session = authSessionForRequest(context);
    if (!session) return mutationFailure("unauthenticated", 401);

    let topic;
    try {
      topic = await forumReaderForRequest(context).readTopicPage(topicId);
    } catch (error) {
      if (error instanceof ForumStorageUnavailableError) {
        return generationFailure("unavailable", 503);
      }
      throw error;
    }
    if (!topic) return generationFailure("not-found", 404);

    const targetLocale = context.get(localeContext).translationLocale;
    try {
      if (intent === "generateTopicTitleTranslation") {
        return generationResult(await runtime.capability.generateTopicTitle({
          actorId: session.user.id,
          revision: {
            contentType: "topic-title",
            contentId: topic.id,
            revisionId: topic.title.id,
            originalContent: topic.title.originalContent,
            sourceLocale: topic.title.sourceLocale,
          },
          targetLocale,
        }));
      }

      const postId = requiredFormText(formData, "postId");
      if (!postId) return generationFailure("invalid", 400);
      const post = topic.posts.find((candidate) => candidate.id === postId);
      if (!post) return generationFailure("not-found", 404);
      const input = {
        actorId: session.user.id,
        revision: {
          contentType: "post-body" as const,
          contentId: post.id,
          revisionId: post.body.id,
          originalContent: post.body.originalContent,
          sourceLocale: post.body.sourceLocale,
        },
        targetLocale,
      };
      return generationResult(
        intent === "generateExplicitPostBodyTranslation"
          ? await runtime.capability.generateExplicitPostBody(input)
          : await runtime.capability.generateAutomaticPostBody(input),
      );
    } catch (error) {
      if (error instanceof ContentGenerationPlanningUnavailableError) {
        return generationFailure("unavailable", 503);
      }
      throw error;
    }
  }
  if (intent === "submitHelpSignal") {
    const kind = requiredFormText(formData, "kind");
    if (
      kind !== "needs-details"
      && kind !== "needs-review"
      && kind !== "solution-outdated"
      && kind !== "duplicate"
    ) {
      return mutationFailure("invalid", 400);
    }
    const forbidden = await requireForumPermission(context, "forum.helpSignal.create");
    if (forbidden) return forbidden;
    const explanation = requiredFormText(formData, "explanation");
    const proposedOriginalTopicId = requiredFormText(formData, "proposedOriginalTopicId");
    return runForumMutation(request, context, async (writer, actorId) => {
      await writer.createHelpSignal({
        kind,
        topicId,
        actorId,
        explanation,
        proposedOriginalTopicId,
      });
      return redirect(forumTopicPath(locale, topicId));
    });
  }
  if (intent === "withdrawHelpSignal") {
    const signalId = requiredFormText(formData, "signalId");
    if (!signalId) return mutationFailure("invalid", 400);
    return runForumMutation(request, context, async (writer, actorId) => {
      await writer.withdrawHelpSignal({ signalId, actorId });
      return redirect(forumTopicPath(locale, topicId));
    });
  }
  if (intent === "acceptHelpSignal" || intent === "rejectHelpSignal") {
    const signalId = requiredFormText(formData, "signalId");
    if (!signalId) return mutationFailure("invalid", 400);
    let signal;
    try {
      signal = await forumReaderForRequest(context).readHelpSignal(signalId);
    } catch (error) {
      if (error instanceof ForumStorageUnavailableError) return mutationFailure("unavailable", 503);
      throw error;
    }
    if (!signal || signal.topicId !== topicId) return mutationFailure("notFound", 404);
    const permission = signal.kind === "needs-details"
      ? "forum.helpNeedsDetails.manage"
      : signal.kind === "duplicate"
        ? "forum.helpDuplicate.manage"
        : "forum.solution.manageAny";
    const forbidden = await requireForumPermission(context, permission);
    if (forbidden) return forbidden;
    return runForumMutation(request, context, async (writer, actorId) => {
      await writer.resolveHelpSignal({
        signalId,
        actorId,
        resolution: intent === "acceptHelpSignal" ? "accepted" : "rejected",
      });
      return redirect(forumTopicPath(locale, topicId));
    });
  }

  if (intent === "confirmHelpDuplicate") {
    const originalTopicId = requiredFormText(formData, "originalTopicId");
    if (!originalTopicId) return mutationFailure("invalid", 400);
    const forbidden = await requireForumPermission(context, "forum.helpDuplicate.manage");
    if (forbidden) return forbidden;
    return runForumMutation(request, context, async (writer, actorId) => {
      await writer.confirmHelpDuplicate({ topicId, originalTopicId, actorId });
      return redirect(forumTopicPath(locale, topicId));
    });
  }
  if (intent === "removeHelpDuplicate") {
    const forbidden = await requireForumPermission(context, "forum.helpDuplicate.manage");
    if (forbidden) return forbidden;
    return runForumMutation(request, context, async (writer, actorId) => {
      await writer.removeHelpDuplicate({ topicId, actorId });
      return redirect(forumTopicPath(locale, topicId));
    });
  }
  if (intent === "appealHelpDuplicate") {
    const explanation = requiredFormText(formData, "explanation");
    if (!explanation) return mutationFailure("invalid", 400);
    return runForumMutation(request, context, async (writer, actorId) => {
      await writer.appealHelpDuplicate({ topicId, actorId, explanation });
      return redirect(forumTopicPath(locale, topicId));
    });
  }
  if (intent === "acceptHelpDuplicateAppeal" || intent === "rejectHelpDuplicateAppeal") {
    const forbidden = await requireForumPermission(context, "forum.helpDuplicate.manage");
    if (forbidden) return forbidden;
    return runForumMutation(request, context, async (writer, actorId) => {
      await writer.resolveHelpDuplicateAppeal({
        topicId,
        actorId,
        resolution: intent === "acceptHelpDuplicateAppeal" ? "accepted" : "rejected",
      });
      return redirect(forumTopicPath(locale, topicId));
    });
  }
  if (intent === "markSolved") {
    const authorization = await solutionScope(context);
    if ("error" in authorization) return authorization.error;
    return runForumMutation(request, context, async (writer, actorId) => {
      await writer.markTopicSolved({ topicId, actorId, scope: authorization.scope });
      return redirect(forumTopicPath(locale, topicId));
    });
  }
  if (
    intent === "markSolutionNeedsReview"
    || intent === "markSolutionOutdated"
    || intent === "clearSolutionModeration"
  ) {
    const forbidden = await requireForumPermission(context, "forum.solution.manageAny");
    if (forbidden) return forbidden;
    const outdatedReason = intent === "markSolutionOutdated"
      ? requiredFormText(formData, "outdatedReason")
      : undefined;
    if (intent === "markSolutionOutdated" && !outdatedReason) {
      return mutationFailure("invalid", 400);
    }
    return runForumMutation(request, context, async (writer) => {
      await writer.setHelpSolutionModeration({
        topicId,
        status: intent === "markSolutionNeedsReview"
          ? "needs-review"
          : intent === "markSolutionOutdated"
            ? "outdated"
            : null,
        outdatedReason: outdatedReason ?? null,
      });
      return redirect(forumTopicPath(locale, topicId));
    });
  }
  if (intent === "selectBestAnswer") {
    const postId = requiredFormText(formData, "postId");
    if (!postId) return mutationFailure("invalid", 400);
    const authorization = await solutionScope(context);
    if ("error" in authorization) return authorization.error;
    return runForumMutation(request, context, async (writer, actorId) => {
      const selection = await writer.selectBestAnswer({ topicId, postId, actorId, scope: authorization.scope });
      const shouldPromptSolvedConfirmation = !selection.isSolved && selection.topicAuthorId === actorId;
      if (!shouldPromptSolvedConfirmation) {
        return redirect(`${forumTopicPath(locale, topicId)}#post-${encodeURIComponent(postId)}`);
      }
      const solutionPrompt = new URLSearchParams({ solutionPrompt: postId });
      return redirect(`${forumTopicPath(locale, topicId)}?${solutionPrompt.toString()}#solution-confirmation`);
    });
  }
  if (intent === "correctTitleSourceLocale") {
    const expectedRevisionId = requiredFormText(formData, "expectedRevisionId");
    const sourceLocale = requiredFormText(formData, "sourceLocale");
    if (!expectedRevisionId || !sourceLocale) return sourceLocaleCorrectionFailure("invalid", 400);
    const authorization = await sourceLocaleCorrectionScope(context);
    if ("error" in authorization) return authorization.error;
    return runSourceLocaleCorrection(request, context, async (writer, actorId) => {
      await writer.correctTopicTitleSourceLocale({
        topicId,
        expectedRevisionId,
        sourceLocale,
        actorId,
        scope: authorization.scope,
      });
      return redirect(forumTopicPath(locale, topicId));
    });
  }
  if (intent === "correctPostSourceLocale") {
    const postId = requiredFormText(formData, "postId");
    const expectedRevisionId = requiredFormText(formData, "expectedRevisionId");
    const sourceLocale = requiredFormText(formData, "sourceLocale");
    if (!postId || !expectedRevisionId || !sourceLocale) return sourceLocaleCorrectionFailure("invalid", 400);
    const authorization = await sourceLocaleCorrectionScope(context);
    if ("error" in authorization) return authorization.error;
    return runSourceLocaleCorrection(request, context, async (writer, actorId) => {
      await writer.correctPostBodySourceLocale({
        topicId,
        postId,
        expectedRevisionId,
        sourceLocale,
        actorId,
        scope: authorization.scope,
      });
      return redirect(forumTopicPath(locale, topicId) + "#post-" + encodeURIComponent(postId));
    });
  }
  if (intent !== "reply") return mutationFailure("invalid", 400);
  const forbidden = await requireForumPermission(context, "forum.reply.create");
  if (forbidden) return forbidden;
  const body = requiredFormText(formData, "body");
  if (!body) return mutationFailure("invalid", 400);
  const rawParentPostId = formData.get("parentPostId");
  const parentPostId = typeof rawParentPostId === "string" && rawParentPostId.trim()
    ? rawParentPostId.trim()
    : null;
  return runForumMutation(request, context, async (writer, authorId) => {
    const created = await writer.createReply({ topicId, authorId, body, parentPostId });
    return redirect(forumTopicPath(locale, topicId) + "#post-" + encodeURIComponent(created.postId));
  });
}


function generationResult(result: ContentGenerationActionResult) {
  switch (result.outcome) {
    case "queued":
      return data<ContentGenerationActionResponse>(
        { operation: "contentGeneration", outcome: "queued" },
        { status: 202 },
      );
    case "no-op":
      return data<ContentGenerationActionResponse>(
        { operation: "contentGeneration", outcome: "no-op", reason: result.reason },
        { status: 200 },
      );
    case "explicit-required":
      return data<ContentGenerationActionResponse>(
        { operation: "contentGeneration", outcome: "explicit-required" },
        { status: 200 },
      );
    case "budget-denied":
      return data<ContentGenerationActionResponse>(
        { operation: "contentGeneration", outcome: "no-op", reason: "request-budget-denied", retryAfterSeconds: result.retryAfterSeconds },
        {
          status: 429,
          headers: { "Retry-After": String(result.retryAfterSeconds) },
        },
      );
  }
}

function generationFailure(
  outcome: "invalid" | "not-found" | "unavailable",
  status: number,
) {
  return data<ContentGenerationActionResponse>(
    { operation: "contentGeneration", outcome },
    { status },
  );
}
