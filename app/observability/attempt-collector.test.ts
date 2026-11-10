import { describe, expect, it, vi } from "vitest";
import type { AuthRuntime, AccountSecurityRuntime } from "../auth/request-context";
import { AccountSecurityError } from "../auth/request-context";
import type { AttemptTelemetryInput, AttemptTelemetryWriter } from "../../db/owner-attempt-telemetry";
import { RequestAttemptCollector, withAttemptObservation } from "./attempt-collector.server";
import { syntheticAttemptIngressSource } from "./attempt-source";

function fixture() {
  const records: AttemptTelemetryInput[] = [];
  const gaps: Array<{ surface: "auth" | "access"; count?: number }> = [];
  const close = vi.fn(async () => undefined);
  const writer: AttemptTelemetryWriter & { close(): Promise<void> } = {
    async record(input) {
      records.push(input);
      return { kind: "unknown", slot: "unknown.auth", epoch: "2026-11-10T00:00:00.000Z", count: "1", saturated: false };
    },
    async recordGap(input) {
      gaps.push(input);
      return { kind: "gap", slot: "gap." + input.surface, epoch: "2026-11-10T00:00:00.000Z", count: "1", saturated: false };
    },
    close,
  };
  const make = vi.fn(() => writer);
  const collector = new RequestAttemptCollector(syntheticAttemptIngressSource("2001:db8::9"), make);
  return { collector, records, gaps, close, make, writer };
}
const headers = new Headers();
const identity = { userId: "forged-expected", sessionId: "session" };

describe("SA02 request-local collector and canonical endpoint instrumentation", () => {
  it("observes only known 4xx/5xx real auth operations, never successful or session lookups", async () => {
    const f = fixture();
    const runtime: AuthRuntime = {
      getSession: async () => ({ session: null, headers: new Headers() }),
      handle: async request => new Response(null, {
        status: new URL(request.url).pathname.includes("sign-in") ? 429 : 302,
      }),
    };
    const observed = withAttemptObservation(runtime, f.collector);
    const post = (path: string) => new Request("https://forum.test/api/auth/" + path, { method: "POST" });
    expect((await observed.handle(post("sign-in/email"))).status).toBe(429);
    expect((await observed.handle(post("callback/google"))).status).toBe(302);
    expect((await observed.handle(new Request("https://forum.test/api/auth/get-session"))).status).toBe(302);
    await f.collector.flush();
    expect(f.records).toHaveLength(1);
    expect(f.records[0]).toMatchObject({
      operation: "sign-in", surface: "auth", outcome: "rate-limited",
      httpStatus: 429, actorUserId: null, networkIp: "2001:db8::9",
    });
    expect(f.make).toHaveBeenCalledOnce();
    expect(f.close).toHaveBeenCalledOnce();
  });

  it("records canonical registration denial once, including OAuth redirect or translated signup 403", async () => {
    const f = fixture();
    f.collector.recordRegistrationDenied();
    f.collector.recordHttpFailure("sign-up", 403);
    f.collector.recordRegistrationDenied();
    await f.collector.flush();
    expect(f.records).toHaveLength(1);
    expect(f.records[0]).toMatchObject({
      surface: "auth", operation: "registration-admission",
      outcome: "denied", directCode: "forbidden", httpStatus: undefined,
    });
  });

  it("trusts only resolved actor, not expected identity passed into direct security mutation", async () => {
    const f = fixture();
    f.collector.setResolvedActor("resolved-user");
    const deny = new AccountSecurityError("invalid-password");
    const security: AccountSecurityRuntime = {
      read: async () => ({ hasPassword: false, linkedMethods: [], sessionAccess: "ready", sessions: [] }),
      changePassword: async () => { throw deny; },
      revokeOneOther: async () => undefined,
      revokeAllOthers: async () => undefined,
    };
    const observed = withAttemptObservation({
      getSession: async () => ({ session: null, headers: new Headers() }),
      handle: async () => new Response(null, { status: 200 }),
      security,
    }, f.collector);
    await expect(observed.security!.changePassword(headers, identity, "old", "new"))
      .rejects.toBe(deny);
    await observed.security!.revokeOneOther(headers, identity, "other-session");
    await f.collector.flush();
    expect(f.records).toHaveLength(1);
    expect(f.records[0]).toMatchObject({
      actorUserId: "resolved-user", operation: "password-change", httpStatus: 400,
      outcome: "denied",
    });
  });

  it("preserves real responses and thrown errors while recording only a bounded gap on unexpected failures", async () => {
    const f = fixture();
    const problem = new TypeError("private database details");
    const runtime: AuthRuntime = {
      getSession: async () => ({ session: null, headers: new Headers() }),
      handle: async () => { throw problem; },
    };
    const observed = withAttemptObservation(runtime, f.collector);
    await expect(observed.handle(new Request("https://forum.test/api/auth/sign-up/email",
      { method: "POST" }))).rejects.toBe(problem);
    await f.collector.flush();
    expect(f.records).toHaveLength(0);
    expect(f.gaps).toEqual([{ surface: "auth", count: 1, occurredAt: expect.any(Date) }]);
  });

  it("coalesces repeated Owner guard invocations within a request and never infers guest actor", async () => {
    const f = fixture();
    f.collector.recordOwnerGuardDenied(401);
    f.collector.recordOwnerGuardDenied(403);
    await f.collector.flush();
    expect(f.records).toHaveLength(1);
    expect(f.records[0]).toMatchObject({ surface: "access", operation: "owner-guard", httpStatus: 401 });
  });

  it("caps memory at 4 records and uses finite, fixed gaps rather than per-request durable rows", async () => {
    const f = fixture();
    for (let count = 0; count < 50; count += 1) f.collector.recordHttpFailure("sign-in", 401);
    await f.collector.flush();
    expect(f.records).toHaveLength(4);
    expect(f.gaps).toEqual([{ surface: "auth", count: 46, occurredAt: expect.any(Date) }]);
    await f.collector.flush();
    expect(f.make).toHaveBeenCalledOnce();
    expect(f.close).toHaveBeenCalledOnce();
  });

  it("survives a failing telemetry backend without affecting the canonical outcome", async () => {
    const f = fixture();
    f.writer.record = vi.fn(async () => { throw new Error("writer down"); });
    f.writer.recordGap = vi.fn(async () => { throw new Error("gap down"); });
    f.writer.close = vi.fn(async () => { throw new Error("close down"); });
    const response = new Response("auth rejected", { status: 401 });
    f.collector.recordHttpFailure("sign-in", response.status);
    await expect(f.collector.flush()).resolves.toBeUndefined();
    expect(response.status).toBe(401);
    expect(await response.text()).toBe("auth rejected");
    expect(f.writer.recordGap).toHaveBeenCalledOnce();
  });
});
