import { describe, expect, it, vi } from "vitest";

import {
  ContentTranslationStorageUnavailableError,
  type ContentTranslationRevision,
  type StoredContentTranslation,
} from "./content-translation";
import {
  ContentTranslationPresentationService,
  type ContentTranslationBatchReader,
} from "./content-translation-presentation";

const title: ContentTranslationRevision = {
  contentType: "topic-title",
  contentId: "topic-1",
  revisionId: "title-r2",
  originalContent: "Original title",
  sourceLocale: "en",
};

const post: ContentTranslationRevision = {
  contentType: "post-body",
  contentId: "post-1",
  revisionId: "post-r2",
  originalContent: "Original **body**",
  sourceLocale: "und",
};

function machine(
  revision: ContentTranslationRevision,
  targetLocale: string,
  translatedContent: string,
): StoredContentTranslation {
  return {
    contentType: revision.contentType,
    contentId: revision.contentId,
    revisionId: revision.revisionId,
    targetLocale,
    sourceLocale: revision.sourceLocale,
    translatedContent,
    provenance: {
      origin: "machine",
      provider: "provider",
      model: "model",
      attribution: "Provider attribution",
    },
  };
}

describe("content translation presentation", () => {
  it("selects exact current translations independently and preserves provenance/direction", async () => {
    const reader: ContentTranslationBatchReader = {
      readBatch: vi.fn(async () => ({
        translations: [machine(title, "he", "כותרת מתורגמת")],
      })),
    };
    const service = new ContentTranslationPresentationService(reader);

    const result = await service.readCurrent(
      [title, post],
      "he",
      "rtl",
      (locale) => locale === "en" ? "ltr" : undefined,
    );

    expect(reader.readBatch).toHaveBeenCalledTimes(1);
    expect(result[0]).toMatchObject({
      selected: "translation",
      content: "כותרת מתורגמת",
      contentLocale: "he",
      contentDirection: "rtl",
      originalContent: "Original title",
      originalLocale: "en",
      originalDirection: "ltr",
      provenance: {
        origin: "machine",
        provider: "provider",
        model: "model",
        attribution: "Provider attribution",
      },
    });
    expect(result[1]).toMatchObject({
      selected: "original",
      content: "Original **body**",
      contentLocale: undefined,
      contentDirection: "auto",
      fallbackReason: "missing",
    });
  });

  it("keeps same-source content original without consulting storage", async () => {
    const readBatch = vi.fn();
    const service = new ContentTranslationPresentationService({ readBatch });

    const result = await service.readCurrent(
      [title],
      "en",
      "ltr",
      (locale) => locale === "en" ? "ltr" : undefined,
    );

    expect(readBatch).not.toHaveBeenCalled();
    expect(result[0]).toMatchObject({
      selected: "original",
      content: "Original title",
      fallbackReason: "same-locale",
      contentLocale: "en",
      contentDirection: "ltr",
    });
  });

  it("rejects wrong identities and per-record invalid rows without suppressing valid units", async () => {
    const validPost = machine(post, "he", "גוף מתורגם");
    const service = new ContentTranslationPresentationService({
      readBatch: async () => ({
        translations: [
          { ...machine(title, "he", "Wrong topic"), contentId: "topic-other" },
          validPost,
        ],
        invalidIdentities: [{
          contentType: "topic-title",
          contentId: title.contentId,
          revisionId: title.revisionId,
          targetLocale: "he",
        }],
      }),
    });

    const result = await service.readCurrent(
      [title, post],
      "he",
      "rtl",
      (locale) => locale === "en" ? "ltr" : undefined,
    );

    expect(result[0]).toMatchObject({
      selected: "original",
      content: "Original title",
      fallbackReason: "invalid",
    });
    expect(result[1]).toMatchObject({
      selected: "translation",
      content: "גוף מתורגם",
    });
  });

  it("preserves manual provenance and stored attribution", async () => {
    const service = new ContentTranslationPresentationService({
      readBatch: async () => ({
        translations: [{
          contentType: "topic-title",
          contentId: title.contentId,
          revisionId: title.revisionId,
          targetLocale: "he",
          sourceLocale: "en",
          translatedContent: "תרגום ידני",
          provenance: {
            origin: "persistent_manual",
            attribution: "Reviewed by community",
          },
        }],
      }),
    });

    const [result] = await service.readCurrent(
      [title],
      "he",
      "rtl",
      () => "ltr",
    );

    expect(result?.provenance).toEqual({
      origin: "persistent_manual",
      attribution: "Reviewed by community",
    });
  });

  it("degrades the complete presentation to originals only for classified storage unavailability", async () => {
    const service = new ContentTranslationPresentationService({
      readBatch: async () => {
        throw new ContentTranslationStorageUnavailableError("temporary");
      },
    });

    const result = await service.readCurrent(
      [title, post],
      "he",
      "rtl",
      (locale) => locale === "en" ? "ltr" : undefined,
    );

    expect(result.map((unit) => [unit.selected, unit.fallbackReason])).toEqual([
      ["original", "storage-unavailable"],
      ["original", "storage-unavailable"],
    ]);
  });

  it("propagates unexpected reader failures", async () => {
    const failure = new Error("schema/programming bug");
    const service = new ContentTranslationPresentationService({
      readBatch: async () => { throw failure; },
    });

    await expect(service.readCurrent(
      [title],
      "he",
      "rtl",
      () => "ltr",
    )).rejects.toBe(failure);
  });
});
