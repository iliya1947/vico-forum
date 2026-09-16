import { and, eq, lte, or, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  validateUiTranslationJobSpecification,
  type TranslationTask,
  type TranslationTaskClaimResult,
  type TranslationTaskStore,
} from "../app/localization/translation-tasks";
import {
  uiTranslationJobIdentity,
  type UiTranslationJobSpecification,
} from "../app/localization/ui-translation-service";
import { translationTaskGenerationHeads, translationTasks } from "./schema";

type TranslationTaskRow = typeof translationTasks.$inferSelect;

export class TranslationTaskIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranslationTaskIntegrityError";
  }
}

export class DrizzleTranslationTaskStore implements TranslationTaskStore {
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
      const existingRows = await transaction.select().from(translationTasks)
        .where(eq(translationTasks.taskIdentity, specification.taskIdentity)).limit(1);
      if (existingRows[0]) {
        const existing = await parseTaskRow(existingRows[0]);
        assertMatchesSpecification(existing, specification);
        if (existing.status !== "stale" || existing.generation !== currentGeneration) return existing;
        const databaseNow = sql`statement_timestamp()`;
        const reactivated = await transaction.update(translationTasks).set({
          status: "pending", claimToken: null, claimedAt: null, leaseExpiresAt: null,
          staleAt: null, completedAt: null, updatedAt: databaseNow,
        }).where(and(eq(translationTasks.id, existing.id), eq(translationTasks.status, "stale"))).returning();
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

  async claim(id: string, leaseDurationMs: number): Promise<TranslationTaskClaimResult> {
    if (!isUuid(id)) throw new TypeError("translation task id must be a UUID");
    if (!Number.isSafeInteger(leaseDurationMs) || leaseDurationMs <= 0) {
      throw new TypeError("translation task lease duration must be a positive integer");
    }
    const claimToken = crypto.randomUUID();
    const databaseNow = sql`statement_timestamp()`;
    const leaseExpiresAt = sql`${databaseNow} + (${leaseDurationMs}::double precision * interval '1 millisecond')`;
    const rows = await this.database
      .update(translationTasks)
      .set({ status: "processing", claimToken, claimedAt: databaseNow, leaseExpiresAt, updatedAt: databaseNow })
      .where(and(
        eq(translationTasks.id, id),
        or(
          eq(translationTasks.status, "pending"),
          and(eq(translationTasks.status, "processing"), lte(translationTasks.leaseExpiresAt, databaseNow)),
        ),
      ))
      .returning();
    if (rows[0]) {
      const task = await parseTaskRow(rows[0]);
      if (task.status !== "processing" || !task.claimToken) {
        throw new TranslationTaskIntegrityError("claimed translation task has invalid processing state");
      }
      return { outcome: "claimed", task: { ...task, status: "processing", claimToken: task.claimToken } };
    }
    const existing = await this.findById(id);
    if (!existing) return { outcome: "not-found" };
    return {
      outcome: existing.status === "stale" || existing.status === "completed" ? "terminal" : "already-claimed",
    };
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
    claimToken: row.claimToken,
    claimedAt: row.claimedAt,
    leaseExpiresAt: row.leaseExpiresAt,
    staleAt: row.staleAt,
    completedAt: row.completedAt,
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
  return value === "pending" || value === "processing" || value === "stale" || value === "completed";
}

function assertLifecycle(task: TranslationTask): void {
  const processing = task.status === "processing" && task.claimToken && task.claimedAt &&
    task.leaseExpiresAt && !task.staleAt && !task.completedAt && task.leaseExpiresAt > task.claimedAt;
  const pending = task.status === "pending" && !task.claimToken && !task.claimedAt &&
    !task.leaseExpiresAt && !task.staleAt && !task.completedAt;
  const stale = task.status === "stale" && !task.claimToken && task.claimedAt &&
    !task.leaseExpiresAt && task.staleAt && !task.completedAt && task.staleAt >= task.claimedAt;
  const completed = task.status === "completed" && !task.claimToken && task.claimedAt &&
    !task.leaseExpiresAt && !task.staleAt && task.completedAt && task.completedAt >= task.claimedAt;
  if (!pending && !processing && !stale && !completed) {
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

function requiredRow(row: TranslationTaskRow | undefined): TranslationTaskRow {
  if (!row) throw new TranslationTaskIntegrityError("translation task upsert returned no row");
  return row;
}
