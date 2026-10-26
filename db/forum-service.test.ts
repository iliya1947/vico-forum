import { describe, expect, it } from "vitest";
import {
  FORUM_TOPIC_TAG_MAX_COUNT,
  InvalidForumContentError,
  normalizeForumTags,
} from "./forum-service";

describe("forum tag normalization", () => {
  it("accepts the bounded number of unique normalized tags", () => {
    const tags = normalizeForumTags(
      Array.from({ length: FORUM_TOPIC_TAG_MAX_COUNT }, (_, index) => ` Tag ${index + 1} `),
    );

    expect(tags).toHaveLength(FORUM_TOPIC_TAG_MAX_COUNT);
    expect(tags[0]).toEqual({ key: "tag 1", name: "Tag 1" });
  });

  it("counts only unique non-empty tags toward the topic limit", () => {
    const values = Array.from(
      { length: FORUM_TOPIC_TAG_MAX_COUNT },
      (_, index) => `Tag ${index + 1}`,
    );

    expect(normalizeForumTags(["", "  ", ...values, " tag 1 ", "TAG 2"])).toHaveLength(
      FORUM_TOPIC_TAG_MAX_COUNT,
    );
  });

  it("rejects more than the bounded number of unique tags", () => {
    expect(() => normalizeForumTags(
      Array.from({ length: FORUM_TOPIC_TAG_MAX_COUNT + 1 }, (_, index) => `Tag ${index + 1}`),
    )).toThrow(InvalidForumContentError);
  });
});
