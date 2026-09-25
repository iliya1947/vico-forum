import type { ContentPostBodyAllowanceGate } from "./content-provider-allowance";
import {
  MarkdownTranslationValidationError,
  type MarkdownSegmentTranslation,
} from "./content-markdown-translation";
import {
  ClaimedContentPostBodyDependencyError,
  type ClaimedContentPostBodyExecutionContext,
  type ClaimedContentPostBodyTaskContext,
  type ContentPostBodyTaskConsumer,
  type ContentPostBodyTaskConsumerResult,
} from "./content-post-body-task-consumer";
import type {
  ContentPostBodyPublicationResult,
  ContentPostBodyResultPublisher,
} from "./content-post-body-publication";
import {
  publicForumPostBodyProviderCapabilities,
  publicForumPostBodyProviderRequest,
} from "./content-translation-provider";
import { classifyTranslationExecutionFailure } from "./translation-execution";
import type {
  TranslationFailureCode,
  TranslationFailureRecord,
} from "./translation-failures";
import type {
  MachineTranslationProvenance,
  MachineTranslationResult,
  TranslationProviderRouter,
} from "./translation-provider";
import {
  TranslationValidationError,
  validateMachineTranslationProvenance,
} from "./translation-validation";
import type {
  TranslationTaskFailureStore,
  TranslationTaskMessage,
} from "./translation-tasks";

export interface ContentPostBodyExecutionBounds {
  readonly maxSegments: number;
  readonly maxTotalSegmentCharacters: number;
}

type AckExecutionResult =
  (
    | ContentPostBodyPublicationResult
    | Exclude<ContentPostBodyTaskConsumerResult, { readonly outcome: "eligible" }>
  ) & { readonly delivery: "ack" };

export type ContentPostBodyTaskExecutionResult =
  | AckExecutionResult
  | { readonly outcome: "admission-in-progress" | "execution-in-progress"; readonly delivery: "ack" }
  | {
      readonly outcome: "allowance-deferred";
      readonly delivery: "ack";
      readonly retryNotBefore: Date;
      readonly reason: string;
    }
  | {
      readonly delivery: "retry";
      readonly outcome: "execution-failed";
      readonly failureCode: TranslationFailureCode;
      readonly attemptCount: number;
      readonly maxAttempts: number;
    }
  | {
      readonly delivery: "terminal";
      readonly outcome: "execution-failed";
      readonly failureCode: TranslationFailureCode;
      readonly terminalReason: "terminal" | "retry-exhausted";
      readonly attemptCount: number;
      readonly maxAttempts: number;
    };

export interface ContentPostBodyTaskExecutorDependencies {
  readonly allowance: Pick<ContentPostBodyAllowanceGate, "admit">;
  readonly consumer: Pick<ContentPostBodyTaskConsumer, "consume">;
  readonly providerRouter: Pick<TranslationProviderRouter, "supportsProvider" | "translateWithProvider">;
  readonly publisher: Pick<ContentPostBodyResultPublisher, "publish">;
  readonly failures: TranslationTaskFailureStore;
  readonly executionBounds: ContentPostBodyExecutionBounds;
}

export class ContentPostBodyTaskExecutor {
  constructor(private readonly dependencies: ContentPostBodyTaskExecutorDependencies) {
    validateExecutionBounds(dependencies.executionBounds);
  }

  async execute(message: TranslationTaskMessage): Promise<ContentPostBodyTaskExecutionResult> {
    const admission = await this.dependencies.allowance.admit(message);
    if (admission.outcome === "admission-in-progress" || admission.outcome === "execution-in-progress") {
      return { outcome: admission.outcome, delivery: "ack" };
    }
    if (admission.outcome === "deferred") {
      return {
        outcome: "allowance-deferred",
        delivery: "ack",
        retryNotBefore: admission.retryNotBefore,
        reason: admission.reason,
      };
    }
    if (admission.outcome === "stale") return acknowledge(admission);
    if (admission.outcome === "claim-lost") return acknowledge({ outcome: "claim-lost" });
    if (admission.outcome === "terminal") return acknowledge({ outcome: "terminal" });
    if (admission.outcome === "not-found") return acknowledge({ outcome: "not-found" });
    // Exhausted work reclaims only to persist JOB-04 terminal exhaustion and performs no provider call.
    const admittedProvider = admission.outcome === "admitted" ? admission.provider : undefined;

    let consumed: ContentPostBodyTaskConsumerResult;
    try {
      consumed = await this.dependencies.consumer.consume(message);
    } catch (error) {
      if (error instanceof ClaimedContentPostBodyDependencyError) {
        return this.persistFailure(error.context, {
          disposition: "retryable",
          code: "dependency-temporary",
        });
      }
      throw error;
    }

    if (consumed.outcome !== "eligible") return acknowledge(consumed);

    if (!consumed.context.attemptStarted) {
      return this.persistFailure(consumed.context, {
        disposition: "terminal",
        code: "attempt-budget-exhausted",
      });
    }

    const boundFailure = executionBoundFailure(
      consumed.context,
      this.dependencies.executionBounds,
    );
    if (boundFailure) return this.persistFailure(consumed.context, boundFailure);

    const capabilities = publicForumPostBodyProviderCapabilities({
      sourceLocale: consumed.context.task.resolvedSourceLocale,
      targetLocale: consumed.context.task.targetLocale,
      segmentCharacterCounts: consumed.context.protectedDocument.segments.map(
        (segment) => segment.text.length,
      ),
    });
    if (
      capabilities.length !== consumed.context.protectedDocument.segments.length
      || !admittedProvider
      || !capabilities.every((capability) =>
        this.dependencies.providerRouter.supportsProvider(admittedProvider, capability)
      )
    ) {
      return this.persistFailure(consumed.context, {
        disposition: "terminal",
        code: "provider-unsupported",
      });
    }

    try {
      const translations: MarkdownSegmentTranslation[] = [];
      let provenance: MachineTranslationProvenance | undefined;

      // A retry may repeat earlier segment calls after a later transient failure. Vico guarantees
      // idempotent durable state, not exactly-once external provider calls.
      for (const segment of consumed.context.protectedDocument.segments) {
        const result = await this.dependencies.providerRouter.translateWithProvider(
          admittedProvider,
          publicForumPostBodyProviderRequest({
            sourceLocale: consumed.context.task.resolvedSourceLocale,
            targetLocale: consumed.context.task.targetLocale,
            source: segment.text,
          }),
        );
        const validated = validateSegmentResult(result);
        if (provenance && !sameProvenance(provenance, validated.provenance)) {
          throw new TranslationValidationError(
            "post-body segment translations must have coherent provider provenance",
          );
        }
        provenance ??= validated.provenance;
        translations.push({ id: segment.id, value: validated.value });
      }

      if (!provenance) {
        throw new TranslationValidationError(
          "post-body translation produced no segment provenance",
        );
      }

      return acknowledge(
        await this.dependencies.publisher.publish(
          consumed.context,
          translations,
          provenance,
        ),
      );
    } catch (error) {
      const failure = error instanceof MarkdownTranslationValidationError
        ? { disposition: "terminal" as const, code: "provider-output-invalid" as const }
        : classifyTranslationExecutionFailure(error);
      if (!failure) throw error;
      return this.persistFailure(consumed.context, failure);
    }
  }

  private async persistFailure(
    context: ClaimedContentPostBodyTaskContext,
    failure: TranslationFailureRecord,
  ): Promise<ContentPostBodyTaskExecutionResult> {
    const persisted = await this.dependencies.failures.recordFailure(
      context.task.id,
      context.task.claimToken,
      failure,
    );
    if (persisted.outcome === "claim-lost") return acknowledge({ outcome: "claim-lost" });

    if (persisted.outcome === "retry") {
      return {
        delivery: "retry",
        outcome: "execution-failed",
        failureCode: failure.code,
        attemptCount: persisted.attemptCount,
        maxAttempts: persisted.maxAttempts,
      };
    }

    return {
      delivery: "terminal",
      outcome: "execution-failed",
      failureCode: failure.code,
      terminalReason: persisted.disposition,
      attemptCount: persisted.attemptCount,
      maxAttempts: persisted.maxAttempts,
    };
  }
}

function executionBoundFailure(
  context: ClaimedContentPostBodyExecutionContext,
  bounds: ContentPostBodyExecutionBounds,
): TranslationFailureRecord | undefined {
  const segments = context.protectedDocument.segments;
  let totalCharacters = 0;
  for (const segment of segments) {
    totalCharacters += segment.text.length;
    if (!Number.isSafeInteger(totalCharacters)) {
      return { disposition: "terminal", code: "execution-bound-exceeded" };
    }
  }

  return segments.length > bounds.maxSegments
    || totalCharacters > bounds.maxTotalSegmentCharacters
    ? { disposition: "terminal", code: "execution-bound-exceeded" }
    : undefined;
}

function validateExecutionBounds(bounds: ContentPostBodyExecutionBounds): void {
  if (
    !Number.isSafeInteger(bounds.maxSegments)
    || bounds.maxSegments <= 0
    || !Number.isSafeInteger(bounds.maxTotalSegmentCharacters)
    || bounds.maxTotalSegmentCharacters <= 0
  ) {
    throw new TypeError("post-body execution bounds must be positive safe integers");
  }
}

function validateSegmentResult(
  result: MachineTranslationResult,
): {
  readonly value: string;
  readonly provenance: MachineTranslationProvenance;
} {
  validateMachineTranslationProvenance(result.provenance);
  if (
    result.provenance.attribution !== undefined
    && !result.provenance.attribution.trim()
  ) {
    throw new TranslationValidationError(
      "post-body provider attribution must be non-blank when present",
    );
  }
  if (typeof result.value !== "string") {
    throw new TranslationValidationError(
      "post-body provider output must be a plain string",
    );
  }
  return { value: result.value, provenance: result.provenance };
}

function sameProvenance(
  left: MachineTranslationProvenance,
  right: MachineTranslationProvenance,
): boolean {
  return left.provider === right.provider
    && left.model === right.model
    && left.attribution === right.attribution;
}

function acknowledge<
  T extends
    | ContentPostBodyPublicationResult
    | Exclude<ContentPostBodyTaskConsumerResult, { readonly outcome: "eligible" }>,
>(result: T): T & { readonly delivery: "ack" } {
  return { ...result, delivery: "ack" };
}
