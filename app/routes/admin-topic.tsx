import { data, useLoaderData, type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationForRequest } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { HELP_SOLUTIONS_SERVICE_SECTION_ID } from "../../db/forum-identifiers";
import { forumReaderForRequest } from "../forum/request-context";
import { ForumRouteError } from "../forum/ui";
import { type ContentTranslationPresentation } from "../localization/content-translation-presentation";
import { contentTranslationPresentationForRequest, localeContext, registryForRequest } from "../localization/request-context";
import { adminObjectId, adminPrivateHeaders, requireAdminForumAccess } from "../admin/forum.server";
import { projectAdminTopic } from "../admin/topic-model";
import { AdminTopicView } from "../admin/topic";

export { headers, meta } from "./admin";

export async function loader({ params, context }: {
  params: { locale?: string; topicId?: string };
  context: RouterContextProvider;
}) {
  // Every direct private route independently checks Forum admission before validating its target.
  const access = await requireAdminForumAccess(context);
  const topicId = adminObjectId(params.topicId);
  const session = authSessionForRequest(context)!;
  let canManagePin: boolean;
  let canManageAnySolution: boolean;
  let canManageHelpDuplicate: boolean;
  let canCorrectAnySourceLocale: boolean;
  try {
    const resolver = authorizationForRequest(context).forUser(session.user.id);
    [canManagePin, canManageAnySolution, canManageHelpDuplicate, canCorrectAnySourceLocale] = await Promise.all([
      resolver.has("forum.topic.pin"),
      resolver.has("forum.solution.manageAny"),
      resolver.has("forum.helpDuplicate.manage"),
      resolver.has("forum.sourceLocale.correctAny"),
    ]);
  } catch (error) {
    if (error instanceof AuthorizationUnavailableError) {
      throw new Response("Unavailable", { status: 503, headers: adminPrivateHeaders });
    }
    throw error;
  }

  const reader = forumReaderForRequest(context);
  let loaded;
  try {
    loaded = await reader.readTopicPage(topicId);
  } catch (error) {
    if (error instanceof ForumStorageUnavailableError) {
      throw new Response("Unavailable", { status: 503, headers: adminPrivateHeaders });
    }
    throw error;
  }
  if (!loaded) throw new Response("Not found", { status: 404, headers: adminPrivateHeaders });

  const canManageHelp = canManageHelpDuplicate && loaded.section.id === HELP_SOLUTIONS_SERVICE_SECTION_ID;
  let pendingDuplicateAppeal: { id: string } | null = null;
  if (canManageHelp && loaded.duplicateOf) {
    try {
      const appeal = await reader.readPendingHelpDuplicateAppeal(loaded.id);
      if (appeal) pendingDuplicateAppeal = { id: appeal.id };
    } catch (error) {
      if (error instanceof ForumStorageUnavailableError) {
        throw new Response("Unavailable", { status: 503, headers: adminPrivateHeaders });
      }
      throw error;
    }
  }

  const resolved = context.get(localeContext);
  const registry = await registryForRequest(context);
  const revisions = [
    { contentType: "topic-title" as const, contentId: loaded.id, revisionId: loaded.title.id,
      originalContent: loaded.title.originalContent, sourceLocale: loaded.title.sourceLocale },
    ...loaded.posts.filter((post) => post.body.originalContent.trim().length > 0).map((post) => ({
      contentType: "post-body" as const, contentId: post.id, revisionId: post.body.id,
      originalContent: post.body.originalContent, sourceLocale: post.body.sourceLocale,
    })),
  ];
  const translated = await contentTranslationPresentationForRequest(context).readCurrent(
    revisions, resolved.translationLocale, resolved.direction,
    (locale) => registry.registry.find(locale)?.locale.direction,
  );
  const titlePresentation = translated[0]!;
  const translatedPosts = new Map(translated.slice(1).map((presentation) => [presentation.contentId, presentation]));
  const postPresentations = loaded.posts.map((post): ContentTranslationPresentation => {
    const presentation = translatedPosts.get(post.id);
    if (presentation) return presentation;
    const originalLocale = post.body.sourceLocale === "und" ? undefined : post.body.sourceLocale;
    const originalDirection = originalLocale
      ? registry.registry.find(originalLocale)?.locale.direction ?? "auto" : "auto";
    return {
      contentType: "post-body", contentId: post.id, revisionId: post.body.id,
      selected: "original", content: post.body.originalContent,
      contentLocale: originalLocale, contentDirection: originalDirection,
      originalContent: post.body.originalContent, originalLocale, originalDirection,
    };
  });

  return data({
    locale: resolved.translationLocale,
    access,
    topic: projectAdminTopic(loaded, canManageHelp),
    titlePresentation,
    postPresentations,
    canManagePin,
    canManageAnySolution,
    canManageHelpDuplicate: canManageHelp,
    canCorrectAnySourceLocale,
    canModerateHelpSolution: canManageAnySolution && loaded.section.id === HELP_SOLUTIONS_SERVICE_SECTION_ID,
    pendingDuplicateAppeal,
  }, { headers: adminPrivateHeaders });
}

export default function AdminTopicRoute() {
  return <AdminTopicView {...useLoaderData<typeof loader>()} />;
}
export const ErrorBoundary = ForumRouteError;
