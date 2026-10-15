import {
  CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
  protectMarkdownForTranslation,
  type ProtectedMarkdownTranslationDocument,
} from "./content-markdown-translation";
import {
  contentPostBodySourceFingerprint,
} from "./content-post-body-planning";
import type {
  ContentTranslationIdentity,
  ContentTranslationRevision,
  ContentTranslationStore,
} from "./content-translation";
import { ContentTranslationStorageUnavailableError } from "./content-translation";
import { isActiveContentTranslationTarget } from "./content-translation-planning";
import { TranslationExecutionFailure } from "./translation-failures";
import type { LocaleRegistry } from "./registry";
import type {
  ContentPostBodyTranslationTask,
  ContentPostBodyTranslationTaskStore,
  TranslationTaskMessage,
} from "./translation-tasks";

export type ContentPostBodyTaskStaleReason =
  | "revision-not-current"
  | "source-changed"
  | "policy-changed"
  | "protected-policy-changed"
  | "source-fingerprint-mismatch"
  | "generation-superseded"
  | "target-locale-ineligible"
  | "translation-current";

export interface ClaimedContentPostBodyTaskContext {
  readonly task: ContentPostBodyTranslationTask & {
    readonly status: "processing";
    readonly claimToken: string;
  };
  readonly attemptStarted: boolean;
}

export interface ClaimedContentPostBodyExecutionContext
  extends ClaimedContentPostBodyTaskContext {
  readonly revision: ContentTranslationRevision;
  readonly protectedDocument: ProtectedMarkdownTranslationDocument;
  readonly attemptStarted: true;
}

export interface ExhaustedContentPostBodyTaskContext
  extends ClaimedContentPostBodyTaskContext {
  readonly attemptStarted: false;
}

export type ClaimedContentPostBodyConsumerContext =
  | ClaimedContentPostBodyExecutionContext
  | ExhaustedContentPostBodyTaskContext;

export type ContentPostBodyTaskConsumerResult =
  | { readonly outcome: "eligible"; readonly context: ClaimedContentPostBodyConsumerContext }
  | { readonly outcome: "stale"; readonly reason: ContentPostBodyTaskStaleReason }
  | { readonly outcome: "not-found" | "already-claimed" | "terminal" | "claim-lost" };

export class ClaimedContentPostBodyDependencyError extends Error {
  constructor(
    readonly context: ClaimedContentPostBodyTaskContext,
    options?: ErrorOptions,
  ) {
    super("content post-body task preflight dependency failed", options);
    this.name = "ClaimedContentPostBodyDependencyError";
  }
}

export interface ContentPostBodyRevisionReader {
  readCurrentRevision(postId: string): Promise<ContentTranslationRevision | undefined>;
}

export interface ContentPostBodyTaskPreflightDependencies {
  readonly localeRegistry: LocaleRegistry;
  readonly generationPolicyVersion: string;
  readonly protectedContentPolicyVersion: string;
  readonly revisions: ContentPostBodyRevisionReader;
  readonly translations: ContentTranslationStore;
  readonly tasks: ContentPostBodyTranslationTaskStore;
}

export interface ContentPostBodyTaskConsumerDependencies
  extends ContentPostBodyTaskPreflightDependencies {
  readonly leaseDurationMs: number;
}

export class ContentPostBodyTaskConsumer {
  constructor(private readonly dependencies: ContentPostBodyTaskConsumerDependencies) {
    assertDependencies(dependencies);
    if (!Number.isSafeInteger(dependencies.leaseDurationMs) || dependencies.leaseDurationMs <= 0) {
      throw new TypeError("leaseDurationMs must be a positive integer");
    }
  }

  async consume(message: TranslationTaskMessage): Promise<ContentPostBodyTaskConsumerResult> {
    const claim = await this.dependencies.tasks.claimContentPostBody(
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

    const context: ClaimedContentPostBodyTaskContext = {
      task: claim.task,
      attemptStarted: true,
    };

    try {
      const preflight = await contentPostBodyTaskPreflight(claim.task, this.dependencies);
      if (preflight.outcome === "eligible") {
        return {
          outcome: "eligible",
          context: {
            task: claim.task,
            revision: preflight.revision,
            protectedDocument: preflight.protectedDocument,
            attemptStarted: true,
          },
        };
      }

      const transitioned = await this.dependencies.tasks.markStale(
        claim.task.id,
        claim.task.claimToken,
      );
      return transitioned
        ? { outcome: "stale", reason: preflight.reason }
        : { outcome: "claim-lost" };
    } catch (error) {
      if (isTemporaryContentDependencyFailure(error)) {
        throw new ClaimedContentPostBodyDependencyError(context, { cause: error });
      }
      throw error;
    }
  }
}

export type ContentPostBodyTaskPreflightResult =
  | {
      readonly outcome: "eligible";
      readonly revision: ContentTranslationRevision;
      readonly protectedDocument: ProtectedMarkdownTranslationDocument;
    }
  | { readonly outcome: "stale"; readonly reason: ContentPostBodyTaskStaleReason };

export async function contentPostBodyTaskPreflight(
  task: ContentPostBodyTranslationTask,
  dependencies: ContentPostBodyTaskPreflightDependencies,
): Promise<ContentPostBodyTaskPreflightResult> {
  assertDependencies(dependencies);

  if (task.generationPolicyVersion !== dependencies.generationPolicyVersion) {
    return { outcome: "stale", reason: "policy-changed" };
  }
  if (task.protectedContentPolicyVersion !== dependencies.protectedContentPolicyVersion) {
    return { outcome: "stale", reason: "protected-policy-changed" };
  }
  if (dependencies.protectedContentPolicyVersion !== CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION) {
    return { outcome: "stale", reason: "protected-policy-changed" };
  }
  if (!await dependencies.tasks.isCurrentContentPostBodyGeneration(task)) {
    return { outcome: "stale", reason: "generation-superseded" };
  }
  if (!isActiveContentTranslationTarget(dependencies.localeRegistry, task.targetLocale)) {
    return { outcome: "stale", reason: "target-locale-ineligible" };
  }

  const revision = await dependencies.revisions.readCurrentRevision(task.sourceIdentity.postId);
  if (
    !revision
    || revision.contentType !== "post-body"
    || revision.contentId !== task.sourceIdentity.postId
    || revision.revisionId !== task.sourceIdentity.revisionId
  ) {
    return { outcome: "stale", reason: "revision-not-current" };
  }
  if (revision.sourceLocale !== task.revisionSourceLocale) {
    return { outcome: "stale", reason: "source-changed" };
  }

  const protectedDocument = protectMarkdownForTranslation(revision.originalContent);
  const expectedFingerprint = await contentPostBodySourceFingerprint({
    postId: task.sourceIdentity.postId,
    revisionId: task.sourceIdentity.revisionId,
    revisionSourceLocale: task.revisionSourceLocale,
    resolvedSourceLocale: task.resolvedSourceLocale,
    sourceResolutionOrigin: task.sourceResolutionOrigin,
    protectedContentPolicyVersion: task.protectedContentPolicyVersion,
    protectedMarkdown: protectedDocument.protectedMarkdown,
    segments: protectedDocument.segments,
  });
  if (
    protectedDocument.segments.length === 0
    || expectedFingerprint !== task.sourceFingerprint
  ) {
    return { outcome: "stale", reason: "source-fingerprint-mismatch" };
  }

  const identity: ContentTranslationIdentity = {
    contentType: "post-body",
    contentId: task.sourceIdentity.postId,
    revisionId: task.sourceIdentity.revisionId,
    targetLocale: task.targetLocale,
  };
  if (await dependencies.translations.read(identity)) {
    return { outcome: "stale", reason: "translation-current" };
  }

  return { outcome: "eligible", revision, protectedDocument };
}

function assertDependencies(dependencies: ContentPostBodyTaskPreflightDependencies): void {
  if (!dependencies.generationPolicyVersion.trim()) {
    throw new TypeError("generationPolicyVersion must not be blank");
  }
  if (!dependencies.protectedContentPolicyVersion.trim()) {
    throw new TypeError("protectedContentPolicyVersion must not be blank");
  }
}

function isTemporaryContentDependencyFailure(error: unknown): boolean {
  return error instanceof ContentTranslationStorageUnavailableError
    || (
      error instanceof TranslationExecutionFailure
      && error.disposition === "retryable"
      && error.code === "dependency-temporary"
    );
}
