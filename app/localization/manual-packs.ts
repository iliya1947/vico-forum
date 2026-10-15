import type { UiKey } from "./catalog";
import { reviewedCommonFingerprints } from "./manual-fingerprints";
import { hebrewCommonValues, russianCommonValues } from "./manual-values";
import type { TranslationPack, TranslationValue } from "./sources";
import type { ProviderTranslationValue } from "./translation-validation";

type CommonKey = UiKey<"common">;
type CommonValues = Readonly<Record<CommonKey, ProviderTranslationValue>>;

function reviewedCommonPack(values: CommonValues): TranslationPack {
  return {
    common: Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        {
          value,
          sourceFingerprint: reviewedCommonFingerprints[key as CommonKey],
        } satisfies TranslationValue,
      ]),
    ),
  };
}

export const manualTranslationPacks: Readonly<Record<string, TranslationPack>> = {
  ru: reviewedCommonPack(russianCommonValues),
  he: reviewedCommonPack(hebrewCommonValues),
};
