import { describe, expect, it } from "vitest";
import { credentialLocaleSearch, credentialPagePath, credentialReturnPath, safeForumReturnPath, verificationReturnPath } from "./credential-path";

describe("account proof return-path privacy", () => {
  it.each(["#token=private-proof&purpose=email-change", "#%74oken=private-proof&purpose=email-change", "#purpose=email-change&token=private-proof"])("removes a proof before auth navigation: %s", hash => {
    const target = "/en/settings/account";
    expect(safeForumReturnPath("en", target, "", hash)).toBe(target);
    expect(credentialReturnPath("en", target + hash)).toBe(target);
    const link = credentialPagePath("en", "sign-in", target + hash);
    expect(new URL(link, "https://forum.invalid").searchParams.get("returnTo")).toBe(target);
    expect(link).not.toContain("private-proof");
    expect(credentialLocaleSearch("en", "he", "?" + new URLSearchParams({ returnTo: target + hash }))).not.toContain("private-proof");
  });
  it("also strips token-bearing query/fragment values from ordinary destinations", () => {
    expect(credentialReturnPath("en", "/en/topics/one?token=private-proof#post-two")).toBe("/en/topics/one");
    expect(credentialReturnPath("en", "/en/topics/one#token=private-proof")).toBe("/en/topics/one");
  });
});

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
