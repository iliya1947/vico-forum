import { afterEach, beforeEach, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({ linkSocial: vi.fn(), signUp: { email: vi.fn() }, signIn: { social: vi.fn(), email: vi.fn() } }));
vi.mock("better-auth/react", () => ({ createAuthClient: () => sdk }));
import { linkGoogleAccount, emailAuthClientActions, authClientActions } from "./auth-client";

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

it("sends the visible profile identity on the same request that starts linking", async () => {
  sdk.linkSocial.mockResolvedValueOnce({ error: null });
  expect(await linkGoogleAccount("/en/users/profile-A", "profile-A")).toBe(true);
  expect(sdk.linkSocial).toHaveBeenCalledExactlyOnceWith({
    provider: "google", callbackURL: "/en/users/profile-A", errorCallbackURL: "/en/users/profile-A?linkError=1",
  }, { headers: { "x-vico-link-user": "profile-A" } });
});

it("reports identity conflict as failure without retrying under a different identity", async () => {
  sdk.linkSocial.mockResolvedValueOnce({ error: { code: "VICO_LINK_IDENTITY_CHANGED", status: 409 } });
  expect(await linkGoogleAccount("/en/users/profile-A", "profile-A")).toBe(false);
  expect(sdk.linkSocial).toHaveBeenCalledTimes(1);
});

it("accepts only neutral signup acknowledgement and maps safe failures", async () => {
  const fetcher = vi.fn()
    .mockResolvedValueOnce(Response.json({ code: "vico_email_registration_closed" }, { status: 403 }))
    .mockResolvedValueOnce(Response.json({ code: "OTHER_PROVIDER_ERROR" }, { status: 400 }))
    .mockResolvedValueOnce(Response.json({ status: true, token: null }))
    .mockResolvedValueOnce(Response.json({ user: { id: "member" } }))
    .mockResolvedValueOnce(new Response(null, { status: 429 }));
  vi.stubGlobal("fetch", fetcher);
  const sign = () => emailAuthClientActions.signUpWithEmail("Member", "member@example.test", "password123", "/en");
  expect(await sign()).toBe("closed");
  expect(await sign()).toBe(false);
  expect(await sign()).toBe(true);
  expect(await sign()).toBe(false);
  expect(await sign()).toBe("rate-limited");
  expect(sdk.signUp.email).not.toHaveBeenCalled();
  expect(fetcher).toHaveBeenCalledTimes(5);
  expect(fetcher.mock.calls[0][0]).toBe("/api/auth/sign-up/email");
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
    name: "Member", email: "member@example.test", password: "password123", callbackURL: "/en",
  });
});

it("passes the bounded locale credential error destination to native Better Auth OAuth", async () => {
  sdk.signIn.social.mockResolvedValueOnce({ data: { url: "https://accounts.google.com/test" }, error: null });
  const handlers = { onSuccess: vi.fn(), onError: vi.fn() };
  await authClientActions.signInWithGoogle("/en/topics/one", handlers,
    "/en/sign-up?returnTo=%2Fen%2Ftopics%2Fone");
  expect(sdk.signIn.social).toHaveBeenCalledExactlyOnceWith({
    provider: "google", callbackURL: "/en/topics/one",
    errorCallbackURL: "/en/sign-up?returnTo=%2Fen%2Ftopics%2Fone",
  }, { onSuccess: handlers.onSuccess, onError: handlers.onError });
});
