import { MAX_AUTH_FACTS_PER_REQUEST, type AuthTransitionFact, type AuthFactWriter } from "../../db/owner-auth-facts";

type Sink = AuthFactWriter & { close(): Promise<void> };
type TimedFact = { fact: AuthTransitionFact; occurredAt: Date };

/**
 * One per trusted Worker request. Native after-commit callbacks only enqueue
 * canonical IDs; no untrusted request bodies, cookies or raw auth objects.
 * Unlike lossy hourly attempts, exact facts are never coalesced or sampled.
 */
export class RequestAuthFactCollector {
  private pending: TimedFact[] = [];
  private finalized = false;
  private actorId: string | null = null;

  constructor(
    private readonly sinkFactory: () => Sink,
    private readonly missed: (count: number) => void,
  ) {}

  setResolvedActor(value: string | null | undefined): void {
    this.actorId = typeof value === "string" && /^[A-Za-z0-9._:-]{1,200}$/.test(value)
      ? value : null;
  }

  /** Unproven native transition: count a recording gap, never invent success. */
  recordGap(count: number): void {
    if (Number.isSafeInteger(count) && count > 0) this.missed(count);
  }

  /** Existing valid session of exactly this user, never supplied expectedUserId. */
  trustedActorFor(userId: string): string | null {
    return userId === this.actorId ? userId : null;
  }

  capture(fact: AuthTransitionFact, occurredAt: Date = new Date()): void {
    if (this.finalized || this.pending.length >= MAX_AUTH_FACTS_PER_REQUEST ||
        !(occurredAt instanceof Date) || !Number.isFinite(occurredAt.getTime())) {
      this.recordGap(1);
      return;
    }
    // Timestamp is captured at the proven transition, not when waitUntil writes.
    this.pending.push({fact, occurredAt: new Date(occurredAt.getTime())});
  }

  async flush(): Promise<void> {
    if (this.finalized) return;
    this.finalized = true;
    const facts = this.pending;
    this.pending = [];
    if (!facts.length) return;
    let sink: Sink;
    try {
      sink = this.sinkFactory();
    } catch {
      this.missed(facts.length);
      return;
    }
    try {
      for (const {fact, occurredAt} of facts) {
        try {
          await sink.append(fact, occurredAt);
        } catch {
          // No retries: especially not after an ambiguous applied COMMIT.
          this.missed(1);
        }
      }
    } finally {
      try { await sink.close(); }
      catch { /* Never change the original authentication result. */ }
    }
  }
}
