import { describe, expect, it } from "vitest";
import { AccountSecurityError, authSessionForRequest } from "../../auth/request-context";
import { action as accountAction, loader as accountLoader } from "../../routes/settings-account";
import { action as authAction } from "../../routes/auth-api";
import { createP2RawBaseline } from "./raw-baseline";
import { createP2AuthSessionFlow } from "./session-context";

const baseURL = "https://vico.test";
const baseline = () => createP2RawBaseline(new Date("2026-11-24T10:00:00Z"));
type Flow = ReturnType<typeof createP2AuthSessionFlow>;
const changed = "Preview-Member-Changed-2026!";

function changeRequest(
  userId: string, sessionId: string, currentPassword: string, newPassword: string,
  extra: Record<string, string> = {}, origin: string | null = baseURL,
) {
  const params = new URLSearchParams({
    intent: "change-password", expectedUserId: userId,
    expectedSessionId: sessionId, currentPassword, newPassword, ...extra,
  });
  return new Request(baseURL + "/en/settings/account", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded",
      ...(origin === null ? {} : { Origin: origin }) },
    body: params.toString(),
  });
}

async function settingsAction(flow: Flow, request: Request) {
  const { context } = await flow.createRequestContext(request);
  return accountAction({ request, context, params: { locale: "en" } });
}

async function settingsLoader(flow: Flow) {
  const request = new Request(baseURL + "/en/settings/account");
  return accountLoader({
    request, context: (await flow.createRequestContext(request)).context,
    params: { locale: "en" },
  });
}

function authRequest(
  path: string, body: unknown, origin: string | null = baseURL,
) {
  return new Request(baseURL + "/api/auth/" + path, {
    method: "POST", headers: { "Content-Type": "application/json",
      ...(origin === null ? {} : { Origin: origin }) },
    body: JSON.stringify(body),
  });
}

async function authRoute(flow: Flow, request: Request) {
  return authAction({ request, context: (await flow.createRequestContext(request)).context });
}

describe("P2-B7b1 password change via original protected Settings action and Auth HTTP", () => {
  it("changes only the signed-in member's password, then requires the new password at next login", async () => {
    const seed = baseline();
    const member = seed.users.find((user) => user.identity.id === seed.actorIds.member)!;
    const moderator = seed.users.find((user) => user.identity.id === seed.actorIds.moderator)!;
    const flow = createP2AuthSessionFlow(seed, "member");
    const original = member.credentialPassword!;
    const request = changeRequest(seed.actorIds.member, "preview-session-member", original, changed);
    const response = await settingsAction(flow, request);
    expect(response.data).toEqual({ saved: "change-password" });
    expect(response.init?.headers).toMatchObject({ "Cache-Control": "private, no-store" });
    expect(JSON.stringify(response.data)).not.toContain(original);
    expect(JSON.stringify(response.data)).not.toContain(changed);
    expect((await flow.runtime.getSession(new Headers())).session?.session.id).toBe("preview-session-member");
    expect((await settingsLoader(flow)).data).toMatchObject({
      accountId: seed.actorIds.member, hasPassword: true,
      linkedMethods: ["password"], sessionAccess: "ready",
    });
    // Raw source and any other credential never receive a mutable write.
    expect(member.credentialPassword).toBe(original);
    expect(moderator.credentialPassword).toBe("Preview-Moderator-2026!");
    expect(seed.users.find((user) => user.identity.id === seed.ownerUserId)?.credentialPassword).toBeNull();
    expect((await authRoute(flow, authRequest("sign-out", {}))).status).toBe(200);
    const old = await authRoute(flow, authRequest("sign-in/email", {
      email: member.identity.email, password: original,
    }));
    expect(old.status).toBe(401);
    expect((await flow.runtime.getSession(new Headers())).session).toBeNull();
    const next = await authRoute(flow, authRequest("sign-in/email", {
      email: member.identity.email, password: changed,
    }));
    expect(next.status).toBe(200);
    expect(await next.json()).toMatchObject({ user: { id: seed.actorIds.member } });
    expect((await flow.runtime.getSession(new Headers())).session?.user.id).toBe(seed.actorIds.member);
  });

  it("returns typed invalid-password for a wrong current password and preserves old credential", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "member");
    const first = await settingsAction(flow, changeRequest(
      seed.actorIds.member, "preview-session-member", "Wrong-Password-2026!", changed,
    ));
    expect(first.init?.status).toBe(400);
    expect(first.data).toEqual({ error: "invalid-password" });
    expect(first.init?.headers).toMatchObject({ "Cache-Control": "private, no-store" });
    expect(JSON.stringify(first.data)).not.toContain("Wrong-Password-2026!");
    const good = await settingsAction(flow, changeRequest(
      seed.actorIds.member, "preview-session-member", "Preview-Member-2026!", changed,
    ));
    expect(good.data).toEqual({ saved: "change-password" });
  });

  it("does not create a credential password for Google-only Admin or Owner", async () => {
    const seed = baseline();
    for (const actor of ["admin", "owner"] as const) {
      const flow = createP2AuthSessionFlow(seed, actor);
      const initial = (await flow.runtime.getSession(new Headers())).session!;
      const response = await settingsAction(flow, changeRequest(
        initial.user.id, initial.session.id, "Arbitrary-Old-2026!", changed,
      ));
      expect(response.init?.status).toBe(409);
      expect(response.data).toEqual({ error: "no-password" });
      expect((await settingsLoader(flow)).data.hasPassword).toBe(false);
      expect((await flow.runtime.getSession(new Headers())).session?.user.id).toBe(initial.user.id);
    }
  });

  it("does not accept wrong or stale user/session expectations from Settings form", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "member");
    const cases = [
      [seed.ownerUserId, "preview-session-member"],
      [seed.actorIds.member, "preview-session-owner"],
      [seed.ownerUserId, "preview-session-owner"],
    ] as const;
    for (const [userId, sessionId] of cases) {
      const response = await settingsAction(flow, changeRequest(
        userId, sessionId, "Preview-Member-2026!", changed,
      ));
      expect(response.init?.status).toBe(409);
      expect(response.data).toEqual({ error: "account-changed" });
    }
    const valid = await settingsAction(flow, changeRequest(
      seed.actorIds.member, "preview-session-member", "Preview-Member-2026!", changed,
    ));
    expect(valid.data).toEqual({ saved: "change-password" });
    expect(seed.users.find((u) => u.identity.id === seed.ownerUserId)?.credentialPassword).toBeNull();
  });

  it("rejects a foreign Origin before a valid password change, then permits correct same-origin", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "member");
    for (const origin of ["https://evil.test", "https://vico.test.evil.test", "null"]) {
      const denial = await settingsAction(flow, changeRequest(
        seed.actorIds.member, "preview-session-member", "Preview-Member-2026!", changed, {}, origin,
      ));
      expect(denial.init?.status).toBe(403);
      expect(denial.data).toEqual({ error: "origin" });
    }
    expect((await settingsAction(flow, changeRequest(
      seed.actorIds.member, "preview-session-member", "Preview-Member-2026!", changed,
    ))).data).toEqual({ saved: "change-password" });
  });

  it("rejects duplicate/unknown/missing fields and invalid password lengths at the production Settings boundary", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "member");
    const requests = [
      changeRequest(seed.actorIds.member, "preview-session-member", "Preview-Member-2026!", "short"),
      changeRequest(seed.actorIds.member, "preview-session-member", "Preview-Member-2026!", "X".repeat(129)),
      changeRequest(seed.actorIds.member, "preview-session-member", "X".repeat(129), changed),
      changeRequest(seed.actorIds.member, "preview-session-member", "Preview-Member-2026!", changed, {
        userId: seed.ownerUserId,
      }),
    ];
    const duplicate = changeRequest(seed.actorIds.member, "preview-session-member", "Preview-Member-2026!", changed);
    const body = new URLSearchParams(await duplicate.text());
    body.append("expectedUserId", seed.ownerUserId);
    requests.push(new Request(baseURL + "/en/settings/account", {
      method: "POST", headers: { Origin: baseURL, "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    }));
    for (const request of requests) {
      const result = await settingsAction(flow, request);
      expect(result.init?.status).toBe(400);
      expect(result.data).toEqual({ error: "invalid" });
    }
    expect((await settingsAction(flow, changeRequest(
      seed.actorIds.member, "preview-session-member", "Preview-Member-2026!", changed,
    ))).data).toEqual({ saved: "change-password" });
  });

  it("denies Guest and inactive accounts in the unchanged production Settings action", async () => {
    for (const actor of ["guest", "inactive"] as const) {
      const flow = createP2AuthSessionFlow(baseline(), actor);
      const request = changeRequest("preview-owner", "preview-session-owner",
        "Any-Old-2026!", changed);
      await expect(settingsAction(flow, request)).rejects.toMatchObject({ status: 401 });
    }
  });

  it("rejects stale expected identity after sign-out and switching to a different account", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "member");
    const oldRequest = changeRequest(seed.actorIds.member, "preview-session-member",
      "Preview-Member-2026!", changed);
    expect((await authRoute(flow, authRequest("sign-out", {}))).status).toBe(200);
    await expect(settingsAction(flow, oldRequest)).rejects.toMatchObject({ status: 401 });
    const moderator = seed.users.find((u) => u.identity.id === seed.actorIds.moderator)!;
    expect((await authRoute(flow, authRequest("sign-in/email", {
      email: moderator.identity.email, password: moderator.credentialPassword,
    }))).status).toBe(200);
    const stale = await settingsAction(flow, changeRequest(
      seed.actorIds.member, "preview-session-member", "Preview-Member-2026!", changed,
    ));
    expect(stale.init?.status).toBe(409);
    expect(stale.data).toEqual({ error: "account-changed" });
    expect((await flow.runtime.getSession(new Headers())).session?.user.id).toBe(seed.actorIds.moderator);
    expect((await settingsAction(flow, changeRequest(seed.actorIds.moderator, "preview-session-moderator",
      moderator.credentialPassword!, "Preview-Moderator-Changed-2026!",
    ))).data).toEqual({ saved: "change-password" });
  });

  it("uses the original Auth API handler for POST /change-password with the pinned Better Auth success envelope", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "member");
    const response = await authRoute(flow, authRequest("change-password", {
      currentPassword: "Preview-Member-2026!", newPassword: changed, revokeOtherSessions: false,
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(await response.json()).toMatchObject({
      token: null, user: { id: seed.actorIds.member, email: "p0-preview-user@preview.invalid" },
    });
    expect((await flow.runtime.getSession(new Headers())).session?.session.id).toBe("preview-session-member");
    // Direct canonical API and Settings share the same underlying password overlay.
    const denied = await settingsAction(flow, changeRequest(seed.actorIds.member,
      "preview-session-member", "Preview-Member-2026!", "Second-Changed-2026!"));
    expect(denied.init?.status).toBe(400);
    expect(denied.data).toEqual({ error: "invalid-password" });
    const accepted = await settingsAction(flow, changeRequest(seed.actorIds.member,
      "preview-session-member", changed, "Second-Changed-2026!"));
    expect(accepted.data).toEqual({ saved: "change-password" });
  });

  it("rejects wrong current password and missing credential by canonical Better Auth HTTP error codes", async () => {
    const member = createP2AuthSessionFlow(baseline(), "member");
    const wrong = await authRoute(member, authRequest("change-password", {
      currentPassword: "Wrong-Old-2026!", newPassword: changed,
    }));
    expect(wrong.status).toBe(400);
    expect(await wrong.json()).toEqual({ code: "INVALID_PASSWORD" });
    const owner = createP2AuthSessionFlow(baseline(), "owner");
    const missing = await authRoute(owner, authRequest("change-password", {
      currentPassword: "Anything-2026!", newPassword: changed,
    }));
    expect(missing.status).toBe(400);
    expect(await missing.json()).toEqual({ code: "CREDENTIAL_ACCOUNT_NOT_FOUND" });
    expect(missing.headers.getSetCookie()).toEqual([]);
  });

  it("does not support revokeOtherSessions=true in B7b1 or mutate auth state on malformed direct requests", async () => {
    const flow = createP2AuthSessionFlow(baseline(), "member");
    const requests = [
      authRequest("change-password", { currentPassword: "Preview-Member-2026!",
        newPassword: changed, revokeOtherSessions: true }),
      authRequest("change-password", { currentPassword: "Preview-Member-2026!",
        newPassword: null }),
      authRequest("change-password", null),
    ];
    for (const request of requests) {
      const result = await authRoute(flow, request);
      expect(result.status).toBe(400);
      expect(result.headers.getSetCookie()).toEqual([]);
    }
    expect((await flow.runtime.getSession(new Headers())).session?.session.id).toBe("preview-session-member");
    const direct = await authRoute(flow, authRequest("change-password", {
      currentPassword: "Preview-Member-2026!", newPassword: changed,
    }));
    expect(direct.status).toBe(200);
  });

  it("shares one preview-owned attempt budget across Settings and canonical Auth endpoint", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "member");
    const oldPassword = "Preview-Member-2026!";
    for (let i = 0; i < 2; i++) {
      const response = await settingsAction(flow, changeRequest(
        seed.actorIds.member, "preview-session-member", "Wrong-Old-2026!", changed,
      ));
      expect(response.init?.status).toBe(400);
      expect(response.data).toEqual({ error: "invalid-password" });
    }
    const third = await authRoute(flow, authRequest("change-password", {
      currentPassword: "Wrong-Old-2026!", newPassword: changed,
    }));
    expect(third.status).toBe(400);
    expect(await third.json()).toEqual({ code: "INVALID_PASSWORD" });
    const exhausted = await settingsAction(flow, changeRequest(
      seed.actorIds.member, "preview-session-member", oldPassword, changed,
    ));
    expect(exhausted.init?.status).toBe(429);
    expect(exhausted.data).toEqual({ error: "rate-limited" });
    expect(exhausted.init?.headers).toMatchObject({
      "Cache-Control": "private, no-store", "Retry-After": "10", "X-Retry-After": "10",
    });
    const directExhausted = await authRoute(flow, authRequest("change-password", {
      currentPassword: oldPassword, newPassword: changed,
    }));
    expect(directExhausted.status).toBe(429);
    expect(directExhausted.headers.get("Retry-After")).toBe("10");
    expect(await directExhausted.json()).toEqual({ code: "RATE_LIMITED" });
    const freshController = createP2AuthSessionFlow(seed, "member");
    expect((await settingsAction(freshController, changeRequest(seed.actorIds.member,
      "preview-session-member", oldPassword, changed,
    ))).data).toEqual({ saved: "change-password" });
    expect(seed.users.find((user) => user.identity.id === seed.actorIds.member)?.credentialPassword)
      .toBe(oldPassword);
  });

  it("guards direct HTTP Origin, wrong method, unsupported content and no active session", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "member");
    const body = { currentPassword: "Preview-Member-2026!", newPassword: changed };
    const foreign = await authRoute(flow, authRequest("change-password", body, "https://evil.test"));
    expect(foreign.status).toBe(403);
    expect(await foreign.json()).toEqual({ code: "INVALID_ORIGIN" });
    const invalidMedia = new Request(baseURL + "/api/auth/change-password", {
      method: "POST", headers: { Origin: baseURL, "Content-Type": "text/plain" }, body: "hello",
    });
    expect((await authRoute(flow, invalidMedia)).status).toBe(415);
    const { context } = await flow.createRequestContext(new Request(baseURL + "/api/auth/change-password"));
    const method = await flow.runtime.handle(new Request(baseURL + "/api/auth/change-password"));
    expect(method.status).toBe(405);
    expect(method.headers.get("Allow")).toBe("POST");
    expect(authSessionForRequest(context)?.user.id).toBe(seed.actorIds.member);
    const guest = createP2AuthSessionFlow(seed, "guest");
    expect((await authRoute(guest, authRequest("change-password", body))).status).toBe(401);
    expect((await authRoute(flow, authRequest("change-password", body))).status).toBe(200);
  });

  it("enforces typed identity despite forged header/cookie claims on direct capability calls", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "member");
    const forged = new Headers({
      Cookie: "better-auth.session_token=preview-session-owner",
      "X-Preview-Actor": "owner", Origin: baseURL,
    });
    await expect(flow.runtime.security!.changePassword(forged, {
      userId: seed.ownerUserId, sessionId: "preview-session-owner",
    }, "Preview-Member-2026!", changed)).rejects.toMatchObject({ code: "account-changed" });
    expect(seed.users.find((u) => u.identity.id === seed.ownerUserId)?.credentialPassword).toBeNull();
    await expect(flow.runtime.security!.changePassword(forged, {
      userId: seed.actorIds.member, sessionId: "preview-session-owner",
    }, "Preview-Member-2026!", changed)).rejects.toBeInstanceOf(AccountSecurityError);
    const allowed = await settingsAction(flow, changeRequest(seed.actorIds.member,
      "preview-session-member", "Preview-Member-2026!", changed));
    expect(allowed.data).toEqual({ saved: "change-password" });
  });

  it("supports a newly registered email account without exposing or persisting the new password in raw facts", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "guest");
    const created = await authRoute(flow, authRequest("sign-up/email", {
      name: "New member", email: "new-change-password@preview.invalid",
      password: "Preview-New-Account-2026!",
    }));
    expect(created.status).toBe(200);
    const current = (await flow.runtime.getSession(new Headers())).session!;
    const updated = await settingsAction(flow, changeRequest(current.user.id, current.session.id,
      "Preview-New-Account-2026!", changed));
    expect(updated.data).toEqual({ saved: "change-password" });
    expect(JSON.stringify((await settingsLoader(flow)).data)).not.toContain(changed);
    expect((await authRoute(flow, authRequest("sign-out", {}))).status).toBe(200);
    const old = await authRoute(flow, authRequest("sign-in/email", {
      email: "new-change-password@preview.invalid", password: "Preview-New-Account-2026!",
    }));
    expect(old.status).toBe(401);
    const fresh = await authRoute(flow, authRequest("sign-in/email", {
      email: "new-change-password@preview.invalid", password: changed,
    }));
    expect(fresh.status).toBe(200);
    expect(seed.users.some((u) => u.identity.email === "new-change-password@preview.invalid")).toBe(false);
  });

  it("keeps future session revocation actions unavailable and cannot change another user's login", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "member");
    const own = (await flow.runtime.getSession(new Headers())).session!;
    await expect(flow.runtime.security!.revokeOneOther(new Headers(), {
      userId: own.user.id, sessionId: own.session.id,
    }, "preview-session-moderator")).rejects.toThrow("P2 AccountSecurity write not configured");
    await expect(flow.runtime.security!.revokeAllOthers(new Headers(), {
      userId: own.user.id, sessionId: own.session.id,
    })).rejects.toThrow("P2 AccountSecurity write not configured");
    expect((await settingsAction(flow, changeRequest(seed.actorIds.member, own.session.id,
      "Preview-Member-2026!", changed))).data).toEqual({ saved: "change-password" });
    const moderator = createP2AuthSessionFlow(seed, "moderator");
    const mod = seed.users.find((u) => u.identity.id === seed.actorIds.moderator)!;
    expect((await authRoute(moderator, authRequest("sign-out", {}))).status).toBe(200);
    expect((await authRoute(moderator, authRequest("sign-in/email", {
      email: mod.identity.email, password: mod.credentialPassword,
    }))).status).toBe(200);
  });
});
