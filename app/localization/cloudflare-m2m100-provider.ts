import {
  TranslationExecutionFailure,
} from "./translation-failures";
import type {
  MachineTranslationProviderAdapter,
  MachineTranslationRequest,
  MachineTranslationResult,
} from "./translation-provider";
import { TranslationValidationError } from "./translation-validation";

export const CLOUDFLARE_M2M100_MODEL = "@cf/meta/m2m100-1.2b";
export const CLOUDFLARE_M2M100_MAX_SOURCE_CHARACTERS = 2_000;

const MAX_TRANSLATED_CHARACTERS = 10_000;

const M2M100_LANGUAGE_CODES = new Set([
  "af", "am", "ar", "ast", "az", "ba", "be", "bg", "bn", "br", "bs", "ca", "ceb", "cs",
  "cy", "da", "de", "el", "en", "es", "et", "fa", "ff", "fi", "fr", "fy", "ga", "gd", "gl",
  "gu", "ha", "he", "hi", "hr", "ht", "hu", "hy", "id", "ig", "ilo", "is", "it", "ja", "jv",
  "ka", "kk", "km", "kn", "ko", "lb", "lg", "ln", "lo", "lt", "lv", "mg", "mk", "ml", "mn",
  "mr", "ms", "my", "ne", "nl", "no", "ns", "oc", "or", "pa", "pl", "ps", "pt", "ro", "ru",
  "sd", "si", "sk", "sl", "so", "sq", "sr", "ss", "su", "sv", "sw", "ta", "th", "tl", "tn",
  "tr", "uk", "ur", "uz", "vi", "wo", "xh", "yi", "yo", "zh", "zu",
]);

const RATE_LIMIT_CODES = new Set([3040]);
const TEMPORARY_CODES = new Set([3007, 3008]);
const UNSUPPORTED_CODES = new Set([3003, 3006, 5004, 5005, 5007]);
const TERMINAL_CODES = new Set([3023, 3036, 3041, 3042, 5016, 5018, 5019, 5035]);

export interface CloudflareM2m100Input {
  readonly text: string;
  readonly source_lang: string;
  readonly target_lang: string;
}

export interface CloudflareWorkersAiRunner {
  run(model: typeof CLOUDFLARE_M2M100_MODEL, input: CloudflareM2m100Input): Promise<unknown>;
}

/**
 * Local/CI provider adapter for the plain-text subset of Cloudflare Workers AI M2M100.
 * Binding provisioning and live Workers AI acceptance remain external Stage 6 concerns.
 */
export class CloudflareM2m100TranslationProvider implements MachineTranslationProviderAdapter {
  constructor(private readonly runner: CloudflareWorkersAiRunner) {}

  supports(request: MachineTranslationRequest): boolean {
    if (request.domain !== "ui" || request.operation !== "plain" || request.messageKind !== "plain") {
      return false;
    }
    if (typeof request.source !== "string" || !request.source.trim()) return false;
    if (request.source.length > CLOUDFLARE_M2M100_MAX_SOURCE_CHARACTERS) return false;
    if (request.sourceLocale === request.targetLocale) return false;

    return providerLanguageCode(request.sourceLocale) !== undefined
      && providerLanguageCode(request.targetLocale) !== undefined;
  }

  async translate(request: MachineTranslationRequest): Promise<MachineTranslationResult> {
    if (!this.supports(request)) {
      throw new TranslationExecutionFailure(
        "terminal",
        "provider-unsupported",
        "Cloudflare M2M100 does not support this translation request",
      );
    }

    const sourceLanguage = providerLanguageCode(request.sourceLocale)!;
    const targetLanguage = providerLanguageCode(request.targetLocale)!;

    let response: unknown;
    try {
      response = await this.runner.run(CLOUDFLARE_M2M100_MODEL, {
        text: request.source as string,
        source_lang: sourceLanguage,
        target_lang: targetLanguage,
      });
    } catch (error) {
      const failure = classifyWorkersAiFailure(error);
      if (failure) throw failure;
      throw error;
    }

    const translatedText = translatedTextFromResponse(response);
    return {
      value: translatedText,
      provenance: {
        provider: "cloudflare-workers-ai",
        model: CLOUDFLARE_M2M100_MODEL,
        origin: "machine",
      },
    };
  }
}

function providerLanguageCode(locale: string): string | undefined {
  const providerCode = locale === "fil" ? "tl" : locale;
  return M2M100_LANGUAGE_CODES.has(providerCode) ? providerCode : undefined;
}

function translatedTextFromResponse(response: unknown): string {
  if (!isRecord(response)) {
    throw new TranslationValidationError("Cloudflare M2M100 response must be an object");
  }

  const translatedText = response.translated_text;
  if (
    typeof translatedText !== "string"
    || !translatedText.trim()
    || translatedText.length > MAX_TRANSLATED_CHARACTERS
  ) {
    throw new TranslationValidationError("Cloudflare M2M100 returned an unusable translation");
  }
  return translatedText;
}

function classifyWorkersAiFailure(error: unknown): TranslationExecutionFailure | undefined {
  const status = numericMetadata(error, "status");
  const code = numericMetadata(error, "code");

  if (code !== undefined && RATE_LIMIT_CODES.has(code)) {
    return new TranslationExecutionFailure(
      "retryable",
      "provider-rate-limited",
      "Cloudflare Workers AI rate limit or capacity is temporarily unavailable",
    );
  }
  if (code !== undefined && TEMPORARY_CODES.has(code)) {
    return new TranslationExecutionFailure(
      "retryable",
      "provider-temporary",
      "Cloudflare Workers AI is temporarily unavailable",
    );
  }
  if (code !== undefined && UNSUPPORTED_CODES.has(code)) {
    return new TranslationExecutionFailure(
      "terminal",
      "provider-unsupported",
      "Cloudflare Workers AI rejected the translation request",
    );
  }
  if (code !== undefined && TERMINAL_CODES.has(code)) {
    return new TranslationExecutionFailure(
      "terminal",
      "provider-terminal",
      "Cloudflare Workers AI rejected the provider configuration or request permanently",
    );
  }

  if (status === 429) {
    return new TranslationExecutionFailure(
      "retryable",
      "provider-rate-limited",
      "Cloudflare Workers AI rate limit or capacity is temporarily unavailable",
    );
  }
  if (status === 408 || (status !== undefined && status >= 500 && status <= 599)) {
    return new TranslationExecutionFailure(
      "retryable",
      "provider-temporary",
      "Cloudflare Workers AI is temporarily unavailable",
    );
  }
  if (status === 400 || status === 405 || status === 413) {
    return new TranslationExecutionFailure(
      "terminal",
      "provider-unsupported",
      "Cloudflare Workers AI rejected the translation request",
    );
  }
  if (status !== undefined && status >= 401 && status <= 499) {
    return new TranslationExecutionFailure(
      "terminal",
      "provider-terminal",
      "Cloudflare Workers AI rejected the provider configuration or request permanently",
    );
  }
  return undefined;
}

function numericMetadata(error: unknown, key: "status" | "code"): number | undefined {
  if (!isRecord(error)) return undefined;
  const value = error[key];
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : undefined;
  }
  return undefined;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
