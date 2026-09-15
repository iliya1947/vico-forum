import { describe, expect, it, vi } from "vitest";
import type { UiTranslationJobSpecification } from "./ui-translation-service";
import {
  FakeTranslationTaskEnqueuer,
  PersistentTranslationJobDispatcher,
  type TranslationTask,
  type TranslationTaskStore,
} from "./translation-tasks";

function job(taskIdentity = "a".repeat(64), key = "heading"): UiTranslationJobSpecification {
  return {
    taskIdentity,
    translationKind: "ui",
    sourceIdentity: { namespace: "common", key },
    sourceFingerprint: "b".repeat(64),
    targetLocale: "fr-CA",
    generationPolicyVersion: "ui-policy-v1",
  };
}

function task(specification: UiTranslationJobSpecification, id = "task-1"): TranslationTask {
  const createdAt = new Date("2026-09-15T00:00:00.000Z");
  return { id, ...specification, status: "pending", createdAt, updatedAt: createdAt };
}

function storeWith(
  upsertPending: TranslationTaskStore["upsertPending"],
): TranslationTaskStore {
  return {
    upsertPending,
    findById: vi.fn(async () => undefined),
    findByIdentity: vi.fn(async () => undefined),
  };
}

describe("PersistentTranslationJobDispatcher", () => {
  it("persists each task before enqueue and sends only the durable task id", async () => {
    const events: string[] = [];
    const specification = job();
    const store = storeWith(vi.fn(async () => {
      events.push("persisted");
      return task(specification, "durable-task-id");
    }));
    const queue = new FakeTranslationTaskEnqueuer(({ translationTaskId }) => {
      events.push(`enqueued:${translationTaskId}`);
    });

    await new PersistentTranslationJobDispatcher(store, queue).dispatch([specification]);

    expect(events).toEqual(["persisted", "enqueued:durable-task-id"]);
    expect(queue.messages).toEqual([{ translationTaskId: "durable-task-id" }]);
    expect(Object.keys(queue.messages[0]!)).toEqual(["translationTaskId"]);
  });

  it("does not enqueue when durable persistence fails", async () => {
    const failure = new Error("database unavailable");
    const store = storeWith(vi.fn(async () => { throw failure; }));
    const queue = new FakeTranslationTaskEnqueuer();

    await expect(new PersistentTranslationJobDispatcher(store, queue).dispatch([job()]))
      .rejects.toBe(failure);
    expect(queue.messages).toEqual([]);
  });

  it("leaves the persisted task pending when enqueue fails", async () => {
    const specification = job();
    const durableTask = task(specification);
    const store = storeWith(vi.fn(async () => durableTask));
    const queueFailure = new Error("enqueue outcome unknown");
    const queue = new FakeTranslationTaskEnqueuer(() => { throw queueFailure; });

    await expect(new PersistentTranslationJobDispatcher(store, queue).dispatch([specification]))
      .rejects.toBe(queueFailure);

    expect(durableTask.status).toBe("pending");
    expect(store.upsertPending).toHaveBeenCalledOnce();
    expect(queue.messages).toEqual([]);
  });

  it("processes multiple jobs sequentially in input order", async () => {
    const first = job("1".repeat(64), "heading");
    const second = job("2".repeat(64), "stageSummary");
    let activePersists = 0;
    const store = storeWith(vi.fn(async (specification) => {
      activePersists += 1;
      expect(activePersists).toBe(1);
      await Promise.resolve();
      activePersists -= 1;
      return task(specification, `task-${specification.sourceIdentity.key}`);
    }));
    const queue = new FakeTranslationTaskEnqueuer();

    await new PersistentTranslationJobDispatcher(store, queue).dispatch([first, second]);

    expect(queue.messages).toEqual([
      { translationTaskId: "task-heading" },
      { translationTaskId: "task-stageSummary" },
    ]);
  });
});
