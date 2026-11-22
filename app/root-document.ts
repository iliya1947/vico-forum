import type { ResolvedLocaleContext } from "./localization/locale";
import type { TranslationSnapshot } from "./localization/resource-loader";

export interface RootLoaderMatch {
  readonly loaderData: unknown;
}

function isLocaleContext(value: unknown): value is ResolvedLocaleContext {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ResolvedLocaleContext>;
  return (
    typeof candidate.translationLocale === "string" &&
    (candidate.direction === "ltr" || candidate.direction === "rtl")
  );
}

function localeFromLoaderData(value: unknown): ResolvedLocaleContext | undefined {
  if (isLocaleContext(value)) return value;
  if (value && typeof value === "object" && "locale" in value) {
    const locale = (value as Partial<TranslationSnapshot>).locale;
    if (isLocaleContext(locale)) return locale;
  }
  return undefined;
}

/** One production locale/dir resolution for Framework Layout and embedded Data Router. */
export function rootDocumentLocale(matches: readonly RootLoaderMatch[]): {
  lang: string;
  dir: "ltr" | "rtl";
} {
  const locale = matches
    .map((match) => localeFromLoaderData(match.loaderData))
    .find((candidate) => candidate !== undefined);
  return {
    lang: locale?.translationLocale ?? "en",
    dir: locale?.direction ?? "ltr",
  };
}
