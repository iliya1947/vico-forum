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

export async function sectionAction({ request, params, context }: {
  request: Request;
  params: { locale?: string; sectionId?: string };
  context: RouterContextProvider;
}) {
  const sectionId = typeof params.sectionId === "string" && params.sectionId.trim() ? params.sectionId : undefined;
  const locale = typeof params.locale === "string" && params.locale.trim() ? params.locale : undefined;
  if (!sectionId || !locale) return mutationFailure("invalid", 400);
  const denied = forumMutationGuard(request, context);
  if (denied) return denied;
  const forbidden = await requireForumPermission(context, "forum.topic.create");
  if (forbidden) return forbidden;
  let formData: FormData;
  try { formData = await request.formData(); } catch { return mutationFailure("invalid", 400); }
  const title = requiredFormText(formData, "title");
  const body = requiredFormText(formData, "body");
  if (!title || !body) return mutationFailure("invalid", 400);
  return runForumMutation(request, context, async (writer, authorId) => {
    const created = await writer.createTopic({ sectionId, authorId, title, body });
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
      const revision = {
        contentType: "post-body" as const,
        contentId: post.id,
        revisionId: post.body.id,
        originalContent: post.body.originalContent,
        sourceLocale: post.body.sourceLocale,
      };
      const result = intent === "generateExplicitPostBodyTranslation"
        ? await runtime.capability.generateExplicitPostBody({
            actorId: session.user.id,
            revision,
            targetLocale,
          })
        : await runtime.capability.generateAutomaticPostBody({
            actorId: session.user.id,
            revision,
            targetLocale,
          });
      return generationResult(result);
    } catch (error) {
      if (error instanceof ContentGenerationPlanningUnavailableError) {
        return generationFailure("unavailable", 503);
      }
      throw error;
    }
  }
  if (intent === "markSolved") {
    const authorization = await solutionScope(context);
    if ("error" in authorization) return authorization.error;
    return runForumMutation(request, context, async (writer, actorId) => {
      await writer.markTopicSolved({ topicId, actorId, scope: authorization.scope });
      return redirect(forumTopicPath(locale, topicId));
    });
  }
  if (intent === "selectBestAnswer") {
    const postId = requiredFormText(formData, "postId");
    if (!postId) return mutationFailure("invalid", 400);
    const authorization = await solutionScope(context);
    if ("error" in authorization) return authorization.error;
    return runForumMutation(request, context, async (writer, actorId) => {
      await writer.selectBestAnswer({ topicId, postId, actorId, scope: authorization.scope });
      return redirect(`${forumTopicPath(locale, topicId)}#post-${encodeURIComponent(postId)}`);
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
  return runForumMutation(request, context, async (writer, authorId) => {
    await writer.createReply({ topicId, authorId, body });
    return redirect(forumTopicPath(locale, topicId));
  });
}


export type ContentGenerationActionResponse =
  | { readonly operation: "contentGeneration"; readonly outcome: "queued" }
  | {
      readonly operation: "contentGeneration";
      readonly outcome: "no-op";
      readonly reason: string;
      readonly retryAfterSeconds?: number;
    }
  | { readonly operation: "contentGeneration"; readonly outcome: "explicit-required" }
  | { readonly operation: "contentGeneration"; readonly outcome: "invalid" | "not-found" | "unavailable" };

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
        {
          operation: "contentGeneration",
          outcome: "no-op",
          reason: "request-budget-denied",
          retryAfterSeconds: result.retryAfterSeconds,
        },
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
