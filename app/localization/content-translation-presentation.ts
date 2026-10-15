import type { TextDirection } from "./locale";
import {
  ContentTranslationInvalidRecordError,
  ContentTranslationStorageUnavailableError,
  selectCurrentContentTranslation,
  type ContentTranslationFallbackReason,
  type ContentTranslationIdentity,
  type ContentTranslationProvenance,
  type ContentTranslationReadResult,
  type ContentTranslationRevision,
  type StoredContentTranslation,
} from "./content-translation";

export type ContentPresentationDirection = TextDirection | "auto";

export interface ContentTranslationBatchReadResult {
  readonly translations: readonly StoredContentTranslation[];
  readonly invalidIdentities?: readonly ContentTranslationIdentity[];
}

export interface ContentTranslationBatchReader {
  readBatch(
    identities: readonly ContentTranslationIdentity[],
  ): Promise<ContentTranslationBatchReadResult>;
}

export interface ContentTranslationPresentation {
  readonly contentType: ContentTranslationRevision["contentType"];
  readonly contentId: string;
  readonly revisionId: string;
  readonly selected: "translation" | "original";
  readonly content: string;
  readonly contentLocale?: string;
  readonly contentDirection: ContentPresentationDirection;
  readonly originalContent: string;
  readonly originalLocale?: string;
  readonly originalDirection: ContentPresentationDirection;
  readonly provenance?: ContentTranslationProvenance;
  readonly fallbackReason?: ContentTranslationFallbackReason;
}

export type ContentDirectionResolver = (
  locale: string,
) => TextDirection | undefined;

export class ContentTranslationPresentationService {
  constructor(private readonly reader: ContentTranslationBatchReader) {}

  async readCurrent(
    revisions: readonly ContentTranslationRevision[],
    targetLocale: string,
    targetDirection: TextDirection,
    directionForLocale: ContentDirectionResolver,
  ): Promise<readonly ContentTranslationPresentation[]> {
    const initial = revisions.map((revision) =>
      selectCurrentContentTranslation(revision, targetLocale, undefined)
    );
    const identities = revisions.flatMap((revision, index) => {
      const result = initial[index]!;
      if (result.selected === "original" && result.reason === "same-locale") return [];
      return [{
        contentType: revision.contentType,
        contentId: revision.contentId,
        revisionId: revision.revisionId,
        targetLocale,
      } satisfies ContentTranslationIdentity];
    });

    if (identities.length === 0) {
      return revisions.map((revision, index) =>
        present(revision, initial[index]!, targetDirection, directionForLocale)
      );
    }

    let batch: ContentTranslationBatchReadResult;
    try {
      batch = await this.reader.readBatch(identities);
    } catch (error) {
      if (error instanceof ContentTranslationStorageUnavailableError) {
        return revisions.map((revision, index) => {
          const current = initial[index]!;
          const result = current.selected === "original" && current.reason === "same-locale"
            ? current
            : originalWithReason(revision, "storage-unavailable");
          return present(revision, result, targetDirection, directionForLocale);
        });
      }
      if (error instanceof ContentTranslationInvalidRecordError) {
        return revisions.map((revision, index) => {
          const current = initial[index]!;
          const result = current.selected === "original" && current.reason === "same-locale"
            ? current
            : originalWithReason(revision, "invalid");
          return present(revision, result, targetDirection, directionForLocale);
        });
      }
      throw error;
    }

    const requested = new Set(identities.map(identityKey));
    const invalid = new Set(
      (batch.invalidIdentities ?? [])
        .filter((identity) => requested.has(identityKey(identity)))
        .map(identityKey),
    );
    const translations = new Map<string, StoredContentTranslation>();

    for (const translation of batch.translations) {
      const key = identityKey(translation);
      if (!requested.has(key) || invalid.has(key) || translations.has(key)) {
        if (requested.has(key)) invalid.add(key);
        continue;
      }
      translations.set(key, translation);
    }

    return revisions.map((revision, index) => {
      const current = initial[index]!;
      if (current.selected === "original" && current.reason === "same-locale") {
        return present(revision, current, targetDirection, directionForLocale);
      }

      const identity: ContentTranslationIdentity = {
        contentType: revision.contentType,
        contentId: revision.contentId,
        revisionId: revision.revisionId,
        targetLocale,
      };
      const key = identityKey(identity);
      const result = invalid.has(key)
        ? originalWithReason(revision, "invalid")
        : selectCurrentContentTranslation(revision, targetLocale, translations.get(key));
      return present(revision, result, targetDirection, directionForLocale);
    });
  }
}

function present(
  revision: ContentTranslationRevision,
  result: ContentTranslationReadResult,
  targetDirection: TextDirection,
  directionForLocale: ContentDirectionResolver,
): ContentTranslationPresentation {
  const originalLocale = revision.sourceLocale === "und" ? undefined : revision.sourceLocale;
  const originalDirection = originalLocale
    ? directionForLocale(originalLocale) ?? "auto"
    : "auto";

  if (result.selected === "translation") {
    return {
      contentType: revision.contentType,
      contentId: revision.contentId,
      revisionId: revision.revisionId,
      selected: "translation",
      content: result.content,
      contentLocale: result.contentLocale,
      contentDirection: targetDirection,
      originalContent: revision.originalContent,
      originalLocale,
      originalDirection,
      provenance: result.translation.provenance,
    };
  }

  return {
    contentType: revision.contentType,
    contentId: revision.contentId,
    revisionId: revision.revisionId,
    selected: "original",
    content: result.content,
    contentLocale: originalLocale,
    contentDirection: originalDirection,
    originalContent: revision.originalContent,
    originalLocale,
    originalDirection,
    fallbackReason: result.reason,
  };
}

function originalWithReason(
  revision: ContentTranslationRevision,
  reason: ContentTranslationFallbackReason,
): ContentTranslationReadResult {
  return {
    selected: "original",
    content: revision.originalContent,
    contentLocale: revision.sourceLocale,
    reason,
    translation: null,
  };
}

function identityKey(identity: ContentTranslationIdentity): string {
  return JSON.stringify([
    identity.contentType,
    identity.contentId,
    identity.revisionId,
    identity.targetLocale,
  ]);
}
