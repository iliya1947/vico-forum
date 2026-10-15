export type TextDirection = "ltr" | "rtl";
export type TranslationStatus = "draft" | "generating" | "partial" | "ready";
export type PublicationStatus = "inactive" | "active" | "disabled";

export interface LocaleDefinition {
  readonly tag: string;
  readonly translationStatus: TranslationStatus;
  readonly publicationStatus: PublicationStatus;
  readonly direction: TextDirection;
  readonly fallbackChain: readonly string[];
  readonly aliases?: readonly string[];
  readonly matchTags?: readonly string[];
  readonly nativeName: string;
  readonly presentationMetadata?: Readonly<Record<string, string>>;
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

export function canonicalizeTranslationLocale(candidate: string): string | undefined {
  const parsed = parseLocaleCandidate(candidate);
  if (!parsed || parsed.canonicalInput !== parsed.translationTag) return undefined;
  return parsed.translationTag;
}
