/** Shared complaints domain types and authoritative server input validation. */
export const COMPLAINT_REASONS = [
  "spam", "harassment", "threats", "fraud-phishing", "malicious-content",
  "personal-data", "impersonation", "other",
] as const;
export type ComplaintReason = typeof COMPLAINT_REASONS[number];
export type ComplaintOutcome = "confirmed" | "not-confirmed";
export type ComplaintTarget =
  | { kind: "post"; topicId: string; postId: string; revisionId: string }
  | { kind: "topic-title"; topicId: string; revisionId: string };

export class ComplaintInputError extends Error {}
export class ComplaintForbiddenError extends Error {}
export class ComplaintNotFoundError extends Error {}
export class ComplaintConflictError extends Error {}
export class ComplaintRateLimitError extends Error {
  constructor(readonly retryAfterMs: number) { super("complaint submission limit reached"); }
}
export const COMPLAINT_SUBMISSION_LIMITS = { tenMinutes: 10, day: 50 } as const;
/** Product policy must be supplied by the later package, not guessed by foundation. */
export class ComplaintPolicyRequiredError extends Error {}

export function complaintText(value: unknown, max: number, required = true): string | null {
  if (typeof value !== "string") {
    if (!required && value == null) return null;
    throw new ComplaintInputError("invalid complaint text");
  }
  const text = value.trim();
  if ((!text && required) || [...text].length > max || text.includes("\0")) {
    throw new ComplaintInputError("invalid complaint text");
  }
  return text || null;
}

export function complaintId(value: unknown): string {
  return complaintText(value, 200)!;
}

export function complaintReason(value: unknown): ComplaintReason {
  if (!COMPLAINT_REASONS.includes(value as ComplaintReason)) throw new ComplaintInputError("invalid complaint reason");
  return value as ComplaintReason;
}

export function complaintOutcome(value: unknown): ComplaintOutcome {
  if (value !== "confirmed" && value !== "not-confirmed") throw new ComplaintInputError("invalid complaint outcome");
  return value;
}
