import {
  forumControlScopes, parseWriteStepInput, writeToolDescriptor,
} from "../../app/forum-control/write-tool-contract";
import {
  isValidReadToolInput, readToolInputSchema, readToolSecurity,
} from "../../app/forum-control/read-tool-contract";

/** Test-only MCP subset; never mounted by the production Worker.
 * The caller supplies the authenticated scope resolver, not model arguments.
 * No domain reader, writer, GitHub client or external connection exists here.
 */
type Scope = typeof forumControlScopes[keyof typeof forumControlScopes];
export type FixtureAdmission = (request: Request) => Promise<ReadonlySet<Scope> | null>;

const version = "2025-11-25";
const overview = {
  name: "read_admin_overview",
  description: "Read synthetic Admin Overview counts from the local fixture. No actual forum data or GitHub transport.",
  inputSchema: readToolInputSchema("read_admin_overview"),
  outputSchema: {
    type: "object", additionalProperties: false,
    properties: {
      fixture: { const: true }, status: { const: "read-ok" },
      topics: { type: "integer", minimum: 0 }, users: { type: "integer", minimum: 0 },
    },
    required: ["fixture", "status", "topics", "users"],
  },
  ...readToolSecurity,
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
} as const;

const fixtureWriteNames = ["pin_topic", "create_custom_role", "deactivate_account"] as const;
type FixtureWriteName = typeof fixtureWriteNames[number];
function isFixtureWrite(name: unknown): name is FixtureWriteName {
  return fixtureWriteNames.some(candidate => candidate === name);
}

const writes = fixtureWriteNames.map(name => ({
  ...writeToolDescriptor(name),
  description: "Synthetic local fixture for " + name + ". This tool never changes forum data or sends anything to GitHub. " +
    "Invoke only after the owner confirms the exact explained task in the current conversation. Returns unavailable.",
}));

const tools = [overview, ...writes];

export function createLocalForumControlMcpFixture(endpoint: URL, admit: FixtureAdmission) {
  if (!["127.0.0.1", "localhost", "[::1]"].includes(endpoint.hostname) ||
      endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new Error("The local MCP fixture requires a loopback endpoint");
  }
  const headers = { "Cache-Control": "private, no-store" };
  const json = (value: unknown, status = 200) => Response.json(value, { status, headers });
  return async (request: Request): Promise<Response> => {
    if (request.url !== endpoint.href) return new Response(null, { status: 404, headers });
    const origin = request.headers.get("Origin");
    if (origin !== null && origin !== endpoint.origin) return new Response(null, { status: 403, headers });
    if (request.method !== "POST") {
      return new Response(null, { status: 405, headers: { ...headers, Allow: "POST" } });
    }
    let scopes: Awaited<ReturnType<FixtureAdmission>>;
    try { scopes = await admit(request); }
    catch { return new Response(null, { status: 503, headers }); }
    if (!scopes || (!scopes.has(forumControlScopes.read) && !scopes.has(forumControlScopes.write))) {
      return new Response(null, { status: 401, headers: { ...headers, "WWW-Authenticate": "Bearer" } });
    }
    if (request.headers.get("Content-Type")?.split(";")[0].trim() !== "application/json") {
      return new Response(null, { status: 415, headers });
    }
    const requestedVersion = request.headers.get("MCP-Protocol-Version");
    if (requestedVersion && requestedVersion !== version) return new Response(null, { status: 400, headers });
    let message: unknown;
    try { message = await request.json(); }
    catch { return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400); }
    if (!message || typeof message !== "object" || Array.isArray(message)) {
      return json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } }, 400);
    }
    const body = message as Record<string, unknown>;
    const id = typeof body.id === "string" || Number.isSafeInteger(body.id) ? body.id : null;
    const error = (code: number, message: string) => json({ jsonrpc: "2.0", id, error: { code, message } });
    const result = (value: unknown) => json({ jsonrpc: "2.0", id, result: value });
    if (body.jsonrpc !== "2.0" || typeof body.method !== "string") return error(-32600, "Invalid Request");
    if (!Object.hasOwn(body, "id")) {
      return new Response(null, { status: body.method === "notifications/initialized" ? 202 : 400, headers });
    }
    if (id === null) return error(-32600, "Invalid Request");
    if (body.method === "initialize") {
      return result({ protocolVersion: version, capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "vico-forum-control-local-fixture", version: "1.0.0" } });
    }
    if (body.method === "ping") return result({});
    if (body.method === "tools/list") {
      return result({ tools: tools.filter(tool => scopes.has(
        tool.name === overview.name ? forumControlScopes.read : forumControlScopes.write)) });
    }
    if (body.method !== "tools/call") return error(-32601, "Method not found");
    if (!body.params || typeof body.params !== "object" || Array.isArray(body.params)) {
      return error(-32602, "Invalid params");
    }
    const params = body.params as Record<string, unknown>;
    if (Object.keys(params).some(key => key !== "name" && key !== "arguments" && key !== "_meta")) {
      return error(-32602, "Invalid params");
    }
    const name = params.name;
    const args = Object.hasOwn(params, "arguments") ? params.arguments : {};
    const toolResult = (structuredContent: object) => result({
      content: [{ type: "text", text: JSON.stringify(structuredContent) }], structuredContent, isError: false,
    });
    const toolError = (text: string) => result({ content: [{ type: "text", text }], isError: true });
    if (name === overview.name) {
      if (!scopes.has(forumControlScopes.read)) return toolError("Insufficient scope");
      if (!isValidReadToolInput(name, args)) return error(-32602, "Invalid tool arguments");
      return toolResult({ fixture: true, status: "read-ok", topics: 3, users: 2 });
    }
    if (!isFixtureWrite(name)) return error(-32602, "Unknown tool");
    if (!scopes.has(forumControlScopes.write)) return toolError("Insufficient scope");
    const step = parseWriteStepInput(args);
    if (!step) return error(-32602, "Invalid tool arguments");
    return toolResult({ requestId: crypto.randomUUID(), taskId: step.taskId, op: name,
      status: "unavailable", code: "local-fixture-no-domain-effect" });
  };
}
