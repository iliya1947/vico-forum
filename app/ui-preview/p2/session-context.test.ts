import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import {
  authRuntimeForRequest, authSessionForRequest,
} from "../../auth/request-context";
import { initializeAuthContext, withAuthSessionCookies } from "../../auth/session-context";
import { isBoundOwner } from "../../authorization/owner";
import { forumReaderForRequest, forumWriterContext } from "../../forum/request-context";
import { loader as authApiLoader } from "../../routes/auth-api";
import { P0_TOPIC_ID } from "../p0/fixture";
import { createP2RawBaseline, previewActorId, type PreviewActor } from "./raw-baseline";
import {
  createP2AuthRuntime, createP2SessionReadContext,
  P2AuthEndpointNotConfiguredError,
} from "./session-context";

const referenceTime = new Date("2026-11-24T10:00:00.000Z");
const baseline = () => createP2RawBaseline(referenceTime);
const page = (headers?: HeadersInit) => new Request("https://vico.test/en", { headers });

describe("P2 actor-selected original AuthRuntime session boundary", () => {
  it.each([
    { actor: "member", userId: "p0-preview-user", sessionId: "preview-session-member" },
    { actor: "moderator", userId: "preview-moderator", sessionId: "preview-session-moderator" },
    { actor: "admin", userId: "preview-admin", sessionId: "preview-session-admin" },
    { actor: "owner", userId: "preview-owner", sessionId: "preview-session-owner" },
  ] as const)("initializes $actor from one raw identity and raw session", async ({ actor, userId, sessionId }) => {
    const seed = baseline();
    const { context, authHeaders } = await createP2SessionReadContext(seed, actor, page());
    const selected = authSessionForRequest(context);
    expect(selected?.user.id).toBe(previewActorId(seed, actor));
    expect(selected?.user.id).toBe(userId);
    expect(selected?.session.id).toBe(sessionId);
    expect(selected?.session.userId).toBe(selected?.user.id);
    expect(selected?.session.createdAt).toEqual(seed.domains.sessions.find((s) => s.id === sessionId)?.issuedAt);
    expect(selected?.session.expiresAt).toEqual(seed.domains.sessions.find((s) => s.id === sessionId)?.expiresAt);
    expect(selected?.user.locale).toBe(seed.users.find((u) => u.identity.id === userId)?.identity.locale);
    expect(selected?.user).not.toHaveProperty("role");
    expect(authHeaders.getSetCookie()).toEqual([]);
    expect(authRuntimeForRequest(context)).toHaveProperty("getSession");
    expect(forumReaderForRequest(context)).toHaveProperty("readTopicPage");
    expect((await forumReaderForRequest(context).readTopicPage(P0_TOPIC_ID))?.authorId)
      .toBe("sample-author");
  });

  it("keeps Owner strictly bound to the existing server ID, not the user's ordinary role", async () => {
    const seed = baseline();
    const ordinaryOwnerRole = seed.assignments.find((a) => a.userId === seed.ownerUserId);
    expect(ordinaryOwnerRole?.roleId).toBe("user");
    const owner = authSessionForRequest((await createP2SessionReadContext(seed, "owner", page())).context);
    const administrator = authSessionForRequest((await createP2SessionReadContext(seed, "admin", page())).context);
    expect(isBoundOwner(owner!.user.id, seed.ownerUserId)).toBe(true);
    expect(isBoundOwner(administrator!.user.id, seed.ownerUserId)).toBe(false);
    expect(administrator?.user).not.toHaveProperty("role");
  });

  it("returns guest identity for guest selection despite forged session headers", async () => {
    const seed = baseline();
    const request = page({
      Cookie: "better-auth.session_token=fake-owner",
      Authorization: "Bearer fake-owner",
      "X-Preview-Actor": "owner",
    });
    const { context } = await createP2SessionReadContext(seed, "guest", request);
    expect(authSessionForRequest(context)).toBeNull();
    expect((await authRuntimeForRequest(context).getSession(request.headers)).session).toBeNull();
  });

  it("does not accept cookies or user-controlled headers as an actor switch", async () => {
    const seed = baseline();
    const forged = page({
      Cookie: "better-auth.session_token=preview-session-owner",
      "x-preview-actor": "owner",
      "x-vico-link-user": seed.ownerUserId,
    });
    const { context } = await createP2SessionReadContext(seed, "member", forged);
    expect(authSessionForRequest(context)?.user.id).toBe(seed.actorIds.member);
    expect(isBoundOwner(authSessionForRequest(context)!.user.id, seed.ownerUserId)).toBe(false);
    expect(authSessionForRequest(context)?.session.id).toBe("preview-session-member");
  });

  it("suppresses a retained inactive-account session without changing its raw record", async () => {
    const seed = baseline();
    const savedSession = seed.domains.sessions.find((s) => s.userId === seed.actorIds.inactive);
    expect(savedSession).toBeDefined();
    expect(seed.users.find((u) => u.identity.id === seed.actorIds.inactive)?.state.status)
      .toBe("deactivated");
    const { context } = await createP2SessionReadContext(seed, "inactive", page({
      Cookie: "better-auth.session_token=preview-session-inactive",
    }));
    expect(authSessionForRequest(context)).toBeNull();
    expect(seed.domains.sessions.find((s) => s.userId === seed.actorIds.inactive)).toBe(savedSession);
  });

  it("respects no-session, expired and not-yet-issued overlays instead of guessing a login", async () => {
    const seed = baseline();
    const without = { ...seed, domains: { ...seed.domains,
      sessions: seed.domains.sessions.filter((s) => s.userId !== seed.actorIds.member),
    } };
    const expired = { ...seed, domains: { ...seed.domains,
      sessions: seed.domains.sessions.map((s) => s.userId === seed.actorIds.member
        ? { ...s, expiresAt: new Date(referenceTime.getTime() - 1) } : s),
    } };
    const future = { ...seed, domains: { ...seed.domains,
      sessions: seed.domains.sessions.map((s) => s.userId === seed.actorIds.member
        ? { ...s, issuedAt: new Date(referenceTime.getTime() + 1) } : s),
    } };
    for (const snapshot of [without, expired, future]) {
      const { context } = await createP2SessionReadContext(snapshot, "member", page());
      expect(authSessionForRequest(context)).toBeNull();
    }
  });

  it("takes an immutable actor snapshot per request, preserving previous contexts and authorship", async () => {
    const seed = baseline();
    let selected: PreviewActor = "member";
    const memberContext = (await createP2SessionReadContext(seed, selected, page())).context;
    selected = "owner";
    const ownerContext = (await createP2SessionReadContext(seed, selected, page())).context;
    expect(authSessionForRequest(memberContext)?.user.id).toBe(seed.actorIds.member);
    expect(authSessionForRequest(ownerContext)?.user.id).toBe(seed.actorIds.owner);
    expect((await forumReaderForRequest(memberContext).readTopicPage(P0_TOPIC_ID))?.authorId)
      .toBe("sample-author");
    expect((await forumReaderForRequest(ownerContext).readTopicPage(P0_TOPIC_ID))?.authorId)
      .toBe("sample-author");
    expect(seed.topics.find((t) => t.id === P0_TOPIC_ID)?.authorId).toBe("sample-author");
    expect(memberContext).not.toBe(ownerContext);
  });

  it("uses the fixture reference clock rather than system time for session validity", async () => {
    const later = createP2RawBaseline(new Date(referenceTime.getTime() + 14 * 86_400_000));
    const original = authSessionForRequest(
      (await createP2SessionReadContext(baseline(), "member", page())).context);
    const shifted = authSessionForRequest(
      (await createP2SessionReadContext(later, "member", page())).context);
    expect(shifted?.session.id).toBe(original?.session.id);
    expect(shifted!.session.expiresAt.getTime() - original!.session.expiresAt.getTime())
      .toBe(14 * 86_400_000);
  });

  it("uses the exact production initializeAuthContext path with one getSession lookup", async () => {
    const seed = baseline();
    const runtime = createP2AuthRuntime(seed, "moderator");
    const getSession = vi.spyOn(runtime, "getSession");
    const request = page({ Cookie: "not-an-authority=example" });
    const context = new RouterContextProvider();
    const headers = await initializeAuthContext(context, request, runtime);
    expect(getSession).toHaveBeenCalledTimes(1);
    expect(getSession).toHaveBeenCalledWith(request.headers);
    expect(authSessionForRequest(context)?.user.id).toBe(seed.actorIds.moderator);
    expect(authRuntimeForRequest(context)).toBe(runtime);
    expect(headers.getSetCookie()).toEqual([]);
    const response = withAuthSessionCookies(new Response("page", {
      headers: { "Cache-Control": "private, no-store" },
    }), headers);
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("rejects malformed actor selectors and inconsistent fixture identities loudly", () => {
    const seed = baseline();
    expect(() => createP2AuthRuntime(seed, "stranger" as PreviewActor))
      .toThrow("P2 unknown preview actor");
    const orphan = { ...seed, users: seed.users.filter(
      (u) => u.identity.id !== seed.actorIds.member) };
    expect(() => createP2AuthRuntime(orphan, "member"))
      .toThrow("selected account identity is missing");
    const ambiguous = { ...seed, domains: { ...seed.domains,
      sessions: [...seed.domains.sessions, { id: "another-member-session", userId: seed.actorIds.member,
        issuedAt: new Date(referenceTime.getTime() - 1000),
        expiresAt: new Date(referenceTime.getTime() + 86_400_000) }],
    } };
    expect(() => createP2AuthRuntime(ambiguous, "member"))
      .toThrow("ambiguous active session");
  });

  it("keeps unrelated Auth and account security endpoints unwired", async () => {
    const { context } = await createP2SessionReadContext(baseline(), "member", page());
    const runtime = authRuntimeForRequest(context);
    expect(runtime.security?.read).toBeTypeOf("function");
    await expect(authApiLoader({
      request: new Request("https://vico.test/api/auth/link-social", { method: "POST" }),
      context,
    })).rejects.toThrow(P2AuthEndpointNotConfiguredError);
    await expect(runtime.handle(new Request("https://vico.test/api/auth/change-password", {
      method: "POST",
    }))).rejects.toThrow("P2 Auth API not configured: POST /api/auth/change-password");
    expect(() => context.get(forumWriterContext)).toThrow();
  });
});
