import { canonicalizeTranslationLocale } from "./locale";

export type PluralBranch = Intl.LDMLPluralRule;

export interface LocaleRulesProvider {
  pluralBranches(locale: string): readonly PluralBranch[];
}

export class LocaleRulesUnavailableError extends Error {
  constructor(locale: string, options?: ErrorOptions) {
    super(`Plural rules are unavailable for locale: ${locale}`, options);
    this.name = "LocaleRulesUnavailableError";
  }
}

/** Isolates the runtime Intl/CLDR data from the translation domain. */
export class IntlLocaleRulesProvider implements LocaleRulesProvider {
  pluralBranches(locale: string): readonly PluralBranch[] {
    const canonicalLocale = canonicalizeTranslationLocale(locale);
    if (!canonicalLocale) throw new LocaleRulesUnavailableError(locale);

    try {
      if (Intl.PluralRules.supportedLocalesOf([canonicalLocale]).length !== 1) {
        throw new LocaleRulesUnavailableError(locale);
      }
      const categories = new Intl.PluralRules(canonicalLocale, { type: "cardinal" })
        .resolvedOptions().pluralCategories;
      if (categories.length === 0 || !categories.includes("other")) {
        throw new LocaleRulesUnavailableError(locale);
      }
      return [...categories].sort(deterministicCompare);
    } catch (error) {
      if (error instanceof LocaleRulesUnavailableError) throw error;
      throw new LocaleRulesUnavailableError(locale, { cause: error });
    }
  }
}

function deterministicCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
