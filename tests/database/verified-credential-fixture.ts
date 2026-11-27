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
    throw new Error(`Expected pending signup without session (HTTP ${pending.status})`);
  const result = await pending.json() as {status?:boolean;token?:unknown};
  if (result.status !== true || result.token !== null || Object.keys(result).length !== 2)
    throw new Error("Unexpected pending signup acknowledgement");
  const id = await markVerifiedCredentialFixture(db, email);
  url.pathname = "/api/auth/sign-in/email";
  const response = await handle(new Request(url, {
    method: "POST", headers: request.headers, body: JSON.stringify({email,password}),
  }));
  if (response.status !== 200 || !response.headers.getSetCookie().some(value => value.includes("session_token=")))
    throw new Error(`Expected actual verified sign-in session (HTTP ${response.status})`);
  const login = await response.clone().json() as {user?:{id:string;emailVerified:boolean}};
  if (login.user?.id !== id || login.user.emailVerified !== true) throw new Error("Unexpected fixture identity");
  return response;
}

/** Read-only diagnostic on a failed real HTTP signup in disposable CI.
 * Keep the original assertion and emit only fixed categories and counts. */
async function describeConnectedSignupFailure(db: TestDatabase, email: string, response: Response): Promise<void> {
  let responseKind = "other";
  try {
    const body = await response.clone().text();
    if (body === "Unexpected server failure") responseKind = "worker-failure";
    else if (body === "Internal Server Error") responseKind = "framework-failure";
    else if (body === "Service unavailable") responseKind = "worker-unavailable";
    else {
      const parsed: unknown = JSON.parse(body);
      if (parsed && typeof parsed === "object" && "message" in parsed &&
          parsed.message === "Authentication failed") responseKind = "auth-unexpected-error";
      else if (parsed && typeof parsed === "object") responseKind = "other-json";
    }
  } catch { /* Never print the response body or the parse error. */ }
  try {
    const result = await db.query(`with subject as (
      select id from "user" where email=$1
    ) select
      (select count(*)::int from auth_lifecycle_budget) as budget_rows,
      (select coalesce(sum(count),0)::int from auth_lifecycle_budget) as budget_spends,
      (select count(*)::int from rate_limit where key like '%|/sign-up/email') as native_signup_buckets,
      (select email_registration_enabled from forum_registration_settings where id=1) as registration_open,
      (select count(*)::int from subject) as users,
      (select count(*)::int from account a join subject s on a.user_id=s.id
        where a.provider_id='credential' and a.password is not null and a.password<>'') as credentials,
      (select count(*)::int from verification v join subject s
        on v.id='vico-auth-lifecycle:v1:email-verification:' || encode(sha256(convert_to(s.id,'UTF8')),'hex')
        and v.identifier=v.id) as proofs,
      (select count(*)::int from session x join subject s on x.user_id=s.id) as sessions`, [email.toLowerCase()]);
    console.error("Connected signup diagnostic:", JSON.stringify({
      status: response.status, responseKind, ...result.rows[0],
    }));
  } catch {
    console.error("Connected signup diagnostic: database evidence unavailable", response.status, responseKind);
  }
}

/** Connected smoke fixture only: a shared local Worker ingress bucket is
 * unrelated to the forum behavior under test. Reset the disposable lifecycle
 * budget before provisioning each fixture, never during abuse/policy probes.
 * Callers must await each entire provisioning operation sequentially. */
export async function signupConnectedVerifiedSession(
  db: TestDatabase, handle: Handler, request: Request,
): Promise<Response> {
  if(process.env.CI!=="true" || !["localhost","127.0.0.1"].includes(new URL(request.url).hostname))
    throw new Error("Connected disposable CI fixture required");
  await assertDisposable(db);
  await db.query("truncate auth_lifecycle_budget");
  // Only disposable connected fixture provisioning, not rate-limit assertions.
  await db.query("delete from rate_limit where key like $1 or key like $2",
    ["%|/sign-up/email", "%|/sign-in/email"]);
  return signupVerifiedSession(db, async req => {
    const isSignup = new URL(req.url).pathname === "/api/auth/sign-up/email";
    const email = isSignup ? (await req.clone().json() as {email:string}).email : undefined;
    const response = await handle(req);
    if (email !== undefined && response.status !== 200) {
      await describeConnectedSignupFailure(db, email, response);
    }
    return response;
  }, request);
}
