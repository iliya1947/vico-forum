import {
  MarkdownTranslationValidationError,
  type MarkdownSegmentTranslation,
} from "./content-markdown-translation";
import {
  contentPostBodyTaskPreflight,
  type ClaimedContentPostBodyExecutionContext,
  type ContentPostBodyTaskPreflightDependencies,
  type ContentPostBodyTaskStaleReason,
} from "./content-post-body-task-consumer";
import { ContentTranslationStorageUnavailableError } from "./content-translation";
import { TranslationExecutionFailure } from "./translation-failures";
import type {
  MachineTranslationProvenance,
} from "./translation-provider";
import {
  TranslationValidationError,
  validateMachineTranslationProvenance,
} from "./translation-validation";

export interface MachineContentPostBodyPublication {
  readonly task: ClaimedContentPostBodyExecutionContext["task"];
  readonly revision: ClaimedContentPostBodyExecutionContext["revision"];
  readonly translatedContent: string;
  readonly provenance: MachineTranslationProvenance;
  readonly generationPolicyVersion: string;
  readonly protectedContentPolicyVersion: string;
}

export type ContentPostBodyPublicationResult =
  | { readonly outcome: "published" }
  | { readonly outcome: "stale"; readonly reason: ContentPostBodyTaskStaleReason }
  | { readonly outcome: "claim-lost" };

export interface ContentPostBodyPublicationStore {
  publishClaimedMachineResult(
    publication: MachineContentPostBodyPublication,
  ): Promise<ContentPostBodyPublicationResult>;
}

export interface ContentPostBodyResultPublisherDependencies
  extends ContentPostBodyTaskPreflightDependencies {
  readonly publications: ContentPostBodyPublicationStore;
}

export class ContentPostBodyResultPublisher {
  constructor(private readonly dependencies: ContentPostBodyResultPublisherDependencies) {}

  async publish(
    context: ClaimedContentPostBodyExecutionContext,
    translations: readonly MarkdownSegmentTranslation[],
    provenance: MachineTranslationProvenance,
  ): Promise<ContentPostBodyPublicationResult> {
    validateCoherentPublicationProvenance(provenance);

    let preflight;
    try {
      preflight = await contentPostBodyTaskPreflight(context.task, this.dependencies);
    } catch (error) {
      if (error instanceof ContentTranslationStorageUnavailableError) {
        throw new TranslationExecutionFailure(
          "retryable",
          "dependency-temporary",
          "content translation storage unavailable during post-body publication preflight",
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

    let translatedContent: string;
    try {
      translatedContent = preflight.protectedDocument.restore(translations);
    } catch (error) {
      if (error instanceof MarkdownTranslationValidationError) throw error;
      throw new TranslationValidationError("post-body protected Markdown restoration failed");
    }

    return this.dependencies.publications.publishClaimedMachineResult({
      task: context.task,
      revision: preflight.revision,
      translatedContent,
      provenance,
      generationPolicyVersion: this.dependencies.generationPolicyVersion,
      protectedContentPolicyVersion: this.dependencies.protectedContentPolicyVersion,
    });
  }
}

function validateCoherentPublicationProvenance(
  provenance: MachineTranslationProvenance,
): void {
  validateMachineTranslationProvenance(provenance);
  if (provenance.attribution !== undefined && !provenance.attribution.trim()) {
    throw new TranslationValidationError(
      "content translation attribution must be non-blank when present",
    );
  }
}
