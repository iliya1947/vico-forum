import { describe, expect, it } from "vitest";

import {
  PublicTopicTitleTranslationProviderDataPolicy,
} from "./translation-provider-data-policy";

const configuration = {
  provider: "cloudflare-workers-ai",
  model: "@cf/meta/m2m100-1.2b",
  allowedLocalePairs: [
    { sourceLocale: "ru", targetLocale: "he" },
    { sourceLocale: "en", targetLocale: "fr" },
  ],
} as const;

describe("PublicTopicTitleTranslationProviderDataPolicy", () => {
  it("allows only the configured provider/model public-title plain locale pairs", () => {
    const policy = new PublicTopicTitleTranslationProviderDataPolicy(configuration);

    expect(policy.allows({
      provider: "cloudflare-workers-ai",
      model: "@cf/meta/m2m100-1.2b",
      contentClassification: "public-forum-topic-title",
      sourceLocale: "ru",
      targetLocale: "he",
      operation: "plain",
    })).toBe(true);

    for (const denied of [
      {
        provider: "other-provider",
        model: "@cf/meta/m2m100-1.2b",
        contentClassification: "public-forum-topic-title" as const,
        sourceLocale: "ru",
        targetLocale: "he",
        operation: "plain" as const,
      },
      {
        provider: "cloudflare-workers-ai",
        model: "other-model",
        contentClassification: "public-forum-topic-title" as const,
        sourceLocale: "ru",
        targetLocale: "he",
        operation: "plain" as const,
      },
      {
        provider: "cloudflare-workers-ai",
        model: "@cf/meta/m2m100-1.2b",
        contentClassification: "public-forum-post-body" as const,
        sourceLocale: "ru",
        targetLocale: "he",
        operation: "plain" as const,
      },
      {
        provider: "cloudflare-workers-ai",
        model: "@cf/meta/m2m100-1.2b",
        contentClassification: "non-public-content" as const,
        sourceLocale: "ru",
        targetLocale: "he",
        operation: "plain" as const,
      },
      {
        provider: "cloudflare-workers-ai",
        model: "@cf/meta/m2m100-1.2b",
        contentClassification: "public-forum-topic-title" as const,
        sourceLocale: "ru",
        targetLocale: "fr",
        operation: "plain" as const,
      },
      {
        provider: "cloudflare-workers-ai",
        model: "@cf/meta/m2m100-1.2b",
        contentClassification: "public-forum-topic-title" as const,
        sourceLocale: "ru",
        targetLocale: "he",
        operation: "structured" as const,
      },
    ]) {
      expect(policy.allows(denied)).toBe(false);
    }
  });

  it.each([
    [{ sourceLocale: "RU", targetLocale: "he" }, "sourceLocale"],
    [{ sourceLocale: "ru", targetLocale: "HE" }, "targetLocale"],
    [{ sourceLocale: "und", targetLocale: "he" }, "sourceLocale"],
    [{ sourceLocale: "ru", targetLocale: "ru" }, "same-locale"],
  ] as const)("rejects invalid allowlisted pair %j", (pair, reason) => {
    expect(() => new PublicTopicTitleTranslationProviderDataPolicy({
      provider: "cloudflare-workers-ai",
      model: "@cf/meta/m2m100-1.2b",
      allowedLocalePairs: [pair],
    })).toThrow(reason === "same-locale" ? /same-locale/ : new RegExp(reason));
  });
});
