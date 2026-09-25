import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type {
  ContentTranslationAllowanceAcquireResult,
  ContentTranslationAllowanceLease,
  ContentTranslationAllowanceStore,
  ContentTranslationKind,
} from "../app/localization/content-translation-allowance";
import {
  contentTranslationAllowanceAdmissions,
  translationTasks,
} from "./schema";

type TranslationTaskRow = typeof translationTasks.$inferSelect;
type AdmissionRow = typeof contentTranslationAllowanceAdmissions.$inferSelect;
type TranslationTaskTransaction =
  Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0];

export class ContentTranslationAllowanceIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentTranslationAllowanceIntegrityError";
  }
}

export class DrizzleContentTranslationAllowanceStore
implements ContentTranslationAllowanceStore {
  constructor(private readonly database: NodePgDatabase) {}

  async acquire(
    taskId: string,
    translationKind: ContentTranslationKind,
    leaseDurationMs: number,
  ): Promise<ContentTranslationAllowanceAcquireResult> {
    requireUuid(taskId, "allowance task id");
    requireContentKind(translationKind);
    requirePositiveInteger(leaseDurationMs, "allowance lease duration");

    return this.database.transaction(async (transaction) => {
      const [task] = await transaction
        .select()
        .from(translationTasks)
        .where(eq(translationTasks.id, taskId))
        .for("update")
        .limit(1);
      if (!task) return { outcome: "not-found" as const };
      assertTaskKind(task, translationKind);

      if (
        task.status === "stale"
        || task.status === "completed"
        || task.status === "failed"
      ) {
        return { outcome: "terminal" as const };
      }

      const clockResult = await transaction.execute<{ database_now: Date }>(sql`
        select statement_timestamp() as database_now
      `);
      const databaseNow = clockResult.rows[0]?.database_now;
      if (!databaseNow) {
        throw new ContentTranslationAllowanceIntegrityError(
          "allowance admission database clock returned no value",
        );
      }

      if (
        task.status === "processing"
        && task.leaseExpiresAt
        && task.leaseExpiresAt > databaseNow
      ) {
        return { outcome: "admission-in-progress" as const };
      }

      if (
        task.status === "processing"
        && task.attemptCount >= task.maxAttempts
      ) {
        return { outcome: "exhausted" as const };
      }

      if (task.status !== "pending" && task.status !== "processing") {
        return { outcome: "terminal" as const };
      }
      if (task.attemptCount >= task.maxAttempts) {
        throw new ContentTranslationAllowanceIntegrityError(
          "non-terminal allowance task exhausted its attempt budget",
        );
      }

      const attemptNumber = task.attemptCount + 1;
      const [existing] = await transaction
        .select()
        .from(contentTranslationAllowanceAdmissions)
        .where(eq(contentTranslationAllowanceAdmissions.taskId, task.id))
        .for("update")
        .limit(1);

      if (existing && existing.translationKind !== translationKind) {
        throw new ContentTranslationAllowanceIntegrityError(
          "stored allowance admission owner conflicts with translation task",
        );
      }

      if (
        existing
        && (
          existing.generation !== task.generation
          || existing.attemptNumber !== attemptNumber
        )
      ) {
        await transaction
          .delete(contentTranslationAllowanceAdmissions)
          .where(eq(contentTranslationAllowanceAdmissions.taskId, task.id));
      } else if (existing?.state === "admitted") {
        return { outcome: "admitted" as const };
      } else if (
        existing?.state === "deferred"
        && existing.retryNotBefore
        && existing.retryNotBefore > databaseNow
      ) {
        return {
          outcome: "deferred" as const,
          retryNotBefore: existing.retryNotBefore,
          reason: requireStoredReason(existing.reason),
        };
      } else if (
        existing?.state === "leased"
        && existing.leaseExpiresAt
        && existing.leaseExpiresAt > databaseNow
      ) {
        return { outcome: "admission-in-progress" as const };
      }

      const claimToken = crypto.randomUUID();
      const leaseExpiresAt = new Date(databaseNow.getTime() + leaseDurationMs);
      if (!Number.isFinite(leaseExpiresAt.getTime()) || leaseExpiresAt <= databaseNow) {
        throw new ContentTranslationAllowanceIntegrityError(
          "allowance lease expiry is invalid",
        );
      }

      const values = {
        taskId: task.id,
        translationKind,
        generation: task.generation,
        attemptNumber,
        state: "leased",
        claimToken,
        claimedAt: databaseNow,
        leaseExpiresAt,
        retryNotBefore: null,
        reason: null,
        reservationReference: null,
        updatedAt: databaseNow,
      } as const;

      const rows = existing
        ? await transaction
            .update(contentTranslationAllowanceAdmissions)
            .set(values)
            .where(eq(contentTranslationAllowanceAdmissions.taskId, task.id))
            .returning()
        : await transaction
            .insert(contentTranslationAllowanceAdmissions)
            .values(values)
            .returning();

      const row = rows[0];
      if (!row) {
        throw new ContentTranslationAllowanceIntegrityError(
          "allowance lease persistence returned no row",
        );
      }

      return {
        outcome: "leased" as const,
        lease: leaseFromRow(row),
      };
    });
  }

  async admit(
    lease: ContentTranslationAllowanceLease,
    reservationReference?: string,
  ): Promise<boolean> {
    validateLease(lease);
    validateReservationReference(reservationReference);

    const rows = await this.database
      .update(contentTranslationAllowanceAdmissions)
      .set({
        state: "admitted",
        claimToken: null,
        claimedAt: null,
        leaseExpiresAt: null,
        retryNotBefore: null,
        reason: null,
        reservationReference: reservationReference ?? null,
        updatedAt: sql`statement_timestamp()`,
      })
      .where(and(
        eq(contentTranslationAllowanceAdmissions.taskId, lease.taskId),
        eq(contentTranslationAllowanceAdmissions.translationKind, lease.translationKind),
        eq(contentTranslationAllowanceAdmissions.generation, lease.generation),
        eq(contentTranslationAllowanceAdmissions.attemptNumber, lease.attemptNumber),
        eq(contentTranslationAllowanceAdmissions.state, "leased"),
        eq(contentTranslationAllowanceAdmissions.claimToken, lease.claimToken),
      ))
      .returning({ taskId: contentTranslationAllowanceAdmissions.taskId });
    return rows.length === 1;
  }

  async defer(
    lease: ContentTranslationAllowanceLease,
    retryNotBefore: Date,
    reason: string,
  ): Promise<Date | undefined> {
    validateLease(lease);
    if (!(retryNotBefore instanceof Date) || !Number.isFinite(retryNotBefore.getTime())) {
      throw new TypeError("allowance retryNotBefore must be a valid Date");
    }
    requireReason(reason);

    return this.database.transaction(async (transaction) => {
      const clockResult = await transaction.execute<{ database_now: Date }>(sql`
        select statement_timestamp() as database_now
      `);
      const databaseNow = clockResult.rows[0]?.database_now;
      if (!databaseNow) {
        throw new ContentTranslationAllowanceIntegrityError(
          "allowance defer database clock returned no value",
        );
      }
      if (retryNotBefore <= databaseNow) {
        throw new TypeError("allowance retryNotBefore must be in the future");
      }

      const rows = await transaction
        .update(contentTranslationAllowanceAdmissions)
        .set({
          state: "deferred",
          claimToken: null,
          claimedAt: null,
          leaseExpiresAt: null,
          retryNotBefore,
          reason,
          reservationReference: null,
          updatedAt: databaseNow,
        })
        .where(and(
          eq(contentTranslationAllowanceAdmissions.taskId, lease.taskId),
          eq(contentTranslationAllowanceAdmissions.translationKind, lease.translationKind),
          eq(contentTranslationAllowanceAdmissions.generation, lease.generation),
          eq(contentTranslationAllowanceAdmissions.attemptNumber, lease.attemptNumber),
          eq(contentTranslationAllowanceAdmissions.state, "leased"),
          eq(contentTranslationAllowanceAdmissions.claimToken, lease.claimToken),
        ))
        .returning({
          retryNotBefore: contentTranslationAllowanceAdmissions.retryNotBefore,
        });
      return rows[0]?.retryNotBefore ?? undefined;
    });
  }
}

export async function consumeAdmittedContentAllowance(
  transaction: TranslationTaskTransaction,
  task: Pick<
    TranslationTaskRow,
    "id" | "translationKind" | "generation" | "attemptCount"
  >,
): Promise<boolean> {
  if (
    task.translationKind !== "content-topic-title"
    && task.translationKind !== "content-post-body"
  ) {
    throw new TypeError("only content translation tasks use provider allowance admission");
  }
  const rows = await transaction
    .delete(contentTranslationAllowanceAdmissions)
    .where(and(
      eq(contentTranslationAllowanceAdmissions.taskId, task.id),
      eq(contentTranslationAllowanceAdmissions.translationKind, task.translationKind),
      eq(contentTranslationAllowanceAdmissions.generation, task.generation),
      eq(contentTranslationAllowanceAdmissions.attemptNumber, task.attemptCount + 1),
      eq(contentTranslationAllowanceAdmissions.state, "admitted"),
    ))
    .returning({ taskId: contentTranslationAllowanceAdmissions.taskId });
  return rows.length === 1;
}

function leaseFromRow(row: AdmissionRow): ContentTranslationAllowanceLease {
  if (
    row.state !== "leased"
    || !row.claimToken
    || !row.claimedAt
    || !row.leaseExpiresAt
    || row.leaseExpiresAt <= row.claimedAt
  ) {
    throw new ContentTranslationAllowanceIntegrityError(
      "stored allowance lease has an invalid lifecycle",
    );
  }
  requireContentKind(row.translationKind);
  requirePositiveInteger(row.generation, "stored allowance generation");
  requirePositiveInteger(row.attemptNumber, "stored allowance attempt number");
  return {
    taskId: row.taskId,
    translationKind: row.translationKind,
    generation: row.generation,
    attemptNumber: row.attemptNumber,
    claimToken: row.claimToken,
  };
}

function assertTaskKind(
  task: TranslationTaskRow,
  expectedKind: ContentTranslationKind,
): void {
  if (task.translationKind !== expectedKind) {
    throw new ContentTranslationAllowanceIntegrityError(
      "allowance admission task kind mismatch",
    );
  }
}

function validateLease(lease: ContentTranslationAllowanceLease): void {
  requireUuid(lease.taskId, "allowance lease task id");
  requireUuid(lease.claimToken, "allowance lease claim token");
  requireContentKind(lease.translationKind);
  requirePositiveInteger(lease.generation, "allowance lease generation");
  requirePositiveInteger(lease.attemptNumber, "allowance lease attempt number");
}

function validateReservationReference(value: string | undefined): void {
  if (value === undefined) return;
  if (
    typeof value !== "string"
    || !value
    || value !== value.trim()
    || value.length > 256
  ) {
    throw new TypeError("allowance reservation reference is invalid");
  }
}

function requireStoredReason(value: string | null): string {
  if (!value || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(value)) {
    throw new ContentTranslationAllowanceIntegrityError(
      "stored allowance reason is invalid",
    );
  }
  return value;
}

function requireReason(value: string): void {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(value)) {
    throw new TypeError("allowance reason is invalid");
  }
}

function requireContentKind(
  value: string,
): asserts value is ContentTranslationKind {
  if (value !== "content-topic-title" && value !== "content-post-body") {
    throw new TypeError("allowance admission requires a content translation kind");
  }
}

function requirePositiveInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${field} must be a positive safe integer`);
  }
}

function requireUuid(value: string, field: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new TypeError(`${field} must be a UUID`);
  }
}
