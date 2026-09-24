import { describe, expect, it, vi } from "vitest";
import {
  ContentTranslationService,
  ContentTranslationStorageUnavailableError,
  InvalidContentTranslationInputError,
  type ContentTranslationRevision,
  type ContentTranslationStore,
  type StoredContentTranslation,
} from "./content-translation";

const revision: ContentTranslationRevision = {
  contentType: "topic-title",
  contentId: "topic-1",
  revisionId: "title-r2",
  originalContent: "Current title",
  sourceLocale: "en",
};

function translated(
  overrides: Partial<StoredContentTranslation> = {},
): StoredContentTranslation {
  return {
    contentType: "topic-title",
    contentId: "topic-1",
    revisionId: "title-r2",
    targetLocale: "fr",
    translatedContent: "Titre actuel",
    sourceLocale: "en",
    provenance: {
      origin: "machine",
      provider: "cloudflare-workers-ai",
      model: "@cf/meta/m2m100-1.2b",
    },
    ...overrides,
  };
}

function store(options: {
  readonly read?: StoredContentTranslation;
  readonly readError?: Error;
} = {}): ContentTranslationStore & {
  read: ReturnType<typeof vi.fn<ContentTranslationStore["read"]>>;
  write: ReturnType<typeof vi.fn<ContentTranslationStore["write"]>>;
} {
  const read = vi.fn<ContentTranslationStore["read"]>(async () => {
    if (options.readError) throw options.readError;
    return options.read;
  });
  const write = vi.fn<ContentTranslationStore["write"]>(async (value) => value);
  return { read, write };
}

describe("ContentTranslationService", () => {
  it("selects only an exact current-revision translation", async () => {
    const persistence = store({ read: translated() });
    const service = new ContentTranslationService(persistence);

    await expect(service.readCurrent(revision, "FR")).resolves.toEqual({
      selected: "translation",
      content: "Titre actuel",
      contentLocale: "fr",
      translation: translated(),
    });
    expect(persistence.read).toHaveBeenCalledWith({
      contentType: "topic-title",
      contentId: "topic-1",
      revisionId: "title-r2",
      targetLocale: "fr",
    });
  });

  it("falls back to the exact original revision on miss", async () => {
    const service = new ContentTranslationService(store());

    await expect(service.readCurrent(revision, "fr")).resolves.toEqual({
      selected: "original",
      content: "Current title",
      contentLocale: "en",
      reason: "missing",
      translation: null,
    });
  });

  it("never returns an older revision translation as current", async () => {
    const service = new ContentTranslationService(store({
      read: translated({ revisionId: "title-r1", translatedContent: "Ancien titre" }),
    }));

    await expect(service.readCurrent(revision, "fr")).resolves.toMatchObject({
      selected: "original",
      content: "Current title",
      reason: "stale",
      translation: null,
    });
  });

  it("falls back on invalid stored content/provenance", async () => {
    const service = new ContentTranslationService(store({
      read: translated({
        translatedContent: "   ",
        provenance: {
          origin: "machine",
          provider: "cloudflare-workers-ai",
          model: "@cf/meta/m2m100-1.2b",
        },
      }),
    }));

    await expect(service.readCurrent(revision, "fr")).resolves.toMatchObject({
      selected: "original",
      reason: "invalid",
      translation: null,
    });
  });

  it("falls back only for classified storage unavailability", async () => {
    const unavailable = new ContentTranslationStorageUnavailableError("content translation storage unavailable");
    const service = new ContentTranslationService(store({ readError: unavailable }));

    await expect(service.readCurrent(revision, "fr")).resolves.toMatchObject({
      selected: "original",
      reason: "storage-unavailable",
      translation: null,
    });
  });

  it("does not hide unexpected storage/programming errors", async () => {
    const unexpected = new Error("unexpected schema bug");
    const service = new ContentTranslationService(store({ readError: unexpected }));

    await expect(service.readCurrent(revision, "fr")).rejects.toBe(unexpected);
  });

  it("returns the original without touching storage when target equals a known source locale", async () => {
    const persistence = store({ read: translated() });
    const service = new ContentTranslationService(persistence);

    await expect(service.readCurrent(revision, "EN")).resolves.toMatchObject({
      selected: "original",
      content: "Current title",
      contentLocale: "en",
      reason: "same-locale",
    });
    expect(persistence.read).not.toHaveBeenCalled();
  });

  it("does not infer a source locale when the revision source is und", async () => {
    const persistence = store();
    const service = new ContentTranslationService(persistence);
    const unknownSource = { ...revision, sourceLocale: "und" };

    await expect(service.readCurrent(unknownSource, "fr")).resolves.toMatchObject({
      selected: "original",
      contentLocale: "und",
      reason: "missing",
    });
    expect(persistence.read).toHaveBeenCalledWith(expect.objectContaining({
      targetLocale: "fr",
    }));
  });

  it("validates and canonicalizes write identity and provenance before persistence", async () => {
    const persistence = store();
    const service = new ContentTranslationService(persistence);

    await expect(service.write({
      revision,
      targetLocale: "FR",
      translatedContent: "Titre actuel",
      provenance: {
        origin: "machine",
        provider: "cloudflare-workers-ai",
        model: "@cf/meta/m2m100-1.2b",
        attribution: "Cloudflare Workers AI",
      },
    })).resolves.toMatchObject({
      contentType: "topic-title",
      contentId: "topic-1",
      revisionId: "title-r2",
      sourceLocale: "en",
      targetLocale: "fr",
      translatedContent: "Titre actuel",
    });
    expect(persistence.write).toHaveBeenCalledWith(expect.objectContaining({
      targetLocale: "fr",
      sourceLocale: "en",
      provenance: {
        origin: "machine",
        provider: "cloudflare-workers-ai",
        model: "@cf/meta/m2m100-1.2b",
        attribution: "Cloudflare Workers AI",
      },
    }));
  });

  it("rejects und targets, same-locale writes, and malformed provenance", async () => {
    const service = new ContentTranslationService(store());

    await expect(service.write({
      revision,
      targetLocale: "und",
      translatedContent: "No",
      provenance: { origin: "persistent_manual" },
    })).rejects.toBeInstanceOf(InvalidContentTranslationInputError);

    await expect(service.write({
      revision,
      targetLocale: "en",
      translatedContent: "No",
      provenance: { origin: "persistent_manual" },
    })).rejects.toBeInstanceOf(InvalidContentTranslationInputError);

    await expect(service.write({
      revision,
      targetLocale: "fr",
      translatedContent: "Titre",
      provenance: {
        origin: "machine",
        provider: " ",
        model: "model",
      },
    })).rejects.toBeInstanceOf(InvalidContentTranslationInputError);
  });
});
