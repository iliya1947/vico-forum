import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { ContentTranslationRevision } from "../app/localization/content-translation";
import {
  validateContentTranslationRequestBudgetAdmission,
  type ContentTranslationRequestBudgetAdmission,
} from "../app/localization/content-request-budget.server";
import {
  contentPostBodyTaskIdentity,
  type ContentPostBodyPlanningStore,
  type ContentPostBodyTaskUpsertResult,
} from "../app/localization/content-post-body-planning";
import {
  DEFAULT_TRANSLATION_TASK_MAX_ATTEMPTS,
  validateContentPostBodyTranslationTaskSpecification,
  type ContentPostBodyTranslationTask,
  type ContentPostBodyTranslationTaskSpecification,
} from "../app/localization/translation-tasks";
import {
  ContentTranslationRequestBudgetDeniedRollback,
  consumeContentTranslationRequestBudgetInTransaction,
} from "./content-request-budget-store";
import { readContentTranslationForUpdate } from "./content-translation-store";
import {
  contentPostBodyTranslationTasks,
  forumPostRevisions,
  forumPosts,
  translationTaskGenerationHeads,
  translationTasks,
} from "./schema";

type TranslationTaskRow = typeof translationTasks.$inferSelect;
type ContentTaskRow = typeof contentPostBodyTranslationTasks.$inferSelect;

export class ContentPostBodyTaskIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentPostBodyTaskIntegrityError";
  }
}

class ContentPostBodyPlanningNoWorkRollback extends Error {
  constructor(
    readonly outcome: "revision-changed" | "translation-current" | "task-completed",
  ) {
    super(`content post-body planning stopped: ${outcome}`);
    this.name = "ContentPostBodyPlanningNoWorkRollback";
  }
}

export class DrizzleContentPostBodyPlanningStore implements ContentPostBodyPlanningStore {
  constructor(private readonly database: NodePgDatabase) {}

  async readCurrentRevision(postId: string): Promise<ContentTranslationRevision | undefined> {
    requireNonBlank(postId, "post id");
    const rows = await this.database
      .select({
        postId: forumPosts.id,
        revisionId: forumPostRevisions.id,
        originalContent: forumPostRevisions.originalContent,
        sourceLocale: forumPostRevisions.sourceLocale,
      })
      .from(forumPosts)
      .innerJoin(
        forumPostRevisions,
        and(
          eq(forumPostRevisions.postId, forumPosts.id),
          eq(forumPostRevisions.id, forumPosts.currentRevisionId),
        ),
      )
      .where(eq(forumPosts.id, postId))
      .limit(1);

    const row = rows[0];
    return row
      ? {
          contentType: "post-body",
          contentId: row.postId,
          revisionId: row.revisionId,
          originalContent: row.originalContent,
          sourceLocale: row.sourceLocale,
        }
      : undefined;
  }

  async upsertPending(
    specification: ContentPostBodyTranslationTaskSpecification,
    expectedRevision: ContentTranslationRevision,
    requestBudgetAdmission: ContentTranslationRequestBudgetAdmission,
  ): Promise<ContentPostBodyTaskUpsertResult> {
    validateContentPostBodyTranslationTaskSpecification(specification);
    await assertStableIdentity(specification);
    assertExpectedRevision(specification, expectedRevision);
    validateContentTranslationRequestBudgetAdmission(requestBudgetAdmission);

    try {
      return await this.database.transaction(async (transaction) => {
        const unit = {
          translationKind: specification.translationKind,
          sourceNamespace: "post-body",
          sourceKey: specification.sourceIdentity.postId,
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
          throw new ContentPostBodyTaskIntegrityError(
            "content post-body generation head is missing or invalid",
          );
        }

        const existingRows = await transaction
          .select()
          .from(translationTasks)
          .where(eq(translationTasks.taskIdentity, specification.taskIdentity))
          .for("update")
          .limit(1);

        const [post] = await transaction
          .select({ currentRevisionId: forumPosts.currentRevisionId })
          .from(forumPosts)
          .where(eq(forumPosts.id, specification.sourceIdentity.postId))
          .for("update");
        if (
          !post
          || post.currentRevisionId !== expectedRevision.revisionId
        ) {
          throw new ContentPostBodyPlanningNoWorkRollback("revision-changed");
        }

        const [current] = await transaction
          .select({
            postId: forumPostRevisions.postId,
            revisionId: forumPostRevisions.id,
            originalContent: forumPostRevisions.originalContent,
            sourceLocale: forumPostRevisions.sourceLocale,
          })
          .from(forumPostRevisions)
          .where(and(
            eq(forumPostRevisions.postId, specification.sourceIdentity.postId),
            eq(forumPostRevisions.id, post.currentRevisionId),
          ))
          .for("update");
        if (
          !current
          || current.postId !== expectedRevision.contentId
          || current.revisionId !== expectedRevision.revisionId
          || current.originalContent !== expectedRevision.originalContent
          || current.sourceLocale !== expectedRevision.sourceLocale
        ) {
          throw new ContentPostBodyPlanningNoWorkRollback("revision-changed");
        }

        const currentTranslation = await readContentTranslationForUpdate(transaction, {
          contentType: "post-body",
          contentId: current.postId,
          revisionId: current.revisionId,
          targetLocale: specification.targetLocale,
        });
        if (currentTranslation) {
          if (currentTranslation.sourceLocale !== current.sourceLocale) {
            throw new ContentPostBodyTaskIntegrityError(
              "current post-body translation source locale conflicts with immutable revision",
            );
          }
          throw new ContentPostBodyPlanningNoWorkRollback("translation-current");
        }

        if (existingRows[0]) {
          assertTaskMatchesSpecification(existingRows[0], specification);
          const metadataRows = await transaction
            .select()
            .from(contentPostBodyTranslationTasks)
            .where(eq(contentPostBodyTranslationTasks.taskId, existingRows[0].id))
            .limit(1);
          assertMetadataMatchesSpecification(metadataRows[0], specification);

          if (existingRows[0].status === "completed") {
            throw new ContentPostBodyPlanningNoWorkRollback("task-completed");
          }
          if (
            existingRows[0].status !== "pending"
            && existingRows[0].status !== "processing"
            && existingRows[0].status !== "stale"
          ) {
            throw new ContentPostBodyTaskIntegrityError(
              "content post-body task identity is already terminal",
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
            sourceNamespace: "post-body",
            sourceKey: specification.sourceIdentity.postId,
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
          .insert(contentPostBodyTranslationTasks)
          .values({
            taskId: taskRow.id,
            translationKind: specification.translationKind,
            sourceNamespace: "post-body",
            postId: specification.sourceIdentity.postId,
            revisionId: specification.sourceIdentity.revisionId,
            revisionSourceLocale: specification.revisionSourceLocale,
            resolvedSourceLocale: specification.resolvedSourceLocale,
            sourceResolutionOrigin: specification.sourceResolutionOrigin,
            protectedContentPolicyVersion: specification.protectedContentPolicyVersion,
          })
          .returning();
        const metadata = metadataRows[0];
        if (!metadata) {
          throw new ContentPostBodyTaskIntegrityError(
            "content post-body task metadata insert returned no row",
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
      if (error instanceof ContentPostBodyPlanningNoWorkRollback) {
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
  specification: ContentPostBodyTranslationTaskSpecification,
): Promise<void> {
  if (await contentPostBodyTaskIdentity(specification) !== specification.taskIdentity) {
    throw new ContentPostBodyTaskIntegrityError(
      "taskIdentity does not match content post-body task data",
    );
  }
}

function assertExpectedRevision(
  specification: ContentPostBodyTranslationTaskSpecification,
  revision: ContentTranslationRevision,
): void {
  if (
    revision.contentType !== "post-body"
    || revision.contentId !== specification.sourceIdentity.postId
    || revision.revisionId !== specification.sourceIdentity.revisionId
    || revision.sourceLocale !== specification.revisionSourceLocale
    || typeof revision.originalContent !== "string"
    || !revision.originalContent.trim()
  ) {
    throw new ContentPostBodyTaskIntegrityError(
      "expected post-body revision does not match content task identity",
    );
  }
}

function assertTaskMatchesSpecification(
  row: TranslationTaskRow,
  specification: ContentPostBodyTranslationTaskSpecification,
): void {
  if (
    row.taskIdentity !== specification.taskIdentity
    || row.translationKind !== specification.translationKind
    || row.sourceNamespace !== "post-body"
    || row.sourceKey !== specification.sourceIdentity.postId
    || row.sourceFingerprint !== specification.sourceFingerprint
    || row.targetLocale !== specification.targetLocale
    || row.generationPolicyVersion !== specification.generationPolicyVersion
  ) {
    throw new ContentPostBodyTaskIntegrityError(
      "stable content task identity conflicts with different task data",
    );
  }
}

function assertMetadataMatchesSpecification(
  row: ContentTaskRow | undefined,
  specification: ContentPostBodyTranslationTaskSpecification,
): asserts row is ContentTaskRow {
  if (
    !row
    || row.translationKind !== specification.translationKind
    || row.sourceNamespace !== "post-body"
    || row.postId !== specification.sourceIdentity.postId
    || row.revisionId !== specification.sourceIdentity.revisionId
    || row.revisionSourceLocale !== specification.revisionSourceLocale
    || row.resolvedSourceLocale !== specification.resolvedSourceLocale
    || row.sourceResolutionOrigin !== specification.sourceResolutionOrigin
    || row.protectedContentPolicyVersion !== specification.protectedContentPolicyVersion
  ) {
    throw new ContentPostBodyTaskIntegrityError(
      "content post-body task metadata conflicts with task identity",
    );
  }
}

function contentTask(
  row: TranslationTaskRow,
  metadata: ContentTaskRow,
): ContentPostBodyTranslationTask {
  if (
    row.translationKind !== "content-post-body"
    || metadata.translationKind !== "content-post-body"
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
    throw new ContentPostBodyTaskIntegrityError("stored content post-body task is invalid");
  }

  return {
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
}

function requiredTaskRow(row: TranslationTaskRow | undefined): TranslationTaskRow {
  if (!row) {
    throw new ContentPostBodyTaskIntegrityError("content post-body task insert returned no row");
  }
  return row;
}

function requireNonBlank(value: string, field: string): void {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${field} must be a non-blank string`);
  }
}
