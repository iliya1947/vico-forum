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
import { classifyTranslationExecutionFailure } from "./translation-execution";
import type {
  TranslationFailureCode,
  TranslationFailureRecord,
} from "./translation-failures";
import type {
  MachineTranslationRequest,
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
  readonly consumer: Pick<ContentTopicTitleTaskConsumer, "consume">;
  readonly providerRouter: Pick<TranslationProviderRouter, "translate">;
  readonly publisher: Pick<ContentTopicTitleResultPublisher, "publish">;
  readonly failures: TranslationTaskFailureStore;
}

export class ContentTopicTitleTaskExecutor {
  constructor(private readonly dependencies: ContentTopicTitleTaskExecutorDependencies) {}

  async execute(message: TranslationTaskMessage): Promise<ContentTopicTitleTaskExecutionResult> {
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
      const result = await this.dependencies.providerRouter.translate(
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
): MachineTranslationRequest {
  return {
    domain: "content",
    sourceLocale: context.task.resolvedSourceLocale,
    targetLocale: context.task.targetLocale,
    messageKind: "plain",
    operation: "plain",
    source: context.revision.originalContent,
  };
}

function acknowledge<
  T extends
    | ContentTopicTitlePublicationResult
    | Exclude<ContentTopicTitleTaskConsumerResult, { readonly outcome: "eligible" }>,
>(result: T): T & { readonly delivery: "ack" } {
  return { ...result, delivery: "ack" };
}
