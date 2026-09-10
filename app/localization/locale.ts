export type TextDirection = "ltr" | "rtl";
export type TranslationStatus = "draft" | "generating" | "partial" | "ready";
export type PublicationStatus = "inactive" | "active" | "disabled";

export interface LocaleDefinition {
  tag: string;
  translationStatus: TranslationStatus;
  publicationStatus: PublicationStatus;
  direction: TextDirection;
  fallbackChain: readonly string[];
  aliases?: readonly string[];
  matchTags?: readonly string[];
  nativeName: string;
  presentationMetadata?: Readonly<Record<string, string>>;
}

export interface FormattingContext {
  locale: string;
  timeZone: string;
  numberingSystem?: string;
  calendar?: string;
}

export interface ResolvedLocaleContext {
  translationLocale: string;
  fallbackLocales: readonly string[];
  direction: TextDirection;
  formatting: FormattingContext;
  nativeName: string;
  presentationMetadata: Readonly<Record<string, string>>;
}

export interface LocaleCandidate {
  translationTag: string;
  canonicalInput: string;
  formattingPreferences: Pick<FormattingContext, "numberingSystem" | "calendar">;
}

export function parseLocaleCandidate(candidate: string): LocaleCandidate | undefined {
  try {
    const canonicalInput = Intl.getCanonicalLocales(candidate)[0];
    if (!canonicalInput) return undefined;

    const locale = new Intl.Locale(canonicalInput);
    return {
      translationTag: locale.baseName,
      canonicalInput,
      formattingPreferences: {
        ...(locale.numberingSystem ? { numberingSystem: locale.numberingSystem } : {}),
        ...(locale.calendar ? { calendar: locale.calendar } : {}),
      },
    };
  } catch {
    return undefined;
  }
}
