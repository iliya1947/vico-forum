import { detectAll as tinyLdDetectAll } from "tinyld";

import type {
  ContentSourceLocaleDetectionAdapter,
  ContentSourceLocaleDetectionInput,
} from "./content-source-locale";
import {
  extractMarkdownSemanticTextForSourceLocaleDetection,
  extractPlainSemanticTextForSourceLocaleDetection,
} from "./content-markdown-translation";
import { canonicalizeTranslationLocale } from "./locale";

export const TINYLD_DETECTOR_NAME = "tinyld";
export const TINYLD_DETECTOR_MODEL = "normal@1.3.4";
export const TINYLD_MINIMUM_SEMANTIC_LETTERS = 24;
export const TINYLD_MINIMUM_NATIVE_SCORE = 0.80;
export const TINYLD_MINIMUM_SCORE_MARGIN = 0.20;

export interface TinyLdCandidate {
  readonly lang: string;
  readonly accuracy: number;
}

export type TinyLdDetectAll = (text: string) => TinyLdCandidate[];

const UNICODE_LETTER = /\p{L}/gu;
const GEORGIAN_SCRIPT = /\p{Script=Georgian}/u;

/**
 * Reviewed TinyLD output -> canonical Vico translation-language mapping.
 *
 * TinyLD remains provider-local: this table does not register locales, infer
 * region/script subtags, or expose TinyLD aliases to LocaleRegistry.
 */
export const TINYLD_TO_VICO_SOURCE_LOCALE = Object.freeze({
  af: "af",
  am: "am",
  ar: "ar",
  be: "be",
  bg: "bg",
  bn: "bn",
  cs: "cs",
  da: "da",
  de: "de",
  el: "el",
  en: "en",
  eo: "eo",
  es: "es",
  et: "et",
  fa: "fa",
  fi: "fi",
  fr: "fr",
  ga: "ga",
  gu: "gu",
  he: "he",
  hi: "hi",
  hu: "hu",
  hy: "hy",
  id: "id",
  is: "is",
  it: "it",
  ja: "ja",
  kk: "kk",
  km: "km",
  kn: "kn",
  ko: "ko",
  la: "la",
  lt: "lt",
  lv: "lv",
  mk: "mk",
  mn: "mn",
  my: "my",
  nl: "nl",
  no: "no",
  pl: "pl",
  pt: "pt",
  rn: "rn",
  ro: "ro",
  ru: "ru",
  sk: "sk",
  sr: "sr",
  sv: "sv",
  ta: "ta",
  te: "te",
  th: "th",
  tk: "tk",
  tlh: "tlh",
  tr: "tr",
  tt: "tt",
  uk: "uk",
  ur: "ur",
  vi: "vi",
  vo: "vo",
  yi: "yi",
  zh: "zh",
} as const);

export class TinyLdContentSourceLocaleDetector
implements ContentSourceLocaleDetectionAdapter {
  constructor(
    private readonly detectAll: TinyLdDetectAll = tinyLdDetectAll,
  ) {}

  async detect(input: ContentSourceLocaleDetectionInput): Promise<unknown> {
    const semanticText = semanticDetectionText(input);
    if (
      countUnicodeLetters(semanticText) < TINYLD_MINIMUM_SEMANTIC_LETTERS
      || GEORGIAN_SCRIPT.test(semanticText)
    ) {
      return undefined;
    }

    const candidates = this.detectAll(semanticText);
    assertCandidateList(candidates);
    const top = candidates[0];
    if (!top) return undefined;

    const runnerUpScore = candidates[1]?.accuracy ?? 0;
    if (
      top.accuracy < TINYLD_MINIMUM_NATIVE_SCORE
      || top.accuracy - runnerUpScore < TINYLD_MINIMUM_SCORE_MARGIN
    ) {
      return undefined;
    }

    const mapped = TINYLD_TO_VICO_SOURCE_LOCALE[
      top.lang as keyof typeof TINYLD_TO_VICO_SOURCE_LOCALE
    ];
    if (!mapped) return undefined;

    const canonical = canonicalizeTranslationLocale(mapped);
    if (canonical !== mapped) {
      throw new TypeError("TinyLD source-locale mapping must be canonical Vico language identity");
    }

    return {
      locale: canonical,
      // Existing CNT-03 transport field; this is TinyLD's native normalized
      // score, not a calibrated probability.
      confidence: top.accuracy,
      evidence: {
        origin: "detector",
        detector: TINYLD_DETECTOR_NAME,
        model: TINYLD_DETECTOR_MODEL,
      },
    };
  }
}

function semanticDetectionText(input: ContentSourceLocaleDetectionInput): string {
  switch (input.contentType) {
    case "topic-title":
      return extractPlainSemanticTextForSourceLocaleDetection(input.originalContent);
    case "post-body":
      return extractMarkdownSemanticTextForSourceLocaleDetection(input.originalContent);
    default:
      throw new TypeError("TinyLD detector received an unsupported content type");
  }
}

function countUnicodeLetters(value: string): number {
  return [...value.matchAll(UNICODE_LETTER)].length;
}

function assertCandidateList(value: unknown): asserts value is TinyLdCandidate[] {
  if (!Array.isArray(value)) {
    throw new TypeError("TinyLD detectAll() must return a candidate array");
  }

  for (const candidate of value) {
    if (
      !candidate
      || typeof candidate !== "object"
      || Array.isArray(candidate)
      || typeof candidate.lang !== "string"
      || !candidate.lang.trim()
      || typeof candidate.accuracy !== "number"
      || !Number.isFinite(candidate.accuracy)
      || candidate.accuracy < 0
      || candidate.accuracy > 1
    ) {
      throw new TypeError("TinyLD detectAll() returned an invalid candidate");
    }
  }
}
