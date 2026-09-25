import { describe, expect, it, vi } from "vitest";

import {
  CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
  protectMarkdownForTranslation,
} from "./content-markdown-translation";
import {
  contentPostBodySourceFingerprint,
  contentPostBodyTaskIdentity,
} from "./content-post-body-planning";
import {
  ContentTranslationAllowanceAdmissionService,
  contentTranslationAllowanceOccurrenceKey,
  type ContentTranslationAllowanceAdapter,
  type ContentTranslationAllowanceLease,
  type ContentTranslationAllowanceStore,
} from "./content-translation-allowance";
import {
  contentTopicTitleSourceFingerprint,
  contentTopicTitleTaskIdentity,
} from "./content-translation-planning";
import type { ContentTranslationStore } from "./content-translation";
import { InMemoryLocaleRegistry } from "./registry";
import type {
  ContentPostBodyTranslationTask,
  ContentPostBodyTranslationTaskStore,
  ContentTopicTitleTranslationTask,
  ContentTopicTitleTranslationTaskStore,
} from "./translation-tasks";

const taskId = "10000000-0000-4000-8000-000000000001";
const leaseToken = "20000000-0000-4000-8000-000000000002";
const now = new Date("2026-09-25T12:00:00.000Z");

async function titleTask(): Promise<ContentTopicTitleTranslationTask> {
  const sourceFingerprint = await contentTopicTitleSourceFingerprint({
    topicId: "topic-a",
    revisionId: "title-r1",
    revisionSourceLocale: "ru",
    resolvedSourceLocale: "ru",
    sourceResolutionOrigin: "revision-metadata",
  });
  const identityInput = {
    translationKind: "content-topic-title" as const,
    sourceIdentity: { topicId: "topic-a", revisionId: "title-r1" },
    revisionSourceLocale: "ru",
    resolvedSourceLocale: "ru",
    sourceResolutionOrigin: "revision-metadata" as const,
    sourceFingerprint,
    targetLocale: "he",
    generationPolicyVersion: "content-v1",
  };
  return {
    ...identityInput,
    taskIdentity: await contentTopicTitleTaskIdentity(identityInput),
    id: taskId,
    generation: 1,
    status: "pending",
    attemptCount: 0,
    maxAttempts: 3,
    lastFailureCode: null,
    failureDisposition: null,
    claimToken: null,
    claimedAt: null,
    leaseExpiresAt: null,
    staleAt: null,
    completedAt: null,
    failedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

async function bodyTask(): Promise<ContentPostBodyTranslationTask> {
  const body = "Первый текст.\n\nВторой текст с `fetchData()`.";
  const protectedDocument = protectMarkdownForTranslation(body);
  const sourceFingerprint = await contentPostBodySourceFingerprint({
    postId: "post-a",
    revisionId: "post-r1",
    revisionSourceLocale: "ru",
    resolvedSourceLocale: "ru",
    sourceResolutionOrigin: "revision-metadata",
    protectedContentPolicyVersion: CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
    protectedMarkdown: protectedDocument.protectedMarkdown,
    segments: protectedDocument.segments,
  });
  const identityInput = {
    translationKind: "content-post-body" as const,
    sourceIdentity: { postId: "post-a", revisionId: "post-r1" },
    revisionSourceLocale: "ru",
    resolvedSourceLocale: "ru",
    sourceResolutionOrigin: "revision-metadata" as const,
    sourceFingerprint,
    targetLocale: "he",
    protectedContentPolicyVersion: CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
    generationPolicyVersion: "content-v1",
  };
  return {
    ...identityInput,
    taskIdentity: await contentPostBodyTaskIdentity(identityInput),
    id: taskId,
    generation: 1,
    status: "pending",
    attemptCount: 0,
    maxAttempts: 3,
    lastFailureCode: null,
    failureDisposition: null,
    claimToken: null,
    claimedAt: null,
    leaseExpiresAt: null,
    staleAt: null,
    completedAt: null,
    failedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function lease(kind: "content-topic-title" | "content-post-body"): ContentTranslationAllowanceLease {
  return {
    taskId,
    translationKind: kind,
    generation: 1,
    attemptNumber: 1,
    claimToken: leaseToken,
  };
}

async function harness(kind: "title" | "body", adapter?: ContentTranslationAllowanceAdapter) {
  const title = await titleTask();
  const body = await bodyTask();
  const titleTasks: ContentTopicTitleTranslationTaskStore = {
    claimContentTopicTitle: vi.fn(),
    markStale: vi.fn(),
    isCurrentContentTopicTitleGeneration: vi.fn(async () => true),
  };
  const bodyTasks: ContentPostBodyTranslationTaskStore = {
    claimContentPostBody: vi.fn(),
    markStale: vi.fn(),
    isCurrentContentPostBodyGeneration: vi.fn(async () => true),
  };
  const translations: ContentTranslationStore = {
    read: vi.fn(async () => undefined),
    write: vi.fn(),
  };
  const store: ContentTranslationAllowanceStore = {
    acquire: vi.fn(async () => ({
      outcome: "leased" as const,
      lease: lease(kind === "title" ? "content-topic-title" : "content-post-body"),
    })),
    admit: vi.fn(async () => true),
    defer: vi.fn(async (_lease, retryNotBefore) => retryNotBefore),
  };
  const registry = new InMemoryLocaleRegistry([{
    tag: "he",
    translationStatus: "draft",
    publicationStatus: "active",
    direction: "rtl",
    fallbackChain: ["en"],
    nativeName: "עברית",
  }]);

  const service = new ContentTranslationAllowanceAdmissionService({
    tasks: {
      findContentTopicTitleById: vi.fn(async () => title),
      findContentPostBodyById: vi.fn(async () => body),
    },
    store,
    adapter,
    titlePreflight: {
      localeRegistry: registry,
      generationPolicyVersion: "content-v1",
      revisions: {
        readCurrentRevision: vi.fn(async () => ({
          contentType: "topic-title" as const,
          contentId: "topic-a",
          revisionId: "title-r1",
          originalContent: "Исходный заголовок",
          sourceLocale: "ru",
        })),
      },
      translations,
      tasks: titleTasks,
    },
    postBodyPreflight: {
      localeRegistry: registry,
      generationPolicyVersion: "content-v1",
      protectedContentPolicyVersion: CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
      revisions: {
        readCurrentRevision: vi.fn(async () => ({
          contentType: "post-body" as const,
          contentId: "post-a",
          revisionId: "post-r1",
          originalContent: "Первый текст.\n\nВторой текст с `fetchData()`.",
          sourceLocale: "ru",
        })),
      },
      translations,
      tasks: bodyTasks,
    },
    admissionLeaseDurationMs: 30_000,
    postBodyExecutionBounds: {
      maxSegments: 20,
      maxTotalSegmentCharacters: 10_000,
    },
    unconfiguredRetryNotBefore: () => new Date("2026-09-25T13:00:00.000Z"),
  });

  return { service, store };
}

describe("content provider allowance admission", () => {
  it("uses a stable occurrence key for duplicates and distinct keys for retries/generations", async () => {
    const first = await contentTranslationAllowanceOccurrenceKey({
      taskId,
      translationKind: "content-post-body",
      generation: 1,
      attemptNumber: 1,
    });
    await expect(contentTranslationAllowanceOccurrenceKey({
      taskId,
      translationKind: "content-post-body",
      generation: 1,
      attemptNumber: 1,
    })).resolves.toBe(first);
    await expect(contentTranslationAllowanceOccurrenceKey({
      taskId,
      translationKind: "content-post-body",
      generation: 1,
      attemptNumber: 2,
    })).resolves.not.toBe(first);
    await expect(contentTranslationAllowanceOccurrenceKey({
      taskId,
      translationKind: "content-post-body",
      generation: 2,
      attemptNumber: 1,
    })).resolves.not.toBe(first);
  });

  it("admits a title with one complete provider-call envelope", async () => {
    const admit = vi.fn(async () => ({
      outcome: "admitted" as const,
      reservationReference: "reservation-1",
    }));
    const { service, store } = await harness("title", { admit });

    await expect(service.admitTopicTitle(taskId)).resolves.toMatchObject({
      outcome: "admitted",
      occurrenceKey: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(admit).toHaveBeenCalledWith(expect.objectContaining({
      providerCapability: {
        domain: "content",
        contentClassification: "public-forum-topic-title",
        messageKind: "plain",
      },
      sourceLocale: "ru",
      targetLocale: "he",
      envelope: {
        callCount: 1,
        totalSourceCharacters: "Исходный заголовок".length,
        maxSourceCharactersPerCall: "Исходный заголовок".length,
      },
    }));
    expect(store.admit).toHaveBeenCalledWith(
      lease("content-topic-title"),
      "reservation-1",
    );
  });

  it("admits a post body using the complete protected segment envelope", async () => {
    const admit = vi.fn(async () => ({ outcome: "admitted" as const }));
    const { service } = await harness("body", { admit });
    const document = protectMarkdownForTranslation(
      "Первый текст.\n\nВторой текст с `fetchData()`.",
    );
    const lengths = document.segments.map((segment) => segment.text.length);

    await expect(service.admitPostBody(taskId)).resolves.toMatchObject({
      outcome: "admitted",
    });
    expect(admit).toHaveBeenCalledWith(expect.objectContaining({
      providerCapability: {
        domain: "content",
        contentClassification: "public-forum-post-body",
        messageKind: "plain",
      },
      envelope: {
        callCount: lengths.length,
        totalSourceCharacters: lengths.reduce((sum, value) => sum + value, 0),
        maxSourceCharactersPerCall: Math.max(...lengths),
      },
    }));
  });

  it("fails closed without an allowance adapter and persists defer without an execution attempt", async () => {
    const { service, store } = await harness("title");

    await expect(service.admitTopicTitle(taskId)).resolves.toEqual({
      outcome: "deferred",
      retryNotBefore: new Date("2026-09-25T13:00:00.000Z"),
      reason: "allowance-unconfigured",
    });
    expect(store.admit).not.toHaveBeenCalled();
    expect(store.defer).toHaveBeenCalledWith(
      lease("content-topic-title"),
      new Date("2026-09-25T13:00:00.000Z"),
      "allowance-unconfigured",
    );
  });

  it("rejects runtime-invalid adapter output instead of converting it into deferral", async () => {
    const { service } = await harness("title", {
      admit: vi.fn(async () => ({
        outcome: "deferred",
        retryNotBefore: new Date("invalid"),
        reason: "bad",
      }) as never),
    });

    await expect(service.admitTopicTitle(taskId)).rejects.toBeInstanceOf(TypeError);
  });
});
