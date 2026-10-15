import { describe, expect, it, vi } from "vitest";
import { compileNamespaceBundle, type TranslationBundleStore } from "./bundles";
import { canonicalEnglishCatalog } from "./catalog";
import { sourceFingerprint } from "./fingerprint";
import { TranslationResourceLoader } from "./resource-loader";
import { CanonicalEnglishSource, LocalTranslationSource, type TranslationPack } from "./sources";
import { createTranslationRuntime } from "./runtime";

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

  it("uses persisted exact-locale bundles without reading raw persistent translations", async () => {
    const persisted = await compileNamespaceBundle("ru", "common", { heading: "Сохранённый пакет" });
    const rawPersistent = { load: vi.fn(async () => ({ resources: {}, staleKeys: [], version: "raw" })) };
    const bundles: TranslationBundleStore = {
      read: vi.fn(async (tag, namespace) => tag === "ru" && namespace === "common" ? persisted : undefined),
      put: vi.fn(),
    };
    const snapshot = await new TranslationResourceLoader(
      [rawPersistent, new CanonicalEnglishSource()],
      bundles,
    ).load(locale, ["common"]);

    expect(snapshot.resourcesByLocale.ru?.common).toEqual({ heading: "Сохранённый пакет" });
    expect(rawPersistent.load).toHaveBeenCalledOnce();
    expect(rawPersistent.load).toHaveBeenCalledWith("en", ["common"]);
  });

  it("keeps target and fallback bundles separate and hydrates the same plural snapshot", async () => {
    const target = await compileNamespaceBundle("he", "common", { heading: "יעד" });
    const fallback = await compileNamespaceBundle("ru", "common", {
      sectionCount: {
        one: "{{count}} раздел",
        few: "{{count}} раздела",
        many: "{{count}} разделов",
        other: "{{count}} раздела",
      },
    });
    const bundles: TranslationBundleStore = {
      read: vi.fn(async (tag) => tag === "he" ? target : tag === "ru" ? fallback : undefined),
      put: vi.fn(),
    };
    const snapshot = await new TranslationResourceLoader([new CanonicalEnglishSource()], bundles).load({
      ...locale,
      translationLocale: "he",
      fallbackLocales: ["ru", "en"],
      direction: "rtl",
    }, ["common"]);

    expect(snapshot.resourcesByLocale.he?.common).toEqual({ heading: "יעד" });
    expect(snapshot.resourcesByLocale.ru?.common).toEqual(fallback.resources);
    expect(snapshot.resourcesByLocale.he?.common).not.toHaveProperty("sectionCount_one");
    const server = createTranslationRuntime(snapshot);
    const hydration = createTranslationRuntime(structuredClone(snapshot));
    expect(server.t("sectionCount", { count: 2 })).toBe("2 раздела");
    expect(hydration.t("sectionCount", { count: 2 })).toBe(server.t("sectionCount", { count: 2 }));
  });

  it("reconstructs a missing non-English bundle while English always remains code-owned", async () => {
    const bundles: TranslationBundleStore = { read: vi.fn(async () => undefined), put: vi.fn() };
    const local = new LocalTranslationSource({ ru: await pack("Локальный fallback") });
    const snapshot = await new TranslationResourceLoader([local, new CanonicalEnglishSource()], bundles)
      .load(locale, ["common"]);

    expect(snapshot.resourcesByLocale.ru?.common?.heading).toBe("Локальный fallback");
    expect(snapshot.resourcesByLocale.en?.common?.heading).toBe("Translation foundation");
    expect(bundles.read).not.toHaveBeenCalledWith("en", expect.anything());
  });
});
