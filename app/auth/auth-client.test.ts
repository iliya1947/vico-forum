import { beforeEach, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({ linkSocial: vi.fn(), signUp: { email: vi.fn() }, signIn: { social: vi.fn(), email: vi.fn() } }));
vi.mock("better-auth/react", () => ({ createAuthClient: () => sdk }));
import { linkGoogleAccount, emailAuthClientActions, authClientActions } from "./auth-client";

beforeEach(() => vi.clearAllMocks());

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

it("maps only the exact Better Auth email registration policy rejection to a closed result", async () => {
  sdk.signUp.email.mockResolvedValueOnce({ data: null, error: { code: "vico_email_registration_closed" } });
  expect(await emailAuthClientActions.signUpWithEmail("Member", "member@example.test", "password123")).toBe("closed");
  sdk.signUp.email.mockResolvedValueOnce({ data: null, error: { code: "OTHER_PROVIDER_ERROR" } });
  expect(await emailAuthClientActions.signUpWithEmail("Member", "member@example.test", "password123")).toBe(false);
  sdk.signUp.email.mockResolvedValueOnce({ data: { user: { id: "member" } }, error: null });
  expect(await emailAuthClientActions.signUpWithEmail("Member", "member@example.test", "password123")).toBe(true);
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
