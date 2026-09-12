import { describe, expect, it, vi } from "vitest";
import { canonicalEnglishCatalog } from "./catalog";
import { sourceFingerprint } from "./fingerprint";
import {
  DatabaseMachineTranslationSource,
  DatabaseManualTranslationSource,
  PersistentTranslationIntegrityError,
  type PersistentUiTranslationRow,
  type PersistentTranslationRowIssueReporter,
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

type CommonKey = keyof typeof canonicalEnglishCatalog.common;

async function row(
  origin: "persistent_manual" | "machine",
  value: unknown,
  fingerprint?: string,
  key: CommonKey = "heading",
): Promise<PersistentUiTranslationRow> {
  return {
    locale: "ru",
    namespace: "common",
    key,
    origin,
    status: "approved",
    sourceFingerprint: fingerprint ?? await sourceFingerprint(canonicalEnglishCatalog.common[key]),
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
    expect(persistentStore.readApproved).toHaveBeenCalledTimes(2);
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

  it("skips approved historical rows whose canonical key no longer exists and reports the reason", async () => {
    const reportRowIssues = vi.fn<PersistentTranslationRowIssueReporter>();
    const persistentStore = store([{
      locale: "ru",
      namespace: "common",
      key: "removedKey",
      origin: "persistent_manual",
      status: "approved",
      sourceFingerprint: "a".repeat(64),
      translatedPayload: "Историческое значение",
    }]);

    await expect(new DatabaseManualTranslationSource(persistentStore, reportRowIssues).load("ru", ["common"]))
      .resolves.toMatchObject({ resources: {}, staleKeys: [] });
    expect(reportRowIssues).toHaveBeenCalledOnce();
    expect(reportRowIssues).toHaveBeenCalledWith({
      origin: "persistent_manual",
      skippedRows: 1,
      reasons: { "unknown-key": 1 },
    });
  });

  it("skips malformed rows, keeps valid rows, and reports aggregate reason counts", async () => {
    const reportRowIssues = vi.fn<PersistentTranslationRowIssueReporter>();
    const valid = await row("persistent_manual", "Актуальное состояние", undefined, "stageSummary");
    const invalidPayload = await row("persistent_manual", { one: "Один", other: "Много" });
    const invalidTranslation = await row("persistent_manual", "<b>Нельзя</b>");
    const invalidFingerprint = { ...(await row("persistent_manual", "Значение")), sourceFingerprint: "bad" };
    const invalidStatus = { ...(await row("persistent_manual", "Значение")), status: "draft" };
    const invalidLocale = { ...(await row("persistent_manual", "Значение")), locale: "" };

    const result = await new DatabaseManualTranslationSource(
      store([invalidPayload, invalidTranslation, invalidFingerprint, invalidStatus, invalidLocale, valid]),
      reportRowIssues,
    ).load("ru", ["common"]);

    expect(result.resources.common?.stageSummary).toBe("Актуальное состояние");
    expect(result.resources.common?.heading).toBeUndefined();
    expect(reportRowIssues).toHaveBeenCalledOnce();
    expect(reportRowIssues).toHaveBeenCalledWith({
      origin: "persistent_manual",
      skippedRows: 5,
      reasons: {
        "invalid-fingerprint": 1,
        "invalid-locale": 1,
        "invalid-payload": 1,
        "invalid-status": 1,
        "invalid-translation": 1,
      },
    });
  });

  it("reports an invalid origin as malformed row data instead of publishing it", async () => {
    const reportRowIssues = vi.fn<PersistentTranslationRowIssueReporter>();
    const malformed = { ...(await row("persistent_manual", "Значение")), origin: "unknown" };

    await expect(
      new DatabaseManualTranslationSource(store([malformed]), reportRowIssues).load("ru", ["common"]),
    ).resolves.toMatchObject({ resources: {} });
    expect(reportRowIssues).toHaveBeenCalledWith({
      origin: "persistent_manual",
      skippedRows: 1,
      reasons: { "invalid-origin": 1 },
    });
  });

  it("rejects a store row outside the requested scope", async () => {
    const reportRowIssues = vi.fn<PersistentTranslationRowIssueReporter>();
    const persistentStore = store([{
      ...(await row("persistent_manual", "Значение")),
      locale: "he",
    }]);

    await expect(new DatabaseManualTranslationSource(persistentStore, reportRowIssues).load("ru", ["common"]))
      .rejects.toBeInstanceOf(PersistentTranslationIntegrityError);
    expect(reportRowIssues).not.toHaveBeenCalled();
  });

  it("does not hide programming/runtime failures while processing otherwise valid rows", async () => {
    const failure = new TypeError("crypto runtime failure");
    const digest = vi.spyOn(crypto.subtle, "digest").mockRejectedValueOnce(failure);
    const reportRowIssues = vi.fn<PersistentTranslationRowIssueReporter>();
    const persistentStore = store([await row("persistent_manual", "Значение")]);

    await expect(new DatabaseManualTranslationSource(persistentStore, reportRowIssues).load("ru", ["common"]))
      .rejects.toBe(failure);
    expect(reportRowIssues).not.toHaveBeenCalled();
    digest.mockRestore();
  });
});
