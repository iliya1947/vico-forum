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
  "forum.solution.manageOwn",
  "forum.solution.manageAny",
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
    createTopic: vi.fn(async () => ({ topicId: "server-topic" })),
    createReply: vi.fn(async () => ({ postId: "server-post" })),
    markTopicSolved: vi.fn(async () => undefined),
    selectBestAnswer: vi.fn(async () => undefined),
    correctTopicTitleSourceLocale: vi.fn(async () => undefined),
    correctPostBodySourceLocale: vi.fn(async () => undefined),
  } satisfies ForumWriter;
}

describe("forum write route actions", () => {
  it("creates a topic as the session user and redirects to its canonical locale path", async () => {
    const forumWriter = writer();
    const response = await sectionAction({
      request: request("/he/sections/typescript", { title: " A title ", body: " First post ", authorId: "attacker" }),
      params: { locale: "he", sectionId: "typescript" }, context: context(forumWriter),
    });
    expect(forumWriter.createTopic).toHaveBeenCalledWith({
      sectionId: "typescript", authorId: "session-user", title: "A title", body: "First post",
    });
    if (!(response instanceof Response)) throw new Error("expected redirect response");
    expect(response).toMatchObject({ status: 302 });
    expect(response.headers.get("Location")).toBe("/he/topics/server-topic");
  });

  it("creates a reply as the session user and redirects to the canonical topic", async () => {
    const forumWriter = writer();
    const response = await topicAction({
      request: request("/en/topics/topic-1", { body: " A reply " }),
      params: { locale: "en", topicId: "topic-1" }, context: context(forumWriter),
    });
    expect(forumWriter.createReply).toHaveBeenCalledWith({ topicId: "topic-1", authorId: "session-user", body: "A reply" });
    if (!(response instanceof Response)) throw new Error("expected redirect response");
    expect(response.headers.get("Location")).toBe("/en/topics/topic-1");
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
    expect(selected.headers.get("Location")).toBe("/en/topics/topic-1#post-post-2");
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

  it("explicit post generation reuses authoritative server inputs and only selects the explicit capability", async () => {
    const capability = generationCapability();
    const response = await topicAction({
      request: request("/he/topics/topic-1", {
        intent: "generateExplicitPostBodyTranslation",
        postId: "post-1",
        revisionId: "forged",
        sourceLocale: "fr",
        targetLocale: "fr",
        actorId: "attacker",
        budget: "forged",
        provider: "forged",
        allowance: "forged",
      }),
      params: { locale: "he", topicId: "topic-1" },
      context: generationContext({ capability, topic: generationTopic }),
    });

    expect(response).toMatchObject({ init: { status: 202 } });
    expect(capability.generateAutomaticPostBody).not.toHaveBeenCalled();
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
