import { parseLocaleCandidate } from "./locale";
import type { TranslationFailureRecord } from "./translation-failures";
import type {
  TranslationJobDispatcher,
  UiTranslationJobSpecification,
} from "./ui-translation-service";

export const DEFAULT_TRANSLATION_TASK_MAX_ATTEMPTS = 3;

export type TranslationTaskKind = "ui" | "content-topic-title" | "content-post-body";
export type TranslationTaskStatus = "pending" | "processing" | "stale" | "completed" | "failed";
export type TranslationTaskFailureDisposition = "terminal" | "retry-exhausted";

export interface TranslationTask {
  readonly id: string;
  readonly taskIdentity: string;
  readonly translationKind: "ui";
  readonly sourceIdentity: {
    readonly namespace: string;
    readonly key: string;
  };
  readonly sourceFingerprint: string;
  readonly targetLocale: string;
  readonly generationPolicyVersion: string;
  /** PostgreSQL-assigned monotonic order within the logical UI unit. */
  readonly generation: number;
  readonly status: TranslationTaskStatus;
  /** Durable execution-attempt budget. Incremented only when a claim starts a new attempt. */
  readonly attemptCount: number;
  readonly maxAttempts: number;
  readonly lastFailureCode: string | null;
  readonly failureDisposition: TranslationTaskFailureDisposition | null;
  readonly claimToken: string | null;
  readonly claimedAt: Date | null;
  readonly leaseExpiresAt: Date | null;
  readonly staleAt: Date | null;
  readonly completedAt: Date | null;
  readonly failedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type ContentTopicTitleSourceResolutionOrigin = "revision-metadata" | "detector";

export interface ContentTopicTitleTranslationTaskSpecification {
  readonly taskIdentity: string;
  readonly translationKind: "content-topic-title";
  readonly sourceIdentity: {
    readonly topicId: string;
    readonly revisionId: string;
  };
  readonly revisionSourceLocale: string;
  readonly resolvedSourceLocale: string;
  readonly sourceResolutionOrigin: ContentTopicTitleSourceResolutionOrigin;
  readonly sourceFingerprint: string;
  readonly targetLocale: string;
  readonly generationPolicyVersion: string;
}

export interface ContentTopicTitleTranslationTask extends ContentTopicTitleTranslationTaskSpecification {
  readonly id: string;
  /** PostgreSQL-assigned monotonic order within one topic-title/target unit. */
  readonly generation: number;
  readonly status: TranslationTaskStatus;
  readonly attemptCount: number;
  readonly maxAttempts: number;
  readonly lastFailureCode: string | null;
  readonly failureDisposition: TranslationTaskFailureDisposition | null;
  readonly claimToken: string | null;
  readonly claimedAt: Date | null;
  readonly leaseExpiresAt: Date | null;
  readonly staleAt: Date | null;
  readonly completedAt: Date | null;
  readonly failedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ContentPostBodyTranslationTaskSpecification {
  readonly taskIdentity: string;
  readonly translationKind: "content-post-body";
  readonly sourceIdentity: {
    readonly postId: string;
    readonly revisionId: string;
  };
  readonly revisionSourceLocale: string;
  readonly resolvedSourceLocale: string;
  readonly sourceResolutionOrigin: ContentTopicTitleSourceResolutionOrigin;
  readonly sourceFingerprint: string;
  readonly targetLocale: string;
  readonly protectedContentPolicyVersion: string;
  readonly generationPolicyVersion: string;
}

export interface ContentPostBodyTranslationTask extends ContentPostBodyTranslationTaskSpecification {
  readonly id: string;
  /** PostgreSQL-assigned monotonic order within one post-body/target unit. */
  readonly generation: number;
  readonly status: TranslationTaskStatus;
  readonly attemptCount: number;
  readonly maxAttempts: number;
  readonly lastFailureCode: string | null;
  readonly failureDisposition: TranslationTaskFailureDisposition | null;
  readonly claimToken: string | null;
  readonly claimedAt: Date | null;
  readonly leaseExpiresAt: Date | null;
  readonly staleAt: Date | null;
  readonly completedAt: Date | null;
  readonly failedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface TranslationTaskKindReader {
  /** Returns the persisted discriminator without interpreting kind-specific task payload. */
  findKind(id: string): Promise<string | undefined>;
}

export interface ContentTopicTitleTranslationTaskStore {
  claimContentTopicTitle(
    id: string,
    leaseDurationMs: number,
  ): Promise<ContentTopicTitleTranslationTaskClaimResult>;
  markStale(id: string, claimToken: string): Promise<boolean>;
  isCurrentContentTopicTitleGeneration(task: ContentTopicTitleTranslationTask): Promise<boolean>;
}

export interface ContentPostBodyTranslationTaskStore {
  claimContentPostBody(
    id: string,
    leaseDurationMs: number,
  ): Promise<ContentPostBodyTranslationTaskClaimResult>;
  markStale(id: string, claimToken: string): Promise<boolean>;
  isCurrentContentPostBodyGeneration(task: ContentPostBodyTranslationTask): Promise<boolean>;
}

export interface TranslationTaskStore {
  upsertPending(specification: UiTranslationJobSpecification): Promise<TranslationTask>;
  findById(id: string): Promise<TranslationTask | undefined>;
  findByIdentity(taskIdentity: string): Promise<TranslationTask | undefined>;
  claim(id: string, leaseDurationMs: number): Promise<TranslationTaskClaimResult>;
  markStale(id: string, claimToken: string): Promise<boolean>;
  isCurrentGeneration(task: TranslationTask): Promise<boolean>;
}

export interface TranslationTaskFailureStore {
  recordFailure(
    id: string,
    claimToken: string,
    failure: TranslationFailureRecord,
  ): Promise<TranslationTaskFailureResult>;
}

export type TranslationTaskFailureResult =
  | {
      readonly outcome: "retry";
      readonly attemptCount: number;
      readonly maxAttempts: number;
    }
  | {
      readonly outcome: "terminal";
      readonly attemptCount: number;
      readonly maxAttempts: number;
      readonly disposition: TranslationTaskFailureDisposition;
    }
  | { readonly outcome: "claim-lost" };

export type TranslationTaskClaimResult =
  | {
      readonly outcome: "claimed";
      readonly task: TranslationTask & { readonly status: "processing"; readonly claimToken: string };
      /** False only when an exhausted lease is reclaimed solely to persist terminal state. */
      readonly attemptStarted: boolean;
    }
  | { readonly outcome: "not-found" | "already-claimed" | "terminal" };

export type ContentTopicTitleTranslationTaskClaimResult =
  | {
      readonly outcome: "claimed";
      readonly task: ContentTopicTitleTranslationTask & {
        readonly status: "processing";
        readonly claimToken: string;
      };
      /** False only when an exhausted lease is reclaimed solely to persist terminal state. */
      readonly attemptStarted: boolean;
    }
  | { readonly outcome: "not-found" | "already-claimed" | "terminal" };

export type ContentPostBodyTranslationTaskClaimResult =
  | {
      readonly outcome: "claimed";
      readonly task: ContentPostBodyTranslationTask & {
        readonly status: "processing";
        readonly claimToken: string;
      };
      /** False only when an exhausted lease is reclaimed solely to persist terminal state. */
      readonly attemptStarted: boolean;
    }
  | { readonly outcome: "not-found" | "already-claimed" | "terminal" };

export interface TranslationTaskMessage {
  readonly translationTaskId: string;
}

/** Transport-neutral enqueue boundary. Delivery may be duplicated or have an unknown outcome. */
export interface TranslationTaskEnqueuer {
  enqueue(message: TranslationTaskMessage): Promise<void>;
}

export class PersistentTranslationJobDispatcher implements TranslationJobDispatcher {
  constructor(
    private readonly tasks: TranslationTaskStore,
    private readonly enqueuer: TranslationTaskEnqueuer,
  ) {}

  async dispatch(jobs: readonly UiTranslationJobSpecification[]): Promise<void> {
    for (const job of jobs) {
      const task = await this.tasks.upsertPending(job);
      await this.enqueuer.enqueue({ translationTaskId: task.id });
    }
  }
}

/** Test adapter that records exactly the transport messages it was asked to enqueue. */
export class FakeTranslationTaskEnqueuer implements TranslationTaskEnqueuer {
  readonly messages: TranslationTaskMessage[] = [];

  constructor(private readonly enqueueEffect?: (message: TranslationTaskMessage) => void | Promise<void>) {}

  async enqueue(message: TranslationTaskMessage): Promise<void> {
    await this.enqueueEffect?.(message);
    this.messages.push({ translationTaskId: message.translationTaskId });
  }
}

export function validateContentTopicTitleTranslationTaskSpecification(
  specification: ContentTopicTitleTranslationTaskSpecification,
): void {
  if (specification.translationKind !== "content-topic-title") {
    throw new TypeError("content translation task kind must be content-topic-title");
  }
  requireSha256(specification.taskIdentity, "taskIdentity");
  requireSha256(specification.sourceFingerprint, "sourceFingerprint");
  requireNonBlank(specification.sourceIdentity.topicId, "topic id");
  requireNonBlank(specification.sourceIdentity.revisionId, "revision id");
  requireNonBlank(specification.generationPolicyVersion, "generationPolicyVersion");

  const revisionSourceLocale = strictCanonicalTranslationLocale(
    specification.revisionSourceLocale,
    true,
  );
  const resolvedSourceLocale = strictCanonicalTranslationLocale(
    specification.resolvedSourceLocale,
    false,
  );
  const targetLocale = strictCanonicalTranslationLocale(specification.targetLocale, false);
  if (!revisionSourceLocale || !resolvedSourceLocale || !targetLocale) {
    throw new TypeError("content translation task locales must be canonical translation locales");
  }
  if (resolvedSourceLocale === targetLocale) {
    throw new TypeError("content translation task target locale must differ from resolved source locale");
  }
  if (
    (specification.sourceResolutionOrigin === "revision-metadata"
      && (revisionSourceLocale === "und" || revisionSourceLocale !== resolvedSourceLocale))
    || (specification.sourceResolutionOrigin === "detector" && revisionSourceLocale !== "und")
    || (
      specification.sourceResolutionOrigin !== "revision-metadata"
      && specification.sourceResolutionOrigin !== "detector"
    )
  ) {
    throw new TypeError("content translation task source resolution is invalid");
  }
}


export function validateContentPostBodyTranslationTaskSpecification(
  specification: ContentPostBodyTranslationTaskSpecification,
): void {
  if (specification.translationKind !== "content-post-body") {
    throw new TypeError("content translation task kind must be content-post-body");
  }
  requireSha256(specification.taskIdentity, "taskIdentity");
  requireSha256(specification.sourceFingerprint, "sourceFingerprint");
  requireNonBlank(specification.sourceIdentity.postId, "post id");
  requireNonBlank(specification.sourceIdentity.revisionId, "revision id");
  requireNonBlank(specification.protectedContentPolicyVersion, "protectedContentPolicyVersion");
  requireNonBlank(specification.generationPolicyVersion, "generationPolicyVersion");

  const revisionSourceLocale = strictCanonicalTranslationLocale(
    specification.revisionSourceLocale,
    true,
  );
  const resolvedSourceLocale = strictCanonicalTranslationLocale(
    specification.resolvedSourceLocale,
    false,
  );
  const targetLocale = strictCanonicalTranslationLocale(specification.targetLocale, false);
  if (!revisionSourceLocale || !resolvedSourceLocale || !targetLocale) {
    throw new TypeError("content translation task locales must be canonical translation locales");
  }
  if (resolvedSourceLocale === targetLocale) {
    throw new TypeError("content translation task target locale must differ from resolved source locale");
  }
  if (
    (specification.sourceResolutionOrigin === "revision-metadata"
      && (revisionSourceLocale === "und" || revisionSourceLocale !== resolvedSourceLocale))
    || (specification.sourceResolutionOrigin === "detector" && revisionSourceLocale !== "und")
    || (
      specification.sourceResolutionOrigin !== "revision-metadata"
      && specification.sourceResolutionOrigin !== "detector"
    )
  ) {
    throw new TypeError("content translation task source resolution is invalid");
  }
}

export function validateUiTranslationJobSpecification(
  specification: UiTranslationJobSpecification,
): void {
  if (specification.translationKind !== "ui") {
    throw new TypeError("translation task kind must be ui");
  }
  requireSha256(specification.taskIdentity, "taskIdentity");
  requireSha256(specification.sourceFingerprint, "sourceFingerprint");
  requireNonBlank(specification.sourceIdentity.namespace, "source namespace");
  requireNonBlank(specification.sourceIdentity.key, "source key");
  requireNonBlank(specification.generationPolicyVersion, "generationPolicyVersion");

  const locale = parseLocaleCandidate(specification.targetLocale);
  if (
    !locale ||
    locale.canonicalInput !== locale.translationTag ||
    locale.translationTag === "en"
  ) {
    throw new TypeError("translation task targetLocale must be a canonical non-English translation locale");
  }
}

function strictCanonicalTranslationLocale(
  value: string,
  allowUnd: boolean,
): string | undefined {
  if (allowUnd && value === "und") return value;
  const parsed = parseLocaleCandidate(value);
  if (
    !parsed
    || parsed.canonicalInput !== value
    || parsed.translationTag !== value
    || (!allowUnd && parsed.translationTag === "und")
  ) {
    return undefined;
  }
  return parsed.translationTag;
}

function requireSha256(value: string, field: string): void {
  if (!/^[0-9a-f]{64}$/.test(value)) throw new TypeError(`${field} must be a lowercase SHA-256 digest`);
}

function requireNonBlank(value: string, field: string): void {
  if (!value.trim()) throw new TypeError(`${field} must not be blank`);
}
