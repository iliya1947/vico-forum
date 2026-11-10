import type { Pool } from "pg";
import { SA02_FACT_MONITORS, type Sa02FactKind } from "./owner-sa02-catalog";

/**
 * SA02 append-only facts. Callers must first prove a persisted Better Auth
 * transition. No browser-provided operation, payload, kind or timestamp.
 */
type Actor = { readonly actorUserId?: string | null };
export type AuthTransitionFact =
  | ({ readonly kind: "account.created"; readonly userId: string } & Actor)
  | ({ readonly kind: "auth.methodLinked"; readonly userId: string;
      readonly accountId: string; readonly method: "password" | "google";
      readonly linkContext: "registration" | "explicit-link" | "unknown" } & Actor)
  | ({ readonly kind: "auth.sessionCreated"; readonly userId: string;
      readonly sessionId: string } & Actor)
  | ({ readonly kind: "auth.sessionDeleted"; readonly userId: string;
      readonly sessionId: string;
      readonly reason: "revoke-one" | "revoke-others" | "revoke-all" | "sign-out" } & Actor)
  | ({ readonly kind: "auth.passwordChanged"; readonly userId: string;
      readonly accountId: string; readonly operationId: string } & Actor);

/** Upper bound per trusted Worker request, including bulk session revocation. */
export const MAX_AUTH_FACTS_PER_REQUEST = 32;

export interface AuthFactWriter {
  append(fact: AuthTransitionFact, occurredAt?: Date): Promise<{ id: string; inserted: boolean }>;
}
export class AuthFactCommitUncertainError extends Error {
  constructor(options?: ErrorOptions) {
    super("Auth fact commit outcome unknown", options);
    this.name = "AuthFactCommitUncertainError";
  }
}
const ID = /^[A-Za-z0-9._:-]{1,200}$/;
const OPERATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const FIELDS: Record<Sa02FactKind, readonly string[]> = {
  "account.created": ["kind","userId","actorUserId"],
  "auth.methodLinked": ["kind","userId","accountId","method","linkContext","actorUserId"],
  "auth.sessionCreated": ["kind","userId","sessionId","actorUserId"],
  "auth.sessionDeleted": ["kind","userId","sessionId","reason","actorUserId"],
  "auth.passwordChanged": ["kind","userId","accountId","operationId","actorUserId"],
};
type Encoded = { kind: Sa02FactKind; monitor: string; entityType: string;
  entityId: string; target: string; actor: string | null;
  correlation: string | null; payload: string; identity: string[] };
type Existing = { id: string; matches: boolean };

function checkedId(value: unknown): string {
  if (typeof value !== "string" || !ID.test(value)) throw new Error("Invalid auth fact ID");
  return value;
}
function pick<T extends string>(value: unknown, allowed: readonly T[]): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error("Invalid auth fact categorical value");
  }
  return value as T;
}
function encode(fact: AuthTransitionFact): Encoded {
  if (!fact || typeof fact !== "object" || Array.isArray(fact)) throw new Error("Invalid auth fact");
  const kind = pick(fact.kind, Object.keys(SA02_FACT_MONITORS) as Sa02FactKind[]);
  if (Object.keys(fact).some(name => !FIELDS[kind].includes(name))) {
    throw new Error("Unexpected auth fact field");
  }
  const target = checkedId(fact.userId);
  const actor = fact.actorUserId == null ? null : checkedId(fact.actorUserId);
  let entityType: string, entityId: string, correlation: string | null = null;
  let payload: Record<string, string> = {}, identity: string[];
  switch (kind) {
    case "account.created":
      entityType = "user"; entityId = target; identity = [kind,entityId]; break;
    case "auth.methodLinked": {
      const f = fact as Extract<AuthTransitionFact,{kind:"auth.methodLinked"}>;
      entityType = "account"; entityId = checkedId(f.accountId);
      payload = { method: pick(f.method, ["password","google"]),
        linkContext: pick(f.linkContext, ["registration","explicit-link","unknown"]) };
      identity = [kind,entityId]; break;
    }
    case "auth.sessionCreated": {
      const f = fact as Extract<AuthTransitionFact,{kind:"auth.sessionCreated"}>;
      entityType = "session"; entityId = checkedId(f.sessionId);
      identity = [kind,entityId]; break;
    }
    case "auth.sessionDeleted": {
      const f = fact as Extract<AuthTransitionFact,{kind:"auth.sessionDeleted"}>;
      entityType = "session"; entityId = checkedId(f.sessionId);
      payload = { reason: pick(f.reason, ["revoke-one","revoke-others","revoke-all","sign-out"]) };
      identity = [kind,entityId]; break;
    }
    case "auth.passwordChanged": {
      const f = fact as Extract<AuthTransitionFact,{kind:"auth.passwordChanged"}>;
      entityType = "account"; entityId = checkedId(f.accountId);
      if (typeof f.operationId !== "string" || !OPERATION_ID.test(f.operationId)) {
        throw new Error("Invalid auth fact operation ID");
      }
      correlation = f.operationId;
      identity = [kind,correlation,entityId]; break;
    }
  }
  return { kind, monitor: SA02_FACT_MONITORS[kind][0],
    entityType,entityId,target,actor,correlation,payload: JSON.stringify(payload),identity };
}
async function occurrenceKey(parts: readonly string[]): Promise<string> {
  const hashed = await crypto.subtle.digest("SHA-256",
    new TextEncoder().encode(JSON.stringify(parts)));
  return "sa02:" + Array.from(new Uint8Array(hashed),
    b => b.toString(16).padStart(2,"0")).join("");
}

/** One short transaction; ambiguous COMMIT is never blindly retried. */
export class PostgresAuthFactWriter implements AuthFactWriter {
  constructor(private readonly pool: Pick<Pool,"connect">) {}
  async append(fact: AuthTransitionFact, occurredAt: Date = new Date()): Promise<{id:string;inserted:boolean}> {
    if (!(occurredAt instanceof Date) || !Number.isFinite(occurredAt.getTime()))
      throw new Error("Invalid trusted auth fact occurrence time");
    const f = encode(fact);
    const key = await occurrenceKey(f.identity);
    const client = await this.pool.connect();
    let begun=false, committing=false, discard=false;
    try {
      await client.query("begin"); begun=true;
      await client.query("set local transaction_timeout='5000ms'; set local statement_timeout='2000ms'; set local lock_timeout='750ms'");
      // Same append-order lock as the existing System journal writer.
      await client.query("select pg_advisory_xact_lock(1447641935,2)");
      const saved = await client.query<{id:string}>(`
        insert into owner_events
          (id,occurred_at,source,occurrence_key,kind,monitor_key,
           entity_type,entity_id,actor_user_id,target_user_id,correlation_id,payload)
        values ($1,$11::timestamptz,'auth',$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
        on conflict (source,occurrence_key) do nothing returning id`,
        [crypto.randomUUID(),key,f.kind,f.monitor,f.entityType,f.entityId,
         f.actor,f.target,f.correlation,f.payload,occurredAt]);
      let result: {id:string;inserted:boolean};
      if (saved.rows[0]) result={id:saved.rows[0].id,inserted:true};
      else {
        const prior = await client.query<Existing>(`
          select id,
            (kind=$2 and monitor_key=$3 and entity_type=$4 and entity_id=$5
             and actor_user_id is not distinct from $6::text
             and target_user_id=$7 and correlation_id is not distinct from $8::text
             and payload=$9::jsonb) as matches
          from owner_events where source='auth' and occurrence_key=$1`,
          [key,f.kind,f.monitor,f.entityType,f.entityId,f.actor,f.target,f.correlation,f.payload]);
        if (!prior.rows[0]?.matches) throw new Error("Auth fact occurrence invariant failed");
        result={id:prior.rows[0].id,inserted:false};
      }
      committing=true;
      await client.query("commit");
      committing=false;
      return result;
    } catch(error) {
      if(committing) {
        discard=true;
        throw new AuthFactCommitUncertainError({cause:error});
      }
      if(begun) {
        try { await client.query("rollback"); }
        catch { discard=true; }
      }
      throw error;
    } finally {
      client.release(discard);
    }
  }
}
