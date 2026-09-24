import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import {
  ContentTranslationRequestBudgetIntegrityError,
  ContentTranslationRequestBudgetStorageUnavailableError,
  contentTranslationRequestBudgetScopeKey,
  validateContentTranslationRequestBudgetAdmission,
  validateContentTranslationRequestBudgetCleanupLimit,
  type ContentTranslationRequestBudgetAdmission,
  type ContentTranslationRequestBudgetDecision,
  type ContentTranslationRequestBudgetStore,
} from "../app/localization/content-request-budget.server";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import { isPostgresQueryTimeout } from "./postgres-deadlines";
import { contentTranslationRequestBudgetCounters } from "./schema";

const GLOBAL_SUBJECT_KEY = "_global";

type BudgetTransaction =
  Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0];

interface DatabaseClock {
  readonly databaseNow: Date;
  readonly windowStart: Date;
  readonly resetAt: Date;
}

class RequestBudgetDeniedRollback extends Error {
  constructor(readonly decision: ContentTranslationRequestBudgetDecision) {
    super("request budget denied");
    this.name = "RequestBudgetDeniedRollback";
  }
}

export class DrizzleContentTranslationRequestBudgetStore
implements ContentTranslationRequestBudgetStore {
  constructor(private readonly database: NodePgDatabase) {}

  async consume(
    admission: ContentTranslationRequestBudgetAdmission,
  ): Promise<ContentTranslationRequestBudgetDecision> {
    validateContentTranslationRequestBudgetAdmission(admission);
    const globalScope = contentTranslationRequestBudgetScopeKey(admission.global);
    const requesterScope = contentTranslationRequestBudgetScopeKey(admission.requester);

    try {
      return await this.database.transaction(async (transaction) => {
        const clock = await readDatabaseClock(transaction, admission.windowSeconds);

        const globalUsed = await consumeCounter(
          transaction,
          globalScope,
          GLOBAL_SUBJECT_KEY,
          admission.cost,
          admission.global.limit,
          clock,
          "global",
        );
        const requesterUsed = await consumeCounter(
          transaction,
          requesterScope,
          admission.subjectKey,
          admission.cost,
          admission.requester.limit,
          clock,
          "requester",
        );

        return {
          allowed: true,
          reason: "within-budget",
          limitingScope: null,
          remainingUnits: {
            global: admission.global.limit - globalUsed,
            requester: admission.requester.limit - requesterUsed,
          },
          resetAt: clock.resetAt,
          retryAfterSeconds: 0,
        };
      });
    } catch (error) {
      if (error instanceof RequestBudgetDeniedRollback) return error.decision;
      if (isStorageUnavailable(error)) {
        throw new ContentTranslationRequestBudgetStorageUnavailableError({ cause: error });
      }
      throw error;
    }
  }

  async cleanupExpired(limit: number): Promise<number> {
    validateContentTranslationRequestBudgetCleanupLimit(limit);
    try {
      const deleted = await this.database.execute<{ deleted: number }>(sql`
        with candidates as (
          select
            ${contentTranslationRequestBudgetCounters.scope} as scope,
            ${contentTranslationRequestBudgetCounters.subjectKey} as subject_key,
            ${contentTranslationRequestBudgetCounters.windowStart} as window_start
          from ${contentTranslationRequestBudgetCounters}
          where ${contentTranslationRequestBudgetCounters.expiresAt} <= transaction_timestamp()
          order by
            ${contentTranslationRequestBudgetCounters.expiresAt} asc,
            ${contentTranslationRequestBudgetCounters.scope} asc,
            ${contentTranslationRequestBudgetCounters.subjectKey} asc,
            ${contentTranslationRequestBudgetCounters.windowStart} asc
          for update skip locked
          limit ${limit}
        )
        delete from ${contentTranslationRequestBudgetCounters} as counter
        using candidates
        where counter.scope = candidates.scope
          and counter.subject_key = candidates.subject_key
          and counter.window_start = candidates.window_start
        returning 1 as deleted
      `);
      return deleted.rows.length;
    } catch (error) {
      if (isStorageUnavailable(error)) {
        throw new ContentTranslationRequestBudgetStorageUnavailableError({ cause: error });
      }
      throw error;
    }
  }
}

async function readDatabaseClock(
  transaction: BudgetTransaction,
  windowSeconds: number,
): Promise<DatabaseClock> {
  const result = await transaction.execute<{
    database_now: Date;
    reset_at: Date;
    window_start: Date;
  }>(sql`
    with clock as (
      select transaction_timestamp() as database_now
    ),
    aligned as (
      select
        database_now,
        to_timestamp(
          floor(extract(epoch from database_now) / ${windowSeconds}::double precision)
          * ${windowSeconds}::double precision
        ) as window_start
      from clock
    )
    select
      database_now,
      window_start,
      window_start + (${windowSeconds}::double precision * interval '1 second') as reset_at
    from aligned
  `);
  const row = result.rows[0];
  if (
    !row
    || !(row.database_now instanceof Date)
    || Number.isNaN(row.database_now.getTime())
    || !(row.window_start instanceof Date)
    || Number.isNaN(row.window_start.getTime())
    || !(row.reset_at instanceof Date)
    || Number.isNaN(row.reset_at.getTime())
    || row.window_start.getTime() > row.database_now.getTime()
    || row.reset_at.getTime() <= row.database_now.getTime()
  ) {
    throw new ContentTranslationRequestBudgetIntegrityError(
      "request budget database clock returned invalid window metadata",
    );
  }
  return {
    databaseNow: row.database_now,
    windowStart: row.window_start,
    resetAt: row.reset_at,
  };
}

async function consumeCounter(
  transaction: BudgetTransaction,
  scope: string,
  subjectKey: string,
  cost: number,
  limit: number,
  clock: DatabaseClock,
  limitingScope: "global" | "requester",
): Promise<number> {
  const result = await transaction.execute<{ used_units: number | string }>(sql`
    insert into ${contentTranslationRequestBudgetCounters}
      (scope, subject_key, window_start, used_units, expires_at, created_at, updated_at)
    select
      ${scope},
      ${subjectKey},
      ${clock.windowStart},
      ${cost},
      ${clock.resetAt},
      ${clock.databaseNow},
      ${clock.databaseNow}
    where ${cost} <= ${limit}
    on conflict (scope, subject_key, window_start) do update
      set used_units = ${contentTranslationRequestBudgetCounters.usedUnits}
            + excluded.used_units,
          expires_at = excluded.expires_at,
          updated_at = excluded.updated_at
      where ${contentTranslationRequestBudgetCounters.usedUnits}
            + excluded.used_units <= ${limit}
    returning used_units
  `);

  if (result.rows[0]) return parseUsedUnits(result.rows[0].used_units, limit);

  const current = await transaction.execute<{ used_units: number | string }>(sql`
    select ${contentTranslationRequestBudgetCounters.usedUnits} as used_units
      from ${contentTranslationRequestBudgetCounters}
     where ${contentTranslationRequestBudgetCounters.scope} = ${scope}
       and ${contentTranslationRequestBudgetCounters.subjectKey} = ${subjectKey}
       and ${contentTranslationRequestBudgetCounters.windowStart} = ${clock.windowStart}
  `);
  const usedUnits = current.rows[0]
    ? parseUsedUnits(current.rows[0].used_units, limit)
    : 0;
  throw new RequestBudgetDeniedRollback({
    allowed: false,
    reason: "limit-exceeded",
    limitingScope,
    remainingUnits: Math.max(0, limit - usedUnits),
    resetAt: clock.resetAt,
    retryAfterSeconds: retryAfterSeconds(clock),
  });
}

function parseUsedUnits(value: number | string, limit: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (
    !Number.isSafeInteger(parsed)
    || parsed < 0
    || parsed > limit
  ) {
    throw new ContentTranslationRequestBudgetIntegrityError(
      "request budget counter returned invalid used units",
    );
  }
  return parsed;
}

function retryAfterSeconds(clock: DatabaseClock): number {
  return Math.max(
    0,
    Math.ceil((clock.resetAt.getTime() - clock.databaseNow.getTime()) / 1_000),
  );
}

function isStorageUnavailable(error: unknown): boolean {
  return isPostgresAvailabilityFailure(error) || isPostgresQueryTimeout(error);
}
