import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { ContentTranslationRevision } from "../app/localization/content-translation";
import {
  validateContentTranslationRequestBudgetAdmission,
  type ContentTranslationRequestBudgetAdmission,
} from "../app/localization/content-request-budget.server";
import {
  contentTopicTitleTaskIdentity,
  type ContentTopicTitlePlanningStore,
  type ContentTopicTitleTaskUpsertResult,
} from "../app/localization/content-translation-planning";
import {
  DEFAULT_TRANSLATION_TASK_MAX_ATTEMPTS,
  validateContentTopicTitleTranslationTaskSpecification,
  type ContentTopicTitleTranslationTask,
  type ContentTopicTitleTranslationTaskSpecification,
} from "../app/localization/translation-tasks";
import {
  ContentTranslationRequestBudgetDeniedRollback,
  consumeContentTranslationRequestBudgetInTransaction,
} from "./content-request-budget-store";
import { readContentTranslationForUpdate } from "./content-translation-store";
import {
  contentTopicTitleTranslationTasks,
  forumTopicTitleRevisions,
  forumTopics,
  translationTaskGenerationHeads,
  translationTasks,
} from "./schema";

type TranslationTaskRow = typeof translationTasks.$inferSelect;
type ContentTaskRow = typeof contentTopicTitleTranslationTasks.$inferSelect;

export class ContentTopicTitleTaskIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentTopicTitleTaskIntegrityError";
  }
}

class ContentTopicTitlePlanningNoWorkRollback extends Error {
  constructor(
    readonly outcome: "revision-changed" | "translation-current" | "task-completed",
  ) {
    super(`content topic-title planning stopped: ${outcome}`);
    this.name = "ContentTopicTitlePlanningNoWorkRollback";
  }
}

export class DrizzleContentTopicTitlePlanningStore implements ContentTopicTitlePlanningStore {
  constructor(private readonly database: NodePgDatabase) {}

  async readCurrentRevision(topicId: string): Promise<ContentTranslationRevision | undefined> {
    requireNonBlank(topicId, "topic id");
    const rows = await this.database
      .select({
        topicId: forumTopics.id,
        revisionId: forumTopicTitleRevisions.id,
        originalContent: forumTopicTitleRevisions.originalContent,
        sourceLocale: forumTopicTitleRevisions.sourceLocale,
      })
      .from(forumTopics)
      .innerJoin(
        forumTopicTitleRevisions,
        and(
          eq(forumTopicTitleRevisions.topicId, forumTopics.id),
          eq(forumTopicTitleRevisions.id, forumTopics.currentTitleRevisionId),
        ),
      )
      .where(eq(forumTopics.id, topicId))
      .limit(1);

    const row = rows[0];
    return row
      ? {
          contentType: "topic-title",
          contentId: row.topicId,
          revisionId: row.revisionId,
          originalContent: row.originalContent,
          sourceLocale: row.sourceLocale,
        }
      : undefined;
  }

  async upsertPending(
    specification: ContentTopicTitleTranslationTaskSpecification,
    expectedRevision: ContentTranslationRevision,
    requestBudgetAdmission: ContentTranslationRequestBudgetAdmission,
  ): Promise<ContentTopicTitleTaskUpsertResult> {
    validateContentTopicTitleTranslationTaskSpecification(specification);
    await assertStableIdentity(specification);
    assertExpectedRevision(specification, expectedRevision);
    validateContentTranslationRequestBudgetAdmission(requestBudgetAdmission);

    try {
      return await this.database.transaction(async (transaction) => {
        const unit = {
          translationKind: specification.translationKind,
          sourceNamespace: "topic-title",
          sourceKey: specification.sourceIdentity.topicId,
          targetLocale: specification.targetLocale,
        };
        const insertedHead = await transaction
          .insert(translationTaskGenerationHeads)
          .values({ ...unit, currentGeneration: 1 })
          .onConflictDoNothing()
          .returning({ currentGeneration: translationTaskGenerationHeads.currentGeneration });

        // Shared planning/publication order:
        // generation head -> stable task -> current entity/revision -> current translation
        // -> global budget -> requester budget -> task mutation.
        const lockedHead = await transaction.execute<{ current_generation: number }>(sql`
          select current_generation
            from ${translationTaskGenerationHeads}
           where ${translationTaskGenerationHeads.translationKind} = ${unit.translationKind}
             and ${translationTaskGenerationHeads.sourceNamespace} = ${unit.sourceNamespace}
             and ${translationTaskGenerationHeads.sourceKey} = ${unit.sourceKey}
             and ${translationTaskGenerationHeads.targetLocale} = ${unit.targetLocale}
           for update
        `);
        const currentGeneration = lockedHead.rows[0]?.current_generation;
        if (!Number.isSafeInteger(currentGeneration) || currentGeneration! <= 0) {
          throw new ContentTopicTitleTaskIntegrityError(
            "content translation generation head is missing or invalid",
          );
        }

        const existingRows = await transaction
          .select()
          .from(translationTasks)
          .where(eq(translationTasks.taskIdentity, specification.taskIdentity))
          .for("update")
          .limit(1);

        const [topic] = await transaction
          .select({ currentTitleRevisionId: forumTopics.currentTitleRevisionId })
          .from(forumTopics)
          .where(eq(forumTopics.id, specification.sourceIdentity.topicId))
          .for("update");
        if (
          !topic
          || topic.currentTitleRevisionId !== expectedRevision.revisionId
        ) {
          throw new ContentTopicTitlePlanningNoWorkRollback("revision-changed");
        }

        const [current] = await transaction
          .select({
            topicId: forumTopicTitleRevisions.topicId,
            revisionId: forumTopicTitleRevisions.id,
            originalContent: forumTopicTitleRevisions.originalContent,
            sourceLocale: forumTopicTitleRevisions.sourceLocale,
          })
          .from(forumTopicTitleRevisions)
          .where(and(
            eq(forumTopicTitleRevisions.topicId, specification.sourceIdentity.topicId),
            eq(forumTopicTitleRevisions.id, topic.currentTitleRevisionId),
          ))
          .for("update");
        if (
          !current
          || current.topicId !== expectedRevision.contentId
          || current.revisionId !== expectedRevision.revisionId
          || current.originalContent !== expectedRevision.originalContent
          || current.sourceLocale !== expectedRevision.sourceLocale
        ) {
          throw new ContentTopicTitlePlanningNoWorkRollback("revision-changed");
        }

        const currentTranslation = await readContentTranslationForUpdate(transaction, {
          contentType: "topic-title",
          contentId: current.topicId,
          revisionId: current.revisionId,
          targetLocale: specification.targetLocale,
        });
        if (currentTranslation) {
          if (currentTranslation.sourceLocale !== current.sourceLocale) {
            throw new ContentTopicTitleTaskIntegrityError(
              "current topic-title translation source locale conflicts with immutable revision",
            );
          }
          throw new ContentTopicTitlePlanningNoWorkRollback("translation-current");
        }

        if (existingRows[0]) {
          assertTaskMatchesSpecification(existingRows[0], specification);
          const metadataRows = await transaction
            .select()
            .from(contentTopicTitleTranslationTasks)
            .where(eq(contentTopicTitleTranslationTasks.taskId, existingRows[0].id))
            .limit(1);
          assertMetadataMatchesSpecification(metadataRows[0], specification);

          if (existingRows[0].status === "completed") {
            throw new ContentTopicTitlePlanningNoWorkRollback("task-completed");
          }
          if (
            existingRows[0].status !== "pending"
            && existingRows[0].status !== "processing"
            && existingRows[0].status !== "stale"
          ) {
            throw new ContentTopicTitleTaskIntegrityError(
              "content topic-title task identity is already terminal",
            );
          }

          await consumeContentTranslationRequestBudgetInTransaction(
            transaction,
            requestBudgetAdmission,
          );

          if (
            existingRows[0].status === "pending"
            || existingRows[0].status === "processing"
          ) {
            return {
              outcome: "task" as const,
              created: false,
              task: contentTask(existingRows[0], metadataRows[0]),
            };
          }

          const databaseNow = sql`statement_timestamp()`;
          const generation = existingRows[0].generation === currentGeneration
            ? currentGeneration
            : currentGeneration + 1;
          const reactivated = await transaction
            .update(translationTasks)
            .set({
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
            })
            .where(and(
              eq(translationTasks.id, existingRows[0].id),
              eq(translationTasks.status, "stale"),
            ))
            .returning();
          const reactivatedTask = requiredTaskRow(reactivated[0]);

          if (generation !== currentGeneration) {
            await transaction
              .update(translationTaskGenerationHeads)
              .set({
                currentGeneration: generation,
                updatedAt: databaseNow,
              })
              .where(and(
                eq(translationTaskGenerationHeads.translationKind, unit.translationKind),
                eq(translationTaskGenerationHeads.sourceNamespace, unit.sourceNamespace),
                eq(translationTaskGenerationHeads.sourceKey, unit.sourceKey),
                eq(translationTaskGenerationHeads.targetLocale, unit.targetLocale),
              ));
          }

          return {
            outcome: "task" as const,
            created: false,
            task: contentTask(reactivatedTask, metadataRows[0]),
          };
        }

        await consumeContentTranslationRequestBudgetInTransaction(
          transaction,
          requestBudgetAdmission,
        );

        const generation = insertedHead.length === 1
          ? currentGeneration!
          : currentGeneration! + 1;
        const inserted = await transaction
          .insert(translationTasks)
          .values({
            taskIdentity: specification.taskIdentity,
            translationKind: specification.translationKind,
            sourceNamespace: "topic-title",
            sourceKey: specification.sourceIdentity.topicId,
            sourceFingerprint: specification.sourceFingerprint,
            targetLocale: specification.targetLocale,
            generationPolicyVersion: specification.generationPolicyVersion,
            generation,
            status: "pending",
            attemptCount: 0,
            maxAttempts: DEFAULT_TRANSLATION_TASK_MAX_ATTEMPTS,
          })
          .returning();
        const taskRow = requiredTaskRow(inserted[0]);

        const metadataRows = await transaction
          .insert(contentTopicTitleTranslationTasks)
          .values({
            taskId: taskRow.id,
            translationKind: specification.translationKind,
            sourceNamespace: "topic-title",
            topicId: specification.sourceIdentity.topicId,
            revisionId: specification.sourceIdentity.revisionId,
            revisionSourceLocale: specification.revisionSourceLocale,
            resolvedSourceLocale: specification.resolvedSourceLocale,
            sourceResolutionOrigin: specification.sourceResolutionOrigin,
          })
          .returning();
        const metadata = metadataRows[0];
        if (!metadata) {
          throw new ContentTopicTitleTaskIntegrityError(
            "content topic-title task metadata insert returned no row",
          );
        }

        if (generation !== currentGeneration) {
          await transaction
            .update(translationTaskGenerationHeads)
            .set({
              currentGeneration: generation,
              updatedAt: sql`statement_timestamp()`,
            })
            .where(and(
              eq(translationTaskGenerationHeads.translationKind, unit.translationKind),
              eq(translationTaskGenerationHeads.sourceNamespace, unit.sourceNamespace),
              eq(translationTaskGenerationHeads.sourceKey, unit.sourceKey),
              eq(translationTaskGenerationHeads.targetLocale, unit.targetLocale),
            ));
        }

        return {
          outcome: "task" as const,
          created: true,
          task: contentTask(taskRow, metadata),
        };
      });
    } catch (error) {
      if (error instanceof ContentTopicTitlePlanningNoWorkRollback) {
        return { outcome: error.outcome };
      }
      if (error instanceof ContentTranslationRequestBudgetDeniedRollback) {
        return {
          outcome: "request-budget-denied",
          decision: error.decision,
        };
      }
      throw error;
    }
  }
}

async function assertStableIdentity(
  specification: ContentTopicTitleTranslationTaskSpecification,
): Promise<void> {
  if (await contentTopicTitleTaskIdentity(specification) !== specification.taskIdentity) {
    throw new ContentTopicTitleTaskIntegrityError(
      "taskIdentity does not match content topic-title task data",
    );
  }
}

function assertExpectedRevision(
  specification: ContentTopicTitleTranslationTaskSpecification,
  revision: ContentTranslationRevision,
): void {
  if (
    revision.contentType !== "topic-title"
    || revision.contentId !== specification.sourceIdentity.topicId
    || revision.revisionId !== specification.sourceIdentity.revisionId
    || revision.sourceLocale !== specification.revisionSourceLocale
    || typeof revision.originalContent !== "string"
    || !revision.originalContent.trim()
  ) {
    throw new ContentTopicTitleTaskIntegrityError(
      "expected topic-title revision does not match content task identity",
    );
  }
}

function assertTaskMatchesSpecification(
  row: TranslationTaskRow,
  specification: ContentTopicTitleTranslationTaskSpecification,
): void {
  if (
    row.taskIdentity !== specification.taskIdentity
    || row.translationKind !== specification.translationKind
    || row.sourceNamespace !== "topic-title"
    || row.sourceKey !== specification.sourceIdentity.topicId
    || row.sourceFingerprint !== specification.sourceFingerprint
    || row.targetLocale !== specification.targetLocale
    || row.generationPolicyVersion !== specification.generationPolicyVersion
  ) {
    throw new ContentTopicTitleTaskIntegrityError(
      "stable content task identity conflicts with different task data",
    );
  }
}

function assertMetadataMatchesSpecification(
  row: ContentTaskRow | undefined,
  specification: ContentTopicTitleTranslationTaskSpecification,
): asserts row is ContentTaskRow {
  if (
    !row
    || row.translationKind !== specification.translationKind
    || row.sourceNamespace !== "topic-title"
    || row.topicId !== specification.sourceIdentity.topicId
    || row.revisionId !== specification.sourceIdentity.revisionId
    || row.revisionSourceLocale !== specification.revisionSourceLocale
    || row.resolvedSourceLocale !== specification.resolvedSourceLocale
    || row.sourceResolutionOrigin !== specification.sourceResolutionOrigin
  ) {
    throw new ContentTopicTitleTaskIntegrityError(
      "content topic-title task metadata conflicts with task identity",
    );
  }
}

function contentTask(
  row: TranslationTaskRow,
  metadata: ContentTaskRow,
): ContentTopicTitleTranslationTask {
  if (
    row.translationKind !== "content-topic-title"
    || metadata.translationKind !== "content-topic-title"
    || !Number.isSafeInteger(row.generation)
    || row.generation <= 0
    || !Number.isSafeInteger(row.attemptCount)
    || !Number.isSafeInteger(row.maxAttempts)
    || row.attemptCount < 0
    || row.maxAttempts <= 0
    || row.attemptCount > row.maxAttempts
    || !(row.createdAt instanceof Date)
    || !(row.updatedAt instanceof Date)
  ) {
    throw new ContentTopicTitleTaskIntegrityError("stored content topic-title task is invalid");
  }

  return {
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
}

function requiredTaskRow(row: TranslationTaskRow | undefined): TranslationTaskRow {
  if (!row) {
    throw new ContentTopicTitleTaskIntegrityError("content topic-title task insert returned no row");
  }
  return row;
}

function requireNonBlank(value: string, field: string): void {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${field} must be a non-blank string`);
  }
}
