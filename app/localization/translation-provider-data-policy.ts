import { canonicalizeTranslationLocale, parseLocaleCandidate } from "./locale";
import type {
  ContentDataClassification,
  TranslationOperation,
} from "./translation-provider";

export interface TranslationProviderDataPolicyInput {
  readonly provider: string;
  readonly model: string;
  readonly contentClassification: ContentDataClassification;
  readonly sourceLocale: string;
  readonly targetLocale: string;
  readonly operation: TranslationOperation;
}

export interface TranslationProviderDataPolicy {
  allows(input: TranslationProviderDataPolicyInput): boolean;
}

export const DENY_ALL_TRANSLATION_PROVIDER_DATA_POLICY: TranslationProviderDataPolicy = {
  allows: () => false,
};

export interface TranslationProviderLocalePair {
  readonly sourceLocale: string;
  readonly targetLocale: string;
}

export interface PublicTopicTitleDataPolicyConfiguration {
  readonly provider: string;
  readonly model: string;
  readonly allowedLocalePairs: readonly TranslationProviderLocalePair[];
}

/**
 * Explicit local/CI opt-in policy for public forum topic titles.
 *
 * It is deliberately narrow: only the configured provider/model, exact canonical locale pairs,
 * public topic-title classification and plain operation can pass.
 */
export class PublicTopicTitleTranslationProviderDataPolicy
implements TranslationProviderDataPolicy {
  private readonly provider: string;
  private readonly model: string;
  private readonly allowedPairs: ReadonlySet<string>;

  constructor(configuration: PublicTopicTitleDataPolicyConfiguration) {
    this.provider = requireNonBlank(configuration.provider, "provider");
    this.model = requireNonBlank(configuration.model, "model");
    this.allowedPairs = new Set(configuration.allowedLocalePairs.map((pair) => {
      const sourceLocale = requireCanonicalLocale(pair.sourceLocale, "sourceLocale");
      const targetLocale = requireCanonicalLocale(pair.targetLocale, "targetLocale");
      if (sourceLocale === targetLocale) {
        throw new TypeError("provider data-policy locale pair must not be same-locale");
      }
      return pairKey(sourceLocale, targetLocale);
    }));
  }

  allows(input: TranslationProviderDataPolicyInput): boolean {
    return input.provider === this.provider
      && input.model === this.model
      && input.contentClassification === "public-forum-topic-title"
      && input.operation === "plain"
      && this.allowedPairs.has(pairKey(input.sourceLocale, input.targetLocale));
  }
}

function pairKey(sourceLocale: string, targetLocale: string): string {
  return `${sourceLocale}\0${targetLocale}`;
}

function requireCanonicalLocale(value: string, field: string): string {
  const parsed = parseLocaleCandidate(value);
  const canonical = canonicalizeTranslationLocale(value);
  if (
    !parsed
    || !canonical
    || canonical === "und"
    || parsed.canonicalInput !== value
    || parsed.translationTag !== value
    || canonical !== value
  ) {
    throw new TypeError(`${field} must be an already-canonical non-und translation locale`);
  }
  return canonical;
}

function requireNonBlank(value: string, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${field} must be a non-blank string`);
  }
  return value;
}
