import { describe, expect, it, vi } from "vitest";

import {
  ContentPostBodyAllowanceGate,
  ContentTopicTitleAllowanceGate,
  contentProviderAllowanceOccurrenceKey,
  validateContentProviderAllowanceDecision,
  type ContentProviderAllowanceAcquireResult,
  type ContentProviderAllowanceStore,
} from "./content-provider-allowance";
import { CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION } from "./content-markdown-translation";
import { contentPostBodySourceFingerprint } from "./content-post-body-planning";
import {
  contentTopicTitleSourceFingerprint,
} from "./content-translation-planning";
import type {
  ContentPostBodyTranslationTask,
  ContentTopicTitleTranslationTask,
} from "./translation-tasks";
import { InMemoryLocaleRegistry } from "./registry";

const taskId = "10000000-0000-4000-8000-000000000001";
const admissionToken = "20000000-0000-4000-8000-000000000002";
const now = new Date("2026-09-25T12:00:00.000Z");

const registry = new InMemoryLocaleRegistry([{
  tag: "he",
  translationStatus: "draft",
  publicationStatus: "active",
  direction: "rtl",
  fallbackChain: ["en"],
  nativeName: "עברית",
}]);

async function titleTask(
  overrides: Partial<ContentTopicTitleTranslationTask> = {},
): Promise<ContentTopicTitleTranslationTask> {
  const base = {
    id: taskId,
    taskIdentity: "a".repeat(64),
    translationKind: "content-topic-title" as const,
    sourceIdentity: { topicId: "topic-a", revisionId: "title-r1" },
    revisionSourceLocale: "ru",
    resolvedSourceLocale: "ru",
    sourceResolutionOrigin: "revision-metadata" as const,
    sourceFingerprint: "",
    targetLocale: "he",
    generationPolicyVersion: "content-v1",
    generation: 3,
    status: "pending" as const,
    attemptCount: 1,
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
  const merged = { ...base, ...overrides };
  return {
    ...merged,
    sourceFingerprint: overrides.sourceFingerprint ?? await contentTopicTitleSourceFingerprint({
      topicId: merged.sourceIdentity.topicId,
      revisionId: merged.sourceIdentity.revisionId,
      revisionSourceLocale: merged.revisionSourceLocale,
      resolvedSourceLocale: merged.resolvedSourceLocale,
      sourceResolutionOrigin: merged.sourceResolutionOrigin,
    }),
  };
}

async function postTask(): Promise<ContentPostBodyTranslationTask> {
  const markdown = "Привет **мир** и `const value = 1`.";
  const protectedDocument = await import("./content-markdown-translation").then(({ protectMarkdownForTranslation }) =>
    protectMarkdownForTranslation(markdown)
  );
  const base = {
    id: taskId,
    taskIdentity: "b".repeat(64),
    translationKind: "content-post-body" as const,
    sourceIdentity: { postId: "post-a", revisionId: "post-r1" },
    revisionSourceLocale: "ru",
    resolvedSourceLocale: "ru",
    sourceResolutionOrigin: "revision-metadata" as const,
    sourceFingerprint: "",
    targetLocale: "he",
    protectedContentPolicyVersion: CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
    generationPolicyVersion: "content-v1",
    generation: 4,
    status: "pending" as const,
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
  return {
    ...base,
    sourceFingerprint: await contentPostBodySourceFingerprint({
      postId: base.sourceIdentity.postId,
      revisionId: base.sourceIdentity.revisionId,
      revisionSourceLocale: base.revisionSourceLocale,
      resolvedSourceLocale: base.resolvedSourceLocale,
      sourceResolutionOrigin: base.sourceResolutionOrigin,
      protectedContentPolicyVersion: base.protectedContentPolicyVersion,
      protectedMarkdown: protectedDocument.protectedMarkdown,
      segments: protectedDocument.segments,
    }),
  };
}

function allowanceStore(
  acquired: ContentProviderAllowanceAcquireResult,
) {
  const persistAdmission = vi.fn(async () => true);
  const persistDeferral = vi.fn(async (
    _id: string,
    _token: string,
    _occurrence: { generation: number; attempt: number },
    retryNotBefore: Date,
  ) => retryNotBefore);
  const markStale = vi.fn(async () => true);
  const store: ContentProviderAllowanceStore = {
    acquireContentProviderAllowance: vi.fn(async () => acquired),
    persistContentProviderAllowanceAdmission: persistAdmission,
    persistContentProviderAllowanceDeferral: persistDeferral,
    markContentTaskStaleFromAllowance: markStale,
  };
  return { store, persistAdmission, persistDeferral, markStale };
}

describe("content provider allowance boundary", () => {
  it("builds a deterministic occurrence key that changes across retries and generations", async () => {
    const first = await contentProviderAllowanceOccurrenceKey(taskId, { generation: 3, attempt: 2 });
    await expect(contentProviderAllowanceOccurrenceKey(
      taskId,
      { generation: 3, attempt: 2 },
    )).resolves.toBe(first);
    await expect(contentProviderAllowanceOccurrenceKey(
      taskId,
      { generation: 3, attempt: 3 },
    )).resolves.not.toBe(first);
    await expect(contentProviderAllowanceOccurrenceKey(
      taskId,
      { generation: 5, attempt: 2 },
    )).resolves.not.toBe(first);
  });

  it("validates provider decisions and rejects malformed adapter output", () => {
    expect(() => validateContentProviderAllowanceDecision({
      outcome: "admitted",
      reservationReference: "reserve:v1",
    })).not.toThrow();
    expect(() => validateContentProviderAllowanceDecision({
      outcome: "deferred",
      retryNotBefore: new Date("2026-09-25T12:10:00.000Z"),
      reason: "allowance-exhausted",
    })).not.toThrow();
    expect(() => validateContentProviderAllowanceDecision({
      outcome: "admitted",
      reservationReference: "bad ref",
    })).toThrow(TypeError);
  });

  it("admits a title whole-attempt envelope before claim", async () => {
    const task = await titleTask();
    const acquired = {
      outcome: "acquired" as const,
      task,
      occurrence: { generation: task.generation, attempt: task.attemptCount + 1 },
      admissionToken,
    };
    const { store, persistAdmission } = allowanceStore(acquired);
    const adapter = {
      admit: vi.fn(async () => ({
        outcome: "admitted" as const,
        reservationReference: "reserve-title",
      })),
    };
    const gate = new ContentTopicTitleAllowanceGate({
      store,
      adapter,
      provider: "fake-provider",
      admissionLeaseDurationMs: 60_000,
      localeRegistry: registry,
      generationPolicyVersion: "content-v1",
      revisions: {
        readCurrentRevision: async () => ({
          contentType: "topic-title",
          contentId: "topic-a",
          revisionId: "title-r1",
          originalContent: "Исходный заголовок",
          sourceLocale: "ru",
        }),
      },
      translations: { read: async () => undefined, write: vi.fn() },
      tasks: {
        claimContentTopicTitle: vi.fn(),
        markStale: vi.fn(),
        isCurrentContentTopicTitleGeneration: async () => true,
      },
    });

    await expect(gate.admit({ translationTaskId: taskId })).resolves.toEqual({
      outcome: "admitted",
    });
    expect(adapter.admit).toHaveBeenCalledWith(expect.objectContaining({
      provider: "fake-provider",
      contentClassification: "public-forum-topic-title",
      sourceLocale: "ru",
      targetLocale: "he",
      envelope: {
        maxCalls: 1,
        maxSourceCharacters: "Исходный заголовок".length,
        segmentCharacterCounts: ["Исходный заголовок".length],
      },
    }));
    expect(persistAdmission).toHaveBeenCalledWith(
      taskId,
      admissionToken,
      { generation: 3, attempt: 2 },
      "reserve-title",
    );
  });

  it("fails closed without a configured allowance adapter and does not consume an attempt", async () => {
    const task = await titleTask({ attemptCount: 0 });
    const { store, persistDeferral } = allowanceStore({
      outcome: "acquired",
      task,
      occurrence: { generation: task.generation, attempt: 1 },
      admissionToken,
    });
    const gate = new ContentTopicTitleAllowanceGate({
      store,
      provider: "unconfigured-provider",
      admissionLeaseDurationMs: 60_000,
      unconfiguredRetryMs: 1_000,
      localeRegistry: registry,
      generationPolicyVersion: "content-v1",
      revisions: {
        readCurrentRevision: async () => ({
          contentType: "topic-title",
          contentId: "topic-a",
          revisionId: "title-r1",
          originalContent: "Исходный заголовок",
          sourceLocale: "ru",
        }),
      },
      translations: { read: async () => undefined, write: vi.fn() },
      tasks: {
        claimContentTopicTitle: vi.fn(),
        markStale: vi.fn(),
        isCurrentContentTopicTitleGeneration: async () => true,
      },
    });

    const result = await gate.admit({ translationTaskId: taskId });
    expect(result).toMatchObject({
      outcome: "deferred",
      reason: "allowance-unconfigured",
    });
    expect(persistDeferral).toHaveBeenCalledTimes(1);
    expect(task.attemptCount).toBe(0);
  });

  it("does not call the adapter while an occurrence is already deferred", async () => {
    const adapter = { admit: vi.fn() };
    const retryNotBefore = new Date("2026-09-25T13:00:00.000Z");
    const { store } = allowanceStore({
      outcome: "deferred",
      retryNotBefore,
      reason: "allowance-exhausted",
    });
    const gate = new ContentTopicTitleAllowanceGate({
      store,
      adapter,
      provider: "fake-provider",
      admissionLeaseDurationMs: 60_000,
      localeRegistry: registry,
      generationPolicyVersion: "content-v1",
      revisions: { readCurrentRevision: vi.fn() },
      translations: { read: vi.fn(), write: vi.fn() },
      tasks: {
        claimContentTopicTitle: vi.fn(),
        markStale: vi.fn(),
        isCurrentContentTopicTitleGeneration: vi.fn(),
      },
    });

    await expect(gate.admit({ translationTaskId: taskId })).resolves.toEqual({
      outcome: "deferred",
      retryNotBefore,
      reason: "allowance-exhausted",
    });
    expect(adapter.admit).not.toHaveBeenCalled();
  });

  it("uses protected post segments to bound the complete provider attempt", async () => {
    const task = await postTask();
    const { store } = allowanceStore({
      outcome: "acquired",
      task,
      occurrence: { generation: task.generation, attempt: 1 },
      admissionToken,
    });
    const adapter = {
      admit: vi.fn(async () => ({ outcome: "admitted" as const })),
    };
    const source = "Привет **мир** и `const value = 1`.";
    const gate = new ContentPostBodyAllowanceGate({
      store,
      adapter,
      provider: "fake-provider",
      admissionLeaseDurationMs: 60_000,
      localeRegistry: registry,
      generationPolicyVersion: "content-v1",
      protectedContentPolicyVersion: CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
      executionBounds: { maxSegments: 20, maxTotalSegmentCharacters: 10_000 },
      revisions: {
        readCurrentRevision: async () => ({
          contentType: "post-body",
          contentId: "post-a",
          revisionId: "post-r1",
          originalContent: source,
          sourceLocale: "ru",
        }),
      },
      translations: { read: async () => undefined, write: vi.fn() },
      tasks: {
        claimContentPostBody: vi.fn(),
        markStale: vi.fn(),
        isCurrentContentPostBodyGeneration: async () => true,
      },
    });

    await expect(gate.admit({ translationTaskId: taskId })).resolves.toEqual({
      outcome: "admitted",
    });
    const request = adapter.admit.mock.calls[0]?.[0];
    expect(request?.contentClassification).toBe("public-forum-post-body");
    expect(request?.envelope.maxCalls).toBeGreaterThan(0);
    expect(request?.envelope.maxSourceCharacters).toBeLessThan(source.length);
    expect(request?.envelope.segmentCharacterCounts).toHaveLength(request?.envelope.maxCalls ?? 0);
  });
});
