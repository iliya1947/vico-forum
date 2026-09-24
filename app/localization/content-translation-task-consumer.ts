import type {
  ContentTranslationIdentity,
  ContentTranslationRevision,
  ContentTranslationStore,
} from "./content-translation";
import { ContentTranslationStorageUnavailableError } from "./content-translation";
import {
  contentTopicTitleSourceFingerprint,
  isActiveContentTranslationTarget,
} from "./content-translation-planning";
import { TranslationExecutionFailure } from "./translation-failures";
import type { LocaleRegistry } from "./registry";
import type {
  ContentTopicTitleTranslationTask,
  ContentTopicTitleTranslationTaskStore,
  TranslationTaskMessage,
} from "./translation-tasks";

export type ContentTopicTitleTaskStaleReason =
  | "revision-not-current"
  | "source-changed"
  | "policy-changed"
  | "generation-superseded"
  | "target-locale-ineligible"
  | "translation-current";

export interface ClaimedContentTopicTitleTaskContext {
  readonly task: ContentTopicTitleTranslationTask & {
    readonly status: "processing";
    readonly claimToken: string;
  };
  readonly attemptStarted: boolean;
}

export interface ClaimedContentTopicTitleExecutionContext
  extends ClaimedContentTopicTitleTaskContext {
  readonly revision: ContentTranslationRevision;
  readonly attemptStarted: true;
}

export interface ExhaustedContentTopicTitleTaskContext
  extends ClaimedContentTopicTitleTaskContext {
  readonly attemptStarted: false;
}

export type ClaimedContentTopicTitleConsumerContext =
  | ClaimedContentTopicTitleExecutionContext
  | ExhaustedContentTopicTitleTaskContext;

export type ContentTopicTitleTaskConsumerResult =
  | { readonly outcome: "eligible"; readonly context: ClaimedContentTopicTitleConsumerContext }
  | { readonly outcome: "stale"; readonly reason: ContentTopicTitleTaskStaleReason }
  | { readonly outcome: "not-found" | "already-claimed" | "terminal" | "claim-lost" };

export class ClaimedContentTopicTitleDependencyError extends Error {
  constructor(
    readonly context: ClaimedContentTopicTitleTaskContext,
    options?: ErrorOptions,
  ) {
    super("content topic-title task preflight dependency failed", options);
    this.name = "ClaimedContentTopicTitleDependencyError";
  }
}

export interface ContentTopicTitleRevisionReader {
  readCurrentRevision(topicId: string): Promise<ContentTranslationRevision | undefined>;
}

export interface ContentTopicTitleTaskPreflightDependencies {
  readonly localeRegistry: LocaleRegistry;
  readonly generationPolicyVersion: string;
  readonly revisions: ContentTopicTitleRevisionReader;
  readonly translations: ContentTranslationStore;
  readonly tasks: ContentTopicTitleTranslationTaskStore;
}

export interface ContentTopicTitleTaskConsumerDependencies
  extends ContentTopicTitleTaskPreflightDependencies {
  readonly leaseDurationMs: number;
}

export class ContentTopicTitleTaskConsumer {
  constructor(private readonly dependencies: ContentTopicTitleTaskConsumerDependencies) {
    assertDependencies(dependencies);
    if (!Number.isSafeInteger(dependencies.leaseDurationMs) || dependencies.leaseDurationMs <= 0) {
      throw new TypeError("leaseDurationMs must be a positive integer");
    }
  }

  async consume(message: TranslationTaskMessage): Promise<ContentTopicTitleTaskConsumerResult> {
    const claim = await this.dependencies.tasks.claimContentTopicTitle(
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

    const context: ClaimedContentTopicTitleTaskContext = {
      task: claim.task,
      attemptStarted: true,
    };

    try {
      const preflight = await contentTopicTitleTaskPreflight(claim.task, this.dependencies);
      if (preflight.outcome === "eligible") {
        return {
          outcome: "eligible",
          context: {
            task: claim.task,
            revision: preflight.revision,
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
        throw new ClaimedContentTopicTitleDependencyError(context, { cause: error });
      }
      throw error;
    }
  }
}

export type ContentTopicTitleTaskPreflightResult =
  | { readonly outcome: "eligible"; readonly revision: ContentTranslationRevision }
  | { readonly outcome: "stale"; readonly reason: ContentTopicTitleTaskStaleReason };

export async function contentTopicTitleTaskPreflight(
  task: ContentTopicTitleTranslationTask,
  dependencies: ContentTopicTitleTaskPreflightDependencies,
): Promise<ContentTopicTitleTaskPreflightResult> {
  assertDependencies(dependencies);

  if (task.generationPolicyVersion !== dependencies.generationPolicyVersion) {
    return { outcome: "stale", reason: "policy-changed" };
  }
  if (!await dependencies.tasks.isCurrentContentTopicTitleGeneration(task)) {
    return { outcome: "stale", reason: "generation-superseded" };
  }
  if (!isActiveContentTranslationTarget(dependencies.localeRegistry, task.targetLocale)) {
    return { outcome: "stale", reason: "target-locale-ineligible" };
  }

  const expectedFingerprint = await contentTopicTitleSourceFingerprint({
    topicId: task.sourceIdentity.topicId,
    revisionId: task.sourceIdentity.revisionId,
    revisionSourceLocale: task.revisionSourceLocale,
    resolvedSourceLocale: task.resolvedSourceLocale,
    sourceResolutionOrigin: task.sourceResolutionOrigin,
  });
  if (expectedFingerprint !== task.sourceFingerprint) {
    throw new TypeError("content topic-title task source fingerprint does not match metadata");
  }

  const revision = await dependencies.revisions.readCurrentRevision(task.sourceIdentity.topicId);
  if (
    !revision
    || revision.contentType !== "topic-title"
    || revision.contentId !== task.sourceIdentity.topicId
    || revision.revisionId !== task.sourceIdentity.revisionId
  ) {
    return { outcome: "stale", reason: "revision-not-current" };
  }
  if (revision.sourceLocale !== task.revisionSourceLocale) {
    return { outcome: "stale", reason: "source-changed" };
  }

  const identity: ContentTranslationIdentity = {
    contentType: "topic-title",
    contentId: task.sourceIdentity.topicId,
    revisionId: task.sourceIdentity.revisionId,
    targetLocale: task.targetLocale,
  };
  if (await dependencies.translations.read(identity)) {
    return { outcome: "stale", reason: "translation-current" };
  }

  return { outcome: "eligible", revision };
}

function assertDependencies(dependencies: ContentTopicTitleTaskPreflightDependencies): void {
  if (!dependencies.generationPolicyVersion.trim()) {
    throw new TypeError("generationPolicyVersion must not be blank");
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
