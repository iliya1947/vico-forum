import { inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { session } from "../../db/schema";
import type { AuthTransitionFact } from "../../db/owner-auth-facts";

type SessionRow = { id: string; userId: string; token: string; expiresAt: Date };
type Reason = Extract<AuthTransitionFact, {kind: "auth.sessionDeleted"}>["reason"];
type Candidate = SessionRow & { reason: Reason; actorUserId: string };
type BulkReceipt = { userId: string; count: number };
type AdapterDelete = { model?: unknown; where?: unknown };
type NativeWhere = { field?: unknown; value?: unknown; operator?: unknown };
type HookContext = { path?: unknown; context?: { session?: {
  user?: { id?: unknown }; session?: { token?: unknown };
} } };

function exactWhere(value: unknown, field: string): string | null {
  if (!Array.isArray(value) || value.length !== 1) return null;
  const item = value[0] as NativeWhere | null;
  return item && item.field === field && item.operator == null &&
    typeof item.value === "string" ? item.value : null;
}

function affected(method: "delete" | "deleteMany", value: unknown): number | null {
  const count = method === "deleteMany" ? value
    : value && typeof value === "object" && "rowCount" in value
      ? (value as {rowCount: unknown}).rowCount : null;
  return typeof count === "number" && Number.isSafeInteger(count) && count >= 0
    ? count : null;
}

/**
 * Better Auth 1.7.7 delete.after receives a pre-delete row even when a racing
 * DELETE affects zero rows. Correlate that hook with the actual native Drizzle
 * adapter affected-row result, then verify absence before recording anything.
 * This observes the original adapter; it never replaces its mutations.
 */
export class SessionDeletionEvidence {
  private readonly singleReceipts = new Map<string, number>();
  private readonly bulkReceipts: BulkReceipt[] = [];
  private readonly candidates: Candidate[] = [];

  constructor(
    private readonly database: NodePgDatabase,
    private readonly emit: (fact: AuthTransitionFact) => void,
    private readonly missed: (count: number) => void,
  ) {}

  noteAdapterDelete(method: "delete" | "deleteMany", arg: unknown, result: unknown): void {
    const operation = arg as AdapterDelete | null;
    if (operation?.model !== "session") return;
    const count = affected(method, result);
    if (method === "delete") {
      // Temporary diagnostic: fields and numeric result only, no IDs/tokens.
      console.info("SA02-delete-proof-shape", JSON.stringify({
        where: Array.isArray(operation.where) ? operation.where.map((x: NativeWhere) =>
          ({field: x.field, operator: x.operator, valueType: typeof x.value})) : null,
        count, resultType: typeof result,
        resultKeys: result && typeof result === "object" ? Object.keys(result).slice(0,12) : null,
      }));
    }
    if (count === null) {
      this.missed(1);
      return;
    }
    if (method === "delete") {
      const token = exactWhere(operation.where, "token");
      if (token && count === 1) {
        this.singleReceipts.set(token, (this.singleReceipts.get(token) ?? 0) + 1);
      } else if (count > 0) this.missed(count);
    } else {
      const userId = exactWhere(operation.where, "userId");
      if (userId) this.bulkReceipts.push({userId, count});
      else if (count > 0) this.missed(count);
    }
  }

  noteAfter(value: unknown, context: unknown): void {
    const row = value as Partial<SessionRow> | null;
    const ctx = context as HookContext | null;
    console.info("SA02-delete-hook-shape", JSON.stringify({
      path: ctx?.path, hasRow: !!row,
      date: row?.expiresAt instanceof Date, idType: typeof row?.id,
    }));
    if (!row || typeof row.id !== "string" || typeof row.userId !== "string" ||
      typeof row.token !== "string" || !(row.expiresAt instanceof Date)) return;
    let reason: Reason, actorUserId: string;
    switch (ctx?.path) {
      case "/sign-out":
        // The signed session cookie selected this persisted row, not a user form field.
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
        // In particular, getSession expiry cleanup is not user revocation.
        return;
    }
    this.candidates.push({...row, reason, actorUserId} as Candidate);
  }

  /** Always called after the original native operation settles; never vetoes it. */
  async flush(): Promise<void> {
    if (!this.candidates.length) return;
    const candidates = this.candidates.splice(0);
    console.info("SA02-delete-flush-shape", JSON.stringify({
      candidateCount: candidates.length,
      singleCount: this.singleReceipts.size,
      bulkCount: this.bulkReceipts.length,
    }));
    const bulk = candidates.filter(c => c.reason === "revoke-all");
    const approvedBulk = new Set<string>();
    for (const receipt of this.bulkReceipts) {
      const selected = bulk.filter(c => c.userId === receipt.userId);
      // A stale preimage or racing deletion makes the entire batch ambiguous.
      // Do not attribute particular rows from an aggregate count in that case.
      if (receipt.count > 0 && receipt.count === selected.length) {
        for (const candidate of selected) approvedBulk.add(candidate.id);
      } else if (selected.length || receipt.count) {
        this.missed(Math.max(selected.length, receipt.count));
      }
    }
    const eligible = candidates.filter(candidate =>
      candidate.reason === "revoke-all" ? approvedBulk.has(candidate.id)
        : (this.singleReceipts.get(candidate.token) ?? 0) > 0);
    if (eligible.length < candidates.length - bulk.length) {
      this.missed(candidates.length - bulk.length - eligible.filter(c =>
        c.reason !== "revoke-all").length);
    }
    if (!eligible.length) return;
    try {
      // Postcondition is checked after Better Auth has completed its mutation.
      const rows = await this.database.select({id: session.id}).from(session)
        .where(inArray(session.id, eligible.map(c => c.id)));
      const remaining = new Set(rows.map(row => row.id));
      for (const candidate of eligible) {
        if (remaining.has(candidate.id)) {
          this.missed(1);
          continue;
        }
        // Deleted expired rows have no user-initiated active-session transition.
        if (candidate.expiresAt.getTime() <= Date.now()) continue;
        try {
          this.emit({
            kind: "auth.sessionDeleted", userId: candidate.userId,
            sessionId: candidate.id, reason: candidate.reason,
            actorUserId: candidate.actorUserId,
          });
        } catch { this.missed(1); }
      }
    } catch {
      this.missed(eligible.length);
    }
  }
}
