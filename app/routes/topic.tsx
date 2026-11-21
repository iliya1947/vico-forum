import { forumReadLoader } from "../forum/read-availability.server";
import { data, useActionData, useLoaderData, type RouterContextProvider, type HeadersArgs } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { measureRestrictionsForPresentation } from "../measures/presentation.server";
import { authorizationForRequest } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { forumReaderForRequest } from "../forum/request-context";
import {
  contentGenerationActionForRequest,
  contentGenerationStatusReaderForRequest,
  contentTranslationPresentationForRequest,
  localeContext,
  registryForRequest,
} from "../localization/request-context";
import {
  buildContentGenerationView,
  unavailableContentGenerationView,
} from "../localization/content-generation-view";
import { ContentGenerationStatusStorageUnavailableError } from "../localization/content-generation-status";
import type { ContentTranslationPresentation } from "../localization/content-translation-presentation";
import type {
  ForumMutationError,
  PostEditConflictData,
  SourceLocaleCorrectionMutationError,
} from "../forum/mutations.server";
import type { ContentGenerationActionResponse } from "../localization/content-generation-response";
import { ForumRouteError } from "../forum/ui";
import { TopicView } from "../forum/views";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import type { ForumTopicReadState, ForumVisibleThreadPost } from "../../db/forum-repository";
import type { TopicWatchState } from "../forum/topic-watch-control";
import type { PersonalFilterState } from "../forum/personal-filter-control";
import { HELP_SOLUTIONS_SERVICE_SECTION_ID } from "../../db/forum-identifiers";
import { DELETED_USER_NAME } from "../../db/public-identity";

export { topicAction as action } from "../forum/actions.server";

/** React Router does not forward loader/action cache headers to document or
 * single-fetch responses without this route-module headers export.
 * Public topic/404 responses must not be cached; preserve private action
 * policies, retry advice and unrelated parent headers. */
export function headers({ parentHeaders, loaderHeaders, actionHeaders, errorHeaders }: HeadersArgs): Headers {
  const result = new Headers(parentHeaders);
  // A hidden topic becomes 404 immediately; neither its previous public
  // document nor the neutral negative response may be cached.
  const cachePolicy = errorHeaders?.get("Cache-Control")
    ?? actionHeaders.get("Cache-Control") ?? loaderHeaders.get("Cache-Control");
  result.set("Cache-Control", cachePolicy?.split(",").some((part) => part.trim().toLowerCase() === "no-store")
    ? cachePolicy : "no-store");
  const retry = errorHeaders?.get("Retry-After")
    ?? actionHeaders.get("Retry-After") ?? loaderHeaders.get("Retry-After");
  if (retry !== null) result.set("Retry-After", retry);
  return result;
}

export const loader = forumReadLoader(async function loader({ params, context }: {
  params: { locale?: string; topicId?: string };
  context: RouterContextProvider;
}) {
  const loaded = await forumReaderForRequest(context).readTopicPage(params.topicId ?? "");
  if (!loaded) throw new Response("Not Found", { status: 404 });
  // The repository already projects deleted authors; mask again at the public route boundary.
  const topic = loaded.authorIdentityKind === "deleted"
    || loaded.posts.some((post) => post.kind !== "hidden" && post.authorIdentityKind === "deleted")
    ? {
        ...loaded,
        authorName: loaded.authorIdentityKind === "deleted" ? DELETED_USER_NAME : loaded.authorName,
        posts: loaded.posts.map((post) => post.kind !== "hidden" && post.authorIdentityKind === "deleted"
          ? { ...post, authorName: DELETED_USER_NAME, authorImage: null } : post),
      }
    : loaded;

  const visiblePosts = topic.posts.filter((post): post is ForumVisibleThreadPost => post.kind !== "hidden");
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
    // Attachment-only posts have no text translation unit. Keep them out of
    // both translation lookup and generation planning, which require text.
    ...visiblePosts.filter((post) => post.body.originalContent.trim().length > 0).map((post) => ({
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
  const textPostPresentations = new Map(presentations.slice(1).map((item) => [item.contentId, item]));
  const postPresentations = visiblePosts.map((post): ContentTranslationPresentation => {
    const text = textPostPresentations.get(post.id);
    if (text) return text;
    const originalLocale = post.body.sourceLocale === "und" ? undefined : post.body.sourceLocale;
    const originalDirection = originalLocale
      ? loadedRegistry.registry.find(originalLocale)?.locale.direction ?? "auto" : "auto";
    return {
      contentType: "post-body", contentId: post.id, revisionId: post.body.id,
      selected: "original", content: post.body.originalContent,
      contentLocale: originalLocale, contentDirection: originalDirection,
      originalContent: post.body.originalContent, originalLocale, originalDirection,
    };
  });

  const session = authSessionForRequest(context);
  let canReply = false, canManageSolution = false, canModerateHelpSolution = false;
  let canManageHelpDuplicate = false;
  let canConfirmOwnSolution = false;
  let canCorrectTitleSourceLocale = false, canManagePin = false, canManageClosure = false, canGenerateTranslations = false;
  let canUseAdminPanel = false, canManageAnySolution = false, canCorrectAnySourceLocale = false;
  let correctablePostIds: string[] = [];
  let editablePostIds: string[] = [];
  let canReadPostHistory = false;
  let canEditOwnTitle = false;
  let canSubmitComplaint = false;
  let canUploadAttachments = false;
  let topicReadState: ForumTopicReadState | null = null;
  let topicWatchState: TopicWatchState | null = null;
  let topicBookmarkState: TopicWatchState | null = null;
  let topicMuteState: PersonalFilterState | null = null;
  let blockedAuthorIds: string[] = [];
  if (session) {
    // Block matches are mandatory private presentation state, not an optional control.
    try {
      blockedAuthorIds = await forumReaderForRequest(context).readTopicBlockedAuthors(session.user.id, topic.id);
    } catch (error) {
      if (!(error instanceof ForumStorageUnavailableError)) throw error;
      throw new Response("Personal filters unavailable", { status: 503,
        headers: { "Cache-Control": "private, no-store", "Retry-After": "60" } });
    }
    try {
      topicMuteState = await forumReaderForRequest(context).readTopicMute(session.user.id, topic.id) ? "on" : "off";
    } catch (error) {
      if (!(error instanceof ForumStorageUnavailableError)) throw error;
      topicMuteState = "unavailable";
    }
    try {
      topicBookmarkState = await forumReaderForRequest(context).readTopicBookmark(session.user.id, topic.id) ? "on" : "off";
    } catch (error) {
      if (!(error instanceof ForumStorageUnavailableError)) throw error;
      topicBookmarkState = "unavailable";
    }
    try {
      topicWatchState = await forumReaderForRequest(context).readTopicWatch(session.user.id, topic.id) ? "on" : "off";
    } catch (error) {
      if (!(error instanceof ForumStorageUnavailableError)) throw error;
      topicWatchState = "unavailable";
    }

    try {
      topicReadState = await forumReaderForRequest(context).readTopicReadState(session.user.id, topic.id) ?? null;
    } catch (error) {
      if (!(error instanceof ForumStorageUnavailableError)) throw error;
    }

    try {
      const resolver = authorizationForRequest(context).forUser(session.user.id);
      const [reply, solutionAny, solutionOwn, duplicateManage, sourceAny, sourceOwn, generate, pin, closure, editOwn, historyRead, complaintCreate, titleEditOwn] = await Promise.all([
        resolver.has("forum.reply.create"),
        resolver.has("forum.solution.manageAny"),
        resolver.has("forum.solution.manageOwn"),
        resolver.has("forum.helpDuplicate.manage"),
        resolver.has("forum.sourceLocale.correctAny"),
        resolver.has("forum.sourceLocale.correctOwn"),
        resolver.has("forum.translation.generate"),
        resolver.has("forum.topic.pin"),
        resolver.has("forum.topic.close"),
        resolver.has("forum.post.editOwn"),
        resolver.has("forum.post.history.read"),
        resolver.has("forum.complaint.create"),
        resolver.has("forum.topic.title.editOwn"),
      ]);
      canReply = reply;
      canEditOwnTitle = titleEditOwn && topic.authorId === session.user.id;
      editablePostIds = editOwn ? visiblePosts.filter((post) => post.authorId === session.user.id).map((post) => post.id) : [];
      canReadPostHistory = historyRead;
      canSubmitComplaint = complaintCreate;
      canManageSolution = solutionAny || (solutionOwn && session.user.id === topic.authorId);
      canConfirmOwnSolution = solutionOwn && session.user.id === topic.authorId;
      canManageAnySolution = solutionAny;
      canModerateHelpSolution = solutionAny && topic.section.id === HELP_SOLUTIONS_SERVICE_SECTION_ID;
      canManageHelpDuplicate = duplicateManage && topic.section.id === HELP_SOLUTIONS_SERVICE_SECTION_ID;
      canCorrectTitleSourceLocale = sourceAny || (sourceOwn && session.user.id === topic.authorId);
      canCorrectAnySourceLocale = sourceAny;
      canGenerateTranslations = generate && contentGenerationActionForRequest(context).enabled;
      canManagePin = pin;
      canManageClosure = closure;
      canUseAdminPanel = solutionAny || canManageHelpDuplicate || sourceAny || pin || closure;
      correctablePostIds = sourceAny
        ? visiblePosts.map((post) => post.id)
        : sourceOwn
          ? visiblePosts.filter((post) => post.authorId === session.user.id).map((post) => post.id)
          : [];
    } catch (error) {
      if (!(error instanceof AuthorizationUnavailableError)) throw error;
      // Public topic reads remain available when optional presentation authorization is unavailable.
    }
    const restricted=await measureRestrictionsForPresentation(context,session.user.id);
    canReply=canReply && !restricted.has("replies.create");
    canSubmitComplaint=canSubmitComplaint && !restricted.has("complaints.submit");
    canGenerateTranslations=canGenerateTranslations && !restricted.has("translations.generate");
    if(restricted.has("posts.edit"))editablePostIds=[];
    if (restricted.has("posts.edit")) canEditOwnTitle = false;
    canUploadAttachments=!restricted.has("attachments.upload");
  }

  let pendingDuplicateAppeal: {
    id: string;
    relationshipId: string;
    explanation: string;
    createdAt: string;
  } | null = null;
  if (
    session
    && topic.duplicateOf
    && (session.user.id === topic.authorId || canManageHelpDuplicate)
  ) {
    try {
      const appeal = await forumReaderForRequest(context).readPendingHelpDuplicateAppeal(topic.id);
      if (appeal) {
        pendingDuplicateAppeal = {
          ...appeal,
          createdAt: appeal.createdAt.toISOString(),
        };
      }
    } catch (error) {
      if (!(error instanceof ForumStorageUnavailableError)) throw error;
      // Optional private appeal details may degrade without blocking the public topic read.
    }
  }

  let generationUnits = [] as ReturnType<typeof buildContentGenerationView>;
  if (canGenerateTranslations) {
    try {
      const statuses = await contentGenerationStatusReaderForRequest(context).readCurrent(
        revisions,
        resolvedLocale.translationLocale,
      );
      generationUnits = buildContentGenerationView(
        revisions,
        presentations,
        statuses,
        resolvedLocale.translationLocale,
      );
    } catch (error) {
      if (!(error instanceof ContentGenerationStatusStorageUnavailableError)) throw error;
      generationUnits = unavailableContentGenerationView(
        revisions,
        resolvedLocale.translationLocale,
      );
    }
  }

  const page = {
    locale: resolvedLocale.translationLocale,
    watchActorId: session?.user.id ?? null,
    topicWatchState,
    bookmarkActorId: session?.user.id ?? null,
    topicBookmarkState,
    muteActorId: session?.user.id ?? null,
    topicMuteState,
    blockedActorId: session?.user.id ?? null,
    blockedAuthorIds,
    topic: !canManageHelpDuplicate && topic.duplicateRelationshipId
      ? { ...topic, duplicateRelationshipId: null }
      : topic,
    titlePresentation,
    postPresentations,
    generationUnits,
    canReply,
    canUploadAttachments,
    canManageSolution,
    canConfirmOwnSolution,
    canManageAnySolution,
    canModerateHelpSolution,
    canManageHelpDuplicate,
    pendingDuplicateAppeal,
    isTopicAuthor: Boolean(session && session.user.id === topic.authorId),
    appealExpectedRelationshipId: session?.user.id === topic.authorId
      ? topic.duplicateRelationshipId ?? null : null,
    canCorrectTitleSourceLocale,
    canCorrectAnySourceLocale,
    canManagePin,
    canManageClosure,
    canUseAdminPanel,
    correctablePostIds,
    editablePostIds,
    canEditOwnTitle,
    canReadPostHistory,
    canSubmitComplaint,
    topicReadState,
  };
  return data(page, { headers: { "Cache-Control": session ? "private, no-store" : "no-store" } });
});

export default function TopicRoute() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<PostEditConflictData | ForumMutationError | SourceLocaleCorrectionMutationError | ContentGenerationActionResponse>();
  return <TopicView {...data} actionData={actionData} />;
}

export const ErrorBoundary = ForumRouteError;

export { editorClientAction as clientAction } from "../forum/editor-action";
