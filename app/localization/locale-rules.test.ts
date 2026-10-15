import { describe, expect, it } from "vitest";
import { IntlLocaleRulesProvider, LocaleRulesUnavailableError } from "./locale-rules";

describe("IntlLocaleRulesProvider", () => {
  const provider = new IntlLocaleRulesProvider();

  it("returns the target locale one/other cardinal branches", () => {
    expect(provider.pluralBranches("en")).toEqual(["one", "other"]);
  });

  it("returns the extended Arabic target branch set", () => {
    expect(provider.pluralBranches("ar")).toEqual(["few", "many", "one", "other", "two", "zero"]);
  });

  it.each(["not_a_locale", "zz-ZZ", "en-u-nu-arab"])(
    "reports unavailable or invalid locale rules for %s without an English fallback",
    (locale) => {
      expect(() => provider.pluralBranches(locale)).toThrow(LocaleRulesUnavailableError);
    },
  );
});
