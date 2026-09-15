import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
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

function contextWithAuthorizationFailure() {
  const context = new RouterContextProvider();
  context.set(forumReaderContext, reader);
  context.set(authSessionContext, session);
  context.set(authorizationContext, {
    forUser: () => ({
      resolve: vi.fn(),
      has: vi.fn(async () => { throw new Error("authorization unavailable"); }),
    }),
  } as never);
  return context;
}

describe("public forum authorization degradation", () => {
  it("keeps an authenticated public section readable and hides the create form when authz fails", async () => {
    const result = await sectionLoader({
      params: { locale: "en", sectionId: section.id },
      context: contextWithAuthorizationFailure(),
    });

    expect(result.section).toBe(section);
    expect(result.canCreateTopic).toBe(false);
  });

  it("keeps an authenticated public topic readable and hides protected controls when authz fails", async () => {
    const result = await topicLoader({
      params: { locale: "en", topicId: topic.id },
      context: contextWithAuthorizationFailure(),
    });

    expect(result.topic).toBe(topic);
    expect(result.canReply).toBe(false);
    expect(result.canManageSolution).toBe(false);
  });
});
