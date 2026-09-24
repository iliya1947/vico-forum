import type { MachineTranslationProvenance, MachineTranslationResult } from "./translation-provider";
import {
  contentTopicTitleTaskPreflight,
  type ClaimedContentTopicTitleExecutionContext,
  type ContentTopicTitleTaskPreflightDependencies,
  type ContentTopicTitleTaskStaleReason,
} from "./content-translation-task-consumer";
import { ContentTranslationStorageUnavailableError } from "./content-translation";
import { TranslationExecutionFailure } from "./translation-failures";
import {
  TranslationValidationError,
  validateMachineTranslationProvenance,
} from "./translation-validation";

export interface MachineContentTopicTitlePublication {
  readonly task: ClaimedContentTopicTitleExecutionContext["task"];
  readonly revision: ClaimedContentTopicTitleExecutionContext["revision"];
  readonly translatedContent: string;
  readonly provenance: MachineTranslationProvenance;
  readonly generationPolicyVersion: string;
}

export type ContentTopicTitlePublicationResult =
  | { readonly outcome: "published" }
  | { readonly outcome: "stale"; readonly reason: ContentTopicTitleTaskStaleReason }
  | { readonly outcome: "claim-lost" };

export interface ContentTopicTitlePublicationStore {
  publishClaimedMachineResult(
    publication: MachineContentTopicTitlePublication,
  ): Promise<ContentTopicTitlePublicationResult>;
}

export interface ContentTopicTitleResultPublisherDependencies
  extends ContentTopicTitleTaskPreflightDependencies {
  readonly publications: ContentTopicTitlePublicationStore;
}

export class ContentTopicTitleResultPublisher {
  constructor(private readonly dependencies: ContentTopicTitleResultPublisherDependencies) {}

  async publish(
    context: ClaimedContentTopicTitleExecutionContext,
    result: MachineTranslationResult,
  ): Promise<ContentTopicTitlePublicationResult> {
    validateMachineTranslationProvenance(result.provenance);
    const translatedContent = validateTopicTitleProviderOutput(result.value);
    const attribution = result.provenance.attribution;
    if (attribution !== undefined && !attribution.trim()) {
      throw new TranslationValidationError(
        "content translation attribution must be non-blank when present",
      );
    }

    let preflight;
    try {
      preflight = await contentTopicTitleTaskPreflight(context.task, this.dependencies);
    } catch (error) {
      if (error instanceof ContentTranslationStorageUnavailableError) {
        throw new TranslationExecutionFailure(
          "retryable",
          "dependency-temporary",
          "content translation storage unavailable during publication preflight",
        );
      }
      throw error;
    }

    if (preflight.outcome === "stale") {
      const transitioned = await this.dependencies.tasks.markStale(
        context.task.id,
        context.task.claimToken,
      );
      return transitioned
        ? { outcome: "stale", reason: preflight.reason }
        : { outcome: "claim-lost" };
    }

    return this.dependencies.publications.publishClaimedMachineResult({
      task: context.task,
      revision: preflight.revision,
      translatedContent,
      provenance: result.provenance,
      generationPolicyVersion: this.dependencies.generationPolicyVersion,
    });
  }
}

function validateTopicTitleProviderOutput(value: unknown): string {
  if (typeof value !== "string") {
    throw new TranslationValidationError("topic-title provider output must be a plain string");
  }
  if (!value.trim()) {
    throw new TranslationValidationError("topic-title provider output must not be blank");
  }
  return value;
}
