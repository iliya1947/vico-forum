import { RouterContextProvider } from "react-router";
import type { ForumReader, ForumTopicPage } from "../../../db/forum-repository";
import { forumReaderContext } from "../../forum/request-context";
import { authSessionContext } from "../../auth/request-context";
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
const reader: Pick<ForumReader, "readTopicPage"> = {
  async readTopicPage(id) {
    return id === P0_TOPIC_ID ? sampleTopic : undefined;
  },
};
const strictReader = new Proxy(reader, {
  get(target, name, receiver) {
    if (Reflect.has(target, name)) return Reflect.get(target, name, receiver);
    throw new Error("P0 forum capability not configured: " + String(name));
  },
}) as ForumReader;

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
  context.set(authSessionContext, null); // Guest is the first bounded render scenario.
  context.set(forumReaderContext, strictReader);
  context.set(registryLoaderContext, () => localeRegistry);
  context.set(uiTranslationStoreContext, uiStore);
  context.set(contentTranslationPresentationContext, presentation);
  return context;
}
