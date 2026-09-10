import type { FormattingContext, LocaleCandidate, ResolvedLocaleContext } from "./locale";
import { parseLocaleCandidate } from "./locale";
import type { LocaleMatch, LocaleRegistry } from "./registry";

export const LOCALE_COOKIE_NAME = "vico_locale";
const SAFE_METHODS = new Set(["GET", "HEAD"]);

export interface AuthenticatedLocaleSource {
  locale: string | undefined;
}

export type ExplicitLocaleResolution =
  | { type: "resolved"; context: ResolvedLocaleContext }
  | { type: "redirect"; status: 307 | 308; location: string }
  | { type: "not-found" };

function toContext(match: LocaleMatch, candidate?: LocaleCandidate): ResolvedLocaleContext {
  const locale = match.locale;
  const formatting: FormattingContext = {
    locale: locale.tag,
    timeZone: "UTC",
    ...candidate?.formattingPreferences,
  };
  return {
    translationLocale: locale.tag,
    fallbackLocales: [...locale.fallbackChain],
    direction: locale.direction,
    formatting,
    nativeName: locale.nativeName,
    presentationMetadata: { ...locale.presentationMetadata },
  };
}

function internalLocaleLocation(request: Request, locale: string): string {
  const url = new URL(request.url);
  const segmentEnd = url.pathname.indexOf("/", 1);
  const remainder = segmentEnd === -1 ? "/" : url.pathname.slice(segmentEnd);
  return `/${encodeURIComponent(locale)}${remainder}${url.search}`;
}

function isCanonicalInput(rawCandidate: string, candidate: LocaleCandidate, match: LocaleMatch) {
  return (
    match.kind === "canonical" &&
    rawCandidate === match.locale.tag &&
    candidate.canonicalInput === candidate.translationTag
  );
}

export function resolveExplicitLocale(
  request: Request,
  rawCandidate: string,
  registry: LocaleRegistry,
): ExplicitLocaleResolution {
  const candidate = parseLocaleCandidate(rawCandidate);
  const match = candidate ? registry.find(candidate.translationTag) : undefined;
  const active = match?.locale.publicationStatus === "active";
  const canonical = candidate && match ? isCanonicalInput(rawCandidate, candidate, match) : false;

  if (active && canonical && match) return { type: "resolved", context: toContext(match, candidate) };
  if (!SAFE_METHODS.has(request.method.toUpperCase())) return { type: "not-found" };
  if (active && match) {
    return { type: "redirect", status: 308, location: internalLocaleLocation(request, match.locale.tag) };
  }
  return {
    type: "redirect",
    status: 307,
    location: internalLocaleLocation(request, registry.bootstrap.tag),
  };
}

function cookieLocale(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== LOCALE_COOKIE_NAME) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

interface LanguagePreference {
  range: string;
  quality: number;
  order: number;
}

function acceptLanguage(header: string | null): LanguagePreference[] {
  if (!header) return [];
  return header
    .split(",")
    .map((item, order) => {
      const [rangePart, ...parameters] = item.trim().split(";");
      let quality = 1;
      for (const parameter of parameters) {
        if (!/^q\s*=/i.test(parameter.trim())) continue;
        const match = /^q\s*=\s*(0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/i.exec(parameter.trim());
        quality = match ? Number(match[1]) : 0;
      }
      return { range: rangePart.trim(), quality, order };
    })
    .filter(({ range, quality }) => Boolean(range) && quality > 0)
    .sort((left, right) => right.quality - left.quality || left.order - right.order);
}

function activeMatch(candidate: string | undefined, registry: LocaleRegistry): LocaleMatch | undefined {
  if (!candidate || candidate === "*") return undefined;
  const parsed = parseLocaleCandidate(candidate);
  const match = parsed ? registry.find(parsed.translationTag) : undefined;
  return match?.locale.publicationStatus === "active" ? match : undefined;
}

export function negotiateLocale(
  request: Request,
  registry: LocaleRegistry,
  authenticated: AuthenticatedLocaleSource = { locale: undefined },
): ResolvedLocaleContext | undefined {
  if (!SAFE_METHODS.has(request.method.toUpperCase())) return undefined;

  const directCandidates = [authenticated.locale, cookieLocale(request.headers.get("Cookie"))];
  for (const candidate of directCandidates) {
    const match = activeMatch(candidate, registry);
    if (match) return toContext(match);
  }
  for (const preference of acceptLanguage(request.headers.get("Accept-Language"))) {
    const match = activeMatch(preference.range, registry);
    if (match) return toContext(match);
  }
  return toContext({ locale: registry.bootstrap, kind: "canonical" });
}
