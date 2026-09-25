export type ContentGenerationStatusState =
  | "idle"
  | "pending"
  | "processing"
  | "deferred"
  | "failed"
  | "completed";

export interface ContentGenerationStatusUnit {
  readonly contentType: "topic-title" | "post-body";
  readonly contentId: string;
  readonly revisionId: string;
  readonly targetLocale: string;
}

export interface ContentGenerationUnitStatus extends ContentGenerationStatusUnit {
  readonly state: ContentGenerationStatusState;
  readonly retryAfterSeconds?: number;
}

export interface ContentGenerationStatusReader {
  readCurrent(
    units: readonly ContentGenerationStatusUnit[],
  ): Promise<readonly ContentGenerationUnitStatus[]>;
}

export class ContentGenerationStatusStorageUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("content generation status storage unavailable", options);
    this.name = "ContentGenerationStatusStorageUnavailableError";
  }
}
