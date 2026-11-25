import { describe, expect, it } from "vitest";
import { credentialLocaleSearch, credentialReturnPath, verificationReturnPath } from "./credential-path";

describe("credential language switching", () => {
  it("preserves a safe nested destination, query, fragment and other parameters", () => {
    const query = new URLSearchParams({ returnTo: "/en/topics/one?view=latest#post-two", error: "retry" });
    const remapped = new URLSearchParams(credentialLocaleSearch("en", "he", `?${query}`));
    expect(remapped.get("error")).toBe("retry");
    expect(credentialReturnPath("he", remapped.get("returnTo")))
      .toBe("/he/topics/one?view=latest#post-two");
  });

  it.each(["https://evil.test/en", "//evil.test/en", "/ru/topics/one", "/en/../../outside", "/\\evil.test/en"])(
    "keeps an unsafe old destination rejected: %s", (returnTo) => {
      const remapped = new URLSearchParams(credentialLocaleSearch("en", "he", `?${new URLSearchParams({ returnTo })}`));
      expect(remapped.get("returnTo")).toBe("/he");
    },
  );
});

describe("verification return destinations", () => {
  it("keeps a locale-local path but never a nested callback, query or token-bearing fragment", () => {
    expect(verificationReturnPath("he", "/he/topics/one?token=private#post-1")).toBe("/he/topics/one");
    expect(verificationReturnPath("he", "/he")).toBe("/he");
  });
  it.each(["https://evil.test/en", "//evil.test/en", "/ru/topics/one", "/en/../outside",
    "/en/%2e%2e/outside", "/en/%252foutside", "/en/verify-email?token=private",
    "/en/sign-in?returnTo=/en/topics/one", "/en/resend-verification"])("rejects unsafe return %s", value => {
    expect(verificationReturnPath("en", value)).toBe("/en");
  });
});
