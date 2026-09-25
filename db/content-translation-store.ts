import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  ContentTranslationConflictError,
  ContentTranslationInvalidRecordError,
  ContentTranslationOwnershipError,
  ContentTranslationStorageUnavailableError,
  type ContentTranslationIdentity,
  type ContentTranslationStore,
  type StoredContentTranslation,
} from "../app/localization/content-translation";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import { isPostgresQueryTimeout } from "./postgres-deadlines";
import {
  forumPostBodyTranslations,
  forumPostRevisions,
  forumTopicTitleRevisions,
  forumTopicTitleTranslations,
} from "./schema";

export class DrizzleContentTranslationStore implements ContentTranslationStore {
  constructor(private readonly database: NodePgDatabase) {}

  async read(identity: ContentTranslationIdentity): Promise<StoredContentTranslation | undefined> {
    try {
      if (identity.contentType === "topic-title") {
        const [row] = await this.database
          .select({
            topicId: forumTopicTitleTranslations.topicId,
            revisionId: forumTopicTitleTranslations.revisionId,
            targetLocale: forumTopicTitleTranslations.targetLocale,
            sourceLocale: forumTopicTitleTranslations.sourceLocale,
            translatedContent: forumTopicTitleTranslations.translatedContent,
            origin: forumTopicTitleTranslations.origin,
            provider: forumTopicTitleTranslations.provider,
            providerModel: forumTopicTitleTranslations.providerModel,
            attribution: forumTopicTitleTranslations.attribution,
          })
          .from(forumTopicTitleTranslations)
          .where(and(
            eq(forumTopicTitleTranslations.topicId, identity.contentId),
            eq(forumTopicTitleTranslations.revisionId, identity.revisionId),
            eq(forumTopicTitleTranslations.targetLocale, identity.targetLocale),
          ));
        return row ? topicRow(row) : undefined;
      }

      const [row] = await this.database
        .select({
          postId: forumPostBodyTranslations.postId,
          revisionId: forumPostBodyTranslations.revisionId,
          targetLocale: forumPostBodyTranslations.targetLocale,
          sourceLocale: forumPostBodyTranslations.sourceLocale,
          translatedContent: forumPostBodyTranslations.translatedContent,
          origin: forumPostBodyTranslations.origin,
          provider: forumPostBodyTranslations.provider,
          providerModel: forumPostBodyTranslations.providerModel,
          attribution: forumPostBodyTranslations.attribution,
        })
        .from(forumPostBodyTranslations)
        .where(and(
          eq(forumPostBodyTranslations.postId, identity.contentId),
          eq(forumPostBodyTranslations.revisionId, identity.revisionId),
          eq(forumPostBodyTranslations.targetLocale, identity.targetLocale),
        ));
      return row ? postRow(row) : undefined;
    } catch (error) {
      throw classifyStorageFailure(error);
    }
  }

  async write(translation: StoredContentTranslation): Promise<StoredContentTranslation> {
    try {
      return translation.contentType === "topic-title"
        ? await this.writeTopicTitle(translation)
        : await this.writePostBody(translation);
    } catch (error) {
      throw classifyStorageFailure(error);
    }
  }

  private writeTopicTitle(translation: StoredContentTranslation) {
    return this.database.transaction((tx) =>
      writeTopicTitleTranslationWithTrust(tx, translation)
    );
  }

  private writePostBody(translation: StoredContentTranslation) {
    return this.database.transaction((tx) =>
      writePostBodyTranslationWithTrust(tx, translation)
    );
  }
}

export type ContentTranslationTransaction =
  Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0];

export async function readContentTranslationForUpdate(
  tx: ContentTranslationTransaction,
  identity: ContentTranslationIdentity,
): Promise<StoredContentTranslation | undefined> {
  if (identity.contentType === "topic-title") {
    const [row] = await tx
      .select({
        topicId: forumTopicTitleTranslations.topicId,
        revisionId: forumTopicTitleTranslations.revisionId,
        targetLocale: forumTopicTitleTranslations.targetLocale,
        sourceLocale: forumTopicTitleTranslations.sourceLocale,
        translatedContent: forumTopicTitleTranslations.translatedContent,
        origin: forumTopicTitleTranslations.origin,
        provider: forumTopicTitleTranslations.provider,
        providerModel: forumTopicTitleTranslations.providerModel,
        attribution: forumTopicTitleTranslations.attribution,
      })
      .from(forumTopicTitleTranslations)
      .where(and(
        eq(forumTopicTitleTranslations.topicId, identity.contentId),
        eq(forumTopicTitleTranslations.revisionId, identity.revisionId),
        eq(forumTopicTitleTranslations.targetLocale, identity.targetLocale),
      ))
      .for("update");
    return row ? topicRow(row) : undefined;
  }

  const [row] = await tx
    .select({
      postId: forumPostBodyTranslations.postId,
      revisionId: forumPostBodyTranslations.revisionId,
      targetLocale: forumPostBodyTranslations.targetLocale,
      sourceLocale: forumPostBodyTranslations.sourceLocale,
      translatedContent: forumPostBodyTranslations.translatedContent,
      origin: forumPostBodyTranslations.origin,
      provider: forumPostBodyTranslations.provider,
      providerModel: forumPostBodyTranslations.providerModel,
      attribution: forumPostBodyTranslations.attribution,
    })
    .from(forumPostBodyTranslations)
    .where(and(
      eq(forumPostBodyTranslations.postId, identity.contentId),
      eq(forumPostBodyTranslations.revisionId, identity.revisionId),
      eq(forumPostBodyTranslations.targetLocale, identity.targetLocale),
    ))
    .for("update");
  return row ? postRow(row) : undefined;
}

export async function writePostBodyTranslationWithTrust(
  tx: ContentTranslationTransaction,
  translation: StoredContentTranslation,
): Promise<StoredContentTranslation> {
  const [revision] = await tx
    .select({ sourceLocale: forumPostRevisions.sourceLocale })
    .from(forumPostRevisions)
    .where(and(
      eq(forumPostRevisions.postId, translation.contentId),
      eq(forumPostRevisions.id, translation.revisionId),
    ));
  assertRevisionOwnership(revision?.sourceLocale, translation.sourceLocale);

  const values = postValues(translation);
  const [inserted] = await tx
    .insert(forumPostBodyTranslations)
    .values(values)
    .onConflictDoNothing()
    .returning();
  if (inserted) return postRow(inserted);

  const [existing] = await tx
    .select()
    .from(forumPostBodyTranslations)
    .where(and(
      eq(forumPostBodyTranslations.postId, translation.contentId),
      eq(forumPostBodyTranslations.revisionId, translation.revisionId),
      eq(forumPostBodyTranslations.targetLocale, translation.targetLocale),
    ))
    .for("update");
  if (!existing) {
    throw new ContentTranslationConflictError("translation conflict row disappeared");
  }

  const current = postRow(existing);
  if (sameTranslation(current, translation)) return current;
  if (
    current.provenance.origin === "persistent_manual"
    && translation.provenance.origin === "machine"
  ) {
    return current;
  }
  if (
    current.provenance.origin === "machine"
    && translation.provenance.origin === "persistent_manual"
  ) {
    const [updated] = await tx
      .update(forumPostBodyTranslations)
      .set({
        translatedContent: translation.translatedContent,
        sourceLocale: translation.sourceLocale,
        origin: "persistent_manual",
        provider: null,
        providerModel: null,
        attribution: translation.provenance.attribution ?? null,
        updatedAt: sql`statement_timestamp()`,
      })
      .where(and(
        eq(forumPostBodyTranslations.postId, translation.contentId),
        eq(forumPostBodyTranslations.revisionId, translation.revisionId),
        eq(forumPostBodyTranslations.targetLocale, translation.targetLocale),
        eq(forumPostBodyTranslations.origin, "machine"),
      ))
      .returning();
    if (!updated) {
      throw new ContentTranslationConflictError("translation trust upgrade lost its row");
    }
    return postRow(updated);
  }
  throw new ContentTranslationConflictError(
    "conflicting translation already exists for this revision and target",
  );
}

export async function writeTopicTitleTranslationWithTrust(
  tx: ContentTranslationTransaction,
  translation: StoredContentTranslation,
): Promise<StoredContentTranslation> {
  const [revision] = await tx
    .select({ sourceLocale: forumTopicTitleRevisions.sourceLocale })
    .from(forumTopicTitleRevisions)
    .where(and(
      eq(forumTopicTitleRevisions.topicId, translation.contentId),
      eq(forumTopicTitleRevisions.id, translation.revisionId),
    ));
  assertRevisionOwnership(revision?.sourceLocale, translation.sourceLocale);

  const values = topicValues(translation);
  const [inserted] = await tx
    .insert(forumTopicTitleTranslations)
    .values(values)
    .onConflictDoNothing()
    .returning();
  if (inserted) return topicRow(inserted);

  const [existing] = await tx
    .select()
    .from(forumTopicTitleTranslations)
    .where(and(
      eq(forumTopicTitleTranslations.topicId, translation.contentId),
      eq(forumTopicTitleTranslations.revisionId, translation.revisionId),
      eq(forumTopicTitleTranslations.targetLocale, translation.targetLocale),
    ))
    .for("update");
  if (!existing) {
    throw new ContentTranslationConflictError("translation conflict row disappeared");
  }

  const current = topicRow(existing);
  if (sameTranslation(current, translation)) return current;
  if (
    current.provenance.origin === "persistent_manual"
    && translation.provenance.origin === "machine"
  ) {
    return current;
  }
  if (
    current.provenance.origin === "machine"
    && translation.provenance.origin === "persistent_manual"
  ) {
    const [updated] = await tx
      .update(forumTopicTitleTranslations)
      .set({
        translatedContent: translation.translatedContent,
        sourceLocale: translation.sourceLocale,
        origin: "persistent_manual",
        provider: null,
        providerModel: null,
        attribution: translation.provenance.attribution ?? null,
        updatedAt: sql`statement_timestamp()`,
      })
      .where(and(
        eq(forumTopicTitleTranslations.topicId, translation.contentId),
        eq(forumTopicTitleTranslations.revisionId, translation.revisionId),
        eq(forumTopicTitleTranslations.targetLocale, translation.targetLocale),
        eq(forumTopicTitleTranslations.origin, "machine"),
      ))
      .returning();
    if (!updated) {
      throw new ContentTranslationConflictError("translation trust upgrade lost its row");
    }
    return topicRow(updated);
  }
  throw new ContentTranslationConflictError(
    "conflicting translation already exists for this revision and target",
  );
}

function assertRevisionOwnership(actualSourceLocale: string | undefined, expectedSourceLocale: string): void {
  if (actualSourceLocale === undefined) {
    throw new ContentTranslationOwnershipError("content revision does not belong to the requested content entity");
  }
  if (actualSourceLocale !== expectedSourceLocale) {
    throw new ContentTranslationOwnershipError("content translation source locale does not match immutable revision");
  }
}

function topicValues(translation: StoredContentTranslation) {
  return {
    topicId: translation.contentId,
    revisionId: translation.revisionId,
    targetLocale: translation.targetLocale,
    sourceLocale: translation.sourceLocale,
    translatedContent: translation.translatedContent,
    origin: translation.provenance.origin,
    provider: translation.provenance.origin === "machine" ? translation.provenance.provider : null,
    providerModel: translation.provenance.origin === "machine" ? translation.provenance.model : null,
    attribution: translation.provenance.attribution ?? null,
  };
}

function postValues(translation: StoredContentTranslation) {
  return {
    postId: translation.contentId,
    revisionId: translation.revisionId,
    targetLocale: translation.targetLocale,
    sourceLocale: translation.sourceLocale,
    translatedContent: translation.translatedContent,
    origin: translation.provenance.origin,
    provider: translation.provenance.origin === "machine" ? translation.provenance.provider : null,
    providerModel: translation.provenance.origin === "machine" ? translation.provenance.model : null,
    attribution: translation.provenance.attribution ?? null,
  };
}

export type TranslationRow = {
  revisionId: string;
  targetLocale: string;
  sourceLocale: string;
  translatedContent: string;
  origin: string;
  provider: string | null;
  providerModel: string | null;
  attribution: string | null;
};

export function topicRow(row: TranslationRow & { topicId: string }): StoredContentTranslation {
  return storedRow("topic-title", row.topicId, row);
}

export function postRow(row: TranslationRow & { postId: string }): StoredContentTranslation {
  return storedRow("post-body", row.postId, row);
}

function storedRow(
  contentType: StoredContentTranslation["contentType"],
  contentId: string,
  row: TranslationRow,
): StoredContentTranslation {
  if (row.origin === "machine") {
    if (!row.provider?.trim() || !row.providerModel?.trim()) {
      throw new ContentTranslationInvalidRecordError("machine translation provenance is incomplete");
    }
    return {
      contentType,
      contentId,
      revisionId: row.revisionId,
      targetLocale: row.targetLocale,
      sourceLocale: row.sourceLocale,
      translatedContent: row.translatedContent,
      provenance: {
        origin: "machine",
        provider: row.provider,
        model: row.providerModel,
        ...(row.attribution ? { attribution: row.attribution } : {}),
      },
    };
  }

  if (row.origin === "persistent_manual") {
    if (row.provider !== null || row.providerModel !== null) {
      throw new ContentTranslationInvalidRecordError("manual translation unexpectedly contains provider metadata");
    }
    return {
      contentType,
      contentId,
      revisionId: row.revisionId,
      targetLocale: row.targetLocale,
      sourceLocale: row.sourceLocale,
      translatedContent: row.translatedContent,
      provenance: {
        origin: "persistent_manual",
        ...(row.attribution ? { attribution: row.attribution } : {}),
      },
    };
  }

  throw new ContentTranslationInvalidRecordError("content translation origin is invalid");
}

function sameTranslation(
  left: StoredContentTranslation,
  right: StoredContentTranslation,
): boolean {
  return left.contentType === right.contentType
    && left.contentId === right.contentId
    && left.revisionId === right.revisionId
    && left.targetLocale === right.targetLocale
    && left.sourceLocale === right.sourceLocale
    && left.translatedContent === right.translatedContent
    && JSON.stringify(left.provenance) === JSON.stringify(right.provenance);
}

export function classifyStorageFailure(error: unknown): unknown {
  if (
    error instanceof ContentTranslationConflictError
    || error instanceof ContentTranslationInvalidRecordError
    || error instanceof ContentTranslationOwnershipError
    || error instanceof ContentTranslationStorageUnavailableError
  ) {
    return error;
  }
  if (isContentTranslationStorageUnavailableFailure(error)) {
    return new ContentTranslationStorageUnavailableError("content translation storage is unavailable");
  }
  return error;
}

function isContentTranslationStorageUnavailableFailure(error: unknown): boolean {
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
