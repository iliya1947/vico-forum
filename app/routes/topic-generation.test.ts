import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

import type { AuthSession } from "../auth/request-context";
import { authSessionContext } from "../auth/request-context";
import type { PermissionKey } from "../authorization/catalog";
import { authorizationContext } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { forumReaderContext } from "../forum/request-context";
import type { ForumReader } from "../../db/forum-repository";
import {
  ContentGenerationStatusStorageUnavailableError,
  type ContentGenerationStatusSnapshot,
} from "../localization/content-generation-status";
import {
  contentGenerationActionContext,
  contentGenerationStatusContext,
  contentTranslationPresentationContext,
  localeContext,
  registryLoaderContext,
} from "../localization/request-context";
import { ContentTranslationPresentationService } from "../localization/content-translation-presentation";
import { localeRegistry } from "../localization/registry";
import { loader as topicLoader } from "./topic";

const session = {
  user: {
    id: "user-1",
    name: "User",
    email: "user@example.test",
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  session: {
    id: "session-1",
    token: "token",
    userId: "user-1",
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
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
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
  posts: [
    {
      id: "post-short",
      topicId: "topic-1",
      authorId: "author-2",
      authorName: "Short",
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
      body: {
        id: "post-short-r1",
        originalContent: "Короткий текст",
        sourceLocale: "und",
      },
    },
    {
      id: "post-long",
      topicId: "topic-1",
      authorId: "author-3",
      authorName: "Long",
      createdAt: new Date("2026-01-03T00:00:00.000Z"),
      body: {
        id: "post-long-r1",
        originalContent: "а".repeat(3_001),
        sourceLocale: "ru",
      },
    },
  ],
};

const forumReader: ForumReader = {
  listCategories: async () => [],
  readCategory: async () => undefined,
  readSection: async () => undefined,
  readTopicPage: async (id) => id === topic.id ? topic : undefined,
};

function context(options: {
  authenticated?: boolean;
  permission?: boolean;
  authorizationError?: Error;
  statusError?: Error;
  statuses?: readonly ContentGenerationStatusSnapshot[];
} = {}) {
  const value = new RouterContextProvider();
  value.set(authSessionContext, options.authenticated === false ? null : session);
  value.set(forumReaderContext, forumReader);
  value.set(localeContext, {
    translationLocale: "he",
    fallbackLocales: ["en"],
    direction: "rtl",
    formatting: { locale: "he", timeZone: "UTC" },
    nativeName: "עברית",
    presentationMetadata: {},
  });
  value.set(registryLoaderContext, async () => ({
    registry: localeRegistry,
    semanticIdentity: "test",
    health: { status: "healthy" as const },
  }));
  value.set(
    contentTranslationPresentationContext,
    new ContentTranslationPresentationService({
      readBatch: async () => ({ translations: [] }),
    }),
  );

  const has = vi.fn(async (permission: PermissionKey) => {
    if (options.authorizationError) throw options.authorizationError;
    if (permission === "forum.translation.generate") return options.permission ?? true;
    return false;
  });
  value.set(authorizationContext, {
    forUser: () => ({ resolve: vi.fn(), has }),
  } as never);

  const readCurrent = vi.fn(async () => {
    if (options.statusError) throw options.statusError;
    return options.statuses ?? [
      {
        contentType: "topic-title" as const,
        contentId: "topic-1",
        revisionId: "title-r1",
        targetLocale: "he",
        status: "idle" as const,
      },
      {
        contentType: "post-body" as const,
        contentId: "post-short",
        revisionId: "post-short-r1",
        targetLocale: "he",
        status: "idle" as const,
      },
      {
        contentType: "post-body" as const,
        contentId: "post-long",
        revisionId: "post-long-r1",
        targetLocale: "he",
        status: "idle" as const,
      },
    ];
  });
  value.set(contentGenerationStatusContext, { readCurrent });

  const generateTopicTitle = vi.fn();
  const generateAutomaticPostBody = vi.fn();
  const generateExplicitPostBody = vi.fn();
  value.set(contentGenerationActionContext, {
    enabled: true,
    capability: {
      generateTopicTitle,
      generateAutomaticPostBody,
      generateExplicitPostBody,
    },
  });

  return {
    value,
    has,
    readCurrent,
    generationCalls: {
      generateTopicTitle,
      generateAutomaticPostBody,
      generateExplicitPostBody,
    },
  };
}

describe("topic generation loader model", () => {
  it("keeps guests on the public read path without status or generation side effects", async () => {
    const harness = context({ authenticated: false });
    const data = await topicLoader({
      params: { locale: "he", topicId: "topic-1" },
      context: harness.value,
    });

    expect(data.generationUnits).toBeNull();
    expect(harness.has).not.toHaveBeenCalled();
    expect(harness.readCurrent).not.toHaveBeenCalled();
    expect(harness.generationCalls.generateTopicTitle).not.toHaveBeenCalled();
    expect(harness.generationCalls.generateAutomaticPostBody).not.toHaveBeenCalled();
    expect(harness.generationCalls.generateExplicitPostBody).not.toHaveBeenCalled();
  });

  it("uses dynamic generation permission as an optional loader hint and reflects next-request changes", async () => {
    const denied = context({ permission: false });
    const deniedData = await topicLoader({
      params: { locale: "he", topicId: "topic-1" },
      context: denied.value,
    });
    expect(deniedData.generationUnits).toBeNull();
    expect(denied.readCurrent).not.toHaveBeenCalled();

    const allowed = context({ permission: true });
    const allowedData = await topicLoader({
      params: { locale: "he", topicId: "topic-1" },
      context: allowed.value,
    });
    expect(allowedData.generationUnits).toHaveLength(3);
    expect(allowed.readCurrent).toHaveBeenCalledTimes(1);
  });

  it("degrades authorization availability to hidden generation hints without failing public read", async () => {
    const harness = context({
      authorizationError: new AuthorizationUnavailableError(),
    });
    const data = await topicLoader({
      params: { locale: "he", topicId: "topic-1" },
      context: harness.value,
    });

    expect(data.topic.id).toBe("topic-1");
    expect(data.generationUnits).toBeNull();
    expect(harness.readCurrent).not.toHaveBeenCalled();
  });

  it("builds known/und and long-body hints without source detection or generation work", async () => {
    const harness = context();
    const data = await topicLoader({
      params: { locale: "he", topicId: "topic-1" },
      context: harness.value,
    });

    expect(data.generationUnits).toEqual([
      expect.objectContaining({
        contentType: "topic-title",
        contentId: "topic-1",
        revisionId: "title-r1",
        targetLocale: "he",
        status: "idle",
        automaticEligible: true,
        explicitRequired: false,
      }),
      expect.objectContaining({
        contentType: "post-body",
        contentId: "post-short",
        revisionId: "post-short-r1",
        targetLocale: "he",
        status: "idle",
        automaticEligible: true,
        explicitRequired: false,
      }),
      expect.objectContaining({
        contentType: "post-body",
        contentId: "post-long",
        revisionId: "post-long-r1",
        targetLocale: "he",
        status: "idle",
        automaticEligible: false,
        explicitRequired: true,
      }),
    ]);
    expect(harness.generationCalls.generateTopicTitle).not.toHaveBeenCalled();
    expect(harness.generationCalls.generateAutomaticPostBody).not.toHaveBeenCalled();
    expect(harness.generationCalls.generateExplicitPostBody).not.toHaveBeenCalled();
  });

  it("turns classified status storage failure into original-safe unavailable UI and leaks no internals", async () => {
    const harness = context({
      statusError: new ContentGenerationStatusStorageUnavailableError(),
    });
    const data = await topicLoader({
      params: { locale: "he", topicId: "topic-1" },
      context: harness.value,
    });

    expect(data.generationUnits?.every((unit) =>
      unit.status === "unavailable"
      && !unit.automaticEligible
      && !unit.explicitRequired
    )).toBe(true);

    const serialized = JSON.stringify(data.generationUnits);
    for (const forbidden of [
      "taskId",
      "taskIdentity",
      "claimToken",
      "attemptCount",
      "provider",
      "allowance",
      "reservationReference",
      "failureCode",
      "sourceFingerprint",
      "generationPolicyVersion",
      "user-1",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("propagates unexpected status failures", async () => {
    const failure = new TypeError("unexpected status bug");
    const harness = context({ statusError: failure });

    await expect(topicLoader({
      params: { locale: "he", topicId: "topic-1" },
      context: harness.value,
    })).rejects.toBe(failure);
  });
});
