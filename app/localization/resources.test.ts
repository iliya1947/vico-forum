import { describe, expect, it } from "vitest";
import { canonicalEnglishCatalog } from "./catalog";
import { sourceFingerprint } from "./fingerprint";
import { manualTranslationPacks } from "./manual-packs";
import { TranslationResourceLoader } from "./resource-loader";
import { createTranslationRuntime } from "./runtime";
import {
  CanonicalEnglishSource,
  LocalTranslationSource,
  validateTranslationPacks,
  type TranslationPack,
} from "./sources";

const locale = {
  translationLocale: "x-stage-one",
  fallbackLocales: ["en"],
  direction: "ltr" as const,
  formatting: { locale: "x-stage-one", timeZone: "UTC" },
  nativeName: "Fixture",
  presentationMetadata: {},
};

async function currentPack(value = "Translated foundation"): Promise<TranslationPack> {
  return {
    common: {
      heading: {
        value,
        sourceFingerprint: await sourceFingerprint(canonicalEnglishCatalog.common.heading),
      },
    },
  };
}

describe("UI translation resources", () => {
  it("keeps locale bundles separate and gives a current partial local pack priority", async () => {
    const loader = new TranslationResourceLoader([
      new LocalTranslationSource({ "x-stage-one": await currentPack() }),
      new CanonicalEnglishSource(),
    ]);
    const snapshot = await loader.load(locale, ["common"]);

    expect(snapshot.resourcesByLocale["x-stage-one"]?.common).toEqual({ heading: "Translated foundation" });
    expect(snapshot.resourcesByLocale.en?.common?.heading).toBe("Translation foundation");
    expect(snapshot.fallbackLocales).toEqual(["en"]);
    expect(createTranslationRuntime(snapshot).t("stageSummary")).toBe(
      "Stage 1 establishes locale-aware routing and synchronized UI translation.",
    );
  });

  it("keeps canonical English authoritative over local pack data", async () => {
    const englishLocale = {
      ...locale,
      translationLocale: "en",
      fallbackLocales: [],
      formatting: { locale: "en", timeZone: "UTC" },
      nativeName: "English",
    };
    const snapshot = await new TranslationResourceLoader([
      new LocalTranslationSource({ en: await currentPack("Local English override") }),
      new CanonicalEnglishSource(),
    ]).load(englishLocale, ["common"]);

    expect(snapshot.resourcesByLocale.en?.common?.heading).toBe("Translation foundation");
  });

  it("exposes and excludes a stale local override so English fallback continues", async () => {
    const pack = await currentPack("Old translation");
    pack.common!.heading!.sourceFingerprint = "old-fingerprint";
    const snapshot = await new TranslationResourceLoader([
      new LocalTranslationSource({ "x-stage-one": pack }),
      new CanonicalEnglishSource(),
    ]).load(locale, ["common"]);

    expect(snapshot.staleKeys["x-stage-one"]).toEqual(["common:heading"]);
    expect(snapshot.resourcesByLocale["x-stage-one"]?.common?.heading).toBeUndefined();
    expect(createTranslationRuntime(snapshot).t("heading")).toBe("Translation foundation");
  });

  it("classifies stale translations before validating their obsolete structure", async () => {
    const staleWithObsoletePlaceholder = await currentPack("Old {{removedPlaceholder}}");
    staleWithObsoletePlaceholder.common!.heading!.sourceFingerprint = "old-fingerprint";

    await expect(
      new LocalTranslationSource({ xx: staleWithObsoletePlaceholder }).load("xx", ["common"]),
    ).resolves.toMatchObject({ resources: {}, staleKeys: ["common:heading"] });
  });

  it("changes local source version when a current translation payload changes", async () => {
    const first = await new LocalTranslationSource({ xx: await currentPack("First translation") }).load("xx", [
      "common",
    ]);
    const second = await new LocalTranslationSource({ xx: await currentPack("Second translation") }).load("xx", [
      "common",
    ]);

    expect(first.version).not.toBe("empty");
    expect(second.version).not.toBe(first.version);
  });

  it("rejects unknown keys and broken placeholders", async () => {
    const unknown = { common: { typo: { value: "Typo", sourceFingerprint: "x" } } };
    await expect(new LocalTranslationSource({ xx: unknown }).load("xx", ["common"])).rejects.toThrow(
      "Unknown canonical key",
    );

    const descriptor = canonicalEnglishCatalog.common.heading;
    const broken = await currentPack("Broken {{name}}");
    broken.common!.heading!.sourceFingerprint = await sourceFingerprint(descriptor);
    await expect(new LocalTranslationSource({ xx: broken }).load("xx", ["common"])).rejects.toThrow(
      "Placeholder mismatch",
    );
  });

  it("validates every real manual pack without synthetic stale production data", async () => {
    await expect(validateTranslationPacks(manualTranslationPacks)).resolves.toEqual({ staleKeys: {} });
  });

  it("rejects unknown identities and invalid current translations during full-pack validation", async () => {
    await expect(
      validateTranslationPacks({ xx: { unknown: { key: { value: "Value", sourceFingerprint: "stale" } } } }),
    ).rejects.toThrow("Unknown canonical namespace");
    await expect(
      validateTranslationPacks({ xx: { common: { typo: { value: "Value", sourceFingerprint: "stale" } } } }),
    ).rejects.toThrow("Unknown canonical key");

    const broken = await currentPack("Broken {{name}}");
    await expect(validateTranslationPacks({ xx: broken })).rejects.toThrow("Placeholder mismatch");
  });

  it("creates isolated runtimes from the same serialized server snapshot", async () => {
    const snapshot = await new TranslationResourceLoader([new CanonicalEnglishSource()]).load(
      { ...locale, translationLocale: "en", fallbackLocales: [], formatting: { locale: "en", timeZone: "UTC" } },
      ["common"],
    );
    const hydratedSnapshot = JSON.parse(JSON.stringify(snapshot)) as typeof snapshot;
    const server = createTranslationRuntime(snapshot);
    const browser = createTranslationRuntime(hydratedSnapshot);

    expect(browser).not.toBe(server);
    expect(browser.language).toBe(server.language);
    expect(browser.options.fallbackLng).toEqual(server.options.fallbackLng);
    expect(browser.store.data).toEqual(server.store.data);
    expect(hydratedSnapshot.locale.formatting).toEqual(snapshot.locale.formatting);
  });
});
