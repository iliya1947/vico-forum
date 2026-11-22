import { RouterContextProvider } from "react-router";
import type { ForumReader, ForumTopicPage } from "../../../db/forum-repository";
import { forumReaderContext } from "../../forum/request-context";
import { authSessionContext, type AuthSession } from "../../auth/request-context";
import { forumWriterContext } from "../../forum/request-context";
import type { ForumWriter } from "../../../db/hyperdrive-forum";
import { authorizationContext } from "../../authorization/request-context";
import type { AuthorizationManagementCapability, PermissionResolver } from "../../../db/authorization-service";
import type { PermissionKey } from "../../authorization/catalog";
import { userMeasureContext, type UserMeasureCapability } from "../../measures/request-context";
import {
  registryLoaderContext, uiTranslationStoreContext,
  contentTranslationPresentationContext, type RuntimeUiTranslationStore,
} from "../../localization/request-context";
import { loadPersistentRegistry } from "../../localization/persistent-registry";
import { ContentTranslationPresentationService } from "../../localization/content-translation-presentation";

/** Only raw synthetic entities for the single P0 rendering proof. */
export const P0_TOPIC_ID = "p0-preview-topic";
export const P0_TOPIC_TITLE = "P0 shared forum topic";
export const P0_POST_BODY = "P0 message rendered by the real forum TopicView";
export const P0_ACTOR_ID = "p0-preview-user";
export const P0_REPLY_BODY = "P0 reply submitted through the real editor and action";

const sampleTopic = {
  id: P0_TOPIC_ID,
  sectionId: "sample-section",
  authorId: "sample-author",
  title: {
    id: "p0-topic-title-revision",
    originalContent: P0_TOPIC_TITLE,
    sourceLocale: "en",
  },
  isSolved: false,
  isClosed: false,
  closureVersion: 0,
  bestAnswerPostId: null,
  authorName: "Preview author",
  createdAt: new Date("2026-01-01T10:00:00.000Z"),
  needsDetails: false,
  duplicateOf: null,
  duplicateDisputed: false,
  isPinned: false,
  section: {
    id: "sample-section",
    name: "Example section",
    category: { id: "sample-category", name: "Example category" },
  },
  tags: [],
  posts: [{
    id: "p0-first-post",
    topicId: P0_TOPIC_ID,
    authorId: "sample-author",
    parentPostId: null,
    solutionModerationStatus: null,
    solutionOutdatedReason: null,
    solutionOutdatedReasonKind: null,
    body: {
      id: "p0-post-body-revision",
      originalContent: P0_POST_BODY,
      sourceLocale: "en",
    },
    authorName: "Preview author",
    createdAt: new Date("2026-01-01T10:01:00.000Z"),
    attachments: [],
  }],
} satisfies ForumTopicPage;

// No database/proxying of product handlers. Unsupported P0 capability access
// fails loudly rather than becoming an invented success.

const posts: ForumTopicPage["posts"] = [...sampleTopic.posts];
let postCounter = 0;
let latestReadPostId: string | null = null;
const completedPublications = new Map<string, string>();

const reader: Pick<ForumReader,
  "readTopicPage" | "readTopicBlockedAuthors" | "readTopicMute"
  | "readTopicBookmark" | "readTopicWatch" | "readTopicReadState" | "countUnreadNotifications"
> = {
  async readTopicPage(id) {
    return id === P0_TOPIC_ID ? { ...sampleTopic, posts: [...posts] } : undefined;
  },
  async readTopicBlockedAuthors(actorId, topicId) {
    if (actorId !== P0_ACTOR_ID || topicId !== P0_TOPIC_ID) throw new Error("Unexpected P0 filter request");
    return [];
  },
  async readTopicMute() { return false; },
  async readTopicBookmark() { return false; },
  async readTopicWatch() { return false; },
  async readTopicReadState(actorId, topicId) {
    if (actorId !== P0_ACTOR_ID || topicId !== P0_TOPIC_ID) return undefined;
    const latestPostId = posts.at(-1)?.id ?? null;
    return {
      topicId,
      state: latestReadPostId === latestPostId ? "read" : "unread",
      lastReadPostId: latestReadPostId,
      firstUnreadPostId: latestReadPostId === latestPostId ? null : latestPostId,
      latestPostId,
    };
  },
  async countUnreadNotifications() { return 0; },
};
function strictCapability<T extends object>(configured: object, scope: string): T {
  return new Proxy(configured, {
    get(target, name, receiver) {
      if (Reflect.has(target, name)) return Reflect.get(target, name, receiver);
      throw new Error("P0 " + scope + " capability not configured: " + String(name));
    },
  }) as T;
}
const strictReader = strictCapability<ForumReader>(reader, "forum reader");

const writer: Pick<ForumWriter, "createReply" | "advanceTopicReadState"> = {
  async createReply(input) {
    if (input.topicId !== P0_TOPIC_ID || input.authorId !== P0_ACTOR_ID) throw new Error("Unexpected P0 reply request");
    if (!input.body.trim()) throw new Error("Cannot publish an empty reply");
    if (input.parentPostId && !posts.some((post) => post.id === input.parentPostId)) {
      throw new Error("Cannot reply to a missing message");
    }
    const prior = input.draftId ? completedPublications.get(input.draftId) : undefined;
    if (prior) return { postId: prior };
    const id = "p0-reply-" + (++postCounter);
    posts.push({
      id, topicId: P0_TOPIC_ID, authorId: P0_ACTOR_ID,
      parentPostId: input.parentPostId ?? null,
      solutionModerationStatus: null, solutionOutdatedReason: null, solutionOutdatedReasonKind: null,
      authorName: "Preview member", createdAt: new Date("2026-01-01T10:05:00Z"),
      body: { id: "p0-revision-" + postCounter, originalContent: input.body, sourceLocale: "en" },
      attachments: [],
    });
    if (input.draftId) completedPublications.set(input.draftId, id);
    console.info("P0_FIXTURE_REPLY_COMMITTED", id);
    return { postId: id };
  },
  async advanceTopicReadState({ userId, topicId, postId }) {
    if (userId !== P0_ACTOR_ID || topicId !== P0_TOPIC_ID || !posts.some((post) => post.id === postId)) {
      throw new Error("Invalid P0 read state");
    }
    latestReadPostId = postId;
    console.info("P0_FIXTURE_READ_STATE", postId);
  },
};
const strictWriter = strictCapability<ForumWriter>(writer, "forum writer");

const resolver: PermissionResolver = {
  async has(permission: PermissionKey) { return permission === "forum.reply.create"; },
  async resolve() { throw new Error("P0 permission resolution not configured"); },
};
const authorization = strictCapability<AuthorizationManagementCapability>({
  forUser(userId: string): PermissionResolver {
    if (userId !== P0_ACTOR_ID) throw new Error("Unexpected authorization actor");
    return resolver;
  },
}, "authorization");
const userMeasures = strictCapability<UserMeasureCapability>({
  async activeRestrictions(subjectId: string) {
    if (subjectId !== P0_ACTOR_ID) throw new Error("Unexpected user measure actor");
    return [];
  },
}, "user measure");

const createdAt = new Date("2026-01-01T10:00:00Z");
const session: AuthSession = {
  user: {
    id: P0_ACTOR_ID, name: "Preview member", email: "preview@example.invalid",
    emailVerified: true, image: null, createdAt, updatedAt: createdAt,
  },
  session: {
    id: "p0-session", token: "synthetic-local-only", userId: P0_ACTOR_ID,
    expiresAt: new Date("2099-01-01T00:00:00Z"), createdAt, updatedAt: createdAt,
  },
};

const localeRegistry = loadPersistentRegistry({ readAll: async () => [] });
const uiStore: RuntimeUiTranslationStore = {
  readApproved: async () => [],
  read: async () => undefined,
};
const presentation = new ContentTranslationPresentationService({
  readBatch: async () => ({ translations: [] }),
});

/** Fresh per navigation/fetcher request, using the production context keys. */
export function createP0Context(): RouterContextProvider {
  const context = new RouterContextProvider();
  context.set(authSessionContext, session);
  context.set(forumReaderContext, strictReader);
  context.set(forumWriterContext, strictWriter);
  context.set(authorizationContext, authorization);
  context.set(userMeasureContext, userMeasures);
  context.set(registryLoaderContext, () => localeRegistry);
  context.set(uiTranslationStoreContext, uiStore);
  context.set(contentTranslationPresentationContext, presentation);
  return context;
}
