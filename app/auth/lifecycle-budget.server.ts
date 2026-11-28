import { AsyncLocalStorage } from "node:async_hooks";
import type { Client } from "pg";
import { normalizeAttemptIp, UNKNOWN_ATTEMPT_SOURCE, type AttemptIngressSource } from "../observability/attempt-source";
import type { AuthLifecycleTransaction } from "./lifecycle-transaction.server";

const PREFIX = "vico-auth-budget:v1:";
const encoder = new TextEncoder();

export type LifecycleBudgetIntent =
  | { kind: "signup" }
  | { kind: "mail"; purpose: "email-verification" | "password-reset"; email: string }
  | { kind: "mail"; purpose: "password-create" | "email-change"; email: string; userId: string }
  | { kind: "terminal"; purpose: "email-verification" | "password-reset" }
  | { kind: "own"; purpose: "email-change" | "unlink-account" | "password-create"; userId: string };

type Bucket = Readonly<{ key: string; max: number; windowMs: number }>;
type Admission = { identity: string; open: boolean };

export class LifecycleBudgetExceededError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("Authentication operation rate limited");
    this.name = "LifecycleBudgetExceededError";
  }
}
export class LifecycleBudgetInvariantError extends Error {
  constructor() { super("Unexpected authentication budget state"); this.name = "LifecycleBudgetInvariantError"; }
}

function canonicalEmail(value: string): string {
  if (typeof value !== "string" || value.length > 320) throw new LifecycleBudgetInvariantError();
  const email = value.trim().toLowerCase();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+$/.test(email) ||
      Array.from(email).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127))
    throw new LifecycleBudgetInvariantError();
  return email;
}
function canonicalUser(value: string): string {
  if (typeof value !== "string" || !value.length || value.length > 200 || value.trim() !== value ||
      Array.from(value).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127))
    throw new LifecycleBudgetInvariantError();
  return value;
}
function networkIdentity(ingress: AttemptIngressSource): string {
  const ip = ingress.networkQuality === "unknown" ? null : normalizeAttemptIp(ingress.networkIp);
  return ip === null ? "unknown" : "ip:" + ip;
}

/**
 * Server-only common admission for future HTTP/direct lifecycle commands.
 * Independent explicit-expiry storage; Better Auth owns its native rate_limit.
 * No native cleanup or configuration override.
 */
export class AuthLifecycleBudget {
  private readonly admission = new AsyncLocalStorage<Admission>();
  private readonly network: string;
  private readonly secret: string;
  private keyPromise?: ReturnType<typeof crypto.subtle.importKey>;

  constructor(private readonly client: Pick<Client, "query">,
    private readonly transaction: AuthLifecycleTransaction, secret: string,
    ingress: AttemptIngressSource = UNKNOWN_ATTEMPT_SOURCE) {
    transaction.assertConnection(client);
    this.secret = secret;
    this.network = networkIdentity(ingress);
  }

  private async bucket(label: string, subject: string, max: number, seconds: number): Promise<Bucket> {
    if (typeof this.secret !== "string" || this.secret.length < 32) throw new LifecycleBudgetInvariantError();
    this.keyPromise ??= crypto.subtle.importKey("raw", encoder.encode(this.secret),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", await this.keyPromise,
      encoder.encode(JSON.stringify(["vico-auth-budget", 1, label, subject])));
    const digest = Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, "0")).join("");
    return { key: PREFIX + digest, max, windowMs: seconds * 1000 };
  }

  private async policy(intent: LifecycleBudgetIntent): Promise<{ identity: string; buckets: Bucket[] }> {
    const network = this.network;
    switch (intent.kind) {
      case "signup":
        return { identity: "signup", buckets: [await this.bucket("signup-network", network, 5, 60)] };
      case "terminal":
        if (intent.purpose !== "email-verification" && intent.purpose !== "password-reset")
          throw new LifecycleBudgetInvariantError();
        return { identity: "terminal:" + intent.purpose,
          buckets: [await this.bucket("terminal-network", network, 10, 600)] };
      case "own": {
        if (intent.purpose !== "email-change" && intent.purpose !== "unlink-account" &&
          intent.purpose !== "password-create") throw new LifecycleBudgetInvariantError();
        const user = await this.bucket("own-user", canonicalUser(intent.userId), 5, 60);
        return { identity: "own:" + intent.purpose + ":" + user.key, buckets: [user] };
      }
      case "mail": {
        if (!["email-verification","password-reset","password-create","email-change"].includes(intent.purpose))
          throw new LifecycleBudgetInvariantError();
        const target = await this.bucket("mail-target:" + intent.purpose, canonicalEmail(intent.email), 3, 600);
        const buckets = [await this.bucket("mail-network", network, 10, 600)];
        // Spend the network budget first, before allocating a new target key.
        buckets.push(target);
        if (intent.purpose === "password-create" || intent.purpose === "email-change") {
          buckets.push(await this.bucket("mail-own-user", canonicalUser(intent.userId), 5, 600));
        }
        return { identity: "mail:" + intent.purpose + ":" + buckets.map(b => b.key).join(":"), buckets };
      }
      default: throw new LifecycleBudgetInvariantError();
    }
  }

  private async spend(bucket: Bucket): Promise<number> {
    // The conflicting row is locked by PostgreSQL before the UPDATE predicate
    // is evaluated. Use the DB clock after lock acquisition, not a stale
    // pre-lock timestamp, for reset and admission.
    const result = await this.client.query(`
      insert into auth_lifecycle_budget (key,count,expires_at)
      values ($1,1,clock_timestamp()+$2::int*interval '1 second')
      on conflict (key) do update
        set (count,expires_at) = (
          select case when auth_lifecycle_budget.expires_at <= t.now_at
              then 1 else auth_lifecycle_budget.count+1 end,
            case when auth_lifecycle_budget.expires_at <= t.now_at
              then t.now_at+$2::int*interval '1 second' else auth_lifecycle_budget.expires_at end
          from (select clock_timestamp() as now_at) as t
        )
      where auth_lifecycle_budget.expires_at <= clock_timestamp()
        or auth_lifecycle_budget.count < $3::int
      returning key
    `, [bucket.key, bucket.windowMs / 1000, bucket.max]);
    if (result.rowCount === 1) return 0;
    const row = (await this.client.query<{ retry: number }>(`
      select greatest(1,least($2::int,
        ceil(extract(epoch from (expires_at-clock_timestamp())))::int)) as retry
      from auth_lifecycle_budget where key=$1
    `, [bucket.key, bucket.windowMs / 1000])).rows[0];
    if (!row || !Number.isSafeInteger(row.retry) || row.retry < 1) throw new LifecycleBudgetInvariantError();
    return row.retry;
  }

  private async prune(): Promise<void> {
    // A stable DB cutoff permits the expiry index to bound the scan as well
    // as the number of locked/deleted rows. A later expiry waits for another admission.
    await this.client.query(`
      delete from auth_lifecycle_budget as budget
      using (
        select key from auth_lifecycle_budget
        where expires_at <= statement_timestamp()
        order by expires_at,key limit 64 for update skip locked
      ) as expired
      where budget.key=expired.key and budget.expires_at <= statement_timestamp()
    `);
  }

  /** Keep the receipt only inside this server-owned logical operation. An
   * identical nested call shares the admission; a mismatched or escaped
   * receipt cannot authorize another operation. No caller-supplied bypass.
   * Admission commits BEFORE work, so failed domain mutations still count.
   */
  async run<T>(intent: LifecycleBudgetIntent, work: () => Promise<T>): Promise<T> {
    const { identity, buckets } = await this.policy(intent);
    const previous = this.admission.getStore();
    if (previous) {
      if (!previous.open || previous.identity !== identity) throw new LifecycleBudgetInvariantError();
      return work();
    }
    if (this.transaction.ownsCurrentWork()) throw new LifecycleBudgetInvariantError();
    const retry = await this.transaction.run(async () => {
      let denied = 0;
      for (const bucket of buckets) {
        denied = await this.spend(bucket);
        if (denied) break;
      }
      await this.prune();
      return denied;
    });
    if (retry) throw new LifecycleBudgetExceededError(retry);
    const receipt: Admission = { identity, open: true };
    return this.admission.run(receipt, async () => {
      try { return await work(); }
      finally { receipt.open = false; }
    });
  }
}
