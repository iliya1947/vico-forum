import { describe, expect, it } from "vitest";

import {
  ContentGenerationStatusIntegrityError,
  composeContentGenerationView,
  unavailableContentGenerationView,
  type ContentGenerationStatusSnapshot,
} from "./content-generation-status";
import type { ContentTranslationPresentation } from "./content-translation-presentation";
import type { ContentTranslationRevision } from "./content-translation";

function revision(
  contentType: "topic-title" | "post-body",
  contentId: string,
  revisionId: string,
  sourceLocale = "en",
): ContentTranslationRevision {
  return {
    contentType,
    contentId,
    revisionId,
    originalContent: "source",
    sourceLocale,
  };
}

function original(
  value: ContentTranslationRevision,
  fallbackReason: ContentTranslationPresentation["fallbackReason"] = "missing",
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
    fallbackReason,
  };
}

function translated(value: ContentTranslationRevision): ContentTranslationPresentation {
  return {
    contentType: value.contentType,
    contentId: value.contentId,
    revisionId: value.revisionId,
    selected: "translation",
    content: "translated",
    contentLocale: "he",
    contentDirection: "rtl",
    originalContent: value.originalContent,
    originalLocale: value.sourceLocale,
    originalDirection: "ltr",
    provenance: {
      origin: "machine",
      provider: "provider",
      model: "model",
    },
  };
}

function status(
  value: ContentTranslationRevision,
  durable: ContentGenerationStatusSnapshot["status"],
): ContentGenerationStatusSnapshot {
  return {
    contentType: value.contentType,
    contentId: value.contentId,
    revisionId: value.revisionId,
    targetLocale: "he",
    status: durable,
  };
}

describe("content generation status presentation", () => {
  it("uses exact-current persisted translation as the public current state", () => {
    const value = revision("topic-title", "topic-1", "r1");
    expect(composeContentGenerationView(
      [value],
      [translated(value)],
      [status(value, "completed")],
      "he",
      () => 0,
      3_000,
    )).toEqual([{
      contentType: "topic-title",
      contentId: "topic-1",
      revisionId: "r1",
      targetLocale: "he",
      status: "current",
      automaticEligible: false,
      explicitRequired: false,
    }]);
  });

  it("rejects completed current-generation work without its persisted exact-current translation", () => {
    const value = revision("topic-title", "topic-1", "r1");
    expect(() => composeContentGenerationView(
      [value],
      [original(value)],
      [status(value, "completed")],
      "he",
      () => 0,
      3_000,
    )).toThrow(ContentGenerationStatusIntegrityError);
  });

  it("suppresses known same-locale automatic hints while allowing unresolved source as a hint", () => {
    const same = revision("topic-title", "same", "r1", "he");
    const und = revision("topic-title", "und", "r2", "und");
    const result = composeContentGenerationView(
      [same, und],
      [original(same, "same-locale"), original(und)],
      [status(same, "idle"), status(und, "idle")],
      "he",
      () => 0,
      3_000,
    );

    expect(result[0]).toMatchObject({
      status: "idle",
      automaticEligible: false,
    });
    expect(result[1]).toMatchObject({
      status: "idle",
      automaticEligible: true,
    });
  });

  it("keeps 3000 semantic characters automatic and makes 3001 explicit-only", () => {
    const exact = revision("post-body", "post-3000", "r1");
    const over = revision("post-body", "post-3001", "r2");
    const result = composeContentGenerationView(
      [exact, over],
      [original(exact), original(over)],
      [status(exact, "idle"), status(over, "idle")],
      "he",
      (value) => value.contentId === "post-3000" ? 3_000 : 3_001,
      3_000,
    );

    expect(result[0]).toMatchObject({
      automaticEligible: true,
      explicitRequired: false,
    });
    expect(result[1]).toMatchObject({
      automaticEligible: false,
      explicitRequired: true,
    });
  });

  it("turns classified status-storage degradation into bounded unavailable views", () => {
    const values = [
      revision("topic-title", "topic-1", "r1"),
      revision("post-body", "post-1", "r2"),
    ];
    expect(unavailableContentGenerationView(
      values,
      values.map((value) => original(value)),
      "he",
    )).toEqual([
      {
        contentType: "topic-title",
        contentId: "topic-1",
        revisionId: "r1",
        targetLocale: "he",
        status: "unavailable",
        automaticEligible: false,
        explicitRequired: false,
      },
      {
        contentType: "post-body",
        contentId: "post-1",
        revisionId: "r2",
        targetLocale: "he",
        status: "unavailable",
        automaticEligible: false,
        explicitRequired: false,
      },
    ]);
  });
});
