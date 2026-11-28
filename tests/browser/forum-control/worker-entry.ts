/** Local acceptance entry only; not imported by production. */
import { Client } from "pg";
import { createHyperdriveAuthRuntime, type BetterAuthEnvironment } from "../../../app/auth/auth.server";
import { resolveRuntimeDatabaseConnectionStrings } from "../../../workers/database-bindings";
import { createOAuthForumControlMcpFixture } from "../../fixtures/forum-control-oauth";
import { config, databaseName, origin } from "./config";

type FixtureEnv = Env & BetterAuthEnvironment & { FORUM_CONTROL_FIXTURE_CLIENT_SECRET?: string };
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
const page = (body: string) => new Response("<!doctype html><html lang=en><meta charset=utf-8><title>Local OAuth fixture</title>" + body,
  { headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } });

export default {
  async fetch(request: Request, env: FixtureEnv): Promise<Response> {
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
    if (url.pathname === "/mcp" || url.pathname === "/.well-known/oauth-protected-resource/mcp") {
      return createOAuthForumControlMcpFixture(config, runtime, env.FORUM_CONTROL_FIXTURE_CLIENT_SECRET)(request);
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
        const response=await fetch('/api/auth/sign-in/email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
        document.querySelector('[role=status]').textContent=response.ok?'Signed in':'Sign-in denied';
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
