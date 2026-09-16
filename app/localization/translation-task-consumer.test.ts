import { describe, expect, it, vi } from "vitest";
import { canonicalEnglishCatalog } from "./catalog";
import { sourceFingerprint } from "./fingerprint";
import type { PersistentUiTranslationRow } from "./persistent-sources";
import { InMemoryLocaleRegistry } from "./registry";
import { LocalTranslationSource, type TranslationSource } from "./sources";
import { UiTranslationTaskConsumer } from "./translation-task-consumer";
import type { TranslationTask, TranslationTaskStore } from "./translation-tasks";

const now = new Date("2026-09-15T12:00:00.000Z");
const taskId = "10000000-0000-4000-8000-000000000001";
const claimToken = "20000000-0000-4000-8000-000000000002";

function registry(tag = "fr", publicationStatus: "active" | "inactive" | "disabled" = "inactive") {
  return new InMemoryLocaleRegistry([{ tag, translationStatus: "draft", publicationStatus,
    direction: "ltr", fallbackChain: ["en"], nativeName: tag }]);
}

async function claimedTask(overrides: Partial<TranslationTask> = {}): Promise<TranslationTask & {
  status: "processing"; claimToken: string;
}> {
  return {
    id: taskId,
    taskIdentity: "a".repeat(64),
    translationKind: "ui",
    sourceIdentity: { namespace: "common", key: "heading" },
    sourceFingerprint: await sourceFingerprint(canonicalEnglishCatalog.common.heading),
    targetLocale: "fr",
    generationPolicyVersion: "ui-policy-v1",
    status: "processing",
    claimToken,
    claimedAt: now,
    leaseExpiresAt: new Date(now.getTime() + 60_000),
    staleAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as TranslationTask & { status: "processing"; claimToken: string };
}

async function harness(options: {
  task?: TranslationTask & { status: "processing"; claimToken: string };
  localeRegistry?: ReturnType<typeof registry>;
  localManualSource?: TranslationSource;
  persistentRows?: readonly PersistentUiTranslationRow[];
  policy?: string;
} = {}) {
  const task = options.task ?? await claimedTask();
  const markStale = vi.fn(async () => true);
  const tasks: TranslationTaskStore = {
    upsertPending: vi.fn(), findById: vi.fn(), findByIdentity: vi.fn(), markStale,
    claim: vi.fn(async () => ({ outcome: "claimed" as const, task })),
  };
  const consumer = new UiTranslationTaskConsumer({
    tasks,
    localeRegistry: options.localeRegistry ?? registry(),
    localManualSource: options.localManualSource ?? new LocalTranslationSource({}),
    persistentStore: { readApproved: vi.fn(async () => options.persistentRows ?? []) },
    generationPolicyVersion: options.policy ?? "ui-policy-v1",
    leaseDurationMs: 60_000,
  });
  return { result: await consumer.consume({ translationTaskId: taskId }), markStale };
}

describe("UiTranslationTaskConsumer stale preflight", () => {
  it("returns a typed execution context for a current eligible task", async () => {
    const { result, markStale } = await harness();
    expect(result).toMatchObject({ outcome: "eligible", context: {
      task: { id: taskId, claimToken }, source: { namespace: "common", key: "heading" },
    } });
    expect(markStale).not.toHaveBeenCalled();
  });

  it.each([
    ["canonical source", async () => ({ task: await claimedTask({ sourceIdentity: { namespace: "common", key: "removed" } }) }), "source-missing"],
    ["source fingerprint", async () => ({ task: await claimedTask({ sourceFingerprint: "b".repeat(64) }) }), "source-changed"],
    ["generation policy", async () => ({ policy: "ui-policy-v2" }), "policy-changed"],
    ["removed locale", async () => ({ localeRegistry: registry("de") }), "target-locale-ineligible"],
    ["disabled locale", async () => ({ localeRegistry: registry("fr", "disabled") }), "target-locale-ineligible"],
  ] as const)("marks a task stale when its %s is no longer current", async (_label, setup, reason) => {
    const { result, markStale } = await harness(await setup());
    expect(result).toEqual({ outcome: "stale", reason });
    expect(markStale).toHaveBeenCalledWith(taskId, claimToken);
  });

  it("marks a task stale when an exact-target local manual translation appeared", async () => {
    const fingerprint = await sourceFingerprint(canonicalEnglishCatalog.common.heading);
    const local = new LocalTranslationSource({ fr: { common: { heading: { value: "Fondation", sourceFingerprint: fingerprint } } } });
    expect((await harness({ localManualSource: local })).result).toEqual({
      outcome: "stale", reason: "manual-translation-exists",
    });
  });

  it("marks a task stale when an exact-target persistent manual translation appeared", async () => {
    const fingerprint = await sourceFingerprint(canonicalEnglishCatalog.common.heading);
    const row = { locale: "fr", namespace: "common", key: "heading", origin: "persistent_manual",
      status: "approved", sourceFingerprint: fingerprint, translatedPayload: "Fondation" };
    expect((await harness({ persistentRows: [row] })).result).toEqual({
      outcome: "stale", reason: "manual-translation-exists",
    });
  });

  it("does not use a fallback-locale manual resource as exact-target evidence", async () => {
    const fingerprint = await sourceFingerprint(canonicalEnglishCatalog.common.heading);
    const local = new LocalTranslationSource({ en: { common: { heading: { value: "Override", sourceFingerprint: fingerprint } } } });
    expect((await harness({ localManualSource: local })).result.outcome).toBe("eligible");
  });

  it("does not run preflight again when a live claim or terminal task is delivered", async () => {
    for (const outcome of ["already-claimed", "terminal"] as const) {
      const local = { load: vi.fn() };
      const tasks = { claim: vi.fn(async () => ({ outcome })) } as unknown as TranslationTaskStore;
      const consumer = new UiTranslationTaskConsumer({ tasks, localeRegistry: registry(), localManualSource: local,
        persistentStore: { readApproved: vi.fn() }, generationPolicyVersion: "ui-policy-v1",
        leaseDurationMs: 60_000 });
      await expect(consumer.consume({ translationTaskId: taskId })).resolves.toEqual({ outcome });
      expect(local.load).not.toHaveBeenCalled();
    }
  });
});
