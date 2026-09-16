import type { LocaleRulesProvider } from "./locale-rules";
import {
  translationOperation,
  type MachineTranslationRequest,
  type TranslationProviderRouter,
} from "./translation-provider";
import type {
  UiTranslationPublicationResult,
  UiTranslationResultPublisher,
} from "./translation-publication";
import type {
  ClaimedUiTranslationExecutionContext,
  TranslationTaskConsumerResult,
  UiTranslationTaskConsumer,
} from "./translation-task-consumer";
import type { TranslationTaskMessage } from "./translation-tasks";

export type UiTranslationTaskExecutionResult =
  | UiTranslationPublicationResult
  | Exclude<TranslationTaskConsumerResult, { readonly outcome: "eligible" }>;

export interface UiTranslationTaskExecutorDependencies {
  readonly consumer: Pick<UiTranslationTaskConsumer, "consume">;
  readonly providerRouter: Pick<TranslationProviderRouter, "translate">;
  readonly publisher: Pick<UiTranslationResultPublisher, "publish">;
  readonly localeRules: LocaleRulesProvider;
}

/** Connects claim/preflight, provider execution and conditional publication without Queue-specific behavior. */
export class UiTranslationTaskExecutor {
  constructor(private readonly dependencies: UiTranslationTaskExecutorDependencies) {}

  async execute(message: TranslationTaskMessage): Promise<UiTranslationTaskExecutionResult> {
    const consumed = await this.dependencies.consumer.consume(message);
    if (consumed.outcome !== "eligible") return consumed;

    const request = providerRequest(consumed.context, this.dependencies.localeRules);
    const result = await this.dependencies.providerRouter.translate(request);
    return this.dependencies.publisher.publish(consumed.context, result);
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
