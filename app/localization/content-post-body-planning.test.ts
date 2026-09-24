import { describe, expect, it, vi } from "vitest";

import {
  CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH,
  ContentTranslationRequestBudgetStorageUnavailableError,
  type ContentTranslationRequestBudgetAdmission,
} from "./content-request-budget.server";

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
import {
  RoutedContentPostBodyProviderCapability,
} from "./content-translation-provider";
import {
  TranslationProviderRouter,
  type MachineTranslationProviderAdapter,
} from "./translation-provider";
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
      budgetAdmission(),
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

    const result = await planner.planAndDispatch(bodyRevision({ sourceLocale: "und" }), "he", budgetAdmission());

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

    await expect(planner.planAndDispatch(revision, target, budgetAdmission())).resolves.toMatchObject({
      kind: "original",
      taskCreated: false,
      reason,
    });
    expect(tasks.specifications).toHaveLength(0);
    expect(enqueuer.messages).toHaveLength(0);
  });

  it("checks post-body provider/data-policy capability with protected segment metadata only", async () => {
    const supports = vi.fn((capability: Parameters<MachineTranslationProviderAdapter["supports"]>[0]) =>
      capability.domain === "content"
      && capability.contentClassification === "public-forum-post-body"
      && capability.sourceLocale === "ru"
      && capability.targetLocale === "he"
      && capability.operation === "plain"
      && capability.sourceCharacterCount !== null
      && capability.sourceCharacterCount > 0
    );
    const adapter: MachineTranslationProviderAdapter = {
      supports,
      translate: vi.fn(),
    };
    const tasks = new FakePostBodyPlanningStore(bodyRevision({
      originalContent: "First paragraph.\n\nSecond **paragraph**.",
    }));

    const result = await plannerWith({
      tasks,
      providerCapability: new RoutedContentPostBodyProviderCapability(
        new TranslationProviderRouter([adapter]),
      ),
    }).planAndDispatch(bodyRevision(), "he", budgetAdmission());

    expect(result.kind).toBe("queued");
    expect(supports).toHaveBeenCalled();
    for (const [capability] of supports.mock.calls) {
      expect(capability).toMatchObject({
        domain: "content",
        contentClassification: "public-forum-post-body",
        sourceLocale: "ru",
        targetLocale: "he",
        messageKind: "plain",
        operation: "plain",
      });
      expect(capability).not.toHaveProperty("source");
    }
  });

  it("applies provider capability before atomic budget admission", async () => {
    const tasks = new FakePostBodyPlanningStore(bodyRevision());
    const enqueuer = new FakeTranslationTaskEnqueuer();
    const result = await plannerWith({
      tasks,
      enqueuer,
      providerCapability: { supports: () => false },
    }).planAndDispatch(bodyRevision(), "he", budgetAdmission());

    expect(result).toMatchObject({ kind: "original", reason: "target-unsupported" });
    expect(tasks.specifications).toHaveLength(0);
    expect(tasks.admissions).toHaveLength(0);
    expect(enqueuer.messages).toHaveLength(0);
  });

  it("returns typed request-budget denial metadata from atomic planning", async () => {
    const denied = {
      allowed: false as const,
      reason: "limit-exceeded" as const,
      limitingScope: "global" as const,
      remainingUnits: 0,
      resetAt: new Date("2026-09-24T00:01:00Z"),
      retryAfterSeconds: 45,
    };
    const tasks = new FakePostBodyPlanningStore(bodyRevision(), {
      outcome: "request-budget-denied",
      decision: denied,
    });
    const enqueuer = new FakeTranslationTaskEnqueuer();

    const result = await plannerWith({ tasks, enqueuer })
      .planAndDispatch(bodyRevision(), "he", budgetAdmission());

    expect(result).toEqual({
      kind: "original",
      taskCreated: false,
      targetLocale: "he",
      reason: "request-budget-denied",
      requestBudgetDecision: denied,
    });
    expect(tasks.admissions).toEqual([budgetAdmission()]);
    expect(enqueuer.messages).toHaveLength(0);
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
      .planAndDispatch(revision, "he", budgetAdmission());

    expect(result).toMatchObject({ kind: "original", reason: "translation-current" });
    expect(tasks.specifications).toHaveLength(0);
  });

  it("preserves classified body budget storage unavailability and unexpected planning errors", async () => {
    const revision = bodyRevision();
    const unavailable = new ContentTranslationRequestBudgetStorageUnavailableError();
    await expect(
      plannerWith({
        tasks: new FakePostBodyPlanningStore(revision, unavailable),
      }).planAndDispatch(revision, "he", budgetAdmission()),
    ).rejects.toBe(unavailable);

    const unexpected = new Error("programming failure");
    await expect(
      plannerWith({
        tasks: new FakePostBodyPlanningStore(revision, unexpected),
      }).planAndDispatch(revision, "he", budgetAdmission()),
    ).rejects.toBe(unexpected);
  });

  it("rejects a stale caller revision before protection or durable creation", async () => {
    const tasks = new FakePostBodyPlanningStore(bodyRevision({ revisionId: "post-a-r2" }));

    await expect(
      plannerWith({ tasks }).planAndDispatch(bodyRevision(), "he", budgetAdmission()),
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
      plannerWith({ tasks, enqueuer }).planAndDispatch(bodyRevision(), "he", budgetAdmission()),
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

function budgetAdmission(): ContentTranslationRequestBudgetAdmission {
  return {
    subjectKey: "B".repeat(CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH),
    cost: 2,
    windowSeconds: 60,
    global: { name: "test-body-global", version: "v1", limit: 100 },
    requester: { name: "test-body-requester", version: "v1", limit: 20 },
  };
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
  readonly admissions: ContentTranslationRequestBudgetAdmission[] = [];
  private task?: ContentPostBodyTranslationTask;

  constructor(
    private readonly current: ContentTranslationRevision,
    private readonly forcedResult?: ContentPostBodyTaskUpsertResult | Error,
  ) {}

  async readCurrentRevision(): Promise<ContentTranslationRevision> {
    return this.current;
  }

  async upsertPending(
    specification: ContentPostBodyTranslationTaskSpecification,
    _expectedRevision: ContentTranslationRevision,
    requestBudgetAdmission: ContentTranslationRequestBudgetAdmission,
  ): Promise<ContentPostBodyTaskUpsertResult> {
    this.specifications.push(specification);
    this.admissions.push(requestBudgetAdmission);
    if (this.forcedResult instanceof Error) throw this.forcedResult;
    if (this.forcedResult) return this.forcedResult;
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
