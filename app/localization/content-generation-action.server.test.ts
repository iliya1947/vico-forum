import { describe, expect, it, vi } from "vitest";

import {
  ContentGenerationPlanningUnavailableError,
  DefaultContentGenerationActionCapability,
  MAX_AUTOMATIC_POST_TRANSLATION_SEMANTIC_CHARACTERS,
} from "./content-generation-action.server";
import {
  ContentTranslationRequestBudgetStorageUnavailableError,
} from "./content-request-budget.server";

const subjectKey = "S".repeat(43);
const policy = {
  cost: 2,
  windowSeconds: 60,
  global: { name: "generation-global", version: "test-v1", limit: 100 },
  requester: { name: "generation-requester", version: "test-v1", limit: 10 },
} as const;

function titleRevision() {
  return {
    contentType: "topic-title" as const,
    contentId: "topic-1",
    revisionId: "title-r1",
    originalContent: "Исходный заголовок",
    sourceLocale: "ru",
  };
}

function postRevision(content: string) {
  return {
    contentType: "post-body" as const,
    contentId: "post-1",
    revisionId: "post-r1",
    originalContent: content,
    sourceLocale: "ru",
  };
}

function harness(options: {
  titleResult?: unknown;
  bodyResult?: unknown;
  titleError?: unknown;
  bodyError?: unknown;
} = {}) {
  const pseudonymize = vi.fn(async () => ({
    actorKind: "authenticated" as const,
    keyVersion: "test-v1",
    subjectKey,
  }));
  const titlePlanner = {
    planAndDispatch: vi.fn(async () => {
      if (options.titleError) throw options.titleError;
      return options.titleResult ?? {
        kind: "queued",
        taskCreated: true,
        task: {},
      };
    }),
  };
  const postBodyPlanner = {
    planAndDispatch: vi.fn(async () => {
      if (options.bodyError) throw options.bodyError;
      return options.bodyResult ?? {
        kind: "queued",
        taskCreated: true,
        task: {},
      };
    }),
  };
  return {
    pseudonymize,
    titlePlanner,
    postBodyPlanner,
    capability: new DefaultContentGenerationActionCapability({
      pseudonymizer: { pseudonymize },
      titlePolicy: policy,
      postBodyPolicy: { ...policy, global: { ...policy.global, name: "body-global" } },
      titlePlanner: titlePlanner as never,
      postBodyPlanner: postBodyPlanner as never,
    }),
  };
}

describe("content generation action capability", () => {
  it("pseudonymizes the authenticated actor and passes only server-owned budget admission to title planning", async () => {
    const { capability, pseudonymize, titlePlanner } = harness();

    await expect(capability.generateTopicTitle({
      actorId: "user-123",
      revision: titleRevision(),
      targetLocale: "he",
    })).resolves.toEqual({ outcome: "queued" });

    expect(pseudonymize).toHaveBeenCalledWith({
      kind: "authenticated",
      identity: "user-123",
    });
    expect(titlePlanner.planAndDispatch).toHaveBeenCalledWith(
      titleRevision(),
      "he",
      {
        subjectKey,
        cost: 2,
        windowSeconds: 60,
        global: { name: "generation-global", version: "test-v1", limit: 100 },
        requester: { name: "generation-requester", version: "test-v1", limit: 10 },
      },
    );
    expect(JSON.stringify(titlePlanner.planAndDispatch.mock.calls)).not.toContain("user-123");
  });

  it("enforces the automatic body threshold before pseudonymization or planner admission", async () => {
    const atLimit = harness();
    const exact = "а".repeat(MAX_AUTOMATIC_POST_TRANSLATION_SEMANTIC_CHARACTERS);
    await expect(atLimit.capability.generateAutomaticPostBody({
      actorId: "user-123",
      revision: postRevision(exact),
      targetLocale: "he",
    })).resolves.toEqual({ outcome: "queued" });
    expect(atLimit.pseudonymize).toHaveBeenCalledTimes(1);
    expect(atLimit.postBodyPlanner.planAndDispatch).toHaveBeenCalledTimes(1);

    const overLimit = harness();
    const tooLong = "а".repeat(MAX_AUTOMATIC_POST_TRANSLATION_SEMANTIC_CHARACTERS + 1);
    await expect(overLimit.capability.generateAutomaticPostBody({
      actorId: "user-123",
      revision: postRevision(tooLong),
      targetLocale: "he",
    })).resolves.toEqual({ outcome: "explicit-required" });
    expect(overLimit.pseudonymize).not.toHaveBeenCalled();
    expect(overLimit.postBodyPlanner.planAndDispatch).not.toHaveBeenCalled();
  });

  it("explicit post generation bypasses only the automatic semantic-length threshold", async () => {
    const overLimit = harness();
    const tooLong = "а".repeat(MAX_AUTOMATIC_POST_TRANSLATION_SEMANTIC_CHARACTERS + 1);

    await expect(overLimit.capability.generateAutomaticPostBody({
      actorId: "user-123",
      revision: postRevision(tooLong),
      targetLocale: "he",
    })).resolves.toEqual({ outcome: "explicit-required" });
    expect(overLimit.pseudonymize).not.toHaveBeenCalled();
    expect(overLimit.postBodyPlanner.planAndDispatch).not.toHaveBeenCalled();

    await expect(overLimit.capability.generateExplicitPostBody({
      actorId: "user-123",
      revision: postRevision(tooLong),
      targetLocale: "he",
    })).resolves.toEqual({ outcome: "queued" });
    expect(overLimit.pseudonymize).toHaveBeenCalledWith({
      kind: "authenticated",
      identity: "user-123",
    });
    expect(overLimit.postBodyPlanner.planAndDispatch).toHaveBeenCalledTimes(1);
  });

  it("maps planner budget denial without exposing counter metadata", async () => {
    const { capability } = harness({
      titleResult: {
        kind: "original",
        taskCreated: false,
        targetLocale: "he",
        reason: "request-budget-denied",
        requestBudgetDecision: {
          allowed: false,
          reason: "limit-exceeded",
          limitingScope: "requester",
          remainingUnits: 0,
          resetAt: new Date("2026-09-25T14:00:00.000Z"),
          retryAfterSeconds: 17,
        },
      },
    });

    await expect(capability.generateTopicTitle({
      actorId: "user-123",
      revision: titleRevision(),
      targetLocale: "he",
    })).resolves.toEqual({
      outcome: "budget-denied",
      retryAfterSeconds: 17,
    });
  });

  it("maps normal no-job outcomes to bounded original-safe results", async () => {
    const { capability } = harness({
      bodyResult: {
        kind: "original",
        taskCreated: false,
        targetLocale: "he",
        reason: "translation-current",
      },
    });

    await expect(capability.generateAutomaticPostBody({
      actorId: "user-123",
      revision: postRevision("Короткий текст"),
      targetLocale: "he",
    })).resolves.toEqual({
      outcome: "no-op",
      reason: "translation-current",
    });
  });

  it("classifies only known planning availability failures and propagates unexpected errors", async () => {
    const unavailable = harness({
      titleError: new ContentTranslationRequestBudgetStorageUnavailableError(),
    });
    await expect(unavailable.capability.generateTopicTitle({
      actorId: "user-123",
      revision: titleRevision(),
      targetLocale: "he",
    })).rejects.toBeInstanceOf(ContentGenerationPlanningUnavailableError);

    const unexpected = new Error("unexpected planner bug");
    const broken = harness({ titleError: unexpected });
    await expect(broken.capability.generateTopicTitle({
      actorId: "user-123",
      revision: titleRevision(),
      targetLocale: "he",
    })).rejects.toBe(unexpected);
  });
});
