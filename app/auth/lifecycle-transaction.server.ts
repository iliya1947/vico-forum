import { AsyncLocalStorage } from "node:async_hooks";
import type { Client } from "pg";

/** One owner per native request-local PG connection, never a process-wide flag. */
type Frame = {
  open: boolean;
  pending: Set<Promise<unknown>>;
  failed?: { cause: unknown };
  evidence: Array<() => void>;
  omitted: number;
};

export class AuthLifecycleTransactionError extends Error {
  constructor(readonly code: "busy" | "closed" | "begin-uncertain" | "rollback-uncertain" |
    "commit-uncertain" | "rolled-back" | "unawaited" | "setup-failed", options?: ErrorOptions) {
    super("Authentication lifecycle transaction failed", options);
    this.name = "AuthLifecycleTransactionError";
  }
}

// PostgreSQL 17 transaction-local deadlines. Statement deadline remains below
// the existing 7s web-client query deadline; the whole transaction is bounded.
const DEADLINES = [
  "SET LOCAL lock_timeout = '1500ms'",
  "SET LOCAL statement_timeout = '5000ms'",
  "SET LOCAL transaction_timeout = '15000ms'",
] as const;
const MAX_STAGED_EVIDENCE = 128;

/**
 * Explicit owner of transaction control on the same Client as Better Auth.
 * A nested awaited operation joins the owner; another async execution cannot
 * start or accidentally join a transaction on the busy connection.
 * Callers must await all work and never send mail or other external IO inside.
 */
export class AuthLifecycleTransaction {
  private readonly context = new AsyncLocalStorage<Frame>();
  private active: Frame | undefined;
  private unusable = false;
  private failure: AuthLifecycleTransactionError | undefined;

  constructor(
    private readonly client: Pick<Client, "query">,
    private readonly onEvidenceGap?: (count: number) => void,
  ) {}

  assertConnection(client: Pick<Client, "query">): void {
    if (client !== this.client) throw new AuthLifecycleTransactionError("closed");
  }

  /** False after an uncertain control outcome; the caller must discard Client. */
  get connectionUsable(): boolean { return !this.unusable; }

  /** Better Auth can catch transaction errors and return an HTTP response. */
  get controlFailure(): AuthLifecycleTransactionError | undefined { return this.failure; }

  ownsCurrentWork(): boolean {
    if (this.unusable) throw new AuthLifecycleTransactionError("closed");
    const frame = this.context.getStore();
    if (frame) {
      if (!frame.open || this.active !== frame) throw new AuthLifecycleTransactionError("closed");
      return true;
    }
    if (this.active) throw new AuthLifecycleTransactionError("busy");
    return false;
  }

  /** A guarded write failure must not become commit-able if an inner caller catches it. */
  markFailed(cause: unknown): void {
    if (!this.ownsCurrentWork()) return;
    const frame = this.context.getStore()!;
    frame.failed ??= { cause };
  }

  private gap(count: number): void {
    if (count <= 0) return;
    try { this.onEvidenceGap?.(count); } catch { /* passive recording */ }
  }

  private publish(effect: () => void): void {
    try { effect(); } catch { this.gap(1); }
  }

  /** Observations outside an owned transaction retain their original behavior. */
  stageEvidence(effect: () => void): void {
    if (!this.ownsCurrentWork()) {
      this.publish(effect);
      return;
    }
    const frame = this.context.getStore()!;
    if (frame.evidence.length < MAX_STAGED_EVIDENCE) frame.evidence.push(effect);
    else frame.omitted++;
  }

  async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.ownsCurrentWork()) {
      const frame = this.context.getStore()!;
      if (frame.failed) throw frame.failed.cause;
      const task = Promise.resolve().then(work);
      frame.pending.add(task);
      try { return await task; }
      catch (cause) {
        frame.failed ??= { cause };
        throw cause;
      } finally { frame.pending.delete(task); }
    }

    const frame: Frame = { open: true, pending: new Set(), evidence: [], omitted: 0 };
    this.active = frame;
    let begun = false;
    let committing = false;
    try {
      try {
        const result = await this.client.query("BEGIN");
        if (result.command !== "BEGIN") throw new Error("Unexpected BEGIN acknowledgement");
        begun = true;
      } catch (cause) {
        // A lost acknowledgement could leave an open transaction on Client.
        this.unusable = true;
        throw this.failure = new AuthLifecycleTransactionError("begin-uncertain", { cause });
      }
      try {
        for (const statement of DEADLINES) await this.client.query(statement);
      } catch (cause) {
        throw this.failure = new AuthLifecycleTransactionError("setup-failed", { cause });
      }
      const value = await this.context.run(frame, async () => {
        let result: T;
        try { result = await work(); }
        catch (cause) {
          if (frame.pending.size) {
            // A rejected Promise.all may leave another native operation
            // running. Close admission and drain it BEFORE sending ROLLBACK.
            // No nested query may continue in autocommit after rollback.
            frame.open = false;
            await Promise.allSettled([...frame.pending]);
          }
          throw cause;
        }
        if (frame.pending.size) {
          frame.open = false;
          await Promise.allSettled([...frame.pending]);
          throw this.failure = new AuthLifecycleTransactionError("unawaited");
        }
        if (frame.failed) throw frame.failed.cause;
        return result;
      });
      frame.open = false;
      committing = true;
      const result = await this.client.query("COMMIT");
      begun = false;
      if (result.command === "ROLLBACK") {
        // PostgreSQL explicitly reports ROLLBACK for an aborted transaction.
        committing = false;
        throw this.failure = new AuthLifecycleTransactionError("rolled-back");
      }
      if (result.command !== "COMMIT") throw new Error("Unexpected COMMIT acknowledgement");
      committing = false;

      // Release the owner before invoking synchronous post-commit observers.
      this.active = undefined;
      // No staged fact is visible before proven COMMIT; telemetry cannot veto it.
      for (const effect of frame.evidence) this.publish(effect);
      this.gap(frame.omitted);
      return value;
    } catch (cause) {
      frame.open = false;
      if (committing) {
        // Do not issue a second mutation or report rollback after lost COMMIT.
        this.unusable = true;
        this.gap(frame.evidence.length + frame.omitted);
        throw this.failure = new AuthLifecycleTransactionError("commit-uncertain", { cause });
      }
      if (begun) {
        try {
          const result = await this.client.query("ROLLBACK");
          if (result.command !== "ROLLBACK") throw new Error("Unexpected ROLLBACK acknowledgement");
        } catch (rollbackCause) {
          this.unusable = true;
          this.gap(frame.evidence.length + frame.omitted);
          throw this.failure = new AuthLifecycleTransactionError("rollback-uncertain", { cause: rollbackCause });
        }
      }
      throw cause;
    } finally {
      frame.open = false;
      frame.evidence.length = 0;
      if (this.active === frame) this.active = undefined;
    }
  }
}
