import { describe, expect, it, vi } from "vitest";
import { canonicalEnglishCatalog } from "./catalog";
import { sourceFingerprint } from "./fingerprint";
import {
  DatabaseMachineTranslationSource,
  DatabaseManualTranslationSource,
  PersistentTranslationIntegrityError,
  type PersistentUiTranslationRow,
  type UiTranslationStore,
} from "./persistent-sources";
import { TranslationResourceLoader } from "./resource-loader";
import { CanonicalEnglishSource } from "./sources";

const locale = {
  translationLocale: "ru",
  fallbackLocales: ["en"],
  direction: "ltr" as const,
  formatting: { locale: "ru", timeZone: "UTC" },
  nativeName: "Русский",
  presentationMetadata: {},
};

async function row(
  origin: "persistent_manual" | "machine",
  value: unknown,
  fingerprint = await sourceFingerprint(canonicalEnglishCatalog.common.heading),
): Promise<PersistentUiTranslationRow> {
  return {
    locale: "ru",
    namespace: "common",
    key: "heading",
    origin,
    status: "approved",
    sourceFingerprint: fingerprint,
    translatedPayload: value,
  };
}

function store(rows: readonly PersistentUiTranslationRow[]): UiTranslationStore {
  return { readApproved: vi.fn(async () => rows) };
}

describe("persistent UI translation sources", () => {
  it("keeps persistent manual priority above machine inside one locale", async () => {
    const persistentStore = store([
      await row("persistent_manual", "Ручной перевод"),
      await row("machine", "Машинный перевод"),
    ]);
    const snapshot = await new TranslationResourceLoader([
      new DatabaseManualTranslationSource(persistentStore),
      new DatabaseMachineTranslationSource(persistentStore),
      new CanonicalEnglishSource(),
    ]).load(locale, ["common"]);

    expect(snapshot.resourcesByLocale.ru?.common?.heading).toBe("Ручной перевод");
    expect(persistentStore.readApproved).toHaveBeenCalledTimes(4);
  });

  it("excludes stale manual data so a current machine value can win", async () => {
    const persistentStore = store([
      await row("persistent_manual", "Старый ручной перевод", "0".repeat(64)),
      await row("machine", "Актуальный машинный перевод"),
    ]);
    const snapshot = await new TranslationResourceLoader([
      new DatabaseManualTranslationSource(persistentStore),
      new DatabaseMachineTranslationSource(persistentStore),
      new CanonicalEnglishSource(),
    ]).load(locale, ["common"]);

    expect(snapshot.resourcesByLocale.ru?.common?.heading).toBe("Актуальный машинный перевод");
    expect(snapshot.staleKeys.ru).toContain("common:heading");
  });

  it("ignores approved historical rows whose canonical key no longer exists", async () => {
    const persistentStore = store([{
      locale: "ru",
      namespace: "common",
      key: "removedKey",
      origin: "persistent_manual",
      status: "approved",
      sourceFingerprint: "a".repeat(64),
      translatedPayload: "Историческое значение",
    }]);

    await expect(new DatabaseManualTranslationSource(persistentStore).load("ru", ["common"]))
      .resolves.toMatchObject({ resources: {}, staleKeys: [] });
  });

  it("rejects a store row outside the requested scope", async () => {
    const persistentStore = store([{
      ...(await row("persistent_manual", "Значение")),
      locale: "he",
    }]);

    await expect(new DatabaseManualTranslationSource(persistentStore).load("ru", ["common"]))
      .rejects.toBeInstanceOf(PersistentTranslationIntegrityError);
  });

  it("rejects structured payloads until the structured-message runtime is implemented", async () => {
    const persistentStore = store([
      await row("persistent_manual", { one: "Один", other: "Много" }),
    ]);

    await expect(new DatabaseManualTranslationSource(persistentStore).load("ru", ["common"]))
      .rejects.toBeInstanceOf(PersistentTranslationIntegrityError);
  });
});
