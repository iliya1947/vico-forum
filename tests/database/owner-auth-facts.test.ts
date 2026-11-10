import { readdir, readFile } from "node:fs/promises";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  PostgresAuthFactWriter, AuthFactCommitUncertainError, type AuthTransitionFact,
} from "../../db/owner-auth-facts";
import { PostgresOwnerSystemHistory } from "../../db/owner-system-history";

const url = process.env.DATABASE_URL!;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA02 auth fact writer tests require disposable loopback *_test DB");
}
const schema = "owner_sa02_facts_test";
const pool = new Pool({ connectionString: url, options: "-c search_path=" + schema, max: 12 });
const client = new Client({ connectionString: url, options: "-c search_path=" + schema });
const writer = new PostgresAuthFactWriter(pool);
const ownerSystem = new PostgresOwnerSystemHistory(pool);
const operationId = "ea7d1eb0-37e6-49d7-8478-1e2d3fe8d67a";
const facts: AuthTransitionFact[] = [
  { kind: "account.created", userId: "user-1", actorUserId: null },
  { kind: "auth.methodLinked", userId: "user-1", accountId: "account-google-1",
    method: "google", linkContext: "registration" },
  { kind: "auth.sessionCreated", userId: "user-1", sessionId: "session-1" },
  { kind: "auth.sessionDeleted", userId: "user-1", sessionId: "session-1",
    reason: "revoke-one", actorUserId: "user-1" },
  { kind: "auth.passwordChanged", userId: "user-1", accountId: "account-password-1",
    operationId, actorUserId: "user-1" },
];
beforeAll(async () => {
  await client.connect();
  await client.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const file of (await readdir("drizzle")).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort()) {
    await client.query((await readFile("drizzle/" + file, "utf8"))
      .replaceAll('"public".', '"' + schema + '".'));
  }
});
afterAll(async () => {
  await pool.end();
  await client.query("drop schema if exists " + schema + " cascade");
  await client.end();
});
async function rows() {
  const result = await client.query<{
    source: string; kind: string; monitor_key: string; entity_type: string;
    entity_id: string; actor_user_id: string | null; target_user_id: string;
    correlation_id: string | null; payload: Record<string,string>; occurrence_key: string;
    position: string; occurred_at: Date; recorded_at: Date;
  }>(`select source,kind,monitor_key,entity_type,entity_id,actor_user_id,target_user_id,
      correlation_id,payload,occurrence_key,position::text,occurred_at,recorded_at
      from owner_events order by position`);
  return result.rows;
}

describe("SA02 PostgreSQL17 native append-only auth fact writer", () => {
  it("writes exactly five allowlisted native facts with only safe categorical payloads", async () => {
    for (const fact of facts) expect((await writer.append(fact)).inserted).toBe(true);
    const persisted = await rows();
    expect(persisted).toHaveLength(5);
    expect(persisted.map(row => [row.source,row.kind,row.monitor_key,row.entity_type])).toEqual([
      ["auth","account.created","accounts.users","user"],
      ["auth","auth.methodLinked","accounts.methods","account"],
      ["auth","auth.sessionCreated","accounts.sessions","session"],
      ["auth","auth.sessionDeleted","accounts.sessions","session"],
      ["auth","auth.passwordChanged","accounts.methods","account"],
    ]);
    expect(persisted[1].payload).toEqual({method:"google",linkContext:"registration"});
    expect(persisted[3].payload).toEqual({reason:"revoke-one"});
    expect(persisted[4].payload).toEqual({});
    expect(persisted[4].correlation_id).toBe(operationId);
    expect(persisted[0].actor_user_id).toBeNull();
    expect(persisted[3].actor_user_id).toBe("user-1");
    expect(persisted.map(row=>row.target_user_id)).toEqual(Array(5).fill("user-1"));
    for(const row of persisted) {
      expect(row.occurrence_key).toMatch(/^sa02:[a-f0-9]{64}$/);
      expect(row.occurred_at).toBeInstanceOf(Date);
      expect(row.recorded_at).toBeInstanceOf(Date);
    }
    expect(JSON.stringify(persisted)).not.toContain("password-hash");
  });

  it("deduplicates immutable occurrences and rejects conflicting claims rather than rewriting history", async () => {
    const before = await rows();
    for(const fact of facts) {
      const result = await writer.append(fact);
      expect(result.inserted).toBe(false);
    }
    expect(await rows()).toEqual(before);
    await expect(writer.append({...facts[1], userId:"different-user"} as AuthTransitionFact))
      .rejects.toThrow("Auth fact occurrence invariant");
    await expect(writer.append({...facts[3],reason:"sign-out"} as AuthTransitionFact))
      .rejects.toThrow("Auth fact occurrence invariant");
    expect(await rows()).toEqual(before);
  });

  it("keeps sources separate and does not copy events into the existing System journal", async () => {
    const existing = (await rows())[0];
    const system = await ownerSystem.append({
      kind:"system.requestFailed", monitorKey:"system.requests",
      occurredAt: new Date("2026-11-10T15:00:00Z"),
      occurrenceKey:existing.occurrence_key,
      payload:{component:"worker",code:"500"},
    });
    expect(system.inserted).toBe(true);
    const all=await rows();
    expect(all.filter(row=>row.occurrence_key===existing.occurrence_key)).toHaveLength(2);
    expect(all.at(-1)?.source).toBe("system");
    expect((await writer.append(facts[0])).inserted).toBe(false);
  });

  it("allows distinct password operations for one account without coalescing into attempts", async () => {
    const second = { ...facts[4],
      operationId: "231563d8-a5ee-44f3-826b-74d426a0d67f" } as AuthTransitionFact;
    expect((await writer.append(second)).inserted).toBe(true);
    expect((await writer.append(second)).inserted).toBe(false);
    const found=(await rows()).filter(row=>row.kind==="auth.passwordChanged");
    expect(found).toHaveLength(2);
    expect(new Set(found.map(row=>row.occurrence_key)).size).toBe(2);
    expect(new Set(found.map(row=>row.entity_id))).toEqual(new Set(["account-password-1"]));
  });

  it("serializes simultaneous duplicate writes at a single unique occurrence", async () => {
    const fact: AuthTransitionFact = {
      kind:"auth.sessionCreated",userId:"concurrency-actor",sessionId:"parallel-1",
    };
    const results=await Promise.all(Array.from({length:24},()=>writer.append(fact)));
    expect(results.filter(result=>result.inserted)).toHaveLength(1);
    expect(new Set(results.map(result=>result.id)).size).toBe(1);
    expect((await rows()).filter(row=>row.entity_id==="parallel-1")).toHaveLength(1);
    expect((await rows()).map(row=>BigInt(row.position)).every((v,i,a)=>i===0||v>a[i-1])).toBe(true);
  });

  it("rejects unsupported fact kinds, unknown fields, credentials and unverified operation IDs", async () => {
    const invalid: unknown[] = [
      null, {}, {kind:"security.anomaly",userId:"user-1"},
      {...facts[0],userId:"attack@example.test"},
      {...facts[0],cookie:"session_secret"},
      {...facts[1],method:"github"},
      {...facts[1],linkContext:"implicit"},
      {...facts[3],reason:"expired"},
      {...facts[4],operationId:"password-typed-in-form"},
      {...facts[4],accessToken:"secret"},
      {...facts[4],userId:""},
    ];
    for(const fact of invalid) {
      await expect(writer.append(fact as AuthTransitionFact)).rejects.toThrow();
    }
    expect((await rows()).filter(row=>row.source==="auth")).toHaveLength(7);
  });

  it("rolls back on server-side errors and never admits a phantom fact", async () => {
    await client.query("alter table owner_events add constraint sa02_block_new_auth check (source <> 'auth') not valid");
    const fact: AuthTransitionFact={kind:"account.created",userId:"rollback-actor"};
    try {
      await expect(writer.append(fact)).rejects.toThrow();
      expect((await rows()).filter(row=>row.entity_id==="rollback-actor")).toHaveLength(0);
    } finally {
      await client.query("alter table owner_events drop constraint sa02_block_new_auth");
    }
    expect((await writer.append(fact)).inserted).toBe(true);
  });

  it("bounds a concurrent System journal lock wait without allocating a new event", async () => {
    await client.query("begin");
    try {
      await client.query("select pg_advisory_xact_lock(1447641935,2)");
      await expect(writer.append({
        kind:"auth.sessionCreated",userId:"user-lock",sessionId:"lock-timed-out",
      })).rejects.toThrow();
      expect((await rows()).filter(row=>row.entity_id==="lock-timed-out")).toHaveLength(0);
    } finally {
      await client.query("rollback");
    }
    expect((await rows()).filter(row=>row.entity_id==="lock-timed-out")).toHaveLength(0);
  });

  it("surfaces uncertain applied COMMIT without an automatic duplicate or blind retry", async () => {
    let commits = 0;
    const proxy = {
      connect: async () => {
        const pg = await pool.connect();
        return {
          query: async (sql: string, parameters?: unknown[]) => {
            if(sql==="commit") {
              commits+=1;
              await pg.query("commit");
              throw new Error("ambiguous connection loss");
            }
            return pg.query(sql, parameters);
          },
          release: (discard?: boolean) => pg.release(discard),
        };
      },
    };
    const ambiguous=new PostgresAuthFactWriter(proxy as never);
    const fact: AuthTransitionFact={
      kind:"auth.sessionCreated",userId:"user-commit",sessionId:"ambiguity-1",
    };
    await expect(ambiguous.append(fact)).rejects.toBeInstanceOf(AuthFactCommitUncertainError);
    expect(commits).toBe(1);
    expect((await rows()).filter(row=>row.entity_id==="ambiguity-1")).toHaveLength(1);
    expect((await writer.append(fact)).inserted).toBe(false);
  });
});
