export type TranslationFailureDisposition = "retryable" | "terminal";

export type TranslationFailureCode =
  | "provider-rate-limited"
  | "provider-temporary"
  | "provider-terminal"
  | "provider-unsupported"
  | "provider-output-invalid"
  | "message-kind-unsupported"
  | "dependency-temporary"
  | "execution-bound-exceeded"
  | "attempt-budget-exhausted";

export interface TranslationFailureRecord {
  readonly disposition: TranslationFailureDisposition;
  readonly code: TranslationFailureCode;
}

/**
 * Expected execution failure that may cross provider/dependency boundaries without leaking
 * provider payloads, source content, credentials, or raw exception text into durable state.
 */
export class TranslationExecutionFailure extends Error {
  constructor(
    readonly disposition: TranslationFailureDisposition,
    readonly code: TranslationFailureCode,
    message: string,
  ) {
    super(message);
    this.name = "TranslationExecutionFailure";
  }
}
