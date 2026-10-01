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

  it("compiles canonical English plural branches into real i18next runtime lookup", async () => {
    const englishLocale = {
      ...locale,
      translationLocale: "en",
      fallbackLocales: [],
      formatting: { locale: "en", timeZone: "UTC" },
      nativeName: "English",
    };
    const snapshot = await new TranslationResourceLoader([new CanonicalEnglishSource()]).load(
      englishLocale,
      ["common"],
    );
    const runtime = createTranslationRuntime(snapshot);

    expect(snapshot.resourcesByLocale.en?.common).toMatchObject({
      sectionCount_one: "{{count}} section",
      sectionCount_other: "{{count}} sections",
    });
    expect(runtime.t("sectionCount", { count: 1 })).toBe("1 section");
    expect(runtime.t("sectionCount", { count: 2 })).toBe("2 sections");
  });

  it("resolves topic and message totals through independent plural descriptors", async () => {
    const englishLocale = {
      ...locale,
      translationLocale: "en",
      fallbackLocales: [],
      formatting: { locale: "en", timeZone: "UTC" },
      nativeName: "English",
    };
    const snapshot = await new TranslationResourceLoader([new CanonicalEnglishSource()]).load(
      englishLocale,
      ["common"],
    );
    const runtime = createTranslationRuntime(snapshot);
    const topicDescriptor = canonicalEnglishCatalog.common.topicCount;
    const messageDescriptor = canonicalEnglishCatalog.common.messageCount;

    expect(topicDescriptor).toMatchObject({
      messageKind: "plural",
      placeholders: ["count"],
      source: { one: "{{count}} topic", other: "{{count}} topics" },
    });
    expect(messageDescriptor).toMatchObject({
      messageKind: "plural",
      placeholders: ["count"],
      source: { one: "{{count}} message", other: "{{count}} messages" },
    });
    await expect(sourceFingerprint(topicDescriptor)).resolves.toMatch(/^[0-9a-f]{64}$/);
    await expect(sourceFingerprint(messageDescriptor)).resolves.toMatch(/^[0-9a-f]{64}$/);

    expect(runtime.t("topicCount", { count: 1 })).toBe("1 topic");
    expect(runtime.t("topicCount", { count: 2 })).toBe("2 topics");
    expect(runtime.t("messageCount", { count: 1 })).toBe("1 message");
    expect(runtime.t("messageCount", { count: 2 })).toBe("2 messages");
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

  it("keeps the reviewed Russian and Hebrew packs complete and current", async () => {
    const canonicalKeys = Object.keys(canonicalEnglishCatalog.common).sort();
    const validation = await validateTranslationPacks(manualTranslationPacks);

    expect(Object.keys(manualTranslationPacks.ru?.common ?? {}).sort()).toEqual(canonicalKeys);
    expect(Object.keys(manualTranslationPacks.he?.common ?? {}).sort()).toEqual(canonicalKeys);
    expect(validation.staleKeys.ru ?? []).toEqual([]);
    expect(validation.staleKeys.he ?? []).toEqual([]);
  });

  it.each([
    {
      locale: "ru",
      direction: "ltr" as const,
      nativeName: "Русский",
      expected: {
        topicTools: "Инструменты темы",
        messageTools: "Инструменты сообщения",
        sourceLocale: "Язык оригинала: en",
        one: "1 сообщение",
        two: "2 сообщения",
        many: "5 сообщений",
      },
    },
    {
      locale: "he",
      direction: "rtl" as const,
      nativeName: "עברית",
      expected: {
        topicTools: "כלי נושא",
        messageTools: "כלי הודעה",
        sourceLocale: "שפת המקור: en",
        one: "הודעה 1",
        two: "2 הודעות",
        many: "5 הודעות",
      },
    },
  ])("loads the complete $locale manual pack without English fallback for reviewed UI", async ({
    locale: targetLocale,
    direction,
    nativeName,
    expected,
  }) => {
    const snapshot = await new TranslationResourceLoader([
      new LocalTranslationSource(manualTranslationPacks),
      new CanonicalEnglishSource(),
    ]).load({
      translationLocale: targetLocale,
      fallbackLocales: ["en"],
      direction,
      formatting: { locale: targetLocale, timeZone: "UTC" },
      nativeName,
      presentationMetadata: {},
    }, ["common"]);
    const runtime = createTranslationRuntime(snapshot);

    expect(snapshot.staleKeys[targetLocale] ?? []).toEqual([]);
    expect(Object.keys(snapshot.resourcesByLocale[targetLocale]?.common ?? {}).length)
      .toBeGreaterThan(Object.keys(canonicalEnglishCatalog.common).length);
    expect(runtime.t("topicTools")).toBe(expected.topicTools);
    expect(runtime.t("messageTools")).toBe(expected.messageTools);
    expect(runtime.t("sourceLocaleCurrent", { locale: "en" })).toBe(expected.sourceLocale);
    expect(runtime.t("messageCount", { count: 1 })).toBe(expected.one);
    expect(runtime.t("messageCount", { count: 2 })).toBe(expected.two);
    expect(runtime.t("messageCount", { count: 5 })).toBe(expected.many);
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

  it.each(["toString", "constructor", "__proto__", "hasOwnProperty"])(
    "rejects inherited namespace name %s across UI translation sources",
    async (namespace) => {
      const pack = Object.fromEntries([[namespace, {}]]) as TranslationPack;

      await expect(new CanonicalEnglishSource().load("en", [namespace])).rejects.toThrow(
        "Unknown canonical namespace",
      );
      await expect(new LocalTranslationSource({ xx: pack }).load("xx", [namespace])).rejects.toThrow(
        "Unknown canonical namespace",
      );
      await expect(validateTranslationPacks({ xx: pack })).rejects.toThrow("Unknown canonical namespace");
    },
  );

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
