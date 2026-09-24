import { describe, expect, it, vi } from "vitest";

import {
  ContentSourceLocaleResolver,
  ThresholdContentSourceLocalePolicy,
} from "./content-source-locale";
import {
  ContentTranslationService,
  type ContentTranslationRevision,
  type ContentTranslationStore,
  type StoredContentTranslation,
} from "./content-translation";
import {
  ContentTopicTitleTranslationPlanner,
  type ContentTopicTitlePlanningStore,
  type ContentTopicTitleTaskUpsertResult,
} from "./content-translation-planning";
import { RoutedContentTopicTitleProviderCapability } from "./content-translation-provider";
import {
  TranslationProviderRouter,
  type MachineTranslationProviderAdapter,
} from "./translation-provider";
import { localeRegistry } from "./registry";
import {
  FakeTranslationTaskEnqueuer,
  type ContentTopicTitleTranslationTask,
  type ContentTopicTitleTranslationTaskSpecification,
} from "./translation-tasks";

describe("ContentTopicTitleTranslationPlanner", () => {
  it("uses authoritative known source metadata and dispatches only the committed task id", async () => {
    const detector = vi.fn(async () => {
      throw new Error("detector must not run for a known revision locale");
    });
    const tasks = new FakePlanningStore(titleRevision({ sourceLocale: "ru" }));
    const enqueuer = new FakeTranslationTaskEnqueuer();
    const planner = plannerWith({
      tasks,
      enqueuer,
      sourceLocaleResolver: resolver(detector),
    });

    const result = await planner.planAndDispatch(
      titleRevision({
        sourceLocale: "en",
        originalContent: "caller text is not authoritative",
      }),
      "en",
    );

    expect(result).toMatchObject({
      kind: "queued",
      taskCreated: true,
      task: {
        translationKind: "content-topic-title",
        revisionSourceLocale: "ru",
        resolvedSourceLocale: "ru",
        targetLocale: "en",
      },
    });
    expect(detector).not.toHaveBeenCalled();
    expect(tasks.specifications).toHaveLength(1);
    expect(tasks.specifications[0]).not.toHaveProperty("originalContent");
    expect(enqueuer.messages).toEqual([
      { translationTaskId: (result as { task: { id: string } }).task.id },
    ]);
  });

  it("accepts detected source for und without persisting detector payload", async () => {
    const tasks = new FakePlanningStore(titleRevision({ sourceLocale: "und" }));
    const planner = plannerWith({
      tasks,
      sourceLocaleResolver: resolver(async () => ({
        locale: "ru",
        confidence: 0.96,
        evidence: { origin: "detector", detector: "fake-detector", model: "fake-model" },
      })),
    });

    const result = await planner.planAndDispatch(titleRevision({ sourceLocale: "und" }), "he");

    expect(result).toMatchObject({
      kind: "queued",
      task: {
        revisionSourceLocale: "und",
        resolvedSourceLocale: "ru",
        sourceResolutionOrigin: "detector",
        targetLocale: "he",
      },
    });
    expect(tasks.specifications[0]).not.toHaveProperty("evidence");
  });

  it.each([
    ["unresolved source", titleRevision({ sourceLocale: "und" }), "he", "source-unresolved"],
    ["same locale", titleRevision({ sourceLocale: "ru" }), "ru", "same-locale"],
    ["inactive target", titleRevision({ sourceLocale: "ru" }), "ka", "target-ineligible"],
    ["noncanonical target", titleRevision({ sourceLocale: "ru" }), "HE", "target-ineligible"],
  ])("creates and enqueues nothing for %s", async (_label, revision, target, reason) => {
    const tasks = new FakePlanningStore(revision);
    const enqueuer = new FakeTranslationTaskEnqueuer();
    const planner = plannerWith({
      tasks,
      enqueuer,
      sourceLocaleResolver: revision.sourceLocale === "und"
        ? resolver(async () => undefined)
        : resolver(async () => {
          throw new Error("detector must not run");
        }),
    });

    await expect(planner.planAndDispatch(revision, target)).resolves.toMatchObject({
      kind: "original",
      taskCreated: false,
      reason,
    });
    expect(tasks.specifications).toHaveLength(0);
    expect(enqueuer.messages).toHaveLength(0);
  });

  it("uses authoritative public-topic-title metadata without exposing source text during planning", async () => {
    const adapter: MachineTranslationProviderAdapter = {
      supports: vi.fn((capability) =>
        capability.domain === "content"
        && capability.contentClassification === "public-forum-topic-title"
        && capability.sourceCharacterCount === "Исходный заголовок".length
        && capability.sourceLocale === "ru"
        && capability.targetLocale === "he"
        && capability.operation === "plain"
      ),
      translate: vi.fn(),
    };
    const providerCapability = new RoutedContentTopicTitleProviderCapability(
      new TranslationProviderRouter([adapter]),
    );
    const result = await plannerWith({ providerCapability }).planAndDispatch(
      titleRevision({ originalContent: "caller text must not drive provider capability" }),
      "he",
    );

    expect(result.kind).toBe("queued");
    expect(adapter.supports).toHaveBeenCalledWith({
      domain: "content",
      contentClassification: "public-forum-topic-title",
      sourceLocale: "ru",
      targetLocale: "he",
      messageKind: "plain",
      operation: "plain",
      sourceCharacterCount: "Исходный заголовок".length,
    });
    const capability = vi.mocked(adapter.supports).mock.calls[0]?.[0] as unknown as
      Record<string, unknown>;
    expect(capability).not.toHaveProperty("source");
  });

  it("does not create work when a current exact-revision translation already exists", async () => {
    const revision = titleRevision({ sourceLocale: "ru" });
    const translations = new MemoryContentTranslationStore([{
      contentType: "topic-title",
      contentId: revision.contentId,
      revisionId: revision.revisionId,
      sourceLocale: "ru",
      targetLocale: "he",
      translatedContent: "כותרת",
      provenance: { origin: "persistent_manual" },
    }]);
    const tasks = new FakePlanningStore(revision);
    const enqueuer = new FakeTranslationTaskEnqueuer();

    const result = await plannerWith({ tasks, enqueuer, translations })
      .planAndDispatch(revision, "he");

    expect(result).toMatchObject({ kind: "original", reason: "translation-current" });
    expect(tasks.specifications).toHaveLength(0);
    expect(enqueuer.messages).toHaveLength(0);
  });

  it("applies provider-neutral target and request-budget policies before durable creation", async () => {
    const revision = titleRevision({ sourceLocale: "ru" });

    for (const configuration of [
      {
        providerCapability: { supports: () => false },
        requestBudgetPolicy: { allows: () => true },
        reason: "target-unsupported",
      },
      {
        providerCapability: { supports: () => true },
        requestBudgetPolicy: { allows: () => false },
        reason: "request-budget-denied",
      },
    ] as const) {
      const tasks = new FakePlanningStore(revision);
      const enqueuer = new FakeTranslationTaskEnqueuer();
      const result = await plannerWith({
        tasks,
        enqueuer,
        providerCapability: configuration.providerCapability,
        requestBudgetPolicy: configuration.requestBudgetPolicy,
      }).planAndDispatch(revision, "he");

      expect(result).toMatchObject({ kind: "original", reason: configuration.reason });
      expect(tasks.specifications).toHaveLength(0);
      expect(enqueuer.messages).toHaveLength(0);
    }
  });

  it("does not let a stale caller revision create work for the current title", async () => {
    const tasks = new FakePlanningStore(titleRevision({ revisionId: "title-r2" }));
    const enqueuer = new FakeTranslationTaskEnqueuer();

    await expect(
      plannerWith({ tasks, enqueuer }).planAndDispatch(titleRevision(), "he"),
    ).resolves.toMatchObject({
      kind: "original",
      reason: "revision-not-current",
    });
    expect(tasks.specifications).toHaveLength(0);
    expect(enqueuer.messages).toHaveLength(0);
  });

  it("surfaces enqueue failure after the durable task has been committed", async () => {
    const tasks = new FakePlanningStore(titleRevision({ sourceLocale: "ru" }));
    const failure = new Error("transport unavailable");
    const enqueuer = new FakeTranslationTaskEnqueuer(() => {
      throw failure;
    });

    await expect(
      plannerWith({ tasks, enqueuer }).planAndDispatch(
        titleRevision({ sourceLocale: "ru" }),
        "he",
      ),
    ).rejects.toBe(failure);
    expect(tasks.specifications).toHaveLength(1);
    expect(tasks.lastTask).toBeDefined();
  });
});

function plannerWith(overrides: {
  tasks?: ContentTopicTitlePlanningStore;
  enqueuer?: FakeTranslationTaskEnqueuer;
  sourceLocaleResolver?: ContentSourceLocaleResolver;
  translations?: ContentTranslationStore;
  providerCapability?: {
    supports(input: { sourceLocale: string; targetLocale: string; sourceCharacterCount: number }): boolean;
  };
  requestBudgetPolicy?: { allows(input: unknown): boolean };
} = {}) {
  return new ContentTopicTitleTranslationPlanner({
    localeRegistry,
    sourceLocaleResolver: overrides.sourceLocaleResolver ?? resolver(async () => {
      throw new Error("detector must not run for known source locale");
    }),
    contentTranslations: new ContentTranslationService(
      overrides.translations ?? new MemoryContentTranslationStore(),
    ),
    providerCapability: overrides.providerCapability ?? { supports: () => true },
    requestBudgetPolicy: overrides.requestBudgetPolicy ?? { allows: () => true },
    tasks: overrides.tasks ?? new FakePlanningStore(titleRevision()),
    enqueuer: overrides.enqueuer ?? new FakeTranslationTaskEnqueuer(),
    generationPolicyVersion: "content-v1",
  });
}

function resolver(
  detect: (input: unknown) => Promise<unknown>,
): ContentSourceLocaleResolver {
  return new ContentSourceLocaleResolver(
    { detect },
    new ThresholdContentSourceLocalePolicy(0.8, () => true),
  );
}

class FakePlanningStore implements ContentTopicTitlePlanningStore {
  readonly specifications: ContentTopicTitleTranslationTaskSpecification[] = [];
  lastTask: ContentTopicTitleTranslationTask | undefined;

  constructor(private readonly current: ContentTranslationRevision | undefined) {}

  async readCurrentRevision(): Promise<ContentTranslationRevision | undefined> {
    return this.current;
  }

  async upsertPending(
    specification: ContentTopicTitleTranslationTaskSpecification,
    expectedRevision: ContentTranslationRevision,
  ): Promise<ContentTopicTitleTaskUpsertResult> {
    if (this.current?.revisionId !== expectedRevision.revisionId) {
      return { outcome: "revision-changed" };
    }
    this.specifications.push(specification);
    const task: ContentTopicTitleTranslationTask = {
      ...specification,
      id: "5c86685e-8369-4ccc-8a39-0fb85a0a2a6f",
      generation: 1,
      status: "pending",
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
      createdAt: new Date("2026-09-24T00:00:00Z"),
      updatedAt: new Date("2026-09-24T00:00:00Z"),
    };
    this.lastTask = task;
    return { outcome: "task", created: true, task };
  }
}

class MemoryContentTranslationStore implements ContentTranslationStore {
  constructor(private readonly values: StoredContentTranslation[] = []) {}

  async read(identity: {
    contentType: "topic-title" | "post-body";
    contentId: string;
    revisionId: string;
    targetLocale: string;
  }): Promise<StoredContentTranslation | undefined> {
    return this.values.find((value) =>
      value.contentType === identity.contentType
      && value.contentId === identity.contentId
      && value.revisionId === identity.revisionId
      && value.targetLocale === identity.targetLocale
    );
  }

  async write(translation: StoredContentTranslation): Promise<StoredContentTranslation> {
    this.values.push(translation);
    return translation;
  }
}

function titleRevision(
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
