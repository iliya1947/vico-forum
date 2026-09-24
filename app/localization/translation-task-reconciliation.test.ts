import { describe, expect, it, vi } from "vitest";
import {
  TranslationTaskReconciler,
  type TranslationTaskObservabilitySnapshot,
  type TranslationTaskReconciliationStore,
} from "./translation-task-reconciliation";
import { FakeTranslationTaskEnqueuer } from "./translation-tasks";

function store(
  candidates: Awaited<ReturnType<TranslationTaskReconciliationStore["listReconciliationCandidates"]>>,
  snapshot: TranslationTaskObservabilitySnapshot = {
    counts: { pending: 0, processing: 0, stale: 0, completed: 0, failed: 0 },
    expiredProcessing: 0,
  },
): TranslationTaskReconciliationStore {
  return {
    listReconciliationCandidates: vi.fn(async () => candidates),
    observeTranslationTasks: vi.fn(async () => snapshot),
  };
}

describe("TranslationTaskReconciler", () => {
  it("re-enqueues durable pending and expired-processing candidates by id only", async () => {
    const tasks = store([
      { id: "task-pending", reason: "pending" },
      { id: "task-expired", reason: "expired-processing" },
    ]);
    const queue = new FakeTranslationTaskEnqueuer();
    const reconciler = new TranslationTaskReconciler(tasks, queue);

    await expect(reconciler.reconcile({ limit: 20, pendingOlderThanMs: 60_000 })).resolves.toEqual({
      selected: 2,
      enqueued: 2,
      pending: 1,
      expiredProcessing: 1,
    });

    expect(tasks.listReconciliationCandidates).toHaveBeenCalledWith({
      limit: 20,
      pendingOlderThanMs: 60_000,
    });
    expect(queue.messages).toEqual([
      { translationTaskId: "task-pending" },
      { translationTaskId: "task-expired" },
    ]);
  });

  it("keeps transport failure visible so a later reconciliation can retry the durable task", async () => {
    const failure = new Error("enqueue outcome unknown");
    const tasks = store([{ id: "task-pending", reason: "pending" }]);
    const queue = new FakeTranslationTaskEnqueuer(() => { throw failure; });
    const reconciler = new TranslationTaskReconciler(tasks, queue);

    await expect(reconciler.reconcile({ limit: 10, pendingOlderThanMs: 0 })).rejects.toBe(failure);
    expect(queue.messages).toEqual([]);
  });

  it("exposes the persistent lifecycle snapshot without queue-specific interpretation", async () => {
    const snapshot: TranslationTaskObservabilitySnapshot = {
      counts: { pending: 2, processing: 3, stale: 4, completed: 5, failed: 6 },
      expiredProcessing: 1,
    };
    const reconciler = new TranslationTaskReconciler(store([], snapshot), new FakeTranslationTaskEnqueuer());

    await expect(reconciler.observe()).resolves.toEqual(snapshot);
  });

  it.each([
    { limit: 0, pendingOlderThanMs: 0 },
    { limit: 1.5, pendingOlderThanMs: 0 },
    { limit: 1, pendingOlderThanMs: -1 },
    { limit: 1, pendingOlderThanMs: 1.5 },
  ])("rejects invalid reconciliation query %j", async (query) => {
    const reconciler = new TranslationTaskReconciler(store([]), new FakeTranslationTaskEnqueuer());
    await expect(reconciler.reconcile(query)).rejects.toBeInstanceOf(TypeError);
  });
});
