import type { Client } from "pg";
import { describe, expect, it, vi } from "vitest";
import { createHyperdriveContentTranslationPresentation } from "./hyperdrive-content-translations";

const input = {
  title: {
    contentType: "topic-title" as const,
    contentId: "topic-1",
    revisionId: "title-r1",
    originalContent: "Original title",
    sourceLocale: "en",
  },
  posts: [],
  targetLocale: "he",
  targetDirection: "rtl" as const,
  sourceDirection: () => "ltr" as const,
};

describe("Hyperdrive content translation presentation", () => {
  it("degrades a classified connection timeout to original content", async () => {
    const timeout = new Error("timeout expired");
    const presentation = createHyperdriveContentTranslationPresentation(
      "postgres://runtime@hyperdrive/vico",
      () => ({
        connect: vi.fn(async () => { throw timeout; }),
        end: vi.fn(async () => undefined),
      }) as unknown as Client,
    );

    await expect(presentation.presentTopic(input)).resolves.toMatchObject({
      title: {
        selected: "original",
        displayed: { content: "Original title", locale: "en", direction: "ltr" },
        fallbackReason: "storage-unavailable",
      },
      posts: [],
    });
  });

  it("does not mask an unexpected connection failure", async () => {
    const failure = new TypeError("client programming error");
    const presentation = createHyperdriveContentTranslationPresentation(
      "postgres://runtime@hyperdrive/vico",
      () => ({
        connect: vi.fn(async () => { throw failure; }),
        end: vi.fn(async () => undefined),
      }) as unknown as Client,
    );

    await expect(presentation.presentTopic(input)).rejects.toBe(failure);
  });
});
