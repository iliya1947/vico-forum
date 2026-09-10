import { describe, expect, it } from "vitest";
import type { LocaleDefinition } from "./locale";
import { InMemoryLocaleRegistry } from "./registry";

function locale(tag: string, fallbackChain: string[] = ["en"]): LocaleDefinition {
  return {
    tag,
    translationStatus: "draft",
    publicationStatus: "active",
    direction: "ltr",
    fallbackChain,
    nativeName: tag,
  };
}

describe("InMemoryLocaleRegistry", () => {
  it("always provides bootstrap English and accepts a data-only locale fixture", () => {
    const registry = new InMemoryLocaleRegistry([locale("sr-Latn")]);

    expect(registry.bootstrap.tag).toBe("en");
    expect(registry.find("sr-Latn")?.locale.tag).toBe("sr-Latn");
  });

  it("rejects invalid fallback and alias graphs", () => {
    expect(() => new InMemoryLocaleRegistry([locale("ru", ["missing"])]))
      .toThrow("Unknown fallback");
    expect(() => new InMemoryLocaleRegistry([locale("ru", ["de"]), locale("de", ["ru"])]))
      .toThrow("fallback cycle");
    expect(
      () =>
        new InMemoryLocaleRegistry([
          { ...locale("ru"), aliases: ["shared"] },
          { ...locale("de"), aliases: ["shared"] },
        ]),
    ).toThrow("Ambiguous locale alias");
  });
});
