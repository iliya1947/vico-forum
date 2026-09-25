import { describe, expect, it } from "vitest";
import {
  ContentTranslationStorageUnavailableError,
  type StoredContentTranslation,
} from "./content-translation";
import {
  ContentTranslationPresentationIntegrityError,
  ContentTranslationPresentationService,
  type ContentTranslationBatchReadInput,
  type ContentTranslationBatchReadResult,
} from "./content-translation-presentation";

const title = {
  contentType: "topic-title" as const,
  contentId: "topic-1",
  revisionId: "title-r1",
  originalContent: "Original title",
  sourceLocale: "en",
};
const postOne = {
  contentType: "post-body" as const,
  contentId: "post-1",
  revisionId: "post-r1",
  originalContent: "Original body",
  sourceLocale: "en",
};
const postTwo = {
  contentType: "post-body" as const,
  contentId: "post-2",
  revisionId: "post-r2",
  originalContent: "Unknown body",
  sourceLocale: "und",
};

function stored(
  input: {
    contentType: "topic-title" | "post-body";
    contentId: string;
    revisionId: string;
    translatedContent: string;
    sourceLocale?: string;
    origin?: "persistent_manual" | "machine";
    attribution?: string;
  },
): StoredContentTranslation {
  const origin = input.origin ?? "machine";
  return {
    contentType: input.contentType,
    contentId: input.contentId,
    revisionId: input.revisionId,
    targetLocale: "he",
    sourceLocale: input.sourceLocale ?? "en",
    translatedContent: input.translatedContent,
    provenance: origin === "machine"
      ? {
          origin,
          provider: "provider-a",
          model: "model-a",
          ...(input.attribution ? { attribution: input.attribution } : {}),
        }
      : {
          origin,
          ...(input.attribution ? { attribution: input.attribution } : {}),
        },
  };
}

function reader(result: ContentTranslationBatchReadResult) {
  return {
    readTopic: async (_input: ContentTranslationBatchReadInput) => result,
  };
}

function direction(locale: string) {
  return locale === "en" ? "ltr" as const : "auto" as const;
}

describe("ContentTranslationPresentationService", () => {
  it("selects exact translations independently and preserves provenance, attribution, and direction", async () => {
    const service = new ContentTranslationPresentationService(reader({
      title: {
        identity: { contentType: "topic-title", contentId: "topic-1", revisionId: "title-r1", targetLocale: "he" },
        status: "translation",
        translation: stored({
          contentType: "topic-title",
          contentId: "topic-1",
          revisionId: "title-r1",
          translatedContent: "כותרת",
          attribution: "Provider attribution",
        }),
      },
      posts: [{
        identity: { contentType: "post-body", contentId: "post-1", revisionId: "post-r1", targetLocale: "he" },
        status: "translation",
        translation: stored({
          contentType: "post-body",
          contentId: "post-1",
          revisionId: "post-r1",
          translatedContent: "גוף",
          origin: "persistent_manual",
        }),
      }],
    }));

    const result = await service.presentTopic({
      title,
      posts: [postOne, postTwo],
      targetLocale: "he",
      targetDirection: "rtl",
      sourceDirection: direction,
    });

    expect(result.title).toMatchObject({
      selected: "translation",
      displayed: { content: "כותרת", locale: "he", direction: "rtl" },
      original: { content: "Original title", locale: "en", direction: "ltr" },
      translation: {
        provenance: {
          origin: "machine",
          provider: "provider-a",
          model: "model-a",
          attribution: "Provider attribution",
        },
      },
    });
    expect(result.posts[0]).toMatchObject({
      selected: "translation",
      displayed: { content: "גוף", locale: "he", direction: "rtl" },
      translation: { provenance: { origin: "persistent_manual" } },
    });
    expect(result.posts[1]).toMatchObject({
      selected: "original",
      displayed: { content: "Unknown body", locale: "und", direction: "auto" },
      fallbackReason: "missing",
    });
  });

  it("degrades only an invalid unit while preserving other valid translations", async () => {
    const service = new ContentTranslationPresentationService(reader({
      title: {
        identity: { contentType: "topic-title", contentId: "topic-1", revisionId: "title-r1", targetLocale: "he" },
        status: "invalid",
      },
      posts: [{
        identity: { contentType: "post-body", contentId: "post-1", revisionId: "post-r1", targetLocale: "he" },
        status: "translation",
        translation: stored({
          contentType: "post-body",
          contentId: "post-1",
          revisionId: "post-r1",
          translatedContent: "גוף",
        }),
      }],
    }));

    const result = await service.presentTopic({
      title,
      posts: [postOne],
      targetLocale: "he",
      targetDirection: "rtl",
      sourceDirection: direction,
    });

    expect(result.title).toMatchObject({ selected: "original", fallbackReason: "invalid" });
    expect(result.posts[0]).toMatchObject({ selected: "translation", displayed: { content: "גוף" } });
  });

  it("degrades the complete presentation to originals for classified storage unavailability", async () => {
    const service = new ContentTranslationPresentationService({
      async readTopic() {
        throw new ContentTranslationStorageUnavailableError("unavailable");
      },
    });

    const result = await service.presentTopic({
      title,
      posts: [postOne],
      targetLocale: "he",
      targetDirection: "rtl",
      sourceDirection: direction,
    });

    expect(result.title).toMatchObject({ selected: "original", fallbackReason: "storage-unavailable" });
    expect(result.posts[0]).toMatchObject({ selected: "original", fallbackReason: "storage-unavailable" });
  });

  it("keeps a same-source target original without selecting a persisted row", async () => {
    const service = new ContentTranslationPresentationService(reader({
      title: {
        identity: { contentType: "topic-title", contentId: "topic-1", revisionId: "title-r1", targetLocale: "en" },
        status: "translation",
        translation: { ...stored({
          contentType: "topic-title",
          contentId: "topic-1",
          revisionId: "title-r1",
          translatedContent: "Should not display",
        }), targetLocale: "en" },
      },
      posts: [],
    }));

    const result = await service.presentTopic({
      title,
      posts: [],
      targetLocale: "en",
      targetDirection: "ltr",
      sourceDirection: direction,
    });

    expect(result.title).toMatchObject({
      selected: "original",
      displayed: { content: "Original title", locale: "en", direction: "ltr" },
      fallbackReason: "same-locale",
    });
  });

  it("propagates unexpected batch identity/integrity errors instead of treating them as misses", async () => {
    const service = new ContentTranslationPresentationService(reader({
      title: {
        identity: { contentType: "topic-title", contentId: "other-topic", revisionId: "title-r1", targetLocale: "he" },
        status: "translation",
        translation: stored({
          contentType: "topic-title",
          contentId: "other-topic",
          revisionId: "title-r1",
          translatedContent: "Wrong",
        }),
      },
      posts: [],
    }));

    await expect(service.presentTopic({
      title,
      posts: [],
      targetLocale: "he",
      targetDirection: "rtl",
      sourceDirection: direction,
    })).rejects.toBeInstanceOf(ContentTranslationPresentationIntegrityError);
  });
});
