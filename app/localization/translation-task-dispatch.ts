import type {
  ContentTopicTitleTaskExecutionResult,
  ContentTopicTitleTaskExecutor,
} from "./content-translation-execution";
import type {
  UiTranslationTaskExecutionResult,
  UiTranslationTaskExecutor,
} from "./translation-execution";
import type {
  TranslationTaskKind,
  TranslationTaskKindReader,
  TranslationTaskMessage,
} from "./translation-tasks";

export type TranslationTaskDispatchResult =
  | UiTranslationTaskExecutionResult
  | ContentTopicTitleTaskExecutionResult
  | { readonly outcome: "not-found"; readonly delivery: "ack" };

export class UnknownTranslationTaskKindError extends Error {
  constructor(readonly translationKind: string) {
    super(`unknown translation task kind: ${translationKind}`);
    this.name = "UnknownTranslationTaskKindError";
  }
}

export class TranslationTaskExecutorUnavailableError extends Error {
  constructor(readonly translationKind: TranslationTaskKind) {
    super(`translation task executor is not available yet: ${translationKind}`);
    this.name = "TranslationTaskExecutorUnavailableError";
  }
}

export interface TranslationTaskExecutorDispatcherDependencies {
  readonly kinds: TranslationTaskKindReader;
  readonly ui: Pick<UiTranslationTaskExecutor, "execute">;
  readonly contentTopicTitle: Pick<ContentTopicTitleTaskExecutor, "execute">;
}

/**
 * Resolves the persisted discriminator before any kind-specific consumer can claim the task.
 */
export class TranslationTaskExecutorDispatcher {
  constructor(private readonly dependencies: TranslationTaskExecutorDispatcherDependencies) {}

  async execute(message: TranslationTaskMessage): Promise<TranslationTaskDispatchResult> {
    const kind = await this.dependencies.kinds.findKind(message.translationTaskId);
    if (kind === undefined) return { outcome: "not-found", delivery: "ack" };

    switch (kind) {
      case "ui":
        return this.dependencies.ui.execute(message);
      case "content-topic-title":
        return this.dependencies.contentTopicTitle.execute(message);
      case "content-post-body":
        throw new TranslationTaskExecutorUnavailableError(kind);
      default:
        throw new UnknownTranslationTaskKindError(kind);
    }
  }
}

export function isTranslationTaskKind(value: string): value is TranslationTaskKind {
  return value === "ui" || value === "content-topic-title" || value === "content-post-body";
}
