import { countMarkdownTranslationSemanticCharacters } from "./content-markdown-translation";
import { MAX_AUTOMATIC_POST_TRANSLATION_SEMANTIC_CHARACTERS } from "./content-generation-action.server";
import {
  ContentGenerationStatusIntegrityError,
  type ContentGenerationTaskStatus,
} from "./content-generation-status";
import type {
  ContentTranslationPresentation,
} from "./content-translation-presentation";
import type { ContentTranslationRevision } from "./content-translation";

export type ContentGenerationViewState =
  | "idle"
  | "pending"
  | "processing"
  | "deferred"
  | "failed"
  | "current"
  | "unavailable";

export interface ContentGenerationUnitView {
  readonly key: string;
  readonly contentType: ContentTranslationRevision["contentType"];
  readonly contentId: string;
  readonly revisionId: string;
  readonly targetLocale: string;
  readonly state: ContentGenerationViewState;
  readonly automatic: boolean;
  readonly explicitRequired: boolean;
  readonly retryAfterSeconds?: number;
}

export function contentGenerationUnitKey(
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

export function buildContentGenerationView(
  revisions: readonly ContentTranslationRevision[],
  presentations: readonly ContentTranslationPresentation[],
  statuses: readonly ContentGenerationTaskStatus[],
  targetLocale: string,
): readonly ContentGenerationUnitView[] {
  if (revisions.length !== presentations.length || revisions.length !== statuses.length) {
    throw new ContentGenerationStatusIntegrityError(
      "content generation loader inputs have inconsistent cardinality",
    );
  }

  return revisions.map((revision, index) => {
    const presentation = presentations[index]!;
    const status = statuses[index]!;
    assertSameIdentity(revision, presentation, status);

    const key = contentGenerationUnitKey(revision, targetLocale);
    if (presentation.selected === "translation") {
      return {
        key,
        contentType: revision.contentType,
        contentId: revision.contentId,
        revisionId: revision.revisionId,
        targetLocale,
        state: "current",
        automatic: false,
        explicitRequired: false,
      };
    }

    if (status.state === "completed") {
      throw new ContentGenerationStatusIntegrityError(
        "completed content generation task is missing its exact-current translation",
      );
    }

    const sameLocale = revision.sourceLocale !== "und" && revision.sourceLocale === targetLocale;
    const semanticCharacters = revision.contentType === "post-body"
      ? countMarkdownTranslationSemanticCharacters(revision.originalContent)
      : 0;
    const explicitRequired = !sameLocale
      && status.state === "idle"
      && revision.contentType === "post-body"
      && semanticCharacters > MAX_AUTOMATIC_POST_TRANSLATION_SEMANTIC_CHARACTERS;
    const automatic = !sameLocale
      && status.state === "idle"
      && (
        revision.contentType === "topic-title"
        || semanticCharacters <= MAX_AUTOMATIC_POST_TRANSLATION_SEMANTIC_CHARACTERS
      );

    return {
      key,
      contentType: revision.contentType,
      contentId: revision.contentId,
      revisionId: revision.revisionId,
      targetLocale,
      state: status.state,
      automatic,
      explicitRequired,
      ...(status.retryAfterSeconds === undefined
        ? {}
        : { retryAfterSeconds: status.retryAfterSeconds }),
    };
  });
}

export function unavailableContentGenerationView(
  revisions: readonly ContentTranslationRevision[],
  targetLocale: string,
): readonly ContentGenerationUnitView[] {
  return revisions.map((revision) => ({
    key: contentGenerationUnitKey(revision, targetLocale),
    contentType: revision.contentType,
    contentId: revision.contentId,
    revisionId: revision.revisionId,
    targetLocale,
    state: "unavailable",
    automatic: false,
    explicitRequired: false,
  }));
}

function assertSameIdentity(
  revision: ContentTranslationRevision,
  presentation: ContentTranslationPresentation,
  status: ContentGenerationTaskStatus,
): void {
  if (
    presentation.contentType !== revision.contentType
    || presentation.contentId !== revision.contentId
    || presentation.revisionId !== revision.revisionId
    || status.contentType !== revision.contentType
    || status.contentId !== revision.contentId
    || status.revisionId !== revision.revisionId
  ) {
    throw new ContentGenerationStatusIntegrityError(
      "content generation loader identity mismatch",
    );
  }
}
