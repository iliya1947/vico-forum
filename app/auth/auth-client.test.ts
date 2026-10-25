import { beforeEach, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({ linkSocial: vi.fn() }));
vi.mock("better-auth/react", () => ({ createAuthClient: () => sdk }));
import { linkGoogleAccount } from "./auth-client";

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
