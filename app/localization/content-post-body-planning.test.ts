import { describe, expect, it, vi } from "vitest";

import {
  ContentPostBodyTranslationPlanner,
  contentPostBodyTaskSpecification,
  type ContentPostBodyPlanningStore,
  type ContentPostBodyTaskUpsertResult,
} from "./content-post-body-planning";
import {
  CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
  protectMarkdownForTranslation,
} from "./content-markdown-translation";
import {
  ContentSourceLocaleResolver,
  ThresholdContentSourceLocalePolicy,
  type ContentSourceLocaleDetectionAdapter,
} from "./content-source-locale";
import {
  ContentTranslationService,
  type ContentTranslationRevision,
  type ContentTranslationStore,
  type StoredContentTranslation,
} from "./content-translation";
import { localeRegistry } from "./registry";
import {
  FakeTranslationTaskEnqueuer,
  type ContentPostBodyTranslationTask,
  type ContentPostBodyTranslationTaskSpecification,
} from "./translation-tasks";

describe("ContentPostBodyTranslationPlanner", () => {
  it("uses authoritative protected Markdown and enqueues only the committed task id", async () => {
    const authoritative = bodyRevision({
      originalContent: "Translate **this** with fetchData() intact.",
      sourceLocale: "ru",
    });
    const tasks = new FakePostBodyPlanningStore(authoritative);
    const enqueuer = new FakeTranslationTaskEnqueuer();
    const providerCapability = {
      supports: vi.fn(() => true),
    };
    const planner = plannerWith({ tasks, enqueuer, providerCapability });

    const result = await planner.planAndDispatch(
      bodyRevision({
        originalContent: "caller body must be ignored",
        sourceLocale: "en",
      }),
      "he",
    );

    expect(result).toMatchObject({
      kind: "queued",
      taskCreated: true,
      task: {
        translationKind: "content-post-body",
        sourceIdentity: { postId: "post-a", revisionId: "post-a-r1" },
        revisionSourceLocale: "ru",
        resolvedSourceLocale: "ru",
        targetLocale: "he",
        protectedContentPolicyVersion: CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
      },
    });
    expect(tasks.specifications).toHaveLength(1);
    expect(tasks.specifications[0]).not.toHaveProperty("originalContent");
    expect(tasks.specifications[0]).not.toHaveProperty("protectedMarkdown");
    expect(providerCapability.supports).toHaveBeenCalledWith(expect.objectContaining({
      sourceLocale: "ru",
      targetLocale: "he",
      segmentCharacterCounts: expect.any(Array),
    }));
    expect(enqueuer.messages).toEqual([
      { translationTaskId: (result as { task: { id: string } }).task.id },
    ]);
  });

  it("accepts a detected source for und without persisting detector evidence", async () => {
    const tasks = new FakePostBodyPlanningStore(bodyRevision({ sourceLocale: "und" }));
    const planner = plannerWith({
      tasks,
      sourceLocaleResolver: resolver(async () => ({
        locale: "ru",
        confidence: 0.95,
        evidence: { origin: "detector", detector: "fake-detector", model: "fake-model" },
      })),
    });

    const result = await planner.planAndDispatch(bodyRevision({ sourceLocale: "und" }), "he");

    expect(result).toMatchObject({
      kind: "queued",
      task: {
        revisionSourceLocale: "und",
        resolvedSourceLocale: "ru",
        sourceResolutionOrigin: "detector",
      },
    });
    expect(tasks.specifications[0]).not.toHaveProperty("evidence");
  });

  it.each([
    ["unresolved source", bodyRevision({ sourceLocale: "und" }), "he", "source-unresolved"],
    ["same locale", bodyRevision({ sourceLocale: "ru" }), "ru", "same-locale"],
    ["inactive target", bodyRevision({ sourceLocale: "ru" }), "ka", "target-ineligible"],
    ["noncanonical target", bodyRevision({ sourceLocale: "ru" }), "HE", "target-ineligible"],
    ["no semantic text", bodyRevision({ originalContent: "`fetchData()`" }), "he", "no-translatable-content"],
  ])("creates no durable work for %s", async (_label, revision, target, reason) => {
    const tasks = new FakePostBodyPlanningStore(revision);
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

  it("blocks unsupported provider capability and denied request budget before durable creation", async () => {
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
      const tasks = new FakePostBodyPlanningStore(bodyRevision());
      const enqueuer = new FakeTranslationTaskEnqueuer();
      const result = await plannerWith({
        tasks,
        enqueuer,
        providerCapability: configuration.providerCapability,
        requestBudgetPolicy: configuration.requestBudgetPolicy,
      }).planAndDispatch(bodyRevision(), "he");

      expect(result).toMatchObject({ kind: "original", reason: configuration.reason });
      expect(tasks.specifications).toHaveLength(0);
      expect(enqueuer.messages).toHaveLength(0);
    }
  });

  it("does not create work for an existing exact-revision translation", async () => {
    const revision = bodyRevision();
    const tasks = new FakePostBodyPlanningStore(revision);
    const translations = new MemoryContentTranslationStore([{
      contentType: "post-body",
      contentId: revision.contentId,
      revisionId: revision.revisionId,
      sourceLocale: revision.sourceLocale,
      targetLocale: "he",
      translatedContent: "תרגום",
      provenance: { origin: "persistent_manual" },
    }]);

    const result = await plannerWith({ tasks, translations })
      .planAndDispatch(revision, "he");

    expect(result).toMatchObject({ kind: "original", reason: "translation-current" });
    expect(tasks.specifications).toHaveLength(0);
  });

  it("rejects a stale caller revision before protection or durable creation", async () => {
    const tasks = new FakePostBodyPlanningStore(bodyRevision({ revisionId: "post-a-r2" }));

    await expect(
      plannerWith({ tasks }).planAndDispatch(bodyRevision(), "he"),
    ).resolves.toMatchObject({
      kind: "original",
      reason: "revision-not-current",
    });
    expect(tasks.specifications).toHaveLength(0);
  });

  it("surfaces enqueue failure after durable commit", async () => {
    const tasks = new FakePostBodyPlanningStore(bodyRevision());
    const failure = new Error("transport unavailable");
    const enqueuer = new FakeTranslationTaskEnqueuer(() => {
      throw failure;
    });

    await expect(
      plannerWith({ tasks, enqueuer }).planAndDispatch(bodyRevision(), "he"),
    ).rejects.toBe(failure);
    expect(tasks.specifications).toHaveLength(1);
  });

  it("binds fingerprint and task identity to protected content and protection policy version", async () => {
    const revision = bodyRevision({ originalContent: "Human text with fetchData()." });
    const resolution = {
      kind: "revision" as const,
      mayProceed: true as const,
      sourceLocale: "ru",
      resolutionOrigin: "revision-metadata" as const,
    };
    const protectedDocument = protectMarkdownForTranslation(revision.originalContent);

    const first = await contentPostBodyTaskSpecification(
      revision,
      resolution,
      "ru",
      "he",
      CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
      "content-v1",
      protectedDocument,
    );
    const duplicate = await contentPostBodyTaskSpecification(
      revision,
      resolution,
      "ru",
      "he",
      CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
      "content-v1",
      protectedDocument,
    );
    const policyChanged = await contentPostBodyTaskSpecification(
      revision,
      resolution,
      "ru",
      "he",
      "cnt04-commonmark-v2",
      "content-v1",
      protectedDocument,
    );

    expect(duplicate).toEqual(first);
    expect(policyChanged.sourceFingerprint).not.toBe(first.sourceFingerprint);
    expect(policyChanged.taskIdentity).not.toBe(first.taskIdentity);
  });
});

function plannerWith(overrides: {
  tasks?: ContentPostBodyPlanningStore;
  enqueuer?: FakeTranslationTaskEnqueuer;
  sourceLocaleResolver?: ContentSourceLocaleResolver;
  translations?: ContentTranslationStore;
  providerCapability?: { supports(input: {
    sourceLocale: string;
    targetLocale: string;
    segmentCharacterCounts: readonly number[];
  }): boolean };
  requestBudgetPolicy?: { allows(): boolean | Promise<boolean> };
} = {}) {
  const revision = bodyRevision();
  return new ContentPostBodyTranslationPlanner({
    localeRegistry,
    sourceLocaleResolver: overrides.sourceLocaleResolver ?? resolver(async () => {
      throw new Error("known revision source locale must bypass detection");
    }),
    contentTranslations: new ContentTranslationService(
      overrides.translations ?? new MemoryContentTranslationStore(),
    ),
    providerCapability: overrides.providerCapability ?? { supports: () => true },
    requestBudgetPolicy: overrides.requestBudgetPolicy ?? { allows: () => true },
    tasks: overrides.tasks ?? new FakePostBodyPlanningStore(revision),
    enqueuer: overrides.enqueuer ?? new FakeTranslationTaskEnqueuer(),
    generationPolicyVersion: "content-v1",
  });
}

function resolver(
  detect: ContentSourceLocaleDetectionAdapter["detect"],
): ContentSourceLocaleResolver {
  return new ContentSourceLocaleResolver(
    { detect },
    new ThresholdContentSourceLocalePolicy(0.8, () => true),
  );
}

function bodyRevision(
  overrides: Partial<ContentTranslationRevision> = {},
): ContentTranslationRevision {
  return {
    contentType: "post-body",
    contentId: "post-a",
    revisionId: "post-a-r1",
    originalContent: "Исходный **текст** с fetchData().",
    sourceLocale: "ru",
    ...overrides,
  };
}

class FakePostBodyPlanningStore implements ContentPostBodyPlanningStore {
  readonly specifications: ContentPostBodyTranslationTaskSpecification[] = [];
  private task?: ContentPostBodyTranslationTask;

  constructor(private readonly current: ContentTranslationRevision) {}

  async readCurrentRevision(): Promise<ContentTranslationRevision> {
    return this.current;
  }

  async upsertPending(
    specification: ContentPostBodyTranslationTaskSpecification,
  ): Promise<ContentPostBodyTaskUpsertResult> {
    this.specifications.push(specification);
    if (!this.task) {
      const now = new Date("2026-09-24T00:00:00Z");
      this.task = {
        ...specification,
        id: "11111111-1111-4111-8111-111111111111",
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
        createdAt: now,
        updatedAt: now,
      };
      return { outcome: "task", created: true, task: this.task };
    }
    return { outcome: "task", created: false, task: this.task };
  }
}

class MemoryContentTranslationStore implements ContentTranslationStore {
  constructor(private readonly rows: StoredContentTranslation[] = []) {}

  async read(identity: {
    contentType: "topic-title" | "post-body";
    contentId: string;
    revisionId: string;
    targetLocale: string;
  }): Promise<StoredContentTranslation | undefined> {
    return this.rows.find((row) =>
      row.contentType === identity.contentType
      && row.contentId === identity.contentId
      && row.revisionId === identity.revisionId
      && row.targetLocale === identity.targetLocale
    );
  }

  async write(translation: StoredContentTranslation): Promise<StoredContentTranslation> {
    return translation;
  }
}
