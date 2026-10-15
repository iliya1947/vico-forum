import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { describe, expect, it } from "vitest";
import {
  ContentTranslationService,
  ContentTranslationStorageUnavailableError,
  type ContentTranslationIdentity,
  type ContentTranslationRevision,
} from "../app/localization/content-translation";
import { DrizzleContentTranslationBatchReader, DrizzleContentTranslationStore } from "./content-translation-store";

const identity: ContentTranslationIdentity = {
  contentType: "topic-title",
  contentId: "topic-1",
  revisionId: "title-r1",
  targetLocale: "fr",
};

const revision: ContentTranslationRevision = {
  contentType: "topic-title",
  contentId: "topic-1",
  revisionId: "title-r1",
  originalContent: "Original title",
  sourceLocale: "en",
};

describe("DrizzleContentTranslationBatchReader", () => {
  it("uses at most one title query and one set-based post query regardless of post count", async () => {
    const responses = [
      [{
        topicId: "topic-1",
        revisionId: "title-r1",
        targetLocale: "fr",
        sourceLocale: "en",
        translatedContent: "Titre",
        origin: "persistent_manual",
        provider: null,
        providerModel: null,
        attribution: null,
      }],
      [
        {
          postId: "post-1",
          revisionId: "post-r1",
          targetLocale: "fr",
          sourceLocale: "en",
          translatedContent: "Un",
          origin: "machine",
          provider: "provider",
          providerModel: "model",
          attribution: null,
        },
        {
          postId: "post-3",
          revisionId: "post-r3",
          targetLocale: "fr",
          sourceLocale: "en",
          translatedContent: "Trois",
          origin: "machine",
          provider: "provider",
          providerModel: "model",
          attribution: null,
        },
      ],
    ] as const;
    let queryCount = 0;
    const database = {
      select: () => ({
        from: () => ({
          where: async () => responses[queryCount++] ?? [],
        }),
      }),
    } as unknown as NodePgDatabase;
    const reader = new DrizzleContentTranslationBatchReader(database);

    const result = await reader.readBatch([
      identity,
      {
        contentType: "post-body",
        contentId: "post-1",
        revisionId: "post-r1",
        targetLocale: "fr",
      },
      {
        contentType: "post-body",
        contentId: "post-2",
        revisionId: "post-r2",
        targetLocale: "fr",
      },
      {
        contentType: "post-body",
        contentId: "post-3",
        revisionId: "post-r3",
        targetLocale: "fr",
      },
    ]);

    expect(queryCount).toBe(2);
    expect(result.translations.map((translation) => translation.contentId)).toEqual([
      "topic-1",
      "post-1",
      "post-3",
    ]);
  });
});

describe("DrizzleContentTranslationStore failure classification", () => {
  it("classifies an unwrapped PostgreSQL availability failure", async () => {
    const unavailable = Object.assign(new Error("connection unavailable"), { code: "08006" });
    const store = new DrizzleContentTranslationStore(failingDatabase(unavailable));

    await expect(store.read(identity)).rejects.toBeInstanceOf(
      ContentTranslationStorageUnavailableError,
    );
  });

  it("classifies a wrapped PostgreSQL availability failure for original-safe service fallback", async () => {
    const unavailable = Object.assign(new Error("connection unavailable"), { code: "08006" });
    const wrapped = new Error("Failed query", { cause: unavailable });
    const service = new ContentTranslationService(
      new DrizzleContentTranslationStore(failingDatabase(wrapped)),
    );

    await expect(service.readCurrent(revision, "fr")).resolves.toEqual({
      selected: "original",
      content: "Original title",
      contentLocale: "en",
      reason: "storage-unavailable",
      translation: null,
    });
  });

  it("classifies a wrapped PostgreSQL query timeout", async () => {
    const wrapped = new Error("Failed query", { cause: new Error("Query read timeout") });
    const store = new DrizzleContentTranslationStore(failingDatabase(wrapped));

    await expect(store.read(identity)).rejects.toBeInstanceOf(
      ContentTranslationStorageUnavailableError,
    );
  });

  it("preserves an unknown wrapped database error", async () => {
    const permissionDenied = Object.assign(new Error("permission denied"), { code: "42501" });
    const wrapped = new Error("Failed query", { cause: permissionDenied });
    const store = new DrizzleContentTranslationStore(failingDatabase(wrapped));

    await expect(store.read(identity)).rejects.toBe(wrapped);
  });
});

function failingDatabase(error: unknown): NodePgDatabase {
  return {
    select: () => ({
      from: () => ({
        where: async () => {
          throw error;
        },
      }),
    }),
  } as unknown as NodePgDatabase;
}
