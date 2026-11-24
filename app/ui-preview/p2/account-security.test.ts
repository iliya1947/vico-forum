import { describe, expect, it } from "vitest";
import {
  AccountSecurityError, authRuntimeForRequest, authSessionForRequest,
  type AccountSecuritySnapshot, type AuthSession,
} from "../../auth/request-context";
import { authorizationOwnerContext } from "../../authorization/request-context";
import { loader as settingsAccountLoader } from "../../routes/settings-account";
import { createP2RawBaseline } from "./raw-baseline";
import { createP2AccountSecurityRuntime, P2AccountSecurityWriteNotConfiguredError } from "./account-security";
import { createP2AuthSessionFlow } from "./session-context";

const baseURL = "https://vico.test";
const baseline = () => createP2RawBaseline(new Date("2026-11-24T10:00:00.000Z"));
const page = (headers?: HeadersInit) => new Request(baseURL + "/en/settings/account", { headers });
const accountIdentity = (session: AuthSession) => ({
  userId: session.user.id, sessionId: session.session.id,
});
type Flow = ReturnType<typeof createP2AuthSessionFlow>;
async function accountPage(flow: Flow, request = page()) {
  const { context } = await flow.createRequestContext(request);
  return settingsAccountLoader({ request, params: { locale: "en" }, context });
}

describe("P2-B7a typed AccountSecurity.read via original settings-account loader", () => {
  it("returns private snapshot for member, exact linked methods and current session marker", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "member");
    const request = page();
    const { context } = await flow.createRequestContext(request);
    const result = await settingsAccountLoader({ request, params: { locale: "en" }, context });
    expect(result.init?.headers).toMatchObject({ "Cache-Control": "private, no-store" });
    expect(result.data).toMatchObject({
      locale: "en", accountId: seed.actorIds.member, sessionId: "preview-session-member",
      canViewForum: false, linkedMethods: ["password"], hasPassword: true, sessionAccess: "ready",
      sessions: [{
        id: "preview-session-member", current: true, deviceLabel: "Unknown device",
        createdAt: seed.domains.sessions[0]!.issuedAt.toISOString(),
        expiresAt: seed.domains.sessions[0]!.expiresAt.toISOString(),
      }],
    });
    expect(context.get(authorizationOwnerContext)).toBe(seed.ownerUserId);
    const serialized = JSON.stringify(result.data);
    for (const key of ["token", "password", "credentialPassword", "methods", "secret", "ipAddress", "userAgent"]) {
      expect(serialized).not.toContain('"' + key + '"');
    }
    expect(serialized).not.toContain("Preview-Member-2026!");
    expect(serialized).not.toContain("p2-internal-only");
  });

  it.each([
    ["moderator", ["password"], true, false],
    ["admin", ["google"], false, false],
    ["owner", ["google"], false, true],
  ] as const)("projects %s methods without conflating Owner and ordinary role", async (actor, methods, password, owner) => {
    const flow = createP2AuthSessionFlow(baseline(), actor);
    const result = await accountPage(flow);
    expect(result.data.linkedMethods).toEqual(methods);
    expect(result.data.hasPassword).toBe(password);
    expect(result.data.canViewForum).toBe(owner);
    expect(result.data.sessions).toHaveLength(1);
    expect(result.data.sessions[0]?.current).toBe(true);
  });

  it.each(["guest", "inactive"] as const)("denies %s at original account loader with HTTP 401", async (actor) => {
    const flow = createP2AuthSessionFlow(baseline(), actor);
    await expect(accountPage(flow)).rejects.toMatchObject({ status: 401 });
    const { context } = await flow.createRequestContext(page());
    await expect(authRuntimeForRequest(context).security!.read(
      page().headers, { userId: "preview-owner", sessionId: "preview-session-owner" },
    )).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("rejects forged account/session identities even with Owner cookies and headers", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "member");
    const forged = page({
      Cookie: "better-auth.session_token=preview-session-owner",
      Authorization: "Bearer preview-session-owner",
      "X-Preview-Actor": "owner", "X-Expected-User": seed.ownerUserId,
    });
    const { context } = await flow.createRequestContext(forged);
    const security = authRuntimeForRequest(context).security!;
    const session = authSessionForRequest(context)!;
    await expect(security.read(forged.headers, {
      userId: seed.ownerUserId, sessionId: session.session.id,
    })).rejects.toMatchObject({ code: "account-changed" });
    await expect(security.read(forged.headers, {
      userId: seed.actorIds.member, sessionId: "preview-session-owner",
    })).rejects.toMatchObject({ code: "account-changed" });
    const snapshot = await security.read(forged.headers, accountIdentity(session));
    expect(snapshot.linkedMethods).toEqual(["password"]);
    expect(snapshot.sessions.every((item) => item.id !== "preview-session-owner")).toBe(true);
    expect((await settingsAccountLoader({ request: forged, params: { locale: "en" }, context })).data.canViewForum)
      .toBe(false);
  });

  it("projects only the selected user's current and other active sessions; filters expired, future and unrelated", async () => {
    const seed = baseline();
    const selected = (await createP2AuthSessionFlow(seed, "member").runtime.getSession(new Headers())).session!;
    const now = seed.referenceTime.getTime();
    const extras = [
      { id: "member-secondary", userId: seed.actorIds.member,
        issuedAt: new Date(now - 3 * 60 * 60_000), expiresAt: new Date(now + 2 * 60 * 60_000) },
      { id: "member-expired", userId: seed.actorIds.member,
        issuedAt: new Date(now - 3 * 60 * 60_000), expiresAt: new Date(now - 1) },
      { id: "member-future", userId: seed.actorIds.member,
        issuedAt: new Date(now + 1), expiresAt: new Date(now + 2 * 60 * 60_000) },
    ];
    const fixture = { ...seed, domains: { ...seed.domains, sessions: [...seed.domains.sessions, ...extras] } };
    const security = createP2AccountSecurityRuntime(fixture, () => selected, () => undefined);
    const snapshot = await security.read(new Headers({ Cookie: "better-auth.session_token=preview-session-owner" }),
      accountIdentity(selected));
    expect(snapshot.sessionAccess).toBe("ready");
    expect(snapshot.sessions).toHaveLength(2);
    expect(snapshot.sessions.map((session) => session.id).sort()).toEqual([
      "member-secondary", "preview-session-member",
    ]);
    expect(snapshot.sessions.filter((session) => session.current).map((session) => session.id))
      .toEqual(["preview-session-member"]);
    expect(snapshot.sessions.find((session) => session.id === "member-secondary")?.current).toBe(false);
    expect(JSON.stringify(snapshot)).not.toContain("preview-session-owner");
    expect(JSON.stringify(snapshot)).not.toContain("p2-internal-only");
  });

  it("returns not-fresh with no session details but retains own linked methods", async () => {
    const seed = baseline();
    const aged = { ...seed, domains: { ...seed.domains,
      sessions: seed.domains.sessions.map((session) => session.userId === seed.actorIds.member
        ? { ...session, issuedAt: new Date(seed.referenceTime.getTime() - 24 * 60 * 60_000) }
        : session),
    } };
    const flow = createP2AuthSessionFlow(aged, "member");
    const result = await accountPage(flow);
    expect(result.data).toMatchObject({
      linkedMethods: ["password"], hasPassword: true, sessionAccess: "not-fresh", sessions: [],
    });
  });

  it("fails closed when account was deactivated after an existing request session was initialized", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "member");
    const { context } = await flow.createRequestContext(page());
    const account = seed.users.find((item) => item.identity.id === seed.actorIds.member)!;
    const state = account.state as { status: string };
    state.status = "deactivated";
    await expect(authRuntimeForRequest(context).security!.read(page().headers, {
      userId: seed.actorIds.member, sessionId: "preview-session-member",
    })).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("never accepts stale actor identity after sign-out or replacement sign-in", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "member");
    const current = (await flow.runtime.getSession(new Headers())).session!;
    const identity = accountIdentity(current);
    const signOut = new Request(baseURL + "/api/auth/sign-out", {
      method: "POST", headers: { Origin: baseURL },
    });
    expect((await flow.runtime.handle(signOut)).status).toBe(200);
    await expect(flow.runtime.security!.read(new Headers(), identity))
      .rejects.toMatchObject({ code: "unauthenticated" });
    const moderator = seed.users.find((entry) => entry.identity.id === seed.actorIds.moderator)!;
    const login = new Request(baseURL + "/api/auth/sign-in/email", {
      method: "POST", headers: { Origin: baseURL, "Content-Type": "application/json" },
      body: JSON.stringify({ email: moderator.identity.email, password: moderator.credentialPassword }),
    });
    expect((await flow.runtime.handle(login)).status).toBe(200);
    await expect(flow.runtime.security!.read(new Headers(), identity))
      .rejects.toMatchObject({ code: "account-changed" });
    expect((await flow.runtime.security!.read(new Headers(), accountIdentity(
      (await flow.runtime.getSession(new Headers())).session!,
    ))).linkedMethods).toEqual(["password"]);
  });

  it("projects registered email and Google identities without exposing raw secrets or linking privileges", async () => {
    const seed = baseline();
    const email = createP2AuthSessionFlow(seed, "guest");
    const signUp = new Request(baseURL + "/api/auth/sign-up/email", {
      method: "POST", headers: { Origin: baseURL, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Synthetic newcomer", email: "account-security-new@preview.invalid",
        password: "Preview-Account-New-2026!",
      }),
    });
    expect((await email.runtime.handle(signUp)).status).toBe(200);
    const result = await accountPage(email);
    expect(result.data).toMatchObject({
      accountId: "preview-registered-1", hasPassword: true,
      linkedMethods: ["password"], sessionAccess: "ready",
    });
    expect(JSON.stringify(result.data)).not.toContain("Preview-Account-New-2026!");

    const social = createP2AuthSessionFlow(seed, "guest", "new-account");
    const start = new Request(baseURL + "/api/auth/sign-in/social", {
      method: "POST", headers: { Origin: baseURL, "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "google", callbackURL: "/en/settings/account", disableRedirect: true }),
    });
    const envelope = await (await social.runtime.handle(start)).json() as { url: string };
    expect((await social.runtime.handle(new Request(envelope.url))).status).toBe(302);
    const google = await accountPage(social);
    expect(google.data).toMatchObject({
      accountId: "preview-google-registered", hasPassword: false,
      linkedMethods: ["google"], sessionAccess: "ready",
    });
    expect(google.data.canViewForum).toBe(false);
  });

  it("never fabricates success for password change or session revocation in B7a", async () => {
    const runtime = createP2AuthSessionFlow(baseline(), "member").runtime;
    const identity = accountIdentity((await runtime.getSession(new Headers())).session!);
    await expect(runtime.security!.changePassword(new Headers(), identity, "old", "new"))
      .rejects.toThrow(P2AccountSecurityWriteNotConfiguredError);
    await expect(runtime.security!.revokeOneOther(new Headers(), identity, "other"))
      .rejects.toThrow("P2 AccountSecurity write not configured: revokeOneOther");
    await expect(runtime.security!.revokeAllOthers(new Headers(), identity))
      .rejects.toThrow("P2 AccountSecurity write not configured: revokeAllOthers");
  });

  it("keeps the typed AccountSecurity error identity rather than silently masking unsafe states", async () => {
    const selected = (await createP2AuthSessionFlow(baseline(), "member").runtime
      .getSession(new Headers())).session!;
    const security = createP2AccountSecurityRuntime(baseline(), () => selected, () => undefined);
    try {
      await security.read(new Headers(), { userId: "preview-owner", sessionId: selected.session.id });
      throw new Error("missing account-changed refusal");
    } catch (error) {
      expect(error).toBeInstanceOf(AccountSecurityError);
      expect((error as AccountSecurityError).code).toBe("account-changed");
    }
    const snapshot: AccountSecuritySnapshot = await security.read(new Headers(), accountIdentity(selected));
    expect(snapshot.sessionAccess).toBe("ready");
  });
});
