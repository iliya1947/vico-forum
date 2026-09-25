import {
  MAX_AUTOMATIC_POST_TRANSLATION_SEMANTIC_CHARACTERS,
  postBodySemanticCharacterCount,
} from "./content-generation-action.server";
import {
  ContentGenerationStatusStorageUnavailableError,
  type ContentGenerationStatusReader,
  type ContentGenerationStatusUnit,
} from "./content-generation-status.server";
import type {
  ContentTranslationPresentation,
} from "./content-translation-presentation";
import type { ContentTranslationRevision } from "./content-translation";

export type ContentGenerationPublicState =
  | "idle"
  | "pending"
  | "processing"
  | "deferred"
  | "failed"
  | "current"
  | "unavailable";

export interface ContentGenerationViewUnit {
  readonly key: string;
  readonly contentType: "topic-title" | "post-body";
  readonly contentId: string;
  readonly revisionId: string;
  readonly targetLocale: string;
  readonly state: ContentGenerationPublicState;
  readonly autoEligible: boolean;
  readonly explicitRequired: boolean;
  readonly retryAfterSeconds?: number;
}

export class ContentGenerationStatusIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentGenerationStatusIntegrityError";
  }
}

export async function buildContentGenerationView(
  revisions: readonly ContentTranslationRevision[],
  presentations: readonly ContentTranslationPresentation[],
  targetLocale: string,
  statusReader: ContentGenerationStatusReader,
): Promise<readonly ContentGenerationViewUnit[]> {
  if (revisions.length !== presentations.length) {
    throw new ContentGenerationStatusIntegrityError(
      "content generation view requires one presentation per revision",
    );
  }

  const units = revisions.map((revision) => ({
    contentType: revision.contentType,
    contentId: revision.contentId,
    revisionId: revision.revisionId,
    targetLocale,
  })) satisfies ContentGenerationStatusUnit[];

  let statuses;
  try {
    statuses = await statusReader.readCurrent(units);
  } catch (error) {
    if (error instanceof ContentGenerationStatusStorageUnavailableError) {
      return revisions.map((revision, index) =>
        publicUnit(revision, presentations[index]!, targetLocale, "unavailable")
      );
    }
    throw error;
  }

  if (statuses.length !== revisions.length) {
    throw new ContentGenerationStatusIntegrityError(
      "content generation status result count does not match current revisions",
    );
  }

  return revisions.map((revision, index) => {
    const presentation = presentations[index]!;
    const status = statuses[index]!;
    if (
      status.contentType !== revision.contentType
      || status.contentId !== revision.contentId
      || status.revisionId !== revision.revisionId
      || status.targetLocale !== targetLocale
    ) {
      throw new ContentGenerationStatusIntegrityError(
        "content generation status identity does not match current revision",
      );
    }

    if (presentation.selected === "translation") {
      return publicUnit(revision, presentation, targetLocale, "current");
    }
    if (status.state === "completed") {
      throw new ContentGenerationStatusIntegrityError(
        "completed content generation task is missing its exact-current persisted translation",
      );
    }

    return publicUnit(
      revision,
      presentation,
      targetLocale,
      status.state,
      status.retryAfterSeconds,
    );
  });
}

function publicUnit(
  revision: ContentTranslationRevision,
  presentation: ContentTranslationPresentation,
  targetLocale: string,
  state: ContentGenerationPublicState,
  retryAfterSeconds?: number,
): ContentGenerationViewUnit {
  const sameLocale = revision.sourceLocale !== "und" && revision.sourceLocale === targetLocale;
  const bodySemanticCharacters = revision.contentType === "post-body"
    ? postBodySemanticCharacterCount(revision.originalContent)
    : 0;
  const longBody = revision.contentType === "post-body"
    && bodySemanticCharacters > MAX_AUTOMATIC_POST_TRANSLATION_SEMANTIC_CHARACTERS;
  const idleOriginal = state === "idle"
    && presentation.selected === "original"
    && !sameLocale;

  return {
    key: generationUnitKey(revision, targetLocale),
    contentType: revision.contentType,
    contentId: revision.contentId,
    revisionId: revision.revisionId,
    targetLocale,
    state,
    autoEligible: idleOriginal && !longBody,
    explicitRequired: idleOriginal && longBody,
    ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
  };
}

export function generationUnitKey(
  revision: Pick<ContentTranslationRevision, "contentType" | "contentId" | "revisionId">,
  targetLocale: string,
): string {
  return JSON.stringify([
    revision.contentType,
    revision.contentId,
    revision.revisionId,
    targetLocale,
  ]);
}
