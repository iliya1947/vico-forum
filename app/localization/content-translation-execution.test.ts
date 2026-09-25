import { describe, expect, it, vi } from "vitest";

import { CloudflareM2m100TranslationProvider } from "./cloudflare-m2m100-provider";
import type { ContentTranslationAllowanceAdmissionResult } from "./content-translation-allowance";
import {
  ContentTranslationStorageUnavailableError,
  type ContentTranslationRevision,
  type ContentTranslationStore,
  type StoredContentTranslation,
} from "./content-translation";
import {
  contentTopicTitleSourceFingerprint,
} from "./content-translation-planning";
import {
  ContentTopicTitleTaskConsumer,
  type ContentTopicTitleRevisionReader,
} from "./content-translation-task-consumer";
import { ContentTopicTitleTaskExecutor } from "./content-translation-execution";
import {
  ContentTopicTitleResultPublisher,
  type ContentTopicTitlePublicationStore,
} from "./content-translation-publication";
import {
  TranslationExecutionFailure,
  type TranslationFailureRecord,
} from "./translation-failures";
import { InMemoryLocaleRegistry } from "./registry";
import {
  TranslationProviderRouter,
  type MachineTranslationProviderAdapter,
  type MachineTranslationRequest,
  type MachineTranslationResult,
} from "./translation-provider";
import type {
  ContentTopicTitleTranslationTask,
  ContentTopicTitleTranslationTaskStore,
  TranslationTaskFailureResult,
} from "./translation-tasks";

const taskId = "10000000-0000-4000-8000-000000000001";
const claimToken = "20000000-0000-4000-8000-000000000002";
const now = new Date("2026-09-24T12:00:00.000Z");

async function contentTask(
  overrides: Partial<ContentTopicTitleTranslationTask> = {},
): Promise<ContentTopicTitleTranslationTask & {
  readonly status: "processing";
  readonly claimToken: string;
}> {
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
    generation: 1,
    status: "processing" as const,
    attemptCount: 1,
    maxAttempts: 3,
    lastFailureCode: null,
    failureDisposition: null,
    claimToken,
    claimedAt: now,
    leaseExpiresAt: new Date(now.getTime() + 60_000),
    staleAt: null,
    completedAt: null,
    failedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  const merged = { ...base, ...overrides };
  const sourceFingerprint = overrides.sourceFingerprint ?? await contentTopicTitleSourceFingerprint({
    topicId: merged.sourceIdentity.topicId,
    revisionId: merged.sourceIdentity.revisionId,
    revisionSourceLocale: merged.revisionSourceLocale,
    resolvedSourceLocale: merged.resolvedSourceLocale,
    sourceResolutionOrigin: merged.sourceResolutionOrigin,
  });
  return { ...merged, sourceFingerprint } as ContentTopicTitleTranslationTask & {
    readonly status: "processing";
    readonly claimToken: string;
  };
}

function revision(
  overrides: Partial<ContentTranslationRevision> = {},
): ContentTranslationRevision {
  return {
    contentType: "topic-title",
    contentId: "topic-a",
    revisionId: "title-r1",
    originalContent: "Исходный заголовок",
    sourceLocale: "ru",
    ...overrides,
  };
}

async function harness(options: {
  readonly task?: ContentTopicTitleTranslationTask & {
    readonly status: "processing";
    readonly claimToken: string;
  };
  readonly claimOutcome?: "claimed" | "already-claimed";
  readonly attemptStarted?: boolean;
  readonly currentGeneration?: boolean;
  readonly currentRevision?: ContentTranslationRevision | undefined;
  readonly revisionFailure?: Error;
  readonly currentTranslation?: StoredContentTranslation | undefined;
  readonly translationFailure?: Error;
  readonly activeTarget?: boolean;
  readonly generationPolicyVersion?: string;
  readonly providerValue?: unknown;
  readonly providerFailure?: Error;
  readonly providerProvenance?: unknown;
  readonly adapter?: MachineTranslationProviderAdapter;
  readonly publicationResult?: Awaited<ReturnType<ContentTopicTitlePublicationStore["publishClaimedMachineResult"]>>;
  readonly failureResult?: TranslationTaskFailureResult;
} = {}) {
  const task = options.task ?? await contentTask();
  const claimOutcome = options.claimOutcome ?? "claimed";
  const markStale = vi.fn(async () => true);
  const currentGeneration = vi.fn(async () => options.currentGeneration ?? true);
  const tasks: ContentTopicTitleTranslationTaskStore = {
    claimContentTopicTitle: vi.fn(async () => claimOutcome === "claimed"
      ? {
          outcome: "claimed" as const,
          task,
          attemptStarted: options.attemptStarted ?? true,
        }
      : { outcome: "already-claimed" as const }),
    markStale,
    isCurrentContentTopicTitleGeneration: currentGeneration,
  };

  const revisions: ContentTopicTitleRevisionReader = {
    readCurrentRevision: vi.fn(async () => {
      if (options.revisionFailure) throw options.revisionFailure;
      return Object.hasOwn(options, "currentRevision")
        ? options.currentRevision
        : revision();
    }),
  };
  const translations: ContentTranslationStore = {
    read: vi.fn(async () => {
      if (options.translationFailure) throw options.translationFailure;
      return options.currentTranslation;
    }),
    write: vi.fn(),
  };

  const localeRegistry = new InMemoryLocaleRegistry([{
    tag: "he",
    translationStatus: "draft",
    publicationStatus: options.activeTarget === false ? "inactive" : "active",
    direction: "rtl",
    fallbackChain: ["en"],
    nativeName: "עברית",
  }]);
  const generationPolicyVersion = options.generationPolicyVersion ?? "content-v1";
  const consumer = new ContentTopicTitleTaskConsumer({
    tasks,
    revisions,
    translations,
    localeRegistry,
    generationPolicyVersion,
    leaseDurationMs: 60_000,
  });

  const translate = vi.fn(async (request: MachineTranslationRequest): Promise<MachineTranslationResult> => {
    void request;
    if (options.providerFailure) throw options.providerFailure;
    return {
      value: Object.hasOwn(options, "providerValue")
        ? options.providerValue
        : "כותרת מתורגמת",
      provenance: (Object.hasOwn(options, "providerProvenance")
        ? options.providerProvenance
        : { provider: "fake", model: "fake-v1", origin: "machine" }) as
          MachineTranslationResult["provenance"],
    };
  });
  const adapter: MachineTranslationProviderAdapter = options.adapter ?? {
    supports: vi.fn(() => true),
    translate,
  };
  const providerRouter = new TranslationProviderRouter([adapter]);

  const publishClaimedMachineResult = vi.fn(async () =>
    options.publicationResult ?? { outcome: "published" as const }
  );
  const publisher = new ContentTopicTitleResultPublisher({
    tasks,
    revisions,
    translations,
    localeRegistry,
    generationPolicyVersion,
    publications: { publishClaimedMachineResult },
  });

  const recordFailure = vi.fn(async (
    _id: string,
    _claimToken: string,
    failure: TranslationFailureRecord,
  ): Promise<TranslationTaskFailureResult> => options.failureResult ?? (
    failure.disposition === "retryable"
      ? { outcome: "retry", attemptCount: 1, maxAttempts: 3 }
      : {
          outcome: "terminal",
          attemptCount: 1,
          maxAttempts: 3,
          disposition: failure.code === "attempt-budget-exhausted"
            ? "retry-exhausted"
            : "terminal",
        }
  ));

  const allowance = {
    admitTopicTitle: vi.fn(
      async (): Promise<ContentTranslationAllowanceAdmissionResult> => ({
        outcome: "admitted",
      }),
    ),
  };
  const executor = new ContentTopicTitleTaskExecutor({
    allowance,
    consumer,
    providerRouter,
    publisher,
    failures: { recordFailure },
  });

  return {
    executor,
    allowance,
    translate,
    markStale,
    currentGeneration,
    publishClaimedMachineResult,
    recordFailure,
    revisions,
    translations,
  };
}

describe("ContentTopicTitleTaskExecutor", () => {
  it("acknowledges durable allowance deferral before claim or provider work", async () => {
    const { executor, allowance, translate, revisions } = await harness();
    allowance.admitTopicTitle.mockResolvedValueOnce({
      outcome: "deferred",
      retryNotBefore: new Date("2026-09-25T13:00:00.000Z"),
      reason: "free-allowance-reset",
    });

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toEqual({
      outcome: "deferred",
      retryNotBefore: new Date("2026-09-25T13:00:00.000Z"),
      reason: "free-allowance-reset",
      delivery: "ack",
    });
    expect(revisions.readCurrentRevision).not.toHaveBeenCalled();
    expect(translate).not.toHaveBeenCalled();
  });

  it("sends exactly one authoritative plain content request and conditionally publishes it", async () => {
    const { executor, translate, publishClaimedMachineResult, recordFailure } = await harness();

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toEqual({
      outcome: "published",
      delivery: "ack",
    });
    expect(translate).toHaveBeenCalledTimes(1);
    expect(translate).toHaveBeenCalledWith({
      domain: "content",
      contentClassification: "public-forum-topic-title",
      sourceLocale: "ru",
      targetLocale: "he",
      messageKind: "plain",
      operation: "plain",
      source: "Исходный заголовок",
    });
    expect(publishClaimedMachineResult).toHaveBeenCalledWith(expect.objectContaining({
      task: expect.objectContaining({ id: taskId, claimToken }),
      revision: revision(),
      translatedContent: "כותרת מתורגמת",
      provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
      generationPolicyVersion: "content-v1",
    }));
    expect(recordFailure).not.toHaveBeenCalled();
  });

  it.each([
    ["revision-not-current", { currentRevision: revision({ revisionId: "title-r2" }) }],
    ["source-changed", { currentRevision: revision({ sourceLocale: "en" }) }],
    ["policy-changed", { generationPolicyVersion: "content-v2" }],
    ["generation-superseded", { currentGeneration: false }],
    ["target-locale-ineligible", { activeTarget: false }],
    ["translation-current", {
      currentTranslation: {
        contentType: "topic-title" as const,
        contentId: "topic-a",
        revisionId: "title-r1",
        targetLocale: "he",
        sourceLocale: "ru",
        translatedContent: "קיים",
        provenance: { origin: "persistent_manual" as const },
      },
    }],
  ])("marks %s stale before provider execution", async (reason, options) => {
    const { executor, translate, markStale } = await harness(options);

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toEqual({
      outcome: "stale",
      reason,
      delivery: "ack",
    });
    expect(translate).not.toHaveBeenCalled();
    expect(markStale).toHaveBeenCalledWith(taskId, claimToken);
  });

  it("acknowledges a duplicate live delivery without another provider call", async () => {
    const { executor, translate } = await harness({ claimOutcome: "already-claimed" });
    await expect(executor.execute({ translationTaskId: taskId })).resolves.toEqual({
      outcome: "already-claimed",
      delivery: "ack",
    });
    expect(translate).not.toHaveBeenCalled();
  });

  it("terminalizes an exhausted reclaimed lease without provider work", async () => {
    const { executor, translate, recordFailure, revisions } = await harness({
      attemptStarted: false,
      failureResult: {
        outcome: "terminal",
        attemptCount: 3,
        maxAttempts: 3,
        disposition: "retry-exhausted",
      },
    });

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toEqual({
      outcome: "execution-failed",
      delivery: "terminal",
      failureCode: "attempt-budget-exhausted",
      terminalReason: "retry-exhausted",
      attemptCount: 3,
      maxAttempts: 3,
    });
    expect(translate).not.toHaveBeenCalled();
    expect(revisions.readCurrentRevision).not.toHaveBeenCalled();
    expect(recordFailure).toHaveBeenCalledWith(taskId, claimToken, {
      disposition: "terminal",
      code: "attempt-budget-exhausted",
    });
  });

  it.each([
    ["provider-rate-limited", "retryable", "retry"],
    ["provider-terminal", "terminal", "terminal"],
  ] as const)(
    "preserves shared %s failure classification",
    async (code, disposition, delivery) => {
      const failure = new TranslationExecutionFailure(
        disposition,
        code,
        "classified provider fixture",
      );
      const { executor, recordFailure } = await harness({ providerFailure: failure });

      const result = await executor.execute({ translationTaskId: taskId });
      expect(result).toMatchObject({
        outcome: "execution-failed",
        delivery,
        failureCode: code,
      });
      expect(recordFailure).toHaveBeenCalledWith(taskId, claimToken, {
        disposition,
        code,
      });
    },
  );

  it("persists a retryable provider failure through the shared bounded lifecycle", async () => {
    const failure = new TranslationExecutionFailure(
      "retryable",
      "provider-temporary",
      "provider temporarily unavailable",
    );
    const { executor, recordFailure } = await harness({ providerFailure: failure });

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toEqual({
      outcome: "execution-failed",
      delivery: "retry",
      failureCode: "provider-temporary",
      attemptCount: 1,
      maxAttempts: 3,
    });
    expect(recordFailure).toHaveBeenCalledWith(taskId, claimToken, {
      disposition: "retryable",
      code: "provider-temporary",
    });
  });

  it("default-denies Cloudflare M2M100 content without explicit data policy", async () => {
    const run = vi.fn();
    const adapter = new CloudflareM2m100TranslationProvider({ run });
    const { executor, recordFailure } = await harness({ adapter });

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toEqual({
      outcome: "execution-failed",
      delivery: "terminal",
      failureCode: "provider-unsupported",
      terminalReason: "terminal",
      attemptCount: 1,
      maxAttempts: 3,
    });
    expect(run).not.toHaveBeenCalled();
    expect(recordFailure).toHaveBeenCalledWith(taskId, claimToken, {
      disposition: "terminal",
      code: "provider-unsupported",
    });
  });

  it("terminalizes an unsupported provider pair", async () => {
    const adapter: MachineTranslationProviderAdapter = {
      supports: vi.fn(() => false),
      translate: vi.fn(),
    };
    const { executor, recordFailure } = await harness({ adapter });

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toEqual({
      outcome: "execution-failed",
      delivery: "terminal",
      failureCode: "provider-unsupported",
      terminalReason: "terminal",
      attemptCount: 1,
      maxAttempts: 3,
    });
    expect(recordFailure).toHaveBeenCalledWith(taskId, claimToken, {
      disposition: "terminal",
      code: "provider-unsupported",
    });
  });

  it.each([
    ["blank output", { providerValue: "   " }],
    ["structured output", { providerValue: { text: "invalid" } }],
    ["bad provenance", {
      providerProvenance: { provider: "fake", model: "", origin: "machine" },
    }],
    ["blank attribution", {
      providerProvenance: {
        provider: "fake",
        model: "fake-v1",
        origin: "machine",
        attribution: "   ",
      },
    }],
  ])("terminalizes %s as provider-output-invalid", async (_label, options) => {
    const { executor, publishClaimedMachineResult, recordFailure } = await harness(options);

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toEqual({
      outcome: "execution-failed",
      delivery: "terminal",
      failureCode: "provider-output-invalid",
      terminalReason: "terminal",
      attemptCount: 1,
      maxAttempts: 3,
    });
    expect(publishClaimedMachineResult).not.toHaveBeenCalled();
    expect(recordFailure).toHaveBeenCalledWith(taskId, claimToken, {
      disposition: "terminal",
      code: "provider-output-invalid",
    });
  });

  it("turns a classified translation-store outage after claim into dependency-temporary retry", async () => {
    const { executor, translate, recordFailure } = await harness({
      translationFailure: new ContentTranslationStorageUnavailableError("fixture unavailable"),
    });

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toEqual({
      outcome: "execution-failed",
      delivery: "retry",
      failureCode: "dependency-temporary",
      attemptCount: 1,
      maxAttempts: 3,
    });
    expect(translate).not.toHaveBeenCalled();
    expect(recordFailure).toHaveBeenCalledWith(taskId, claimToken, {
      disposition: "retryable",
      code: "dependency-temporary",
    });
  });

  it("acknowledges publication claim loss without retrying provider work", async () => {
    const { executor, translate } = await harness({
      publicationResult: { outcome: "claim-lost" },
    });
    await expect(executor.execute({ translationTaskId: taskId })).resolves.toEqual({
      outcome: "claim-lost",
      delivery: "ack",
    });
    expect(translate).toHaveBeenCalledTimes(1);
  });
});
