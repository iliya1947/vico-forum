import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { authSessionContext, type AuthSession } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { forumReaderContext } from "../forum/request-context";
import {
  contentGenerationActionContext,
  contentGenerationStatusContext,
  contentTranslationPresentationContext,
  localeContext,
  registryLoaderContext,
} from "../localization/request-context";
import { assemblePersistentRegistry } from "../localization/persistent-registry";
import type { PermissionKey } from "../authorization/catalog";
import { loader } from "./topic";

const session = {
  user: {
    id: "session-user",
    name: "Ada",
    email: "ada@example.test",
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  session: {
    id: "session",
    token: "token",
    userId: "session-user",
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
} satisfies AuthSession;

const topic = {
  id: "topic-1",
  sectionId: "section-1",
  authorId: "author-1",
  authorName: "Author",
  createdAt: new Date("2026-01-01"),
  isSolved: false,
  bestAnswerPostId: null,
  title: {
    id: "title-r1",
    originalContent: "Исходный заголовок",
    sourceLocale: "ru",
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
      originalContent: "Исходное сообщение",
      sourceLocale: "und",
    },
  }],
};

function presentation(contentType: "topic-title" | "post-body", contentId: string, revisionId: string, content: string) {
  return {
    contentType,
    contentId,
    revisionId,
    selected: "original" as const,
    content,
    contentLocale: "ru",
    contentDirection: "ltr" as const,
    originalContent: content,
    originalLocale: "ru",
    originalDirection: "ltr" as const,
    fallbackReason: "missing" as const,
  };
}

async function context(options: {
  authenticated?: boolean;
  generationPermission?: boolean;
  authorizationError?: Error;
  runtimeEnabled?: boolean;
  statusError?: Error;
}) {
  const value = new RouterContextProvider();
  const registry = await assemblePersistentRegistry([]);
  const statusRead = vi.fn(async (units: readonly any[]) => {
    if (options.statusError) throw options.statusError;
    return units.map((unit) => ({ ...unit, state: "idle" as const }));
  });
  const capability = {
    generateTopicTitle: vi.fn(),
    generateAutomaticPostBody: vi.fn(),
    generateExplicitPostBody: vi.fn(),
  };

  value.set(authSessionContext, options.authenticated === false ? null : session);
  value.set(forumReaderContext, {
    readTopicPage: vi.fn(async () => topic),
  } as never);
  value.set(localeContext, {
    translationLocale: "he",
    fallbackLocales: ["en"],
    direction: "rtl",
    formatting: { locale: "he", timeZone: "UTC" },
    nativeName: "עברית",
    presentationMetadata: {},
  });
  value.set(registryLoaderContext, async () => registry);
  value.set(contentTranslationPresentationContext, {
    readCurrent: vi.fn(async () => [
      presentation("topic-title", "topic-1", "title-r1", topic.title.originalContent),
      presentation("post-body", "post-1", "post-r1", topic.posts[0]!.body.originalContent),
    ]),
  } as never);
  value.set(contentGenerationStatusContext, { readCurrent: statusRead });
  value.set(contentGenerationActionContext, options.runtimeEnabled === false
    ? { enabled: false }
    : { enabled: true, capability: capability as never });
  value.set(authorizationContext, {
    forUser: () => ({
      resolve: vi.fn(),
      has: vi.fn(async (permission: PermissionKey) => {
        if (options.authorizationError) throw options.authorizationError;
        return permission === "forum.translation.generate"
          ? options.generationPermission !== false
          : false;
      }),
    }),
  } as never);

  return { value, statusRead, capability };
}

describe("topic loader generation presentation", () => {
  it("keeps guests on the public read path without generation status or side effects", async () => {
    const harness = await context({ authenticated: false });
    const result = await loader({
      params: { locale: "he", topicId: "topic-1" },
      context: harness.value,
    });

    expect(result.generationUnits).toBeNull();
    expect(harness.statusRead).not.toHaveBeenCalled();
    expect(harness.capability.generateTopicTitle).not.toHaveBeenCalled();
    expect(harness.capability.generateAutomaticPostBody).not.toHaveBeenCalled();
    expect(harness.capability.generateExplicitPostBody).not.toHaveBeenCalled();
  });

  it("reads one bounded status batch only for an authenticated effective generation permission", async () => {
    const harness = await context({ authenticated: true, generationPermission: true });
    const result = await loader({
      params: { locale: "he", topicId: "topic-1" },
      context: harness.value,
    });

    expect(harness.statusRead).toHaveBeenCalledTimes(1);
    expect(harness.statusRead).toHaveBeenCalledWith([
      {
        contentType: "topic-title",
        contentId: "topic-1",
        revisionId: "title-r1",
        targetLocale: "he",
      },
      {
        contentType: "post-body",
        contentId: "post-1",
        revisionId: "post-r1",
        targetLocale: "he",
      },
    ]);
    expect(result.generationUnits).toHaveLength(2);
    expect(result.generationUnits?.every((unit) => unit.autoEligible)).toBe(true);

    const serialized = JSON.stringify(result.generationUnits);
    for (const sensitive of ["session-user", "taskId", "claimToken", "provider", "allowance"]) {
      expect(serialized).not.toContain(sensitive);
    }
  });

  it("uses next-request dynamic permission freshness and fail-closed optional presentation", async () => {
    const allowed = await context({ generationPermission: true });
    const denied = await context({ generationPermission: false });

    const allowedResult = await loader({
      params: { locale: "he", topicId: "topic-1" },
      context: allowed.value,
    });
    const deniedResult = await loader({
      params: { locale: "he", topicId: "topic-1" },
      context: denied.value,
    });

    expect(allowedResult.generationUnits).not.toBeNull();
    expect(deniedResult.generationUnits).toBeNull();
    expect(denied.statusRead).not.toHaveBeenCalled();

    const unavailable = await context({
      authorizationError: new AuthorizationUnavailableError(),
    });
    const unavailableResult = await loader({
      params: { locale: "he", topicId: "topic-1" },
      context: unavailable.value,
    });
    expect(unavailableResult.generationUnits).toBeNull();
    expect(unavailable.statusRead).not.toHaveBeenCalled();
  });

  it("suppresses controls when the Worker generation runtime is disabled", async () => {
    const harness = await context({
      generationPermission: true,
      runtimeEnabled: false,
    });
    const result = await loader({
      params: { locale: "he", topicId: "topic-1" },
      context: harness.value,
    });

    expect(result.generationUnits).toBeNull();
    expect(harness.statusRead).not.toHaveBeenCalled();
  });

  it("propagates unexpected authorization failures instead of treating them as denial", async () => {
    const failure = new TypeError("unexpected authorization bug");
    const harness = await context({ authorizationError: failure });
    await expect(loader({
      params: { locale: "he", topicId: "topic-1" },
      context: harness.value,
    })).rejects.toBe(failure);
  });
});
