import type { Client } from "pg";
import { AuthLifecycleTransaction } from "../auth/lifecycle-transaction.server";
import { ForumControlDenied, requireLockedForumControlGrant, type ForumControlGrant } from "./delegation-admission.server";
import { loadForumControlGrant, requireRegisteredClientResource } from "./delegation-store.server";
import type { ForumControlOAuthConfig } from "./oauth-provider.server";
import type { VerifiedRequestDelivery } from "./github-transport.server";
import { isRecord, isTransportUuid, overviewRequestDigest, type OverviewTransportRequest } from "./transport-wire.server";
import { forumControlScopes } from "./write-tool-contract";

type Connection = Pick<Client, "query">;
const readScope = forumControlScopes.read;
export type OverviewOutcome =
  | { status: "read-ok"; result: Record<string, unknown> }
  | { status: "denied" | "unavailable" };

export interface OverviewRequestRow {
  id: string;
  requestRef: string;
  receiptRef: string;
  grantId: string;
  ownerId: string;
  sessionId: string;
  digest: string;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  requestCommentId: string | null;
  receiptCommentId: string | null;
  outcome: OverviewOutcome["status"] | null;
  expired: boolean;
}
const projection = 'id,request_ref as "requestRef",receipt_ref as "receiptRef",grant_id as "grantId",' +
  'owner_id as "ownerId",session_id as "sessionId",digest,created_at as "createdAt",expires_at as "expiresAt",' +
  'accepted_at as "acceptedAt",started_at as "startedAt",finished_at as "finishedAt",' +
  'request_comment_id as "requestCommentId",receipt_comment_id as "receiptCommentId",outcome,' +
  'expires_at<=clock_timestamp() as expired';

export class RequestIdConflict extends Error {
  constructor() { super("Forum control request ID conflict"); this.name = "RequestIdConflict"; }
}

function sameGrant(row: OverviewRequestRow, grant: ForumControlGrant): boolean {
  return row.grantId === grant.id && row.ownerId === grant.userId && row.sessionId === grant.sessionId;
}

function validCommentId(id: string): boolean {
  return /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) && String(Number(id)) === id;
}

/** One request-local PG connection, with the canonical account/session/grant
 * lock order. No GitHub network operation is allowed inside this store. */
export class PostgresOverviewRequests {
  private readonly lifecycle: AuthLifecycleTransaction;
  constructor(private readonly db: Connection, private readonly binding: ForumControlOAuthConfig) {
    this.lifecycle = new AuthLifecycleTransaction(db);
  }

  private transaction<T>(work: () => Promise<T>): Promise<T> {
    return this.lifecycle.runAdapterOperation(work, true);
  }

  private async lockedGrant(id: string, userId: string, sessionId: string): Promise<ForumControlGrant> {
    const grant = await requireLockedForumControlGrant(this.db, this.lifecycle, this.binding, id, { userId, sessionId },
      (db, grantId) => loadForumControlGrant(db, grantId, true), readScope);
    await requireRegisteredClientResource(this.db, this.binding);
    return grant;
  }

  private async row(id: string, lock = false): Promise<OverviewRequestRow | null> {
    if (!isTransportUuid(id)) return null;
    const result = await this.db.query<OverviewRequestRow>(
      "select " + projection + " from forum_control_request where id=$1" + (lock ? " for update" : ""), [id]);
    return result.rows[0] ?? null;
  }

  // Do not take a request-row lock before the account/session/grant locks.
  private async withRequest<T>(id: string, expected: ForumControlGrant | undefined,
    work: (row: OverviewRequestRow, grant: ForumControlGrant) => Promise<T>): Promise<T | null> {
    return this.transaction(async () => {
      const existing = await this.row(id);
      if (!existing || (expected && !sameGrant(existing, expected))) return null;
      const grant = await this.lockedGrant(existing.grantId, existing.ownerId, existing.sessionId);
      const row = await this.row(id, true);
      if (!row || !sameGrant(row, grant)) return null;
      return work(row, grant);
    });
  }

  // Bounded opportunistic retention. Expiry gates issuance even when cleanup
  // has not run yet. Keep minimal correlation/digest after payload removal.
  private async prune(): Promise<void> {
    await this.db.query("update forum_control_request set result=null where id in (" +
      "select id from forum_control_request where expires_at<=clock_timestamp() and result is not null " +
      "order by expires_at limit 64 for update skip locked)");
    await this.db.query("delete from forum_control_request where id in (" +
      "select id from forum_control_request where expires_at<=clock_timestamp()-interval '30 days' " +
      "order by expires_at limit 64 for update skip locked)");
  }

  /** expected comes from authenticated provider introspection and the native
   * access-token/grant admission. Never construct it from the wire request. */
  async register(request: OverviewTransportRequest, expected: ForumControlGrant): Promise<OverviewRequestRow> {
    if (request.version !== 1 || request.tool !== "read_admin_overview" || !isTransportUuid(request.requestId) ||
        !isRecord(request.arguments) || Object.keys(request.arguments).length !== 0) throw new ForumControlDenied();
    const digest = await overviewRequestDigest(request);
    return this.transaction(async () => {
      const grant = await this.lockedGrant(expected.id, expected.userId, expected.sessionId);
      await this.prune();
      await this.db.query("insert into forum_control_request(id,request_ref,receipt_ref,grant_id,owner_id,session_id,digest,created_at,expires_at) " +
        "select $1,$2,$3,$4,$5,$6,$7,t,t+interval '5 minutes' from (select clock_timestamp() t) time " +
        "on conflict(id) do nothing",
        [request.requestId, crypto.randomUUID(), crypto.randomUUID(), grant.id, grant.userId, grant.sessionId, digest]);
      const row = await this.row(request.requestId, true);
      if (!row || !sameGrant(row, grant)) throw new ForumControlDenied();
      if (row.digest !== digest) throw new RequestIdConflict();
      return row;
    });
  }

  /** Called only after the raw webhook signature and all inbox identities have
   * been verified. No issue text can supply an actor, arguments, or create a row. */
  accept(delivery: VerifiedRequestDelivery): Promise<OverviewRequestRow | null> {
    if (delivery.envelope.version !== 1 || delivery.envelope.kind !== "request" ||
        !isTransportUuid(delivery.envelope.ref) || !validCommentId(delivery.commentId)) return Promise.resolve(null);
    return this.withRequest(delivery.envelope.requestId, undefined, async row => {
      if (row.requestRef !== delivery.envelope.ref || row.expired) return null;
      if (!row.acceptedAt) {
        await this.db.query("update forum_control_request set accepted_at=clock_timestamp(),request_comment_id=$2 " +
          "where id=$1 and accepted_at is null and expires_at>clock_timestamp()", [row.id, delivery.commentId]);
      }
      const accepted = await this.row(row.id);
      return accepted?.acceptedAt && !accepted.expired ? accepted : null;
    });
  }

  /** The single durable claim. Never reset started_at after an uncertain ACK.
   * Repeated webhook deliveries may observe, but cannot claim it a second time. */
  claim(id: string): Promise<OverviewRequestRow | null> {
    return this.withRequest(id, undefined, async row => {
      if (row.expired || !row.acceptedAt || row.startedAt || row.finishedAt) return null;
      const result = await this.db.query<OverviewRequestRow>(
        "update forum_control_request set started_at=clock_timestamp() where id=$1 and accepted_at is not null " +
        "and started_at is null and finished_at is null and expires_at>clock_timestamp() returning " + projection, [id]);
      return result.rows[0] ?? null;
    });
  }

  /** Only the successful claimant calls this, once. The canonical reader runs
   * under fresh delegation locks; no external HTTP call belongs in read().
   * A failure or lost acknowledgement leaves started intact, not retryable. */
  completeOverview(id: string, read: (grant: ForumControlGrant) => Promise<OverviewOutcome>): Promise<OverviewRequestRow | null> {
    return this.withRequest(id, undefined, async (row, grant) => {
      if (row.expired || !row.startedAt || row.finishedAt) return null;
      const outcome = await read(grant);
      let result: string | null = null;
      if (outcome.status === "read-ok") {
        if (!isRecord(outcome.result)) throw new Error("Invalid canonical overview result");
        result = JSON.stringify(outcome.result);
        if (new TextEncoder().encode(result).byteLength > 65536) throw new Error("Oversized canonical overview result");
      } else if (outcome.status !== "denied" && outcome.status !== "unavailable") {
        throw new Error("Invalid overview outcome");
      }
      const saved = await this.db.query<OverviewRequestRow>(
        "update forum_control_request set finished_at=clock_timestamp(),outcome=$2,result=$3::jsonb " +
        "where id=$1 and started_at is not null and finished_at is null and expires_at>clock_timestamp() returning " + projection,
        [id, outcome.status, result]);
      return saved.rows[0] ?? null;
    });
  }

  /** A status lookup is deliberately unable to invoke a reader or dispatcher. */
  inspect(id: string, grant: ForumControlGrant): Promise<OverviewRequestRow | null> {
    return this.withRequest(id, grant, async row => {
      if (row.expired) await this.db.query("update forum_control_request set result=null where id=$1 and result is not null", [id]);
      return row;
    });
  }

  /** Only a server-confirmed App receipt comment can be recorded. The caller
   * verifies the exact envelope through the GitHub adapter, outside the tx. */
  recordReceiptPublication(id: string, grant: ForumControlGrant, receiptRef: string,
    commentId: string): Promise<OverviewRequestRow | null> {
    if (!validCommentId(commentId)) return Promise.resolve(null);
    return this.withRequest(id, grant, async row => {
      if (!row.finishedAt || row.receiptRef !== receiptRef) return null;
      const result = await this.db.query<OverviewRequestRow>(
        "update forum_control_request set receipt_comment_id=$2 where id=$1 and finished_at is not null returning " + projection,
        [id, commentId]);
      return result.rows[0] ?? null;
    });
  }

  /** The protected payload is not returned by inspect/register/claim. The
   * caller must have freshly verified this exact receipt through the App API. */
  readPublished(id: string, grant: ForumControlGrant, receiptRef: string, commentId: string,
    admitProjection: (grant: ForumControlGrant) => Promise<boolean> = async () => false): Promise<OverviewOutcome | null> {
    return this.withRequest(id, grant, async (row, currentGrant) => {
      if (row.expired || !row.finishedAt || row.receiptRef !== receiptRef || row.receiptCommentId !== commentId) return null;
      if (row.outcome === "denied" || row.outcome === "unavailable") return { status: row.outcome };
      if (row.outcome !== "read-ok" || !await admitProjection(currentGrant)) return null;
      const result = await this.db.query<{ result: unknown }>(
        "select result from forum_control_request where id=$1 and expires_at>clock_timestamp()", [id]);
      const payload = result.rows[0]?.result;
      return isRecord(payload) ? { status: "read-ok", result: payload } : null;
    });
  }
}
