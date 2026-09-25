import type { ContentTopicTitleAllowanceGate } from "./content-provider-allowance";
import {
  ClaimedContentTopicTitleDependencyError,
  type ClaimedContentTopicTitleExecutionContext,
  type ClaimedContentTopicTitleTaskContext,
  type ContentTopicTitleTaskConsumer,
  type ContentTopicTitleTaskConsumerResult,
} from "./content-translation-task-consumer";
import type {
  ContentTopicTitlePublicationResult,
  ContentTopicTitleResultPublisher,
} from "./content-translation-publication";
import { publicForumTopicTitleProviderRequest } from "./content-translation-provider";
import { classifyTranslationExecutionFailure } from "./translation-execution";
import type {
  TranslationFailureCode,
  TranslationFailureRecord,
} from "./translation-failures";
import type {
  TranslationProviderRouter,
} from "./translation-provider";
import type {
  TranslationTaskFailureStore,
  TranslationTaskMessage,
} from "./translation-tasks";

type AckExecutionResult =
  (
    | ContentTopicTitlePublicationResult
    | Exclude<ContentTopicTitleTaskConsumerResult, { readonly outcome: "eligible" }>
  ) & { readonly delivery: "ack" };

export type ContentTopicTitleTaskExecutionResult =
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

export interface ContentTopicTitleTaskExecutorDependencies {
  readonly allowance: Pick<ContentTopicTitleAllowanceGate, "admit">;
  readonly consumer: Pick<ContentTopicTitleTaskConsumer, "consume">;
  readonly providerRouter: Pick<TranslationProviderRouter, "translateWithProvider">;
  readonly publisher: Pick<ContentTopicTitleResultPublisher, "publish">;
  readonly failures: TranslationTaskFailureStore;
}

export class ContentTopicTitleTaskExecutor {
  constructor(private readonly dependencies: ContentTopicTitleTaskExecutorDependencies) {}

  async execute(message: TranslationTaskMessage): Promise<ContentTopicTitleTaskExecutionResult> {
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

    let consumed: ContentTopicTitleTaskConsumerResult;
    try {
      consumed = await this.dependencies.consumer.consume(message);
    } catch (error) {
      if (error instanceof ClaimedContentTopicTitleDependencyError) {
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

    try {
      if (!admittedProvider) {
        throw new TypeError("content execution requires an admitted provider identity");
      }
      const result = await this.dependencies.providerRouter.translateWithProvider(
        admittedProvider,
        providerRequest(consumed.context),
      );
      return acknowledge(await this.dependencies.publisher.publish(consumed.context, result));
    } catch (error) {
      const failure = classifyTranslationExecutionFailure(error);
      if (!failure) throw error;
      return this.persistFailure(consumed.context, failure);
    }
  }

  private async persistFailure(
    context: ClaimedContentTopicTitleTaskContext,
    failure: TranslationFailureRecord,
  ): Promise<ContentTopicTitleTaskExecutionResult> {
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

function providerRequest(
  context: ClaimedContentTopicTitleExecutionContext,
) {
  return publicForumTopicTitleProviderRequest({
    sourceLocale: context.task.resolvedSourceLocale,
    targetLocale: context.task.targetLocale,
    source: context.revision.originalContent,
  });
}

function acknowledge<
  T extends
    | ContentTopicTitlePublicationResult
    | Exclude<ContentTopicTitleTaskConsumerResult, { readonly outcome: "eligible" }>,
>(result: T): T & { readonly delivery: "ack" } {
  return { ...result, delivery: "ack" };
}
