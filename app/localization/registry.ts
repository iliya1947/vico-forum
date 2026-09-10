import { parseLocaleCandidate, type LocaleDefinition } from "./locale";

const BOOTSTRAP_ENGLISH: LocaleDefinition = {
  tag: "en",
  translationStatus: "ready",
  publicationStatus: "active",
  direction: "ltr",
  fallbackChain: [],
  nativeName: "English",
};

export interface LocaleMatch {
  locale: LocaleDefinition;
  kind: "canonical" | "alias";
}

export interface LocaleRegistry {
  readonly bootstrap: LocaleDefinition;
  find(tag: string): LocaleMatch | undefined;
  activeLocales(): readonly LocaleDefinition[];
}

function canonicalTag(value: string, field: string): string {
  const parsed = parseLocaleCandidate(value);
  if (!parsed || parsed.canonicalInput !== parsed.translationTag) {
    throw new Error(`${field} must be a BCP-47 translation locale without extensions: ${value}`);
  }
  return parsed.translationTag;
}

export class InMemoryLocaleRegistry implements LocaleRegistry {
  readonly bootstrap: LocaleDefinition;
  readonly #locales = new Map<string, LocaleDefinition>();
  readonly #matches = new Map<string, LocaleMatch>();

  constructor(configuredLocales: readonly LocaleDefinition[] = []) {
    const definitions = [BOOTSTRAP_ENGLISH, ...configuredLocales];

    for (const input of definitions) {
      const tag = canonicalTag(input.tag, "Locale tag");
      if (this.#locales.has(tag)) throw new Error(`Duplicate locale: ${tag}`);

      const fallbackChain = input.fallbackChain.map((fallback) => canonicalTag(fallback, "Fallback"));
      if (new Set(fallbackChain).size !== fallbackChain.length) {
        throw new Error(`Duplicate fallback in locale: ${tag}`);
      }
      if (fallbackChain.includes(tag)) throw new Error(`Locale cannot fall back to itself: ${tag}`);

      this.#locales.set(tag, {
        ...input,
        tag,
        fallbackChain,
        aliases: input.aliases ? [...input.aliases] : undefined,
        matchTags: input.matchTags ? [...input.matchTags] : undefined,
        presentationMetadata: { ...input.presentationMetadata },
      });
    }

    this.bootstrap = this.#locales.get("en")!;
    if (this.bootstrap.publicationStatus !== "active") {
      throw new Error("Bootstrap English must remain active");
    }

    for (const locale of this.#locales.values()) {
      this.#addMatch(locale.tag, locale, "canonical");
      for (const alias of [...(locale.aliases ?? []), ...(locale.matchTags ?? [])]) {
        const parsed = parseLocaleCandidate(alias);
        if (!parsed) throw new Error(`Invalid locale alias: ${alias}`);
        this.#addMatch(parsed.translationTag, locale, "alias");
      }
      for (const fallback of locale.fallbackChain) {
        if (!this.#locales.has(fallback)) throw new Error(`Unknown fallback ${fallback} for ${locale.tag}`);
      }
    }

    for (const locale of this.#locales.values()) this.#validateFallbackCycle(locale.tag, []);
  }

  #addMatch(tag: string, locale: LocaleDefinition, kind: LocaleMatch["kind"]) {
    const existing = this.#matches.get(tag);
    if (existing && existing.locale.tag !== locale.tag) {
      throw new Error(`Ambiguous locale alias: ${tag}`);
    }
    if (existing && kind === "alias") return;
    this.#matches.set(tag, { locale, kind });
  }

  #validateFallbackCycle(tag: string, path: string[]) {
    if (path.includes(tag)) throw new Error(`Locale fallback cycle: ${[...path, tag].join(" -> ")}`);
    const locale = this.#locales.get(tag)!;
    for (const fallback of locale.fallbackChain) {
      this.#validateFallbackCycle(fallback, [...path, tag]);
    }
  }

  find(tag: string): LocaleMatch | undefined {
    return this.#matches.get(tag);
  }

  activeLocales(): readonly LocaleDefinition[] {
    return [...this.#locales.values()].filter((locale) => locale.publicationStatus === "active");
  }
}

export const localeRegistry: LocaleRegistry = new InMemoryLocaleRegistry([
  {
    tag: "ru",
    translationStatus: "draft",
    publicationStatus: "active",
    direction: "ltr",
    fallbackChain: ["en"],
    nativeName: "Русский",
  },
  {
    tag: "he",
    translationStatus: "draft",
    publicationStatus: "active",
    direction: "rtl",
    fallbackChain: ["en"],
    aliases: ["iw"],
    nativeName: "עברית",
  },
  {
    tag: "ka",
    translationStatus: "draft",
    publicationStatus: "inactive",
    direction: "ltr",
    fallbackChain: ["en"],
    nativeName: "ქართული",
  },
]);
