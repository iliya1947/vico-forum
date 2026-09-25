import { isPostgresQueryTimeout } from "../../db/postgres-deadlines";
import {
  ContentTranslationRequestBudgetStorageUnavailableError,
  validateContentTranslationRequestBudgetAdmission,
  type ContentTranslationRequestBudgetAdmission,
  type ContentTranslationRequestBudgetScopePolicy,
  type ContentTranslationRequesterPseudonymizer,
} from "./content-request-budget.server";
import { protectMarkdownForTranslation } from "./content-markdown-translation";
import type {
  ContentPostBodyNoJobReason,
  ContentPostBodyPlanningResult,
  ContentPostBodyTranslationPlanner,
} from "./content-post-body-planning";
import type {
  ContentTopicTitleNoJobReason,
  ContentTopicTitlePlanningResult,
  ContentTopicTitleTranslationPlanner,
} from "./content-translation-planning";
import type { ContentTranslationRevision } from "./content-translation";
import { isPostgresAvailabilityFailure } from "./persistent-registry";

export const MAX_AUTOMATIC_POST_TRANSLATION_SEMANTIC_CHARACTERS = 3_000;

export interface ContentGenerationRequestBudgetPolicy {
  readonly cost: number;
  readonly windowSeconds: number;
  readonly global: ContentTranslationRequestBudgetScopePolicy;
  readonly requester: ContentTranslationRequestBudgetScopePolicy;
}

export type ContentGenerationNoOpReason =
  | ContentTopicTitleNoJobReason
  | ContentPostBodyNoJobReason;

export type ContentGenerationActionResult =
  | { readonly outcome: "queued" }
  | { readonly outcome: "no-op"; readonly reason: Exclude<ContentGenerationNoOpReason, "request-budget-denied"> }
  | { readonly outcome: "explicit-required" }
  | { readonly outcome: "budget-denied"; readonly retryAfterSeconds: number };

export class ContentGenerationPlanningUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("content generation planning infrastructure unavailable", options);
    this.name = "ContentGenerationPlanningUnavailableError";
  }
}

export interface ContentGenerationActionCapability {
  generateTopicTitle(input: {
    readonly actorId: string;
    readonly revision: ContentTranslationRevision;
    readonly targetLocale: string;
  }): Promise<ContentGenerationActionResult>;

  generateAutomaticPostBody(input: {
    readonly actorId: string;
    readonly revision: ContentTranslationRevision;
    readonly targetLocale: string;
  }): Promise<ContentGenerationActionResult>;

  generateExplicitPostBody(input: {
    readonly actorId: string;
    readonly revision: ContentTranslationRevision;
    readonly targetLocale: string;
  }): Promise<ContentGenerationActionResult>;
}

interface ContentGenerationActionDependencies {
  readonly pseudonymizer: ContentTranslationRequesterPseudonymizer;
  readonly titlePolicy: ContentGenerationRequestBudgetPolicy;
  readonly postBodyPolicy: ContentGenerationRequestBudgetPolicy;
  readonly titlePlanner: Pick<ContentTopicTitleTranslationPlanner, "planAndDispatch">;
  readonly postBodyPlanner: Pick<ContentPostBodyTranslationPlanner, "planAndDispatch">;
}

export class DefaultContentGenerationActionCapability implements ContentGenerationActionCapability {
  constructor(private readonly dependencies: ContentGenerationActionDependencies) {
    validatePolicy(dependencies.titlePolicy);
    validatePolicy(dependencies.postBodyPolicy);
  }

  async generateTopicTitle(input: {
    readonly actorId: string;
    readonly revision: ContentTranslationRevision;
    readonly targetLocale: string;
  }): Promise<ContentGenerationActionResult> {
    if (input.revision.contentType !== "topic-title") {
      throw new TypeError("topic-title generation requires a topic-title revision");
    }
    const admission = await this.requestBudgetAdmission(input.actorId, this.dependencies.titlePolicy);
    return this.runPlanner(() =>
      this.dependencies.titlePlanner.planAndDispatch(
        input.revision,
        input.targetLocale,
        admission,
      )
    );
  }

  async generateAutomaticPostBody(input: {
    readonly actorId: string;
    readonly revision: ContentTranslationRevision;
    readonly targetLocale: string;
  }): Promise<ContentGenerationActionResult> {
    this.assertPostBodyRevision(input.revision);
    const semanticCharacters = contentPostBodySemanticCharacterCount(
      input.revision.originalContent,
    );
    if (semanticCharacters > MAX_AUTOMATIC_POST_TRANSLATION_SEMANTIC_CHARACTERS) {
      return { outcome: "explicit-required" };
    }
    return this.generatePostBody(input);
  }

  async generateExplicitPostBody(input: {
    readonly actorId: string;
    readonly revision: ContentTranslationRevision;
    readonly targetLocale: string;
  }): Promise<ContentGenerationActionResult> {
    this.assertPostBodyRevision(input.revision);
    return this.generatePostBody(input);
  }

  private async generatePostBody(input: {
    readonly actorId: string;
    readonly revision: ContentTranslationRevision;
    readonly targetLocale: string;
  }): Promise<ContentGenerationActionResult> {
    const admission = await this.requestBudgetAdmission(
      input.actorId,
      this.dependencies.postBodyPolicy,
    );
    return this.runPlanner(() =>
      this.dependencies.postBodyPlanner.planAndDispatch(
        input.revision,
        input.targetLocale,
        admission,
      )
    );
  }

  private assertPostBodyRevision(revision: ContentTranslationRevision): void {
    if (revision.contentType !== "post-body") {
      throw new TypeError("post-body generation requires a post-body revision");
    }
  }

  private async requestBudgetAdmission(
    actorId: string,
    policy: ContentGenerationRequestBudgetPolicy,
  ): Promise<ContentTranslationRequestBudgetAdmission> {
    const pseudonym = await this.dependencies.pseudonymizer.pseudonymize({
      kind: "authenticated",
      identity: actorId,
    });
    const admission = {
      subjectKey: pseudonym.subjectKey,
      cost: policy.cost,
      windowSeconds: policy.windowSeconds,
      global: policy.global,
      requester: policy.requester,
    };
    validateContentTranslationRequestBudgetAdmission(admission);
    return admission;
  }

  private async runPlanner(
    operation: () => Promise<ContentTopicTitlePlanningResult | ContentPostBodyPlanningResult>,
  ): Promise<ContentGenerationActionResult> {
    try {
      const result = await operation();
      if (result.kind === "queued") return { outcome: "queued" };
      if (result.reason === "request-budget-denied") {
        return {
          outcome: "budget-denied",
          retryAfterSeconds: safeRetryAfter(result.requestBudgetDecision.retryAfterSeconds),
        };
      }
      return { outcome: "no-op", reason: result.reason };
    } catch (error) {
      if (
        error instanceof ContentTranslationRequestBudgetStorageUnavailableError
        || isPostgresQueryTimeout(error)
        || hasPostgresAvailabilityFailure(error)
      ) {
        throw new ContentGenerationPlanningUnavailableError({ cause: error });
      }
      throw error;
    }
  }
}

export function contentPostBodySemanticCharacterCount(sourceMarkdown: string): number {
  const protectedDocument = protectMarkdownForTranslation(sourceMarkdown);
  let semanticCharacters = 0;
  for (const segment of protectedDocument.segments) {
    semanticCharacters += segment.text.length;
    if (!Number.isSafeInteger(semanticCharacters)) {
      throw new TypeError("post-body semantic character count is invalid");
    }
  }
  return semanticCharacters;
}

function validatePolicy(policy: ContentGenerationRequestBudgetPolicy): void {
  validateContentTranslationRequestBudgetAdmission({
    subjectKey: "A".repeat(43),
    cost: policy.cost,
    windowSeconds: policy.windowSeconds,
    global: policy.global,
    requester: policy.requester,
  });
}

function safeRetryAfter(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("request-budget retryAfterSeconds is invalid");
  }
  return Math.max(1, value);
}

function hasPostgresAvailabilityFailure(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current = error;
  while (
    current
    && (typeof current === "object" || typeof current === "function")
    && !seen.has(current)
  ) {
    seen.add(current);
    if (isPostgresAvailabilityFailure(current)) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
