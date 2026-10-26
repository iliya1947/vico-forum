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

/** No exception message/cause/SQL/params, URL query, or submitted content enters the sink. */
export function reportRouteError(error: unknown, sink: SafeServerLogSink = (message) => console.error(message)): void {
  const codes = new Set(["42P01", "42703", "23505", "23503", "23514", "40001", "40P01"]);
  let current = error;
  let databaseCode: string | undefined;
  const seen = new Set<unknown>();
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const candidate = current as { code?: unknown; cause?: unknown };
    if (typeof candidate.code === "string" && codes.has(candidate.code)) databaseCode = candidate.code;
    current = candidate.cause;
  }
  // Remove the entire message first: SQL/params can contain embedded newlines and fake frames.
  const prefix = error instanceof Error ? `${error.name}: ${error.message}` : "";
  const trace = error instanceof Error && prefix && error.stack?.startsWith(prefix)
    ? error.stack.slice(prefix.length) : "";
  const frames = trace.split("\n")
    .flatMap((line) => line.match(/(?:app|db|workers)\/[A-Za-z0-9_./-]+:\d+:\d+/g) ?? []).slice(0, 8);
  sink(JSON.stringify({ event: "route_error", errorKind: classifyServerError(error), databaseCode, frames }));
}
