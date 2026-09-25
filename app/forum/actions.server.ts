import { redirect, type RouterContextProvider } from "react-router";
import {
  forumMutationGuard,
  mutationFailure,
  requireForumPermission,
  requiredFormText,
  runForumMutation,
  runSourceLocaleCorrection,
  solutionScope,
  sourceLocaleCorrectionFailure,
  sourceLocaleCorrectionMutationGuard,
  sourceLocaleCorrectionScope,
} from "./mutations.server";
import { forumTopicPath } from "./paths";

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
  let formData: FormData;
  try { formData = await request.formData(); } catch { return mutationFailure("invalid", 400); }
  const intent = requiredFormText(formData, "intent") ?? "reply";
  const correctionIntent =
    intent === "correctTitleSourceLocale" || intent === "correctPostSourceLocale";
  const denied = correctionIntent
    ? sourceLocaleCorrectionMutationGuard(request, context)
    : forumMutationGuard(request, context);
  if (denied) return denied;
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
