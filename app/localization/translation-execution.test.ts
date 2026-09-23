import { describe, expect, it, vi } from "vitest";
import { canonicalEnglishCatalog, type UiMessageDescriptor } from "./catalog";
import {
  TranslationExecutionFailure,
  type TranslationFailureRecord,
} from "./translation-failures";
import { sourceFingerprint } from "./fingerprint";
import { IntlLocaleRulesProvider } from "./locale-rules";
import { PersistentTranslationIntegrityError } from "./persistent-sources";
import { InMemoryLocaleRegistry } from "./registry";
import { LocalTranslationSource } from "./sources";
import {
  TranslationProviderRouter,
  type MachineTranslationProviderAdapter,
  type MachineTranslationRequest,
  type MachineTranslationResult,
} from "./translation-provider";
import {
  UiTranslationTaskExecutor,
} from "./translation-execution";
import {
  UiTranslationResultPublisher,
  type UiTranslationPublicationStore,
} from "./translation-publication";
import { UiTranslationTaskConsumer } from "./translation-task-consumer";
import type {
  TranslationTask,
  TranslationTaskFailureResult,
  TranslationTaskStore,
} from "./translation-tasks";

const now = new Date("2026-09-16T18:00:00.000Z");
const taskId = "10000000-0000-4000-8000-000000000001";
const claimToken = "20000000-0000-4000-8000-000000000002";

async function processingTask(
  source: UiMessageDescriptor,
  targetLocale: string,
): Promise<TranslationTask & { readonly status: "processing"; readonly claimToken: string }> {
  return {
    id: taskId,
    taskIdentity: "a".repeat(64),
    translationKind: "ui",
    sourceIdentity: { namespace: source.namespace, key: source.key },
    sourceFingerprint: await sourceFingerprint(source),
    targetLocale,
    generationPolicyVersion: "ui-policy-v1",
    generation: 1,
    status: "processing",
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
}

async function harness(options: {
  readonly source?: UiMessageDescriptor;
  readonly targetLocale?: string;
  readonly providerValue?: unknown;
  readonly providerFailure?: Error;
  readonly providerProvenance?: unknown;
  readonly preflightFailure?: Error;
  readonly currentGeneration?: boolean;
  readonly attemptStarted?: boolean;
  readonly claimOutcome?: "claimed" | "already-claimed";
  readonly failureResult?: TranslationTaskFailureResult;
} = {}) {
  const source = options.source ?? canonicalEnglishCatalog.common.heading;
  const targetLocale = options.targetLocale ?? "fr";
  const task = await processingTask(source, targetLocale);
  const claimOutcome = options.claimOutcome ?? "claimed";
  const tasks: TranslationTaskStore = {
    upsertPending: vi.fn(),
    findById: vi.fn(),
    findByIdentity: vi.fn(),
    claim: vi.fn(async () => claimOutcome === "claimed"
      ? {
          outcome: "claimed" as const,
          task,
          attemptStarted: options.attemptStarted ?? true,
        }
      : { outcome: "already-claimed" as const }),
    markStale: vi.fn(async () => true),
    isCurrentGeneration: vi.fn(async () => {
      if (options.preflightFailure) throw options.preflightFailure;
      return options.currentGeneration ?? true;
    }),
  };
  const localeRegistry = new InMemoryLocaleRegistry([{
    tag: targetLocale,
    translationStatus: "draft",
    publicationStatus: "inactive",
    direction: "ltr",
    fallbackChain: ["en"],
    nativeName: targetLocale,
  }]);
  const localManualSource = new LocalTranslationSource({});
  const persistentStore = { readApproved: vi.fn(async () => []) };
  const localeRules = new IntlLocaleRulesProvider();
  const consumer = new UiTranslationTaskConsumer({
    tasks,
    localeRegistry,
    localManualSource,
    persistentStore,
    generationPolicyVersion: "ui-policy-v1",
    leaseDurationMs: 60_000,
  });

  const translate = vi.fn(async (request: MachineTranslationRequest): Promise<MachineTranslationResult> => {
    void request;
    if (options.providerFailure) throw options.providerFailure;
    const provenance = Object.hasOwn(options, "providerProvenance")
      ? options.providerProvenance
      : {
          provider: "fake",
          model: "fake-v1",
          origin: "machine",
        };
    return {
      value: options.providerValue ?? "Fondation de traduction",
      provenance: provenance as MachineTranslationResult["provenance"],
    };
  });
  const adapter: MachineTranslationProviderAdapter = {
    supports: vi.fn(() => true),
    translate,
  };
  const providerRouter = new TranslationProviderRouter([adapter]);
  const publishClaimedMachineResult = vi.fn(async () => true);
  const publications: UiTranslationPublicationStore = { publishClaimedMachineResult };
  const publisher = new UiTranslationResultPublisher({
    tasks,
    localeRegistry,
    localManualSource,
    persistentStore,
    generationPolicyVersion: "ui-policy-v1",
    localeRules,
    publications,
  });
  const recordFailure = vi.fn(async (
    _id: string,
    _token: string,
    failure: TranslationFailureRecord,
  ): Promise<TranslationTaskFailureResult> => options.failureResult ?? (
    failure.disposition === "retryable"
      ? { outcome: "retry", attemptCount: 1, maxAttempts: 3 }
      : {
          outcome: "terminal",
          attemptCount: 1,
          maxAttempts: 3,
          disposition: failure.code === "attempt-budget-exhausted" ? "retry-exhausted" : "terminal",
        }
  ));
  const executor = new UiTranslationTaskExecutor({
    consumer,
    providerRouter,
    publisher,
    failures: { recordFailure },
    localeRules,
  });

  return { executor, translate, publishClaimedMachineResult, tasks, recordFailure };
}

describe("UiTranslationTaskExecutor", () => {
  it("runs an eligible plain task through provider routing, validation and conditional publication", async () => {
    const { executor, translate, publishClaimedMachineResult, recordFailure } = await harness();

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toEqual({
      outcome: "published",
      delivery: "ack",
    });
    expect(translate).toHaveBeenCalledWith({
      domain: "ui",
      sourceLocale: "en",
      targetLocale: "fr",
      messageKind: "plain",
      operation: "plain",
      source: canonicalEnglishCatalog.common.heading.source,
    });
    expect(publishClaimedMachineResult).toHaveBeenCalledWith(expect.objectContaining({
      task: expect.objectContaining({ id: taskId, claimToken }),
      value: "Fondation de traduction",
      provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
    }));
    expect(recordFailure).not.toHaveBeenCalled();
  });

  it("passes the target plural branch contract to a structured-capable provider", async () => {
    const value = {
      one: "{{count}} раздел",
      few: "{{count}} раздела",
      many: "{{count}} разделов",
      other: "{{count}} раздела",
    };
    const { executor, translate } = await harness({
      source: canonicalEnglishCatalog.common.sectionCount,
      targetLocale: "ru",
      providerValue: value,
    });

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toEqual({
      outcome: "published",
      delivery: "ack",
    });
    expect(translate).toHaveBeenCalledWith({
      domain: "ui",
      sourceLocale: "en",
      targetLocale: "ru",
      messageKind: "plural",
      operation: "structured",
      source: canonicalEnglishCatalog.common.sectionCount.source,
      requiredBranches: ["few", "many", "one", "other"],
    });
  });

  it("does not call the provider after consumer preflight supersedes the claimed generation", async () => {
    const { executor, translate, publishClaimedMachineResult, tasks } = await harness({ currentGeneration: false });

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toEqual({
      outcome: "stale",
      reason: "generation-superseded",
      delivery: "ack",
    });
    expect(translate).not.toHaveBeenCalled();
    expect(publishClaimedMachineResult).not.toHaveBeenCalled();
    expect(tasks.markStale).toHaveBeenCalledWith(taskId, claimToken);
  });

  it("acknowledges a live duplicate delivery without another provider call", async () => {
    const { executor, translate } = await harness({ claimOutcome: "already-claimed" });

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toEqual({
      outcome: "already-claimed",
      delivery: "ack",
    });
    expect(translate).not.toHaveBeenCalled();
  });

  it("returns retry only after a typed retryable failure is durably released", async () => {
    const failure = new TranslationExecutionFailure(
      "retryable",
      "provider-temporary",
      "temporary provider fixture",
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

  it("routes an explicitly classified temporary preflight dependency failure through bounded retry", async () => {
    const failure = new TranslationExecutionFailure(
      "retryable",
      "dependency-temporary",
      "temporary generation-head read failure",
    );
    const { executor, translate, recordFailure } = await harness({
      preflightFailure: failure,
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

  it("does not mask non-temporary preflight integrity failures as retryable dependency failures", async () => {
    const failure = new PersistentTranslationIntegrityError("persistent translation fixture outside requested scope");
    const { executor, translate, recordFailure } = await harness({
      preflightFailure: failure,
    });

    await expect(executor.execute({ translationTaskId: taskId })).rejects.toBe(failure);
    expect(translate).not.toHaveBeenCalled();
    expect(recordFailure).not.toHaveBeenCalled();
  });

  it("persists invalid provider output as a terminal failure instead of retrying it", async () => {
    const { executor, publishClaimedMachineResult, recordFailure } = await harness({ providerValue: "   " });

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

  it("terminalizes malformed provider provenance as provider-output-invalid", async () => {
    for (const provenance of [
      undefined,
      null,
      "invalid",
      {},
      { provider: "   ", model: "fake-v1", origin: "machine" },
      { provider: null, model: "fake-v1", origin: "machine" },
      { provider: 42, model: "fake-v1", origin: "machine" },
      { provider: "fake", model: "   ", origin: "machine" },
      { provider: "fake", model: null, origin: "machine" },
      { provider: "fake", model: 42, origin: "machine" },
      { provider: "fake", model: "fake-v1", origin: "manual" },
      { provider: "fake", model: "fake-v1", origin: 42 },
      { provider: "fake", model: "fake-v1", origin: "machine", attribution: null },
      { provider: "fake", model: "fake-v1", origin: "machine", attribution: 42 },
    ]) {
      const { executor, publishClaimedMachineResult, recordFailure } = await harness({
        providerProvenance: provenance,
      });

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
    }
  });

  it("terminalizes an exhausted reclaimed lease without another provider call", async () => {
    const { executor, translate, recordFailure, tasks } = await harness({
      attemptStarted: false,
      preflightFailure: new Error("dependency must not be read for exhausted reclaim"),
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
    expect(tasks.isCurrentGeneration).not.toHaveBeenCalled();
    expect(recordFailure).toHaveBeenCalledWith(taskId, claimToken, {
      disposition: "terminal",
      code: "attempt-budget-exhausted",
    });
  });

  it("acknowledges a failure result when the execution claim was lost before persistence", async () => {
    const failure = new TranslationExecutionFailure(
      "retryable",
      "provider-temporary",
      "temporary provider fixture",
    );
    const { executor } = await harness({
      providerFailure: failure,
      failureResult: { outcome: "claim-lost" },
    });

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toEqual({
      outcome: "claim-lost",
      delivery: "ack",
    });
  });
});
