import { describe, expect, it } from "vitest";

import {
  ContentGenerationStatusStorageUnavailableError,
  type ContentGenerationStatusReader,
  type ContentGenerationStatusState,
} from "./content-generation-status.server";
import {
  buildContentGenerationView,
  ContentGenerationStatusIntegrityError,
} from "./content-generation-view.server";
import {
  MAX_AUTOMATIC_POST_TRANSLATION_SEMANTIC_CHARACTERS,
} from "./content-generation-action.server";
import type { ContentTranslationPresentation } from "./content-translation-presentation";
import type { ContentTranslationRevision } from "./content-translation";

function revision(
  contentType: "topic-title" | "post-body",
  contentId: string,
  revisionId: string,
  originalContent: string,
  sourceLocale = "ru",
): ContentTranslationRevision {
  return { contentType, contentId, revisionId, originalContent, sourceLocale };
}

function original(
  value: ContentTranslationRevision,
): ContentTranslationPresentation {
  return {
    contentType: value.contentType,
    contentId: value.contentId,
    revisionId: value.revisionId,
    selected: "original",
    content: value.originalContent,
    contentLocale: value.sourceLocale === "und" ? undefined : value.sourceLocale,
    contentDirection: "ltr",
    originalContent: value.originalContent,
    originalLocale: value.sourceLocale === "und" ? undefined : value.sourceLocale,
    originalDirection: "ltr",
    fallbackReason: "missing",
  };
}

function translated(
  value: ContentTranslationRevision,
): ContentTranslationPresentation {
  return {
    ...original(value),
    selected: "translation",
    content: "translated",
    contentLocale: "he",
    contentDirection: "rtl",
    provenance: { origin: "machine", provider: "fake", model: "fake-v1" },
    fallbackReason: undefined,
  };
}

function reader(state: ContentGenerationStatusState): ContentGenerationStatusReader {
  return {
    readCurrent: async (units) => units.map((unit) => ({ ...unit, state })),
  };
}

describe("content generation loader view", () => {
  it("treats exact persisted translation as current regardless of completed task state", async () => {
    const value = revision("topic-title", "topic-1", "r1", "Заголовок");
    await expect(buildContentGenerationView(
      [value],
      [translated(value)],
      "he",
      reader("completed"),
    )).resolves.toEqual([
      expect.objectContaining({
        state: "current",
        autoEligible: false,
        explicitRequired: false,
      }),
    ]);
  });

  it("rejects completed task state without its required exact-current persisted translation", async () => {
    const value = revision("topic-title", "topic-1", "r1", "Заголовок");
    await expect(buildContentGenerationView(
      [value],
      [original(value)],
      "he",
      reader("completed"),
    )).rejects.toBeInstanceOf(ContentGenerationStatusIntegrityError);
  });

  it("degrades classified status storage failure to unavailable without generation hints", async () => {
    const value = revision("topic-title", "topic-1", "r1", "Заголовок");
    const unavailable: ContentGenerationStatusReader = {
      readCurrent: async () => {
        throw new ContentGenerationStatusStorageUnavailableError();
      },
    };

    await expect(buildContentGenerationView(
      [value],
      [original(value)],
      "he",
      unavailable,
    )).resolves.toEqual([
      expect.objectContaining({
        state: "unavailable",
        autoEligible: false,
        explicitRequired: false,
      }),
    ]);
  });

  it("suppresses known same-locale hints but keeps unresolved source as an authoritative-POST candidate", async () => {
    const same = revision("topic-title", "same", "r1", "כותרת", "he");
    const unresolved = revision("topic-title", "und", "r2", "Unknown source", "und");

    const result = await buildContentGenerationView(
      [same, unresolved],
      [original(same), original(unresolved)],
      "he",
      reader("idle"),
    );

    expect(result[0]).toMatchObject({ autoEligible: false, explicitRequired: false });
    expect(result[1]).toMatchObject({ autoEligible: true, explicitRequired: false });
  });

  it("uses the shared CNT-04 3000/3001 boundary for automatic versus explicit body UI", async () => {
    const exact = revision(
      "post-body",
      "post-1",
      "r1",
      "а".repeat(MAX_AUTOMATIC_POST_TRANSLATION_SEMANTIC_CHARACTERS),
    );
    const over = revision(
      "post-body",
      "post-2",
      "r2",
      "а".repeat(MAX_AUTOMATIC_POST_TRANSLATION_SEMANTIC_CHARACTERS + 1),
    );

    const result = await buildContentGenerationView(
      [exact, over],
      [original(exact), original(over)],
      "he",
      reader("idle"),
    );

    expect(result[0]).toMatchObject({ autoEligible: true, explicitRequired: false });
    expect(result[1]).toMatchObject({ autoEligible: false, explicitRequired: true });
  });

  it("serializes only bounded public generation fields", async () => {
    const value = revision("post-body", "post-1", "r1", "Текст");
    const result = await buildContentGenerationView(
      [value],
      [original(value)],
      "he",
      {
        readCurrent: async (units) => units.map((unit) => ({
          ...unit,
          state: "deferred" as const,
          retryAfterSeconds: 9,
        })),
      },
    );
    const serialized = JSON.stringify(result);

    expect(serialized).toContain('"retryAfterSeconds":9');
    for (const sensitive of [
      "taskId",
      "taskIdentity",
      "claimToken",
      "attemptCount",
      "provider",
      "allowanceReason",
      "reservationReference",
      "sourceFingerprint",
      "policyVersion",
      "actorId",
    ]) {
      expect(serialized).not.toContain(sensitive);
    }
  });
});
