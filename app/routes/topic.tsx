import { useActionData, useLoaderData, type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
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
import type {
  ForumMutationError,
  SourceLocaleCorrectionMutationError,
} from "../forum/mutations.server";
import type { ContentGenerationActionResponse } from "../localization/content-generation-response";
import { ForumRouteError } from "../forum/ui";
import { TopicView } from "../forum/views";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import type {
  ForumPendingHelpSignal,
  ForumReviewableHelpSignal,
  ForumTopicReadState,
  HelpSignalKind,
} from "../../db/forum-repository";
import { HELP_SOLUTIONS_SERVICE_SECTION_ID } from "../../db/forum-identifiers";

export { topicAction as action } from "../forum/actions.server";

export async function loader({ params, context }: {
  params: { locale?: string; topicId?: string };
  context: RouterContextProvider;
}) {
  const forumReader = forumReaderForRequest(context);
  const topic = await forumReader.readTopicPage(params.topicId ?? "");
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
  let canReply = false, canManageSolution = false, canModerateHelpSolution = false;
  let canManageHelpDuplicate = false, canManageHelpNeedsDetails = false, canCreateHelpSignal = false;
  let canCorrectTitleSourceLocale = false, canManagePin = false, canGenerateTranslations = false;
  let canUseAdminPanel = false, canManageAnySolution = false, canCorrectAnySourceLocale = false;
  let correctablePostIds: string[] = [];
  let topicReadState: ForumTopicReadState | null = null;
  if (session) {
    try {
      topicReadState = await forumReader.readTopicReadState(session.user.id, topic.id) ?? null;
    } catch (error) {
      if (!(error instanceof ForumStorageUnavailableError)) throw error;
    }

    try {
      const resolver = authorizationForRequest(context).forUser(session.user.id);
      const [
        reply,
        solutionAny,
        solutionOwn,
        duplicateManage,
        needsDetailsManage,
        signalCreate,
        sourceAny,
        sourceOwn,
        generate,
        pin,
      ] = await Promise.all([
        resolver.has("forum.reply.create"),
        resolver.has("forum.solution.manageAny"),
        resolver.has("forum.solution.manageOwn"),
        resolver.has("forum.helpDuplicate.manage"),
        resolver.has("forum.helpNeedsDetails.manage"),
        resolver.has("forum.helpSignal.create"),
        resolver.has("forum.sourceLocale.correctAny"),
        resolver.has("forum.sourceLocale.correctOwn"),
        resolver.has("forum.translation.generate"),
        resolver.has("forum.topic.pin"),
      ]);
      canReply = reply;
      canManageSolution = solutionAny || (solutionOwn && session.user.id === topic.authorId);
      canManageAnySolution = solutionAny;
      canModerateHelpSolution = solutionAny && topic.section.id === HELP_SOLUTIONS_SERVICE_SECTION_ID;
      canManageHelpDuplicate = duplicateManage && topic.section.id === HELP_SOLUTIONS_SERVICE_SECTION_ID;
      canManageHelpNeedsDetails = needsDetailsManage && topic.section.id === HELP_SOLUTIONS_SERVICE_SECTION_ID;
      canCreateHelpSignal = signalCreate && topic.section.id === HELP_SOLUTIONS_SERVICE_SECTION_ID;
      canCorrectTitleSourceLocale = sourceAny || (sourceOwn && session.user.id === topic.authorId);
      canCorrectAnySourceLocale = sourceAny;
      canGenerateTranslations = generate && contentGenerationActionForRequest(context).enabled;
      canManagePin = pin;
      canUseAdminPanel = solutionAny || canManageHelpDuplicate || canManageHelpNeedsDetails || sourceAny || pin;
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

  let ownPendingHelpSignals: Array<Omit<ForumPendingHelpSignal, "createdAt"> & { createdAt: string }> = [];
  let reviewableHelpSignals: Array<Omit<ForumReviewableHelpSignal, "createdAt"> & { createdAt: string }> = [];
  let canSignalDuplicate = false;
  if (session && topic.section.id === HELP_SOLUTIONS_SERVICE_SECTION_ID) {
    try {
      ownPendingHelpSignals = (await forumReader.readOwnPendingHelpSignals(topic.id, session.user.id))
        .map((signal) => ({ ...signal, createdAt: signal.createdAt.toISOString() }));
    } catch (error) {
      if (!(error instanceof ForumStorageUnavailableError)) throw error;
    }

    const reviewableKinds: HelpSignalKind[] = [];
    if (canManageHelpNeedsDetails) reviewableKinds.push("needs-details");
    if (canModerateHelpSolution) reviewableKinds.push("needs-review", "solution-outdated");
    if (canManageHelpDuplicate) reviewableKinds.push("duplicate");
    if (reviewableKinds.length > 0) {
      try {
        reviewableHelpSignals = (await forumReader.readReviewablePendingHelpSignals(topic.id, reviewableKinds))
          .map((signal) => ({ ...signal, createdAt: signal.createdAt.toISOString() }));
      } catch (error) {
        if (!(error instanceof ForumStorageUnavailableError)) throw error;
      }
    }

    if (canCreateHelpSignal && !topic.isSolved && !topic.bestAnswerPostId && !topic.duplicateOf) {
      try {
        canSignalDuplicate = !(await forumReader.hasActiveHelpDuplicateChildren(topic.id));
      } catch (error) {
        if (!(error instanceof ForumStorageUnavailableError)) throw error;
      }
    }
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
      const appeal = await forumReader.readPendingHelpDuplicateAppeal(topic.id);
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

  return {
    locale: resolvedLocale.translationLocale,
    topic,
    titlePresentation,
    postPresentations,
    generationUnits,
    canReply,
    canManageSolution,
    canManageAnySolution,
    canModerateHelpSolution,
    canManageHelpDuplicate,
    canCreateHelpSignal,
    canSignalDuplicate,
    ownPendingHelpSignals,
    reviewableHelpSignals,
    pendingDuplicateAppeal,
    isTopicAuthor: Boolean(session && session.user.id === topic.authorId),
    canCorrectTitleSourceLocale,
    canCorrectAnySourceLocale,
    canManagePin,
    canUseAdminPanel,
    correctablePostIds,
    topicReadState,
  };
}

export default function TopicRoute() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<ForumMutationError | SourceLocaleCorrectionMutationError | ContentGenerationActionResponse>();
  return <TopicView {...data} actionData={actionData} />;
}

export const ErrorBoundary = ForumRouteError;
