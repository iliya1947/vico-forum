export type ContentGenerationActionResponse =
  | { readonly operation: "contentGeneration"; readonly outcome: "queued" }
  | {
      readonly operation: "contentGeneration";
      readonly outcome: "no-op";
      readonly reason: string;
      readonly retryAfterSeconds?: number;
    }
  | { readonly operation: "contentGeneration"; readonly outcome: "explicit-required" }
  | {
      readonly operation: "contentGeneration";
      readonly outcome: "invalid" | "not-found" | "unavailable";
    };
