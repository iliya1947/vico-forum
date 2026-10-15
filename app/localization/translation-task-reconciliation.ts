import type {
  TranslationTaskEnqueuer,
  TranslationTaskFailureDisposition,
  TranslationTaskStatus,
} from "./translation-tasks";

export const MAX_TRANSLATION_TASK_RECONCILIATION_BATCH_SIZE = 100;
export const TRANSLATION_TASK_RECONCILIATION_RETRY_AFTER_MS = 60_000;
export const MAX_TRANSLATION_TASK_FAILURE_GROUPS = 20;
export const MAX_TRANSLATION_TASK_ALLOWANCE_REASON_GROUPS = 20;

export type TranslationTaskReconciliationReason = "pending" | "expired-processing";

export interface TranslationTaskReconciliationCandidate {
  readonly id: string;
  readonly reason: TranslationTaskReconciliationReason;
}

export interface TranslationTaskReconciliationQuery {
  readonly limit: number;
  readonly pendingOlderThanMs: number;
}

export interface TranslationTaskFailureSummary {
  readonly disposition: TranslationTaskFailureDisposition;
  readonly code: string;
  readonly count: number;
}

export interface TranslationTaskAllowanceReasonSummary {
  readonly reason: string;
  readonly count: number;
}

export interface TranslationTaskObservabilitySnapshot {
  readonly counts: Readonly<Record<TranslationTaskStatus, number>>;
  readonly pending: {
    readonly oldestAgeMs: number | null;
    readonly unattempted: number;
    readonly retryReleased: number;
  };
  readonly processing: {
    readonly live: number;
    readonly expired: number;
    readonly oldestClaimAgeMs: number | null;
    readonly oldestExpiredLeaseAgeMs: number | null;
    readonly withAttemptsRemaining: number;
    readonly atAttemptBudget: number;
  };
  readonly failed: {
    readonly terminal: number;
    readonly retryExhausted: number;
    readonly failureGroupCount: number;
    readonly groups: readonly TranslationTaskFailureSummary[];
  };
  readonly allowance: {
    readonly leasing: number;
    readonly admitted: number;
    readonly deferred: number;
    readonly deferredWaiting: number;
    readonly deferredReady: number;
    readonly oldestDeferredAgeMs: number | null;
    readonly earliestRetryInMs: number | null;
    readonly reasonGroupCount: number;
    readonly reasons: readonly TranslationTaskAllowanceReasonSummary[];
  };
}

export interface TranslationTaskReconciliationStore {
  reserveReconciliationCandidates(
    query: TranslationTaskReconciliationQuery,
  ): Promise<readonly TranslationTaskReconciliationCandidate[]>;

  observeTranslationTasks(): Promise<TranslationTaskObservabilitySnapshot>;
}

export interface TranslationTaskReconciliationResult {
  readonly outcome: "complete" | "partial-failure";
  readonly selected: number;
  readonly enqueued: number;
  readonly enqueueFailures: number;
  readonly pending: number;
  readonly expiredProcessing: number;
}

/**
 * Reserves durable recovery candidates and asks the transport-neutral enqueuer to deliver
 * each task id. Reservation progress is durable, so repeated/concurrent runs can move through
 * a backlog even when enqueue outcomes are duplicated, unknown, or partially failing.
 */
export class TranslationTaskReconciler {
  constructor(
    private readonly tasks: TranslationTaskReconciliationStore,
    private readonly enqueuer: TranslationTaskEnqueuer,
  ) {}

  async reconcile(
    query: TranslationTaskReconciliationQuery,
  ): Promise<TranslationTaskReconciliationResult> {
    validateTranslationTaskReconciliationQuery(query);
    const candidates = await this.tasks.reserveReconciliationCandidates(query);

    let pending = 0;
    let expiredProcessing = 0;
    let enqueued = 0;
    let enqueueFailures = 0;

    for (const candidate of candidates) {
      if (candidate.reason === "pending") pending += 1;
      else expiredProcessing += 1;

      try {
        await this.enqueuer.enqueue({ translationTaskId: candidate.id });
        enqueued += 1;
      } catch {
        enqueueFailures += 1;
      }
    }

    return {
      outcome: enqueueFailures === 0 ? "complete" : "partial-failure",
      selected: candidates.length,
      enqueued,
      enqueueFailures,
      pending,
      expiredProcessing,
    };
  }

  observe(): Promise<TranslationTaskObservabilitySnapshot> {
    return this.tasks.observeTranslationTasks();
  }
}

export function validateTranslationTaskReconciliationQuery(
  query: TranslationTaskReconciliationQuery,
): void {
  if (
    !Number.isSafeInteger(query.limit) ||
    query.limit <= 0 ||
    query.limit > MAX_TRANSLATION_TASK_RECONCILIATION_BATCH_SIZE
  ) {
    throw new TypeError(
      `translation task reconciliation limit must be an integer from 1 to ${MAX_TRANSLATION_TASK_RECONCILIATION_BATCH_SIZE}`,
    );
  }
  if (!Number.isSafeInteger(query.pendingOlderThanMs) || query.pendingOlderThanMs < 0) {
    throw new TypeError("translation task pending age must be a non-negative integer");
  }
}
