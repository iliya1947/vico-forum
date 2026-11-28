/** Local acceptance entry only; not imported by production. */
import { Client } from "pg";
import { createHyperdriveAuthRuntime, type BetterAuthEnvironment } from "../../../app/auth/auth.server";
import { resolveRuntimeDatabaseConnectionStrings } from "../../../workers/database-bindings";
import { createOAuthForumControlMcpFixture } from "../../fixtures/forum-control-oauth";
import { config, databaseName, origin } from "./config";
import { createGitHubInboxClient, type GitHubInboxBinding } from "../../../app/forum-control/github-transport.server";
import { createOverviewIngress, isForumControlIngress } from "../../../app/forum-control/overview-ingress.server";
import { adminOverviewDescriptor } from "../../../app/forum-control/overview-tool-contract";
import { requestStatusDescriptor } from "../../../app/forum-control/task-tool-contract";
import { decodeTransportJson, isRecord, readBoundedBody } from "../../../app/forum-control/transport-wire.server";

const inbox: GitHubInboxBinding = {
  repositoryId: "123", repositoryOwnerId: "456", appId: "789", installationId: "234", botUserId: "567",
  inboxIssueId: "345", inboxNumber: 7, owner: "local-owner", repository: "private-inbox",
};
// Only the local fixture rewrites the fixed GitHub origin to its disposable
// HTTP server. No production adapter receives this fetch implementation.
const fixtureGitHubFetch: typeof fetch = (input, init) => {
  if (typeof input !== "string") throw new Error("Unexpected fixture transport");
  const url = new URL(input);
  if (url.origin !== "https://api.github.com") throw new Error("Unexpected fixture destination");
  return fetch("http://127.0.0.1:4243" + url.pathname + url.search, init);
};

type FixtureEnv = Env & BetterAuthEnvironment & { FORUM_CONTROL_FIXTURE_CLIENT_SECRET?: string };
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
const page = (body: string) => new Response("<!doctype html><html lang=en><meta charset=utf-8><title>Local OAuth fixture</title>" + body,
  { headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } });

export default {
  async fetch(request: Request, env: FixtureEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.origin !== origin || env.BETTER_AUTH_URL !== origin || !env.FORUM_CONTROL_FIXTURE_CLIENT_SECRET) {
      return new Response(null, { status: 404, headers });
    }
    const { webConnectionString } = resolveRuntimeDatabaseConnectionStrings(env);
    const db = new Client({ connectionString: webConnectionString });
    await db.connect();
    try {
      const result = await db.query("select current_database() db,current_schema() schema");
      if (result.rows[0]?.db !== databaseName || result.rows[0]?.schema !== "public") {
        return new Response(null, { status: 404, headers });
      }
    } finally { await db.end(); }
    const runtime = createHyperdriveAuthRuntime(webConnectionString, env, undefined, undefined, undefined, undefined, config);
    if (url.pathname.startsWith("/api/auth/") || url.pathname === "/.well-known/oauth-authorization-server/api/auth") {
      return runtime.handle(request);
    }
    if (url.pathname === "/mcp" || url.pathname === "/.well-known/oauth-protected-resource/mcp" || isForumControlIngress(url.pathname)) {
      const secret = env.FORUM_CONTROL_FIXTURE_CLIENT_SECRET;
      const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", hash: "SHA-256",
        modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) }, false, ["sign", "verify"]);
      if (!("privateKey" in pair)) throw new Error("Invalid fixture key pair");
      const ingress = createOverviewIngress({ origin, oauth: config, inbox,
        webhookSecret: secret, clientSecret: secret, connectionString: webConnectionString, auth: runtime,
        github: createGitHubInboxClient(inbox, pair.privateKey, fixtureGitHubFetch) });
      if (isForumControlIngress(url.pathname)) return ingress(request, task => ctx.waitUntil(task));

      async function transport(source: Request, endpoint: "request" | "status", body: object) {
        const response = await ingress(new Request(origin + "/api/forum-control/" + endpoint, {
          method: "POST", headers: { Authorization: source.headers.get("Authorization") ?? "", "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }));
        if (!response.ok) throw new Error("Fixture transport denied");
        const value = decodeTransportJson(await readBoundedBody(response, 131072));
        if (!isRecord(value)) throw new Error("Invalid fixture transport response");
        return value;
      }
      const status = (source: Request, requestId: string) => transport(source, "status", { requestId });
      return createOAuthForumControlMcpFixture(config, runtime, secret, {
        descriptor: adminOverviewDescriptor,
        statusDescriptor: requestStatusDescriptor,
        status,
        async call(source) {
          const requestId = crypto.randomUUID();
          const deadline = Date.now() + 8000;
          let outcome = await transport(source, "request", { version: 1, tool: "read_admin_overview", requestId, arguments: {} });
          // Bounded synchronous tool wait; the separate status tool continues
          // the SAME ID if GitHub delivery does not finish in this window.
          for (let attempt = 0; outcome.status === "pending" && attempt < 6 && Date.now() < deadline; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 200));
            const state = await status(source, requestId);
            outcome = isRecord(state.receipt) ? state.receipt : {
              requestId, op: "read_admin_overview", status: state.status, code: state.code,
            };
          }
          return outcome;
        },
      })(request);
    }
    if (request.method !== "GET") return new Response(null, { status: 405, headers });
    if (url.pathname === "/ready") return new Response("ready", { headers });
    if (url.pathname === "/callback") return page("<h1>Authorization callback</h1>");
    if (url.pathname === "/login") return page(`
      <h1>Local Owner login</h1><form><label>Email <input name=email type=email required></label>
      <label>Password <input name=password type=password required></label><button>Sign in</button></form>
      <p role=status></p><script>
      document.querySelector('form').onsubmit=async e=>{
        e.preventDefault(); const data=Object.fromEntries(new FormData(e.currentTarget));
        if(location.search) data.oauth_query=location.search.slice(1);
        const response=await fetch('/api/auth/sign-in/email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
        if(!response.ok){document.querySelector('[role=status]').textContent='Sign-in denied';return;}
        if(!location.search){document.querySelector('[role=status]').textContent='Signed in';return;}
        const reply=await response.json();const next=typeof reply.url==='string'?new URL(reply.url,location.origin):null;
        if(next&&next.origin===location.origin&&next.pathname==='/consent')location.assign(next.href);
        else document.querySelector('[role=status]').textContent='Sign-in denied';
      };</script>`);
    if (url.pathname === "/consent") return page(`
      <h1>Local forum control consent</h1><p id=scopes></p>
      <button id=approve>Approve</button><button id=deny>Deny</button><p role=status></p>
      <script>
      const query=location.search.slice(1);document.getElementById('scopes').textContent=new URLSearchParams(query).get('scope')||'';
      async function decide(accept){
        const response=await fetch('/api/auth/oauth2/consent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accept,oauth_query:query})});
        if(!response.ok){document.querySelector('[role=status]').textContent='Consent denied';return;}
        const data=await response.json();const next=typeof data.url==='string'?new URL(data.url,location.origin):null;
        if(next&&next.origin===location.origin&&next.pathname==='/callback')location.assign(next.href);
        else document.querySelector('[role=status]').textContent='Consent denied';
      }
      document.getElementById('approve').onclick=()=>decide(true);document.getElementById('deny').onclick=()=>decide(false);
      </script>`);
    return new Response(null, { status: 404, headers });
  },
} satisfies ExportedHandler<FixtureEnv>;
