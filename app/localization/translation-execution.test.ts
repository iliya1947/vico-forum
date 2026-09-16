import { describe, expect, it, vi } from "vitest";
import { canonicalEnglishCatalog, type UiMessageDescriptor } from "./catalog";
import { sourceFingerprint } from "./fingerprint";
import { IntlLocaleRulesProvider } from "./locale-rules";
import { InMemoryLocaleRegistry } from "./registry";
import { LocalTranslationSource } from "./sources";
import {
  TranslationProviderRouter,
  type MachineTranslationProviderAdapter,
  type MachineTranslationRequest,
} from "./translation-provider";
import {
  UiTranslationTaskExecutor,
} from "./translation-execution";
import {
  UiTranslationResultPublisher,
  type UiTranslationPublicationStore,
} from "./translation-publication";
import { UiTranslationTaskConsumer } from "./translation-task-consumer";
import type { TranslationTask, TranslationTaskStore } from "./translation-tasks";
import { TranslationValidationError } from "./translation-validation";

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
    claimToken,
    claimedAt: now,
    leaseExpiresAt: new Date(now.getTime() + 60_000),
    staleAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

async function harness(options: {
  readonly source?: UiMessageDescriptor;
  readonly targetLocale?: string;
  readonly providerValue?: unknown;
  readonly currentGeneration?: boolean;
} = {}) {
  const source = options.source ?? canonicalEnglishCatalog.common.heading;
  const targetLocale = options.targetLocale ?? "fr";
  const task = await processingTask(source, targetLocale);
  const tasks: TranslationTaskStore = {
    upsertPending: vi.fn(),
    findById: vi.fn(),
    findByIdentity: vi.fn(),
    claim: vi.fn(async () => ({ outcome: "claimed" as const, task })),
    markStale: vi.fn(async () => true),
    isCurrentGeneration: vi.fn(async () => options.currentGeneration ?? true),
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

  const translate = vi.fn(async (request: MachineTranslationRequest) => {
    void request;
    return {
      value: options.providerValue ?? "Fondation de traduction",
      provenance: { provider: "fake", model: "fake-v1", origin: "machine" as const },
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
  const executor = new UiTranslationTaskExecutor({
    consumer,
    providerRouter,
    publisher,
    localeRules,
  });

  return { executor, translate, publishClaimedMachineResult, tasks };
}

describe("UiTranslationTaskExecutor", () => {
  it("runs an eligible plain task through provider routing, validation and conditional publication", async () => {
    const { executor, translate, publishClaimedMachineResult } = await harness();

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toEqual({ outcome: "published" });
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

    await expect(executor.execute({ translationTaskId: taskId })).resolves.toEqual({ outcome: "published" });
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
    });
    expect(translate).not.toHaveBeenCalled();
    expect(publishClaimedMachineResult).not.toHaveBeenCalled();
    expect(tasks.markStale).toHaveBeenCalledWith(taskId, claimToken);
  });

  it("keeps provider output untrusted until the publisher validation boundary", async () => {
    const { executor, publishClaimedMachineResult } = await harness({ providerValue: "   " });

    await expect(executor.execute({ translationTaskId: taskId })).rejects.toBeInstanceOf(TranslationValidationError);
    expect(publishClaimedMachineResult).not.toHaveBeenCalled();
  });
});
