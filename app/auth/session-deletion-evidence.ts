import { inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { session } from "../../db/schema";
import { MAX_AUTH_FACTS_PER_REQUEST, type AuthTransitionFact } from "../../db/owner-auth-facts";

type SessionRow = { id: string; userId: string; token: string; expiresAt: Date };
type Reason = Extract<AuthTransitionFact, {kind: "auth.sessionDeleted"}>["reason"];
type Candidate = SessionRow & { reason: Reason; actorUserId: string };
type BulkReceipt = { count: number; occurredAt: Date; ambiguous: boolean };
type AdapterDelete = { model?: unknown; where?: unknown };
type NativeWhere = { field?: unknown; value?: unknown; operator?: unknown };
type HookContext = { path?: unknown; context?: { session?: {
  user?: { id?: unknown }; session?: { token?: unknown };
} } };

const MAX_BULK_IDENTITIES = 4;
const PROOF_CHUNK_SIZE = 8;
function exactWhere(value: unknown, field: string): string | null {
  if (!Array.isArray(value) || value.length !== 1) return null;
  const item = value[0] as NativeWhere | null;
  return item && item.field === field && item.operator == null &&
    typeof item.value === "string" ? item.value : null;
}
function countOf(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value : null;
}

/**
 * A request-local, bounded proof collector. Better Auth's native delete.after
 * may see a preimage even if the DELETE affects zero rows; retain exact row
 * identities only after matching actual affected counts and absent-row proof.
 * Large bulk operations keep up to MAX_AUTH_FACTS_PER_REQUEST distinct facts,
 * with any omitted or ambiguous transitions counted as recording gaps.
 */
export class SessionDeletionEvidence {
  private readonly singleReceipts = new Map<string, Date>();
  private readonly bulkReceipts = new Map<string, BulkReceipt>();
  private readonly observedBulk = new Map<string, number>();
  private readonly candidates: Candidate[] = [];
  private untrackedSingleReceipts = 0;
  private untrackedSingleHooks = 0;

  constructor(
    private readonly database: NodePgDatabase,
    private readonly emit: (fact: AuthTransitionFact, occurredAt: Date) => void,
    private readonly missed: (count: number) => void,
  ) {}

  noteAdapterDelete(method: "delete" | "deleteMany", arg: unknown, result: unknown): void {
    const operation = arg as AdapterDelete | null;
    if (method !== "deleteMany" || operation?.model !== "session") return;
    const count = countOf(result);
    if (count === null) { this.missed(1); return; }
    const userId = exactWhere(operation.where, "userId");
    if (!userId) {
      if (count) this.missed(count);
      return;
    }
    const previous = this.bulkReceipts.get(userId);
    if (previous) {
      // Distinct bulk executions have no row-to-receipt correlation:
      // never manufacture timestamps or individually attributed successes.
      previous.ambiguous = true;
      previous.count = Math.min(Number.MAX_SAFE_INTEGER, previous.count + count);
    } else if (this.bulkReceipts.size < MAX_BULK_IDENTITIES) {
      this.bulkReceipts.set(userId, { count, occurredAt: new Date(), ambiguous: false });
    } else if (count) {
      this.missed(count);
    }
  }

  /** Native affected rowCount from the canonical session-token DELETE. */
  noteNativeDelete(sql: unknown, parameters: unknown, result: unknown): void {
    const query = typeof sql === "string" ? sql :
      sql && typeof sql === "object" && "text" in sql ? (sql as {text:unknown}).text : null;
    if (typeof query !== "string" ||
      !/^delete from "session" where "session"\."token" = \$1$/i.test(query)) return;
    if (!Array.isArray(parameters) || parameters.length !== 1 ||
      typeof parameters[0] !== "string") { this.missed(1); return; }
    const rawCount = result && typeof result === "object" && "rowCount" in result
      ? (result as {rowCount:unknown}).rowCount : null;
    const count = countOf(rawCount);
    if (count === 1) {
      const token = parameters[0];
      if (this.singleReceipts.has(token)) return;
      if (this.singleReceipts.size < MAX_AUTH_FACTS_PER_REQUEST)
        this.singleReceipts.set(token, new Date());
      else this.untrackedSingleReceipts++;
    } else if (count === null || count > 1) {
      this.missed(1);
    }
    // Zero affected rows prove a racing/no-op DELETE, not a revocation.
  }

  noteAfter(value: unknown, context: unknown): void {
    const row = value as Partial<SessionRow> | null;
    const ctx = context as HookContext | null;
    if (!row || typeof row.id !== "string" || typeof row.userId !== "string" ||
      typeof row.token !== "string" || !(row.expiresAt instanceof Date)) return;
    let reason: Reason, actorUserId: string;
    switch (ctx?.path) {
      case "/sign-out":
        reason = "sign-out"; actorUserId = row.userId; break;
      case "/revoke-session":
      case "/revoke-other-sessions":
      case "/revoke-sessions": {
        const authenticatedId = ctx.context?.session?.user?.id;
        if (authenticatedId !== row.userId) return;
        actorUserId = row.userId;
        reason = ctx.path === "/revoke-session" ? "revoke-one"
          : ctx.path === "/revoke-other-sessions" ? "revoke-others" : "revoke-all";
        if (reason === "revoke-others" &&
          ctx.context?.session?.session?.token === row.token) return;
        break;
      }
      default:
        // Expired-session cleanup is not a user-initiated revocation.
        return;
    }
    if (reason === "revoke-all") {
      const seen = this.observedBulk.get(row.userId);
      if (seen === undefined && this.observedBulk.size >= MAX_BULK_IDENTITIES) {
        this.missed(1);
        return;
      }
      this.observedBulk.set(row.userId, Math.min(Number.MAX_SAFE_INTEGER, (seen ?? 0) + 1));
    }
    if (this.candidates.length >= MAX_AUTH_FACTS_PER_REQUEST) {
      if (reason !== "revoke-all") this.untrackedSingleHooks++;
      return;
    }
    this.candidates.push({ id: row.id, userId: row.userId, token: row.token,
      expiresAt: row.expiresAt, reason, actorUserId });
  }

  /** Postcondition reads and emission are chunked; no unbounded IN or queue. */
  async flush(): Promise<void> {
    const candidates = this.candidates.splice(0);
    const eligible: Array<{candidate: Candidate; occurredAt: Date}> = [];
    let unmatchedSingles = 0;
    for (const candidate of candidates) {
      if (candidate.reason === "revoke-all") continue;
      const occurredAt = this.singleReceipts.get(candidate.token);
      if (occurredAt) eligible.push({candidate, occurredAt});
      else unmatchedSingles++;
    }
    const singleGaps = Math.max(this.untrackedSingleReceipts, this.untrackedSingleHooks) +
      unmatchedSingles;
    if (singleGaps) this.missed(singleGaps);
    for (const [userId, observed] of this.observedBulk) {
      const receipt = this.bulkReceipts.get(userId);
      const selected = candidates.filter(c => c.reason === "revoke-all" && c.userId === userId);
      if (!receipt || receipt.ambiguous || receipt.count !== observed) {
        this.missed(Math.max(receipt?.count ?? 0, observed));
        continue;
      }
      for (const candidate of selected)
        eligible.push({candidate, occurredAt: receipt.occurredAt});
      if (observed > selected.length) this.missed(observed - selected.length);
    }
    for (const [userId, receipt] of this.bulkReceipts) {
      if (!this.observedBulk.has(userId) && receipt.count) this.missed(receipt.count);
    }
    this.singleReceipts.clear();
    this.bulkReceipts.clear();
    this.observedBulk.clear();
    for (let start = 0; start < eligible.length; start += PROOF_CHUNK_SIZE) {
      const chunk = eligible.slice(start, start + PROOF_CHUNK_SIZE);
      try {
        const rows = await this.database.select({id: session.id}).from(session)
          .where(inArray(session.id, chunk.map(item => item.candidate.id)));
        const remaining = new Set(rows.map(row => row.id));
        for (const {candidate, occurredAt} of chunk) {
          if (remaining.has(candidate.id)) {
            this.missed(1);
            continue;
          }
          // Expired rows are not active-session revocation transitions.
          if (candidate.expiresAt.getTime() <= occurredAt.getTime()) continue;
          try {
            this.emit({
              kind: "auth.sessionDeleted", userId: candidate.userId,
              sessionId: candidate.id, reason: candidate.reason,
              actorUserId: candidate.actorUserId,
            }, occurredAt);
          } catch { this.missed(1); }
        }
      } catch {
        this.missed(chunk.length);
      }
    }
  }
}
