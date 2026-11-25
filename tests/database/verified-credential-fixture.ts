import { readFile } from "node:fs/promises";
import type { Client } from "pg";

type TestDatabase = Pick<Client, "query">;
type Handler = (request: Request) => Promise<Response>;

/** Fixture-only mutation, never imported from application or Worker code.
 * Check both the configured disposable DB and the actual connection/schema. */
async function assertDisposable(db: TestDatabase): Promise<void> {
  const configured = new URL(process.env.DATABASE_URL ?? "invalid:");
  if (!["localhost", "127.0.0.1"].includes(configured.hostname) ||
      !configured.pathname.endsWith("_test")) throw new Error("Disposable local *_test database required");
  const result = await db.query<{ db: string; schema: string }>(
    "select current_database() db,current_schema() schema");
  const row = result.rows[0];
  if (!row || row.db !== decodeURIComponent(configured.pathname.slice(1)) ||
      !(/^[a-zA-Z0-9_]+_test$/.test(row.schema) || (row.schema==="public" && process.env.CI==="true")))
    throw new Error("Disposable test schema required");
}

/** Use exact forward migrations for historical minimal auth schemas. */
export async function installAuthLifecycleFixture(db: TestDatabase): Promise<void> {
  await assertDisposable(db);
  for (const path of ["drizzle/0073_auth_account_uniqueness.sql", "drizzle/0074_auth_lifecycle_budget.sql"]) {
    await db.query(await readFile(path, "utf8"));
  }
}

/** Use only when verification itself is NOT the behavior being tested.
 * Require a real newly registered pending credential, not a synthetic signup
 * acknowledgement for an existing account. Clear its now-obsolete proof. */
export async function markVerifiedCredentialFixture(db: TestDatabase, email: string): Promise<string> {
  await assertDisposable(db);
  const result = await db.query<{ id: string }>(`with pending as (
      select u.id, v.id proof_id from "user" u join verification v
        on v.id='vico-auth-lifecycle:v1:email-verification:' || encode(sha256(convert_to(u.id,'UTF8')),'hex')
        and v.identifier=v.id
      where u.email=$1 and not u.email_verified and u.deactivated_at is null
      and exists(select 1 from account a where a.user_id=u.id and a.provider_id='credential'
        and a.password is not null and a.password <> '')
      and not exists(select 1 from session s where s.user_id=u.id)
    ), verified as (
      update "user" u set email_verified=true from pending p where u.id=p.id
      returning u.id,p.proof_id
    ), consumed as (
      delete from verification v using verified x where v.id=x.proof_id and v.identifier=x.proof_id
      returning x.id
    ) select id from consumed`, [email.toLowerCase()]);
  if (result.rowCount !== 1 || !result.rows[0]?.id) throw new Error("Expected one pending credential fixture and proof");
  return result.rows[0].id;
}

/** Preserve the actual signup and policy checks, then stage a verified fixture
 * and authenticate through a separate genuine sign-in. Never synthesize a cookie. */
export async function signupVerifiedSession(db: TestDatabase, handle: Handler, request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (request.method !== "POST" || url.pathname !== "/api/auth/sign-up/email" ||
      request.headers.has("cookie")) throw new Error("Expected fresh credential signup fixture request");
  const {email,password} = await request.clone().json() as {email:string;password:string};
  await assertDisposable(db);
  if ((await db.query('select id from "user" where email=$1',[email.toLowerCase()])).rowCount !== 0)
    throw new Error("Fixture email already exists");
  const pending = await handle(request);
  if (pending.status !== 200 || pending.headers.getSetCookie().some(value => value.includes("session_token=")))
    throw new Error("Expected pending signup without session");
  const result = await pending.json() as {status?:boolean;token?:unknown};
  if (result.status !== true || result.token !== null || Object.keys(result).length !== 2)
    throw new Error("Unexpected pending signup acknowledgement");
  const id = await markVerifiedCredentialFixture(db, email);
  url.pathname = "/api/auth/sign-in/email";
  const response = await handle(new Request(url, {
    method: "POST", headers: request.headers, body: JSON.stringify({email,password}),
  }));
  if (response.status !== 200 || !response.headers.getSetCookie().some(value => value.includes("session_token=")))
    throw new Error("Expected actual verified sign-in session");
  const login = await response.clone().json() as {user?:{id:string;emailVerified:boolean}};
  if (login.user?.id !== id || login.user.emailVerified !== true) throw new Error("Unexpected fixture identity");
  return response;
}

/** Connected smoke fixture only: a shared local Worker ingress bucket is
 * unrelated to the forum behavior under test. Reset the disposable lifecycle
 * budget before provisioning each fixture, never during abuse/policy probes. */
export async function signupConnectedVerifiedSession(
  db: TestDatabase, handle: Handler, request: Request,
): Promise<Response> {
  if(process.env.CI!=="true" || !["localhost","127.0.0.1"].includes(new URL(request.url).hostname))
    throw new Error("Connected disposable CI fixture required");
  await assertDisposable(db);
  await db.query("truncate auth_lifecycle_budget");
  return signupVerifiedSession(db, handle, request);
}
