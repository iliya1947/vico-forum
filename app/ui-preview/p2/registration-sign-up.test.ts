import { createAuthClient } from "better-auth/react";
import { describe, expect, it } from "vitest";
import { authSessionForRequest } from "../../auth/request-context";
import { action as authApiAction, loader as authApiLoader } from "../../routes/auth-api";
import { assertP2RawBaselineIntegrity, createP2RawBaseline } from "./raw-baseline";
import { createP2AuthSessionFlow } from "./session-context";

const baseUrl = "https://vico.test";
const baseline = () => createP2RawBaseline(new Date("2026-11-24T10:00:00.000Z"));
const signup = (body: unknown, origin: string | null = baseUrl) =>
  new Request(baseUrl + "/api/auth/sign-up/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(origin === null ? {} : { Origin: origin }) },
    body: JSON.stringify(body),
  });
const applicant = (email = "new-member@preview.invalid", extra: Record<string, unknown> = {}) => ({
  name: "New member", email, password: "Preview-NewMember-2026!", ...extra,
});
async function routed(flow: ReturnType<typeof createP2AuthSessionFlow>, request: Request) {
  const { context } = await flow.createRequestContext(request);
  return request.method === "GET"
    ? authApiLoader({ request, context })
    : authApiAction({ request, context });
}
function withEmailRegistration(enabled: boolean) {
  const seed = baseline();
  return { ...seed, domains: { ...seed.domains, registrationSettings: {
    ...seed.domains.registrationSettings, emailRegistrationEnabled: enabled,
  } } };
}

describe("P2 bounded Better Auth email registration and actual client transport", () => {
  it("creates one transient fixture account, returns pinned {token,user}, then authenticates fresh contexts", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "guest");
    const previous = (await flow.createRequestContext(new Request(baseUrl + "/en"))).context;
    const response = await routed(flow, signup(applicant()));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Pragma")).toBe("no-cache");
    expect(response.headers.getSetCookie()).toHaveLength(1);
    expect(response.headers.getSetCookie()[0]).toContain("HttpOnly");
    expect(response.headers.getSetCookie()[0]).toContain("Secure");
    expect(response.headers.get("Location")).toBeNull();
    const responseBody = await response.json();
    expect(responseBody).toMatchObject({
      token: "p2-internal-only:preview-registered-session-1",
      user: {
        id: "preview-registered-1", email: "new-member@preview.invalid",
        name: "New member", emailVerified: false, image: null,
        createdAt: seed.referenceTime.toISOString(),
      },
    });
    expect(JSON.stringify(responseBody)).not.toContain("Preview-NewMember-2026!");
    expect(JSON.stringify(responseBody)).not.toContain("credentialPassword");
    expect(JSON.stringify(responseBody)).not.toContain("preview-owner");
    expect(authSessionForRequest(previous)).toBeNull();
    const after = (await flow.createRequestContext(new Request(baseUrl + "/en"))).context;
    expect(authSessionForRequest(after)?.user.id).toBe("preview-registered-1");
    expect(authSessionForRequest(after)?.session.userId).toBe("preview-registered-1");
    const session = await routed(flow, new Request(baseUrl + "/api/auth/get-session"));
    expect(await session.json()).toMatchObject({
      user: { id: "preview-registered-1", emailVerified: false },
      session: { id: "preview-registered-session-1", userId: "preview-registered-1" },
    });
    expect(seed.users.some((user) => user.identity.id === "preview-registered-1")).toBe(false);
    expect(seed.domains.sessions.some((item) => item.userId === "preview-registered-1")).toBe(false);
    expect(() => assertP2RawBaselineIntegrity(seed)).not.toThrow();
  });

  it("denies new email accounts under closed policy while keeping existing sign-in enabled", async () => {
    const seed = withEmailRegistration(false);
    expect(seed.domains.registrationSettings.googleRegistrationEnabled).toBe(true);
    const flow = createP2AuthSessionFlow(seed, "guest");
    const response = await routed(flow, signup(applicant()));
    expect(response.status).toBe(403);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(await response.json()).toMatchObject({ code: "vico_email_registration_closed" });
    expect((await flow.runtime.getSession(new Headers())).session).toBeNull();
    const member = seed.users.find((user) => user.identity.id === seed.actorIds.member)!;
    const existingLogin = await routed(flow, new Request(baseUrl + "/api/auth/sign-in/email", {
      method: "POST", headers: { "Content-Type": "application/json", Origin: baseUrl },
      body: JSON.stringify({ email: member.identity.email, password: member.credentialPassword }),
    }));
    expect(existingLogin.status).toBe(200);
    expect((await flow.runtime.getSession(new Headers())).session?.user.id).toBe(seed.actorIds.member);
    // Repeated denied registration must never switch the existing session.
    expect((await routed(flow, signup(applicant()))).status).toBe(403);
    expect((await flow.runtime.getSession(new Headers())).session?.user.id).toBe(seed.actorIds.member);
  });

  it("denies duplicates of both baseline and newly created accounts without linking identities", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "guest");
    const existing = seed.users.find((u) => u.identity.id === seed.ownerUserId)!;
    const duplicate = await routed(flow, signup(applicant(existing.identity.email.toUpperCase())));
    expect(duplicate.status).toBe(422);
    expect(await duplicate.json()).toMatchObject({ code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" });
    expect((await flow.runtime.getSession(new Headers())).session).toBeNull();
    expect((await routed(flow, signup(applicant()))).status).toBe(200);
    const replay = await routed(flow, signup(applicant("NEW-MEMBER@preview.invalid")));
    expect(replay.status).toBe(422);
    expect(replay.headers.getSetCookie()).toEqual([]);
    expect((await flow.runtime.getSession(new Headers())).session?.user.id).toBe("preview-registered-1");
    expect(seed.assignments.find((role) => role.userId === seed.ownerUserId)?.roleId).toBe("user");
  });

  it("never authorizes role/Owner/account fields supplied by registration body or headers", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "guest");
    const request = signup(applicant("forged@preview.invalid", {
      name: "  Safe Name  ", userId: seed.ownerUserId, roleId: "admin",
      isOwner: true, emailVerified: true, methods: ["google"],
      credentialPassword: "attempted overwrite", image: "https://outside.test/track.png",
    }));
    request.headers.set("x-preview-actor", "owner");
    request.headers.set("cookie", "better-auth.session_token=preview-session-owner");
    const response = await routed(flow, request);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      user: { id: "preview-registered-1", name: "Safe Name", emailVerified: false, image: null },
    });
    expect((await flow.runtime.getSession(new Headers())).session?.user.id).toBe("preview-registered-1");
    expect(seed.ownerUserId).toBe("preview-owner");
    expect(seed.assignments.some((assignment) => assignment.userId === "preview-registered-1")).toBe(false);
    expect(seed.users.find((u) => u.identity.id === seed.ownerUserId)?.credentialPassword).toBeNull();
  });

  it("rejects foreign, null and malformed Origin before any mutation", async () => {
    const flow = createP2AuthSessionFlow(baseline(), "member");
    for (const origin of ["https://evil.test", "null", "https://vico.test.evil.test"]) {
      const response = await routed(flow, signup(applicant(), origin));
      expect(response.status).toBe(403);
      expect(response.headers.getSetCookie()).toEqual([]);
      expect((await flow.runtime.getSession(new Headers())).session?.user.id).toBe("p0-preview-user");
    }
  });

  it("rejects invalid names, emails, passwords and callback destinations", async () => {
    const flow = createP2AuthSessionFlow(baseline(), "guest");
    const inputs = [
      applicant("invalid-email"), applicant("bad@preview.invalid", { name: " " }),
      applicant("long@preview.invalid", { name: "X".repeat(101) }),
      applicant("short@preview.invalid", { password: "short" }),
      applicant("long-password@preview.invalid", { password: "X".repeat(129) }),
      applicant("bad-callback@preview.invalid", { callbackURL: "https://outside.test/en" }),
      applicant("bad-callback2@preview.invalid", { callbackURL: "//outside.test/en" }),
      applicant("bad-callback3@preview.invalid", { callbackURL: "/\\outside.test" }),
      { email: "missing-name@preview.invalid", password: "Preview-Password-2026!" },
      null,
    ];
    for (const input of inputs) {
      const response = await routed(flow, signup(input));
      expect(response.status).toBe(400);
      expect(response.headers.getSetCookie()).toEqual([]);
      expect((await flow.runtime.getSession(new Headers())).session).toBeNull();
    }
  });

  it("fails unsupported media, malformed JSON and wrong method without creating an account", async () => {
    const flow = createP2AuthSessionFlow(baseline(), "guest");
    const cases = [
      new Request(baseUrl + "/api/auth/sign-up/email", { method: "POST",
        headers: { Origin: baseUrl, "Content-Type": "text/plain" }, body: "hello" }),
      new Request(baseUrl + "/api/auth/sign-up/email", { method: "POST",
        headers: { Origin: baseUrl, "Content-Type": "application/json" }, body: "{" }),
    ];
    expect((await routed(flow, cases[0]!)).status).toBe(415);
    expect((await routed(flow, cases[1]!)).status).toBe(400);
    const wrong = await routed(flow, new Request(baseUrl + "/api/auth/sign-up/email"));
    expect(wrong.status).toBe(405);
    expect(wrong.headers.get("Allow")).toBe("POST");
    expect((await flow.runtime.getSession(new Headers())).session).toBeNull();
  });

  it("accepts the standard URL-encoded body but does not follow external verification flows", async () => {
    const flow = createP2AuthSessionFlow(baseline(), "guest");
    const body = new URLSearchParams({
      name: "Encoded member", email: "encoded@preview.invalid",
      password: "Preview-Encoded-2026!", callbackURL: "/en",
    });
    const request = new Request(baseUrl + "/api/auth/sign-up/email", {
      method: "POST",
      headers: { Origin: baseUrl, "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const response = await routed(flow, request);
    expect(response.status).toBe(200);
    expect(response.headers.get("Location")).toBeNull();
    expect(await response.json()).toMatchObject({
      user: { id: "preview-registered-1", name: "Encoded member" },
    });
  });

  it("checks policy on each creation rather than caching the initial open result", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "guest");
    expect((await routed(flow, signup(applicant("first@preview.invalid")))).status).toBe(200);
    // Simulated scenario policy flip within a single isolated runtime.
    const settings = seed.domains.registrationSettings as { emailRegistrationEnabled: boolean };
    settings.emailRegistrationEnabled = false;
    const response = await routed(flow, signup(applicant("second@preview.invalid")));
    expect(response.status).toBe(403);
    expect((await flow.runtime.getSession(new Headers())).session?.user.id).toBe("preview-registered-1");
    settings.emailRegistrationEnabled = true;
    const allowed = await routed(flow, signup(applicant("second@preview.invalid")));
    expect(allowed.status).toBe(200);
    expect((await flow.runtime.getSession(new Headers())).session?.user.id).toBe("preview-registered-2");
  });

  it("fails loudly for invalid registration policy rather than silently opening creation", async () => {
    const seed = withEmailRegistration(true);
    const invalid = { ...seed, domains: { ...seed.domains,
      registrationSettings: { ...seed.domains.registrationSettings, version: 0 },
    } };
    const flow = createP2AuthSessionFlow(invalid, "guest");
    await expect(routed(flow, signup(applicant()))).rejects.toThrow("registration settings");
    expect((await flow.runtime.getSession(new Headers())).session).toBeNull();
  });

  it("keeps newly registered credentials inside one flow; sign-out and re-sign-in work", async () => {
    const seed = baseline();
    const first = createP2AuthSessionFlow(seed, "guest");
    expect((await routed(first, signup(applicant()))).status).toBe(200);
    const second = createP2AuthSessionFlow(seed, "guest");
    const lost = await routed(second, new Request(baseUrl + "/api/auth/sign-in/email", {
      method: "POST", headers: { Origin: baseUrl, "Content-Type": "application/json" },
      body: JSON.stringify({ email: applicant().email, password: applicant().password }),
    }));
    expect(lost.status).toBe(401);
    const signedOut = await routed(first, new Request(baseUrl + "/api/auth/sign-out", {
      method: "POST", headers: { Origin: baseUrl },
    }));
    expect(signedOut.status).toBe(200);
    expect((await first.runtime.getSession(new Headers())).session).toBeNull();
    const restored = await routed(first, new Request(baseUrl + "/api/auth/sign-in/email", {
      method: "POST", headers: { Origin: baseUrl, "Content-Type": "application/json" },
      body: JSON.stringify({ email: applicant().email, password: applicant().password }),
    }));
    expect(restored.status).toBe(200);
    expect((await first.runtime.getSession(new Headers())).session?.user.id).toBe("preview-registered-1");
    expect(seed.topics.find((topic) => topic.id === "p0-preview-topic")?.authorId).toBe("sample-author");
  });

  it("uses the actual Better Auth React client for sign-up, closed error, session and sign-out", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "guest");
    const paths: string[] = [];
    const client = createAuthClient({
      baseURL: baseUrl,
      fetchOptions: {
        customFetchImpl: async (input, init) => {
          const request = new Request(input, init);
          paths.push(new URL(request.url).pathname);
          return routed(flow, request);
        },
      },
    });
    const created = await client.signUp.email(applicant("sdk@preview.invalid"));
    expect(created.error).toBeNull();
    expect(created.data).toMatchObject({
      token: "p2-internal-only:preview-registered-session-1",
      user: { id: "preview-registered-1", email: "sdk@preview.invalid", emailVerified: false },
    });
    expect((await client.getSession()).data).toMatchObject({
      user: { id: "preview-registered-1" },
    });
    const signedOut = await client.signOut();
    expect(signedOut.error).toBeNull();
    expect((await client.getSession()).data).toBeNull();
    const signedIn = await client.signIn.email({
      email: "sdk@preview.invalid", password: applicant().password,
    });
    expect(signedIn.error).toBeNull();
    expect(signedIn.data).toMatchObject({ user: { id: "preview-registered-1" } });
    expect(paths).toContain("/api/auth/sign-up/email");
    expect(paths).toContain("/api/auth/sign-in/email");
    expect(paths).toContain("/api/auth/get-session");
    expect(paths).toContain("/api/auth/sign-out");
    expect(paths.every((path) => path.startsWith("/api/auth/"))).toBe(true);
  });

  it("exposes exact closed-registration error through the actual SDK; no login transition", async () => {
    const flow = createP2AuthSessionFlow(withEmailRegistration(false), "guest");
    const client = createAuthClient({
      baseURL: baseUrl,
      fetchOptions: { customFetchImpl: async (input, init) =>
        routed(flow, new Request(input, init)) },
    });
    const rejected = await client.signUp.email(applicant());
    expect(rejected.data).toBeNull();
    expect(rejected.error?.status).toBe(403);
    expect(rejected.error?.code).toBe("vico_email_registration_closed");
    expect((await flow.runtime.getSession(new Headers())).session).toBeNull();
  });
});
