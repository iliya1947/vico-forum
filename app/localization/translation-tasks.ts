import { parseLocaleCandidate } from "./locale";
import type { TranslationFailureRecord } from "./translation-failures";
import type {
  TranslationJobDispatcher,
  UiTranslationJobSpecification,
} from "./ui-translation-service";

export const DEFAULT_TRANSLATION_TASK_MAX_ATTEMPTS = 3;

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
  | { readonly outcome: "claimed"; readonly task: TranslationTask & { readonly status: "processing"; readonly claimToken: string } }
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

function requireSha256(value: string, field: string): void {
  if (!/^[0-9a-f]{64}$/.test(value)) throw new TypeError(`${field} must be a lowercase SHA-256 digest`);
}

function requireNonBlank(value: string, field: string): void {
  if (!value.trim()) throw new TypeError(`${field} must not be blank`);
}
