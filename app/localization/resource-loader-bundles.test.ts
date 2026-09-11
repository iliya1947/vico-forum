import { describe, expect, it } from "vitest";
import { canonicalEnglishCatalog } from "./catalog";
import { sourceFingerprint } from "./fingerprint";
import { TranslationResourceLoader } from "./resource-loader";
import { CanonicalEnglishSource, LocalTranslationSource, type TranslationPack } from "./sources";

const locale = {
  translationLocale: "ru",
  fallbackLocales: ["en"],
  direction: "ltr" as const,
  formatting: { locale: "ru", timeZone: "UTC" },
  nativeName: "Русский",
  presentationMetadata: {},
};

async function pack(value: string): Promise<TranslationPack> {
  return {
    common: {
      heading: {
        value,
        sourceFingerprint: await sourceFingerprint(canonicalEnglishCatalog.common.heading),
      },
    },
  };
}

describe("TranslationResourceLoader compiled bundle metadata", () => {
  it("returns one deterministic version per locale and namespace", async () => {
    const loader = new TranslationResourceLoader([
      new LocalTranslationSource({ ru: await pack("Основа переводов") }),
      new CanonicalEnglishSource(),
    ]);

    const first = await loader.load(locale, ["common"]);
    const second = await loader.load(locale, ["common", "common"]);

    expect(first.bundleVersions.ru?.common).toMatch(/^[0-9a-f]{64}$/);
    expect(first.bundleVersions.en?.common).toMatch(/^[0-9a-f]{64}$/);
    expect(second.bundleVersions).toEqual(first.bundleVersions);
  });

  it("changes only the affected locale bundle version when its current resource changes", async () => {
    const first = await new TranslationResourceLoader([
      new LocalTranslationSource({ ru: await pack("Первый перевод") }),
      new CanonicalEnglishSource(),
    ]).load(locale, ["common"]);
    const second = await new TranslationResourceLoader([
      new LocalTranslationSource({ ru: await pack("Второй перевод") }),
      new CanonicalEnglishSource(),
    ]).load(locale, ["common"]);

    expect(second.bundleVersions.ru?.common).not.toBe(first.bundleVersions.ru?.common);
    expect(second.bundleVersions.en?.common).toBe(first.bundleVersions.en?.common);
  });
});
