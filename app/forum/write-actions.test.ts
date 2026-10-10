import { RouterContextProvider } from "react-router";
import type { Client } from "pg";
import { describe, expect, it, vi } from "vitest";
import type { AuthSession } from "../auth/request-context";
import { authSessionContext } from "../auth/request-context";
import type { PermissionKey } from "../authorization/catalog";
import { authorizationContext } from "../authorization/request-context";
import {
  createHyperdriveForumReader,
  ForumStorageUnavailableError,
  type ForumWriter,
} from "../../db/hyperdrive-forum";
import { forumReaderContext, forumWriterContext } from "./request-context";
import { action as categoryAction } from "../routes/category";
import { action as sectionAction } from "../routes/section";
import { action as topicAction } from "../routes/topic";
import { ForumWriteRateLimitError } from "../../db/forum-write-policy";
import { ForumAuthorizationError, ForumEntityNotFoundError, ForumStateConflictError } from "../../db/forum-repository";
import {
  contentGenerationActionContext,
  localeContext,
  type ContentGenerationActionRuntime,
} from "../localization/request-context";
import {
  ContentGenerationPlanningUnavailableError,
  type ContentGenerationActionCapability,
  type ContentGenerationActionResult,
} from "../localization/content-generation-action.server";
import { AuthorizationUnavailableError } from "../../db/authorization-service";

const session = {
  user: { id: "session-user", name: "Ada", email: "ada@example.test", emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
  session: { id: "session", token: "token", userId: "session-user", expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
} satisfies AuthSession;

const allForumPermissions = [
  "forum.topic.create",
  "forum.reply.create",
  "forum.topic.pin",
  "forum.solution.manageOwn",
  "forum.solution.manageAny",
  "forum.helpSignal.create",
  "forum.helpNeedsDetails.manage",
  "forum.helpDuplicate.manage",
  "forum.sourceLocale.correctOwn",
  "forum.sourceLocale.correctAny",
  "forum.translation.generate",
] as const satisfies readonly PermissionKey[];

function request(path: string, fields: Record<string, string>, origin = "https://forum.example") {
  const body = new FormData();
  for (const [name, value] of Object.entries(fields)) body.set(name, value);
  return new Request(`https://forum.example${path}`, { method: "POST", headers: { Origin: origin }, body });
}

function context(
  writer: ForumWriter,
  authenticated = true,
  permissions: readonly PermissionKey[] = allForumPermissions,
  authorizationError?: Error,
) {
  const value = new RouterContextProvider();
  const allowed = new Set<PermissionKey>(permissions);
  value.set(authSessionContext, authenticated ? session : null);
  value.set(forumWriterContext, writer);
  value.set(forumReaderContext, {
    searchHelpSolutionsSimilar: vi.fn(async () => []),
  } as never);
  value.set(authorizationContext, {
    forUser: () => ({
      resolve: vi.fn(),
      has: vi.fn(async (permission: PermissionKey) => {
        if (authorizationError) throw authorizationError;
        return allowed.has(permission);
      }),
    }),
  } as never);
  return value;
}

const generationTopic = {
  id: "topic-1",
  sectionId: "section-1",
  authorId: "author-1",
  authorName: "Author",
  createdAt: new Date("2026-01-01"),
  isSolved: false,
  bestAnswerPostId: null,
  title: {
    id: "title-r1",
    originalContent: "Authoritative title",
    sourceLocale: "en",
  },
  section: {
    id: "section-1",
    name: "Section",
    category: { id: "category-1", name: "Category" },
  },
  posts: [{
    id: "post-1",
    topicId: "topic-1",
    authorId: "author-2",
    authorName: "Post Author",
    createdAt: new Date("2026-01-02"),
    body: {
      id: "post-r1",
      originalContent: "Authoritative post body",
      sourceLocale: "en",
    },
  }],
};

function generationCapability(
  result: ContentGenerationActionResult = { outcome: "queued" },
): ContentGenerationActionCapability & {
  generateTopicTitle: ReturnType<typeof vi.fn>;
  generateAutomaticPostBody: ReturnType<typeof vi.fn>;
  generateExplicitPostBody: ReturnType<typeof vi.fn>;
} {
  return {
    generateTopicTitle: vi.fn(async () => result),
    generateAutomaticPostBody: vi.fn(async () => result),
    generateExplicitPostBody: vi.fn(async () => result),
  };
}

function generationContext(options: {
  capability?: ContentGenerationActionCapability;
  runtime?: ContentGenerationActionRuntime;
  authenticated?: boolean;
  permissions?: readonly PermissionKey[];
  locale?: string;
  topic?: typeof generationTopic | undefined;
}) {
  const value = context(
    writer(),
    options.authenticated ?? true,
    options.permissions ?? allForumPermissions,
  );
  value.set(localeContext, {
    translationLocale: options.locale ?? "he",
    fallbackLocales: ["en"],
    direction: "rtl",
    formatting: { locale: options.locale ?? "he", timeZone: "UTC" },
    nativeName: options.locale ?? "he",
    presentationMetadata: {},
  });
  value.set(forumReaderContext, {
    readTopicPage: vi.fn(async (topicId: string) =>
      topicId === options.topic?.id ? options.topic : undefined
    ),
  } as never);
  value.set(
    contentGenerationActionContext,
    options.runtime ?? {
      enabled: true,
      capability: options.capability ?? generationCapability(),
    },
  );
  return value;
}

function writer() {
  return {
    recordOnlinePresence: vi.fn(async () => undefined),
    updateProfile: vi.fn(async () => undefined),
    createTopic: vi.fn(async () => ({ topicId: "server-topic" })),
    createReply: vi.fn(async () => ({ postId: "server-post" })),
    markTopicSolved: vi.fn(async () => undefined),
    selectBestAnswer: vi.fn(async () => ({ topicAuthorId: "session-user", isSolved: false })),
    setHelpSolutionModeration: vi.fn(async () => undefined),
    confirmHelpDuplicate: vi.fn(async () => undefined),
    removeHelpDuplicate: vi.fn(async () => undefined),
    appealHelpDuplicate: vi.fn(async () => undefined),
    resolveHelpDuplicateAppeal: vi.fn(async () => undefined),
    createHelpSignal: vi.fn(async () => ({ id: "signal-1" })),
    withdrawHelpSignal: vi.fn(async () => undefined),
    resolveHelpSignal: vi.fn(async () => "accepted" as const),
    correctTopicTitleSourceLocale: vi.fn(async () => undefined),
    correctPostBodySourceLocale: vi.fn(async () => undefined),
    advanceTopicReadState: vi.fn(async () => undefined),
    markReplyNotificationRead: vi.fn(async () => ({ topicId: "topic-1", postId: "post-1" })),
    pinTopic: vi.fn(async () => undefined),
    unpinTopic: vi.fn(async () => undefined),
  } satisfies ForumWriter;
}

describe("forum write route actions", () => {
  it("pins and unpins only with the effective server permission", async () => {
    const allowed = writer();
    const pinResponse = await topicAction({
      request: request("/ru/topics/t", { intent: "pinTopic", actorId: "forged" }),
      params: { locale: "ru", topicId: "t" },
      context: context(allowed, true, ["forum.topic.pin"]),
    });
    expect(allowed.pinTopic).toHaveBeenCalledWith({ topicId: "t", actorId: "session-user" });
    if (!(pinResponse instanceof Response)) throw new Error("expected pin redirect");
    expect(pinResponse.headers.get("Location")).toBe("/ru/topics/t");

    const unpinResponse = await topicAction({
      request: request("/he/topics/t", { intent: "unpinTopic" }),
      params: { locale: "he", topicId: "t" },
      context: context(allowed, true, ["forum.topic.pin"]),
    });
    expect(allowed.unpinTopic).toHaveBeenCalledWith({ topicId: "t", actorId: "session-user" });
    if (!(unpinResponse instanceof Response)) throw new Error("expected unpin redirect");
    expect(unpinResponse.headers.get("Location")).toBe("/he/topics/t");

    const denied = writer();
    const deniedResponse = await topicAction({
      request: request("/en/topics/t", { intent: "pinTopic" }),
      params: { locale: "en", topicId: "t" },
      context: context(denied, true, ["forum.reply.create"]),
    });
    expect(deniedResponse).toMatchObject({ data: { error: "forbidden" }, init: { status: 403 } });
    expect(denied.pinTopic).not.toHaveBeenCalled();

    const guest = writer();
    const guestResponse = await topicAction({
      request: request("/en/topics/t", { intent: "pinTopic" }),
      params: { locale: "en", topicId: "t" },
      context: context(guest, false, ["forum.topic.pin"]),
    });
    expect(guestResponse).toMatchObject({ init: { status: 401 } });
    expect(guest.pinTopic).not.toHaveBeenCalled();

    const crossOrigin = writer();
    const originResponse = await topicAction({
      request: request("/en/topics/t", { intent: "pinTopic" }, "https://evil.example"),
      params: { locale: "en", topicId: "t" },
      context: context(crossOrigin, true, ["forum.topic.pin"]),
    });
    expect(originResponse).toMatchObject({ init: { status: 403 } });
    expect(crossOrigin.pinTopic).not.toHaveBeenCalled();
  });

  it("advances only the authenticated user's topic read state", async () => {
    const forumWriter = writer();
    await topicAction({
      request: request("/en/topics/t", { intent: "markTopicRead", postId: "post-3" }),
      params: { locale: "en", topicId: "t" },
      context: context(forumWriter),
    });
    expect(forumWriter.advanceTopicReadState).toHaveBeenCalledWith({
      userId: "session-user",
      topicId: "t",
      postId: "post-3",
    });
  });

  it("creates Help & solutions questions only in the server-fixed service section", async () => {
    const forumWriter = writer();
    const response = await categoryAction({
      request: request("/he/categories/help-solutions", {
        intent: "createHelpQuestion",
        title: " A focused question ",
        body: " Reproduction details ",
        tags: " TypeScript, Cloudflare ",
        sectionId: "attacker-section",
        authorId: "attacker",
      }),
      params: { locale: "he", categoryId: "help-solutions" },
      context: context(forumWriter, true, ["forum.topic.create"]),
    });

    expect(forumWriter.createTopic).toHaveBeenCalledWith({
      sectionId: "help-solutions-questions",
      authorId: "session-user",
      title: "A focused question",
      body: "Reproduction details",
      tags: ["TypeScript", "Cloudflare"],
    });
    if (!(response instanceof Response)) throw new Error("expected redirect response");
    expect(response.headers.get("Location")).toBe("/he/topics/server-topic");
  });

  it("checks similar Help questions without writing and preserves the draft", async () => {
    const forumWriter = writer();
    const requestContext = context(forumWriter, true, ["forum.topic.create"]);
    const searchHelpSolutionsSimilar = vi.fn(async () => [{
      id: "existing-help",
      title: "A focused question about Worker auth",
      replyCount: 3,
      isSolved: true,
      tags: [{ key: "cloudflare", name: "Cloudflare" }],
      matchSource: "title" as const,
    }]);
    requestContext.set(forumReaderContext, { searchHelpSolutionsSimilar } as never);

    const response = await categoryAction({
      request: request("/en/categories/help-solutions", {
        intent: "checkSimilarHelpQuestions",
        title: "  Worker auth  ",
        body: " Draft body ",
        tags: " Cloudflare, Auth ",
      }),
      params: { locale: "en", categoryId: "help-solutions" },
      context: requestContext,
    });

    expect(searchHelpSolutionsSimilar).toHaveBeenCalledWith({
      title: "Worker auth",
      body: " Draft body ",
      tags: ["Cloudflare", "Auth"],
    }, 5);
    expect(forumWriter.createTopic).not.toHaveBeenCalled();
    expect(response).toMatchObject({
      data: {
        operation: "helpSimilarQuestions",
        outcome: "results",
        draft: {
          title: "  Worker auth  ",
          body: " Draft body ",
          tags: " Cloudflare, Auth ",
        },
        results: [{
          id: "existing-help",
          title: "A focused question about Worker auth",
          replyCount: 3,
          isSolved: true,
          matchSource: "title",
        }],
      },
      init: { status: 200 },
    });
  });

  it("returns bounded invalid, empty, and unavailable similar-question states without writing", async () => {
    const invalidWriter = writer();
    const invalidContext = context(invalidWriter, true, ["forum.topic.create"]);
    const invalidSearch = vi.fn(async () => []);
    invalidContext.set(forumReaderContext, { searchHelpSolutionsSimilar: invalidSearch } as never);
    const invalidResponse = await categoryAction({
      request: request("/en/categories/help-solutions", {
        intent: "checkSimilarHelpQuestions",
        title: "   ",
        body: "Draft body",
        tags: "TypeScript",
      }),
      params: { locale: "en", categoryId: "help-solutions" },
      context: invalidContext,
    });
    expect(invalidSearch).not.toHaveBeenCalled();
    expect(invalidResponse).toMatchObject({
      data: {
        operation: "helpSimilarQuestions",
        outcome: "invalid",
        draft: { title: "   ", body: "Draft body", tags: "TypeScript" },
        results: [],
      },
      init: { status: 400 },
    });
    expect(invalidWriter.createTopic).not.toHaveBeenCalled();

    const emptyWriter = writer();
    const emptyContext = context(emptyWriter, true, ["forum.topic.create"]);
    emptyContext.set(forumReaderContext, {
      searchHelpSolutionsSimilar: vi.fn(async () => []),
    } as never);
    const emptyResponse = await categoryAction({
      request: request("/en/categories/help-solutions", {
        intent: "checkSimilarHelpQuestions",
        title: "No existing match",
        body: "Draft body",
        tags: "",
      }),
      params: { locale: "en", categoryId: "help-solutions" },
      context: emptyContext,
    });
    expect(emptyResponse).toMatchObject({
      data: { operation: "helpSimilarQuestions", outcome: "empty", results: [] },
      init: { status: 200 },
    });
    expect(emptyWriter.createTopic).not.toHaveBeenCalled();

    const unavailableWriter = writer();
    const unavailableContext = context(unavailableWriter, true, ["forum.topic.create"]);
    unavailableContext.set(forumReaderContext, {
      searchHelpSolutionsSimilar: vi.fn(async () => {
        throw new ForumStorageUnavailableError();
      }),
    } as never);
    const unavailableResponse = await categoryAction({
      request: request("/en/categories/help-solutions", {
        intent: "checkSimilarHelpQuestions",
        title: "Worker auth",
        body: "Keep this draft",
        tags: "Cloudflare",
      }),
      params: { locale: "en", categoryId: "help-solutions" },
      context: unavailableContext,
    });
    expect(unavailableResponse).toMatchObject({
      data: {
        operation: "helpSimilarQuestions",
        outcome: "unavailable",
        draft: { title: "Worker auth", body: "Keep this draft", tags: "Cloudflare" },
        results: [],
      },
      init: { status: 503 },
    });
    expect(unavailableWriter.createTopic).not.toHaveBeenCalled();
  });

  it("keeps Help question actions fail-closed when intent is missing", async () => {
    const forumWriter = writer();
    const response = await categoryAction({
      request: request("/en/categories/help-solutions", {
        title: "Question",
        body: "Details",
      }),
      params: { locale: "en", categoryId: "help-solutions" },
      context: context(forumWriter, true, ["forum.topic.create"]),
    });
    expect(response).toMatchObject({ data: { error: "invalid" }, init: { status: 400 } });
    expect(forumWriter.createTopic).not.toHaveBeenCalled();
  });

  it("guards Help question authoring before writing", async () => {
    const guest = writer();
    const guestResponse = await categoryAction({
      request: request("/en/categories/help-solutions", {
        intent: "createHelpQuestion",
        title: "Question",
        body: "Details",
      }),
      params: { locale: "en", categoryId: "help-solutions" },
      context: context(guest, false, ["forum.topic.create"]),
    });
    expect(guestResponse).toMatchObject({ init: { status: 401 } });
    expect(guest.createTopic).not.toHaveBeenCalled();

    const denied = writer();
    const deniedResponse = await categoryAction({
      request: request("/en/categories/help-solutions", {
        intent: "createHelpQuestion",
        title: "Question",
        body: "Details",
      }),
      params: { locale: "en", categoryId: "help-solutions" },
      context: context(denied, true, ["forum.reply.create"]),
    });
    expect(deniedResponse).toMatchObject({ data: { error: "forbidden" }, init: { status: 403 } });
    expect(denied.createTopic).not.toHaveBeenCalled();

    const crossOrigin = writer();
    const originResponse = await categoryAction({
      request: request("/en/categories/help-solutions", {
        intent: "createHelpQuestion",
        title: "Question",
        body: "Details",
      }, "https://evil.example"),
      params: { locale: "en", categoryId: "help-solutions" },
      context: context(crossOrigin, true, ["forum.topic.create"]),
    });
    expect(originResponse).toMatchObject({ init: { status: 403 } });
    expect(crossOrigin.createTopic).not.toHaveBeenCalled();

    const invalid = writer();
    const invalidResponse = await categoryAction({
      request: request("/en/categories/help-solutions", {
        intent: "createHelpQuestion",
        title: "   ",
        body: "Details",
      }),
      params: { locale: "en", categoryId: "help-solutions" },
      context: context(invalid, true, ["forum.topic.create"]),
    });
    expect(invalidResponse).toMatchObject({ init: { status: 400 } });
    expect(invalid.createTopic).not.toHaveBeenCalled();

    const wrongCategory = writer();
    const wrongCategoryResponse = await categoryAction({
      request: request("/en/categories/development", {
        intent: "createHelpQuestion",
        title: "Question",
        body: "Details",
      }),
      params: { locale: "en", categoryId: "development" },
      context: context(wrongCategory, true, ["forum.topic.create"]),
    });
    expect(wrongCategoryResponse).toMatchObject({ data: { error: "notFound" }, init: { status: 404 } });
    expect(wrongCategory.createTopic).not.toHaveBeenCalled();
  });

  it("does not expose the Help & solutions service section through the generic create-topic action", async () => {
    const forumWriter = writer();
    const response = await sectionAction({
      request: request("/en/sections/help-solutions-questions", { title: "Hidden", body: "Hidden" }),
      params: { locale: "en", sectionId: "help-solutions-questions" },
      context: context(forumWriter),
    });
    expect(response).toMatchObject({ data: { error: "notFound" }, init: { status: 404 } });
    expect(forumWriter.createTopic).not.toHaveBeenCalled();
  });

  it("creates a topic as the session user and redirects to its canonical locale path", async () => {
    const forumWriter = writer();
    const response = await sectionAction({
      request: request("/he/sections/typescript", { title: " A title ", body: " First post ", tags: " TypeScript, Cloudflare, typescript ", authorId: "attacker" }),
      params: { locale: "he", sectionId: "typescript" }, context: context(forumWriter),
    });
    expect(forumWriter.createTopic).toHaveBeenCalledWith({
      sectionId: "typescript", authorId: "session-user", title: "A title", body: "First post",
      tags: ["TypeScript", "Cloudflare", "typescript"],
    });
    if (!(response instanceof Response)) throw new Error("expected redirect response");
    expect(response).toMatchObject({ status: 302 });
    expect(response.headers.get("Location")).toBe("/he/topics/server-topic");
  });

  it("creates a direct reply as the session user and redirects to the new message anchor", async () => {
    const forumWriter = writer();
    const response = await topicAction({
      request: request("/en/topics/topic-1", { body: " A reply ", parentPostId: "post-1" }),
      params: { locale: "en", topicId: "topic-1" }, context: context(forumWriter),
    });
    expect(forumWriter.createReply).toHaveBeenCalledWith({
      topicId: "topic-1",
      authorId: "session-user",
      body: "A reply",
      parentPostId: "post-1",
    });
    if (!(response instanceof Response)) throw new Error("expected redirect response");
    expect(response.headers.get("Location")).toBe("/en/topics/topic-1#post-server-post");
  });

  it("rejects authenticated users without topic/reply permissions before writing", async () => {
    const topicWriter = writer();
    const topicResponse = await sectionAction({
      request: request("/en/sections/typescript", { title: "Denied", body: "Denied" }),
      params: { locale: "en", sectionId: "typescript" },
      context: context(topicWriter, true, ["forum.reply.create"]),
    });
    expect(topicResponse).toMatchObject({ data: { error: "forbidden" }, init: { status: 403 } });
    expect(topicWriter.createTopic).not.toHaveBeenCalled();

    const replyWriter = writer();
    const replyResponse = await topicAction({
      request: request("/en/topics/topic-1", { body: "Denied" }),
      params: { locale: "en", topicId: "topic-1" },
      context: context(replyWriter, true, ["forum.topic.create"]),
    });
    expect(replyResponse).toMatchObject({ data: { error: "forbidden" }, init: { status: 403 } });
    expect(replyWriter.createReply).not.toHaveBeenCalled();
  });

  it("rejects guest, cross-origin, blank, and invalid route input without writing", async () => {
    const guestWriter = writer();
    expect((await topicAction({ request: request("/en/topics/t", { body: "reply" }), params: { locale: "en", topicId: "t" }, context: context(guestWriter, false) }) as { init: { status: number } }).init.status).toBe(401);
    expect(guestWriter.createReply).not.toHaveBeenCalled();

    const crossOriginWriter = writer();
    expect((await topicAction({ request: request("/en/topics/t", { body: "reply" }, "https://evil.example"), params: { locale: "en", topicId: "t" }, context: context(crossOriginWriter) }) as { init: { status: number } }).init.status).toBe(403);
    expect(crossOriginWriter.createReply).not.toHaveBeenCalled();

    const invalidWriter = writer();
    expect((await sectionAction({ request: request("/en/sections/s", { title: "   ", body: "body" }), params: { locale: "en", sectionId: "s" }, context: context(invalidWriter) }) as { init: { status: number } }).init.status).toBe(400);
    expect((await topicAction({ request: request("/en/topics/t", { body: "body" }), params: { locale: "en" }, context: context(invalidWriter) }) as { init: { status: number } }).init.status).toBe(400);
    expect(invalidWriter.createTopic).not.toHaveBeenCalled();
    expect(invalidWriter.createReply).not.toHaveBeenCalled();
  });

  it("returns 429 with Retry-After for the domain cooldown without exposing details", async () => {
    const forumWriter = writer();
    forumWriter.createReply.mockRejectedValueOnce(new ForumWriteRateLimitError(2_100));
    const response = await topicAction({
      request: request("/en/topics/topic-1", { body: "Too soon" }),
      params: { locale: "en", topicId: "topic-1" }, context: context(forumWriter),
    });
    if (response instanceof Response) throw new Error("expected action data response");
    expect(response).toMatchObject({ data: { error: "rateLimited" }, init: { status: 429 } });
    expect(new Headers(response?.init?.headers).get("Retry-After")).toBe("3");
    expect(JSON.stringify(response)).not.toContain("forum write cooldown is active");
  });

  it("derives solution scope from server permissions and ignores forged authorization fields", async () => {
    const ownWriter = writer();
    await topicAction({
      request: request("/en/topics/topic-1", {
        intent: "markSolved",
        actorId: "forged-author",
        authorId: "forged-author",
        role: "admin",
        permission: "forum.solution.manageAny",
        scope: "any",
      }),
      params: { locale: "en", topicId: "topic-1" },
      context: context(ownWriter, true, ["forum.solution.manageOwn"]),
    });
    expect(ownWriter.markTopicSolved).toHaveBeenCalledWith({ topicId: "topic-1", actorId: "session-user", scope: "own" });

    const anyWriter = writer();
    const selected = await topicAction({
      request: request("/en/topics/topic-1", { intent: "selectBestAnswer", postId: "post-2", scope: "own" }),
      params: { locale: "en", topicId: "topic-1" },
      context: context(anyWriter, true, ["forum.solution.manageOwn", "forum.solution.manageAny"]),
    });
    expect(anyWriter.selectBestAnswer).toHaveBeenCalledWith({ topicId: "topic-1", postId: "post-2", actorId: "session-user", scope: "any" });
    if (!(selected instanceof Response)) throw new Error("expected redirect");
    expect(selected.headers.get("Location")).toBe("/en/topics/topic-1?solutionPrompt=post-2#solution-confirmation");
  });

  it("allows only manageAny to set Help solution moderation and ignores forged client authority", async () => {
    const manager = writer();
    const needsReview = await topicAction({
      request: request("/en/topics/help-1", {
        intent: "markSolutionNeedsReview",
        actorId: "forged",
        scope: "own",
        status: "outdated",
        outdatedReason: "forged reason",
      }),
      params: { locale: "en", topicId: "help-1" },
      context: context(manager, true, ["forum.solution.manageAny"]),
    });
    expect(manager.setHelpSolutionModeration).toHaveBeenCalledWith({
      topicId: "help-1",
      status: "needs-review",
      outdatedReason: null,
      actorId: "session-user",
    });
    if (!(needsReview instanceof Response)) throw new Error("expected moderation redirect");
    expect(needsReview.headers.get("Location")).toBe("/en/topics/help-1");

    const outdated = await topicAction({
      request: request("/ru/topics/help-1", {
        intent: "markSolutionOutdated",
        outdatedReason: "  Old workaround is no longer safe.  ",
      }),
      params: { locale: "ru", topicId: "help-1" },
      context: context(manager, true, ["forum.solution.manageAny"]),
    });
    expect(manager.setHelpSolutionModeration).toHaveBeenLastCalledWith({
      topicId: "help-1",
      status: "outdated",
      outdatedReason: "Old workaround is no longer safe.",
      actorId: "session-user",
    });
    if (!(outdated instanceof Response)) throw new Error("expected outdated redirect");
    expect(outdated.headers.get("Location")).toBe("/ru/topics/help-1");

    const clear = await topicAction({
      request: request("/he/topics/help-1", { intent: "clearSolutionModeration" }),
      params: { locale: "he", topicId: "help-1" },
      context: context(manager, true, ["forum.solution.manageAny"]),
    });
    expect(manager.setHelpSolutionModeration).toHaveBeenLastCalledWith({
      topicId: "help-1",
      status: null,
      outdatedReason: null,
      actorId: "session-user",
    });
    if (!(clear instanceof Response)) throw new Error("expected clear redirect");
    expect(clear.headers.get("Location")).toBe("/he/topics/help-1");

    const ownOnly = writer();
    const denied = await topicAction({
      request: request("/en/topics/help-1", { intent: "markSolutionNeedsReview" }),
      params: { locale: "en", topicId: "help-1" },
      context: context(ownOnly, true, ["forum.solution.manageOwn"]),
    });
    expect(denied).toMatchObject({ data: { error: "forbidden" }, init: { status: 403 } });
    expect(ownOnly.setHelpSolutionModeration).not.toHaveBeenCalled();

    const missingReason = writer();
    const invalid = await topicAction({
      request: request("/en/topics/help-1", { intent: "markSolutionOutdated" }),
      params: { locale: "en", topicId: "help-1" },
      context: context(missingReason, true, ["forum.solution.manageAny"]),
    });
    expect(invalid).toMatchObject({ data: { error: "invalid" }, init: { status: 400 } });
    expect(missingReason.setHelpSolutionModeration).not.toHaveBeenCalled();
  });

  it("routes Help signals through their exact server permissions", async () => {
    const submitWriter = writer();
    const submitted = await topicAction({
      request: request("/en/topics/help-question", {
        intent: "submitHelpSignal",
        kind: "needs-details",
        explanation: "Add the exact error output.",
      }),
      params: { locale: "en", topicId: "help-question" },
      context: context(submitWriter, true, ["forum.helpSignal.create"]),
    });
    expect(submitWriter.createHelpSignal).toHaveBeenCalledWith({
      kind: "needs-details",
      topicId: "help-question",
      actorId: "session-user",
      explanation: "Add the exact error output.",
      proposedOriginalTopicId: undefined,
    });
    if (!(submitted instanceof Response)) throw new Error("expected signal redirect");

    const withdrawWriter = writer();
    await topicAction({
      request: request("/en/topics/help-question", {
        intent: "withdrawHelpSignal",
        signalId: "signal-own",
      }),
      params: { locale: "en", topicId: "help-question" },
      context: context(withdrawWriter, true, []),
    });
    expect(withdrawWriter.withdrawHelpSignal).toHaveBeenCalledWith({
      signalId: "signal-own",
      topicId: "help-question",
      actorId: "session-user",
    });

    const reviewCases = [
      ["needs-details", "forum.helpNeedsDetails.manage"],
      ["needs-review", "forum.solution.manageAny"],
      ["solution-outdated", "forum.solution.manageAny"],
      ["duplicate", "forum.helpDuplicate.manage"],
    ] as const;
    for (const [kind, permission] of reviewCases) {
      const reviewWriter = writer();
      const reviewContext = context(reviewWriter, true, [permission]);
      reviewContext.set(forumReaderContext, {
        readHelpSignal: vi.fn(async () => ({
          id: `signal-${kind}`,
          kind,
          topicId: "help-question",
          targetPostId: kind === "needs-review" || kind === "solution-outdated" ? "answer-1" : null,
          proposedOriginalTopicId: kind === "duplicate" ? "help-original" : null,
          submittedByUserId: "other-user",
          explanation: kind === "duplicate" ? null : "Context",
          status: "pending",
          createdAt: new Date(),
          resolvedByUserId: null,
          resolvedAt: null,
        })),
      } as never);
      await topicAction({
        request: request("/en/topics/help-question", {
          intent: "acceptHelpSignal",
          signalId: `signal-${kind}`,
        }),
        params: { locale: "en", topicId: "help-question" },
        context: reviewContext,
      });
      expect(reviewWriter.resolveHelpSignal).toHaveBeenCalledWith({
        signalId: `signal-${kind}`,
        actorId: "session-user",
        resolution: "accepted",
      });

      const deniedWriter = writer();
      const deniedContext = context(deniedWriter, true, ["forum.reply.create"]);
      deniedContext.set(forumReaderContext, {
        readHelpSignal: vi.fn(async () => ({
          id: `signal-${kind}`,
          kind,
          topicId: "help-question",
          targetPostId: null,
          proposedOriginalTopicId: null,
          submittedByUserId: "other-user",
          explanation: "Context",
          status: "pending",
          createdAt: new Date(),
          resolvedByUserId: null,
          resolvedAt: null,
        })),
      } as never);
      const denied = await topicAction({
        request: request("/en/topics/help-question", {
          intent: "rejectHelpSignal",
          signalId: `signal-${kind}`,
        }),
        params: { locale: "en", topicId: "help-question" },
        context: deniedContext,
      });
      expect(denied).toMatchObject({ init: { status: 403 } });
      expect(deniedWriter.resolveHelpSignal).not.toHaveBeenCalled();
    }

    const deniedSubmitWriter = writer();
    const deniedSubmit = await topicAction({
      request: request("/en/topics/help-question", {
        intent: "submitHelpSignal",
        kind: "duplicate",
        proposedOriginalTopicId: "help-original",
      }),
      params: { locale: "en", topicId: "help-question" },
      context: context(deniedSubmitWriter, true, ["forum.reply.create"]),
    });
    expect(deniedSubmit).toMatchObject({ init: { status: 403 } });
    expect(deniedSubmitWriter.createHelpSignal).not.toHaveBeenCalled();
  });

  it("routes Help duplicate management and appeals through separate server boundaries", async () => {
    const manager = writer();
    const confirmed = await topicAction({
      request: request("/en/topics/help-duplicate", {
        intent: "confirmHelpDuplicate",
        originalTopicId: "help-original",
        actorId: "forged",
      }),
      params: { locale: "en", topicId: "help-duplicate" },
      context: context(manager, true, ["forum.helpDuplicate.manage"]),
    });
    expect(manager.confirmHelpDuplicate).toHaveBeenCalledWith({
      topicId: "help-duplicate",
      originalTopicId: "help-original",
      actorId: "session-user",
    });
    if (!(confirmed instanceof Response)) throw new Error("expected duplicate redirect");
    expect(confirmed.headers.get("Location")).toBe("/en/topics/help-duplicate");

    const denied = writer();
    const deniedResponse = await topicAction({
      request: request("/en/topics/help-duplicate", {
        intent: "confirmHelpDuplicate",
        originalTopicId: "help-original",
      }),
      params: { locale: "en", topicId: "help-duplicate" },
      context: context(denied, true, ["forum.solution.manageAny"]),
    });
    expect(deniedResponse).toMatchObject({ data: { error: "forbidden" }, init: { status: 403 } });
    expect(denied.confirmHelpDuplicate).not.toHaveBeenCalled();

    const author = writer();
    const appealed = await topicAction({
      request: request("/ru/topics/help-duplicate", {
        intent: "appealHelpDuplicate",
        explanation: "  Причина отличается.  ",
        role: "admin",
      }),
      params: { locale: "ru", topicId: "help-duplicate" },
      context: context(author, true, []),
    });
    expect(author.appealHelpDuplicate).toHaveBeenCalledWith({
      topicId: "help-duplicate",
      actorId: "session-user",
      explanation: "Причина отличается.",
    });
    if (!(appealed instanceof Response)) throw new Error("expected appeal redirect");
    expect(appealed.headers.get("Location")).toBe("/ru/topics/help-duplicate");

    const invalidAppeal = writer();
    const invalidResponse = await topicAction({
      request: request("/en/topics/help-duplicate", {
        intent: "appealHelpDuplicate",
        explanation: "   ",
      }),
      params: { locale: "en", topicId: "help-duplicate" },
      context: context(invalidAppeal, true, []),
    });
    expect(invalidResponse).toMatchObject({ data: { error: "invalid" }, init: { status: 400 } });
    expect(invalidAppeal.appealHelpDuplicate).not.toHaveBeenCalled();

    const reviewer = writer();
    await topicAction({
      request: request("/he/topics/help-duplicate", { intent: "acceptHelpDuplicateAppeal" }),
      params: { locale: "he", topicId: "help-duplicate" },
      context: context(reviewer, true, ["forum.helpDuplicate.manage"]),
    });
    expect(reviewer.resolveHelpDuplicateAppeal).toHaveBeenCalledWith({
      topicId: "help-duplicate",
      actorId: "session-user",
      resolution: "accepted",
    });

    await topicAction({
      request: request("/he/topics/help-duplicate", { intent: "rejectHelpDuplicateAppeal" }),
      params: { locale: "he", topicId: "help-duplicate" },
      context: context(reviewer, true, ["forum.helpDuplicate.manage"]),
    });
    expect(reviewer.resolveHelpDuplicateAppeal).toHaveBeenLastCalledWith({
      topicId: "help-duplicate",
      actorId: "session-user",
      resolution: "rejected",
    });

    const removed = await topicAction({
      request: request("/en/topics/help-duplicate", { intent: "removeHelpDuplicate" }),
      params: { locale: "en", topicId: "help-duplicate" },
      context: context(reviewer, true, ["forum.helpDuplicate.manage"]),
    });
    expect(reviewer.removeHelpDuplicate).toHaveBeenCalledWith({
      topicId: "help-duplicate",
      actorId: "session-user",
    });
    if (!(removed instanceof Response)) throw new Error("expected remove redirect");
  });

  it("redirects best-answer selection to the selected post when no solved confirmation will render", async () => {
    const solvedWriter = writer();
    solvedWriter.selectBestAnswer.mockResolvedValueOnce({ topicAuthorId: "session-user", isSolved: true });
    const solvedResponse = await topicAction({
      request: request("/en/topics/topic-1", { intent: "selectBestAnswer", postId: "post-3" }),
      params: { locale: "en", topicId: "topic-1" },
      context: context(solvedWriter, true, ["forum.solution.manageOwn"]),
    });
    if (!(solvedResponse instanceof Response)) throw new Error("expected solved-topic redirect");
    expect(solvedResponse.headers.get("Location")).toBe("/en/topics/topic-1#post-post-3");

    const managerWriter = writer();
    managerWriter.selectBestAnswer.mockResolvedValueOnce({ topicAuthorId: "topic-author", isSolved: false });
    const managerResponse = await topicAction({
      request: request("/en/topics/topic-1", { intent: "selectBestAnswer", postId: "post-4" }),
      params: { locale: "en", topicId: "topic-1" },
      context: context(managerWriter, true, ["forum.solution.manageAny"]),
    });
    if (!(managerResponse instanceof Response)) throw new Error("expected manager redirect");
    expect(managerResponse.headers.get("Location")).toBe("/en/topics/topic-1#post-post-4");
  });

  it("denies solution mutations when no solution permission is effective", async () => {
    const forumWriter = writer();
    const response = await topicAction({
      request: request("/en/topics/topic-1", { intent: "markSolved", role: "admin", scope: "any" }),
      params: { locale: "en", topicId: "topic-1" },
      context: context(forumWriter, true, ["forum.reply.create"]),
    });
    expect(response).toMatchObject({ data: { error: "forbidden" }, init: { status: 403 } });
    expect(forumWriter.markTopicSolved).not.toHaveBeenCalled();
  });

  it("denies guest, cross-origin, and repository authorization/state failures with controlled semantics", async () => {
    const guest = writer();
    const guestResponse = await topicAction({ request: request("/en/topics/t", { intent: "markSolved" }), params: { locale: "en", topicId: "t" }, context: context(guest, false) });
    expect(guestResponse).toMatchObject({ init: { status: 401 } });
    expect(guest.markTopicSolved).not.toHaveBeenCalled();

    const crossOrigin = writer();
    const originResponse = await topicAction({ request: request("/en/topics/t", { intent: "markSolved" }, "https://evil.example"), params: { locale: "en", topicId: "t" }, context: context(crossOrigin) });
    expect(originResponse).toMatchObject({ init: { status: 403 } });
    expect(crossOrigin.markTopicSolved).not.toHaveBeenCalled();

    for (const [error, status] of [[new ForumAuthorizationError("domain authorization detail"), 403], [new ForumEntityNotFoundError("domain missing detail"), 404], [new ForumStateConflictError("domain conflict detail"), 409]] as const) {
      const nonAuthor = writer();
      nonAuthor.markTopicSolved.mockRejectedValueOnce(error);
      const response = await topicAction({ request: request("/en/topics/t", { intent: "markSolved" }), params: { locale: "en", topicId: "t" }, context: context(nonAuthor) });
      expect(response).toMatchObject({ init: { status } });
      expect(JSON.stringify(response)).not.toContain(error.message);
    }
  });
  it("derives source-locale correction scope from server permissions and ignores forged fields", async () => {
    const ownWriter = writer();
    const ownResponse = await topicAction({
      request: request("/en/topics/topic-1", {
        intent: "correctTitleSourceLocale",
        expectedRevisionId: "title-r1",
        sourceLocale: "ru",
        actorId: "forged",
        authorId: "forged",
        role: "admin",
        scope: "any",
      }),
      params: { locale: "en", topicId: "topic-1" },
      context: context(ownWriter, true, ["forum.sourceLocale.correctOwn"]),
    });
    expect(ownWriter.correctTopicTitleSourceLocale).toHaveBeenCalledWith({
      topicId: "topic-1",
      expectedRevisionId: "title-r1",
      sourceLocale: "ru",
      actorId: "session-user",
      scope: "own",
    });
    if (!(ownResponse instanceof Response)) throw new Error("expected correction redirect");
    expect(ownResponse.headers.get("Location")).toBe("/en/topics/topic-1");

    const anyWriter = writer();
    const anyResponse = await topicAction({
      request: request("/he/topics/topic-1", {
        intent: "correctPostSourceLocale",
        postId: "post-2",
        expectedRevisionId: "post-r1",
        sourceLocale: "fr",
      }),
      params: { locale: "he", topicId: "topic-1" },
      context: context(anyWriter, true, ["forum.sourceLocale.correctOwn", "forum.sourceLocale.correctAny"]),
    });
    expect(anyWriter.correctPostBodySourceLocale).toHaveBeenCalledWith({
      topicId: "topic-1",
      postId: "post-2",
      expectedRevisionId: "post-r1",
      sourceLocale: "fr",
      actorId: "session-user",
      scope: "any",
    });
    if (!(anyResponse instanceof Response)) throw new Error("expected correction redirect");
    expect(anyResponse.headers.get("Location")).toBe("/he/topics/topic-1#post-post-2");
  });

  it("rejects unauthorized/guest/cross-origin source-locale corrections before writing", async () => {
    const denied = writer();
    const deniedResponse = await topicAction({
      request: request("/en/topics/topic-1", {
        intent: "correctTitleSourceLocale",
        expectedRevisionId: "title-r1",
        sourceLocale: "ru",
      }),
      params: { locale: "en", topicId: "topic-1" },
      context: context(denied, true, ["forum.reply.create"]),
    });
    expect(deniedResponse).toMatchObject({ data: { error: "forbidden", operation: "sourceLocaleCorrection" }, init: { status: 403 } });
    expect(denied.correctTopicTitleSourceLocale).not.toHaveBeenCalled();

    const guest = writer();
    const guestRequest = request("/en/topics/topic-1", {
      intent: "correctTitleSourceLocale",
      expectedRevisionId: "title-r1",
      sourceLocale: "ru",
    });
    const guestFormData = vi.spyOn(guestRequest, "formData");
    const guestResponse = await topicAction({
      request: guestRequest,
      params: { locale: "en", topicId: "topic-1" },
      context: context(guest, false),
    });
    expect(guestResponse).toMatchObject({ data: { error: "unauthenticated" }, init: { status: 401 } });
    expect(guestFormData).not.toHaveBeenCalled();
    expect((guestResponse as { data: object }).data).not.toHaveProperty("operation");
    expect(guest.correctTopicTitleSourceLocale).not.toHaveBeenCalled();

    const crossOrigin = writer();
    const crossOriginRequest = request("/en/topics/topic-1", {
      intent: "correctTitleSourceLocale",
      expectedRevisionId: "title-r1",
      sourceLocale: "ru",
    }, "https://evil.example");
    const crossOriginFormData = vi.spyOn(crossOriginRequest, "formData");
    const crossOriginResponse = await topicAction({
      request: crossOriginRequest,
      params: { locale: "en", topicId: "topic-1" },
      context: context(crossOrigin),
    });
    expect(crossOriginResponse).toMatchObject({ data: { error: "origin" }, init: { status: 403 } });
    expect(crossOriginFormData).not.toHaveBeenCalled();
    expect((crossOriginResponse as { data: object }).data).not.toHaveProperty("operation");
    expect(crossOrigin.correctTopicTitleSourceLocale).not.toHaveBeenCalled();
  });

  it("maps only classified correction storage outages and propagates unexpected writer failures", async () => {
    const unavailable = writer();
    unavailable.correctTopicTitleSourceLocale.mockRejectedValueOnce(new ForumStorageUnavailableError());
    const unavailableResponse = await topicAction({
      request: request("/en/topics/topic-1", {
        intent: "correctTitleSourceLocale",
        expectedRevisionId: "title-r1",
        sourceLocale: "ru",
      }),
      params: { locale: "en", topicId: "topic-1" },
      context: context(unavailable, true, ["forum.sourceLocale.correctOwn"]),
    });
    expect(unavailableResponse).toMatchObject({
      data: { error: "unavailable", operation: "sourceLocaleCorrection" },
      init: { status: 503 },
    });

    const unexpected = writer();
    const failure = new Error("unexpected correction bug");
    unexpected.correctTopicTitleSourceLocale.mockRejectedValueOnce(failure);
    await expect(topicAction({
      request: request("/en/topics/topic-1", {
        intent: "correctTitleSourceLocale",
        expectedRevisionId: "title-r1",
        sourceLocale: "ru",
      }),
      params: { locale: "en", topicId: "topic-1" },
      context: context(unexpected, true, ["forum.sourceLocale.correctOwn"]),
    })).rejects.toBe(failure);
  });

  it("maps only classified authorization outages to controlled 503 responses", async () => {
    const topicWriter = writer();
    const topicUnavailable = await sectionAction({
      request: request("/en/sections/typescript", { title: "Unavailable", body: "Unavailable" }),
      params: { locale: "en", sectionId: "typescript" },
      context: context(topicWriter, true, allForumPermissions, new AuthorizationUnavailableError()),
    });
    expect(topicUnavailable).toMatchObject({ data: { error: "unavailable" }, init: { status: 503 } });
    expect(topicWriter.createTopic).not.toHaveBeenCalled();

    const unexpectedTopic = writer();
    const unexpected = new Error("unexpected authorization bug");
    await expect(sectionAction({
      request: request("/en/sections/typescript", { title: "Unexpected", body: "Unexpected" }),
      params: { locale: "en", sectionId: "typescript" },
      context: context(unexpectedTopic, true, allForumPermissions, unexpected),
    })).rejects.toBe(unexpected);
    expect(unexpectedTopic.createTopic).not.toHaveBeenCalled();

    const solutionWriter = writer();
    const solutionUnavailable = await topicAction({
      request: request("/en/topics/topic-1", { intent: "markSolved" }),
      params: { locale: "en", topicId: "topic-1" },
      context: context(solutionWriter, true, allForumPermissions, new AuthorizationUnavailableError()),
    });
    expect(solutionUnavailable).toMatchObject({ data: { error: "unavailable" }, init: { status: 503 } });
    expect(solutionWriter.markTopicSolved).not.toHaveBeenCalled();

    const unexpectedSolution = writer();
    const solutionBug = new Error("unexpected solution authorization bug");
    await expect(topicAction({
      request: request("/en/topics/topic-1", { intent: "markSolved" }),
      params: { locale: "en", topicId: "topic-1" },
      context: context(unexpectedSolution, true, allForumPermissions, solutionBug),
    })).rejects.toBe(solutionBug);
    expect(unexpectedSolution.markTopicSolved).not.toHaveBeenCalled();
  });


  it("guards generation requests before form parsing for guests and cross-origin callers", async () => {
    const guestRequest = request("/he/topics/topic-1", {
      intent: "generateTopicTitleTranslation",
    });
    const guestForm = vi.spyOn(guestRequest, "formData");
    const guestResponse = await topicAction({
      request: guestRequest,
      params: { locale: "he", topicId: "topic-1" },
      context: generationContext({
        authenticated: false,
        topic: generationTopic,
      }),
    });
    expect(guestResponse).toMatchObject({ init: { status: 401 } });
    expect(guestForm).not.toHaveBeenCalled();

    const crossOriginRequest = request(
      "/he/topics/topic-1",
      { intent: "generateTopicTitleTranslation" },
      "https://evil.example",
    );
    const crossOriginForm = vi.spyOn(crossOriginRequest, "formData");
    const crossOriginResponse = await topicAction({
      request: crossOriginRequest,
      params: { locale: "he", topicId: "topic-1" },
      context: generationContext({ topic: generationTopic }),
    });
    expect(crossOriginResponse).toMatchObject({ init: { status: 403 } });
    expect(crossOriginForm).not.toHaveBeenCalled();
  });

  it("requires translation permission before generation capability work", async () => {
    const capability = generationCapability();
    const response = await topicAction({
      request: request("/he/topics/topic-1", {
        intent: "generateTopicTitleTranslation",
      }),
      params: { locale: "he", topicId: "topic-1" },
      context: generationContext({
        capability,
        permissions: ["forum.reply.create"],
        topic: generationTopic,
      }),
    });
    expect(response).toMatchObject({ init: { status: 403 } });
    expect(capability.generateTopicTitle).not.toHaveBeenCalled();
  });

  it("derives title actor, revision and target from server state and ignores forged generation fields", async () => {
    const capability = generationCapability();
    const response = await topicAction({
      request: request("/he/topics/topic-1", {
        intent: "generateTopicTitleTranslation",
        locale: "fr",
        targetLocale: "fr",
        sourceLocale: "fr",
        actorId: "attacker",
        revisionId: "forged-revision",
        originalContent: "forged content",
        cost: "999",
        provider: "forged-provider",
        allowance: "admitted",
      }),
      params: { locale: "he", topicId: "topic-1" },
      context: generationContext({
        capability,
        locale: "he",
        topic: generationTopic,
      }),
    });
    expect(response).toMatchObject({
      data: { operation: "contentGeneration", outcome: "queued" },
      init: { status: 202 },
    });
    expect(capability.generateTopicTitle).toHaveBeenCalledWith({
      actorId: "session-user",
      revision: {
        contentType: "topic-title",
        contentId: "topic-1",
        revisionId: "title-r1",
        originalContent: "Authoritative title",
        sourceLocale: "en",
      },
      targetLocale: "he",
    });
  });

  it("generates only a post belonging to the current route topic", async () => {
    const capability = generationCapability();
    const contextValue = generationContext({ capability, topic: generationTopic });

    const missing = await topicAction({
      request: request("/he/topics/topic-1", {
        intent: "generatePostBodyTranslation",
        postId: "other-topic-post",
      }),
      params: { locale: "he", topicId: "topic-1" },
      context: contextValue,
    });
    expect(missing).toMatchObject({
      data: { operation: "contentGeneration", outcome: "not-found" },
      init: { status: 404 },
    });
    expect(capability.generateAutomaticPostBody).not.toHaveBeenCalled();

    const accepted = await topicAction({
      request: request("/he/topics/topic-1", {
        intent: "generatePostBodyTranslation",
        postId: "post-1",
        revisionId: "forged",
        sourceLocale: "fr",
      }),
      params: { locale: "he", topicId: "topic-1" },
      context: generationContext({ capability, topic: generationTopic }),
    });
    expect(accepted).toMatchObject({ init: { status: 202 } });
    expect(capability.generateAutomaticPostBody).toHaveBeenCalledWith({
      actorId: "session-user",
      revision: {
        contentType: "post-body",
        contentId: "post-1",
        revisionId: "post-r1",
        originalContent: "Authoritative post body",
        sourceLocale: "en",
      },
      targetLocale: "he",
    });
  });

  it("routes explicit post generation through the same authoritative server unit", async () => {
    const capability = generationCapability();
    const response = await topicAction({
      request: request("/he/topics/topic-1", {
        intent: "generateExplicitPostBodyTranslation",
        postId: "post-1",
        actorId: "forged",
        targetLocale: "fr",
        revisionId: "forged",
      }),
      params: { locale: "he", topicId: "topic-1" },
      context: generationContext({ capability, topic: generationTopic }),
    });

    expect(response).toMatchObject({ init: { status: 202 } });
    expect(capability.generateExplicitPostBody).toHaveBeenCalledWith({
      actorId: "session-user",
      revision: {
        contentType: "post-body",
        contentId: "post-1",
        revisionId: "post-r1",
        originalContent: "Authoritative post body",
        sourceLocale: "en",
      },
      targetLocale: "he",
    });
    expect(capability.generateAutomaticPostBody).not.toHaveBeenCalled();
  });

  it("fails closed when generation is disabled and maps bounded planner outcomes", async () => {
    const disabled = await topicAction({
      request: request("/he/topics/topic-1", {
        intent: "generateTopicTitleTranslation",
      }),
      params: { locale: "he", topicId: "topic-1" },
      context: generationContext({
        runtime: { enabled: false },
        topic: generationTopic,
      }),
    });
    expect(disabled).toMatchObject({
      data: { operation: "contentGeneration", outcome: "unavailable" },
      init: { status: 503 },
    });

    const budget = await topicAction({
      request: request("/he/topics/topic-1", {
        intent: "generateTopicTitleTranslation",
      }),
      params: { locale: "he", topicId: "topic-1" },
      context: generationContext({
        capability: generationCapability({
          outcome: "budget-denied",
          retryAfterSeconds: 11,
        }),
        topic: generationTopic,
      }),
    });
    expect(budget).toMatchObject({
      data: {
        operation: "contentGeneration",
        outcome: "no-op",
        reason: "request-budget-denied",
        retryAfterSeconds: 11,
      },
      init: { status: 429 },
    });
    if (!budget || budget instanceof Response) throw new Error("expected generation action data");
    expect(new Headers(budget.init?.headers).get("Retry-After")).toBe("11");

    const explicit = await topicAction({
      request: request("/he/topics/topic-1", {
        intent: "generatePostBodyTranslation",
        postId: "post-1",
      }),
      params: { locale: "he", topicId: "topic-1" },
      context: generationContext({
        capability: generationCapability({ outcome: "explicit-required" }),
        topic: generationTopic,
      }),
    });
    expect(explicit).toMatchObject({
      data: { operation: "contentGeneration", outcome: "explicit-required" },
      init: { status: 200 },
    });
  });

  it("maps classified failures from the real Hyperdrive forum reader to generation 503", async () => {
    const readerClient = {
      connect: vi.fn(async () => undefined),
      query: vi.fn(async () => { throw new Error("Query read timeout"); }),
      end: vi.fn(async () => undefined),
    } as unknown as Client;
    const contextValue = generationContext({ topic: generationTopic });
    contextValue.set(
      forumReaderContext,
      createHyperdriveForumReader(
        "postgresql://example.invalid/db",
        () => readerClient,
      ),
    );

    const response = await topicAction({
      request: request("/he/topics/topic-1", {
        intent: "generateTopicTitleTranslation",
      }),
      params: { locale: "he", topicId: "topic-1" },
      context: contextValue,
    });

    expect(response).toMatchObject({
      data: { operation: "contentGeneration", outcome: "unavailable" },
      init: { status: 503 },
    });
  });

  it("propagates unexpected failures from the real Hyperdrive forum reader", async () => {
    const failure = new TypeError("unexpected reader configuration bug");
    const readerClient = {
      connect: vi.fn(async () => { throw failure; }),
      query: vi.fn(),
      end: vi.fn(async () => undefined),
    } as unknown as Client;
    const contextValue = generationContext({ topic: generationTopic });
    contextValue.set(
      forumReaderContext,
      createHyperdriveForumReader(
        "postgresql://example.invalid/db",
        () => readerClient,
      ),
    );

    await expect(topicAction({
      request: request("/he/topics/topic-1", {
        intent: "generateTopicTitleTranslation",
      }),
      params: { locale: "he", topicId: "topic-1" },
      context: contextValue,
    })).rejects.toBe(failure);
  });

  it("maps classified generation availability to 503 and propagates unexpected errors", async () => {
    const unavailableCapability = generationCapability();
    unavailableCapability.generateTopicTitle.mockRejectedValueOnce(
      new ContentGenerationPlanningUnavailableError(),
    );
    const unavailable = await topicAction({
      request: request("/he/topics/topic-1", {
        intent: "generateTopicTitleTranslation",
      }),
      params: { locale: "he", topicId: "topic-1" },
      context: generationContext({
        capability: unavailableCapability,
        topic: generationTopic,
      }),
    });
    expect(unavailable).toMatchObject({ init: { status: 503 } });

    const failure = new Error("unexpected generation failure");
    const brokenCapability = generationCapability();
    brokenCapability.generateTopicTitle.mockRejectedValueOnce(failure);
    await expect(topicAction({
      request: request("/he/topics/topic-1", {
        intent: "generateTopicTitleTranslation",
      }),
      params: { locale: "he", topicId: "topic-1" },
      context: generationContext({
        capability: brokenCapability,
        topic: generationTopic,
      }),
    })).rejects.toBe(failure);
  });

});
