import type { ContentTranslationRevision } from "./content-translation";

export type ContentGenerationTaskState =
  | "idle"
  | "pending"
  | "processing"
  | "deferred"
  | "failed"
  | "completed";

export interface ContentGenerationStatusIdentity {
  readonly contentType: ContentTranslationRevision["contentType"];
  readonly contentId: string;
  readonly revisionId: string;
}

export interface ContentGenerationTaskStatus extends ContentGenerationStatusIdentity {
  readonly state: ContentGenerationTaskState;
  readonly retryAfterSeconds?: number;
}

export interface ContentGenerationStatusReader {
  readCurrent(
    identities: readonly ContentGenerationStatusIdentity[],
    targetLocale: string,
  ): Promise<readonly ContentGenerationTaskStatus[]>;
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
