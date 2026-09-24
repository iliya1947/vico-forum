import { describe, expect, it, vi } from "vitest";
import {
  CLOUDFLARE_M2M100_MAX_SOURCE_CHARACTERS,
  CLOUDFLARE_M2M100_MODEL,
  CloudflareM2m100TranslationProvider,
  type CloudflareWorkersAiRunner,
} from "./cloudflare-m2m100-provider";
import { TranslationExecutionFailure } from "./translation-failures";
import {
  TranslationProviderRouter,
  type MachineTranslationRequest,
} from "./translation-provider";
import { TranslationValidationError } from "./translation-validation";

function plainRequest(
  overrides: Partial<MachineTranslationRequest> = {},
): MachineTranslationRequest {
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

function runner(
  implementation: CloudflareWorkersAiRunner["run"] = async () => ({ translated_text: "Fondation de traduction" }),
): CloudflareWorkersAiRunner {
  return { run: vi.fn(implementation) };
}

describe("CloudflareM2m100TranslationProvider", () => {
  it("routes only the explicitly supported UI plain-text subset", async () => {
    const ai = runner();
    const adapter = new CloudflareM2m100TranslationProvider(ai);
    const router = new TranslationProviderRouter([adapter]);

    await expect(router.translate(plainRequest())).resolves.toMatchObject({
      value: "Fondation de traduction",
      provenance: {
        provider: "cloudflare-workers-ai",
        model: CLOUDFLARE_M2M100_MODEL,
        origin: "machine",
      },
    });

    expect(adapter.supports(plainRequest({ targetLocale: "fil" }))).toBe(true);
    expect(adapter.supports(plainRequest({ targetLocale: "fr-CA" }))).toBe(false);
    expect(adapter.supports(plainRequest({ targetLocale: "xx" }))).toBe(false);
    expect(adapter.supports(plainRequest({ sourceLocale: "en", targetLocale: "en" }))).toBe(false);
    expect(adapter.supports(plainRequest({ domain: "content" }))).toBe(false);
    expect(adapter.supports(plainRequest({
      messageKind: "interpolation",
      source: "Hello {{name}}",
    }))).toBe(false);
    expect(adapter.supports(plainRequest({
      messageKind: "plural",
      operation: "structured",
      source: { one: "{{count}} item", other: "{{count}} items" },
      requiredBranches: ["one", "other"],
    }))).toBe(false);
    expect(adapter.supports(plainRequest({
      messageKind: "rich",
      operation: "structured",
      source: "Rich input",
    }))).toBe(false);
    expect(adapter.supports(plainRequest({
      source: "x".repeat(CLOUDFLARE_M2M100_MAX_SOURCE_CHARACTERS + 1),
    }))).toBe(false);
  });

  it("uses the fixed model and exact mapped language-code payload", async () => {
    const ai = runner(async () => ({ translated_text: "יסוד תרגום" }));
    const adapter = new CloudflareM2m100TranslationProvider(ai);

    await expect(adapter.translate(plainRequest({ targetLocale: "he" }))).resolves.toEqual({
      value: "יסוד תרגום",
      provenance: {
        provider: "cloudflare-workers-ai",
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

    await expect(adapter.translate(plainRequest({ targetLocale: "fil" }))).resolves.toMatchObject({
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
    await expect(adapter.translate(plainRequest())).rejects.toBeInstanceOf(TranslationValidationError);
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
        await adapter.translate(plainRequest());
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

    await expect(adapter.translate(plainRequest())).rejects.toBe(original);
  });

  it("defensively rejects a direct unsupported request without calling Workers AI", async () => {
    const ai = runner();
    const adapter = new CloudflareM2m100TranslationProvider(ai);

    await expect(adapter.translate(plainRequest({ targetLocale: "fr-CA" }))).rejects.toMatchObject({
      disposition: "terminal",
      code: "provider-unsupported",
    });
    expect(ai.run).not.toHaveBeenCalled();
  });
});
