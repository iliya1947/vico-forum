import { and, eq, gt, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { ContentPostBodyRevisionReader } from "../app/localization/content-post-body-task-consumer";
import type {
  ContentPostBodyPublicationResult,
  ContentPostBodyPublicationStore,
  MachineContentPostBodyPublication,
} from "../app/localization/content-post-body-publication";
import {
  ContentTranslationConflictError,
  type ContentTranslationRevision,
  type StoredContentTranslation,
} from "../app/localization/content-translation";
import { TranslationExecutionFailure } from "../app/localization/translation-failures";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import { isPostgresQueryTimeout } from "./postgres-deadlines";
import { writePostBodyTranslationWithTrust } from "./content-translation-store";
import {
  contentPostBodyTranslationTasks,
  forumPostBodyTranslations,
  forumPostRevisions,
  forumPosts,
  translationTaskGenerationHeads,
  translationTasks,
} from "./schema";

type ContentPublicationTransaction =
  Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0];

export class ContentPostBodyPublicationIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentPostBodyPublicationIntegrityError";
  }
}

class ContentPostBodyPublicationClaimLostRollback extends Error {
  constructor() {
    super("content post-body publication claim is no longer active");
    this.name = "ContentPostBodyPublicationClaimLostRollback";
  }
}

export class DrizzleContentPostBodyExecutionStore
  implements ContentPostBodyRevisionReader, ContentPostBodyPublicationStore {
  constructor(private readonly database: NodePgDatabase) {}

  async readCurrentRevision(postId: string): Promise<ContentTranslationRevision | undefined> {
    try {
      const [row] = await this.database
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

      return row
        ? {
            contentType: "post-body",
            contentId: row.postId,
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
    publication: MachineContentPostBodyPublication,
  ): Promise<ContentPostBodyPublicationResult> {
    try {
      return await this.database.transaction(async (tx) => {
        // Shared planning/publication lock order:
        // generation head -> stable task -> current post/revision -> current translation.
        const [head] = await tx
          .select({ currentGeneration: translationTaskGenerationHeads.currentGeneration })
          .from(translationTaskGenerationHeads)
          .where(and(
            eq(translationTaskGenerationHeads.translationKind, "content-post-body"),
            eq(translationTaskGenerationHeads.sourceNamespace, "post-body"),
            eq(translationTaskGenerationHeads.sourceKey, publication.task.sourceIdentity.postId),
            eq(translationTaskGenerationHeads.targetLocale, publication.task.targetLocale),
          ))
          .for("update");

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

        const [lease] = await tx
          .select({
            active: sql<boolean>\`${translationTasks.leaseExpiresAt} > statement_timestamp()\`,
          })
          .from(translationTasks)
          .where(eq(translationTasks.id, publication.task.id))
          .limit(1);
        if (!lease?.active) return { outcome: "claim-lost" as const };

        if (!head || head.currentGeneration !== publication.task.generation) {
          return markClaimStale(tx, publication, "generation-superseded");
        }

        const [post] = await tx
          .select({ currentRevisionId: forumPosts.currentRevisionId })
          .from(forumPosts)
          .where(eq(forumPosts.id, publication.task.sourceIdentity.postId))
          .for("update");
        if (
          !post
          || post.currentRevisionId !== publication.task.sourceIdentity.revisionId
        ) {
          return markClaimStale(tx, publication, "revision-not-current");
        }

        const [metadata] = await tx
          .select()
          .from(contentPostBodyTranslationTasks)
          .where(eq(contentPostBodyTranslationTasks.taskId, publication.task.id))
          .limit(1);
        if (!metadata) {
          throw new ContentPostBodyPublicationIntegrityError(
            "content post-body task metadata is missing during publication",
          );
        }
        assertMetadataMatchesPublication(metadata, publication);

        if (
          task.generationPolicyVersion !== publication.generationPolicyVersion
          || publication.task.generationPolicyVersion !== publication.generationPolicyVersion
        ) {
          return markClaimStale(tx, publication, "policy-changed");
        }
        if (
          metadata.protectedContentPolicyVersion !== publication.protectedContentPolicyVersion
          || publication.task.protectedContentPolicyVersion !== publication.protectedContentPolicyVersion
        ) {
          return markClaimStale(tx, publication, "protected-policy-changed");
        }

        const [revision] = await tx
          .select({
            originalContent: forumPostRevisions.originalContent,
            sourceLocale: forumPostRevisions.sourceLocale,
          })
          .from(forumPostRevisions)
          .where(and(
            eq(forumPostRevisions.postId, publication.task.sourceIdentity.postId),
            eq(forumPostRevisions.id, publication.task.sourceIdentity.revisionId),
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
          .select({ origin: forumPostBodyTranslations.origin })
          .from(forumPostBodyTranslations)
          .where(and(
            eq(forumPostBodyTranslations.postId, publication.task.sourceIdentity.postId),
            eq(forumPostBodyTranslations.revisionId, publication.task.sourceIdentity.revisionId),
            eq(forumPostBodyTranslations.targetLocale, publication.task.targetLocale),
          ))
          .for("update");
        if (existing) {
          return markClaimStale(tx, publication, "translation-current");
        }

        const machineTranslation: StoredContentTranslation = {
          contentType: "post-body",
          contentId: publication.task.sourceIdentity.postId,
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
          stored = await writePostBodyTranslationWithTrust(tx, machineTranslation);
        } catch (error) {
          if (error instanceof ContentTranslationConflictError) {
            return markClaimStale(tx, publication, "translation-current");
          }
          throw error;
        }

        if (stored.provenance.origin !== "machine") {
          return markClaimStale(tx, publication, "translation-current");
        }

        const databaseNow = sql\`statement_timestamp()\`;
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
            eq(translationTasks.translationKind, "content-post-body"),
            eq(translationTasks.status, "processing"),
            eq(translationTasks.claimToken, publication.task.claimToken),
            gt(translationTasks.leaseExpiresAt, databaseNow),
            eq(translationTasks.sourceNamespace, "post-body"),
            eq(translationTasks.sourceKey, publication.task.sourceIdentity.postId),
            eq(translationTasks.sourceFingerprint, publication.task.sourceFingerprint),
            eq(translationTasks.targetLocale, publication.task.targetLocale),
            eq(translationTasks.generationPolicyVersion, publication.generationPolicyVersion),
            eq(translationTasks.generation, publication.task.generation),
          ))
          .returning({ id: translationTasks.id });

        if (!completed[0]) {
          throw new ContentPostBodyPublicationClaimLostRollback();
        }
        return { outcome: "published" };
      });
    } catch (error) {
      if (error instanceof ContentPostBodyPublicationClaimLostRollback) {
        return { outcome: "claim-lost" };
      }
      throw classifyDependencyFailure(error);
    }
  }
}

async function markClaimStale(
  tx: ContentPublicationTransaction,
  publication: MachineContentPostBodyPublication,
  reason: Extract<ContentPostBodyPublicationResult, { outcome: "stale" }>["reason"],
): Promise<ContentPostBodyPublicationResult> {
  const databaseNow = sql\`statement_timestamp()\`;
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
      gt(translationTasks.leaseExpiresAt, databaseNow),
    ))
    .returning({ id: translationTasks.id });
  return rows[0]
    ? { outcome: "stale", reason }
    : { outcome: "claim-lost" };
}

function assertTaskMatchesPublication(
  task: typeof translationTasks.$inferSelect,
  publication: MachineContentPostBodyPublication,
): void {
  if (
    task.taskIdentity !== publication.task.taskIdentity
    || task.translationKind !== "content-post-body"
    || task.sourceNamespace !== "post-body"
    || task.sourceKey !== publication.task.sourceIdentity.postId
    || task.sourceFingerprint !== publication.task.sourceFingerprint
    || task.targetLocale !== publication.task.targetLocale
    || task.generation !== publication.task.generation
  ) {
    throw new ContentPostBodyPublicationIntegrityError(
      "stored post-body task no longer matches the claimed publication context",
    );
  }
}

function assertMetadataMatchesPublication(
  metadata: typeof contentPostBodyTranslationTasks.$inferSelect,
  publication: MachineContentPostBodyPublication,
): void {
  if (
    metadata.translationKind !== "content-post-body"
    || metadata.sourceNamespace !== "post-body"
    || metadata.postId !== publication.task.sourceIdentity.postId
    || metadata.revisionId !== publication.task.sourceIdentity.revisionId
    || metadata.revisionSourceLocale !== publication.task.revisionSourceLocale
    || metadata.resolvedSourceLocale !== publication.task.resolvedSourceLocale
    || metadata.sourceResolutionOrigin !== publication.task.sourceResolutionOrigin
    || metadata.protectedContentPolicyVersion !== publication.task.protectedContentPolicyVersion
  ) {
    throw new ContentPostBodyPublicationIntegrityError(
      "content post-body task metadata no longer matches the claimed publication context",
    );
  }
}

function classifyDependencyFailure(error: unknown): unknown {
  if (
    error instanceof TranslationExecutionFailure
    || error instanceof ContentPostBodyPublicationIntegrityError
    || error instanceof ContentTranslationConflictError
  ) {
    return error;
  }
  if (isDatabaseAvailabilityFailure(error)) {
    return new TranslationExecutionFailure(
      "retryable",
      "dependency-temporary",
      "content post-body persistence dependency unavailable",
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
