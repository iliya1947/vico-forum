import { describe, expect, it } from "vitest";
import { authRuntimeForRequest, authSessionForRequest } from "../../auth/request-context";
import { loader as authApiLoader, action as authApiAction } from "../../routes/auth-api";
import { forumReaderForRequest } from "../../forum/request-context";
import { P0_TOPIC_ID } from "../p0/fixture";
import { createP2RawBaseline } from "./raw-baseline";
import { createP2AuthSessionFlow, P2AuthEndpointNotConfiguredError } from "./session-context";

const baseline = () => createP2RawBaseline(new Date("2026-11-24T10:00:00.000Z"));
const root = "https://vico.test";
const route = (path: string, method = "GET", headers?: HeadersInit, body?: string) =>
  new Request(root + path, { method, headers, ...(body === undefined ? {} : { body }) });

describe("P2 canonical local Better Auth read and sign-out transport", () => {
  it("returns the pinned Better Auth get-session envelope through the original loader", async () => {
    const data = baseline();
    const flow = createP2AuthSessionFlow(data, "member");
    const request = route("/api/auth/get-session?disableCookieCache=true", "GET", {
      Cookie: "better-auth.session_token=preview-session-owner",
      "X-Preview-Actor": "owner",
    });
    const { context } = await flow.createRequestContext(request);
    const response = await authApiLoader({ request, context });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toMatch(/^application\/json/);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Pragma")).toBe("no-cache");
    expect(response.headers.getSetCookie()).toEqual([]);
    const result = await response.json();
    expect(result).toEqual({
      user: {
        ...data.users.find((entry) => entry.identity.id === data.actorIds.member)!.identity,
        createdAt: data.users[0]!.identity.createdAt.toISOString(),
        updatedAt: data.users[0]!.identity.updatedAt.toISOString(),
      },
      session: {
        id: "preview-session-member", token: "p2-internal-only:preview-session-member",
        userId: data.actorIds.member,
        createdAt: data.domains.sessions[0]!.issuedAt.toISOString(),
        updatedAt: data.domains.sessions[0]!.issuedAt.toISOString(),
        expiresAt: data.domains.sessions[0]!.expiresAt.toISOString(),
      },
    });
    const publicJson = JSON.stringify(result);
    for (const forbidden of ["ownerUserId", "roleId", "grants", "state", "methods", "deactivatedAt"]) {
      expect(publicJson).not.toContain('"' + forbidden + '"');
    }
  });

  it.each(["guest", "inactive"] as const)("returns JSON null for %s without credential leakage", async (actor) => {
    const flow = createP2AuthSessionFlow(baseline(), actor);
    const request = route("/api/auth/get-session", "GET", {
      Cookie: "better-auth.session_token=preview-session-owner",
      Authorization: "Bearer preview-session-owner",
    });
    const { context } = await flow.createRequestContext(request);
    const response = await authApiLoader({ request, context });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.text()).toBe("null");
    expect(authSessionForRequest(context)).toBeNull();
  });

  it("retains sign-out across fresh contexts, without mutating raw sessions or prior contexts", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "member");
    const beforeRequest = route("/en");
    const before = await flow.createRequestContext(beforeRequest);
    expect(authSessionForRequest(before.context)?.user.id).toBe(seed.actorIds.member);
    const originalSession = seed.domains.sessions.find((item) => item.userId === seed.actorIds.member);
    const signOut = route("/api/auth/sign-out", "POST", {
      Origin: root, Cookie: "better-auth.session_token=untrusted",
      "Content-Type": "application/json",
    }, JSON.stringify({ callbackURL: "/en" }));
    const actionContext = await flow.createRequestContext(signOut);
    const response = await authApiAction({ request: signOut, context: actionContext.context });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const cookies = response.headers.getSetCookie();
    expect(cookies).toHaveLength(3);
    for (const name of ["session_token", "session_data", "dont_remember"]) {
      expect(cookies.some((cookie) => cookie.startsWith("better-auth." + name + "=")
        && cookie.includes("Max-Age=0") && cookie.includes("HttpOnly"))).toBe(true);
    }
    expect(response.headers.get("Location")).toBeNull();

    // Existing RouterContextProvider is a snapshot of its earlier request.
    expect(authSessionForRequest(before.context)?.user.id).toBe(seed.actorIds.member);
    const after = await flow.createRequestContext(route("/en", "GET", {
      Cookie: "better-auth.session_token=preview-session-member",
    }));
    expect(authSessionForRequest(after.context)).toBeNull();
    const get = route("/api/auth/get-session");
    const { context } = await flow.createRequestContext(get);
    expect(await (await authApiLoader({ request: get, context })).text()).toBe("null");
    expect((await forumReaderForRequest(after.context).readTopicPage(P0_TOPIC_ID))?.authorId)
      .toBe("sample-author");
    expect(seed.domains.sessions.find((item) => item.userId === seed.actorIds.member)).toBe(originalSession);
  });

  it("rejects foreign or malformed Origin before any sign-out mutation", async () => {
    const flow = createP2AuthSessionFlow(baseline(), "owner");
    for (const origin of ["https://evil.test", "https://vico.test.attacker.test", "null", "https://vico.test:444"]) {
      const request = route("/api/auth/sign-out", "POST", { Origin: origin });
      const { context } = await flow.createRequestContext(request);
      const response = await authApiAction({ request, context });
      expect(response.status).toBe(403);
      expect(response.headers.getSetCookie()).toEqual([]);
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(await response.json()).toEqual({ code: "INVALID_ORIGIN" });
      expect((await flow.runtime.getSession(new Headers())).session?.user.id).toBe("preview-owner");
    }
  });

  it("allows local sign-out with absent Origin for nonbrowser callers, but never trusts body subject", async () => {
    const flow = createP2AuthSessionFlow(baseline(), "moderator");
    const request = route("/api/auth/sign-out", "POST",
      { "Content-Type": "application/json", "X-Preview-Actor": "owner" },
      JSON.stringify({ userId: "preview-owner", callbackURL: "https://evil.test" }));
    const { context } = await flow.createRequestContext(request);
    const response = await authApiAction({ request, context });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(response.headers.get("Location")).toBeNull();
    expect((await flow.runtime.getSession(request.headers)).session).toBeNull();
  });

  it("rejects unsupported HTTP methods without silently revoking the session", async () => {
    const flow = createP2AuthSessionFlow(baseline(), "admin");
    for (const [path, method, allow] of [
      ["/api/auth/sign-out", "GET", "POST"],
      ["/api/auth/get-session", "POST", "GET"],
      ["/api/auth/get-session", "DELETE", "GET"],
    ]) {
      const request = route(path, method);
      const { context } = await flow.createRequestContext(request);
      const response = method === "GET"
        ? await authApiLoader({ request, context })
        : await authApiAction({ request, context });
      expect(response.status).toBe(405);
      expect(response.headers.get("Allow")).toBe(allow);
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect((await flow.runtime.getSession(new Headers())).session?.user.id).toBe("preview-admin");
    }
  });

  it("keeps non-B3 Auth API handlers unavailable and never emits provider redirects", async () => {
    const flow = createP2AuthSessionFlow(baseline(), "member");
    for (const [path, method] of [
      ["/api/auth/link-social", "POST"],
      ["/api/auth/set-password", "POST"],
      ["/api/auth/list-sessions", "GET"],
      ["/api/auth/callback/apple", "GET"],
    ]) {
      const request = route(path, method);
      const { context } = await flow.createRequestContext(request);
      await expect(authRuntimeForRequest(context).handle(request))
        .rejects.toThrow(P2AuthEndpointNotConfiguredError);
    }
    expect((await flow.runtime.getSession(new Headers())).session?.user.id).toBe("p0-preview-user");
  });

  it("makes local sign-out idempotent for Guest and inactive accounts", async () => {
    for (const actor of ["guest", "inactive"] as const) {
      const flow = createP2AuthSessionFlow(baseline(), actor);
      for (let i = 0; i < 2; i++) {
        const request = route("/api/auth/sign-out", "POST", { Origin: root });
        const { context } = await flow.createRequestContext(request);
        const response = await authApiAction({ request, context });
        expect(await response.json()).toEqual({ success: true });
        expect(response.headers.getSetCookie()).toHaveLength(3);
        expect((await flow.runtime.getSession(new Headers())).session).toBeNull();
      }
    }
  });

  it("isolates independent flows and restores the selected fixture actor only on fresh preview reset", async () => {
    const seed = baseline();
    const owner = createP2AuthSessionFlow(seed, "owner");
    const member = createP2AuthSessionFlow(seed, "member");
    const request = route("/api/auth/sign-out", "POST", { Origin: root });
    const before = await member.createRequestContext(route("/en"));
    await authApiAction({ request, context: (await member.createRequestContext(request)).context });
    expect((await member.runtime.getSession(new Headers())).session).toBeNull();
    expect(authSessionForRequest(before.context)?.user.id).toBe(seed.actorIds.member);
    expect((await owner.runtime.getSession(new Headers())).session?.user.id).toBe(seed.actorIds.owner);
    const afterReset = createP2AuthSessionFlow(seed, "member");
    expect((await afterReset.runtime.getSession(new Headers())).session?.user.id).toBe(seed.actorIds.member);
    expect(seed.actorIds.owner).toBe(seed.ownerUserId);
  });
});
