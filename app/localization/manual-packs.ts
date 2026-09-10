import type { TranslationPack } from "./sources";

export const manualTranslationPacks: Readonly<Record<string, TranslationPack>> = {
  ru: {
    common: {
      heading: {
        value: "Основа переводов",
        sourceFingerprint: "85062b96bd9c772b8c4a8d77cadd15ac4dc47ec0476d2486f022f29b78eb7e1a",
      },
      stageSummary: {
        value: "Устаревший перевод не должен отображаться.",
        sourceFingerprint: "intentionally-stale",
      },
    },
  },
  he: {
    common: {
      heading: {
        value: "תשתית תרגום",
        sourceFingerprint: "85062b96bd9c772b8c4a8d77cadd15ac4dc47ec0476d2486f022f29b78eb7e1a",
      },
    },
  },
};

