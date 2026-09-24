import { and, eq, gte, lt, lte, or, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { TranslationFailureRecord } from "../app/localization/translation-failures";
import {
  MAX_TRANSLATION_TASK_FAILURE_GROUPS,
  TRANSLATION_TASK_RECONCILIATION_RETRY_AFTER_MS,
  validateTranslationTaskReconciliationQuery,
  type TranslationTaskFailureSummary,
  type TranslationTaskObservabilitySnapshot,
  type TranslationTaskReconciliationCandidate,
  type TranslationTaskReconciliationQuery,
  type TranslationTaskReconciliationStore,
} from "../app/localization/translation-task-reconciliation";
import {
  DEFAULT_TRANSLATION_TASK_MAX_ATTEMPTS,
  validateUiTranslationJobSpecification,
  type TranslationTask,
  type TranslationTaskClaimResult,
  type TranslationTaskFailureResult,
  type TranslationTaskFailureStore,
  type TranslationTaskStore,
} from "../app/localization/translation-tasks";
import {
  uiTranslationJobIdentity,
  type UiTranslationJobSpecification,
} from "../app/localization/ui-translation-service";
import { translationTaskGenerationHeads, translationTasks } from "./schema";

const uiTranslationTaskColumns = {
  id: translationTasks.id,
  taskIdentity: translationTasks.taskIdentity,
  translationKind: translationTasks.translationKind,
  sourceNamespace: translationTasks.sourceNamespace,
  sourceKey: translationTasks.sourceKey,
  sourceFingerprint: translationTasks.sourceFingerprint,
  targetLocale: translationTasks.targetLocale,
  generationPolicyVersion: translationTasks.generationPolicyVersion,
  generation: translationTasks.generation,
  status: translationTasks.status,
  attemptCount: translationTasks.attemptCount,
  maxAttempts: translationTasks.maxAttempts,
  lastFailureCode: translationTasks.lastFailureCode,
  failureDisposition: translationTasks.failureDisposition,
  claimToken: translationTasks.claimToken,
  claimedAt: translationTasks.claimedAt,
  leaseExpiresAt: translationTasks.leaseExpiresAt,
  staleAt: translationTasks.staleAt,
  completedAt: translationTasks.completedAt,
  failedAt: translationTasks.failedAt,
  createdAt: translationTasks.createdAt,
  updatedAt: translationTasks.updatedAt,
} as const;

type TranslationTaskRow = Pick<
  typeof translationTasks.$inferSelect,
  | "id"
  | "taskIdentity"
  | "translationKind"
  | "sourceNamespace"
  | "sourceKey"
  | "sourceFingerprint"
  | "targetLocale"
  | "generationPolicyVersion"
  | "generation"
  | "status"
  | "attemptCount"
  | "maxAttempts"
  | "lastFailureCode"
  | "failureDisposition"
  | "claimToken"
  | "claimedAt"
  | "leaseExpiresAt"
  | "staleAt"
  | "completedAt"
  | "failedAt"
  | "createdAt"
  | "updatedAt"
>;

export class TranslationTaskIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranslationTaskIntegrityError";
  }
}

export class DrizzleTranslationTaskStore implements TranslationTaskStore, TranslationTaskFailureStore, TranslationTaskReconciliationStore {
  constructor(private readonly database: NodePgDatabase) {}

  async upsertPending(specification: UiTranslationJobSpecification): Promise<TranslationTask> {
    validateUiTranslationJobSpecification(specification);
    await assertStableIdentity(specification);
    return this.database.transaction(async (transaction) => {
      const unit = unitValues(specification);
      const insertedHead = await transaction.insert(translationTaskGenerationHeads).values({
        ...unit,
        currentGeneration: 1,
      }).onConflictDoNothing().returning({ currentGeneration: translationTaskGenerationHeads.currentGeneration });

      // The head row is the serialization point shared with publication. Re-read the stable
      // identity only after taking this lock so same- and different-identity races are ordered.
      const locked = await transaction.execute<{ current_generation: number }>(sql`
        select current_generation
          from ${translationTaskGenerationHeads}
         where ${translationTaskGenerationHeads.translationKind} = ${unit.translationKind}
           and ${translationTaskGenerationHeads.sourceNamespace} = ${unit.sourceNamespace}
           and ${translationTaskGenerationHeads.sourceKey} = ${unit.sourceKey}
           and ${translationTaskGenerationHeads.targetLocale} = ${unit.targetLocale}
         for update
      `);
      const currentGeneration = locked.rows[0]?.current_generation;
      if (!Number.isSafeInteger(currentGeneration) || currentGeneration! <= 0) {
        throw new TranslationTaskIntegrityError("translation generation head is missing or invalid");
      }
      const existingRows = await transaction.select(uiTranslationTaskColumns)
      .from(translationTasks)
        .where(and(
          eq(translationTasks.translationKind, "ui"),
          eq(translationTasks.taskIdentity, specification.taskIdentity),
        )).limit(1);
      if (existingRows[0]) {
        const existing = await parseTaskRow(existingRows[0]);
        assertMatchesSpecification(existing, specification);
        if (existing.status !== "stale") return existing;

        const databaseNow = sql`statement_timestamp()`;
        const generation =
          existing.generation === currentGeneration ? currentGeneration : currentGeneration + 1;
        const reactivated = await transaction.update(translationTasks).set({
          generation,
          status: "pending",
          attemptCount: 0,
          maxAttempts: DEFAULT_TRANSLATION_TASK_MAX_ATTEMPTS,
          lastFailureCode: null,
          failureDisposition: null,
          reconciliationAttemptedAt: null,
          claimToken: null,
          claimedAt: null,
          leaseExpiresAt: null,
          staleAt: null,
          completedAt: null,
          failedAt: null,
          updatedAt: databaseNow,
        }).where(and(eq(translationTasks.id, existing.id), eq(translationTasks.status, "stale"))).returning(uiTranslationTaskColumns);

        if (generation !== currentGeneration) {
          await transaction.update(translationTaskGenerationHeads).set({
            currentGeneration: generation,
            updatedAt: databaseNow,
          }).where(unitCondition(unit));
        }
        return parseTaskRow(requiredRow(reactivated[0]));
      }

      const generation = insertedHead.length === 1 ? currentGeneration : currentGeneration + 1;
      const rows = await transaction.insert(translationTasks).values({
        taskIdentity: specification.taskIdentity,
        translationKind: specification.translationKind,
        sourceNamespace: specification.sourceIdentity.namespace,
        sourceKey: specification.sourceIdentity.key,
        sourceFingerprint: specification.sourceFingerprint,
        targetLocale: specification.targetLocale,
        generationPolicyVersion: specification.generationPolicyVersion,
        generation,
        status: "pending",
        attemptCount: 0,
        maxAttempts: DEFAULT_TRANSLATION_TASK_MAX_ATTEMPTS,
      }).returning(uiTranslationTaskColumns);
      if (generation !== currentGeneration) {
        await transaction.update(translationTaskGenerationHeads).set({
          currentGeneration: generation,
          updatedAt: sql`statement_timestamp()`,
        }).where(unitCondition(unit));
      }

      const task = await parseTaskRow(requiredRow(rows[0]));
      assertMatchesSpecification(task, specification);
      return task;
    });
  }

  async findById(id: string): Promise<TranslationTask | undefined> {
    if (!isUuid(id)) throw new TypeError("translation task id must be a UUID");
    const rows = await this.database
      .select(uiTranslationTaskColumns)
      .from(translationTasks)
      .where(and(
        eq(translationTasks.translationKind, "ui"),
        eq(translationTasks.id, id),
      ))
      .limit(1);
    return rows[0] ? await parseTaskRow(rows[0]) : undefined;
  }

  async findByIdentity(taskIdentity: string): Promise<TranslationTask | undefined> {
    if (!/^[0-9a-f]{64}$/.test(taskIdentity)) {
      throw new TypeError("taskIdentity must be a lowercase SHA-256 digest");
    }
    const rows = await this.database
      .select(uiTranslationTaskColumns)
      .from(translationTasks)
      .where(and(
        eq(translationTasks.translationKind, "ui"),
        eq(translationTasks.taskIdentity, taskIdentity),
      ))
      .limit(1);
    return rows[0] ? await parseTaskRow(rows[0]) : undefined;
  }

  async reserveReconciliationCandidates(
    query: TranslationTaskReconciliationQuery,
  ): Promise<readonly TranslationTaskReconciliationCandidate[]> {
    validateTranslationTaskReconciliationQuery(query);
    const rows = await this.database.transaction(async (transaction) => {
      const result = await transaction.execute<{ id: string; status: string }>(sql`
        with candidates as (
          select ${translationTasks.id} as id, ${translationTasks.status} as status
            from ${translationTasks}
           where ${translationTasks.translationKind} = 'ui'
             and (
             (
               ${translationTasks.status} = 'pending'
               and ${translationTasks.updatedAt} <= statement_timestamp()
                 - (${query.pendingOlderThanMs}::double precision * interval '1 millisecond')
             )
             or (
               ${translationTasks.status} = 'processing'
               and ${translationTasks.leaseExpiresAt} <= statement_timestamp()
             )
           )
             and (
               ${translationTasks.reconciliationAttemptedAt} is null
               or ${translationTasks.reconciliationAttemptedAt} <= statement_timestamp()
                 - (${TRANSLATION_TASK_RECONCILIATION_RETRY_AFTER_MS}::double precision * interval '1 millisecond')
             )
           order by ${translationTasks.reconciliationAttemptedAt} asc nulls first,
                    ${translationTasks.updatedAt} asc,
                    ${translationTasks.id} asc
           for update skip locked
           limit ${query.limit}
        )
        update ${translationTasks} as task
           set reconciliation_attempted_at = statement_timestamp()
          from candidates
         where task.id = candidates.id
           and task.translation_kind = 'ui'
        returning task.id, candidates.status
      `);
      return result.rows;
    });

    return rows.map((row) => {
      if (row.status === "pending") return { id: row.id, reason: "pending" as const };
      if (row.status === "processing") return { id: row.id, reason: "expired-processing" as const };
      throw new TranslationTaskIntegrityError("reconciliation reservation returned a non-recoverable task");
    });
  }

  async observeTranslationTasks(): Promise<TranslationTaskObservabilitySnapshot> {
    const aggregate = await this.database.execute<{
      pending: number;
      processing: number;
      stale: number;
      completed: number;
      failed: number;
      oldest_pending_age_ms: number | null;
      pending_unattempted: number;
      pending_retry_released: number;
      processing_live: number;
      processing_expired: number;
      oldest_processing_claim_age_ms: number | null;
      oldest_expired_lease_age_ms: number | null;
      processing_with_attempts_remaining: number;
      processing_at_attempt_budget: number;
      failed_terminal: number;
      failed_retry_exhausted: number;
      failure_group_count: number;
    }>(sql`
      select
        (count(*) filter (where ${translationTasks.status} = 'pending'))::integer as pending,
        (count(*) filter (where ${translationTasks.status} = 'processing'))::integer as processing,
        (count(*) filter (where ${translationTasks.status} = 'stale'))::integer as stale,
        (count(*) filter (where ${translationTasks.status} = 'completed'))::integer as completed,
        (count(*) filter (where ${translationTasks.status} = 'failed'))::integer as failed,
        (
          max(greatest(0, extract(epoch from (statement_timestamp() - ${translationTasks.updatedAt})) * 1000))
          filter (where ${translationTasks.status} = 'pending')
        )::double precision as oldest_pending_age_ms,
        (
          count(*) filter (
            where ${translationTasks.status} = 'pending' and ${translationTasks.attemptCount} = 0
          )
        )::integer as pending_unattempted,
        (
          count(*) filter (
            where ${translationTasks.status} = 'pending' and ${translationTasks.attemptCount} > 0
          )
        )::integer as pending_retry_released,
        (
          count(*) filter (
            where ${translationTasks.status} = 'processing'
              and ${translationTasks.leaseExpiresAt} > statement_timestamp()
          )
        )::integer as processing_live,
        (
          count(*) filter (
            where ${translationTasks.status} = 'processing'
              and ${translationTasks.leaseExpiresAt} <= statement_timestamp()
          )
        )::integer as processing_expired,
        (
          max(greatest(0, extract(epoch from (statement_timestamp() - ${translationTasks.claimedAt})) * 1000))
          filter (where ${translationTasks.status} = 'processing')
        )::double precision as oldest_processing_claim_age_ms,
        (
          max(greatest(0, extract(epoch from (statement_timestamp() - ${translationTasks.leaseExpiresAt})) * 1000))
          filter (
            where ${translationTasks.status} = 'processing'
              and ${translationTasks.leaseExpiresAt} <= statement_timestamp()
          )
        )::double precision as oldest_expired_lease_age_ms,
        (
          count(*) filter (
            where ${translationTasks.status} = 'processing'
              and ${translationTasks.attemptCount} < ${translationTasks.maxAttempts}
          )
        )::integer as processing_with_attempts_remaining,
        (
          count(*) filter (
            where ${translationTasks.status} = 'processing'
              and ${translationTasks.attemptCount} >= ${translationTasks.maxAttempts}
          )
        )::integer as processing_at_attempt_budget,
        (
          count(*) filter (
            where ${translationTasks.status} = 'failed'
              and ${translationTasks.failureDisposition} = 'terminal'
          )
        )::integer as failed_terminal,
        (
          count(*) filter (
            where ${translationTasks.status} = 'failed'
              and ${translationTasks.failureDisposition} = 'retry-exhausted'
          )
        )::integer as failed_retry_exhausted,
        (
          count(distinct (${translationTasks.failureDisposition}, ${translationTasks.lastFailureCode}))
          filter (where ${translationTasks.status} = 'failed')
        )::integer as failure_group_count
      from ${translationTasks}
      where ${translationTasks.translationKind} = 'ui'
    `);
    const row = aggregate.rows[0];
    if (
      !row ||
      !nonNegativeInteger(row.pending) ||
      !nonNegativeInteger(row.processing) ||
      !nonNegativeInteger(row.stale) ||
      !nonNegativeInteger(row.completed) ||
      !nonNegativeInteger(row.failed) ||
      !nullableNonNegativeNumber(row.oldest_pending_age_ms) ||
      !nonNegativeInteger(row.pending_unattempted) ||
      !nonNegativeInteger(row.pending_retry_released) ||
      !nonNegativeInteger(row.processing_live) ||
      !nonNegativeInteger(row.processing_expired) ||
      !nullableNonNegativeNumber(row.oldest_processing_claim_age_ms) ||
      !nullableNonNegativeNumber(row.oldest_expired_lease_age_ms) ||
      !nonNegativeInteger(row.processing_with_attempts_remaining) ||
      !nonNegativeInteger(row.processing_at_attempt_budget) ||
      !nonNegativeInteger(row.failed_terminal) ||
      !nonNegativeInteger(row.failed_retry_exhausted) ||
      !nonNegativeInteger(row.failure_group_count)
    ) {
      throw new TranslationTaskIntegrityError("translation task observability query returned invalid aggregates");
    }

    const grouped = await this.database.execute<{
      failure_disposition: string;
      last_failure_code: string;
      count: number;
    }>(sql`
      select
        ${translationTasks.failureDisposition} as failure_disposition,
        ${translationTasks.lastFailureCode} as last_failure_code,
        count(*)::integer as count
      from ${translationTasks}
      where ${translationTasks.translationKind} = 'ui'
        and ${translationTasks.status} = 'failed'
      group by ${translationTasks.failureDisposition}, ${translationTasks.lastFailureCode}
      order by count(*) desc,
               ${translationTasks.failureDisposition} asc,
               ${translationTasks.lastFailureCode} asc
      limit ${MAX_TRANSLATION_TASK_FAILURE_GROUPS}
    `);
    const groups: TranslationTaskFailureSummary[] = grouped.rows.map((failure) => {
      if (
        (failure.failure_disposition !== "terminal" &&
          failure.failure_disposition !== "retry-exhausted") ||
        !/^[a-z0-9][a-z0-9-]{0,63}$/.test(failure.last_failure_code) ||
        !nonNegativeInteger(failure.count) ||
        failure.count === 0
      ) {
        throw new TranslationTaskIntegrityError("translation task observability query returned invalid failure group");
      }
      return {
        disposition: failure.failure_disposition,
        code: failure.last_failure_code,
        count: failure.count,
      };
    });

    return {
      counts: {
        pending: row.pending,
        processing: row.processing,
        stale: row.stale,
        completed: row.completed,
        failed: row.failed,
      },
      pending: {
        oldestAgeMs: row.oldest_pending_age_ms,
        unattempted: row.pending_unattempted,
        retryReleased: row.pending_retry_released,
      },
      processing: {
        live: row.processing_live,
        expired: row.processing_expired,
        oldestClaimAgeMs: row.oldest_processing_claim_age_ms,
        oldestExpiredLeaseAgeMs: row.oldest_expired_lease_age_ms,
        withAttemptsRemaining: row.processing_with_attempts_remaining,
        atAttemptBudget: row.processing_at_attempt_budget,
      },
      failed: {
        terminal: row.failed_terminal,
        retryExhausted: row.failed_retry_exhausted,
        failureGroupCount: row.failure_group_count,
        groups,
      },
    };
  }

  async claim(id: string, leaseDurationMs: number): Promise<TranslationTaskClaimResult> {
    if (!isUuid(id)) throw new TypeError("translation task id must be a UUID");
    if (!Number.isSafeInteger(leaseDurationMs) || leaseDurationMs <= 0) {
      throw new TypeError("translation task lease duration must be a positive integer");
    }
    const databaseNow = sql`statement_timestamp()`;
    const leaseExpiresAt = sql`${databaseNow} + (${leaseDurationMs}::double precision * interval '1 millisecond')`;
    const claimable = or(
      eq(translationTasks.status, "pending"),
      and(eq(translationTasks.status, "processing"), lte(translationTasks.leaseExpiresAt, databaseNow)),
    );

    const claimToken = crypto.randomUUID();
    const rows = await this.database
      .update(translationTasks)
      .set({
        status: "processing",
        claimToken,
        claimedAt: databaseNow,
        leaseExpiresAt,
        attemptCount: sql`${translationTasks.attemptCount} + 1`,
        updatedAt: databaseNow,
      })
      .where(and(
        eq(translationTasks.translationKind, "ui"),
        eq(translationTasks.id, id),
        claimable,
        lt(translationTasks.attemptCount, translationTasks.maxAttempts),
      ))
      .returning(uiTranslationTaskColumns);
    if (rows[0]) return claimedResult(rows[0], true);

    // A crashed final attempt may leave an expired processing lease with its budget already
    // consumed. Reclaim ownership without incrementing so the executor can persist terminal
    // retry-exhaustion under a fresh claim token without another provider call.
    const exhaustedClaimToken = crypto.randomUUID();
    const exhausted = await this.database
      .update(translationTasks)
      .set({
        status: "processing",
        claimToken: exhaustedClaimToken,
        claimedAt: databaseNow,
        leaseExpiresAt,
        updatedAt: databaseNow,
      })
      .where(and(
        eq(translationTasks.translationKind, "ui"),
        eq(translationTasks.id, id),
        eq(translationTasks.status, "processing"),
        lte(translationTasks.leaseExpiresAt, databaseNow),
        gte(translationTasks.attemptCount, translationTasks.maxAttempts),
      ))
      .returning(uiTranslationTaskColumns);
    if (exhausted[0]) return claimedResult(exhausted[0], false);

    const existing = await this.findById(id);
    if (!existing) return { outcome: "not-found" };
    return {
      outcome: existing.status === "stale" || existing.status === "completed" || existing.status === "failed"
        ? "terminal"
        : "already-claimed",
    };
  }

  async recordFailure(
    id: string,
    claimToken: string,
    failure: TranslationFailureRecord,
  ): Promise<TranslationTaskFailureResult> {
    if (!isUuid(id) || !isUuid(claimToken)) {
      throw new TypeError("translation task failure transition requires valid identifiers");
    }
    assertFailureRecord(failure);
    const databaseNow = sql`statement_timestamp()`;
    const currentClaim = and(
      eq(translationTasks.translationKind, "ui"),
      eq(translationTasks.id, id),
      eq(translationTasks.status, "processing"),
      eq(translationTasks.claimToken, claimToken),
    );

    const terminalCondition = failure.disposition === "terminal"
      ? currentClaim
      : and(currentClaim, gte(translationTasks.attemptCount, translationTasks.maxAttempts));
    const terminalDisposition = failure.code === "attempt-budget-exhausted" || failure.disposition === "retryable"
      ? "retry-exhausted"
      : "terminal";

    const failed = await this.database
      .update(translationTasks)
      .set({
        status: "failed",
        claimToken: null,
        leaseExpiresAt: null,
        staleAt: null,
        completedAt: null,
        lastFailureCode: failure.code,
        failureDisposition: terminalDisposition,
        failedAt: databaseNow,
        updatedAt: databaseNow,
      })
      .where(terminalCondition)
      .returning({
        attemptCount: translationTasks.attemptCount,
        maxAttempts: translationTasks.maxAttempts,
      });
    if (failed[0]) {
      return {
        outcome: "terminal",
        attemptCount: failed[0].attemptCount,
        maxAttempts: failed[0].maxAttempts,
        disposition: terminalDisposition,
      };
    }

    if (failure.disposition === "retryable") {
      const pending = await this.database
        .update(translationTasks)
        .set({
          status: "pending",
          claimToken: null,
          claimedAt: null,
          leaseExpiresAt: null,
          staleAt: null,
          completedAt: null,
          failedAt: null,
          lastFailureCode: failure.code,
          failureDisposition: null,
          reconciliationAttemptedAt: null,
          updatedAt: databaseNow,
        })
        .where(and(currentClaim, lt(translationTasks.attemptCount, translationTasks.maxAttempts)))
        .returning({
          attemptCount: translationTasks.attemptCount,
          maxAttempts: translationTasks.maxAttempts,
        });
      if (pending[0]) {
        return {
          outcome: "retry",
          attemptCount: pending[0].attemptCount,
          maxAttempts: pending[0].maxAttempts,
        };
      }
    }

    return { outcome: "claim-lost" };
  }

  async markStale(id: string, claimToken: string): Promise<boolean> {
    if (!isUuid(id) || !isUuid(claimToken)) {
      throw new TypeError("translation task stale transition requires valid identifiers");
    }
    const databaseNow = sql`statement_timestamp()`;
    const rows = await this.database
      .update(translationTasks)
      .set({
        status: "stale",
        claimToken: null,
        leaseExpiresAt: null,
        staleAt: databaseNow,
        completedAt: null,
        failedAt: null,
        lastFailureCode: null,
        failureDisposition: null,
        updatedAt: databaseNow,
      })
      .where(and(
        eq(translationTasks.translationKind, "ui"),
        eq(translationTasks.id, id),
        eq(translationTasks.status, "processing"),
        eq(translationTasks.claimToken, claimToken),
      ))
      .returning({ id: translationTasks.id });
    return rows.length === 1;
  }

  async isCurrentGeneration(task: TranslationTask): Promise<boolean> {
    const rows = await this.database.select({ currentGeneration: translationTaskGenerationHeads.currentGeneration })
      .from(translationTaskGenerationHeads).where(unitCondition({
        translationKind: task.translationKind,
        sourceNamespace: task.sourceIdentity.namespace,
        sourceKey: task.sourceIdentity.key,
        targetLocale: task.targetLocale,
      })).limit(1);
    return rows[0]?.currentGeneration === task.generation;
  }
}

async function claimedResult(
  row: TranslationTaskRow,
  attemptStarted: boolean,
): Promise<TranslationTaskClaimResult> {
  const task = await parseTaskRow(row);
  if (task.status !== "processing" || !task.claimToken) {
    throw new TranslationTaskIntegrityError("claimed translation task has invalid processing state");
  }
  return {
    outcome: "claimed",
    task: { ...task, status: "processing", claimToken: task.claimToken },
    attemptStarted,
  };
}

async function parseTaskRow(row: TranslationTaskRow): Promise<TranslationTask> {
  const task = {
    id: row.id,
    taskIdentity: row.taskIdentity,
    translationKind: row.translationKind as "ui",
    sourceIdentity: { namespace: row.sourceNamespace, key: row.sourceKey },
    sourceFingerprint: row.sourceFingerprint,
    targetLocale: row.targetLocale,
    generationPolicyVersion: row.generationPolicyVersion,
    generation: row.generation,
    status: row.status as TranslationTask["status"],
    attemptCount: row.attemptCount,
    maxAttempts: row.maxAttempts,
    lastFailureCode: row.lastFailureCode,
    failureDisposition: row.failureDisposition as TranslationTask["failureDisposition"],
    claimToken: row.claimToken,
    claimedAt: row.claimedAt,
    leaseExpiresAt: row.leaseExpiresAt,
    staleAt: row.staleAt,
    completedAt: row.completedAt,
    failedAt: row.failedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  validateUiTranslationJobSpecification({
    taskIdentity: task.taskIdentity,
    translationKind: task.translationKind as "ui",
    sourceIdentity: task.sourceIdentity,
    sourceFingerprint: task.sourceFingerprint,
    targetLocale: task.targetLocale,
    generationPolicyVersion: task.generationPolicyVersion,
  });
  await assertStableIdentity({
    taskIdentity: task.taskIdentity,
    translationKind: task.translationKind as "ui",
    sourceIdentity: task.sourceIdentity,
    sourceFingerprint: task.sourceFingerprint,
    targetLocale: task.targetLocale,
    generationPolicyVersion: task.generationPolicyVersion,
  });
  if (!isTaskStatus(task.status)) throw new TranslationTaskIntegrityError("invalid translation task status");
  if (!Number.isSafeInteger(task.generation) || task.generation <= 0) {
    throw new TranslationTaskIntegrityError("invalid translation task generation");
  }
  if (
    !Number.isSafeInteger(task.attemptCount) ||
    !Number.isSafeInteger(task.maxAttempts) ||
    task.attemptCount < 0 ||
    task.maxAttempts <= 0 ||
    task.attemptCount > task.maxAttempts
  ) {
    throw new TranslationTaskIntegrityError("invalid translation task attempt budget");
  }
  if (task.lastFailureCode !== null && !/^[a-z0-9][a-z0-9-]{0,63}$/.test(task.lastFailureCode)) {
    throw new TranslationTaskIntegrityError("invalid translation task failure code");
  }
  if (
    task.failureDisposition !== null &&
    task.failureDisposition !== "terminal" &&
    task.failureDisposition !== "retry-exhausted"
  ) {
    throw new TranslationTaskIntegrityError("invalid translation task failure disposition");
  }
  if (!isUuid(task.id) || !(task.createdAt instanceof Date) || !(task.updatedAt instanceof Date)) {
    throw new TranslationTaskIntegrityError("invalid translation task identity or timestamps");
  }
  if (task.updatedAt < task.createdAt) {
    throw new TranslationTaskIntegrityError("translation task updatedAt precedes createdAt");
  }
  assertLifecycle(task);
  return { ...task, translationKind: "ui", status: task.status };
}

type TranslationUnit = {
  translationKind: "ui";
  sourceNamespace: string;
  sourceKey: string;
  targetLocale: string;
};

function unitValues(specification: UiTranslationJobSpecification): TranslationUnit {
  return {
    translationKind: specification.translationKind,
    sourceNamespace: specification.sourceIdentity.namespace,
    sourceKey: specification.sourceIdentity.key,
    targetLocale: specification.targetLocale,
  };
}

function unitCondition(unit: TranslationUnit) {
  return and(
    eq(translationTaskGenerationHeads.translationKind, unit.translationKind),
    eq(translationTaskGenerationHeads.sourceNamespace, unit.sourceNamespace),
    eq(translationTaskGenerationHeads.sourceKey, unit.sourceKey),
    eq(translationTaskGenerationHeads.targetLocale, unit.targetLocale),
  );
}

function isTaskStatus(value: string): value is TranslationTask["status"] {
  return value === "pending" || value === "processing" || value === "stale" ||
    value === "completed" || value === "failed";
}

function assertLifecycle(task: TranslationTask): void {
  const processing = task.status === "processing" && task.claimToken && task.claimedAt &&
    task.leaseExpiresAt && !task.staleAt && !task.completedAt && !task.failedAt &&
    !task.failureDisposition && task.leaseExpiresAt > task.claimedAt;
  const pending = task.status === "pending" && !task.claimToken && !task.claimedAt &&
    !task.leaseExpiresAt && !task.staleAt && !task.completedAt && !task.failedAt &&
    !task.failureDisposition && task.attemptCount < task.maxAttempts;
  const stale = task.status === "stale" && !task.claimToken && task.claimedAt &&
    !task.leaseExpiresAt && task.staleAt && !task.completedAt && !task.failedAt &&
    !task.failureDisposition && !task.lastFailureCode && task.staleAt >= task.claimedAt;
  const completed = task.status === "completed" && !task.claimToken && task.claimedAt &&
    !task.leaseExpiresAt && !task.staleAt && task.completedAt && !task.failedAt &&
    !task.failureDisposition && !task.lastFailureCode && task.completedAt >= task.claimedAt;
  const failed = task.status === "failed" && !task.claimToken && task.claimedAt &&
    !task.leaseExpiresAt && !task.staleAt && !task.completedAt && task.failedAt &&
    task.failureDisposition && task.lastFailureCode && task.attemptCount > 0 &&
    task.failedAt >= task.claimedAt;
  if (!pending && !processing && !stale && !completed && !failed) {
    throw new TranslationTaskIntegrityError("invalid translation task lifecycle");
  }
}

async function assertStableIdentity(specification: UiTranslationJobSpecification): Promise<void> {
  if (await uiTranslationJobIdentity(specification) !== specification.taskIdentity) {
    throw new TranslationTaskIntegrityError("taskIdentity does not match the translation task data");
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function assertMatchesSpecification(
  task: TranslationTask,
  specification: UiTranslationJobSpecification,
): void {
  if (
    task.taskIdentity !== specification.taskIdentity ||
    task.translationKind !== specification.translationKind ||
    task.sourceIdentity.namespace !== specification.sourceIdentity.namespace ||
    task.sourceIdentity.key !== specification.sourceIdentity.key ||
    task.sourceFingerprint !== specification.sourceFingerprint ||
    task.targetLocale !== specification.targetLocale ||
    task.generationPolicyVersion !== specification.generationPolicyVersion
  ) {
    throw new TranslationTaskIntegrityError("stable task identity conflicts with different task data");
  }
}

function assertFailureRecord(failure: TranslationFailureRecord): void {
  if (failure.disposition !== "retryable" && failure.disposition !== "terminal") {
    throw new TypeError("translation failure disposition is invalid");
  }
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(failure.code)) {
    throw new TypeError("translation failure code is invalid");
  }
}

function nonNegativeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function nullableNonNegativeNumber(value: number | null): boolean {
  return value === null || (Number.isFinite(value) && value >= 0);
}

function requiredRow(row: TranslationTaskRow | undefined): TranslationTaskRow {
  if (!row) throw new TranslationTaskIntegrityError("translation task upsert returned no row");
  return row;
}
