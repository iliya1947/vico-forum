import { describe, expect, it } from "vitest";

import {
  CONTENT_GENERATION_MAX_POLLS_PER_HYDRATION,
  CONTENT_GENERATION_POLL_DELAY_MS,
  hasActiveTrackedGeneration,
  initialAutomaticGenerationQueue,
} from "./content-generation-client";
import type { ContentGenerationViewUnit } from "./content-generation-view.server";

function unit(
  overrides: Partial<ContentGenerationViewUnit> = {},
): ContentGenerationViewUnit {
  return {
    key: '["post-body","post-1","revision-1","he"]',
    contentType: "post-body",
    contentId: "post-1",
    revisionId: "revision-1",
    targetLocale: "he",
    state: "idle",
    autoEligible: true,
    explicitRequired: false,
    ...overrides,
  };
}

describe("content generation client orchestration helpers", () => {
  it("builds one sequential automatic request per exact hydration key", () => {
    const title = unit({
      key: '["topic-title","topic-1","title-r1","he"]',
      contentType: "topic-title",
      contentId: "topic-1",
      revisionId: "title-r1",
    });
    const post = unit();
    const duplicate = { ...post };

    expect(initialAutomaticGenerationQueue([title, post, duplicate])).toEqual([
      {
        key: title.key,
        intent: "generateTopicTitleTranslation",
      },
      {
        key: post.key,
        intent: "generatePostBodyTranslation",
        postId: "post-1",
      },
    ]);
  });

  it("does not automatically submit explicit-only or inactive units", () => {
    expect(initialAutomaticGenerationQueue([
      unit({ autoEligible: false, explicitRequired: true }),
      unit({ key: "pending", state: "pending", autoEligible: false }),
      unit({ key: "current", state: "current", autoEligible: false }),
    ])).toEqual([]);
  });

  it("polls only active states that belong to the initial hydration keys", () => {
    const tracked = new Set(["pending"]);
    expect(hasActiveTrackedGeneration([
      unit({ key: "pending", state: "processing", autoEligible: false }),
    ], tracked)).toBe(true);

    expect(hasActiveTrackedGeneration([
      unit({ key: "replacement-revision", state: "processing", autoEligible: false }),
    ], tracked)).toBe(false);

    expect(hasActiveTrackedGeneration([
      unit({ key: "pending", state: "failed", autoEligible: false }),
    ], tracked)).toBe(false);
  });

  it("uses positive bounded polling constants", () => {
    expect(CONTENT_GENERATION_POLL_DELAY_MS).toBeGreaterThan(0);
    expect(Number.isSafeInteger(CONTENT_GENERATION_MAX_POLLS_PER_HYDRATION)).toBe(true);
    expect(CONTENT_GENERATION_MAX_POLLS_PER_HYDRATION).toBeGreaterThan(0);
  });
});
