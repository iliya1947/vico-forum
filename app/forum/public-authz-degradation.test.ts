import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { ContentTranslationPresentationService } from "../localization/content-translation-presentation";
import { localeRegistry } from "../localization/registry";
import {
  contentTranslationPresentationContext,
  localeContext,
  registryLoaderContext,
} from "../localization/request-context";
import type { ForumReader } from "../../db/forum-repository";
import { forumReaderContext } from "./request-context";
import { loader as sectionLoader } from "../routes/section";
import { loader as topicLoader } from "../routes/topic";

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

function configureTopicRead(context: RouterContextProvider) {
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
    semanticIdentity: "test-registry",
    health: { status: "healthy" as const },
  }));
  context.set(
    contentTranslationPresentationContext,
    new ContentTranslationPresentationService({ readTopic: async () => ({ posts: [] }) }),
  );
}

function contextWithAuthorizationFailure(error: Error) {
  const context = new RouterContextProvider();
  context.set(forumReaderContext, reader);
  configureTopicRead(context);
  context.set(authSessionContext, session);
  context.set(authorizationContext, {
    forUser: () => ({
      resolve: vi.fn(),
      has: vi.fn(async () => { throw error; }),
    }),
  } as never);
  return context;
}

function contextWithPermissions(userId: string, permissions: readonly string[]) {
  const context = new RouterContextProvider();
  context.set(forumReaderContext, reader);
  configureTopicRead(context);
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
