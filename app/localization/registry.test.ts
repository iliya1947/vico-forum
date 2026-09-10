import { describe, expect, it } from "vitest";
import type { LocaleDefinition } from "./locale";
import { InMemoryLocaleRegistry } from "./registry";

function locale(tag: string, fallbackChain: readonly string[] = ["en"]): LocaleDefinition {
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

  it.each(["api", "ASSETS"])("rejects reserved canonical locale %s", (tag) => {
    expect(() => new InMemoryLocaleRegistry([locale(tag)])).toThrow("reserved top-level segment");
  });

  it.each(["api", "assets-u-ca-gregory"])("rejects reserved canonicalized alias or matchTag %s", (tag) => {
    expect(() => new InMemoryLocaleRegistry([{ ...locale("fr"), aliases: [tag] }])).toThrow(
      "reserved top-level segment",
    );
    expect(() => new InMemoryLocaleRegistry([{ ...locale("fr"), matchTags: [tag] }])).toThrow(
      "reserved top-level segment",
    );
  });

  it("allows a locale tag whose prefix only resembles a reserved segment", () => {
    expect(new InMemoryLocaleRegistry([locale("api-BR")]).find("api-BR")?.locale.tag).toBe("api-BR");
  });

  it("keeps registry snapshots and matches immutable and detached from configuration", () => {
    const fallbackChain = ["en"];
    const aliases = ["fr-FR"];
    const matchTags = ["fr-Latn"];
    const presentationMetadata = { menuLabel: "French" };
    const registry = new InMemoryLocaleRegistry([
      { ...locale("fr", fallbackChain), aliases, matchTags, presentationMetadata },
    ]);
    const match = registry.find("fr")!;

    fallbackChain.push("de");
    aliases.push("fr-CA");
    matchTags.push("fr-BE");
    presentationMetadata.menuLabel = "Changed";

    expect(match.locale.fallbackChain).toEqual(["en"]);
    expect(match.locale.aliases).toEqual(["fr-FR"]);
    expect(match.locale.matchTags).toEqual(["fr-Latn"]);
    expect(match.locale.presentationMetadata).toEqual({ menuLabel: "French" });
    expect(Object.isFrozen(match)).toBe(true);
    expect(Object.isFrozen(match.locale)).toBe(true);
    expect(Object.isFrozen(match.locale.fallbackChain)).toBe(true);
    expect(Object.isFrozen(match.locale.aliases)).toBe(true);
    expect(Object.isFrozen(match.locale.matchTags)).toBe(true);
    expect(Object.isFrozen(match.locale.presentationMetadata)).toBe(true);
  });
});
