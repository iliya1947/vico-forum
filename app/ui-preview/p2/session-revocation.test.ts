import { describe, expect, it } from "vitest";
import {
  AccountSecurityError, type AuthSession, authRuntimeForRequest, authSessionForRequest,
} from "../../auth/request-context";
import { action as accountAction, loader as accountLoader } from "../../routes/settings-account";
import { createP2RawBaseline } from "./raw-baseline";
import { createP2AccountSecurityRuntime } from "./account-security";
import { createP2AuthSessionFlow } from "./session-context";

const origin = "https://vico.test";
const referenceTime = new Date("2026-11-24T10:00:00Z");
const baseline = () => createP2RawBaseline(referenceTime);
type Seed = ReturnType<typeof baseline>;
type RawSession = Seed["domains"]["sessions"][number];
type Flow = ReturnType<typeof createP2AuthSessionFlow>;

function addOtherSessions(seed: Seed) {
  // Controlled test fixture insertion AFTER active actor resolution; the
  // existing B2 selector must still refuse ambiguous initial raw sessions.
  const memberId = seed.actorIds.member;
  const current = seed.referenceTime.getTime();
  const other: RawSession[] = [
    { id: "member-other-a", userId: memberId,
      issuedAt: new Date(current - 3 * 60 * 60_000), expiresAt: new Date(current + 60 * 60_000) },
    { id: "member-other-b", userId: memberId,
      issuedAt: new Date(current - 2 * 60 * 60_000), expiresAt: new Date(current + 2 * 60 * 60_000) },
  ];
  (seed.domains.sessions as RawSession[]).push(...other);
  return other;
}

function flowWithOtherSessions() {
  const seed = baseline();
  const flow = createP2AuthSessionFlow(seed, "member");
  const other = addOtherSessions(seed);
  return { seed, flow, other };
}

async function current(flow: Flow) {
  const session = (await flow.runtime.getSession(new Headers())).session!;
  return { userId: session.user.id, sessionId: session.session.id };
}

function settingsRequest(
  intent: "revoke-one" | "revoke-others", identity: { userId: string; sessionId: string },
  sessionId?: string, extra: [string, string][] = [], requestOrigin: string | null = origin,
) {
  const form = new URLSearchParams([
    ["intent", intent], ["expectedUserId", identity.userId],
    ["expectedSessionId", identity.sessionId],
    ...(sessionId === undefined ? [] : [["sessionId", sessionId]]),
    ...extra,
  ]);
  return new Request(origin + "/en/settings/account", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded",
      ...(requestOrigin === null ? {} : { Origin: requestOrigin }) },
    body: form.toString(),
  });
}

async function routeAction(flow: Flow, request: Request) {
  const { context } = await flow.createRequestContext(request);
  return accountAction({ request, context, params: { locale: "en" } });
}

async function snapshot(flow: Flow) {
  const request = new Request(origin + "/en/settings/account");
  const { context } = await flow.createRequestContext(request);
  return accountLoader({ request, context, params: { locale: "en" } });
}

describe("P2-B7b2 own other-session revocation through original Settings routes", () => {
  it("revokes one owned other session, preserves current and remaining device, and revalidates the original loader", async () => {
    const { seed, flow, other } = flowWithOtherSessions();
    const own = await current(flow);
    const before = await snapshot(flow);
    expect(before.data.sessions.map((session) => session.id).sort()).toEqual([
      "member-other-a", "member-other-b", "preview-session-member",
    ]);
    expect(before.data.sessions.filter((session) => session.current).map((session) => session.id))
      .toEqual(["preview-session-member"]);
    const response = await routeAction(flow, settingsRequest("revoke-one", own, other[0]!.id));
    expect(response.data).toEqual({ saved: "revoke-one" });
    expect(response.init?.headers).toMatchObject({ "Cache-Control": "private, no-store" });
    expect(JSON.stringify(response.data)).not.toContain("p2-internal-only");
    const after = await snapshot(flow);
    expect(after.data.sessions.map((session) => session.id).sort()).toEqual([
      "member-other-b", "preview-session-member",
    ]);
    expect(after.data.sessions.find((session) => session.current)?.id).toBe(own.sessionId);
    expect(await current(flow)).toEqual(own);
    expect(seed.domains.sessions.some((session) => session.id === other[0]!.id)).toBe(true);
    expect((await flow.runtime.getSession(new Headers())).session?.user.id).toBe(seed.actorIds.member);
  });

  it("rejects repeated revoked target and leaves other sessions intact", async () => {
    const { flow } = flowWithOtherSessions();
    const own = await current(flow);
    expect((await routeAction(flow, settingsRequest("revoke-one", own, "member-other-a"))).data)
      .toEqual({ saved: "revoke-one" });
    const repeated = await routeAction(flow, settingsRequest("revoke-one", own, "member-other-a"));
    expect(repeated.init?.status).toBe(409);
    expect(repeated.data).toEqual({ error: "session-not-found" });
    expect((await snapshot(flow)).data.sessions.map((session) => session.id)).toContain("member-other-b");
    expect(await current(flow)).toEqual(own);
  });

  it("revokes all other owned sessions, never the current session or another user's records", async () => {
    const { seed, flow } = flowWithOtherSessions();
    const own = await current(flow);
    const response = await routeAction(flow, settingsRequest("revoke-others", own));
    expect(response.data).toEqual({ saved: "revoke-others" });
    expect((await snapshot(flow)).data.sessions.map((session) => [session.id, session.current]))
      .toEqual([["preview-session-member", true]]);
    expect(await current(flow)).toEqual(own);
    expect(seed.domains.sessions.some((session) => session.id === "preview-session-owner")).toBe(true);
    expect(seed.domains.sessions.some((session) => session.id === "preview-session-moderator")).toBe(true);
    expect((await routeAction(flow, settingsRequest("revoke-others", own))).data)
      .toEqual({ saved: "revoke-others" });
  });

  it("explicitly refuses revocation of the current session without removing any other", async () => {
    const { flow } = flowWithOtherSessions();
    const own = await current(flow);
    const response = await routeAction(flow, settingsRequest("revoke-one", own, own.sessionId));
    expect(response.init?.status).toBe(409);
    expect(response.data).toEqual({ error: "current-session" });
    expect((await snapshot(flow)).data.sessions).toHaveLength(3);
    expect(await current(flow)).toEqual(own);
  });

  it("refuses foreign Admin, moderator and Owner session targets without disclosing the target account", async () => {
    const { seed, flow } = flowWithOtherSessions();
    const own = await current(flow);
    for (const id of ["preview-session-owner", "preview-session-admin", "preview-session-moderator"]) {
      const response = await routeAction(flow, settingsRequest("revoke-one", own, id));
      expect(response.init?.status).toBe(409);
      expect(response.data).toEqual({ error: "session-not-found" });
      expect(JSON.stringify(response.data)).not.toContain(id);
    }
    expect((await snapshot(flow)).data.sessions).toHaveLength(3);
    expect(seed.ownerUserId).not.toBe(seed.actorIds.member);
  });

  it("refuses expired, future and missing other targets without marking them revoked", async () => {
    const { seed, flow } = flowWithOtherSessions();
    const own = await current(flow);
    const reference = seed.referenceTime.getTime();
    const expired: RawSession = {
      id: "member-expired", userId: own.userId,
      issuedAt: new Date(reference - 10_000), expiresAt: new Date(reference - 1),
    };
    const future: RawSession = {
      id: "member-future", userId: own.userId,
      issuedAt: new Date(reference + 1), expiresAt: new Date(reference + 100_000),
    };
    (seed.domains.sessions as RawSession[]).push(expired, future);
    for (const id of [expired.id, future.id, "member-missing"]) {
      const response = await routeAction(flow, settingsRequest("revoke-one", own, id));
      expect(response.init?.status).toBe(409);
      expect(response.data).toEqual({ error: "session-not-found" });
    }
    const after = await snapshot(flow);
    expect(after.data.sessions.map((session) => session.id).sort()).toEqual([
      "member-other-a", "member-other-b", "preview-session-member",
    ]);
  });

  it("refuses both revocation commands from an otherwise authenticated, not-fresh session", async () => {
    const seed = baseline();
    const changed = {
      ...seed,
      domains: { ...seed.domains,
        sessions: seed.domains.sessions.map((session) => session.id === "preview-session-member"
          ? { ...session, issuedAt: new Date(seed.referenceTime.getTime() - 24 * 60 * 60_000) }
          : session),
      },
    };
    const flow = createP2AuthSessionFlow(changed, "member");
    addOtherSessions(changed);
    const own = await current(flow);
    expect((await snapshot(flow)).data).toMatchObject({
      sessionAccess: "not-fresh", sessions: [], linkedMethods: ["password"],
    });
    const one = await routeAction(flow, settingsRequest("revoke-one", own, "member-other-a"));
    const all = await routeAction(flow, settingsRequest("revoke-others", own));
    for (const result of [one, all]) {
      expect(result.init?.status).toBe(403);
      expect(result.data).toEqual({ error: "not-fresh" });
    }
    const selected = (await flow.runtime.getSession(new Headers())).session!;
    const fresh = createP2AccountSecurityRuntime(changed, () => ({
      ...selected, session: {
        ...selected.session,
        createdAt: new Date(changed.referenceTime.getTime() - 60_000),
      },
    }), () => undefined, undefined, new Set());
    expect((await fresh.read(new Headers(), own)).sessions).toHaveLength(3);
  });

  it("rejects Guest and inactive actors independently at the unchanged original Settings action", async () => {
    for (const actor of ["guest", "inactive"] as const) {
      const flow = createP2AuthSessionFlow(baseline(), actor);
      const request = settingsRequest("revoke-others", {
        userId: "p0-preview-user", sessionId: "preview-session-member",
      });
      await expect(routeAction(flow, request)).rejects.toMatchObject({ status: 401 });
    }
  });

  it("rejects stale expected user and session values without touching existing devices", async () => {
    const { seed, flow } = flowWithOtherSessions();
    const own = await current(flow);
    for (const identity of [
      { userId: seed.ownerUserId, sessionId: own.sessionId },
      { userId: own.userId, sessionId: "preview-session-owner" },
      { userId: seed.ownerUserId, sessionId: "preview-session-owner" },
    ]) {
      const response = await routeAction(flow, settingsRequest("revoke-others", identity));
      expect(response.init?.status).toBe(409);
      expect(response.data).toEqual({ error: "account-changed" });
    }
    expect((await snapshot(flow)).data.sessions).toHaveLength(3);
  });

  it("requires same Origin and exact allowlisted fields for both independent Settings intents", async () => {
    const { flow } = flowWithOtherSessions();
    const own = await current(flow);
    for (const intent of ["revoke-one", "revoke-others"] as const) {
      for (const originValue of ["https://evil.test", "null"]) {
        const denied = await routeAction(flow, settingsRequest(
          intent, own, intent === "revoke-one" ? "member-other-a" : undefined, [], originValue,
        ));
        expect(denied.init?.status).toBe(403);
        expect(denied.data).toEqual({ error: "origin" });
      }
      const extra = await routeAction(flow, settingsRequest(intent, own,
        intent === "revoke-one" ? "member-other-a" : undefined, [["userId", "preview-owner"]]));
      expect(extra.init?.status).toBe(400);
      expect(extra.data).toEqual({ error: "invalid" });
    }
    for (const request of [
      settingsRequest("revoke-one", own),
      settingsRequest("revoke-others", own, "member-other-a"),
      settingsRequest("revoke-one", own, "member-other-a", [["sessionId", "member-other-b"]]),
    ]) {
      const response = await routeAction(flow, request);
      expect(response.init?.status).toBe(400);
      expect(response.data).toEqual({ error: "invalid" });
    }
    expect((await snapshot(flow)).data.sessions).toHaveLength(3);
  });

  it("rejects forged identity and session claims on direct typed capability calls", async () => {
    const { seed, flow } = flowWithOtherSessions();
    const own = await current(flow);
    const headers = new Headers({
      Cookie: "better-auth.session_token=preview-session-owner",
      "X-Preview-Actor": "owner", Origin: origin,
    });
    const security = flow.runtime.security!;
    await expect(security.revokeOneOther(headers,
      { userId: seed.ownerUserId, sessionId: own.sessionId }, "member-other-a"))
      .rejects.toMatchObject({ code: "account-changed" });
    await expect(security.revokeAllOthers(headers,
      { userId: own.userId, sessionId: "preview-session-owner" }))
      .rejects.toMatchObject({ code: "account-changed" });
    await expect(security.revokeOneOther(headers, own, own.sessionId))
      .rejects.toMatchObject({ code: "current-session" });
    expect((await snapshot(flow)).data.sessions).toHaveLength(3);
  });

  it("tracks revoked state only within this preview controller, even with shared raw records", async () => {
    const seed = baseline();
    const first = createP2AuthSessionFlow(seed, "member");
    const second = createP2AuthSessionFlow(seed, "member");
    addOtherSessions(seed);
    const own = await current(first);
    expect((await routeAction(first, settingsRequest("revoke-one", own, "member-other-a"))).data)
      .toEqual({ saved: "revoke-one" });
    expect((await snapshot(first)).data.sessions.map((session) => session.id))
      .not.toContain("member-other-a");
    expect((await snapshot(second)).data.sessions.map((session) => session.id))
      .toContain("member-other-a");
    expect(seed.domains.sessions.some((session) => session.id === "member-other-a")).toBe(true);
  });

  it("refuses a revoked session when later selected by the same typed runtime", async () => {
    const seed = baseline();
    const selected = (await createP2AuthSessionFlow(seed, "member").runtime
      .getSession(new Headers())).session!;
    const [other] = addOtherSessions(seed);
    const revoked = new Set<string>();
    let active: AuthSession = selected;
    const security = createP2AccountSecurityRuntime(seed, () => active, () => undefined, undefined, revoked);
    const originalIdentity = { userId: selected.user.id, sessionId: selected.session.id };
    await security.revokeOneOther(new Headers(), originalIdentity, other!.id);
    active = {
      user: selected.user, session: {
        ...selected.session, id: other!.id,
        token: "p2-internal-only:" + other!.id,
        createdAt: new Date(other!.issuedAt), expiresAt: new Date(other!.expiresAt),
      },
    };
    await expect(security.read(new Headers(), { userId: active.user.id, sessionId: active.session.id }))
      .rejects.toBeInstanceOf(AccountSecurityError);
    await expect(security.revokeAllOthers(new Headers(),
      { userId: active.user.id, sessionId: active.session.id }))
      .rejects.toMatchObject({ code: "unauthenticated" });
    active = selected;
    expect((await security.read(new Headers(), originalIdentity)).sessions.map((session) => session.id))
      .not.toContain(other!.id);
  });

  it("keeps the active session authenticated after revoke-all and allows ordinary sign-out", async () => {
    const { flow } = flowWithOtherSessions();
    const own = await current(flow);
    expect((await routeAction(flow, settingsRequest("revoke-others", own))).data)
      .toEqual({ saved: "revoke-others" });
    const request = new Request(origin + "/en/settings/account");
    const { context } = await flow.createRequestContext(request);
    expect(authSessionForRequest(context)?.session.id).toBe(own.sessionId);
    expect(authRuntimeForRequest(context).security).toBeDefined();
    expect((await snapshot(flow)).data.sessions.map((session) => session.id))
      .toEqual(["preview-session-member"]);
    const signout = await flow.runtime.handle(new Request(origin + "/api/auth/sign-out", {
      method: "POST", headers: { Origin: origin },
    }));
    expect(signout.status).toBe(200);
    await expect(snapshot(flow)).rejects.toMatchObject({ status: 401 });
  });

  it("handles empty other-session list as an idempotent revoke-all success without inventing records", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "member");
    const own = await current(flow);
    const before = seed.domains.sessions.length;
    expect((await routeAction(flow, settingsRequest("revoke-others", own))).data)
      .toEqual({ saved: "revoke-others" });
    expect((await snapshot(flow)).data.sessions.map((session) => session.id))
      .toEqual(["preview-session-member"]);
    expect(seed.domains.sessions).toHaveLength(before);
  });
});
