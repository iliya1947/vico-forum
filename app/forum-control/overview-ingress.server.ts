import type { AuthRuntime } from "../auth/request-context";
import { createWebClient, bestEffortDiscardClient } from "../../db/postgres-deadlines";
import { ForumControlDenied, type ForumControlGrant } from "./delegation-admission.server";
import { admitForumControlAccessToken } from "./delegation-store.server";
import type { ForumControlOAuthConfig } from "./oauth-provider.server";
import { createAdminOverviewReader } from "./admin-overview.server";
import { PostgresOverviewRequests, RequestIdConflict, type OverviewRequestRow, type OverviewOutcome } from "./request-store.server";
import { verifyRequestWebhook, type GitHubInboxBinding, type GitHubInboxClient } from "./github-transport.server";
import { decodeTransportJson, exactKeys, InvalidTransportInput, isJsonPost, isTransportUuid,
  parseOverviewRequest, readBoundedBody, type InboxEnvelope } from "./transport-wire.server";
import { forumControlScopes } from "./write-tool-contract";

const root = "/api/forum-control/";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
export function isForumControlIngress(path: string): boolean { return path.startsWith(root); }
type Defer = (task: Promise<void>) => void;
export type OverviewIngress = (request: Request, defer?: Defer) => Promise<Response>;

export interface OverviewIngressConfig {
  readonly origin: string;
  readonly oauth: ForumControlOAuthConfig;
  readonly inbox: GitHubInboxBinding;
  readonly webhookSecret: string;
  readonly clientSecret: string;
  readonly connectionString: string;
  readonly auth: AuthRuntime;
  readonly github: GitHubInboxClient;
}
function envelope(row: OverviewRequestRow, kind: InboxEnvelope["kind"]): InboxEnvelope {
  return { version: 1, kind, ref: kind === "request" ? row.requestRef : row.receiptRef, requestId: row.id };
}
type Status = "pending" | "read-ok" | "denied" | "conflict" | "stale" | "unavailable" | "outcome-unknown";
function reply(id: string, status: Status, code: string, statusOnly = false, published?: OverviewOutcome) {
  const receipt = { requestId: id, op: "read_admin_overview", status, code,
    ...(published?.status === "read-ok" ? { result: published.result } : {}) };
  if (!statusOnly) return Response.json(receipt, { headers });
  const transport = published ? "published" : status === "pending" ? "pending"
    : status === "outcome-unknown" ? "outcome-unknown" : "unavailable";
  return Response.json({ requestId: id, transport, status, code, ...(published ? { receipt } : {}) }, { headers });
}
function reject(status: number) { return new Response(null, { status, headers }); }

/** The production default supplies no ingress. The local fixture supplies a
 * fixed origin, native auth runtime, private inbox and fake GitHub HTTP seam.
 * There is no model-controlled URL, database connection or generic executor. */
export function createOverviewIngress(config: OverviewIngressConfig): OverviewIngress {
  if (new URL(config.origin).origin !== config.origin || new URL(config.oauth.issuer).origin !== config.origin ||
      config.inbox.repositoryId !== config.oauth.repositoryId || !config.clientSecret || !config.webhookSecret)
    throw new Error("Invalid forum control ingress binding");
  const reader = createAdminOverviewReader(config.connectionString, config.oauth.ownerUserId);
  async function withDb<T>(work: (db: ReturnType<typeof createWebClient>, store: PostgresOverviewRequests) => Promise<T>): Promise<T> {
    const db = createWebClient(config.connectionString);
    try { await db.connect(); return await work(db, new PostgresOverviewRequests(db, config.oauth)); }
    finally { bestEffortDiscardClient(db); }
  }
  const storage = <T>(work: (store: PostgresOverviewRequests) => Promise<T>) => withDb((_db, store) => work(store));

  async function admit(request: Request): Promise<ForumControlGrant> {
    const token = /^Bearer ([A-Za-z0-9_-]{1,2048})$/i.exec(request.headers.get("Authorization") ?? "")?.[1];
    if (!token || request.headers.has("Cookie")) throw new ForumControlDenied();
    const response = await config.auth.handle(new Request(config.oauth.issuer + "/oauth2/introspect", {
      method: "POST", body: new URLSearchParams({ client_id: config.oauth.clientId,
        client_secret: config.clientSecret, token, token_type_hint: "access_token" }),
    }));
    if ([400, 401, 403].includes(response.status)) throw new ForumControlDenied();
    if (!response.ok) throw new Error("OAuth introspection unavailable");
    const claims = decodeTransportJson(await readBoundedBody(response, 16384));
    return withDb(db => admitForumControlAccessToken(db, config.oauth, token, claims, forumControlScopes.read));
  }

  // All GitHub IO takes place after durable transaction acknowledgement.
  // An ambiguous POST may be reconciled or republished using the SAME ref.
  async function publishReceipt(row: OverviewRequestRow, grant: ForumControlGrant): Promise<string | null> {
    const current = await storage(store => store.inspect(row.id, grant));
    if (!current || current.expired || !current.finishedAt) return null;
    const receipt = envelope(current, "receipt");
    let id = current.receiptCommentId;
    if (!id || !await config.github.verify(id, receipt)) {
      id = await config.github.find(receipt, current.finishedAt);
      if (!id) id = await config.github.publish(receipt);
      if (!await config.github.verify(id, receipt)) return null;
      const recorded = await storage(store => store.recordReceiptPublication(current.id, grant, current.receiptRef,
        id!, current.receiptCommentId));
      if (!recorded?.receiptCommentId) return null;
      if (recorded.receiptCommentId !== id && !await config.github.verify(recorded.receiptCommentId, receipt)) return null;
      id = recorded.receiptCommentId;
    }
    return id;
  }

  async function execute(row: OverviewRequestRow): Promise<void> {
    const claimed = await storage(store => store.claim(row.id));
    if (!claimed) return;
    let grant: ForumControlGrant | undefined;
    const finished = await storage(store => store.completeOverview(row.id, current => {
      grant = current;
      return reader.read(current);
    }));
    if (finished && grant) await publishReceipt(finished, grant);
  }

  async function result(request: Request, row: OverviewRequestRow, grant: ForumControlGrant, statusOnly: boolean): Promise<Response> {
    if (row.expired) return reply(row.id, row.startedAt && !row.finishedAt ? "outcome-unknown" : "stale", "delivery-expired", statusOnly);
    if (!row.finishedAt) return reply(row.id, "pending", row.startedAt ? "started" : row.acceptedAt ? "accepted" : "registered", statusOnly);
    let commentId: string | null;
    try { commentId = await publishReceipt(row, grant); }
    catch (error) {
      if (error instanceof ForumControlDenied) throw error;
      return reply(row.id, "pending", "receipt-unavailable", statusOnly);
    }
    if (!commentId) return reply(row.id, "pending", "receipt-unverified", statusOnly);
    // Re-admit the actual bearer after external IO, not only a captured
    // grant snapshot. The protected read additionally checks the live grant,
    // current permission projection and matching receipt under row locks.
    const current = await admit(request);
    const outcome = await storage(store => store.readPublished(row.id, current, row.receiptRef,
      commentId!, reader.canReadResult));
    if (!outcome) {
      const latest = await storage(store => store.inspect(row.id, current));
      if (latest?.expired) return reply(row.id, "stale", "delivery-expired", statusOnly);
      if (latest && latest.receiptCommentId !== commentId) return reply(row.id, "pending", "receipt-state-changed", statusOnly);
      return reply(row.id, "denied", "result-unavailable", statusOnly);
    }
    return reply(row.id, outcome.status, outcome.status === "read-ok" ? "overview" : "overview-" + outcome.status,
      statusOnly, outcome);
  }

  return async (request, defer) => {
    const url = new URL(request.url);
    if (url.origin !== config.origin || url.search || request.method !== "POST") return reject(404);
    if (url.pathname === root + "webhook") {
      const verified = await verifyRequestWebhook(request, config.inbox, config.webhookSecret);
      if (!verified) return reject(403);
      try {
        const accepted = await storage(store => store.accept(verified));
        if (!accepted) return reject(404);
        // 202 is not a claim of execution. The acceptance transaction has
        // committed first; a duplicate may wake only a still-unstarted row.
        const task = execute(accepted).catch(() => undefined);
        if (defer) defer(task); else await task;
        return reject(202);
      } catch (error) { return reject(error instanceof ForumControlDenied ? 403 : 503); }
    }
    if (url.pathname !== root + "request" && url.pathname !== root + "status") return reject(404);
    if (!isJsonPost(request)) return reject(415);
    const origin = request.headers.get("Origin");
    if (origin !== null && origin !== config.origin) return reject(403);
    const statusOnly = url.pathname === root + "status";
    let requestId: string | undefined;
    let durableStateMayExist = false;
    try {
      const grant = await admit(request);
      if (url.pathname === root + "request") {
        const input = await parseOverviewRequest(request);
        requestId = input.requestId;
        durableStateMayExist = true;
        const row = await storage(store => store.register(input, grant));
        if (!row.acceptedAt && !row.expired) {
          try {
            const message = envelope(row, "request");
            if (!await config.github.find(message, row.createdAt)) await config.github.publish(message);
          } catch { return reply(row.id, "pending", "request-delivery-unconfirmed"); }
        }
      } else {
        const body = decodeTransportJson(await readBoundedBody(request, 4096));
        if (!exactKeys(body, ["requestId"]) || !isTransportUuid(body.requestId)) throw new InvalidTransportInput();
        requestId = body.requestId;
        durableStateMayExist = true;
      }
      const row = await storage(store => store.inspect(requestId!, grant));
      return row ? await result(request, row, grant, statusOnly) : reject(404);
    } catch (error) {
      if (error instanceof InvalidTransportInput) return reject(400);
      if (error instanceof ForumControlDenied) return reject(401);
      if (error instanceof RequestIdConflict && requestId) return reply(requestId, "conflict", "request-id-conflict", statusOnly);
      return requestId ? reply(requestId, durableStateMayExist ? "outcome-unknown" : "unavailable", "transport-unavailable", statusOnly) : reject(503);
    }
  };
}
