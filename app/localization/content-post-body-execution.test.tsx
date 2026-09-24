import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ForumMarkdown } from "../forum/markdown";
import {
  CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
  protectMarkdownForTranslation,
} from "./content-markdown-translation";
import {
  ContentPostBodyTaskExecutor,
  type ContentPostBodyExecutionBounds,
} from "./content-post-body-execution";
import {
  ContentPostBodyResultPublisher,
  type ContentPostBodyPublicationStore,
} from "./content-post-body-publication";
import {
  contentPostBodySourceFingerprint,
  contentPostBodyTaskIdentity,
} from "./content-post-body-planning";
import {
  ContentPostBodyTaskConsumer,
  type ContentPostBodyRevisionReader,
} from "./content-post-body-task-consumer";
import {
  ContentTranslationStorageUnavailableError,
  type ContentTranslationRevision,
  type ContentTranslationStore,
  type StoredContentTranslation,
} from "./content-translation";
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
  ContentPostBodyTranslationTask,
  ContentPostBodyTranslationTaskStore,
  TranslationTaskFailureResult,
} from "./translation-tasks";

afterEach(cleanup);

const taskId = "10000000-0000-4000-8000-000000000001";
const claimToken = "20000000-0000-4000-8000-000000000002";
const now = new Date("2026-09-24T12:00:00.000Z");
const defaultBody = [
  "Первый человеческий текст с fetchData().",
  "",
  "Второй текст и [документация](https://example.com/docs).",
].join("\n");

function revision(
  overrides: Partial<ContentTranslationRevision> = {},
): ContentTranslationRevision {
  return {
    contentType: "post-body",
    contentId: "post-a",
    revisionId: "post-r1",
    originalContent: defaultBody,
    sourceLocale: "ru",
    ...overrides,
  };
}

async function contentTask(
  overrides: Partial<ContentPostBodyTranslationTask> = {},
): Promise<ContentPostBodyTranslationTask & {
  readonly status: "processing";
  readonly claimToken: string;
}> {
  const currentRevision = revision();
  const protectedDocument = protectMarkdownForTranslation(currentRevision.originalContent);
  const base = {
    id: taskId,
    taskIdentity: "",
    translationKind: "content-post-body" as const,
    sourceIdentity: { postId: "post-a", revisionId: "post-r1" },
    revisionSourceLocale: "ru",
    resolvedSourceLocale: "ru",
    sourceResolutionOrigin: "revision-metadata" as const,
    sourceFingerprint: "",
    targetLocale: "he",
    protectedContentPolicyVersion: CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
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
  const sourceFingerprint = overrides.sourceFingerprint ?? await contentPostBodySourceFingerprint({
    postId: merged.sourceIdentity.postId,
    revisionId: merged.sourceIdentity.revisionId,
    revisionSourceLocale: merged.revisionSourceLocale,
    resolvedSourceLocale: merged.resolvedSourceLocale,
    sourceResolutionOrigin: merged.sourceResolutionOrigin,
    protectedContentPolicyVersion: merged.protectedContentPolicyVersion,
    protectedMarkdown: protectedDocument.protectedMarkdown,
    segments: protectedDocument.segments,
  });
  const identityInput = {
    translationKind: "content-post-body" as const,
    sourceIdentity: merged.sourceIdentity,
    revisionSourceLocale: merged.revisionSourceLocale,
    resolvedSourceLocale: merged.resolvedSourceLocale,
    sourceResolutionOrigin: merged.sourceResolutionOrigin,
    sourceFingerprint,
    targetLocale: merged.targetLocale,
    protectedContentPolicyVersion: merged.protectedContentPolicyVersion,
    generationPolicyVersion: merged.generationPolicyVersion,
  };
  const taskIdentity = overrides.taskIdentity ?? await contentPostBodyTaskIdentity(identityInput);
  return { ...merged, sourceFingerprint, taskIdentity } as ContentPostBodyTranslationTask & {
    readonly status: "processing";
    readonly claimToken: string;
  };
}

function translatedValue(source: string): string {
  const tokens = source.match(/⟦VICOPROTECTED\d+X\d+X\d+⟧/gu) ?? [];
  return ["תרגום", ...tokens].join(" ");
}

async function harness(options: {
  readonly task?: ContentPostBodyTranslationTask & {
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
  readonly protectedContentPolicyVersion?: string;
  readonly providerSupported?: boolean;
  readonly translateEffect?: (
    request: MachineTranslationRequest,
    call: number,
  ) => MachineTranslationResult | Promise<MachineTranslationResult>;
  readonly publicationResult?: Awaited<
    ReturnType<ContentPostBodyPublicationStore["publishClaimedMachineResult"]>
  >;
  readonly failureResult?: TranslationTaskFailureResult;
  readonly executionBounds?: ContentPostBodyExecutionBounds;
} = {}) {
  const task = options.task ?? await contentTask();
  const claimOutcome = options.claimOutcome ?? "claimed";
  const markStale = vi.fn(async () => true);
  const currentGeneration = vi.fn(async () => options.currentGeneration ?? true);
  const tasks: ContentPostBodyTranslationTaskStore = {
    claimContentPostBody: vi.fn(async () => claimOutcome === "claimed"
      ? {
          outcome: "claimed" as const,
          task,
          attemptStarted: options.attemptStarted ?? true,
        }
      : { outcome: "already-claimed" as const }),
    markStale,
    isCurrentContentPostBodyGeneration: currentGeneration,
  };

  const revisions: ContentPostBodyRevisionReader = {
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
  const protectedContentPolicyVersion =
    options.protectedContentPolicyVersion ?? CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION;

  const consumer = new ContentPostBodyTaskConsumer({
    tasks,
    revisions,
    translations,
    localeRegistry,
    generationPolicyVersion,
    protectedContentPolicyVersion,
    leaseDurationMs: 60_000,
  });

  let calls = 0;
  const translate = vi.fn(async (
    request: MachineTranslationRequest,
  ): Promise<MachineTranslationResult> => {
    calls++;
    if (options.translateEffect) return options.translateEffect(request, calls);
    if (typeof request.source !== "string") throw new Error("post-body request must be plain");
    return {
      value: translatedValue(request.source),
      provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
    };
  });
  const adapter: MachineTranslationProviderAdapter = {
    supports: vi.fn(() => options.providerSupported ?? true),
    translate,
  };
  const providerRouter = new TranslationProviderRouter([adapter]);

  const publishClaimedMachineResult = vi.fn(async (
    _publication: Parameters<ContentPostBodyPublicationStore["publishClaimedMachineResult"]>[0],
  ) => options.publicationResult ?? { outcome: "published" as const });
  const publisher = new ContentPostBodyResultPublisher({
    tasks,
    revisions,
    translations,
    localeRegistry,
    generationPolicyVersion,
    protectedContentPolicyVersion,
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

  const executor = new ContentPostBodyTaskExecutor({
    consumer,
    providerRouter,
    publisher,
    failures: { recordFailure },
    executionBounds: options.executionBounds ?? {
      maxSegments: 20,
      maxTotalSegmentCharacters: 100_000,
    },
  });

  return {
    executor,
    translate,
    adapter,
    markStale,
    currentGeneration,
    publishClaimedMachineResult,
    recordFailure,
    revisions,
    translations,
  };
}

describe("ContentPostBodyTaskExecutor", () => {
  it("translates protected segments in order and publishes safe restored Markdown", async () => {
    const { executor, translate, publishClaimedMachineResult, recordFailure } = await harness();

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toEqual({
      outcome: "published",
      delivery: "ack",
    });

    const document = protectMarkdownForTranslation(defaultBody);
    expect(translate).toHaveBeenCalledTimes(document.segments.length);
    const requests = translate.mock.calls.map(([request]) => request);
    expect(requests.map((request) => request.source)).toEqual(
      document.segments.map((segment) => segment.text),
    );
    for (const request of requests) {
      expect(request).toMatchObject({
        domain: "content",
        contentClassification: "public-forum-post-body",
        sourceLocale: "ru",
        targetLocale: "he",
        messageKind: "plain",
        operation: "plain",
      });
      expect(String(request.source)).not.toContain("fetchData()");
      expect(String(request.source)).not.toContain("https://example.com/docs");
    }

    const publication = publishClaimedMachineResult.mock.calls[0]?.[0];
    expect(publication).toMatchObject({
      task: expect.objectContaining({ id: taskId, claimToken }),
      revision: revision(),
      provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
      generationPolicyVersion: "content-v1",
      protectedContentPolicyVersion: CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
    });
    expect(publication?.translatedContent).toContain("fetchData()");
    expect(publication?.translatedContent).toContain("https://example.com/docs");

    const { container } = render(<ForumMarkdown>{publication?.translatedContent ?? ""}</ForumMarkdown>);
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByRole("link", { name: "תרגום" }).getAttribute("href"))
      .toBe("https://example.com/docs");
    expect(container.textContent).toContain("fetchData()");
    expect(recordFailure).not.toHaveBeenCalled();
  });

  it.each([
    ["revision-not-current", { currentRevision: revision({ revisionId: "post-r2" }) }],
    ["source-changed", { currentRevision: revision({ sourceLocale: "en" }) }],
    ["policy-changed", { generationPolicyVersion: "content-v2" }],
    ["protected-policy-changed", { protectedContentPolicyVersion: "cnt04-commonmark-v2" }],
    ["generation-superseded", { currentGeneration: false }],
    ["target-locale-ineligible", { activeTarget: false }],
    ["translation-current", {
      currentTranslation: {
        contentType: "post-body" as const,
        contentId: "post-a",
        revisionId: "post-r1",
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

  it("marks a protected-source fingerprint mismatch stale before provider execution", async () => {
    const task = await contentTask({ sourceFingerprint: "f".repeat(64) });
    const { executor, translate } = await harness({ task });

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toMatchObject({
      outcome: "stale",
      reason: "source-fingerprint-mismatch",
      delivery: "ack",
    });
    expect(translate).not.toHaveBeenCalled();
  });

  it("enforces injected segment and total-character execution bounds before provider calls", async () => {
    for (const executionBounds of [
      { maxSegments: 1, maxTotalSegmentCharacters: 100_000 },
      { maxSegments: 20, maxTotalSegmentCharacters: 1 },
    ]) {
      const { executor, translate, recordFailure } = await harness({ executionBounds });

      await expect(executor.execute({ translationTaskId: taskId })).resolves.toMatchObject({
        outcome: "execution-failed",
        delivery: "terminal",
        failureCode: "execution-bound-exceeded",
      });
      expect(translate).not.toHaveBeenCalled();
      expect(recordFailure).toHaveBeenCalledWith(taskId, claimToken, {
        disposition: "terminal",
        code: "execution-bound-exceeded",
      });
    }
  });

  it("prechecks every segment capability before the first provider call", async () => {
    const { executor, translate, recordFailure } = await harness({ providerSupported: false });

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toMatchObject({
      outcome: "execution-failed",
      delivery: "terminal",
      failureCode: "provider-unsupported",
    });
    expect(translate).not.toHaveBeenCalled();
    expect(recordFailure).toHaveBeenCalledWith(taskId, claimToken, {
      disposition: "terminal",
      code: "provider-unsupported",
    });
  });

  it("retries a later transient segment failure without publishing partial success", async () => {
    const { executor, translate, publishClaimedMachineResult, recordFailure } = await harness({
      translateEffect: (request, call) => {
        if (call === 2) {
          throw new TranslationExecutionFailure(
            "retryable",
            "provider-temporary",
            "temporary provider fixture",
          );
        }
        if (typeof request.source !== "string") throw new Error("plain source required");
        return {
          value: translatedValue(request.source),
          provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
        };
      },
    });

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toEqual({
      outcome: "execution-failed",
      delivery: "retry",
      failureCode: "provider-temporary",
      attemptCount: 1,
      maxAttempts: 3,
    });
    expect(translate).toHaveBeenCalledTimes(2);
    expect(publishClaimedMachineResult).not.toHaveBeenCalled();
    expect(recordFailure).toHaveBeenCalledWith(taskId, claimToken, {
      disposition: "retryable",
      code: "provider-temporary",
    });
  });

  it("terminalizes exhausted retryable work through the shared attempt lifecycle", async () => {
    const { executor } = await harness({
      translateEffect: () => {
        throw new TranslationExecutionFailure(
          "retryable",
          "provider-temporary",
          "temporary provider fixture",
        );
      },
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
      failureCode: "provider-temporary",
      terminalReason: "retry-exhausted",
      attemptCount: 3,
      maxAttempts: 3,
    });
  });

  it("terminalizes mixed segment provenance without publishing", async () => {
    const { executor, publishClaimedMachineResult, recordFailure } = await harness({
      translateEffect: (request, call) => {
        if (typeof request.source !== "string") throw new Error("plain source required");
        return {
          value: translatedValue(request.source),
          provenance: {
            provider: "fake",
            model: call === 1 ? "fake-v1" : "fake-v2",
            origin: "machine",
          },
        };
      },
    });

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toMatchObject({
      outcome: "execution-failed",
      delivery: "terminal",
      failureCode: "provider-output-invalid",
    });
    expect(publishClaimedMachineResult).not.toHaveBeenCalled();
    expect(recordFailure).toHaveBeenCalledWith(taskId, claimToken, {
      disposition: "terminal",
      code: "provider-output-invalid",
    });
  });

  it.each([
    ["structured output", { value: { text: "invalid" }, provenance: { provider: "fake", model: "fake-v1", origin: "machine" } }],
    ["blank attribution", { value: "תרגום", provenance: { provider: "fake", model: "fake-v1", origin: "machine", attribution: "   " } }],
    ["bad provenance", { value: "תרגום", provenance: { provider: "fake", model: "", origin: "machine" } }],
  ])("terminalizes %s as invalid provider output", async (_label, fixture) => {
    const { executor, publishClaimedMachineResult } = await harness({
      translateEffect: () => fixture as MachineTranslationResult,
    });

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toMatchObject({
      outcome: "execution-failed",
      delivery: "terminal",
      failureCode: "provider-output-invalid",
    });
    expect(publishClaimedMachineResult).not.toHaveBeenCalled();
  });

  it("terminalizes CNT-04 token-loss restoration and preserves original fallback", async () => {
    const { executor, publishClaimedMachineResult, recordFailure } = await harness({
      translateEffect: (_request, call) => ({
        value: call === 1 ? "תרגום ללא token" : "תרגום",
        provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
      }),
    });

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toMatchObject({
      outcome: "execution-failed",
      delivery: "terminal",
      failureCode: "provider-output-invalid",
    });
    expect(publishClaimedMachineResult).not.toHaveBeenCalled();
    expect(recordFailure).toHaveBeenCalled();
  });

  it("acknowledges duplicate live delivery without another provider call", async () => {
    const { executor, translate } = await harness({ claimOutcome: "already-claimed" });

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toEqual({
      outcome: "already-claimed",
      delivery: "ack",
    });
    expect(translate).not.toHaveBeenCalled();
  });

  it("terminalizes an exhausted reclaimed lease without provider work", async () => {
    const { executor, translate, revisions } = await harness({
      attemptStarted: false,
      failureResult: {
        outcome: "terminal",
        attemptCount: 3,
        maxAttempts: 3,
        disposition: "retry-exhausted",
      },
    });

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toMatchObject({
      outcome: "execution-failed",
      delivery: "terminal",
      failureCode: "attempt-budget-exhausted",
      terminalReason: "retry-exhausted",
    });
    expect(translate).not.toHaveBeenCalled();
    expect(revisions.readCurrentRevision).not.toHaveBeenCalled();
  });

  it("turns a classified translation-store outage after claim into dependency retry", async () => {
    const { executor, translate, recordFailure } = await harness({
      translationFailure: new ContentTranslationStorageUnavailableError("fixture unavailable"),
    });

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toMatchObject({
      outcome: "execution-failed",
      delivery: "retry",
      failureCode: "dependency-temporary",
    });
    expect(translate).not.toHaveBeenCalled();
    expect(recordFailure).toHaveBeenCalledWith(taskId, claimToken, {
      disposition: "retryable",
      code: "dependency-temporary",
    });
  });

  it("acknowledges publication claim loss after complete provider work", async () => {
    const { executor, translate } = await harness({
      publicationResult: { outcome: "claim-lost" },
    });

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toEqual({
      outcome: "claim-lost",
      delivery: "ack",
    });
    expect(translate).toHaveBeenCalled();
  });
});
