import type { LocaleRulesProvider } from "./locale-rules";
import type { MachineTranslationProvenance, MachineTranslationResult } from "./translation-provider";
import {
  uiTranslationTaskStaleReason,
  type ClaimedUiTranslationExecutionContext,
  type TranslationTaskPreflightDependencies,
  type TranslationTaskStaleReason,
} from "./translation-task-consumer";
import type { TranslationTaskStore } from "./translation-tasks";
import {
  TranslationValidationError,
  validateProviderOutput,
  type ProviderTranslationValue,
} from "./translation-validation";

export interface MachineUiTranslationPublication {
  readonly task: ClaimedUiTranslationExecutionContext["task"];
  readonly value: ProviderTranslationValue;
  readonly provenance: MachineTranslationProvenance;
}

export interface UiTranslationPublicationStore {
  publishClaimedMachineResult(publication: MachineUiTranslationPublication): Promise<boolean>;
}

export interface UiTranslationResultPublisherDependencies extends TranslationTaskPreflightDependencies {
  readonly tasks: TranslationTaskStore;
  readonly localeRules: LocaleRulesProvider;
  readonly publications: UiTranslationPublicationStore;
}

export type UiTranslationPublicationResult =
  | { readonly outcome: "published" }
  | { readonly outcome: "stale"; readonly reason: TranslationTaskStaleReason }
  | { readonly outcome: "claim-lost" };

/** Validates provider output and conditionally publishes only the still-current claimed task. */
export class UiTranslationResultPublisher {
  constructor(private readonly dependencies: UiTranslationResultPublisherDependencies) {}

  async publish(
    context: ClaimedUiTranslationExecutionContext,
    result: MachineTranslationResult,
  ): Promise<UiTranslationPublicationResult> {
    assertMachineProvenance(result.provenance);
    const value = result.value;
    validateProviderOutput(context.source, context.task.targetLocale, value, this.dependencies.localeRules);

    const reason = await uiTranslationTaskStaleReason(context.task, this.dependencies);
    if (reason) {
      const transitioned = await this.dependencies.tasks.markStale(
        context.task.id,
        context.task.claimToken,
      );
      return transitioned ? { outcome: "stale", reason } : { outcome: "claim-lost" };
    }

    const published = await this.dependencies.publications.publishClaimedMachineResult({
      task: context.task,
      value,
      provenance: result.provenance,
    });
    return published ? { outcome: "published" } : { outcome: "claim-lost" };
  }
}

function assertMachineProvenance(
  provenance: unknown,
): asserts provenance is MachineTranslationProvenance {
  if (typeof provenance !== "object" || provenance === null || Array.isArray(provenance)) {
    throw new TranslationValidationError("translation provenance must be an object");
  }

  const candidate = provenance as Record<string, unknown>;
  if (candidate.origin !== "machine") {
    throw new TranslationValidationError("translation publication origin must be machine");
  }
  if (typeof candidate.provider !== "string" || !candidate.provider.trim()) {
    throw new TranslationValidationError("translation provider must be a non-blank string");
  }
  if (typeof candidate.model !== "string" || !candidate.model.trim()) {
    throw new TranslationValidationError("translation provider model must be a non-blank string");
  }
  if (candidate.attribution !== undefined && typeof candidate.attribution !== "string") {
    throw new TranslationValidationError("translation provider attribution must be a string");
  }
}
