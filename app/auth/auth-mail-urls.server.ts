import { parseLocaleCandidate, type ResolvedLocaleContext } from "../localization/locale";
import type { LocaleRegistry } from "../localization/registry";
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
  const destination = returnPath(origin, locale, action.returnTo);
  const reset = action.purpose === "password-reset" || action.purpose === "password-create";
  const callback = new URL(reset ? `/${locale}/reset-password` : `/${locale}/sign-in`, origin);
  callback.searchParams.set("returnTo", destination);
  const url = new URL(reset ? `/api/auth/reset-password/${action.token}` : "/api/auth/verify-email", origin);
  if (!reset) url.searchParams.set("token", action.token);
  url.searchParams.set("callbackURL", callback.href);
  if (url.href.length > 8192) throw new AuthMailValidationError();
  return url.href;
}

/** Revalidate even a URL supplied by another server module; never trust its brand/caller. */
export function validateAuthMailActionURL(
  origin: string, registry: LocaleRegistry, purpose: AuthMailPurpose, locale: string, supplied: string,
): string {
  try {
    inspectURLText(supplied);
    const url = new URL(supplied);
    if (url.origin !== origin || url.username || url.password || url.hash) throw new AuthMailValidationError();
    const callbackValues = url.searchParams.getAll("callbackURL");
    if (callbackValues.length !== 1) throw new AuthMailValidationError();
    const callback = new URL(callbackValues[0]);
    const returnValues = callback.searchParams.getAll("returnTo");
    if (returnValues.length !== 1) throw new AuthMailValidationError();
    const reset = purpose === "password-reset" || purpose === "password-create";
    const token = reset ? url.pathname.slice("/api/auth/reset-password/".length) : url.searchParams.get("token");
    const expected = buildAuthMailActionURL(origin, registry, {
      purpose, locale, token: token ?? "", returnTo: returnValues[0],
    });
    // Exact server-built form rejects path normalization, extra/duplicate fields,
    // nested callbacks, foreign return origins and token-bearing destinations.
    if (supplied !== expected) throw new AuthMailValidationError();
    return expected;
  } catch { throw new AuthMailValidationError(); }
}
