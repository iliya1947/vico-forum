import { createAuthClient } from "better-auth/react";
import { describe, expect, it } from "vitest";
import { authSessionForRequest } from "../../auth/request-context";
import { action as authAction, loader as authLoader } from "../../routes/auth-api";
import { createP2RawBaseline, assertP2RawBaselineIntegrity } from "./raw-baseline";
import { createP2AuthSessionFlow } from "./session-context";

const origin = "https://vico.test";
const baseline = () => createP2RawBaseline(new Date("2026-11-24T10:00:00Z"));
const google = (options: Record<string, unknown> = {}) =>
  new Request(origin + "/api/auth/sign-in/social", {
    method: "POST", headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ provider: "google", callbackURL: "/en/topics/preview",
      errorCallbackURL: "/en/sign-up?returnTo=forum", ...options }),
  });
type Flow = ReturnType<typeof createP2AuthSessionFlow>;
async function route(flow: Flow, request: Request) {
  const { context } = await flow.createRequestContext(request);
  return request.method === "GET"
    ? authLoader({ request, context })
    : authAction({ request, context });
}
async function start(flow: Flow, options: Record<string, unknown> = {}) {
  const response = await route(flow, google(options));
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  const envelope = await response.json() as { url: string; redirect: boolean };
  expect(new URL(envelope.url).origin).toBe(origin);
  expect(new URL(envelope.url).pathname).toBe("/api/auth/callback/google");
  expect(envelope.url).not.toContain("accounts.google.com");
  expect(envelope.url).not.toContain("id_token");
  return { response, envelope };
}
async function follow(flow: Flow, url: string) {
  return route(flow, new Request(url));
}

describe("P2 simulated local Google provider result through canonical Auth HTTP", () => {
  it("uses one-shot local start/callback, then the original session context for raw Google author", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "guest");
    const previous = (await flow.createRequestContext(new Request(origin + "/en"))).context;
    const { response, envelope } = await start(flow);
    expect(envelope.redirect).toBe(true);
    expect(response.headers.get("Location")).toBe(envelope.url);
    expect((await flow.runtime.getSession(new Headers())).session).toBeNull();

    const result = await follow(flow, envelope.url);
    expect(result.status).toBe(302);
    expect(result.headers.get("Location")).toBe("/en/topics/preview");
    expect(result.headers.get("Cache-Control")).toBe("private, no-store");
    expect(result.headers.getSetCookie()).toHaveLength(1);
    expect(result.headers.getSetCookie()[0]).toContain("HttpOnly");
    expect(result.headers.getSetCookie()[0]).toContain("Secure");
    expect(authSessionForRequest(previous)).toBeNull();

    const next = (await flow.createRequestContext(new Request(origin + "/en"))).context;
    expect(authSessionForRequest(next)?.user.id).toBe("sample-author");
    expect(authSessionForRequest(next)?.user.id).not.toBe(seed.ownerUserId);
    expect(authSessionForRequest(next)?.session.userId).toBe("sample-author");
    const sessionResult = await route(flow, new Request(origin + "/api/auth/get-session"));
    expect(await sessionResult.json()).toMatchObject({
      user: { id: "sample-author", name: "Preview author" },
      session: { id: "preview-google-session-1", userId: "sample-author" },
    });
    expect(seed.domains.sessions.some((session) => session.userId === "sample-author")).toBe(false);
    expect(() => assertP2RawBaselineIntegrity(seed)).not.toThrow();
  });

  it.each(["admin", "owner"] as const)(
    "trusts the preview-selected %s raw Google identity, not client role/email claims", async (actor) => {
      const seed = baseline();
      const flow = createP2AuthSessionFlow(seed, actor);
      const { envelope } = await start(flow, {
        loginHint: "preview-owner@preview.invalid",
        userId: "preview-owner", actor: "owner", roleId: "admin", isOwner: true,
        additionalData: { userId: "preview-owner", role: "owner" },
      });
      const response = await follow(flow, envelope.url);
      expect(response.status).toBe(302);
      expect((await flow.runtime.getSession(new Headers())).session?.user.id).toBe(seed.actorIds[actor]);
      expect((await flow.runtime.getSession(new Headers())).session?.user).not.toHaveProperty("role");
      expect(seed.assignments.find((entry) => entry.userId === seed.ownerUserId)?.roleId)
        .toBe("user");
    });

  it("ignores forged Owner login hint for Guest even if headers impersonate an authenticated Owner", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "guest");
    const request = google({ loginHint: "preview-owner@preview.invalid", userId: seed.ownerUserId });
    request.headers.set("Cookie", "better-auth.session_token=preview-session-owner");
    request.headers.set("X-Preview-Actor", "owner");
    const response = await route(flow, request);
    const data = await response.json() as {url:string};
    const forged = new URL(data.url);
    forged.searchParams.set("userId", seed.ownerUserId);
    forged.searchParams.set("isOwner", "true");
    expect((await follow(flow, forged.toString())).status).toBe(302);
    expect((await flow.runtime.getSession(new Headers())).session?.user.id).toBe("sample-author");
    expect((await flow.runtime.getSession(new Headers())).session?.user.id).not.toBe(seed.ownerUserId);
  });

  it("preserves existing Google sign-in when new Google registrations are closed", async () => {
    const seed = baseline();
    const flags = seed.domains.registrationSettings as { googleRegistrationEnabled: boolean };
    flags.googleRegistrationEnabled = false;
    const flow = createP2AuthSessionFlow(seed, "guest");
    const { envelope } = await start(flow);
    const response = await follow(flow, envelope.url);
    expect(response.status).toBe(302);
    expect((await flow.runtime.getSession(new Headers())).session?.user.id).toBe("sample-author");
  });

  it("registers a new synthetic Google account only after callback, redirects to local new-user target", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "guest", "new-account");
    const { envelope } = await start(flow, { newUserCallbackURL: "/ru/welcome?source=google" });
    expect((await flow.runtime.getSession(new Headers())).session).toBeNull();
    expect(seed.users.some((u) => u.identity.id === "preview-google-registered")).toBe(false);
    const response = await follow(flow, envelope.url);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/ru/welcome?source=google");
    expect(response.headers.getSetCookie()).toHaveLength(1);
    const active = (await flow.runtime.getSession(new Headers())).session;
    expect(active?.user).toMatchObject({
      id: "preview-google-registered", email: "preview-google-new@preview.invalid",
      emailVerified: true,
    });
    expect(active?.user).not.toHaveProperty("role");
    expect(seed.users.some((u) => u.identity.id === active?.user.id)).toBe(false);
    expect(seed.assignments.some((a) => a.userId === active?.user.id)).toBe(false);
    expect(() => assertP2RawBaselineIntegrity(seed)).not.toThrow();
  });

  it("checks the Google registration policy at callback time, not at start", async () => {
    const seed = baseline();
    const flags = seed.domains.registrationSettings as { googleRegistrationEnabled: boolean };
    const flow = createP2AuthSessionFlow(seed, "guest", "new-account");
    const { envelope } = await start(flow);
    flags.googleRegistrationEnabled = false;
    const response = await follow(flow, envelope.url);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "/en/sign-up?returnTo=forum&error=vico_google_registration_closed");
    expect(response.headers.getSetCookie()).toEqual([]);
    expect((await flow.runtime.getSession(new Headers())).session).toBeNull();
    flags.googleRegistrationEnabled = true;
    const fresh = await start(flow);
    expect((await follow(flow, fresh.envelope.url)).status).toBe(302);
    expect((await flow.runtime.getSession(new Headers())).session?.user.id)
      .toBe("preview-google-registered");
  });

  it("does not retroactively deny an already-created Google identity when new registration closes", async () => {
    const seed = baseline();
    const flags = seed.domains.registrationSettings as { googleRegistrationEnabled: boolean };
    const flow = createP2AuthSessionFlow(seed, "guest", "new-account");
    expect((await follow(flow, (await start(flow)).envelope.url)).status).toBe(302);
    expect((await route(flow, new Request(origin + "/api/auth/sign-out", {
      method: "POST", headers: { Origin: origin },
    }))).status).toBe(200);
    flags.googleRegistrationEnabled = false;
    const retry = await start(flow);
    const response = await follow(flow, retry.envelope.url);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/en/topics/preview");
    expect((await flow.runtime.getSession(new Headers())).session?.user.id)
      .toBe("preview-google-registered");
  });

  it("redirects denied local provider result to the safe error URL, without mutating identity", async () => {
    const seed = baseline();
    const flow = createP2AuthSessionFlow(seed, "member", "provider-denied");
    const { envelope } = await start(flow);
    expect(new URL(envelope.url).searchParams.get("error")).toBe("access_denied");
    const denied = await follow(flow, envelope.url);
    expect(denied.status).toBe(302);
    expect(denied.headers.get("Location")).toBe("/en/sign-up?returnTo=forum&error=access_denied");
    expect(denied.headers.getSetCookie()).toEqual([]);
    expect((await flow.runtime.getSession(new Headers())).session?.user.id).toBe(seed.actorIds.member);
    const replay = await follow(flow, envelope.url);
    expect(replay.status).toBe(400);
    expect(await replay.json()).toEqual({ code: "INVALID_OAUTH_STATE" });
  });

  it("rejects missing, forged, expired-by-new-start and replayed states without a session", async () => {
    const flow = createP2AuthSessionFlow(baseline(), "guest");
    const first = await start(flow);
    const url = new URL(first.envelope.url);
    url.searchParams.set("state", "forged");
    expect((await follow(flow, url.toString())).status).toBe(400);
    expect((await flow.runtime.getSession(new Headers())).session).toBeNull();

    const second = await start(flow);
    expect((await follow(flow, first.envelope.url)).status).toBe(400);
    const success = await follow(flow, second.envelope.url);
    expect(success.status).toBe(302);
    expect((await follow(flow, second.envelope.url)).status).toBe(400);
    expect((await flow.runtime.getSession(new Headers())).session?.user.id).toBe("sample-author");
  });

  it("isolates pending state and profile selection across independent preview flows", async () => {
    const seed = baseline();
    const a = createP2AuthSessionFlow(seed, "guest");
    const b = createP2AuthSessionFlow(seed, "owner");
    const target = (await start(a)).envelope.url;
    expect((await follow(b, target)).status).toBe(400);
    expect((await b.runtime.getSession(new Headers())).session?.user.id).toBe(seed.ownerUserId);
    expect((await follow(a, target)).status).toBe(302);
    expect((await a.runtime.getSession(new Headers())).session?.user.id).toBe("sample-author");
    expect((await b.runtime.getSession(new Headers())).session?.user.id).toBe(seed.ownerUserId);
  });

  it("never signs in inactive actor or invents a Google account", async () => {
    const flow = createP2AuthSessionFlow(baseline(), "inactive");
    const { envelope } = await start(flow);
    const response = await follow(flow, envelope.url);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "/en/sign-up?returnTo=forum&error=account_unavailable");
    expect(response.headers.getSetCookie()).toEqual([]);
    expect((await flow.runtime.getSession(new Headers())).session).toBeNull();
  });

  it("validates safe return URLs and never emits an external provider address", async () => {
    const flow = createP2AuthSessionFlow(baseline(), "guest");
    for (const [key, value] of [
      ["callbackURL", "https://evil.test/welcome"],
      ["callbackURL", "//evil.test/welcome"],
      ["callbackURL", "/\\evil.test"],
      ["errorCallbackURL", "https://evil.test/error"],
      ["newUserCallbackURL", "//evil.test/welcome"],
      ["disableRedirect", "yes"],
    ] as const) {
      const response = await route(flow, google({ [key]: value }));
      expect(response.status).toBe(400);
      expect(response.headers.getSetCookie()).toEqual([]);
    }
    const { envelope, response } = await start(flow, { disableRedirect: true });
    expect(envelope.redirect).toBe(false);
    expect(response.headers.get("Location")).toBeNull();
    expect(new URL(envelope.url).origin).toBe(origin);
  });

  it("refuses non-Google providers and idToken payloads without contacting providers", async () => {
    const flow = createP2AuthSessionFlow(baseline(), "guest");
    const notGoogle = await route(flow, google({ provider: "github" }));
    expect(notGoogle.status).toBe(404);
    expect(await notGoogle.json()).toEqual({ code: "PROVIDER_NOT_FOUND" });
    const idToken = await route(flow, google({ idToken: { token: "forged" } }));
    expect(idToken.status).toBe(400);
    expect(await idToken.json()).toEqual({ code: "UNSUPPORTED_GOOGLE_TOKEN_FLOW" });
    expect((await flow.runtime.getSession(new Headers())).session).toBeNull();
  });

  it("rejects malformed JSON, foreign Origin, wrong methods and unsupported media", async () => {
    const flow = createP2AuthSessionFlow(baseline(), "guest");
    const invalid = [
      new Request(origin + "/api/auth/sign-in/social", {
        method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: "{",
      }),
      new Request(origin + "/api/auth/sign-in/social", {
        method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: "null",
      }),
    ];
    for (const request of invalid) expect((await route(flow, request)).status).toBe(400);
    const badMedia = new Request(origin + "/api/auth/sign-in/social", {
      method: "POST", headers: { "Content-Type": "text/plain" }, body: "hello",
    });
    expect((await route(flow, badMedia)).status).toBe(415);
    const foreign = google();
    foreign.headers.set("Origin", "https://evil.test");
    expect((await route(flow, foreign)).status).toBe(403);
    const wrong = await route(flow, new Request(origin + "/api/auth/sign-in/social"));
    expect(wrong.status).toBe(405);
    expect(wrong.headers.get("Allow")).toBe("POST");
    expect((await flow.runtime.getSession(new Headers())).session).toBeNull();
  });

  it("accepts callback POST to GET redirect but requires the same pending state on GET", async () => {
    const flow = createP2AuthSessionFlow(baseline(), "guest");
    const { envelope } = await start(flow);
    const callback = new URL(envelope.url);
    const post = await route(flow, new Request(origin + "/api/auth/callback/google", {
      method: "POST", headers: {
        Origin: origin, "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ state: callback.searchParams.get("state")!,
        code: callback.searchParams.get("code")! }).toString(),
    }));
    expect(post.status).toBe(302);
    expect(post.headers.getSetCookie()).toEqual([]);
    expect((await flow.runtime.getSession(new Headers())).session).toBeNull();
    const get = await route(flow, new Request(new URL(post.headers.get("Location")!, origin)));
    expect(get.status).toBe(302);
    expect(get.headers.get("Location")).toBe("/en/topics/preview");
    expect((await flow.runtime.getSession(new Headers())).session?.user.id).toBe("sample-author");
  });

  it("uses genuine Better Auth React client with local transport and zero external fetches", async () => {
    const flow = createP2AuthSessionFlow(baseline(), "guest");
    const urls: string[] = [];
    const client = createAuthClient({
      baseURL: origin,
      fetchOptions: {
        customFetchImpl: async (input, init) => {
          const request = new Request(input, init);
          urls.push(request.url);
          return route(flow, request);
        },
      },
    });
    const signIn = await client.signIn.social({
      provider: "google", callbackURL: "/en/topics/preview", errorCallbackURL: "/en/sign-up",
      disableRedirect: true,
    });
    expect(signIn.error).toBeNull();
    expect(signIn.data).toMatchObject({ redirect: false });
    const callbackUrl = (signIn.data as { url: string }).url;
    expect(new URL(callbackUrl).origin).toBe(origin);
    expect((await route(flow, new Request(callbackUrl))).status).toBe(302);
    expect((await client.getSession()).data).toMatchObject({ user: { id: "sample-author" } });
    const signedOut = await client.signOut();
    expect(signedOut.error).toBeNull();
    expect((await client.getSession()).data).toBeNull();
    expect(urls).toContain(origin + "/api/auth/sign-in/social");
    expect(urls.every((url) => new URL(url).origin === origin)).toBe(true);
    expect(urls.some((url) => url.includes("google.com"))).toBe(false);
  });

  it("fails closed on invalid Google registration policy at callback", async () => {
    const seed = baseline();
    const settings = seed.domains.registrationSettings as { version: number };
    const flow = createP2AuthSessionFlow(seed, "guest", "new-account");
    const { envelope } = await start(flow);
    settings.version = 0;
    await expect(follow(flow, envelope.url)).rejects.toThrow("Google registration settings");
    expect((await flow.runtime.getSession(new Headers())).session).toBeNull();
  });
});
