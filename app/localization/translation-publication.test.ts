import { describe, expect, it, vi } from "vitest";
import { canonicalEnglishCatalog, type UiMessageDescriptor } from "./catalog";
import { sourceFingerprint } from "./fingerprint";
import { IntlLocaleRulesProvider } from "./locale-rules";
import type { PersistentUiTranslationRow } from "./persistent-sources";
import { InMemoryLocaleRegistry } from "./registry";
import { LocalTranslationSource } from "./sources";
import {
  UiTranslationResultPublisher,
  type UiTranslationPublicationStore,
} from "./translation-publication";
import type { ClaimedUiTranslationExecutionContext } from "./translation-task-consumer";
import type { TranslationTask, TranslationTaskStore } from "./translation-tasks";
import { TranslationValidationError } from "./translation-validation";

const now = new Date("2026-09-16T09:00:00.000Z");

async function context(
  source: UiMessageDescriptor = canonicalEnglishCatalog.common.heading,
  targetLocale = "fr",
): Promise<ClaimedUiTranslationExecutionContext> {
  const task: TranslationTask & { status: "processing"; claimToken: string } = {
    id: "10000000-0000-4000-8000-000000000001",
    taskIdentity: "a".repeat(64),
    translationKind: "ui",
    sourceIdentity: { namespace: source.namespace, key: source.key },
    sourceFingerprint: await sourceFingerprint(source),
    targetLocale,
    generationPolicyVersion: "ui-policy-v1",
    status: "processing",
    claimToken: "20000000-0000-4000-8000-000000000002",
    claimedAt: now,
    leaseExpiresAt: new Date(now.getTime() + 60_000),
    staleAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  return { task, source };
}

function publisherHarness(options: {
  locale?: string;
  persistentRows?: readonly PersistentUiTranslationRow[];
  publish?: UiTranslationPublicationStore["publishClaimedMachineResult"];
} = {}) {
  const markStale = vi.fn(async () => true);
  const tasks = {
    upsertPending: vi.fn(), findById: vi.fn(), findByIdentity: vi.fn(), claim: vi.fn(), markStale,
  } as unknown as TranslationTaskStore;
  const publishClaimedMachineResult = vi.fn(options.publish ?? (async () => true));
  const publications: UiTranslationPublicationStore = { publishClaimedMachineResult };
  const locale = options.locale ?? "fr";
  const resultPublisher = new UiTranslationResultPublisher({
    tasks,
    localeRegistry: new InMemoryLocaleRegistry([{
      tag: locale, translationStatus: "draft", publicationStatus: "inactive",
      direction: "ltr", fallbackChain: ["en"], nativeName: locale,
    }]),
    localManualSource: new LocalTranslationSource({}),
    persistentStore: { readApproved: vi.fn(async () => options.persistentRows ?? []) },
    generationPolicyVersion: "ui-policy-v1",
    localeRules: new IntlLocaleRulesProvider(),
    publications,
  });
  return { resultPublisher, markStale, publishClaimedMachineResult };
}

describe("UiTranslationResultPublisher", () => {
  it("publishes a validated plain provider result for the still-current claim", async () => {
    const claimed = await context();
    const { resultPublisher, publishClaimedMachineResult, markStale } = publisherHarness();

    await expect(resultPublisher.publish(claimed, {
      value: "Fondation de traduction",
      provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
    })).resolves.toEqual({ outcome: "published" });

    expect(markStale).not.toHaveBeenCalled();
    expect(publishClaimedMachineResult).toHaveBeenCalledWith({
      task: claimed.task,
      value: "Fondation de traduction",
      provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
    });
  });

  it("validates a complete target plural payload before publication", async () => {
    const claimed = await context(canonicalEnglishCatalog.common.sectionCount, "ru");
    const { resultPublisher, publishClaimedMachineResult } = publisherHarness({ locale: "ru" });
    const value = {
      one: "{{count}} раздел",
      few: "{{count}} раздела",
      many: "{{count}} разделов",
      other: "{{count}} раздела",
    };

    await expect(resultPublisher.publish(claimed, {
      value,
      provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
    })).resolves.toEqual({ outcome: "published" });
    expect(publishClaimedMachineResult).toHaveBeenCalledWith(expect.objectContaining({ value }));
  });

  it("rejects invalid provider output before persistence", async () => {
    const claimed = await context();
    const { resultPublisher, publishClaimedMachineResult } = publisherHarness();

    await expect(resultPublisher.publish(claimed, {
      value: "   ",
      provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
    })).rejects.toBeInstanceOf(TranslationValidationError);
    expect(publishClaimedMachineResult).not.toHaveBeenCalled();
  });

  it("rechecks manual priority after provider work and marks the claim stale instead of publishing", async () => {
    const claimed = await context();
    const { resultPublisher, markStale, publishClaimedMachineResult } = publisherHarness({
      persistentRows: [{
        locale: "fr", namespace: "common", key: "heading", origin: "persistent_manual",
        status: "approved", sourceFingerprint: claimed.task.sourceFingerprint,
        translatedPayload: "Traduction manuelle",
      }],
    });

    await expect(resultPublisher.publish(claimed, {
      value: "Machine",
      provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
    })).resolves.toEqual({ outcome: "stale", reason: "manual-translation-exists" });
    expect(markStale).toHaveBeenCalledWith(claimed.task.id, claimed.task.claimToken);
    expect(publishClaimedMachineResult).not.toHaveBeenCalled();
  });

  it("reports a lost claim when the atomic publication store rejects the claim token", async () => {
    const claimed = await context();
    const { resultPublisher } = publisherHarness({ publish: async () => false });
    await expect(resultPublisher.publish(claimed, {
      value: "Fondation",
      provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
    })).resolves.toEqual({ outcome: "claim-lost" });
  });
});
