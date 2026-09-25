import { and, eq, gte, lt, lte, or, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  TranslationExecutionFailure,
  type TranslationFailureRecord,
} from "../app/localization/translation-failures";
import type {
  ContentProviderAllowanceAcquireResult,
  ContentProviderAllowanceOccurrence,
  ContentProviderAllowanceStore,
} from "../app/localization/content-provider-allowance";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import {
  contentPostBodyTaskIdentity,
} from "../app/localization/content-post-body-planning";
import {
  contentTopicTitleSourceFingerprint,
  contentTopicTitleTaskIdentity,
} from "../app/localization/content-translation-planning";
import {
  MAX_TRANSLATION_TASK_ALLOWANCE_REASON_GROUPS,
  MAX_TRANSLATION_TASK_FAILURE_GROUPS,
  TRANSLATION_TASK_RECONCILIATION_RETRY_AFTER_MS,
  validateTranslationTaskReconciliationQuery,
  type TranslationTaskAllowanceReasonSummary,
  type TranslationTaskFailureSummary,
  type TranslationTaskObservabilitySnapshot,
  type TranslationTaskReconciliationCandidate,
  type TranslationTaskReconciliationQuery,
  type TranslationTaskReconciliationStore,
} from "../app/localization/translation-task-reconciliation";
import {
  DEFAULT_TRANSLATION_TASK_MAX_ATTEMPTS,
  validateContentPostBodyTranslationTaskSpecification,
  validateContentTopicTitleTranslationTaskSpecification,
  validateUiTranslationJobSpecification,
  type ContentPostBodyTranslationTask,
  type ContentPostBodyTranslationTaskClaimResult,
  type ContentPostBodyTranslationTaskStore,
  type ContentTopicTitleTranslationTask,
  type ContentTopicTitleTranslationTaskClaimResult,
  type ContentTopicTitleTranslationTaskStore,
  type TranslationTask,
  type TranslationTaskKind,
  type TranslationTaskKindReader,
  type TranslationTaskClaimResult,
  type TranslationTaskFailureResult,
  type TranslationTaskFailureStore,
  type TranslationTaskStore,
} from "../app/localization/translation-tasks";
import {
  uiTranslationJobIdentity,
  type UiTranslationJobSpecification,
} from "../app/localization/ui-translation-service";
import { isPostgresQueryTimeout } from "./postgres-deadlines";
import {
  contentPostBodyTranslationTasks,
  contentTopicTitleTranslationTasks,
  translationTaskGenerationHeads,
  translationTasks,
} from "./schema";

type TranslationTaskRow = typeof translationTasks.$inferSelect;
type ContentTopicTitleTaskRow = typeof contentTopicTitleTranslationTasks.$inferSelect;
type ContentPostBodyTaskRow = typeof contentPostBodyTranslationTasks.$inferSelect;

export class TranslationTaskIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranslationTaskIntegrityError";
  }
}

export class DrizzleTranslationTaskStore implements
  TranslationTaskStore,
  ContentTopicTitleTranslationTaskStore,
  ContentPostBodyTranslationTaskStore,
  TranslationTaskKindReader,
  TranslationTaskFailureStore,
  TranslationTaskReconciliationStore,
  ContentProviderAllowanceStore {
  constructor(private readonly database: NodePgDatabase) {}

  async findKind(id: string): Promise<string | undefined> {
    if (!isUuid(id)) throw new TypeError("translation task id must be a UUID");
    const [row] = await this.database
      .select({ translationKind: translationTasks.translationKind })
      .from(translationTasks)
      .where(eq(translationTasks.id, id))
      .limit(1);
    return row?.translationKind;
  }

  async acquireContentProviderAllowance(
    id: string,
    leaseDurationMs: number,
  ): Promise<ContentProviderAllowanceAcquireResult> {
    if (!isUuid(id)) throw new TypeError("translation task id must be a UUID");
    if (!Number.isSafeInteger(leaseDurationMs) || leaseDurationMs <= 0) {
      throw new TypeError("provider allowance lease duration must be a positive integer");
    }

    const initial = await this.database
      .select({
        translationKind: translationTasks.translationKind,
        sourceNamespace: translationTasks.sourceNamespace,
        sourceKey: translationTasks.sourceKey,
        targetLocale: translationTasks.targetLocale,
      })
      .from(translationTasks)
      .where(eq(translationTasks.id, id))
      .limit(1);
    const unit = initial[0];
    if (!unit) return { outcome: "not-found" };
    if (
      unit.translationKind !== "content-topic-title"
      && unit.translationKind !== "content-post-body"
    ) {
      throw new TranslationTaskKindMismatchError("content-topic-title", unit.translationKind as TranslationTaskKind);
    }

    return this.database.transaction(async (transaction) => {
      const databaseNow = sql`statement_timestamp()`;
      const head = await transaction.execute<{ current_generation: number }>(sql`
        select current_generation
          from ${translationTaskGenerationHeads}
         where ${translationTaskGenerationHeads.translationKind} = ${unit.translationKind}
           and ${translationTaskGenerationHeads.sourceNamespace} = ${unit.sourceNamespace}
           and ${translationTaskGenerationHeads.sourceKey} = ${unit.sourceKey}
           and ${translationTaskGenerationHeads.targetLocale} = ${unit.targetLocale}
         for update
      `);
      const currentGeneration = head.rows[0]?.current_generation;
      if (!Number.isSafeInteger(currentGeneration) || currentGeneration! <= 0) {
        throw new TranslationTaskIntegrityError("content allowance generation head is missing or invalid");
      }

      const rows = await transaction
        .select()
        .from(translationTasks)
        .where(eq(translationTasks.id, id))
        .for("update")
        .limit(1);
      const row = rows[0];
      if (!row) return { outcome: "not-found" as const };
      if (
        row.translationKind !== "content-topic-title"
        && row.translationKind !== "content-post-body"
      ) {
        throw new TranslationTaskIntegrityError("provider allowance task kind changed unexpectedly");
      }
      if (row.generation !== currentGeneration) {
        await markRowStaleWithoutAttempt(transaction, row.id);
        return { outcome: "terminal" as const };
      }
      if (row.status === "stale" || row.status === "completed" || row.status === "failed") {
        return { outcome: "terminal" as const };
      }

      const clock = await transaction.execute<{ now_ms: number | string }>(sql`
        select floor(extract(epoch from statement_timestamp()) * 1000)::bigint as now_ms
      `);
      const nowMs = typeof clock.rows[0]?.now_ms === "number"
        ? clock.rows[0].now_ms
        : Number(clock.rows[0]?.now_ms);
      if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
        throw new TranslationTaskIntegrityError("provider allowance database clock is invalid");
      }
      const now = new Date(nowMs);
      if (
        row.status === "processing"
        && row.leaseExpiresAt
        && row.leaseExpiresAt > now
      ) {
        return { outcome: "execution-in-progress" as const };
      }
      if (row.attemptCount >= row.maxAttempts) {
        return { outcome: "exhausted" as const };
      }

      const occurrence = {
        generation: row.generation,
        attempt: row.attemptCount + 1,
      };
      const task = await parseContentTaskForAllowance(transaction, row);

      if (
        row.allowanceState === "admitted"
        && row.allowanceGeneration === occurrence.generation
        && row.allowanceAttempt === occurrence.attempt
      ) {
        return { outcome: "admitted" as const, task, occurrence };
      }
      if (
        row.allowanceState === "leasing"
        && row.allowanceGeneration === occurrence.generation
        && row.allowanceAttempt === occurrence.attempt
        && row.allowanceLeaseExpiresAt
        && row.allowanceLeaseExpiresAt > now
      ) {
        return { outcome: "admission-in-progress" as const };
      }
      if (
        row.allowanceState === "deferred"
        && row.allowanceGeneration === occurrence.generation
        && row.allowanceAttempt === occurrence.attempt
        && row.allowanceRetryNotBefore
        && row.allowanceRetryNotBefore > now
        && row.allowanceReason
      ) {
        return {
          outcome: "deferred" as const,
          retryNotBefore: row.allowanceRetryNotBefore,
          reason: row.allowanceReason,
        };
      }

      const admissionToken = crypto.randomUUID();
      const leaseExpiresAt = sql`${databaseNow}
        + (${leaseDurationMs}::double precision * interval '1 millisecond')`;
      const leased = await transaction
        .update(translationTasks)
        .set({
          allowanceState: "leasing",
          allowanceGeneration: occurrence.generation,
          allowanceAttempt: occurrence.attempt,
          allowanceClaimToken: admissionToken,
          allowanceLeaseExpiresAt: leaseExpiresAt,
          allowanceRetryNotBefore: null,
          allowanceReason: null,
          allowanceReservationReference: null,
          allowanceUpdatedAt: databaseNow,
          updatedAt: databaseNow,
        })
        .where(and(
          eq(translationTasks.id, row.id),
          eq(translationTasks.generation, occurrence.generation),
          eq(translationTasks.attemptCount, occurrence.attempt - 1),
        ))
        .returning({ id: translationTasks.id });
      if (leased.length !== 1) return { outcome: "admission-in-progress" as const };

      return {
        outcome: "acquired" as const,
        task,
        occurrence,
        admissionToken,
      };
    });
  }

  async persistContentProviderAllowanceAdmission(
    id: string,
    admissionToken: string,
    occurrence: ContentProviderAllowanceOccurrence,
    reservationReference?: string,
  ): Promise<boolean> {
    if (!isUuid(id) || !isUuid(admissionToken)) {
      throw new TypeError("provider allowance admission identifiers must be UUIDs");
    }
    validateAllowanceOccurrence(occurrence);
    if (
      reservationReference !== undefined
      && !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(reservationReference)
    ) {
      throw new TypeError("provider allowance reservation reference is invalid");
    }
    const databaseNow = sql`statement_timestamp()`;
    const rows = await this.database
      .update(translationTasks)
      .set({
        allowanceState: "admitted",
        allowanceClaimToken: null,
        allowanceLeaseExpiresAt: null,
        allowanceRetryNotBefore: null,
        allowanceReason: null,
        allowanceReservationReference: reservationReference ?? null,
        allowanceUpdatedAt: databaseNow,
        updatedAt: databaseNow,
      })
      .where(and(
        eq(translationTasks.id, id),
        eq(translationTasks.allowanceState, "leasing"),
        eq(translationTasks.allowanceGeneration, occurrence.generation),
        eq(translationTasks.allowanceAttempt, occurrence.attempt),
        eq(translationTasks.allowanceClaimToken, admissionToken),
      ))
      .returning({ id: translationTasks.id });
    return rows.length === 1;
  }

  async persistContentProviderAllowanceDeferral(
    id: string,
    admissionToken: string,
    occurrence: ContentProviderAllowanceOccurrence,
    retryNotBefore: Date,
    reason: string,
  ): Promise<Date | undefined> {
    if (!isUuid(id) || !isUuid(admissionToken)) {
      throw new TypeError("provider allowance deferral identifiers must be UUIDs");
    }
    validateAllowanceOccurrence(occurrence);
    if (!(retryNotBefore instanceof Date) || !Number.isFinite(retryNotBefore.getTime())) {
      throw new TypeError("provider allowance retryNotBefore must be a valid Date");
    }
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(reason)) {
      throw new TypeError("provider allowance reason is invalid");
    }
    const databaseNow = sql`statement_timestamp()`;
    const persistedRetry = sql`greatest(
      ${retryNotBefore},
      ${databaseNow} + interval '1 millisecond'
    )`;
    const rows = await this.database
      .update(translationTasks)
      .set({
        allowanceState: "deferred",
        allowanceClaimToken: null,
        allowanceLeaseExpiresAt: null,
        allowanceRetryNotBefore: persistedRetry,
        allowanceReason: reason,
        allowanceReservationReference: null,
        allowanceUpdatedAt: databaseNow,
        reconciliationAttemptedAt: null,
        updatedAt: databaseNow,
      })
      .where(and(
        eq(translationTasks.id, id),
        eq(translationTasks.allowanceState, "leasing"),
        eq(translationTasks.allowanceGeneration, occurrence.generation),
        eq(translationTasks.allowanceAttempt, occurrence.attempt),
        eq(translationTasks.allowanceClaimToken, admissionToken),
      ))
      .returning({ retryNotBefore: translationTasks.allowanceRetryNotBefore });
    return rows[0]?.retryNotBefore ?? undefined;
  }

  async markContentTaskStaleFromAllowance(
    id: string,
    admissionToken: string,
  ): Promise<boolean> {
    if (!isUuid(id) || !isUuid(admissionToken)) {
      throw new TypeError("provider allowance stale transition identifiers must be UUIDs");
    }
    const databaseNow = sql`statement_timestamp()`;
    const rows = await this.database
      .update(translationTasks)
      .set({
        status: "stale",
        claimToken: null,
        claimedAt: sql`coalesce(${translationTasks.claimedAt}, ${databaseNow})`,
        leaseExpiresAt: null,
        staleAt: databaseNow,
        completedAt: null,
        failedAt: null,
        lastFailureCode: null,
        failureDisposition: null,
        ...clearAllowanceState(),
        updatedAt: databaseNow,
      })
      .where(and(
        eq(translationTasks.id, id),
        eq(translationTasks.allowanceState, "leasing"),
        eq(translationTasks.allowanceClaimToken, admissionToken),
      ))
      .returning({ id: translationTasks.id });
    return rows.length === 1;
  }

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
      const existingRows = await transaction.select().from(translationTasks)
        .where(eq(translationTasks.taskIdentity, specification.taskIdentity)).limit(1);
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
        }).where(and(eq(translationTasks.id, existing.id), eq(translationTasks.status, "stale"))).returning();

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
      }).returning();
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
      .select()
      .from(translationTasks)
      .where(eq(translationTasks.id, id))
      .limit(1);
    return rows[0] ? await parseTaskRow(rows[0]) : undefined;
  }

  async findByIdentity(taskIdentity: string): Promise<TranslationTask | undefined> {
    if (!/^[0-9a-f]{64}$/.test(taskIdentity)) {
      throw new TypeError("taskIdentity must be a lowercase SHA-256 digest");
    }
    const rows = await this.database
      .select()
      .from(translationTasks)
      .where(eq(translationTasks.taskIdentity, taskIdentity))
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
           where (
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
               ${translationTasks.allowanceState} is null
               or ${translationTasks.allowanceState} = 'admitted'
               or (
                 ${translationTasks.allowanceState} = 'deferred'
                 and ${translationTasks.allowanceRetryNotBefore} <= statement_timestamp()
               )
               or (
                 ${translationTasks.allowanceState} = 'leasing'
                 and ${translationTasks.allowanceLeaseExpiresAt} <= statement_timestamp()
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
      allowance_leasing: number;
      allowance_admitted: number;
      allowance_deferred: number;
      allowance_deferred_waiting: number;
      allowance_deferred_ready: number;
      oldest_deferred_age_ms: number | null;
      earliest_allowance_retry_in_ms: number | null;
      allowance_reason_group_count: number;
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
        )::integer as failure_group_count,
        (count(*) filter (where ${translationTasks.allowanceState} = 'leasing'))::integer
          as allowance_leasing,
        (count(*) filter (where ${translationTasks.allowanceState} = 'admitted'))::integer
          as allowance_admitted,
        (count(*) filter (where ${translationTasks.allowanceState} = 'deferred'))::integer
          as allowance_deferred,
        (
          count(*) filter (
            where ${translationTasks.allowanceState} = 'deferred'
              and ${translationTasks.allowanceRetryNotBefore} > statement_timestamp()
          )
        )::integer as allowance_deferred_waiting,
        (
          count(*) filter (
            where ${translationTasks.allowanceState} = 'deferred'
              and ${translationTasks.allowanceRetryNotBefore} <= statement_timestamp()
          )
        )::integer as allowance_deferred_ready,
        (
          max(greatest(
            0,
            extract(epoch from (statement_timestamp() - ${translationTasks.allowanceUpdatedAt})) * 1000
          ))
          filter (where ${translationTasks.allowanceState} = 'deferred')
        )::double precision as oldest_deferred_age_ms,
        (
          min(greatest(
            0,
            extract(epoch from (${translationTasks.allowanceRetryNotBefore} - statement_timestamp())) * 1000
          ))
          filter (
            where ${translationTasks.allowanceState} = 'deferred'
              and ${translationTasks.allowanceRetryNotBefore} > statement_timestamp()
          )
        )::double precision as earliest_allowance_retry_in_ms,
        (
          count(distinct ${translationTasks.allowanceReason})
          filter (where ${translationTasks.allowanceState} = 'deferred')
        )::integer as allowance_reason_group_count
      from ${translationTasks}
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
      !nonNegativeInteger(row.failure_group_count) ||
      !nonNegativeInteger(row.allowance_leasing) ||
      !nonNegativeInteger(row.allowance_admitted) ||
      !nonNegativeInteger(row.allowance_deferred) ||
      !nonNegativeInteger(row.allowance_deferred_waiting) ||
      !nonNegativeInteger(row.allowance_deferred_ready) ||
      !nullableNonNegativeNumber(row.oldest_deferred_age_ms) ||
      !nullableNonNegativeNumber(row.earliest_allowance_retry_in_ms) ||
      !nonNegativeInteger(row.allowance_reason_group_count)
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
      where ${translationTasks.status} = 'failed'
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

    const allowanceGrouped = await this.database.execute<{
      allowance_reason: string;
      count: number;
    }>(sql`
      select
        ${translationTasks.allowanceReason} as allowance_reason,
        count(*)::integer as count
      from ${translationTasks}
      where ${translationTasks.allowanceState} = 'deferred'
      group by ${translationTasks.allowanceReason}
      order by count(*) desc, ${translationTasks.allowanceReason} asc
      limit ${MAX_TRANSLATION_TASK_ALLOWANCE_REASON_GROUPS}
    `);
    const allowanceReasons: TranslationTaskAllowanceReasonSummary[] =
      allowanceGrouped.rows.map((reason) => {
        if (
          !/^[a-z0-9][a-z0-9-]{0,63}$/.test(reason.allowance_reason)
          || !nonNegativeInteger(reason.count)
          || reason.count === 0
        ) {
          throw new TranslationTaskIntegrityError(
            "translation allowance observability query returned invalid reason group",
          );
        }
        return { reason: reason.allowance_reason, count: reason.count };
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
      allowance: {
        leasing: row.allowance_leasing,
        admitted: row.allowance_admitted,
        deferred: row.allowance_deferred,
        deferredWaiting: row.allowance_deferred_waiting,
        deferredReady: row.allowance_deferred_ready,
        oldestDeferredAgeMs: row.oldest_deferred_age_ms,
        earliestRetryInMs: row.earliest_allowance_retry_in_ms,
        reasonGroupCount: row.allowance_reason_group_count,
        reasons: allowanceReasons,
      },
    };
  }

  async claim(id: string, leaseDurationMs: number): Promise<TranslationTaskClaimResult> {
    return this.database.transaction(async (tx) => {
      const claimed = await this.claimByKind(tx, id, leaseDurationMs, "ui");
      if (claimed.outcome !== "claimed") return claimed;
      return claimedUiResult(claimed.row, claimed.attemptStarted);
    });
  }

  async claimContentTopicTitle(
    id: string,
    leaseDurationMs: number,
  ): Promise<ContentTopicTitleTranslationTaskClaimResult> {
    return this.database.transaction(async (tx) => {
      const claimed = await this.claimByKind(tx, id, leaseDurationMs, "content-topic-title");
      if (claimed.outcome !== "claimed") return claimed;

      const [metadata] = await tx
        .select()
        .from(contentTopicTitleTranslationTasks)
        .where(eq(contentTopicTitleTranslationTasks.taskId, id))
        .limit(1);
      if (!metadata) {
        throw new TranslationTaskIntegrityError(
          "claimed content topic-title task is missing revision metadata",
        );
      }
      const task = await parseContentTopicTitleTaskRow(claimed.row, metadata);
      if (task.status !== "processing" || !task.claimToken) {
        throw new TranslationTaskIntegrityError(
          "claimed content topic-title task has invalid processing state",
        );
      }
      return {
        outcome: "claimed",
        task: { ...task, status: "processing", claimToken: task.claimToken },
        attemptStarted: claimed.attemptStarted,
      };
    });
  }

  async claimContentPostBody(
    id: string,
    leaseDurationMs: number,
  ): Promise<ContentPostBodyTranslationTaskClaimResult> {
    return this.database.transaction(async (tx) => {
      const claimed = await this.claimByKind(tx, id, leaseDurationMs, "content-post-body");
      if (claimed.outcome !== "claimed") return claimed;

      const [metadata] = await tx
        .select()
        .from(contentPostBodyTranslationTasks)
        .where(eq(contentPostBodyTranslationTasks.taskId, id))
        .limit(1);
      if (!metadata) {
        throw new TranslationTaskIntegrityError(
          "claimed content post-body task is missing revision metadata",
        );
      }
      const task = await parseContentPostBodyTaskRow(claimed.row, metadata);
      if (task.status !== "processing" || !task.claimToken) {
        throw new TranslationTaskIntegrityError(
          "claimed content post-body task has invalid processing state",
        );
      }
      return {
        outcome: "claimed",
        task: { ...task, status: "processing", claimToken: task.claimToken },
        attemptStarted: claimed.attemptStarted,
      };
    });
  }

  private async claimByKind(
    database: TranslationTaskTransaction,
    id: string,
    leaseDurationMs: number,
    expectedKind: TranslationTaskKind,
  ): Promise<RawTranslationTaskClaimResult> {
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

    const allowanceCondition = expectedKind === "ui"
      ? sql`true`
      : and(
          eq(translationTasks.allowanceState, "admitted"),
          eq(translationTasks.allowanceGeneration, translationTasks.generation),
          eq(
            translationTasks.allowanceAttempt,
            sql`${translationTasks.attemptCount} + 1`,
          ),
        );
    const claimToken = crypto.randomUUID();
    const rows = await database
      .update(translationTasks)
      .set({
        status: "processing",
        claimToken,
        claimedAt: databaseNow,
        leaseExpiresAt,
        attemptCount: sql`${translationTasks.attemptCount} + 1`,
        ...clearAllowanceState(),
        updatedAt: databaseNow,
      })
      .where(and(
        eq(translationTasks.id, id),
        eq(translationTasks.translationKind, expectedKind),
        claimable,
        lt(translationTasks.attemptCount, translationTasks.maxAttempts),
        allowanceCondition,
      ))
      .returning();
    if (rows[0]) {
      return { outcome: "claimed", row: rows[0], attemptStarted: true };
    }

    // A crashed final attempt may leave an expired processing lease with its budget already
    // consumed. Reclaim ownership without incrementing so the executor can persist terminal
    // retry-exhaustion under a fresh claim token without another provider call.
    const exhaustedClaimToken = crypto.randomUUID();
    const exhausted = await database
      .update(translationTasks)
      .set({
        status: "processing",
        claimToken: exhaustedClaimToken,
        claimedAt: databaseNow,
        leaseExpiresAt,
        ...clearAllowanceState(),
        updatedAt: databaseNow,
      })
      .where(and(
        eq(translationTasks.id, id),
        eq(translationTasks.translationKind, expectedKind),
        eq(translationTasks.status, "processing"),
        lte(translationTasks.leaseExpiresAt, databaseNow),
        gte(translationTasks.attemptCount, translationTasks.maxAttempts),
      ))
      .returning();
    if (exhausted[0]) {
      return { outcome: "claimed", row: exhausted[0], attemptStarted: false };
    }

    const [existing] = await database
      .select({
        translationKind: translationTasks.translationKind,
        status: translationTasks.status,
      })
      .from(translationTasks)
      .where(eq(translationTasks.id, id))
      .limit(1);
    if (!existing) return { outcome: "not-found" };
    if (!isTranslationTaskKind(existing.translationKind)) {
      throw new TranslationTaskIntegrityError("stored translation task kind is invalid");
    }
    if (existing.translationKind !== expectedKind) {
      throw new TranslationTaskKindMismatchError(expectedKind, existing.translationKind);
    }
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
        ...clearAllowanceState(),
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
          ...clearAllowanceState(),
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
        ...clearAllowanceState(),
        updatedAt: databaseNow,
      })
      .where(and(
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

  async isCurrentContentTopicTitleGeneration(
    task: ContentTopicTitleTranslationTask,
  ): Promise<boolean> {
    try {
      const rows = await this.database
        .select({ currentGeneration: translationTaskGenerationHeads.currentGeneration })
        .from(translationTaskGenerationHeads)
        .where(unitCondition({
          translationKind: task.translationKind,
          sourceNamespace: "topic-title",
          sourceKey: task.sourceIdentity.topicId,
          targetLocale: task.targetLocale,
        }))
        .limit(1);
      return rows[0]?.currentGeneration === task.generation;
    } catch (error) {
      if (isTaskStoreAvailabilityFailure(error)) {
        throw new TranslationExecutionFailure(
          "retryable",
          "dependency-temporary",
          "content translation generation state unavailable",
        );
      }
      throw error;
    }
  }

  async isCurrentContentPostBodyGeneration(
    task: ContentPostBodyTranslationTask,
  ): Promise<boolean> {
    try {
      const rows = await this.database
        .select({ currentGeneration: translationTaskGenerationHeads.currentGeneration })
        .from(translationTaskGenerationHeads)
        .where(unitCondition({
          translationKind: task.translationKind,
          sourceNamespace: "post-body",
          sourceKey: task.sourceIdentity.postId,
          targetLocale: task.targetLocale,
        }))
        .limit(1);
      return rows[0]?.currentGeneration === task.generation;
    } catch (error) {
      if (isTaskStoreAvailabilityFailure(error)) {
        throw new TranslationExecutionFailure(
          "retryable",
          "dependency-temporary",
          "content translation generation state unavailable",
        );
      }
      throw error;
    }
  }
}

type TranslationTaskTransaction =
  Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0];

function clearAllowanceState() {
  return {
    allowanceState: null,
    allowanceGeneration: null,
    allowanceAttempt: null,
    allowanceClaimToken: null,
    allowanceLeaseExpiresAt: null,
    allowanceRetryNotBefore: null,
    allowanceReason: null,
    allowanceReservationReference: null,
    allowanceUpdatedAt: null,
  } as const;
}

function validateAllowanceOccurrence(
  occurrence: ContentProviderAllowanceOccurrence,
): void {
  if (
    !Number.isSafeInteger(occurrence.generation)
    || occurrence.generation <= 0
    || !Number.isSafeInteger(occurrence.attempt)
    || occurrence.attempt <= 0
  ) {
    throw new TypeError("provider allowance occurrence is invalid");
  }
}

async function markRowStaleWithoutAttempt(
  transaction: TranslationTaskTransaction,
  id: string,
): Promise<void> {
  const databaseNow = sql`statement_timestamp()`;
  await transaction
    .update(translationTasks)
    .set({
      status: "stale",
      claimToken: null,
      claimedAt: sql`coalesce(${translationTasks.claimedAt}, ${databaseNow})`,
      leaseExpiresAt: null,
      staleAt: databaseNow,
      completedAt: null,
      failedAt: null,
      lastFailureCode: null,
      failureDisposition: null,
      ...clearAllowanceState(),
      updatedAt: databaseNow,
    })
    .where(eq(translationTasks.id, id));
}

async function parseContentTaskForAllowance(
  transaction: TranslationTaskTransaction,
  row: TranslationTaskRow,
): Promise<ContentTopicTitleTranslationTask | ContentPostBodyTranslationTask> {
  if (row.translationKind === "content-topic-title") {
    const [metadata] = await transaction
      .select()
      .from(contentTopicTitleTranslationTasks)
      .where(eq(contentTopicTitleTranslationTasks.taskId, row.id))
      .limit(1);
    if (!metadata) {
      throw new TranslationTaskIntegrityError(
        "content topic-title allowance task is missing revision metadata",
      );
    }
    return parseContentTopicTitleTaskRow(row, metadata);
  }
  if (row.translationKind === "content-post-body") {
    const [metadata] = await transaction
      .select()
      .from(contentPostBodyTranslationTasks)
      .where(eq(contentPostBodyTranslationTasks.taskId, row.id))
      .limit(1);
    if (!metadata) {
      throw new TranslationTaskIntegrityError(
        "content post-body allowance task is missing revision metadata",
      );
    }
    return parseContentPostBodyTaskRow(row, metadata);
  }
  throw new TranslationTaskIntegrityError("provider allowance task kind is not content");
}

type RawTranslationTaskClaimResult =
  | {
      readonly outcome: "claimed";
      readonly row: TranslationTaskRow;
      readonly attemptStarted: boolean;
    }
  | { readonly outcome: "not-found" | "already-claimed" | "terminal" };

export class TranslationTaskKindMismatchError extends Error {
  constructor(
    readonly expectedKind: TranslationTaskKind,
    readonly actualKind: TranslationTaskKind,
  ) {
    super(`translation task kind mismatch: expected ${expectedKind}, got ${actualKind}`);
    this.name = "TranslationTaskKindMismatchError";
  }
}

async function claimedUiResult(
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

async function parseContentTopicTitleTaskRow(
  row: TranslationTaskRow,
  metadata: ContentTopicTitleTaskRow,
): Promise<ContentTopicTitleTranslationTask> {
  const task: ContentTopicTitleTranslationTask = {
    id: row.id,
    taskIdentity: row.taskIdentity,
    translationKind: "content-topic-title",
    sourceIdentity: {
      topicId: metadata.topicId,
      revisionId: metadata.revisionId,
    },
    revisionSourceLocale: metadata.revisionSourceLocale,
    resolvedSourceLocale: metadata.resolvedSourceLocale,
    sourceResolutionOrigin: metadata.sourceResolutionOrigin as
      ContentTopicTitleTranslationTask["sourceResolutionOrigin"],
    sourceFingerprint: row.sourceFingerprint,
    targetLocale: row.targetLocale,
    generationPolicyVersion: row.generationPolicyVersion,
    generation: row.generation,
    status: row.status as ContentTopicTitleTranslationTask["status"],
    attemptCount: row.attemptCount,
    maxAttempts: row.maxAttempts,
    lastFailureCode: row.lastFailureCode,
    failureDisposition: row.failureDisposition as ContentTopicTitleTranslationTask["failureDisposition"],
    claimToken: row.claimToken,
    claimedAt: row.claimedAt,
    leaseExpiresAt: row.leaseExpiresAt,
    staleAt: row.staleAt,
    completedAt: row.completedAt,
    failedAt: row.failedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  if (
    row.translationKind !== "content-topic-title"
    || row.sourceNamespace !== "topic-title"
    || row.sourceKey !== metadata.topicId
    || metadata.taskId !== row.id
    || metadata.translationKind !== "content-topic-title"
    || metadata.sourceNamespace !== "topic-title"
  ) {
    throw new TranslationTaskIntegrityError("stored content topic-title task ownership is invalid");
  }

  validateContentTopicTitleTranslationTaskSpecification(task);
  if (await contentTopicTitleTaskIdentity(task) !== task.taskIdentity) {
    throw new TranslationTaskIntegrityError("content topic-title task identity is invalid");
  }
  if (await contentTopicTitleSourceFingerprint({
    topicId: task.sourceIdentity.topicId,
    revisionId: task.sourceIdentity.revisionId,
    revisionSourceLocale: task.revisionSourceLocale,
    resolvedSourceLocale: task.resolvedSourceLocale,
    sourceResolutionOrigin: task.sourceResolutionOrigin,
  }) !== task.sourceFingerprint) {
    throw new TranslationTaskIntegrityError("content topic-title source fingerprint is invalid");
  }
  if (!isTaskStatus(task.status)) {
    throw new TranslationTaskIntegrityError("invalid content topic-title task status");
  }
  if (!Number.isSafeInteger(task.generation) || task.generation <= 0) {
    throw new TranslationTaskIntegrityError("invalid content topic-title task generation");
  }
  if (
    !Number.isSafeInteger(task.attemptCount)
    || !Number.isSafeInteger(task.maxAttempts)
    || task.attemptCount < 0
    || task.maxAttempts <= 0
    || task.attemptCount > task.maxAttempts
  ) {
    throw new TranslationTaskIntegrityError("invalid content topic-title task attempt budget");
  }
  if (
    task.lastFailureCode !== null
    && !/^[a-z0-9][a-z0-9-]{0,63}$/.test(task.lastFailureCode)
  ) {
    throw new TranslationTaskIntegrityError("invalid content topic-title failure code");
  }
  if (
    task.failureDisposition !== null
    && task.failureDisposition !== "terminal"
    && task.failureDisposition !== "retry-exhausted"
  ) {
    throw new TranslationTaskIntegrityError("invalid content topic-title failure disposition");
  }
  if (!isUuid(task.id) || !(task.createdAt instanceof Date) || !(task.updatedAt instanceof Date)) {
    throw new TranslationTaskIntegrityError("invalid content topic-title task identity or timestamps");
  }
  if (task.updatedAt < task.createdAt) {
    throw new TranslationTaskIntegrityError("content topic-title task updatedAt precedes createdAt");
  }
  assertLifecycle(task);
  return task;
}

async function parseContentPostBodyTaskRow(
  row: TranslationTaskRow,
  metadata: ContentPostBodyTaskRow,
): Promise<ContentPostBodyTranslationTask> {
  const task: ContentPostBodyTranslationTask = {
    id: row.id,
    taskIdentity: row.taskIdentity,
    translationKind: "content-post-body",
    sourceIdentity: {
      postId: metadata.postId,
      revisionId: metadata.revisionId,
    },
    revisionSourceLocale: metadata.revisionSourceLocale,
    resolvedSourceLocale: metadata.resolvedSourceLocale,
    sourceResolutionOrigin: metadata.sourceResolutionOrigin as
      ContentPostBodyTranslationTask["sourceResolutionOrigin"],
    sourceFingerprint: row.sourceFingerprint,
    targetLocale: row.targetLocale,
    protectedContentPolicyVersion: metadata.protectedContentPolicyVersion,
    generationPolicyVersion: row.generationPolicyVersion,
    generation: row.generation,
    status: row.status as ContentPostBodyTranslationTask["status"],
    attemptCount: row.attemptCount,
    maxAttempts: row.maxAttempts,
    lastFailureCode: row.lastFailureCode,
    failureDisposition: row.failureDisposition as ContentPostBodyTranslationTask["failureDisposition"],
    claimToken: row.claimToken,
    claimedAt: row.claimedAt,
    leaseExpiresAt: row.leaseExpiresAt,
    staleAt: row.staleAt,
    completedAt: row.completedAt,
    failedAt: row.failedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  if (
    row.translationKind !== "content-post-body"
    || row.sourceNamespace !== "post-body"
    || row.sourceKey !== metadata.postId
    || metadata.taskId !== row.id
    || metadata.translationKind !== "content-post-body"
    || metadata.sourceNamespace !== "post-body"
  ) {
    throw new TranslationTaskIntegrityError("stored content post-body task ownership is invalid");
  }

  validateContentPostBodyTranslationTaskSpecification(task);
  if (await contentPostBodyTaskIdentity(task) !== task.taskIdentity) {
    throw new TranslationTaskIntegrityError("content post-body task identity is invalid");
  }
  if (!isTaskStatus(task.status)) {
    throw new TranslationTaskIntegrityError("invalid content post-body task status");
  }
  if (!Number.isSafeInteger(task.generation) || task.generation <= 0) {
    throw new TranslationTaskIntegrityError("invalid content post-body task generation");
  }
  if (
    !Number.isSafeInteger(task.attemptCount)
    || !Number.isSafeInteger(task.maxAttempts)
    || task.attemptCount < 0
    || task.maxAttempts <= 0
    || task.attemptCount > task.maxAttempts
  ) {
    throw new TranslationTaskIntegrityError("invalid content post-body task attempt budget");
  }
  if (
    task.lastFailureCode !== null
    && !/^[a-z0-9][a-z0-9-]{0,63}$/.test(task.lastFailureCode)
  ) {
    throw new TranslationTaskIntegrityError("invalid content post-body failure code");
  }
  if (
    task.failureDisposition !== null
    && task.failureDisposition !== "terminal"
    && task.failureDisposition !== "retry-exhausted"
  ) {
    throw new TranslationTaskIntegrityError("invalid content post-body failure disposition");
  }
  if (!isUuid(task.id) || !(task.createdAt instanceof Date) || !(task.updatedAt instanceof Date)) {
    throw new TranslationTaskIntegrityError("invalid content post-body task identity or timestamps");
  }
  if (task.updatedAt < task.createdAt) {
    throw new TranslationTaskIntegrityError("content post-body task updatedAt precedes createdAt");
  }
  assertLifecycle(task);
  return task;
}

type TranslationUnit = {
  translationKind: TranslationTaskKind;
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

function isTranslationTaskKind(value: string): value is TranslationTaskKind {
  return value === "ui" || value === "content-topic-title" || value === "content-post-body";
}

function isTaskStatus(
  value: string,
): value is
  | TranslationTask["status"]
  | ContentTopicTitleTranslationTask["status"]
  | ContentPostBodyTranslationTask["status"] {
  return value === "pending" || value === "processing" || value === "stale" ||
    value === "completed" || value === "failed";
}

function assertLifecycle(
  task: TranslationTask | ContentTopicTitleTranslationTask | ContentPostBodyTranslationTask,
): void {
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

function isTaskStoreAvailabilityFailure(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current = error;
  while (
    current
    && (typeof current === "object" || typeof current === "function")
    && !seen.has(current)
  ) {
    seen.add(current);
    if (isPostgresAvailabilityFailure(current) || isPostgresQueryTimeout(current)) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
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
