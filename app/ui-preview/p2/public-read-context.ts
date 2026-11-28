import { RouterContextProvider } from "react-router";
import type {
  ForumReader, ForumTag, ForumTopicPage, ForumSectionPage,
  ForumCategorySummary, ForumHomepageCategorySummary, ForumTagPage,
} from "../../../db/forum-repository";
import { projectPublicAccountIdentity } from "../../../db/public-identity";
import { forumReaderContext } from "../../forum/request-context";
import { registryLoaderContext } from "../../localization/request-context";
import { createRequestRegistryLoader } from "../../localization/persistent-registry";
import type { PreviewRawBaseline } from "./raw-baseline";

/** Only this declared subset is readable in P2-B1; no generic success methods. */
export type P2B1ForumReaderMethods =
  | "listCategories" | "readHomepage" | "readSection" | "readTopicPage"
  | "readTags" | "readTag" | "readOnlinePresence" | "searchMentionableUsers"
  | "readPostLocation" | "readTopicPinState";

function strictForumReader(configured: Pick<ForumReader, P2B1ForumReaderMethods>): ForumReader {
  return new Proxy(configured, {
    get(target, property, receiver) {
      if (Reflect.has(target, property)) return Reflect.get(target, property, receiver);
      throw new Error("P2 forum reader capability not configured: " + String(property));
    },
  }) as ForumReader;
}

/**
 * Public projections are derived from one raw baseline and production lifecycle
 * masking, never from authenticated actor or private profile/Owner fields.
 */
export function createP2ForumReader(baseline: PreviewRawBaseline): ForumReader {
  const user = (id: string) => {
    const found = baseline.users.find((item) => item.identity.id === id);
    if (!found) throw new Error("P2 forum reader missing user: " + id);
    return found;
  };
  const author = (id: string) => {
    const source = user(id);
    const identity = projectPublicAccountIdentity({
      id: source.identity.id, name: source.identity.name, image: source.identity.image ?? null,
      bio: "", githubUrl: null, websiteUrl: null,
    }, source.state);
    return {
      name: identity.name, image: identity.image,
      ...(identity.kind === "deleted" ? { authorIdentityKind: "deleted" as const } : {}),
    };
  };
  const category = (id: string) => {
    const found = baseline.categories.find((item) => item.id === id);
    if (!found) throw new Error("P2 forum reader missing category: " + id);
    return found;
  };
  const section = (id: string) => {
    const found = baseline.sections.find((item) => item.id === id);
    if (!found) throw new Error("P2 forum reader missing section: " + id);
    return found;
  };
  const tags = (keys: readonly string[]): ForumTag[] => keys.map((key) => {
    const found = baseline.domains.tags.find((item) => item.key === key);
    if (!found) throw new Error("P2 forum reader missing tag: " + key);
    return { key: found.key, name: found.name };
  });
  const topicSummary = (topic: PreviewRawBaseline["topics"][number]) => ({
    id: topic.id,
    title: {
      id: topic.titleRevisionId, originalContent: topic.title, sourceLocale: topic.sourceLocale,
    },
    authorName: author(topic.authorId).name,
    ...(author(topic.authorId).authorIdentityKind === "deleted" ? { authorIdentityKind: "deleted" as const } : {}),
    postCount: baseline.posts.filter((post) => post.topicId === topic.id).length,
    createdAt: topic.createdAt,
    isPinned: topic.isPinned,
    tags: tags(topic.tags),
  });
  const orderedTopics = (sectionId: string) => baseline.topics
    .filter((topic) => topic.sectionId === sectionId)
    .sort((a, b) => Number(b.isPinned) - Number(a.isPinned)
      || b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id));

  const configured = {
    async listCategories(): Promise<ForumCategorySummary[]> {
      return baseline.categories.map((item) => ({
        id: item.id, name: item.name,
        sectionCount: baseline.sections.filter((entry) => entry.categoryId === item.id).length,
      }));
    },
    async readHomepage(): Promise<ForumHomepageCategorySummary[]> {
      return baseline.categories.map((item) => {
        const related = baseline.sections.filter((entry) => entry.categoryId === item.id)
          .map((entry) => ({
            id: entry.id, name: entry.name,
            topicCount: baseline.topics.filter((topic) => topic.sectionId === entry.id).length,
            messageCount: baseline.posts.filter((post) => baseline.topics.some(
              (topic) => topic.id === post.topicId && topic.sectionId === entry.id)).length,
          }));
        return {
          id: item.id, name: item.name, sectionCount: related.length,
          topicCount: related.reduce((total, entry) => total + entry.topicCount, 0),
          messageCount: related.reduce((total, entry) => total + entry.messageCount, 0),
          sections: related,
        };
      });
    },
    async readSection(id: string): Promise<ForumSectionPage | undefined> {
      const selected = baseline.sections.find((entry) => entry.id === id);
      if (!selected) return undefined;
      const parent = category(selected.categoryId);
      return {
        id: selected.id, name: selected.name,
        category: { id: parent.id, name: parent.name },
        topics: orderedTopics(id).map(topicSummary),
      };
    },
    async readTopicPage(id: string): Promise<ForumTopicPage | undefined> {
      const topic = baseline.topics.find((entry) => entry.id === id);
      if (!topic) return undefined;
      const parent = section(topic.sectionId);
      const group = category(parent.categoryId);
      const owner = author(topic.authorId);
      const duplicate = topic.duplicateOf === null ? null : baseline.topics.find(
        (entry) => entry.id === topic.duplicateOf);
      if (topic.duplicateOf !== null && !duplicate) {
        throw new Error("P2 forum reader missing duplicate target: " + topic.duplicateOf);
      }
      return {
        id: topic.id, sectionId: topic.sectionId, authorId: topic.authorId,
        title: { id: topic.titleRevisionId, originalContent: topic.title, sourceLocale: topic.sourceLocale },
        isSolved: topic.isSolved, isClosed: topic.isClosed,
        closureVersion: topic.closureVersion, bestAnswerPostId: topic.bestAnswerPostId,
        createdAt: topic.createdAt, needsDetails: topic.needsDetails,
        duplicateOf: duplicate ? { id: duplicate.id, title: duplicate.title } : null,
        duplicateDisputed: topic.duplicateDisputed, authorName: owner.name,
        ...("authorIdentityKind" in owner ? { authorIdentityKind: owner.authorIdentityKind } : {}),
        isPinned: topic.isPinned,
        section: { id: parent.id, name: parent.name, category: { id: group.id, name: group.name } },
        tags: tags(topic.tags),
        posts: baseline.posts.filter((post) => post.topicId === topic.id)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
          .map((post) => {
            const poster = author(post.authorId);
            return {
              id: post.id, topicId: post.topicId, authorId: post.authorId,
              parentPostId: post.parentPostId,
              solutionModerationStatus: post.solutionModerationStatus,
              solutionOutdatedReason: post.solutionOutdatedReason,
              solutionOutdatedReasonKind: post.solutionOutdatedReasonKind,
              body: {
                id: post.bodyRevisionId, originalContent: post.body, sourceLocale: post.sourceLocale,
              },
              authorName: poster.name, authorImage: poster.image,
              ...("authorIdentityKind" in poster
                ? { authorIdentityKind: poster.authorIdentityKind } : {}),
              createdAt: post.createdAt,
              attachments: baseline.attachments.filter((file) => file.postId === post.id).map((file) => ({
                id: file.id, fileName: file.fileName,
                byteSize: file.byteSize, detectedType: file.detectedType,
              })),
            };
          }),
      };
    },
    async readTags() {
      return baseline.domains.tags.map((tag) => ({
        key: tag.key, name: tag.name,
        topicCount: baseline.topics.filter((topic) => topic.tags.includes(tag.key)).length,
      }));
    },
    async readTag(key: string): Promise<ForumTagPage | undefined> {
      const tag = baseline.domains.tags.find((item) => item.key === key);
      if (!tag) return undefined;
      return {
        tag: { key: tag.key, name: tag.name },
        topics: baseline.topics.filter((topic) => topic.tags.includes(key))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id))
          .map((topic) => {
            const parent = section(topic.sectionId);
            const group = category(parent.categoryId);
            const poster = author(topic.authorId);
            return {
              id: topic.id, title: topic.title, authorName: poster.name,
              ...("authorIdentityKind" in poster
                ? { authorIdentityKind: poster.authorIdentityKind } : {}),
              postCount: baseline.posts.filter((post) => post.topicId === topic.id).length,
              createdAt: topic.createdAt,
              section: { id: parent.id, name: parent.name },
              category: { id: group.id, name: group.name }, tags: tags(topic.tags),
            };
          }),
      };
    },
    async readOnlinePresence() {
      const live = baseline.domains.presence
        .filter((entry) => entry.seenAt.getTime() >= baseline.referenceTime.getTime() - 5 * 60_000)
        .filter((entry) => user(entry.userId).state.status === "active")
        .filter((entry) => baseline.domains.privacy.find(
          (item) => item.userId === entry.userId)?.showOnline !== false)
        .sort((a, b) => b.seenAt.getTime() - a.seenAt.getTime() || a.userId.localeCompare(b.userId));
      return {
        count: live.length,
        members: live.slice(0, 12).map((entry) => {
          const identity = author(entry.userId);
          return { id: entry.userId, name: identity.name, image: identity.image };
        }),
      };
    },
    async searchMentionableUsers(query: string) {
      const term = query.trim();
      if (!term || term.length > 64) return [];
      return baseline.users.filter((item) => item.state.status === "active"
        && item.identity.name.toLocaleLowerCase("en").includes(term.toLocaleLowerCase("en")))
        .sort((a, b) => a.identity.name.localeCompare(b.identity.name)
          || a.identity.id.localeCompare(b.identity.id))
        .slice(0, 8).map((entry) => ({ id: entry.identity.id, name: entry.identity.name }));
    },
    async readPostLocation(postId: string) {
      const post = baseline.posts.find((entry) => entry.id === postId);
      return post ? { topicId: post.topicId, authorId: post.authorId } : undefined;
    },
    async readTopicPinState(topicId: string) {
      return baseline.topics.find((topic) => topic.id === topicId)?.isPinned ?? false;
    },
  } satisfies Pick<ForumReader, P2B1ForumReaderMethods>;

  return strictForumReader(configured);
}

/**
 * First fresh-context slice. Missing Writer/Auth/Owner/Admin contracts remain
 * genuinely absent, not magically present with a generic empty/success result.
 */
export function createP2PublicReadContext(baseline: PreviewRawBaseline): RouterContextProvider {
  const context = new RouterContextProvider();
  context.set(forumReaderContext, createP2ForumReader(baseline));
  context.set(registryLoaderContext, createRequestRegistryLoader({
    readAll: async () => baseline.domains.locales.filter((locale) => locale.tag !== "en")
      .map((locale) => ({
        tag: locale.tag, translationStatus: locale.translationStatus,
        publicationStatus: locale.publicationStatus, direction: locale.direction,
        fallbackChain: [...locale.fallbackChain],
        aliases: [...(locale.aliases ?? [])], matchTags: [...(locale.matchTags ?? [])],
        nativeName: locale.nativeName, presentationMetadata: { ...locale.presentationMetadata },
      })),
  }));
  return context;
}
