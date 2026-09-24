import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { ContentTranslationRevision } from "../app/localization/content-translation";
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
  forumTopicTitleRevisions,
  forumTopics,
  translationTaskGenerationHeads,
  translationTasks,
} from "./schema";

type TranslationTaskRow = typeof translationTasks.$inferSelect;

export class ContentTopicTitleTaskIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentTopicTitleTaskIntegrityError";
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
  ): Promise<ContentTopicTitleTaskUpsertResult> {
    validateContentTopicTitleTranslationTaskSpecification(specification);
    await assertStableIdentity(specification);
    assertExpectedRevision(specification, expectedRevision);

    return this.database.transaction(async (transaction) => {
      const authoritative = await transaction
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
        .where(eq(forumTopics.id, specification.sourceIdentity.topicId))
        .for("share");

      const current = authoritative[0];
      if (
        !current
        || current.topicId !== expectedRevision.contentId
        || current.revisionId !== expectedRevision.revisionId
        || current.originalContent !== expectedRevision.originalContent
        || current.sourceLocale !== expectedRevision.sourceLocale
      ) {
        return { outcome: "revision-changed" as const };
      }

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
        .limit(1);
      if (existingRows[0]) {
        assertTaskMatchesSpecification(existingRows[0], specification);
        if (existingRows[0].status !== "pending" && existingRows[0].status !== "processing") {
          throw new ContentTopicTitleTaskIntegrityError(
            "content topic-title task identity is already terminal",
          );
        }
        return {
          outcome: "task" as const,
          created: false,
          task: contentTask(existingRows[0]),
        };
      }

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
          contentId: specification.sourceIdentity.topicId,
          contentRevisionId: specification.sourceIdentity.revisionId,
          revisionSourceLocale: specification.revisionSourceLocale,
          resolvedSourceLocale: specification.resolvedSourceLocale,
          sourceResolutionOrigin: specification.sourceResolutionOrigin,
          generation,
          status: "pending",
          attemptCount: 0,
          maxAttempts: DEFAULT_TRANSLATION_TASK_MAX_ATTEMPTS,
        })
        .returning();
      const taskRow = requiredTaskRow(inserted[0]);

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
        task: contentTask(taskRow),
      };
    });
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
    || row.contentId !== specification.sourceIdentity.topicId
    || row.contentRevisionId !== specification.sourceIdentity.revisionId
    || row.revisionSourceLocale !== specification.revisionSourceLocale
    || row.resolvedSourceLocale !== specification.resolvedSourceLocale
    || row.sourceResolutionOrigin !== specification.sourceResolutionOrigin
  ) {
    throw new ContentTopicTitleTaskIntegrityError(
      "stable content task identity conflicts with different task data",
    );
  }
}

function contentTask(row: TranslationTaskRow): ContentTopicTitleTranslationTask {
  if (
    row.translationKind !== "content-topic-title"
    || row.sourceNamespace !== "topic-title"
    || !row.contentId
    || !row.contentRevisionId
    || !row.revisionSourceLocale
    || !row.resolvedSourceLocale
    || (
      row.sourceResolutionOrigin !== "revision-metadata"
      && row.sourceResolutionOrigin !== "detector"
    )
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
      topicId: row.contentId,
      revisionId: row.contentRevisionId,
    },
    revisionSourceLocale: row.revisionSourceLocale,
    resolvedSourceLocale: row.resolvedSourceLocale,
    sourceResolutionOrigin: row.sourceResolutionOrigin,
    sourceFingerprint: row.sourceFingerprint,
    targetLocale: row.targetLocale,
    generationPolicyVersion: row.generationPolicyVersion,
    generation: row.generation,
    status: row.status as ContentTopicTitleTranslationTask["status"],
    attemptCount: row.attemptCount,
    maxAttempts: row.maxAttempts,
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
