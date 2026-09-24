import type {
  TranslationTaskEnqueuer,
  TranslationTaskStatus,
} from "./translation-tasks";

export type TranslationTaskReconciliationReason = "pending" | "expired-processing";

export interface TranslationTaskReconciliationCandidate {
  readonly id: string;
  readonly reason: TranslationTaskReconciliationReason;
}

export interface TranslationTaskReconciliationQuery {
  readonly limit: number;
  readonly pendingOlderThanMs: number;
}

export interface TranslationTaskObservabilitySnapshot {
  readonly counts: Readonly<Record<TranslationTaskStatus, number>>;
  readonly expiredProcessing: number;
}

export interface TranslationTaskReconciliationStore {
  listReconciliationCandidates(
    query: TranslationTaskReconciliationQuery,
  ): Promise<readonly TranslationTaskReconciliationCandidate[]>;

  observeTranslationTasks(): Promise<TranslationTaskObservabilitySnapshot>;
}

export interface TranslationTaskReconciliationResult {
  readonly selected: number;
  readonly enqueued: number;
  readonly pending: number;
  readonly expiredProcessing: number;
}

/**
 * Finds durable work that may have lost its transport delivery and safely asks the
 * transport-neutral enqueuer to deliver it again. Duplicate enqueue is intentionally safe.
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
    const candidates = await this.tasks.listReconciliationCandidates(query);

    let pending = 0;
    let expiredProcessing = 0;
    let enqueued = 0;

    for (const candidate of candidates) {
      if (candidate.reason === "pending") pending += 1;
      else expiredProcessing += 1;

      await this.enqueuer.enqueue({ translationTaskId: candidate.id });
      enqueued += 1;
    }

    return {
      selected: candidates.length,
      enqueued,
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
  if (!Number.isSafeInteger(query.limit) || query.limit <= 0) {
    throw new TypeError("translation task reconciliation limit must be a positive integer");
  }
  if (!Number.isSafeInteger(query.pendingOlderThanMs) || query.pendingOlderThanMs < 0) {
    throw new TypeError("translation task pending age must be a non-negative integer");
  }
}
