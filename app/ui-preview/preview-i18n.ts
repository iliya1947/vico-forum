import { canonicalEnglishCatalog } from "../localization/catalog";
import { manualTranslationPacks } from "../localization/manual-packs";
import { createTranslationRuntime } from "../localization/runtime";
import type { ResourceBundle } from "../localization/sources";

export const PREVIEW_LOCALES = ["en", "ru", "he"] as const;
export type PreviewLocale = (typeof PREVIEW_LOCALES)[number];

export function isPreviewLocale(locale: string): locale is PreviewLocale {
  return PREVIEW_LOCALES.some((candidate) => candidate === locale);
}

function canonicalCommonResources(): Record<string, string> {
  const resources: Record<string, string> = {};
  for (const [key, descriptor] of Object.entries(canonicalEnglishCatalog.common)) {
    if (typeof descriptor.source === "string") {
      resources[key] = descriptor.source;
      continue;
    }
    for (const [branch, value] of Object.entries(descriptor.source)) {
      resources[`${key}_${branch}`] = value;
    }
  }
  return resources;
}

function manualCommonResources(locale: Exclude<PreviewLocale, "en">): Record<string, string> {
  const messages = manualTranslationPacks[locale]?.common;
  if (!messages) throw new Error(`Missing preview manual pack: ${locale}`);

  const resources: Record<string, string> = {};
  for (const [key, translation] of Object.entries(messages)) {
    if (typeof translation.value === "string") {
      resources[key] = translation.value;
      continue;
    }
    for (const [branch, value] of Object.entries(translation.value)) {
      resources[`${key}_${branch}`] = value;
    }
  }
  return resources;
}

const english = canonicalCommonResources();
const russian = manualCommonResources("ru");
const hebrew = manualCommonResources("he");

const previewMetadata = {
  en: { nativeName: "English" },
  ru: { nativeName: "Русский" },
  he: { nativeName: "עברית" },
} as const;

export function previewTranslationRuntime(locale: PreviewLocale, direction: "ltr" | "rtl") {
  const localizedCommon = locale === "ru"
    ? russian
    : locale === "he"
      ? hebrew
      : undefined;

  const resourcesByLocale: Record<string, ResourceBundle> = localizedCommon
    ? { en: { common: english }, [locale]: { common: localizedCommon } }
    : { en: { common: english } };

  return createTranslationRuntime({
    locale: {
      translationLocale: locale,
      fallbackLocales: locale === "en" ? [] : ["en"],
      direction,
      formatting: { locale, timeZone: "UTC" },
      nativeName: previewMetadata[locale].nativeName,
      presentationMetadata: {},
    },
    fallbackLocales: locale === "en" ? [] : ["en"],
    resourcesByLocale,
    bundleVersions: localizedCommon
      ? { en: { common: "preview-en" }, [locale]: { common: `preview-${locale}` } }
      : { en: { common: "preview-en" } },
    staleKeys: {},
  });
}
