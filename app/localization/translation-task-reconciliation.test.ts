import { describe, expect, it, vi } from "vitest";
import {
  MAX_TRANSLATION_TASK_RECONCILIATION_BATCH_SIZE,
  TranslationTaskReconciler,
  type TranslationTaskObservabilitySnapshot,
  type TranslationTaskReconciliationStore,
} from "./translation-task-reconciliation";
import { FakeTranslationTaskEnqueuer } from "./translation-tasks";

function emptySnapshot(): TranslationTaskObservabilitySnapshot {
  return {
    counts: { pending: 0, processing: 0, stale: 0, completed: 0, failed: 0 },
    pending: { oldestAgeMs: null, unattempted: 0, retryReleased: 0 },
    processing: {
      live: 0,
      expired: 0,
      oldestClaimAgeMs: null,
      oldestExpiredLeaseAgeMs: null,
      withAttemptsRemaining: 0,
      atAttemptBudget: 0,
    },
    failed: {
      terminal: 0,
      retryExhausted: 0,
      failureGroupCount: 0,
      groups: [],
    },
    allowance: {
      leased: 0,
      admitted: 0,
      deferred: 0,
      expiredLeases: 0,
      readyDeferred: 0,
      oldestDeferredAgeMs: null,
      nextRetryInMs: null,
      reasonGroupCount: 0,
      reasons: [],
    },
  };
}

function store(
  candidates: Awaited<ReturnType<TranslationTaskReconciliationStore["reserveReconciliationCandidates"]>>,
  snapshot: TranslationTaskObservabilitySnapshot = emptySnapshot(),
): TranslationTaskReconciliationStore {
  return {
    reserveReconciliationCandidates: vi.fn(async () => candidates),
    observeTranslationTasks: vi.fn(async () => snapshot),
  };
}

describe("TranslationTaskReconciler", () => {
  it("re-enqueues reserved pending and expired-processing candidates by id only", async () => {
    const tasks = store([
      { id: "task-pending", reason: "pending" },
      { id: "task-expired", reason: "expired-processing" },
    ]);
    const queue = new FakeTranslationTaskEnqueuer();
    const reconciler = new TranslationTaskReconciler(tasks, queue);

    await expect(reconciler.reconcile({ limit: 20, pendingOlderThanMs: 60_000 })).resolves.toEqual({
      outcome: "complete",
      selected: 2,
      enqueued: 2,
      enqueueFailures: 0,
      pending: 1,
      expiredProcessing: 1,
    });

    expect(tasks.reserveReconciliationCandidates).toHaveBeenCalledWith({
      limit: 20,
      pendingOlderThanMs: 60_000,
    });
    expect(queue.messages).toEqual([
      { translationTaskId: "task-pending" },
      { translationTaskId: "task-expired" },
    ]);
  });

  it("continues the bounded batch after an enqueue failure and reports partial failure", async () => {
    const tasks = store([
      { id: "task-first", reason: "pending" },
      { id: "task-second", reason: "pending" },
      { id: "task-third", reason: "expired-processing" },
    ]);
    const attempted: string[] = [];
    const queue = new FakeTranslationTaskEnqueuer(({ translationTaskId }) => {
      attempted.push(translationTaskId);
      if (translationTaskId === "task-first") throw new Error("enqueue outcome unknown");
    });
    const reconciler = new TranslationTaskReconciler(tasks, queue);

    await expect(reconciler.reconcile({ limit: 10, pendingOlderThanMs: 0 })).resolves.toEqual({
      outcome: "partial-failure",
      selected: 3,
      enqueued: 2,
      enqueueFailures: 1,
      pending: 2,
      expiredProcessing: 1,
    });
    expect(attempted).toEqual(["task-first", "task-second", "task-third"]);
    expect(queue.messages).toEqual([
      { translationTaskId: "task-second" },
      { translationTaskId: "task-third" },
    ]);
  });

  it("exposes bounded non-sensitive operational observability", async () => {
    const snapshot: TranslationTaskObservabilitySnapshot = {
      counts: { pending: 2, processing: 3, stale: 4, completed: 5, failed: 6 },
      pending: { oldestAgeMs: 12_000, unattempted: 1, retryReleased: 1 },
      processing: {
        live: 2,
        expired: 1,
        oldestClaimAgeMs: 9_000,
        oldestExpiredLeaseAgeMs: 3_000,
        withAttemptsRemaining: 2,
        atAttemptBudget: 1,
      },
      failed: {
        terminal: 4,
        retryExhausted: 2,
        failureGroupCount: 2,
        groups: [
          { disposition: "terminal", code: "provider-output-invalid", count: 4 },
          { disposition: "retry-exhausted", code: "provider-temporary", count: 2 },
        ],
      },
      allowance: {
        leased: 1,
        admitted: 2,
        deferred: 3,
        expiredLeases: 1,
        readyDeferred: 1,
        oldestDeferredAgeMs: 5_000,
        nextRetryInMs: 10_000,
        reasonGroupCount: 1,
        reasons: [{ reason: "free-allowance-reset", count: 3 }],
      },
    };
    const reconciler = new TranslationTaskReconciler(store([], snapshot), new FakeTranslationTaskEnqueuer());

    await expect(reconciler.observe()).resolves.toEqual(snapshot);
  });

  it.each([
    { limit: 0, pendingOlderThanMs: 0 },
    { limit: 1.5, pendingOlderThanMs: 0 },
    { limit: MAX_TRANSLATION_TASK_RECONCILIATION_BATCH_SIZE + 1, pendingOlderThanMs: 0 },
    { limit: 1, pendingOlderThanMs: -1 },
    { limit: 1, pendingOlderThanMs: 1.5 },
  ])("rejects invalid reconciliation query %j", async (query) => {
    const reconciler = new TranslationTaskReconciler(store([]), new FakeTranslationTaskEnqueuer());
    await expect(reconciler.reconcile(query)).rejects.toBeInstanceOf(TypeError);
  });
});
