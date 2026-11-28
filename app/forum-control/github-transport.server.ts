import {
  decodeTransportJson, InvalidTransportInput, isJsonPost, isRecord, isTransportUuid,
  parseInboxEnvelope, readBoundedBody, serializeInboxEnvelope, type InboxEnvelope,
} from "./transport-wire.server";

const apiOrigin = "https://api.github.com";
const apiVersion = "2026-03-10";

/** Server-owned identity of one private inbox. All IDs are exact GitHub
 * numeric identities, not usernames or model-provided repository locators. */
export interface GitHubInboxBinding {
  readonly repositoryId: string;
  readonly repositoryOwnerId: string;
  readonly appId: string;
  readonly installationId: string;
  readonly botUserId: string;
  readonly inboxIssueId: string;
  readonly inboxNumber: number;
  readonly owner: string;
  readonly repository: string;
}

function positiveId(value: unknown): string | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? String(value) : null;
}

function validId(value: string): boolean {
  return /^[1-9]\d*$/.test(value) && positiveId(Number(value)) === value;
}

function validSegment(value: string): boolean {
  return /^[a-zA-Z0-9_.-]{1,100}$/.test(value) && value.trim() === value && value !== "." && value !== "..";
}

function assertBinding(binding: GitHubInboxBinding): void {
  if (![binding.repositoryId, binding.repositoryOwnerId, binding.appId, binding.installationId,
    binding.botUserId, binding.inboxIssueId].every(validId) || !positiveId(binding.inboxNumber) ||
      !validSegment(binding.owner) || !validSegment(binding.repository)) throw new Error("Invalid forum control inbox binding");
}

function repoPath(binding: GitHubInboxBinding): string { return "/repos/" + binding.owner + "/" + binding.repository; }
function issuePath(binding: GitHubInboxBinding): string { return repoPath(binding) + "/issues/" + binding.inboxNumber; }

function matchesRepository(value: unknown, binding: GitHubInboxBinding): boolean {
  return isRecord(value) && positiveId(value.id) === binding.repositoryId && value.private === true &&
    isRecord(value.owner) && positiveId(value.owner.id) === binding.repositoryOwnerId;
}

function matchesIssue(value: unknown, binding: GitHubInboxBinding): boolean {
  return isRecord(value) && positiveId(value.id) === binding.inboxIssueId && value.number === binding.inboxNumber &&
    value.state === "open" && !Object.hasOwn(value, "pull_request");
}

function matchesBot(value: unknown, binding: GitHubInboxBinding): boolean {
  return isRecord(value) && positiveId(value.id) === binding.botUserId && value.type === "Bot";
}

function trustedComment(value: unknown, binding: GitHubInboxBinding): { id: string; envelope: InboxEnvelope } | null {
  if (!isRecord(value) || !matchesBot(value.user, binding) || !isRecord(value.performed_via_github_app) ||
      positiveId(value.performed_via_github_app.id) !== binding.appId || value.issue_url !== apiOrigin + issuePath(binding)) return null;
  const id = positiveId(value.id), envelope = parseInboxEnvelope(value.body);
  return id && envelope ? { id, envelope } : null;
}

export interface VerifiedRequestDelivery {
  readonly deliveryId: string;
  readonly commentId: string;
  readonly envelope: InboxEnvelope & { kind: "request" };
}

/** Verify the exact raw bytes before parsing. Neither GitHub body text nor an
 * otherwise authentic webhook can create an executable record. The returned
 * ref MUST be resolved against an already persisted, admitted request. */
export async function verifyRequestWebhook(request: Request, binding: GitHubInboxBinding,
  webhookSecret: string): Promise<VerifiedRequestDelivery | null> {
  assertBinding(binding);
  const deliveryId = request.headers.get("X-GitHub-Delivery");
  const signature = request.headers.get("X-Hub-Signature-256");
  if (!isJsonPost(request) || request.headers.get("X-GitHub-Event") !== "issue_comment" ||
      !isTransportUuid(deliveryId) || !signature || signature.length !== 71 || !/^sha256=[0-9a-f]{64}$/.test(signature) || !webhookSecret) return null;
  try {
    const bytes = await readBoundedBody(request, 262144);
    const supplied = Uint8Array.from(signature.slice(7).match(/../g)!, hex => parseInt(hex, 16));
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    if (!await crypto.subtle.verify("HMAC", key, supplied, bytes)) return null;
    const body = decodeTransportJson(bytes);
    if (!isRecord(body) || body.action !== "created" || !matchesRepository(body.repository, binding) ||
        !matchesIssue(body.issue, binding) || !matchesBot(body.sender, binding) || !isRecord(body.installation) ||
        positiveId(body.installation.id) !== binding.installationId) return null;
    const comment = trustedComment(body.comment, binding);
    if (!comment || comment.envelope.kind !== "request") return null;
    return { deliveryId, commentId: comment.id, envelope: { ...comment.envelope, kind: "request" } };
  } catch { return null; }
}

export class GitHubTransportUnavailable extends Error {
  constructor() { super("GitHub inbox transport unavailable"); this.name = "GitHubTransportUnavailable"; }
}

function base64url(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join("")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export interface GitHubInboxClient {
  publish(envelope: InboxEnvelope): Promise<string>;
  /** A null result is not proof of absence or a licence to execute again. */
  find(envelope: InboxEnvelope, since: Date): Promise<string | null>;
  verify(commentId: string, envelope: InboxEnvelope): Promise<boolean>;
}

/** Only a trusted composition supplies the key and optional local HTTP seam.
 * The API destination, installation, repo, issue, operations, request bodies
 * and maximum search work are closed here. No live credentials in Stage B. */
export function createGitHubInboxClient(binding: GitHubInboxBinding,
  privateKey: Parameters<typeof crypto.subtle.sign>[1], fetcher: typeof fetch = fetch): GitHubInboxClient {
  assertBinding(binding);
  const algorithm = privateKey.algorithm;
  if (privateKey.type !== "private" || algorithm.name !== "RSASSA-PKCS1-v1_5" ||
      !isRecord(algorithm) || !isRecord(algorithm.hash) || algorithm.hash.name !== "SHA-256" ||
      typeof algorithm.modulusLength !== "number" || algorithm.modulusLength < 2048 || !privateKey.usages.includes("sign")) {
    throw new Error("Invalid GitHub App signing key");
  }
  let token: { value: string; expiresAt: number } | undefined;

  async function api(path: string, bearer: string, status: number, body?: object, allowMissing = false): Promise<unknown> {
    try {
      const response = await fetcher(apiOrigin + path, {
        method: body ? "POST" : "GET", redirect: "error", signal: AbortSignal.timeout(5000),
        headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + bearer,
          "X-GitHub-Api-Version": apiVersion, "User-Agent": "Vico-Forum-Control", ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (allowMissing && response.status === 404) return null;
      if (response.status !== status) throw new GitHubTransportUnavailable();
      return decodeTransportJson(await readBoundedBody(response, 1048576));
    } catch { throw new GitHubTransportUnavailable(); }
  }

  async function installationToken(): Promise<string> {
    if (token && token.expiresAt > Date.now() + 30000) return token.value;
    try {
      const now = Math.floor(Date.now() / 1000);
      const encode = (value: object) => base64url(new TextEncoder().encode(JSON.stringify(value)));
      const message = encode({ alg: "RS256", typ: "JWT" }) + "." + encode({ iss: binding.appId, iat: now - 60, exp: now + 480 });
      const signed = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(message));
      const result = await api("/app/installations/" + binding.installationId + "/access_tokens",
        message + "." + base64url(new Uint8Array(signed)), 201,
        { repository_ids: [Number(binding.repositoryId)], permissions: { issues: "write" } });
      if (!isRecord(result) || typeof result.token !== "string" || !/^[!-~]{1,4096}$/.test(result.token) || result.token.trim() !== result.token ||
          typeof result.expires_at !== "string" || !isRecord(result.permissions) || result.permissions.issues !== "write" ||
          !Object.entries(result.permissions).every(([name, level]) =>
            (name === "issues" && level === "write") || (name === "metadata" && level === "read")) ||
          (Object.hasOwn(result, "repositories") && (!Array.isArray(result.repositories) || result.repositories.length !== 1 ||
            !isRecord(result.repositories[0]) || positiveId(result.repositories[0].id) !== binding.repositoryId))) {
        throw new GitHubTransportUnavailable();
      }
      const expiresAt = Date.parse(result.expires_at);
      if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() + 30000) throw new GitHubTransportUnavailable();
      token = { value: result.token, expiresAt };
      return token.value;
    } catch { throw new GitHubTransportUnavailable(); }
  }

  async function inboxToken(): Promise<string> {
    const bearer = await installationToken();
    if (!matchesRepository(await api(repoPath(binding), bearer, 200), binding) ||
        !matchesIssue(await api(issuePath(binding), bearer, 200), binding)) throw new GitHubTransportUnavailable();
    return bearer;
  }

  function matchingComment(value: unknown, envelope: InboxEnvelope): string | null {
    const comment = trustedComment(value, binding);
    return comment && serializeInboxEnvelope(comment.envelope) === serializeInboxEnvelope(envelope) ? comment.id : null;
  }

  return {
    async publish(envelope) {
      const body = serializeInboxEnvelope(envelope);
      const bearer = await inboxToken();
      const result = await api(issuePath(binding) + "/comments", bearer, 201, { body });
      const id = matchingComment(result, envelope);
      if (!id) throw new GitHubTransportUnavailable();
      return id;
    },
    async find(envelope, since) {
      serializeInboxEnvelope(envelope);
      if (!Number.isFinite(since.getTime())) throw new InvalidTransportInput();
      const bearer = await inboxToken();
      // Do not follow untrusted Link URLs. A bounded search may find nothing;
      // the request lifecycle, not this adapter, decides how to reconcile.
      for (let page = 1; page <= 2; page++) {
        // GitHub timestamps can have only second precision. Include the whole
        // registration second, even when a POST response was lost immediately.
        const after = new Date(Math.floor(since.getTime() / 1000) * 1000 - 1000).toISOString();
        const query = new URLSearchParams({ since: after, per_page: "50", page: String(page) });
        const result = await api(issuePath(binding) + "/comments?" + query, bearer, 200);
        if (!Array.isArray(result) || result.length > 50) throw new GitHubTransportUnavailable();
        for (const candidate of result) {
          const id = matchingComment(candidate, envelope);
          if (id) return id;
        }
        if (result.length < 50) break;
      }
      return null;
    },
    async verify(commentId, envelope) {
      serializeInboxEnvelope(envelope);
      if (!validId(commentId)) return false;
      const bearer = await inboxToken();
      const result = await api(repoPath(binding) + "/issues/comments/" + commentId, bearer, 200, undefined, true);
      return matchingComment(result, envelope) === commentId;
    },
  };
}
