import type { Client } from "pg";
import { describe, expect, it, vi } from "vitest";

import {
  ContentTranslationPresentationService,
} from "../app/localization/content-translation-presentation";
import {
  ContentTranslationStorageUnavailableError,
} from "../app/localization/content-translation";
import { createHyperdriveContentTranslationBatchReader } from "./hyperdrive-content-translations";

const revision = {
  contentType: "topic-title" as const,
  contentId: "topic-1",
  revisionId: "title-r1",
  originalContent: "Original title",
  sourceLocale: "en",
};

describe("Hyperdrive content translation batch reader", () => {
  it("degrades connection timeout to original fallback and discards the client", async () => {
    const end = vi.fn(async () => { throw new Error("cleanup failed"); });
    const createClient = vi.fn(() => ({
      connect: vi.fn(async () => { throw new Error("timeout expired"); }),
      query: vi.fn(),
      end,
    }) as unknown as Client);
    const service = new ContentTranslationPresentationService(
      createHyperdriveContentTranslationBatchReader(
        "postgres://runtime@hyperdrive/vico",
        createClient,
      ),
    );

    await expect(service.readCurrent(
      [revision],
      "fr",
      "ltr",
      () => "ltr",
    )).resolves.toEqual([
      expect.objectContaining({
        selected: "original",
        content: "Original title",
        fallbackReason: "storage-unavailable",
      }),
    ]);
    expect(createClient).toHaveBeenCalledWith("postgres://runtime@hyperdrive/vico");
    expect(end).toHaveBeenCalledOnce();
  });

  it("classifies query timeout and preserves original fallback", async () => {
    const end = vi.fn(async () => undefined);
    const createClient = () => ({
      connect: vi.fn(async () => undefined),
      query: vi.fn(async () => { throw new Error("Query read timeout"); }),
      end,
    }) as unknown as Client;
    const service = new ContentTranslationPresentationService(
      createHyperdriveContentTranslationBatchReader(
        "postgres://runtime@hyperdrive/vico",
        createClient,
      ),
    );

    await expect(service.readCurrent(
      [revision],
      "fr",
      "ltr",
      () => "ltr",
    )).resolves.toEqual([
      expect.objectContaining({
        selected: "original",
        fallbackReason: "storage-unavailable",
      }),
    ]);
    expect(end).toHaveBeenCalledOnce();
  });

  it("does not mask unexpected connection failures or replace them with cleanup errors", async () => {
    const failure = new TypeError("client programming error");
    const end = vi.fn(async () => { throw new Error("cleanup failed"); });
    const reader = createHyperdriveContentTranslationBatchReader(
      "postgres://runtime@hyperdrive/vico",
      () => ({
        connect: vi.fn(async () => { throw failure; }),
        query: vi.fn(),
        end,
      }) as unknown as Client,
    );

    await expect(reader.readBatch([{
      contentType: "topic-title",
      contentId: "topic-1",
      revisionId: "title-r1",
      targetLocale: "fr",
    }])).rejects.toBe(failure);
    expect(end).toHaveBeenCalledOnce();
  });

  it("surfaces classified timeout directly from the adapter", async () => {
    const reader = createHyperdriveContentTranslationBatchReader(
      "postgres://runtime@hyperdrive/vico",
      () => ({
        connect: vi.fn(async () => { throw new Error("timeout expired"); }),
        query: vi.fn(),
        end: vi.fn(async () => undefined),
      }) as unknown as Client,
    );

    await expect(reader.readBatch([{
      contentType: "topic-title",
      contentId: "topic-1",
      revisionId: "title-r1",
      targetLocale: "fr",
    }])).rejects.toBeInstanceOf(ContentTranslationStorageUnavailableError);
  });
});
