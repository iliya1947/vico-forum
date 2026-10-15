export type SafeServerLogSink = (message: string) => void;

type SafeServerErrorKind =
  | "type-error"
  | "range-error"
  | "reference-error"
  | "syntax-error"
  | "error"
  | "non-error";

function classifyServerError(error: unknown): SafeServerErrorKind {
  if (error instanceof TypeError) return "type-error";
  if (error instanceof RangeError) return "range-error";
  if (error instanceof ReferenceError) return "reference-error";
  if (error instanceof SyntaxError) return "syntax-error";
  if (error instanceof Error) return "error";
  return "non-error";
}

export function reportSsrStreamError(
  error: unknown,
  sink: SafeServerLogSink = (message) => console.error(message),
): void {
  sink(JSON.stringify({
    event: "ssr_stream_error",
    phase: "after-shell",
    errorKind: classifyServerError(error),
  }));
}
