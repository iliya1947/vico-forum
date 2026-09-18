import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
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

function contextWithAuthorizationFailure(error: Error) {
  const context = new RouterContextProvider();
  context.set(forumReaderContext, reader);
  context.set(authSessionContext, session);
  context.set(authorizationContext, {
    forUser: () => ({
      resolve: vi.fn(),
      has: vi.fn(async () => { throw error; }),
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
