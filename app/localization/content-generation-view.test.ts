import { describe, expect, it } from "vitest";

import {
  buildContentGenerationView,
  contentGenerationUnitKey,
  unavailableContentGenerationView,
} from "./content-generation-view";
import type { ContentGenerationTaskStatus } from "./content-generation-status";
import type { ContentTranslationPresentation } from "./content-translation-presentation";
import type { ContentTranslationRevision } from "./content-translation";

const title: ContentTranslationRevision = {
  contentType: "topic-title",
  contentId: "topic-1",
  revisionId: "title-r1",
  originalContent: "Title",
  sourceLocale: "en",
};

function body(length: number): ContentTranslationRevision {
  return {
    contentType: "post-body",
    contentId: "post-1",
    revisionId: "post-r1",
    originalContent: "а".repeat(length),
    sourceLocale: "ru",
  };
}

function original(revision: ContentTranslationRevision): ContentTranslationPresentation {
  return {
    contentType: revision.contentType,
    contentId: revision.contentId,
    revisionId: revision.revisionId,
    selected: "original",
    content: revision.originalContent,
    contentDirection: "ltr",
    originalContent: revision.originalContent,
    originalDirection: "ltr",
    fallbackReason: "missing",
  };
}

function translated(revision: ContentTranslationRevision): ContentTranslationPresentation {
  return {
    contentType: revision.contentType,
    contentId: revision.contentId,
    revisionId: revision.revisionId,
    selected: "translation",
    content: "Translated",
    contentLocale: "he",
    contentDirection: "rtl",
    originalContent: revision.originalContent,
    originalLocale: revision.sourceLocale === "und" ? undefined : revision.sourceLocale,
    originalDirection: "ltr",
    provenance: { origin: "machine", provider: "fake", model: "fake-v1" },
  };
}

function status(
  revision: ContentTranslationRevision,
  state: ContentGenerationTaskStatus["state"],
): ContentGenerationTaskStatus {
  return {
    contentType: revision.contentType,
    contentId: revision.contentId,
    revisionId: revision.revisionId,
    state,
  };
}

describe("content generation loader view", () => {
  it("uses the exact unit/revision/target key and only auto-enables eligible current originals", () => {
    const short = body(3_000);
    const long = body(3_001);
    const view = buildContentGenerationView(
      [title, short, long],
      [original(title), original(short), original(long)],
      [status(title, "idle"), status(short, "idle"), status(long, "idle")],
      "he",
    );

    expect(view).toEqual([
      expect.objectContaining({
        key: contentGenerationUnitKey(title, "he"),
        state: "idle",
        automatic: true,
        explicitRequired: false,
      }),
      expect.objectContaining({
        state: "idle",
        automatic: true,
        explicitRequired: false,
      }),
      expect.objectContaining({
        state: "idle",
        automatic: false,
        explicitRequired: true,
      }),
    ]);
  });

  it("suppresses same-locale automatic hints and unresolved und remains a candidate", () => {
    const same = { ...title, sourceLocale: "he" };
    const unresolved = { ...title, revisionId: "title-r2", sourceLocale: "und" };
    const view = buildContentGenerationView(
      [same, unresolved],
      [original(same), original(unresolved)],
      [status(same, "idle"), status(unresolved, "idle")],
      "he",
    );

    expect(view[0]).toMatchObject({ automatic: false, explicitRequired: false, state: "idle" });
    expect(view[1]).toMatchObject({ automatic: true, explicitRequired: false, state: "idle" });
  });

  it("treats persisted exact-current presentation as current regardless of task state", () => {
    const view = buildContentGenerationView(
      [title],
      [translated(title)],
      [status(title, "completed")],
      "he",
    );

    expect(view[0]).toMatchObject({ state: "current", automatic: false });
  });

  it("treats completed plus independently read original presentation as bounded convergence", () => {
    const view = buildContentGenerationView(
      [title],
      [original(title)],
      [status(title, "completed")],
      "he",
    );

    expect(view[0]).toMatchObject({
      state: "converging",
      automatic: false,
      explicitRequired: false,
    });
  });

  it("preserves bounded deferred timing and terminal status", () => {
    const deferred = { ...status(title, "deferred"), retryAfterSeconds: 17 };
    const view = buildContentGenerationView(
      [title],
      [original(title)],
      [deferred],
      "he",
    );

    expect(view[0]).toMatchObject({
      state: "deferred",
      retryAfterSeconds: 17,
      automatic: false,
    });
  });

  it("builds unavailable original-safe view without automatic work", () => {
    expect(unavailableContentGenerationView([title], "he")).toEqual([
      expect.objectContaining({
        state: "unavailable",
        automatic: false,
        explicitRequired: false,
      }),
    ]);
  });
});
