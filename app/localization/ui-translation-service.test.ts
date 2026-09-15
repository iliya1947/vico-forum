import { describe, expect, it, vi } from "vitest";
import { canonicalEnglishCatalog } from "./catalog";
import { sourceFingerprint } from "./fingerprint";
import type { PersistentUiTranslationRow, UiTranslationStore } from "./persistent-sources";
import { InMemoryLocaleRegistry } from "./registry";
import { LocalTranslationSource, type TranslationPack } from "./sources";
import {
  UiTranslationGenerationScopeError,
  UiTranslationService,
  type TranslationJobDispatcher,
  uiTranslationJobIdentity,
} from "./ui-translation-service";

const registry = new InMemoryLocaleRegistry([
  {
    tag: "fr-CA",
    translationStatus: "draft",
    publicationStatus: "inactive",
    direction: "ltr",
    fallbackChain: ["fr", "en"],
    nativeName: "Français canadien",
  },
  {
    tag: "fr",
    translationStatus: "ready",
    publicationStatus: "active",
    direction: "ltr",
    fallbackChain: ["en"],
    nativeName: "Français",
  },
]);

type Origin = "persistent_manual" | "machine";

async function persistentRow(
  origin: Origin,
  locale = "fr-CA",
  fingerprint?: string,
  generationPolicyVersion = "ui-policy-v1",
): Promise<PersistentUiTranslationRow> {
  return {
    locale,
    namespace: "common",
    key: "heading",
    origin,
    status: "approved",
    sourceFingerprint: fingerprint ?? await sourceFingerprint(canonicalEnglishCatalog.common.heading),
    translatedPayload: "Fondation de traduction",
    generationPolicyVersion: origin === "machine" ? generationPolicyVersion : null,
  };
}

async function localPack(locale = "fr-CA", fingerprint?: string): Promise<Record<string, TranslationPack>> {
  return {
    [locale]: {
      common: {
        heading: {
          value: "Fondation de traduction",
          sourceFingerprint: fingerprint ?? await sourceFingerprint(canonicalEnglishCatalog.common.heading),
        },
      },
    },
  };
}

function setup(
  rows: readonly PersistentUiTranslationRow[] = [],
  packs: Readonly<Record<string, TranslationPack>> = {},
  generationPolicyVersion = "ui-policy-v1",
) {
  const store: UiTranslationStore = {
    readApproved: vi.fn(async (locale, namespaces) => rows.filter((row) =>
      row.locale === locale && typeof row.namespace === "string" && namespaces.includes(row.namespace)
    )),
  };
  const dispatcher: TranslationJobDispatcher = { dispatch: vi.fn(async () => undefined) };
  const service = new UiTranslationService({
    localeRegistry: registry,
    localManualSource: new LocalTranslationSource(packs),
    persistentStore: store,
    dispatcher,
    generationPolicyVersion,
  });
  return { service, dispatcher, store };
}

async function headingJob(
  rows: readonly PersistentUiTranslationRow[] = [],
  packs: Readonly<Record<string, TranslationPack>> = {},
) {
  const fixture = setup(rows, packs);
  const jobs = await fixture.service.planAndDispatch({ targetLocale: "fr-CA", namespaces: ["common"] });
  return { ...fixture, jobs, heading: jobs.find((job) => job.sourceIdentity.key === "heading") };
}

describe("UiTranslationService", () => {
  it("dispatches a missing exact-target translation with stable job fields", async () => {
    const { dispatcher, jobs, heading } = await headingJob();

    expect(heading).toMatchObject({
      translationKind: "ui",
      sourceIdentity: { namespace: "common", key: "heading" },
      targetLocale: "fr-CA",
      generationPolicyVersion: "ui-policy-v1",
    });
    expect(heading?.sourceFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(heading?.taskIdentity).toMatch(/^[0-9a-f]{64}$/);
    expect(dispatcher.dispatch).toHaveBeenCalledOnce();
    expect(dispatcher.dispatch).toHaveBeenCalledWith(jobs);
  });

  it("does not dispatch a current local manual translation", async () => {
    expect((await headingJob([], await localPack())).heading).toBeUndefined();
  });

  it("does not dispatch a current persistent manual translation", async () => {
    expect((await headingJob([await persistentRow("persistent_manual")])).heading).toBeUndefined();
  });

  it("does not dispatch a duplicate for a current machine translation", async () => {
    expect((await headingJob([await persistentRow("machine")])).heading).toBeUndefined();
  });

  it("regenerates a machine translation created under an older generation policy", async () => {
    const unchangedFingerprint = await sourceFingerprint(canonicalEnglishCatalog.common.heading);
    const oldPolicyRow = await persistentRow("machine", "fr-CA", unchangedFingerprint, "ui-policy-v0");

    const { heading } = await headingJob([oldPolicyRow]);

    expect(heading).toMatchObject({
      sourceFingerprint: unchangedFingerprint,
      generationPolicyVersion: "ui-policy-v1",
    });
  });

  it.each(["local manual", "persistent manual", "machine"])(
    "dispatches regeneration for a stale %s translation",
    async (kind) => {
      const stale = "0".repeat(64);
      const result = kind === "local manual"
        ? await headingJob([], await localPack("fr-CA", stale))
        : await headingJob([await persistentRow(kind === "machine" ? "machine" : "persistent_manual", "fr-CA", stale)]);
      expect(result.heading).toBeDefined();
    },
  );

  it.each(["fr", "en"])("does not let a %s fallback translation suppress exact-target generation", async (locale) => {
    const rows = locale === "en" ? [] : [await persistentRow("persistent_manual", locale)];
    const packs = locale === "en" ? await localPack(locale) : {};
    expect((await headingJob(rows, packs)).heading).toBeDefined();
  });

  it("changes task identity with the source fingerprint or generation policy version", async () => {
    const base = {
      translationKind: "ui" as const,
      sourceIdentity: { namespace: "common", key: "heading" },
      sourceFingerprint: "a".repeat(64),
      targetLocale: "fr-CA",
      generationPolicyVersion: "ui-policy-v1",
    };
    const identity = await uiTranslationJobIdentity(base);

    expect(await uiTranslationJobIdentity({ ...base, sourceFingerprint: "b".repeat(64) })).not.toBe(identity);
    expect(await uiTranslationJobIdentity({ ...base, generationPolicyVersion: "ui-policy-v2" })).not.toBe(identity);
  });

  it("rejects invalid, unknown, English, and non-canonical namespace generation scopes", async () => {
    const { service, dispatcher, store } = setup();
    for (const request of [
      { targetLocale: "not_a_locale" },
      { targetLocale: "de" },
      { targetLocale: "en" },
    ]) {
      await expect(service.planAndDispatch(request)).rejects.toBeInstanceOf(UiTranslationGenerationScopeError);
    }
    for (const namespace of ["unknown", "toString", "constructor", "__proto__", "hasOwnProperty"]) {
      await expect(service.planAndDispatch({ targetLocale: "fr-CA", namespaces: [namespace] }))
        .rejects.toBeInstanceOf(UiTranslationGenerationScopeError);
    }
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
    expect(store.readApproved).not.toHaveBeenCalled();
  });

  it("orders jobs deterministically and stays behind the dispatcher without provider/runtime calls", async () => {
    const { service, dispatcher } = setup();
    const first = await service.planAndDispatch({ targetLocale: "fr-CA", namespaces: ["common", "common"] });
    const second = await service.plan({ targetLocale: "fr-CA", namespaces: ["common"] });

    expect(first.map((job) => `${job.sourceIdentity.namespace}:${job.sourceIdentity.key}`))
      .toEqual([...first.map((job) => `${job.sourceIdentity.namespace}:${job.sourceIdentity.key}`)].sort());
    expect(second).toEqual(first);
    expect(dispatcher.dispatch).toHaveBeenCalledTimes(1);
  });
});
