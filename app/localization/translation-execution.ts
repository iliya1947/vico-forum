import type { LocaleRulesProvider } from "./locale-rules";
import {
  TranslationExecutionFailure,
  type TranslationFailureCode,
  type TranslationFailureRecord,
} from "./translation-failures";
import {
  translationOperation,
  UnsupportedTranslationMessageKindError,
  UnsupportedTranslationProviderError,
  type MachineTranslationRequest,
  type TranslationProviderRouter,
} from "./translation-provider";
import type {
  UiTranslationPublicationResult,
  UiTranslationResultPublisher,
} from "./translation-publication";
import {
  ClaimedTranslationDependencyError,
  type ClaimedTranslationTaskContext,
  type ClaimedUiTranslationExecutionContext,
  type TranslationTaskConsumerResult,
  type UiTranslationTaskConsumer,
} from "./translation-task-consumer";
import type {
  TranslationTaskFailureStore,
  TranslationTaskMessage,
} from "./translation-tasks";
import { TranslationValidationError } from "./translation-validation";

type AckExecutionResult =
  (UiTranslationPublicationResult | Exclude<TranslationTaskConsumerResult, { readonly outcome: "eligible" }>)
  & { readonly delivery: "ack" };

export type UiTranslationTaskExecutionResult =
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

export interface UiTranslationTaskExecutorDependencies {
  readonly consumer: Pick<UiTranslationTaskConsumer, "consume">;
  readonly providerRouter: Pick<TranslationProviderRouter, "translate">;
  readonly publisher: Pick<UiTranslationResultPublisher, "publish">;
  readonly failures: TranslationTaskFailureStore;
  readonly localeRules: LocaleRulesProvider;
}

/**
 * Connects durable claim/preflight, bounded execution retries and conditional publication
 * without Queue-specific behavior.
 */
export class UiTranslationTaskExecutor {
  constructor(private readonly dependencies: UiTranslationTaskExecutorDependencies) {}

  async execute(message: TranslationTaskMessage): Promise<UiTranslationTaskExecutionResult> {
    let consumed: TranslationTaskConsumerResult;
    try {
      consumed = await this.dependencies.consumer.consume(message);
    } catch (error) {
      if (error instanceof ClaimedTranslationDependencyError) {
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
      const request = providerRequest(consumed.context, this.dependencies.localeRules);
      const result = await this.dependencies.providerRouter.translate(request);
      return acknowledge(await this.dependencies.publisher.publish(consumed.context, result));
    } catch (error) {
      const failure = classifyTranslationExecutionFailure(error);
      if (!failure) throw error;
      return this.persistFailure(consumed.context, failure);
    }
  }

  private async persistFailure(
    context: ClaimedTranslationTaskContext,
    failure: TranslationFailureRecord,
  ): Promise<UiTranslationTaskExecutionResult> {
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
  context: ClaimedUiTranslationExecutionContext,
  localeRules: LocaleRulesProvider,
): MachineTranslationRequest {
  const operation = translationOperation(context.source.messageKind);
  const requiredBranches = context.source.messageKind === "plural"
    ? localeRules.pluralBranches(context.task.targetLocale)
    : undefined;

  return {
    domain: "ui",
    sourceLocale: "en",
    targetLocale: context.task.targetLocale,
    messageKind: context.source.messageKind,
    operation,
    source: context.source.source,
    ...(requiredBranches ? { requiredBranches } : {}),
  };
}

export function classifyTranslationExecutionFailure(
  error: unknown,
): TranslationFailureRecord | undefined {
  if (error instanceof TranslationExecutionFailure) {
    return { disposition: error.disposition, code: error.code };
  }
  if (error instanceof UnsupportedTranslationProviderError) {
    return { disposition: "terminal", code: "provider-unsupported" };
  }
  if (error instanceof UnsupportedTranslationMessageKindError) {
    return { disposition: "terminal", code: "message-kind-unsupported" };
  }
  if (error instanceof TranslationValidationError) {
    return { disposition: "terminal", code: "provider-output-invalid" };
  }
  return undefined;
}

function acknowledge<T extends UiTranslationPublicationResult | Exclude<TranslationTaskConsumerResult, { readonly outcome: "eligible" }>>(
  result: T,
): T & { readonly delivery: "ack" } {
  return { ...result, delivery: "ack" };
}
