import { parseLocaleCandidate, type ResolvedLocaleContext } from "../localization/locale";
import { localeRegistry, type LocaleRegistry } from "../localization/registry";
import { resolveExplicitLocale } from "../localization/resolver";
import { AuthMailValidationError, isMailPurpose, type AuthMailExecution, type AuthMailPurpose } from "./auth-mail-contract.server";

export function authMailLocale(locale: string, registry: LocaleRegistry): ResolvedLocaleContext {
  const parsed = typeof locale === "string" ? parseLocaleCandidate(locale) : undefined;
  const match = parsed ? registry.find(parsed.translationTag) : undefined;
  // A saved unavailable locale uses the registry's bootstrap fallback, never a new locale.
  const tag = match?.locale.publicationStatus === "active" ? match.locale.tag : registry.bootstrap.tag;
  const resolved = resolveExplicitLocale(new Request("https://auth-mail.invalid/"), tag, registry);
  if (resolved.type !== "resolved") throw new AuthMailValidationError();
  return resolved.context;
}

/** Validate before WHATWG URL parsing can silently normalize dangerous input. */
function inspectURLText(value: string): void {
  if (value.length > 8192 || value.trim() !== value || /[\\\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(value)) {
    throw new AuthMailValidationError();
  }
}
function decodedPath(path: string): string {
  inspectURLText(path);
  let decoded = path;
  // Reject encoded separators/controls/dot segments, including nested encodings.
  for (let i = 0; i < 4; i++) {
    if (/%(?:2f|5c|3f|23)/i.test(decoded)) throw new AuthMailValidationError();
    const next = decodeURIComponent(decoded);
    inspectURLText(next);
    if (next.split("/").some(part => part === "." || part === "..") || next.startsWith("//")) {
      throw new AuthMailValidationError();
    }
    if (next === decoded) return next;
    decoded = next;
  }
  throw new AuthMailValidationError();
}

export function authMailOrigin(baseURL: string, execution: AuthMailExecution): string {
  try {
    inspectURLText(baseURL);
    const url = new URL(baseURL);
    const localHTTP = (execution === "local" || execution === "test") && url.protocol === "http:"
      && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if ((url.protocol !== "https:" && !localHTTP) || url.username || url.password
      || url.search || url.hash || url.pathname !== "/" || url.origin === "null"
      || (url.port && !localHTTP) || !/^https?:\/\//.test(baseURL)
      || (baseURL !== url.origin && baseURL !== `${url.origin}/`)) throw new AuthMailValidationError();
    return url.origin;
  } catch { throw new AuthMailValidationError(); }
}

function returnPath(origin: string, locale: string, supplied?: string): string {
  const root = `/${encodeURIComponent(locale)}`;
  if (supplied === undefined) return root;
  try {
    // Foundation accepts locale-local path destinations. Query/hash-bearing auth
    // redirects require an explicit future contract, not nested arbitrary URLs.
    if (!supplied.startsWith("/") || supplied.includes("?") || supplied.includes("#")) {
      throw new AuthMailValidationError();
    }
    const decoded = decodedPath(supplied);
    if (decoded !== root && !decoded.startsWith(`${root}/`)) throw new AuthMailValidationError();
    const url = new URL(supplied, origin);
    if (url.origin !== origin || url.username || url.password) throw new AuthMailValidationError();
    return url.pathname;
  } catch { throw new AuthMailValidationError(); }
}

/** Canonical path-only destination used by signup and guest resend.
 * The mail runtime additionally checks the active request LocaleRegistry. */
export function verificationMailDestination(callback: string | undefined, origin: string): {
  locale: string; returnTo?: string;
} {
  if (callback === undefined || callback === "/") return { locale: localeRegistry.bootstrap.tag };
  try {
    if (!callback.startsWith("/") || callback.startsWith("//") || callback.includes("?") || callback.includes("#")) {
      throw new AuthMailValidationError();
    }
    const decoded = decodedPath(callback);
    const tag = decoded.split("/")[1];
    const locale = parseLocaleCandidate(tag);
    if (!locale || locale.canonicalInput !== locale.translationTag || locale.translationTag !== tag) {
      throw new AuthMailValidationError();
    }
    return { locale: tag, returnTo: returnPath(origin, tag, callback) };
  } catch { throw new AuthMailValidationError(); }
}

export interface AuthMailAction {
  readonly purpose: AuthMailPurpose;
  readonly locale: string;
  readonly token: string;
  readonly returnTo?: string;
}

/** Only builds addresses; no endpoint, token issuance or auth mutation is enabled. */
export function buildAuthMailActionURL(
  origin: string, registry: LocaleRegistry, action: AuthMailAction,
): string {
  if (!isMailPurpose(action.purpose) || typeof action.token !== "string"
    || !/^[A-Za-z0-9._~-]{1,2048}$/.test(action.token)) throw new AuthMailValidationError();
  const locale = authMailLocale(action.locale, registry).translationLocale;
  {
    const requested = returnPath(origin, action.locale, action.returnTo);
    const destination = locale === action.locale ? requested : returnPath(origin, locale);
    const page = action.purpose === "email-verification" ? "verify-email"
      : action.purpose === "password-reset" ? "reset-password" : "settings/account";
    const url = new URL(`/${locale}/${page}`, origin);
    if (action.purpose === "email-verification") url.searchParams.set("token", action.token);
    else url.hash = new URLSearchParams({ token: action.token,
      ...(action.purpose.startsWith("email-change") ? { purpose: "email-change" } : {}) }).toString();
    url.searchParams.set("returnTo", destination);
    if (url.href.length > 8192) throw new AuthMailValidationError();
    return url.href;
  }

}

/** Revalidate even a URL supplied by another server module; never trust its brand/caller. */
export function validateAuthMailActionURL(
  origin: string, registry: LocaleRegistry, purpose: AuthMailPurpose, locale: string, supplied: string,
): string {
  try {
    inspectURLText(supplied);
    const url = new URL(supplied);
    if (url.origin !== origin || url.username || url.password) throw new AuthMailValidationError();
    {
      const tokenSource = purpose === "email-verification" ? url.searchParams : new URLSearchParams(url.hash.slice(1));
      const tokenValues = tokenSource.getAll("token");
      const returnValues = url.searchParams.getAll("returnTo");
      if (tokenValues.length !== 1 || returnValues.length !== 1) throw new AuthMailValidationError();
      const expected = buildAuthMailActionURL(origin, registry, {
        purpose, locale, token: tokenValues[0],
        returnTo: authMailLocale(locale, registry).translationLocale === locale ? returnValues[0] : undefined,
      });
      if (supplied !== expected) throw new AuthMailValidationError();
      return expected;
    }

  } catch { throw new AuthMailValidationError(); }
}
