export const FORUM_WRITE_COOLDOWN_MS = 5_000;

export interface ForumWritePolicy {
  readonly cooldownMs: number;
  now(): Date;
}

export const forumWritePolicy: ForumWritePolicy = {
  cooldownMs: FORUM_WRITE_COOLDOWN_MS,
  now: () => new Date(),
};

export class ForumWriteRateLimitError extends Error {
  constructor(readonly retryAfterMs: number) {
    super("forum write cooldown is active");
  }
}
