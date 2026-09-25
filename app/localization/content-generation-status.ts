import type {
  ContentTranslationPresentation,
} from "./content-translation-presentation";
import type {
  ContentTranslationRevision,
  ContentTranslationType,
} from "./content-translation";

export type ContentGenerationDurableStatus =
  | "idle"
  | "pending"
  | "processing"
  | "deferred"
  | "failed"
  | "completed";

export interface ContentGenerationStatusIdentity {
  readonly contentType: ContentTranslationType;
  readonly contentId: string;
  readonly revisionId: string;
  readonly targetLocale: string;
}

export interface ContentGenerationStatusSnapshot extends ContentGenerationStatusIdentity {
  readonly status: ContentGenerationDurableStatus;
  readonly retryAfterSeconds?: number;
}

export interface ContentGenerationStatusReader {
  readCurrent(
    revisions: readonly ContentTranslationRevision[],
    targetLocale: string,
  ): Promise<readonly ContentGenerationStatusSnapshot[]>;
}

export class ContentGenerationStatusStorageUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("content generation status storage unavailable", options);
    this.name = "ContentGenerationStatusStorageUnavailableError";
  }
}

export class ContentGenerationStatusIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentGenerationStatusIntegrityError";
  }
}

export type ContentGenerationPublicStatus =
  | "idle"
  | "pending"
  | "processing"
  | "deferred"
  | "failed"
  | "current"
  | "unavailable";

export interface ContentGenerationViewModel extends ContentGenerationStatusIdentity {
  readonly status: ContentGenerationPublicStatus;
  readonly automaticEligible: boolean;
  readonly explicitRequired: boolean;
  readonly retryAfterSeconds?: number;
}

export function unavailableContentGenerationView(
  revisions: readonly ContentTranslationRevision[],
  targetLocale: string,
): readonly ContentGenerationViewModel[] {
  return revisions.map((revision) => ({
    contentType: revision.contentType,
    contentId: revision.contentId,
    revisionId: revision.revisionId,
    targetLocale,
    status: "unavailable",
    automaticEligible: false,
    explicitRequired: false,
  }));
}

export function composeContentGenerationView(
  revisions: readonly ContentTranslationRevision[],
  presentations: readonly ContentTranslationPresentation[],
  statuses: readonly ContentGenerationStatusSnapshot[],
  targetLocale: string,
  semanticCharactersForPost: (revision: ContentTranslationRevision) => number,
  automaticPostLimit: number,
): readonly ContentGenerationViewModel[] {
  if (
    presentations.length !== revisions.length
    || statuses.length !== revisions.length
  ) {
    throw new ContentGenerationStatusIntegrityError(
      "content generation view inputs must have matching cardinality",
    );
  }

  return revisions.map((revision, index) => {
    const presentation = presentations[index]!;
    const durable = statuses[index]!;
    assertIdentity(revision, presentation, durable, targetLocale);

    if (presentation.selected === "translation") {
      return {
        contentType: revision.contentType,
        contentId: revision.contentId,
        revisionId: revision.revisionId,
        targetLocale,
        status: "current",
        automaticEligible: false,
        explicitRequired: false,
      };
    }

    if (durable.status === "completed") {
      throw new ContentGenerationStatusIntegrityError(
        "completed content generation task is missing its exact-current translation",
      );
    }

    const sameLocale = presentation.fallbackReason === "same-locale";
    const semanticCharacters = revision.contentType === "post-body"
      ? semanticCharactersForPost(revision)
      : 0;
    const longPost = revision.contentType === "post-body"
      && semanticCharacters > automaticPostLimit;

    const status = durable.status;
    const automaticEligible = !sameLocale
      && status === "idle"
      && !longPost;
    const explicitRequired = !sameLocale
      && longPost
      && status === "idle";

    return {
      contentType: revision.contentType,
      contentId: revision.contentId,
      revisionId: revision.revisionId,
      targetLocale,
      status,
      automaticEligible,
      explicitRequired,
      ...(status === "deferred" && durable.retryAfterSeconds !== undefined
        ? { retryAfterSeconds: durable.retryAfterSeconds }
        : {}),
    };
  });
}

function assertIdentity(
  revision: ContentTranslationRevision,
  presentation: ContentTranslationPresentation,
  status: ContentGenerationStatusSnapshot,
  targetLocale: string,
): void {
  if (
    presentation.contentType !== revision.contentType
    || presentation.contentId !== revision.contentId
    || presentation.revisionId !== revision.revisionId
    || status.contentType !== revision.contentType
    || status.contentId !== revision.contentId
    || status.revisionId !== revision.revisionId
    || status.targetLocale !== targetLocale
  ) {
    throw new ContentGenerationStatusIntegrityError(
      "content generation status identity conflicts with current presentation",
    );
  }
}
