import { catalogDescriptors, type UiMessageDescriptor } from "./catalog";
import { sourceFingerprint } from "./fingerprint";
import { TranslationExecutionFailure } from "./translation-failures";
import { DatabaseManualTranslationSource, type UiTranslationStore } from "./persistent-sources";
import type { LocaleRegistry } from "./registry";
import type { TranslationSource } from "./sources";
import {
  resolveUiTranslationGenerationTarget,
} from "./ui-translation-service";
import type {
  TranslationTask,
  TranslationTaskMessage,
  TranslationTaskStore,
} from "./translation-tasks";

export type TranslationTaskStaleReason =
  | "source-missing"
  | "source-changed"
  | "policy-changed"
  | "generation-superseded"
  | "target-locale-ineligible"
  | "manual-translation-exists";

export interface ClaimedTranslationTaskContext {
  readonly task: TranslationTask & { readonly status: "processing"; readonly claimToken: string };
  /** Whether this claim consumed a fresh provider-attempt budget slot. */
  readonly attemptStarted: boolean;
}

export interface ClaimedUiTranslationExecutionContext extends ClaimedTranslationTaskContext {
  readonly source: UiMessageDescriptor;
  readonly attemptStarted: true;
}

export interface ExhaustedTranslationTaskContext extends ClaimedTranslationTaskContext {
  readonly attemptStarted: false;
}

export type ClaimedUiTranslationConsumerContext =
  | ClaimedUiTranslationExecutionContext
  | ExhaustedTranslationTaskContext;

export class ClaimedTranslationDependencyError extends Error {
  constructor(
    readonly context: ClaimedTranslationTaskContext,
    options?: ErrorOptions,
  ) {
    super("translation task preflight dependency failed", options);
    this.name = "ClaimedTranslationDependencyError";
  }
}

export type TranslationTaskConsumerResult =
  | { readonly outcome: "eligible"; readonly context: ClaimedUiTranslationConsumerContext }
  | { readonly outcome: "stale"; readonly reason: TranslationTaskStaleReason }
  | { readonly outcome: "not-found" | "already-claimed" | "terminal" | "claim-lost" };

export interface TranslationTaskPreflightDependencies {
  readonly localeRegistry: LocaleRegistry;
  readonly localManualSource: TranslationSource;
  readonly persistentStore: UiTranslationStore;
  readonly generationPolicyVersion: string;
  readonly tasks: TranslationTaskStore;
}

export interface TranslationTaskConsumerDependencies extends TranslationTaskPreflightDependencies {
  readonly tasks: TranslationTaskStore;
  readonly leaseDurationMs: number;
}

/** Claims and revalidates durable work without knowing about Queue or translation providers. */
export class UiTranslationTaskConsumer {
  constructor(private readonly dependencies: TranslationTaskConsumerDependencies) {
    assertPreflightDependencies(dependencies);
    if (!Number.isSafeInteger(dependencies.leaseDurationMs) || dependencies.leaseDurationMs <= 0) {
      throw new TypeError("leaseDurationMs must be a positive integer");
    }
  }

  async consume(message: TranslationTaskMessage): Promise<TranslationTaskConsumerResult> {
    const claim = await this.dependencies.tasks.claim(
      message.translationTaskId,
      this.dependencies.leaseDurationMs,
    );
    if (claim.outcome !== "claimed") return { outcome: claim.outcome };

    if (!claim.attemptStarted) {
      return {
        outcome: "eligible",
        context: {
          task: claim.task,
          attemptStarted: false,
        },
      };
    }

    try {
      const reason = await uiTranslationTaskStaleReason(claim.task, this.dependencies);
      if (!reason) {
        const source = descriptorForTask(claim.task);
        if (!source) throw new TypeError("claimed translation task source descriptor disappeared during preflight");
        return {
          outcome: "eligible",
          context: {
            task: claim.task,
            source,
            attemptStarted: true,
          },
        };
      }

      const transitioned = await this.dependencies.tasks.markStale(
        claim.task.id,
        claim.task.claimToken,
      );
      return transitioned ? { outcome: "stale", reason } : { outcome: "claim-lost" };
    } catch (error) {
      if (
        error instanceof TranslationExecutionFailure &&
        error.disposition === "retryable" &&
        error.code === "dependency-temporary"
      ) {
        throw new ClaimedTranslationDependencyError(
          { task: claim.task, attemptStarted: true },
          { cause: error },
        );
      }
      throw error;
    }
  }
}

export async function uiTranslationTaskStaleReason(
  task: TranslationTask,
  dependencies: TranslationTaskPreflightDependencies,
): Promise<TranslationTaskStaleReason | undefined> {
  assertPreflightDependencies(dependencies);
  const descriptor = descriptorForTask(task);
  if (!descriptor) return "source-missing";
  if (await sourceFingerprint(descriptor) !== task.sourceFingerprint) return "source-changed";
  if (task.generationPolicyVersion !== dependencies.generationPolicyVersion) return "policy-changed";
  if (!await dependencies.tasks.isCurrentGeneration(task)) return "generation-superseded";

  if (
    resolveUiTranslationGenerationTarget(dependencies.localeRegistry, task.targetLocale) !== task.targetLocale
  ) return "target-locale-ineligible";

  const namespaces = [task.sourceIdentity.namespace];
  const persistentManualSource = new DatabaseManualTranslationSource(dependencies.persistentStore);
  for (const source of [dependencies.localManualSource, persistentManualSource]) {
    const result = await source.load(task.targetLocale, namespaces);
    if (Object.hasOwn(result.resources[task.sourceIdentity.namespace] ?? {}, task.sourceIdentity.key)) {
      return "manual-translation-exists";
    }
  }
  return undefined;
}

export function descriptorForTask(task: TranslationTask): UiMessageDescriptor | undefined {
  return catalogDescriptors().find((candidate) =>
    candidate.namespace === task.sourceIdentity.namespace && candidate.key === task.sourceIdentity.key
  );
}

function assertPreflightDependencies(dependencies: TranslationTaskPreflightDependencies): void {
  if (!dependencies.generationPolicyVersion.trim()) {
    throw new TypeError("generationPolicyVersion must not be blank");
  }
}
