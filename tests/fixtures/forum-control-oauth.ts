import type { AuthRuntime } from "../../app/auth/request-context";
import type { ForumControlOAuthConfig } from "../../app/forum-control/oauth-provider.server";
import { forumControlScopes } from "../../app/forum-control/write-tool-contract";
import { createLocalForumControlMcpFixture } from "./forum-control-mcp";

/** Local test composition only. Client credentials never enter the tool
 * schema or model payload. Introspection is an in-process call to the actual
 * configured auth runtime; no user-selected URL and no outbound fetch. */
export function createOAuthForumControlMcpFixture(config: ForumControlOAuthConfig,
  runtime: AuthRuntime, clientSecret: string) {
  const endpoint = new URL(config.resource);
  const issuer = new URL(config.issuer);
  if (![endpoint, issuer, new URL(config.redirectUri)].every(url =>
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) {
    throw new Error("OAuth fixture is loopback only");
  }
  const metadataPath = new URL("/.well-known/oauth-protected-resource" + endpoint.pathname, endpoint.origin);
  const handler = createLocalForumControlMcpFixture(endpoint, async request => {
    const token = /^Bearer ([A-Za-z0-9_-]+)$/i.exec(request.headers.get("Authorization") ?? "")?.[1];
    if (!token || token.length > 2048) return null;
    const response = await runtime.handle(new Request(config.issuer + "/oauth2/introspect", {
      method: "POST",
      body: new URLSearchParams({
        client_id: config.clientId, client_secret: clientSecret, token, token_type_hint: "access_token",
      }),
    }));
    if (!response.ok) {
      if (response.status === 400 || response.status === 401 || response.status === 403) return null;
      throw new Error("Local OAuth introspection unavailable");
    }
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("Invalid introspection response");
    const claims = result as Record<string, unknown>;
    if (claims.active !== true || typeof claims.scope !== "string" ||
      claims.client_id !== config.clientId || claims.iss !== config.issuer ||
      claims.sub !== config.ownerUserId || typeof claims.sid !== "string" || !claims.sid ||
      !(claims.aud === config.resource ||
        (Array.isArray(claims.aud) && claims.aud.length === 1 && claims.aud[0] === config.resource))) return null;
    const scopes = new Set(claims.scope.split(" "));
    return new Set(Object.values(forumControlScopes).filter(scope => scopes.has(scope)));
  });
  return async (request: Request): Promise<Response> => {
    if (request.url === metadataPath.href && request.method === "GET") {
      return Response.json({ resource: config.resource, authorization_servers: [config.issuer],
        scopes_supported: Object.values(forumControlScopes), bearer_methods_supported: ["header"] },
      { headers: { "Cache-Control": "no-store" } });
    }
    const response = await handler(request);
    if (response.status !== 401) return response;
    const headers = new Headers(response.headers);
    headers.set("WWW-Authenticate", 'Bearer resource_metadata="' + metadataPath.href + '"');
    return new Response(null, { status: 401, headers });
  };
}
