import { createAuthClient } from "better-auth/react";
import { describe, expect, it } from "vitest";
import { authSessionForRequest } from "../../auth/request-context";
import { loader as authApiLoader, action as authApiAction } from "../../routes/auth-api";
import { assertP2RawBaselineIntegrity, createP2RawBaseline } from "./raw-baseline";
import { createP2AuthSessionFlow } from "./session-context";

const baseline = () => createP2RawBaseline(new Date("2026-11-24T10:00:00Z"));
const baseUrl = "https://vico.test";
const post = (body: string, contentType = "application/json", origin: string | null = baseUrl) =>
  new Request(baseUrl + "/api/auth/sign-in/email", {
    method: "POST", headers: {
      "Content-Type": contentType, ...(origin === null ? {} : { Origin: origin }),
    }, body,
  });
const credential = (email: string, password: string, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ email, password, ...extra });

async function route(flow: ReturnType<typeof createP2AuthSessionFlow>, request: Request) {
  const { context } = await flow.createRequestContext(request);
  return request.method === "GET"
    ? authApiLoader({ request, context })
    : authApiAction({ request, context });
}

describe("P2 fixture-only credential sign-in via the original Better Auth route", () => {
  it("signs a guest into the exact raw credential account, not the selected UI role", async () => {
    const data = baseline();
    const flow = createP2AuthSessionFlow(data, "guest");
    const member = data.users.find((user) => user.identity.id === data.actorIds.member)!;
    const result = await route(flow, post(credential(member.identity.email.toUpperCase(), member.credentialPassword!)));
    expect(result.status).toBe(200);
    expect(result.headers.get("Cache-Control")).toBe("private, no-store");
    expect(result.headers.get("Location")).toBeNull();
    expect(result.headers.getSetCookie()).toHaveLength(1);
    expect(result.headers.getSetCookie()[0]).toMatch(/^better-auth\.session_token=.*HttpOnly.*Secure/);
    const value = await result.json();
    expect(value).toMatchObject({
      redirect: false, token: "p2-internal-only:preview-session-member",
      user: { id: data.actorIds.member, email: member.identity.email },
    });
    expect(JSON.stringify(value)).not.toContain(member.credentialPassword);
    expect(JSON.stringify(value)).not.toContain("ownerUserId");
    const nextRequest = new Request(baseUrl + "/api/auth/get-session", {
      headers: { Cookie: "better-auth.session_token=preview-owner-session",
        "X-Preview-Actor": "owner" },
    });
    const next = await route(flow, nextRequest);
    expect(await next.json()).toMatchObject({
      user: { id: data.actorIds.member },
      session: { id: "preview-session-member", userId: data.actorIds.member },
    });
  });

  it("can sign in a different credential user only with that account's password", async () => {
    const data = baseline();
    const flow = createP2AuthSessionFlow(data, "guest");
    const moderator = data.users.find((user) => user.identity.id === data.actorIds.moderator)!;
    const request = post(credential(moderator.identity.email, moderator.credentialPassword!));
    expect(await (await route(flow, request)).json()).toMatchObject({
      user: { id: data.actorIds.moderator, locale: "ru" },
      redirect: false,
    });
    expect((await flow.runtime.getSession(new Headers())).session?.user.id).toBe(data.actorIds.moderator);
    expect(data.assignments.find((a) => a.userId === data.actorIds.moderator)?.roleId).toBe("moderator");
  });

  it.each(["unknown", "bad-password", "google-only", "inactive"] as const)(
    "returns the same opaque 401 for %s credentials without an identity switch", async (mode) => {
      const data = baseline();
      const flow = createP2AuthSessionFlow(data, "guest");
      const member = data.users.find((u) => u.identity.id === data.actorIds.member)!;
      const source = mode === "google-only"
        ? data.users.find((u) => u.identity.id === data.ownerUserId)!
        : mode === "inactive"
          ? data.users.find((u) => u.identity.id === data.actorIds.inactive)! : member;
      const email = mode === "unknown" ? "absent@preview.invalid" : source.identity.email;
      const password = mode === "bad-password" || mode === "google-only"
        ? "Wrong-Password-2026!" : source.credentialPassword!;
      const response = await route(flow, post(credential(email, password)));
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password",
      });
      expect(response.headers.getSetCookie()).toEqual([]);
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect((await flow.runtime.getSession(new Headers())).session).toBeNull();
    });

  it("cannot elevate to Owner with forged actor/role/body fields", async () => {
    const data = baseline();
    const flow = createP2AuthSessionFlow(data, "guest");
    const member = data.users.find((u) => u.identity.id === data.actorIds.member)!;
    const request = new Request(baseUrl + "/api/auth/sign-in/email", {
      method: "POST", headers: {
        Origin: baseUrl, "Content-Type": "application/json",
        Cookie: "better-auth.session_token=preview-session-owner",
        "X-Preview-Actor": "owner",
      },
      body: credential(member.identity.email, member.credentialPassword!, {
        userId: data.ownerUserId, roleId: "admin", isOwner: true,
      }),
    });
    expect((await route(flow, request)).status).toBe(200);
    expect((await flow.runtime.getSession(new Headers())).session?.user.id).toBe(data.actorIds.member);
    expect(data.users.find((u) => u.identity.id === data.ownerUserId)?.credentialPassword).toBeNull();
  });

  it("rejects foreign Origin before validating credentials and does not mutate prior session", async () => {
    const data = baseline();
    const flow = createP2AuthSessionFlow(data, "owner");
    const member = data.users.find((u) => u.identity.id === data.actorIds.member)!;
    for (const origin of ["https://malicious.test", "null", "https://vico.test.attacker.test"]) {
      const response = await route(flow, post(
        credential(member.identity.email, member.credentialPassword!), "application/json", origin));
      expect(response.status).toBe(403);
      expect(response.headers.getSetCookie()).toEqual([]);
      expect((await flow.runtime.getSession(new Headers())).session?.user.id).toBe(data.ownerUserId);
    }
  });

  it("rejects malformed input, callback attacks and unsupported media without issuing a session", async () => {
    const data = baseline();
    const flow = createP2AuthSessionFlow(data, "guest");
    const member = data.users.find((u) => u.identity.id === data.actorIds.member)!;
    const cases: readonly [Request, number][] = [
      [post("{"), 400],
      [post("null"), 400],
      [post(credential("invalid-email", member.credentialPassword!)), 400],
      [post(JSON.stringify({ email: member.identity.email, password: null })), 400],
      [post(credential(member.identity.email, member.credentialPassword!, {
        callbackURL: "https://malicious.test/steal",
      })), 400],
      [post(credential(member.identity.email, member.credentialPassword!, {
        callbackURL: "//malicious.test/steal",
      })), 400],
      [post(credential(member.identity.email, member.credentialPassword!), "text/plain"), 415],
    ];
    for (const [request, expected] of cases) {
      const response = await route(flow, request);
      expect(response.status).toBe(expected);
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(response.headers.getSetCookie()).toEqual([]);
      expect((await flow.runtime.getSession(new Headers())).session).toBeNull();
    }
  });

  it("accepts canonical URL-encoded form with local callback, no external provider redirect", async () => {
    const data = baseline();
    const flow = createP2AuthSessionFlow(data, "guest");
    const member = data.users.find((u) => u.identity.id === data.actorIds.member)!;
    const params = new URLSearchParams({
      email: member.identity.email, password: member.credentialPassword!, callbackURL: "/en",
    });
    const response = await route(flow, post(params.toString(), "application/x-www-form-urlencoded"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Location")).toBe("/en");
    expect(await response.json()).toMatchObject({ redirect: true, url: "/en",
      user: { id: data.actorIds.member } });
  });

  it("preserves old context snapshot and raw identity when signing out and signing in again", async () => {
    const data = baseline();
    const flow = createP2AuthSessionFlow(data, "moderator");
    const moderator = data.users.find((u) => u.identity.id === data.actorIds.moderator)!;
    const before = (await flow.createRequestContext(new Request(baseUrl + "/en"))).context;
    const signout = new Request(baseUrl + "/api/auth/sign-out", { method: "POST", headers: { Origin: baseUrl } });
    expect((await route(flow, signout)).status).toBe(200);
    expect((await flow.runtime.getSession(new Headers())).session).toBeNull();
    const response = await route(flow, post(credential(moderator.identity.email, moderator.credentialPassword!)));
    expect(response.status).toBe(200);
    expect(authSessionForRequest(before)?.user.id).toBe(data.actorIds.moderator);
    expect((await flow.runtime.getSession(new Headers())).session?.user.id).toBe(data.actorIds.moderator);
    expect(data.topics.find((t) => t.id === "p0-preview-topic")?.authorId).toBe("sample-author");
    expect(() => assertP2RawBaselineIntegrity(data)).not.toThrow();
  });

  it("rejects inconsistent synthetic account method/password states at the shared seed boundary", () => {
    const data = baseline();
    const bad = { ...data, users: data.users.map((user) => user.identity.id === data.actorIds.member
      ? { ...user, credentialPassword: null } : user) };
    expect(() => assertP2RawBaselineIntegrity(bad)).toThrow("inconsistent synthetic credential");
    const badGoogle = { ...data, users: data.users.map((user) => user.identity.id === data.ownerUserId
      ? { ...user, credentialPassword: "Fake-Owner-2026!" } : user) };
    expect(() => assertP2RawBaselineIntegrity(badGoogle)).toThrow("inconsistent synthetic credential");
  });

  it("uses the actual Better Auth client transport and response parsing, without external fetch", async () => {
    const data = baseline();
    const flow = createP2AuthSessionFlow(data, "guest");
    const calls: string[] = [];
    const client = createAuthClient({
      baseURL: baseUrl,
      fetchOptions: {
        customFetchImpl: async (input, init) => {
          const request = new Request(input, init);
          calls.push(new URL(request.url).pathname);
          return route(flow, request);
        },
      },
    });
    const member = data.users.find((u) => u.identity.id === data.actorIds.member)!;
    const invalid = await client.signIn.email({
      email: member.identity.email, password: "Wrong-Password-2026!",
    });
    expect(invalid.data).toBeNull();
    expect(invalid.error?.status).toBe(401);
    expect(invalid.error?.code).toBe("INVALID_EMAIL_OR_PASSWORD");

    const valid = await client.signIn.email({
      email: member.identity.email, password: member.credentialPassword!,
    });
    expect(valid.error).toBeNull();
    expect(valid.data).toMatchObject({ redirect: false, user: { id: data.actorIds.member } });
    const session = await client.getSession();
    expect(session.data).toMatchObject({ user: { id: data.actorIds.member } });
    const signedOut = await client.signOut();
    expect(signedOut.error).toBeNull();
    expect(signedOut.data).toMatchObject({ success: true });
    expect((await client.getSession()).data).toBeNull();
    expect(calls).toContain("/api/auth/sign-in/email");
    expect(calls).toContain("/api/auth/get-session");
    expect(calls).toContain("/api/auth/sign-out");
    expect(calls.every((path) => path.startsWith("/api/auth/"))).toBe(true);
  });
});
