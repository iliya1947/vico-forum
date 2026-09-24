import { describe, expect, it, vi } from "vitest";
import {
  CLOUDFLARE_M2M100_MAX_SOURCE_CHARACTERS,
  CLOUDFLARE_M2M100_MODEL,
  CLOUDFLARE_WORKERS_AI_PROVIDER,
  CloudflareM2m100TranslationProvider,
  type CloudflareWorkersAiRunner,
} from "./cloudflare-m2m100-provider";
import { TranslationExecutionFailure } from "./translation-failures";
import {
  PublicTopicTitleTranslationProviderDataPolicy,
  type TranslationProviderDataPolicy,
} from "./translation-provider-data-policy";
import {
  machineTranslationCapability,
  TranslationProviderRouter,
  type ContentMachineTranslationRequest,
  type UiMachineTranslationRequest,
} from "./translation-provider";
import { TranslationValidationError } from "./translation-validation";

function uiRequest(
  overrides: Partial<UiMachineTranslationRequest> = {},
): UiMachineTranslationRequest {
  return {
    domain: "ui",
    sourceLocale: "en",
    targetLocale: "fr",
    messageKind: "plain",
    operation: "plain",
    source: "Translation foundation",
    ...overrides,
  };
}

function contentRequest(
  overrides: Partial<ContentMachineTranslationRequest> = {},
): ContentMachineTranslationRequest {
  return {
    domain: "content",
    contentClassification: "public-forum-topic-title",
    sourceLocale: "ru",
    targetLocale: "he",
    messageKind: "plain",
    operation: "plain",
    source: "Заголовок темы",
    ...overrides,
  };
}

function allowPublicTitles(
  allowedLocalePairs = [{ sourceLocale: "ru", targetLocale: "he" }],
): PublicTopicTitleTranslationProviderDataPolicy {
  return new PublicTopicTitleTranslationProviderDataPolicy({
    provider: CLOUDFLARE_WORKERS_AI_PROVIDER,
    model: CLOUDFLARE_M2M100_MODEL,
    allowedLocalePairs,
  });
}

function runner(
  implementation: CloudflareWorkersAiRunner["run"] = async () => ({
    translated_text: "Fondation de traduction",
  }),
): CloudflareWorkersAiRunner {
  return { run: vi.fn(implementation) };
}

describe("CloudflareM2m100TranslationProvider", () => {
  it("preserves the explicitly supported UI plain-text subset without consulting content policy", async () => {
    const ai = runner();
    const dataPolicy: TranslationProviderDataPolicy = { allows: vi.fn(() => false) };
    const adapter = new CloudflareM2m100TranslationProvider(ai, dataPolicy);
    const router = new TranslationProviderRouter([adapter]);

    await expect(router.translate(uiRequest())).resolves.toMatchObject({
      value: "Fondation de traduction",
      provenance: {
        provider: CLOUDFLARE_WORKERS_AI_PROVIDER,
        model: CLOUDFLARE_M2M100_MODEL,
        origin: "machine",
      },
    });

    expect(dataPolicy.allows).not.toHaveBeenCalled();
    expect(adapter.supports(machineTranslationCapability(uiRequest({ targetLocale: "fil" })))).toBe(true);
    expect(adapter.supports(machineTranslationCapability(uiRequest({ targetLocale: "fr-CA" })))).toBe(false);
    expect(adapter.supports(machineTranslationCapability(uiRequest({ targetLocale: "xx" })))).toBe(false);
    expect(adapter.supports(machineTranslationCapability(uiRequest({ sourceLocale: "en", targetLocale: "en" })))).toBe(false);
    expect(adapter.supports(machineTranslationCapability(uiRequest({
      messageKind: "interpolation",
      source: "Hello {{name}}",
    })))).toBe(false);
    expect(adapter.supports(machineTranslationCapability(uiRequest({
      messageKind: "plural",
      operation: "structured",
      source: { one: "{{count}} item", other: "{{count}} items" },
      requiredBranches: ["one", "other"],
    })))).toBe(false);
    expect(adapter.supports(machineTranslationCapability(uiRequest({
      messageKind: "rich",
      operation: "structured",
      source: "Rich input",
    })))).toBe(false);
    expect(adapter.supports(machineTranslationCapability(uiRequest({
      source: "x".repeat(CLOUDFLARE_M2M100_MAX_SOURCE_CHARACTERS + 1),
    })))).toBe(false);
  });

  it("denies content by default and never invokes Workers AI", async () => {
    const ai = runner();
    const adapter = new CloudflareM2m100TranslationProvider(ai);

    expect(adapter.supports(machineTranslationCapability(contentRequest()))).toBe(false);
    await expect(adapter.translate(contentRequest())).rejects.toMatchObject({
      disposition: "terminal",
      code: "provider-unsupported",
    });
    expect(ai.run).not.toHaveBeenCalled();
  });

  it("passes only non-sensitive capability metadata to content data policy", () => {
    const dataPolicy: TranslationProviderDataPolicy = { allows: vi.fn(() => true) };
    const adapter = new CloudflareM2m100TranslationProvider(runner(), dataPolicy);

    expect(adapter.supports(machineTranslationCapability(contentRequest()))).toBe(true);
    expect(dataPolicy.allows).toHaveBeenCalledWith({
      provider: CLOUDFLARE_WORKERS_AI_PROVIDER,
      model: CLOUDFLARE_M2M100_MODEL,
      contentClassification: "public-forum-topic-title",
      sourceLocale: "ru",
      targetLocale: "he",
      operation: "plain",
    });
    const policyInput = vi.mocked(dataPolicy.allows).mock.calls[0]?.[0] as unknown as
      Record<string, unknown>;
    expect(policyInput).not.toHaveProperty("source");
    expect(policyInput).not.toHaveProperty("credentials");
    expect(policyInput).not.toHaveProperty("detector");
  });

  it("allows only explicitly configured public topic-title locale pairs", async () => {
    const ai = runner(async () => ({ translated_text: "כותרת הנושא" }));
    const adapter = new CloudflareM2m100TranslationProvider(ai, allowPublicTitles());

    await expect(adapter.translate(contentRequest())).resolves.toEqual({
      value: "כותרת הנושא",
      provenance: {
        provider: CLOUDFLARE_WORKERS_AI_PROVIDER,
        model: CLOUDFLARE_M2M100_MODEL,
        origin: "machine",
      },
    });
    expect(ai.run).toHaveBeenCalledWith(CLOUDFLARE_M2M100_MODEL, {
      text: "Заголовок темы",
      source_lang: "ru",
      target_lang: "he",
    });

    const deniedRequests = [
      contentRequest({ targetLocale: "fr" }),
      contentRequest({ contentClassification: "public-forum-post-body" }),
      contentRequest({ contentClassification: "non-public-content" }),
      contentRequest({
        contentClassification: "unknown" as ContentMachineTranslationRequest["contentClassification"],
      }),
      contentRequest({
        messageKind: "rich",
        operation: "structured",
        source: "Rich title",
      }),
    ];
    vi.mocked(ai.run).mockClear();
    for (const denied of deniedRequests) {
      expect(adapter.supports(denied)).toBe(false);
      await expect(adapter.translate(denied)).rejects.toMatchObject({
        disposition: "terminal",
        code: "provider-unsupported",
      });
    }
    expect(ai.run).not.toHaveBeenCalled();
  });

  it("re-evaluates content policy on every call and blocks a revoked capability", async () => {
    let allowed = true;
    const dataPolicy: TranslationProviderDataPolicy = {
      allows: vi.fn(() => allowed),
    };
    const ai = runner(async () => ({ translated_text: "כותרת" }));
    const adapter = new CloudflareM2m100TranslationProvider(ai, dataPolicy);

    expect(adapter.supports(machineTranslationCapability(contentRequest()))).toBe(true);
    allowed = false;

    await expect(adapter.translate(contentRequest())).rejects.toMatchObject({
      disposition: "terminal",
      code: "provider-unsupported",
    });
    expect(ai.run).not.toHaveBeenCalled();
    expect(dataPolicy.allows).toHaveBeenCalledTimes(2);
  });

  it("uses the fixed model and exact mapped UI language-code payload", async () => {
    const ai = runner(async () => ({ translated_text: "יסוד תרגום" }));
    const adapter = new CloudflareM2m100TranslationProvider(ai);

    await expect(adapter.translate(uiRequest({ targetLocale: "he" }))).resolves.toEqual({
      value: "יסוד תרגום",
      provenance: {
        provider: CLOUDFLARE_WORKERS_AI_PROVIDER,
        model: CLOUDFLARE_M2M100_MODEL,
        origin: "machine",
      },
    });

    expect(ai.run).toHaveBeenCalledWith(CLOUDFLARE_M2M100_MODEL, {
      text: "Translation foundation",
      source_lang: "en",
      target_lang: "he",
    });
  });

  it("maps canonical Filipino to the M2M100 Tagalog provider code", async () => {
    const ai = runner(async () => ({ translated_text: "Pundasyon ng pagsasalin" }));
    const adapter = new CloudflareM2m100TranslationProvider(ai);

    await expect(adapter.translate(uiRequest({ targetLocale: "fil" }))).resolves.toMatchObject({
      value: "Pundasyon ng pagsasalin",
    });
    expect(ai.run).toHaveBeenCalledWith(CLOUDFLARE_M2M100_MODEL, {
      text: "Translation foundation",
      source_lang: "en",
      target_lang: "tl",
    });
  });

  it.each([
    undefined,
    null,
    "bad",
    {},
    { translated_text: 42 },
    { translated_text: "" },
    { translated_text: "   " },
    { translated_text: "x".repeat(10_001) },
  ])("rejects malformed provider output %#", async (response) => {
    const adapter = new CloudflareM2m100TranslationProvider(runner(async () => response));
    await expect(adapter.translate(uiRequest())).rejects.toBeInstanceOf(TranslationValidationError);
  });

  it.each([
    [{ status: 429 }, "retryable", "provider-rate-limited"],
    [{ status: 429, code: 3040 }, "retryable", "provider-rate-limited"],
    [{ status: 408, code: 3007 }, "retryable", "provider-temporary"],
    [{ status: 503 }, "retryable", "provider-temporary"],
    [{ status: 400, code: 5004 }, "terminal", "provider-unsupported"],
    [{ status: 413, code: 3006 }, "terminal", "provider-unsupported"],
    [{ status: 405, code: 5019 }, "terminal", "provider-terminal"],
    [{ status: 429, code: 3036 }, "terminal", "provider-terminal"],
    [{ status: 403, code: 5035 }, "terminal", "provider-terminal"],
    [{ status: 404, code: 3042 }, "terminal", "provider-terminal"],
  ] as const)(
    "maps known Workers AI failure metadata %j to %s/%s",
    async (failure, disposition, code) => {
      const adapter = new CloudflareM2m100TranslationProvider(runner(async () => {
        throw failure;
      }));

      try {
        await adapter.translate(uiRequest());
        throw new Error("Expected provider failure");
      } catch (error) {
        expect(error).toBeInstanceOf(TranslationExecutionFailure);
        expect(error).toMatchObject({ disposition, code });
      }
    },
  );

  it("preserves unknown programming errors instead of classifying them as provider failures", async () => {
    const original = new Error("unexpected adapter bug");
    const adapter = new CloudflareM2m100TranslationProvider(runner(async () => {
      throw original;
    }));

    await expect(adapter.translate(uiRequest())).rejects.toBe(original);
  });

  it("defensively rejects a direct unsupported request without calling Workers AI", async () => {
    const ai = runner();
    const adapter = new CloudflareM2m100TranslationProvider(ai);

    await expect(adapter.translate(uiRequest({ targetLocale: "fr-CA" }))).rejects.toMatchObject({
      disposition: "terminal",
      code: "provider-unsupported",
    });
    expect(ai.run).not.toHaveBeenCalled();
  });
});
