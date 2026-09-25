import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import type { ForumReader } from "../../db/forum-repository";
import { forumReaderContext } from "./request-context";
import { loader as sectionLoader } from "../routes/section";
import { loader as topicLoader } from "../routes/topic";
import { ContentTranslationPresentationService } from "../localization/content-translation-presentation";
import type { StoredContentTranslation } from "../localization/content-translation";
import { ContentGenerationStatusStorageUnavailableError } from "../localization/content-generation-status";
import { localeRegistry } from "../localization/registry";
import {
  contentGenerationActionContext,
  contentGenerationStatusReaderContext,
  contentTranslationPresentationContext,
  localeContext,
  registryLoaderContext,
} from "../localization/request-context";

const section = {
  id: "section-1",
  name: "Section",
  category: { id: "category-1", name: "Category" },
  topics: [{
    id: "topic-1",
    authorName: "Ada",
    postCount: 1,
    createdAt: new Date("2026-01-01"),
    title: { id: "title-r1", originalContent: "Public topic", sourceLocale: "en" },
  }],
};

const topic = {
  id: "topic-1",
  sectionId: "section-1",
  authorId: "author-1",
  authorName: "Ada",
  createdAt: new Date("2026-01-01"),
  isSolved: false,
  bestAnswerPostId: null,
  title: section.topics[0]!.title,
  section: { id: "section-1", name: "Section", category: { id: "category-1", name: "Category" } },
  posts: [{
    id: "post-1",
    topicId: "topic-1",
    authorId: "reply-author",
    authorName: "Lin",
    createdAt: new Date("2026-01-02"),
    body: { id: "post-r1", originalContent: "Public reply", sourceLocale: "en" },
  }],
};

const reader: ForumReader = {
  listCategories: async () => [{ id: "category-1", name: "Category", sectionCount: 1 }],
  readCategory: async () => undefined,
  readSection: async (id) => id === section.id ? section : undefined,
  readTopicPage: async (id) => id === topic.id ? topic : undefined,
};

const session = {
  user: {
    id: "viewer-1",
    name: "Viewer",
    email: "viewer@example.test",
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  session: {
    id: "session-1",
    token: "token",
    userId: "viewer-1",
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
} satisfies AuthSession;

function configureTranslationPresentation(
  context: RouterContextProvider,
  translations: readonly StoredContentTranslation[] = [],
) {
  context.set(localeContext, {
    translationLocale: "en",
    fallbackLocales: [],
    direction: "ltr",
    formatting: { locale: "en", timeZone: "UTC" },
    nativeName: "English",
    presentationMetadata: {},
  });
  context.set(registryLoaderContext, async () => ({
    registry: localeRegistry,
    semanticIdentity: "test",
    health: { status: "healthy" as const },
  }));
  context.set(
    contentTranslationPresentationContext,
    new ContentTranslationPresentationService({
      readBatch: async () => ({ translations }),
    }),
  );
}

function contextWithAuthorizationFailure(error: Error) {
  const context = new RouterContextProvider();
  context.set(forumReaderContext, reader);
  configureTranslationPresentation(context);
  context.set(authSessionContext, session);
  context.set(authorizationContext, {
    forUser: () => ({
      resolve: vi.fn(),
      has: vi.fn(async () => { throw error; }),
    }),
  } as never);
  return context;
}

function contextWithPermissions(
  userId: string,
  permissions: readonly string[],
  translations: readonly StoredContentTranslation[] = [],
) {
  const context = new RouterContextProvider();
  context.set(forumReaderContext, reader);
  configureTranslationPresentation(context, translations);
  context.set(authSessionContext, {
    ...session,
    user: { ...session.user, id: userId },
    session: { ...session.session, userId },
  });
  const allowed = new Set(permissions);
  context.set(authorizationContext, {
    forUser: () => ({
      resolve: vi.fn(),
      has: vi.fn(async (permission: string) => allowed.has(permission)),
    }),
  } as never);
  return context;
}

function guestContext(translations: readonly StoredContentTranslation[] = []) {
  const context = new RouterContextProvider();
  context.set(forumReaderContext, reader);
  configureTranslationPresentation(context, translations);
  return context;
}

describe("public forum authorization degradation", () => {
  it("keeps authenticated public reads available for classified authorization outages", async () => {
    const failure = new AuthorizationUnavailableError();

    const sectionResult = await sectionLoader({
      params: { locale: "en", sectionId: section.id },
      context: contextWithAuthorizationFailure(failure),
    });
    expect(sectionResult.section).toBe(section);
    expect(sectionResult.canCreateTopic).toBe(false);

    const topicResult = await topicLoader({
      params: { locale: "en", topicId: topic.id },
      context: contextWithAuthorizationFailure(failure),
    });
    expect(topicResult.topic).toBe(topic);
    expect(topicResult.canReply).toBe(false);
    expect(topicResult.canManageSolution).toBe(false);
    expect(topicResult.canCorrectTitleSourceLocale).toBe(false);
    expect(topicResult.correctablePostIds).toEqual([]);
    expect(topicResult.generationUnits).toEqual([]);
  });

  it("shows the same persisted public translation to guests and authenticated users", async () => {
    const translations: StoredContentTranslation[] = [{
      contentType: "topic-title",
      contentId: "topic-1",
      revisionId: "title-r1",
      targetLocale: "en",
      sourceLocale: "ru",
      translatedContent: "Public translated topic",
      provenance: {
        origin: "persistent_manual",
        attribution: "community",
      },
    }];
    const translatedTopic = {
      ...topic,
      title: { ...topic.title, sourceLocale: "ru" },
    };
    const translatedReader: ForumReader = {
      ...reader,
      readTopicPage: async (id) => id === translatedTopic.id ? translatedTopic : undefined,
    };

    const guest = guestContext(translations);
    guest.set(forumReaderContext, translatedReader);
    const authenticated = contextWithPermissions("viewer-1", [], translations);
    authenticated.set(forumReaderContext, translatedReader);

    const [guestResult, authenticatedResult] = await Promise.all([
      topicLoader({ params: { locale: "en", topicId: topic.id }, context: guest }),
      topicLoader({ params: { locale: "en", topicId: topic.id }, context: authenticated }),
    ]);

    expect(guestResult.titlePresentation).toMatchObject({
      selected: "translation",
      content: "Public translated topic",
    });
    expect(authenticatedResult.titlePresentation).toEqual(guestResult.titlePresentation);
  });

  it("uses dynamic generation permission for read-only loader hints without generation side effects", async () => {
    const context = contextWithPermissions("viewer-1", ["forum.translation.generate"]);
    const generateTopicTitle = vi.fn();
    const generateAutomaticPostBody = vi.fn();
    const generateExplicitPostBody = vi.fn();
    const readCurrent = vi.fn(async (identities: readonly {
      contentType: "topic-title" | "post-body";
      contentId: string;
      revisionId: string;
    }[]) => identities.map((identity) => ({ ...identity, state: "idle" as const })));
    context.set(contentGenerationActionContext, {
      enabled: true,
      capability: {
        generateTopicTitle,
        generateAutomaticPostBody,
        generateExplicitPostBody,
      },
    });
    context.set(contentGenerationStatusReaderContext, { readCurrent });

    const result = await topicLoader({
      params: { locale: "en", topicId: topic.id },
      context,
    });

    expect(readCurrent).toHaveBeenCalledTimes(1);
    expect(result.generationUnits).toHaveLength(2);
    expect(result.generationUnits.every((unit) => unit.automatic === false)).toBe(true);
    expect(generateTopicTitle).not.toHaveBeenCalled();
    expect(generateAutomaticPostBody).not.toHaveBeenCalled();
    expect(generateExplicitPostBody).not.toHaveBeenCalled();
  });

  it("keeps topic presentation original-safe when generation status storage is unavailable", async () => {
    const context = contextWithPermissions("viewer-1", ["forum.translation.generate"]);
    const generateTopicTitle = vi.fn();
    const generateAutomaticPostBody = vi.fn();
    const generateExplicitPostBody = vi.fn();
    context.set(contentGenerationActionContext, {
      enabled: true,
      capability: {
        generateTopicTitle,
        generateAutomaticPostBody,
        generateExplicitPostBody,
      },
    });
    context.set(contentGenerationStatusReaderContext, {
      readCurrent: vi.fn(async () => {
        throw new ContentGenerationStatusStorageUnavailableError();
      }),
    });

    const result = await topicLoader({
      params: { locale: "en", topicId: topic.id },
      context,
    });

    expect(result.titlePresentation.selected).toBe("original");
    expect(result.generationUnits).toHaveLength(2);
    expect(result.generationUnits.every((unit) =>
      unit.state === "unavailable" && !unit.automatic && !unit.explicitRequired
    )).toBe(true);
    expect(generateTopicTitle).not.toHaveBeenCalled();
    expect(generateAutomaticPostBody).not.toHaveBeenCalled();
    expect(generateExplicitPostBody).not.toHaveBeenCalled();
  });

  it("does not mask unexpected generation status reader failures", async () => {
    const context = contextWithPermissions("viewer-1", ["forum.translation.generate"]);
    context.set(contentGenerationActionContext, {
      enabled: true,
      capability: {
        generateTopicTitle: vi.fn(),
        generateAutomaticPostBody: vi.fn(),
        generateExplicitPostBody: vi.fn(),
      },
    });
    const failure = new TypeError("unexpected status reader bug");
    context.set(contentGenerationStatusReaderContext, {
      readCurrent: vi.fn(async () => { throw failure; }),
    });

    await expect(topicLoader({
      params: { locale: "en", topicId: topic.id },
      context,
    })).rejects.toBe(failure);
  });

  it("derives source-locale correction presentation from effective own/any permissions", async () => {
    const own = await topicLoader({
      params: { locale: "en", topicId: topic.id },
      context: contextWithPermissions("author-1", ["forum.sourceLocale.correctOwn"]),
    });
    expect(own.canCorrectTitleSourceLocale).toBe(true);
    expect(own.correctablePostIds).toEqual([]);

    const any = await topicLoader({
      params: { locale: "en", topicId: topic.id },
      context: contextWithPermissions("viewer-1", ["forum.sourceLocale.correctAny"]),
    });
    expect(any.canCorrectTitleSourceLocale).toBe(true);
    expect(any.correctablePostIds).toEqual(["post-1"]);
  });

  it("does not hide unexpected authorization errors in public loaders", async () => {
    const failure = new Error("unexpected authorization bug");

    await expect(sectionLoader({
      params: { locale: "en", sectionId: section.id },
      context: contextWithAuthorizationFailure(failure),
    })).rejects.toBe(failure);

    await expect(topicLoader({
      params: { locale: "en", topicId: topic.id },
      context: contextWithAuthorizationFailure(failure),
    })).rejects.toBe(failure);
  });
});
