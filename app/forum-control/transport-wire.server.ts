/** Stage B wire boundaries. A parsed envelope is not an authorization grant. */
export class InvalidTransportInput extends Error {
  constructor() { super("Invalid forum control transport input"); this.name = "InvalidTransportInput"; }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function exactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return isRecord(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}

export function isTransportUuid(value: unknown): value is string {
  return typeof value === "string" && value.length === 36 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
}

/** The caller sets the bound before any untrusted body is read. Do not buffer
 * unbounded webhook/API bodies or trust Content-Length alone. */
export async function readBoundedBody(message: Request | Response, maxBytes: number): Promise<Uint8Array<ArrayBuffer>> {
  const length = message.headers.get("Content-Length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxBytes)) throw new InvalidTransportInput();
  const reader = message.body?.getReader();
  if (!reader) throw new InvalidTransportInput();
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxBytes) throw new InvalidTransportInput();
      chunks.push(chunk.value);
    }
    const result = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
    return result;
  } finally { void reader.cancel().catch(() => {}); }
}

/** JSON.parse validates grammar. A structural token pass detects duplicates
 * at EVERY object depth, including escaped spellings of the same key. */
export function parseUniqueJson(text: string): unknown {
  try {
    const value: unknown = JSON.parse(text);
    const tokens = text.match(/"(?:\\.|[^"\\])*"|[{}[\]:,]/g) ?? [];
    const stack: Array<Set<string> | null> = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token === "{" || token === "[") {
        if (stack.length >= 32) throw new InvalidTransportInput();
        stack.push(token === "{" ? new Set<string>() : null);
      } else if (token === "}" || token === "]") stack.pop();
      else if (token.startsWith('"') && tokens[i + 1] === ":") {
        const names = stack.at(-1);
        const name = JSON.parse(token) as string;
        if (!names || names.has(name)) throw new InvalidTransportInput();
        names.add(name);
      }
    }
    return value;
  } catch { throw new InvalidTransportInput(); }
}

export function decodeTransportJson(bytes: Uint8Array<ArrayBuffer>): unknown {
  try { return parseUniqueJson(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new InvalidTransportInput(); }
}

export function isJsonPost(request: Request): boolean {
  return request.method === "POST" && request.headers.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase() === "application/json";
}

export interface OverviewTransportRequest {
  readonly version: 1;
  readonly tool: "read_admin_overview";
  readonly requestId: string;
  readonly arguments: Record<string, never>;
}

/** Only the Stage B reader is admitted. The full Stage A registry is not
 * executable yet. All actor/authority/binding fields come from the server. */
export async function parseOverviewRequest(request: Request): Promise<OverviewTransportRequest> {
  if (!isJsonPost(request)) throw new InvalidTransportInput();
  const body = decodeTransportJson(await readBoundedBody(request, 4096));
  if (!exactKeys(body, ["version", "tool", "requestId", "arguments"]) || body.version !== 1 ||
      body.tool !== "read_admin_overview" || !isTransportUuid(body.requestId) || !exactKeys(body.arguments, [])) {
    throw new InvalidTransportInput();
  }
  return { version: 1, tool: "read_admin_overview", requestId: body.requestId, arguments: {} };
}

export async function overviewRequestDigest(request: OverviewTransportRequest): Promise<string> {
  const canonical = JSON.stringify({ version: request.version, tool: request.tool, requestId: request.requestId, arguments: {} });
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
}

export interface InboxEnvelope {
  readonly version: 1;
  readonly kind: "request" | "receipt";
  readonly ref: string;
  readonly requestId: string;
}

export function serializeInboxEnvelope(value: InboxEnvelope): string {
  if (value.version !== 1 || (value.kind !== "request" && value.kind !== "receipt") ||
      !isTransportUuid(value.ref) || !isTransportUuid(value.requestId)) throw new InvalidTransportInput();
  // Project only the transport fields: never spread arbitrary objects into GitHub.
  return JSON.stringify({ version: 1, kind: value.kind, ref: value.ref, requestId: value.requestId });
}

export function parseInboxEnvelope(body: unknown): InboxEnvelope | null {
  if (typeof body !== "string" || body.length > 256) return null;
  try {
    const value = parseUniqueJson(body);
    if (!exactKeys(value, ["version", "kind", "ref", "requestId"]) || value.version !== 1 ||
        (value.kind !== "request" && value.kind !== "receipt") || !isTransportUuid(value.ref) || !isTransportUuid(value.requestId)) return null;
    const result: InboxEnvelope = { version: 1, kind: value.kind, ref: value.ref, requestId: value.requestId };
    return serializeInboxEnvelope(result) === body ? result : null;
  } catch { return null; }
}
