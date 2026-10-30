export type ComplaintSubmissionResponse = { ok: true; operationId: string } | {
  error: "unauthenticated" | "forbidden" | "invalid" | "conflict" | "notFound" | "rateLimited" | "unavailable";
  retryAfterSeconds?: number;
};
