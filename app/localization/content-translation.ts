import { canonicalizeTranslationLocale } from "./locale";

export type ContentTranslationType = "topic-title" | "post-body";
export type ContentTranslationOrigin = "persistent_manual" | "machine";

export interface ContentTranslationRevision {
  readonly contentType: ContentTranslationType;
  readonly contentId: string;
  readonly revisionId: string;
  readonly originalContent: string;
  readonly sourceLocale: string;
}

export interface ContentTranslationIdentity {
  readonly contentType: ContentTranslationType;
  readonly contentId: string;
  readonly revisionId: string;
  readonly targetLocale: string;
}

export type ContentTranslationProvenance =
  | {
      readonly origin: "persistent_manual";
      readonly attribution?: string;
    }
  | {
      readonly origin: "machine";
      readonly provider: string;
      readonly model: string;
      readonly attribution?: string;
    };

export interface StoredContentTranslation extends ContentTranslationIdentity {
  readonly translatedContent: string;
  readonly sourceLocale: string;
  readonly provenance: ContentTranslationProvenance;
}

export interface ContentTranslationWriteInput {
  readonly revision: ContentTranslationRevision;
  readonly targetLocale: string;
  readonly translatedContent: string;
  readonly provenance: ContentTranslationProvenance;
}

export interface ContentTranslationStore {
  read(identity: ContentTranslationIdentity): Promise<StoredContentTranslation | undefined>;
  write(translation: StoredContentTranslation): Promise<StoredContentTranslation>;
}

export type ContentTranslationFallbackReason =
  | "same-locale"
  | "missing"
  | "stale"
  | "invalid"
  | "storage-unavailable";

export type ContentTranslationReadResult =
  | {
      readonly selected: "translation";
      readonly content: string;
      readonly contentLocale: string;
      readonly translation: StoredContentTranslation;
    }
  | {
      readonly selected: "original";
      readonly content: string;
      readonly contentLocale: string;
      readonly reason: ContentTranslationFallbackReason;
      readonly translation: null;
    };

export class InvalidContentTranslationInputError extends Error {}
export class ContentTranslationStorageUnavailableError extends Error {}
export class ContentTranslationInvalidRecordError extends Error {}
export class ContentTranslationOwnershipError extends Error {}
export class ContentTranslationConflictError extends Error {}

export class ContentTranslationService {
  constructor(private readonly store: ContentTranslationStore) {}

  async readCurrent(
    revisionInput: ContentTranslationRevision,
    targetLocaleInput: string,
  ): Promise<ContentTranslationReadResult> {
    const revision = normalizeRevision(revisionInput);
    const targetLocale = normalizeTargetLocale(targetLocaleInput);

    if (revision.sourceLocale !== "und" && revision.sourceLocale === targetLocale) {
      return originalResult(revision, "same-locale");
    }

    let stored: StoredContentTranslation | undefined;
    try {
      stored = await this.store.read({
        contentType: revision.contentType,
        contentId: revision.contentId,
        revisionId: revision.revisionId,
        targetLocale,
      });
    } catch (error) {
      if (error instanceof ContentTranslationStorageUnavailableError) {
        return originalResult(revision, "storage-unavailable");
      }
      if (error instanceof ContentTranslationInvalidRecordError) {
        return originalResult(revision, "invalid");
      }
      throw error;
    }

    return selectCurrentContentTranslation(revision, targetLocale, stored);
  }

  async write(input: ContentTranslationWriteInput): Promise<StoredContentTranslation> {
    const revision = normalizeRevision(input.revision);
    const targetLocale = normalizeTargetLocale(input.targetLocale);
    const translatedContent = requireNonBlank(input.translatedContent, "translated content");
    const provenance = normalizeProvenance(input.provenance);

    if (revision.sourceLocale !== "und" && revision.sourceLocale === targetLocale) {
      throw new InvalidContentTranslationInputError("translation target must differ from known source locale");
    }

    return this.store.write({
      contentType: revision.contentType,
      contentId: revision.contentId,
      revisionId: revision.revisionId,
      targetLocale,
      translatedContent,
      sourceLocale: revision.sourceLocale,
      provenance,
    });
  }
}

function normalizeRevision(revision: ContentTranslationRevision): ContentTranslationRevision {
  if (revision.contentType !== "topic-title" && revision.contentType !== "post-body") {
    throw new InvalidContentTranslationInputError("content type is invalid");
  }
  const contentId = requireNonBlank(revision.contentId, "content id");
  const revisionId = requireNonBlank(revision.revisionId, "revision id");
  const originalContent = requireNonBlank(revision.originalContent, "original content");
  const sourceLocale = normalizeSourceLocale(revision.sourceLocale);
  return { ...revision, contentId, revisionId, originalContent, sourceLocale };
}

function normalizeSourceLocale(value: string): string {
  if (value === "und") return value;
  const canonical = canonicalizeTranslationLocale(value);
  if (!canonical) {
    throw new InvalidContentTranslationInputError(
      "source locale must be und or a canonicalizable translation locale without formatting extensions",
    );
  }
  return canonical;
}

function normalizeTargetLocale(value: string): string {
  const canonical = canonicalizeTranslationLocale(value);
  if (!canonical || canonical === "und") {
    throw new InvalidContentTranslationInputError(
      "target locale must be a canonical non-und translation locale without formatting extensions",
    );
  }
  return canonical;
}

function normalizeProvenance(provenance: ContentTranslationProvenance): ContentTranslationProvenance {
  if (!provenance || typeof provenance !== "object" || Array.isArray(provenance)) {
    throw new InvalidContentTranslationInputError("translation provenance must be an object");
  }
  const attribution = normalizeOptionalText(provenance.attribution, "attribution");

  if (provenance.origin === "persistent_manual") {
    if ("provider" in provenance || "model" in provenance) {
      throw new InvalidContentTranslationInputError("manual translation must not carry provider metadata");
    }
    return {
      origin: "persistent_manual",
      ...(attribution ? { attribution } : {}),
    };
  }

  if (provenance.origin === "machine") {
    const provider = requireNonBlank(provenance.provider, "provider");
    const model = requireNonBlank(provenance.model, "model");
    return {
      origin: "machine",
      provider,
      model,
      ...(attribution ? { attribution } : {}),
    };
  }

  throw new InvalidContentTranslationInputError("translation origin is invalid");
}

export function selectCurrentContentTranslation(
  revisionInput: ContentTranslationRevision,
  targetLocaleInput: string,
  stored: StoredContentTranslation | undefined,
): ContentTranslationReadResult {
  const revision = normalizeRevision(revisionInput);
  const targetLocale = normalizeTargetLocale(targetLocaleInput);

  if (revision.sourceLocale !== "und" && revision.sourceLocale === targetLocale) {
    return originalResult(revision, "same-locale");
  }
  if (!stored) return originalResult(revision, "missing");

  const validation = validateStoredTranslation(stored, revision, targetLocale);
  if (validation === "stale") return originalResult(revision, "stale");
  if (validation === "invalid") return originalResult(revision, "invalid");

  return {
    selected: "translation",
    content: stored.translatedContent,
    contentLocale: targetLocale,
    translation: stored,
  };
}

function validateStoredTranslation(
  stored: StoredContentTranslation,
  revision: ContentTranslationRevision,
  targetLocale: string,
): "valid" | "stale" | "invalid" {
  if (
    stored.contentType !== revision.contentType ||
    stored.contentId !== revision.contentId ||
    stored.targetLocale !== targetLocale
  ) {
    return "invalid";
  }
  if (stored.revisionId !== revision.revisionId) return "stale";

  try {
    if (normalizeSourceLocale(stored.sourceLocale) !== revision.sourceLocale) return "invalid";
    if (normalizeTargetLocale(stored.targetLocale) !== targetLocale) return "invalid";
    requireNonBlank(stored.translatedContent, "translated content");
    normalizeProvenance(stored.provenance);
  } catch (error) {
    if (error instanceof InvalidContentTranslationInputError) return "invalid";
    throw error;
  }

  return "valid";
}

function originalResult(
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

function requireNonBlank(value: string, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new InvalidContentTranslationInputError(`${field} must be a non-blank string`);
  }
  return value;
}

function normalizeOptionalText(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    throw new InvalidContentTranslationInputError(`${field} must be a non-blank string when present`);
  }
  return value;
}
