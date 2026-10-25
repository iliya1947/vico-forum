import { describe, expect, it } from "vitest";
import { credentialLocaleSearch, credentialReturnPath } from "./credential-path";

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
