import { readFile } from "node:fs/promises";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { InvalidOwnerProfileSessionCursorError, PostgresOwnerUserProfile,
  parseOwnerProfileSessionCursor } from "../../db/owner-user-profile";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname) ||
    !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA03 profile tests require disposable loopback *_test database");
}
const schema = "sa03_owner_profile_test";
const client = new Client({ connectionString: url, options: "-c search_path=" + schema });
const pool = new Pool({ connectionString: url, options: "-c search_path=" + schema });
const reader = new PostgresOwnerUserProfile(pool);

async function person(id: string, email: string, verified = false) {
  await client.query('insert into "user" (id,name,email,email_verified) values($1,$2,$3,$4)',
    [id, "Synthetic " + id, email, verified]);
}
async function method(id: string, userId: string, provider: string, password: string | null) {
  await client.query(
    "insert into account(id,user_id,account_id,provider_id,password,access_token,refresh_token,id_token)" +
    " values($1,$2,$3,$4,$5,'private-access','private-refresh','private-id-token')",
    [id,userId,"private-provider-account-"+id,provider,password],
  );
}
async function recordSession(id: string, userId: string, token: string, active: boolean,
  agent: string | null = null, ip: string | null = null, createdAt?: string) {
  await client.query(
    "insert into session(id,user_id,token,created_at,updated_at,expires_at,user_agent,ip_address)" +
    " values($1,$2,$3,coalesce($4::timestamp,now()),now()," +
    (active ? "now()+interval '1 day'" : "now()-interval '1 day'") + ",$5,$6)",
    [id,userId,token,createdAt ?? null,agent,ip],
  );
}
function query(targetId: string, viewerUserId = "synthetic-owner", currentSessionId = "browser-current",
  before?: string) {
  return { targetId, viewerUserId, currentSessionId, before };
}

beforeAll(async () => {
  await client.connect();
  await client.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  const migration = (await readFile("drizzle/0003_gorgeous_donald_blake.sql", "utf8"))
    .replaceAll('"public".', '"' + schema + '"')
    .replaceAll("--> statement-breakpoint", "");
  await client.query(migration);
});
beforeEach(async () => {
  await client.query('truncate "user",account,session,verification,rate_limit cascade');
});
afterAll(async () => {
  await pool.end();
  await client.query("drop schema if exists " + schema + " cascade");
  await client.end();
});

describe("SA03 exact-Owner readonly target profile native projection", () => {
  it("isolates one target, labels real password/Google methods and never selects secrets", async () => {
    await person("target-A", "private-a@example.test", true);
    await person("target-B", "private-b@example.test");
    await method("credential-A", "target-A", "credential", "secret-hash-a");
    await method("google-A", "target-A", "google", null);
    await method("google-B", "target-B", "google", null);
    await recordSession("active-A", "target-A", "secret-token-a", true,
      "Browser\nunsafe\u007F device", "2001:db8::42");
    await recordSession("expired-A", "target-A", "secret-token-expired", false,
      "\r\n", "203.0.113.3:443");
    await recordSession("active-B", "target-B", "secret-token-b", true);
    const result = await reader.readTarget(query("target-A"));
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      targetUserId: "target-A", email: "private-a@example.test", emailVerified: true,
      linkedMethods: ["password","google"], hasPassword: true,
      sessionCounts: { active: "1", expiredRetained: "1" },
    });
    expect(result!.sessions).toHaveLength(2);
    expect(result!.sessions.find(x => x.id === "active-A")).toMatchObject({
      status: "active", current: false, recordedIp: "2001:db8::42",
      deviceLabel: "Browserunsafe device",
    });
    expect(result!.sessions.find(x => x.id === "expired-A")).toMatchObject({
      status: "expired-retained", current: false, recordedIp: null, deviceLabel: "Unknown device",
    });
    expect(result!.sessions.some(x => x.id === "active-B")).toBe(false);
    const serialized = JSON.stringify(result);
    for (const secret of ["secret-hash-a","private-access","private-refresh","private-id-token",
      "secret-token-a","secret-token-b","private-provider-account","private-b@example.test"]) {
      expect(serialized).not.toContain(secret);
    }
    expect(Object.keys(result!).sort()).toEqual([
      "createdAt","email","emailVerified","hasPassword","linkedMethods","nextSessionsCursor",
      "observedAt","sessionCounts","sessions","targetUserId","updatedAt",
    ]);
    expect(Object.keys(result!.sessions[0]).sort()).toEqual([
      "createdAt","current","deviceLabel","expiresAt","id","recordedIp","status",
    ]);
  });

  it("marks current only for the actual same-target session and keeps successful empty distinct from missing", async () => {
    await person("synthetic-owner","owner@example.test");
    await person("no-methods","empty@example.test");
    await recordSession("browser-current","synthetic-owner","owner-secret",true);
    const own = await reader.readTarget(query("synthetic-owner"));
    expect(own!.sessions[0].current).toBe(true);
    const otherActor = await reader.readTarget(query("synthetic-owner","different-user"));
    expect(otherActor!.sessions[0].current).toBe(false);
    const empty = await reader.readTarget(query("no-methods"));
    expect(empty).toMatchObject({linkedMethods:[],hasPassword:false,
      sessionCounts:{active:"0",expiredRetained:"0"},sessions:[],nextSessionsCursor:null});
    expect(await reader.readTarget(query("unknown-target"))).toBeNull();
  });

  it("paginates >25 equal timestamps by opaque literal IDs without ever mixing targets", async () => {
    await person("用户-001", "unicode@example.test");
    await person("foreign", "foreign@example.test");
    for (let i = 0; i < 29; i++) {
      const id = "00" + String(i).padStart(2,"0");
      await recordSession(id,"用户-001","private-session-token-"+id,true,
        "Synthetic device","198.51.100.55","2026-11-01 08:00:00.123456");
    }
    await recordSession("foreign-same-time","foreign","private-foreign-token",true,
      null,null,"2026-11-01 08:00:00.123456");
    const first = await reader.readTarget(query("用户-001"));
    expect(first!.sessions).toHaveLength(25);
    expect(first!.sessions[0].id).toBe("0028");
    expect(first!.sessions[24].id).toBe("0004");
    expect(first!.nextSessionsCursor).toMatch(/^v1\./);
    const second = await reader.readTarget(query("用户-001","synthetic-owner","none",
      first!.nextSessionsCursor!));
    expect(second!.sessions.map(x => x.id)).toEqual(["0003","0002","0001","0000"]);
    expect(second!.nextSessionsCursor).toBeNull();
    expect(first!.sessions.every(x => !x.id.includes("foreign"))).toBe(true);
    expect(second!.sessions.every(x => !x.id.includes("foreign"))).toBe(true);
    expect(first!.sessionCounts.active).toBe("29");
    expect(parseOwnerProfileSessionCursor(first!.nextSessionsCursor!, "用户-001")).toMatchObject({
      targetId:"用户-001",at:"2026-11-01T08:00:00.123456Z",id:"0004",
    });
    expect(() => parseOwnerProfileSessionCursor(first!.nextSessionsCursor!,"foreign"))
      .toThrow(InvalidOwnerProfileSessionCursorError);
  });

  it("rejects malformed, cross-resource and calendar-invalid cursors before database access", async () => {
    await person("cursor-target","cursor@example.test");
    const invalid = ["v1.", "v1.abc=", "global-v1.old", "v1." +
      btoa(JSON.stringify({ v:1,resource:"profile-sessions",targetId:"cursor-target",
        at:"2026-02-30T12:00:00.000000Z",id:"abc" })).replaceAll("=",""),
      "v1." + btoa(JSON.stringify({ v:1,resource:"profile-sessions",targetId:"cursor-target",
        at:"2026-11-01T12:00:00.000000Z",id:"abc",unexpected:true })).replaceAll("=","")];
    for (const before of invalid) {
      await expect(reader.readTarget(query("cursor-target","synthetic-owner","browser-current",before)))
        .rejects.toBeInstanceOf(InvalidOwnerProfileSessionCursorError);
    }
  });
});
