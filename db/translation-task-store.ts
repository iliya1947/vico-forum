import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  validateUiTranslationJobSpecification,
  type TranslationTask,
  type TranslationTaskStore,
} from "../app/localization/translation-tasks";
import {
  uiTranslationJobIdentity,
  type UiTranslationJobSpecification,
} from "../app/localization/ui-translation-service";
import { translationTasks } from "./schema";

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
    const rows = await this.database
      .insert(translationTasks)
      .values({
        taskIdentity: specification.taskIdentity,
        translationKind: specification.translationKind,
        sourceNamespace: specification.sourceIdentity.namespace,
        sourceKey: specification.sourceIdentity.key,
        sourceFingerprint: specification.sourceFingerprint,
        targetLocale: specification.targetLocale,
        generationPolicyVersion: specification.generationPolicyVersion,
        status: "pending",
      })
      .onConflictDoUpdate({
        target: translationTasks.taskIdentity,
        set: { updatedAt: new Date() },
      })
      .returning();

    const task = await parseTaskRow(requiredRow(rows[0]));
    assertMatchesSpecification(task, specification);
    return task;
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
}

async function parseTaskRow(row: TranslationTaskRow): Promise<TranslationTask> {
  const task = {
    id: row.id,
    taskIdentity: row.taskIdentity,
    translationKind: row.translationKind,
    sourceIdentity: { namespace: row.sourceNamespace, key: row.sourceKey },
    sourceFingerprint: row.sourceFingerprint,
    targetLocale: row.targetLocale,
    generationPolicyVersion: row.generationPolicyVersion,
    status: row.status,
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
  if (task.status !== "pending") throw new TranslationTaskIntegrityError("invalid translation task status");
  if (!isUuid(task.id) || !(task.createdAt instanceof Date) || !(task.updatedAt instanceof Date)) {
    throw new TranslationTaskIntegrityError("invalid translation task identity or timestamps");
  }
  if (task.updatedAt < task.createdAt) {
    throw new TranslationTaskIntegrityError("translation task updatedAt precedes createdAt");
  }
  return { ...task, translationKind: "ui", status: "pending" };
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
