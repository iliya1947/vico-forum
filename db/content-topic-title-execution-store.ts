import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { ContentTopicTitleRevisionReader } from "../app/localization/content-translation-task-consumer";
import type {
  ContentTopicTitlePublicationResult,
  ContentTopicTitlePublicationStore,
  MachineContentTopicTitlePublication,
} from "../app/localization/content-translation-publication";
import {
  ContentTranslationConflictError,
  type ContentTranslationRevision,
  type StoredContentTranslation,
} from "../app/localization/content-translation";
import { TranslationExecutionFailure } from "../app/localization/translation-failures";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import { isPostgresQueryTimeout } from "./postgres-deadlines";
import { writeTopicTitleTranslationWithTrust } from "./content-translation-store";
import {
  contentTopicTitleTranslationTasks,
  forumTopicTitleRevisions,
  forumTopicTitleTranslations,
  forumTopics,
  translationTaskGenerationHeads,
  translationTasks,
} from "./schema";

type ContentPublicationTransaction =
  Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0];

export class ContentTopicTitlePublicationIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentTopicTitlePublicationIntegrityError";
  }
}

export class DrizzleContentTopicTitleExecutionStore
  implements ContentTopicTitleRevisionReader, ContentTopicTitlePublicationStore {
  constructor(private readonly database: NodePgDatabase) {}

  async readCurrentRevision(topicId: string): Promise<ContentTranslationRevision | undefined> {
    try {
      const [row] = await this.database
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

      return row
        ? {
            contentType: "topic-title",
            contentId: row.topicId,
            revisionId: row.revisionId,
            originalContent: row.originalContent,
            sourceLocale: row.sourceLocale,
          }
        : undefined;
    } catch (error) {
      throw classifyDependencyFailure(error);
    }
  }

  async publishClaimedMachineResult(
    publication: MachineContentTopicTitlePublication,
  ): Promise<ContentTopicTitlePublicationResult> {
    try {
      return await this.database.transaction(async (tx) => {
        const [topic] = await tx
          .select({ currentTitleRevisionId: forumTopics.currentTitleRevisionId })
          .from(forumTopics)
          .where(eq(forumTopics.id, publication.task.sourceIdentity.topicId))
          .for("update");
        if (
          !topic
          || topic.currentTitleRevisionId !== publication.task.sourceIdentity.revisionId
        ) {
          return markClaimStale(tx, publication, "revision-not-current");
        }

        const [head] = await tx
          .select({ currentGeneration: translationTaskGenerationHeads.currentGeneration })
          .from(translationTaskGenerationHeads)
          .where(and(
            eq(translationTaskGenerationHeads.translationKind, "content-topic-title"),
            eq(translationTaskGenerationHeads.sourceNamespace, "topic-title"),
            eq(translationTaskGenerationHeads.sourceKey, publication.task.sourceIdentity.topicId),
            eq(translationTaskGenerationHeads.targetLocale, publication.task.targetLocale),
          ))
          .for("update");
        if (!head || head.currentGeneration !== publication.task.generation) {
          return markClaimStale(tx, publication, "generation-superseded");
        }

        const [task] = await tx
          .select()
          .from(translationTasks)
          .where(eq(translationTasks.id, publication.task.id))
          .for("update");

        if (
          !task
          || task.status !== "processing"
          || task.claimToken !== publication.task.claimToken
        ) {
          return { outcome: "claim-lost" as const };
        }
        assertTaskMatchesPublication(task, publication);

        const [metadata] = await tx
          .select()
          .from(contentTopicTitleTranslationTasks)
          .where(eq(contentTopicTitleTranslationTasks.taskId, publication.task.id))
          .limit(1);
        if (!metadata) {
          throw new ContentTopicTitlePublicationIntegrityError(
            "content topic-title task metadata is missing during publication",
          );
        }
        assertMetadataMatchesPublication(metadata, publication);

        if (
          task.generationPolicyVersion !== publication.generationPolicyVersion
          || publication.task.generationPolicyVersion !== publication.generationPolicyVersion
        ) {
          return markClaimStale(tx, publication, "policy-changed");
        }

        const [revision] = await tx
          .select({
            originalContent: forumTopicTitleRevisions.originalContent,
            sourceLocale: forumTopicTitleRevisions.sourceLocale,
          })
          .from(forumTopicTitleRevisions)
          .where(and(
            eq(forumTopicTitleRevisions.topicId, publication.task.sourceIdentity.topicId),
            eq(forumTopicTitleRevisions.id, publication.task.sourceIdentity.revisionId),
          ))
          .for("share");
        if (!revision) {
          return markClaimStale(tx, publication, "revision-not-current");
        }
        if (
          revision.sourceLocale !== publication.task.revisionSourceLocale
          || publication.revision.sourceLocale !== publication.task.revisionSourceLocale
          || revision.originalContent !== publication.revision.originalContent
        ) {
          return markClaimStale(tx, publication, "source-changed");
        }

        const [existing] = await tx
          .select({ origin: forumTopicTitleTranslations.origin })
          .from(forumTopicTitleTranslations)
          .where(and(
            eq(forumTopicTitleTranslations.topicId, publication.task.sourceIdentity.topicId),
            eq(forumTopicTitleTranslations.revisionId, publication.task.sourceIdentity.revisionId),
            eq(forumTopicTitleTranslations.targetLocale, publication.task.targetLocale),
          ))
          .for("update");
        if (existing) {
          return markClaimStale(tx, publication, "translation-current");
        }

        const machineTranslation: StoredContentTranslation = {
          contentType: "topic-title",
          contentId: publication.task.sourceIdentity.topicId,
          revisionId: publication.task.sourceIdentity.revisionId,
          targetLocale: publication.task.targetLocale,
          sourceLocale: publication.task.revisionSourceLocale,
          translatedContent: publication.translatedContent,
          provenance: {
            origin: "machine",
            provider: publication.provenance.provider,
            model: publication.provenance.model,
            ...(publication.provenance.attribution
              ? { attribution: publication.provenance.attribution }
              : {}),
          },
        };

        let stored: StoredContentTranslation;
        try {
          stored = await writeTopicTitleTranslationWithTrust(tx, machineTranslation);
        } catch (error) {
          if (error instanceof ContentTranslationConflictError) {
            return markClaimStale(tx, publication, "translation-current");
          }
          throw error;
        }

        if (stored.provenance.origin !== "machine") {
          return markClaimStale(tx, publication, "translation-current");
        }

        const databaseNow = sql`statement_timestamp()`;
        const completed = await tx
          .update(translationTasks)
          .set({
            status: "completed",
            claimToken: null,
            leaseExpiresAt: null,
            staleAt: null,
            completedAt: databaseNow,
            failedAt: null,
            lastFailureCode: null,
            failureDisposition: null,
            updatedAt: databaseNow,
          })
          .where(and(
            eq(translationTasks.id, publication.task.id),
            eq(translationTasks.taskIdentity, publication.task.taskIdentity),
            eq(translationTasks.translationKind, "content-topic-title"),
            eq(translationTasks.status, "processing"),
            eq(translationTasks.claimToken, publication.task.claimToken),
            eq(translationTasks.sourceNamespace, "topic-title"),
            eq(translationTasks.sourceKey, publication.task.sourceIdentity.topicId),
            eq(translationTasks.sourceFingerprint, publication.task.sourceFingerprint),
            eq(translationTasks.targetLocale, publication.task.targetLocale),
            eq(translationTasks.generationPolicyVersion, publication.generationPolicyVersion),
            eq(translationTasks.generation, publication.task.generation),
          ))
          .returning({ id: translationTasks.id });

        if (!completed[0]) {
          throw new ContentTopicTitlePublicationIntegrityError(
            "locked content task claim changed during publication",
          );
        }
        return { outcome: "published" };
      });
    } catch (error) {
      throw classifyDependencyFailure(error);
    }
  }
}

async function markClaimStale(
  tx: ContentPublicationTransaction,
  publication: MachineContentTopicTitlePublication,
  reason: Extract<ContentTopicTitlePublicationResult, { outcome: "stale" }>["reason"],
): Promise<ContentTopicTitlePublicationResult> {
  const databaseNow = sql`statement_timestamp()`;
  const rows = await tx
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
      eq(translationTasks.id, publication.task.id),
      eq(translationTasks.status, "processing"),
      eq(translationTasks.claimToken, publication.task.claimToken),
    ))
    .returning({ id: translationTasks.id });
  return rows[0]
    ? { outcome: "stale", reason }
    : { outcome: "claim-lost" };
}

function assertTaskMatchesPublication(
  task: typeof translationTasks.$inferSelect,
  publication: MachineContentTopicTitlePublication,
): void {
  if (
    task.taskIdentity !== publication.task.taskIdentity
    || task.translationKind !== "content-topic-title"
    || task.sourceNamespace !== "topic-title"
    || task.sourceKey !== publication.task.sourceIdentity.topicId
    || task.sourceFingerprint !== publication.task.sourceFingerprint
    || task.targetLocale !== publication.task.targetLocale
    || task.generation !== publication.task.generation
  ) {
    throw new ContentTopicTitlePublicationIntegrityError(
      "stored content task no longer matches the claimed publication context",
    );
  }
}

function assertMetadataMatchesPublication(
  metadata: typeof contentTopicTitleTranslationTasks.$inferSelect,
  publication: MachineContentTopicTitlePublication,
): void {
  if (
    metadata.translationKind !== "content-topic-title"
    || metadata.sourceNamespace !== "topic-title"
    || metadata.topicId !== publication.task.sourceIdentity.topicId
    || metadata.revisionId !== publication.task.sourceIdentity.revisionId
    || metadata.revisionSourceLocale !== publication.task.revisionSourceLocale
    || metadata.resolvedSourceLocale !== publication.task.resolvedSourceLocale
    || metadata.sourceResolutionOrigin !== publication.task.sourceResolutionOrigin
  ) {
    throw new ContentTopicTitlePublicationIntegrityError(
      "content task metadata no longer matches the claimed publication context",
    );
  }
}

function classifyDependencyFailure(error: unknown): unknown {
  if (
    error instanceof TranslationExecutionFailure
    || error instanceof ContentTopicTitlePublicationIntegrityError
    || error instanceof ContentTranslationConflictError
  ) {
    return error;
  }
  if (isDatabaseAvailabilityFailure(error)) {
    return new TranslationExecutionFailure(
      "retryable",
      "dependency-temporary",
      "content topic-title persistence dependency unavailable",
    );
  }
  return error;
}

function isDatabaseAvailabilityFailure(error: unknown): boolean {
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
